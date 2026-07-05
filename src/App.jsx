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
import Papa from "papaparse";
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

const allBallActionChoices = [
  "Shoot",
  "Pass to Player 1",
  "Pass to Player 2",
  "Pass to Player 3",
  "Pass to Player 4",
  "Pass to Player 5",
  "Keep dribbling",
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

const createEmptyInterviewNotes = () => Object.fromEntries(interviewSections.map((section) => [section, ""]));

const toShortPlayerName = (fullName = "") => {
  const readableName = fullName.trim().replace(/([a-z])([A-Z])/g, "$1 $2");
  const parts = readableName.split(/\s+/).filter(Boolean);
  if (parts.length < 2) return readableName;
  const lastName = parts.slice(1).join(" ");
  return `${parts[0][0]}.${lastName}`;
};

const getFirstPresentValue = (row, keys) => {
  for (const key of keys) {
    const value = row[key];
    if (value != null && String(value).trim()) return String(value).trim();
  }
  return "";
};

const buildPlayerNameMap = (rows) =>
  rows.reduce((lookup, row) => {
    const normalizedRow = Object.fromEntries(
      Object.entries(row || {}).map(([key, value]) => [String(key).trim().toLowerCase(), value]),
    );
    const id = getFirstPresentValue(normalizedRow, ["player_id", "playerid", "person_id", "personid", "id"]);
    const name =
      getFirstPresentValue(normalizedRow, ["display_first_last", "player_name", "playername", "full_name", "name"]) ||
      [getFirstPresentValue(normalizedRow, ["first_name", "firstname"]), getFirstPresentValue(normalizedRow, ["last_name", "lastname"])]
        .filter(Boolean)
        .join(" ");

    if (id && name) lookup[id] = name;
    return lookup;
  }, {});

const nowIso = () => new Date().toISOString();
const studyDatabaseKey = "hoopevalStudyDatabase";
const adminTokenKey = "hoopevalAdminToken";

const defaultConsent = {
  required: false,
  audioRecording: false,
  screenRecording: false,
  anonymousQuotation: false,
};

const defaultBackground = {
  currentRole: "",
  yearsExperience: "",
  highestLevel: "",
  videoToolUse: "",
  analyticsUse: "",
  epvFamiliarity: "",
  visualizationComfort: "",
};

const defaultPostStudy = {
  overallUsefulness: "",
  overallInterpretability: "",
  overallTrust: "",
  overallContestability: "",
  explanationUsefulness: "",
  likelyUseCases: [],
  useCaseExplanation: "",
};

const getSessionSortTime = (session) => new Date(session.savedAt || session.startTime || 0).getTime();

const getLatestParticipantSessions = (sessions) => {
  const latestByParticipant = new Map();

  [...sessions]
    .filter((session) => session.participantId?.toLowerCase() !== "admin")
    .sort((left, right) => getSessionSortTime(right) - getSessionSortTime(left))
    .forEach((session) => {
      const participantId = session.participantId?.trim().toLowerCase();
      if (participantId && !latestByParticipant.has(participantId)) {
        latestByParticipant.set(participantId, session);
      }
    });

  return [...latestByParticipant.values()].sort((left, right) => getSessionSortTime(left) - getSessionSortTime(right));
};

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
    const error = new Error(`API request failed: ${response.status}`);
    error.status = response.status;
    throw error;
  }

  return response.json();
};

const fetchStudyDatabase = async (adminToken = "", { fallbackToLocal = true } = {}) => {
  try {
    const data = await apiRequest("/api/sessions", { adminToken });
    return { sessions: Array.isArray(data.sessions) ? data.sessions : [], source: "backend" };
  } catch (error) {
    if (!fallbackToLocal) throw error;
    return { sessions: readStudyDatabase(), source: "browser" };
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

const deleteStudySession = async (sessionId, adminToken = "") => {
  await apiRequest(`/api/sessions/${encodeURIComponent(sessionId)}`, {
    method: "DELETE",
    adminToken,
  });
};

const clearStudySessions = async (adminToken = "") => {
  await apiRequest("/api/sessions", {
    method: "DELETE",
    adminToken,
  });
};

const fetchLatestParticipantSession = async (participantId) => {
  try {
    const params = new URLSearchParams({ participantId });
    const data = await apiRequest(`/api/sessions/latest?${params.toString()}`);
    return data.session || null;
  } catch {
    return null;
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

    const restarted = false;
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
              <Tooltip title={isPlaying ? "Pause playback" : isAtPlaybackEnd ? "Playback finished" : "Play possession"}>
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
  const [playerNameById, setPlayerNameById] = useState({});
  const [isLegendOpen, setIsLegendOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isStartingStudy, setIsStartingStudy] = useState(false);
  const [isCheckingResume, setIsCheckingResume] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [modelRevealCue, setModelRevealCue] = useState(false);
  const [adminMenuAnchor, setAdminMenuAnchor] = useState(null);

  const [page, setPage] = useState("welcome");
  const [participantId, setParticipantId] = useState("");
  const [consent, setConsent] = useState(defaultConsent);
  const [session, setSession] = useState(null);
  const [resumeCandidateSession, setResumeCandidateSession] = useState(null);
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
  const [background, setBackground] = useState(defaultBackground);
  const [postStudy, setPostStudy] = useState(defaultPostStudy);
  const [interviewNotes, setInterviewNotes] = useState(createEmptyInterviewNotes);
  const [completedSessions, setCompletedSessions] = useState(() => readStudyDatabase());
  const [selectedStatsSessionId, setSelectedStatsSessionId] = useState("");
  const [selectedBackendSessionIds, setSelectedBackendSessionIds] = useState([]);
  const [databaseStatus, setDatabaseStatus] = useState({
    source: "browser",
    message: "Showing browser-local responses until backend refresh succeeds.",
    error: "",
  });
  const [noticeText, setNoticeText] = useState("");
  const lastSavedPayloadRef = useRef("");

  const totalFrames = playerData?.[0]?.real_T?.length || 0;
  const currentTrial = session?.trials?.[trialIndex];
  const currentSequenceId = currentTrial?.sequenceId;
  const currentSequence = currentSequenceId ? getSequenceConfig(currentSequenceId) : null;
  const overallExampleIndex = session?.trials?.findIndex((trial) => !trial.isPractice) ?? -1;
  const normalizedOverallExampleIndex = overallExampleIndex >= 0 ? overallExampleIndex : 0;
  const isAdmin = participantId.trim().toLowerCase() === "admin" || session?.participantId?.toLowerCase() === "admin";
  const displayedParticipantId = session?.participantId || participantId.trim() || "No participant";
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
  const ballHandlerPlayerIndex = Number.isInteger(ballActionStep)
    ? Number(realBallActions[ballActionStep])
    : null;
  const questionOneActionChoices = useMemo(() => {
    if (!Number.isInteger(ballHandlerPlayerIndex) || ballHandlerPlayerIndex < 1 || ballHandlerPlayerIndex > 5) {
      return allBallActionChoices;
    }

    return allBallActionChoices.filter((choice) => choice !== `Pass to Player ${ballHandlerPlayerIndex}`);
  }, [ballHandlerPlayerIndex]);

  useEffect(() => {
    const loadPlayerNames = async () => {
      const playerNamesUrl = import.meta.env.VITE_PLAYER_NAMES_URL || `${import.meta.env.BASE_URL}players.csv`;

      try {
        const response = await fetch(playerNamesUrl);
        if (!response.ok) return;

        const csvText = await response.text();
        const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
        setPlayerNameById(buildPlayerNameMap(parsed.data));
      } catch {
        setPlayerNameById({});
      }
    };

    void loadPlayerNames();
  }, []);

  const updateSession = (updater) => {
    setSession((prev) => {
      if (!prev) return prev;
      return updater(prev);
    });
  };

  const persistSessionUpdate = useCallback((updater) => {
    if (!session) return null;

    const nextSession = updater(session);
    setSession(nextSession);

    if (nextSession.participantId?.toLowerCase() !== "admin") {
      void saveStudySession(nextSession);
      lastSavedPayloadRef.current = JSON.stringify(nextSession);
    }

    return nextSession;
  }, [session]);

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

  const getAdminToken = useCallback((forcePrompt = false) => {
    const storedToken = forcePrompt ? "" : localStorage.getItem(adminTokenKey);
    if (storedToken) return storedToken;

    const enteredToken = window.prompt(forcePrompt ? "Admin token rejected. Enter admin export token again." : "Enter admin export token");
    if (enteredToken) {
      localStorage.setItem(adminTokenKey, enteredToken);
      return enteredToken;
    }

    return "";
  }, []);

  const setAdminTokenManually = useCallback(() => {
    const currentToken = localStorage.getItem(adminTokenKey) || "";
    const enteredToken = window.prompt("Set admin export token", currentToken);
    if (enteredToken === null) return;

    const trimmedToken = enteredToken.trim();
    if (trimmedToken) {
      localStorage.setItem(adminTokenKey, trimmedToken);
      setDatabaseStatus((prev) => ({ ...prev, error: "", message: "Admin token updated. Click Refresh to load backend data." }));
      return;
    }

    localStorage.removeItem(adminTokenKey);
    setDatabaseStatus((prev) => ({ ...prev, error: "", message: "Admin token cleared. Click Refresh and enter a token." }));
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
    setDatabaseStatus((prev) => ({ ...prev, message: "Refreshing backend data...", error: "" }));

    try {
      let result;
      try {
        result = await fetchStudyDatabase(isAdmin ? localStorage.getItem(adminTokenKey) || "" : "", {
          fallbackToLocal: !isAdmin,
        });
      } catch (error) {
        if (!isAdmin || error.status !== 401) throw error;
        localStorage.removeItem(adminTokenKey);
        result = await fetchStudyDatabase(getAdminToken(true), { fallbackToLocal: false });
      }

      const { sessions, source } = result;
      writeStudyDatabase(sessions);
      setCompletedSessions(sessions);
      setSelectedBackendSessionIds([]);
      setDatabaseStatus({
        source,
        message:
          source === "backend"
            ? `Loaded ${sessions.length} session${sessions.length === 1 ? "" : "s"} from the backend database.`
            : "Backend unavailable. Showing browser-local responses only.",
        error: "",
      });
      return sessions;
    } catch (error) {
      setDatabaseStatus({
        source: "error",
        message: "Backend database refresh failed. Check the admin token and Render service.",
        error: error.message || "Unknown error",
      });
      throw error;
    }
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
        playerIds.map((playerId, index) => {
          const fullName = playerId === -1 ? "Ball" : playerNameById[String(playerId)] || "";
          return {
            agent_id: playerId,
            teamID: playerId === -1 ? -1 : index <= 5 ? 1610612737 : 1610612738,
            real_T: frames.map((frame) => frame.xy[index]),
            name: fullName || `Player ${playerId}`,
            shortName: playerId === -1 ? "Ball" : fullName ? toShortPlayerName(fullName) : "",
            jersey: playerId === -1 ? "" : `${index}`,
          };
        }),
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
  }, [clearLoadedData, playerNameById]);

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
    const participantSessions = completedSessions.filter((item) => item.participantId?.toLowerCase() !== "admin");
    if (!participantSessions.length) {
      setSelectedStatsSessionId("");
      setSelectedBackendSessionIds([]);
      return;
    }

    if (!participantSessions.some((item) => item.sessionId === selectedStatsSessionId)) {
      setSelectedStatsSessionId(participantSessions[0].sessionId);
    }
    const validSessionIds = new Set(participantSessions.map((item) => item.sessionId));
    setSelectedBackendSessionIds((prev) => prev.filter((sessionId) => validSessionIds.has(sessionId)));
  }, [completedSessions, selectedStatsSessionId]);

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

    if (trialQuestionStep === 0) {
      setPhaseA((prev) => {
        const validRanking = prev.independentActionRanking.filter((choice) => questionOneActionChoices.includes(choice));
        const missingChoices = questionOneActionChoices.filter((choice) => !validRanking.includes(choice));
        const normalizedRanking = [...validRanking, ...missingChoices];
        const alreadyNormalized =
          normalizedRanking.length === prev.independentActionRanking.length &&
          normalizedRanking.every((choice, index) => choice === prev.independentActionRanking[index]);

        return alreadyNormalized ? prev : { ...prev, independentActionRanking: normalizedRanking };
      });
    }
    if (trialQuestionStep === 1 && phaseA.independentPlayerRanking.length === 0) {
      setPhaseA((prev) => ({ ...prev, independentPlayerRanking: currentSequence.playerLabels }));
    }
  }, [currentSequence, phase, phaseA.independentActionRanking.length, phaseA.independentPlayerRanking.length, questionOneActionChoices, trialQuestionStep]);

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

  const applySavedSessionForms = useCallback((savedSession) => {
    const savedBackground = savedSession.backgroundResponses || {};
    const savedPostStudy = savedSession.postStudyResponses || {};

    setParticipantId(savedSession.participantId || "");
    setConsent({ ...defaultConsent, ...(savedSession.consent || {}) });
    setBackground({ ...defaultBackground, ...savedBackground });
    setPostStudy({ ...defaultPostStudy, ...savedPostStudy });
    setInterviewNotes({ ...createEmptyInterviewNotes(), ...(savedSession.interviewNotes || {}) });
  }, []);

  const restoreParticipantSession = (savedSession) => {
    const trials = savedSession.trials || [];
    const firstIncompleteTrialIndex = trials.findIndex((trial) => !trial.phaseBEndTime);
    const savedBackground = savedSession.backgroundResponses || {};
    const hasBackground = Object.values(savedBackground).some(Boolean);

    applySavedSessionForms(savedSession);
    setSession(savedSession);
    lastSavedPayloadRef.current = JSON.stringify(savedSession);
    setCurrentStep(0);
    setIsPlaying(false);

    if (!hasBackground) {
      setPage("background");
      setNoticeText("Previous unfinished session loaded");
      return;
    }

    if (firstIncompleteTrialIndex >= 0) {
      const trial = trials[firstIncompleteTrialIndex];
      const resumedPhase = trial.phaseAEndTime ? "b" : "a";
      const resumedQuestionStep =
        resumedPhase === "a" && (trial.actionQuestionEndTime || trial.independentActionRanking?.length) ? 1 : 0;

      setPage("trial");
      setTrialIndex(firstIncompleteTrialIndex);
      setPhase(resumedPhase);
      setTrialQuestionStep(resumedQuestionStep);
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
      setNoticeText("Previous unfinished session loaded");
      return;
    }

    setTrialIndex(Math.max(trials.length - 1, 0));
    setPhase("b");
    setTrialQuestionStep(0);
    setPage("post");
    setNoticeText("Previous unfinished session loaded");
  };

  const recheckParticipantSession = useCallback(async (nextParticipantId = participantId.trim(), { resetMissing = false } = {}) => {
    const cleanParticipantId = nextParticipantId.trim();
    if (!cleanParticipantId || cleanParticipantId.toLowerCase() === "admin") {
      setResumeCandidateSession(null);
      setIsCheckingResume(false);
      return null;
    }

    setIsCheckingResume(true);
    try {
      const savedSession = await fetchLatestParticipantSession(cleanParticipantId);
      if (savedSession) {
        setResumeCandidateSession(savedSession);
        applySavedSessionForms(savedSession);
        setNoticeText(savedSession.endTime ? "Previous participant fields loaded" : "Previous unfinished session found");
        return savedSession;
      }

      setResumeCandidateSession(null);
      if (resetMissing) {
        setConsent(defaultConsent);
        setBackground(defaultBackground);
        setPostStudy(defaultPostStudy);
        setInterviewNotes(createEmptyInterviewNotes());
      }
      return null;
    } finally {
      setIsCheckingResume(false);
    }
  }, [applySavedSessionForms, participantId]);

  useEffect(() => {
    const nextParticipantId = participantId.trim();
    if (page !== "welcome" || session || !nextParticipantId || nextParticipantId.toLowerCase() === "admin") {
      setResumeCandidateSession(null);
      setIsCheckingResume(false);
      return undefined;
    }

    setResumeCandidateSession(null);
    setConsent(defaultConsent);
    setBackground(defaultBackground);
    setPostStudy(defaultPostStudy);
    setInterviewNotes(createEmptyInterviewNotes());

    const timeoutId = window.setTimeout(() => {
      void recheckParticipantSession(nextParticipantId, { resetMissing: false });
    }, 450);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [page, participantId, recheckParticipantSession, session]);

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

  const beginStudy = async () => {
    const nextParticipantId = participantId.trim();
    const nextConsent = {
      ...consent,
      required: consent.required || isAdmin,
    };

    setIsStartingStudy(true);
    try {
      let savedParticipantSession = null;
      if (!isAdmin) {
        const savedSession =
          resumeCandidateSession?.participantId?.trim().toLowerCase() === nextParticipantId.toLowerCase()
            ? resumeCandidateSession
            : await fetchLatestParticipantSession(nextParticipantId);
        if (savedSession && !savedSession.endTime) {
          restoreParticipantSession(savedSession);
          return;
        }
        if (savedSession) {
          savedParticipantSession = savedSession;
          applySavedSessionForms(savedSession);
        }
      }

      const newSession = createSession(
        nextParticipantId,
        savedParticipantSession?.consent ? { ...defaultConsent, ...savedParticipantSession.consent } : nextConsent,
      );
      setSession(newSession);
      if (newSession.participantId?.toLowerCase() !== "admin") {
        void saveStudySession(newSession);
        lastSavedPayloadRef.current = JSON.stringify(newSession);
      }
      setPage("background");
    } finally {
      setIsStartingStudy(false);
    }
  };

  const submitBackground = () => {
    persistSessionUpdate((prev) => ({ ...prev, backgroundResponses: background }));
    markPageStart("trial");
    setTimeout(() => startTrial(0), 0);
  };

  const phaseAComplete =
    phaseA.independentActionRanking.filter(Boolean).length === questionOneActionChoices.length &&
    new Set(phaseA.independentActionRanking).size === questionOneActionChoices.length &&
    phaseA.independentPlayerRanking.filter(Boolean).length === currentSequence?.playerLabels.length &&
    new Set(phaseA.independentPlayerRanking).size === currentSequence?.playerLabels.length;

  const submitActionQuestion = () => {
    const answeredAt = nowIso();
    persistSessionUpdate((prev) => ({
      ...prev,
      trials: prev.trials.map((trial, index) =>
        index === trialIndex
          ? {
              ...trial,
              independentActionRanking: phaseA.independentActionRanking,
              independentActionRationale: phaseA.independentActionRationale,
              actionQuestionEndTime: answeredAt,
            }
          : trial,
      ),
    }));
    setTrialQuestionStep(1);
    logInteraction("question_next", { fromQuestion: "action_ranking" });
  };

  const submitPhaseA = () => {
    const revealTime = nowIso();
    persistSessionUpdate((prev) => ({
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
    persistSessionUpdate((prev) => ({
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
    const participantSessions = getLatestParticipantSessions(completedSessions);
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

  const deleteSelectedStatsSession = async () => {
    if (!selectedStatsSessionId) return;
    const selectedSession = completedSessions.find((item) => item.sessionId === selectedStatsSessionId);
    const confirmed = window.confirm(
      `Delete backend data point for ${selectedSession?.participantId || "this participant"}?\n\nSession: ${selectedStatsSessionId}`,
    );
    if (!confirmed) return;

    setDatabaseStatus((prev) => ({ ...prev, message: "Deleting selected backend row...", error: "" }));
    try {
      const token = getAdminToken();
      await deleteStudySession(selectedStatsSessionId, token);
      const refreshedSessions = await loadCompletedSessions();
      setSelectedStatsSessionId(refreshedSessions.find((item) => item.participantId?.toLowerCase() !== "admin")?.sessionId || "");
      setSelectedBackendSessionIds([]);
      setDatabaseStatus({
        source: "backend",
        message: `Deleted selected backend row. Database now has ${refreshedSessions.length} row${refreshedSessions.length === 1 ? "" : "s"}.`,
        error: "",
      });
    } catch (error) {
      setDatabaseStatus({
        source: "error",
        message: "Backend delete failed. Check the admin token and backend service.",
        error: error.message || "Unknown error",
      });
    }
  };

  const deleteSelectedBackendSessions = async () => {
    const idsToDelete = selectedBackendSessionIds.filter(Boolean);
    if (!idsToDelete.length) return;

    const confirmed = window.confirm(`Delete ${idsToDelete.length} selected backend row${idsToDelete.length === 1 ? "" : "s"}?`);
    if (!confirmed) return;

    setDatabaseStatus((prev) => ({ ...prev, message: `Deleting ${idsToDelete.length} selected backend row${idsToDelete.length === 1 ? "" : "s"}...`, error: "" }));
    try {
      const token = getAdminToken();
      for (const sessionId of idsToDelete) {
        await deleteStudySession(sessionId, token);
      }

      const refreshedSessions = await loadCompletedSessions();
      setSelectedBackendSessionIds([]);
      setSelectedStatsSessionId(refreshedSessions.find((item) => item.participantId?.toLowerCase() !== "admin")?.sessionId || "");
      setDatabaseStatus({
        source: "backend",
        message: `Deleted ${idsToDelete.length} selected backend row${idsToDelete.length === 1 ? "" : "s"}. Database now has ${refreshedSessions.length} row${refreshedSessions.length === 1 ? "" : "s"}.`,
        error: "",
      });
    } catch (error) {
      setDatabaseStatus({
        source: "error",
        message: "Backend delete selected failed. Check the admin token and backend service.",
        error: error.message || "Unknown error",
      });
    }
  };

  const clearBackendDatabase = async () => {
    const confirmed = window.confirm("Delete every stored backend session row? This cannot be undone.");
    if (!confirmed) return;

    setDatabaseStatus((prev) => ({ ...prev, message: "Clearing backend database...", error: "" }));
    try {
      const token = getAdminToken();
      await clearStudySessions(token);
      const refreshedSessions = await loadCompletedSessions();
      setSelectedStatsSessionId(refreshedSessions.find((item) => item.participantId?.toLowerCase() !== "admin")?.sessionId || "");
      setSelectedBackendSessionIds([]);
      setDatabaseStatus({
        source: "backend",
        message: `Backend database cleared. Database now has ${refreshedSessions.length} row${refreshedSessions.length === 1 ? "" : "s"}.`,
        error: "",
      });
    } catch (error) {
      setDatabaseStatus({
        source: "error",
        message: "Backend clear failed. Check the admin token and backend service.",
        error: error.message || "Unknown error",
      });
    }
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

  const formatStatValue = (value) => {
    if (Array.isArray(value)) return value.length ? value.join(" | ") : "--";
    if (value == null || value === "") return "--";
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
  };

  const formatTimestamp = (value) => {
    if (!value) return "--";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
  };

  const averageTrialValue = (trials, field) => {
    const values = trials.map((trial) => Number(trial[field])).filter(Number.isFinite);
    if (!values.length) return "--";
    return (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2);
  };

  const renderKeyValueRows = (rows) => (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "180px minmax(0, 1fr)" }, gap: 0.75 }}>
      {rows.map(([label, value]) => (
        <React.Fragment key={label}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
            {label}
          </Typography>
          <Typography variant="body2" sx={{ overflowWrap: "anywhere" }}>
            {formatStatValue(value)}
          </Typography>
        </React.Fragment>
      ))}
    </Box>
  );

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
          onBlur={() => {
            if (participantId.trim()) void recheckParticipantSession(participantId.trim(), { resetMissing: false });
          }}
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
        <GuidedActionButton
          onClick={beginStudy}
          disabled={isStartingStudy || isCheckingResume || (!isAdmin && (!participantId.trim() || !consent.required))}
        >
          {isStartingStudy || isCheckingResume ? "Loading..." : resumeCandidateSession && !resumeCandidateSession.endTime ? "Resume" : "Start"}
        </GuidedActionButton>
        <Button
          variant="outlined"
          onClick={() => void recheckParticipantSession(participantId.trim(), { resetMissing: false })}
          disabled={!participantId.trim() || isCheckingResume}
        >
          Recheck Saved Fields
        </Button>
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
        <Box sx={{ gridColumn: { md: "1 / -1" } }}>
          <Button
            variant="outlined"
            onClick={() => void recheckParticipantSession(session?.participantId || participantId.trim(), { resetMissing: false })}
            disabled={isCheckingResume || !(session?.participantId || participantId.trim())}
          >
            Recheck Saved Fields
          </Button>
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
      phaseA.independentActionRanking.filter(Boolean).length === questionOneActionChoices.length &&
      new Set(phaseA.independentActionRanking).size === questionOneActionChoices.length;
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
                  choices={questionOneActionChoices}
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
                    onClick={submitActionQuestion}
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
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.45 }}>
              Expected Possession Value (EPV) estimates the expected number of points the offensive team will score from the current state of a possession.
            </Typography>
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
              <Button
                variant="outlined"
                size="small"
                onClick={() => void recheckParticipantSession(session?.participantId || participantId.trim(), { resetMissing: false })}
                disabled={isCheckingResume || !(session?.participantId || participantId.trim())}
              >
                Recheck Saved Fields
              </Button>
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
    const participantSessions = completedSessions.filter((item) => item.participantId?.toLowerCase() !== "admin");
    const selectedStatsSession =
      participantSessions.find((item) => item.sessionId === selectedStatsSessionId) || participantSessions[0] || null;
    const selectedTrials = (selectedStatsSession?.trials || []).filter((trial) => !trial.isPractice);
    const sessionRowIds = participantSessions.map((item) => item.sessionId).filter(Boolean);
    const selectedBackendSessionIdSet = new Set(selectedBackendSessionIds);
    const allRowsSelected = sessionRowIds.length > 0 && sessionRowIds.every((sessionId) => selectedBackendSessionIdSet.has(sessionId));
    const someRowsSelected = selectedBackendSessionIds.length > 0 && !allRowsSelected;
    const toggleAllBackendRows = (checked) => {
      setSelectedBackendSessionIds(checked ? sessionRowIds : []);
    };
    const toggleBackendRow = (sessionId, checked) => {
      setSelectedBackendSessionIds((prev) => {
        if (checked) return prev.includes(sessionId) ? prev : [...prev, sessionId];
        return prev.filter((item) => item !== sessionId);
      });
    };
    const sessionRows = participantSessions.map((item) => {
      const trials = (item.trials || []).filter((trial) => !trial.isPractice);
      return {
        sessionId: item.sessionId,
        participantId: item.participantId,
        completed: item.endTime ? "Yes" : "No",
        startedAt: formatTimestamp(item.startTime),
        completedAt: formatTimestamp(item.endTime),
        trialCount: trials.length,
        avgEpvMatch: averageTrialValue(trials, "epvAlignment"),
        explanationUsefulness: item.postStudyResponses?.explanationUsefulness || "--",
        coachingUsefulness: item.postStudyResponses?.overallUsefulness || "--",
        topAction: trials[0]?.independentActionRanking?.[0] || "--",
        topPlayer: trials[0]?.independentPlayerRanking?.[0] || "--",
      };
    });
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
        description="Admin view of non-admin sessions. Use Refresh to load the backend database."
        action={
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" onClick={setAdminTokenManually}>
              Set Token
            </Button>
            <Button variant="outlined" onClick={loadCompletedSessions}>
              Refresh
            </Button>
            <Button variant="contained" startIcon={<DownloadRoundedIcon />} onClick={exportDatabase}>
              Export Database
            </Button>
            <Button variant="outlined" color="error" onClick={clearBackendDatabase}>
              Clear Backend
            </Button>
          </Stack>
        }
      >
        <Alert
          severity={databaseStatus.source === "backend" ? "success" : databaseStatus.source === "error" ? "error" : "warning"}
          sx={{ mb: 1.25 }}
        >
          {databaseStatus.message}
          {databaseStatus.error ? ` (${databaseStatus.error})` : ""}
        </Alert>
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

        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle1" fontWeight={700} gutterBottom>
            Stored Participant Sessions
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Showing raw backend rows. Select a row to inspect or delete that stored data point.
          </Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ xs: "stretch", sm: "center" }} sx={{ mb: 1 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={allRowsSelected}
                  indeterminate={someRowsSelected}
                  onChange={(event) => toggleAllBackendRows(event.target.checked)}
                />
              }
              label="Select all rows"
            />
            <Button
              variant="outlined"
              color="error"
              onClick={deleteSelectedBackendSessions}
              disabled={!selectedBackendSessionIds.length}
            >
              Delete Selected ({selectedBackendSessionIds.length})
            </Button>
          </Stack>
          <Paper elevation={0} sx={{ border: "1px solid", borderColor: "divider", overflow: "auto" }}>
            <Box
              sx={{
                minWidth: 1128,
                display: "grid",
                gridTemplateColumns: "48px 120px 88px 165px 165px 80px 110px 130px 130px 115px 115px",
                bgcolor: "grey.100",
                borderBottom: "1px solid",
                borderColor: "divider",
              }}
            >
              <Box sx={{ p: 0.5 }}>
                <Checkbox
                  size="small"
                  checked={allRowsSelected}
                  indeterminate={someRowsSelected}
                  onChange={(event) => toggleAllBackendRows(event.target.checked)}
                  inputProps={{ "aria-label": "select all backend rows" }}
                />
              </Box>
              {["Participant", "Done", "Started", "Completed", "Trials", "Avg EPV", "Explanation", "Coaching", "Top action", "Top player"].map((header) => (
                <Typography key={header} variant="caption" sx={{ p: 1, fontWeight: 800 }}>
                  {header}
                </Typography>
              ))}
            </Box>
            {sessionRows.length ? (
              sessionRows.map((row) => {
                const selected = row.sessionId === selectedStatsSession?.sessionId;
                const rowChecked = selectedBackendSessionIdSet.has(row.sessionId);
                return (
                  <Box
                    key={row.sessionId}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedStatsSessionId(row.sessionId)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelectedStatsSessionId(row.sessionId);
                      }
                    }}
                    sx={{
                      minWidth: 1128,
                      width: "100%",
                      display: "grid",
                      gridTemplateColumns: "48px 120px 88px 165px 165px 80px 110px 130px 130px 115px 115px",
                      border: 0,
                      borderBottom: "1px solid",
                      borderColor: "divider",
                      bgcolor: selected ? alpha("#0f4c81", 0.08) : "background.paper",
                      color: "text.primary",
                      textAlign: "left",
                      cursor: "pointer",
                      "&:hover": { bgcolor: alpha("#0f4c81", 0.05) },
                    }}
                  >
                    <Box
                      sx={{ p: 0.5 }}
                      onClick={(event) => event.stopPropagation()}
                    >
                      <Checkbox
                        size="small"
                        checked={rowChecked}
                        onChange={(event) => toggleBackendRow(row.sessionId, event.target.checked)}
                        inputProps={{ "aria-label": `select backend row ${row.sessionId}` }}
                      />
                    </Box>
                    {[
                      row.participantId,
                      row.completed,
                      row.startedAt,
                      row.completedAt,
                      row.trialCount,
                      row.avgEpvMatch,
                      row.explanationUsefulness,
                      row.coachingUsefulness,
                      row.topAction,
                      row.topPlayer,
                    ].map((value, index) => (
                      <Typography key={`${row.sessionId}-${index}`} variant="body2" sx={{ p: 1, overflowWrap: "anywhere" }}>
                        {formatStatValue(value)}
                      </Typography>
                    ))}
                  </Box>
                );
              })
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ p: 1.5 }}>
                No stored participant sessions loaded.
              </Typography>
            )}
          </Paper>
        </Box>

        {selectedStatsSession && (
          <Paper elevation={0} sx={{ mt: 1.5, p: 1.5, border: "1px solid", borderColor: "divider" }}>
            <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" gap={1} mb={1.25}>
              <Box>
                <Typography variant="subtitle1" fontWeight={700}>
                  Individual Response: {selectedStatsSession.participantId}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {selectedStatsSession.sessionId}
                </Typography>
              </Box>
              <Stack direction="row" spacing={1}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() =>
                    downloadText(
                      `hoopeval_${selectedStatsSession.participantId || "participant"}_${selectedStatsSession.sessionId}.json`,
                      JSON.stringify(selectedStatsSession, null, 2),
                      "application/json",
                    )
                  }
                >
                  Export Individual JSON
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  size="small"
                  onClick={deleteSelectedStatsSession}
                >
                  Delete Backend Row
                </Button>
              </Stack>
            </Stack>

            <Box sx={{ mb: 1.25 }}>
              <Typography variant="subtitle2" gutterBottom>Trial Responses</Typography>
              <Paper elevation={0} sx={{ border: "1px solid", borderColor: "divider", overflow: "auto" }}>
                <Box
                  sx={{
                    minWidth: 980,
                    display: "grid",
                    gridTemplateColumns: "56px 170px 200px 160px 100px 120px 170px",
                    bgcolor: "grey.100",
                    borderBottom: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  {["#", "Sequence", "Action ranking", "Player ranking", "EPV match", "Model help", "Phase B end"].map((header) => (
                    <Typography key={header} variant="caption" sx={{ p: 1, fontWeight: 800 }}>
                      {header}
                    </Typography>
                  ))}
                </Box>
                {selectedTrials.length ? (
                  selectedTrials.map((trial, index) => (
                    <Box
                      key={`${selectedStatsSession.sessionId}-${trial.sequenceId}-${index}`}
                      sx={{
                        minWidth: 980,
                        display: "grid",
                        gridTemplateColumns: "56px 170px 200px 160px 100px 120px 170px",
                        borderBottom: "1px solid",
                        borderColor: "divider",
                      }}
                    >
                      {[
                        index + 1,
                        trial.sequenceId,
                        trial.independentActionRanking,
                        trial.independentPlayerRanking,
                        trial.epvAlignment,
                        trial.explanationUsefulness,
                        formatTimestamp(trial.phaseBEndTime),
                      ].map((value, valueIndex) => (
                        <Typography key={valueIndex} variant="body2" sx={{ p: 1, overflowWrap: "anywhere" }}>
                          {formatStatValue(value)}
                        </Typography>
                      ))}
                    </Box>
                  ))
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ p: 1.5 }}>
                    No main trial responses stored for this participant.
                  </Typography>
                )}
              </Paper>
            </Box>

            <Box sx={{ display: "grid", gap: 1.25, gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" } }}>
              <Paper elevation={0} sx={{ p: 1.25, border: "1px solid", borderColor: "divider" }}>
                <Typography variant="subtitle2" gutterBottom>Session</Typography>
                {renderKeyValueRows([
                  ["participantId", selectedStatsSession.participantId],
                  ["sessionId", selectedStatsSession.sessionId],
                  ["startTime", formatTimestamp(selectedStatsSession.startTime)],
                  ["endTime", formatTimestamp(selectedStatsSession.endTime)],
                  ["savedAt", formatTimestamp(selectedStatsSession.savedAt)],
                  ["trialOrder", selectedStatsSession.trialOrder || []],
                ])}
              </Paper>
              <Paper elevation={0} sx={{ p: 1.25, border: "1px solid", borderColor: "divider" }}>
                <Typography variant="subtitle2" gutterBottom>Background</Typography>
                {renderKeyValueRows(Object.entries(selectedStatsSession.backgroundResponses || {}))}
              </Paper>
              <Paper elevation={0} sx={{ p: 1.25, border: "1px solid", borderColor: "divider" }}>
                <Typography variant="subtitle2" gutterBottom>Post-Study</Typography>
                {renderKeyValueRows(Object.entries(selectedStatsSession.postStudyResponses || {}))}
              </Paper>
              <Paper elevation={0} sx={{ p: 1.25, border: "1px solid", borderColor: "divider" }}>
                <Typography variant="subtitle2" gutterBottom>Recorded Activity</Typography>
                {renderKeyValueRows([
                  ["interactionLog count", selectedStatsSession.interactionLog?.length || 0],
                  ["notableMoments count", selectedStatsSession.notableMoments?.length || 0],
                  ["pageTimestamps count", selectedStatsSession.pageTimestamps?.length || 0],
                  ["browser", selectedStatsSession.browserMetadata?.userAgent],
                  ["viewport", selectedStatsSession.browserMetadata ? `${selectedStatsSession.browserMetadata.viewportWidth} x ${selectedStatsSession.browserMetadata.viewportHeight}` : ""],
                ])}
              </Paper>
            </Box>
          </Paper>
        )}
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
                <Chip size="small" color="primary" label={displayedParticipantId} />
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
