import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ChevronDown, ChevronUp, Search, BookOpen, Brain, Zap, AlertTriangle, GraduationCap, Eye } from "lucide-react";

export interface TopicMetric {
  subject: string;
  topic: string;
  sessions: number;
  total_minutes: number;
  avg_difficulty: number;
  avg_stress: number;
  avg_energy: number;
  avg_distraction: number;
  avg_comprehension: number;
  avg_confidence: number;
  avg_revision_priority: number;
  avg_teaching_readiness: number;
  students_count: number;
}

interface Props {
  topics: TopicMetric[];
}

const ratingColor = (val: number) => {
  if (val <= 1.5) return "text-green-600 bg-green-500/10";
  if (val <= 2.5) return "text-emerald-600 bg-emerald-500/10";
  if (val <= 3.5) return "text-amber-600 bg-amber-500/10";
  if (val <= 4.5) return "text-orange-600 bg-orange-500/10";
  return "text-red-600 bg-red-500/10";
};

const invertedRatingColor = (val: number) => {
  if (val >= 4.5) return "text-green-600 bg-green-500/10";
  if (val >= 3.5) return "text-emerald-600 bg-emerald-500/10";
  if (val >= 2.5) return "text-amber-600 bg-amber-500/10";
  if (val >= 1.5) return "text-orange-600 bg-orange-500/10";
  return "text-red-600 bg-red-500/10";
};

const MiniMetric = ({ label, value, inverted = false }: { label: string; value: number; inverted?: boolean }) => {
  const color = inverted ? invertedRatingColor(value) : ratingColor(value);
  return (
    <div className={`rounded-lg px-2 py-1.5 text-center ${color}`}>
      <p className="text-[10px] font-medium opacity-80">{label}</p>
      <p className="text-sm font-bold">{value.toFixed(1)}</p>
    </div>
  );
};

const TopicSummaryTable: React.FC<Props> = ({ topics }) => {
  const [search, setSearch] = useState("");
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());

  const filtered = search
    ? topics.filter(t =>
        t.subject.toLowerCase().includes(search.toLowerCase()) ||
        t.topic.toLowerCase().includes(search.toLowerCase())
      )
    : topics;

  // Group by subject
  const grouped: Record<string, TopicMetric[]> = {};
  filtered.forEach(t => {
    if (!grouped[t.subject]) grouped[t.subject] = [];
    grouped[t.subject].push(t);
  });

  // Sort subjects by total sessions desc
  const sortedSubjects = Object.entries(grouped).sort((a, b) =>
    b[1].reduce((s, t) => s + t.sessions, 0) - a[1].reduce((s, t) => s + t.sessions, 0)
  );

  const toggleSubject = (subj: string) => {
    setExpandedSubjects(prev => {
      const next = new Set(prev);
      if (next.has(subj)) next.delete(subj);
      else next.add(subj);
      return next;
    });
  };

  // Compute subject-level averages
  const getSubjectAvg = (topicsList: TopicMetric[]) => {
    const total = topicsList.reduce((a, t) => a + t.sessions, 0);
    if (total === 0) return { difficulty: 0, stress: 0, comprehension: 0, confidence: 0 };
    return {
      difficulty: topicsList.reduce((a, t) => a + t.avg_difficulty * t.sessions, 0) / total,
      stress: topicsList.reduce((a, t) => a + t.avg_stress * t.sessions, 0) / total,
      comprehension: topicsList.reduce((a, t) => a + t.avg_comprehension * t.sessions, 0) / total,
      confidence: topicsList.reduce((a, t) => a + t.avg_confidence * t.sessions, 0) / total,
    };
  };

  if (topics.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <BookOpen className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-bold text-foreground">Topic Insights Summary</h2>
        <Badge variant="secondary" className="text-[10px]">{topics.length} topics</Badge>
      </div>
      <p className="text-xs text-muted-foreground">Aggregated student ratings across all logged topics. Tap a subject to see per-topic breakdown.</p>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search subjects or topics..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9 h-9 text-sm"
        />
      </div>

      <div className="space-y-2">
        {sortedSubjects.map(([subject, topicsList]) => {
          const isOpen = expandedSubjects.has(subject);
          const avg = getSubjectAvg(topicsList);
          const totalSessions = topicsList.reduce((a, t) => a + t.sessions, 0);
          const uniqueStudents = new Set(topicsList.flatMap(t => Array(t.students_count).fill(0))).size || topicsList[0]?.students_count || 0;

          return (
            <Card key={subject}>
              <div
                className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => toggleSubject(subject)}
              >
                <GraduationCap className="h-4 w-4 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{subject}</p>
                  <p className="text-[10px] text-muted-foreground">{topicsList.length} topics · {totalSessions} sessions</p>
                </div>
                <div className="hidden sm:grid grid-cols-4 gap-1.5">
                  <MiniMetric label="Diff" value={avg.difficulty} />
                  <MiniMetric label="Stress" value={avg.stress} />
                  <MiniMetric label="Comp" value={avg.comprehension} inverted />
                  <MiniMetric label="Conf" value={avg.confidence} inverted />
                </div>
                {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
              </div>

              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <CardContent className="border-t pt-3 space-y-2 px-3 pb-3">
                      {topicsList
                        .sort((a, b) => b.avg_difficulty - a.avg_difficulty)
                        .map(t => (
                          <div key={`${t.subject}-${t.topic}`} className="rounded-xl bg-muted/30 p-3">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-xs font-semibold text-foreground">{t.topic}</p>
                              <span className="text-[10px] text-muted-foreground">{t.sessions} sessions · {t.students_count} students</span>
                            </div>
                            <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
                              <MiniMetric label="Diff" value={t.avg_difficulty} />
                              <MiniMetric label="Stress" value={t.avg_stress} />
                              <MiniMetric label="Energy" value={t.avg_energy} inverted />
                              <MiniMetric label="Distract" value={t.avg_distraction} />
                              <MiniMetric label="Comp" value={t.avg_comprehension} inverted />
                              <MiniMetric label="Conf" value={t.avg_confidence} inverted />
                              <MiniMetric label="Rev Pri" value={t.avg_revision_priority} />
                              <MiniMetric label="Teach" value={t.avg_teaching_readiness} inverted />
                            </div>
                          </div>
                        ))}
                    </CardContent>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default TopicSummaryTable;
