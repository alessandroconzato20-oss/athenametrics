import { useState } from "react";
import { motion } from "framer-motion";
import { Heart, CheckCircle2 } from "lucide-react";

interface Challenge {
  id: number;
  title: string;
  description: string;
  completed: boolean;
}

const initialChallenges: Challenge[] = [
  { id: 1, title: "Morning Review", description: "Review notes within 30 min of waking up", completed: false },
  { id: 2, title: "Deep Focus Block", description: "Complete a 90-min uninterrupted study session", completed: false },
  { id: 3, title: "Active Recall", description: "Test yourself on 20 flashcards", completed: true },
  { id: 4, title: "Teach It Back", description: "Explain a concept to a friend or out loud", completed: false },
];

const WeeklyChallenges = () => {
  const [challenges, setChallenges] = useState(initialChallenges);
  const completedCount = challenges.filter((c) => c.completed).length;
  const patientHealth = (completedCount / challenges.length) * 100;

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
      className="rounded-3xl bg-card p-5 shadow-card"
    >
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display text-lg font-bold text-foreground">Weekly Challenges</h3>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <span>{completedCount}/{challenges.length}</span>
        </div>
      </div>

      {/* Patient health indicator */}
      <div className="mb-5 rounded-2xl bg-muted p-4">
        <div className="mb-2 flex items-center gap-2">
          <motion.div
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
          >
            <Heart
              className="h-6 w-6"
              style={{ color: patientHealth > 50 ? "hsl(var(--primary))" : "hsl(var(--destructive))" }}
              fill={patientHealth > 25 ? "currentColor" : "none"}
            />
          </motion.div>
          <span className="text-sm font-semibold text-foreground">Patient Status</span>
        </div>
        <div className="h-3 rounded-full bg-background">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${patientHealth}%` }}
            transition={{ duration: 1, delay: 0.8 }}
            className="h-3 rounded-full bg-gradient-primary"
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {patientHealth === 100
            ? "🎉 Patient fully healed! Amazing work!"
            : patientHealth >= 50
            ? "Patient is recovering well. Keep going!"
            : "Patient needs your help. Complete more challenges!"}
        </p>
      </div>

      <div className="space-y-2">
        {challenges.map((challenge, i) => (
          <motion.button
            key={challenge.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.8 + i * 0.05 }}
            onClick={() => toggleChallenge(challenge.id)}
            className={`flex w-full items-start gap-3 rounded-xl p-3 text-left transition-colors ${
              challenge.completed ? "bg-primary/5" : "hover:bg-muted"
            }`}
          >
            <CheckCircle2
              className={`mt-0.5 h-5 w-5 shrink-0 ${
                challenge.completed ? "text-primary" : "text-muted-foreground/30"
              }`}
              fill={challenge.completed ? "currentColor" : "none"}
            />
            <div>
              <p className={`text-sm font-medium ${challenge.completed ? "text-primary line-through" : "text-foreground"}`}>
                {challenge.title}
              </p>
              <p className="text-xs text-muted-foreground">{challenge.description}</p>
            </div>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
};

export default WeeklyChallenges;
