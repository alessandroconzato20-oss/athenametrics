import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

interface MicroRewardProps {
  show: boolean;
  message: string;
  emoji: string;
  onComplete: () => void;
}

const MicroReward = ({ show, message, emoji, onComplete }: MicroRewardProps) => {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(onComplete, 2500);
      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: -30 }}
          transition={{ type: "spring", damping: 15 }}
          className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-2xl bg-card px-6 py-4 shadow-elevated"
        >
          <div className="flex items-center gap-3">
            <motion.span
              animate={{ scale: [1, 1.4, 1], rotate: [0, 15, -15, 0] }}
              transition={{ duration: 0.6 }}
              className="text-3xl"
            >
              {emoji}
            </motion.span>
            <div>
              <p className="font-display text-sm font-bold text-foreground">{message}</p>
              <motion.div
                initial={{ width: "100%" }}
                animate={{ width: "0%" }}
                transition={{ duration: 2.5, ease: "linear" }}
                className="mt-1.5 h-0.5 rounded-full bg-primary"
              />
            </div>
          </div>
          
          {/* Confetti particles */}
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 1, x: 0, y: 0 }}
              animate={{
                opacity: 0,
                x: (Math.random() - 0.5) * 120,
                y: -Math.random() * 80 - 20,
              }}
              transition={{ duration: 1, delay: 0.1 }}
              className="absolute left-1/2 top-1/2 h-1.5 w-1.5 rounded-full"
              style={{
                background: `hsl(${[162, 38, 270, 220, 0, 180][i]} 70% 55%)`,
              }}
            />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MicroReward;
