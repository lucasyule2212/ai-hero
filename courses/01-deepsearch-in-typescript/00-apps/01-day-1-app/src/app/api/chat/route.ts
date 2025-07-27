import type { Message } from "ai";
import {
  createDataStreamResponse,
  appendResponseMessages,
} from "ai";
import { Langfuse } from "langfuse";
import { env } from "~/env";
import { auth } from "~/server/auth/index";
import { checkRateLimit, addUserRequest, upsertChat } from "~/server/db/queries";
import { streamFromDeepSearch } from "~/server/deep-research";

const langfuse = new Langfuse({
  environment: env.NODE_ENV,
});

export const maxDuration = 60;

export async function POST(request: Request) {
  const session = await auth();
  if (!session || !session.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Create initial trace without sessionId
  const trace = langfuse.trace({
    name: "chat",
    userId: session.user.id,
  });

  // Check rate limit before processing the request
  const rateLimitSpan = trace.span({
    name: "check-rate-limit",
    input: {
      userId: session.user.id,
    },
  });

  const rateLimit = await checkRateLimit(session.user.id);
  
  rateLimitSpan.end({
    output: {
      allowed: rateLimit.allowed,
      remaining: rateLimit.remaining,
      limit: rateLimit.limit,
    },
  });
  
  if (!rateLimit.allowed) {
    return new Response(
      JSON.stringify({
        error: "Rate limit exceeded",
        message: `You have exceeded your daily limit of ${rateLimit.limit} requests. Please try again tomorrow.`,
        remaining: rateLimit.remaining,
        limit: rateLimit.limit,
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "X-RateLimit-Remaining": rateLimit.remaining.toString(),
          "X-RateLimit-Limit": rateLimit.limit.toString(),
        },
      }
    );
  }

  const body = (await request.json()) as {
    messages: Array<Message>;
    chatId: string;
    isNewChat: boolean;
  };

  const { messages, chatId, isNewChat } = body;

  // Use the provided chatId
  const finalChatId = chatId;
  
  // Only generate a title for new chats
  let chatTitle = "New Chat";
  if (isNewChat) {
    const firstUserMessage = messages.find(msg => msg.role === "user");
    chatTitle = firstUserMessage?.content?.slice(0, 50) ?? "New Chat";
  }

  // Create the chat immediately with the user's message
  // This protects against broken streams
  const initialUpsertOptions: {
    userId: string;
    chatId: string;
    title?: string;
    messages: Message[];
  } = {
    userId: session.user.id,
    chatId: finalChatId,
    messages: messages,
  };
  
  // Only include title for new chats
  if (isNewChat) {
    initialUpsertOptions.title = chatTitle;
  }
  
  const initialUpsertSpan = trace.span({
    name: "initial-chat-upsert",
    input: {
      userId: session.user.id,
      chatId: finalChatId,
      isNewChat,
      title: initialUpsertOptions.title,
      messageCount: messages.length,
    },
  });

  await upsertChat(initialUpsertOptions);

  initialUpsertSpan.end({
    output: {
      success: true,
      chatId: finalChatId,
    },
  });

  // Update trace with sessionId now that we have the chatId
  trace.update({
    sessionId: finalChatId,
  });

  return createDataStreamResponse({
    execute: async (dataStream) => {
      // If this is a new chat, send the new chat ID to the frontend
      if (isNewChat) {
        dataStream.writeData({
          type: "NEW_CHAT_CREATED",
          chatId: finalChatId,
        });
      }

      const addUserRequestSpan = trace.span({
        name: "add-user-request",
        input: {
          userId: session.user.id,
        },
      });

      await addUserRequest(session.user.id);

      addUserRequestSpan.end({
        output: {
          success: true,
        },
      });

      const result = await streamFromDeepSearch({
        messages,
        telemetry: {
          isEnabled: true,
          functionId: "agent",
          metadata: {
            langfuseTraceId: trace.id,
          },
        },
        onFinish: async ({ text: _text, finishReason: _finishReason, usage: _usage, response }) => {
          const responseMessages = response.messages;

          const updatedMessages = appendResponseMessages({
            messages, // from the POST body
            responseMessages,
          });

          // Save the complete conversation to the database
          // Only pass title for new chats to prevent unnecessary updates
          const upsertOptions: {
            userId: string;
            chatId: string;
            title?: string;
            messages: Message[];
          } = {
            userId: session.user.id,
            chatId: finalChatId,
            messages: updatedMessages,
          };
          
          // Only include title for new chats
          if (isNewChat) {
            upsertOptions.title = chatTitle;
          }

          const finalUpsertSpan = trace.span({
            name: "final-chat-upsert",
            input: {
              userId: session.user.id,
              chatId: finalChatId,
              isNewChat,
              title: upsertOptions.title,
              messageCount: updatedMessages.length,
            },
          });

          upsertChat(upsertOptions).then(() => {
            finalUpsertSpan.end({
              output: {
                success: true,
                chatId: finalChatId,
              },
            });
          }).catch((error) => {
            console.error("Failed to save chat to database:", error);
            finalUpsertSpan.end({
              output: {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
              },
            });
          });
          
          // Flush the trace to Langfuse
          await langfuse.flushAsync();
        },
      });

      result.mergeIntoDataStream(dataStream);
    },
    onError: (e) => {
      console.error(e);
      return "Oops, an error occured!";
    },
  });
} 