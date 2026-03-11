import { motion } from "framer-motion";
import { Brain, Clock, AlertTriangle, BookOpen, Sun, ChevronRight, Sparkles } from "lucide-react";
import DisagreeButton from "@/components/DisagreeButton";

interface ScoreCardProps {
  label: string;
  value: string;
  icon: string;
  colorClass: string;
  index: number;
  actionText: string;
  numValue: number;
  subtitle?: string;
  onClick: () => void;
}

const iconMap: Record<string, React.ReactNode> = {
  brain: <Brain className="h-5 w-5" />,
  clock: <Clock className="h-5 w-5" />,
  alert: <AlertTriangle className="h-5 w-5" />,
  book: <BookOpen className="h-5 w-5" />,
  sun: <Sun className="h-5 w-5" />,
};

const getScoreEmoji = (icon: string, numValue: number) => {
  if (icon === "alert") return numValue > 60 ? "🔴" : numValue > 30 ? "🟡" : "🟢";
  if (icon === "brain") return numValue > 70 ? "🔥" : numValue > 40 ? "⚡" : "😴";
  return "";
};

const ScoreCard = ({ label, value, icon, colorClass, index, actionText, numValue, subtitle, onClick }: ScoreCardProps) => {
  const isGood = icon === "alert" ? numValue < 30 : numValue > 70;
  
  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 + index * 0.08 }}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="group relative flex items-start gap-3 rounded-2xl bg-card p-4 text-left shadow-card transition-all hover:shadow-elevated overflow-hidden"
    >
      {/* Subtle shimmer on hover */}
      <motion.div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ background: "linear-gradient(135deg, transparent 40%, hsl(var(--primary) / 0.04) 50%, transparent 60%)" }}
      />
      
      <div className="relative">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${colorClass} transition-transform group-hover:scale-110`}>
          {iconMap[icon]}
        </div>
        {isGood && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5 + index * 0.1, type: "spring" }}
            className="absolute -right-1 -top-1"
          >
            <Sparkles className="h-3.5 w-3.5 text-accent" />
          </motion.div>
        )}
      </div>
      
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <span className="text-xs">{getScoreEmoji(icon, numValue)}</span>
        </div>
        <p className="font-display text-lg font-bold text-foreground leading-tight">{value}</p>
        {subtitle && (
          <p className="mt-0.5 text-[11px] font-semibold text-primary/80">{subtitle}</p>
        )}
        <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground/80 line-clamp-2">{actionText}</p>
      </div>
      
      <div className="flex flex-col items-center gap-1.5 shrink-0">
        <DisagreeButton
          feedbackType="metric"
          context={{ metric: label, value, numValue }}
          size="sm"
        />
        <ChevronRight className="h-4 w-4 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
      </div>
    </motion.button>
  );
};

export default ScoreCard;
