import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Brain, Zap, AlertTriangle, Eye, GraduationCap, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { getCoursesForYear, type Course } from "@/data/curriculum";
import { Checkbox } from "@/components/ui/checkbox";
import TopicMasteryChecklist from "@/components/TopicMasteryChecklist";

const STUDY_METHODS = [
  { id: "anki", label: "Anki Flashcards" },
  { id: "notes", label: "Notes" },
  { id: "pomodoro", label: "Pomodoro" },
  { id: "active-recall", label: "Active Recall" },
  { id: "practice-problems", label: "Practice Problems" },
  { id: "group-study", label: "Group Study" },
  { id: "lectures", label: "Lectures / Videos" },
];

const levelLabels: Record<number, string> = { 1: "Very Low", 2: "Low", 3: "Medium", 4: "High", 5: "Very High" };

const LevelPicker = ({ label, icon, value, onChange, color }: {
  label: string; icon: React.ReactNode; value: number; onChange: (v: number) => void; color: string;
}) => (
  <div className="space-y-2">
    <div className="flex items-center gap-2">
      {icon}
      <Label className="text-sm font-medium">{label}</Label>
    </div>
    <div className="flex gap-1.5">
      {[1, 2, 3, 4, 5].map((level) => (
        <motion.button
          key={level}
          type="button"
          whileTap={{ scale: 0.9 }}
          onClick={() => onChange(level)}
          className={`flex-1 rounded-xl py-2.5 text-xs font-semibold transition-all ${
            value === level
              ? `${color} shadow-soft scale-105`
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          {level}
          <span className="block text-[9px] font-normal mt-0.5 leading-tight">{levelLabels[level]}</span>
        </motion.button>
      ))}
    </div>
  </div>
);

const StudyLogForm = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const userYear = user?.user_metadata?.year || 1;
  const userUniversity = user?.user_metadata?.university || "";
  const defaultCourses = useMemo(() => getCoursesForYear(userYear), [userYear]);

  const [syllabiCourses, setSyllabiCourses] = useState<Course[]>([]);

  useEffect(() => {
    if (!userUniversity) return;
    const fetchSyllabi = async () => {
      const { data } = await supabase
        .from("university_syllabi")
        .select("course_name, credits, year")
        .eq("university_name", userUniversity)
        .eq("status", "approved")
        .eq("year", userYear) as any;
      if (data && data.length > 0) {
        setSyllabiCourses(data.map((s: any) => ({ name: s.course_name, credits: s.credits || 0 })));
      }
    };
    fetchSyllabi();
  }, [userUniversity, userYear]);

  // Use syllabi courses if available, otherwise fall back to defaults
  const availableCourses = syllabiCourses.length > 0 ? syllabiCourses : defaultCourses;

  const [selectedCourse, setSelectedCourse] = useState("");
  const [topic, setTopic] = useState("");
  const [hours, setHours] = useState("");
  const [minutes, setMinutes] = useState("");
  const [difficulty, setDifficulty] = useState(3);
  const [stress, setStress] = useState(3);
  const [distraction, setDistraction] = useState(3);
  const [energy, setEnergy] = useState(3);
  const [notes, setNotes] = useState("");
  const [selectedMethods, setSelectedMethods] = useState<string[]>([]);
  const [otherMethod, setOtherMethod] = useState("");
  const [saving, setSaving] = useState(false);

  const courseObj = availableCourses.find(c => c.name === selectedCourse);

  const toggleMethod = (id: string) => {
    setSelectedMethods(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { toast.error("Please sign in first"); return; }
    if (!selectedCourse) { toast.error("Please select a course"); return; }
    const totalMins = (parseInt(hours) || 0) * 60 + (parseInt(minutes) || 0);
    if (totalMins <= 0) { toast.error("Please enter a valid duration"); return; }

    // Build methods string to append to notes
    const allMethods = [...selectedMethods.map(id => STUDY_METHODS.find(m => m.id === id)?.label || id)];
    if (otherMethod.trim()) allMethods.push(otherMethod.trim());
    const methodsNote = allMethods.length > 0 ? `[Methods: ${allMethods.join(", ")}]` : "";
    const combinedNotes = [notes.trim(), methodsNote].filter(Boolean).join(" ") || null;

    setSaving(true);
    try {
      const { error } = await supabase.from("study_logs").insert({
        user_id: user.id,
        subject: selectedCourse,
        topic: topic.trim() || selectedCourse,
        duration_minutes: totalMins,
        difficulty: difficulty,
        stress_level: stress,
        distraction_level: distraction,
        energy_level: energy,
        notes: combinedNotes,
      });
      if (error) throw error;
      toast.success("Study session logged! 🎉");
      navigate("/study-logs");
    } catch (err: any) {
      toast.error(err.message || "Failed to save log");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-lg px-5 pb-10 pt-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <button onClick={() => navigate("/study-logs")} className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back to logs
          </button>

          <h1 className="font-display text-2xl font-bold text-foreground mb-6">Log Study Session</h1>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Course Selection */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-primary" />
                Course
              </Label>
              <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                <SelectTrigger className="h-12 rounded-xl">
                  <SelectValue placeholder="Select your course" />
                </SelectTrigger>
                <SelectContent>
                  {availableCourses.map((course) => (
                    <SelectItem key={course.name} value={course.name}>
                      <span className="flex items-center justify-between gap-3 w-full">
                        <span>{course.name}</span>
                        <span className="text-xs text-muted-foreground ml-2">{course.credits} cr</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {courseObj && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-muted-foreground">
                  {courseObj.credits} credits · Year {userYear}
                </motion.p>
              )}
            </div>


            <div className="space-y-2">
              <Label>Duration</Label>
              <div className="grid grid-cols-2 gap-3">
                <Input type="number" min="0" max="12" placeholder="Hours" value={hours} onChange={(e) => setHours(e.target.value)} className="h-11 rounded-xl" />
                <Input type="number" min="0" max="59" placeholder="Minutes" value={minutes} onChange={(e) => setMinutes(e.target.value)} className="h-11 rounded-xl" />
              </div>
            </div>

            <div className="rounded-2xl bg-card p-4 space-y-5 shadow-card">
              <LevelPicker label="Difficulty" icon={<Brain className="h-4 w-4 text-score-cognitive" />} value={difficulty} onChange={setDifficulty} color="bg-score-cognitive text-primary-foreground" />
              <LevelPicker label="Stress Level" icon={<AlertTriangle className="h-4 w-4 text-score-burnout" />} value={stress} onChange={setStress} color="bg-score-burnout text-primary-foreground" />
              <LevelPicker label="Distraction Level" icon={<Eye className="h-4 w-4 text-score-peak" />} value={distraction} onChange={setDistraction} color="bg-score-peak text-primary-foreground" />
              <LevelPicker label="Energy Level" icon={<Zap className="h-4 w-4 text-score-study" />} value={energy} onChange={setEnergy} color="bg-score-study text-primary-foreground" />
            </div>

            {/* Topic Mastery Checklist */}
            {selectedCourse && <TopicMasteryChecklist courseName={selectedCourse} />}

            {/* Study Method */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" />
                Study Method
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {STUDY_METHODS.map((method) => (
                  <motion.button
                    key={method.id}
                    type="button"
                    whileTap={{ scale: 0.95 }}
                    onClick={() => toggleMethod(method.id)}
                    className={`rounded-xl px-3 py-2.5 text-xs font-medium transition-all text-left ${
                      selectedMethods.includes(method.id)
                        ? "bg-primary text-primary-foreground shadow-soft"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {method.label}
                  </motion.button>
                ))}
              </div>
              <Input
                placeholder="Other method (type here)"
                value={otherMethod}
                onChange={(e) => setOtherMethod(e.target.value)}
                className="h-11 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea placeholder="How did the session go?" value={notes} onChange={(e) => setNotes(e.target.value)} className="rounded-xl min-h-[80px]" />
            </div>

            <Button type="submit" disabled={saving} className="h-12 w-full rounded-xl bg-gradient-primary text-base font-semibold text-primary-foreground">
              {saving ? "Saving..." : "Log Session"}
            </Button>
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default StudyLogForm;
