const ML_API_URL = import.meta.env.VITE_ML_API_URL || "";
const ML_API_KEY = import.meta.env.VITE_ML_API_KEY || "";

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

// ---------- Response types ----------

export interface TopicDifficultyResponse {
  studentId: string;
  courseId: string;
  topicName: string;
  difficulty: number;
  confidence: number;
  predictedScore: number;
  recommendedActions: string[];
}

export interface HeatmapCell {
  topicName: string;
  difficulty: number;
  difficulty_label: string;
  avgScore: number;
  studentCount: number;
  n_students: number;
}

export interface DifficultyHeatmapResponse {
  courseId: string;
  topics: HeatmapCell[];
  last_updated: string;
}

export interface CognitiveReadinessResponse {
  studentId: string;
  readinessScore: number;
  factors: { name: string; value: number; weight: number }[];
  recommendation: string;
}

export interface AtRiskStudentResponse {
  studentId: string;
  courseId: string;
  riskLevel: "low" | "medium" | "high" | "critical";
  riskScore: number;
  riskFactors: { factor: string; impact: number }[];
  interventionSuggestions: string[];
}

export interface CohortRiskResponse {
  courseId: string;
  totalStudents: number;
  riskDistribution: { level: string; count: number; percentage: number }[];
  topRiskFactors: { factor: string; affectedCount: number }[];
}

export interface StudentClusterResponse {
  studentId: string;
  clusterId: number;
  clusterLabel: string;
  similarStudents: number;
  traits: Record<string, number>;
}

export interface CohortClustersResponse {
  courseId: string;
  clusters: {
    clusterId: number;
    label: string;
    studentCount: number;
    centroid: Record<string, number>;
  }[];
}

// ---------- Internal fetch helper ----------

async function mlFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${ML_API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ML_API_KEY}`,
    },
  });

  if (!res.ok) {
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      body = await res.text().catch(() => null);
    }
    throw new ApiError(res.status, `ML API error ${res.status}`, body);
  }

  return res.json() as Promise<T>;
}

// ---------- Public functions ----------

export function fetchTopicDifficulty(studentId: string, courseId: string, topicName: string, universityId?: string) {
  let url = `/topic-difficulty?studentId=${enc(studentId)}&courseId=${enc(courseId)}&topicName=${enc(topicName)}`;
  if (universityId) url += `&universityId=${enc(universityId)}`;
  return mlFetch<TopicDifficultyResponse>(url);
}

export function fetchDifficultyHeatmap(courseId: string, universityId?: string) {
  let url = `/difficulty-heatmap?courseId=${enc(courseId)}`;
  if (universityId) url += `&universityId=${enc(universityId)}`;
  return mlFetch<DifficultyHeatmapResponse>(url);
}

export function fetchCognitiveReadiness(studentId: string, universityId?: string) {
  let url = `/cognitive-readiness?studentId=${enc(studentId)}`;
  if (universityId) url += `&universityId=${enc(universityId)}`;
  return mlFetch<CognitiveReadinessResponse>(url);
}

export function fetchAtRiskStudent(studentId: string, courseId: string, universityId?: string) {
  let url = `/at-risk-student?studentId=${enc(studentId)}&courseId=${enc(courseId)}`;
  if (universityId) url += `&universityId=${enc(universityId)}`;
  return mlFetch<AtRiskStudentResponse>(url);
}

export function fetchCohortRisk(courseId: string, universityId?: string) {
  let url = `/cohort-risk?courseId=${enc(courseId)}`;
  if (universityId) url += `&universityId=${enc(universityId)}`;
  return mlFetch<CohortRiskResponse>(url);
}

export function fetchStudentCluster(studentId: string, universityId?: string) {
  let url = `/student-cluster?studentId=${enc(studentId)}`;
  if (universityId) url += `&universityId=${enc(universityId)}`;
  return mlFetch<StudentClusterResponse>(url);
}

export function fetchCohortClusters(courseId: string, universityId?: string) {
  let url = `/cohort-clusters?courseId=${enc(courseId)}`;
  if (universityId) url += `&universityId=${enc(universityId)}`;
  return mlFetch<CohortClustersResponse>(url);
}

const enc = encodeURIComponent;
