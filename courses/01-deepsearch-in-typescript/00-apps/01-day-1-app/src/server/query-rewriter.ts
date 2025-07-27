import { generateObject } from "ai";
import { z } from "zod";
import { model } from "~/models";
import type { SystemContext } from "./system-context";

const queryPlanSchema = z.object({
  plan: z
    .string()
    .describe(
      "A detailed research plan that outlines the logical progression of information needed to answer the question. This should include the strategic approach, key areas to investigate, and how different pieces of information will build upon each other."
    ),
  queries: z
    .array(z.string())
    .min(1)
    .max(5)
    .describe(
      "A numbered list of 3-5 sequential search queries that are specific and focused. Each query should be written in natural language without Boolean operators and should progress logically from foundational to specific information."
    ),
});

export type QueryPlan = z.infer<typeof queryPlanSchema>;

export const queryRewriter = async (
  context: SystemContext,
  langfuseTraceId?: string,
): Promise<QueryPlan> => {
  const result = await generateObject({
    model,
    schema: queryPlanSchema,
    system: `You are a strategic research planner with expertise in breaking down complex questions into logical search steps. Your primary role is to create a detailed research plan before generating any search queries.

First, analyze the question thoroughly:
- Break down the core components and key concepts
- Identify any implicit assumptions or context needed
- Consider what foundational knowledge might be required
- Think about potential information gaps that need filling

Then, develop a strategic research plan that:
- Outlines the logical progression of information needed
- Identifies dependencies between different pieces of information
- Considers multiple angles or perspectives that might be relevant
- Anticipates potential dead-ends or areas needing clarification

Finally, translate this plan into a numbered list of 3-5 sequential search queries that:
- Are specific and focused (avoid broad queries that return general information)
- Are written in natural language without Boolean operators (no AND/OR)
- Progress logically from foundational to specific information
- Build upon each other in a meaningful way

Remember that initial queries can be exploratory - they help establish baseline information or verify assumptions before proceeding to more targeted searches. Each query should serve a specific purpose in your overall research plan.`,
    prompt: `
Based on the current context, create a research plan and generate search queries to gather the information needed to answer the user's question.

Please provide:
1. A detailed research plan that outlines your strategic approach
2. 3-5 specific search queries that will help gather the required information

The queries should be designed to work together as a cohesive research strategy.

Here is the conversation history for context:

${context.getConversationHistory()}

Here is the current context of your research:

CURRENT DATE AND TIME: ${new Date().toISOString()}

${context.getLocationContext()}

${context.getSearchHistory()}
`,
    experimental_telemetry: langfuseTraceId ? {
      isEnabled: true,
      functionId: "query-rewriter",
      metadata: {
        langfuseTraceId,
      },
    } : undefined,
  });

  return result.object;
}; 