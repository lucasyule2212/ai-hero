import type { Message } from "ai";

export type MessagePart = NonNullable<Message["parts"]>[number];

export type TextUIPart = {
  type: "text";
  text: string;
};

export type ReasoningUIPart = {
  type: "reasoning";
  reasoning: string;
  details: Array<
    | {
        type: "text";
        text: string;
        signature?: string;
      }
    | {
        type: "redacted";
        data: string;
      }
  >;
};

export type ToolInvocationUIPart = {
  type: "tool-invocation";
  toolInvocation: ToolInvocation;
};

export type ToolInvocation =
  | ({
      state: "partial-call";
      step?: number;
    } & ToolCall<string, any>)
  | ({ state: "call"; step?: number } & ToolCall<string, any>)
  | ({ state: "result"; step?: number } & ToolResult<string, any, any>);

export interface ToolCall<NAME extends string, ARGS> {
  toolCallId: string;
  toolName: NAME;
  args: ARGS;
}

export interface ToolResult<NAME extends string, ARGS, RESULT> {
  toolCallId: string;
  toolName: NAME;
  args: ARGS;
  result: RESULT;
} 