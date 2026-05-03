import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { curriculum, type Course } from "@/data/curriculum";
import { isEligible, missingPrerequisites } from "@/data/prerequisites";

export interface StudentCourse extends Course {
  /** Year the course officially belongs to */
  courseYear: number;
  /** True when this course belongs to a year prior to the student's current year (not yet passed) */
  isCarryOver: boolean;
  /** True when this course belongs to a year AFTER the student's current year but prereqs are met */
  isAhead: boolean;
  /** Prereqs not yet satisfied (empty when eligible) */
  missingPrereqs: string[];
}

/**
 * Returns the union of:
 *   • Courses for the student's current year (always available)
 *   • Courses from earlier years the student has NOT yet marked as passed (carry-over exams)
 *
 * Falls back to current-year only while loading.
 *
 * Optionally merges in approved university syllabi (which override curriculum credits).
 */
export function useStudentCourses(opts?: { mergeSyllabi?: boolean }) {
  const { user, universityName } = useAuth() as any;
  const userYear: number = user?.user_metadata?.year || 1;

  const [passed, setPassed] = useState<Set<string>>(new Set());
  const [syllabi, setSyllabi] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!user) { setLoading(false); return; }
    (async () => {
      const promises: Promise<any>[] = [
        Promise.resolve(
          await supabase.from("exam_passes").select("course_name").eq("user_id", user.id)
        ),
      ];
      if (opts?.mergeSyllabi && universityName) {
        promises.push(
          Promise.resolve(
            await (supabase
              .from("university_syllabi")
              .select("course_name, credits, year")
              .eq("university_name", universityName)
              .eq("status", "approved") as any)
          )
        );
      }
      const results = await Promise.all(promises);
      if (cancelled) return;
      const passedRows = (results[0]?.data || []) as Array<{ course_name: string }>;
      setPassed(new Set(passedRows.map((r) => r.course_name)));
      if (opts?.mergeSyllabi && results[1]) {
        const sylRows = (results[1].data || []) as Array<{ course_name: string; credits: number | null; year: number }>;
        setSyllabi(sylRows.map((s) => ({ name: s.course_name, credits: s.credits || 0 })));
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user, universityName, opts?.mergeSyllabi]);

  const courses = useMemo<StudentCourse[]>(() => {
    const seen = new Set<string>();
    const out: StudentCourse[] = [];

    // Walk the entire curriculum. Include any course that:
    //   • belongs to the current year (always shown), OR
    //   • belongs to a prior year and isn't passed yet (carry-over), OR
    //   • belongs to a later year but the student has already cleared its prerequisites.
    for (const sem of curriculum) {
      for (const c of sem.courses) {
        if (seen.has(c.name)) continue;
        if (passed.has(c.name)) continue;

        const isCurrent = sem.year === userYear;
        const isPrior = sem.year < userYear;
        const isLater = sem.year > userYear;
        const eligible = isEligible(c.name, passed);

        // Show current year regardless of prereqs (student is officially in it).
        // Show prior years only when not yet passed (carry-over).
        // Show later years only when prereqs are satisfied (student got ahead).
        if (!isCurrent && isLater && !eligible) continue;

        seen.add(c.name);
        out.push({
          ...c,
          courseYear: sem.year,
          isCarryOver: isPrior,
          isAhead: isLater,
          missingPrereqs: eligible ? [] : missingPrerequisites(c.name, passed),
        });
      }
    }

    // Sort: current year first, then carry-over (oldest first), then ahead (nearest first)
    out.sort((a, b) => {
      const score = (c: StudentCourse) =>
        c.courseYear === userYear ? 0 : c.isCarryOver ? -1 - (userYear - c.courseYear) : 100 + (c.courseYear - userYear);
      return score(a) - score(b);
    });

    // Merge syllabi: override credits when names match
    if (syllabi.length > 0) {
      const sylMap = new Map(syllabi.map((s) => [s.name, s.credits] as const));
      return out.map((c) =>
        sylMap.has(c.name) ? { ...c, credits: sylMap.get(c.name) ?? c.credits } : c
      );
    }
    return out;
  }, [userYear, passed, syllabi]);

  return { courses, loading, userYear, passedExamNames: passed };
}
