import { searchSerper } from "~/serper";
import { bulkCrawlWebsites } from "~/server/scraper";
import { SystemContext, getNextAction, type OurMessageAnnotation } from "./system-context";
import { answerQuestion } from "./answer-question";
import type { StreamTextResult, StreamTextOnFinishCallback } from "ai";
import type { Message } from "ai";
import type { UserLocation } from "~/utils/location";

async function searchAndScrapeWeb(query: string) {
  try {
    // Search for results with reduced count to manage context window
    const results = await searchSerper(
      { q: query, num: 3 }, // Reduced from default to manage context window
      undefined, // no abort signal in this context
    );

    if (!results || !results.organic || results.organic.length === 0) {
          return [{
      title: "No results found",
      url: "",
      snippet: "No search results were found for this query. Please try rephrasing your search or ask a different question.",
      date: "N/A",
      scrapedContent: "No content available"
    }];
    }

    // Extract URLs from search results
    const urls = results.organic
      .map(result => result.link)
      .filter(link => link && link.length > 0);

    // Scrape all URLs in parallel
    let scrapedContents: string[] = [];
    if (urls.length > 0) {
      const scrapeResult = await bulkCrawlWebsites({ urls });
      scrapedContents = scrapeResult.results.map((r) => 
        r.result.success ? r.result.data : `Error: ${(r.result as any).error || 'Unknown error'}`
      );
    }

    // Combine search results with scraped content
    return results.organic.map((result, index) => ({
      title: result.title ?? "Untitled",
      url: result.link ?? "",
      snippet: result.snippet ?? "No description available",
      date: result.date ? `Published: ${result.date}` : "Date not available",
      scrapedContent: scrapedContents[index] || "Failed to scrape content"
    }));
  } catch (error) {
    console.error("Search and scrape error:", error);
    return [{
      title: "Search Error",
      url: "",
      snippet: "I encountered an error while searching. Please try again or rephrase your question.",
      date: "N/A",
      scrapedContent: "Error occurred during search and scrape operation"
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
  // or we've taken 5 actions
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
      
      const searchResults = await searchAndScrapeWeb(nextAction.query);
      ctx.reportSearch({
        query: nextAction.query,
        results: searchResults,
      });
    } else if (nextAction.type === "answer") {
      return answerQuestion(ctx, { isFinal: false }, langfuseTraceId, onFinish);
    }

    // We increment the step counter
    ctx.incrementStep();
  }

  // If we've taken 5 actions, we need to provide an answer
  return answerQuestion(ctx, { isFinal: true }, langfuseTraceId, onFinish);
} 