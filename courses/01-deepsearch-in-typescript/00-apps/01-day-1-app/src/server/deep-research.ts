import type { Message } from "ai";
import {
  streamText, type StreamTextResult
} from "ai";
import { runAgentLoop } from "./run-agent-loop";
import type { OurMessageAnnotation } from "./system-context";

export const streamFromDeepSearch = async (opts: {
  messages: Message[];
  onFinish: Parameters<
    typeof streamText
  >[0]["onFinish"];
  langfuseTraceId?: string;
  writeMessageAnnotation?: (annotation: OurMessageAnnotation) => void;
}): Promise<StreamTextResult<{}, string>> => {
  // Extract the user's question from the last message
  const lastMessage = opts.messages[opts.messages.length - 1];
  const userQuestion = lastMessage?.content || "";

  const langfuseTraceId = opts.langfuseTraceId ?? undefined;

  return runAgentLoop(userQuestion, opts.writeMessageAnnotation, langfuseTraceId);
};

// Used for evals
export async function askDeepSearch(
  messages: Message[],
) {
  const result = await streamFromDeepSearch({
    messages,
    onFinish: () => {}, // just a stub
    writeMessageAnnotation: () => {}, // no-op for evals
  });

  // Consume the stream - without this,
  // the stream will never finish
  await result.consumeStream();

  return await result.text;
} 