import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getTopicsForCourse } from "@/data/courseTopics";
import { ListChecks, ChevronDown } from "lucide-react";

type MasteryStatus = "red" | "orange" | "green";

interface TopicStatus {
  topic: string;
  status: MasteryStatus;
}

interface TopicGroup {
  parent: string;
  children: string[];
}

interface SectionGroup {
  section: string;
  children: (string | TopicGroup)[];
}

const STATUS_CONFIG: Record<MasteryStatus, { label: string; bg: string; ring: string; dot: string }> = {
  red:    { label: "Needs Focus", bg: "bg-destructive/15", ring: "ring-destructive/40", dot: "bg-destructive" },
  orange: { label: "In Progress", bg: "bg-amber-500/15",   ring: "ring-amber-400/40",   dot: "bg-amber-500" },
  green:  { label: "Confident",   bg: "bg-emerald-500/15", ring: "ring-emerald-400/40",  dot: "bg-emerald-500" },
};

const STATUSES: MasteryStatus[] = ["red", "orange", "green"];

/** Group topics with T2/T2.1 parent-child pattern */
function groupSubtopics(topics: string[]): (string | TopicGroup)[] {
  const result: (string | TopicGroup)[] = [];
  let i = 0;
  while (i < topics.length) {
    const current = topics[i];
    const prefixMatch = current.match(/^(\w[\w-]*\s+T\d+):/);
    if (prefixMatch) {
      const prefix = prefixMatch[1];
      const children: string[] = [];
      let j = i + 1;
      while (j < topics.length) {
        const subMatch = topics[j].match(/^(\w[\w-]*\s+T\d+)\.(\d+):/);
        if (subMatch && subMatch[1] === prefix) {
          children.push(topics[j]);
          j++;
        } else {
          break;
        }
      }
      if (children.length > 0) {
        result.push({ parent: current, children });
        i = j;
        continue;
      }
    }
    result.push(current);
    i++;
  }
  return result;
}

/** Detect "## Section" markers and group following topics into collapsible sections */
function groupTopics(topics: string[]): (string | TopicGroup | SectionGroup)[] {
  const hasSection = topics.some(t => t.startsWith("## "));
  if (!hasSection) {
    // No sections — just do subtopic grouping
    return groupSubtopics(topics);
  }

  const result: (string | TopicGroup | SectionGroup)[] = [];
  let currentSection: string | null = null;
  let currentChildren: string[] = [];

  const flushSection = () => {
    if (currentSection && currentChildren.length > 0) {
      result.push({ section: currentSection, children: groupSubtopics(currentChildren) });
    }
    currentChildren = [];
  };

  for (const t of topics) {
    if (t.startsWith("## ")) {
      flushSection();
      currentSection = t.slice(3);
    } else {
      currentChildren.push(t);
    }
  }
  flushSection();
  return result;
}

interface Props {
  courseName: string;
}

const TopicMasteryChecklist = ({ courseName }: Props) => {
  const { user } = useAuth();
  const [topics, setTopics] = useState<TopicStatus[]>([]);
  const [saving, setSaving] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const allCourseTopics = getTopicsForCourse(courseName);
  const actualTopics = allCourseTopics.filter(t => !t.startsWith("## "));
  const grouped = groupTopics(allCourseTopics);

  // Load existing mastery from DB
  useEffect(() => {
    if (!user || !courseName || actualTopics.length === 0) {
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

      setTopics(actualTopics.map(t => ({
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

  const toggleGroup = (parent: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      next.has(parent) ? next.delete(parent) : next.add(parent);
      return next;
    });
  };

  const getStatus = (topicName: string): MasteryStatus =>
    topics.find(t => t.topic === topicName)?.status || "red";

  if (!courseName || actualTopics.length === 0) return null;

  const redCount = topics.filter(t => t.status === "red").length;
  const orangeCount = topics.filter(t => t.status === "orange").length;
  const greenCount = topics.filter(t => t.status === "green").length;

  const renderTopicButton = (topicName: string, indent = false) => {
    const status = getStatus(topicName);
    const cfg = STATUS_CONFIG[status];
    return (
      <motion.button
        key={topicName}
        type="button"
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, height: 0 }}
        onClick={() => cycleStatus(topicName)}
        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all ring-1 ${cfg.bg} ${cfg.ring} ${indent ? "ml-4" : ""}`}
      >
        <motion.div
          key={status}
          initial={{ scale: 0.5 }}
          animate={{ scale: 1 }}
          className={`h-3.5 w-3.5 shrink-0 rounded-full ${cfg.dot} shadow-sm`}
        />
        <div className="flex-1 min-w-0">
          <p className={`font-medium text-foreground truncate ${indent ? "text-xs" : "text-sm"}`}>{topicName}</p>
        </div>
        <span className={`text-[10px] font-semibold shrink-0 ${
          status === "red" ? "text-destructive" :
          status === "orange" ? "text-amber-500" : "text-emerald-500"
        }`}>
          {cfg.label}
        </span>
      </motion.button>
    );
  };

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
          {grouped.map((item) => {
            if (typeof item === "string") {
              return renderTopicButton(item);
            }
            // Section group (## marker)
            if ("section" in item) {
              const isExpanded = expandedGroups.has(item.section);
              return (
                <div key={item.section} className="space-y-1.5">
                  <button
                    type="button"
                    onClick={() => toggleGroup(item.section)}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 bg-muted/50 ring-1 ring-border/50 hover:bg-muted/80 transition-colors"
                  >
                    <span className="text-sm font-semibold text-foreground flex-1 text-left">{item.section}</span>
                    <span className="text-[10px] text-muted-foreground font-medium">{item.children.length} topics</span>
                    <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </motion.div>
                  </button>
                  <AnimatePresence>
                    {isExpanded && item.children.map((child) => {
                      if (typeof child === "string") {
                        return renderTopicButton(child, true);
                      }
                      // TopicGroup inside a section (T2/T2.1 pattern)
                      const childExpanded = expandedGroups.has(child.parent);
                      const parentStatus = getStatus(child.parent);
                      const parentCfg = STATUS_CONFIG[parentStatus];
                      return (
                        <div key={child.parent} className="space-y-1.5 ml-4">
                          <div className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 ring-1 ${parentCfg.bg} ${parentCfg.ring}`}>
                            <motion.button
                              type="button"
                              onClick={() => cycleStatus(child.parent)}
                              className="flex flex-1 items-center gap-3 text-left min-w-0"
                            >
                              <motion.div key={parentStatus} initial={{ scale: 0.5 }} animate={{ scale: 1 }} className={`h-3.5 w-3.5 shrink-0 rounded-full ${parentCfg.dot} shadow-sm`} />
                              <p className="text-xs font-medium text-foreground truncate flex-1">{child.parent}</p>
                              <span className={`text-[10px] font-semibold shrink-0 ${parentStatus === "red" ? "text-destructive" : parentStatus === "orange" ? "text-amber-500" : "text-emerald-500"}`}>{parentCfg.label}</span>
                            </motion.button>
                            <button type="button" onClick={() => toggleGroup(child.parent)} className="shrink-0 p-1 rounded-lg hover:bg-muted/50 transition-colors">
                              <motion.div animate={{ rotate: childExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              </motion.div>
                            </button>
                          </div>
                          <AnimatePresence>
                            {childExpanded && child.children.map((sub) => renderTopicButton(sub, true))}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              );
            }
            // TopicGroup (T2/T2.1 pattern, no section)
            const isExpanded = expandedGroups.has(item.parent);
            const parentStatus = getStatus(item.parent);
            const parentCfg = STATUS_CONFIG[parentStatus];
            return (
              <div key={item.parent} className="space-y-1.5">
                <div className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 ring-1 ${parentCfg.bg} ${parentCfg.ring}`}>
                  <motion.button
                    type="button"
                    onClick={() => cycleStatus(item.parent)}
                    className="flex flex-1 items-center gap-3 text-left min-w-0"
                  >
                    <motion.div key={parentStatus} initial={{ scale: 0.5 }} animate={{ scale: 1 }} className={`h-3.5 w-3.5 shrink-0 rounded-full ${parentCfg.dot} shadow-sm`} />
                    <p className="text-sm font-medium text-foreground truncate flex-1">{item.parent}</p>
                    <span className={`text-[10px] font-semibold shrink-0 ${parentStatus === "red" ? "text-destructive" : parentStatus === "orange" ? "text-amber-500" : "text-emerald-500"}`}>{parentCfg.label}</span>
                  </motion.button>
                  <button type="button" onClick={() => toggleGroup(item.parent)} className="shrink-0 p-1 rounded-lg hover:bg-muted/50 transition-colors">
                    <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </motion.div>
                  </button>
                </div>
                <AnimatePresence>
                  {isExpanded && item.children.map((child) => renderTopicButton(child, true))}
                </AnimatePresence>
              </div>
            );
          })}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default TopicMasteryChecklist;
