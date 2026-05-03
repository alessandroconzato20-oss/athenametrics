import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { format, subWeeks, startOfWeek } from "date-fns";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { ArrowLeft, GraduationCap, Plus, Trash2, BookOpen, Users, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface Course {
  id: string;
  course_name: string;
  university_id: string;
  year: number | null;
}

interface WeeklyPoint {
  weekStart: string;
  label: string;
  comprehension: number | null;
  confidence: number | null;
  revisionPriority: number | null;
  sessions: number;
}

const ProfessorPanel = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [isProfessor, setIsProfessor] = useState(false);
  const [universityId, setUniversityId] = useState<string | null>(null);
  const [universityName, setUniversityName] = useState<string>("");
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [weeks, setWeeks] = useState<8 | 12 | 24>(12);
  const [data, setData] = useState<WeeklyPoint[]>([]);
  const [topicTable, setTopicTable] = useState<
    { topic: string; comp: number; conf: number; rev: number; sessions: number; students: number }[]
  >([]);
  const [loadingData, setLoadingData] = useState(false);
  const [newCourse, setNewCourse] = useState("");
  const [newYear, setNewYear] = useState<string>("");

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/login");
      return;
    }
    (async () => {
      const { data: isProf } = await supabase.rpc("has_role", {
        _user_id: user.id,
        _role: "professor",
      });
      if (!isProf) {
        toast.error("Access denied: professor role required");
        navigate("/");
        return;
      }
      setIsProfessor(true);
      const { data: profile } = await supabase
        .from("profiles")
        .select("university, university_id")
        .eq("id", user.id)
        .single();
      setUniversityId((profile as any)?.university_id || null);
      setUniversityName(profile?.university || "");
      setChecking(false);
    })();
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (isProfessor) loadCourses();
  }, [isProfessor]);

  useEffect(() => {
    if (selectedCourse && universityId) loadFeedback();
  }, [selectedCourse, weeks, universityId]);

  const loadCourses = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("professor_courses")
      .select("*")
      .eq("professor_id", user.id)
      .order("course_name");
    const list = (data || []) as Course[];
    setCourses(list);
    if (!selectedCourse && list.length > 0) setSelectedCourse(list[0].course_name);
  };

  const addCourse = async () => {
    if (!user || !newCourse.trim() || !universityId) {
      toast.error("Course name and university required");
      return;
    }
    const { error } = await supabase.from("professor_courses").insert({
      professor_id: user.id,
      course_name: newCourse.trim(),
      university_id: universityId,
      year: newYear ? parseInt(newYear) : null,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Course added");
    setNewCourse("");
    setNewYear("");
    loadCourses();
  };

  const removeCourse = async (id: string) => {
    const { error } = await supabase.from("professor_courses").delete().eq("id", id);
    if (error) toast.error("Failed to remove");
    else {
      toast.success("Removed");
      if (courses.find((c) => c.id === id)?.course_name === selectedCourse) {
        setSelectedCourse(null);
        setData([]);
        setTopicTable([]);
      }
      loadCourses();
    }
  };

  const loadFeedback = async () => {
    if (!selectedCourse || !universityId) return;
    setLoadingData(true);
    try {
      const fromDate = subWeeks(new Date(), weeks);
      const { data: logs, error } = await supabase
        .from("study_logs")
        .select("topic, studied_at, comprehension_level, confidence_level, revision_priority, user_id")
        .eq("subject", selectedCourse)
        .eq("university_id", universityId)
        .gte("studied_at", fromDate.toISOString())
        .order("studied_at");

      if (error) {
        toast.error(error.message);
        return;
      }

      // Bucket per ISO week (Mon)
      const byWeek: Record<string, { comp: number; cn: number; conf: number; cfn: number; rev: number; rn: number; sessions: number }> = {};
      for (let i = weeks - 1; i >= 0; i--) {
        const ws = startOfWeek(subWeeks(new Date(), i), { weekStartsOn: 1 });
        const key = format(ws, "yyyy-MM-dd");
        byWeek[key] = { comp: 0, cn: 0, conf: 0, cfn: 0, rev: 0, rn: 0, sessions: 0 };
      }

      const topicAgg: Record<string, { comp: number; cn: number; conf: number; cfn: number; rev: number; rn: number; sessions: number; students: Set<string> }> = {};

      (logs || []).forEach((l: any) => {
        const ws = startOfWeek(new Date(l.studied_at), { weekStartsOn: 1 });
        const key = format(ws, "yyyy-MM-dd");
        if (!byWeek[key]) return;
        byWeek[key].sessions++;
        if (l.comprehension_level != null) {
          byWeek[key].comp += l.comprehension_level;
          byWeek[key].cn++;
        }
        if (l.confidence_level != null) {
          byWeek[key].conf += l.confidence_level;
          byWeek[key].cfn++;
        }
        if (l.revision_priority != null) {
          byWeek[key].rev += l.revision_priority;
          byWeek[key].rn++;
        }

        const t = l.topic || "Unspecified";
        if (!topicAgg[t]) topicAgg[t] = { comp: 0, cn: 0, conf: 0, cfn: 0, rev: 0, rn: 0, sessions: 0, students: new Set() };
        topicAgg[t].sessions++;
        topicAgg[t].students.add(l.user_id);
        if (l.comprehension_level != null) { topicAgg[t].comp += l.comprehension_level; topicAgg[t].cn++; }
        if (l.confidence_level != null) { topicAgg[t].conf += l.confidence_level; topicAgg[t].cfn++; }
        if (l.revision_priority != null) { topicAgg[t].rev += l.revision_priority; topicAgg[t].rn++; }
      });

      const points: WeeklyPoint[] = Object.entries(byWeek).map(([k, v]) => ({
        weekStart: k,
        label: format(new Date(k), "MMM d"),
        comprehension: v.cn ? Math.round((v.comp / v.cn) * 10) / 10 : null,
        confidence: v.cfn ? Math.round((v.conf / v.cfn) * 10) / 10 : null,
        revisionPriority: v.rn ? Math.round((v.rev / v.rn) * 10) / 10 : null,
        sessions: v.sessions,
      }));
      setData(points);

      const tt = Object.entries(topicAgg)
        .map(([topic, v]) => ({
          topic,
          comp: v.cn ? Math.round((v.comp / v.cn) * 10) / 10 : 0,
          conf: v.cfn ? Math.round((v.conf / v.cfn) * 10) / 10 : 0,
          rev: v.rn ? Math.round((v.rev / v.rn) * 10) / 10 : 0,
          sessions: v.sessions,
          students: v.students.size,
        }))
        .sort((a, b) => (a.comp || 5) - (b.comp || 5));
      setTopicTable(tt);
    } finally {
      setLoadingData(false);
    }
  };

  const summary = useMemo(() => {
    const valid = data.filter((d) => d.comprehension !== null);
    if (valid.length === 0) return null;
    const totalSessions = data.reduce((s, d) => s + d.sessions, 0);
    const half = Math.floor(valid.length / 2);
    const olderC =
      half > 0
        ? valid.slice(0, half).reduce((s, d) => s + (d.comprehension || 0), 0) / half
        : 0;
    const recentC =
      valid.length - half > 0
        ? valid.slice(half).reduce((s, d) => s + (d.comprehension || 0), 0) /
          (valid.length - half)
        : 0;
    const diff = recentC - olderC;
    let trend = "Comprehension is steady across the window.";
    if (diff >= 0.3)
      trend = `Comprehension is improving (+${diff.toFixed(1)} pts vs earlier weeks).`;
    else if (diff <= -0.3)
      trend = `Comprehension is dropping (${diff.toFixed(1)} pts vs earlier weeks). Consider revisiting recent topics.`;
    return { totalSessions, trend };
  }, [data]);

  if (authLoading || checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Skeleton className="h-12 w-48" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex items-center gap-3"
        >
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <GraduationCap className="h-6 w-6 text-primary" />
          <h1 className="font-display text-2xl font-bold text-foreground">
            Course Feedback
          </h1>
          <Badge variant="secondary" className="text-xs">
            Professor
          </Badge>
        </motion.div>

        <p className="mb-4 text-sm text-muted-foreground">
          {universityName} · Continuous, anonymised feedback from your students replaces
          end-of-semester surveys.
        </p>

        {/* Course management */}
        <Card className="mb-6">
          <CardContent className="space-y-3 p-4">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-bold text-foreground">My Courses</h2>
            </div>

            <div className="flex flex-wrap items-end gap-2">
              <div className="flex-1 min-w-[200px] space-y-1">
                <Label className="text-xs">Course name</Label>
                <Input
                  placeholder="e.g. Anatomy I"
                  value={newCourse}
                  onChange={(e) => setNewCourse(e.target.value)}
                />
              </div>
              <div className="w-24 space-y-1">
                <Label className="text-xs">Year</Label>
                <Input
                  type="number"
                  min={1}
                  max={6}
                  placeholder="1"
                  value={newYear}
                  onChange={(e) => setNewYear(e.target.value)}
                />
              </div>
              <Button onClick={addCourse} size="sm" className="gap-1">
                <Plus className="h-4 w-4" /> Add
              </Button>
            </div>

            {courses.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Add a course to start seeing feedback.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2 pt-1">
                {courses.map((c) => (
                  <div
                    key={c.id}
                    className={`flex items-center gap-1 rounded-full border px-3 py-1 text-xs ${
                      selectedCourse === c.course_name
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card"
                    }`}
                  >
                    <button onClick={() => setSelectedCourse(c.course_name)}>
                      {c.course_name}
                      {c.year ? ` · Y${c.year}` : ""}
                    </button>
                    <button
                      onClick={() => removeCourse(c.id)}
                      className="opacity-60 hover:opacity-100"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {selectedCourse && (
          <>
            {/* Trend chart */}
            <Card className="mb-6">
              <CardContent className="p-4 md:p-5">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-display text-base font-bold text-foreground">
                      {selectedCourse} — weekly feedback
                    </h3>
                    {summary && (
                      <p className="text-xs text-muted-foreground">
                        {summary.totalSessions} student sessions logged · {summary.trend}
                      </p>
                    )}
                  </div>
                  <div className="flex rounded-xl bg-muted p-0.5">
                    {[8, 12, 24].map((w) => (
                      <button
                        key={w}
                        onClick={() => setWeeks(w as 8 | 12 | 24)}
                        className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                          weeks === w
                            ? "bg-card text-foreground shadow-sm"
                            : "text-muted-foreground"
                        }`}
                      >
                        {w}w
                      </button>
                    ))}
                  </div>
                </div>

                {loadingData ? (
                  <div className="h-56 animate-pulse rounded-xl bg-muted" />
                ) : data.every((d) => d.sessions === 0) ? (
                  <div className="flex h-56 items-center justify-center rounded-xl bg-muted/50">
                    <p className="text-sm text-muted-foreground">
                      No student sessions logged for this course yet.
                    </p>
                  </div>
                ) : (
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={data}
                        margin={{ top: 5, right: 10, bottom: 5, left: -15 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="hsl(var(--border))"
                        />
                        <XAxis
                          dataKey="label"
                          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          domain={[1, 5]}
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
                        />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Line
                          name="Comprehension"
                          type="monotone"
                          dataKey="comprehension"
                          stroke="hsl(var(--primary))"
                          strokeWidth={2.5}
                          connectNulls
                          dot={{ r: 3 }}
                        />
                        <Line
                          name="Confidence"
                          type="monotone"
                          dataKey="confidence"
                          stroke="hsl(var(--accent))"
                          strokeWidth={2.5}
                          connectNulls
                          dot={{ r: 3 }}
                        />
                        <Line
                          name="Revision priority"
                          type="monotone"
                          dataKey="revisionPriority"
                          stroke="hsl(var(--destructive))"
                          strokeWidth={2}
                          strokeDasharray="4 4"
                          connectNulls
                          dot={{ r: 2 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
                <p className="mt-3 text-[11px] text-muted-foreground">
                  Rated 1–5 by students after each study session. Higher is better for
                  comprehension and confidence; higher revision priority means students feel
                  the topic still needs more review.
                </p>
              </CardContent>
            </Card>

            {/* Topic-level table */}
            <Card>
              <CardContent className="p-4 md:p-5">
                <div className="mb-3 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-bold text-foreground">
                    Topics — hardest first
                  </h3>
                </div>
                {topicTable.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No topic data yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b text-muted-foreground">
                          <th className="py-2 text-left font-medium">Topic</th>
                          <th className="py-2 text-right font-medium">Comp.</th>
                          <th className="py-2 text-right font-medium">Conf.</th>
                          <th className="py-2 text-right font-medium">Rev.</th>
                          <th className="py-2 text-right font-medium">
                            <Users className="inline h-3 w-3" />
                          </th>
                          <th className="py-2 text-right font-medium">Sess.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topicTable.map((t) => (
                          <tr key={t.topic} className="border-b last:border-0">
                            <td className="py-2 pr-2 text-foreground">{t.topic}</td>
                            <td className="py-2 text-right tabular-nums">{t.comp || "—"}</td>
                            <td className="py-2 text-right tabular-nums">{t.conf || "—"}</td>
                            <td className="py-2 text-right tabular-nums">{t.rev || "—"}</td>
                            <td className="py-2 text-right tabular-nums">{t.students}</td>
                            <td className="py-2 text-right tabular-nums">{t.sessions}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default ProfessorPanel;
