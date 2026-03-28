import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, ShieldCheck, Users, BookOpen, Clock, TrendingUp, BarChart3, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";

interface StudentStat {
  user_id: string;
  matricola: string;
  total_sessions: number;
  total_minutes: number;
  subjects_studied: string[];
  avg_difficulty: number;
  avg_stress: number;
  avg_energy: number;
  avg_distraction: number;
  last_active: string | null;
}

interface ScoreStat {
  user_id: string;
  avg_burnout: number;
  avg_cognitive: number;
  avg_retention: number;
}

const AdminPanel = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checking, setChecking] = useState(true);
  const [students, setStudents] = useState<StudentStat[]>([]);
  const [scores, setScores] = useState<Record<string, ScoreStat>>({});
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/login"); return; }

    const checkAdmin = async () => {
      const { data } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      if (!data) {
        toast.error("Access denied");
        navigate("/");
        return;
      }
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
      // Fetch all study logs
      const { data: logs } = await supabase.from("study_logs").select("*");
      // Fetch all profiles for matricola
      const { data: profiles } = await supabase.from("profiles").select("id, matricola");
      // Fetch all daily scores
      const { data: dailyScores } = await supabase.from("daily_scores").select("*");

      const matricolaMap: Record<string, string> = {};
      (profiles || []).forEach((p: any) => {
        matricolaMap[p.id] = p.matricola || "N/A";
      });

      // Aggregate study logs per student
      const studentMap: Record<string, StudentStat> = {};
      (logs || []).forEach((log: any) => {
        if (!studentMap[log.user_id]) {
          studentMap[log.user_id] = {
            user_id: log.user_id,
            matricola: matricolaMap[log.user_id] || "N/A",
            total_sessions: 0,
            total_minutes: 0,
            subjects_studied: [],
            avg_difficulty: 0,
            avg_stress: 0,
            avg_energy: 0,
            avg_distraction: 0,
            last_active: null,
          };
        }
        const s = studentMap[log.user_id];
        s.total_sessions++;
        s.total_minutes += log.duration_minutes;
        if (!s.subjects_studied.includes(log.subject)) s.subjects_studied.push(log.subject);
        s.avg_difficulty += log.difficulty;
        s.avg_stress += log.stress_level;
        s.avg_energy += log.energy_level;
        s.avg_distraction += log.distraction_level;
        if (!s.last_active || log.studied_at > s.last_active) s.last_active = log.studied_at;
      });

      Object.values(studentMap).forEach((s) => {
        if (s.total_sessions > 0) {
          s.avg_difficulty = Math.round((s.avg_difficulty / s.total_sessions) * 10) / 10;
          s.avg_stress = Math.round((s.avg_stress / s.total_sessions) * 10) / 10;
          s.avg_energy = Math.round((s.avg_energy / s.total_sessions) * 10) / 10;
          s.avg_distraction = Math.round((s.avg_distraction / s.total_sessions) * 10) / 10;
        }
      });

      // Aggregate daily scores
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
          user_id: uid,
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

  const formatTime = (mins: number) => {
    if (mins < 60) return `${mins}m`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
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

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <ShieldCheck className="h-6 w-6 text-primary" />
          <h1 className="font-display text-2xl font-bold text-foreground">Admin Panel</h1>
        </motion.div>

        {/* Summary Cards */}
        <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { label: "Students", value: totalStudents, icon: Users, color: "text-primary" },
            { label: "Total Sessions", value: totalSessions, icon: BookOpen, color: "text-accent" },
            { label: "Total Hours", value: `${Math.round(totalMinutes / 60)}h`, icon: Clock, color: "text-secondary" },
            { label: "Avg Session", value: `${avgSessionLength}m`, icon: BarChart3, color: "text-muted-foreground" },
          ].map((card, i) => (
            <motion.div key={card.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <Card>
                <CardContent className="flex items-center gap-3 p-4">
                  <card.icon className={`h-8 w-8 ${card.color}`} />
                  <div>
                    <p className="text-xs text-muted-foreground">{card.label}</p>
                    <p className="text-xl font-bold text-foreground">{card.value}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Student Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5 text-primary" />
              Student Study Analytics
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingData ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : students.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">No student data yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Matricola</TableHead>
                      <TableHead>Sessions</TableHead>
                      <TableHead>Total Time</TableHead>
                      <TableHead>Subjects</TableHead>
                      <TableHead>Avg Difficulty</TableHead>
                      <TableHead>Avg Stress</TableHead>
                      <TableHead>Avg Energy</TableHead>
                      <TableHead>Avg Distraction</TableHead>
                      <TableHead>Burnout Risk</TableHead>
                      <TableHead>Cognitive</TableHead>
                      <TableHead>Retention</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((s) => {
                      const sc = scores[s.user_id];
                      return (
                        <TableRow key={s.user_id}>
                          <TableCell className="font-mono font-semibold">{s.matricola}</TableCell>
                          <TableCell>{s.total_sessions}</TableCell>
                          <TableCell>{formatTime(s.total_minutes)}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {s.subjects_studied.slice(0, 3).map((sub) => (
                                <Badge key={sub} variant="secondary" className="text-xs">{sub}</Badge>
                              ))}
                              {s.subjects_studied.length > 3 && (
                                <Badge variant="outline" className="text-xs">+{s.subjects_studied.length - 3}</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{s.avg_difficulty}/5</TableCell>
                          <TableCell>{s.avg_stress}/5</TableCell>
                          <TableCell>{s.avg_energy}/5</TableCell>
                          <TableCell>{s.avg_distraction}/5</TableCell>
                          <TableCell>{sc ? `${sc.avg_burnout}%` : "—"}</TableCell>
                          <TableCell>{sc ? `${sc.avg_cognitive}%` : "—"}</TableCell>
                          <TableCell>{sc ? `${sc.avg_retention}%` : "—"}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminPanel;
