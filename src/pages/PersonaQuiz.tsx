import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { ChevronRight, ChevronLeft, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface QuizQuestion {
  id: string;
  question: string;
  type: "single" | "multi" | "text";
  options?: string[];
  maxSelect?: number;
}

const questions: QuizQuestion[] = [
  {
    id: "goals",
    question: "What are your main goals with CoFactor Student?",
    type: "multi",
    maxSelect: 3,
    options: [
      "Reduce burnout & stress",
      "Improve study efficiency",
      "Build consistent study habits",
      "Track my progress over time",
      "Get personalised study plans",
      "Prepare for exams smarter",
    ],
  },
  {
    id: "study_style",
    question: "How would you describe your study style?",
    type: "single",
    options: [
      "Marathon — long sessions, fewer days",
      "Sprinter — short bursts, many days",
      "Night owl — most productive late",
      "Early bird — best in the morning",
      "Flexible — depends on the day",
    ],
  },
  {
    id: "weekly_study_hours",
    question: "How many hours do you typically study per week?",
    type: "single",
    options: ["Less than 10 hours", "10–20 hours", "20–30 hours", "30–40 hours", "40+ hours"],
  },
  {
    id: "biggest_challenge",
    question: "What's your biggest academic challenge right now?",
    type: "single",
    options: [
      "Staying focused during study sessions",
      "Managing stress and anxiety",
      "Understanding complex material",
      "Balancing study with personal life",
      "Staying motivated long-term",
      "Retaining what I study",
    ],
  },
  {
    id: "motivation_type",
    question: "What motivates you most?",
    type: "single",
    options: [
      "Seeing my progress & streaks",
      "Competing with peers",
      "Reaching personal goals",
      "Fear of falling behind",
      "Rewards & achievements",
    ],
  },
  {
    id: "preferred_session_length",
    question: "What's your ideal study session length?",
    type: "single",
    options: ["25 min (Pomodoro)", "45–60 minutes", "1.5–2 hours", "2–3 hours", "3+ hours"],
  },
  {
    id: "learning_method",
    question: "Which learning methods work best for you?",
    type: "multi",
    maxSelect: 3,
    options: [
      "Reading textbooks & notes",
      "Watching video lectures",
      "Practice questions & quizzes",
      "Group study & discussions",
      "Teaching others / explaining",
      "Flashcards & spaced repetition",
    ],
  },
  {
    id: "stress_management",
    question: "How do you usually cope with academic stress?",
    type: "single",
    options: [
      "Exercise & physical activity",
      "Socialising with friends",
      "Rest & sleep",
      "Entertainment & hobbies",
      "I struggle to manage it",
    ],
  },
  {
    id: "social_preference",
    question: "Do you prefer studying alone or with others?",
    type: "single",
    options: [
      "Always alone",
      "Mostly alone, sometimes with others",
      "Mix of both equally",
      "Mostly with others",
      "Always in groups",
    ],
  },
  {
    id: "additional_notes",
    question: "Anything else you'd like us to know to personalise your experience?",
    type: "text",
  },
];

const PersonaQuiz = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [saving, setSaving] = useState(false);

  const current = questions[step];
  const progress = ((step + 1) / questions.length) * 100;

  const selectOption = (option: string) => {
    if (current.type === "multi") {
      const prev = (answers[current.id] as string[]) || [];
      if (prev.includes(option)) {
        setAnswers({ ...answers, [current.id]: prev.filter((o) => o !== option) });
      } else if (!current.maxSelect || prev.length < current.maxSelect) {
        setAnswers({ ...answers, [current.id]: [...prev, option] });
      }
    } else {
      setAnswers({ ...answers, [current.id]: option });
    }
  };

  const canProceed = () => {
    const answer = answers[current.id];
    if (current.type === "text") return true; // optional
    if (current.type === "multi") return Array.isArray(answer) && answer.length > 0;
    return !!answer;
  };

  const handleNext = () => {
    if (step < questions.length - 1) setStep(step + 1);
    else handleSubmit();
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error("Please sign in first");
      return;
    }
    setSaving(true);
    try {
      const goals = (answers.goals as string[]) || [];
      const { error } = await supabase.from("student_personas" as any).insert({
        user_id: user.id,
        goals,
        study_style: answers.study_style || null,
        weekly_study_hours: answers.weekly_study_hours || null,
        biggest_challenge: answers.biggest_challenge || null,
        motivation_type: answers.motivation_type || null,
        preferred_session_length: answers.preferred_session_length || null,
        learning_method: Array.isArray(answers.learning_method)
          ? answers.learning_method.join(", ")
          : answers.learning_method || null,
        stress_management: answers.stress_management || null,
        social_preference: answers.social_preference || null,
        additional_notes: (answers.additional_notes as string) || null,
      } as any);
      if (error) throw error;
      toast.success("Profile created! Let's get started 🚀");
      navigate("/");
    } catch (err: any) {
      toast.error(err.message || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const isSelected = (option: string) => {
    const answer = answers[current.id];
    if (Array.isArray(answer)) return answer.includes(option);
    return answer === option;
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-primary">
            <Sparkles className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground">Let's personalise CoFactor</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {step + 1} of {questions.length} ·{" "}
            {current.type === "multi"
              ? `Select up to ${current.maxSelect}`
              : current.type === "text"
                ? "Optional"
                : "Pick one"}
          </p>
        </motion.div>

        {/* Progress */}
        <Progress value={progress} className="mb-8 h-2 rounded-full" />

        {/* Question */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.25 }}
          >
            <h2 className="font-display text-lg font-semibold text-foreground mb-4">{current.question}</h2>

            {current.type === "text" ? (
              <Textarea
                placeholder="Type anything here... (optional)"
                value={(answers[current.id] as string) || ""}
                onChange={(e) => setAnswers({ ...answers, [current.id]: e.target.value })}
                className="min-h-[120px] rounded-xl"
              />
            ) : (
              <div className="space-y-2">
                {current.options?.map((option) => (
                  <motion.button
                    key={option}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => selectOption(option)}
                    className={`w-full rounded-xl border px-4 py-3 text-left text-sm font-medium transition-all ${
                      isSelected(option)
                        ? "border-primary bg-primary/10 text-foreground shadow-soft"
                        : "border-border bg-card text-foreground hover:border-primary/40"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                          isSelected(option) ? "border-primary bg-primary" : "border-muted-foreground/30"
                        }`}
                      >
                        {isSelected(option) && (
                          <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="h-2 w-2 rounded-full bg-primary-foreground"
                          />
                        )}
                      </span>
                      {option}
                    </span>
                  </motion.button>
                ))}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="mt-8 flex gap-3">
          {step > 0 && (
            <Button variant="outline" onClick={() => setStep(step - 1)} className="h-12 rounded-xl px-6">
              <ChevronLeft className="h-4 w-4 mr-1" /> Back
            </Button>
          )}
          <Button
            onClick={handleNext}
            disabled={(!canProceed() && current.type !== "text") || saving}
            className="h-12 flex-1 rounded-xl bg-gradient-primary text-base font-semibold text-primary-foreground"
          >
            {saving ? "Saving..." : step === questions.length - 1 ? "Finish & Start" : "Continue"}
            {!saving && step < questions.length - 1 && <ChevronRight className="h-4 w-4 ml-1" />}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PersonaQuiz;
