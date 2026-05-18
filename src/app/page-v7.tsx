"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Flame, Trophy, Target, Zap, TrendingUp, Download, Upload, Plus, Check, X,
  Calendar, Dumbbell, Droplet, Moon, Sun, Eye, Scissors, Activity, ChevronLeft,
  ChevronRight, Clock, type LucideIcon
} from "lucide-react";

// ============================================================
// ARYA — Personal Optimization Agent · v7
// + Finalized skincare stack: Naturium + Ordinary + LRP + BoJ SPF + Differin
// ============================================================

const STORAGE_KEY = "arya:v7:state";
const SCHEMA_VERSION = 7;

type Section = "core" | "posture" | "skin" | "hair" | "sleep" | "grooming";
type Habit = { id: string; label: string; detail?: string; icon: string; xp: number; section: Section };
type WeeklyGoal = { id: string; label: string; target: number; icon: string; xp: number };
type Quest = { id: string; label: string; xp: number; done: boolean; priority: 1 | 2 | 3; notes: string };
type CheckIn = { date: string; weight: number; notes: string; wins: string[]; gaps: string[] };
type ExerciseSet = { weight: number; reps: number };
type WorkoutLog = {
  date: string;
  workoutId: string;
  exercises: Record<string, ExerciseSet[]>;
  notes?: string;
  duration?: number;
};
type Exercise = { id: string; name: string; targetSets: number; targetRepsLow: number; targetRepsHigh: number; cue?: string };
type Workout = { id: string; name: string; tag: string; exercises: Exercise[] };

type State = {
  schemaVersion: number;
  user: { name: string; weight: number; goalWeight: number; startDate: string };
  streak: { current: number; longest: number; lastCheckIn: string | null };
  xp: { total: number; level: number };
  dailyHabits: Habit[];
  weeklyGoals: WeeklyGoal[];
  oneTimeQuests: Quest[];
  todayLog: Record<string, Record<string, boolean>>;
  weekLog: Record<string, Record<string, number>>;
  checkIns: CheckIn[];
  workouts: WorkoutLog[];
  syncs: { date: string; note: string }[];
};

const WORKOUTS: Workout[] = [
  {
    id: "pull-a", name: "Pull A · Width", tag: "pull",
    exercises: [
      { id: "lat-pulldown", name: "Lat pulldown", targetSets: 4, targetRepsLow: 8, targetRepsHigh: 10 },
      { id: "chest-row", name: "Chest-supported row", targetSets: 4, targetRepsLow: 10, targetRepsHigh: 10 },
      { id: "face-pulls", name: "Face pulls", targetSets: 4, targetRepsLow: 15, targetRepsHigh: 15, cue: "External rotate at top" },
      { id: "rear-delt-fly", name: "Rear delt fly", targetSets: 3, targetRepsLow: 12, targetRepsHigh: 15 },
      { id: "hammer-curl", name: "Hammer curl", targetSets: 3, targetRepsLow: 10, targetRepsHigh: 10 },
      { id: "shrugs", name: "Dumbbell shrugs", targetSets: 3, targetRepsLow: 12, targetRepsHigh: 12 },
    ],
  },
  {
    id: "push", name: "Push · Thickness", tag: "push",
    exercises: [
      { id: "incline-db-press", name: "Incline DB press", targetSets: 5, targetRepsLow: 8, targetRepsHigh: 8, cue: "Progressive load — this is the priority lift" },
      { id: "flat-db-press", name: "Flat DB press", targetSets: 4, targetRepsLow: 10, targetRepsHigh: 10 },
      { id: "lateral-raise", name: "Lateral raises", targetSets: 5, targetRepsLow: 12, targetRepsHigh: 15, cue: "Last set: widow-maker to failure" },
      { id: "cable-fly", name: "Cable fly", targetSets: 4, targetRepsLow: 12, targetRepsHigh: 12 },
      { id: "overhead-tricep", name: "Overhead tricep ext", targetSets: 3, targetRepsLow: 10, targetRepsHigh: 10 },
      { id: "rear-delt-fly-push", name: "Rear delt fly", targetSets: 3, targetRepsLow: 15, targetRepsHigh: 15 },
    ],
  },
  {
    id: "legs", name: "Legs", tag: "legs",
    exercises: [
      { id: "squat", name: "Squat or leg press", targetSets: 4, targetRepsLow: 8, targetRepsHigh: 8 },
      { id: "rdl", name: "Romanian deadlift", targetSets: 4, targetRepsLow: 8, targetRepsHigh: 10 },
      { id: "lunge", name: "Walking lunge", targetSets: 3, targetRepsLow: 10, targetRepsHigh: 10 },
      { id: "leg-curl", name: "Leg curl", targetSets: 3, targetRepsLow: 12, targetRepsHigh: 12 },
      { id: "calf-raise", name: "Standing calf raise", targetSets: 4, targetRepsLow: 12, targetRepsHigh: 12 },
    ],
  },
  {
    id: "pull-b", name: "Pull B · Density", tag: "pull",
    exercises: [
      { id: "weighted-chin", name: "Weighted chin-ups", targetSets: 4, targetRepsLow: 6, targetRepsHigh: 8 },
      { id: "barbell-row", name: "Barbell row", targetSets: 4, targetRepsLow: 8, targetRepsHigh: 8 },
      { id: "rack-pull", name: "Rack pulls", targetSets: 3, targetRepsLow: 5, targetRepsHigh: 5 },
      { id: "ytw", name: "Y-T-W (plates)", targetSets: 3, targetRepsLow: 8, targetRepsHigh: 8 },
      { id: "farmer-carry", name: "Farmer carry", targetSets: 3, targetRepsLow: 40, targetRepsHigh: 40, cue: "Distance in meters — log meters as reps" },
      { id: "preacher-curl", name: "Preacher curl", targetSets: 3, targetRepsLow: 10, targetRepsHigh: 10 },
    ],
  },
  {
    id: "posture-circuit", name: "Posture Circuit", tag: "posture",
    exercises: [
      { id: "9090-breathing", name: "90/90 breathing", targetSets: 3, targetRepsLow: 5, targetRepsHigh: 5, cue: "5 breaths per set, exhale ribs down" },
      { id: "thoracic-ext", name: "Thoracic extension (foam)", targetSets: 1, targetRepsLow: 120, targetRepsHigh: 120, cue: "2 min — log as seconds" },
      { id: "doorway-stretch", name: "Doorway chest stretch", targetSets: 2, targetRepsLow: 30, targetRepsHigh: 30, cue: "30 sec each" },
      { id: "chin-tuck-hold", name: "Chin tucks (5s hold)", targetSets: 3, targetRepsLow: 12, targetRepsHigh: 12 },
      { id: "wall-angels", name: "Wall angels", targetSets: 3, targetRepsLow: 10, targetRepsHigh: 10 },
      { id: "prone-ytw", name: "Prone Y-T-W", targetSets: 3, targetRepsLow: 10, targetRepsHigh: 10, cue: "10 per position" },
      { id: "face-pull-posture", name: "Face pulls", targetSets: 4, targetRepsLow: 15, targetRepsHigh: 15 },
      { id: "band-pull-apart", name: "Band pull-aparts", targetSets: 4, targetRepsLow: 12, targetRepsHigh: 12 },
      { id: "glute-bridge", name: "Glute bridges", targetSets: 3, targetRepsLow: 15, targetRepsHigh: 15 },
      { id: "dead-bug", name: "Dead bug", targetSets: 3, targetRepsLow: 8, targetRepsHigh: 8, cue: "8 per side" },
      { id: "hollow-hold", name: "Hollow body hold", targetSets: 3, targetRepsLow: 25, targetRepsHigh: 25, cue: "Seconds" },
      { id: "hip-flexor-stretch", name: "Hip flexor stretch", targetSets: 2, targetRepsLow: 45, targetRepsHigh: 45, cue: "45 sec each side" },
    ],
  },
];

const DEFAULT_STATE: State = {
  schemaVersion: SCHEMA_VERSION,
  user: { name: "Arman", weight: 145, goalWeight: 160, startDate: "2026-03-21" },
  streak: { current: 0, longest: 0, lastCheckIn: null },
  xp: { total: 0, level: 1 },
  dailyHabits: [
    { id: "breakfast", label: "Breakfast", detail: "Protein-forward. Eggs + oats or rice. 500+ cal.", icon: "sun", xp: 15, section: "core" },
    { id: "meal3", label: "3rd meal or shake", detail: "Lunch + dinner alone = maintenance. The 3rd meal is growth.", icon: "flame", xp: 20, section: "core" },
    { id: "protein160", label: "Protein ≥ 160g", detail: "1g per goal bodyweight. Shake + chicken + eggs gets you there.", icon: "target", xp: 15, section: "core" },
    { id: "surplus", label: "Caloric surplus (2700+)", detail: "TDEE ~2400. Need +300-400 to grow.", icon: "flame", xp: 20, section: "core" },
    { id: "water", label: "Water 100+ oz", detail: "Push from 72 to 100. One bottle immediately on waking.", icon: "droplet", xp: 10, section: "core" },
    { id: "creatine", label: "Creatine 5g", detail: "Monohydrate. Timing flexible.", icon: "zap", xp: 5, section: "core" },
    { id: "supps-am", label: "AM supplements", detail: "Zinc · Omega-3 · D3/K2 · Magnesium L-Thr (PM)", icon: "zap", xp: 5, section: "core" },
    { id: "chin-tucks-am", label: "Chin tucks · AM", detail: "3 × 12 with 5-sec hold. In the mirror.", icon: "activity", xp: 5, section: "posture" },
    { id: "chin-tucks-pm", label: "Chin tucks · PM", detail: "3 × 12. Before bed, conscious rep.", icon: "activity", xp: 5, section: "posture" },
    { id: "tongue-posture", label: "Tongue on palate · all day", detail: "Entire tongue flat against roof. 24/7 resting posture.", icon: "activity", xp: 5, section: "posture" },
    { id: "hip-flexor", label: "Hip flexor stretch", detail: "45 sec each side. Couch stretch or kneeling.", icon: "activity", xp: 5, section: "posture" },
    { id: "9090", label: "90/90 breathing · 5 breaths", detail: "Exhale ribs down. Fixes rib flare root cause.", icon: "activity", xp: 5, section: "posture" },
    { id: "brow-check", label: "Brow spoolie + tidy", detail: "Brush upward. Pluck strays between and below arch only.", icon: "scissors", xp: 3, section: "grooming" },
    { id: "skin-am", label: "AM skincare · full ritual", detail: "LRP cleanse → Ordinary Vit C → Alpha Arbutin → LRP moisturizer → BoJ SPF. See Skincare tab.", icon: "sun", xp: 15, section: "skin" },
    { id: "spf-reapply", label: "SPF reapply (noon)", detail: "Critical: you drive 30+ min daily. UVA passes through side windows. Left cheek especially.", icon: "sun", xp: 10, section: "skin" },
    { id: "skin-pm", label: "PM skincare · full ritual", detail: "LRP cleanse → Naturium Tranexamic 5% → LRP moisturizer. See Skincare tab.", icon: "moon", xp: 15, section: "skin" },
    { id: "adapalene", label: "Adapalene (M/W/F nights)", detail: "Differin 0.1%, pea-sized total face, 5 min after moisturizer. Avoid mouth corners, nose folds, eye area.", icon: "moon", xp: 10, section: "skin" },
    { id: "minox-am", label: "Minoxidil · AM", detail: "1ml to corners. Dry fully before styling.", icon: "scissors", xp: 5, section: "hair" },
    { id: "minox-pm", label: "Minoxidil · PM", detail: "1ml to corners before bed. Don't skip.", icon: "scissors", xp: 5, section: "hair" },
    { id: "scalp-massage", label: "Scalp massage · 5 min", detail: "Fingertips, not nails. Shower or before bed.", icon: "scissors", xp: 5, section: "hair" },
    { id: "hair-style", label: "Intentional styling", detail: "Towel to 70% → salt spray → scrunch → air dry → clay.", icon: "scissors", xp: 5, section: "hair" },
    { id: "mouth-tape", label: "Mouth tape", detail: "3M Micropore. Apply before lying down.", icon: "moon", xp: 10, section: "sleep" },
    { id: "nose-expander", label: "Nose expander", detail: "In before bed.", icon: "moon", xp: 5, section: "sleep" },
    { id: "wake-time", label: "Fixed wake time (±30m)", detail: "Same wake ±30 min including weekends.", icon: "sun", xp: 10, section: "sleep" },
    { id: "morning-sun", label: "10 min morning sunlight", detail: "Within 30 min of waking. No sunglasses. Before phone.", icon: "sun", xp: 10, section: "sleep" },
    { id: "screens-off", label: "Screens off 60 min pre-bed", detail: "Or blue-blockers. Start 90 min wind-down.", icon: "moon", xp: 10, section: "sleep" },
  ],
  weeklyGoals: [
    { id: "posture3x", label: "Posture circuit 3x", target: 3, icon: "activity", xp: 50 },
    { id: "gym4x", label: "Gym sessions 4x", target: 4, icon: "dumbbell", xp: 50 },
    { id: "pull2x", label: "Pull day 2x", target: 2, icon: "dumbbell", xp: 30 },
    { id: "weighIn", label: "Weekly weigh-in", target: 1, icon: "trending", xp: 20 },
    { id: "photo", label: "Progress photo", target: 1, icon: "eye", xp: 20 },
    { id: "gainHalfLb", label: "Weight up 0.5+ lb", target: 1, icon: "trending", xp: 40 },
  ],
  oneTimeQuests: [
    { id: "brows-pro", label: "Professional eyebrow threading", xp: 80, done: false, priority: 1, notes: "DIY is 70% there. Pro sets the arch. 20 min, $15-20." },
    { id: "skincare-haul", label: "Buy tan-reversal stack (~$82)", xp: 60, done: false, priority: 1, notes: "4 products to buy: Naturium Tranexamic 5%, Ordinary Ascorbyl Glucoside 12%, Ordinary Alpha Arbutin 2%, LRP Toleriane Double Repair (w/ cleanser bundle). SPF + Differin already owned." },
    { id: "ortho", label: "Orthodontist · MSE palate expansion consult", xp: 150, done: false, priority: 1, notes: "Ask: 'Is my palatal suture still amenable to MSE at 21?'" },
    { id: "hims", label: "Start Hims (Fin + Min + Biotin)", xp: 80, done: false, priority: 2, notes: "Transition from topical Min. Hairline stable — solidify with DHT blocker." },
    { id: "saltspray", label: "Buy salt spray · execute styling", xp: 30, done: false, priority: 2, notes: "Salt spray + scrunch = Morra finish." },
    { id: "mastic-gum", label: "Mastic gum · 15 min daily", xp: 40, done: false, priority: 2, notes: "Falim brand. Real jaw load." },
    { id: "whoop", label: "Decide on WHOOP", xp: 30, done: false, priority: 3, notes: "Optimization, not core." },
  ],
  todayLog: {},
  weekLog: {},
  checkIns: [
    { date: "2026-03-21", weight: 145, notes: "Baseline. Post-Ramadan. FHP, rounded shoulders, APT, rib flare. Narrow palate.", wins: ["Protocol initialized", "3yr training foundation"], gaps: ["Maintenance eating", "No SPF", "Brows unshaped"] },
    { date: "2026-04-19", weight: 145, notes: "30-day. Back development standout. SPF + tape + expander locked. Skin calmer. Hair wave natural. Weight unchanged = calories bottleneck.", wins: ["Back development", "SPF locked", "Breathing locked", "Skin improving", "Posture better"], gaps: ["Weight stuck", "Chest/shoulder lag", "No pro brow", "Wake time not fixed"] },
  ],
  workouts: [],
  syncs: [],
};

const ICONS: Record<string, LucideIcon> = {
  droplet: Droplet, target: Target, flame: Flame, sun: Sun, activity: Activity,
  moon: Moon, eye: Eye, scissors: Scissors, dumbbell: Dumbbell, trending: TrendingUp,
  zap: Zap, trophy: Trophy, clock: Clock,
};

const todayKey = () => new Date().toISOString().split("T")[0];
const weekKey = () => {
  const d = new Date();
  const year = d.getFullYear();
  const start = new Date(year, 0, 1);
  const week = Math.ceil((((+d - +start) / 86400000) + start.getDay() + 1) / 7);
  return `${year}-W${week}`;
};
const xpForLevel = (level: number) => 100 * level * level;
const levelFromXp = (xp: number) => { let lvl = 1; while (xp >= xpForLevel(lvl)) lvl++; return lvl; };

const SECTION_LABELS: Record<Section, string> = {
  core: "Core · Fuel & Mass",
  posture: "Posture",
  skin: "Skin",
  hair: "Hair",
  sleep: "Sleep",
  grooming: "Grooming",
};

const mergeWithDefaults = (loaded: Partial<State>): State => ({
  ...DEFAULT_STATE,
  ...loaded,
  schemaVersion: SCHEMA_VERSION,
  dailyHabits: DEFAULT_STATE.dailyHabits,
  weeklyGoals: DEFAULT_STATE.weeklyGoals,
  oneTimeQuests: DEFAULT_STATE.oneTimeQuests.map(dq => {
    const match = loaded.oneTimeQuests?.find(q => q.id === dq.id);
    return match ? { ...dq, done: match.done } : dq;
  }),
});

export default function AryaApp() {
  const [state, setState] = useState<State>(DEFAULT_STATE);
  const [activeTab, setActiveTab] = useState("today");
  const [loaded, setLoaded] = useState(false);
  const [toast, setToast] = useState<{ msg: string; kind?: string } | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");
  const [activeWorkout, setActiveWorkout] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setState(mergeWithDefaults(JSON.parse(raw)));
    } catch {}
    setLoaded(true);
  }, []);

  const saveState = useCallback((next: State) => {
    setState(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
  }, []);

  const showToast = (msg: string, kind = "success") => {
    setToast({ msg, kind });
    setTimeout(() => setToast(null), 2000);
  };

  const toggleHabit = (habitId: string) => {
    const tk = todayKey();
    const todayLog = { ...state.todayLog };
    if (!todayLog[tk]) todayLog[tk] = {};
    const wasDone = todayLog[tk][habitId];
    todayLog[tk][habitId] = !wasDone;

    const habit = state.dailyHabits.find(h => h.id === habitId)!;
    const xpDelta = wasDone ? -habit.xp : habit.xp;
    const newTotal = Math.max(0, state.xp.total + xpDelta);

    const streak = { ...state.streak };
    if (!wasDone && streak.lastCheckIn !== tk) {
      const y = new Date(); y.setDate(y.getDate() - 1);
      const ykey = y.toISOString().split("T")[0];
      streak.current = streak.lastCheckIn === ykey ? streak.current + 1 : 1;
      streak.lastCheckIn = tk;
      streak.longest = Math.max(streak.longest, streak.current);
    }

    if (!wasDone) showToast(`+${habit.xp} XP`);
    saveState({ ...state, todayLog, xp: { total: newTotal, level: levelFromXp(newTotal) }, streak });
  };

  const toggleWeekly = (goalId: string) => {
    const wk = weekKey();
    const weekLog = { ...state.weekLog };
    if (!weekLog[wk]) weekLog[wk] = {};
    weekLog[wk][goalId] = (weekLog[wk][goalId] || 0) + 1;
    const goal = state.weeklyGoals.find(g => g.id === goalId)!;
    const justComplete = weekLog[wk][goalId] === goal.target;
    const xpDelta = justComplete ? goal.xp : 5;
    saveState({ ...state, weekLog, xp: { total: state.xp.total + xpDelta, level: levelFromXp(state.xp.total + xpDelta) } });
    showToast(justComplete ? `GOAL · +${goal.xp} XP` : `+5 XP`);
  };

  const decrementWeekly = (goalId: string) => {
    const wk = weekKey();
    const weekLog = { ...state.weekLog };
    if (!weekLog[wk]) return;
    weekLog[wk][goalId] = Math.max(0, (weekLog[wk][goalId] || 0) - 1);
    saveState({ ...state, weekLog });
  };

  const completeQuest = (questId: string) => {
    const quest = state.oneTimeQuests.find(q => q.id === questId);
    if (!quest || quest.done) return;
    const quests = state.oneTimeQuests.map(q => q.id === questId ? { ...q, done: true } : q);
    saveState({ ...state, oneTimeQuests: quests, xp: { total: state.xp.total + quest.xp, level: levelFromXp(state.xp.total + quest.xp) } });
    showToast(`QUEST · +${quest.xp} XP`);
  };

  const addCheckIn = (weight: string, notes: string) => {
    const newCheckIn: CheckIn = { date: todayKey(), weight: parseFloat(weight) || state.user.weight, notes, wins: [], gaps: [] };
    saveState({
      ...state,
      user: { ...state.user, weight: parseFloat(weight) || state.user.weight },
      checkIns: [...state.checkIns, newCheckIn],
      xp: { total: state.xp.total + 100, level: levelFromXp(state.xp.total + 100) },
    });
    showToast("+100 XP · Logged");
  };

  const logWorkout = (log: WorkoutLog) => {
    const existing = state.workouts.findIndex(w => w.date === log.date && w.workoutId === log.workoutId);
    const workouts = [...state.workouts];
    if (existing >= 0) workouts[existing] = log;
    else workouts.push(log);
    const totalSets = Object.values(log.exercises).reduce((acc, s) => acc + s.filter(x => x.reps > 0).length, 0);
    const xpGain = totalSets * 3;
    saveState({ ...state, workouts, xp: { total: state.xp.total + xpGain, level: levelFromXp(state.xp.total + xpGain) } });
    showToast(`+${xpGain} XP · ${totalSets} sets`);
  };

  const exportForSync = () => {
    const payload = { ...state, syncs: [...(state.syncs || []), { date: new Date().toISOString(), note: "Exported for Claude sync" }] };
    saveState(payload);
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `arya_sync_${todayKey()}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("Sync file downloaded");
  };

  const importJSON = () => {
    try {
      saveState(mergeWithDefaults(JSON.parse(importText)));
      setShowImport(false); setImportText("");
      showToast("State imported");
    } catch { showToast("Invalid JSON", "error"); }
  };

  if (!loaded) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center" style={{ fontFamily: "Georgia, serif" }}>
        <div className="text-xs tracking-[0.3em] text-white/40 uppercase">Initializing</div>
      </div>
    );
  }

  const tk = todayKey();
  const wk = weekKey();
  const todayCompleted = state.dailyHabits.filter(h => state.todayLog?.[tk]?.[h.id]).length;
  const todayTotal = state.dailyHabits.length;
  const pct = todayTotal > 0 ? todayCompleted / todayTotal : 0;
  const level = levelFromXp(state.xp.total);
  const xpInLevel = state.xp.total - xpForLevel(level - 1);
  const xpToNext = xpForLevel(level) - xpForLevel(level - 1);
  const pendingQuests = state.oneTimeQuests.filter(q => !q.done).sort((a, b) => a.priority - b.priority);
  const latestCheckIn = state.checkIns[state.checkIns.length - 1];

  return (
    <div className="min-h-screen bg-black text-white" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
      <style jsx global>{`
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes toast-in { from { transform: translate(-50%, 20px); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }
        @keyframes ring-pulse { 0%, 100% { filter: drop-shadow(0 0 0 rgba(255,255,255,0)); } 50% { filter: drop-shadow(0 0 12px rgba(255,255,255,0.4)); } }
        .grain { background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.12'/%3E%3C/svg%3E"); }
        .serif-display { font-family: 'Didot', 'Bodoni 72', 'Bodoni MT', Georgia, serif; font-weight: 400; letter-spacing: -0.02em; }
        .mono { font-family: 'SF Mono', 'Menlo', monospace; }
        .hover-lift { transition: transform 0.15s ease, border-color 0.2s ease, background-color 0.2s ease; }
        .hover-lift:active { transform: scale(0.98); }
        .slide-up { animation: slideUp 0.3s ease-out backwards; }
        .tick-anim { transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
        .ring-complete { animation: ring-pulse 2s ease-in-out infinite; }
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }
      `}</style>

      <div className="fixed inset-0 grain pointer-events-none opacity-40 z-50" />

      {toast && (
        <div className="fixed top-6 left-1/2 z-[60] px-5 py-3 rounded-sm border backdrop-blur-md text-xs tracking-wider uppercase"
          style={{ animation: "toast-in 0.3s ease", backgroundColor: toast.kind === "error" ? "rgba(80,0,0,0.9)" : "rgba(20,20,20,0.95)", borderColor: toast.kind === "error" ? "rgba(255,100,100,0.3)" : "rgba(255,255,255,0.15)", transform: "translateX(-50%)" }}>
          {toast.msg}
        </div>
      )}

      <div className="max-w-2xl mx-auto px-5 pb-32 pt-6">
        <header className="mb-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="text-[10px] tracking-[0.4em] text-white/40 uppercase mb-1">Project</div>
              <h1 className="serif-display text-5xl">ARYA</h1>
              <div className="text-[10px] tracking-[0.3em] text-white/30 uppercase mt-1">v7 · Optimization Agent</div>
            </div>
            <div className="flex gap-2">
              <button onClick={exportForSync} className="p-2 border border-white/10 rounded-sm hover-lift hover:border-white/30" title="Export">
                <Download size={14} />
              </button>
              <button onClick={() => setShowImport(true)} className="p-2 border border-white/10 rounded-sm hover-lift hover:border-white/30" title="Import">
                <Upload size={14} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-px bg-white/10 border border-white/10">
            <div className="bg-black p-4">
              <div className="text-[9px] tracking-[0.3em] text-white/40 uppercase mb-1">Level</div>
              <div className="serif-display text-3xl">{level}</div>
              <div className="mt-2 h-[2px] bg-white/10 overflow-hidden">
                <div className="h-full bg-white/80" style={{ width: `${(xpInLevel / xpToNext) * 100}%` }} />
              </div>
              <div className="mono text-[9px] text-white/30 mt-1">{xpInLevel}/{xpToNext} XP</div>
            </div>
            <div className="bg-black p-4">
              <div className="text-[9px] tracking-[0.3em] text-white/40 uppercase mb-1">Streak</div>
              <div className="flex items-baseline gap-1.5">
                <div className="serif-display text-3xl">{state.streak.current}</div>
                <Flame size={14} className="text-orange-400/80" />
              </div>
              <div className="mono text-[9px] text-white/30 mt-3">Best: {state.streak.longest}d</div>
            </div>
            <div className="bg-black p-4">
              <div className="text-[9px] tracking-[0.3em] text-white/40 uppercase mb-1">Weight</div>
              <div className="serif-display text-3xl">{state.user.weight}<span className="text-sm text-white/40 ml-1">lb</span></div>
              <div className="mono text-[9px] text-white/30 mt-3">→ {state.user.goalWeight}</div>
            </div>
          </div>
        </header>

        <nav className="flex gap-0 border-b border-white/10 mb-6 overflow-x-auto">
          {[
            { id: "today", label: "Today" },
            { id: "week", label: "Week" },
            { id: "month", label: "Month" },
            { id: "skincare", label: "Skincare" },
            { id: "quests", label: "Quests" },
            { id: "training", label: "Training" },
            { id: "progress", label: "Check-ins" },
            { id: "playbook", label: "Playbook" },
          ].map(t => (
            <button key={t.id} onClick={() => { setActiveTab(t.id); setActiveWorkout(null); }}
              className={`px-4 py-3 text-[10px] tracking-[0.3em] uppercase whitespace-nowrap transition-colors ${
                activeTab === t.id ? "text-white border-b border-white -mb-px" : "text-white/40 hover:text-white/70"
              }`}>
              {t.label}
            </button>
          ))}
        </nav>

        {activeTab === "today" && <TodayView state={state} toggleHabit={toggleHabit} todayCompleted={todayCompleted} todayTotal={todayTotal} pct={pct} />}
        {activeTab === "week" && <WeekView state={state} wk={wk} toggleWeekly={toggleWeekly} decrementWeekly={decrementWeekly} />}
        {activeTab === "month" && <MonthView state={state} onDayClick={setSelectedDay} />}
        {activeTab === "skincare" && <SkincareView />}
        {activeTab === "quests" && <QuestsView pendingQuests={pendingQuests} allQuests={state.oneTimeQuests} completeQuest={completeQuest} />}
        {activeTab === "training" && !activeWorkout && <TrainingHome state={state} onStartWorkout={setActiveWorkout} />}
        {activeTab === "training" && activeWorkout && (
          <WorkoutSession workout={WORKOUTS.find(w => w.id === activeWorkout)!} history={state.workouts}
            onClose={() => setActiveWorkout(null)}
            onSave={(log) => { logWorkout(log); setActiveWorkout(null); }} />
        )}
        {activeTab === "progress" && <ProgressView state={state} latestCheckIn={latestCheckIn} addCheckIn={addCheckIn} />}
        {activeTab === "playbook" && <PlaybookView />}
      </div>

      {selectedDay && <DayDetailModal date={selectedDay} state={state} onClose={() => setSelectedDay(null)} />}

      <div className="fixed bottom-0 left-0 right-0 bg-black border-t border-white/10 p-3 backdrop-blur-md"
        style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}>
        <div className="max-w-2xl mx-auto flex items-center justify-between text-[10px] tracking-[0.3em] uppercase text-white/40">
          <div>XP · <span className="text-white mono">{state.xp.total}</span></div>
          <div className="serif-display text-base text-white/60" style={{ fontStyle: "italic" }}>Close the gap</div>
          <div>LV · <span className="text-white mono">{level}</span></div>
        </div>
      </div>

      {showImport && (
        <div className="fixed inset-0 bg-black/90 z-[70] flex items-center justify-center p-4" onClick={() => setShowImport(false)}>
          <div className="bg-black border border-white/20 p-6 max-w-lg w-full" onClick={e => e.stopPropagation()}>
            <h3 className="serif-display text-2xl mb-2">Import State</h3>
            <p className="text-xs text-white/60 mb-4">Paste JSON to restore.</p>
            <textarea value={importText} onChange={e => setImportText(e.target.value)} placeholder="Paste JSON..."
              className="w-full h-48 bg-white/5 border border-white/10 p-3 text-[10px] mono text-white/70 resize-none" />
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowImport(false)} className="flex-1 py-2 border border-white/10 text-[10px] tracking-[0.3em] uppercase hover:border-white/30">Cancel</button>
              <button onClick={importJSON} className="flex-1 py-2 border border-white/30 text-[10px] tracking-[0.3em] uppercase hover:bg-white hover:text-black">Import</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TodayView({ state, toggleHabit, todayCompleted, todayTotal, pct }: {
  state: State; toggleHabit: (id: string) => void; todayCompleted: number; todayTotal: number; pct: number;
}) {
  const tk = todayKey();
  const sections: Section[] = ["core", "posture", "grooming", "skin", "hair", "sleep"];
  const isComplete = pct >= 1;
  const size = 180;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - pct * circumference;

  return (
    <div className="space-y-6">
      <div className="slide-up flex flex-col items-center py-6 border border-white/10 relative overflow-hidden">
        <div className="absolute top-4 left-4 text-[10px] tracking-[0.3em] text-white/40 uppercase">Today</div>
        <div className="absolute top-4 right-4 text-[10px] tracking-[0.3em] text-white/40 uppercase">
          {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </div>
        <div className={`relative ${isComplete ? "ring-complete" : ""}`}>
          <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
            <circle cx={size/2} cy={size/2} r={radius} stroke="rgba(255,255,255,0.08)" strokeWidth={strokeWidth} fill="none" />
            <circle cx={size/2} cy={size/2} r={radius} stroke="white" strokeWidth={strokeWidth} fill="none"
              strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
              style={{ transition: "stroke-dashoffset 0.6s cubic-bezier(0.4, 0, 0.2, 1)" }} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="serif-display text-5xl">{Math.round(pct * 100)}<span className="text-xl text-white/40">%</span></div>
            <div className="mono text-[10px] text-white/40 mt-1">{todayCompleted}/{todayTotal}</div>
          </div>
        </div>
        <div className="mt-4 text-[10px] tracking-[0.3em] text-white/40 uppercase">
          {isComplete ? "Day complete · execute" : pct >= 0.7 ? "Closing the gap" : pct >= 0.4 ? "Keep moving" : "Start the day"}
        </div>
      </div>

      {sections.map((section, sIdx) => {
        const habits = state.dailyHabits.filter(h => h.section === section);
        if (habits.length === 0) return null;
        const sectionDone = habits.filter(h => state.todayLog?.[tk]?.[h.id]).length;

        return (
          <div key={section} className="slide-up" style={{ animationDelay: `${sIdx * 0.04}s` }}>
            <div className="flex items-baseline justify-between mb-3">
              <div className={`text-[10px] tracking-[0.3em] uppercase ${section === "core" ? "text-white" : "text-white/50"}`}>
                {SECTION_LABELS[section]}
                {section === "core" && <span className="ml-2 text-red-400/70">· bottleneck</span>}
              </div>
              <div className="mono text-[9px] text-white/30">{sectionDone}/{habits.length}</div>
            </div>
            <div className="space-y-2">
              {habits.map(h => {
                const done = state.todayLog?.[tk]?.[h.id];
                const Icon = ICONS[h.icon] || Check;
                return (
                  <button key={h.id} onClick={() => toggleHabit(h.id)}
                    className={`w-full flex items-start gap-3 px-4 py-3 border hover-lift text-left ${
                      done ? "bg-white text-black border-white" : "bg-black border-white/10 hover:border-white/30"
                    }`}>
                    <div className={`w-5 h-5 border tick-anim flex items-center justify-center shrink-0 mt-0.5 ${done ? "bg-black border-black" : "border-white/30"}`}>
                      {done && <Check size={12} className="text-white" strokeWidth={3} />}
                    </div>
                    <Icon size={14} className={`${done ? "text-black/60" : "text-white/50"} shrink-0 mt-1`} />
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm ${done ? "line-through opacity-60" : ""}`}>{h.label}</div>
                      {h.detail && <div className={`text-[11px] mt-0.5 leading-snug ${done ? "text-black/40" : "text-white/40"}`}>{h.detail}</div>}
                    </div>
                    <div className={`mono text-[10px] shrink-0 ${done ? "text-black/50" : "text-white/30"}`}>+{h.xp}</div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function WeekView({ state, wk, toggleWeekly, decrementWeekly }: {
  state: State; wk: string; toggleWeekly: (id: string) => void; decrementWeekly: (id: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <div className="text-[10px] tracking-[0.3em] text-white/40 uppercase">This Week</div>
        <h2 className="serif-display text-3xl mt-1">Weekly Targets</h2>
        <div className="mono text-[10px] text-white/30 mt-1">{wk}</div>
      </div>
      {state.weeklyGoals.map((g, idx) => {
        const count = state.weekLog?.[wk]?.[g.id] || 0;
        const pct = Math.min(100, (count / g.target) * 100);
        const complete = count >= g.target;
        const Icon = ICONS[g.icon] || Check;
        return (
          <div key={g.id} className={`border p-4 slide-up ${complete ? "border-white bg-white/5" : "border-white/10"}`} style={{ animationDelay: `${idx * 0.05}s` }}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <Icon size={16} className={complete ? "text-white" : "text-white/50"} />
                <div>
                  <div className="text-sm">{g.label}</div>
                  <div className="mono text-[10px] text-white/40 mt-0.5">+{g.xp} XP</div>
                </div>
              </div>
              <div className="serif-display text-2xl">{count}<span className="text-white/30">/{g.target}</span></div>
            </div>
            <div className="h-[2px] bg-white/5 mb-3 overflow-hidden">
              <div className="h-full bg-white transition-all duration-500" style={{ width: `${pct}%` }} />
            </div>
            <div className="flex gap-2">
              <button onClick={() => toggleWeekly(g.id)} className="flex-1 py-2 border border-white/20 text-[10px] tracking-[0.3em] uppercase hover:bg-white hover:text-black transition-colors">+ Log</button>
              {count > 0 && <button onClick={() => decrementWeekly(g.id)} className="px-3 py-2 border border-white/10 text-[10px] text-white/40 hover:text-white/70">−</button>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MonthView({ state, onDayClick }: { state: State; onDayClick: (date: string) => void }) {
  const [cursor, setCursor] = useState(() => new Date());
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = firstDay.getDay();
  const todayStr = todayKey();
  const totalHabits = state.dailyHabits.length;

  const monthKeys: string[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    monthKeys.push(`${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
  }
  const monthDailyPcts = monthKeys.map(k => {
    const log = state.todayLog[k] || {};
    const done = Object.values(log).filter(Boolean).length;
    return done / totalHabits;
  });
  const monthAvg = monthDailyPcts.reduce((a, b) => a + b, 0) / monthDailyPcts.length;
  const perfectDays = monthDailyPcts.filter(p => p >= 1).length;

  const cells: (number | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="space-y-6">
      <div>
        <div className="text-[10px] tracking-[0.3em] text-white/40 uppercase">Calendar</div>
        <h2 className="serif-display text-3xl mt-1">Monthly View</h2>
        <p className="text-xs text-white/50 mt-2 leading-relaxed">Each day's ring shows habit completion. Tap a day to see detail.</p>
      </div>

      <div className="flex items-center justify-between border border-white/10 px-4 py-3">
        <button onClick={() => setCursor(new Date(year, month - 1, 1))} className="p-1 text-white/50 hover:text-white"><ChevronLeft size={16} /></button>
        <div className="serif-display text-xl">{cursor.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</div>
        <button onClick={() => setCursor(new Date(year, month + 1, 1))} className="p-1 text-white/50 hover:text-white"><ChevronRight size={16} /></button>
      </div>

      <div className="grid grid-cols-3 gap-px bg-white/10 border border-white/10">
        <div className="bg-black p-3 text-center">
          <div className="text-[9px] tracking-[0.3em] text-white/40 uppercase">Avg</div>
          <div className="serif-display text-2xl mt-1">{Math.round(monthAvg * 100)}<span className="text-sm text-white/40">%</span></div>
        </div>
        <div className="bg-black p-3 text-center">
          <div className="text-[9px] tracking-[0.3em] text-white/40 uppercase">Perfect</div>
          <div className="serif-display text-2xl mt-1">{perfectDays}<span className="text-sm text-white/40">d</span></div>
        </div>
        <div className="bg-black p-3 text-center">
          <div className="text-[9px] tracking-[0.3em] text-white/40 uppercase">Streak</div>
          <div className="serif-display text-2xl mt-1">{state.streak.current}<span className="text-sm text-white/40">d</span></div>
        </div>
      </div>

      <div>
        <div className="grid grid-cols-7 gap-2 mb-2">
          {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
            <div key={i} className="text-[9px] tracking-[0.3em] text-white/30 uppercase text-center">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2">
          {cells.map((d, i) => {
            if (d === null) return <div key={i} />;
            const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
            const log = state.todayLog[dateStr] || {};
            const done = Object.values(log).filter(Boolean).length;
            const dayPct = done / totalHabits;
            const isToday = dateStr === todayStr;
            const hasData = done > 0;

            return (
              <button key={i} onClick={() => onDayClick(dateStr)}
                className={`aspect-square flex flex-col items-center justify-center relative hover-lift border ${
                  isToday ? "border-white" : hasData ? "border-white/20" : "border-white/5"
                }`}>
                <DayRing pct={dayPct} />
                <div className={`absolute text-[10px] mono ${hasData ? "text-white" : "text-white/30"}`}>{d}</div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function DayRing({ pct }: { pct: number }) {
  const size = 36;
  const strokeWidth = 2;
  const radius = (size - strokeWidth) / 2;
  const c = radius * 2 * Math.PI;
  return (
    <svg width={size} height={size} className="absolute" style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size/2} cy={size/2} r={radius} stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth} fill="none" />
      <circle cx={size/2} cy={size/2} r={radius} stroke="white" strokeWidth={strokeWidth} fill="none"
        strokeDasharray={c} strokeDashoffset={c - pct * c} strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.4s ease" }} opacity={pct > 0 ? 1 : 0} />
    </svg>
  );
}

function DayDetailModal({ date, state, onClose }: { date: string; state: State; onClose: () => void }) {
  const log = state.todayLog[date] || {};
  const done = state.dailyHabits.filter(h => log[h.id]);
  const notDone = state.dailyHabits.filter(h => !log[h.id]);
  const workouts = state.workouts.filter(w => w.date === date);

  return (
    <div className="fixed inset-0 bg-black/90 z-[70] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-black border border-white/20 p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-baseline justify-between mb-4">
          <div>
            <div className="text-[10px] tracking-[0.3em] text-white/40 uppercase mb-1">{new Date(date + "T12:00").toLocaleDateString("en-US", { weekday: "long" })}</div>
            <h3 className="serif-display text-2xl">{new Date(date + "T12:00").toLocaleDateString("en-US", { month: "long", day: "numeric" })}</h3>
          </div>
          <button onClick={onClose} className="p-1 text-white/40 hover:text-white"><X size={16} /></button>
        </div>
        <div className="mb-5 flex items-baseline gap-3">
          <div className="serif-display text-3xl">{done.length}<span className="text-white/30">/{state.dailyHabits.length}</span></div>
          <div className="text-xs text-white/50">habits done</div>
        </div>
        {workouts.length > 0 && (
          <div className="mb-5">
            <div className="text-[10px] tracking-[0.3em] text-white/50 uppercase mb-2">Training</div>
            {workouts.map(w => {
              const wd = WORKOUTS.find(x => x.id === w.workoutId);
              const totalSets = Object.values(w.exercises).reduce((a, s) => a + s.filter(x => x.reps > 0).length, 0);
              return (
                <div key={w.workoutId} className="flex items-center gap-2 py-1 text-xs text-white/70">
                  <Dumbbell size={12} /> {wd?.name || w.workoutId} · {totalSets} sets
                </div>
              );
            })}
          </div>
        )}
        {done.length > 0 && (
          <div className="mb-4">
            <div className="text-[10px] tracking-[0.3em] text-green-400/60 uppercase mb-2">Done</div>
            <div className="space-y-1">
              {done.map(h => <div key={h.id} className="text-xs text-white/70 flex items-center gap-2"><Check size={12} className="text-white/50" /> {h.label}</div>)}
            </div>
          </div>
        )}
        {notDone.length > 0 && (
          <div>
            <div className="text-[10px] tracking-[0.3em] text-red-400/60 uppercase mb-2">Missed</div>
            <div className="space-y-1">
              {notDone.map(h => <div key={h.id} className="text-xs text-white/40 flex items-center gap-2"><X size={12} /> {h.label}</div>)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function QuestsView({ pendingQuests, allQuests, completeQuest }: {
  pendingQuests: Quest[]; allQuests: Quest[]; completeQuest: (id: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <div className="text-[10px] tracking-[0.3em] text-white/40 uppercase">One-Time</div>
        <h2 className="serif-display text-3xl mt-1">Quests</h2>
      </div>
      {pendingQuests.length > 0 && (
        <div className="space-y-3">
          {pendingQuests.map((q, idx) => (
            <div key={q.id} className="border border-white/10 p-4 slide-up hover-lift hover:border-white/30" style={{ animationDelay: `${idx * 0.05}s` }}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {q.priority === 1 && <div className="text-[9px] tracking-[0.3em] uppercase px-2 py-0.5 bg-red-900/40 border border-red-500/30 text-red-200">Priority</div>}
                  {q.priority === 2 && <div className="text-[9px] tracking-[0.3em] uppercase px-2 py-0.5 border border-white/20 text-white/70">Soon</div>}
                  <div className="mono text-[10px] text-white/40">+{q.xp} XP</div>
                </div>
              </div>
              <div className="text-base mb-2">{q.label}</div>
              <p className="text-xs text-white/50 mb-4 leading-relaxed">{q.notes}</p>
              <button onClick={() => completeQuest(q.id)} className="w-full py-2 border border-white/30 text-[10px] tracking-[0.3em] uppercase hover:bg-white hover:text-black transition-colors">Mark Complete</button>
            </div>
          ))}
        </div>
      )}
      {allQuests.some(q => q.done) && (
        <div>
          <div className="text-[10px] tracking-[0.3em] text-white/40 uppercase mb-3">Completed</div>
          <div className="space-y-2">
            {allQuests.filter(q => q.done).map(q => (
              <div key={q.id} className="flex items-center gap-3 px-4 py-3 border border-white/5 bg-white/[0.02]">
                <Check size={14} className="text-white/40" />
                <div className="flex-1 text-sm text-white/50 line-through">{q.label}</div>
                <div className="mono text-[9px] text-white/30">+{q.xp}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TrainingHome({ state, onStartWorkout }: { state: State; onStartWorkout: (id: string) => void }) {
  const historyByWorkout = useMemo(() => {
    const map: Record<string, WorkoutLog[]> = {};
    state.workouts.forEach(w => {
      if (!map[w.workoutId]) map[w.workoutId] = [];
      map[w.workoutId].push(w);
    });
    Object.keys(map).forEach(k => map[k].sort((a, b) => b.date.localeCompare(a.date)));
    return map;
  }, [state.workouts]);

  return (
    <div className="space-y-6">
      <div>
        <div className="text-[10px] tracking-[0.3em] text-white/40 uppercase">Training</div>
        <h2 className="serif-display text-3xl mt-1">Workouts</h2>
        <p className="text-xs text-white/50 mt-2 leading-relaxed">
          Tap a workout to start. Log weight + reps per set. Data feeds into the sync so we track progression.
        </p>
      </div>
      <div className="space-y-3">
        {WORKOUTS.map((w, idx) => {
          const lastSession = historyByWorkout[w.id]?.[0];
          const lastDate = lastSession ? new Date(lastSession.date + "T12:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }) : null;
          return (
            <button key={w.id} onClick={() => onStartWorkout(w.id)}
              className="w-full border border-white/10 p-4 text-left slide-up hover-lift hover:border-white/30"
              style={{ animationDelay: `${idx * 0.04}s` }}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Dumbbell size={14} className="text-white/50" />
                  <span className="text-[10px] tracking-[0.3em] uppercase text-white/50">{w.tag}</span>
                </div>
                <ChevronRight size={16} className="text-white/30" />
              </div>
              <div className="serif-display text-xl">{w.name}</div>
              <div className="text-[11px] text-white/40 mt-1">{w.exercises.length} exercises</div>
              {lastDate && <div className="mono text-[10px] text-white/30 mt-2">Last: {lastDate}</div>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function WorkoutSession({ workout, history, onClose, onSave }: {
  workout: Workout; history: WorkoutLog[];
  onClose: () => void; onSave: (log: WorkoutLog) => void;
}) {
  const lastSession = useMemo(() =>
    history.filter(h => h.workoutId === workout.id).sort((a, b) => b.date.localeCompare(a.date))[0]
  , [history, workout.id]);
  const todayStr = todayKey();
  const todaysLog = history.find(h => h.workoutId === workout.id && h.date === todayStr);

  const initialExercises = useMemo(() => {
    const result: Record<string, ExerciseSet[]> = {};
    workout.exercises.forEach(ex => {
      if (todaysLog?.exercises?.[ex.id]) {
        result[ex.id] = todaysLog.exercises[ex.id];
      } else {
        result[ex.id] = Array(ex.targetSets).fill(null).map(() => ({ weight: 0, reps: 0 }));
      }
    });
    return result;
  }, [workout, todaysLog]);

  const [exercises, setExercises] = useState(initialExercises);
  const [notes, setNotes] = useState(todaysLog?.notes || "");
  const [startTime] = useState(Date.now());

  const updateSet = (exId: string, setIdx: number, field: "weight" | "reps", value: number) => {
    setExercises(prev => {
      const sets = [...(prev[exId] || [])];
      sets[setIdx] = { ...sets[setIdx], [field]: value };
      return { ...prev, [exId]: sets };
    });
  };

  const addSet = (exId: string) => {
    setExercises(prev => ({ ...prev, [exId]: [...(prev[exId] || []), { weight: 0, reps: 0 }] }));
  };

  const removeSet = (exId: string, setIdx: number) => {
    setExercises(prev => ({ ...prev, [exId]: (prev[exId] || []).filter((_, i) => i !== setIdx) }));
  };

  const save = () => {
    const duration = Math.round((Date.now() - startTime) / 60000);
    onSave({ date: todayStr, workoutId: workout.id, exercises, notes, duration });
  };

  const totalLoggedSets = Object.values(exercises).reduce((a, sets) => a + sets.filter(s => s.reps > 0).length, 0);

  return (
    <div className="space-y-5 pb-8">
      <div className="flex items-center justify-between">
        <button onClick={onClose} className="flex items-center gap-1 text-[10px] tracking-[0.3em] uppercase text-white/50 hover:text-white">
          <ChevronLeft size={14} /> Back
        </button>
        <div className="mono text-[10px] text-white/40">{totalLoggedSets} sets logged</div>
      </div>

      <div>
        <div className="text-[10px] tracking-[0.3em] text-white/40 uppercase">{workout.tag}</div>
        <h2 className="serif-display text-3xl mt-1">{workout.name}</h2>
        {lastSession && (
          <div className="mono text-[10px] text-white/40 mt-2">
            Last: {new Date(lastSession.date + "T12:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </div>
        )}
      </div>

      <div className="space-y-5">
        {workout.exercises.map((ex, idx) => {
          const sets = exercises[ex.id] || [];
          const lastEx = lastSession?.exercises?.[ex.id];
          return (
            <section key={ex.id} className="border border-white/10 p-4 slide-up" style={{ animationDelay: `${idx * 0.03}s` }}>
              <div className="mb-3">
                <h3 className="serif-display text-lg">{ex.name}</h3>
                <div className="text-[10px] tracking-[0.2em] text-white/40 uppercase mt-1">
                  target: {ex.targetSets} × {ex.targetRepsLow === ex.targetRepsHigh ? ex.targetRepsLow : `${ex.targetRepsLow}-${ex.targetRepsHigh}`}
                </div>
                {ex.cue && <div className="text-[11px] text-white/50 italic mt-1">{ex.cue}</div>}
              </div>
              {lastEx && lastEx.length > 0 && (
                <div className="mb-3 pb-3 border-b border-white/5">
                  <div className="text-[9px] tracking-[0.3em] text-white/30 uppercase mb-1">Last session</div>
                  <div className="flex gap-3 flex-wrap">
                    {lastEx.map((s, i) => (
                      <div key={i} className="mono text-[11px] text-white/50">{s.weight > 0 ? `${s.weight}×` : ""}{s.reps}</div>
                    ))}
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <div className="grid grid-cols-[24px_1fr_1fr_24px] gap-2 text-[9px] tracking-[0.3em] text-white/30 uppercase">
                  <div>Set</div><div>Weight</div><div>Reps</div><div />
                </div>
                {sets.map((set, sIdx) => (
                  <div key={sIdx} className="grid grid-cols-[24px_1fr_1fr_24px] gap-2 items-center">
                    <div className="mono text-[11px] text-white/50">{sIdx + 1}</div>
                    <input type="number" inputMode="decimal" value={set.weight || ""}
                      onChange={e => updateSet(ex.id, sIdx, "weight", parseFloat(e.target.value) || 0)}
                      placeholder="lb"
                      className="bg-white/5 border border-white/10 px-2 py-2 text-sm mono text-white focus:border-white/40 outline-none" />
                    <input type="number" inputMode="numeric" value={set.reps || ""}
                      onChange={e => updateSet(ex.id, sIdx, "reps", parseInt(e.target.value) || 0)}
                      placeholder="reps"
                      className="bg-white/5 border border-white/10 px-2 py-2 text-sm mono text-white focus:border-white/40 outline-none" />
                    <button onClick={() => removeSet(ex.id, sIdx)} className="text-white/30 hover:text-white/70 flex items-center justify-center">
                      <X size={12} />
                    </button>
                  </div>
                ))}
                <button onClick={() => addSet(ex.id)}
                  className="w-full py-1.5 border border-dashed border-white/10 text-[10px] tracking-[0.3em] uppercase text-white/40 hover:text-white/70 hover:border-white/20 flex items-center justify-center gap-1">
                  <Plus size={10} /> Add Set
                </button>
              </div>
            </section>
          );
        })}
      </div>

      <div>
        <label className="text-[10px] tracking-[0.3em] text-white/40 uppercase block mb-1.5">Session notes</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Energy, form, progressions, injuries..."
          className="w-full bg-transparent border border-white/10 px-3 py-2 text-sm h-20 resize-none focus:border-white/30 outline-none" />
      </div>

      <div className="flex gap-2 sticky bottom-20 bg-black pt-2">
        <button onClick={onClose} className="flex-1 py-3 border border-white/10 text-[10px] tracking-[0.3em] uppercase hover:border-white/30">Cancel</button>
        <button onClick={save} className="flex-1 py-3 border border-white bg-white text-black text-[10px] tracking-[0.3em] uppercase">Save Session</button>
      </div>
    </div>
  );
}

function ProgressView({ state, latestCheckIn, addCheckIn }: {
  state: State; latestCheckIn: CheckIn | undefined; addCheckIn: (w: string, n: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <div className="text-[10px] tracking-[0.3em] text-white/40 uppercase">History</div>
        <h2 className="serif-display text-3xl mt-1">Check-ins</h2>
      </div>
      {latestCheckIn && (
        <section className="border border-white/10 p-5">
          <div className="text-[10px] tracking-[0.3em] text-white/40 uppercase mb-2">Latest · {latestCheckIn.date}</div>
          <div className="serif-display text-2xl mb-4">{latestCheckIn.weight} lb</div>
          <p className="text-sm text-white/70 leading-relaxed mb-5">{latestCheckIn.notes}</p>
          {latestCheckIn.wins?.length > 0 && (
            <div className="mb-4">
              <div className="text-[10px] tracking-[0.3em] text-green-400/60 uppercase mb-2">Wins</div>
              <ul className="space-y-1">{latestCheckIn.wins.map((w, i) => <li key={i} className="text-xs text-white/70">✓ {w}</li>)}</ul>
            </div>
          )}
          {latestCheckIn.gaps?.length > 0 && (
            <div>
              <div className="text-[10px] tracking-[0.3em] text-red-400/60 uppercase mb-2">Gaps</div>
              <ul className="space-y-1">{latestCheckIn.gaps.map((g, i) => <li key={i} className="text-xs text-white/70">△ {g}</li>)}</ul>
            </div>
          )}
        </section>
      )}
      <CheckInForm onSubmit={addCheckIn} currentWeight={state.user.weight} />
      <div>
        <div className="text-[10px] tracking-[0.3em] text-white/40 uppercase mb-3">Timeline</div>
        <div className="space-y-3">
          {[...state.checkIns].reverse().map((ci, i) => (
            <div key={i} className="border-l border-white/20 pl-4 py-2">
              <div className="flex items-baseline justify-between mb-1">
                <div className="mono text-[10px] text-white/40">{ci.date}</div>
                <div className="serif-display text-lg">{ci.weight} <span className="text-xs text-white/40">lb</span></div>
              </div>
              <p className="text-xs text-white/60 leading-relaxed">{ci.notes}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CheckInForm({ onSubmit, currentWeight }: { onSubmit: (w: string, n: string) => void; currentWeight: number }) {
  const [weight, setWeight] = useState("");
  const [notes, setNotes] = useState("");
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="w-full py-4 border border-white/20 hover:border-white/40 text-[10px] tracking-[0.3em] uppercase flex items-center justify-center gap-2 hover-lift">
        <Plus size={14} /> Log New Check-in
      </button>
    );
  }
  return (
    <section className="border border-white/20 p-5">
      <h3 className="serif-display text-xl mb-4">New Check-in</h3>
      <div className="space-y-3">
        <div>
          <label className="text-[10px] tracking-[0.3em] text-white/40 uppercase block mb-1.5">Weight (lb)</label>
          <input type="number" step="0.1" value={weight} onChange={e => setWeight(e.target.value)} placeholder={String(currentWeight)}
            className="w-full bg-transparent border border-white/10 px-3 py-2 text-sm mono focus:border-white/30 outline-none" />
        </div>
        <div>
          <label className="text-[10px] tracking-[0.3em] text-white/40 uppercase block mb-1.5">Notes</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="What's working..."
            className="w-full bg-transparent border border-white/10 px-3 py-2 text-sm h-24 resize-none focus:border-white/30 outline-none" />
        </div>
        <div className="flex gap-2 pt-2">
          <button onClick={() => setOpen(false)} className="flex-1 py-2 border border-white/10 text-[10px] tracking-[0.3em] uppercase hover:border-white/30">Cancel</button>
          <button onClick={() => { onSubmit(weight, notes); setOpen(false); setWeight(""); setNotes(""); }} className="flex-1 py-2 border border-white/30 text-[10px] tracking-[0.3em] uppercase hover:bg-white hover:text-black">Submit · +100 XP</button>
        </div>
      </div>
    </section>
  );
}

function PlaybookView() {
  const sections = [
    { title: "Current Bottleneck", body: "Weight. Stuck at 145 = not eating for growth. Back grew because you trained it. Chest/shoulder mass won't follow until calories do. Target: 151 lb by May 19. +350 cal/day." },
    { title: "North Star", body: "Not to become someone else. The sharpest Arman. References: Bateman (grooming), Bruce Wayne (mass), Salvatore (eye area), Morra (hair)." },
    { title: "What's Working", body: "Back development. SPF adherence. Mouth tape + nose expander. Posture shoulders-back. Hair wave expressing. Brow cleanup trending." },
    { title: "What's Overdue", body: "Professional brow thread (30d+). Orthodontist MSE consult. Fixed wake time anchor. Surplus eating." },
    { title: "Brow Protocol", body: "DIY has you 70% there. Pro thread locks the arch. Instructions: 'Masculine and natural. Clean between. Slight arch on outer tail. Do not touch the top.'" },
    { title: "Hair", body: "Natural wave expressing. Length correct. Transition to Hims while hairline stable. Salt spray + scrunch + air dry = Morra finish." },
    { title: "Skin", body: "EltaMD SPF 50 daily. Full routine itemized in Today. Retinol phase 3 after 8+ weeks of current baseline." },
    { title: "Jaw & Face", body: "Tongue on palate 24/7. Breathing locked via tape + expander. Next: mastic gum daily + ortho consult. Face fills when weight moves." },
    { title: "Physique Math", body: "TDEE ~2400. Target 2700-2900. Protein 160g. Two meals = maintenance. Three meals = growth." },
    { title: "Sleep", body: "Breathing anchored. Next lever: fixed wake time ±30 min incl. weekends. Morning sunlight within 30 min. Screens off 60 min pre-bed." },
  ];
  return (
    <div className="space-y-6">
      <div>
        <div className="text-[10px] tracking-[0.3em] text-white/40 uppercase">Reference</div>
        <h2 className="serif-display text-3xl mt-1">The Playbook</h2>
      </div>
      {sections.map((s, i) => (
        <section key={i} className="border-l border-white/20 pl-5 slide-up" style={{ animationDelay: `${i * 0.04}s` }}>
          <div className="text-[10px] tracking-[0.3em] text-white/40 uppercase mb-2">{String(i + 1).padStart(2, "0")}</div>
          <h3 className="serif-display text-xl mb-2">{s.title}</h3>
          <p className="text-sm text-white/60 leading-relaxed">{s.body}</p>
        </section>
      ))}
    </div>
  );
}

// ============================================================
// SKINCARE VIEW — Morning + Evening rituals · Tan-reversal protocol
// ============================================================
type SkincareStep = {
  step: number;
  product: string;
  brand?: string;
  why: string;
  how: string;
  wait?: string;
  price?: string;
  flag?: "critical" | "rotating";
};

const AM_RITUAL: SkincareStep[] = [
  {
    step: 1,
    product: "Cleanse",
    brand: "LRP Toleriane Hydrating Gentle Cleanser",
    why: "Morning skin doesn't need acid. The old SA cleanser was inflaming your barrier and triggering melanocytes through a non-UV pathway. Gentle cleansing keeps barrier intact = less baseline pigment production.",
    how: "Lukewarm water. Quarter-sized dollop, lather 15 sec, rinse, pat dry. Don't rub.",
  },
  {
    step: 2,
    product: "Vitamin C Serum",
    brand: "The Ordinary Ascorbyl Glucoside 12%",
    why: "Antioxidant. Neutralizes UV-generated free radicals before they trigger pigment production. Slow-release form = continuous protection through the day. Also mildly inhibits tyrosinase.",
    how: "4-5 drops in palm. Dab 5 dots across face. Pat (don't rub) until absorbed.",
    wait: "60 seconds",
    price: "$15",
  },
  {
    step: 3,
    product: "Alpha Arbutin",
    brand: "The Ordinary Alpha Arbutin 2% + HA",
    why: "Direct tyrosinase inhibitor — blocks the enzyme that makes melanin. Reduces pigment output by 30-40% over 8-12 weeks. Gentle enough for daily use, no rebound darkening risk.",
    how: "3-4 drops. Dot and pat across face and neck.",
    wait: "30 seconds",
    price: "$12",
  },
  {
    step: 4,
    product: "Moisturizer",
    brand: "LRP Toleriane Double Repair",
    why: "Contains ceramides (rebuild barrier) and niacinamide (extra pigment-blocking bonus). Buffers between actives below and SPF above. Hydrated skin pigments less.",
    how: "Pea-to-quarter-sized amount. Warm between palms, smooth across face and neck.",
    price: "$35",
  },
  {
    step: 5,
    product: "Sunscreen · PA++++",
    brand: "Beauty of Joseon Relief Sun SPF 50+ PA++++",
    why: "PA++++ = maximum UVA blocking. UVA passes through clouds and car windows — it's what drives tanning more than UVB. American SPFs often miss this. Korean formulas don't.",
    how: "TWO full finger-lengths for face + neck + ears + hairline + jawline. If it doesn't feel like a lot, it isn't enough. Wait 5 min before going out.",
    flag: "critical",
  },
  {
    step: 6,
    product: "SPF Reapply (~noon)",
    brand: "Same SPF · or Beauty of Joseon Sun Stick",
    why: "You drive 30+ min daily. UVA passes through side windows = your LEFT cheek getting hit hourly. Morning SPF is depleted by 2 PM. Reapply restores protection for afternoon driving.",
    how: "Stick form: swipe across cheeks (especially left), nose, forehead, ears, neck. Pat to blend.",
    flag: "critical",
  },
];

const PM_RITUAL: SkincareStep[] = [
  {
    step: 1,
    product: "Cleanse",
    brand: "LRP Toleriane Hydrating Gentle Cleanser",
    why: "Removes sunscreen, sebum, environmental debris. Same gentle cleanser AM and PM — barrier-supporting both times.",
    how: "Quarter-sized dollop, lukewarm water, 15 sec lather, rinse, pat dry.",
  },
  {
    step: 2,
    product: "Tranexamic Acid Stack",
    brand: "Naturium Tranexamic Topical Acid 5%",
    why: "Four pigment-fighters in one bottle: tranexamic acid (blocks inflammation-pigment cascade) + kojic acid (tyrosinase inhibitor) + niacinamide (blocks melanin transfer) + licorice root (anti-inflammatory + tyrosinase inhibitor). Single product = lower interaction risk than stacking serums.",
    how: "3-4 pumps. Dot across face and neck, pat in with flat fingers.",
    wait: "60 seconds",
    price: "$20",
  },
  {
    step: 3,
    product: "Moisturizer",
    brand: "LRP Toleriane Double Repair",
    why: "Overnight barrier repair. Your skin's regenerative work peaks between 11 PM and 4 AM — moisturizer supports that. Also acts as a buffer below adapalene (on adapalene nights).",
    how: "Pea-to-quarter-sized amount. Smooth across face and neck.",
    wait: "5 minutes (critical if applying Differin next)",
  },
  {
    step: 4,
    product: "Adapalene · M/W/F only",
    brand: "Differin Gel 0.1%",
    why: "The accelerator. Other actives slow pigment production — adapalene speeds up REMOVAL of pigment already in your skin. Compresses cell turnover from 35 days to 15-20 days. Cuts your timeline roughly in half.",
    how: "Pea-sized amount TOTAL for entire face. 7 dots: 3 forehead, 2 each cheek, 1 chin, 1 nose. Spread thin. AVOID: mouth corners, sides of nose, around eyes, eyelids. Wash hands after.",
    flag: "rotating",
  },
];

const SHOPPING_LIST = [
  { name: "Beauty of Joseon Relief Sun SPF 50+ PA++++", price: 18, where: "Already owned ✓" },
  { name: "Differin Gel 0.1% (Adapalene)", price: 15, where: "Already owned ✓" },
  { name: "Naturium Tranexamic Topical Acid 5%", price: 20, where: "Amazon (4 actives in one)" },
  { name: "The Ordinary Ascorbyl Glucoside Solution 12%", price: 15, where: "Amazon / Sephora / Ordinary" },
  { name: "The Ordinary Alpha Arbutin 2% + HA", price: 12, where: "Amazon / Sephora / Ordinary" },
  { name: "LRP Toleriane Double Repair Moisturizer (with cleanser bundle)", price: 35, where: "Amazon — get the bundle with travel cleanser" },
];

function SkincareView() {
  const [phase, setPhase] = useState<"am" | "pm" | "schedule" | "shop">("am");
  const [purchased, setPurchased] = useState<Record<string, boolean>>(() => {
    if (typeof window === "undefined") return {};
    try { return JSON.parse(localStorage.getItem("arya:skincare:purchased") || "{}"); } catch { return {}; }
  });

  const togglePurchased = (name: string) => {
    const next = { ...purchased, [name]: !purchased[name] };
    setPurchased(next);
    try { localStorage.setItem("arya:skincare:purchased", JSON.stringify(next)); } catch {}
  };

  const totalCost = SHOPPING_LIST.reduce((sum, item) => sum + item.price, 0);
  const purchasedCost = SHOPPING_LIST.filter(i => purchased[i.name]).reduce((sum, i) => sum + i.price, 0);

  return (
    <div className="space-y-6">
      <div>
        <div className="text-[10px] tracking-[0.3em] text-white/40 uppercase">Tan Reversal Protocol</div>
        <h2 className="serif-display text-3xl mt-1">Skincare</h2>
        <p className="text-xs text-white/50 mt-2 leading-relaxed">
          Built for Indian male skin, high melanin reactivity, existing tan to reverse. Two-front attack: stop new accumulation, fade existing pigment.
        </p>
      </div>

      {/* Phase switcher */}
      <div className="grid grid-cols-4 gap-px bg-white/10 border border-white/10">
        {[
          { id: "am" as const, label: "Morning", icon: Sun },
          { id: "pm" as const, label: "Evening", icon: Moon },
          { id: "schedule" as const, label: "Schedule", icon: Calendar },
          { id: "shop" as const, label: "Shop", icon: Target },
        ].map(t => {
          const Icon = t.icon;
          const active = phase === t.id;
          return (
            <button key={t.id} onClick={() => setPhase(t.id)}
              className={`bg-black py-3 flex flex-col items-center gap-1 transition-colors ${active ? "text-white" : "text-white/40 hover:text-white/70"}`}>
              <Icon size={14} />
              <span className="text-[9px] tracking-[0.25em] uppercase">{t.label}</span>
            </button>
          );
        })}
      </div>

      {phase === "am" && <RitualList ritual={AM_RITUAL} title="Morning · 6 steps" subtitle="Total time: 4-5 min" />}
      {phase === "pm" && <RitualList ritual={PM_RITUAL} title="Evening · 3 steps" subtitle="Capped at 3 steps for realism" />}
      {phase === "schedule" && <WeeklySchedule />}
      {phase === "shop" && (
        <ShoppingList items={SHOPPING_LIST} purchased={purchased} togglePurchased={togglePurchased} totalCost={totalCost} purchasedCost={purchasedCost} />
      )}

      {/* Why it works panel — always visible */}
      <details className="border border-white/10 p-4 group">
        <summary className="cursor-pointer text-[10px] tracking-[0.3em] uppercase text-white/60 hover:text-white list-none flex items-center justify-between">
          <span>Why this works · the science</span>
          <ChevronRight size={14} className="transition-transform group-open:rotate-90" />
        </summary>
        <div className="mt-4 space-y-3 text-xs text-white/60 leading-relaxed">
          <p><span className="text-white/80">Three pathways stacked.</span> Vitamin C blocks pigment formation at the antioxidant level. Alpha arbutin inhibits tyrosinase (the enzyme that makes melanin). Tranexamic acid blocks the inflammation-pigment cascade. Niacinamide stops melanin from transferring to skin cells. Adapalene accelerates the turnover of pigmented cells. Each works on a different step — combined, they hit the problem from five angles.</p>
          <p><span className="text-white/80">Why PA++++ matters more than SPF number.</span> SPF is UVB protection (sunburn). PA is UVA protection (tanning + aging). UVA passes through car windows, clouds, and shade. Your previous SPF was UVB-strong but UVA-weak — that's why you keep tanning despite using it.</p>
          <p><span className="text-white/80">Why we dropped the SA cleanser entirely.</span> Daily 2% salicylic acid on barrier-intact skin without active acne is overkill. It compromises the barrier, which makes skin more photoreactive — meaning the same sun exposure produces more pigment. Counterintuitive but well-documented in South Asian skin literature. With clear skin and 5 actives already in your stack, you don't need it.</p>
          <p><span className="text-white/80">Realistic timeline.</span> Weeks 1-2: tan stops getting worse. Weeks 4-6: subtle evenness. Weeks 8-12: people start noticing. Months 4-6: significant convergence with chest tone.</p>
        </div>
      </details>

      {/* Warnings */}
      <div className="border border-red-500/20 bg-red-950/10 p-4">
        <div className="text-[10px] tracking-[0.3em] uppercase text-red-300/80 mb-2">Don't do these</div>
        <ul className="space-y-1.5 text-xs text-white/60 leading-relaxed">
          <li>· Never use adapalene in the morning. PM only.</li>
          <li>· Never skip SPF on adapalene days. Increases photosensitivity.</li>
          <li>· No scrubs, grainy exfoliants, or aggressive face brushes. South Asian skin pigments in response to mechanical trauma.</li>
          <li>· No additional acid toners on top of this protocol. Already enough actives.</li>
          <li>· If skin gets red/flaky: drop adapalene to 1x/week, focus on moisturizer + SPF, ramp back up after 7 days.</li>
        </ul>
      </div>
    </div>
  );
}

function RitualList({ ritual, title, subtitle }: { ritual: SkincareStep[]; title: string; subtitle: string }) {
  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between mb-2">
        <div className="serif-display text-xl">{title}</div>
        <div className="mono text-[10px] text-white/40">{subtitle}</div>
      </div>
      {ritual.map((s, idx) => (
        <div key={s.step} className={`border p-4 slide-up ${
          s.flag === "critical" ? "border-orange-400/30 bg-orange-950/10" :
          s.flag === "rotating" ? "border-blue-400/20 bg-blue-950/5" :
          "border-white/10"
        }`} style={{ animationDelay: `${idx * 0.05}s` }}>
          <div className="flex items-baseline gap-3 mb-2">
            <div className="serif-display text-2xl text-white/60 shrink-0" style={{ minWidth: "2ch" }}>{s.step}</div>
            <div className="flex-1 min-w-0">
              <div className="text-base leading-tight">{s.product}</div>
              {s.brand && <div className="text-[11px] text-white/50 mt-0.5 italic">{s.brand}</div>}
            </div>
            {s.flag === "critical" && (
              <div className="text-[9px] tracking-[0.2em] uppercase px-2 py-0.5 bg-orange-900/40 border border-orange-500/30 text-orange-200 shrink-0">Critical</div>
            )}
            {s.flag === "rotating" && (
              <div className="text-[9px] tracking-[0.2em] uppercase px-2 py-0.5 bg-blue-900/40 border border-blue-500/30 text-blue-200 shrink-0">M/W/F</div>
            )}
          </div>

          <div className="mt-3 space-y-2 pl-1">
            <div>
              <div className="text-[9px] tracking-[0.3em] text-white/40 uppercase mb-1">How</div>
              <div className="text-xs text-white/70 leading-relaxed">{s.how}</div>
            </div>
            <div>
              <div className="text-[9px] tracking-[0.3em] text-white/40 uppercase mb-1">Why</div>
              <div className="text-xs text-white/60 leading-relaxed">{s.why}</div>
            </div>
            {s.wait && (
              <div className="flex items-center gap-2 text-[10px] text-white/50 mt-2">
                <Clock size={11} /> <span className="mono">Wait {s.wait}</span>
              </div>
            )}
            {s.price && (
              <div className="mono text-[10px] text-white/40 mt-1">{s.price}</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function WeeklySchedule() {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const schedule: Record<string, { am: string; pm: string; adapalene: boolean }> = {
    Mon: { am: "Full AM", pm: "Full PM + Adapalene", adapalene: true },
    Tue: { am: "Full AM", pm: "Full PM", adapalene: false },
    Wed: { am: "Full AM", pm: "Full PM + Adapalene", adapalene: true },
    Thu: { am: "Full AM", pm: "Full PM", adapalene: false },
    Fri: { am: "Full AM", pm: "Full PM + Adapalene", adapalene: true },
    Sat: { am: "Full AM", pm: "Full PM", adapalene: false },
    Sun: { am: "Full AM", pm: "Full PM", adapalene: false },
  };

  return (
    <div className="space-y-3">
      <div className="serif-display text-xl mb-2">Weekly Rhythm</div>
      <p className="text-xs text-white/50 leading-relaxed mb-4">
        Same AM ritual every day. Same PM ritual every day. Adapalene only on Mon/Wed/Fri after moisturizer settles 5 min. Week 1: skip adapalene entirely to let skin adapt.
      </p>
      <div className="space-y-2">
        {days.map((d, i) => {
          const s = schedule[d];
          return (
            <div key={d} className="grid grid-cols-[60px_1fr] gap-3 items-center border border-white/10 p-3 slide-up" style={{ animationDelay: `${i * 0.04}s` }}>
              <div className="text-[10px] tracking-[0.3em] uppercase text-white/60">{d}</div>
              <div className="flex flex-wrap gap-2">
                <span className="text-[10px] px-2 py-1 border border-white/15 text-white/70">AM ritual</span>
                <span className="text-[10px] px-2 py-1 border border-white/15 text-white/70">PM ritual</span>
                {s.adapalene && <span className="text-[10px] px-2 py-1 border border-blue-500/30 bg-blue-950/30 text-blue-200">+ Adapalene</span>}
              </div>
            </div>
          );
        })}
      </div>

      <div className="border border-white/10 p-4 mt-4">
        <div className="text-[10px] tracking-[0.3em] uppercase text-white/60 mb-2">Reapply SPF · every day at noon</div>
        <p className="text-xs text-white/60 leading-relaxed">
          Non-negotiable. Especially after lunch if you've driven anywhere. Driver's-side cheek (your left) needs extra coverage — that's the side losing the tan battle.
        </p>
      </div>
    </div>
  );
}

function ShoppingList({ items, purchased, togglePurchased, totalCost, purchasedCost }: {
  items: typeof SHOPPING_LIST;
  purchased: Record<string, boolean>;
  togglePurchased: (name: string) => void;
  totalCost: number;
  purchasedCost: number;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between mb-2">
        <div className="serif-display text-xl">The Stack</div>
        <div className="mono text-[10px] text-white/40">
          <span className="text-white">${purchasedCost}</span> / ${totalCost}
        </div>
      </div>
      <p className="text-xs text-white/50 leading-relaxed mb-4">
        Buy in one order. Don't skip the SPF or the adapalene — those are doing the heaviest lifting. Tap to mark as owned.
      </p>
      {items.map((item, i) => {
        const owned = purchased[item.name];
        return (
          <button key={item.name} onClick={() => togglePurchased(item.name)}
            className={`w-full flex items-center gap-3 p-3 border text-left hover-lift slide-up ${
              owned ? "bg-white text-black border-white" : "bg-black border-white/10 hover:border-white/30"
            }`} style={{ animationDelay: `${i * 0.04}s` }}>
            <div className={`w-5 h-5 border tick-anim flex items-center justify-center shrink-0 ${owned ? "bg-black border-black" : "border-white/30"}`}>
              {owned && <Check size={12} className="text-white" strokeWidth={3} />}
            </div>
            <div className="flex-1 min-w-0">
              <div className={`text-sm ${owned ? "line-through opacity-60" : ""}`}>{item.name}</div>
              <div className={`text-[10px] mt-0.5 ${owned ? "text-black/50" : "text-white/40"}`}>{item.where}</div>
            </div>
            <div className={`mono text-sm shrink-0 ${owned ? "text-black/60" : "text-white/60"}`}>${item.price}</div>
          </button>
        );
      })}
    </div>
  );
}
