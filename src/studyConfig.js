export const studyConfig = {
  practiceSequenceIds: [
    "0021500001_1_1445991320733.json",
    "0021500001_1_1445991439008.json",
    "0021500118_2_1447293641800.json",
  ],
  mainTrialCount: 10,
  mainSequenceIds: [
    "0021500020_4_1446181964721.json",
    "0021500022_3_1446251948946.json",
    "0021500110_3_1447208359906.json",
    "0021500154_4_1447729713606.json",
    "0021500161_1_1447807638687.json",
    "0021500169_3_1447899876238.json",
    "0021500170_2_1447897642205.json",
    "0021500236_3_1448683625473.json",
    "0021500247_1_1448830643564.json",
    "0021500258_1_1448932235287.json",
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
      label: "Practice possession 2",
      candidateActions: ["Shoot", "Pass to Player 1", "Pass to Player 2", "Pass to Player 3", "Keep dribbling", "Pass to Player 5"],
      playerLabels: ["Player 1", "Player 2", "Player 3", "Player 4", "Player 5"],
      modelOutputAvailable: true,
    },
    "0021500118_2_1447293641800.json": {
      label: "Practice possession 3",
      candidateActions: ["Shoot", "Pass to Player 1", "Pass to Player 2", "Pass to Player 3", "Keep dribbling", "Pass to Player 5"],
      playerLabels: ["Player 1", "Player 2", "Player 3", "Player 4", "Player 5"],
      modelOutputAvailable: true,
    },
    "0021500371_2_1450313741461.json": {
      label: "Main possession backup",
      candidateActions: ["Shoot", "Pass to Player 1", "Pass to Player 2", "Pass to Player 3", "Keep dribbling", "Pass to Player 5"],
      playerLabels: ["Player 1", "Player 2", "Player 3", "Player 4", "Player 5"],
      modelOutputAvailable: true,
    },
  },
};
