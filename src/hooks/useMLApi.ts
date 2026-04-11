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

export function useTopicDifficulty(studentId: string, courseId: string, topicName: string, universityId?: string, enabled = true) {
  return useQuery({
    queryKey: ["ml", "topicDifficulty", studentId, courseId, topicName, universityId],
    queryFn: () => fetchTopicDifficulty(studentId, courseId, topicName, universityId),
    enabled: enabled && !!studentId && !!courseId && !!topicName,
  });
}

export function useDifficultyHeatmap(courseId: string, universityId?: string, enabled = true) {
  return useQuery({
    queryKey: ["ml", "difficultyHeatmap", courseId, universityId],
    queryFn: () => fetchDifficultyHeatmap(courseId, universityId),
    enabled: enabled && !!courseId,
  });
}

export function useCognitiveReadiness(studentId: string, universityId?: string, enabled = true) {
  return useQuery({
    queryKey: ["ml", "cognitiveReadiness", studentId, universityId],
    queryFn: () => fetchCognitiveReadiness(studentId, universityId),
    enabled: enabled && !!studentId,
  });
}

export function useAtRiskStudent(studentId: string, courseId: string, universityId?: string, enabled = true) {
  return useQuery({
    queryKey: ["ml", "atRiskStudent", studentId, courseId, universityId],
    queryFn: () => fetchAtRiskStudent(studentId, courseId, universityId),
    enabled: enabled && !!studentId && !!courseId,
  });
}

export function useCohortRisk(courseId: string, universityId?: string, enabled = true) {
  return useQuery({
    queryKey: ["ml", "cohortRisk", courseId, universityId],
    queryFn: () => fetchCohortRisk(courseId, universityId),
    enabled: enabled && !!courseId,
  });
}

export function useStudentCluster(studentId: string, universityId?: string, enabled = true) {
  return useQuery({
    queryKey: ["ml", "studentCluster", studentId, universityId],
    queryFn: () => fetchStudentCluster(studentId, universityId),
    enabled: enabled && !!studentId,
  });
}

export function useCohortClusters(courseId: string, universityId?: string, enabled = true) {
  return useQuery({
    queryKey: ["ml", "cohortClusters", courseId, universityId],
    queryFn: () => fetchCohortClusters(courseId, universityId),
    enabled: enabled && !!courseId,
  });
}
