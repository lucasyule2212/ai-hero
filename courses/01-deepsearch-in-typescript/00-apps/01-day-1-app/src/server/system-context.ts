import { z } from "zod";
import { generateObject } from "ai";
import { model } from "~/models";
import type { Message } from "ai";

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

export type Action = z.infer<typeof actionSchema>;

export type OurMessageAnnotation = {
  type: "NEW_ACTION";
  action: Action;
};

export const actionSchema = z.object({
  title: z
    .string()
    .describe(
      "The title of the action, to be displayed in the UI. Be extremely concise. 'Searching Saka's injury history', 'Checking HMRC industrial action', 'Comparing toaster ovens'",
    ),
  reasoning: z
    .string()
    .describe("The reason you chose this step."),
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
      "The query to search the web for. Required if type is 'search'.",
    )
    .optional(),
  urls: z
    .array(z.string())
    .describe(
      "The URLs to scrape from. Required if type is 'scrape'.",
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

  /**
   * The conversation history for context
   */
  private conversationHistory: Message[];

  constructor(conversationHistory: Message[] = []) {
    this.conversationHistory = conversationHistory;
  }

  shouldStop() {
    return this.step >= 10;
  }

  incrementStep() {
    this.step++;
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

  getConversationHistory(): string {
    if (this.conversationHistory.length === 0) {
      return "";
    }

    return this.conversationHistory
      .map((message) => {
        const role = message.role === "user" ? "USER" : "ASSISTANT";
        return `${role}: ${message.content}`;
      })
      .join("\n\n");
  }
}

export const getNextAction = async (
  context: SystemContext,
  langfuseTraceId?: string,
) => {
  const result = await generateObject({
    model,
    schema: actionSchema,
    system: `You are a helpful AI assistant with web search and scraping capabilities. Your goal is to provide comprehensive, accurate, and up-to-date answers by planning, executing, and verifying your work.

    When choosing your next action, provide a concise title that describes what you're doing and clear reasoning for why you chose this step.`,
    prompt: `
    You can perform three types of actions:
    1. SEARCH: Search the web for more information using a specific query
    2. SCRAPE: Scrape specific URLs to get detailed content
    3. ANSWER: Provide the final answer to the user's question and complete the process

    Based on the current context, determine the next action to take. If you have enough information to provide a comprehensive answer, choose 'answer'. If you need more information, choose 'search' or 'scrape' as appropriate.

    For the title field, provide a very concise description of what you're doing (e.g., "Searching for latest news", "Checking official website", "Analyzing search results").

    For the reasoning field, explain why you chose this specific action based on the current context and what information you still need.

    Always use the current date and time as a reference point when answering questions.

    Here is the conversation history for context:

    ${context.getConversationHistory()}

    Here is the current context of your research:

    CURRENT DATE AND TIME: ${new Date().toISOString()}

    ${context.getQueryHistory()}

    ${context.getScrapeHistory()}
    `,
    experimental_telemetry: langfuseTraceId ? {
      isEnabled: true,
      functionId: "agent-next-action",
      metadata: {
        langfuseTraceId,
      },
    } : undefined,
  });

  return result.object;
}; 