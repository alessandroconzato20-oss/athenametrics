import { motion } from "framer-motion";
import { Brain, Clock, AlertTriangle, BookOpen, Sun } from "lucide-react";

interface ScoreCardProps {
  label: string;
  value: string;
  icon: string;
  colorClass: string;
  index: number;
  onClick: () => void;
}

const iconMap: Record<string, React.ReactNode> = {
  brain: <Brain className="h-5 w-5" />,
  clock: <Clock className="h-5 w-5" />,
  alert: <AlertTriangle className="h-5 w-5" />,
  book: <BookOpen className="h-5 w-5" />,
  sun: <Sun className="h-5 w-5" />,
};

const ScoreCard = ({ label, value, icon, colorClass, index, onClick }: ScoreCardProps) => {
  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 + index * 0.08 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="flex items-center gap-3 rounded-2xl bg-card p-4 text-left shadow-card transition-shadow hover:shadow-elevated"
    >
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${colorClass}`}>
        {iconMap[icon]}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="font-display text-lg font-bold text-foreground leading-tight">{value}</p>
      </div>
    </motion.button>
  );
};

export default ScoreCard;
