import { evalite } from "evalite";
import { askDeepSearch } from "~/server/deep-research";
import type { Message } from "ai";

evalite("Deep Search Eval", {
  data: async (): Promise<{ input: Message[] }[]> => {
    return [
      {
        input: [
          {
            id: "1",
            role: "user",
            content:
              "What is the latest version of TypeScript?",
          },
        ],
      },
      {
        input: [
          {
            id: "2",
            role: "user",
            content:
              "What are the main features of Next.js 15?",
          },
        ],
      },
      {
        input: [
          {
            id: "3",
            role: "user",
            content:
              "How do I set up authentication in a Next.js app?",
          },
        ],
      },
      {
        input: [
          {
            id: "4",
            role: "user",
            content:
              "What are the best practices for React performance optimization?",
          },
        ],
      },
      {
        input: [
          {
            id: "5",
            role: "user",
            content:
              "How do I deploy a Next.js application to Vercel?",
          },
        ],
      },
      {
        input: [
          {
            id: "6",
            role: "user",
            content:
              "What are the differences between TypeScript and JavaScript?",
          },
        ],
      },
    ];
  },
  task: async (input) => {
    return askDeepSearch(input);
  },
  scorers: [
    {
      name: "Contains Links",
      description:
        "Checks if the output contains any markdown links.",
      scorer: ({ output }) => {
        // Regex to match markdown links: [text](url)
        const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/;
        const containsLinks = markdownLinkRegex.test(output);

        return containsLinks ? 1 : 0;
      },
    },
  ],
}); 