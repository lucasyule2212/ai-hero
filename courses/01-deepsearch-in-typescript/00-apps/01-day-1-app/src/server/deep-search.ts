import type { Message } from "ai";
import {
  streamText,
  type TelemetrySettings,
} from "ai";
import { z } from "zod";
import { model } from "~/models";
import { searchSerper } from "~/serper";
import { bulkCrawlWebsites } from "~/server/scraper";

export const streamFromDeepSearch = (opts: {
  messages: Message[];
  onFinish: Parameters<
    typeof streamText
  >[0]["onFinish"];
  telemetry: TelemetrySettings;
}) =>
  streamText({
    model,
    messages: opts.messages,
    maxSteps: 10,
    experimental_telemetry: opts.telemetry,
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
    onFinish: opts.onFinish,
  });

export async function askDeepSearch(
  messages: Message[],
) {
  const result = streamFromDeepSearch({
    messages,
    onFinish: () => {}, // just a stub
    telemetry: {
      isEnabled: false,
    },
  });

  // Consume the stream - without this,
  // the stream will never finish
  await result.consumeStream();

  return await result.text;
} 