import { useQuery } from "@tanstack/react-query";
import {
  fetchTopicDifficulty,
  fetchDifficultyHeatmap,
  fetchCognitiveReadiness,
  fetchAtRiskStudent,
  fetchCohortRisk,
  fetchStudentCluster,
  fetchCohortClusters,
} from "@/services/mlApi";

export function useTopicDifficulty(studentId: string, courseId: string, topicName: string, enabled = true) {
  return useQuery({
    queryKey: ["ml", "topicDifficulty", studentId, courseId, topicName],
    queryFn: () => fetchTopicDifficulty(studentId, courseId, topicName),
    enabled: enabled && !!studentId && !!courseId && !!topicName,
  });
}

export function useDifficultyHeatmap(courseId: string, enabled = true) {
  return useQuery({
    queryKey: ["ml", "difficultyHeatmap", courseId],
    queryFn: () => fetchDifficultyHeatmap(courseId),
    enabled: enabled && !!courseId,
  });
}

export function useCognitiveReadiness(studentId: string, enabled = true) {
  return useQuery({
    queryKey: ["ml", "cognitiveReadiness", studentId],
    queryFn: () => fetchCognitiveReadiness(studentId),
    enabled: enabled && !!studentId,
  });
}

export function useAtRiskStudent(studentId: string, courseId: string, enabled = true) {
  return useQuery({
    queryKey: ["ml", "atRiskStudent", studentId, courseId],
    queryFn: () => fetchAtRiskStudent(studentId, courseId),
    enabled: enabled && !!studentId && !!courseId,
  });
}

export function useCohortRisk(courseId: string, enabled = true) {
  return useQuery({
    queryKey: ["ml", "cohortRisk", courseId],
    queryFn: () => fetchCohortRisk(courseId),
    enabled: enabled && !!courseId,
  });
}

export function useStudentCluster(studentId: string, enabled = true) {
  return useQuery({
    queryKey: ["ml", "studentCluster", studentId],
    queryFn: () => fetchStudentCluster(studentId),
    enabled: enabled && !!studentId,
  });
}

export function useCohortClusters(courseId: string, enabled = true) {
  return useQuery({
    queryKey: ["ml", "cohortClusters", courseId],
    queryFn: () => fetchCohortClusters(courseId),
    enabled: enabled && !!courseId,
  });
}
