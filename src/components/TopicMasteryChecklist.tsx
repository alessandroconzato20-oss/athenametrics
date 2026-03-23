import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getTopicsForCourse } from "@/data/courseTopics";
import { ListChecks } from "lucide-react";

type MasteryStatus = "red" | "orange" | "green";

interface TopicStatus {
  topic: string;
  status: MasteryStatus;
}

const STATUS_CONFIG: Record<MasteryStatus, { label: string; bg: string; ring: string; dot: string }> = {
  red:    { label: "Needs Focus", bg: "bg-destructive/15", ring: "ring-destructive/40", dot: "bg-destructive" },
  orange: { label: "In Progress", bg: "bg-amber-500/15",   ring: "ring-amber-400/40",   dot: "bg-amber-500" },
  green:  { label: "Confident",   bg: "bg-emerald-500/15", ring: "ring-emerald-400/40",  dot: "bg-emerald-500" },
};

const STATUSES: MasteryStatus[] = ["red", "orange", "green"];

interface Props {
  courseName: string;
}

const TopicMasteryChecklist = ({ courseName }: Props) => {
  const { user } = useAuth();
  const [topics, setTopics] = useState<TopicStatus[]>([]);
  const [saving, setSaving] = useState<string | null>(null);

  const courseTopics = getTopicsForCourse(courseName);

  // Load existing mastery from DB
  useEffect(() => {
    if (!user || !courseName || courseTopics.length === 0) {
      setTopics([]);
      return;
    }

    const load = async () => {
      const { data } = await supabase
        .from("topic_mastery")
        .select("topic_name, status")
        .eq("user_id", user.id)
        .eq("course_name", courseName) as any;

      const savedMap = new Map<string, MasteryStatus>();
      (data || []).forEach((d: any) => savedMap.set(d.topic_name, d.status));

      setTopics(courseTopics.map(t => ({
        topic: t,
        status: savedMap.get(t) || "red",
      })));
    };
    load();
  }, [user, courseName]);

  const cycleStatus = async (topicName: string) => {
    if (!user) return;
    setSaving(topicName);

    const current = topics.find(t => t.topic === topicName);
    const currentIdx = STATUSES.indexOf(current?.status || "red");
    const next = STATUSES[(currentIdx + 1) % 3];

    // Optimistic update
    setTopics(prev => prev.map(t => t.topic === topicName ? { ...t, status: next } : t));

    await supabase.from("topic_mastery").upsert(
      {
        user_id: user.id,
        course_name: courseName,
        topic_name: topicName,
        status: next,
        updated_at: new Date().toISOString(),
      } as any,
      { onConflict: "user_id,course_name,topic_name" }
    );

    setSaving(null);
  };

  if (!courseName || courseTopics.length === 0) return null;

  const redCount = topics.filter(t => t.status === "red").length;
  const orangeCount = topics.filter(t => t.status === "orange").length;
  const greenCount = topics.filter(t => t.status === "green").length;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      className="space-y-3"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListChecks className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Topic Mastery</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-medium">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-destructive" /> {redCount}
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-amber-500" /> {orangeCount}
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> {greenCount}
          </span>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground">
        Tap to cycle: <span className="text-destructive font-medium">Needs Focus</span> → <span className="text-amber-500 font-medium">In Progress</span> → <span className="text-emerald-500 font-medium">Confident</span>
      </p>

      <div className="rounded-2xl bg-card p-3 shadow-card space-y-1.5">
        <AnimatePresence mode="popLayout">
          {topics.map((t, i) => {
            const cfg = STATUS_CONFIG[t.status];
            return (
              <motion.button
                key={t.topic}
                type="button"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => cycleStatus(t.topic)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all ring-1 ${cfg.bg} ${cfg.ring}`}
              >
                <motion.div
                  key={t.status}
                  initial={{ scale: 0.5 }}
                  animate={{ scale: 1 }}
                  className={`h-3.5 w-3.5 shrink-0 rounded-full ${cfg.dot} shadow-sm`}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{t.topic}</p>
                </div>
                <span className={`text-[10px] font-semibold shrink-0 ${
                  t.status === "red" ? "text-destructive" :
                  t.status === "orange" ? "text-amber-500" : "text-emerald-500"
                }`}>
                  {cfg.label}
                </span>
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default TopicMasteryChecklist;
