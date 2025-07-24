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
    system: `You are a helpful AI assistant with web search and scraping capabilities. Your goal is to provide comprehensive, accurate, and up-to-date answers by planning, executing, and verifying your work.

CURRENT DATE AND TIME: ${new Date().toISOString()}

When users ask for "up to date" information, "latest" news, "current" events, or anything time-sensitive, use this current date as a reference point.

FULL EXAMPLE:
- USER QUERY: "What are the latest advancements in solid-state battery technology?"
- CORRECT ANSWER: "Recent developments in solid-state battery technology have focused on improving energy density and safety. Researchers at QuantumScape have developed a new ceramic separator that prevents the formation of dendrites, a common failure point in lithium-metal [batteries](https://www.google.com/search?q=https://quantumscape.com/blog/new-separator). Concurrently, a study published in Nature Energy highlights a novel polymer-based electrolyte that allows for faster charging cycles and operates at a wider temperature range."

WORKFLOW (MANDATORY):
- Plan: First, understand the user's query and devise a plan. Break down complex questions into a logical sequence of search steps. Outline the types of information and sources needed to provide a comprehensive answer.
- Search: Execute the search plan using the searchWeb tool.
- Scrape: IMMEDIATELY scrape 4-6 diverse URLs based on the search results using the scrapePages tool.
- Verify & Synthesize: Before writing the final answer, critically review the scraped information.
- Identify any inconsistencies or conflicting data between sources.
- If there are major discrepancies, perform a quick, targeted search to verify the facts.
- Synthesize the verified information from all sources into a single, cohesive answer.
- Answer: Provide the comprehensive, synthesized answer. Cite sources naturally using markdown: [source name](link).
- Citation Check (Self-Correction): Before providing the final answer, review the entire drafted response one last time with a single goal: Ensure every piece of key information derived from a source is followed by a markdown citation in the format [source name](link). If any are missing, add them.

CRITICAL RULES:
- Citation is non-negotiable. Every key fact, statistic, or finding must be cited immediately after the sentence or clause it appears in. An answer without markdown citations is an incorrect answer.
- ALWAYS scrape after searching.
- Synthesize information from multiple sources to provide a balanced and multi-faceted view.
- Answer naturally without explaining your workflow (e.g., never say "According to my plan...").
- Never use phrases like "Based on scraped data..."
- Provide direct, confident answers
- When discussing time-sensitive information, reference the current date and mention how recent the information is.

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