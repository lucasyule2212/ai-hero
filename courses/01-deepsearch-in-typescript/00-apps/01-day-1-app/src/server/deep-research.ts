import type { Message } from "ai";
import {
  streamText,
  type TelemetrySettings,
  type StreamTextResult,
} from "ai";
import { runAgentLoop } from "./run-agent-loop";

export const streamFromDeepSearch = async (opts: {
  messages: Message[];
  onFinish: Parameters<
    typeof streamText
  >[0]["onFinish"];
  telemetry: TelemetrySettings;
}): Promise<StreamTextResult<{}, string>> => {
  // Extract the user's question from the last message
  const lastMessage = opts.messages[opts.messages.length - 1];
  const userQuestion = lastMessage?.content || "";

  return runAgentLoop(userQuestion);
};

export async function askDeepSearch(
  messages: Message[],
) {
  const result = await streamFromDeepSearch({
    messages,
    onFinish: () => {}, // just a stub
    telemetry: {
      isEnabled: false,
    },
  });

  // Consume the stream - without this,
  // the stream will never finish
  await result.consumeStream();

  return await result.text;
} 