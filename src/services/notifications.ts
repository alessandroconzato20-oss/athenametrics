import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { supabase } from "@/integrations/supabase/client";
import { fetchTodaysWakeInfo } from "@/services/healthkit";
import { format } from "date-fns";

// ── Quiet hours & limits ──
const QUIET_START_HOUR = 22; // 22:30+
const QUIET_START_MIN = 30;
const QUIET_END_HOUR = 7;    // before 07:30
const QUIET_END_MIN = 30;
const MAX_PER_DAY = 3;
const MIN_GAP_MINUTES = 90;

const STORAGE_KEY = "cofactor_notif_log_v1";
const VARIANT_ROTATION_KEY = "cofactor_notif_variant_idx";

type ScheduledLog = {
  date: string;        // yyyy-MM-dd
  scheduledAt: number; // epoch ms when fire is planned
  kind: string;
};

type MorningVariant = {
  id: number;
  title: string;
  body: string;
  actionTypeId?: string;
  extra?: Record<string, any>;
};

// ── Storage helpers ──
function loadLog(): ScheduledLog[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}
function saveLog(log: ScheduledLog[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(log.slice(-30)));
}

// ── Quiet-hour helpers ──
function isWithinQuietHours(d: Date): boolean {
  const mins = d.getHours() * 60 + d.getMinutes();
  const quietStart = QUIET_START_HOUR * 60 + QUIET_START_MIN; // 22:30 = 1350
  const quietEnd = QUIET_END_HOUR * 60 + QUIET_END_MIN;       // 07:30 = 450
  // Quiet window wraps midnight: mins >= 1350 OR mins < 450
  return mins >= quietStart || mins < quietEnd;
}

function clampOutOfQuietHours(d: Date): Date | null {
  // If inside quiet hours, push to 07:30 same/next morning
  if (!isWithinQuietHours(d)) return d;
  const out = new Date(d);
  if (out.getHours() >= QUIET_START_HOUR || (out.getHours() === QUIET_START_HOUR && out.getMinutes() >= QUIET_START_MIN)) {
    out.setDate(out.getDate() + 1);
  }
  out.setHours(QUIET_END_HOUR, QUIET_END_MIN, 0, 0);
  return out;
}

// ── Limit checks ──
function canSchedule(at: Date, log: ScheduledLog[]): boolean {
  const day = format(at, "yyyy-MM-dd");
  const today = log.filter(l => l.date === day);
  if (today.length >= MAX_PER_DAY) return false;
  const t = at.getTime();
  for (const l of log) {
    if (Math.abs(l.scheduledAt - t) < MIN_GAP_MINUTES * 60 * 1000) return false;
  }
  return true;
}

// ── Variant selection ──
async function getStreakDays(userId: string): Promise<number> {
  const { data } = await supabase
    .from("study_logs")
    .select("studied_at")
    .eq("user_id", userId)
    .order("studied_at", { ascending: false })
    .limit(60);
  if (!data?.length) return 0;
  const days = [...new Set(data.map(d => format(new Date(d.studied_at), "yyyy-MM-dd")))].sort().reverse();
  if (!days.length) return 0;
  const today = format(new Date(), "yyyy-MM-dd");
  const yest = format(new Date(Date.now() - 86400000), "yyyy-MM-dd");
  if (days[0] !== today && days[0] !== yest) return 0;
  let n = 1;
  for (let i = 1; i < days.length; i++) {
    const diff = (new Date(days[i - 1]).getTime() - new Date(days[i]).getTime()) / 86400000;
    if (diff === 1) n++;
    else break;
  }
  return n;
}

async function getAvgSleepHours(userId: string): Promise<number | null> {
  const { data } = await (supabase
    .from("biometric_snapshots" as any)
    .select("data,recorded_at")
    .eq("user_id", userId)
    .eq("snapshot_type", "sleep")
    .order("recorded_at", { ascending: false })
    .limit(14) as any);
  if (!data?.length) return null;
  const hrs = data
    .map((d: any) => Number(d.data?.sleep_duration_hours))
    .filter((n: number) => Number.isFinite(n) && n > 0);
  if (!hrs.length) return null;
  return hrs.reduce((a: number, b: number) => a + b, 0) / hrs.length;
}

async function pickMorningVariant(userId: string, sleepHours: number): Promise<MorningVariant> {
  const streak = await getStreakDays(userId);
  const avgSleep = await getAvgSleepHours(userId);

  // Variant 4 — streak from day 4
  if (streak >= 4) {
    return {
      id: 4,
      title: `🔥 ${streak}-day streak`,
      body: `You've checked in ${streak} days in a row. Your algorithm is getting sharper every day.`,
      extra: { variant: 4, openTo: "checkin" },
    };
  }

  // Variant 2 — sleep above average
  if (avgSleep && sleepHours > avgSleep + 0.3 && sleepHours > 0) {
    return {
      id: 2,
      title: "Strong night of rest",
      body: `Last night you got ${sleepHours}h of sleep with strong rest. Your retention outlook is looking good. Log your morning to see your best study window.`,
      extra: { variant: 2, openTo: "window" },
    };
  }

  // Variant 3 — interactive (every other rotation)
  const idx = Number(localStorage.getItem(VARIANT_ROTATION_KEY) || "0");
  localStorage.setItem(VARIANT_ROTATION_KEY, String(idx + 1));
  if (idx % 2 === 1) {
    return {
      id: 3,
      title: "5-second check-in",
      body: "How are you feeling right now?",
      actionTypeId: "MORNING_QUICK_CHECKIN",
      extra: { variant: 3, openTo: "checkin", quickReply: true },
    };
  }

  // Variant 1 — default
  return {
    id: 1,
    title: "Good morning ☀️",
    body: "Your brain is warming up. How are you feeling this morning, honestly?",
    extra: { variant: 1, openTo: "checkin" },
  };
}

// ── Public API ──
export async function ensureNotificationPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const status = await LocalNotifications.checkPermissions();
    if (status.display === "granted") return true;
    const req = await LocalNotifications.requestPermissions();
    return req.display === "granted";
  } catch (e) {
    console.error("Notification permission failed:", e);
    return false;
  }
}

async function registerActionTypes() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await LocalNotifications.registerActionTypes({
      types: [
        {
          id: "MORNING_QUICK_CHECKIN",
          actions: [
            { id: "calm", title: "Calm" },
            { id: "okay", title: "Okay" },
            { id: "stressed", title: "Stressed" },
          ],
        },
        {
          id: "AFTERNOON_LOW_MOTIVATION",
          actions: [
            { id: "try_20", title: "Try 20 minutes" },
            { id: "not_today", title: "Not today" },
          ],
        },
        {
          id: "EVENING_FACTORS",
          actions: [
            { id: "alcohol", title: "Alcohol" },
            { id: "late_caffeine", title: "Late caffeine" },
            { id: "screens", title: "Screens in bed" },
            { id: "nothing", title: "Nothing" },
          ],
        },
        {
          id: "EVENING_OVERWHELM",
          actions: [
            { id: "ow_low", title: "Not much" },
            { id: "ow_mid", title: "Somewhat" },
            { id: "ow_high", title: "A lot" },
          ],
        },
      ],
    });
  } catch (e) {
    console.warn("registerActionTypes failed:", e);
  }
}

// ──────────────────────────────────────────────────────────────
// Shared helpers for the new schedulers
// ──────────────────────────────────────────────────────────────

function timeStringToTodayDate(hhmm: string): Date | null {
  const m = /^(\d{1,2}):(\d{2})/.exec(hhmm.trim());
  if (!m) return null;
  const d = new Date();
  d.setHours(parseInt(m[1], 10), parseInt(m[2], 10), 0, 0);
  return d;
}

interface TodayContext {
  checkin: {
    rest_level: number | null;
    stress_level: number | null;
    motivation_level: number | null;
    study_plan_window: string | null;
  } | null;
  cognitiveReadinessThisMorning: number | null;
  primaryEnd: string | null;       // "HH:MM"
  secondaryStart: string | null;   // "HH:MM"
  isNightOwl: boolean;
  totalStudyMinutesToday: number;
  avgStudyMinutes7d: number;
  typicalSleepOnsetHHMM: string | null;
}

async function loadTodayContext(userId: string): Promise<TodayContext> {
  const today = format(new Date(), "yyyy-MM-dd");

  // Today's wellbeing check-in (if any)
  const { data: ci } = await (supabase
    .from("daily_wellbeing_checkins" as any)
    .select("rest_level,stress_level,motivation_level,study_plan_window")
    .eq("user_id", userId)
    .eq("checkin_date", today)
    .maybeSingle() as any);

  // Today's cognitive readiness (already computed and saved in Index.tsx)
  const { data: ds } = await supabase
    .from("daily_scores")
    .select("cognitive_readiness")
    .eq("user_id", userId)
    .eq("score_date", today)
    .maybeSingle();

  // Today's study minutes
  const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
  const { data: logsToday } = await supabase
    .from("study_logs")
    .select("duration_minutes")
    .eq("user_id", userId)
    .gte("studied_at", startOfDay.toISOString());
  const totalStudyMinutesToday = (logsToday || []).reduce((s, r: any) => s + (r.duration_minutes || 0), 0);

  // 7-day average study minutes
  const sevenAgo = new Date(Date.now() - 7 * 86400000);
  const { data: logs7d } = await supabase
    .from("study_logs")
    .select("duration_minutes,studied_at")
    .eq("user_id", userId)
    .gte("studied_at", sevenAgo.toISOString());
  const byDay: Record<string, number> = {};
  for (const r of (logs7d || []) as any[]) {
    const k = format(new Date(r.studied_at), "yyyy-MM-dd");
    byDay[k] = (byDay[k] || 0) + (r.duration_minutes || 0);
  }
  const dayTotals = Object.values(byDay);
  const avgStudyMinutes7d = dayTotals.length
    ? dayTotals.reduce((a, b) => a + b, 0) / dayTotals.length
    : 0;

  // Peak windows + chronotype: pull from latest biometric snapshot if available,
  // otherwise we leave nulls and the schedulers will skip the windowed parts.
  const { data: snap } = await (supabase
    .from("biometric_snapshots" as any)
    .select("data")
    .eq("user_id", userId)
    .eq("snapshot_type", "peak_window")
    .order("recorded_at", { ascending: false })
    .limit(1)
    .maybeSingle() as any);

  const primaryEnd = snap?.data?.primary_end ?? null;
  const secondaryStart = snap?.data?.secondary_start ?? null;
  const isNightOwl = snap?.data?.chronotype === "night_owl";
  const typicalSleepOnsetHHMM = snap?.data?.typical_sleep_onset ?? null;

  return {
    checkin: ci ?? null,
    cognitiveReadinessThisMorning: ds?.cognitive_readiness ?? null,
    primaryEnd,
    secondaryStart,
    isNightOwl,
    totalStudyMinutesToday,
    avgStudyMinutes7d,
    typicalSleepOnsetHHMM,
  };
}

function pickRotation(key: string, modulo: number): number {
  const idx = Number(localStorage.getItem(key) || "0");
  localStorage.setItem(key, String(idx + 1));
  return idx % modulo;
}

async function trySchedule(opts: {
  kind: string;
  fireAt: Date;
  title: string;
  body: string;
  actionTypeId?: string;
  extra?: Record<string, any>;
  oncePerDay?: boolean;
}): Promise<boolean> {
  const log = loadLog();
  const day = format(opts.fireAt, "yyyy-MM-dd");

  if (opts.oncePerDay !== false && log.some(l => l.date === day && l.kind === opts.kind)) return false;
  if (opts.fireAt.getTime() < Date.now() + 60 * 1000) return false;
  if (isWithinQuietHours(opts.fireAt)) return false;
  if (!canSchedule(opts.fireAt, log)) return false;

  const notifId = Math.floor((Date.now() + Math.random() * 1000) / 1) % 2_000_000_000;

  // Cancel stale pending of same kind
  try {
    const pending = await LocalNotifications.getPending();
    const stale = pending.notifications
      .filter(n => n.extra?.kind === opts.kind)
      .map(n => ({ id: n.id }));
    if (stale.length) await LocalNotifications.cancel({ notifications: stale });
  } catch {}

  await LocalNotifications.schedule({
    notifications: [
      {
        id: notifId,
        title: opts.title,
        body: opts.body,
        schedule: { at: opts.fireAt, allowWhileIdle: true },
        actionTypeId: opts.actionTypeId,
        extra: { kind: opts.kind, ...(opts.extra || {}) },
      },
    ],
  });

  log.push({ date: day, scheduledAt: opts.fireAt.getTime(), kind: opts.kind });
  saveLog(log);
  console.log(`[notif] ${opts.kind} scheduled for ${opts.fireAt.toISOString()}`);
  return true;
}

// ──────────────────────────────────────────────────────────────
// 2. Midday nudge — fires 12:30–13:30 if no study yet & morning CR > 60.
//    Skip if user said "Not today" in Q1b.
// ──────────────────────────────────────────────────────────────
export async function scheduleMiddayNudge(userId: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  const granted = await ensureNotificationPermission();
  if (!granted) return;
  await registerActionTypes();

  const ctx = await loadTodayContext(userId);
  if (ctx.checkin?.study_plan_window === "not_today") return;
  if ((ctx.cognitiveReadinessThisMorning ?? 0) <= 60) return;
  if (ctx.totalStudyMinutesToday > 0) return;

  // Random fire time inside 12:30–13:30
  const fireAt = new Date();
  const minutesIntoWindow = 30 + Math.floor(Math.random() * 60);
  fireAt.setHours(12, 0, 0, 0);
  fireAt.setMinutes(minutesIntoWindow);

  // Variant choice
  const primaryEndDate = ctx.primaryEnd ? timeStringToTodayDate(ctx.primaryEnd) : null;
  const primaryHasPassed = primaryEndDate ? Date.now() > primaryEndDate.getTime() : false;
  const useNightOwlVariant = ctx.isNightOwl && primaryHasPassed && ctx.secondaryStart;

  const cr = ctx.cognitiveReadinessThisMorning ?? 0;
  const variant = useNightOwlVariant
    ? {
        id: 2,
        title: "Use this gap",
        body: `Even 20 minutes right now counts. Your secondary window opens at ${ctx.secondaryStart} — use this gap first.`,
        extra: { variant: 2, openTo: "log" },
      }
    : {
        id: 1,
        title: "Window's still open",
        body: `You haven't started yet and your readiness score was ${cr} this morning. That window doesn't last all day.`,
        extra: { variant: 1, openTo: "log" },
      };

  await trySchedule({
    kind: "midday_nudge",
    fireAt,
    title: variant.title,
    body: variant.body,
    extra: variant.extra,
  });
}

// ──────────────────────────────────────────────────────────────
// 3. Afternoon secondary peak — at secondary_start, only if today's
//    study < 60 min. Three rotating variants.
// ──────────────────────────────────────────────────────────────

// Caffeine cutoff = 6h before typical sleep onset (default 23:00 → 17:00)
function caffeineCutoffDate(typicalSleepOnsetHHMM: string | null): Date {
  const d = new Date();
  if (typicalSleepOnsetHHMM) {
    const parsed = timeStringToTodayDate(typicalSleepOnsetHHMM);
    if (parsed) {
      parsed.setHours(parsed.getHours() - 6);
      return parsed;
    }
  }
  d.setHours(17, 0, 0, 0);
  return d;
}

export async function scheduleAfternoonSecondaryPeak(userId: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  const granted = await ensureNotificationPermission();
  if (!granted) return;
  await registerActionTypes();

  const ctx = await loadTodayContext(userId);
  if (!ctx.secondaryStart) return;
  if (ctx.totalStudyMinutesToday >= 60) return;

  const fireAt = timeStringToTodayDate(ctx.secondaryStart);
  if (!fireAt) return;

  // Variant priority: low-motivation override → caffeine-cutoff override → default
  const motivation = ctx.checkin?.motivation_level ?? null;
  const cutoff = caffeineCutoffDate(ctx.typicalSleepOnsetHHMM);
  const withinCaffeineWindow = Math.abs(fireAt.getTime() - cutoff.getTime()) <= 2 * 60 * 60 * 1000;

  let title: string;
  let body: string;
  let actionTypeId: string | undefined;
  let extra: Record<string, any> = { openTo: "log" };

  if (motivation !== null && motivation <= 2) {
    title = "Low-stakes counts";
    body = "You said you weren't feeling motivated this morning. You don't need to feel ready — 20 minutes of low-stakes review still counts.";
    actionTypeId = "AFTERNOON_LOW_MOTIVATION";
    extra = { variant: "low_motivation", openTo: "log" };
  } else if (withinCaffeineWindow) {
    title = "Skip the caffeine";
    body = "Caffeine now will cut into your REM tonight. Your retention score tomorrow depends on clean sleep — study sharp instead.";
    extra = { variant: "caffeine_cutoff", openTo: "log" };
  } else {
    title = "Second peak is open";
    body = "Your second peak window opens now. This is your brain's natural afternoon surge.";
    extra = { variant: "default", openTo: "log" };
  }

  await trySchedule({
    kind: "afternoon_peak",
    fireAt,
    title,
    body,
    actionTypeId,
    extra,
  });
}

// ──────────────────────────────────────────────────────────────
// 4. Evening check-in — 60–90 min before typical sleep onset.
//    Three rotating variants (factors / great-day / overwhelm).
// ──────────────────────────────────────────────────────────────
export async function scheduleEveningCheckin(userId: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  const granted = await ensureNotificationPermission();
  if (!granted) return;
  await registerActionTypes();

  const ctx = await loadTodayContext(userId);

  // Anchor: typical sleep onset (default 23:00)
  const sleepOnset = ctx.typicalSleepOnsetHHMM
    ? timeStringToTodayDate(ctx.typicalSleepOnsetHHMM)
    : (() => { const d = new Date(); d.setHours(23, 0, 0, 0); return d; })();
  if (!sleepOnset) return;

  const offsetMin = 60 + Math.floor(Math.random() * 31); // 60–90
  const fireAt = new Date(sleepOnset.getTime() - offsetMin * 60 * 1000);

  // Variant choice
  const studiedHoursToday = ctx.totalStudyMinutesToday / 60;
  const avgHours = ctx.avgStudyMinutes7d / 60;
  const beatAverage = avgHours > 0 && studiedHoursToday > avgHours;

  // Rotate among the three eligible variants. Variant 2 only fires when beatAverage true.
  // We rotate: 0 → factors, 1 → overwhelm. Then variant 2 takes priority on its trigger.
  let title: string;
  let body: string;
  let actionTypeId: string | undefined;
  let extra: Record<string, any> = { openTo: "checkin" };

  if (beatAverage && pickRotation("cofactor_evening_great_day_idx", 2) === 0) {
    title = "Best of the week";
    body = `You studied ${studiedHoursToday.toFixed(1)} hours today — your best this week. Sleep well. Your brain consolidates everything tonight.`;
    extra = { variant: "great_day", openTo: "log" };
  } else {
    const which = pickRotation("cofactor_evening_rot", 2);
    if (which === 0) {
      title = "30-second log";
      body = "30-second log before you wind down. What happened tonight?";
      actionTypeId = "EVENING_FACTORS";
      extra = { variant: "factors", openTo: "checkin" };
    } else {
      title = "Quick reflection";
      body = "How overwhelmed did you feel today?";
      actionTypeId = "EVENING_OVERWHELM";
      extra = { variant: "overwhelm", openTo: "checkin" };
    }
  }

  await trySchedule({
    kind: "evening_checkin",
    fireAt,
    title,
    body,
    actionTypeId,
    extra,
  });
}

/**
 * Convenience wrapper: schedules all three additional notifications.
 * Safe to call repeatedly — each is de-duped per day.
 */
export async function scheduleDailyNotifications(userId: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  await scheduleMorningCheckin(userId);
  await scheduleMiddayNudge(userId);
  await scheduleAfternoonSecondaryPeak(userId);
  await scheduleEveningCheckin(userId);
}

/**
 * Schedule today's morning check-in 20–30 min after detected wake time.
 * Respects quiet hours, daily max, and 90-min gap.
 */
export async function scheduleMorningCheckin(userId: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  const granted = await ensureNotificationPermission();
  if (!granted) return;
  await registerActionTypes();

  const wake = await fetchTodaysWakeInfo();
  if (!wake) return;

  // 20–30 min after wake (random within window for natural feel)
  const offsetMin = 20 + Math.floor(Math.random() * 11);
  let fireAt = new Date(wake.wakeAt.getTime() + offsetMin * 60 * 1000);

  // If wake was very early or detection is stale and time has already passed, skip
  if (fireAt.getTime() < Date.now() + 60 * 1000) return;

  const adjusted = clampOutOfQuietHours(fireAt);
  if (!adjusted) return;
  fireAt = adjusted;

  const log = loadLog();
  const day = format(fireAt, "yyyy-MM-dd");

  // De-dupe: don't schedule a second morning check-in same day
  if (log.some(l => l.date === day && l.kind === "morning_checkin")) return;
  if (!canSchedule(fireAt, log)) return;

  const variant = await pickMorningVariant(userId, wake.sleepHours);
  const notifId = Math.floor(Date.now() / 1000) % 2_000_000_000;

  // Cancel any previously-scheduled morning check-ins for safety
  try {
    const pending = await LocalNotifications.getPending();
    const stale = pending.notifications.filter(n => n.extra?.kind === "morning_checkin").map(n => ({ id: n.id }));
    if (stale.length) await LocalNotifications.cancel({ notifications: stale });
  } catch {}

  await LocalNotifications.schedule({
    notifications: [
      {
        id: notifId,
        title: variant.title,
        body: variant.body,
        schedule: { at: fireAt, allowWhileIdle: true },
        actionTypeId: variant.actionTypeId,
        extra: { kind: "morning_checkin", ...variant.extra },
      },
    ],
  });

  log.push({ date: day, scheduledAt: fireAt.getTime(), kind: "morning_checkin" });
  saveLog(log);

  console.log(`[notif] Morning check-in (variant ${variant.id}) scheduled for ${fireAt.toISOString()}`);
}

/**
 * Inline-reply handler. Maps quick-reply action → stress score (1/3/5)
 * and stashes it for the check-in component to pre-fill Q1a.
 */
export const QUICK_REPLY_KEY = "cofactor_morning_quick_reply_v1";
export function setupNotificationActionListener() {
  if (!Capacitor.isNativePlatform()) return;
  LocalNotifications.addListener("localNotificationActionPerformed", (event) => {
    const stressMap: Record<string, number> = { calm: 1, okay: 3, stressed: 5 };
    const score = stressMap[event.actionId];
    if (score) {
      try {
        localStorage.setItem(
          QUICK_REPLY_KEY,
          JSON.stringify({ stress: score, at: Date.now() })
        );
      } catch {}
    }
  });
}
