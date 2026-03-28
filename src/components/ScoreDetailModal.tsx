import { motion, AnimatePresence } from "framer-motion";
import { X, Brain, Clock, AlertTriangle, BookOpen, Sun } from "lucide-react";
import BurnoutTrendChart from "@/components/BurnoutTrendChart";

interface ScoreDetailModalProps {
  score: {
    label: string;
    value: string;
    numValue: number;
    color: string;
    icon: string;
    reasoning: string[];
    factors: { label: string; value: number }[];
  } | null;
  onClose: () => void;
}

const iconMap: Record<string, React.ReactNode> = {
  brain: <Brain className="h-6 w-6" />,
  clock: <Clock className="h-6 w-6" />,
  alert: <AlertTriangle className="h-6 w-6" />,
  book: <BookOpen className="h-6 w-6" />,
  sun: <Sun className="h-6 w-6" />,
};

const ScoreDetailModal = ({ score, onClose }: ScoreDetailModalProps) => {
  if (!score) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/30 backdrop-blur-sm sm:items-center"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-lg rounded-t-3xl bg-card p-6 shadow-elevated sm:rounded-3xl"
        >
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${score.color}`}>
                {iconMap[score.icon]}
              </div>
              <div>
                <h3 className="font-display text-lg font-bold text-foreground">{score.label}</h3>
                <p className="text-2xl font-bold text-foreground">{score.value}</p>
              </div>
            </div>
            <button onClick={onClose} className="rounded-full p-2 text-muted-foreground hover:bg-muted">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mb-5 space-y-3">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Contributing Factors</h4>
            {score.factors.map((factor, i) => (
              <div key={i} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-foreground">{factor.label}</span>
                  <span className="font-medium text-foreground">{factor.value}%</span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${factor.value}%` }}
                    transition={{ duration: 0.8, delay: i * 0.1 }}
                    className={`h-2 rounded-full ${score.color}`}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Score Reasoning</h4>
            {score.reasoning.map((r, i) => (
              <p key={i} className="text-sm text-muted-foreground leading-relaxed">• {r}</p>
            ))}
          </div>

          {score.icon === "alert" && (
            <div className="mt-5">
              <BurnoutTrendChart />
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ScoreDetailModal;
