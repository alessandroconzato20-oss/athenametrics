import { Capacitor } from "@capacitor/core";
import { CapacitorHealthkit } from "@perfood/capacitor-healthkit";

// HealthKit types we read
const READ_PERMISSIONS = [
  "stepCount",
  "heartRate",
  "restingHeartRate",
  "heartRateVariabilitySDNN",
  "sleepAnalysis",
  "activeEnergyBurned",
  "oxygenSaturation",
  "bodyTemperature",
];

export interface HealthData {
  steps: number;
  restingHR: number;
  hrv: number;
  sleepHours: number;
  deepSleepHours: number;
  activeCalories: number;
  oxygenSaturation: number;
}

const defaultHealthData: HealthData = {
  steps: 6200,
  restingHR: 62,
  hrv: 48,
  sleepHours: 7.2,
  deepSleepHours: 2.1,
  activeCalories: 320,
  oxygenSaturation: 97,
};

export async function requestHealthPermissions(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    await CapacitorHealthkit.requestAuthorization({
      all: [],
      read: READ_PERMISSIONS,
      write: [],
    });
    console.log("HealthKit authorization granted");
    return true;
  } catch (e) {
    console.error("HealthKit auth failed:", e);
    return false;
  }
}

export async function isHealthAvailable(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const result = await CapacitorHealthkit.isAvailable();
    console.log("HealthKit available:", result);
    return result.available;
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
      limit: 100,
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

export async function fetchHealthData(): Promise<HealthData> {
  if (!Capacitor.isNativePlatform()) {
    return defaultHealthData;
  }

  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  try {
    const [steps, heartRate, restingHR, hrv, sleep, calories, spo2] = await Promise.all([
      querySample("stepCount", yesterday, now),
      querySample("heartRate", yesterday, now),
      querySample("restingHeartRate", yesterday, now),
      querySample("heartRateVariabilitySDNN", yesterday, now),
      querySample("sleepAnalysis", yesterday, now),
      querySample("activeEnergyBurned", yesterday, now),
      querySample("oxygenSaturation", yesterday, now),
    ]);

    console.log("HealthKit raw counts:", {
      steps: steps.length, heartRate: heartRate.length, restingHR: restingHR.length,
      hrv: hrv.length, sleep: sleep.length, calories: calories.length, spo2: spo2.length,
    });

    const totalSteps = steps.reduce((sum: number, s: any) => sum + (s.value || 0), 0);
    const avgHR = average(heartRate.map((s: any) => s.value || 0));
    const avgRestingHR = restingHR.length > 0 ? average(restingHR.map((s: any) => s.value || 0)) : avgHR;
    const avgHRV = average(hrv.map((s: any) => s.value || 0));

    let totalSleepMins = 0;
    let deepSleepMins = 0;
    for (const s of sleep) {
      const start = new Date(s.startDate).getTime();
      const end = new Date(s.endDate).getTime();
      const mins = (end - start) / 60000;
      totalSleepMins += mins;
      if (s.value === "ASLEEP_DEEP" || s.value === 3) {
        deepSleepMins += mins;
      }
    }

    const totalCalories = calories.reduce((sum: number, s: any) => sum + (s.value || 0), 0);
    const avgSpO2 = spo2.length > 0 ? average(spo2.map((s: any) => (s.value || 0) * 100)) : 97;

    const healthData: HealthData = {
      steps: totalSteps,
      restingHR: Math.round(avgRestingHR),
      hrv: Math.round(avgHRV),
      sleepHours: parseFloat((totalSleepMins / 60).toFixed(1)),
      deepSleepHours: parseFloat((deepSleepMins / 60).toFixed(1)),
      activeCalories: Math.round(totalCalories),
      oxygenSaturation: Math.round(avgSpO2),
    };

    console.log("HealthKit computed data:", healthData);

    // If all values are 0, HealthKit returned no data — fall back to defaults
    if (totalSteps === 0 && avgHR === 0 && totalSleepMins === 0) {
      console.warn("HealthKit returned empty data, using defaults");
      return defaultHealthData;
    }

    return healthData;
  } catch (e) {
    console.error("Failed to fetch health data:", e);
    return defaultHealthData;
  }
}

// Algorithm: Convert raw health data into the 5 CoFactor scores
export function computeScores(data: HealthData) {
  // 1. Cognitive Readiness (0-100)
  const sleepScore = Math.min(100, (data.sleepHours / 8) * 100);
  const hrvScore = Math.min(100, (data.hrv / 60) * 100);
  const hrScore = Math.min(100, Math.max(0, 100 - Math.abs(data.restingHR - 60) * 2));
  const deepSleepScore = Math.min(100, (data.deepSleepHours / 2) * 100);
  const cognitiveReadiness = Math.round(sleepScore * 0.3 + hrvScore * 0.3 + hrScore * 0.2 + deepSleepScore * 0.2);

  // 2. Study Capacity (hours)
  const baseCapacity = 6;
  const sleepFactor = data.sleepHours >= 7 ? 1 : data.sleepHours / 7;
  const recoveryFactor = data.hrv >= 40 ? 1 : data.hrv / 40;
  const totalMins = Math.round(baseCapacity * 60 * sleepFactor * recoveryFactor);
  const studyHours = Math.floor(totalMins / 60);
  const studyMins = totalMins % 60;

  // Study block recommendation based on overall readiness
  const overallReadiness = (sleepFactor + recoveryFactor) / 2;
  const studyBlockRecommendation = overallReadiness >= 0.85
    ? { blockMinutes: 120, breakMinutes: 0, label: "2-hour deep blocks", tier: "high" as const }
    : overallReadiness >= 0.6
    ? { blockMinutes: 60, breakMinutes: 15, label: "60 min blocks · 15 min breaks", tier: "medium" as const }
    : { blockMinutes: 30, breakMinutes: 10, label: "30 min blocks · 10 min breaks", tier: "low" as const };

  // 3. Burnout Risk (0-100, lower is better)
  const sleepDebt = Math.max(0, 8 - data.sleepHours) * 12;
  const stressFromHR = Math.max(0, data.restingHR - 65) * 2;
  const lowHRV = Math.max(0, 40 - data.hrv) * 2;
  const burnoutRisk = Math.min(100, Math.round(sleepDebt + stressFromHR + lowHRV));

  // 4. Retention Outlook (0-100%)
  const deepSleepRetention = Math.min(100, (data.deepSleepHours / 2) * 100);
  const restRetention = Math.min(100, (data.sleepHours / 7.5) * 100);
  const hrvRetention = Math.min(100, (data.hrv / 50) * 100);
  const retentionOutlook = Math.round(deepSleepRetention * 0.4 + restRetention * 0.3 + hrvRetention * 0.3);

  // 5. Peak Study Window
  const hour = new Date().getHours();
  const wakeEstimate = data.sleepHours >= 7 ? 7 : 8;
  const peakStart = wakeEstimate + 2;
  const peakEnd = peakStart + 2.5;
  const formatTime = (h: number) => {
    const hr = Math.floor(h);
    const min = Math.round((h - hr) * 60);
    const period = hr >= 12 ? "PM" : "AM";
    const displayHr = hr > 12 ? hr - 12 : hr;
    return `${displayHr}:${min.toString().padStart(2, "0")} ${period}`;
  };

  return {
    cognitiveReadiness,
    studyCapacity: `${studyHours}h ${studyMins}m`,
    studyBlockRecommendation,
    burnoutRisk,
    retentionOutlook,
    peakWindow: `${formatTime(peakStart)} – ${formatTime(peakEnd)}`,
    // Raw factors for detail modals
    factors: {
      cognitive: {
        sleepQuality: Math.round(sleepScore),
        hrvRecovery: Math.round(hrvScore),
        restingHR: Math.round(hrScore),
        deepSleep: Math.round(deepSleepScore),
      },
      study: {
        sleepFactor: Math.round(sleepFactor * 100),
        recoveryFactor: Math.round(recoveryFactor * 100),
      },
      burnout: {
        sleepDebt: Math.round(Math.min(100, sleepDebt)),
        stressMarkers: Math.round(Math.min(100, stressFromHR)),
        hrvStress: Math.round(Math.min(100, lowHRV)),
      },
      retention: {
        deepSleep: Math.round(deepSleepRetention),
        restQuality: Math.round(restRetention),
        hrvConsolidation: Math.round(hrvRetention),
      },
    },
    rawData: data,
  };
}
