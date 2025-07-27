import { searchSerper } from "~/serper";
import { bulkCrawlWebsites } from "~/server/scraper";
import { env } from "~/env";
import { SystemContext, getNextAction, type OurMessageAnnotation } from "./system-context";
import { answerQuestion } from "./answer-question";
import type { StreamTextResult, StreamTextOnFinishCallback } from "ai";
import type { Message } from "ai";
import type { UserLocation } from "~/utils/location";

async function searchWeb(query: string) {
  try {
    const results = await searchSerper(
      { q: query, num: env.SEARCH_RESULTS_COUNT },
      undefined, // no abort signal in this context
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
}

async function scrapeUrls(urls: string[]) {
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
}

export async function runAgentLoop(
  conversationHistory: Message[],
  writeMessageAnnotation?: (annotation: OurMessageAnnotation) => void,
  langfuseTraceId?: string,
  onFinish?: StreamTextOnFinishCallback<{}>,
  userLocation?: UserLocation,
): Promise<StreamTextResult<{}, string>> {
  const ctx = new SystemContext(conversationHistory, userLocation);

  // A loop that continues until we have an answer
  // or we've taken 10 actions
  while (!ctx.shouldStop()) {
    // We choose the next action based on the state of our system
    const nextAction = await getNextAction(ctx, langfuseTraceId);
    
    // Send progress update if writeMessageAnnotation is provided
    if (writeMessageAnnotation) {
      writeMessageAnnotation({
        type: "NEW_ACTION",
        action: nextAction,
      } satisfies OurMessageAnnotation);
    }
    
    // We execute the action and update the state of our system
    if (nextAction.type === "search") {
      if (!nextAction.query) {
        console.error("Search action missing query");
        ctx.incrementStep();
        continue;
      }
      
      const searchResults = await searchWeb(nextAction.query);
      ctx.reportQueries([{
        query: nextAction.query,
        results: searchResults.map(result => ({
          date: result.date,
          title: result.title,
          url: result.link,
          snippet: result.snippet,
        })),
      }]);
    } else if (nextAction.type === "scrape") {
      if (!nextAction.urls || nextAction.urls.length === 0) {
        console.error("Scrape action missing URLs");
        ctx.incrementStep();
        continue;
      }
      
      const scrapeResults = await scrapeUrls(nextAction.urls);
      ctx.reportScrapes(
        scrapeResults.map((result) => ({
          url: result.link,
          result: result.snippet,
        }))
      );
    } else if (nextAction.type === "answer") {
      return answerQuestion(ctx, { isFinal: false }, langfuseTraceId, onFinish);
    }

    // We increment the step counter
    ctx.incrementStep();
  }

  // If we've taken 10 actions and still don't have an answer,
  // we ask the LLM to give its best attempt at an answer
  return answerQuestion(ctx, { isFinal: true }, langfuseTraceId, onFinish);
} 