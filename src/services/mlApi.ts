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
  avgScore: number;
  studentCount: number;
}

export interface DifficultyHeatmapResponse {
  courseId: string;
  topics: HeatmapCell[];
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

export function fetchTopicDifficulty(studentId: string, courseId: string, topicName: string) {
  return mlFetch<TopicDifficultyResponse>(
    `/topic-difficulty?studentId=${enc(studentId)}&courseId=${enc(courseId)}&topicName=${enc(topicName)}`
  );
}

export function fetchDifficultyHeatmap(courseId: string) {
  return mlFetch<DifficultyHeatmapResponse>(`/difficulty-heatmap?courseId=${enc(courseId)}`);
}

export function fetchCognitiveReadiness(studentId: string) {
  return mlFetch<CognitiveReadinessResponse>(`/cognitive-readiness?studentId=${enc(studentId)}`);
}

export function fetchAtRiskStudent(studentId: string, courseId: string) {
  return mlFetch<AtRiskStudentResponse>(
    `/at-risk-student?studentId=${enc(studentId)}&courseId=${enc(courseId)}`
  );
}

export function fetchCohortRisk(courseId: string) {
  return mlFetch<CohortRiskResponse>(`/cohort-risk?courseId=${enc(courseId)}`);
}

export function fetchStudentCluster(studentId: string) {
  return mlFetch<StudentClusterResponse>(`/student-cluster?studentId=${enc(studentId)}`);
}

export function fetchCohortClusters(courseId: string) {
  return mlFetch<CohortClustersResponse>(`/cohort-clusters?courseId=${enc(courseId)}`);
}

const enc = encodeURIComponent;
