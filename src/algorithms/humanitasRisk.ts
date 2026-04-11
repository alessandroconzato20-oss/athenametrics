/**
 * Humanitas University At-Risk Student scoring algorithm.
 *
 * Blocking-exam progression rule:
 *   Students cannot advance to Year 3 until they pass ALL Year-1 exams
 *   (except "Being a Medical Doctor" / BMD) AND Year-2 exams BAW1 + BAW2.
 */

// ── Blocking exam definitions ──────────────────────────────────────────

/** Year-1 exams that block progression (everything except BMD) */
export const YEAR1_BLOCKING_EXAMS = [
  "Building Bodies",
  "Principles of Living Matter",
  "The Cell: Molecules and Processes",
  "The Cell: Functions and Control",
  "Body Architecture",
];

/** Year-2 blocking exams */
export const YEAR2_BLOCKING_EXAMS = ["Body At Work 1", "Body At Work 2"];

export const ALL_BLOCKING_EXAMS = [...YEAR1_BLOCKING_EXAMS, ...YEAR2_BLOCKING_EXAMS];

// Short labels for column headers
export const BLOCKING_EXAM_SHORT: Record<string, string> = {
  "Building Bodies": "BB",
  "Principles of Living Matter": "PLM",
  "The Cell: Molecules and Processes": "CM&P",
  "The Cell: Functions and Control": "CF&C",
  "Body Architecture": "BA",
  "Body At Work 1": "BAW1",
  "Body At Work 2": "BAW2",
};

// ── Types ──────────────────────────────────────────────────────────────

export type RiskLevel = "low" | "moderate" | "high" | "critical";

export interface RiskFactor {
  signal: string;
  description: string;
  severity: RiskLevel;
  weight: number; // contribution to total score
}

export interface BlockingExamStatus {
  examName: string;
  passed: boolean;
  attempts: number;
  bestScore: number | null;
}

export interface AtRiskStudent {
  userId: string;
  studentName: string;
  matricola: string;
  year: number;
  riskScore: number;
  riskLevel: RiskLevel;
  topRiskFactor: string;
  recommendedAction: string;
  blockingExams: BlockingExamStatus[];
  factors: RiskFactor[];
}

// ── Input data shapes ──────────────────────────────────────────────────

export interface AssessmentRecord {
  course_name: string;
  score: number;
  max_score: number;
  assessed_at: string;
}

export interface StudyLogRecord {
  studied_at: string;
  duration_minutes: number;
  subject: string;
  topic: string;
}

export interface WellbeingRecord {
  checkin_date: string;
  stress_level: number;
}

export interface SurveyRecord {
  survey_type: string;
  responses: any;
  created_at: string;
}

export interface StudentInput {
  userId: string;
  studentName: string;
  matricola: string;
  year: number;
  assessments: AssessmentRecord[];
  studyLogs: StudyLogRecord[];
  wellbeingCheckins: WellbeingRecord[];
  surveys: SurveyRecord[];
  // biometric averages (pre-computed or null)
  avgHrv14d: number | null;
  hrvBaseline: number | null;
  avgSleepHours14d: number | null;
  // confidence self-reports per topic (from surveys/logs)
  selfConfidence: Record<string, number>; // course_name → 1-5
  // cohort average time-on-task (minutes over same period)
  cohortAvgMinutes: number;
}

// ── Helpers ─────────────────────────────────────────────────────────────

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function riskLabel(score: number, hasCriticalBlock: boolean): RiskLevel {
  if (hasCriticalBlock || score > 0.75) return "critical";
  if (score > 0.55) return "high";
  if (score > 0.3) return "moderate";
  return "low";
}

function daysAgo(dateStr: string): number {
  return (Date.now() - new Date(dateStr).getTime()) / 86_400_000;
}

// ── Core scoring ────────────────────────────────────────────────────────

export function computeStudentRisk(s: StudentInput): AtRiskStudent {
  const factors: RiskFactor[] = [];
  let rawScore = 0;

  // ── Build blocking exam status ──
  const blockingExams: BlockingExamStatus[] = ALL_BLOCKING_EXAMS.map((exam) => {
    const attempts = s.assessments.filter(
      (a) => a.course_name.toLowerCase() === exam.toLowerCase()
    );
    const passed = attempts.some((a) => a.score / a.max_score >= 0.6); // 60% = pass
    const bestScore = attempts.length > 0
      ? Math.max(...attempts.map((a) => (a.score / a.max_score) * 100))
      : null;
    return { examName: exam, passed, attempts: attempts.length, bestScore };
  });

  const unpassedBlocking = blockingExams.filter((e) => !e.passed && e.attempts > 0);
  const neverAttemptedBlocking = blockingExams.filter((e) => !e.passed && e.attempts === 0);

  // ── ACADEMIC SIGNALS ──

  // 1) Unpassed blocking exam (very high weight)
  const hasUnpassedBlocking = s.year >= 2 && blockingExams.some((e) => !e.passed);
  if (hasUnpassedBlocking) {
    const count = blockingExams.filter((e) => !e.passed).length;
    const w = 0.25;
    rawScore += w;
    factors.push({
      signal: "Unpassed blocking exam",
      description: `${count} blocking exam(s) not yet passed`,
      severity: "critical",
      weight: w,
    });
  }

  // 2) Failed same blocking exam 2+ times → critical
  const doubleFailedExams = blockingExams.filter(
    (e) => !e.passed && e.attempts >= 2
  );
  if (doubleFailedExams.length > 0) {
    const w = 0.2;
    rawScore += w;
    factors.push({
      signal: "Repeated blocking exam failure",
      description: `Failed ${doubleFailedExams.map((e) => e.examName).join(", ")} 2+ times`,
      severity: "critical",
      weight: w,
    });
  }

  // 3) Score below 50% on any blocking exam attempt
  const lowScoreExams = blockingExams.filter(
    (e) => e.bestScore !== null && e.bestScore < 50
  );
  if (lowScoreExams.length > 0) {
    const w = 0.12;
    rawScore += w;
    factors.push({
      signal: "Low blocking exam score",
      description: `Score below 50% on ${lowScoreExams.map((e) => e.examName).join(", ")}`,
      severity: "high",
      weight: w,
    });
  }

  // 4) Confidence-score gap
  for (const exam of ALL_BLOCKING_EXAMS) {
    const conf = s.selfConfidence[exam];
    const attempts = s.assessments.filter(
      (a) => a.course_name.toLowerCase() === exam.toLowerCase()
    );
    if (conf !== undefined && attempts.length > 0) {
      const actualPct = Math.max(...attempts.map((a) => (a.score / a.max_score) * 100));
      const confPct = (conf / 5) * 100;
      if (confPct - actualPct > 25) {
        const w = 0.06;
        rawScore += w;
        factors.push({
          signal: "Confidence–score gap",
          description: `Self-reported confidence for ${exam} far exceeds actual score`,
          severity: "moderate",
          weight: w,
        });
        break; // count once
      }
    }
  }

  // 5) Revisiting blocking topics without score improvement
  for (const exam of ALL_BLOCKING_EXAMS) {
    const attempts = s.assessments
      .filter((a) => a.course_name.toLowerCase() === exam.toLowerCase())
      .sort((a, b) => a.assessed_at.localeCompare(b.assessed_at));
    if (attempts.length >= 2) {
      const scores = attempts.map((a) => a.score / a.max_score);
      const improving = scores[scores.length - 1] > scores[0];
      if (!improving) {
        const w = 0.06;
        rawScore += w;
        factors.push({
          signal: "No score improvement",
          description: `Repeated attempts on ${exam} with no score improvement`,
          severity: "moderate",
          weight: w,
        });
        break;
      }
    }
  }

  // ── BEHAVIOURAL SIGNALS ──

  const twoWeeksAgo = Date.now() - 14 * 86_400_000;
  const fourWeeksAgo = Date.now() - 28 * 86_400_000;
  const recentLogs = s.studyLogs.filter((l) => new Date(l.studied_at).getTime() > twoWeeksAgo);
  const priorLogs = s.studyLogs.filter((l) => {
    const t = new Date(l.studied_at).getTime();
    return t > fourWeeksAgo && t <= twoWeeksAgo;
  });

  // 6) Study sessions dropping off
  const recentMin = recentLogs.reduce((s, l) => s + l.duration_minutes, 0);
  const priorMin = priorLogs.reduce((s, l) => s + l.duration_minutes, 0);
  if (priorMin > 0 && recentMin < priorMin * 0.4) {
    const w = 0.1;
    rawScore += w;
    factors.push({
      signal: "Study drop-off",
      description: "Study time dropped by more than 60% in the last 2 weeks",
      severity: "high",
      weight: w,
    });
  }

  // 7) Very low total time vs cohort
  const totalMin = s.studyLogs.reduce((s, l) => s + l.duration_minutes, 0);
  if (s.cohortAvgMinutes > 0 && totalMin < s.cohortAvgMinutes * 0.4) {
    const w = 0.06;
    rawScore += w;
    factors.push({
      signal: "Low time-on-task",
      description: `Total study time is less than 40% of cohort average`,
      severity: "moderate",
      weight: w,
    });
  }

  // 8) Cramming (studying only 24h before exam)
  const examDates = s.assessments.map((a) => new Date(a.assessed_at).getTime());
  if (examDates.length >= 2) {
    const cramCount = examDates.filter((ed) => {
      const preSessions = s.studyLogs.filter((l) => {
        const st = new Date(l.studied_at).getTime();
        return st >= ed - 7 * 86_400_000 && st < ed;
      });
      const last24 = preSessions.filter(
        (l) => new Date(l.studied_at).getTime() >= ed - 86_400_000
      );
      return preSessions.length > 0 && last24.length / preSessions.length > 0.8;
    }).length;
    if (cramCount >= 2) {
      const w = 0.06;
      rawScore += w;
      factors.push({
        signal: "Consistent cramming",
        description: "Studying predominantly in the 24 hours before exams",
        severity: "moderate",
        weight: w,
      });
    }
  }

  // ── BIOMETRIC SIGNALS ──

  if (s.avgHrv14d !== null && s.hrvBaseline !== null && s.avgHrv14d < s.hrvBaseline * 0.85) {
    const w = 0.06;
    rawScore += w;
    factors.push({
      signal: "Low HRV",
      description: "Average HRV below personal baseline for 2+ weeks",
      severity: "moderate",
      weight: w,
    });
  }

  if (s.avgSleepHours14d !== null && s.avgSleepHours14d < 6) {
    const w = 0.06;
    rawScore += w;
    factors.push({
      signal: "Sleep deprivation",
      description: `Averaging only ${s.avgSleepHours14d.toFixed(1)}h of sleep`,
      severity: "moderate",
      weight: w,
    });
  }

  // ── SURVEY / WELLBEING SIGNALS ──

  // Stress worsening over 3+ weekly surveys
  const sortedCheckins = [...s.wellbeingCheckins].sort(
    (a, b) => a.checkin_date.localeCompare(b.checkin_date)
  );
  if (sortedCheckins.length >= 3) {
    const last3 = sortedCheckins.slice(-3);
    if (last3[0].stress_level < last3[1].stress_level && last3[1].stress_level < last3[2].stress_level) {
      const w = 0.06;
      rawScore += w;
      factors.push({
        signal: "Worsening stress trend",
        description: "Stress level increasing over the last 3 check-ins",
        severity: "moderate",
        weight: w,
      });
    }
  }

  // Weekly confidence declining 3 weeks in a row (from surveys)
  const confSurveys = s.surveys
    .filter((sv) => sv.survey_type === "weekly_confidence")
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  if (confSurveys.length >= 3) {
    const last3 = confSurveys.slice(-3);
    const vals = last3.map((sv) => {
      const r = sv.responses as any;
      return typeof r?.confidence === "number" ? r.confidence : 3;
    });
    if (vals[0] > vals[1] && vals[1] > vals[2]) {
      const w = 0.1;
      rawScore += w;
      factors.push({
        signal: "Declining confidence",
        description: "Weekly confidence score declining 3 weeks in a row",
        severity: "high",
        weight: w,
      });
    }
  }

  // Stopped completing surveys (no survey in 3+ weeks)
  const latestSurvey = s.surveys.length > 0
    ? Math.max(...s.surveys.map((sv) => new Date(sv.created_at).getTime()))
    : null;
  if (latestSurvey !== null && Date.now() - latestSurvey > 21 * 86_400_000) {
    const w = 0.06;
    rawScore += w;
    factors.push({
      signal: "Survey disengagement",
      description: "Has not completed any survey in 3+ weeks",
      severity: "moderate",
      weight: w,
    });
  }

  // Survey confidence below 2 for blocking exam
  for (const exam of ALL_BLOCKING_EXAMS) {
    const conf = s.selfConfidence[exam];
    if (conf !== undefined && conf < 2) {
      const w = 0.08;
      rawScore += w;
      factors.push({
        signal: "Very low confidence",
        description: `Self-reported confidence for ${exam} is below 2/5`,
        severity: "high",
        weight: w,
      });
      break;
    }
  }

  // ── Compute final ──
  rawScore = clamp(rawScore, 0, 1);

  // Critical override: unpassed blocking exam in Year 2+
  const hasCriticalBlock =
    s.year >= 2 && blockingExams.some((e) => !e.passed);

  const level = riskLabel(rawScore, hasCriticalBlock);

  // If critical due to blocking but score is low, bump it
  if (hasCriticalBlock && rawScore < 0.76) rawScore = 0.76;

  // Sort factors by weight desc
  factors.sort((a, b) => b.weight - a.weight);

  const topFactor = factors.length > 0 ? factors[0].description : "No risk factors detected";

  // Recommended action
  let action = "Continue monitoring";
  if (level === "critical") action = "Immediate academic counselling required — blocking exam at risk";
  else if (level === "high") action = "Schedule one-on-one support session";
  else if (level === "moderate") action = "Send check-in message and review study plan";

  return {
    userId: s.userId,
    studentName: s.studentName,
    matricola: s.matricola,
    year: s.year,
    riskScore: Math.round(rawScore * 100) / 100,
    riskLevel: level,
    topRiskFactor: topFactor,
    recommendedAction: action,
    blockingExams,
    factors,
  };
}
