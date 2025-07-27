import type { Message } from "ai";
import {
  appendResponseMessages,
  createDataStream,
  generateId
} from "ai";
import { Langfuse } from "langfuse";
import { env } from "~/env";
import { auth } from "~/server/auth/index";
import { checkRateLimit, addUserRequest, upsertChat, generateChatTitle, appendStreamId, loadStreams, getMessagesByChatId } from "~/server/db/queries";
import { streamFromDeepSearch } from "~/server/deep-research";
import type { OurMessageAnnotation } from "~/server/system-context";
import { getUserLocation } from "~/utils/location";
import { createResumableStreamContext } from "resumable-stream";
import { after } from "next/server";

const langfuse = new Langfuse({
  environment: env.NODE_ENV,
});

const streamContext = createResumableStreamContext({
  waitUntil: after,
});

export const maxDuration = 60;

export async function GET(request: Request) {
  const session = await auth();
  if (!session || !session.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const chatId = searchParams.get('chatId');

  if (!chatId) {
    return new Response('chatId is required', { status: 400 });
  }

  const streamIds = await loadStreams(chatId);

  if (!streamIds.length) {
    return new Response('No streams found', { status: 404 });
  }

  const recentStreamId = streamIds.at(-1);

  if (!recentStreamId) {
    return new Response('No recent stream found', { status: 404 });
  }

  const emptyDataStream = createDataStream({
    execute: () => {},
  });

  const stream = await streamContext.resumableStream(
    recentStreamId,
    () => emptyDataStream,
  );

  if (stream) {
    return new Response(stream, { status: 200 });
  }

  // For when the generation is "active" during SSR but the
  // resumable stream has concluded after reaching this point.
  const messages = await getMessagesByChatId({ id: chatId });
  const mostRecentMessage = messages.at(-1);

  if (!mostRecentMessage || mostRecentMessage.role !== 'assistant') {
    return new Response(emptyDataStream, { status: 200 });
  }

  const streamWithMessage = createDataStream({
    execute: buffer => {
      buffer.writeData({
        type: 'append-message',
        message: JSON.stringify(mostRecentMessage),
      });
    },
  });

  return new Response(streamWithMessage, { status: 200 });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session || !session.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Get user's location
  const userLocation = getUserLocation(request);

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
  const streamId = generateId();

  // Use the provided chatId
  const finalChatId = chatId;
  
  // Start title generation in parallel if this is a new chat
  let titlePromise: Promise<string> | undefined;
  
  if (isNewChat) {
    titlePromise = generateChatTitle(messages);
  } else {
    titlePromise = Promise.resolve("");
  }

  // Create the chat immediately with the user's message
  // This protects against broken streams
  const initialUpsertOptions: {
    userId: string;
    chatId: string;
    title?: string;
    messages: (Message & { annotations?: OurMessageAnnotation[] })[];
  } = {
    userId: session.user.id,
    chatId: finalChatId,
    messages: messages as (Message & { annotations?: OurMessageAnnotation[] })[],
  };
  
  // Only include a temporary title for new chats
  if (isNewChat) {
    initialUpsertOptions.title = "Generating...";
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

  // Record this new stream so we can resume later (after chat is created)
  await appendStreamId({ chatId: finalChatId, streamId });

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

  // Build the data stream that will emit tokens
  const stream = createDataStream({
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

      // Collect annotations in memory
      const annotations: OurMessageAnnotation[] = [];

      const writeMessageAnnotation = (
        annotation: OurMessageAnnotation,
      ) => {
        // Save the annotation in-memory
        annotations.push(annotation);
        // Send it to the client
        dataStream.writeMessageAnnotation(annotation);
      };

      const result = await streamFromDeepSearch({
        messages,
        langfuseTraceId: trace.id,
        writeMessageAnnotation,
        userLocation,
        onFinish: async ({ text: _text, finishReason: _finishReason, usage: _usage, response }) => {
          const responseMessages = response.messages;

          const updatedMessages = appendResponseMessages({
            messages, // from the POST body
            responseMessages,
          });

          // Get the last message and add annotations to it
          const lastMessage = updatedMessages[updatedMessages.length - 1];
          if (lastMessage && annotations.length > 0) {
            (lastMessage as any).annotations = annotations;
          }

          // Resolve the title promise
          const title = await titlePromise;

          // Save the complete conversation to the database
          const upsertOptions: {
            userId: string;
            chatId: string;
            title?: string;
            messages: (Message & { annotations?: OurMessageAnnotation[] })[];
          } = {
            userId: session.user.id,
            chatId: finalChatId,
            messages: updatedMessages as (Message & { annotations?: OurMessageAnnotation[] })[],
          };
          
          // Only include title if it's not empty (for new chats with generated titles)
          if (title && title !== "Generating...") {
            upsertOptions.title = title;
          }

          const finalUpsertSpan = trace.span({
            name: "final-chat-upsert",
            input: {
              userId: session.user.id,
              chatId: finalChatId,
              isNewChat,
              title: upsertOptions.title,
              messageCount: updatedMessages.length,
              annotationCount: annotations.length,
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

  return new Response(
    await streamContext.resumableStream(streamId, () => stream),
  );
} 