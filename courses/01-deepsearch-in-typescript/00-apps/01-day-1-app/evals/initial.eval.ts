import { evalite } from "evalite";
import { askDeepSearch } from "~/server/deep-research";
import type { Message } from "ai";
import { Factuality } from "../src/factuality-scorer";

evalite("Santa Cruz FC Deep Search Factuality Eval - Updated July 2025", {
  data: async (): Promise<
    { input: Message[]; expected: string }[]
  > => {
    return [
      {
        input: [
          {
            id: "1",
            role: "user",
            content: "What's Santa Cruz's next match? Santa Cruz from Recife",
          },
        ],
        expected: "Santa Cruz's next match is on July 27, 2025, against Treze at Arena de Pernambuco at 16h (4:00 PM).",
      },
      {
        input: [
          {
            id: "2", 
            role: "user",
            content: "What was the result of Santa Cruz's most recent match?",
          },
        ],
        expected: "Santa Cruz lost their most recent match to Horizonte 2-0 on July 20, 2025.",
      },
      {
        input: [
          {
            id: "3",
            role: "user", 
            content: "Who is Santa Cruz's current head coach and when was he hired?",
          },
        ],
        expected: "Marcelo Cabo is Santa Cruz's current head coach. He was hired in April 2025 to replace Itamar Schülle.",
      },
      {
        input: [
          {
            id: "4",
            role: "user",
            content: "What are the ticket prices for Santa Cruz's next match and where will it be played?",
          },
        ],
        expected: "Ticket prices for Santa Cruz vs Treze range from R$15 to R$120 depending on the sector. The match will be played at Arena de Pernambuco, with tickets available through FutebolCard website.",
      },
      {
        input: [
          {
            id: "5",
            role: "user",
            content: "Who is Santa Cruz's current top scorer in Série D 2025 and how many goals has he scored?",
          },
        ],
        expected: "Thiago Galhardo is Santa Cruz's top scorer in Série D 2025 with 3 goals, including two in the important victory over América-RN.",
      },
      {
        input: [
          {
            id: "6",
            role: "user",
            content: "What is Santa Cruz's current position in their Série D group and their record so far?",
          },
        ],
        expected: "Santa Cruz is currently in 3rd place in Group A3 of Série D 2025. They have already secured qualification for the next phase despite dropping from the leadership position.",
      },
      {
        input: [
          {
            id: "7",
            role: "user", 
            content: "How many consecutive unbeaten games did Marcelo Cabo have in 2025 before any defeat?",
          },
        ],
        expected: "Marcelo Cabo maintained a 15-game unbeaten streak in 2025, with 15 victories across two different clubs (Capital-DF and Santa Cruz), making him the second coach with most wins in Brazil in 2025.",
      },
      {
        input: [
          {
            id: "8",
            role: "user",
            content: "Why did Santa Cruz decide to play their next match at Arena de Pernambuco instead of Arruda stadium?",
          },
        ],
        expected: "Santa Cruz moved the match to Arena de Pernambuco to maximize revenue and test the venue for potential mata-mata rounds. While Arruda accommodates 30,000 fans, Arena de Pernambuco can hold over 45,500 people.",
      },
      {
        input: [
          {
            id: "9",
            role: "user",
            content: "What other attacking players have been performing well alongside top scorer Thiago Galhardo?",
          },
        ],
        expected: "Besides Thiago Galhardo, Thiaguinho has been performing well, ending a goalless streak by scoring against Central and providing two assists in the win over Horizonte. The team has a strong offensive quartet that has been impressing fans.",
      },
      {
        input: [
          {
            id: "10",
            role: "user",
            content: "How many goals has Santa Cruz scored and conceded under Marcelo Cabo's management?",
          },
        ],
        expected: "Under Marcelo Cabo's management, Santa Cruz has scored 9 goals and conceded only 2 goals, demonstrating both offensive efficiency and defensive solidity.",
      },
      {
        input: [
          {
            id: "11",
            role: "user",
            content: "What was Marcelo Cabo's previous coaching achievement before joining Santa Cruz?",
          },
        ],
        expected: "Before joining Santa Cruz, Marcelo Cabo was vice-champion of the Brasiliense Championship with Capital-DF in 2025, going undefeated during the campaign before losing the final on penalties.",
      },
      {
        input: [
          {
            id: "12",
            role: "user",
            content: "How has Santa Cruz's recent form been in the second half of the Série D group stage?",
          },
        ],
        expected: "Santa Cruz had a difficult second half of the group stage, going four consecutive matches without a win before their final match against Treze, which affected their position despite having already secured qualification.",
      },
      {
        input: [
          {
            id: "13", 
            role: "user",
            content: "What was Santa Cruz's attendance like during their successful period under Marcelo Cabo?",
          },
        ],
        expected: "Santa Cruz had excellent attendance, with over 30,000 fans attending matches at Arruda, including sold-out games. Marcelo Cabo expressed his desire to play for 50,000 fans and praised the passionate support.",
      },
      {
        input: [
          {
            id: "14",
            role: "user",
            content: "What security measure does Santa Cruz require for stadium access at Arruda?",
          },
        ],
        expected: "Santa Cruz requires biometric facial recognition for access to games at Estádio do Arruda.",
      },
      {
        input: [
          {
            id: "15",
            role: "user", 
            content: "What was the importance of Santa Cruz's qualification timing in Série D 2025?",
          },
        ],
        expected: "Santa Cruz secured their qualification for the next phase with three rounds in advance, which was the result of consistent work from the beginning and gave them breathing room to prepare for the mata-mata rounds.",
      },
      {
        input: [
          {
            id: "16",
            role: "user",
            content: "What notable career achievement does Marcelo Cabo have as a coach?",
          },
        ],
        expected: "Marcelo Cabo's biggest career achievement is winning the Série B title in 2016 with Atlético-GO. He also achieved the historic promotion of CSA to Série A in 2018 as vice-champion of Série B.",
      },
      {
        input: [
          {
            id: "17",
            role: "user",
            content: "How many clubs are in Santa Cruz's Série D group and what is the competition format?",
          },
        ],
        expected: "Santa Cruz's Group A3 has 8 clubs (América-RN, Central, Ferroviário, Horizonte, Santa Cruz-RN, Sousa, Treze, and Santa Cruz). Teams play each other in home and away rounds for 14 matches total, with the top 4 advancing to mata-mata.",
      },
      {
        input: [
          {
            id: "18",
            role: "user",
            content: "What was Santa Cruz's goal-scoring record in the group stage under Marcelo Cabo?",
          },
        ],
        expected: "Santa Cruz had the second-best attack in Group A3 with 10 goals in six matches during their successful period, averaging approximately 1.67 goals per game.",
      },
      {
        input: [
          {
            id: "19",
            role: "user",
            content: "What challenge did Marcelo Cabo describe about building the Santa Cruz squad?",
          },
        ],
        expected: "Marcelo Cabo described building the squad as 'changing the tire while the car is moving' due to the significant squad overhaul from the Pernambucano Championship, requiring rapid adaptation from both coaching staff and players.",
      },
      {
        input: [
          {
            id: "20",
            role: "user",
            content: "Which competition is Santa Cruz currently participating in and what tier of Brazilian football is it?",
          },
        ],
        expected: "Santa Cruz is currently participating in the Brasileirão Série D 2025, which is the fourth tier of Brazilian football.",
      },
    ];
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
  ],
});