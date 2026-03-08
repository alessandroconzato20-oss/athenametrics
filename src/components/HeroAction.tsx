import { motion } from "framer-motion";
import { Zap, Coffee, Moon, Brain, Sunrise } from "lucide-react";

interface HeroActionProps {
  displayName: string;
  scores: {
    cognitiveReadiness: number;
    burnoutRisk: number;
    peakWindow: string;
    studyCapacity: string;
  } | null;
}

const HeroAction = ({ displayName, scores }: HeroActionProps) => {
  const hour = new Date().getHours();
  
  const getMessage = () => {
    if (!scores) return { text: `Loading your metrics, ${displayName}...`, icon: <Brain className="h-5 w-5" />, sub: "" };

    const { cognitiveReadiness, burnoutRisk, peakWindow } = scores;
    
    // Morning - motivational push
    if (hour >= 5 && hour < 10) {
      if (cognitiveReadiness > 70) return {
        text: `Your brain is sharp — start studying now.`,
        icon: <Sunrise className="h-5 w-5 text-accent" />,
        sub: `Cognitive readiness at ${cognitiveReadiness}/100. Your peak window is ${peakWindow}.`
      };
      if (burnoutRisk > 60) return {
        text: `Take it easy this morning, ${displayName}.`,
        icon: <Coffee className="h-5 w-5 text-score-burnout" />,
        sub: `Burnout risk is elevated. Start with light review, not heavy topics.`
      };
      return {
        text: `Good morning — your peak window starts at ${peakWindow}.`,
        icon: <Zap className="h-5 w-5 text-primary" />,
        sub: `Warm up with flashcards now, then hit your hardest subject at peak.`
      };
    }
    
    // Late morning - action time
    if (hour >= 10 && hour < 13) {
      if (cognitiveReadiness > 60) return {
        text: `You're in the zone — tackle your hardest topic now.`,
        icon: <Brain className="h-5 w-5 text-score-cognitive" />,
        sub: `Cognitive readiness is strong. This is your best window for complex material.`
      };
      return {
        text: `Focus window is open. Start a study session now.`,
        icon: <Zap className="h-5 w-5 text-primary" />,
        sub: `Log your session to track patterns and unlock insights.`
      };
    }
    
    // Afternoon
    if (hour >= 13 && hour < 18) {
      if (burnoutRisk > 50) return {
        text: `Take a 15-min break, then do one more session.`,
        icon: <Coffee className="h-5 w-5 text-accent" />,
        sub: `Your burnout risk is rising. A short walk will reset your focus.`
      };
      return {
        text: `Afternoon grind — switch to active recall.`,
        icon: <Brain className="h-5 w-5 text-score-cognitive" />,
        sub: `Practice questions beat re-reading. Log what you study.`
      };
    }
    
    // Evening
    if (hour >= 18 && hour < 22) {
      return {
        text: `Wind down with light review only.`,
        icon: <Moon className="h-5 w-5 text-score-retention" />,
        sub: `Your brain consolidates during sleep. Protect tomorrow's performance.`
      };
    }
    
    // Night
    return {
      text: `Stop studying and sleep, ${displayName}.`,
      icon: <Moon className="h-5 w-5 text-score-retention" />,
      sub: `Sleep is the single best thing for retention right now.`
    };
  };

  const { text, icon, sub } = getMessage();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="mb-6 rounded-2xl bg-card p-5 shadow-card"
    >
      <div className="flex items-start gap-3">
        <motion.div
          animate={{ rotate: [0, -5, 5, 0] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 4 }}
          className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10"
        >
          {icon}
        </motion.div>
        <div>
          <p className="font-display text-lg font-bold leading-snug text-foreground">{text}</p>
          {sub && <p className="mt-1 text-sm text-muted-foreground">{sub}</p>}
        </div>
      </div>
    </motion.div>
  );
};

export default HeroAction;
