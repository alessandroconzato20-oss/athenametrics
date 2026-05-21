import { motion } from "framer-motion";
import { Brain, Clock, AlertTriangle, BookOpen, Sun, ChevronRight, Sparkles, Loader2 } from "lucide-react";
import DisagreeButton from "@/components/DisagreeButton";
import type { ScoreCalibration } from "@/algorithms/calibration";

interface ScoreCardProps {
  label: string;
  value: string;
  icon: string;
  colorClass: string;
  index: number;
  actionText: string;
  numValue: number;
  subtitle?: string;
  compact?: boolean;
  calibration?: ScoreCalibration;
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

const ScoreCard = ({ label, value, icon, colorClass, index, actionText, numValue, subtitle, compact, calibration, onClick }: ScoreCardProps) => {
  const isGood = icon === "alert" ? numValue < 30 : numValue > 70;
  const isCalibrating = calibration && calibration.tier !== "calibrated";

  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 + index * 0.08 }}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={`group relative flex items-start gap-3 rounded-2xl bg-card text-left shadow-card transition-all hover:shadow-elevated overflow-hidden ${compact ? "p-3 mx-2" : "p-4"}`}
    >
      {/* Subtle shimmer on hover */}
      <motion.div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ background: "linear-gradient(135deg, transparent 40%, hsl(var(--primary) / 0.04) 50%, transparent 60%)" }}
      />

      {/* Calibration hatched overlay */}
      {isCalibrating && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(135deg, hsl(var(--primary)) 0 1px, transparent 1px 9px)",
          }}
        />
      )}

      <div className="relative">
        <div className={`flex shrink-0 items-center justify-center rounded-xl ${colorClass} transition-transform group-hover:scale-110 ${compact ? "h-10 w-10" : "h-12 w-12"} ${isCalibrating ? "ring-2 ring-dashed ring-primary/40 ring-offset-1 ring-offset-card" : ""}`}>
          {iconMap[icon]}
        </div>
        {isGood && !isCalibrating && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5 + index * 0.1, type: "spring" }}
            className="absolute -right-1 -top-1"
          >
            <Sparkles className="h-3.5 w-3.5 text-accent" />
          </motion.div>
        )}
        {isCalibrating && (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
            className="absolute -right-1 -top-1 rounded-full bg-card p-0.5 shadow-sm"
          >
            <Loader2 className="h-3 w-3 text-primary/70" />
          </motion.div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <span className="text-xs">{getScoreEmoji(icon, numValue)}</span>
        </div>
        <p className={`font-display font-bold text-foreground leading-tight ${compact ? "text-base" : "text-lg"} ${isCalibrating ? "opacity-75" : ""}`}>{value}</p>
        {subtitle && (
          <p className="mt-0.5 text-[11px] font-semibold text-primary/80">{subtitle}</p>
        )}
        {isCalibrating && calibration!.label && (
          <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
            <span className="inline-block h-1 w-1 animate-pulse rounded-full bg-primary" />
            {calibration!.label}
          </span>
        )}
        <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground/80 line-clamp-2">
          {isCalibrating ? "Numbers sharpen as Athena learns your rhythm." : actionText}
        </p>
      </div>

      <div className="flex items-center shrink-0">
        <ChevronRight className="h-4 w-4 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
      </div>
    </motion.button>
  );
};

export default ScoreCard;
