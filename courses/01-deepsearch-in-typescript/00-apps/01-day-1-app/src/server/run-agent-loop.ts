import { searchSerper } from "~/serper";
import { bulkCrawlWebsites } from "~/server/scraper";
import { SystemContext, getNextAction, type OurMessageAnnotation } from "./system-context";
import { answerQuestion } from "./answer-question";
import { summarizeURL } from "~/server/summarizer";
import { queryRewriter } from "./query-rewriter";
import { env } from "~/env";
import type { StreamTextResult, StreamTextOnFinishCallback } from "ai";
import type { Message } from "ai";
import type { UserLocation } from "~/utils/location";

async function searchAndScrapeWeb(
  query: string,
  conversationHistory: Message[],
  langfuseTraceId?: string,
) {
  try {
    const results = await searchSerper(
      { q: query, num: env.SEARCH_RESULTS_COUNT },
      undefined, // no abort signal in this context
    );

    if (!results || !results.organic || results.organic.length === 0) {
      return [{
        title: "No results found",
        url: "",
        snippet: "No search results were found for this query. Please try rephrasing your search or ask a different question.",
        date: "N/A",
        scrapedContent: "No content available",
        summary: "No content available"
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
    const searchResultsWithContent = results.organic.map((result, index) => ({
      title: result.title ?? "Untitled",
      url: result.link ?? "",
      snippet: result.snippet ?? "No description available",
      date: result.date ? `Published: ${result.date}` : "Date not available",
      scrapedContent: scrapedContents[index] || "Failed to scrape content"
    }));

    // Summarize all URLs in parallel
    const summarizationPromises = searchResultsWithContent.map((result) => 
      summarizeURL({
        conversationHistory,
        scrapedContent: result.scrapedContent,
        searchMetadata: {
          title: result.title,
          url: result.url,
          snippet: result.snippet,
          date: result.date,
        },
        query,
      }, langfuseTraceId)
    );

    const summaries = await Promise.all(summarizationPromises);

    // Combine search results with summaries
    return searchResultsWithContent.map((result, index) => ({
      ...result,
      summary: summaries[index]?.summary || "Failed to generate summary"
    }));
  } catch (error) {
    console.error("Search and scrape error:", error);
    return [{
      title: "Search Error",
      url: "",
      snippet: "I encountered an error while searching. Please try again or rephrase your question.",
      date: "N/A",
      scrapedContent: "Error occurred during search and scrape operation",
      summary: "Error occurred during search and scrape operation"
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

  // Always start with a query rewriter to plan and execute initial research
  let isFirstIteration = true;

  // A loop that continues until we have an answer
  // or we've taken 5 actions
  while (!ctx.shouldStop()) {
    if (isFirstIteration) {
      // On the first iteration, always plan and execute queries
      const queryPlan = await queryRewriter(ctx, langfuseTraceId);
      
      // Send progress update with query plan if writeMessageAnnotation is provided
      if (writeMessageAnnotation) {
        writeMessageAnnotation({
          type: "NEW_ACTION",
          action: {
            type: "continue",
            title: "Planning initial research",
            reasoning: "Starting research by planning and executing search queries to gather information about the user's question."
          },
          queryPlan: queryPlan,
        } satisfies OurMessageAnnotation);
      }
      
      // Execute all queries in parallel for maximum speed
      const searchPromises = queryPlan.queries.map(query => 
        searchAndScrapeWeb(query, conversationHistory, langfuseTraceId)
      );
      
      const searchResultsArrays = await Promise.all(searchPromises);
      
      // Report all search results to the context
      queryPlan.queries.forEach((query, index) => {
        const results = searchResultsArrays[index];
        if (results) {
          ctx.reportSearch({
            query: query,
            results: results,
          });
        }
      });
      
      isFirstIteration = false;
    } else {
      // On subsequent iterations, decide whether to continue or answer
      const nextAction = await getNextAction(ctx, langfuseTraceId);
      
      if (nextAction.type === "continue") {
        // Generate a research plan and queries
        const queryPlan = await queryRewriter(ctx, langfuseTraceId);
        
        // Send progress update with query plan if writeMessageAnnotation is provided
        if (writeMessageAnnotation) {
          writeMessageAnnotation({
            type: "NEW_ACTION",
            action: nextAction,
            queryPlan: queryPlan,
          } satisfies OurMessageAnnotation);
        }
        
        // Execute all queries in parallel for maximum speed
        const searchPromises = queryPlan.queries.map(query => 
          searchAndScrapeWeb(query, conversationHistory, langfuseTraceId)
        );
        
        const searchResultsArrays = await Promise.all(searchPromises);
        
        // Report all search results to the context
        queryPlan.queries.forEach((query, index) => {
          const results = searchResultsArrays[index];
          if (results) {
            ctx.reportSearch({
              query: query,
              results: results,
            });
          }
        });
      } else if (nextAction.type === "answer") {
        // Send progress update if writeMessageAnnotation is provided
        if (writeMessageAnnotation) {
          writeMessageAnnotation({
            type: "NEW_ACTION",
            action: nextAction,
          } satisfies OurMessageAnnotation);
        }
        
        return answerQuestion(ctx, { isFinal: false }, langfuseTraceId, onFinish);
      }
    }

    // We increment the step counter
    ctx.incrementStep();
  }

  // If we've taken 5 actions, we need to provide an answer
  return answerQuestion(ctx, { isFinal: true }, langfuseTraceId, onFinish);
} 