import ReactMarkdown, { type Components } from "react-markdown";
import { ChevronDown, Brain, Search } from "lucide-react";
import { useState } from "react";
import type { MessagePart } from "../message-part.types";

interface ChatMessageProps {
  parts: MessagePart[];
  role: string;
  userName: string;
}

const components: Components = {
  // Override default elements with custom styling
  p: ({ children }) => <p className="mb-4 first:mt-0 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="mb-4 list-disc pl-4">{children}</ul>,
  ol: ({ children }) => <ol className="mb-4 list-decimal pl-4">{children}</ol>,
  li: ({ children }) => <li className="mb-1">{children}</li>,
  code: ({ className, children, ...props }) => (
    <code className={`${className ?? ""}`} {...props}>
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="mb-4 overflow-x-auto rounded-lg bg-gray-700 p-4">
      {children}
    </pre>
  ),
  a: ({ children, ...props }) => (
    <a
      className="text-blue-400 underline"
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    >
      {children}
    </a>
  ),
};

const Markdown = ({ children }: { children: string }): JSX.Element => {
  return <ReactMarkdown components={components}>{children}</ReactMarkdown>;
};

const ToolInvocationDisplay = ({
  toolInvocation
}: {
  toolInvocation: MessagePart & { type: "tool-invocation" }
}): JSX.Element => {
  const { toolInvocation: invocation } = toolInvocation;

  const formatToolName = (name: string) => {
    return name.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
  };

  const formatArgs = (args: any) => {
    if (typeof args === 'object' && args !== null) {
      const entries = Object.entries(args);
      if (entries.length === 1) {
        const entry = entries[0];
        if (entry) {
          if (entry[0] === 'query') {
            return `Searching for: "${entry[1]}"`;
          }
          return `${entry[0]}: "${entry[1]}"`;
        }
      }
      return entries
        .map(([key, value]) => `${key}: "${value}"`)
        .join(', ');
    }
    return `"${args}"`;
  };

  const renderSearchResults = (results: any[]) => {
    return (
      <div className="space-y-2">
        {results.map((result, index) => (
          <a
            key={index}
            href={result.link}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-md border border-gray-600 bg-gray-700/30 p-3 transition-all duration-200 hover:border-gray-500 hover:bg-gray-700/50 truncate overflow-hidden"
          >
            <div className="text-sm font-medium text-blue-400 hover:text-blue-300">
              {result.title}
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-gray-400">
              <span className="truncate">{result.link}</span>
              {result.date && result.date !== "N/A" && (
                <span className="ml-2 flex-shrink-0 text-green-400">
                  {result.date}
                </span>
              )}
            </div>
            {result.snippet && (
              <div className="mt-2 text-xs text-gray-300 line-clamp-2">
                {result.snippet}
              </div>
            )}
          </a>
        ))}
      </div>
    );
  };

  const formatResult = (result: any) => {
    if (Array.isArray(result)) {
      // Check if it looks like search results
      if (result.length > 0 && result[0] && typeof result[0] === 'object' && 'title' in result[0] && 'link' in result[0]) {
        return renderSearchResults(result);
      }
      return `${result.length} result${result.length !== 1 ? 's' : ''}`;
    }
    if (typeof result === 'object' && result !== null) {
      return 'Object result';
    }
    return String(result);
  };

  return (
    <div className="mb-3 rounded-lg border border-gray-600 bg-gray-900/50 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Search className="size-4 text-blue-400" />
        <span className="text-sm font-medium text-blue-400">
          {formatToolName(invocation.toolName)}
        </span>
        <span className="text-xs text-gray-400">
          {invocation.state === 'result' ? 'completed' : invocation.state}
        </span>
      </div>

      {invocation.state === "call" || invocation.state === "partial-call" ? (
        <div className="space-y-2">
          <div>
            <span className="text-xs font-medium text-gray-400">Input:</span>
            <p className="mt-1 text-sm text-gray-300">
              {formatArgs(invocation.args)}
            </p>
          </div>
        </div>
      ) : invocation.state === "result" ? (
        <div className="space-y-3 overflow-hidden">
          <div>
            <span className="text-xs font-medium text-gray-400">Input:</span>
            <p className="mt-1 text-sm text-gray-300">
              {formatArgs(invocation.args)}
            </p>
          </div>
          <div>
            <span className="text-xs font-medium text-gray-400">Output:</span>
            <div className="mt-2">
              {formatResult(invocation.result)}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

const ReasoningDisplay = ({
  reasoning
}: {
  reasoning: MessagePart & { type: "reasoning" }
}): JSX.Element => {
  return (
    <div className="mb-3 rounded-lg border border-gray-600 bg-gray-800/50 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Brain className="size-4 text-purple-400" />
        <span className="text-sm font-medium text-purple-400">Thinking</span>
      </div>
      <div className="text-sm text-gray-300 leading-relaxed">
        {reasoning.reasoning}
      </div>
      {reasoning.details && reasoning.details.length > 0 && (
        <div className="mt-3">
          <span className="text-xs font-medium text-gray-400">Details:</span>
          <div className="mt-2 space-y-2">
            {reasoning.details.map((detail: any, index: number) => (
              <div key={index} className="rounded-md bg-gray-700/50 p-3 text-sm">
                {detail.type === "text" ? (
                  <span className="text-gray-300">{detail.text}</span>
                ) : (
                  <span className="text-gray-500">[Redacted information]</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export const ChatMessage = ({ parts, role, userName }: ChatMessageProps) => {
  const isAI = role === "assistant";
  const [showTools, setShowTools] = useState(false);

  // Separate parts by type
  const toolInvocations = parts.filter(
    (part): part is MessagePart & { type: "tool-invocation" } =>
      part.type === "tool-invocation"
  );
  const reasoningParts = parts.filter(
    (part): part is MessagePart & { type: "reasoning" } =>
      part.type === "reasoning"
  );
  const textParts = parts.filter(
    (part): part is MessagePart & { type: "text" } =>
      part.type === "text"
  );

  const hasToolsOrReasoning = toolInvocations.length > 0 || reasoningParts.length > 0;
  const finalText = textParts.map(part => part.text).join("");

  const getToolSummary = () => {
    if (toolInvocations.length > 0 && reasoningParts.length > 0) {
      return `${toolInvocations.length} tool${toolInvocations.length > 1 ? 's' : ''}, ${reasoningParts.length} thought${reasoningParts.length > 1 ? 's' : ''}`;
    } else if (toolInvocations.length > 0) {
      return `${toolInvocations.length} tool${toolInvocations.length > 1 ? 's' : ''}`;
    } else {
      return `${reasoningParts.length} thought${reasoningParts.length > 1 ? 's' : ''}`;
    }
  };

  return (
    <div className="mb-6">
      <div
        className={`rounded-lg p-4 ${isAI ? "bg-gray-800 text-gray-300" : "bg-gray-900 text-gray-300"
          }`}
      >
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-400">
            {isAI ? "AI" : userName}
          </p>

          {hasToolsOrReasoning && isAI && (
            <button
              onClick={() => setShowTools(!showTools)}
              className="flex items-center gap-1.5 rounded-full border border-gray-600 bg-transparent px-3 py-1 text-xs text-gray-400 transition-all duration-200 hover:border-gray-500 hover:bg-gray-700/50 hover:text-gray-300"
            >
              <span>{getToolSummary()}</span>
              <ChevronDown
                className={`size-3 transition-transform duration-200 ${showTools ? 'rotate-0' : '-rotate-90'
                  }`}
              />
            </button>
          )}
        </div>

        {hasToolsOrReasoning && isAI && (
          <div
            className={`overflow-hidden transition-all duration-300 ease-in-out ${showTools ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'
              }`}
          >
            <div className="space-y-3 pb-3 max-h-[600px] overflow-y-auto">
              {reasoningParts.map((reasoning, index) => (
                <ReasoningDisplay key={`reasoning-${index}`} reasoning={reasoning} />
              ))}
              {toolInvocations.map((toolInvocation, index) => (
                <ToolInvocationDisplay key={`tool-${index}`} toolInvocation={toolInvocation} />
              ))}
            </div>
          </div>
        )}

        {finalText && (
          <div className="prose prose-invert max-w-none">
            <Markdown>{finalText}</Markdown>
          </div>
        )}
      </div>
    </div>
  );
};
