import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ShieldCheck, Users, BookOpen, Clock, BarChart3, Search, Activity, Key, Plus, Trash2, GraduationCap } from "lucide-react";
import { toast } from "sonner";
import StudentCard, { StudentStat, ScoreStat } from "@/components/admin/StudentCard";
import SyllabusManager from "@/components/admin/SyllabusManager";
import TopicSummaryTable, { TopicMetric } from "@/components/admin/TopicSummaryTable";

type AdminRole = "admin" | "university_admin";

const AdminPanel = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [adminRole, setAdminRole] = useState<AdminRole | null>(null);
  const [adminUniversity, setAdminUniversity] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [students, setStudents] = useState<StudentStat[]>([]);
  const [scores, setScores] = useState<Record<string, ScoreStat>>({});
  const [topicMetrics, setTopicMetrics] = useState<TopicMetric[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [search, setSearch] = useState("");

  // Access code management (global admin only)
  const [accessCodes, setAccessCodes] = useState<any[]>([]);
  const [newCodeUni, setNewCodeUni] = useState("");
  const [newCode, setNewCode] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/login"); return; }
    const checkAdmin = async () => {
      // Check global admin first
      const { data: isGlobal } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      if (isGlobal) {
        setAdminRole("admin");
        setChecking(false);
        return;
      }
      // Check university admin
      const { data: isUniAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "university_admin" });
      if (isUniAdmin) {
        setAdminRole("university_admin");
        // Get their university from profile
        const { data: profile } = await supabase.from("profiles").select("university").eq("id", user.id).single();
        setAdminUniversity(profile?.university || null);
        setChecking(false);
        return;
      }
      toast.error("Access denied");
      navigate("/");
    };
    checkAdmin();
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!adminRole) return;
    loadData();
    if (adminRole === "admin") loadAccessCodes();
  }, [adminRole]);

  const loadAccessCodes = async () => {
    const { data } = await supabase.from("university_access_codes").select("*").order("created_at", { ascending: false });
    setAccessCodes(data || []);
  };

  const addAccessCode = async () => {
    if (!newCodeUni || !newCode || !user) return;
    const { error } = await supabase.from("university_access_codes").insert({
      university_name: newCodeUni,
      access_code: newCode,
      created_by: user.id,
    } as any);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Access code created");
      setNewCodeUni("");
      setNewCode("");
      loadAccessCodes();
    }
  };

  const deleteAccessCode = async (id: string) => {
    const { error } = await supabase.from("university_access_codes").delete().eq("id", id);
    if (error) toast.error("Failed to delete");
    else { toast.success("Deleted"); loadAccessCodes(); }
  };

  const loadData = async () => {
    setLoadingData(true);
    try {
      const [{ data: logs }, { data: profiles }, { data: dailyScores }, { data: personas }] = await Promise.all([
        supabase.from("study_logs").select("*"),
        supabase.from("profiles").select("id, matricola, university"),
        supabase.from("daily_scores").select("*"),
        supabase.from("student_personas").select("*"),
      ]);

      const profileMap: Record<string, { matricola: string; university: string }> = {};
      (profiles || []).forEach((p: any) => {
        profileMap[p.id] = { matricola: p.matricola || "N/A", university: p.university || "N/A" };
      });

      const personaMap: Record<string, any> = {};
      (personas || []).forEach((p: any) => {
        personaMap[p.user_id] = {
          goals: p.goals || [],
          study_style: p.study_style,
          weekly_study_hours: p.weekly_study_hours,
          biggest_challenge: p.biggest_challenge,
          motivation_type: p.motivation_type,
          preferred_session_length: p.preferred_session_length,
          learning_method: p.learning_method,
          stress_management: p.stress_management,
          social_preference: p.social_preference,
        };
      });

      const studentMap: Record<string, StudentStat> = {};
      const recentLogs: Record<string, any[]> = {};
      const studyDays: Record<string, Set<string>> = {};
      // Topic-level aggregation
      const topicAgg: Record<string, { sessions: number; total_minutes: number; sum_difficulty: number; sum_stress: number; sum_energy: number; sum_distraction: number; sum_comprehension: number; sum_confidence: number; sum_revision: number; sum_teaching: number; comp_count: number; students: Set<string>; subject: string; topic: string }> = {};

      (logs || []).forEach((log: any) => {
        // For university admins, only include students from their university
        const studentUni = profileMap[log.user_id]?.university || "N/A";
        if (adminRole === "university_admin" && adminUniversity) {
          if (studentUni.toLowerCase() !== adminUniversity.toLowerCase()) return;
        }

        if (!studentMap[log.user_id]) {
          studentMap[log.user_id] = {
            user_id: log.user_id,
            matricola: profileMap[log.user_id]?.matricola || "N/A",
            university: studentUni,
            total_sessions: 0,
            total_minutes: 0,
            subjects_studied: [],
            subject_minutes: {},
            avg_difficulty: 0,
            avg_stress: 0,
            avg_energy: 0,
            avg_distraction: 0,
            avg_comprehension: 0,
            avg_confidence: 0,
            avg_revision_priority: 0,
            avg_teaching_readiness: 0,
            last_active: null,
            persona: personaMap[log.user_id] || null,
            recent_sessions: [],
            study_days: 0,
          };
          recentLogs[log.user_id] = [];
          studyDays[log.user_id] = new Set();
        }
        const s = studentMap[log.user_id];
        s.total_sessions++;
        s.total_minutes += log.duration_minutes;
        if (!s.subjects_studied.includes(log.subject)) s.subjects_studied.push(log.subject);
        s.subject_minutes[log.subject] = (s.subject_minutes[log.subject] || 0) + log.duration_minutes;
        s.avg_difficulty += log.difficulty;
        s.avg_stress += log.stress_level;
        s.avg_energy += log.energy_level;
        s.avg_distraction += log.distraction_level;
        s.avg_comprehension += (log.comprehension_level || 0);
        s.avg_confidence += (log.confidence_level || 0);
        s.avg_revision_priority += (log.revision_priority || 0);
        s.avg_teaching_readiness += (log.teaching_readiness || 0);
        if (!s.last_active || log.studied_at > s.last_active) s.last_active = log.studied_at;

        const day = log.studied_at?.slice(0, 10);
        if (day) studyDays[log.user_id].add(day);

        // Topic aggregation
        const topicKey = `${log.subject}|||${log.topic}`;
        if (!topicAgg[topicKey]) {
          topicAgg[topicKey] = { sessions: 0, total_minutes: 0, sum_difficulty: 0, sum_stress: 0, sum_energy: 0, sum_distraction: 0, sum_comprehension: 0, sum_confidence: 0, sum_revision: 0, sum_teaching: 0, comp_count: 0, students: new Set(), subject: log.subject, topic: log.topic };
        }
        const ta = topicAgg[topicKey];
        ta.sessions++;
        ta.total_minutes += log.duration_minutes;
        ta.sum_difficulty += log.difficulty;
        ta.sum_stress += log.stress_level;
        ta.sum_energy += log.energy_level;
        ta.sum_distraction += log.distraction_level;
        if (log.comprehension_level) { ta.sum_comprehension += log.comprehension_level; ta.comp_count++; }
        if (log.confidence_level) ta.sum_confidence += log.confidence_level;
        if (log.revision_priority) ta.sum_revision += log.revision_priority;
        if (log.teaching_readiness) ta.sum_teaching += log.teaching_readiness;
        ta.students.add(log.user_id);

        recentLogs[log.user_id].push({
          subject: log.subject,
          topic: log.topic,
          duration_minutes: log.duration_minutes,
          studied_at: log.studied_at,
          difficulty: log.difficulty,
          stress_level: log.stress_level,
          comprehension_level: log.comprehension_level,
          confidence_level: log.confidence_level,
          revision_priority: log.revision_priority,
          teaching_readiness: log.teaching_readiness,
          notes: log.notes,
        });
      });

      Object.values(studentMap).forEach((s) => {
        if (s.total_sessions > 0) {
          s.avg_difficulty = Math.round((s.avg_difficulty / s.total_sessions) * 10) / 10;
          s.avg_stress = Math.round((s.avg_stress / s.total_sessions) * 10) / 10;
          s.avg_energy = Math.round((s.avg_energy / s.total_sessions) * 10) / 10;
          s.avg_distraction = Math.round((s.avg_distraction / s.total_sessions) * 10) / 10;
          s.avg_comprehension = Math.round((s.avg_comprehension / s.total_sessions) * 10) / 10;
          s.avg_confidence = Math.round((s.avg_confidence / s.total_sessions) * 10) / 10;
          s.avg_revision_priority = Math.round((s.avg_revision_priority / s.total_sessions) * 10) / 10;
          s.avg_teaching_readiness = Math.round((s.avg_teaching_readiness / s.total_sessions) * 10) / 10;
        }
        s.study_days = studyDays[s.user_id]?.size || 0;
        s.recent_sessions = (recentLogs[s.user_id] || [])
          .sort((a, b) => b.studied_at.localeCompare(a.studied_at))
          .slice(0, 5);
      });

      const scoreMap: Record<string, { sum_b: number; sum_c: number; sum_r: number; count: number }> = {};
      (dailyScores || []).forEach((ds: any) => {
        if (!studentMap[ds.user_id]) return; // skip students not in our filtered set
        if (!scoreMap[ds.user_id]) scoreMap[ds.user_id] = { sum_b: 0, sum_c: 0, sum_r: 0, count: 0 };
        scoreMap[ds.user_id].sum_b += ds.burnout_risk;
        scoreMap[ds.user_id].sum_c += (ds.cognitive_readiness || 0);
        scoreMap[ds.user_id].sum_r += (ds.retention_outlook || 0);
        scoreMap[ds.user_id].count++;
      });

      const scoresResult: Record<string, ScoreStat> = {};
      Object.entries(scoreMap).forEach(([uid, v]) => {
        scoresResult[uid] = {
          avg_burnout: Math.round(v.sum_b / v.count),
          avg_cognitive: Math.round(v.sum_c / v.count),
          avg_retention: Math.round(v.sum_r / v.count),
        };
      });

      // Build topic metrics
      const topicMetricsResult: TopicMetric[] = Object.values(topicAgg).map(ta => ({
        subject: ta.subject,
        topic: ta.topic,
        sessions: ta.sessions,
        total_minutes: ta.total_minutes,
        avg_difficulty: Math.round((ta.sum_difficulty / ta.sessions) * 10) / 10,
        avg_stress: Math.round((ta.sum_stress / ta.sessions) * 10) / 10,
        avg_energy: Math.round((ta.sum_energy / ta.sessions) * 10) / 10,
        avg_distraction: Math.round((ta.sum_distraction / ta.sessions) * 10) / 10,
        avg_comprehension: ta.comp_count > 0 ? Math.round((ta.sum_comprehension / ta.comp_count) * 10) / 10 : 0,
        avg_confidence: ta.comp_count > 0 ? Math.round((ta.sum_confidence / ta.comp_count) * 10) / 10 : 0,
        avg_revision_priority: ta.comp_count > 0 ? Math.round((ta.sum_revision / ta.comp_count) * 10) / 10 : 0,
        avg_teaching_readiness: ta.comp_count > 0 ? Math.round((ta.sum_teaching / ta.comp_count) * 10) / 10 : 0,
        students_count: ta.students.size,
      }));

      setStudents(Object.values(studentMap).sort((a, b) => b.total_minutes - a.total_minutes));
      setScores(scoresResult);
      setTopicMetrics(topicMetricsResult);
    } catch {
      toast.error("Failed to load admin data");
    } finally {
      setLoadingData(false);
    }
  };

  const deleteStudentData = async (userId: string, matricola: string) => {
    try {
      const { error: logsErr } = await supabase.from("study_logs").delete().eq("user_id", userId);
      if (logsErr) throw logsErr;
      const { error: scoresErr } = await supabase.from("daily_scores").delete().eq("user_id", userId);
      if (scoresErr) throw scoresErr;
      toast.success(`Deleted all data for ${matricola}`);
      loadData();
    } catch {
      toast.error("Failed to delete student data");
    }
  };

  if (authLoading || checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Skeleton className="h-12 w-48" />
      </div>
    );
  }

  if (!adminRole) return null;

  const totalStudents = students.length;
  const totalSessions = students.reduce((a, s) => a + s.total_sessions, 0);
  const totalMinutes = students.reduce((a, s) => a + s.total_minutes, 0);
  const avgSessionLength = totalSessions > 0 ? Math.round(totalMinutes / totalSessions) : 0;
  const avgStress = students.length > 0 ? Math.round(students.reduce((a, s) => a + s.avg_stress, 0) / students.length * 10) / 10 : 0;
  const totalActiveDays = students.reduce((a, s) => a + s.study_days, 0);

  const filtered = search
    ? students.filter(s =>
        s.matricola.toLowerCase().includes(search.toLowerCase()) ||
        s.subjects_studied.some(sub => sub.toLowerCase().includes(search.toLowerCase())) ||
        s.university.toLowerCase().includes(search.toLowerCase())
      )
    : students;

  const panelTitle = adminRole === "university_admin" && adminUniversity
    ? `${adminUniversity} – Admin Panel`
    : "Admin Panel";

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-4xl">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          {adminRole === "university_admin" ? (
            <GraduationCap className="h-6 w-6 text-primary" />
          ) : (
            <ShieldCheck className="h-6 w-6 text-primary" />
          )}
          <h1 className="font-display text-2xl font-bold text-foreground">{panelTitle}</h1>
          {adminRole === "university_admin" && (
            <Badge variant="secondary" className="text-xs">University Admin</Badge>
          )}
        </motion.div>

        {/* Summary Cards */}
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {[
            { label: "Students", value: totalStudents, icon: Users, color: "text-primary" },
            { label: "Sessions", value: totalSessions, icon: BookOpen, color: "text-accent" },
            { label: "Total Hours", value: `${Math.round(totalMinutes / 60)}h`, icon: Clock, color: "text-secondary" },
            { label: "Avg Session", value: `${avgSessionLength}m`, icon: BarChart3, color: "text-muted-foreground" },
            { label: "Avg Stress", value: `${avgStress}/5`, icon: Activity, color: "text-destructive" },
            { label: "Active Days", value: totalActiveDays, icon: Clock, color: "text-primary" },
          ].map((card, i) => (
            <motion.div key={card.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card>
                <CardContent className="flex items-center gap-2 p-3">
                  <card.icon className={`h-6 w-6 ${card.color} shrink-0`} />
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground">{card.label}</p>
                    <p className="text-lg font-bold text-foreground">{card.value}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Search */}
        <div className="mb-4 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by matricola, subject, or university..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Student Cards */}
        {loadingData ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              {search ? "No students match your search." : "No student data yet."}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((s) => (
              <StudentCard key={s.user_id} student={s} score={scores[s.user_id]} onDelete={deleteStudentData} />
            ))}
          </div>
        )}

        {/* Topic Insights Summary */}
        {!loadingData && topicMetrics.length > 0 && (
          <div className="mt-8 border-t pt-6">
            <TopicSummaryTable topics={topicMetrics} />
          </div>
        )}

        {/* Syllabus Management */}
        <div className="mt-8 border-t pt-6">
          <SyllabusManager universityFilter={adminRole === "university_admin" ? adminUniversity : null} />
        </div>

        {/* Access Code Management - Global Admin Only */}
        {adminRole === "admin" && (
          <div className="mt-8 border-t pt-6 space-y-4">
            <div className="flex items-center gap-2">
              <Key className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold text-foreground">University Access Codes</h2>
            </div>

            <div className="flex gap-2 items-end">
              <div className="flex-1 space-y-1">
                <Label className="text-xs">University Name</Label>
                <Input placeholder="e.g. Università di Padova" value={newCodeUni} onChange={(e) => setNewCodeUni(e.target.value)} />
              </div>
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Access Code</Label>
                <Input placeholder="e.g. UNIPD-2026" value={newCode} onChange={(e) => setNewCode(e.target.value)} />
              </div>
              <Button onClick={addAccessCode} size="sm" className="gap-1 shrink-0">
                <Plus className="h-4 w-4" /> Add
              </Button>
            </div>

            {accessCodes.length > 0 && (
              <div className="space-y-2">
                {accessCodes.map((ac) => (
                  <Card key={ac.id}>
                    <CardContent className="flex items-center justify-between p-3">
                      <div>
                        <p className="font-medium text-sm text-foreground">{ac.university_name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{ac.access_code}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={ac.is_active ? "default" : "secondary"} className="text-[10px]">
                          {ac.is_active ? "Active" : "Inactive"}
                        </Badge>
                        <Button variant="ghost" size="icon" onClick={() => deleteAccessCode(ac.id)} className="h-8 w-8 text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
