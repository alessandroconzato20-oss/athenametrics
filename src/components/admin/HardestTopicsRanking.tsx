import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Flame, Brain, Zap, Eye, BookOpen, GraduationCap, ChevronDown } from "lucide-react";
import { getTopicsForCourse } from "@/data/courseTopics";
import type { TopicMetric } from "@/components/admin/TopicSummaryTable";

export interface HardestTopicEntry {
  subject: string;
  topic: string;
  composite_score: number;
  avg_difficulty: number;
  avg_stress: number;
  avg_comprehension: number;
  avg_confidence: number;
  avg_revision_priority: number;
  avg_applicability: number;
  students_logged: number;
  mastery_red: number;
  mastery_orange: number;
  mastery_green: number;
}

interface Props {
  topics: HardestTopicEntry[];
  masteryBySubtopic?: Record<string, { red: number; orange: number; green: number }>;
  subtopicMetrics?: TopicMetric[];
}

const difficultyLabel = (score: number) => {
  if (score >= 4) return { text: "Very Hard", color: "bg-destructive/15 text-destructive" };
  if (score >= 3) return { text: "Hard", color: "bg-orange-500/15 text-orange-600" };
  if (score >= 2) return { text: "Medium", color: "bg-amber-500/15 text-amber-600" };
  return { text: "Easier", color: "bg-emerald-500/15 text-emerald-600" };
};

const MiniStat = ({ label, value, icon: Icon }: { label: string; value: string; icon: React.ElementType }) => (
  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
    <Icon className="h-3 w-3" />
    <span>{label}:</span>
    <span className="font-semibold text-foreground">{value}</span>
  </div>
);

const STATUS_CONFIG: Record<string, { label: string; dot: string; text: string }> = {
  red:    { label: "Needs Focus", dot: "bg-destructive", text: "text-destructive" },
  orange: { label: "In Progress", dot: "bg-amber-500", text: "text-amber-500" },
  green:  { label: "Confident",   dot: "bg-emerald-500", text: "text-emerald-500" },
};

const ratingColor = (val: number, invert = false) => {
  const v = invert ? 6 - val : val;
  if (v >= 4) return "text-destructive";
  if (v >= 3) return "text-orange-500";
  if (v >= 2) return "text-amber-500";
  return "text-emerald-500";
};

interface SubtopicRowProps {
  name: string;
  mastery?: { red: number; orange: number; green: number };
  metric?: TopicMetric;
}

const SubtopicRow = ({ name, mastery, metric }: SubtopicRowProps) => {
  const total = mastery ? mastery.red + mastery.orange + mastery.green : 0;
  let dominant: "red" | "orange" | "green" = "red";
  if (mastery && total > 0) {
    if (mastery.green >= mastery.red && mastery.green >= mastery.orange) dominant = "green";
    else if (mastery.orange >= mastery.red) dominant = "orange";
  }
  const cfg = STATUS_CONFIG[dominant];

  return (
    <div className="rounded-lg border border-border/30 p-2 space-y-1.5">
      {/* Header row */}
      <div className="flex items-center gap-2">
        <div className={`h-2.5 w-2.5 shrink-0 rounded-full ${total > 0 ? cfg.dot : "bg-muted-foreground/30"}`} />
        <p className="text-xs font-medium text-foreground truncate flex-1">{name}</p>
        {total > 0 ? (
          <div className="flex items-center gap-2 text-[10px] font-medium shrink-0">
            <span className="flex items-center gap-0.5"><span className="h-1.5 w-1.5 rounded-full bg-destructive" />{mastery!.red}</span>
            <span className="flex items-center gap-0.5"><span className="h-1.5 w-1.5 rounded-full bg-amber-500" />{mastery!.orange}</span>
            <span className="flex items-center gap-0.5"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />{mastery!.green}</span>
          </div>
        ) : null}
      </div>

      {/* Difficulty insights row - only if study log data exists */}
      {metric ? (
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 pl-4">
          <span className="text-[10px]">
            <span className="text-muted-foreground">Diff: </span>
            <span className={`font-semibold ${ratingColor(metric.avg_difficulty)}`}>{metric.avg_difficulty.toFixed(1)}</span>
          </span>
          <span className="text-[10px]">
            <span className="text-muted-foreground">Stress: </span>
            <span className={`font-semibold ${ratingColor(metric.avg_stress)}`}>{metric.avg_stress.toFixed(1)}</span>
          </span>
          <span className="text-[10px]">
            <span className="text-muted-foreground">Comp: </span>
            <span className={`font-semibold ${ratingColor(metric.avg_comprehension, true)}`}>{metric.avg_comprehension.toFixed(1)}</span>
          </span>
          <span className="text-[10px]">
            <span className="text-muted-foreground">Conf: </span>
            <span className={`font-semibold ${ratingColor(metric.avg_confidence, true)}`}>{metric.avg_confidence.toFixed(1)}</span>
          </span>
          <span className="text-[10px]">
            <span className="text-muted-foreground">Rev Pri: </span>
            <span className={`font-semibold ${ratingColor(metric.avg_revision_priority)}`}>{metric.avg_revision_priority.toFixed(1)}</span>
          </span>
          <span className="text-[10px] text-muted-foreground">
            ({metric.sessions} sessions, {metric.students_count} students)
          </span>
        </div>
      ) : (
        <p className="text-[10px] text-muted-foreground pl-4">No study log data</p>
      )}
    </div>
  );
};

const HardestTopicsRanking: React.FC<Props> = ({ topics, masteryBySubtopic = {}, subtopicMetrics = [] }) => {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  if (topics.length === 0) return null;

  // Build a lookup map for course-level metrics: "subject" -> TopicMetric
  // Study logs store topic = course name, so we key by subject (course name)
  const courseMetricsMap = new Map<string, TopicMetric>();
  subtopicMetrics.forEach(m => {
    // Use subject as key since study logs topic = subject (course name)
    if (!courseMetricsMap.has(m.subject)) {
      courseMetricsMap.set(m.subject, m);
    } else {
      // Merge if multiple entries exist for same subject (shouldn't normally happen)
      const existing = courseMetricsMap.get(m.subject)!;
      if (m.sessions > existing.sessions) courseMetricsMap.set(m.subject, m);
    }
  });

  const toggle = (key: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Flame className="h-5 w-5 text-destructive" />
        <h2 className="text-lg font-bold text-foreground">Hardest Topics Ranking</h2>
        <Badge variant="destructive" className="text-[10px]">Live</Badge>
      </div>
      <p className="text-xs text-muted-foreground">
        Topics ranked by composite difficulty. Expand to see per-subtopic mastery status and self-reported difficulty insights (difficulty, stress, comprehension, confidence, revision priority).
      </p>

      <div className="space-y-2">
        {topics.slice(0, 20).map((t, i) => {
          const dl = difficultyLabel(t.composite_score);
          const totalMastery = t.mastery_red + t.mastery_orange + t.mastery_green;
          const key = `${t.subject}-${t.topic}`;
          const isExpanded = expanded.has(key);

          const allSubtopics = getTopicsForCourse(t.subject).filter(st => !st.startsWith("## "));

          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <Card className={i < 3 ? "border-destructive/30" : ""}>
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      i === 0 ? "bg-destructive text-destructive-foreground" :
                      i < 3 ? "bg-destructive/20 text-destructive" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {i + 1}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-foreground truncate">{t.topic}</p>
                        <Badge variant="outline" className="text-[10px] shrink-0">{t.subject}</Badge>
                        <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${dl.color}`}>{dl.text}</span>
                      </div>

                      <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
                        <MiniStat label="Diff" value={`${t.avg_difficulty.toFixed(1)}/5`} icon={Brain} />
                        <MiniStat label="Stress" value={`${t.avg_stress.toFixed(1)}/5`} icon={Flame} />
                        <MiniStat label="Comp" value={`${t.avg_comprehension.toFixed(1)}/5`} icon={BookOpen} />
                        <MiniStat label="Conf" value={`${t.avg_confidence.toFixed(1)}/5`} icon={Zap} />
                        <MiniStat label="Rev Pri" value={`${t.avg_revision_priority.toFixed(1)}/5`} icon={Eye} />
                        <MiniStat label="Applic" value={`${t.avg_applicability.toFixed(1)}/5`} icon={GraduationCap} />
                      </div>

                      <div className="mt-1.5 flex items-center gap-3">
                        <span className="text-[10px] text-muted-foreground">{t.students_logged} students logged</span>
                        {totalMastery > 0 && (
                          <div className="flex items-center gap-2 text-[10px] font-medium">
                            <span className="flex items-center gap-0.5"><span className="h-2 w-2 rounded-full bg-destructive" />{t.mastery_red}</span>
                            <span className="flex items-center gap-0.5"><span className="h-2 w-2 rounded-full bg-amber-500" />{t.mastery_orange}</span>
                            <span className="flex items-center gap-0.5"><span className="h-2 w-2 rounded-full bg-emerald-500" />{t.mastery_green}</span>
                          </div>
                        )}
                      </div>

                      {allSubtopics.length > 0 && (
                        <button
                          type="button"
                          onClick={() => toggle(key)}
                          className="mt-2 flex items-center gap-1 text-[11px] text-primary font-medium hover:underline"
                        >
                          <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                            <ChevronDown className="h-3.5 w-3.5" />
                          </motion.div>
                          {isExpanded ? "Hide" : "Show"} {allSubtopics.length} subtopics
                        </button>
                      )}

                      <AnimatePresence>
                        {isExpanded && allSubtopics.length > 0 && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-2 space-y-1 border-t border-border/50 pt-2"
                          >
                            {allSubtopics.map(st => {
                              const mKey = `${t.subject}|||${st}`;
                              return (
                                <SubtopicRow
                                  key={st}
                                  name={st}
                                  mastery={masteryBySubtopic[mKey]}
                                  metric={courseMetricsMap.get(t.subject)}
                                />
                              );
                            })}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="text-lg font-bold text-foreground">{t.composite_score.toFixed(1)}</p>
                      <p className="text-[9px] text-muted-foreground">score</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default HardestTopicsRanking;
