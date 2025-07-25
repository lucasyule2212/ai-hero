import type { Message } from "ai";

export const regressionData: { input: Message[]; expected: string }[] = [
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