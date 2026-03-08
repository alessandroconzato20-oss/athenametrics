import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { ArrowLeft, BookOpen, Brain, Zap, AlertTriangle, Eye } from "lucide-react";
import { toast } from "sonner";

const levelLabels: Record<number, string> = { 1: "Very Low", 2: "Low", 3: "Medium", 4: "High", 5: "Very High" };

const StudyLogForm = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [hours, setHours] = useState("");
  const [minutes, setMinutes] = useState("");
  const [difficulty, setDifficulty] = useState([3]);
  const [stress, setStress] = useState([3]);
  const [distraction, setDistraction] = useState([3]);
  const [energy, setEnergy] = useState([3]);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { toast.error("Please sign in first"); return; }
    const totalMins = (parseInt(hours) || 0) * 60 + (parseInt(minutes) || 0);
    if (totalMins <= 0) { toast.error("Please enter a valid duration"); return; }

    setSaving(true);
    try {
      const { error } = await supabase.from("study_logs").insert({
        user_id: user.id,
        subject: subject.trim(),
        topic: topic.trim(),
        duration_minutes: totalMins,
        difficulty: difficulty[0],
        stress_level: stress[0],
        distraction_level: distraction[0],
        energy_level: energy[0],
        notes: notes.trim() || null,
      });
      if (error) throw error;
      toast.success("Study session logged!");
      navigate("/study-logs");
    } catch (err: any) {
      toast.error(err.message || "Failed to save log");
    } finally {
      setSaving(false);
    }
  };

  const SliderField = ({ label, icon, value, onChange, color }: {
    label: string; icon: React.ReactNode; value: number[]; onChange: (v: number[]) => void; color: string;
  }) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <Label className="text-sm font-medium">{label}</Label>
        </div>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${color}`}>{levelLabels[value[0]]}</span>
      </div>
      <Slider min={1} max={5} step={1} value={value} onValueChange={onChange} className="py-1" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-lg px-5 pb-10 pt-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <button onClick={() => navigate("/study-logs")} className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back to logs
          </button>

          <h1 className="font-display text-2xl font-bold text-foreground mb-6">Log Study Session</h1>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Subject</Label>
                <Input placeholder="e.g. Biology" value={subject} onChange={(e) => setSubject(e.target.value)} required className="h-11 rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>Topic</Label>
                <Input placeholder="e.g. Cell Division" value={topic} onChange={(e) => setTopic(e.target.value)} required className="h-11 rounded-xl" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Duration</Label>
              <div className="grid grid-cols-2 gap-3">
                <Input type="number" min="0" max="12" placeholder="Hours" value={hours} onChange={(e) => setHours(e.target.value)} className="h-11 rounded-xl" />
                <Input type="number" min="0" max="59" placeholder="Minutes" value={minutes} onChange={(e) => setMinutes(e.target.value)} className="h-11 rounded-xl" />
              </div>
            </div>

            <div className="rounded-2xl bg-card p-4 space-y-5 shadow-card">
              <SliderField label="Difficulty" icon={<Brain className="h-4 w-4 text-score-cognitive" />} value={difficulty} onChange={setDifficulty} color="bg-score-cognitive/15 text-score-cognitive" />
              <SliderField label="Stress Level" icon={<AlertTriangle className="h-4 w-4 text-score-burnout" />} value={stress} onChange={setStress} color="bg-score-burnout/15 text-score-burnout" />
              <SliderField label="Distraction Level" icon={<Eye className="h-4 w-4 text-score-peak" />} value={distraction} onChange={setDistraction} color="bg-score-peak/15 text-score-peak" />
              <SliderField label="Energy Level" icon={<Zap className="h-4 w-4 text-score-study" />} value={energy} onChange={setEnergy} color="bg-score-study/15 text-score-study" />
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
