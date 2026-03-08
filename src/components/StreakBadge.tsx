import { motion } from "framer-motion";
import { Stethoscope, Flame, Star, Zap } from "lucide-react";

interface StreakBadgeProps {
  streak: number;
  studySessions: number;
}

const getMilestoneMessage = (streak: number) => {
  if (streak >= 30) return "🏆 Legendary";
  if (streak >= 14) return "🔥 On Fire";
  if (streak >= 7) return "⚡ Unstoppable";
  if (streak >= 3) return "💪 Building";
  return "🌱 Starting";
};

const StreakBadge = ({ streak, studySessions }: StreakBadgeProps) => {
  const isOnFire = streak >= 7;
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.3, type: "spring" }}
      className="flex items-center gap-3"
    >
      <div className="relative">
        <motion.div
          animate={isOnFire ? { 
            boxShadow: [
              "0 0 0 0 hsl(var(--primary) / 0)",
              "0 0 20px 4px hsl(var(--primary) / 0.3)",
              "0 0 0 0 hsl(var(--primary) / 0)"
            ] 
          } : {}}
          transition={{ duration: 2, repeat: Infinity }}
          className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-primary shadow-soft"
        >
          <Stethoscope className="h-7 w-7 text-primary-foreground" />
        </motion.div>
        {studySessions > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.6, type: "spring", stiffness: 400 }}
            className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground"
          >
            {studySessions}
          </motion.div>
        )}
      </div>
      
      <motion.div 
        className="flex flex-col"
        whileHover={{ scale: 1.05 }}
      >
        <div className="flex items-center gap-1.5 rounded-full bg-accent/15 px-3 py-1.5">
          <motion.div
            animate={{ scale: [1, 1.3, 1], rotate: [0, -10, 10, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 2 }}
          >
            <Flame className="h-4 w-4 text-accent" />
          </motion.div>
          <span className="text-sm font-bold text-accent-foreground">{streak} day streak</span>
          {isOnFire && (
            <motion.div
              initial={{ opacity: 0, x: -5 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1 }}
            >
              <Zap className="h-3 w-3 text-accent" />
            </motion.div>
          )}
        </div>
        <span className="mt-0.5 pl-1 text-[10px] font-medium text-muted-foreground">
          {getMilestoneMessage(streak)}
        </span>
      </motion.div>
    </motion.div>
  );
};

export default StreakBadge;
