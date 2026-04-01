import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { ArrowLeft, ShieldCheck, Users, BookOpen, Clock, BarChart3, Search, Activity } from "lucide-react";
import { toast } from "sonner";
import StudentCard, { StudentStat, ScoreStat } from "@/components/admin/StudentCard";
import SyllabusManager from "@/components/admin/SyllabusManager";

const AdminPanel = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checking, setChecking] = useState(true);
  const [students, setStudents] = useState<StudentStat[]>([]);
  const [scores, setScores] = useState<Record<string, ScoreStat>>({});
  const [loadingData, setLoadingData] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/login"); return; }
    const checkAdmin = async () => {
      const { data } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      if (!data) { toast.error("Access denied"); navigate("/"); return; }
      setIsAdmin(true);
      setChecking(false);
    };
    checkAdmin();
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!isAdmin) return;
    loadData();
  }, [isAdmin]);

  const loadData = async () => {
    setLoadingData(true);
    try {
      const [{ data: logs }, { data: profiles }, { data: dailyScores }, { data: personas }] = await Promise.all([
        supabase.from("study_logs").select("*"),
        supabase.from("profiles").select("id, matricola"),
        supabase.from("daily_scores").select("*"),
        supabase.from("student_personas").select("*"),
      ]);

      const matricolaMap: Record<string, string> = {};
      const universityMap: Record<string, string> = {};
      (profiles || []).forEach((p: any) => {
        matricolaMap[p.id] = p.matricola || "N/A";
      });

      // Get university from auth metadata via admin - we'll use profiles for now
      // University is stored in user_metadata, but we can't access that from client
      // We'll show it when available

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

      (logs || []).forEach((log: any) => {
        if (!studentMap[log.user_id]) {
          studentMap[log.user_id] = {
            user_id: log.user_id,
            matricola: matricolaMap[log.user_id] || "N/A",
            university: "N/A",
            total_sessions: 0,
            total_minutes: 0,
            subjects_studied: [],
            subject_minutes: {},
            avg_difficulty: 0,
            avg_stress: 0,
            avg_energy: 0,
            avg_distraction: 0,
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
        if (!s.last_active || log.studied_at > s.last_active) s.last_active = log.studied_at;

        const day = log.studied_at?.slice(0, 10);
        if (day) studyDays[log.user_id].add(day);

        recentLogs[log.user_id].push({
          subject: log.subject,
          topic: log.topic,
          duration_minutes: log.duration_minutes,
          studied_at: log.studied_at,
          difficulty: log.difficulty,
          stress_level: log.stress_level,
          notes: log.notes,
        });
      });

      Object.values(studentMap).forEach((s) => {
        if (s.total_sessions > 0) {
          s.avg_difficulty = Math.round((s.avg_difficulty / s.total_sessions) * 10) / 10;
          s.avg_stress = Math.round((s.avg_stress / s.total_sessions) * 10) / 10;
          s.avg_energy = Math.round((s.avg_energy / s.total_sessions) * 10) / 10;
          s.avg_distraction = Math.round((s.avg_distraction / s.total_sessions) * 10) / 10;
        }
        s.study_days = studyDays[s.user_id]?.size || 0;
        s.recent_sessions = (recentLogs[s.user_id] || [])
          .sort((a, b) => b.studied_at.localeCompare(a.studied_at))
          .slice(0, 5);
      });

      const scoreMap: Record<string, { sum_b: number; sum_c: number; sum_r: number; count: number }> = {};
      (dailyScores || []).forEach((ds: any) => {
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

      setStudents(Object.values(studentMap).sort((a, b) => b.total_minutes - a.total_minutes));
      setScores(scoresResult);
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

  if (!isAdmin) return null;

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

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-4xl">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <ShieldCheck className="h-6 w-6 text-primary" />
          <h1 className="font-display text-2xl font-bold text-foreground">Admin Panel</h1>
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

        {/* Syllabus Management */}
        <div className="mt-8 border-t pt-6">
          <SyllabusManager />
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
