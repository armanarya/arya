"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Flame, Trophy, Target, Zap, TrendingUp, Download, Upload, Plus, Check,
  Calendar, Dumbbell, Droplet, Moon, Sun, Eye, Scissors, Activity,
  type LucideIcon
} from "lucide-react";

// ============================================================
// ARYA — Personal Optimization Agent · v4
// Real-baseline edition · post April 19 check-in
// ============================================================

const STORAGE_KEY = "arya:v4:state";
const SCHEMA_VERSION = 4;

// ------------------ TYPES ------------------
type HabitTier = "core" | "posture" | "skin" | "hair" | "sleep";
type Habit = { id: string; label: string; icon: string; xp: number; tier: HabitTier };
type WeeklyGoal = { id: string; label: string; target: number; icon: string; xp: number };
type Quest = { id: string; label: string; xp: number; done: boolean; priority: 1 | 2 | 3; notes: string };
type CheckIn = { date: string; weight: number; notes: string; wins: string[]; gaps: string[] };

type State = {
  schemaVersion: number;
  user: { name: string; weight: number; goalWeight: number; startDate: string };
  streak: { current: number; longest: number; lastCheckIn: string | null };
  xp: { total: number; level: number };
  lockedIn: { id: string; label: string; since: string }[]; // habits already automatic
  dailyHabits: Habit[];
  weeklyGoals: WeeklyGoal[];
  oneTimeQuests: Quest[];
  todayLog: Record<string, Record<string, boolean>>;
  weekLog: Record<string, Record<string, number>>;
  checkIns: CheckIn[];
  syncs: { date: string; note: string }[];
};

// ------------------ DEFAULT STATE ------------------
const DEFAULT_STATE: State = {
  schemaVersion: SCHEMA_VERSION,
  user: { name: "Arman", weight: 145, goalWeight: 160, startDate: "2026-03-21" },
  streak: { current: 0, longest: 0, lastCheckIn: null },
  xp: { total: 0, level: 1 },

  // These are habits you've confirmed are automatic — tracked for reference, not daily nagging
  lockedIn: [
    { id: "spf", label: "EltaMD SPF 50 · daily", since: "2026-03-21" },
    { id: "mouthtape", label: "Mouth tape · nightly", since: "2026-03-21" },
    { id: "nose-expander", label: "Nose expander · nightly", since: "2026-03-21" },
    { id: "chintucks-baseline", label: "Chin tucks · daily", since: "2026-03-21" },
    { id: "tongue-baseline", label: "Tongue posture · continuous", since: "2026-03-21" },
    { id: "water-72", label: "Water 72+ oz · daily", since: "2026-03-21" },
    { id: "supps", label: "Morning supplements · daily", since: "2026-03-21" },
    { id: "minox", label: "Topical Minoxidil · consistent", since: "2026-01" },
  ],

  // Only habits that are still in active-build — no more ticking boxes for things you already do
  dailyHabits: [
    // CORE — the bottleneck. All daily items here gate weight gain.
    { id: "breakfast", label: "Breakfast eaten (not skipped)", icon: "sun", xp: 15, tier: "core" },
    { id: "meal3", label: "3rd meal / shake hit", icon: "flame", xp: 20, tier: "core" },
    { id: "protein160", label: "Protein ≥ 160g", icon: "target", xp: 15, tier: "core" },
    { id: "surplus", label: "Caloric surplus (2700+)", icon: "flame", xp: 20, tier: "core" },
    { id: "water100", label: "Water 100+ oz (push from 72)", icon: "droplet", xp: 10, tier: "core" },
    { id: "creatine", label: "Creatine 5g", icon: "zap", xp: 5, tier: "core" },

    // POSTURE — daily reinforcement on top of 3x/week circuit
    { id: "hipflexor", label: "Hip flexor stretch", icon: "activity", xp: 5, tier: "posture" },
    { id: "chintucks-pm", label: "PM chin tucks (conscious rep)", icon: "activity", xp: 5, tier: "posture" },
    { id: "9090", label: "90/90 breathing · 5 breaths", icon: "activity", xp: 5, tier: "posture" },

    // SKIN — the builds still in progress
    { id: "amskin", label: "AM skincare full routine", icon: "droplet", xp: 5, tier: "skin" },
    { id: "pmskin", label: "PM skincare full routine", icon: "moon", xp: 5, tier: "skin" },
    { id: "eyecream", label: "Multi-peptide eye serum (AM+PM)", icon: "eye", xp: 5, tier: "skin" },
    { id: "vitc", label: "Vitamin C serum (AM)", icon: "sun", xp: 5, tier: "skin" },

    // HAIR — styling habit is the unbuilt one
    { id: "scalp", label: "Scalp massage 5 min", icon: "scissors", xp: 5, tier: "hair" },
    { id: "styling", label: "Intentional hair styling", icon: "scissors", xp: 5, tier: "hair" },

    // SLEEP — fixed wake time is the remaining lever
    { id: "wakeTime", label: "Fixed wake time hit (±30m)", icon: "sun", xp: 10, tier: "sleep" },
    { id: "morningSun", label: "10 min morning sunlight", icon: "sun", xp: 10, tier: "sleep" },
    { id: "screensOff", label: "Screens off 60 min pre-bed", icon: "moon", xp: 10, tier: "sleep" },
  ],

  weeklyGoals: [
    { id: "posture3x", label: "Posture circuit 3x", target: 3, icon: "activity", xp: 50 },
    { id: "gym4x", label: "Gym sessions 4x", target: 4, icon: "dumbbell", xp: 50 },
    { id: "pull2x", label: "Pull day 2x (continue the win)", target: 2, icon: "dumbbell", xp: 30 },
    { id: "weighIn", label: "Weekly weigh-in", target: 1, icon: "trending", xp: 20 },
    { id: "photo", label: "Progress photo", target: 1, icon: "eye", xp: 20 },
    { id: "gainHalfLb", label: "Weight up 0.5+ lb this week", target: 1, icon: "trending", xp: 40 },
  ],

  oneTimeQuests: [
    { id: "brows-pro", label: "Professional eyebrow threading", xp: 80, done: false, priority: 1,
      notes: "Your DIY cleanup has helped. One pro session sets the arch properly. 20 min, $15-20." },
    { id: "ortho", label: "Orthodontist consult — MSE palate expansion", xp: 150, done: false, priority: 1,
      notes: "Ask: 'Is my palatal suture still amenable to MSE at 21?' This is the only structural jaw lever." },
    { id: "hims", label: "Start Hims (Fin + Min + Biotin)", xp: 80, done: false, priority: 2,
      notes: "Transition from topical Minoxidil. Hairline is stable — now solidify it with DHT blocker." },
    { id: "saltspray", label: "Buy salt spray · execute styling routine", xp: 30, done: false, priority: 2,
      notes: "Your wave is expressing well naturally. Salt spray + scrunch + air dry = Morra finish." },
    { id: "whoop", label: "Decide on WHOOP", xp: 30, done: false, priority: 3,
      notes: "Nice-to-have. Sleep is already anchored by tape + expander; WHOOP is optimization, not core." },
    { id: "masticGum", label: "Start mastic gum · 15 min daily", xp: 40, done: false, priority: 2,
      notes: "Falim brand. Real jaw load. Supports masseter + long-term remodeling." },
  ],

  todayLog: {},
  weekLog: {},

  checkIns: [
    {
      date: "2026-03-21",
      weight: 145,
      notes: "Baseline. Post-Ramadan. FHP, rounded shoulders, APT, rib flare. Narrow palate confirmed.",
      wins: ["Protocol initialized", "3 years training foundation", "Creatine restarted"],
      gaps: ["Maintenance eating", "No SPF", "Brows unshaped", "No palate intervention"],
    },
    {
      date: "2026-04-19",
      weight: 145,
      notes: "30-day. Back development is the standout — lats, rear delts, teres visible. Posture shoulders-back trending. SPF + mouth tape + nose expander all locked. Brows cleaner than baseline. Hair wave expressing naturally. WEIGHT UNCHANGED = calories still the bottleneck.",
      wins: [
        "Back development visible",
        "SPF daily · locked in",
        "Mouth tape + nose expander · locked in",
        "Skin calmer and more even",
        "Hair wave natural · close to target aesthetic",
        "Posture measurably better",
      ],
      gaps: [
        "Weight stuck at 145 · not in surplus",
        "Chest/shoulder mass lagging vs back",
        "No professional brow session yet",
        "Fixed wake time not anchored",
        "No palate consult booked",
      ],
    },
  ],

  syncs: [],
};

const ICONS: Record<string, LucideIcon> = {
  droplet: Droplet, target: Target, flame: Flame, sun: Sun, activity: Activity,
  moon: Moon, eye: Eye, scissors: Scissors, dumbbell: Dumbbell, trending: TrendingUp,
  zap: Zap, trophy: Trophy,
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
const levelFromXp = (xp: number) => {
  let lvl = 1;
  while (xp >= xpForLevel(lvl)) lvl++;
  return lvl;
};

// Merge loaded state with defaults so new habits added in code show up for existing users
const mergeWithDefaults = (loaded: Partial<State>): State => ({
  ...DEFAULT_STATE,
  ...loaded,
  schemaVersion: SCHEMA_VERSION,
  dailyHabits: DEFAULT_STATE.dailyHabits,
  weeklyGoals: DEFAULT_STATE.weeklyGoals,
  oneTimeQuests: (DEFAULT_STATE.oneTimeQuests.map(dq => {
    const match = loaded.oneTimeQuests?.find(q => q.id === dq.id);
    return match ? { ...dq, done: match.done } : dq;
  })),
  lockedIn: DEFAULT_STATE.lockedIn,
});

export default function AryaApp() {
  const [state, setState] = useState<State>(DEFAULT_STATE);
  const [activeTab, setActiveTab] = useState("today");
  const [loaded, setLoaded] = useState(false);
  const [toast, setToast] = useState<{ msg: string; kind?: string } | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setState(mergeWithDefaults(parsed));
      }
    } catch {}
    setLoaded(true);
  }, []);

  const saveState = useCallback((next: State) => {
    setState(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
  }, []);

  const showToast = (msg: string, kind = "success") => {
    setToast({ msg, kind });
    setTimeout(() => setToast(null), 2200);
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
      const y = new Date();
      y.setDate(y.getDate() - 1);
      const ykey = y.toISOString().split("T")[0];
      if (streak.lastCheckIn === ykey) streak.current += 1;
      else streak.current = 1;
      streak.lastCheckIn = tk;
      streak.longest = Math.max(streak.longest, streak.current);
    }

    if (!wasDone) showToast(`+${habit.xp} XP · ${habit.label}`);

    saveState({
      ...state,
      todayLog,
      xp: { total: newTotal, level: levelFromXp(newTotal) },
      streak,
    });
  };

  const toggleWeekly = (goalId: string) => {
    const wk = weekKey();
    const weekLog = { ...state.weekLog };
    if (!weekLog[wk]) weekLog[wk] = {};
    weekLog[wk][goalId] = (weekLog[wk][goalId] || 0) + 1;
    const goal = state.weeklyGoals.find(g => g.id === goalId)!;
    const justComplete = weekLog[wk][goalId] === goal.target;
    const xpDelta = justComplete ? goal.xp : 5;
    saveState({
      ...state,
      weekLog,
      xp: { total: state.xp.total + xpDelta, level: levelFromXp(state.xp.total + xpDelta) },
    });
    showToast(justComplete ? `GOAL COMPLETE · +${goal.xp} XP` : `+5 XP logged`);
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
    saveState({
      ...state,
      oneTimeQuests: quests,
      xp: { total: state.xp.total + quest.xp, level: levelFromXp(state.xp.total + quest.xp) },
    });
    showToast(`QUEST COMPLETE · +${quest.xp} XP`);
  };

  const addCheckIn = (weight: string, notes: string) => {
    const newCheckIn: CheckIn = {
      date: todayKey(),
      weight: parseFloat(weight) || state.user.weight,
      notes,
      wins: [], gaps: [],
    };
    saveState({
      ...state,
      user: { ...state.user, weight: parseFloat(weight) || state.user.weight },
      checkIns: [...state.checkIns, newCheckIn],
      xp: { total: state.xp.total + 100, level: levelFromXp(state.xp.total + 100) },
    });
    showToast("+100 XP · Check-in logged");
  };

  // ============ SYNC EXPORT — downloads a real file ============
  const exportForSync = () => {
    const payload = {
      ...state,
      syncs: [...(state.syncs || []), { date: new Date().toISOString(), note: "Exported for Claude sync" }],
    };
    saveState(payload);

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date().toISOString().split("T")[0];
    a.href = url;
    a.download = `arya_sync_${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("Sync file downloaded");
  };

  const importJSON = () => {
    try {
      const parsed = JSON.parse(importText);
      saveState(mergeWithDefaults(parsed));
      setShowImport(false);
      setImportText("");
      showToast("State imported");
    } catch {
      showToast("Invalid JSON", "error");
    }
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
  const level = levelFromXp(state.xp.total);
  const xpInLevel = state.xp.total - xpForLevel(level - 1);
  const xpToNext = xpForLevel(level) - xpForLevel(level - 1);
  const levelProgress = (xpInLevel / xpToNext) * 100;

  const pendingQuests = state.oneTimeQuests.filter(q => !q.done).sort((a, b) => a.priority - b.priority);
  const latestCheckIn = state.checkIns[state.checkIns.length - 1];

  return (
    <div className="min-h-screen bg-black text-white" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
      <style jsx global>{`
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes toast-in { from { transform: translate(-50%, 20px); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }
        .grain { background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.12'/%3E%3C/svg%3E"); }
        .serif-display { font-family: 'Didot', 'Bodoni 72', 'Bodoni MT', Georgia, serif; font-weight: 400; letter-spacing: -0.02em; }
        .mono { font-family: 'SF Mono', 'Menlo', monospace; }
        .hover-lift { transition: transform 0.2s ease, border-color 0.2s ease, background-color 0.2s ease; }
        .hover-lift:active { transform: scale(0.98); }
        .slide-up { animation: slideUp 0.4s ease-out backwards; }
        .tick-anim { transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
      `}</style>

      <div className="fixed inset-0 grain pointer-events-none opacity-40 z-50" />

      {toast && (
        <div
          className="fixed top-6 left-1/2 z-[60] px-5 py-3 rounded-sm border backdrop-blur-md text-xs tracking-wider uppercase"
          style={{
            animation: "toast-in 0.3s ease",
            backgroundColor: toast.kind === "error" ? "rgba(80,0,0,0.9)" : "rgba(20,20,20,0.95)",
            borderColor: toast.kind === "error" ? "rgba(255,100,100,0.3)" : "rgba(255,255,255,0.15)",
            transform: "translateX(-50%)",
          }}
        >
          {toast.msg}
        </div>
      )}

      <div className="max-w-2xl mx-auto px-5 pb-32 pt-6">
        <header className="mb-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="text-[10px] tracking-[0.4em] text-white/40 uppercase mb-1">Project</div>
              <h1 className="serif-display text-5xl">ARYA</h1>
              <div className="text-[10px] tracking-[0.3em] text-white/30 uppercase mt-1">v4 · Optimization Agent</div>
            </div>
            <div className="flex gap-2">
              <button onClick={exportForSync} className="p-2 border border-white/10 rounded-sm hover-lift hover:border-white/30" title="Export for Claude sync">
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
                <div className="h-full bg-white/80" style={{ width: `${levelProgress}%` }} />
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
            { id: "quests", label: "Quests" },
            { id: "workout", label: "Training" },
            { id: "progress", label: "Progress" },
            { id: "locked", label: "Locked In" },
            { id: "playbook", label: "Playbook" },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-4 py-3 text-[10px] tracking-[0.3em] uppercase whitespace-nowrap transition-colors ${
                activeTab === t.id ? "text-white border-b border-white -mb-px" : "text-white/40 hover:text-white/70"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>

        {/* ============= TODAY ============= */}
        {activeTab === "today" && (
          <div className="space-y-6">
            <div className="slide-up">
              <div className="flex items-end justify-between mb-4">
                <div>
                  <div className="text-[10px] tracking-[0.3em] text-white/40 uppercase">Daily Build</div>
                  <h2 className="serif-display text-3xl mt-1">{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</h2>
                </div>
                <div className="text-right">
                  <div className="serif-display text-3xl">{todayCompleted}<span className="text-white/30">/{todayTotal}</span></div>
                  <div className="text-[9px] tracking-[0.3em] text-white/40 uppercase">Complete</div>
                </div>
              </div>
              <div className="h-[2px] bg-white/5 overflow-hidden">
                <div className="h-full bg-white transition-all duration-500" style={{ width: `${(todayCompleted / todayTotal) * 100}%` }} />
              </div>
              <p className="text-[11px] text-white/40 mt-3 leading-relaxed">
                You already have {state.lockedIn.length} habits locked in. These are the active builds — focus here.
              </p>
            </div>

            {(["core", "posture", "skin", "hair", "sleep"] as HabitTier[]).map((tier, tIdx) => {
              const habits = state.dailyHabits.filter(h => h.tier === tier);
              if (habits.length === 0) return null;
              const tierCompleted = habits.filter(h => state.todayLog?.[tk]?.[h.id]).length;
              const tierLabels: Record<HabitTier, string> = {
                core: "Core · Fuel & Mass · PRIMARY BOTTLENECK",
                posture: "Posture · Daily Reinforcement",
                skin: "Skin · Active Routine",
                hair: "Hair · Styling Build",
                sleep: "Sleep · Anchor the Wake Time",
              };

              return (
                <div key={tier} className="slide-up" style={{ animationDelay: `${tIdx * 0.05}s` }}>
                  <div className="flex items-baseline justify-between mb-3">
                    <div className={`text-[10px] tracking-[0.3em] uppercase ${tier === "core" ? "text-white" : "text-white/50"}`}>{tierLabels[tier]}</div>
                    <div className="mono text-[9px] text-white/30">{tierCompleted}/{habits.length}</div>
                  </div>
                  <div className="space-y-2">
                    {habits.map(h => {
                      const done = state.todayLog?.[tk]?.[h.id];
                      const Icon = ICONS[h.icon] || Check;
                      return (
                        <button
                          key={h.id}
                          onClick={() => toggleHabit(h.id)}
                          className={`w-full flex items-center gap-4 px-4 py-3 border hover-lift text-left ${
                            done
                              ? "bg-white text-black border-white"
                              : "bg-black border-white/10 hover:border-white/30"
                          }`}
                        >
                          <div className={`w-5 h-5 border tick-anim flex items-center justify-center ${done ? "bg-black border-black" : "border-white/30"}`}>
                            {done && <Check size={12} className="text-white" strokeWidth={3} />}
                          </div>
                          <Icon size={14} className={done ? "text-black/60" : "text-white/50"} />
                          <div className={`flex-1 text-sm ${done ? "line-through opacity-60" : ""}`}>{h.label}</div>
                          <div className={`mono text-[10px] ${done ? "text-black/50" : "text-white/30"}`}>+{h.xp}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ============= WEEK ============= */}
        {activeTab === "week" && (
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
                    <div className="serif-display text-2xl">
                      {count}<span className="text-white/30">/{g.target}</span>
                    </div>
                  </div>
                  <div className="h-[2px] bg-white/5 mb-3 overflow-hidden">
                    <div className="h-full bg-white transition-all duration-500" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => toggleWeekly(g.id)} className="flex-1 py-2 border border-white/20 text-[10px] tracking-[0.3em] uppercase hover:bg-white hover:text-black transition-colors">
                      + Log
                    </button>
                    {count > 0 && (
                      <button onClick={() => decrementWeekly(g.id)} className="px-3 py-2 border border-white/10 text-[10px] text-white/40 hover:text-white/70">−</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ============= QUESTS ============= */}
        {activeTab === "quests" && (
          <div className="space-y-6">
            <div>
              <div className="text-[10px] tracking-[0.3em] text-white/40 uppercase">One-Time</div>
              <h2 className="serif-display text-3xl mt-1">Quests</h2>
              <p className="text-xs text-white/50 mt-2 leading-relaxed">
                Single-action unlocks. Priority 1 items have 30 days of overdue weight on them — book them this week.
              </p>
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
                    <button onClick={() => completeQuest(q.id)} className="w-full py-2 border border-white/30 text-[10px] tracking-[0.3em] uppercase hover:bg-white hover:text-black transition-colors">
                      Mark Complete
                    </button>
                  </div>
                ))}
              </div>
            )}

            {state.oneTimeQuests.some(q => q.done) && (
              <div>
                <div className="text-[10px] tracking-[0.3em] text-white/40 uppercase mb-3">Completed</div>
                <div className="space-y-2">
                  {state.oneTimeQuests.filter(q => q.done).map(q => (
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
        )}

        {/* ============= WORKOUT ============= */}
        {activeTab === "workout" && (
          <div className="space-y-8">
            <div>
              <div className="text-[10px] tracking-[0.3em] text-white/40 uppercase">Training</div>
              <h2 className="serif-display text-3xl mt-1">Workout Plan</h2>
              <p className="text-xs text-white/50 mt-2 leading-relaxed">
                Back is developing well. Emphasis shifts to chest/shoulder thickness while preserving pull frequency.
              </p>
            </div>

            <section className="border border-white/10 p-5">
              <div className="flex items-baseline justify-between mb-4">
                <h3 className="serif-display text-xl">Posture Circuit</h3>
                <div className="text-[10px] tracking-[0.3em] text-white/40 uppercase">3x/wk · 30 min</div>
              </div>
              <div className="space-y-4 text-sm">
                {[
                  { block: "Mobility · 0–7 min", items: ["90/90 breathing · 3 × 5 breaths", "Thoracic extension over foam roller · 2 min", "Doorway chest stretch · 2 × 30 sec"] },
                  { block: "Activation · 7–16 min", items: ["Chin tucks · 3 × 12 (5 sec hold)", "Wall angels · 3 × 10", "Prone Y-T-W · 3 × 10 each"] },
                  { block: "Loaded · 16–24 min", items: ["Face pulls · 4 × 15", "Band pull-aparts · 4 × 12", "Glute bridges · 3 × 15"] },
                  { block: "Canister · 24–30 min", items: ["Dead bug · 3 × 8/side", "Hollow body hold · 3 × 25 sec", "Hip flexor stretch · 2 × 45 sec/side"] },
                ].map((b, i) => (
                  <div key={i} className="border-l border-white/20 pl-4">
                    <div className="text-[10px] tracking-[0.3em] text-white/40 uppercase mb-2">{b.block}</div>
                    <ul className="space-y-1 text-white/80">
                      {b.items.map((it, j) => <li key={j} className="text-xs">· {it}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
            </section>

            <section className="border border-white/10 p-5">
              <div className="flex items-baseline justify-between mb-4">
                <h3 className="serif-display text-xl">Push / Pull / Legs</h3>
                <div className="text-[10px] tracking-[0.3em] text-white/40 uppercase">4× / week</div>
              </div>
              <p className="text-xs text-white/50 mb-5 leading-relaxed">
                New emphasis: incline pressing + lateral volume to catch chest/shoulders up to back development. Every session opens with 3 min 90/90 + thoracic ext. Eat in surplus on training days.
              </p>
              <div className="space-y-4">
                {[
                  { day: "Pull A · Width", items: ["Lat pulldown · 4 × 8–10", "Chest-supported row · 4 × 10", "Face pulls · 4 × 15", "Rear delt fly · 3 × 12–15", "Hammer curl · 3 × 10", "Shrugs · 3 × 12"] },
                  { day: "Push · Thickness (UPGRADED)", items: ["Incline DB press · 5 × 8 (progressive load)", "Flat DB press · 4 × 10", "Lateral raises · 5 × 12–15 (widow-maker set last)", "Cable fly · 4 × 12", "Overhead tricep · 3 × 10", "Rear delt fly · 3 × 15"] },
                  { day: "Legs", items: ["Squat or leg press · 4 × 8", "RDL · 4 × 8–10", "Walking lunge · 3 × 10/side", "Leg curl · 3 × 12", "Standing calf · 4 × 12"] },
                  { day: "Pull B · Density", items: ["Weighted chin-ups · 4 × 6–8", "Barbell row · 4 × 8", "Rack pulls · 3 × 5", "Y-T-W (plates) · 3 × 8/pos", "Farmer carry · 3 × 40m", "Preacher curl · 3 × 10"] },
                ].map((d, i) => (
                  <div key={i} className="border-l border-white/20 pl-4">
                    <div className={`text-[10px] tracking-[0.3em] uppercase mb-2 ${d.day.includes("UPGRADED") ? "text-white" : "text-white/60"}`}>{d.day}</div>
                    <ul className="space-y-1 text-white/70">
                      {d.items.map((it, j) => <li key={j} className="text-xs">· {it}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* ============= PROGRESS ============= */}
        {activeTab === "progress" && (
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
                    <ul className="space-y-1">
                      {latestCheckIn.wins.map((w, i) => <li key={i} className="text-xs text-white/70">✓ {w}</li>)}
                    </ul>
                  </div>
                )}
                {latestCheckIn.gaps?.length > 0 && (
                  <div>
                    <div className="text-[10px] tracking-[0.3em] text-red-400/60 uppercase mb-2">Gaps</div>
                    <ul className="space-y-1">
                      {latestCheckIn.gaps.map((g, i) => <li key={i} className="text-xs text-white/70">△ {g}</li>)}
                    </ul>
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
        )}

        {/* ============= LOCKED IN ============= */}
        {activeTab === "locked" && (
          <div className="space-y-6">
            <div>
              <div className="text-[10px] tracking-[0.3em] text-white/40 uppercase">Autopilot</div>
              <h2 className="serif-display text-3xl mt-1">Locked In</h2>
              <p className="text-xs text-white/50 mt-2 leading-relaxed">
                Habits you've executed long enough that they no longer need daily reinforcement. These stay in the background — protocol assumes they're happening.
              </p>
            </div>
            <div className="space-y-2">
              {state.lockedIn.map((h, i) => (
                <div key={h.id} className="flex items-center gap-3 px-4 py-3 border border-white/10 bg-white/[0.02] slide-up" style={{ animationDelay: `${i * 0.03}s` }}>
                  <div className="w-5 h-5 border border-white/60 bg-white/60 flex items-center justify-center">
                    <Check size={12} className="text-black" strokeWidth={3} />
                  </div>
                  <div className="flex-1 text-sm text-white/80">{h.label}</div>
                  <div className="mono text-[9px] text-white/40">since {h.since}</div>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-white/40 leading-relaxed italic">
              Add to this list when something has been daily-consistent for 30+ days. Remove from the Today checklist to declutter.
            </p>
          </div>
        )}

        {/* ============= PLAYBOOK ============= */}
        {activeTab === "playbook" && (
          <div className="space-y-6">
            <div>
              <div className="text-[10px] tracking-[0.3em] text-white/40 uppercase">Reference</div>
              <h2 className="serif-display text-3xl mt-1">The Playbook</h2>
            </div>

            {[
              { title: "Current Bottleneck", body: "Weight. 145 stuck = not eating for growth. Back grew because you trained it. Chest/shoulder mass won't follow until calories do. Target: 151 lb by May 19. That's +350 cal/day. One extra meal or two shakes." },
              { title: "North Star", body: "Not to become someone else. The sharpest Arman. References: Bateman (grooming), Bruce Wayne (mass), Salvatore (eye area), Morra (hair)." },
              { title: "What's Working", body: "Back development. SPF adherence (skin visibly calmer). Mouth tape + nose expander (breathing locked). Posture shoulders-back. Hair wave expressing naturally. Brow cleanup trending right." },
              { title: "What's Overdue", body: "Professional brow thread (30 days overdue). Orthodontist consult — MSE palate assessment. Fixed wake time anchor. Surplus eating." },
              { title: "Brow Protocol", body: "Your DIY cleanup has brought them 70% of the way. A pro thread is the last 30%. Instructions: 'Masculine and natural. Clean between. Slight arch on outer tail. Do not touch the top.'" },
              { title: "Hair", body: "Status: close to target. Natural wave expressing. Length correct. Transition to Hims now (Fin + Min + Biotin) while hairline is stable. Salt spray + scrunch + air dry is the Morra finish." },
              { title: "Skin", body: "EltaMD SPF 50 locked · daily. AM: cleanser → Vit C → moisturizer → SPF. PM: cleanser → Niacinamide or salicylic → moisturizer → eye serum. Retinol in 8+ weeks." },
              { title: "Jaw & Face", body: "Tongue on palate 24/7 · confirmed. Nasal breathing locked via tape + expander. Next: mastic gum daily + ortho consult for MSE. Face won't fill until weight moves." },
              { title: "Physique Math", body: "TDEE ~2,400. Target 2,700–2,900. Protein 160g. The question is no longer 'what to eat' — it's 'did I eat the 3rd meal today?' Two meals = maintenance. Three meals = growth." },
              { title: "Sleep", body: "Tape + expander = breathing anchored. Next lever: fixed wake time ±30 min including weekends. 10 min morning sunlight within 30 min of waking. Screens off 60 min pre-bed." },
            ].map((s, i) => (
              <section key={i} className="border-l border-white/20 pl-5 slide-up" style={{ animationDelay: `${i * 0.04}s` }}>
                <div className="text-[10px] tracking-[0.3em] text-white/40 uppercase mb-2">{String(i + 1).padStart(2, "0")}</div>
                <h3 className="serif-display text-xl mb-2">{s.title}</h3>
                <p className="text-sm text-white/60 leading-relaxed">{s.body}</p>
              </section>
            ))}
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-black border-t border-white/10 p-3 backdrop-blur-md" style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}>
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
            <p className="text-xs text-white/60 mb-4">Paste JSON from a previous export to restore.</p>
            <textarea
              value={importText}
              onChange={e => setImportText(e.target.value)}
              placeholder="Paste JSON here..."
              className="w-full h-48 bg-white/5 border border-white/10 p-3 text-[10px] mono text-white/70 resize-none"
            />
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

function CheckInForm({ onSubmit, currentWeight }: { onSubmit: (w: string, n: string) => void; currentWeight: number }) {
  const [weight, setWeight] = useState("");
  const [notes, setNotes] = useState("");
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full py-4 border border-white/20 hover:border-white/40 text-[10px] tracking-[0.3em] uppercase flex items-center justify-center gap-2 hover-lift"
      >
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
          <input
            type="number"
            step="0.1"
            value={weight}
            onChange={e => setWeight(e.target.value)}
            placeholder={String(currentWeight)}
            className="w-full bg-transparent border border-white/10 px-3 py-2 text-sm mono focus:border-white/30 outline-none"
          />
        </div>
        <div>
          <label className="text-[10px] tracking-[0.3em] text-white/40 uppercase block mb-1.5">Notes</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="What's working, what's not..."
            className="w-full bg-transparent border border-white/10 px-3 py-2 text-sm h-24 resize-none focus:border-white/30 outline-none"
          />
        </div>
        <div className="flex gap-2 pt-2">
          <button onClick={() => setOpen(false)} className="flex-1 py-2 border border-white/10 text-[10px] tracking-[0.3em] uppercase hover:border-white/30">Cancel</button>
          <button
            onClick={() => { onSubmit(weight, notes); setOpen(false); setWeight(""); setNotes(""); }}
            className="flex-1 py-2 border border-white/30 text-[10px] tracking-[0.3em] uppercase hover:bg-white hover:text-black"
          >
            Submit · +100 XP
          </button>
        </div>
      </div>
    </section>
  );
}
