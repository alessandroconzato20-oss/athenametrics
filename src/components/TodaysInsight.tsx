import { motion } from "framer-motion";
import { Lightbulb } from "lucide-react";

interface TodaysInsightProps {
  scores: {
    cognitiveReadiness: number;
    burnoutRisk: number;
    retentionOutlook: number;
    studyCapacity: string;
  } | null;
}

const getInsight = (scores: TodaysInsightProps["scores"]) => {
  if (!scores) return null;
  
  const { cognitiveReadiness, burnoutRisk, retentionOutlook } = scores;
  
  if (burnoutRisk > 60) return {
    title: "Recovery Day Recommended",
    body: "Your burnout markers are elevated. Limit study to 2 light sessions max. Go for a walk, eat well, and sleep early tonight. Tomorrow you'll be sharper.",
    emoji: "🛡️",
    color: "border-score-burnout/30 bg-score-burnout/5",
  };
  
  if (cognitiveReadiness > 80 && burnoutRisk < 30) return {
    title: "Peak Performance Day",
    body: "Everything is aligned today — high cognitive readiness, low burnout risk. Tackle your most challenging material. This is a rare optimal window.",
    emoji: "⚡",
    color: "border-score-cognitive/30 bg-score-cognitive/5",
  };
  
  if (retentionOutlook > 70) return {
    title: "Great Retention Window",
    body: "Your deep sleep was strong. Material studied today has a higher chance of sticking. Prioritise new concepts over revision.",
    emoji: "🧠",
    color: "border-score-retention/30 bg-score-retention/5",
  };
  
  if (cognitiveReadiness < 40) return {
    title: "Low Energy — Be Strategic",
    body: "Your cognitive readiness is low today. Focus on review and easy wins rather than new complex topics. Quality over quantity.",
    emoji: "☕",
    color: "border-accent/30 bg-accent/5",
  };
  
  return {
    title: "Steady Day Ahead",
    body: "Your metrics look balanced. Aim for 2-3 focused study blocks with breaks between. Log each session to build your data.",
    emoji: "📊",
    color: "border-primary/20 bg-primary/5",
  };
};

const TodaysInsight = ({ scores }: TodaysInsightProps) => {
  const insight = getInsight(scores);
  if (!insight) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6 }}
      className={`rounded-2xl border p-4 ${insight.color}`}
    >
      <div className="flex items-start gap-3">
        <motion.div
          animate={{ rotate: [0, -8, 8, 0] }}
          transition={{ duration: 3, repeat: Infinity, repeatDelay: 5 }}
          className="text-2xl"
        >
          {insight.emoji}
        </motion.div>
        <div>
          <div className="flex items-center gap-2">
            <Lightbulb className="h-3.5 w-3.5 text-accent" />
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Today's Insight</p>
          </div>
          <p className="mt-1 font-display text-sm font-bold text-foreground">{insight.title}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{insight.body}</p>
        </div>
      </div>
    </motion.div>
  );
};

export default TodaysInsight;
