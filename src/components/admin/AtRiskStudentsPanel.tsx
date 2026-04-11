import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  computeStudentRisk,
  AtRiskStudent,
  RiskLevel,
  BLOCKING_EXAM_SHORT,
  ALL_BLOCKING_EXAMS,
  StudentInput,
} from "@/algorithms/humanitasRisk";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { AlertTriangle, Download, ChevronDown, Check, X, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  universityId: string | null;
}

const RISK_COLORS: Record<RiskLevel, string> = {
  low: "bg-green-500/15 text-green-700 border-green-300",
  moderate: "bg-amber-500/15 text-amber-700 border-amber-300",
  high: "bg-orange-500/15 text-orange-700 border-orange-300",
  critical: "bg-red-500/15 text-red-700 border-red-300",
};

const RISK_DOT: Record<RiskLevel, string> = {
  low: "bg-green-500",
  moderate: "bg-amber-500",
  high: "bg-orange-500",
  critical: "bg-red-500",
};

const AtRiskStudentsPanel: React.FC<Props> = ({ universityId }) => {
  const { role } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [students, setStudents] = useState<AtRiskStudent[]>([]);
  const [yearFilter, setYearFilter] = useState("all");
  const [riskFilter, setRiskFilter] = useState("all");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // Only visible to support_team or admin
  const canView = role === "admin" || role === "support_team";

  const loadData = async () => {
    if (!universityId) return;
    setLoading(true);
    setError(null);

    try {
      // Fetch all data scoped by RLS
      const [
        { data: profiles },
        { data: assessments },
        { data: studyLogs },
        { data: checkins },
        { data: surveys },
        { data: examPasses },
      ] = await Promise.all([
        supabase.from("profiles").select("id, username, matricola, university_id"),
        supabase.from("assessment_results").select("*"),
        supabase.from("study_logs").select("studied_at, duration_minutes, subject, topic, user_id"),
        supabase.from("daily_wellbeing_checkins").select("checkin_date, stress_level, user_id"),
        supabase.from("survey_responses").select("survey_type, responses, created_at, user_id"),
        supabase.from("exam_passes").select("user_id, course_name"),
      ]);

      const uniProfiles = (profiles || []).filter((p: any) => p.university_id === universityId);

      // Compute cohort average study time
      const allUserMinutes: Record<string, number> = {};
      (studyLogs || []).forEach((l: any) => {
        allUserMinutes[l.user_id] = (allUserMinutes[l.user_id] || 0) + l.duration_minutes;
      });
      const minuteValues = Object.values(allUserMinutes);
      const cohortAvg = minuteValues.length > 0 ? minuteValues.reduce((a, b) => a + b, 0) / minuteValues.length : 0;

      // Build exam passes lookup per user
      const examPassesByUser: Record<string, Set<string>> = {};
      (examPasses || []).forEach((ep: any) => {
        if (!examPassesByUser[ep.user_id]) examPassesByUser[ep.user_id] = new Set();
        examPassesByUser[ep.user_id].add(ep.course_name);
      });

      const results: AtRiskStudent[] = uniProfiles.map((profile: any) => {
        const uid = profile.id;

        const userAssessments = (assessments || []).filter((a: any) => a.user_id === uid);
        const userLogs = (studyLogs || []).filter((l: any) => l.user_id === uid);
        const userCheckins = (checkins || []).filter((c: any) => c.user_id === uid);
        const userSurveys = (surveys || []).filter((sv: any) => sv.user_id === uid);
        const userPassedExams = examPassesByUser[uid] || new Set<string>();

        // Infer year from assessments (rough: which courses they've attempted)
        const courseNames = new Set(userAssessments.map((a: any) => a.course_name));
        let year = 1;
        // Simple heuristic: if they've attempted any Year-2 courses, they're Year 2+
        if (courseNames.has("Body At Work 1") || courseNames.has("Body At Work 2") ||
            courseNames.has("Mechanism Of Diseases 1") || courseNames.has("Mechanism Of Diseases 2") ||
            courseNames.has("Molecular Medicine and Computational Biology")) {
          year = 2;
        }
        // Year 3+ check
        if (courseNames.has("Pathology and Diagnostics") || courseNames.has("Nephrology and Urology") ||
            courseNames.has("General Surgery") || courseNames.has("Pharmacology")) {
          year = 3;
        }

        // Build self-confidence map from latest confidence survey or study log confidence
        const selfConf: Record<string, number> = {};
        userSurveys.filter((sv: any) => sv.survey_type === "exam_confidence").forEach((sv: any) => {
          const r = sv.responses as any;
          if (r && typeof r === "object") {
            Object.entries(r).forEach(([course, val]) => {
              if (typeof val === "number") selfConf[course] = val;
            });
          }
        });

        const input: StudentInput = {
          userId: uid,
          studentName: profile.username || "Unknown",
          matricola: profile.matricola || "N/A",
          year,
          assessments: userAssessments.map((a: any) => ({
            course_name: a.course_name,
            score: Number(a.score),
            max_score: Number(a.max_score),
            assessed_at: a.assessed_at,
          })),
          studyLogs: userLogs.map((l: any) => ({
            studied_at: l.studied_at,
            duration_minutes: l.duration_minutes,
            subject: l.subject,
            topic: l.topic,
          })),
          wellbeingCheckins: userCheckins.map((c: any) => ({
            checkin_date: c.checkin_date,
            stress_level: c.stress_level,
          })),
          surveys: userSurveys.map((sv: any) => ({
            survey_type: sv.survey_type,
            responses: sv.responses,
            created_at: sv.created_at,
          })),
          avgHrv14d: null, // would come from biometric_snapshots if available
          hrvBaseline: null,
          avgSleepHours14d: null,
          selfConfidence: selfConf,
          passedExamNames: userPassedExams,
          cohortAvgMinutes: cohortAvg,
        };

        return computeStudentRisk(input);
      });

      // Sort by risk score descending
      results.sort((a, b) => b.riskScore - a.riskScore);
      setStudents(results);
    } catch (err: any) {
      setError(err?.message || "Failed to load at-risk data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canView) loadData();
  }, [universityId, canView]);

  const filtered = useMemo(() => {
    return students.filter((s) => {
      if (yearFilter !== "all" && s.year !== Number(yearFilter)) return false;
      if (riskFilter !== "all" && s.riskLevel !== riskFilter) return false;
      return true;
    });
  }, [students, yearFilter, riskFilter]);

  const summary = useMemo(() => {
    const counts: Record<RiskLevel, number> = { low: 0, moderate: 0, high: 0, critical: 0 };
    students.forEach((s) => counts[s.riskLevel]++);
    return counts;
  }, [students]);

  const criticalStudents = students.filter((s) => s.riskLevel === "critical");

  const exportCsv = () => {
    const headers = [
      "Student", "Matricola", "Year", "Risk Level", "Risk Score",
      "Top Risk Factor", "Recommended Action",
      ...ALL_BLOCKING_EXAMS.map((e) => BLOCKING_EXAM_SHORT[e] + " Passed"),
    ];
    const rows = filtered.map((s) => [
      s.studentName,
      s.matricola,
      s.year,
      s.riskLevel,
      s.riskScore,
      `"${s.topRiskFactor}"`,
      `"${s.recommendedAction}"`,
      ...ALL_BLOCKING_EXAMS.map((exam) => {
        const be = s.blockingExams.find((b) => b.examName === exam);
        return be ? (be.passed ? "Yes" : "No") : "N/A";
      }),
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `at-risk-students-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!canView) return null;

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            At-Risk Students
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={filtered.length === 0}>
              <Download className="h-4 w-4 mr-1" /> Export CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Critical banner */}
        {criticalStudents.length > 0 && !loading && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-md border border-red-300 bg-red-500/10 px-4 py-3 flex items-start gap-2"
          >
            <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-700">
                {criticalStudents.length} student{criticalStudents.length > 1 ? "s" : ""} at CRITICAL risk
              </p>
              <p className="text-xs text-red-600 mt-0.5">
                Blocking exam progression at risk — immediate intervention recommended
              </p>
            </div>
          </motion.div>
        )}

        {/* Summary bar */}
        {!loading && students.length > 0 && (
          <div className="flex flex-wrap gap-3 text-xs">
            {(["low", "moderate", "high", "critical"] as RiskLevel[]).map((level) => (
              <span key={level} className="flex items-center gap-1.5">
                <span className={`h-2.5 w-2.5 rounded-full ${RISK_DOT[level]}`} />
                <span className="font-medium capitalize">{summary[level]} {level}</span>
              </span>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <Select value={yearFilter} onValueChange={setYearFilter}>
            <SelectTrigger className="w-[120px] h-8 text-xs">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              <SelectItem value="1">Year 1</SelectItem>
              <SelectItem value="2">Year 2</SelectItem>
              <SelectItem value="3">Year 3+</SelectItem>
            </SelectContent>
          </Select>

          <Select value={riskFilter} onValueChange={setRiskFilter}>
            <SelectTrigger className="w-[130px] h-8 text-xs">
              <SelectValue placeholder="Risk Level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="moderate">Moderate</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Error state */}
        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-center">
            <p className="text-sm text-destructive mb-2">{error}</p>
            <Button variant="outline" size="sm" onClick={loadData}>Retry</Button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        )}

        {/* Table */}
        {!loading && !error && (
          <div className="overflow-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs w-[140px]">Student</TableHead>
                  <TableHead className="text-xs w-[50px]">Year</TableHead>
                  <TableHead className="text-xs w-[90px]">Risk</TableHead>
                  <TableHead className="text-xs">Top Risk Factor</TableHead>
                  {ALL_BLOCKING_EXAMS.map((exam) => (
                    <TableHead key={exam} className="text-xs text-center w-[50px]" title={exam}>
                      {BLOCKING_EXAM_SHORT[exam]}
                    </TableHead>
                  ))}
                  <TableHead className="text-xs">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5 + ALL_BLOCKING_EXAMS.length} className="text-center text-muted-foreground py-8">
                      No students match current filters
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((s) => (
                    <Collapsible key={s.userId} open={expandedRow === s.userId} onOpenChange={(open) => setExpandedRow(open ? s.userId : null)} asChild>
                      <React.Fragment>
                        <CollapsibleTrigger asChild>
                          <TableRow className="cursor-pointer hover:bg-muted/50">
                            <TableCell className="text-xs font-medium">
                              <div className="flex items-center gap-1">
                                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expandedRow === s.userId ? "rotate-180" : ""}`} />
                                <div>
                                  <p>{s.studentName}</p>
                                  <p className="text-[10px] text-muted-foreground">{s.matricola}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-xs text-center">{s.year}</TableCell>
                            <TableCell>
                              <Badge className={`text-[10px] capitalize border ${RISK_COLORS[s.riskLevel]}`} variant="outline">
                                {s.riskLevel}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs max-w-[200px] truncate">{s.topRiskFactor}</TableCell>
                            {ALL_BLOCKING_EXAMS.map((exam) => {
                              const be = s.blockingExams.find((b) => b.examName === exam);
                              if (!be || be.attempts === 0) return (
                                <TableCell key={exam} className="text-center">
                                  <span className="text-muted-foreground text-[10px]">—</span>
                                </TableCell>
                              );
                              return (
                                <TableCell key={exam} className="text-center">
                                  {be.passed ? (
                                    <Check className="h-4 w-4 text-green-600 mx-auto" />
                                  ) : (
                                    <X className="h-4 w-4 text-red-500 mx-auto" />
                                  )}
                                </TableCell>
                              );
                            })}
                            <TableCell className="text-xs max-w-[180px] truncate text-muted-foreground">{s.recommendedAction}</TableCell>
                          </TableRow>
                        </CollapsibleTrigger>
                        <CollapsibleContent asChild>
                          <TableRow className="bg-muted/30">
                            <TableCell colSpan={5 + ALL_BLOCKING_EXAMS.length} className="p-4">
                              <AnimatePresence>
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: "auto" }}
                                  exit={{ opacity: 0, height: 0 }}
                                >
                                  <p className="text-xs font-semibold mb-2 text-foreground">All Risk Factors</p>
                                  <div className="space-y-1.5">
                                    {s.factors.length === 0 ? (
                                      <p className="text-xs text-muted-foreground">No risk factors detected</p>
                                    ) : (
                                      s.factors.map((f, i) => (
                                        <div key={i} className="flex items-start gap-2">
                                          <Badge className={`text-[9px] capitalize border shrink-0 ${RISK_COLORS[f.severity]}`} variant="outline">
                                            {f.severity}
                                          </Badge>
                                          <span className="text-xs text-foreground">
                                            <strong>{f.signal}:</strong> {f.description}
                                          </span>
                                        </div>
                                      ))
                                    )}
                                  </div>
                                  <p className="text-xs mt-3 text-muted-foreground">
                                    Risk score: <strong>{s.riskScore}</strong> · Recommended: {s.recommendedAction}
                                  </p>
                                </motion.div>
                              </AnimatePresence>
                            </TableCell>
                          </TableRow>
                        </CollapsibleContent>
                      </React.Fragment>
                    </Collapsible>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AtRiskStudentsPanel;
