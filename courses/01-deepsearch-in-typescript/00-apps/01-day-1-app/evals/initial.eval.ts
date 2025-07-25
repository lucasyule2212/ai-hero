import { evalite } from "evalite";
import { askDeepSearch } from "~/server/deep-research";
import type { Message } from "ai";
import { Factuality } from "./scorers/factuality-scorer";
import { AnswerRelevancy } from "./scorers/answer-relevancy-scorer";
import { env } from "~/env";
import { devData } from "./dev";
import { ciData } from "./ci";
import { regressionData } from "./regression";

evalite("Santa Cruz FC Deep Search Factuality Eval - Updated July 2025", {
  data: async (): Promise<
    { input: Message[]; expected: string }[]
  > => {
    let data = [...devData];

    // If CI, add the CI data
    if (env.EVAL_DATASET === "ci") {
      data.push(...ciData);
    }
    // If Regression, add the regression data AND the CI data
    else if (env.EVAL_DATASET === "regression") {
      data.push(...ciData, ...regressionData);
    }

    return data;
  },
  task: async (input) => {
    return askDeepSearch(input);
  },
  scorers: [
    {
      name: "Contains Links",
      description: "Checks if the output contains any markdown links.",
      scorer: ({ output }) => {
        const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/;
        const containsLinks = markdownLinkRegex.test(output);
        return containsLinks ? 1 : 0;
      },
    },
    Factuality,
    AnswerRelevancy,
  ],
});