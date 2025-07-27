import type { TextStreamPart } from "ai";

class MarkdownJoiner {
  private buffer = "";
  private isBuffering = false;
  private bufferType: "link" | "bold" | null = null;

  processText(text: string): string {
    let output = "";

    for (const char of text) {
      if (!this.isBuffering) {
        // Check if we should start buffering
        if (char === "[") {
          this.buffer = char;
          this.isBuffering = true;
          this.bufferType = "link";
        } else if (char === "*") {
          this.buffer = char;
          this.isBuffering = true;
          this.bufferType = "bold";
        } else {
          // Pass through character directly
          output += char;
        }
      } else {
        this.buffer += char;

        // Check for complete markdown elements or false positives
        if (this.isCompleteMarkdown()) {
          // Complete markdown element - flush buffer as is
          output += this.buffer;
          this.clearBuffer();
        } else if (this.isFalsePositive(char)) {
          // False positive - flush buffer as raw text
          output += this.buffer;
          this.clearBuffer();
        }
      }
    }

    return output;
  }

  private isCompleteMarkdown(): boolean {
    if (this.bufferType === "link") {
      // Check if we have a complete link: [text](url)
      // Look for the pattern: [text](url) where both text and url are complete
      const linkMatch = this.buffer.match(/^\[([^\]]*)\]\(([^)]*)\)$/);
      return linkMatch !== null;
    } else if (this.bufferType === "bold") {
      // Check if we have complete bold: **text**
      const boldMatch = this.buffer.match(/^\*\*([^*]*)\*\*$/);
      return boldMatch !== null;
    }
    return false;
  }

  private isFalsePositive(char: string): boolean {
    if (this.bufferType === "link") {
      // For links: if we see newline without completing the link
      return char === "\n";
    } else if (this.bufferType === "bold") {
      // For bold: if we see newline without completing bold
      return char === "\n";
    }
    return false;
  }

  private clearBuffer(): void {
    this.buffer = "";
    this.isBuffering = false;
    this.bufferType = null;
  }

  flush(): string {
    const remaining = this.buffer;
    this.clearBuffer();
    return remaining;
  }
}

export const markdownJoinerTransform = () => {
  const joiner = new MarkdownJoiner();

  return new TransformStream<
    TextStreamPart<{}>,
    TextStreamPart<{}>
  >({
      transform(chunk, controller) {
        if (chunk.type === "text-delta") {
          const processedText = joiner.processText(
            chunk.textDelta,
          );
          if (processedText) {
            controller.enqueue({
              ...chunk,
              textDelta: processedText,
            });
          }
        } else {
          controller.enqueue(chunk);
        }
      },
      flush(controller) {
        const remaining = joiner.flush();
        if (remaining) {
                  controller.enqueue({
          type: "text-delta",
          textDelta: remaining,
        } as TextStreamPart<{}>);
        }
      },
    });
  }; 