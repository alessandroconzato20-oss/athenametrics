// Layer 3: interactive playground for tuning algorithm inputs.
// Dev-only route — see App.tsx where it's gated with import.meta.env.DEV.
// Tree-shaken out of production builds.

import { useState, useMemo } from "react";
import { calculateApexScores, type AppleHealthData } from "@/algorithms/apexScores";
import { applyCheckinModifiers, type CheckinData } from "@/algorithms/checkinModifiers";
import { PERSONAS } from "@/test/fixtures/personas";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

const defaultHealth: AppleHealthData = PERSONAS[0].health;
const defaultCheckin: CheckinData = {
  rest_level: 3,
  stress_level: 2,
  motivation_level: 3,
  night_factors: [],
  study_plan_window: "1_2h",
};

interface NumSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
}
function NumSlider({ label, value, min, max, step = 1, onChange }: NumSliderProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <Label className="text-muted-foreground">{label}</Label>
        <span className="font-mono text-foreground">{value}</span>
      </div>
      <Slider
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={([v]) => onChange(v)}
      />
    </div>
  );
}

export default function AlgorithmPlayground() {
  const [health, setHealth] = useState<AppleHealthData>(defaultHealth);
  const [useCheckin, setUseCheckin] = useState(false);
  const [checkin, setCheckin] = useState<CheckinData>(defaultCheckin);
  const [diffHealth, setDiffHealth] = useState<AppleHealthData | null>(null);

  const baseScores = useMemo(() => calculateApexScores(health), [health]);
  const finalScores = useMemo(
    () => (useCheckin ? applyCheckinModifiers(baseScores, checkin) : baseScores),
    [baseScores, useCheckin, checkin]
  );
  const diffScores = useMemo(
    () => (diffHealth ? calculateApexScores(diffHealth) : null),
    [diffHealth]
  );

  const update = <K extends keyof AppleHealthData>(key: K, val: AppleHealthData[K]) =>
    setHealth((h) => ({ ...h, [key]: val }));

  const loadPersona = (id: string) => {
    const p = PERSONAS.find((x) => x.id === id);
    if (!p) return;
    setHealth(p.health);
    if (p.checkin) {
      setUseCheckin(true);
      setCheckin(p.checkin);
    } else {
      setUseCheckin(false);
    }
  };

  const exportFixture = () => {
    const json = JSON.stringify({ health, checkin: useCheckin ? checkin : null }, null, 2);
    navigator.clipboard?.writeText(json);
    alert("Fixture JSON copied to clipboard");
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-7xl space-y-4">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Algorithm Playground</h1>
            <p className="text-sm text-muted-foreground">
              Dev-only tool · tweak inputs → see live scores · load personas to start from a known baseline.
            </p>
          </div>
          <div className="flex gap-2">
            <Select onValueChange={loadPersona}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Load persona…" />
              </SelectTrigger>
              <SelectContent>
                {PERSONAS.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => setDiffHealth(health)}>
              Pin as diff baseline
            </Button>
            <Button variant="outline" onClick={() => setDiffHealth(null)} disabled={!diffHealth}>
              Clear diff
            </Button>
            <Button onClick={exportFixture}>Export JSON</Button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* INPUTS */}
          <Card className="p-5 space-y-4">
            <h2 className="font-semibold">Health inputs</h2>
            <div className="grid grid-cols-2 gap-x-5 gap-y-3">
              <NumSlider label="HRV today (ms)" value={Math.round(health.hrv_today)} min={0} max={150}
                onChange={(v) => update("hrv_today", v)} />
              <NumSlider label="HRV baseline 30d" value={Math.round(health.hrv_baseline_30d)} min={1} max={150}
                onChange={(v) => update("hrv_baseline_30d", v)} />
              <NumSlider label="Resting HR today" value={Math.round(health.resting_hr_today)} min={30} max={120}
                onChange={(v) => update("resting_hr_today", v)} />
              <NumSlider label="Resting HR baseline" value={Math.round(health.resting_hr_baseline_30d)} min={30} max={120}
                onChange={(v) => update("resting_hr_baseline_30d", v)} />
              <NumSlider label="Sleep hours" value={Number(health.sleep_duration_hours.toFixed(1))} min={0} max={12} step={0.5}
                onChange={(v) => update("sleep_duration_hours", v)} />
              <NumSlider label="Sleep efficiency %" value={Math.round(health.sleep_efficiency)} min={0} max={100}
                onChange={(v) => update("sleep_efficiency", v)} />
              <NumSlider label="REM %" value={Math.round(health.sleep_rem_percent)} min={0} max={40}
                onChange={(v) => update("sleep_rem_percent", v)} />
              <NumSlider label="Deep %" value={Math.round(health.sleep_deep_percent)} min={0} max={40}
                onChange={(v) => update("sleep_deep_percent", v)} />
              <NumSlider label="Wake time (min from midnight)" value={health.sleep_end_time_minutes} min={240} max={780} step={5}
                onChange={(v) => update("sleep_end_time_minutes", v)} />
              <NumSlider label="Timing variance 7d (min)" value={Math.round(health.sleep_timing_variance_7d)} min={0} max={120}
                onChange={(v) => update("sleep_timing_variance_7d", v)} />
              <NumSlider label="SpO2 %" value={Math.round(health.spo2_percent)} min={80} max={100}
                onChange={(v) => update("spo2_percent", v)} />
              <NumSlider label="VO2 max" value={Math.round(health.vo2_max)} min={15} max={80}
                onChange={(v) => update("vo2_max", v)} />
              <NumSlider label="Active energy (kcal)" value={Math.round(health.active_energy_kcal)} min={0} max={1500}
                onChange={(v) => update("active_energy_kcal", v)} />
              <NumSlider label="Resp rate" value={Number(health.respiratory_rate_bpm.toFixed(1))} min={8} max={25} step={0.5}
                onChange={(v) => update("respiratory_rate_bpm", v)} />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Daily check-in</h2>
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground">Apply</Label>
                <Switch checked={useCheckin} onCheckedChange={setUseCheckin} />
              </div>
            </div>

            {useCheckin && (
              <div className="grid grid-cols-2 gap-x-5 gap-y-3">
                <NumSlider label="Rest level (1-5)" value={checkin.rest_level} min={1} max={5}
                  onChange={(v) => setCheckin({ ...checkin, rest_level: v })} />
                <NumSlider label="Stress level (1-4)" value={checkin.stress_level} min={1} max={4}
                  onChange={(v) => setCheckin({ ...checkin, stress_level: v })} />
                <NumSlider label="Motivation (1-5)" value={checkin.motivation_level} min={1} max={5}
                  onChange={(v) => setCheckin({ ...checkin, motivation_level: v })} />
                <div>
                  <Label className="text-xs text-muted-foreground">Study window</Label>
                  <Select
                    value={checkin.study_plan_window ?? "1_2h"}
                    onValueChange={(v) => setCheckin({ ...checkin, study_plan_window: v as CheckinData["study_plan_window"] })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="within_30">Within 30 min</SelectItem>
                      <SelectItem value="1_2h">1-2h</SelectItem>
                      <SelectItem value="3plus">3+ hours</SelectItem>
                      <SelectItem value="not_today">Not today</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label className="text-xs text-muted-foreground">Night factors</Label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {["alcohol", "caffeine", "screen", "stress", "unwell"].map((f) => {
                      const active = checkin.night_factors.includes(f);
                      return (
                        <Button
                          key={f}
                          size="sm"
                          variant={active ? "default" : "outline"}
                          onClick={() =>
                            setCheckin({
                              ...checkin,
                              night_factors: active
                                ? checkin.night_factors.filter((x) => x !== f)
                                : [...checkin.night_factors, f],
                            })
                          }
                        >
                          {f}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* OUTPUTS */}
          <Card className="p-5 space-y-3">
            <h2 className="font-semibold">Live scores</h2>
            <ScoreRow label="Cognitive Readiness" value={finalScores.cognitiveReadiness}
              diff={diffScores?.cognitiveReadiness} />
            <ScoreRow label="Burnout Risk" value={finalScores.burnoutRisk}
              diff={diffScores?.burnoutRisk} invert />
            <ScoreRow label="Retention Outlook" value={finalScores.retentionOutlook}
              diff={diffScores?.retentionOutlook} />
            <div className="flex justify-between text-sm py-1 border-t pt-3">
              <span className="text-muted-foreground">Study capacity</span>
              <span className="font-mono">{finalScores.studyCapacity.label} ({finalScores.studyCapacity.totalMinutes}m)</span>
            </div>
            <div className="space-y-1 text-sm border-t pt-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Peak window (primary)</span>
                <span className="font-mono">{finalScores.peakStudyWindow.primary_start} → {finalScores.peakStudyWindow.primary_end}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Peak window (secondary)</span>
                <span className="font-mono">{finalScores.peakStudyWindow.secondary_start} → {finalScores.peakStudyWindow.secondary_end}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Chronotype</span>
                <span className="font-mono">{finalScores.peakStudyWindow.chronotype} · {finalScores.peakStudyWindow.confidence}</span>
              </div>
            </div>
            {useCheckin && (
              <div className="border-t pt-3 text-xs text-muted-foreground">
                Base CR (no check-in): {baseScores.cognitiveReadiness} · Base BR: {baseScores.burnoutRisk}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function ScoreRow({ label, value, diff, invert }: { label: string; value: number; diff?: number; invert?: boolean }) {
  const delta = diff !== undefined ? value - diff : null;
  const positive = invert ? (delta ?? 0) < 0 : (delta ?? 0) > 0;
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className="font-mono text-lg">{value}</span>
        {delta !== null && delta !== 0 && (
          <span className={`text-xs font-mono ${positive ? "text-primary" : "text-destructive"}`}>
            {delta > 0 ? "+" : ""}{delta}
          </span>
        )}
      </div>
    </div>
  );
}
