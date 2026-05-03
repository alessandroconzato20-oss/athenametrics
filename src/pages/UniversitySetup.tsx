import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import {
  GraduationCap, UploadCloud, Sparkles, Check, ChevronLeft, ChevronRight,
  Plus, Trash2, Copy, BookOpen, CalendarDays, ShieldAlert, Scale, KeyRound, X,
} from "lucide-react";
import { toast } from "sonner";
import { extractPdfText } from "@/lib/pdfText";
import { parseIcs } from "@/lib/icsParse";

const TOTAL_STEPS = 6;

// ─── Types ──────────────────────────────────────────────────────────────────

interface ExtractedCourse {
  course_name: string;
  year: number | null;
  semester: number | null;
  credits: number | null;
  topics: string[];
  is_blocking?: boolean;
}

interface ProgrammeData {
  programme_name?: string;
  programme_length_years?: number;
  academic_year_structure?: "semester" | "trimester" | "annual";
  country?: string;
  courses?: ExtractedCourse[];
  blocking_exams?: { exam_name: string; blocks_progression_to_year?: number | null }[];
  exam_periods?: { name: string; approximate_month?: number | null; duration_weeks?: number | null }[];
  pdf_uploaded?: boolean;
}

interface CalendarEvent {
  event_type: "semester" | "exam_period" | "reading_week" | "holiday";
  event_name: string;
  start_date: string;
  end_date: string;
}

interface CalendarData {
  events?: CalendarEvent[];
  ics_imported?: boolean;
}

interface WelfareData {
  support_url?: string;
  support_email?: string;
  crisis_line?: string;
  burnout_alert_threshold_pct?: number;
  data_retention_months?: number;
  legal_basis?: "consent" | "legitimate_interests";
  authority_confirmed?: boolean;
  notice_confirmed?: boolean;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const COUNTRY_OPTIONS = [
  "Italy", "United Kingdom", "Germany", "France", "Spain", "Netherlands",
  "Ireland", "Portugal", "Belgium", "Sweden", "Denmark", "Finland",
  "Other EU/EEA", "United States", "Canada", "Australia", "Other",
];

const isEU = (country?: string) =>
  !!country && !["United States", "Canada", "Australia", "Other"].includes(country);

const defaultRetention = (country?: string) => (isEU(country) ? -1 : 24); // -1 = duration of enrolment + 12

// ─── Step bar ───────────────────────────────────────────────────────────────

const STEP_LABELS = [
  { icon: GraduationCap, label: "Programme" },
  { icon: BookOpen, label: "Courses" },
  { icon: CalendarDays, label: "Calendar" },
  { icon: ShieldAlert, label: "Welfare" },
  { icon: Scale, label: "Governance" },
  { icon: KeyRound, label: "Access" },
];

// ─── Main page ──────────────────────────────────────────────────────────────

const UniversitySetup = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [checking, setChecking] = useState(true);
  const [universityId, setUniversityId] = useState<string | null>(null);
  const [universityName, setUniversityName] = useState<string | null>(null);

  const [step, setStep] = useState(1);
  const [stepCompleted, setStepCompleted] = useState(0);

  const [programme, setProgramme] = useState<ProgrammeData>({});
  const [calendar, setCalendar] = useState<CalendarData>({ events: [] });
  const [welfare, setWelfare] = useState<WelfareData>({ burnout_alert_threshold_pct: 10 });
  const [retentionAck, setRetentionAck] = useState(false);

  const [accessCode, setAccessCode] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // ── Bootstrap ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/university-login"); return; }
    (async () => {
      const { data: isUniAdmin } = await supabase.rpc("has_role", {
        _user_id: user.id, _role: "university_admin",
      });
      if (!isUniAdmin) {
        const { data: isGlobal } = await supabase.rpc("has_role", {
          _user_id: user.id, _role: "admin",
        });
        navigate(isGlobal ? "/admin" : "/");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("university_id, university, onboarding_completed")
        .eq("id", user.id)
        .single<{ university_id: string | null; university: string | null; onboarding_completed: boolean | null }>();

      if (profile?.onboarding_completed) { navigate("/admin"); return; }
      setUniversityId(profile?.university_id ?? null);
      setUniversityName(profile?.university ?? null);

      if (profile?.university_id) {
        const { data: progress } = await supabase
          .from("university_onboarding_progress")
          .select("step_completed, programme_data, calendar_data, welfare_data, retention_acknowledged")
          .eq("university_id", profile.university_id)
          .maybeSingle<{
            step_completed: number;
            programme_data: ProgrammeData;
            calendar_data: CalendarData;
            welfare_data: WelfareData;
            retention_acknowledged: boolean;
          }>();
        if (progress) {
          setStepCompleted(progress.step_completed ?? 0);
          if (progress.programme_data) setProgramme(progress.programme_data);
          if (progress.calendar_data) setCalendar(progress.calendar_data);
          if (progress.welfare_data) setWelfare({
            burnout_alert_threshold_pct: 10, ...progress.welfare_data,
          });
          if (progress.retention_acknowledged) setRetentionAck(true);
          setStep(Math.min((progress.step_completed ?? 0) + 1, TOTAL_STEPS));
        }
      }
      setChecking(false);
    })();
  }, [user, authLoading, navigate]);

  // ── Persistence ───────────────────────────────────────────────────────────
  const saveProgress = async (newStepCompleted: number) => {
    if (!universityId || !user) return false;
    setSaving(true);
    const payload = {
      university_id: universityId,
      admin_user_id: user.id,
      step_completed: newStepCompleted,
      programme_data: programme as any,
      calendar_data: calendar as any,
      welfare_data: welfare as any,
      retention_acknowledged: retentionAck,
    };
    const { error } = await supabase
      .from("university_onboarding_progress")
      .upsert(payload as any, { onConflict: "university_id" });
    setSaving(false);
    if (error) { toast.error("Couldn't save: " + error.message); return false; }
    if (newStepCompleted > stepCompleted) setStepCompleted(newStepCompleted);
    return true;
  };

  const goToStep = async (target: number) => {
    if (target < step) { setStep(target); return; }
    const ok = await saveProgress(Math.max(stepCompleted, step));
    if (ok) setStep(target);
  };

  const finishStep = async () => {
    const ok = await saveProgress(Math.max(stepCompleted, step));
    if (!ok) return;
    if (step < TOTAL_STEPS) setStep(step + 1);
  };

  const handleSaveAndExit = async () => {
    const ok = await saveProgress(Math.max(stepCompleted, step - 1));
    if (ok) { toast.success("Progress saved. You can resume later."); navigate("/"); }
  };

  // ── Step-2 syllabi save (writes through to university_syllabi) ────────────
  const persistSyllabi = async () => {
    if (!universityId || !universityName || !user) return;
    const courses = programme.courses ?? [];
    if (courses.length === 0) return;
    const blockingNames = new Set(
      (programme.blocking_exams ?? []).map((e) => e.exam_name.toLowerCase())
    );
    const rows = courses.map((c) => ({
      university_id: universityId,
      university_name: universityName,
      course_name: c.course_name,
      year: c.year ?? 1,
      semester: c.semester ?? 0,
      credits: c.credits ?? null,
      topics: c.topics ?? [],
      status: "approved",
      uploaded_by: user.id,
      is_blocking_exam: c.is_blocking || blockingNames.has(c.course_name.toLowerCase()),
    }));
    // Upsert by (university_id, course_name) — delete+insert is simplest
    await supabase.from("university_syllabi")
      .delete()
      .eq("university_id", universityId);
    const { error } = await supabase.from("university_syllabi").insert(rows as any);
    if (error) toast.error("Failed to save courses: " + error.message);
  };

  // ── Step-3 calendar save ──────────────────────────────────────────────────
  const persistCalendar = async () => {
    if (!universityId) return;
    await supabase.from("university_academic_calendar")
      .delete()
      .eq("university_id", universityId);
    const events = calendar.events ?? [];
    if (events.length === 0) return;
    const rows = events.map((e) => ({
      university_id: universityId,
      event_type: e.event_type,
      event_name: e.event_name,
      start_date: e.start_date,
      end_date: e.end_date,
    }));
    const { error } = await supabase.from("university_academic_calendar").insert(rows as any);
    if (error) toast.error("Failed to save calendar: " + error.message);
  };

  // ── Step-4/5 welfare config save ──────────────────────────────────────────
  const persistWelfare = async () => {
    if (!universityId) return;
    const payload = {
      university_id: universityId,
      support_url: welfare.support_url ?? null,
      support_email: welfare.support_email ?? null,
      crisis_line: welfare.crisis_line ?? null,
      burnout_alert_threshold_pct: welfare.burnout_alert_threshold_pct ?? 10,
      data_retention_months: welfare.data_retention_months ?? null,
      legal_basis: welfare.legal_basis ?? null,
    };
    const { error } = await supabase
      .from("university_welfare_config")
      .upsert(payload as any, { onConflict: "university_id" });
    if (error) toast.error("Failed to save welfare config: " + error.message);
  };

  // ── Step-6 access code + complete ─────────────────────────────────────────
  const completeOnboarding = async () => {
    if (!user) return;
    await saveProgress(TOTAL_STEPS);
    await supabase.from("profiles").update({ onboarding_completed: true } as any).eq("id", user.id);
  };

  const ensureAccessCode = async () => {
    if (!universityId || !universityName || !user) return;
    if (accessCode) return;
    // Reuse an existing active code if there already is one
    const { data: existing } = await supabase
      .from("cohort_invite_codes" as any)
      .select("code")
      .eq("university_id", universityId)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1);
    if (existing && (existing as any[]).length > 0) {
      setAccessCode((existing as any[])[0].code);
      return;
    }
    // Otherwise generate a guaranteed-unique one server-side
    const { data: generated, error } = await supabase.rpc(
      "generate_student_access_code" as any,
      {
        _university_id: universityId,
        _university_name: universityName,
        _created_by: user.id,
      },
    );
    if (error || !generated) {
      toast.error("Couldn't generate code: " + (error?.message ?? "unknown error"));
      return;
    }
    setAccessCode(generated as string);
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (authLoading || checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Skeleton className="h-12 w-48" />
      </div>
    );
  }

  const progressPct = Math.round(((step - 1) / TOTAL_STEPS) * 100);

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto w-full max-w-3xl">
        {/* Step bar */}
        <div className="mb-6">
          <div className="mb-3 flex items-center justify-between gap-2">
            {STEP_LABELS.map((s, i) => {
              const idx = i + 1;
              const done = idx <= stepCompleted;
              const active = idx === step;
              const Icon = s.icon;
              return (
                <button
                  key={s.label}
                  onClick={() => idx <= Math.max(stepCompleted + 1, step) && goToStep(idx)}
                  className={`flex flex-col items-center gap-1 text-[10px] transition ${
                    active ? "text-primary" : done ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  <div className={`flex h-9 w-9 items-center justify-center rounded-full border-2 ${
                    active ? "border-primary bg-primary/10" : done ? "border-primary bg-primary text-primary-foreground" : "border-muted bg-muted/40"
                  }`}>
                    {done && !active ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </div>
                  <span className="hidden sm:inline">{s.label}</span>
                </button>
              );
            })}
          </div>
          <Progress value={progressPct} className="h-1.5" />
          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>Step {step} of {TOTAL_STEPS}</span>
            <button
              onClick={handleSaveAndExit}
              className="hover:text-foreground underline-offset-2 hover:underline"
            >
              Save and continue later
            </button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
          >
            {step === 1 && (
              <Step1Programme
                value={programme}
                onChange={setProgramme}
                universityName={universityName}
              />
            )}
            {step === 2 && (
              <Step2Courses
                value={programme}
                onChange={setProgramme}
              />
            )}
            {step === 3 && (
              <Step3Calendar
                value={calendar}
                onChange={setCalendar}
              />
            )}
            {step === 4 && (
              <Step4Welfare value={welfare} onChange={setWelfare} />
            )}
            {step === 5 && (
              <Step5Governance
                welfare={welfare}
                setWelfare={setWelfare}
                country={programme.country}
                ack={retentionAck}
                setAck={setRetentionAck}
                universityName={universityName ?? "your institution"}
                userId={user?.id ?? ""}
                universityId={universityId}
              />
            )}
            {step === 6 && (
              <Step6Reveal
                accessCode={accessCode}
                ensureCode={async () => {
                  await persistWelfare();
                  await completeOnboarding();
                  await ensureAccessCode();
                }}
                universityName={universityName ?? "your institution"}
                universityId={universityId}
                onFinish={() => navigate("/admin")}
                completeness={{
                  hasCourses: (programme.courses?.length ?? 0) > 0,
                  hasWelfareContact: !!(welfare.support_url || welfare.support_email || welfare.crisis_line),
                  hasLegalBasis: !!welfare.legal_basis,
                  retentionAcknowledged: retentionAck,
                  authorityConfirmed: !!welfare.authority_confirmed,
                  noticeConfirmed: !!welfare.notice_confirmed,
                }}
                jumpToStep={(s) => setStep(s)}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        {step < 6 && (
          <div className="mt-6 flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => setStep(Math.max(1, step - 1))}
              disabled={step === 1}
            >
              <ChevronLeft className="mr-1 h-4 w-4" /> Back
            </Button>
            <Button
              onClick={async () => {
                if (step === 2) await persistSyllabi();
                if (step === 3) await persistCalendar();
                if (step === 4) await persistWelfare();
                if (!validateStep(step, programme, calendar, welfare, retentionAck)) {
                  toast.error("Please complete the required fields.");
                  return;
                }
                await finishStep();
              }}
              disabled={saving || !validateStep(step, programme, calendar, welfare, retentionAck)}
              className="bg-gradient-primary text-primary-foreground"
            >
              {saving ? "Saving…" : step === 5 ? "Reveal access code" : "Continue"}
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Validation per step ────────────────────────────────────────────────────

function validateStep(
  step: number,
  p: ProgrammeData,
  c: CalendarData,
  w: WelfareData,
  ack: boolean,
): boolean {
  if (step === 1) {
    return !!p.programme_name && !!p.programme_length_years && !!p.academic_year_structure && !!p.country;
  }
  if (step === 2) {
    return (p.courses?.length ?? 0) >= 1;
  }
  if (step === 3) {
    return (c.events ?? []).some((e) => e.event_type === "semester");
  }
  if (step === 4) {
    return !!w.support_url && !!w.support_email;
  }
  if (step === 5) {
    return !!w.data_retention_months !== undefined && !!w.legal_basis && ack && !!w.authority_confirmed && !!w.notice_confirmed;
  }
  return true;
}

// ═══════════════════════════════════════════════════════════════════════════
// Step 1 — Programme structure
// ═══════════════════════════════════════════════════════════════════════════

function Step1Programme({
  value, onChange, universityName,
}: {
  value: ProgrammeData;
  onChange: (v: ProgrammeData) => void;
  universityName: string | null;
}) {
  const [extracting, setExtracting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handlePdf = async (file: File) => {
    setExtracting(true);
    try {
      const text = await extractPdfText(file);
      if (text.length < 200) throw new Error("PDF appears empty or scanned.");
      const { data, error } = await supabase.functions.invoke("extract-programme-handbook", {
        body: { pdfText: text, universityName },
      });
      if (error || !data) throw error ?? new Error("No data");
      onChange({
        ...value,
        programme_name: data.programme_name ?? value.programme_name,
        programme_length_years: data.programme_length_years ?? value.programme_length_years,
        academic_year_structure: data.academic_year_structure ?? value.academic_year_structure,
        country: data.country ?? value.country,
        courses: (data.courses ?? []).map((c: any) => ({
          course_name: c.course_name, year: c.year ?? 1,
          semester: c.semester ?? null, credits: c.credits ?? null,
          topics: c.topics ?? [],
        })),
        blocking_exams: data.blocking_exams ?? [],
        exam_periods: data.exam_periods ?? [],
        pdf_uploaded: true,
      });
      toast.success(`Extracted ${data.courses?.length ?? 0} courses from your handbook.`);
    } catch (e) {
      console.error(e);
      toast.message("Couldn't auto-extract from this PDF — please fill in the details below.");
    } finally {
      setExtracting(false);
    }
  };

  return (
    <Card className="rounded-3xl border-2 border-primary/15">
      <CardContent className="space-y-6 p-7">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">Tell us about your programme.</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload your handbook and we'll pre-fill everything below — or skip the upload and enter it manually.
          </p>
        </div>

        <div
          onClick={() => !extracting && fileRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-8 text-center transition ${
            extracting ? "border-primary/30 bg-primary/5" : "border-primary/40 bg-primary/5 hover:bg-primary/10"
          }`}
        >
          <UploadCloud className="h-9 w-9 text-primary" />
          <p className="font-semibold text-foreground">
            {extracting ? "Extracting…" : "Upload your programme handbook (PDF)"}
          </p>
          <p className="text-xs text-muted-foreground">
            We'll use AI to extract programme name, courses, topics, blocking exams and exam periods.
          </p>
          {value.pdf_uploaded && !extracting && (
            <Badge className="mt-2 gap-1 bg-primary/15 text-primary"><Sparkles className="h-3 w-3" /> Handbook processed</Badge>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handlePdf(f);
              if (fileRef.current) fileRef.current.value = "";
            }}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Programme name *</Label>
            <Input
              value={value.programme_name ?? ""}
              onChange={(e) => onChange({ ...value, programme_name: e.target.value })}
              placeholder="e.g. MD in Medicine and Surgery"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Programme length (years) *</Label>
            <Select
              value={value.programme_length_years?.toString() ?? ""}
              onValueChange={(v) => onChange({ ...value, programme_length_years: parseInt(v) })}
            >
              <SelectTrigger><SelectValue placeholder="Select length" /></SelectTrigger>
              <SelectContent>
                {[3, 4, 5, 6, 7].map((n) => (
                  <SelectItem key={n} value={n.toString()}>{n} years</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Academic year structure *</Label>
            <Select
              value={value.academic_year_structure ?? ""}
              onValueChange={(v: any) => onChange({ ...value, academic_year_structure: v })}
            >
              <SelectTrigger><SelectValue placeholder="Select structure" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="semester">Semester-based</SelectItem>
                <SelectItem value="trimester">Trimester-based</SelectItem>
                <SelectItem value="annual">Annual</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label>Country of institution *</Label>
            <Select
              value={value.country ?? ""}
              onValueChange={(v) => onChange({ ...value, country: v })}
            >
              <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
              <SelectContent>
                {COUNTRY_OPTIONS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Used to pre-set sensible data-protection defaults later in the wizard.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Step 2 — Courses, topics, blocking exams
// ═══════════════════════════════════════════════════════════════════════════

function Step2Courses({
  value, onChange,
}: {
  value: ProgrammeData;
  onChange: (v: ProgrammeData) => void;
}) {
  const courses = value.courses ?? [];
  const totalTopics = courses.reduce((a, c) => a + (c.topics?.length ?? 0), 0);
  const years = Array.from(new Set(courses.map((c) => c.year ?? 1))).sort((a, b) => a - b);

  const updateCourse = (i: number, patch: Partial<ExtractedCourse>) => {
    const next = [...courses]; next[i] = { ...next[i], ...patch };
    onChange({ ...value, courses: next });
  };
  const removeCourse = (i: number) => {
    const next = [...courses]; next.splice(i, 1);
    onChange({ ...value, courses: next });
  };
  const addCourse = () => onChange({
    ...value,
    courses: [...courses, { course_name: "New course", year: 1, semester: null, credits: null, topics: [] }],
  });

  const addTopic = (i: number) => {
    const c = courses[i];
    updateCourse(i, { topics: [...(c.topics ?? []), "New topic"] });
  };
  const updateTopic = (ci: number, ti: number, val: string) => {
    const c = courses[ci]; const next = [...c.topics]; next[ti] = val;
    updateCourse(ci, { topics: next });
  };
  const removeTopic = (ci: number, ti: number) => {
    const c = courses[ci]; const next = [...c.topics]; next.splice(ti, 1);
    updateCourse(ci, { topics: next });
  };

  const toggleBlocking = (i: number) => updateCourse(i, { is_blocking: !courses[i].is_blocking });

  return (
    <Card className="rounded-3xl border-2 border-primary/15">
      <CardContent className="space-y-5 p-7">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">Your courses and topics.</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            This is what your students will see in their study log. The more topics you add, the richer your difficulty analytics will be.
          </p>
        </div>

        {value.pdf_uploaded && courses.length > 0 && (
          <Badge className="gap-1 bg-emerald-500/15 text-emerald-700 border-emerald-300 border">
            <Sparkles className="h-3 w-3" /> Extracted from your handbook
          </Badge>
        )}

        <div className="rounded-xl bg-muted/40 p-3 text-sm text-muted-foreground">
          <strong className="text-foreground">{courses.length}</strong> courses,{" "}
          <strong className="text-foreground">{totalTopics}</strong> topics across{" "}
          <strong className="text-foreground">{years.length}</strong> years.
        </div>

        <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
          {courses.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">
              No courses yet. Add your first course below.
            </p>
          )}
          {courses.map((c, i) => (
            <div key={i} className="rounded-xl border bg-card p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  value={c.course_name}
                  onChange={(e) => updateCourse(i, { course_name: e.target.value })}
                  className="flex-1 min-w-[200px] font-medium"
                />
                <Select value={(c.year ?? 1).toString()} onValueChange={(v) => updateCourse(i, { year: parseInt(v) })}>
                  <SelectTrigger className="w-[90px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6].map((n) => <SelectItem key={n} value={n.toString()}>Y{n}</SelectItem>)}
                  </SelectContent>
                </Select>
                <button
                  onClick={() => toggleBlocking(i)}
                  className={`rounded-md border px-2 py-1 text-xs font-medium transition ${
                    c.is_blocking ? "border-amber-400 bg-amber-100 text-amber-800" : "border-muted text-muted-foreground hover:border-foreground/40"
                  }`}
                  title="Mark as a blocking exam (must be passed to advance)"
                >
                  {c.is_blocking ? "Blocking" : "Mark blocking"}
                </button>
                <Button variant="ghost" size="icon" onClick={() => removeCourse(i)} className="text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {(c.topics ?? []).map((t, ti) => (
                  <span key={ti} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs text-primary">
                    <input
                      value={t}
                      onChange={(e) => updateTopic(i, ti, e.target.value)}
                      className="bg-transparent outline-none w-fit"
                      style={{ width: `${Math.max(t.length, 4)}ch` }}
                    />
                    <button onClick={() => removeTopic(i, ti)} className="hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                <button onClick={() => addTopic(i)} className="rounded-full border border-dashed px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground">
                  + Topic
                </button>
              </div>
            </div>
          ))}
        </div>

        <Button variant="outline" onClick={addCourse} className="w-full gap-1">
          <Plus className="h-4 w-4" /> Add course
        </Button>

        <div className="rounded-xl border bg-amber-50/50 p-3 text-xs text-amber-900">
          <strong>Tip:</strong> Mark any course that must be passed to advance to the next year as "Blocking".
          We use this to power the at-risk analytics on your dashboard.
        </div>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Step 3 — Academic calendar
// ═══════════════════════════════════════════════════════════════════════════

function Step3Calendar({
  value, onChange,
}: {
  value: CalendarData;
  onChange: (v: CalendarData) => void;
}) {
  const events = value.events ?? [];
  const fileRef = useRef<HTMLInputElement>(null);

  const handleIcs = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = parseIcs(text);
      const mapped: CalendarEvent[] = parsed.map((e) => ({
        event_name: e.summary,
        start_date: e.start,
        end_date: e.end,
        event_type: /exam|assessment/i.test(e.summary)
          ? "exam_period"
          : /reading week|recess/i.test(e.summary) ? "reading_week"
          : /holiday|break/i.test(e.summary) ? "holiday"
          : "semester",
      }));
      onChange({ events: [...events, ...mapped], ics_imported: true });
      toast.success(`Imported ${mapped.length} events.`);
    } catch (e) {
      toast.error("Couldn't parse that .ics file.");
    }
  };

  const updateEvent = (i: number, patch: Partial<CalendarEvent>) => {
    const next = [...events]; next[i] = { ...next[i], ...patch };
    onChange({ ...value, events: next });
  };
  const addEvent = (event_type: CalendarEvent["event_type"]) => {
    onChange({ ...value, events: [...events, { event_type, event_name: "", start_date: "", end_date: "" }] });
  };
  const removeEvent = (i: number) => {
    const next = [...events]; next.splice(i, 1); onChange({ ...value, events: next });
  };

  const groups: { type: CalendarEvent["event_type"]; label: string }[] = [
    { type: "semester", label: "Semesters" },
    { type: "exam_period", label: "Exam periods" },
    { type: "reading_week", label: "Reading weeks" },
    { type: "holiday", label: "Holidays" },
  ];

  return (
    <Card className="rounded-3xl border-2 border-primary/15">
      <CardContent className="space-y-5 p-7">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">When does your academic year run?</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            We use this to put exam pressure in context — a burnout spike in week 10 means very different things with and without exam dates.
          </p>
        </div>

        <div
          onClick={() => fileRef.current?.click()}
          className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 p-4 hover:bg-primary/10"
        >
          <UploadCloud className="h-6 w-6 text-primary" />
          <div className="flex-1 text-sm">
            <p className="font-semibold">Import from .ics calendar file</p>
            <p className="text-xs text-muted-foreground">We'll auto-detect exams, semesters, holidays and reading weeks.</p>
          </div>
          {value.ics_imported && <Badge className="bg-primary/15 text-primary">Imported</Badge>}
          <input
            ref={fileRef} type="file" accept=".ics,text/calendar" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleIcs(f); if (fileRef.current) fileRef.current.value = ""; }}
          />
        </div>

        {groups.map((g) => (
          <div key={g.type} className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">{g.label}</h3>
              <Button variant="ghost" size="sm" onClick={() => addEvent(g.type)} className="h-7 text-xs">
                <Plus className="mr-1 h-3 w-3" /> Add
              </Button>
            </div>
            {events.map((e, i) => e.event_type !== g.type ? null : (
              <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto] gap-2 rounded-lg border p-2">
                <Input value={e.event_name} placeholder="Name (e.g. Semester 1)"
                  onChange={(ev) => updateEvent(i, { event_name: ev.target.value })} />
                <Input type="date" value={e.start_date}
                  onChange={(ev) => updateEvent(i, { start_date: ev.target.value })} />
                <Input type="date" value={e.end_date}
                  onChange={(ev) => updateEvent(i, { end_date: ev.target.value })} />
                <Button variant="ghost" size="icon" onClick={() => removeEvent(i)} className="text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {!events.some((e) => e.event_type === g.type) && (
              <p className="text-xs text-muted-foreground italic px-1">None added.</p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Step 4 — Welfare escalation
// ═══════════════════════════════════════════════════════════════════════════

function Step4Welfare({
  value, onChange,
}: {
  value: WelfareData;
  onChange: (v: WelfareData) => void;
}) {
  return (
    <Card className="rounded-3xl border-2 border-primary/15">
      <CardContent className="space-y-5 p-7">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">Student support contacts.</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            When Athena Metrics detects a student at critical burnout risk for 5 consecutive days, we show them a "Get support" button. Tell us where it should lead.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label>Student support service URL *</Label>
          <Input
            type="url" placeholder="https://your-uni.edu/wellbeing"
            value={value.support_url ?? ""}
            onChange={(e) => onChange({ ...value, support_url: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">Your institution's student counselling or wellbeing page.</p>
        </div>

        <div className="space-y-1.5">
          <Label>Student support email *</Label>
          <Input
            type="email" placeholder="wellbeing@your-uni.edu"
            value={value.support_email ?? ""}
            onChange={(e) => onChange({ ...value, support_email: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">A direct email students can reach for urgent support.</p>
        </div>

        <div className="space-y-1.5">
          <Label>Out-of-hours crisis line (optional)</Label>
          <Input
            placeholder="e.g. Samaritans 116 123"
            value={value.crisis_line ?? ""}
            onChange={(e) => onChange({ ...value, crisis_line: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">Shown to students only when the burnout alert fires outside 09:00–17:00 local time.</p>
        </div>

        <div className="space-y-2 rounded-xl bg-muted/40 p-4">
          <div className="flex items-center justify-between">
            <Label>Burnout alert threshold</Label>
            <span className="font-mono text-lg font-semibold text-primary">{value.burnout_alert_threshold_pct ?? 10}%</span>
          </div>
          <Slider
            min={5} max={30} step={1}
            value={[value.burnout_alert_threshold_pct ?? 10]}
            onValueChange={(v) => onChange({ ...value, burnout_alert_threshold_pct: v[0] })}
          />
          <p className="text-xs text-muted-foreground">
            Alert me on the dashboard when more than this share of students show critical burnout signals. At 10%, a cohort of 200 triggers an alert when 20 show sustained burnout indicators.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Step 5 — Data governance
// ═══════════════════════════════════════════════════════════════════════════

function Step5Governance({
  welfare, setWelfare, country, ack, setAck, universityName, userId, universityId,
}: {
  welfare: WelfareData;
  setWelfare: (v: WelfareData) => void;
  country?: string;
  ack: boolean;
  setAck: (b: boolean) => void;
  universityName: string;
  userId: string;
  universityId: string | null;
}) {
  // Pre-fill retention based on country
  useEffect(() => {
    if (welfare.data_retention_months === undefined || welfare.data_retention_months === null) {
      setWelfare({ ...welfare, data_retention_months: defaultRetention(country) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const writeConsent = async (kind: "authority" | "notice", checked: boolean) => {
    if (!checked) return;
    if (!universityId) return;
    await supabase.from("consent_logs").insert({
      user_id: userId,
      consent_type: `university_dpa_acknowledgement_${kind}`,
      university_id: universityId,
      consented: true,
    } as any);
  };

  return (
    <Card className="rounded-3xl border-2 border-primary/15">
      <CardContent className="space-y-5 p-7">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">Data governance.</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Athena Metrics processes biometric and behavioural data on behalf of your institution. This section documents the legal basis for that processing.
          </p>
        </div>

        <div className="space-y-2 rounded-xl bg-muted/40 p-4">
          <h3 className="text-sm font-semibold text-foreground">A. What we collect</h3>
          <ul className="list-disc pl-5 text-xs text-muted-foreground space-y-0.5">
            <li>Sleep duration & timing</li>
            <li>Resting heart rate</li>
            <li>SpO2</li>
            <li>Study session logs</li>
            <li>Daily check-in responses</li>
            <li>Subjective wellbeing ratings</li>
          </ul>
          <p className="mt-1 text-xs italic text-muted-foreground">
            HRV is not currently collected — biometric scores will display "estimated without HRV" until this becomes available.
          </p>
        </div>

        <div className="space-y-2 rounded-xl bg-muted/40 p-4">
          <h3 className="text-sm font-semibold text-foreground">B. How long we keep it</h3>
          <Select
            value={welfare.data_retention_months?.toString() ?? ""}
            onValueChange={(v) => setWelfare({ ...welfare, data_retention_months: parseInt(v) })}
          >
            <SelectTrigger><SelectValue placeholder="Choose retention period" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="12">12 months</SelectItem>
              <SelectItem value="24">24 months</SelectItem>
              <SelectItem value="36">36 months</SelectItem>
              <SelectItem value="-1">Duration of student enrolment + 12 months</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 rounded-xl bg-muted/40 p-4">
          <h3 className="text-sm font-semibold text-foreground">C. Legal basis</h3>
          <RadioGroup
            value={welfare.legal_basis ?? ""}
            onValueChange={(v: any) => setWelfare({ ...welfare, legal_basis: v })}
          >
            <label className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer">
              <RadioGroupItem value="consent" className="mt-0.5" />
              <span className="text-sm">
                <strong>Consent</strong> — students explicitly agree at sign-up.
              </span>
            </label>
            <label className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer">
              <RadioGroupItem value="legitimate_interests" className="mt-0.5" />
              <span className="text-sm">
                <strong>Legitimate interests</strong> — institutional research and student welfare.
              </span>
            </label>
          </RadioGroup>
        </div>

        <div className="space-y-3">
          <label className="flex items-start gap-3 rounded-xl border p-4 cursor-pointer">
            <Checkbox
              checked={!!welfare.authority_confirmed}
              onCheckedChange={(c) => {
                const v = !!c;
                setWelfare({ ...welfare, authority_confirmed: v });
                writeConsent("authority", v);
              }}
            />
            <span className="text-sm">
              I confirm I have authority to enter into this data processing arrangement on behalf of <strong>{universityName}</strong>.
            </span>
          </label>
          <label className="flex items-start gap-3 rounded-xl border p-4 cursor-pointer">
            <Checkbox
              checked={!!welfare.notice_confirmed}
              onCheckedChange={(c) => {
                const v = !!c;
                setWelfare({ ...welfare, notice_confirmed: v });
                writeConsent("notice", v);
              }}
            />
            <span className="text-sm">
              I confirm that <strong>{universityName}</strong> will inform students that their data is processed by Athena Metrics in accordance with our privacy notice before they sign up.
            </span>
          </label>
          {/* Acknowledgement combined into the "ack" flag */}
          <label className="flex items-start gap-3 rounded-xl border-2 border-primary/30 bg-primary/5 p-4 cursor-pointer">
            <Checkbox checked={ack} onCheckedChange={(c) => setAck(!!c)} />
            <span className="text-sm">
              I have read the data retention period and legal basis above and acknowledge them on behalf of my institution.
            </span>
          </label>
        </div>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Step 6 — Reveal access code + optional professor invites
// ═══════════════════════════════════════════════════════════════════════════

function Step6Reveal({
  accessCode, ensureCode, universityName, universityId, onFinish,
  completeness, jumpToStep,
}: {
  accessCode: string | null;
  ensureCode: () => Promise<void>;
  universityName: string;
  universityId: string | null;
  onFinish: () => void;
  completeness: {
    hasCourses: boolean;
    hasWelfareContact: boolean;
    hasLegalBasis: boolean;
    retentionAcknowledged: boolean;
    authorityConfirmed: boolean;
    noticeConfirmed: boolean;
  };
  jumpToStep: (s: number) => void;
}) {
  const gateChecks = [
    { ok: completeness.hasCourses,            label: "At least one course set up",         step: 2 },
    { ok: completeness.hasWelfareContact,     label: "A welfare contact (URL, email, or line)", step: 4 },
    { ok: completeness.hasLegalBasis,         label: "Legal basis selected",               step: 5 },
    { ok: completeness.retentionAcknowledged, label: "Data retention acknowledged",        step: 5 },
    { ok: completeness.authorityConfirmed,    label: "Authority to share student data confirmed", step: 5 },
    { ok: completeness.noticeConfirmed,       label: "Student notice confirmed",            step: 5 },
  ];
  const allReady = gateChecks.every((c) => c.ok);

  useEffect(() => {
    if (allReady) ensureCode();
    /* eslint-disable-next-line */
  }, [allReady]);

  const [copied, setCopied] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);
  const signupUrl = `${window.location.origin}/signup`;
  const inviteText = useMemo(() => {
    return `Your university has partnered with Athena Metrics, a study performance analytics platform. Sign up at ${signupUrl} using access code ${accessCode ?? "[loading…]"}. You'll need to complete a short onboarding (around 5 minutes) before your first check-in.`;
  }, [accessCode, signupUrl]);

  // Professor rows
  const { user } = useAuth();
  const [profs, setProfs] = useState<{ email: string; courses: string[] }[]>([]);
  const [allCourses, setAllCourses] = useState<string[]>([]);
  const [savingProfs, setSavingProfs] = useState(false);
  useEffect(() => {
    if (!universityId) return;
    supabase.from("university_syllabi").select("course_name").eq("university_id", universityId)
      .then(({ data }) => setAllCourses(Array.from(new Set((data ?? []).map((r: any) => r.course_name)))));
  }, [universityId]);

  const addProf = () => setProfs([...profs, { email: "", courses: [] }]);
  const updateProf = (i: number, patch: Partial<{ email: string; courses: string[] }>) => {
    const next = [...profs]; next[i] = { ...next[i], ...patch }; setProfs(next);
  };
  const removeProf = (i: number) => { const next = [...profs]; next.splice(i, 1); setProfs(next); };

  const saveAndFinish = async () => {
    const valid = profs.filter((p) => /\S+@\S+\.\S+/.test(p.email) && p.courses.length > 0);
    if (valid.length > 0 && universityId && user) {
      setSavingProfs(true);
      const rows = valid.map((p) => ({
        university_id: universityId,
        invited_by: user.id,
        email: p.email.trim().toLowerCase(),
        courses: p.courses,
      }));
      const { error } = await supabase
        .from("professor_invites" as any)
        .upsert(rows as any, { onConflict: "university_id,email" });
      setSavingProfs(false);
      if (error) { toast.error("Couldn't save professor invites: " + error.message); return; }
      toast.success(`Saved ${rows.length} professor invite${rows.length > 1 ? "s" : ""}. Finalise from the admin panel.`);
    }
    onFinish();
  };

  // ── Gate (incomplete) ────────────────────────────────────────────────────
  if (!allReady) {
    return (
      <Card className="rounded-3xl border-2 border-amber-300/40">
        <CardContent className="space-y-5 p-7">
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/15">
              <ShieldAlert className="h-7 w-7 text-amber-600" />
            </div>
            <h2 className="font-display text-2xl font-bold text-foreground">Almost there</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Finish these items to unlock your student access code.
            </p>
          </div>
          <ul className="space-y-2">
            {gateChecks.map((c, i) => (
              <li key={i} className="flex items-center justify-between rounded-xl border bg-card px-4 py-2.5">
                <span className="flex items-center gap-2 text-sm">
                  {c.ok
                    ? <Check className="h-4 w-4 text-primary" />
                    : <X className="h-4 w-4 text-amber-600" />}
                  <span className={c.ok ? "text-muted-foreground line-through" : "text-foreground"}>{c.label}</span>
                </span>
                {!c.ok && (
                  <Button variant="ghost" size="sm" onClick={() => jumpToStep(c.step)} className="h-7 text-xs">
                    Go to step {c.step}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-3xl border-2 border-primary/15">
      <CardContent className="space-y-6 p-7">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-primary">
            <Check className="h-7 w-7 text-primary-foreground" />
          </div>
          <h2 className="font-display text-2xl font-bold text-foreground">You're ready.</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Here's how to get your students started with Athena Metrics.
          </p>
        </div>

        <div className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-6 text-center">
          <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-2">
            Student access code
          </p>
          <p className="font-mono text-3xl font-bold tracking-[0.2em] text-primary break-all">
            {accessCode ?? "Generating…"}
          </p>
          <p className="mt-3 text-xs text-muted-foreground">
            Share this code with your students. They enter it when they sign up for Athena Metrics.
          </p>
          <Button
            variant="outline" disabled={!accessCode}
            onClick={() => {
              if (!accessCode) return;
              navigator.clipboard.writeText(accessCode);
              setCopied(true); setTimeout(() => setCopied(false), 1500);
            }}
            className="mt-4 gap-1.5"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : "Copy code"}
          </Button>
        </div>

        <div className="rounded-2xl border bg-card p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Shareable invitation
          </p>
          <Textarea readOnly rows={4} value={inviteText} className="font-mono text-xs" />
          <Button
            variant="outline" size="sm"
            onClick={() => {
              navigator.clipboard.writeText(inviteText);
              setCopiedInvite(true); setTimeout(() => setCopiedInvite(false), 1500);
            }}
            className="mt-2 gap-1.5"
          >
            {copiedInvite ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copiedInvite ? "Copied" : "Copy invitation text"}
          </Button>
        </div>

        <div className="rounded-2xl border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground">Add professors (optional)</h3>
          <p className="mb-3 text-xs text-muted-foreground">
            Saved here, finalised from your admin panel. They'll get access to study logs for the courses you assign.
          </p>
          <div className="space-y-2">
            {profs.map((p, i) => (
              <div key={i} className="flex flex-wrap gap-2">
                <Input
                  type="email" placeholder="professor@uni.edu"
                  value={p.email}
                  onChange={(e) => updateProf(i, { email: e.target.value })}
                  className="flex-1 min-w-[200px]"
                />
                <Select
                  value={p.courses[0] ?? ""}
                  onValueChange={(v) => updateProf(i, { courses: [v] })}
                >
                  <SelectTrigger className="w-[200px]"><SelectValue placeholder="Course" /></SelectTrigger>
                  <SelectContent>
                    {allCourses.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="icon" onClick={() => removeProf(i)} className="text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={addProf} className="mt-2 gap-1">
            <Plus className="h-4 w-4" /> Add another professor
          </Button>
        </div>

        <div className="flex items-center justify-end gap-3">
          <Button
            onClick={saveAndFinish}
            disabled={savingProfs}
            className="bg-gradient-primary text-primary-foreground"
          >
            Go to my dashboard →
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default UniversitySetup;
