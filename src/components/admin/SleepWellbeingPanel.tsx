import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceArea,
  Legend,
  CartesianGrid,
} from "recharts";
import { format, subDays, parseISO, differenceInDays } from "date-fns";
import { Moon, Activity } from "lucide-react";

interface Props {
  universityId: string | null;
}

type Window = 30 | 60 | 90;

interface DailyRow {
  date: string;
  sleep_hours: number | null;
  rem_pct: number | null;
  sws_pct: number | null;
  hrv: number | null;
  resting_hr: number | null;
  pss: number | null;
  count: number;
}

const SleepWellbeingPanel = ({ universityId }: Props) => {
  const [windowDays, setWindowDays] = useState<Window>(60);
  const [rows, setRows] = useState<DailyRow[]>([]);
  const [examClusters, setExamClusters] = useState<{ start: string; end: string }[]>([]);
  const [dowAvg, setDowAvg] = useState<{ day: string; sleep: number }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!universityId) return;
      setLoading(true);
      const since = subDays(new Date(), windowDays).toISOString().split("T")[0];

      const [bioRes, evRes, examRes] = await Promise.all([
        supabase
          .from("daily_biometrics" as any)
          .select("recorded_date, sleep_duration_hours, sleep_rem_percent, sleep_sws_percent, hrv_sdnn, resting_hr")
          .eq("university_id", universityId)
          .gte("recorded_date", since),
        supabase
          .from("evening_checkins" as any)
          .select("checkin_date, nightly_pss_score")
          .eq("university_id", universityId)
          .gte("checkin_date", since),
        supabase
          .from("assessment_results")
          .select("assessed_at")
          .eq("university_id", universityId)
          .gte("assessed_at", since),
      ]);

      const buckets = new Map<string, { sleep: number[]; rem: number[]; sws: number[]; hrv: number[]; rhr: number[]; pss: number[] }>();
      const ensure = (d: string) => {
        if (!buckets.has(d)) buckets.set(d, { sleep: [], rem: [], sws: [], hrv: [], rhr: [], pss: [] });
        return buckets.get(d)!;
      };
      ((bioRes.data as any[]) || []).forEach((r) => {
        const b = ensure(r.recorded_date);
        if (r.sleep_duration_hours != null) b.sleep.push(Number(r.sleep_duration_hours));
        if (r.sleep_rem_percent != null) b.rem.push(Number(r.sleep_rem_percent));
        if (r.sleep_sws_percent != null) b.sws.push(Number(r.sleep_sws_percent));
        if (r.hrv_sdnn != null) b.hrv.push(Number(r.hrv_sdnn));
        if (r.resting_hr != null) b.rhr.push(Number(r.resting_hr));
      });
      ((evRes.data as any[]) || []).forEach((r) => {
        const b = ensure(r.checkin_date);
        if (r.nightly_pss_score != null) b.pss.push(Number(r.nightly_pss_score));
      });

      const avg = (a: number[]) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : null);
      const out: DailyRow[] = Array.from(buckets.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, b]) => ({
          date,
          sleep_hours: avg(b.sleep),
          rem_pct: avg(b.rem),
          sws_pct: avg(b.sws),
          hrv: avg(b.hrv),
          resting_hr: avg(b.rhr),
          pss: avg(b.pss),
          count: Math.max(b.sleep.length, b.pss.length, b.hrv.length),
        }));
      setRows(out);

      // Day-of-week average sleep
      const dow: number[][] = [[], [], [], [], [], [], []];
      out.forEach((r) => {
        if (r.sleep_hours != null) dow[parseISO(r.date).getDay()].push(r.sleep_hours);
      });
      const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      setDowAvg(labels.map((d, i) => ({ day: d, sleep: dow[i].length ? dow[i].reduce((s, v) => s + v, 0) / dow[i].length : 0 })));

      // Exam clusters (assessments within 4 days grouped)
      const dates = Array.from(new Set(((examRes.data as any[]) || []).map((r) => r.assessed_at.split("T")[0]))).sort();
      const clusters: { start: string; end: string }[] = [];
      dates.forEach((d) => {
        const last = clusters[clusters.length - 1];
        if (last && differenceInDays(parseISO(d), parseISO(last.end)) <= 4) {
          last.end = d;
        } else {
          clusters.push({ start: d, end: d });
        }
      });
      setExamClusters(clusters);
      setLoading(false);
    };
    load();
  }, [universityId, windowDays]);

  const summary = useMemo(() => {
    const valid = rows.filter((r) => r.sleep_hours != null);
    const avgSleep = valid.length ? valid.reduce((s, r) => s + (r.sleep_hours || 0), 0) / valid.length : 0;
    const remValid = rows.filter((r) => r.rem_pct != null);
    const avgRem = remValid.length ? remValid.reduce((s, r) => s + (r.rem_pct || 0), 0) / remValid.length : 0;
    const pssValid = rows.filter((r) => r.pss != null);
    const avgPss = pssValid.length ? pssValid.reduce((s, r) => s + (r.pss || 0), 0) / pssValid.length : 0;

    // Sleep delta during exam clusters vs baseline
    const inExam = (d: string) => examClusters.some((c) => d >= c.start && d <= c.end);
    const examSleep = rows.filter((r) => r.sleep_hours != null && inExam(r.date)).map((r) => r.sleep_hours!);
    const baselineSleep = rows.filter((r) => r.sleep_hours != null && !inExam(r.date)).map((r) => r.sleep_hours!);
    const ea = examSleep.length ? examSleep.reduce((s, v) => s + v, 0) / examSleep.length : null;
    const ba = baselineSleep.length ? baselineSleep.reduce((s, v) => s + v, 0) / baselineSleep.length : null;
    const delta = ea != null && ba != null ? ea - ba : null;

    return { avgSleep, avgRem, avgPss, delta };
  }, [rows, examClusters]);

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Moon className="h-5 w-5 text-primary" />
          <h3 className="text-base font-semibold">Sleep & Wellbeing — Cohort</h3>
        </div>
        <div className="flex gap-1">
          {[30, 60, 90].map((w) => (
            <Button key={w} size="sm" variant={windowDays === w ? "default" : "outline"} onClick={() => setWindowDays(w as Window)}>
              {w}d
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No biometric or evening check-in data yet for this cohort.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            <Stat label="Avg sleep" value={`${summary.avgSleep.toFixed(1)} h`} />
            <Stat label="Avg REM" value={`${summary.avgRem.toFixed(0)}%`} />
            <Stat label="Avg nightly PSS" value={summary.avgPss ? summary.avgPss.toFixed(1) : "—"} />
            <Stat
              label="Exam-week sleep Δ"
              value={summary.delta == null ? "—" : `${summary.delta > 0 ? "+" : ""}${summary.delta.toFixed(2)} h`}
              tone={summary.delta != null && summary.delta < -0.3 ? "warn" : "default"}
            />
          </div>

          <div className="mb-2 text-xs font-medium text-muted-foreground flex items-center gap-2">
            <Activity className="h-3 w-3" /> Sleep duration & REM % over time (exam clusters shaded)
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer>
              <LineChart data={rows} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="date" tickFormatter={(d) => format(parseISO(d), "MMM d")} fontSize={11} />
                <YAxis yAxisId="left" fontSize={11} domain={[0, 12]} label={{ value: "h", angle: -90, position: "insideLeft", fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" fontSize={11} domain={[0, 50]} label={{ value: "%", angle: 90, position: "insideRight", fontSize: 11 }} />
                <Tooltip labelFormatter={(d) => format(parseISO(d as string), "MMM d, yyyy")} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {examClusters.map((c, i) => (
                  <ReferenceArea key={i} x1={c.start} x2={c.end} yAxisId="left" fill="hsl(var(--destructive))" fillOpacity={0.08} />
                ))}
                <Line yAxisId="left" type="monotone" dataKey="sleep_hours" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name="Sleep (h)" />
                <Line yAxisId="right" type="monotone" dataKey="rem_pct" stroke="hsl(var(--accent-foreground))" strokeWidth={2} dot={false} name="REM (%)" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-6 mb-2 text-xs font-medium text-muted-foreground">Average sleep by day of week</div>
          <div className="h-40 w-full">
            <ResponsiveContainer>
              <LineChart data={dowAvg}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="day" fontSize={11} />
                <YAxis domain={[0, 10]} fontSize={11} />
                <Tooltip />
                <Line type="monotone" dataKey="sleep" stroke="hsl(var(--primary))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </Card>
  );
};

const Stat = ({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "warn" }) => (
  <div className={`rounded-lg border p-3 ${tone === "warn" ? "border-destructive/40 bg-destructive/5" : "bg-muted/40"}`}>
    <div className="text-xs text-muted-foreground">{label}</div>
    <div className="text-lg font-semibold">{value}</div>
  </div>
);

export default SleepWellbeingPanel;
