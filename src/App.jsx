import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  Alert,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  Menu,
  MenuItem,
  Paper,
  Select,
  Snackbar,
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
import DragIndicatorRoundedIcon from "@mui/icons-material/DragIndicatorRounded";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import KeyboardArrowUpRoundedIcon from "@mui/icons-material/KeyboardArrowUpRounded";
import PauseCircleOutlineRoundedIcon from "@mui/icons-material/PauseCircleOutlineRounded";
import PlayCircleOutlineRoundedIcon from "@mui/icons-material/PlayCircleOutlineRounded";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import SportsBasketballRoundedIcon from "@mui/icons-material/SportsBasketballRounded";
import ShowChartRoundedIcon from "@mui/icons-material/ShowChartRounded";
import ViewInArRoundedIcon from "@mui/icons-material/ViewInArRounded";
import MoreHorizRoundedIcon from "@mui/icons-material/MoreHorizRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
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
const adminTokenKey = "hoopevalAdminToken";

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
  const { adminToken, ...fetchOptions } = options;
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...fetchOptions,
    headers: {
      "content-type": "application/json",
      ...(adminToken ? { "x-admin-token": adminToken } : {}),
      ...(fetchOptions.headers || {}),
    },
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return response.json();
};

const fetchStudyDatabase = async (adminToken = "") => {
  try {
    const data = await apiRequest("/api/sessions", { adminToken });
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

const useMeasuredWidth = () => {
  const ref = useRef(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (!ref.current || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(([entry]) => {
      setWidth(Math.floor(entry.contentRect.width));
    });
    observer.observe(ref.current);

    return () => observer.disconnect();
  }, []);

  return [ref, width];
};

const ThinkAloudPrompt = ({ children }) => (
  <Paper
    elevation={0}
    sx={{
      px: 1,
      py: 0.75,
      border: "1px dashed",
      borderColor: "divider",
      bgcolor: alpha("#0f4c81", 0.04),
    }}
  >
    <Typography variant="body2" color="text.secondary">
      {children}
    </Typography>
  </Paper>
);

const buildEmptyTrial = (sequenceId, isPractice) => ({
  sequenceId,
  isPractice,
  phaseAStartTime: "",
  phaseAEndTime: "",
  independentActionRanking: [],
  independentActionRationale: "",
  independentPlayerRanking: [],
  playerContributionRationale: "",
  modelRevealTime: "",
  phaseBStartTime: "",
  phaseBEndTime: "",
  epvAlignment: "",
  actionAlignment: "",
  playerContributionAlignment: "",
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
  <Paper elevation={0} sx={{ p: 1, border: "1px solid", borderColor: "divider", ...sx }}>
    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1} mb={0.65}>
      <Box>
        <Typography variant="h5" fontWeight={750}>
          {title}
        </Typography>
        {description && (
          <Typography variant="body1" color="text.secondary" display="block" sx={{ lineHeight: 1.5 }}>
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

const GuidedActionButton = ({ children, sx, ...props }) => (
  <Button
    {...props}
    size="large"
    variant="contained"
    className="guided-action-button"
    endIcon={<ArrowForwardRoundedIcon />}
    sx={{ minHeight: 48, px: 2.4, fontSize: "1rem", fontWeight: 750, ...sx }}
  >
    {children}
  </Button>
);

const AnswerStatus = ({ ready }) => (
  <Chip
    size="small"
    icon={ready ? <CheckCircleRoundedIcon /> : undefined}
    color={ready ? "success" : "default"}
    variant={ready ? "filled" : "outlined"}
    label={ready ? "Ready" : "Needs answer"}
    sx={{ fontWeight: 750 }}
  />
);

const ActionFooter = ({ children }) => (
  <Stack
    direction="row"
    spacing={1}
    sx={{
      mt: "auto",
      pt: 1,
      position: "sticky",
      bottom: 0,
      bgcolor: "background.paper",
      borderTop: "1px solid",
      borderColor: "divider",
      zIndex: 1,
    }}
  >
    {children}
  </Stack>
);

const ProgressMap = ({ items }) => (
  <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
    {items.map((item) => (
      <Chip
        key={item.label}
        size="small"
        color={item.active ? "primary" : "default"}
        variant={item.active ? "filled" : "outlined"}
        label={item.label}
        sx={{ fontWeight: item.active ? 800 : 650 }}
      />
    ))}
  </Stack>
);

const StepGuide = ({ items }) => (
  <Box
    sx={{
      display: "grid",
      gap: 0.5,
      gridTemplateColumns: { xs: "1fr", sm: `repeat(${items.length}, minmax(0, 1fr))` },
    }}
  >
    {items.map((item, index) => (
      <Paper
        key={item}
        elevation={0}
        sx={{
          px: 0.75,
          py: 0.6,
          display: "flex",
          alignItems: "center",
          gap: 0.7,
          border: "1px solid",
          borderColor: alpha("#0f4c81", 0.2),
          bgcolor: index === items.length - 1 ? alpha("#0f4c81", 0.08) : "#f8fbff",
        }}
      >
        <Box
          sx={{
            width: 24,
            height: 24,
            borderRadius: "50%",
            display: "grid",
            placeItems: "center",
            flex: "0 0 auto",
            bgcolor: index === items.length - 1 ? "primary.main" : alpha("#0f4c81", 0.12),
            color: index === items.length - 1 ? "#ffffff" : "primary.main",
            fontSize: 13,
            fontWeight: 800,
          }}
        >
          {index + 1}
        </Box>
        <Typography variant="body2" sx={{ fontWeight: index === items.length - 1 ? 750 : 600, lineHeight: 1.25 }}>
          {item}
        </Typography>
      </Paper>
    ))}
  </Box>
);

const RankingInputs = ({ title, choices, value, onChange }) => {
  const [dragIndex, setDragIndex] = useState(null);
  const ranked = useMemo(() => {
    const current = value.filter((choice) => choices.includes(choice));
    return [...current, ...choices.filter((choice) => !current.includes(choice))];
  }, [choices, value]);

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
    <Stack spacing={0.55}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1}>
        <Typography variant="h6" fontWeight={750}>{title}</Typography>
      </Stack>
      <Typography variant="body1" color="text.secondary">
        Drag rows to reorder them.
      </Typography>

      <Stack spacing={0.35}>
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
              py: 0.55,
              display: "grid",
              gridTemplateColumns: "64px 32px minmax(0, 1fr) auto",
              alignItems: "center",
              gap: 0.5,
              border: "1px solid",
              borderColor: dragIndex === index ? alpha("#e76f51", 0.78) : alpha("#0f4c81", 0.18),
              bgcolor: dragIndex === index ? "#fff7ed" : "#f8fbff",
              cursor: "grab",
              opacity: dragIndex === index ? 0.72 : 1,
            }}
          >
            <Stack direction="row" spacing={0.2} alignItems="center" color="text.secondary">
              <DragIndicatorRoundedIcon fontSize="small" />
              <Typography variant="caption" fontWeight={750}>Drag</Typography>
            </Stack>
            <Chip size="small" color="primary" label={index + 1} sx={{ width: 30, height: 26, fontWeight: 800 }} />
            <Typography variant="h6" noWrap sx={{ fontWeight: 500 }}>
              {choice}
            </Typography>
            <Stack direction="row" spacing={0.25}>
              <IconButton size="small" onClick={() => moveChoice(index, -1)} disabled={index === 0} aria-label={`move ${choice} up`}>
                <KeyboardArrowUpRoundedIcon />
              </IconButton>
              <IconButton size="small" onClick={() => moveChoice(index, 1)} disabled={index === ranked.length - 1} aria-label={`move ${choice} down`}>
                <KeyboardArrowDownRoundedIcon />
              </IconButton>
            </Stack>
          </Paper>
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
  playbackStopStep,
  showModelOutput,
  highlightedModelOutputs,
  modelRevealCue = false,
  onInteraction,
  onLegendOpen,
}) => {
  const [modelPanelRef, modelPanelWidth] = useMeasuredWidth();
  const valueChartWidth = Math.max(320, modelPanelWidth ? modelPanelWidth - 4 : 480);
  const courtWidth = 1040;
  const playbackEndStep = Math.min(
    Math.max(totalFrames - 1, 0),
    Number.isInteger(playbackStopStep) ? playbackStopStep : Math.max(totalFrames - 1, 0),
  );
  const isAtPlaybackEnd = totalFrames > 0 && currentStep >= playbackEndStep;
  const handlePlayPause = () => {
    if (isPlaying) {
      setIsPlaying?.(false);
      onInteraction?.("playback_pause", { source: "viewer_controls" });
      return;
    }

    const restarted = isAtPlaybackEnd;
    if (isAtPlaybackEnd) {
      setCurrentStep?.(0);
    }
    setIsPlaying?.(true);
    onInteraction?.("playback_play", { source: "viewer_controls", restarted });
  };
  const handleReplay = () => {
    setCurrentStep?.(0);
    setIsPlaying?.(true);
    onInteraction?.("playback_replay", { source: "viewer_controls" });
  };

  return (
    <Box
      sx={{
        display: "grid",
        gap: 0.65,
        height: { md: "100%" },
        minHeight: 0,
        overflow: { md: showModelOutput ? "auto" : "hidden", lg: "hidden" },
        gridTemplateColumns: {
          xs: "1fr",
          lg: showModelOutput ? "minmax(0, calc(34% - 3px)) minmax(0, calc(66% - 3px))" : "1fr",
        },
        alignItems: "stretch",
      }}
    >
      {showModelOutput && (
        <Card
          sx={{
            height: { lg: "100%" },
            minHeight: 0,
            overflow: "hidden",
            borderColor: modelRevealCue ? alpha("#e76f51", 0.8) : undefined,
            boxShadow: modelRevealCue
              ? "0 0 0 4px rgba(231, 111, 81, 0.18), 0 14px 32px rgba(11, 31, 53, 0.14)"
              : undefined,
            transition: "border-color 180ms ease, box-shadow 180ms ease",
          }}
        >
          <CardContent ref={modelPanelRef} sx={{ p: 0.75, height: "100%", overflow: "auto", "&:last-child": { pb: 0.75 } }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
              <Stack direction="row" spacing={0.6} alignItems="center">
                <ShowChartRoundedIcon color="primary" fontSize="small" />
                <Typography variant="subtitle1" fontWeight={700}>Model Output</Typography>
              </Stack>
              <Chip size="small" variant="outlined" label="Revealed" />
            </Stack>
            <ValueChart
              values={valueData}
              width={valueChartWidth}
              currentStep={currentStep}
              setCurrentStep={setCurrentStep}
              isPlaying={isPlaying}
              setIsPlaying={setIsPlaying}
              totalFrames={totalFrames}
              playbackEndStep={playbackEndStep}
              onPlayPause={handlePlayPause}
              qBall={qBall}
              contributionData={contributionData}
              showEPVCurve={showModelOutput}
              showActionValues={showModelOutput}
              showPlayerContributions={showModelOutput}
              highlightedOutputs={highlightedModelOutputs}
              compact
              showControls={false}
            />
          </CardContent>
        </Card>
      )}

      <Card sx={{ height: { md: showModelOutput ? "auto" : "100%", lg: "100%" }, minHeight: 0, overflow: "hidden" }}>
        <CardContent
          sx={{
            p: 0.75,
            height: "100%",
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            "&:last-child": { pb: 0.75 },
          }}
        >
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
            <Stack direction="row" spacing={1} alignItems="center">
              <ViewInArRoundedIcon color="secondary" fontSize="small" />
              <Typography variant="subtitle1" fontWeight={700}>Court Playback</Typography>
              {!showModelOutput && (
                <Chip size="small" variant="outlined" label="Model hidden" />
              )}
            </Stack>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Tooltip title={isPlaying ? "Pause playback" : isAtPlaybackEnd ? "Play from beginning" : "Play possession"}>
                <IconButton color="primary" onClick={handlePlayPause} aria-label={isPlaying ? "pause playback" : "play playback"} sx={{ width: 42, height: 42 }}>
                  {isPlaying ? (
                    <PauseCircleOutlineRoundedIcon />
                  ) : (
                    <PlayCircleOutlineRoundedIcon />
                  )}
                </IconButton>
              </Tooltip>
              <Tooltip title="Replay from beginning">
                <IconButton color="primary" onClick={handleReplay} aria-label="replay playback" sx={{ width: 42, height: 42 }}>
                  <RestartAltRoundedIcon />
                </IconButton>
              </Tooltip>
              <Chip size="small" color="secondary" label={`${Math.min(currentStep + 1, totalFrames || 0)}/${totalFrames || 0}`} />
              {Number.isInteger(playbackStopStep) && playbackStopStep < totalFrames - 1 && (
                <Chip size="small" variant="outlined" label={`Stop ${playbackStopStep + 1}`} />
              )}
              <Tooltip title="Show action legend">
                <IconButton color="primary" onClick={onLegendOpen} aria-label="toggle action legend" sx={{ width: 42, height: 42 }}>
                  <InfoOutlinedIcon />
                </IconButton>
              </Tooltip>
            </Stack>
          </Stack>
          <Typography variant="caption" color="text.secondary" display="block" mb={0.45}>
            {showModelOutput
              ? sequenceLabel
              : sequenceLabel}
          </Typography>
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              p: 0.35,
              borderRadius: 1,
              bgcolor: "#ffffff",
              border: "1px solid",
              borderColor: alpha("#0f4c81", 0.14),
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
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
              playbackStopStep={playbackStopStep}
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
  const [realBallActions, setRealBallActions] = useState([]);
  const [contributionData, setContributionData] = useState([]);
  const [isLegendOpen, setIsLegendOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [modelRevealCue, setModelRevealCue] = useState(false);
  const [adminMenuAnchor, setAdminMenuAnchor] = useState(null);

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
    independentPlayerRanking: [],
    playerContributionRationale: "",
  });
  const [phaseB, setPhaseB] = useState({
    epvAlignment: "",
    actionAlignment: "",
    playerContributionAlignment: "",
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
    explanationUsefulness: "",
    likelyUseCases: [],
    useCaseExplanation: "",
  });
  const [interviewNotes, setInterviewNotes] = useState(() =>
    Object.fromEntries(interviewSections.map((section) => [section, ""])),
  );
  const [completedSessions, setCompletedSessions] = useState(() => readStudyDatabase());
  const [noticeText, setNoticeText] = useState("");
  const lastSavedPayloadRef = useRef("");

  const totalFrames = playerData?.[0]?.real_T?.length || 0;
  const currentTrial = session?.trials?.[trialIndex];
  const currentSequenceId = currentTrial?.sequenceId;
  const currentSequence = currentSequenceId ? getSequenceConfig(currentSequenceId) : null;
  const overallExampleIndex = session?.trials?.findIndex((trial) => !trial.isPractice) ?? -1;
  const normalizedOverallExampleIndex = overallExampleIndex >= 0 ? overallExampleIndex : 0;
  const isAdmin = participantId.trim().toLowerCase() === "admin" || session?.participantId?.toLowerCase() === "admin";
  const isAdminMenuOpen = Boolean(adminMenuAnchor);
  const isWorkflowPage = page === "trial" || page === "post";
  const ballActionStep = useMemo(() => {
    if (!totalFrames) return null;

    for (let index = realBallActions.length - 1; index >= 0; index -= 1) {
      const action = Number(realBallActions[index]);
      if (Number.isFinite(action) && action !== 0) {
        return index;
      }
    }

    return totalFrames - 1;
  }, [realBallActions, totalFrames]);
  const shouldStopAtBallAction = phase === "a" && trialQuestionStep === 0 && Number.isInteger(ballActionStep);
  const questionOneStopStep = shouldStopAtBallAction ? ballActionStep : undefined;

  const updateSession = (updater) => {
    setSession((prev) => {
      if (!prev) return prev;
      return updater(prev);
    });
  };

  const logInteraction = useCallback((eventType, details = {}) => {
    setSession((prev) => {
      if (!prev) return prev;

      return {
        ...prev,
        interactionLog: [
          ...(prev.interactionLog || []),
          {
            time: nowIso(),
            eventType,
            page,
            trialIndex,
            phase,
            trialQuestionStep,
            sequenceId: currentSequenceId || "",
            frame: currentStep,
            ...details,
          },
        ],
      };
    });
  }, [currentSequenceId, currentStep, page, phase, trialIndex, trialQuestionStep]);

  const getAdminToken = useCallback(() => {
    const storedToken = localStorage.getItem(adminTokenKey);
    if (storedToken) return storedToken;

    const enteredToken = window.prompt("Enter admin export token");
    if (enteredToken) {
      localStorage.setItem(adminTokenKey, enteredToken);
      return enteredToken;
    }

    return "";
  }, []);

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
    const sessions = await fetchStudyDatabase(isAdmin ? getAdminToken() : "");
    writeStudyDatabase(sessions);
    setCompletedSessions(sessions);
  }, [getAdminToken, isAdmin]);

  const clearLoadedData = useCallback(() => {
    setPlayerData([]);
    setValueData([]);
    setQBall([]);
    setQPlayer([]);
    setRealPlayerActions([]);
    setRealBallActions([]);
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
      setRealBallActions(
        frames.map((frame) =>
          Array.isArray(frame.real_ball_action) ? frame.real_ball_action[0] : frame.real_ball_action,
        ),
      );
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
    setCurrentStep(0);
    setIsPlaying(false);
  }, [page, phase, trialIndex, trialQuestionStep]);

  useEffect(() => {
    if (!shouldStopAtBallAction || !Number.isInteger(ballActionStep)) return;

    setCurrentStep((step) => Math.min(step, ballActionStep));
  }, [shouldStopAtBallAction, ballActionStep]);

  useEffect(() => {
    if (page !== "post" || !session?.trials?.length) return;

    if (trialIndex !== normalizedOverallExampleIndex) {
      setTrialIndex(normalizedOverallExampleIndex);
      setPhase("b");
      setTrialQuestionStep(0);
      setCurrentStep(0);
      setIsPlaying(false);
    }
  }, [normalizedOverallExampleIndex, page, session?.trials?.length, trialIndex]);

  useEffect(() => {
    if (session) {
      localStorage.setItem("hoopevalStudySession", JSON.stringify(session));
    }
  }, [session]);

  useEffect(() => {
    if (!session || session.participantId?.toLowerCase() === "admin") return undefined;

    const payload = JSON.stringify(session);
    if (payload === lastSavedPayloadRef.current) return undefined;

    const timeoutId = window.setTimeout(async () => {
      const saved = await saveStudySession(session);
      if (saved) {
        lastSavedPayloadRef.current = payload;
      }
    }, 1200);

    return () => window.clearTimeout(timeoutId);
  }, [session]);

  useEffect(() => {
    setSession((prev) => (prev ? { ...prev, postStudyResponses: postStudy } : prev));
  }, [postStudy]);

  useEffect(() => {
    if (phase !== "a" || !currentSequence) return;

    if (trialQuestionStep === 0 && phaseA.independentActionRanking.length === 0) {
      setPhaseA((prev) => ({ ...prev, independentActionRanking: currentSequence.candidateActions }));
    }
    if (trialQuestionStep === 1 && phaseA.independentPlayerRanking.length === 0) {
      setPhaseA((prev) => ({ ...prev, independentPlayerRanking: currentSequence.playerLabels }));
    }
  }, [currentSequence, phase, phaseA.independentActionRanking.length, phaseA.independentPlayerRanking.length, trialQuestionStep]);

  useEffect(() => {
    if (phase !== "b") return;

    setModelRevealCue(true);
    const timeoutId = window.setTimeout(() => setModelRevealCue(false), 1800);
    return () => window.clearTimeout(timeoutId);
  }, [phase, trialIndex]);

  const startTrial = (index) => {
    const trial = session?.trials?.[index];
    if (!trial) return;

    setTrialIndex(index);
    setPhase("a");
    setTrialQuestionStep(0);
    setPhaseA({
      independentActionRanking: trial.independentActionRanking || [],
      independentActionRationale: trial.independentActionRationale || "",
      independentPlayerRanking: trial.independentPlayerRanking || [],
      playerContributionRationale: trial.playerContributionRationale || "",
    });
    setPhaseB({
      epvAlignment: trial.epvAlignment || "",
      actionAlignment: trial.actionAlignment || "",
      playerContributionAlignment: trial.playerContributionAlignment || "",
      trust: trial.trust || "",
      contestability: trial.contestability || "",
      disagreementExplanation: trial.disagreementExplanation || "",
      disagreementMoment: trial.disagreementMoment || "",
    });
    updateSession((prev) => ({
      ...prev,
      trials: prev.trials.map((item, itemIndex) =>
        itemIndex === index ? { ...item, phaseAStartTime: item.phaseAStartTime || nowIso() } : item,
      ),
    }));
    if (
      trial.independentActionRanking?.length ||
      trial.independentPlayerRanking?.length ||
      trial.epvAlignment
    ) {
      setNoticeText("Previous answer loaded");
    }
    logInteraction("trial_start", { targetTrialIndex: index, targetSequenceId: trial.sequenceId });
  };

  const createSession = (nextParticipantId = participantId.trim(), nextConsent = consent) => {
    const configuredPracticeSequences =
      studyConfig.practiceSequenceIds || [studyConfig.practiceSequenceId].filter(Boolean);
    const practiceSequences = configuredPracticeSequences.filter((sequenceId) => availableFiles.includes(sequenceId));
    const randomizedMainSequences = studyConfig.randomizeTrialOrder
      ? shuffle(studyConfig.mainSequenceIds)
      : studyConfig.mainSequenceIds;
    const mainTrialCount = studyConfig.mainTrialCount || randomizedMainSequences.length;
    const mainSequences = randomizedMainSequences
      .filter((sequenceId) => availableFiles.includes(sequenceId) && !practiceSequences.includes(sequenceId))
      .slice(0, mainTrialCount);
    const trialOrder = [...practiceSequences, ...mainSequences];
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
      trials: trialOrder.map((sequenceId) => buildEmptyTrial(sequenceId, practiceSequences.includes(sequenceId))),
      postStudyResponses: {},
      interviewNotes,
      interactionLog: [],
      notableMoments: [],
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
    phaseA.independentPlayerRanking.filter(Boolean).length === currentSequence?.playerLabels.length &&
    new Set(phaseA.independentPlayerRanking).size === currentSequence?.playerLabels.length;

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
    logInteraction("model_reveal");
  };

  const phaseBComplete = Boolean(phaseB.epvAlignment);

  const submitPhaseB = () => {
    const completedAt = nowIso();
    updateSession((prev) => ({
      ...prev,
      trials: prev.trials.map((trial, index) =>
        index === trialIndex ? { ...trial, ...phaseB, phaseBEndTime: completedAt } : trial,
      ),
    }));

    if (trialIndex + 1 < session.trials.length) {
      logInteraction("next_trial");
      startTrial(trialIndex + 1);
      return;
    }

    logInteraction("post_study_open");
    markPageStart("post");
  };

  const backToPhaseAAnswers = () => {
    setIsPlaying(false);
    setPhase("a");
    setTrialQuestionStep(1);
    setNoticeText("Previous answer loaded");
    logInteraction("back_to_phase_a_answers");
  };

  const backToFinalTrial = () => {
    if (!session?.trials?.length) return;

    setPage("trial");
    setTrialIndex(session.trials.length - 1);
    setPhase("b");
    setTrialQuestionStep(0);
    setIsPlaying(false);
    setNoticeText("Previous answer loaded");
    logInteraction("back_to_final_trial");
  };

  const markNotableMoment = () => {
    const moment = {
      time: nowIso(),
      page,
      trialIndex,
      phase,
      trialQuestionStep,
      sequenceId: currentSequenceId || "",
      frame: currentStep,
    };

    updateSession((prev) => ({
      ...prev,
      notableMoments: [...(prev.notableMoments || []), moment],
    }));
    logInteraction("mark_notable_moment", moment);
    setNoticeText("Notable moment marked");
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
        independentPlayerRanking: trial.independentPlayerRanking,
        playerContributionRationale: trial.playerContributionRationale,
        epvAlignment: trial.epvAlignment,
        actionAlignment: trial.actionAlignment,
        playerContributionAlignment: trial.playerContributionAlignment,
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

    const interactionRows = (finalSession.interactionLog || []).map((entry, index) => ({
      sessionId: finalSession.sessionId,
      participantId: finalSession.participantId,
      interactionIndex: index + 1,
      ...entry,
    }));

    const notableMomentRows = (finalSession.notableMoments || []).map((entry, index) => ({
      sessionId: finalSession.sessionId,
      participantId: finalSession.participantId,
      momentIndex: index + 1,
      ...entry,
    }));

    return { participants, trialResponses, postStudyRows, interviewRows, interactionRows, notableMomentRows };
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

    const { participants, trialResponses, postStudyRows, interviewRows, interactionRows, notableMomentRows } = buildExportRows(finalSession);
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
    downloadText(
      "interaction_log.csv",
      toCsv(interactionRows, Object.keys(interactionRows[0] || { sessionId: "", participantId: "", interactionIndex: "", eventType: "", time: "" })),
      "text/csv;charset=utf-8",
    );
    downloadText(
      "notable_moments.csv",
      toCsv(notableMomentRows, Object.keys(notableMomentRows[0] || { sessionId: "", participantId: "", momentIndex: "", time: "", sequenceId: "", frame: "" })),
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
      const nextLikelyUseCases = selected
        ? prev.likelyUseCases.filter((item) => item !== useCase)
        : [...prev.likelyUseCases, useCase];
      logInteraction("answer_edit", { field: "likelyUseCases", value: nextLikelyUseCases });

      return {
        ...prev,
        likelyUseCases: nextLikelyUseCases,
      };
    });
  };

  const handlePostStudyFieldChange = (field, value) => {
    setPostStudy((prev) => ({ ...prev, [field]: value }));
    logInteraction("answer_edit", { field, value });
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
      avgExplanationUsefulness: numericAverage(participantSessions.map((item) => item.postStudyResponses?.explanationUsefulness)),
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
      title="Consent"
      description="Enter your participant ID and start when ready."
    >
      <Stack spacing={2}>
        <Typography color="text.secondary">
          Each possession has trial questions 1-3. Overall questions 4-6 appear once after all trials.
        </Typography>
        <StepGuide items={["Enter participant ID", "Check consent", "Click Start"]} />
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
        <GuidedActionButton onClick={beginStudy} disabled={!isAdmin && (!participantId.trim() || !consent.required)}>
          Start
        </GuidedActionButton>
      </Stack>
    </Section>
  );

  const renderBackground = () => (
    <Section
      title="Background Questionnaire"
      description="Answer these background questions before the practice trials."
    >
      <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" } }}>
        <Box sx={{ gridColumn: { md: "1 / -1" } }}>
          <StepGuide items={["Complete fields", "Review selections", "Click Continue"]} />
        </Box>
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
      <GuidedActionButton
        sx={{ mt: 2 }}
        onClick={submitBackground}
        disabled={!isAdmin && Object.values(background).some((value) => !String(value).trim())}
      >
        Continue
      </GuidedActionButton>
    </Section>
  );

  const renderTrial = () => {
    if (!currentTrial || !currentSequence) return null;

    const ballActionFrameLabel = Number.isInteger(ballActionStep)
      ? `Frame ${ballActionStep + 1}`
      : "the ball action frame";
    const completedPracticeCount = session.trials.slice(0, trialIndex + 1).filter((trial) => trial.isPractice).length;
    const totalPracticeCount = session.trials.filter((trial) => trial.isPractice).length;
    const currentMainIndex = session.trials.slice(0, trialIndex + 1).filter((trial) => !trial.isPractice).length;
    const totalMainCount = session.trials.filter((trial) => !trial.isPractice).length;
    const trialTitle = currentTrial.isPractice
      ? `Practice Trial ${completedPracticeCount}`
      : `Main Trial ${currentMainIndex}`;
    const trialJumpOptions = session.trials.map((trial, index) => {
      const labelIndex = session.trials.slice(0, index + 1).filter((item) => item.isPractice === trial.isPractice).length;
      const labelTotal = session.trials.filter((item) => item.isPractice === trial.isPractice).length;
      const label = trial.isPractice ? `Practice ${labelIndex}/${labelTotal}` : `Main ${labelIndex}/${labelTotal}`;
      return { index, label };
    });
    const highlightedModelOutputs =
      phase !== "b"
        ? []
        : ["epv"];
    const phaseLabel = phase === "a" ? "Phase A" : "Phase B";
    const currentQuestionNumber = phase === "a" ? trialQuestionStep + 1 : 3;
    const phaseAActionReady =
      phaseA.independentActionRanking.filter(Boolean).length === currentSequence.candidateActions.length &&
      new Set(phaseA.independentActionRanking).size === currentSequence.candidateActions.length;
    const phaseAPlayerReady =
      phaseA.independentPlayerRanking.filter(Boolean).length === currentSequence.playerLabels.length &&
      new Set(phaseA.independentPlayerRanking).size === currentSequence.playerLabels.length;
    const currentQuestionReady =
      phase === "b" ? Boolean(phaseB.epvAlignment) : trialQuestionStep === 0 ? phaseAActionReady : phaseAPlayerReady;
    const progressItems = [
      {
        label: currentTrial.isPractice
          ? `Practice ${completedPracticeCount}/${totalPracticeCount}`
          : `Main ${currentMainIndex}/${totalMainCount}`,
        active: true,
      },
      { label: `Q${currentQuestionNumber}/3`, active: true },
      { label: phaseLabel, active: true },
    ];

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
        playbackStopStep={questionOneStopStep}
        showModelOutput={phase === "b"}
        highlightedModelOutputs={highlightedModelOutputs}
        modelRevealCue={modelRevealCue}
        onInteraction={logInteraction}
        onLegendOpen={() => setIsLegendOpen(true)}
      />
    );

    const responsePanel =
      phase === "a" ? (
        <CompactSection
          title={`Trial Question ${trialQuestionStep + 1}/3`}
          action={<AnswerStatus ready={currentQuestionReady} />}
          sx={{
            height: { md: "100%" },
            minHeight: 0,
            overflow: "auto",
            borderColor: alpha("#0f4c81", 0.32),
            boxShadow: "0 8px 24px rgba(15, 76, 129, 0.08)",
          }}
          description={
            trialQuestionStep === 0
              ? `Rank the ball action at ${ballActionFrameLabel}.`
              : "Rank the five offensive players."
          }
        >
          <Stack spacing={1} sx={{ minHeight: "100%" }}>
            {trialQuestionStep === 0 ? (
              <>
                <RankingInputs
                  title="Rank possible ball actions"
                  choices={currentSequence.candidateActions}
                  value={phaseA.independentActionRanking}
                  onChange={(value) => {
                    setPhaseA({ ...phaseA, independentActionRanking: value });
                    logInteraction("answer_edit", { field: "independentActionRanking", value });
                  }}
                />
                <ThinkAloudPrompt>
                  Think aloud about what you noticed on the court, why your top action is best, what alternatives you considered, and anything that makes the decision uncertain.
                </ThinkAloudPrompt>
                <ActionFooter>
                  <GuidedActionButton
                    onClick={() => setTrialQuestionStep(1)}
                    disabled={!isAdmin && !phaseAActionReady}
                  >
                    Next Question
                  </GuidedActionButton>
                </ActionFooter>
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
                  onChange={(value) => {
                    setPhaseA({ ...phaseA, independentPlayerRanking: value });
                    logInteraction("answer_edit", { field: "independentPlayerRanking", value });
                  }}
                />
                <ThinkAloudPrompt>
                  Think aloud about which player created or reduced advantage, what movement/spacing/defensive reaction you noticed, and why your top-ranked player matters most.
                </ThinkAloudPrompt>
                <ActionFooter>
                  <Button size="large" variant="outlined" onClick={() => setTrialQuestionStep(0)} sx={{ minHeight: 48, px: 2.4, fontSize: "1rem", fontWeight: 700 }}>
                    Back
                  </Button>
                  <GuidedActionButton onClick={submitPhaseA} disabled={!isAdmin && !phaseAComplete}>
                    Reveal Model Output
                  </GuidedActionButton>
                </ActionFooter>
              </>
            )}
          </Stack>
        </CompactSection>
      ) : (
        <CompactSection
          title="Trial Question 3/3"
          action={<AnswerStatus ready={currentQuestionReady} />}
          sx={{
            height: { md: "100%" },
            minHeight: 0,
            overflow: "auto",
            borderColor: alpha("#0f4c81", 0.32),
            boxShadow: "0 8px 24px rgba(15, 76, 129, 0.08)",
          }}
          description="Rate how well the EPV trend matches your judgment."
        >
          <Stack spacing={1} sx={{ minHeight: "100%" }}>
            <LikertSelect
              label="EPV match"
              value={phaseB.epvAlignment}
              onChange={(value) => {
                setPhaseB({ ...phaseB, epvAlignment: value });
                logInteraction("answer_edit", { field: "epvAlignment", value });
              }}
              required
            />
            <ThinkAloudPrompt>
              Think aloud about where the EPV trend matches your judgment, where it disagrees, and whether seeing the model changes how you interpret the possession.
            </ThinkAloudPrompt>
            <ActionFooter>
              <Button size="large" variant="outlined" onClick={backToPhaseAAnswers} sx={{ minHeight: 48, px: 2.4, fontSize: "1rem", fontWeight: 700 }}>
                Back
              </Button>
              <GuidedActionButton onClick={submitPhaseB} disabled={!isAdmin && !phaseBComplete}>
                {trialIndex + 1 < session.trials.length ? "Next Trial" : "Post-Study Questionnaire"}
              </GuidedActionButton>
            </ActionFooter>
          </Stack>
        </CompactSection>
      );

    return (
      <Box
        sx={{
          display: "grid",
          gridTemplateRows: "auto minmax(0, 1fr)",
          gap: 0.5,
          height: { md: "calc(100dvh - 60px)" },
          minHeight: 0,
        }}
      >
        <Paper elevation={0} sx={{ px: 0.75, py: 0.4, border: "1px solid", borderColor: "divider" }}>
          <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" gap={1}>
            <Stack direction="row" spacing={1} alignItems="center">
              <SportsBasketballRoundedIcon color="primary" fontSize="small" />
              <Typography variant="h6">{trialTitle}</Typography>
            </Stack>
            <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap" useFlexGap>
              <ProgressMap items={progressItems} />
              {isAdmin && (
                <FormControl size="small" sx={{ minWidth: 160 }}>
                  <InputLabel>Jump trial</InputLabel>
                  <Select
                    value={trialIndex}
                    label="Jump trial"
                    onChange={(event) => startTrial(Number(event.target.value))}
                  >
                    {trialJumpOptions.map((option) => (
                      <MenuItem key={option.index} value={option.index}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            </Stack>
          </Stack>
        </Paper>

        <Box
          sx={{
            display: "grid",
            gap: 0.65,
            minHeight: 0,
            overflow: "hidden",
            gridTemplateColumns: {
              xs: "1fr",
              md: "minmax(0, calc(74% - 3px)) minmax(0, calc(26% - 3px))",
              xl: "minmax(0, calc(76% - 3px)) minmax(0, calc(24% - 3px))",
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

  const renderPostStudy = () => {
    const overallReady = Boolean(postStudy.overallUsefulness && postStudy.likelyUseCases.length && postStudy.explanationUsefulness);
    const overallProgressItems = [
      { label: "Overall Q4-6", active: true },
      { label: "Example replay", active: true },
    ];
    const exampleViewer =
      currentSequence && !isLoading && !errorText && playerData.length > 0 ? (
        <PossessionViewer
          sequenceLabel={`Example: ${currentSequence.label}`}
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
          showModelOutput
          highlightedModelOutputs={["epv", "actions", "contributions"]}
          onInteraction={logInteraction}
          onLegendOpen={() => setIsLegendOpen(true)}
        />
      ) : (
        <CompactSection title={isLoading ? "Loading example" : "Example unavailable"}>
          <Typography color={errorText ? "error.main" : "text.secondary"}>
            {errorText || "Loading trial data..."}
          </Typography>
        </CompactSection>
      );

    return (
      <Box
        sx={{
          display: "grid",
          gridTemplateRows: "auto minmax(0, 1fr)",
          gap: 0.5,
          height: { md: "calc(100dvh - 60px)" },
          minHeight: 0,
        }}
      >
        <Paper elevation={0} sx={{ px: 0.75, py: 0.4, border: "1px solid", borderColor: "divider" }}>
          <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" gap={1}>
            <Stack direction="row" spacing={1} alignItems="center">
              <SportsBasketballRoundedIcon color="primary" fontSize="small" />
              <Typography variant="h6">Overall Questions 4-6</Typography>
            </Stack>
            <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap" useFlexGap>
              <ProgressMap items={overallProgressItems} />
              {currentSequence && <Chip size="small" variant="outlined" label={currentSequence.label} />}
            </Stack>
          </Stack>
        </Paper>

        <Box
          sx={{
            display: "grid",
            gap: 0.65,
            minHeight: 0,
            overflow: "hidden",
            gridTemplateColumns: {
              xs: "1fr",
              md: "minmax(0, calc(74% - 3px)) minmax(0, calc(26% - 3px))",
              xl: "minmax(0, calc(76% - 3px)) minmax(0, calc(24% - 3px))",
            },
            alignItems: "stretch",
          }}
        >
          {exampleViewer}
          <CompactSection
            title="Overall Questions 4-6"
            action={<AnswerStatus ready={overallReady} />}
            sx={{
              height: { md: "100%" },
              minHeight: 0,
              overflow: "auto",
              borderColor: alpha("#e76f51", 0.42),
              bgcolor: alpha("#fff7ed", 0.62),
              boxShadow: "0 8px 24px rgba(231, 111, 81, 0.08)",
            }}
            description="Answer these once after all trial-based questions are complete."
          >
            <Stack spacing={1.25} sx={{ minHeight: "100%" }}>
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Question 4
                </Typography>
                <Typography variant="body2" color="text.secondary" mb={1}>
                  Rate practical coaching usefulness.
                </Typography>
                <LikertSelect
                  label="Coaching usefulness"
                  value={postStudy.overallUsefulness}
                  onChange={(value) => handlePostStudyFieldChange("overallUsefulness", value)}
                  options={usefulnessLabels}
                  required
                />
              </Box>
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Question 5
                </Typography>
                <Typography variant="body2" color="text.secondary" mb={0.75}>
                  Select where this system fits best.
                </Typography>
                <Box sx={{ display: "grid", gap: 0.25, gridTemplateColumns: "1fr" }}>
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
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Question 6
                </Typography>
                <Typography variant="body2" color="text.secondary" mb={1}>
                  Rate how helpful the model explanations were overall.
                </Typography>
                <LikertSelect
                  label="Explanation usefulness"
                  value={postStudy.explanationUsefulness}
                  onChange={(value) => handlePostStudyFieldChange("explanationUsefulness", value)}
                  options={explanationUsefulnessLabels}
                  required
                />
              </Box>
              <ThinkAloudPrompt>
                Think aloud across the full study: when the system felt useful, when it felt confusing or untrustworthy, which model outputs helped most, and what you would need before using it in coaching work.
              </ThinkAloudPrompt>
              <ActionFooter>
                <Button size="large" variant="outlined" onClick={backToFinalTrial} sx={{ minHeight: 48, px: 2.4, fontSize: "1rem", fontWeight: 700 }}>
                  Back
                </Button>
                <GuidedActionButton
                  onClick={submitPostStudy}
                  disabled={
                    !isAdmin &&
                    (!postStudy.overallUsefulness || !postStudy.likelyUseCases.length || !postStudy.explanationUsefulness)
                  }
                >
                  Continue
                </GuidedActionButton>
              </ActionFooter>
            </Stack>
          </CompactSection>
        </Box>
      </Box>
    );
  };

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
          height: isWorkflowPage ? "100dvh" : "auto",
          overflow: isWorkflowPage ? "hidden" : "auto",
          px: isWorkflowPage ? { xs: 0.5, md: 0.65 } : { xs: 1, md: 1.5 },
          py: isWorkflowPage ? { xs: 0.45, md: 0.5 } : { xs: 1, md: 1.25 },
          bgcolor: "background.default",
        }}
      >
        <ActionLegend isOpen={isLegendOpen} onClose={() => setIsLegendOpen(false)} />
        <Snackbar
          open={Boolean(noticeText)}
          autoHideDuration={2400}
          onClose={() => setNoticeText("")}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
          <Alert variant="filled" severity="success" onClose={() => setNoticeText("")}>
            {noticeText}
          </Alert>
        </Snackbar>
        <Menu anchorEl={adminMenuAnchor} open={isAdminMenuOpen} onClose={() => setAdminMenuAnchor(null)}>
          <MenuItem
            onClick={() => {
              setAdminMenuAnchor(null);
              markNotableMoment();
            }}
          >
            Mark notable moment
          </MenuItem>
          <MenuItem
            onClick={() => {
              setAdminMenuAnchor(null);
              setPage("stats");
              void loadCompletedSessions();
            }}
          >
            Overall Stats
          </MenuItem>
          <MenuItem
            onClick={() => {
              setAdminMenuAnchor(null);
              skipAllQuestions();
            }}
          >
            Skip Questions
          </MenuItem>
        </Menu>
        <Stack spacing={isWorkflowPage ? 0.4 : 1.25} sx={{ height: isWorkflowPage ? "100%" : "auto", minHeight: 0 }}>
          <Paper elevation={0} sx={{ p: isWorkflowPage ? { xs: 0.45, md: 0.5 } : { xs: 1.2, md: 1.5 }, border: "1px solid", borderColor: "divider" }}>
            <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" gap={isWorkflowPage ? 0.5 : 1}>
              <Box>
                <Stack direction="row" spacing={0.65} alignItems="center">
                  <SportsBasketballRoundedIcon color="primary" fontSize={isWorkflowPage ? "small" : "medium"} />
                  <Typography variant={isWorkflowPage ? "h6" : "h5"}>HoopEval User Study</Typography>
                </Stack>
                {!isWorkflowPage && (
                  <Typography variant="body2" color="text.secondary">
                    Expert evaluation workflow for basketball EPV interpretation.
                  </Typography>
                )}
              </Box>
              <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                <Chip size="small" color="primary" label={session?.participantId || "No participant"} />
                <Chip size="small" variant="outlined" label={page} />
                {isAdmin && <Chip size="small" color="secondary" label="Admin" />}
                {session && <Chip size="small" variant="outlined" label={`Trials: ${session.trials.length}`} />}
                {isAdmin && (
                  <Tooltip title="Admin tools">
                    <IconButton size="small" color="primary" onClick={(event) => setAdminMenuAnchor(event.currentTarget)} aria-label="admin tools">
                      <MoreHorizRoundedIcon />
                    </IconButton>
                  </Tooltip>
                )}
              </Stack>
            </Stack>
          </Paper>
          {isWorkflowPage && (
            <Alert severity="info" sx={{ display: { xs: "flex", md: "none" }, py: 0.25 }}>
              Use a wider screen for the full court and question panel layout.
            </Alert>
          )}

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
