// Builds the optional behavioural-burnout fields of AppleHealthData from
// data the student already produces (study logs + daily wellbeing check-ins).
// All fields are best-effort and OMITTED when the underlying data is too
// sparse — the algorithm simply skips any signal whose input is missing.
//
// Pulled together so the student never sees a new question: every input
// already exists somewhere in their normal flow.

import { supabase } from "@/integrations/supabase/client";
import type { AppleHealthData } from "@/algorithms/apexScores";
import { format, subDays } from "date-fns";

type Partials = Partial<Pick<
  AppleHealthData,
  | "study_hours_14d"
  | "study_hours_14d_is_weekend"
  | "study_hours_60d_avg"
  | "recovery_day_quality_7d"
  | "recovery_day_rest_count_7d"
  | "session_abandonment_rate_14d"
  | "session_abandonment_trend_14d"
>>;

function dayKey(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

function isWeekend(d: Date): boolean {
  const w = d.getDay();
  return w === 0 || w === 6;
}

export async function loadBehaviouralSignals(userId: string): Promise<Partials> {
  const out: Partials = {};
  const now = new Date();

  // ── 1. Study load: last 60 days of study_logs ──────────────────────────────
  const since60 = subDays(now, 60).toISOString();
  const { data: logs } = await supabase
    .from("study_logs")
    .select("studied_at,duration_minutes")
    .eq("user_id", userId)
    .gte("studied_at", since60);

  if (logs && logs.length > 0) {
    const perDay = new Map<string, number>();
    for (const l of logs) {
      const k = dayKey(new Date(l.studied_at));
      perDay.set(k, (perDay.get(k) ?? 0) + (l.duration_minutes ?? 0) / 60);
    }

    // 14-day series, oldest first, zero-filled
    const days14: number[] = [];
    const weekend14: boolean[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = subDays(now, i);
      days14.push(Number((perDay.get(dayKey(d)) ?? 0).toFixed(2)));
      weekend14.push(isWeekend(d));
    }
    out.study_hours_14d = days14;
    out.study_hours_14d_is_weekend = weekend14;

    // 60-day average (excluding today)
    let sum = 0, n = 0;
    for (let i = 60; i >= 1; i--) {
      sum += perDay.get(dayKey(subDays(now, i))) ?? 0;
      n++;
    }
    out.study_hours_60d_avg = n > 0 ? Number((sum / n).toFixed(2)) : 0;

    // 7-day rest-day count + recovery-day quality
    const restDays: string[] = [];
    for (let i = 7; i >= 1; i--) {
      const k = dayKey(subDays(now, i));
      if ((perDay.get(k) ?? 0) < 1) restDays.push(k);
    }
    out.recovery_day_rest_count_7d = restDays.length;

    if (restDays.length >= 2) {
      const since8 = subDays(now, 8).toISOString().slice(0, 10);
      const { data: wb } = await (supabase
        .from("daily_wellbeing_checkins" as any)
        .select("checkin_date,rest_level")
        .eq("user_id", userId)
        .gte("checkin_date", since8) as any);
      const restByDay = new Map<string, number>();
      (wb ?? []).forEach((r: any) => restByDay.set(r.checkin_date, r.rest_level));
      let good = 0, considered = 0;
      for (const rd of restDays) {
        const next = dayKey(new Date(new Date(rd).getTime() + 86400000));
        const rl = restByDay.get(next);
        if (rl == null) continue;
        considered++;
        if (rl >= 4) good++;
      }
      if (considered > 0) {
        out.recovery_day_quality_7d = Number((good / considered).toFixed(2));
      }
    }
  }

  // ── 2. Session abandonment from study_sessions (if any) ────────────────────
  const since14 = subDays(now, 14).toISOString();
  const { data: sessions } = await (supabase
    .from("study_sessions" as any)
    .select("session_start_at,session_end_at,active_duration_seconds,status,planned_duration_minutes")
    .eq("user_id", userId)
    .gte("session_start_at", since14) as any);

  if (sessions && sessions.length >= 4) {
    const score = (s: any): { abandoned: boolean; t: number } => {
      const start = new Date(s.session_start_at).getTime();
      const end = s.session_end_at ? new Date(s.session_end_at).getTime() : start;
      const plannedSec = s.planned_duration_minutes
        ? s.planned_duration_minutes * 60
        : Math.max(1, (end - start) / 1000);
      const actual = s.active_duration_seconds ?? plannedSec;
      const abandoned = s.status === "abandoned" || actual < plannedSec * 0.5;
      return { abandoned, t: start };
    };
    const scored = sessions.map(score).sort((a, b) => a.t - b.t);
    const rate = scored.filter(s => s.abandoned).length / scored.length;
    out.session_abandonment_rate_14d = Number(rate.toFixed(2));

    const mid = Math.floor(scored.length / 2);
    if (mid >= 2 && scored.length - mid >= 2) {
      const older = scored.slice(0, mid);
      const recent = scored.slice(mid);
      const olderRate = older.filter(s => s.abandoned).length / older.length;
      const recentRate = recent.filter(s => s.abandoned).length / recent.length;
      out.session_abandonment_trend_14d = Number((recentRate - olderRate).toFixed(2));
    }
  }

  return out;
}
