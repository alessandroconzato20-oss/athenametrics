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
      ],
    });
  } catch (e) {
    console.warn("registerActionTypes failed:", e);
  }
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
