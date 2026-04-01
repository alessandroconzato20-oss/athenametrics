import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Flame, Brain, Zap, Eye, BookOpen, GraduationCap, TrendingDown } from "lucide-react";

export interface HardestTopicEntry {
  subject: string;
  topic: string;
  /** Composite difficulty score 0-5 combining all metrics */
  composite_score: number;
  avg_difficulty: number;
  avg_stress: number;
  avg_comprehension: number;
  avg_confidence: number;
  avg_revision_priority: number;
  avg_applicability: number;
  students_logged: number;
  /** From topic_mastery: how many students marked it red/orange/green */
  mastery_red: number;
  mastery_orange: number;
  mastery_green: number;
}

interface Props {
  topics: HardestTopicEntry[];
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

const HardestTopicsRanking: React.FC<Props> = ({ topics }) => {
  if (topics.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Flame className="h-5 w-5 text-destructive" />
        <h2 className="text-lg font-bold text-foreground">Hardest Topics Ranking</h2>
        <Badge variant="destructive" className="text-[10px]">Live</Badge>
      </div>
      <p className="text-xs text-muted-foreground">
        Topics ranked by a composite difficulty score combining self-reported difficulty, stress, low comprehension, low confidence, and mastery status. Higher = harder.
      </p>

      <div className="space-y-2">
        {topics.slice(0, 20).map((t, i) => {
          const dl = difficultyLabel(t.composite_score);
          const totalMastery = t.mastery_red + t.mastery_orange + t.mastery_green;
          return (
            <motion.div
              key={`${t.subject}-${t.topic}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <Card className={i < 3 ? "border-destructive/30" : ""}>
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    {/* Rank */}
                    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      i === 0 ? "bg-destructive text-destructive-foreground" :
                      i < 3 ? "bg-destructive/20 text-destructive" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {i + 1}
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Topic name & subject */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-foreground truncate">{t.topic}</p>
                        <Badge variant="outline" className="text-[10px] shrink-0">{t.subject}</Badge>
                        <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${dl.color}`}>{dl.text}</span>
                      </div>

                      {/* Metrics row */}
                      <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
                        <MiniStat label="Diff" value={`${t.avg_difficulty.toFixed(1)}/5`} icon={Brain} />
                        <MiniStat label="Stress" value={`${t.avg_stress.toFixed(1)}/5`} icon={Flame} />
                        <MiniStat label="Comp" value={`${t.avg_comprehension.toFixed(1)}/5`} icon={BookOpen} />
                        <MiniStat label="Conf" value={`${t.avg_confidence.toFixed(1)}/5`} icon={Zap} />
                        <MiniStat label="Rev Pri" value={`${t.avg_revision_priority.toFixed(1)}/5`} icon={Eye} />
                        <MiniStat label="Applic" value={`${t.avg_applicability.toFixed(1)}/5`} icon={GraduationCap} />
                      </div>

                      {/* Mastery + students row */}
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
                    </div>

                    {/* Composite score */}
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
