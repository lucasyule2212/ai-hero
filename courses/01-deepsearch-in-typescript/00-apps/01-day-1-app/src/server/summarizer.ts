import { generateText } from "ai";
import { summarizationModel } from "~/models";
import { cacheWithRedis } from "~/server/redis/redis";
import type { Message } from "ai";

export interface SummarizationInput {
  conversationHistory: Message[];
  scrapedContent: string;
  searchMetadata: {
    title: string;
    url: string;
    snippet: string;
    date: string;
  };
  query: string;
}

export interface SummarizationResult {
  summary: string;
  sourceUrl: string;
  sourceTitle: string;
}

const SUMMARIZATION_PROMPT = `You are a research extraction specialist. Given a research topic and raw web content, create a thoroughly detailed synthesis as a cohesive narrative that flows naturally between key concepts.

Extract the most valuable information related to the research topic, including relevant facts, statistics, methodologies, claims, and contextual information. Preserve technical terminology and domain-specific language from the source material.

Structure your synthesis as a coherent document with natural transitions between ideas. Begin with an introduction that captures the core thesis and purpose of the source material. Develop the narrative by weaving together key findings and their supporting details, ensuring each concept flows logically to the next.

Integrate specific metrics, dates, and quantitative information within their proper context. Explore how concepts interconnect within the source material, highlighting meaningful relationships between ideas. Acknowledge limitations by noting where information related to aspects of the research topic may be missing or incomplete.

Important guidelines:
- Maintain original data context (e.g., "2025 study of 150 patients" rather than generic "recent study")
- Preserve the integrity of information by keeping details anchored to their original context
- Create a cohesive narrative rather than disconnected bullet points or lists
- Use paragraph breaks only when transitioning between major themes

Critical Reminder: If content lacks a specific aspect of the research topic, clearly state that in the synthesis, and you should NEVER make up information and NEVER rely on external knowledge.

Research Topic: {query}

Source Information:
- Title: {title}
- URL: {url}
- Date: {date}
- Snippet: {snippet}

Conversation Context:
{conversationHistory}

Raw Web Content:
{scrapedContent}

Please provide a comprehensive synthesis of the above content focused on the research topic:`;

export const summarizeURL = cacheWithRedis(
  "summarizeURL",
  async (
    input: SummarizationInput,
    langfuseTraceId?: string,
  ): Promise<SummarizationResult> => {
    const conversationHistoryText = input.conversationHistory
      .map((message) => {
        const role = message.role === "user" ? "USER" : "ASSISTANT";
        return `${role}: ${message.content}`;
      })
      .join("\n\n");

    const prompt = SUMMARIZATION_PROMPT
      .replace("{query}", input.query)
      .replace("{title}", input.searchMetadata.title)
      .replace("{url}", input.searchMetadata.url)
      .replace("{date}", input.searchMetadata.date)
      .replace("{snippet}", input.searchMetadata.snippet)
      .replace("{conversationHistory}", conversationHistoryText)
      .replace("{scrapedContent}", input.scrapedContent);

    const summary = await generateText({
      model: summarizationModel,
      prompt,
      experimental_telemetry: langfuseTraceId ? {
        isEnabled: true,
        functionId: "summarize-url",
        metadata: {
          langfuseTraceId,
          sourceUrl: input.searchMetadata.url,
          sourceTitle: input.searchMetadata.title,
        },
      } : undefined,
    });

    return {
      summary: summary.text,
      sourceUrl: input.searchMetadata.url,
      sourceTitle: input.searchMetadata.title,
    };
  },
); 