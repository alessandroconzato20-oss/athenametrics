import { Capacitor } from "@capacitor/core";
import { CapacitorHealthkit } from "@perfood/capacitor-healthkit";
import type { AppleHealthData } from "@/algorithms/apexScores";

// Re-export the algorithm types for convenience
export type { AppleHealthData } from "@/algorithms/apexScores";
export { calculateApexScores } from "@/algorithms/apexScores";
export type { ApexScores, StudyCapacity, PeakWindow } from "@/algorithms/apexScores";

// HealthKit auth keys (used only for permission prompts)
const AUTH_READ_PERMISSIONS = [
  "steps",
  "activity",
  "calories",
  "heartRate",
  "restingHeartRate",
  "heartRateVariability",
  "oxygenSaturation",
  "bodyTemperature",
  "appleSleepingWristTemperature",
  "sleepAnalysis",
];

// HealthKit sample names (used for querying actual data)
const QUERY_SAMPLE_TYPES = {
  steps: "stepCount",
  heartRate: "heartRate",
  restingHeartRate: "restingHeartRate",
  hrv: "heartRateVariabilitySDNN",
  sleep: "sleepAnalysis",
  activeCalories: "activeEnergyBurned",
  oxygenSaturation: "oxygenSaturation",
  vo2Max: "vo2Max",
  respiratoryRate: "respiratoryRate",
  workout: "workoutType",
} as const;

// ── HealthKit workout → check-in modifier mapping ──
// Maps HKWorkoutActivityType names (as returned by @perfood/capacitor-healthkit)
// to our 3 modifier buckets. Names below are taken from the plugin's Swift
// `returnWorkoutActivityTypeValueDictionnary` mapping.
export type ExerciseCategory = "cardio" | "strength" | "walking";

const WORKOUT_NAME_TO_CATEGORY: Record<string, ExerciseCategory> = {
  // Cardio
  running: "cardio",
  cycling: "cardio",
  swimming: "cardio",
  rowing: "cardio",
  elliptical: "cardio",
  stairs: "cardio",
  stairClimbing: "cardio",
  jumpRope: "cardio",
  highIntensityIntervalTraining: "cardio",
  kickboxing: "cardio",
  boxing: "cardio",
  dance: "cardio",
  danceInspiredTraining: "cardio",
  soccer: "cardio",
  basketball: "cardio",
  tennis: "cardio",
  squash: "cardio",
  racquetball: "cardio",
  badminton: "cardio",
  volleyball: "cardio",
  handball: "cardio",
  hockey: "cardio",
  rugby: "cardio",
  americanFootball: "cardio",
  australianFootball: "cardio",
  // Strength
  traditionalStrengthTraining: "strength",
  functionalStrengthTraining: "strength",
  coreTraining: "strength",
  crossTraining: "strength",
  pilates: "strength",
  yoga: "strength",
  flexibility: "strength",
  gymnastics: "strength",
  climbing: "strength",
  // Walking (and lower-intensity)
  walking: "walking",
  hiking: "walking",
  mindAndBody: "walking",
};

export interface DetectedWorkout {
  category: ExerciseCategory;
  durationMinutes: number;
  rawName: string;
}

/**
 * Query Apple Health for the most recent workout in the last 24h.
 * Returns null on web, no permission, or no sample.
 */
export async function fetchTodaysWorkout(): Promise<DetectedWorkout | null> {
  if (!Capacitor.isNativePlatform()) return null;
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  try {
    const samples = await querySample(QUERY_SAMPLE_TYPES.workout, yesterday, now);
    if (!samples || samples.length === 0) return null;

    // Sum total minutes per category, prefer the dominant category, fall back to most recent.
    const byCategory: Record<ExerciseCategory, number> = { cardio: 0, strength: 0, walking: 0 };
    let lastName = "";
    for (const s of samples) {
      const name: string = String(s.workoutActivityName || "").trim();
      const start = new Date(s.startDate).getTime();
      const end = new Date(s.endDate).getTime();
      if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) continue;
      const minutes = (end - start) / 60000;
      const category = WORKOUT_NAME_TO_CATEGORY[name];
      if (!category) continue;
      byCategory[category] += minutes;
      lastName = name;
    }

    const totals = Object.entries(byCategory) as [ExerciseCategory, number][];
    const [topCategory, topMinutes] = totals.reduce((a, b) => (b[1] > a[1] ? b : a));
    if (topMinutes <= 0) return null;

    return {
      category: topCategory,
      durationMinutes: Math.round(topMinutes),
      rawName: lastName,
    };
  } catch (e) {
    console.error("fetchTodaysWorkout failed:", e);
    return null;
  }
}

/**
 * Fetch today's HealthKit-detected wake time + previous night's sleep duration.
 * Wake time is the END of the latest sleep sample whose end falls in the last 18h.
 * Used by the notification scheduler to time the morning check-in.
 */
export interface WakeInfo {
  wakeAt: Date;          // detected wake-up timestamp
  sleepHours: number;    // total sleep duration of that night
}

export async function fetchTodaysWakeInfo(): Promise<WakeInfo | null> {
  if (!Capacitor.isNativePlatform()) return null;
  try {
    const now = new Date();
    const start = new Date(now.getTime() - 18 * 60 * 60 * 1000);
    const samples = await querySample(QUERY_SAMPLE_TYPES.sleep, start, now);
    if (!samples.length) return null;

    let latestEnd = 0;
    let totalMins = 0;
    for (const s of samples) {
      const startMs = new Date(s.startDate).getTime();
      const endMs = new Date(s.endDate).getTime();
      if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) continue;
      totalMins += (endMs - startMs) / 60000;
      if (endMs > latestEnd) latestEnd = endMs;
    }
    if (!latestEnd) return null;
    return { wakeAt: new Date(latestEnd), sleepHours: parseFloat((totalMins / 60).toFixed(1)) };
  } catch (e) {
    console.error("fetchTodaysWakeInfo failed:", e);
    return null;
  }
}

// Default preview / fallback data matching the new AppleHealthData interface
export const DEFAULT_HEALTH_DATA: AppleHealthData = {
  hrv_today: 48,
  hrv_baseline_30d: 45,
  resting_hr_today: 62,
  resting_hr_baseline_30d: 64,
  sleep_duration_hours: 7.2,
  sleep_rem_percent: 22,
  sleep_deep_percent: 17,
  sleep_efficiency: 0.88,
  sleep_end_time_minutes: 420, // 7:00 AM
  sleep_timing_variance_7d: 25,
  spo2_percent: 97,
  active_energy_kcal: 320,
  exercise_minutes: 35,
  vo2_max: 42,
  respiratory_rate_bpm: 14,
  respiratory_rate_baseline_30d: 14,
  hrv_7d: [44, 46, 43, 47, 45, 49, 48],
  resting_hr_7d: [65, 64, 63, 64, 63, 62, 62],
  sleep_quality_7d: [72, 68, 75, 70, 74, 71, 76],
  hrv_is_estimated: true,
};

export async function requestHealthPermissions(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    await CapacitorHealthkit.requestAuthorization({
      all: [],
      read: AUTH_READ_PERMISSIONS,
      write: [],
    });
    console.log("HealthKit authorization request completed");
    return true;
  } catch (e) {
    console.error("HealthKit auth failed:", e);
    return false;
  }
}

export async function isHealthAvailable(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    await CapacitorHealthkit.isAvailable();
    return true;
  } catch (e) {
    console.error("HealthKit isAvailable failed:", e);
    return false;
  }
}

async function querySample(sampleType: string, startDate: Date, endDate: Date): Promise<any[]> {
  try {
    const result = await CapacitorHealthkit.queryHKitSampleType({
      sampleName: sampleType,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      limit: 0,
    });
    return result.resultData || [];
  } catch (e) {
    console.error(`HealthKit query failed for ${sampleType}:`, e);
    return [];
  }
}

function average(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

// Query the last N days and return daily averages / totals for trend arrays
async function queryDailyValues(
  sampleType: string,
  days: number,
  aggregation: "avg" | "sum"
): Promise<number[]> {
  const now = new Date();
  const results: number[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const dayEnd = new Date(now);
    dayEnd.setHours(0, 0, 0, 0);
    dayEnd.setDate(dayEnd.getDate() - i);
    const dayStart = new Date(dayEnd);
    dayStart.setDate(dayStart.getDate() - 1);
    const samples = await querySample(sampleType, dayStart, dayEnd);
    const values = samples.map((s: any) => s.value || 0).filter((v: number) => v > 0);
    if (values.length === 0) {
      results.push(0);
    } else if (aggregation === "avg") {
      results.push(average(values));
    } else {
      results.push(values.reduce((a: number, b: number) => a + b, 0));
    }
  }
  return results;
}

export async function fetchHealthData(): Promise<AppleHealthData> {
  if (!Capacitor.isNativePlatform()) {
    return DEFAULT_HEALTH_DATA;
  }

  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  try {
    // Parallel fetch: today's data + 30-day baselines + 7-day trends
    const [
      heartRateToday,
      restingHRToday,
      hrvToday,
      sleepToday,
      caloriesToday,
      spo2Today,
      vo2MaxSamples,
      respRateToday,
      // 30-day baselines
      hrv30d,
      restingHR30d,
      respRate30d,
      // 7-day trends
      hrv7dDaily,
      restingHR7d,
      // Behavioural-burnout enrichments
      sleep7d,
      wristTempToday,
      wristTemp30d,
    ] = await Promise.all([
      querySample(QUERY_SAMPLE_TYPES.heartRate, yesterday, now),
      querySample(QUERY_SAMPLE_TYPES.restingHeartRate, yesterday, now),
      querySample(QUERY_SAMPLE_TYPES.hrv, yesterday, now),
      querySample(QUERY_SAMPLE_TYPES.sleep, yesterday, now),
      querySample(QUERY_SAMPLE_TYPES.activeCalories, yesterday, now),
      querySample(QUERY_SAMPLE_TYPES.oxygenSaturation, yesterday, now),
      querySample(QUERY_SAMPLE_TYPES.vo2Max, thirtyDaysAgo, now),
      querySample("respiratoryRate", yesterday, now),
      // 30-day baselines
      querySample(QUERY_SAMPLE_TYPES.hrv, thirtyDaysAgo, now),
      querySample(QUERY_SAMPLE_TYPES.restingHeartRate, thirtyDaysAgo, now),
      querySample("respiratoryRate", thirtyDaysAgo, now),
      // 7-day trends
      queryDailyValues(QUERY_SAMPLE_TYPES.hrv, 7, "avg"),
      queryDailyValues(QUERY_SAMPLE_TYPES.restingHeartRate, 7, "avg"),
      // Behavioural enrichments — best-effort; plugin may not support these
      querySample(QUERY_SAMPLE_TYPES.sleep, sevenDaysAgo, now),
      querySample("appleSleepingWristTemperature", yesterday, now),
      querySample("appleSleepingWristTemperature", thirtyDaysAgo, now),
    ]);

    // SDNN samples may come back in seconds (plugin default) — convert to ms when value < 5
    const toMs = (v: number) => (v > 0 && v < 5 ? v * 1000 : v);

    const avgRestingHRToday = restingHRToday.length > 0
      ? average(restingHRToday.map((s: any) => s.value || 0))
      : DEFAULT_HEALTH_DATA.resting_hr_today;
    const avgRestingHR30d = restingHR30d.length > 0
      ? average(restingHR30d.map((s: any) => s.value || 0))
      : DEFAULT_HEALTH_DATA.resting_hr_baseline_30d;

    // Prefer real HRV samples; fall back to RHR-derived estimate
    const realHRVTodayValues = hrvToday.map((s: any) => toMs(s.value || 0)).filter((v: number) => v > 0);
    const realHRV30dValues = hrv30d.map((s: any) => toMs(s.value || 0)).filter((v: number) => v > 0);
    const hasRealHRV = realHRVTodayValues.length > 0 || realHRV30dValues.length > 0;

    const estimatedHRVToday = realHRVTodayValues.length > 0
      ? Math.round(average(realHRVTodayValues))
      : Math.max(20, Math.min(80, Math.round(120 - avgRestingHRToday * 1.2)));

    const estimatedHRVBaseline = realHRV30dValues.length > 0
      ? Math.round(average(realHRV30dValues))
      : Math.max(20, Math.min(80, Math.round(120 - avgRestingHR30d * 1.2)));

    // Sleep analysis
    let totalSleepMins = 0;
    let remMins = 0;
    let deepMins = 0;
    let timeInBedMins = 0;
    let latestWakeTime = 0;
    const wakeTimes: number[] = [];

    for (const s of sleepToday) {
      const start = new Date(s.startDate).getTime();
      const end = new Date(s.endDate).getTime();
      if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) continue;
      const mins = (end - start) / 60000;
      timeInBedMins += mins;
      totalSleepMins += mins;

      const sleepState = String(s.sleepState ?? s.value ?? "").toLowerCase();
      if (sleepState.includes("rem")) remMins += mins;
      else if (sleepState.includes("deep")) deepMins += mins;

      const wakeDate = new Date(s.endDate);
      const wakeMins = wakeDate.getHours() * 60 + wakeDate.getMinutes();
      if (wakeMins > latestWakeTime) latestWakeTime = wakeMins;
      wakeTimes.push(wakeMins);
    }

    // Estimate sleep stages if plugin doesn't return them
    if (remMins === 0 && totalSleepMins > 0) remMins = totalSleepMins * 0.22;
    if (deepMins === 0 && totalSleepMins > 0) deepMins = totalSleepMins * 0.17;

    const sleepHours = totalSleepMins / 60;
    const remPercent = totalSleepMins > 0 ? (remMins / totalSleepMins) * 100 : DEFAULT_HEALTH_DATA.sleep_rem_percent;
    const deepPercent = totalSleepMins > 0 ? (deepMins / totalSleepMins) * 100 : DEFAULT_HEALTH_DATA.sleep_deep_percent;
    const sleepEfficiency = timeInBedMins > 0 ? Math.min(1, totalSleepMins / timeInBedMins) : DEFAULT_HEALTH_DATA.sleep_efficiency;
    const wakeTimeMins = latestWakeTime > 0 ? latestWakeTime : DEFAULT_HEALTH_DATA.sleep_end_time_minutes;

    // Sleep timing variance (use default if not enough data)
    const sleepTimingVariance = wakeTimes.length >= 3
      ? Math.round(Math.sqrt(wakeTimes.reduce((sum, t) => sum + (t - average(wakeTimes)) ** 2, 0) / wakeTimes.length))
      : DEFAULT_HEALTH_DATA.sleep_timing_variance_7d;

    // Calories
    const totalCalories = caloriesToday.reduce((sum: number, s: any) => sum + (s.value || 0), 0);

    // SpO2
    const avgSpO2 = spo2Today.length > 0
      ? average(spo2Today.map((s: any) => (s.value || 0) * 100))
      : DEFAULT_HEALTH_DATA.spo2_percent;

    // VO2 Max — take latest sample
    const latestVO2 = vo2MaxSamples.length > 0
      ? vo2MaxSamples[vo2MaxSamples.length - 1].value || DEFAULT_HEALTH_DATA.vo2_max
      : DEFAULT_HEALTH_DATA.vo2_max;

    // Respiratory rate
    const avgRespRate = respRateToday.length > 0
      ? average(respRateToday.map((s: any) => s.value || 0))
      : DEFAULT_HEALTH_DATA.respiratory_rate_bpm;
    const avgRespRate30d = respRate30d.length > 0
      ? average(respRate30d.map((s: any) => s.value || 0))
      : DEFAULT_HEALTH_DATA.respiratory_rate_baseline_30d;

    // 7-day HRV trend — prefer real HRV daily series, fall back to RHR-derived per-day
    const hrv7dValues = restingHR7d.map((rhr: number, i: number) => {
      const realDay = toMs(hrv7dDaily[i] || 0);
      if (realDay > 0) return Math.round(realDay);
      return rhr > 0
        ? Math.max(20, Math.min(80, Math.round(120 - rhr * 1.2)))
        : estimatedHRVBaseline;
    });

    // 7-day sleep quality (simplified composite)
    const sleepQuality7d = hrv7dValues.map((hrv: number, i: number) => {
      const rhr = restingHR7d[i] || avgRestingHR30d;
      return Math.round(Math.min(100, (hrv / 60) * 50 + (1 - Math.abs(rhr - 60) / 40) * 50));
    });

    const healthData: AppleHealthData = {
      hrv_today: estimatedHRVToday,
      hrv_baseline_30d: estimatedHRVBaseline,
      hrv_is_estimated: !hasRealHRV,
      resting_hr_today: Math.round(avgRestingHRToday),
      resting_hr_baseline_30d: Math.round(avgRestingHR30d),
      sleep_duration_hours: parseFloat(sleepHours.toFixed(1)),
      sleep_rem_percent: parseFloat(remPercent.toFixed(1)),
      sleep_deep_percent: parseFloat(deepPercent.toFixed(1)),
      sleep_efficiency: parseFloat(sleepEfficiency.toFixed(2)),
      sleep_end_time_minutes: wakeTimeMins,
      sleep_timing_variance_7d: sleepTimingVariance,
      spo2_percent: Math.round(avgSpO2 * 10) / 10,
      active_energy_kcal: Math.round(totalCalories),
      exercise_minutes: Math.round(totalCalories / 8), // rough estimate
      vo2_max: Math.round(latestVO2 * 10) / 10,
      respiratory_rate_bpm: Math.round(avgRespRate * 10) / 10,
      respiratory_rate_baseline_30d: Math.round(avgRespRate30d * 10) / 10,
      hrv_7d: hrv7dValues,
      resting_hr_7d: restingHR7d.map((v: number) => Math.round(v || avgRestingHR30d)),
      sleep_quality_7d: sleepQuality7d,
    };

    console.log("HealthKit computed AppleHealthData:", healthData);

    // If everything is empty, return defaults
    const hasData = avgRestingHRToday !== DEFAULT_HEALTH_DATA.resting_hr_today ||
      totalSleepMins > 0 || totalCalories > 0;
    if (!hasData) {
      console.warn("HealthKit returned empty data, using defaults");
      return DEFAULT_HEALTH_DATA;
    }

    return healthData;
  } catch (e) {
    console.error("Failed to fetch health data:", e);
    return DEFAULT_HEALTH_DATA;
  }
}
