import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
} from "recharts";
import { format, subDays, parseISO, differenceInDays } from "date-fns";
import { AlertTriangle, Flame, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  universityId: string | null;
  adminRole: "admin" | "university_admin";
}

interface DayPoint {
  date: string;
  label: string;
  avg: number | null;
  highRiskPct: number;
  n: number;
}

interface ExamPeriod {
  start: string;
  end: string;
  count: number;
}

const HIGH_RISK_THRESHOLD = 70;
const DEFAULT_ALERT_PCT_THRESHOLD = 40; // %

const CohortBurnoutChart = ({ universityId, adminRole }: Props) => {
  const [range, setRange] = useState<30 | 60 | 90>(30);
  const [data, setData] = useState<DayPoint[]>([]);
  const [examPeriods, setExamPeriods] = useState<ExamPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [recentHighPct, setRecentHighPct] = useState(0);
  const [studentsAtRisk, setStudentsAtRisk] = useState(0);
  const [totalStudents, setTotalStudents] = useState(0);
  const [alertThresholdPct, setAlertThresholdPct] = useState<number>(DEFAULT_ALERT_PCT_THRESHOLD);

  useEffect(() => {
    load();
  }, [universityId, range, adminRole]);

  const load = async () => {
    setLoading(true);
    try {
      const fromDate = format(subDays(new Date(), range), "yyyy-MM-dd");

      // Scoped student set for university admins
      let userIds: string[] | null = null;
      if (adminRole === "university_admin" && universityId) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id")
          .eq("university_id", universityId);
        userIds = (profs || []).map((p: any) => p.id);
        if (userIds.length === 0) {
          setData([]);
          setExamPeriods([]);
          setLoading(false);
          return;
        }
      }

      let scoresQ = supabase
        .from("daily_scores")
        .select("user_id, score_date, burnout_risk")
        .gte("score_date", fromDate)
        .order("score_date", { ascending: true });
      if (userIds) scoresQ = scoresQ.in("user_id", userIds);
      const { data: scores } = await scoresQ;

      let examQ = supabase
        .from("assessment_results")
        .select("user_id, assessed_at")
        .gte("assessed_at", format(subDays(new Date(), range + 14), "yyyy-MM-dd"));
      if (userIds) examQ = examQ.in("user_id", userIds);
      const { data: exams } = await examQ;

      // Aggregate per day
      const byDate: Record<string, { sum: number; count: number; high: number }> = {};
      (scores || []).forEach((s: any) => {
        const d = s.score_date;
        if (!byDate[d]) byDate[d] = { sum: 0, count: 0, high: 0 };
        byDate[d].sum += s.burnout_risk || 0;
        byDate[d].count++;
        if ((s.burnout_risk || 0) >= HIGH_RISK_THRESHOLD) byDate[d].high++;
      });

      const filled: DayPoint[] = [];
      for (let i = range - 1; i >= 0; i--) {
        const d = subDays(new Date(), i);
        const key = format(d, "yyyy-MM-dd");
        const bucket = byDate[key];
        filled.push({
          date: key,
          label: range <= 30 ? format(d, "MMM d") : format(d, "MMM d"),
          avg: bucket && bucket.count ? Math.round(bucket.sum / bucket.count) : null,
          highRiskPct: bucket && bucket.count ? Math.round((bucket.high / bucket.count) * 100) : 0,
          n: bucket?.count || 0,
        });
      }
      setData(filled);

      // Exam period clustering (proximity: gap <= 4 days)
      const examDates = Array.from(
        new Set((exams || []).map((e: any) => (e.assessed_at as string).slice(0, 10))),
      ).sort();
      const periods: ExamPeriod[] = [];
      let cur: { start: string; end: string; count: number } | null = null;
      examDates.forEach((d) => {
        if (!cur) {
          cur = { start: d, end: d, count: 1 };
        } else if (differenceInDays(parseISO(d), parseISO(cur.end)) <= 4) {
          cur.end = d;
          cur.count++;
        } else {
          periods.push(cur);
          cur = { start: d, end: d, count: 1 };
        }
      });
      if (cur) periods.push(cur);
      setExamPeriods(periods);

      // Recent 7-day stats: % of distinct students with avg burnout >= threshold
      const last7 = subDays(new Date(), 7);
      const perUser: Record<string, { sum: number; count: number }> = {};
      (scores || []).forEach((s: any) => {
        if (parseISO(s.score_date) < last7) return;
        if (!perUser[s.user_id]) perUser[s.user_id] = { sum: 0, count: 0 };
        perUser[s.user_id].sum += s.burnout_risk || 0;
        perUser[s.user_id].count++;
      });
      const studentAvgs = Object.values(perUser).map((v) => v.sum / v.count);
      const high = studentAvgs.filter((v) => v >= HIGH_RISK_THRESHOLD).length;
      setStudentsAtRisk(high);
      setTotalStudents(studentAvgs.length);
      setRecentHighPct(studentAvgs.length ? Math.round((high / studentAvgs.length) * 100) : 0);
    } finally {
      setLoading(false);
    }
  };

  const valid = data.filter((d) => d.avg !== null);
  const overallAvg =
    valid.length > 0 ? Math.round(valid.reduce((s, d) => s + (d.avg || 0), 0) / valid.length) : null;

  const trend = useMemo(() => {
    if (valid.length < 4) return null;
    const half = Math.floor(valid.length / 2);
    const older = valid.slice(0, half).reduce((s, d) => s + (d.avg || 0), 0) / half;
    const recent =
      valid.slice(half).reduce((s, d) => s + (d.avg || 0), 0) / (valid.length - half);
    const diff = recent - older;
    if (diff > 5)
      return {
        icon: <TrendingUp className="h-4 w-4 text-destructive" />,
        text: `Cohort burnout is rising (+${Math.round(diff)} pts vs earlier in window).`,
      };
    if (diff < -5)
      return {
        icon: <TrendingDown className="h-4 w-4 text-score-cognitive" />,
        text: `Cohort burnout is declining (${Math.round(diff)} pts vs earlier in window).`,
      };
    return {
      icon: <Minus className="h-4 w-4 text-muted-foreground" />,
      text: "Cohort burnout is stable across the window.",
    };
  }, [valid]);

  const showAlert = recentHighPct >= ALERT_PCT_THRESHOLD && totalStudents >= 3;

  return (
    <div className="space-y-3">
      {showAlert && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-destructive/40 bg-destructive/5">
            <CardContent className="flex items-start gap-3 p-4">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-destructive">Cohort burnout alert</p>
                <p className="text-muted-foreground">
                  {recentHighPct}% of active students ({studentsAtRisk}/{totalStudents}) have averaged
                  burnout risk above {HIGH_RISK_THRESHOLD} in the last 7 days. Consider checking
                  workload, exam pressure, and recovery patterns.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <Card>
        <CardContent className="p-4 md:p-5">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-destructive" />
              <div>
                <h3 className="font-display text-base font-bold text-foreground">
                  Cohort Burnout Forecast
                </h3>
                {overallAvg !== null && (
                  <p className="text-xs text-muted-foreground">
                    Avg {overallAvg}/100 across the cohort · {valid.length} days with data
                  </p>
                )}
              </div>
            </div>
            <div className="flex rounded-xl bg-muted p-0.5">
              {[30, 60, 90].map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r as 30 | 60 | 90)}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                    range === r ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                  }`}
                >
                  {r}D
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="h-56 animate-pulse rounded-xl bg-muted" />
          ) : valid.length === 0 ? (
            <div className="flex h-56 items-center justify-center rounded-xl bg-muted/50">
              <p className="text-sm text-muted-foreground">
                No cohort burnout data in this window yet.
              </p>
            </div>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={data}
                  margin={{ top: 5, right: 10, bottom: 5, left: -15 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                    interval={Math.max(0, Math.floor(data.length / 8))}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "12px",
                      fontSize: "12px",
                    }}
                    formatter={(value: any, name: string, p: any) => {
                      if (value === null) return ["—", "Avg burnout"];
                      return [`${value}/100 (n=${p.payload.n})`, "Avg burnout"];
                    }}
                  />
                  {/* Exam period overlays */}
                  {examPeriods.map((p, idx) => (
                    <ReferenceArea
                      key={idx}
                      x1={format(parseISO(p.start), range <= 30 ? "MMM d" : "MMM d")}
                      x2={format(parseISO(p.end), range <= 30 ? "MMM d" : "MMM d")}
                      strokeOpacity={0}
                      fill="hsl(var(--primary))"
                      fillOpacity={0.08}
                      ifOverflow="hidden"
                    />
                  ))}
                  <ReferenceLine
                    y={HIGH_RISK_THRESHOLD}
                    stroke="hsl(var(--destructive))"
                    strokeDasharray="4 4"
                    strokeOpacity={0.5}
                  />
                  <Line
                    type="monotone"
                    dataKey="avg"
                    stroke="hsl(var(--destructive))"
                    strokeWidth={2.5}
                    connectNulls
                    dot={{ r: 3, strokeWidth: 1, stroke: "hsl(var(--card))" }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <div className="h-0.5 w-4 border-t-2 border-dashed border-destructive/60" />
              <span>High risk ({HIGH_RISK_THRESHOLD}+)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-sm bg-primary/20" />
              <span>Exam period</span>
            </div>
            {examPeriods.length > 0 && (
              <Badge variant="secondary" className="text-[10px]">
                {examPeriods.length} exam cluster{examPeriods.length === 1 ? "" : "s"}
              </Badge>
            )}
          </div>

          {trend && (
            <div className="mt-3 flex items-start gap-2 rounded-xl bg-muted/50 p-2.5">
              {trend.icon}
              <p className="text-xs leading-relaxed text-muted-foreground">{trend.text}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CohortBurnoutChart;
