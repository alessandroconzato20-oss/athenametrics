import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Moon, ChevronRight, Check } from "lucide-react";

interface QuizDef {
  key: string;
  title: string;
  blurb: string;
  durationMin: number;
  icon: typeof Moon;
  route: string;
}

const QUIZZES: QuizDef[] = [
  {
    key: "mctq_micro",
    title: "Chronotype Quiz",
    blurb: "Find your natural body-clock window — when your brain is genuinely sharpest.",
    durationMin: 1,
    icon: Moon,
    route: "/quiz/chronotype",
  },
];

const GettingToKnowYouQuizzes = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await (supabase
        .from("student_quizzes" as any)
        .select("quiz_key")
        .eq("user_id", user.id) as any);
      if (data) setCompleted(new Set((data as any[]).map(d => d.quiz_key)));
      setLoading(false);
    })();
  }, [user]);

  if (loading) return null;

  const pending = QUIZZES.filter(q => !completed.has(q.key));
  if (pending.length === 0) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="mb-6"
    >
      <div className="mb-2 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Getting To Know You Quizzes
        </h2>
      </div>
      <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
        Take these short MCQ quizzes and your scores will get noticeably more accurate — you'll
        actually understand your own biology and how it ties into the art of studying and
        concentration. Not essential at all; skip them and you'll still get a great general
        experience.
      </p>

      <div className="space-y-2">
        {pending.map((q) => {
          const Icon = q.icon;
          const done = completed.has(q.key);
          return (
            <motion.button
              key={q.key}
              whileTap={{ scale: 0.985 }}
              onClick={() => navigate(q.route)}
              className="group flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-3.5 text-left shadow-soft transition-all hover:border-primary/40 hover:shadow-md"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                {done ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-semibold text-foreground">{q.title}</span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    ~{q.durationMin} min
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{q.blurb}</p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </motion.button>
          );
        })}
      </div>
    </motion.section>
  );
};

export default GettingToKnowYouQuizzes;
