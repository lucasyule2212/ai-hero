import type { Message } from "ai";
import {
  streamText,
  createDataStreamResponse,
  appendResponseMessages,
} from "ai";
import { z } from "zod";
import { Langfuse } from "langfuse";
import { env } from "~/env";
import { model } from "~/models";
import { auth } from "~/server/auth/index";
import { searchSerper } from "~/serper";
import { bulkCrawlWebsites } from "~/server/scraper";
import { checkRateLimit, addUserRequest, upsertChat } from "~/server/db/queries";

const langfuse = new Langfuse({
  environment: env.NODE_ENV,
});

export const maxDuration = 60;

export async function POST(request: Request) {
  const session = await auth();
  if (!session || !session.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Check rate limit before processing the request
  const rateLimit = await checkRateLimit(session.user.id);
  
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
  
  // Create Langfuse trace with session and user information
  const trace = langfuse.trace({
    sessionId: finalChatId,
    name: "chat",
    userId: session.user.id,
  });
  
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
  
  await upsertChat(initialUpsertOptions);

  return createDataStreamResponse({
    execute: async (dataStream) => {
      // If this is a new chat, send the new chat ID to the frontend
      if (isNewChat) {
        dataStream.writeData({
          type: "NEW_CHAT_CREATED",
          chatId: finalChatId,
        });
      }

      await addUserRequest(session.user.id);

      const result = streamText({
        model,
        messages,
        maxSteps: 10,
        experimental_telemetry: {
          isEnabled: true,
          functionId: "agent",
          metadata: {
            langfuseTraceId: trace.id,
          },
        },
        system: `You are a helpful AI assistant with web search and scraping capabilities.

CURRENT DATE AND TIME: ${new Date().toISOString()}

When users ask for "up to date" information, "latest" news, "current" events, or anything time-sensitive, use this current date as a reference point. Prioritize information that is recent relative to this date.

WORKFLOW (MANDATORY):
1. Search for relevant information using searchWeb tool
2. IMMEDIATELY scrape 4-6 diverse URLs, based on the search results, using scrapePages tool
3. Provide comprehensive answers based on full article content
4. Cite sources naturally: [source name](link) using markdown format and never add a raw link to the source.

EXAMPLE CITATION FORMAT:
"According to [TechCrunch](https://techcrunch.com/article), the latest developments in AI show..."

CRITICAL RULES:
- ALWAYS scrape after searching - this is mandatory
- Answer naturally without explaining your process
- Never use phrases like "Based on scraped data..."
- Provide direct, confident answers without hesitation or explanation of your process
- When discussing time-sensitive information, reference the current date and mention how recent the information is

The scrapePages tool extracts full article content, removing ads and navigation. Use it to get comprehensive information, not just search snippets.`,
        tools: {
          searchWeb: {
            parameters: z.object({
              query: z.string().describe("The query to search the web for"),
            }),
            execute: async ({ query }, { abortSignal }) => {
              try {
                const results = await searchSerper(
                  { q: query, num: 10 },
                  abortSignal,
                );

                if (!results || !results.organic || results.organic.length === 0) {
                                  return [{
                  title: "No results found",
                  link: "",
                  snippet: "No search results were found for this query. Please try rephrasing your search or ask a different question.",
                  date: "N/A"
                }];
                }

                return results.organic.map((result) => ({
                  title: result.title ?? "Untitled",
                  link: result.link ?? "",
                  snippet: result.snippet ?? "No description available",
                  date: result.date ? `Published: ${result.date}` : "Date not available",
                }));
              } catch (error) {
                console.error("Search error:", error);
                return [{
                  title: "Search Error",
                  link: "",
                  snippet: "I encountered an error while searching. Please try again or rephrase your question.",
                  date: "N/A"
                }];
              }
            },
          },
          scrapePages: {
            parameters: z.object({
              urls: z.array(z.string()).describe("Array of URLs to scrape for full content"),
            }),
            execute: async ({ urls }, { abortSignal }) => {
              try {
                const result = await bulkCrawlWebsites({ urls });

                if (!result.success) {
                  return result.results.map((r) => ({
                    title: r.url,
                    link: r.url,
                    snippet: r.result.success ? r.result.data : `Error: ${(r.result as any).error || 'Unknown error'}`,
                  }));
                }

                return result.results.map((r) => ({
                  title: r.url,
                  link: r.url,
                  snippet: r.result.success ? r.result.data : `Error: ${(r.result as any).error || 'Unknown error'}`,
                  date: "Scraped content - publication date may be in content",
                }));
              } catch (error) {
                console.error("Scraping error:", error);
                return [{
                  title: "Scraping Error",
                  link: "",
                  snippet: `Failed to scrape pages: ${error instanceof Error ? error.message : "Unknown error"}`,
                  date: "N/A"
                }];
              }
            },
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

          upsertChat(upsertOptions).catch((error) => {
            console.error("Failed to save chat to database:", error);
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