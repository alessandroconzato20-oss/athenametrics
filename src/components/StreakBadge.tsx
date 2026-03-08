import { motion } from "framer-motion";
import { Stethoscope, Flame } from "lucide-react";

interface StreakBadgeProps {
  streak: number;
  studySessions: number;
}

const StreakBadge = ({ streak, studySessions }: StreakBadgeProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.6, type: "spring" }}
      className="flex items-center gap-4"
    >
      <div className="relative">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-primary shadow-soft">
          <Stethoscope className="h-7 w-7 text-primary-foreground" />
        </div>
        {studySessions > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.9, type: "spring" }}
            className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground"
          >
            {studySessions}
          </motion.div>
        )}
      </div>
      <div className="flex items-center gap-1.5 rounded-full bg-accent/15 px-3 py-1.5">
        <Flame className="h-4 w-4 text-accent" />
        <span className="text-sm font-bold text-accent-foreground">{streak} day streak</span>
      </div>
    </motion.div>
  );
};

export default StreakBadge;
