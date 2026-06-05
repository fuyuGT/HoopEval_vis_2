import React, { useCallback, useEffect, useMemo, useState } from "react";
import "./App.css";
import {
  alpha,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CssBaseline,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  ThemeProvider,
  Tooltip,
  Typography,
  createTheme,
} from "@mui/material";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DragIndicatorRoundedIcon from "@mui/icons-material/DragIndicatorRounded";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import KeyboardArrowUpRoundedIcon from "@mui/icons-material/KeyboardArrowUpRounded";
import PauseCircleOutlineRoundedIcon from "@mui/icons-material/PauseCircleOutlineRounded";
import PlayCircleOutlineRoundedIcon from "@mui/icons-material/PlayCircleOutlineRounded";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import SportsBasketballRoundedIcon from "@mui/icons-material/SportsBasketballRounded";
import ShowChartRoundedIcon from "@mui/icons-material/ShowChartRounded";
import ViewInArRoundedIcon from "@mui/icons-material/ViewInArRounded";
import { DrawPlayers } from "./components/DrawPlayers";
import ValueChart from "./components/ValueChart";
import { studyConfig } from "./studyConfig";
import { dataFiles } from "virtual:hoopeval-data-files";

const dashboardTheme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#0f4c81" },
    secondary: { main: "#e76f51" },
    background: { default: "#f5f7fb", paper: "#ffffff" },
  },
  shape: { borderRadius: 8 },
  typography: {
    fontFamily: '"Space Grotesk", "Manrope", "Segoe UI", sans-serif',
    h5: { fontWeight: 700, lineHeight: 1.15 },
    h6: { fontWeight: 650 },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          border: "1px solid rgba(15, 76, 129, 0.12)",
          boxShadow: "0 8px 24px rgba(11, 31, 53, 0.06)",
        },
      },
    },
  },
});

const likertLabels = [
  "1 - Strongly disagree",
  "2 - Disagree",
  "3 - Neutral",
  "4 - Agree",
  "5 - Strongly agree",
];

const usefulnessLabels = [
  "1 - Not useful",
  "2 - Slightly useful",
  "3 - Moderately useful",
  "4 - Very useful",
  "5 - Extremely useful",
];

const explanationUsefulnessLabels = [
  "1 - Not helpful",
  "2 - Slightly helpful",
  "3 - Moderately helpful",
  "4 - Very helpful",
  "5 - Extremely helpful",
];

const useCases = [
  "game preparation",
  "post-game analysis",
  "player development",
  "tactical teaching",
  "scouting",
  "live decision support",
  "youth training",
];

const interviewSections = [
  "overall impression",
  "expert judgment vs model alignment",
  "disagreement cases",
  "EPV interpretation",
  "explanation usefulness",
  "trust and skepticism",
  "coaching workflow integration",
  "design feedback",
  "missing basketball context",
];

const nowIso = () => new Date().toISOString();
const studyDatabaseKey = "hoopevalStudyDatabase";

const createSessionId = () => `hoopeval-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const readStudyDatabase = () => {
  try {
    return JSON.parse(localStorage.getItem(studyDatabaseKey) || "[]");
  } catch {
    return [];
  }
};

const writeStudyDatabase = (sessions) => {
  localStorage.setItem(studyDatabaseKey, JSON.stringify(sessions));
};

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "";

const apiRequest = async (path, options = {}) => {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return response.json();
};

const fetchStudyDatabase = async () => {
  try {
    const data = await apiRequest("/api/sessions");
    return Array.isArray(data.sessions) ? data.sessions : [];
  } catch {
    return readStudyDatabase();
  }
};

const saveStudySession = async (session) => {
  try {
    await apiRequest("/api/sessions", {
      method: "POST",
      body: JSON.stringify(session),
    });
    return true;
  } catch {
    return false;
  }
};

const shuffle = (items) => {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const csvEscape = (value) => {
  const text = Array.isArray(value) ? value.join("|") : value == null ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
};

const toCsv = (rows, columns) => {
  const header = columns.map(csvEscape).join(",");
  const body = rows.map((row) => columns.map((column) => csvEscape(row[column])).join(",")).join("\n");
  return [header, body].filter(Boolean).join("\n");
};

const downloadText = (fileName, text, type) => {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
};

const getBrowserMetadata = () => ({
  userAgent: navigator.userAgent,
  language: navigator.language,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  viewportWidth: window.innerWidth,
  viewportHeight: window.innerHeight,
});

const buildDataUrl = (fileName) => `${import.meta.env.BASE_URL}data/${encodeURIComponent(fileName)}`;

const buildEmptyTrial = (sequenceId, isPractice) => ({
  sequenceId,
  isPractice,
  phaseAStartTime: "",
  phaseAEndTime: "",
  independentActionRanking: [],
  independentActionRationale: "",
  actionConfidence: "",
  independentPlayerRanking: [],
  playerContributionRationale: "",
  playerConfidence: "",
  modelRevealTime: "",
  phaseBStartTime: "",
  phaseBEndTime: "",
  epvAlignment: "",
  actionAlignment: "",
  playerContributionAlignment: "",
  explanationUsefulness: "",
  trust: "",
  contestability: "",
  disagreementExplanation: "",
  disagreementMoment: "",
});

const getSequenceConfig = (sequenceId) =>
  studyConfig.sequences[sequenceId] || {
    label: sequenceId.replace(".json", ""),
    candidateActions: ["Shoot", "Pass to Player 1", "Pass to Player 2", "Pass to Player 3", "Keep dribbling", "Pass to Player 5"],
    playerLabels: ["Player 1", "Player 2", "Player 3", "Player 4", "Player 5"],
    modelOutputAvailable: true,
  };

const ActionLegend = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <Paper
      elevation={0}
      sx={{
        position: "fixed",
        top: { xs: 16, md: 24 },
        right: { xs: 16, md: 24 },
        width: { xs: "calc(100vw - 32px)", sm: 360 },
        p: 2,
        zIndex: 1200,
        border: "1px solid",
        borderColor: "divider",
        boxShadow: "0 12px 35px rgba(0,0,0,0.14)",
        bgcolor: alpha("#ffffff", 0.98),
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
        <Typography variant="h6">Player Actions</Typography>
        <IconButton onClick={onClose} size="small" aria-label="close legend">
          <CloseRoundedIcon fontSize="small" />
        </IconButton>
      </Stack>
      <Typography variant="body2" color="text.secondary" mb={1}>
        Colored sectors around offensive players represent action Q-values after model output is revealed.
      </Typography>
      <Stack spacing={0.6}>
        <Typography variant="body2">Center circle: action 0</Typography>
        <Typography variant="body2">Rings clockwise from bottom: actions 1-24</Typography>
        <Typography variant="body2">Gold border: observed action</Typography>
      </Stack>
    </Paper>
  );
};

const Section = ({ title, children, action, description }) => (
  <Paper elevation={0} sx={{ p: { xs: 2, md: 2.5 }, border: "1px solid", borderColor: "divider" }}>
    <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" gap={1.5} mb={2}>
      <Box>
        <Typography variant="h6">{title}</Typography>
        {description && (
          <Typography variant="body2" color="text.secondary">
            {description}
          </Typography>
        )}
      </Box>
      {action}
    </Stack>
    {children}
  </Paper>
);

const CompactSection = ({ title, children, action, description, sx }) => (
  <Paper elevation={0} sx={{ p: 1.25, border: "1px solid", borderColor: "divider", ...sx }}>
    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1} mb={1}>
      <Box>
        <Typography variant="subtitle1" fontWeight={700}>
          {title}
        </Typography>
        {description && (
          <Typography variant="caption" color="text.secondary" display="block">
            {description}
          </Typography>
        )}
      </Box>
      {action}
    </Stack>
    {children}
  </Paper>
);

const LikertSelect = ({ label, value, onChange, required = false, options = likertLabels }) => (
  <FormControl size="small" fullWidth required={required}>
    <InputLabel>{label}</InputLabel>
    <Select value={value} label={label} onChange={(event) => onChange(event.target.value)}>
      {options.map((option, index) => (
        <MenuItem key={option} value={index + 1}>
          {option}
        </MenuItem>
      ))}
    </Select>
  </FormControl>
);

const RankingInputs = ({ title, choices, value, onChange }) => {
  const [dragIndex, setDragIndex] = useState(null);
  const ranked = value.filter((choice) => choices.includes(choice));
  const unranked = choices.filter((choice) => !ranked.includes(choice));

  const addChoice = (choice) => {
    onChange([...ranked, choice]);
  };

  const removeChoice = (choice) => {
    onChange(ranked.filter((item) => item !== choice));
  };

  const moveChoice = (index, direction) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= ranked.length) return;

    moveChoiceTo(index, nextIndex);
  };

  const moveChoiceTo = (fromIndex, toIndex) => {
    if (fromIndex === toIndex || fromIndex == null || toIndex == null) return;

    const next = [...ranked];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    onChange(next);
  };

  return (
    <Stack spacing={0.75}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1}>
        <Typography variant="subtitle2">{title}</Typography>
        <Chip size="small" variant="outlined" label={`${ranked.length}/${choices.length}`} />
      </Stack>
      <Typography variant="caption" color="text.secondary">
        Add all choices, then drag ranked rows to reorder them.
      </Typography>

      <Stack spacing={0.5}>
        {ranked.map((choice, index) => (
          <Paper
            key={choice}
            elevation={0}
            draggable
            onDragStart={(event) => {
              setDragIndex(index);
              event.dataTransfer.effectAllowed = "move";
              event.dataTransfer.setData("text/plain", choice);
            }}
            onDragOver={(event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = "move";
            }}
            onDrop={(event) => {
              event.preventDefault();
              moveChoiceTo(dragIndex, index);
              setDragIndex(null);
            }}
            onDragEnd={() => setDragIndex(null)}
            sx={{
              px: 0.75,
              py: 0.45,
              display: "grid",
              gridTemplateColumns: "20px 28px minmax(0, 1fr) auto",
              alignItems: "center",
              gap: 0.5,
              border: "1px solid",
              borderColor: dragIndex === index ? alpha("#e76f51", 0.55) : alpha("#0f4c81", 0.18),
              bgcolor: dragIndex === index ? "#fff7ed" : "#f8fbff",
              cursor: "grab",
              opacity: dragIndex === index ? 0.72 : 1,
            }}
          >
            <DragIndicatorRoundedIcon fontSize="small" color="action" />
            <Chip size="small" color="primary" label={index + 1} sx={{ width: 26, height: 24 }} />
            <Typography variant="body2" noWrap>
              {choice}
            </Typography>
            <Stack direction="row" spacing={0.25}>
              <IconButton size="small" onClick={() => moveChoice(index, -1)} disabled={index === 0} aria-label={`move ${choice} up`}>
                <KeyboardArrowUpRoundedIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" onClick={() => moveChoice(index, 1)} disabled={index === ranked.length - 1} aria-label={`move ${choice} down`}>
                <KeyboardArrowDownRoundedIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" onClick={() => removeChoice(choice)} aria-label={`remove ${choice}`}>
                <CloseRoundedIcon fontSize="small" />
              </IconButton>
            </Stack>
          </Paper>
        ))}
      </Stack>

      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
        {unranked.map((choice) => (
          <Button
            key={choice}
            size="small"
            variant="outlined"
            startIcon={<AddRoundedIcon />}
            onClick={() => addChoice(choice)}
            sx={{ minHeight: 30, px: 0.9 }}
          >
            {choice}
          </Button>
        ))}
      </Stack>
    </Stack>
  );
};

const PossessionViewer = ({
  sequenceLabel,
  playerData,
  valueData,
  qBall,
  qPlayer,
  realPlayerActions,
  contributionData,
  currentStep,
  setCurrentStep,
  isPlaying,
  setIsPlaying,
  totalFrames,
  showModelOutput,
  onLegendOpen,
}) => {
  const courtWidth = showModelOutput ? 860 : 1040;
  const valueChartWidth = 520;
  const handleRestart = () => {
    setIsPlaying?.(false);
    setCurrentStep?.(0);
    setTimeout(() => setIsPlaying?.(true), 120);
  };

  return (
    <Box
      sx={{
        display: "grid",
        gap: 1,
        height: { md: "100%" },
        minHeight: 0,
        overflow: { md: showModelOutput ? "auto" : "hidden", lg: "hidden" },
        gridTemplateColumns: {
          xs: "1fr",
          lg: showModelOutput ? "minmax(460px, 540px) minmax(0, 1fr)" : "1fr",
        },
        alignItems: "stretch",
      }}
    >
      {showModelOutput && (
        <Card sx={{ height: { lg: "100%" }, minHeight: 0, overflow: "hidden" }}>
          <CardContent sx={{ p: 1.25, height: "100%", overflow: "auto", "&:last-child": { pb: 1.25 } }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
              <Stack direction="row" spacing={1} alignItems="center">
                <ShowChartRoundedIcon color="primary" fontSize="small" />
                <Typography variant="h6">Model Output</Typography>
              </Stack>
              <Chip size="small" variant="outlined" label="Revealed" />
            </Stack>
            <Typography variant="caption" color="text.secondary" display="block" mb={0.75}>
              Review EPV, action values, contributions, and cues for the same possession.
            </Typography>
            <ValueChart
              values={valueData}
              width={valueChartWidth}
              currentStep={currentStep}
              setCurrentStep={setCurrentStep}
              isPlaying={isPlaying}
              setIsPlaying={setIsPlaying}
              totalFrames={totalFrames}
              qBall={qBall}
              contributionData={contributionData}
              showEPVCurve={showModelOutput}
              showActionValues={showModelOutput}
              showPlayerContributions={showModelOutput}
              compact
              showControls={false}
            />
          </CardContent>
        </Card>
      )}

      <Card sx={{ height: { md: showModelOutput ? "auto" : "100%", lg: "100%" }, minHeight: 0, overflow: "hidden" }}>
        <CardContent
          sx={{
            p: 1.25,
            height: "100%",
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            "&:last-child": { pb: 1.25 },
          }}
        >
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.75}>
            <Stack direction="row" spacing={1} alignItems="center">
              <ViewInArRoundedIcon color="secondary" fontSize="small" />
              <Typography variant="h6">Court Playback</Typography>
              {!showModelOutput && (
                <Chip size="small" variant="outlined" label="Model hidden" />
              )}
            </Stack>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Tooltip title={isPlaying ? "Pause playback" : "Play possession"}>
                <IconButton size="small" color="primary" onClick={() => setIsPlaying?.(!isPlaying)} aria-label="play-pause">
                  {isPlaying ? (
                    <PauseCircleOutlineRoundedIcon fontSize="small" />
                  ) : (
                    <PlayCircleOutlineRoundedIcon fontSize="small" />
                  )}
                </IconButton>
              </Tooltip>
              <Tooltip title="Restart playback">
                <IconButton size="small" color="primary" onClick={handleRestart} aria-label="restart playback">
                  <RestartAltRoundedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Chip size="small" color="secondary" label={`${Math.min(currentStep + 1, totalFrames || 0)}/${totalFrames || 0}`} />
              <Tooltip title="Show action legend">
                <IconButton size="small" color="primary" onClick={onLegendOpen} aria-label="toggle action legend">
                  <InfoOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
          </Stack>
          <Typography variant="caption" color="text.secondary" display="block" mb={0.75}>
            {showModelOutput
              ? `Use playback to compare the same possession against the model output. ${sequenceLabel}`
              : `Use playback to inspect the possession before seeing model output. ${sequenceLabel}`}
          </Typography>
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              p: { xs: 0.75, md: 1 },
              borderRadius: 1,
              bgcolor: "#ffffff",
              border: "1px solid",
              borderColor: alpha("#0f4c81", 0.14),
              overflowX: "auto",
              display: "flex",
              justifyContent: "center",
            }}
          >
            <DrawPlayers
              width={courtWidth}
              playerData={playerData}
              qPlayer={qPlayer}
              currentStep={currentStep}
              setCurrentStep={setCurrentStep}
              isPlaying={isPlaying}
              setIsPlaying={setIsPlaying}
              realPlayerActions={realPlayerActions}
              showActionValues={showModelOutput}
            />
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

function App() {
  const availableFiles = useMemo(
    () => dataFiles.filter((file) => typeof file === "string" && file.toLowerCase().endsWith(".json")),
    [],
  );

  const [playerData, setPlayerData] = useState([]);
  const [valueData, setValueData] = useState([]);
  const [qBall, setQBall] = useState([]);
  const [qPlayer, setQPlayer] = useState([]);
  const [realPlayerActions, setRealPlayerActions] = useState([]);
  const [contributionData, setContributionData] = useState([]);
  const [isLegendOpen, setIsLegendOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const [page, setPage] = useState("welcome");
  const [participantId, setParticipantId] = useState("");
  const [consent, setConsent] = useState({
    required: false,
    audioRecording: false,
    screenRecording: false,
    anonymousQuotation: false,
  });
  const [session, setSession] = useState(null);
  const [trialIndex, setTrialIndex] = useState(0);
  const [phase, setPhase] = useState("a");
  const [trialQuestionStep, setTrialQuestionStep] = useState(0);
  const [phaseA, setPhaseA] = useState({
    independentActionRanking: [],
    independentActionRationale: "",
    actionConfidence: "",
    independentPlayerRanking: [],
    playerContributionRationale: "",
    playerConfidence: "",
  });
  const [phaseB, setPhaseB] = useState({
    epvAlignment: "",
    actionAlignment: "",
    playerContributionAlignment: "",
    explanationUsefulness: "",
    trust: "",
    contestability: "",
    disagreementExplanation: "",
    disagreementMoment: "",
  });
  const [background, setBackground] = useState({
    currentRole: "",
    yearsExperience: "",
    highestLevel: "",
    videoToolUse: "",
    analyticsUse: "",
    epvFamiliarity: "",
    visualizationComfort: "",
  });
  const [postStudy, setPostStudy] = useState({
    overallUsefulness: "",
    overallInterpretability: "",
    overallTrust: "",
    overallContestability: "",
    likelyUseCases: [],
    useCaseExplanation: "",
  });
  const [interviewNotes, setInterviewNotes] = useState(() =>
    Object.fromEntries(interviewSections.map((section) => [section, ""])),
  );
  const [completedSessions, setCompletedSessions] = useState(() => readStudyDatabase());

  const totalFrames = playerData?.[0]?.real_T?.length || 0;
  const currentTrial = session?.trials?.[trialIndex];
  const currentSequenceId = currentTrial?.sequenceId;
  const currentSequence = currentSequenceId ? getSequenceConfig(currentSequenceId) : null;
  const isAdmin = participantId.trim().toLowerCase() === "admin" || session?.participantId?.toLowerCase() === "admin";

  const updateSession = (updater) => {
    setSession((prev) => {
      if (!prev) return prev;
      return updater(prev);
    });
  };

  const markPageStart = (nextPage) => {
    setPage(nextPage);
    updateSession((prev) => ({
      ...prev,
      pageTimestamps: [...(prev.pageTimestamps || []), { page: nextPage, startTime: nowIso() }],
    }));
  };

  const saveCompletedSession = (completedSession) => {
    if (!completedSession || completedSession.participantId?.toLowerCase() === "admin") return;

    setCompletedSessions((prev) => {
      const next = [
        ...prev.filter((item) => item.sessionId !== completedSession.sessionId),
        completedSession,
      ];
      writeStudyDatabase(next);
      return next;
    });
    void saveStudySession(completedSession);
  };

  const loadCompletedSessions = useCallback(async () => {
    const sessions = await fetchStudyDatabase();
    writeStudyDatabase(sessions);
    setCompletedSessions(sessions);
  }, []);

  const clearLoadedData = useCallback(() => {
    setPlayerData([]);
    setValueData([]);
    setQBall([]);
    setQPlayer([]);
    setRealPlayerActions([]);
    setContributionData([]);
  }, []);

  const loadSelectedFile = useCallback(async (fileName) => {
    setIsLoading(true);
    setErrorText("");

    try {
      const response = await fetch(buildDataUrl(fileName));
      if (!response.ok) throw new Error(`Unable to load ${fileName}`);

      const data = await response.json();
      const frames = data?.frames || [];
      const playerIds = data?.player_ids || [];

      setPlayerData(
        playerIds.map((playerId, index) => ({
          agent_id: playerId,
          teamID: playerId === -1 ? -1 : index <= 5 ? 1610612737 : 1610612738,
          real_T: frames.map((frame) => frame.xy[index]),
          name: playerId === -1 ? "Ball" : `Player ${playerId}`,
          jersey: playerId === -1 ? "" : `${index}`,
        })),
      );
      setValueData(frames.map((frame) => frame?.Value?.[0]));
      setQBall(frames.map((frame) => frame.Q_ball));
      setQPlayer(frames.map((frame) => frame.Q_player));
      setRealPlayerActions(frames.map((frame) => frame.real_player_action));
      setContributionData(
        frames.map((frame, frameIndex) => {
          const qReal = Array.isArray(frame?.Q_real) ? frame.Q_real : [];
          const value = Number(frame?.Value?.[0]);
          if (!Number.isFinite(value)) return [];

          if (frameIndex === frames.length - 1) {
            const ballContribution = Number(qReal[0]) - value;
            const zeroCount = Math.max(0, qReal.length - 1);
            return [Number.isFinite(ballContribution) ? ballContribution : 0, ...Array(zeroCount).fill(0), 0];
          }

          const nextValue = Number(frames[frameIndex + 1]?.Value?.[0]);
          const valueDiff = Number.isFinite(nextValue) ? nextValue - value : 0;
          const baseContribution = qReal.map((q) => {
            const qValue = Number(q);
            return Number.isFinite(qValue) ? qValue - value : 0;
          });
          const sumBaseContribution = baseContribution.reduce((sum, contribution) => sum + contribution, 0);
          return [...baseContribution, valueDiff - sumBaseContribution];
        }),
      );
    } catch (error) {
      setErrorText(error.message || "Failed to load game data.");
      clearLoadedData();
    } finally {
      setIsLoading(false);
    }
  }, [clearLoadedData]);

  useEffect(() => {
    if (currentSequenceId) {
      setCurrentStep(0);
      setIsPlaying(false);
      loadSelectedFile(currentSequenceId);
    }
  }, [currentSequenceId, loadSelectedFile]);

  useEffect(() => {
    if (session) {
      localStorage.setItem("hoopevalStudySession", JSON.stringify(session));
    }
  }, [session]);

  const startTrial = (index) => {
    const trial = session?.trials?.[index];
    if (!trial) return;

    setTrialIndex(index);
    setPhase("a");
    setTrialQuestionStep(0);
    setPhaseA({
      independentActionRanking: [],
      independentActionRationale: "",
      actionConfidence: "",
      independentPlayerRanking: [],
      playerContributionRationale: "",
      playerConfidence: "",
    });
    setPhaseB({
      epvAlignment: "",
      actionAlignment: "",
      playerContributionAlignment: "",
      explanationUsefulness: "",
      trust: "",
      contestability: "",
      disagreementExplanation: "",
      disagreementMoment: "",
    });
    updateSession((prev) => ({
      ...prev,
      trials: prev.trials.map((item, itemIndex) =>
        itemIndex === index ? { ...item, phaseAStartTime: item.phaseAStartTime || nowIso() } : item,
      ),
    }));
  };

  const createSession = (nextParticipantId = participantId.trim(), nextConsent = consent) => {
    const mainSequences = studyConfig.randomizeTrialOrder ? shuffle(studyConfig.mainSequenceIds) : studyConfig.mainSequenceIds;
    const trialOrder = [studyConfig.practiceSequenceId, ...mainSequences].filter((sequenceId) => availableFiles.includes(sequenceId));
    const sessionId = createSessionId();
    const startTime = nowIso();

    return {
      sessionId,
      participantId: nextParticipantId,
      consent: nextConsent,
      startTime,
      endTime: "",
      backgroundResponses: {},
      trialOrder,
      trials: trialOrder.map((sequenceId, index) => buildEmptyTrial(sequenceId, index === 0)),
      postStudyResponses: {},
      interviewNotes,
      pageTimestamps: [{ page: "welcome", startTime }, { page: "background", startTime: nowIso() }],
      browserMetadata: getBrowserMetadata(),
    };
  };

  const beginStudy = () => {
    setSession(
      createSession(participantId.trim(), {
        ...consent,
        required: consent.required || isAdmin,
      }),
    );
    setPage("background");
  };

  const submitBackground = () => {
    updateSession((prev) => ({ ...prev, backgroundResponses: background }));
    markPageStart("trial");
    setTimeout(() => startTrial(0), 0);
  };

  const phaseAComplete =
    phaseA.independentActionRanking.filter(Boolean).length === currentSequence?.candidateActions.length &&
    new Set(phaseA.independentActionRanking).size === currentSequence?.candidateActions.length &&
    phaseA.independentActionRationale.trim() &&
    phaseA.independentPlayerRanking.filter(Boolean).length === currentSequence?.playerLabels.length &&
    new Set(phaseA.independentPlayerRanking).size === currentSequence?.playerLabels.length &&
    phaseA.playerContributionRationale.trim();

  const submitPhaseA = () => {
    const revealTime = nowIso();
    updateSession((prev) => ({
      ...prev,
      trials: prev.trials.map((trial, index) =>
        index === trialIndex
          ? {
              ...trial,
              ...phaseA,
              phaseAEndTime: revealTime,
              modelRevealTime: revealTime,
              phaseBStartTime: revealTime,
            }
          : trial,
      ),
    }));
    setPhase("b");
    setTrialQuestionStep(0);
  };

  const phaseBComplete =
    phaseB.epvAlignment &&
    phaseB.explanationUsefulness &&
    phaseB.disagreementExplanation.trim();

  const submitPhaseB = () => {
    const completedAt = nowIso();
    updateSession((prev) => ({
      ...prev,
      trials: prev.trials.map((trial, index) =>
        index === trialIndex ? { ...trial, ...phaseB, phaseBEndTime: completedAt } : trial,
      ),
    }));

    if (trialIndex + 1 < session.trials.length) {
      startTrial(trialIndex + 1);
      return;
    }

    markPageStart("post");
  };

  const submitPostStudy = () => {
    const completedAt = nowIso();
    const completedSession = {
      ...session,
      endTime: completedAt,
      postStudyResponses: postStudy,
      interviewNotes,
      browserMetadata: getBrowserMetadata(),
      pageTimestamps: [...(session?.pageTimestamps || []), { page: "interview", startTime: completedAt }],
    };

    setSession(completedSession);
    saveCompletedSession(completedSession);
    setPage("interview");
  };

  const skipAllQuestions = () => {
    const skipTime = nowIso();
    const baseSession =
      session ||
      createSession(participantId.trim(), {
        ...consent,
        required: true,
      });

    setSession({
      ...baseSession,
      participantId: baseSession.participantId || participantId.trim(),
      endTime: "",
      backgroundResponses: session?.backgroundResponses || background,
      trials: baseSession.trials.map((trial) => ({
        ...trial,
        phaseAStartTime: trial.phaseAStartTime || skipTime,
        phaseAEndTime: trial.phaseAEndTime || skipTime,
        modelRevealTime: trial.modelRevealTime || skipTime,
        phaseBStartTime: trial.phaseBStartTime || skipTime,
        phaseBEndTime: trial.phaseBEndTime || skipTime,
      })),
      postStudyResponses: session?.postStudyResponses || postStudy,
      interviewNotes,
      pageTimestamps: [...(baseSession.pageTimestamps || []), { page: "interview", startTime: skipTime }],
      browserMetadata: getBrowserMetadata(),
    });
    setPage("interview");
  };

  const buildExportRows = (finalSession) => {
    const participants = [
      {
        sessionId: finalSession.sessionId,
        participantId: finalSession.participantId,
        startTime: finalSession.startTime,
        endTime: finalSession.endTime,
        audioRecording: finalSession.consent.audioRecording,
        screenRecording: finalSession.consent.screenRecording,
        anonymousQuotation: finalSession.consent.anonymousQuotation,
        ...finalSession.backgroundResponses,
        browserUserAgent: finalSession.browserMetadata.userAgent,
        browserLanguage: finalSession.browserMetadata.language,
        browserTimezone: finalSession.browserMetadata.timezone,
        viewportWidth: finalSession.browserMetadata.viewportWidth,
        viewportHeight: finalSession.browserMetadata.viewportHeight,
      },
    ];

    const trialResponses = finalSession.trials
      .filter((trial) => !trial.isPractice)
      .map((trial, index) => ({
        sessionId: finalSession.sessionId,
        participantId: finalSession.participantId,
        trialIndex: index + 1,
        sequenceId: trial.sequenceId,
        phaseAStartTime: trial.phaseAStartTime,
        phaseAEndTime: trial.phaseAEndTime,
        modelRevealTime: trial.modelRevealTime,
        phaseBStartTime: trial.phaseBStartTime,
        phaseBEndTime: trial.phaseBEndTime,
        independentActionRanking: trial.independentActionRanking,
        independentActionRationale: trial.independentActionRationale,
        actionConfidence: trial.actionConfidence,
        independentPlayerRanking: trial.independentPlayerRanking,
        playerContributionRationale: trial.playerContributionRationale,
        playerConfidence: trial.playerConfidence,
        epvAlignment: trial.epvAlignment,
        actionAlignment: trial.actionAlignment,
        playerContributionAlignment: trial.playerContributionAlignment,
        explanationUsefulness: trial.explanationUsefulness,
        trust: trial.trust,
        contestability: trial.contestability,
        disagreementExplanation: trial.disagreementExplanation,
        disagreementMoment: trial.disagreementMoment,
      }));

    const postStudyRows = [
      {
        sessionId: finalSession.sessionId,
        participantId: finalSession.participantId,
        ...finalSession.postStudyResponses,
      },
    ];

    const interviewRows = Object.entries(finalSession.interviewNotes).map(([section, notes]) => ({
      sessionId: finalSession.sessionId,
      participantId: finalSession.participantId,
      section,
      notes,
    }));

    return { participants, trialResponses, postStudyRows, interviewRows };
  };

  const exportData = () => {
    const finalSession = {
      ...session,
      endTime: nowIso(),
      postStudyResponses: postStudy,
      interviewNotes,
      browserMetadata: getBrowserMetadata(),
    };
    setSession(finalSession);

    const { participants, trialResponses, postStudyRows, interviewRows } = buildExportRows(finalSession);
    const prefix = finalSession.sessionId;

    downloadText(`${prefix}.json`, JSON.stringify(finalSession, null, 2), "application/json");
    downloadText(
      "participants.csv",
      toCsv(participants, Object.keys(participants[0])),
      "text/csv;charset=utf-8",
    );
    downloadText(
      "trial_responses.csv",
      toCsv(trialResponses, Object.keys(trialResponses[0] || {})),
      "text/csv;charset=utf-8",
    );
    downloadText(
      "post_study.csv",
      toCsv(postStudyRows, Object.keys(postStudyRows[0])),
      "text/csv;charset=utf-8",
    );
    downloadText(
      "interview_notes.csv",
      toCsv(interviewRows, Object.keys(interviewRows[0] || { sessionId: "", participantId: "", section: "", notes: "" })),
      "text/csv;charset=utf-8",
    );
  };

  const handleInterviewNoteChange = (section, value) => {
    setInterviewNotes((prev) => ({ ...prev, [section]: value }));
    updateSession((prev) => ({
      ...prev,
      interviewNotes: {
        ...(prev.interviewNotes || {}),
        [section]: value,
      },
    }));
  };

  const togglePostStudyUseCase = (useCase) => {
    setPostStudy((prev) => {
      const selected = prev.likelyUseCases.includes(useCase);
      return {
        ...prev,
        likelyUseCases: selected
          ? prev.likelyUseCases.filter((item) => item !== useCase)
          : [...prev.likelyUseCases, useCase],
      };
    });
  };

  const buildOverallStats = () => {
    const participantSessions = completedSessions.filter((item) => item.participantId?.toLowerCase() !== "admin");
    const trials = participantSessions.flatMap((item) => (item.trials || []).filter((trial) => !trial.isPractice));
    const numericAverage = (values) => {
      const cleanValues = values.map(Number).filter(Number.isFinite);
      if (!cleanValues.length) return "--";
      return (cleanValues.reduce((sum, value) => sum + value, 0) / cleanValues.length).toFixed(2);
    };
    const countValues = (values) =>
      values.reduce((counts, value) => {
        if (!value) return counts;
        counts[value] = (counts[value] || 0) + 1;
        return counts;
      }, {});
    const countArrays = (arrays) =>
      arrays.flat().reduce((counts, value) => {
        if (!value) return counts;
        counts[value] = (counts[value] || 0) + 1;
        return counts;
      }, {});

    return {
      sessionCount: participantSessions.length,
      trialCount: trials.length,
      avgEpvMatch: numericAverage(trials.map((trial) => trial.epvAlignment)),
      avgExplanationUsefulness: numericAverage(trials.map((trial) => trial.explanationUsefulness)),
      avgCoachingUsefulness: numericAverage(participantSessions.map((item) => item.postStudyResponses?.overallUsefulness)),
      topActions: countValues(trials.map((trial) => trial.independentActionRanking?.[0])),
      topPlayers: countValues(trials.map((trial) => trial.independentPlayerRanking?.[0])),
      useCases: countArrays(participantSessions.map((item) => item.postStudyResponses?.likelyUseCases || [])),
      latestCompletion: participantSessions
        .map((item) => item.endTime)
        .filter(Boolean)
        .sort()
        .at(-1) || "--",
    };
  };

  const exportDatabase = () => {
    downloadText("hoopeval_study_database.json", JSON.stringify(completedSessions, null, 2), "application/json");
  };

  const renderCountList = (counts) => {
    const entries = Object.entries(counts).sort((left, right) => right[1] - left[1]);
    if (!entries.length) {
      return <Typography variant="body2" color="text.secondary">No responses yet.</Typography>;
    }

    return (
      <Stack spacing={0.75}>
        {entries.map(([label, count]) => (
          <Stack key={label} direction="row" justifyContent="space-between" gap={1}>
            <Typography variant="body2">{label}</Typography>
            <Chip size="small" label={count} />
          </Stack>
        ))}
      </Stack>
    );
  };

  const renderWelcome = () => (
    <Section
      title="Study Welcome and Consent"
      description="Enter your participant ID, review the consent options, then start the study."
    >
      <Stack spacing={2}>
        <Typography color="text.secondary">
          This study evaluates the system, not the participant. You will first judge each possession independently, then compare your judgment with model outputs.
        </Typography>
        <TextField
          label="Participant ID"
          value={participantId}
          onChange={(event) => setParticipantId(event.target.value)}
          required
          fullWidth
        />
        <FormControlLabel
          control={<Checkbox checked={consent.required} onChange={(event) => setConsent({ ...consent, required: event.target.checked })} />}
          label="I understand the system is being evaluated."
        />
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
          <FormControlLabel
            control={<Checkbox checked={consent.audioRecording} onChange={(event) => setConsent({ ...consent, audioRecording: event.target.checked })} />}
            label="Audio recording"
          />
          <FormControlLabel
            control={<Checkbox checked={consent.screenRecording} onChange={(event) => setConsent({ ...consent, screenRecording: event.target.checked })} />}
            label="Screen recording"
          />
          <FormControlLabel
            control={<Checkbox checked={consent.anonymousQuotation} onChange={(event) => setConsent({ ...consent, anonymousQuotation: event.target.checked })} />}
            label="Anonymous quotation"
          />
        </Stack>
        <Button variant="contained" onClick={beginStudy} disabled={!isAdmin && (!participantId.trim() || !consent.required)}>
          Start
        </Button>
      </Stack>
    </Section>
  );

  const renderBackground = () => (
    <Section
      title="Background Questionnaire"
      description="Answer these background questions before the practice possession."
    >
      <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" } }}>
        <TextField label="Current basketball role" value={background.currentRole} onChange={(event) => setBackground({ ...background, currentRole: event.target.value })} required />
        <TextField label="Years of experience" type="number" value={background.yearsExperience} onChange={(event) => setBackground({ ...background, yearsExperience: event.target.value })} required />
        <FormControl size="small" fullWidth required>
          <InputLabel>Highest level worked at</InputLabel>
          <Select value={background.highestLevel} label="Highest level worked at" onChange={(event) => setBackground({ ...background, highestLevel: event.target.value })}>
            {["Youth", "High school", "College", "Professional", "NBA/WNBA", "Other"].map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" fullWidth required>
          <InputLabel>Video analysis tool use</InputLabel>
          <Select value={background.videoToolUse} label="Video analysis tool use" onChange={(event) => setBackground({ ...background, videoToolUse: event.target.value })}>
            {["Never", "Rarely", "Monthly", "Weekly", "Daily"].map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" fullWidth required>
          <InputLabel>Analytics use</InputLabel>
          <Select value={background.analyticsUse} label="Analytics use" onChange={(event) => setBackground({ ...background, analyticsUse: event.target.value })}>
            {["Never", "Rarely", "Monthly", "Weekly", "Daily"].map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <LikertSelect label="Familiarity with EPV/value metrics" value={background.epvFamiliarity} onChange={(value) => setBackground({ ...background, epvFamiliarity: value })} required />
        <LikertSelect label="Comfort interpreting visualizations" value={background.visualizationComfort} onChange={(value) => setBackground({ ...background, visualizationComfort: value })} required />
      </Box>
      <Button
        sx={{ mt: 2 }}
        variant="contained"
        onClick={submitBackground}
        disabled={!isAdmin && Object.values(background).some((value) => !String(value).trim())}
      >
        Continue
      </Button>
    </Section>
  );

  const renderTrial = () => {
    if (!currentTrial || !currentSequence) return null;

    const endFrameLabel = totalFrames ? `Frame ${totalFrames}` : "the final frame";

    const viewer = isLoading ? (
      <CompactSection title="Loading possession">
        <Typography color="text.secondary">Loading game data...</Typography>
      </CompactSection>
    ) : errorText ? (
      <CompactSection title="Data Error">
        <Typography color="error.main">{errorText}</Typography>
      </CompactSection>
    ) : (
      <PossessionViewer
        sequenceLabel={currentSequence.label}
        playerData={playerData}
        valueData={valueData}
        qBall={qBall}
        qPlayer={qPlayer}
        realPlayerActions={realPlayerActions}
        contributionData={contributionData}
        currentStep={currentStep}
        setCurrentStep={setCurrentStep}
        isPlaying={isPlaying}
        setIsPlaying={setIsPlaying}
        totalFrames={totalFrames}
        showModelOutput={phase === "b"}
        onLegendOpen={() => setIsLegendOpen(true)}
      />
    );

    const responsePanel =
      phase === "a" ? (
        <CompactSection
          title={`Question ${trialQuestionStep + 1}`}
          sx={{ height: { md: "100%" }, minHeight: 0, overflow: "auto" }}
          description={
            trialQuestionStep === 0
              ? `Please evaluate and rank the offensive team's possible ball actions at the end of this possession (${endFrameLabel}) according to your tactical judgment.`
              : "Please evaluate the contributions of the five offensive players to the development of this offensive possession."
          }
        >
          <Stack spacing={1}>
            {trialQuestionStep === 0 ? (
              <>
                <RankingInputs
                  title="Rank possible ball actions"
                  choices={currentSequence.candidateActions}
                  value={phaseA.independentActionRanking}
                  onChange={(value) => setPhaseA({ ...phaseA, independentActionRanking: value })}
                />
                <TextField
                  label="Please briefly explain the reasoning behind your top choice."
                  value={phaseA.independentActionRationale}
                  onChange={(event) => setPhaseA({ ...phaseA, independentActionRationale: event.target.value })}
                  multiline
                  minRows={3}
                  required
                  size="small"
                />
                <Button
                  variant="contained"
                  onClick={() => setTrialQuestionStep(1)}
                  disabled={
                    !isAdmin &&
                    (phaseA.independentActionRanking.filter(Boolean).length !== currentSequence.candidateActions.length ||
                      new Set(phaseA.independentActionRanking).size !== currentSequence.candidateActions.length ||
                      !phaseA.independentActionRationale.trim())
                  }
                >
                  Next Question
                </Button>
              </>
            ) : (
              <>
                <Typography variant="body2" color="text.secondary">
                  Which players most positively influenced the offensive advantage, and why?
                </Typography>
                <RankingInputs
                  title="Rank Player 1-5"
                  choices={currentSequence.playerLabels}
                  value={phaseA.independentPlayerRanking}
                  onChange={(value) => setPhaseA({ ...phaseA, independentPlayerRanking: value })}
                />
                <TextField
                  label="Why did your top-ranked player contribute most?"
                  value={phaseA.playerContributionRationale}
                  onChange={(event) => setPhaseA({ ...phaseA, playerContributionRationale: event.target.value })}
                  multiline
                  minRows={3}
                  required
                  size="small"
                />
                <Stack direction="row" spacing={1}>
                  <Button variant="outlined" onClick={() => setTrialQuestionStep(0)}>
                    Back
                  </Button>
                  <Button variant="contained" onClick={submitPhaseA} disabled={!isAdmin && !phaseAComplete}>
                    Reveal Model Output
                  </Button>
                </Stack>
              </>
            )}
          </Stack>
        </CompactSection>
      ) : (
        <CompactSection
          title={`Question ${trialQuestionStep === 0 ? 3 : 6}`}
          sx={{ height: { md: "100%" }, minHeight: 0, overflow: "auto" }}
          description={
            trialQuestionStep === 0
              ? "To what extent does the EPV evolution shown in this sequence match your tactical evaluation?"
              : "To what extent do the presented model outputs help you understand why actions or players are evaluated more positively?"
          }
        >
          <Stack spacing={1}>
            {trialQuestionStep === 0 ? (
              <>
                <LikertSelect label="EPV match" value={phaseB.epvAlignment} onChange={(value) => setPhaseB({ ...phaseB, epvAlignment: value })} required />
                <TextField
                  label="Please explain any moments where the EPV trend did not match your tactical expectations."
                  value={phaseB.disagreementExplanation}
                  onChange={(event) => setPhaseB({ ...phaseB, disagreementExplanation: event.target.value })}
                  multiline
                  minRows={4}
                  required
                  size="small"
                />
                <TextField
                  label="Optional timestamp or moment note"
                  value={phaseB.disagreementMoment}
                  onChange={(event) => setPhaseB({ ...phaseB, disagreementMoment: event.target.value })}
                  size="small"
                />
                <Button
                  variant="contained"
                  onClick={() => setTrialQuestionStep(1)}
                  disabled={!isAdmin && (!phaseB.epvAlignment || !phaseB.disagreementExplanation.trim())}
                >
                  Next Question
                </Button>
              </>
            ) : (
              <>
                <LikertSelect
                  label="Explanation usefulness"
                  value={phaseB.explanationUsefulness}
                  onChange={(value) => setPhaseB({ ...phaseB, explanationUsefulness: value })}
                  options={explanationUsefulnessLabels}
                  required
                />
                <Stack direction="row" spacing={1}>
                  <Button variant="outlined" onClick={() => setTrialQuestionStep(0)}>
                    Back
                  </Button>
                  <Button variant="contained" onClick={submitPhaseB} disabled={!isAdmin && !phaseBComplete}>
                    {trialIndex + 1 < session.trials.length ? "Next Trial" : "Post-Study Questionnaire"}
                  </Button>
                </Stack>
              </>
            )}
          </Stack>
        </CompactSection>
      );

    return (
      <Box
        sx={{
          display: "grid",
          gridTemplateRows: "auto minmax(0, 1fr)",
          gap: 1,
          height: { md: "calc(100dvh - 104px)" },
          minHeight: 0,
        }}
      >
        <Paper elevation={0} sx={{ p: 0.85, border: "1px solid", borderColor: "divider" }}>
          <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" gap={1}>
            <Stack direction="row" spacing={1} alignItems="center">
              <SportsBasketballRoundedIcon color="primary" />
              <Typography variant="h5">{currentTrial.isPractice ? "Practice Trial" : `Main Trial ${trialIndex}`}</Typography>
              <Chip size="small" variant="outlined" label={phase === "a" ? "Phase A" : "Phase B"} />
            </Stack>
            <Chip size="small" label={`${trialIndex + 1}/${session.trials.length}`} />
          </Stack>
        </Paper>

        <Box
          sx={{
            display: "grid",
            gap: 1,
            minHeight: 0,
            overflow: "hidden",
            gridTemplateColumns: {
              xs: "1fr",
              md: "minmax(0, 1fr) minmax(320px, 360px)",
              xl: "minmax(0, 1fr) minmax(340px, 390px)",
            },
            alignItems: "stretch",
          }}
        >
          {viewer}
          {responsePanel}
        </Box>
      </Box>
    );
  };

  const renderPostStudy = () => (
    <Section
      title="Post-Study Questions"
      description="Answer the two final coaching-use questions."
    >
      <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" } }}>
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            Question 4
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={1}>
            How useful do you think this system would be for practical coaching tasks?
          </Typography>
          <LikertSelect
            label="Coaching usefulness"
            value={postStudy.overallUsefulness}
            onChange={(value) => setPostStudy({ ...postStudy, overallUsefulness: value })}
            options={usefulnessLabels}
            required
          />
        </Box>
        <Box sx={{ gridColumn: { md: "1 / -1" } }}>
          <Typography variant="subtitle2" gutterBottom>
            Question 5
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={0.75}>
            In what coaching situations could this system be most effectively applied? Select all that apply.
          </Typography>
          <Box sx={{ display: "grid", gap: 0.25, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" } }}>
            {useCases.map((useCase) => (
              <FormControlLabel
                key={useCase}
                control={
                  <Checkbox
                    size="small"
                    checked={postStudy.likelyUseCases.includes(useCase)}
                    onChange={() => togglePostStudyUseCase(useCase)}
                  />
                }
                label={useCase}
              />
            ))}
          </Box>
        </Box>
        <TextField
          label="Use case explanation"
          value={postStudy.useCaseExplanation}
          onChange={(event) => setPostStudy({ ...postStudy, useCaseExplanation: event.target.value })}
          multiline
          minRows={3}
          sx={{ gridColumn: { md: "1 / -1" } }}
        />
      </Box>
      <Button
        sx={{ mt: 2 }}
        variant="contained"
        onClick={submitPostStudy}
        disabled={
          !isAdmin &&
          (!postStudy.overallUsefulness || !postStudy.likelyUseCases.length)
        }
      >
        Continue
      </Button>
    </Section>
  );

  const renderInterview = () => (
    <Section
      title="Semi-Structured Interview Guide"
      description="Facilitator notes can be entered under each prompt and exported with the session."
      action={
        <Button variant="contained" startIcon={<DownloadRoundedIcon />} onClick={exportData}>
          Export Data
        </Button>
      }
    >
      <Stack spacing={1.5}>
        {interviewSections.map((section) => (
          <TextField
            key={section}
            label={section}
            value={interviewNotes[section]}
            onChange={(event) => handleInterviewNoteChange(section, event.target.value)}
            multiline
            minRows={3}
            fullWidth
          />
        ))}
      </Stack>
    </Section>
  );

  const renderStats = () => {
    const stats = buildOverallStats();
    const statCards = [
      ["Completed sessions", stats.sessionCount],
      ["Main trial responses", stats.trialCount],
      ["Avg EPV match", stats.avgEpvMatch],
      ["Avg explanation usefulness", stats.avgExplanationUsefulness],
      ["Avg coaching usefulness", stats.avgCoachingUsefulness],
      ["Latest completion", stats.latestCompletion],
    ];

    return (
      <Section
        title="Study Progress"
        description="Admin view of completed non-admin sessions saved through the backend, with browser-local fallback."
        action={
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" onClick={loadCompletedSessions}>
              Refresh
            </Button>
            <Button variant="contained" startIcon={<DownloadRoundedIcon />} onClick={exportDatabase}>
              Export Database
            </Button>
          </Stack>
        }
      >
        <Box sx={{ display: "grid", gap: 1.25, gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" } }}>
          {statCards.map(([label, value]) => (
            <Paper key={label} elevation={0} sx={{ p: 1.5, border: "1px solid", borderColor: "divider" }}>
              <Typography variant="caption" color="text.secondary">
                {label}
              </Typography>
              <Typography variant="h6">{value}</Typography>
            </Paper>
          ))}
        </Box>

        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle1" fontWeight={700} gutterBottom>
            Response Breakdown
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Summaries of participants' first-ranked choices and selected coaching situations.
          </Typography>
        </Box>

        <Box sx={{ display: "grid", gap: 1.25, gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" } }}>
          <Paper elevation={0} sx={{ p: 1.5, border: "1px solid", borderColor: "divider" }}>
            <Typography variant="subtitle2" gutterBottom>First-ranked actions</Typography>
            {renderCountList(stats.topActions)}
          </Paper>
          <Paper elevation={0} sx={{ p: 1.5, border: "1px solid", borderColor: "divider" }}>
            <Typography variant="subtitle2" gutterBottom>First-ranked players</Typography>
            {renderCountList(stats.topPlayers)}
          </Paper>
          <Paper elevation={0} sx={{ p: 1.5, border: "1px solid", borderColor: "divider" }}>
            <Typography variant="subtitle2" gutterBottom>Coaching situations</Typography>
            {renderCountList(stats.useCases)}
          </Paper>
        </Box>
      </Section>
    );
  };

  return (
    <ThemeProvider theme={dashboardTheme}>
      <CssBaseline />
      <Box
        sx={{
          minHeight: "100vh",
          height: page === "trial" ? "100dvh" : "auto",
          overflow: page === "trial" ? "hidden" : "auto",
          px: { xs: 1, md: 1.5 },
          py: { xs: 1, md: 1.25 },
          bgcolor: "background.default",
        }}
      >
        <ActionLegend isOpen={isLegendOpen} onClose={() => setIsLegendOpen(false)} />
        <Stack spacing={page === "trial" ? 0.75 : 1.25} sx={{ height: page === "trial" ? "100%" : "auto", minHeight: 0 }}>
          <Paper elevation={0} sx={{ p: page === "trial" ? { xs: 1, md: 1.1 } : { xs: 1.2, md: 1.5 }, border: "1px solid", borderColor: "divider" }}>
            <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" gap={1}>
              <Box>
                <Stack direction="row" spacing={1} alignItems="center" mb={0.25}>
                  <SportsBasketballRoundedIcon color="primary" />
                  <Typography variant="h5">HoopEval User Study</Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  Expert evaluation workflow for basketball EPV interpretation.
                </Typography>
              </Box>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip size="small" color="primary" label={session?.participantId || "No participant"} />
                <Chip size="small" variant="outlined" label={page} />
                {isAdmin && <Chip size="small" color="secondary" label="Admin" />}
                {session && <Chip size="small" variant="outlined" label={`Trials: ${session.trials.length}`} />}
                {isAdmin && (
                  <>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => {
                        setPage("stats");
                        void loadCompletedSessions();
                      }}
                    >
                      Overall Stats
                    </Button>
                    <Button size="small" variant="outlined" onClick={skipAllQuestions}>
                      Skip Questions
                    </Button>
                  </>
                )}
              </Stack>
            </Stack>
          </Paper>

          {page === "welcome" && renderWelcome()}
          {page === "background" && renderBackground()}
          {page === "trial" && renderTrial()}
          {page === "post" && renderPostStudy()}
          {page === "interview" && renderInterview()}
          {page === "stats" && isAdmin && renderStats()}
        </Stack>
      </Box>
    </ThemeProvider>
  );
}

export default App;
