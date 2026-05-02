import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Activity, MapPin, BookOpen, Pause, Clock } from "lucide-react";

interface Props {
  universityId: string | null;
}

interface SessionRow {
  id: string;
  user_id: string;
  subject: string;
  study_method: string;
  location: string;
  active_duration_seconds: number;
  total_pause_duration_seconds: number;
  pause_count: number;
  pause_rate: number | null;
  status: string;
  session_start_at: string;
  session_end_at: string | null;
}

interface LogRow {
  subject: string;
  duration_minutes: number;
  study_method: string | null;
  location: string | null;
  studied_at: string;
}

const METHOD_LABEL: Record<string, string> = {
  anki: "Anki",
  notes: "Notes",
  pomodoro: "Pomodoro",
  "active-recall": "Active Recall",
  "practice-problems": "Practice Problems",
  "group-study": "Group Study",
  lectures: "Lectures",
  reading: "Reading",
};

const LOCATION_LABEL: Record<string, string> = {
  home: "🏠 Home",
  university: "🏫 University",
  library: "📚 Library",
  cafe: "☕ Café",
  outdoors: "🌳 Outdoors",
  other: "📍 Other",
};

function formatLabel(map: Record<string, string>, key: string) {
  return map[key] || key.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function pct(n: number, total: number) {
  return total > 0 ? Math.round((n / total) * 100) : 0;
}

const StudyBehaviourPanel = ({ universityId }: Props) => {
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [logs, setLogs] = useState<LogRow[]>([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

        let sessQ = supabase
          .from("study_sessions")
          .select("id,user_id,subject,study_method,location,active_duration_seconds,total_pause_duration_seconds,pause_count,pause_rate,status,session_start_at,session_end_at")
          .gte("session_start_at", since)
          .order("session_start_at", { ascending: false })
          .limit(1000);
        if (universityId) sessQ = sessQ.eq("university_id", universityId);
        const { data: sessData } = await sessQ;
        setSessions((sessData as SessionRow[]) || []);

        let logQ = supabase
          .from("study_logs")
          .select("subject,duration_minutes,study_method,location,studied_at")
          .gte("studied_at", since)
          .limit(2000);
        if (universityId) logQ = logQ.eq("university_id", universityId);
        const { data: logData } = await logQ;
        setLogs((logData as LogRow[]) || []);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [universityId]);

  // Combined method usage (sessions + logs) per course
  const methodByCourse = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    const add = (subject: string, method: string | null) => {
      if (!subject || !method) return;
      map[subject] = map[subject] || {};
      map[subject][method] = (map[subject][method] || 0) + 1;
    };
    sessions.forEach((s) => add(s.subject, s.study_method));
    logs.forEach((l) => add(l.subject, l.study_method));
    return map;
  }, [sessions, logs]);

  // Location distribution
  const locationDist = useMemo(() => {
    const counts: Record<string, number> = {};
    sessions.forEach((s) => {
      if (s.location) counts[s.location] = (counts[s.location] || 0) + 1;
    });
    logs.forEach((l) => {
      if (l.location) counts[l.location] = (counts[l.location] || 0) + 1;
    });
    return counts;
  }, [sessions, logs]);

  // Avg session duration by location (sessions only — has true active duration)
  const durationByLocation = useMemo(() => {
    const acc: Record<string, { total: number; n: number }> = {};
    sessions.forEach((s) => {
      if (!s.location || !s.active_duration_seconds) return;
      acc[s.location] = acc[s.location] || { total: 0, n: 0 };
      acc[s.location].total += s.active_duration_seconds;
      acc[s.location].n += 1;
    });
    return Object.entries(acc).map(([loc, { total, n }]) => ({
      location: loc,
      avgMinutes: Math.round(total / n / 60),
      count: n,
    }));
  }, [sessions]);

  // Pause rate trend (weekly buckets)
  const pauseTrend = useMemo(() => {
    const weeks: Record<string, { totalPause: number; totalActive: number; count: number }> = {};
    sessions.forEach((s) => {
      if (!s.session_start_at || !s.active_duration_seconds) return;
      const d = new Date(s.session_start_at);
      const monday = new Date(d);
      monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
      const key = monday.toISOString().slice(0, 10);
      weeks[key] = weeks[key] || { totalPause: 0, totalActive: 0, count: 0 };
      weeks[key].totalPause += s.total_pause_duration_seconds || 0;
      weeks[key].totalActive += s.active_duration_seconds;
      weeks[key].count += 1;
    });
    return Object.entries(weeks)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([week, v]) => ({
        week,
        pauseShare: v.totalActive > 0 ? v.totalPause / (v.totalPause + v.totalActive) : 0,
        sessions: v.count,
      }));
  }, [sessions]);

  // Overall summary
  const summary = useMemo(() => {
    const completed = sessions.filter((s) => s.status === "completed").length;
    const abandoned = sessions.filter((s) => s.status === "abandoned" || s.status === "auto_ended").length;
    const totalPauses = sessions.reduce((a, s) => a + (s.pause_count || 0), 0);
    const totalActive = sessions.reduce((a, s) => a + (s.active_duration_seconds || 0), 0);
    const avgPauseRate =
      sessions.filter((s) => s.pause_rate != null).reduce((a, s) => a + Number(s.pause_rate), 0) /
      Math.max(1, sessions.filter((s) => s.pause_rate != null).length);
    return {
      total: sessions.length,
      completed,
      abandoned,
      totalPauses,
      totalActiveHours: Math.round((totalActive / 3600) * 10) / 10,
      avgPauseRate: Math.round(avgPauseRate * 100) / 100,
    };
  }, [sessions]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-5 w-5" /> Study Behaviour Patterns
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (sessions.length === 0 && logs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-5 w-5" /> Study Behaviour Patterns
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No study activity recorded in the past 30 days yet.</p>
        </CardContent>
      </Card>
    );
  }

  const totalLocCount = Object.values(locationDist).reduce((a, b) => a + b, 0);
  const sortedCourses = Object.entries(methodByCourse).slice(0, 8);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" /> Study Behaviour Patterns
          <Badge variant="secondary" className="ml-auto text-xs font-normal">Last 30 days</Badge>
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          How students actually study: methods, locations, and pause behaviour.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary tiles */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-lg border p-3">
            <div className="text-xs text-muted-foreground">Live sessions</div>
            <div className="text-xl font-semibold">{summary.total}</div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-xs text-muted-foreground">Active hours</div>
            <div className="text-xl font-semibold">{summary.totalActiveHours}h</div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-xs text-muted-foreground">Completed / Abandoned</div>
            <div className="text-xl font-semibold">{summary.completed} / {summary.abandoned}</div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-xs text-muted-foreground">Avg pause rate</div>
            <div className="text-xl font-semibold">{isFinite(summary.avgPauseRate) ? summary.avgPauseRate : 0}/h</div>
          </div>
        </div>

        {/* Method distribution per course */}
        {sortedCourses.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" /> Study method by course
            </h4>
            <div className="space-y-3">
              {sortedCourses.map(([course, methods]) => {
                const total = Object.values(methods).reduce((a, b) => a + b, 0);
                const sorted = Object.entries(methods).sort((a, b) => b[1] - a[1]);
                return (
                  <div key={course} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium truncate">{course}</span>
                      <span className="text-xs text-muted-foreground">{total} sessions</span>
                    </div>
                    <div className="flex h-2 w-full rounded-full overflow-hidden bg-muted">
                      {sorted.map(([m, n], i) => (
                        <div
                          key={m}
                          className="h-full"
                          style={{
                            width: `${pct(n, total)}%`,
                            background: `hsl(${(i * 47) % 360} 65% 55%)`,
                          }}
                          title={`${formatLabel(METHOD_LABEL, m)}: ${pct(n, total)}%`}
                        />
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {sorted.slice(0, 4).map(([m, n], i) => (
                        <span key={m} className="text-[11px] flex items-center gap-1">
                          <span
                            className="inline-block h-2 w-2 rounded-full"
                            style={{ background: `hsl(${(i * 47) % 360} 65% 55%)` }}
                          />
                          {formatLabel(METHOD_LABEL, m)} {pct(n, total)}%
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Location breakdown */}
        {totalLocCount > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" /> Where students study
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {Object.entries(locationDist)
                .sort((a, b) => b[1] - a[1])
                .map(([loc, n]) => {
                  const dur = durationByLocation.find((d) => d.location === loc);
                  return (
                    <div key={loc} className="rounded-lg border p-3">
                      <div className="text-sm font-medium">{formatLabel(LOCATION_LABEL, loc)}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {pct(n, totalLocCount)}% of activity
                        {dur && (
                          <span className="ml-1">
                            · ~{dur.avgMinutes}m avg
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Pause trend */}
        {pauseTrend.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Pause className="h-4 w-4 text-primary" /> Pause-time share by week
            </h4>
            <div className="flex items-end gap-1 h-24">
              {pauseTrend.slice(-12).map((w) => {
                const h = Math.round(w.pauseShare * 100);
                return (
                  <div key={w.week} className="flex-1 flex flex-col items-center gap-1" title={`${w.week}: ${h}% pause time, ${w.sessions} sessions`}>
                    <div
                      className="w-full bg-primary/60 rounded-t"
                      style={{ height: `${Math.max(4, h)}%` }}
                    />
                    <span className="text-[9px] text-muted-foreground">{w.week.slice(5)}</span>
                  </div>
                );
              })}
            </div>
            <p className="text-[11px] text-muted-foreground mt-2 flex items-center gap-1">
              <Clock className="h-3 w-3" /> Higher bars = students paused more relative to active study time.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StudyBehaviourPanel;
