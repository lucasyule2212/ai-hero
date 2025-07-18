import type { Message } from "ai";
import {
  streamText,
  createDataStreamResponse,
} from "ai";
import { z } from "zod";
import { model } from "~/models";
import { auth } from "~/server/auth/index";
import { searchSerper } from "~/serper";

export const maxDuration = 60;

export async function POST(request: Request) {
  const session = await auth();
  if (!session || !session.user) {
    return new Response("Unauthorized", { status: 401 });
  }
  const body = (await request.json()) as {
    messages: Array<Message>;
  };

  return createDataStreamResponse({
    execute: async (dataStream) => {
      const { messages } = body;

      const result = streamText({
        model,
        messages,
        maxSteps: 10,
        system: `You are a helpful AI assistant with access to web search capabilities. 

When users ask questions that require current information, facts, or recent events, you should use the search web tool to find relevant information.

IMPORTANT GUIDELINES:
1. Always use the search web tool when users ask about current events, recent news, factual information, or anything that might require up-to-date data
2. When providing information from search results, always cite your sources with inline links using markdown format: [source name](link)
3. Be thorough in your searches - if a topic is complex, perform multiple searches to gather comprehensive information
4. Present information clearly and organize it logically
5. If search results don't provide enough information, acknowledge the limitations and suggest what additional information might be needed

Example citation format: "According to [TechCrunch](https://techcrunch.com/article), the latest developments in AI show..."

Remember: Your goal is to provide accurate, current, and well-sourced information to help users with their questions.`,
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
                    snippet: "No search results were found for this query. Please try rephrasing your search or ask a different question."
                  }];
                }

                return results.organic.map((result) => ({
                  title: result.title || "Untitled",
                  link: result.link || "",
                  snippet: result.snippet || "No description available",
                }));
              } catch (error) {
                console.error("Search error:", error);
                return [{
                  title: "Search Error",
                  link: "",
                  snippet: "I encountered an error while searching. Please try again or rephrase your question."
                }];
              }
            },
          },
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