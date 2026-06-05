export const studyConfig = {
  practiceSequenceId: "0021500001_1_1445991320733.json",
  mainSequenceIds: [
    "0021500001_1_1445991439008.json",
    "0021500118_2_1447293641800.json",
    "0021500371_2_1450313741461.json",
  ],
  randomizeTrialOrder: true,
  sequences: {
    "0021500001_1_1445991320733.json": {
      label: "Practice possession",
      candidateActions: ["Shoot", "Pass to Player 1", "Pass to Player 2", "Pass to Player 3", "Keep dribbling", "Pass to Player 5"],
      playerLabels: ["Player 1", "Player 2", "Player 3", "Player 4", "Player 5"],
      modelOutputAvailable: true,
    },
    "0021500001_1_1445991439008.json": {
      label: "Main possession 1",
      candidateActions: ["Shoot", "Pass to Player 1", "Pass to Player 2", "Pass to Player 3", "Keep dribbling", "Pass to Player 5"],
      playerLabels: ["Player 1", "Player 2", "Player 3", "Player 4", "Player 5"],
      modelOutputAvailable: true,
    },
    "0021500118_2_1447293641800.json": {
      label: "Main possession 2",
      candidateActions: ["Shoot", "Pass to Player 1", "Pass to Player 2", "Pass to Player 3", "Keep dribbling", "Pass to Player 5"],
      playerLabels: ["Player 1", "Player 2", "Player 3", "Player 4", "Player 5"],
      modelOutputAvailable: true,
    },
    "0021500371_2_1450313741461.json": {
      label: "Main possession 3",
      candidateActions: ["Shoot", "Pass to Player 1", "Pass to Player 2", "Pass to Player 3", "Keep dribbling", "Pass to Player 5"],
      playerLabels: ["Player 1", "Player 2", "Player 3", "Player 4", "Player 5"],
      modelOutputAvailable: true,
    },
  },
};
