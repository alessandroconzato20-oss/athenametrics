import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  ChevronDown, ChevronUp, UserCircle, Trash2, Clock, BookOpen,
  Brain, Flame, Activity, Eye, Zap, GraduationCap, Calendar
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";

export interface PersonaData {
  goals: string[];
  study_style: string | null;
  weekly_study_hours: string | null;
  biggest_challenge: string | null;
  motivation_type: string | null;
  preferred_session_length: string | null;
  learning_method: string | null;
  stress_management: string | null;
  social_preference: string | null;
}

export interface RecentSession {
  subject: string;
  topic: string;
  duration_minutes: number;
  studied_at: string;
  difficulty: number;
  stress_level: number;
  comprehension_level: number | null;
  confidence_level: number | null;
  revision_priority: number | null;
  teaching_readiness: number | null;
  notes: string | null;
}

export interface ScoreStat {
  avg_burnout: number;
  avg_cognitive: number;
  avg_retention: number;
}

export interface StudentStat {
  user_id: string;
  matricola: string;
  university: string;
  total_sessions: number;
  total_minutes: number;
  subjects_studied: string[];
  subject_minutes: Record<string, number>;
  avg_difficulty: number;
  avg_stress: number;
  avg_energy: number;
  avg_distraction: number;
  avg_comprehension: number;
  avg_confidence: number;
  avg_revision_priority: number;
  avg_teaching_readiness: number;
  last_active: string | null;
  persona: PersonaData | null;
  recent_sessions: RecentSession[];
  study_days: number;
}

interface Props {
  student: StudentStat;
  score: ScoreStat | undefined;
  onDelete: (userId: string, matricola: string) => void;
}

const formatTime = (mins: number) => {
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
};

const MetricBar = ({ label, value, max, icon: Icon, color }: { label: string; value: number; max: number; icon: React.ElementType; color: string }) => (
  <div className="space-y-1">
    <div className="flex items-center justify-between text-xs">
      <span className="flex items-center gap-1 text-muted-foreground">
        <Icon className="h-3 w-3" />
        {label}
      </span>
      <span className="font-semibold text-foreground">{value}/{max}</span>
    </div>
    <Progress value={(value / max) * 100} className={`h-2 ${color}`} />
  </div>
);

const ScoreRing = ({ label, value, color }: { label: string; value: number; color: string }) => (
  <div className="flex flex-col items-center gap-1">
    <div className={`flex h-12 w-12 items-center justify-center rounded-full border-2 ${color} font-bold text-sm`}>
      {value}%
    </div>
    <span className="text-[10px] text-muted-foreground text-center">{label}</span>
  </div>
);

const StudentCard: React.FC<Props> = ({ student: s, score: sc, onDelete }) => {
  const [expanded, setExpanded] = useState(false);

  const topSubject = Object.entries(s.subject_minutes).sort((a, b) => b[1] - a[1])[0];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="overflow-hidden">
        {/* Header row - always visible */}
        <div
          className="flex cursor-pointer items-center gap-4 p-4 hover:bg-muted/30 transition-colors"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <UserCircle className="h-5 w-5 text-primary" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono font-semibold text-foreground text-sm">{s.matricola}</span>
              {s.university !== "N/A" && (
                <Badge variant="outline" className="text-[10px]">
                  <GraduationCap className="h-3 w-3 mr-1" />
                  {s.university}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
              <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" />{s.total_sessions} sessions</span>
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatTime(s.total_minutes)}</span>
              {s.last_active && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(s.last_active), "MMM d")}
                </span>
              )}
            </div>
          </div>

          {/* Quick health scores */}
          {sc && (
            <div className="hidden md:flex items-center gap-3">
              <ScoreRing label="Burnout" value={sc.avg_burnout} color="border-destructive text-destructive" />
              <ScoreRing label="Cognitive" value={sc.avg_cognitive} color="border-primary text-primary" />
              <ScoreRing label="Retention" value={sc.avg_retention} color="border-accent text-accent-foreground" />
            </div>
          )}

          <div className="flex items-center gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive h-8 w-8" onClick={(e) => e.stopPropagation()}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete student data?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all study logs and scores for <span className="font-mono font-semibold">{s.matricola}</span>.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onDelete(s.user_id, s.matricola)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </div>
        </div>

        {/* Expanded details */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <CardContent className="border-t pt-4 space-y-5">
                {/* Mobile health scores */}
                {sc && (
                  <div className="flex justify-center gap-6 md:hidden">
                    <ScoreRing label="Burnout" value={sc.avg_burnout} color="border-destructive text-destructive" />
                    <ScoreRing label="Cognitive" value={sc.avg_cognitive} color="border-primary text-primary" />
                    <ScoreRing label="Retention" value={sc.avg_retention} color="border-accent text-accent-foreground" />
                  </div>
                )}

                {/* Self-reported metrics */}
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Self-Reported Averages</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <MetricBar label="Difficulty" value={s.avg_difficulty} max={5} icon={Brain} color="[&>div]:bg-orange-500" />
                    <MetricBar label="Stress" value={s.avg_stress} max={5} icon={Flame} color="[&>div]:bg-red-500" />
                    <MetricBar label="Energy" value={s.avg_energy} max={5} icon={Zap} color="[&>div]:bg-green-500" />
                    <MetricBar label="Distraction" value={s.avg_distraction} max={5} icon={Eye} color="[&>div]:bg-yellow-500" />
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                    <MetricBar label="Comprehension" value={s.avg_comprehension} max={5} icon={BookOpen} color="[&>div]:bg-blue-500" />
                    <MetricBar label="Confidence" value={s.avg_confidence} max={5} icon={Zap} color="[&>div]:bg-emerald-500" />
                    <MetricBar label="Rev. Priority" value={s.avg_revision_priority} max={5} icon={Activity} color="[&>div]:bg-amber-500" />
                    <MetricBar label="Teach Ready" value={s.avg_teaching_readiness} max={5} icon={GraduationCap} color="[&>div]:bg-indigo-500" />
                  </div>
                </div>

                {/* Subject breakdown */}
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Subject Breakdown</h4>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(s.subject_minutes)
                      .sort((a, b) => b[1] - a[1])
                      .map(([subj, mins]) => (
                        <Badge key={subj} variant="secondary" className="text-xs gap-1">
                          {subj}
                          <span className="text-muted-foreground font-normal">({formatTime(mins)})</span>
                        </Badge>
                      ))}
                  </div>
                </div>

                {/* Activity summary */}
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Activity Summary</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div className="rounded-md bg-muted/50 p-2.5">
                      <p className="text-[10px] text-muted-foreground">Avg Session</p>
                      <p className="font-semibold text-foreground">{s.total_sessions > 0 ? formatTime(Math.round(s.total_minutes / s.total_sessions)) : "—"}</p>
                    </div>
                    <div className="rounded-md bg-muted/50 p-2.5">
                      <p className="text-[10px] text-muted-foreground">Active Days</p>
                      <p className="font-semibold text-foreground">{s.study_days}</p>
                    </div>
                    <div className="rounded-md bg-muted/50 p-2.5">
                      <p className="text-[10px] text-muted-foreground">Top Subject</p>
                      <p className="font-semibold text-foreground truncate">{topSubject ? topSubject[0] : "—"}</p>
                    </div>
                    <div className="rounded-md bg-muted/50 p-2.5">
                      <p className="text-[10px] text-muted-foreground">Subjects</p>
                      <p className="font-semibold text-foreground">{s.subjects_studied.length}</p>
                    </div>
                  </div>
                </div>

                {/* Recent sessions */}
                {s.recent_sessions.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Recent Sessions (last 5)</h4>
                    <div className="space-y-1.5">
                      {s.recent_sessions.map((rs, i) => (
                        <div key={i} className="flex items-center justify-between rounded-md bg-muted/30 px-3 py-2 text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-medium text-foreground truncate">{rs.subject}</span>
                            {rs.topic && <span className="text-muted-foreground truncate hidden sm:inline">· {rs.topic}</span>}
                          </div>
                          <div className="flex items-center gap-3 text-muted-foreground shrink-0">
                            <span>{formatTime(rs.duration_minutes)}</span>
                            <span>{format(new Date(rs.studied_at), "MMM d")}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Persona */}
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Student Persona</h4>
                  {s.persona ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 text-sm">
                      {s.persona.goals.length > 0 && (
                        <div className="col-span-2 md:col-span-3">
                          <span className="text-[10px] text-muted-foreground">Goals</span>
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {s.persona.goals.map(g => <Badge key={g} variant="secondary" className="text-xs">{g}</Badge>)}
                          </div>
                        </div>
                      )}
                      {[
                        ["Study Style", s.persona.study_style],
                        ["Weekly Hours", s.persona.weekly_study_hours],
                        ["Challenge", s.persona.biggest_challenge],
                        ["Motivation", s.persona.motivation_type],
                        ["Session Length", s.persona.preferred_session_length],
                        ["Learning Method", s.persona.learning_method],
                        ["Stress Mgmt", s.persona.stress_management],
                        ["Social Pref", s.persona.social_preference],
                      ]
                        .filter(([, v]) => v)
                        .map(([label, value]) => (
                          <div key={label as string} className="rounded-md bg-muted/30 p-2">
                            <span className="text-[10px] text-muted-foreground">{label}</span>
                            <p className="font-medium text-foreground text-xs">{value}</p>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground italic text-xs">No persona quiz completed.</p>
                  )}
                </div>
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
};

export default StudentCard;
