import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchDifficultyHeatmap, ApiError } from "@/services/mlApi";
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
import { RefreshCw, AlertTriangle, Flame } from "lucide-react";

interface TopicDifficultyHeatmapProps {
  universityId?: string | null;
}

const TopicDifficultyHeatmap = ({ universityId }: TopicDifficultyHeatmapProps) => {
  const [selectedCourse, setSelectedCourse] = useState<string>("");

  // Courses grouped by year from curriculum
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
    data: heatmap,
    isLoading,
    isError,
    error,
    refetch,
    dataUpdatedAt,
  } = useQuery({
    queryKey: ["ml", "difficultyHeatmap", selectedCourse],
    queryFn: () => fetchDifficultyHeatmap(selectedCourse, universityId ?? undefined),
    enabled: !!selectedCourse,
    retry: false,
  });

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

        {selectedCourse && isError && (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <AlertTriangle className="h-8 w-8 text-destructive" />
            <p className="text-sm text-destructive font-medium">
              {error instanceof ApiError
                ? `ML API error (${error.status})`
                : "Failed to load heatmap data"}
            </p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        )}

        {selectedCourse && !isLoading && !isError && heatmap && (
          <>
            {heatmap.topics.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No topic data available for this course.
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

            {lastUpdated && (
              <p className="text-[10px] text-muted-foreground pt-1">
                Last updated: {lastUpdated}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default TopicDifficultyHeatmap;
