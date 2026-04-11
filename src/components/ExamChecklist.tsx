import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { curriculum } from "@/data/curriculum";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, GraduationCap, CheckCircle2, Circle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { YEAR1_BLOCKING_EXAMS, YEAR2_BLOCKING_EXAMS } from "@/algorithms/humanitasRisk";

const ExamChecklist: React.FC = () => {
  const { user, universityId } = useAuth();
  const [passedExams, setPassedExams] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [togglingExam, setTogglingExam] = useState<string | null>(null);
  const [openYears, setOpenYears] = useState<Set<number>>(new Set());

  // Group all courses by year (unique)
  const coursesByYear = useMemo(() => {
    const years = new Map<number, { name: string; credits: number }[]>();
    for (const sem of curriculum) {
      if (!years.has(sem.year)) years.set(sem.year, []);
      const list = years.get(sem.year)!;
      for (const c of sem.courses) {
        if (!list.some((x) => x.name === c.name)) list.push(c);
      }
    }
    return Array.from(years.entries()).sort((a, b) => a[0] - b[0]);
  }, []);

  // Load passed exams
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("exam_passes")
        .select("course_name")
        .eq("user_id", user.id);
      if (data) {
        setPassedExams(new Set(data.map((d: any) => d.course_name)));
      }
      setLoading(false);
    };
    load();
  }, [user]);

  const toggleExam = async (courseName: string, year: number) => {
    if (!user || togglingExam) return;
    setTogglingExam(courseName);

    const isPassed = passedExams.has(courseName);

    if (isPassed) {
      // Remove
      const { error } = await supabase
        .from("exam_passes")
        .delete()
        .eq("user_id", user.id)
        .eq("course_name", courseName);
      if (error) {
        toast.error("Failed to update");
      } else {
        setPassedExams((prev) => {
          const next = new Set(prev);
          next.delete(courseName);
          return next;
        });
      }
    } else {
      // Insert
      const { error } = await supabase
        .from("exam_passes")
        .insert({
          user_id: user.id,
          course_name: courseName,
          year,
          university_id: universityId,
        } as any);
      if (error) {
        toast.error("Failed to update");
      } else {
        setPassedExams((prev) => new Set(prev).add(courseName));
      }
    }
    setTogglingExam(null);
  };

  const toggleYear = (year: number) => {
    setOpenYears((prev) => {
      const next = new Set(prev);
      if (next.has(year)) next.delete(year);
      else next.add(year);
      return next;
    });
  };

  const totalExams = coursesByYear.reduce((sum, [, courses]) => sum + courses.length, 0);
  const totalPassed = passedExams.size;
  const progressPct = totalExams > 0 ? Math.round((totalPassed / totalExams) * 100) : 0;

  const isBlockingExam = (name: string) =>
    YEAR1_BLOCKING_EXAMS.includes(name) || YEAR2_BLOCKING_EXAMS.includes(name);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="h-8 w-48 animate-pulse rounded bg-muted mx-auto" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <GraduationCap className="h-5 w-5 text-primary" />
            Exam Progress
          </CardTitle>
          <Badge variant="outline" className="text-xs font-semibold tabular-nums">
            {totalPassed}/{totalExams} passed
          </Badge>
        </div>

        {/* Progress bar */}
        <div className="mt-2 h-2 w-full rounded-full bg-muted overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70"
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </div>
        <p className="text-[11px] text-muted-foreground mt-1">{progressPct}% complete</p>
      </CardHeader>

      <CardContent className="space-y-1 pt-0">
        {coursesByYear.map(([year, courses]) => {
          const yearPassed = courses.filter((c) => passedExams.has(c.name)).length;
          const isOpen = openYears.has(year);

          return (
            <Collapsible key={year} open={isOpen} onOpenChange={() => toggleYear(year)}>
              <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-2">
                  <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
                  <span className="text-sm font-semibold text-foreground">Year {year}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground tabular-nums">{yearPassed}/{courses.length}</span>
                  {yearPassed === courses.length ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground/40" />
                  )}
                </div>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <AnimatePresence>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="pl-4 pr-2 pb-2 space-y-0.5"
                  >
                    {courses.map((course) => {
                      const passed = passedExams.has(course.name);
                      const blocking = isBlockingExam(course.name);
                      const toggling = togglingExam === course.name;

                      return (
                        <button
                          key={course.name}
                          onClick={() => toggleExam(course.name, year)}
                          disabled={toggling}
                          className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors ${
                            passed
                              ? "bg-primary/5 hover:bg-primary/10"
                              : "hover:bg-muted/50"
                          } ${toggling ? "opacity-50" : ""}`}
                        >
                          <Checkbox
                            checked={passed}
                            className="pointer-events-none shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm ${passed ? "line-through text-muted-foreground" : "text-foreground"}`}>
                              {course.name}
                            </p>
                            <p className="text-[10px] text-muted-foreground">{course.credits} CFU</p>
                          </div>
                          {blocking && !passed && (
                            <Badge variant="outline" className="text-[9px] border-destructive/40 text-destructive shrink-0">
                              Blocking
                            </Badge>
                          )}
                          {blocking && passed && (
                            <Badge variant="outline" className="text-[9px] border-green-400 text-green-600 shrink-0">
                              ✓ Blocking
                            </Badge>
                          )}
                        </button>
                      );
                    })}
                  </motion.div>
                </AnimatePresence>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default ExamChecklist;
