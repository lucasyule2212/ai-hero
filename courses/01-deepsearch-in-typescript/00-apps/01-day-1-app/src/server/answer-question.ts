import { generateText } from "ai";
import { model } from "~/models";
import type { SystemContext } from "./system-context";

export async function answerQuestion(
  userQuestion: string,
  context: SystemContext,
  options: { isFinal: boolean },
) {
  const systemPrompt = options.isFinal
    ? `You are a helpful AI assistant with web search and scraping capabilities. Your goal is to provide comprehensive, accurate, and up-to-date answers by planning, executing, and verifying your work.

    IMPORTANT: We may not have all the information we need to answer the question comprehensively, but we need to make our best effort with the information available. Be transparent about any limitations in the available information.

    CRITICAL RULES:
    - Citation is non-negotiable. Every key fact, statistic, or finding must be cited immediately after the sentence or clause it appears in. An answer without markdown citations is an incorrect answer.
    - Synthesize information from multiple sources to provide a balanced and multi-faceted view.
    - Answer naturally without explaining your workflow (e.g., never say "According to my plan...").
    - Never use phrases like "Based on scraped data..."
    - Provide direct, confident answers
    - When discussing time-sensitive information, reference the current date and mention how recent the information is.
    - If information is limited, acknowledge this and provide the best answer possible with available data.
    
    Always use the current date and time as a reference point when answering questions.
    CURRENT DATE AND TIME: ${new Date().toISOString()}
    `
    : `You are a helpful AI assistant with web search and scraping capabilities. Your goal is to provide comprehensive, accurate, and up-to-date answers by planning, executing, and verifying your work.

    CRITICAL RULES:
    - Citation is non-negotiable. Every key fact, statistic, or finding must be cited immediately after the sentence or clause it appears in. An answer without markdown citations is an incorrect answer.
    - Synthesize information from multiple sources to provide a balanced and multi-faceted view.
    - Answer naturally without explaining your workflow (e.g., never say "According to my plan...").
    - Never use phrases like "Based on scraped data..."
    - Provide direct, confident answers
    - When discussing time-sensitive information, reference the current date and mention how recent the information is.

    Always use the current date and time as a reference point when answering questions.
    CURRENT DATE AND TIME: ${new Date().toISOString()}
`;

  const result = await generateText({
    model,
    system: systemPrompt,
    prompt: `
    USER QUESTION: ${userQuestion}

    Based on the research conducted, please provide a comprehensive answer to the user's question.

    Please provide a well-structured, comprehensive answer that synthesizes the information from all sources. Use markdown citations [source name](link) for all key facts and findings.

    Here is the research context:

    ${context.getQueryHistory()}

    ${context.getScrapeHistory()}
`,
  });

  return result.text;
} 