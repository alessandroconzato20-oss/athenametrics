import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Circle, Sparkles } from "lucide-react";
import PatientCharacter from "@/components/PatientCharacter";

interface Challenge {
  id: number;
  title: string;
  description: string;
  completed: boolean;
  ailment: string; // which ailment this heals
}

const initialChallenges: Challenge[] = [
  { id: 1, title: "Morning Review", description: "Review notes within 30 min of waking", completed: false, ailment: "Headache" },
  { id: 2, title: "Deep Focus Block", description: "Complete a 90-min uninterrupted session", completed: false, ailment: "Arm Injury" },
  { id: 3, title: "Active Recall", description: "Test yourself on 20 flashcards", completed: false, ailment: "Leg Fracture" },
  { id: 4, title: "Teach It Back", description: "Explain a concept out loud", completed: false, ailment: "Bandage" },
];

const WeeklyChallenges = () => {
  const [challenges, setChallenges] = useState(initialChallenges);
  const completedCount = challenges.filter((c) => c.completed).length;
  const progress = (completedCount / challenges.length) * 100;

  const toggleChallenge = (id: number) => {
    setChallenges((prev) =>
      prev.map((c) => (c.id === id ? { ...c, completed: !c.completed } : c))
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.7 }}
      className="rounded-3xl bg-card p-5 shadow-card overflow-hidden"
    >
      {/* Header */}
      <div className="mb-1 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4.5 w-4.5 text-primary" />
          <h3 className="font-display text-lg font-bold text-foreground">Weekly Challenges</h3>
        </div>
        <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
          {completedCount}/{challenges.length}
        </span>
      </div>
      <p className="mb-4 text-xs text-muted-foreground">Complete challenges to heal your patient</p>

      {/* Progress bar */}
      <div className="mb-4 h-2 rounded-full bg-muted overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-gradient-primary"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>

      {/* Patient character */}
      <div className="mb-4">
        <PatientCharacter completedCount={completedCount} totalChallenges={challenges.length} />
      </div>

      {/* Challenge list */}
      <div className="space-y-1.5">
        {challenges.map((challenge, i) => (
          <motion.button
            key={challenge.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.8 + i * 0.05 }}
            onClick={() => toggleChallenge(challenge.id)}
            className={`group flex w-full items-center gap-3 rounded-2xl p-3 text-left transition-all duration-200 ${
              challenge.completed
                ? "bg-primary/5"
                : "hover:bg-muted/80"
            }`}
          >
            <div className="relative shrink-0">
              <AnimatePresence mode="wait">
                {challenge.completed ? (
                  <motion.div
                    key="checked"
                    initial={{ scale: 0, rotate: -90 }}
                    animate={{ scale: 1, rotate: 0 }}
                    exit={{ scale: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    <CheckCircle2 className="h-5.5 w-5.5 text-primary" fill="currentColor" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="unchecked"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                  >
                    <Circle className="h-5.5 w-5.5 text-muted-foreground/30 group-hover:text-muted-foreground/50 transition-colors" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className={`text-sm font-medium transition-all ${
                  challenge.completed ? "text-primary line-through opacity-70" : "text-foreground"
                }`}>
                  {challenge.title}
                </p>
                {challenge.completed && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-xs text-primary/60"
                  >
                    healed {challenge.ailment.toLowerCase()}
                  </motion.span>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">{challenge.description}</p>
            </div>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
};

export default WeeklyChallenges;
