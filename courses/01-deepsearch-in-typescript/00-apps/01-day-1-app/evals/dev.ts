import type { Message } from "ai";

export const devData: { input: Message[]; expected: string }[] = [
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
    expected: "Thiago Galhardo is Santa Cruz's top scorer in Série D 2025 with 5 goals, including two in the important victory over América-RN.",
  },
]; 