import type { Message } from "ai";
import {
  streamText, type StreamTextResult
} from "ai";
import { runAgentLoop } from "./run-agent-loop";
import type { OurMessageAnnotation } from "./system-context";
import type { UserLocation } from "~/utils/location";

export const streamFromDeepSearch = async (opts: {
  messages: Message[];
  onFinish: Parameters<
    typeof streamText
  >[0]["onFinish"];
  langfuseTraceId?: string;
  writeMessageAnnotation?: (annotation: OurMessageAnnotation) => void;
  userLocation?: UserLocation;
}): Promise<StreamTextResult<{}, string>> => {
  const conversationHistory = opts.messages;
  const langfuseTraceId = opts.langfuseTraceId ?? undefined;

  return runAgentLoop(conversationHistory, opts.writeMessageAnnotation, langfuseTraceId, opts.onFinish, opts.userLocation);
};

// Used for evals
export async function askDeepSearch(
  messages: Message[],
) {
  const result = await streamFromDeepSearch({
    messages,
    onFinish: () => {}, // just a stub
    writeMessageAnnotation: () => {}, // no-op for evals
    userLocation: undefined, // no location for evals
  });

  // Consume the stream - without this,
  // the stream will never finish
  await result.consumeStream();

  return await result.text;
} 