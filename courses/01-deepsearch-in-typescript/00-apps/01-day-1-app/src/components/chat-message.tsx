import ReactMarkdown, { type Components } from "react-markdown";
import type { MessagePart } from "../message-part.types";
import { ReasoningSteps } from "./reasoning-steps";
import type { OurMessageAnnotation } from "~/server/system-context";

interface ChatMessageProps {
  parts: MessagePart[];
  role: string;
  userName: string;
  annotations?: OurMessageAnnotation[];
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

export const ChatMessage = ({ parts, role, userName, annotations }: ChatMessageProps) => {
  const isAI = role === "assistant";

  // Get text parts for the main content
  const textParts = parts.filter(
    (part): part is MessagePart & { type: "text" } =>
      part.type === "text"
  );

  const finalText = textParts.map(part => part.text).join("");

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
        </div>

        {/* Show reasoning steps for AI messages */}
        {isAI && annotations && annotations.length > 0 && (
          <ReasoningSteps annotations={annotations} />
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
