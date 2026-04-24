import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Activity, Plus, Target, BookOpen, Trophy, GraduationCap,
  Heart, Sparkles, ChevronRight, ChevronLeft, Check,
} from "lucide-react";

interface OnboardingGuideProps {
  open: boolean;
  onClose: () => void;
}

const steps = [
  {
    icon: Sparkles,
    title: "Welcome to Cofactor",
    body: "Your personal study coach. We turn your daily habits and biometrics into clear actions so you study smarter — not longer.",
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    icon: Activity,
    title: "Your Daily Metrics",
    body: "Five scores update each day: Cognitive Readiness, Study Capacity, Burnout Risk, Retention Outlook, and Peak Study Window. Tap any card to see why.",
    color: "text-score-cognitive",
    bg: "bg-score-cognitive/10",
  },
  {
    icon: Heart,
    title: "Daily Check-In",
    body: "Each morning we ask 4 quick questions about rest, stress, motivation, and your night. This fine-tunes your scores to how you actually feel.",
    color: "text-score-burnout",
    bg: "bg-score-burnout/10",
  },
  {
    icon: Plus,
    title: "Log a Study Session",
    body: "Tap the green Log button after studying. This builds your streak, tracks topics, and trains your personalised plan.",
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    icon: Target,
    title: "Weekly Goals",
    body: "Set what you want to cover this week. We break it into a daily plan and show progress as you log sessions.",
    color: "text-goals-purple",
    bg: "bg-goals-purple/10",
  },
  {
    icon: BookOpen,
    title: "Logs",
    body: "Review every past study session — duration, topic, energy and focus levels. Spot patterns over time.",
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    icon: Trophy,
    title: "Rank",
    body: "See how you stack up against classmates on study minutes this week. A little friendly competition.",
    color: "text-accent-foreground",
    bg: "bg-accent/20",
  },
  {
    icon: GraduationCap,
    title: "Exam Progress",
    body: "Tick exams as you pass them and record your grade. Track your full degree journey in one place.",
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    icon: Check,
    title: "You're all set",
    body: "Tap the (i) icon at the top right anytime to see this guide again. Now — let's start your first session.",
    color: "text-primary",
    bg: "bg-primary/10",
  },
];

export default function OnboardingGuide({ open, onClose }: OnboardingGuideProps) {
  const [step, setStep] = useState(0);
  const isLast = step === steps.length - 1;
  const current = steps[step];
  const Icon = current.icon;

  const handleClose = () => {
    setStep(0);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-sm rounded-3xl p-0 overflow-hidden">
        <div className="px-6 pt-7 pb-5">
          {/* Progress dots */}
          <div className="flex justify-center gap-1.5 mb-6">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === step ? "w-6 bg-primary" : i < step ? "w-1.5 bg-primary/40" : "w-1.5 bg-muted"
                }`}
              />
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              className="text-center"
            >
              <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl ${current.bg}`}>
                <Icon className={`h-8 w-8 ${current.color}`} />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">{current.title}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed min-h-[60px]">
                {current.body}
              </p>
            </motion.div>
          </AnimatePresence>

          <div className="mt-6 flex items-center justify-between gap-2">
            {step > 0 ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep(step - 1)}
                className="rounded-full"
              >
                <ChevronLeft className="h-4 w-4" /> Back
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="rounded-full text-muted-foreground"
              >
                Skip
              </Button>
            )}

            <Button
              size="sm"
              onClick={() => (isLast ? handleClose() : setStep(step + 1))}
              className="rounded-full bg-gradient-primary text-primary-foreground font-semibold"
            >
              {isLast ? "Get started" : "Next"}
              {!isLast && <ChevronRight className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
