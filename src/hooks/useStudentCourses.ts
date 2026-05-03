import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { curriculum, getCoursesForYear, type Course } from "@/data/curriculum";

export interface StudentCourse extends Course {
  /** Year the course officially belongs to */
  courseYear: number;
  /** True when this is from a year prior to the student's current year and not yet passed */
  isCarryOver: boolean;
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
        supabase.from("exam_passes").select("course_name").eq("user_id", user.id),
      ];
      if (opts?.mergeSyllabi && universityName) {
        promises.push(
          supabase
            .from("university_syllabi")
            .select("course_name, credits, year")
            .eq("university_name", universityName)
            .eq("status", "approved") as any
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

    // Current year first
    for (const c of getCoursesForYear(userYear)) {
      if (seen.has(c.name)) continue;
      seen.add(c.name);
      out.push({ ...c, courseYear: userYear, isCarryOver: false });
    }

    // Prior years — only unpassed
    for (const sem of curriculum) {
      if (sem.year >= userYear) continue;
      for (const c of sem.courses) {
        if (seen.has(c.name)) continue;
        if (passed.has(c.name)) continue;
        seen.add(c.name);
        out.push({ ...c, courseYear: sem.year, isCarryOver: true });
      }
    }

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
