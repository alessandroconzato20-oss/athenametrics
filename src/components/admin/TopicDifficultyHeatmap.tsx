import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchDifficultyHeatmap, ApiError } from "@/services/mlApi";
import { supabase } from "@/integrations/supabase/client";
import { curriculum } from "@/data/curriculum";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RefreshCw, Flame, Info } from "lucide-react";

interface TopicDifficultyHeatmapProps {
  universityId?: string | null;
}

interface LocalCell {
  topicName: string;
  difficulty: number; // 0..1
  difficulty_label: string;
  studentCount: number;
  n_students: number;
  sessions: number;
}

interface LocalHeatmap {
  topics: LocalCell[];
  source: "ml-api" | "local-fallback";
  last_updated: string | null;
}

const ML_API_URL = import.meta.env.VITE_ML_API_URL || "";

const labelFor = (d: number) => {
  if (d > 0.7) return "Very Hard";
  if (d >= 0.4) return "Hard";
  if (d >= 0.2) return "Medium";
  return "Easier";
};

// Aggregate study_logs locally for the selected course, scoped to the
// university via profile lookup when universityId is provided.
async function fetchLocalHeatmap(courseName: string, universityId?: string | null): Promise<LocalHeatmap> {
  // Build allowed user_id set when scoped to a university
  let allowedUsers: Set<string> | null = null;
  if (universityId) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id")
      .eq("university_id", universityId);
    allowedUsers = new Set((profiles || []).map((p: any) => p.id));
  }

  const { data: logs, error } = await supabase
    .from("study_logs")
    .select("user_id,subject,topic,difficulty,stress_level,comprehension_level,confidence_level,revision_priority")
    .eq("subject", courseName);

  if (error) throw error;

  type Agg = {
    sum_difficulty: number;
    sum_stress: number;
    sum_comprehension: number;
    comp_count: number;
    sum_confidence: number;
    conf_count: number;
    sum_revision: number;
    rev_count: number;
    sessions: number;
    students: Set<string>;
  };

  const byTopic = new Map<string, Agg>();
  (logs || []).forEach((log: any) => {
    if (allowedUsers && !allowedUsers.has(log.user_id)) return;
    const t = log.topic || "Unspecified";
    if (!byTopic.has(t)) {
      byTopic.set(t, {
        sum_difficulty: 0, sum_stress: 0,
        sum_comprehension: 0, comp_count: 0,
        sum_confidence: 0, conf_count: 0,
        sum_revision: 0, rev_count: 0,
        sessions: 0, students: new Set(),
      });
    }
    const a = byTopic.get(t)!;
    a.sessions++;
    a.students.add(log.user_id);
    a.sum_difficulty += log.difficulty || 0;
    a.sum_stress += log.stress_level || 0;
    if (log.comprehension_level) { a.sum_comprehension += log.comprehension_level; a.comp_count++; }
    if (log.confidence_level) { a.sum_confidence += log.confidence_level; a.conf_count++; }
    if (log.revision_priority) { a.sum_revision += log.revision_priority; a.rev_count++; }
  });

  // Composite normalised to 0..1 using same intuition as HardestTopicsRanking
  const topics: LocalCell[] = Array.from(byTopic.entries()).map(([topicName, a]) => {
    const avgDiff = a.sum_difficulty / a.sessions;       // 1..5
    const avgStress = a.sum_stress / a.sessions;          // 1..5
    const invComp = a.comp_count > 0 ? 6 - (a.sum_comprehension / a.comp_count) : 3; // higher when low comprehension
    const invConf = a.conf_count > 0 ? 6 - (a.sum_confidence / a.conf_count) : 3;
    const avgRev = a.rev_count > 0 ? a.sum_revision / a.rev_count : 3;

    const composite =
      avgDiff * 0.35 +
      avgStress * 0.15 +
      invComp * 0.20 +
      invConf * 0.15 +
      avgRev * 0.15; // 1..5 range

    const norm = Math.max(0, Math.min(1, (composite - 1) / 4));
    return {
      topicName,
      difficulty: Math.round(norm * 100) / 100,
      difficulty_label: labelFor(norm),
      studentCount: a.students.size,
      n_students: a.students.size,
      sessions: a.sessions,
    };
  });

  return {
    topics,
    source: "local-fallback",
    last_updated: new Date().toISOString(),
  };
}

const TopicDifficultyHeatmap = ({ universityId }: TopicDifficultyHeatmapProps) => {
  const [selectedCourse, setSelectedCourse] = useState<string>("");

  const coursesByYear = useMemo(() => {
    const years = new Map<number, string[]>();
    for (const sem of curriculum) {
      if (!years.has(sem.year)) years.set(sem.year, []);
      const list = years.get(sem.year)!;
      for (const c of sem.courses) {
        if (!list.includes(c.name)) list.push(c.name);
      }
    }
    return Array.from(years.entries()).sort((a, b) => a[0] - b[0]);
  }, []);

  const {
    data,
    isLoading,
    refetch,
    dataUpdatedAt,
  } = useQuery<LocalHeatmap>({
    queryKey: ["difficultyHeatmap", selectedCourse, universityId],
    queryFn: async () => {
      // Try ML API only if a URL is configured
      if (ML_API_URL) {
        try {
          const remote = await fetchDifficultyHeatmap(selectedCourse, universityId ?? undefined);
          return {
            topics: remote.topics.map(t => ({
              topicName: t.topicName,
              difficulty: t.difficulty,
              difficulty_label: t.difficulty_label,
              studentCount: t.studentCount,
              n_students: t.n_students ?? t.studentCount,
              sessions: 0,
            })),
            source: "ml-api",
            last_updated: remote.last_updated,
          };
        } catch (e) {
          if (!(e instanceof ApiError) && !(e instanceof TypeError)) throw e;
          // fall through to local fallback
        }
      }
      return fetchLocalHeatmap(selectedCourse, universityId);
    },
    enabled: !!selectedCourse,
    retry: false,
  });

  const heatmap = data;

  const getBarColor = (difficulty: number) => {
    if (difficulty > 0.7) return "bg-destructive";
    if (difficulty >= 0.4) return "bg-amber-500";
    return "bg-emerald-500";
  };

  const lastUpdated = heatmap?.last_updated
    ? new Date(heatmap.last_updated).toLocaleString()
    : dataUpdatedAt
      ? new Date(dataUpdatedAt).toLocaleString()
      : null;

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-destructive" />
            <h2 className="text-lg font-bold text-foreground">
              Topic Difficulty Heatmap
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <Select value={selectedCourse} onValueChange={setSelectedCourse}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Select a course" />
              </SelectTrigger>
              <SelectContent>
                {coursesByYear.map(([year, courseNames]) => (
                  <SelectGroup key={year}>
                    <SelectLabel>Year {year}</SelectLabel>
                    {courseNames.map((name) => (
                      <SelectItem key={name} value={name}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>

            {selectedCourse && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => refetch()}
                disabled={isLoading}
                className="shrink-0"
              >
                <RefreshCw
                  className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
                />
              </Button>
            )}
          </div>
        </div>

        {!selectedCourse && (
          <p className="text-sm text-muted-foreground text-center py-6">
            Select a course to view the difficulty heatmap.
          </p>
        )}

        {selectedCourse && isLoading && (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-4 w-28 shrink-0" />
                <Skeleton className="h-6 flex-1 rounded" />
              </div>
            ))}
          </div>
        )}

        {selectedCourse && !isLoading && heatmap && (
          <>
            {heatmap.topics.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No study logs yet for this course.
              </p>
            ) : (
              <div className="space-y-2">
                {heatmap.topics
                  .slice()
                  .sort((a, b) => b.difficulty - a.difficulty)
                  .map((topic) => (
                    <div
                      key={topic.topicName}
                      className="flex items-center gap-3"
                    >
                      <span className="text-xs text-foreground w-28 shrink-0 truncate">
                        {topic.topicName}
                      </span>
                      <div className="flex-1 h-6 bg-muted rounded overflow-hidden relative">
                        <div
                          className={`h-full rounded transition-all ${getBarColor(topic.difficulty)}`}
                          style={{
                            width: `${Math.max(topic.difficulty * 100, 2)}%`,
                          }}
                        />
                      </div>
                      <span className="text-xs font-medium text-foreground w-20 shrink-0 text-right">
                        {topic.difficulty_label}
                      </span>
                      <span className="text-[10px] text-muted-foreground w-16 shrink-0 text-right">
                        n={topic.n_students ?? topic.studentCount}
                      </span>
                    </div>
                  ))}
              </div>
            )}

            <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
              {lastUpdated && (
                <p className="text-[10px] text-muted-foreground">
                  Last updated: {lastUpdated}
                </p>
              )}
              {heatmap.source === "local-fallback" && (
                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Info className="h-3 w-3" />
                  Computed locally from study logs
                </p>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default TopicDifficultyHeatmap;
