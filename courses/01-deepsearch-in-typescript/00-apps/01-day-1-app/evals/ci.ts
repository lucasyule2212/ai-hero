import type { Message } from "ai";

export const ciData: { input: Message[]; expected: string }[] = [
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
]; 