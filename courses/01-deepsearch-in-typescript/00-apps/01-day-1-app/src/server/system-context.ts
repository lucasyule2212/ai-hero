import { z } from "zod";
import { generateObject } from "ai";
import { model } from "~/models";

type QueryResultSearchResult = {
  date: string;
  title: string;
  url: string;
  snippet: string;
};

type QueryResult = {
  query: string;
  results: QueryResultSearchResult[];
};

type ScrapeResult = {
  url: string;
  result: string;
};

export interface SearchAction {
  type: "search";
  query: string;
}

export interface ScrapeAction {
  type: "scrape";
  urls: string[];
}

export interface AnswerAction {
  type: "answer";
}

export type Action =
  | SearchAction
  | ScrapeAction
  | AnswerAction;

export const actionSchema = z.object({
  type: z
    .enum(["search", "scrape", "answer"])
    .describe(
      `The type of action to take.
      - 'search': Search the web for more information.
      - 'scrape': Scrape a URL.
      - 'answer': Answer the user's question and complete the loop.`,
    ),
  query: z
    .string()
    .describe(
      "The query to search for. Required if type is 'search'.",
    )
    .optional(),
  urls: z
    .array(z.string())
    .describe(
      "The URLs to scrape. Required if type is 'scrape'.",
    )
    .optional(),
});

const toQueryResult = (
  query: QueryResultSearchResult,
) =>
  [
    `### ${query.date} - ${query.title}`,
    query.url,
    query.snippet,
  ].join("\n\n");

export class SystemContext {
  /**
   * The current step in the loop
   */
  private step = 0;

  /**
   * The history of all queries searched
   */
  private queryHistory: QueryResult[] = [];

  /**
   * The history of all URLs scraped
   */
  private scrapeHistory: ScrapeResult[] = [];

  shouldStop() {
    return this.step >= 10;
  }

  reportQueries(queries: QueryResult[]) {
    this.queryHistory.push(...queries);
  }

  reportScrapes(scrapes: ScrapeResult[]) {
    this.scrapeHistory.push(...scrapes);
  }

  getQueryHistory(): string {
    return this.queryHistory
      .map((query) =>
        [
          `## Query: "${query.query}"`,
          ...query.results.map(toQueryResult),
        ].join("\n\n"),
      )
      .join("\n\n");
  }

  getScrapeHistory(): string {
    return this.scrapeHistory
      .map((scrape) =>
        [
          `## Scrape: "${scrape.url}"`,
          `<scrape_result>`,
          scrape.result,
          `</scrape_result>`,
        ].join("\n\n"),
      )
      .join("\n\n");
  }
}

export const getNextAction = async (
  context: SystemContext,
) => {
  const result = await generateObject({
    model,
    schema: actionSchema,
    system: `You are a helpful AI assistant with web search and scraping capabilities. Your goal is to provide comprehensive, accurate, and up-to-date answers by planning, executing, and verifying your work.`,
    prompt: `
    You can perform three types of actions:
    1. SEARCH: Search the web for more information using a specific query
    2. SCRAPE: Scrape specific URLs to get detailed content
    3. ANSWER: Provide the final answer to the user's question and complete the process

    Based on the current context, determine the next action to take. If you have enough information to provide a comprehensive answer, choose 'answer'. If you need more information, choose 'search' or 'scrape' as appropriate.

    Always use the current date and time as a reference point when answering questions.

    Here is the current context of your research:

    CURRENT DATE AND TIME: ${new Date().toISOString()}

    ${context.getQueryHistory()}

    ${context.getScrapeHistory()}
    `,
  });

  return result.object;
}; 