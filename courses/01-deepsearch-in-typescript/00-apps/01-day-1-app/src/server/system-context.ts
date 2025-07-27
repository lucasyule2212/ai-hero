import { z } from "zod";
import { generateObject } from "ai";
import { model } from "~/models";
import type { Message } from "ai";
import type { UserLocation } from "~/utils/location";

type SearchResult = {
  date: string;
  title: string;
  url: string;
  snippet: string;
  scrapedContent: string;
  summary: string;
};

type SearchHistoryEntry = {
  query: string;
  results: SearchResult[];
};

export interface ContinueAction {
  type: "continue";
}

export interface AnswerAction {
  type: "answer";
}

export type Action = z.infer<typeof actionSchema>;

export type OurMessageAnnotation = {
  type: "NEW_ACTION";
  action: Action;
  queryPlan?: {
    plan: string;
    queries: string[];
  };
};

export const actionSchema = z.object({
  title: z
    .string()
    .describe(
      "The title of the action, to be displayed in the UI. Be extremely concise. 'Planning research strategy', 'Analyzing search results', 'Providing final answer'",
    ),
  reasoning: z
    .string()
    .describe("The reason you chose this step."),
  type: z
    .enum(["continue", "answer"])
    .describe(
      `The type of action to take.
      - 'continue': Continue researching by planning and executing search queries.
      - 'answer': Answer the user's question and complete the loop.`,
    ),
});

const toSearchResult = (
  result: SearchResult,
) =>
  [
    `### ${result.date} - ${result.title}`,
    result.url,
    result.snippet,
    `<summary>`,
    result.summary,
    `</summary>`,
  ].join("\n\n");

export class SystemContext {
  /**
   * The current step in the loop
   */
  private step = 0;

  /**
   * The history of all searches with their scraped content
   */
  private searchHistory: SearchHistoryEntry[] = [];

  /**
   * The conversation history for context
   */
  private conversationHistory: Message[];

  /**
   * The user's location information
   */
  private userLocation?: UserLocation;

  constructor(conversationHistory: Message[] = [], userLocation?: UserLocation) {
    this.conversationHistory = conversationHistory;
    this.userLocation = userLocation;
  }

  shouldStop() {
    return this.step >= 5;
  }

  incrementStep() {
    this.step++;
  }

  reportSearch(search: SearchHistoryEntry) {
    this.searchHistory.push(search);
  }

  getSearchHistory(): string {
    return this.searchHistory
      .map((search) =>
        [
          `## Query: "${search.query}"`,
          ...search.results.map(toSearchResult),
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

  getLocationContext(): string {
    if (!this.userLocation) {
      return "";
    }

    const locationParts = [];
    if (this.userLocation.city) locationParts.push(this.userLocation.city);
    if (this.userLocation.country) locationParts.push(this.userLocation.country);

    if (locationParts.length === 0) {
      return "";
    }

    return `USER LOCATION: ${locationParts.join(", ")}`;
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
    You can perform two types of actions:
    1. CONTINUE: Continue researching by planning and executing search queries to gather more information
    2. ANSWER: Provide the final answer to the user's question and complete the process

    Based on the current context, determine the next action to take. If you have enough information to provide a comprehensive answer, choose 'answer'. If you need more information, choose 'continue'.

    For the title field, provide a very concise description of what you're doing (e.g., "Planning research strategy", "Analyzing search results", "Providing final answer").

    For the reasoning field, explain why you chose this specific action based on the current context and what information you still need.

    Always use the current date and time as a reference point when answering questions.

    Here is the conversation history for context:

    ${context.getConversationHistory()}

    Here is the current context of your research:

    CURRENT DATE AND TIME: ${new Date().toISOString()}

    ${context.getLocationContext()}

    ${context.getSearchHistory()}
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