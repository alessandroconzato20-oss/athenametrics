/**
 * Humanitas Medicine & Surgery — exam prerequisite graph.
 *
 * Source: official "Propaedeutic prerequisites" table (uploaded reference).
 * Course names MUST match those in `src/data/curriculum.ts` exactly.
 *
 * Rule: a course is "eligible" when EVERY prerequisite name is in the
 * student's passed-exams set. Courses not listed (or with `[]`) have no
 * prerequisites and are always eligible.
 */
export const PREREQUISITES: Record<string, string[]> = {
  // ----- Year 2 -----
  "Molecular Medicine and Computational Biology": [
    "The Cell: Molecules and Processes",
  ],
  "Body At Work 1": [
    "Building Bodies",
    "Principles of Living Matter",
    "Body Architecture",
    "The Cell: Molecules and Processes",
    "The Cell: Functions and Control",
  ],
  "Body At Work 2": [
    "Building Bodies",
    "Principles of Living Matter",
    "Body Architecture",
    "The Cell: Molecules and Processes",
    "The Cell: Functions and Control",
  ],
  "Mechanism Of Diseases 1": [
    "Principles of Living Matter",
    "The Cell: Molecules and Processes",
    "The Cell: Functions and Control",
    "Building Bodies",
    "Body Architecture",
  ],
  "Mechanism Of Diseases 2": ["Mechanism Of Diseases 1"],

  // ----- Year 3 -----
  "Pathology and Diagnostics": [
    "Mechanism Of Diseases 2",
    "Molecular Medicine and Computational Biology",
  ],
  "Cardiovascular Diseases": ["Mechanism Of Diseases 2"],
  "Nephrology and Urology": ["Mechanism Of Diseases 2"],
  "Respiratory Diseases": ["Mechanism Of Diseases 2"],

  // ----- Year 4 -----
  "Gastroenterology": [
    "Pathology and Diagnostics",
    "Pharmacology",
    "General Surgery",
  ],
  "Endocrinology": [
    "Pathology and Diagnostics",
    "Pharmacology",
    "General Surgery",
  ],
  "Bone and Joint Diseases": [
    "General Surgery",
    "Pathology and Diagnostics",
    "Pharmacology",
  ],
  "Clinical Immunology and Dermatology": [
    "Pathology and Diagnostics",
    "Pharmacology",
  ],
  "Infectious Diseases": [
    "Pharmacology",
    "Pathology and Diagnostics",
  ],
  "Public Health and Environmental Medicine": ["Biostatistics"],

  // ----- Year 5 -----
  "Clinical Neuroscience": [
    "Head and Neck",
    "Pharmacology",
    "Pathology and Diagnostics",
    "General Surgery",
  ],
  "Mental Health": ["Pharmacology", "Pathology and Diagnostics"],
  "Pediatrics": [
    "Infectious Diseases",
    "Cardiovascular Diseases",
    "Nephrology and Urology",
    "Respiratory Diseases",
    "Gastroenterology",
    "Endocrinology",
  ],
  "Obstetrics and Gynecology": [
    "General Surgery",
    "Pharmacology",
    "Pathology and Diagnostics",
  ],
  "Blood Diseases": [
    "Pathology and Diagnostics",
    "Pharmacology",
  ],
  "Clinical and Molecular Oncology": [
    "Informatics and Data Science",
    "Pathology and Diagnostics",
    "Public Health and Environmental Medicine",
    "Pharmacology",
  ],

  // ----- Year 6 -----
  "Patient Management": [
    "Cardiovascular Diseases",
    "Nephrology and Urology",
    "Respiratory Diseases",
    "Gastroenterology",
    "Endocrinology",
    "Public Health and Environmental Medicine",
    "Clinical Immunology and Dermatology",
    "Infectious Diseases",
    "Bone and Joint Diseases",
    "Clinical Neuroscience",
    "Mental Health",
    "Blood Diseases",
    "Clinical and Molecular Oncology",
    "Obstetrics and Gynecology",
  ],
  "Emergencies": [
    "Cardiovascular Diseases",
    "Nephrology and Urology",
    "Respiratory Diseases",
    "Gastroenterology",
    "Endocrinology",
    "Clinical Neuroscience",
    "Mental Health",
    "Infectious Diseases",
  ],
  "Final Exam": ["Patient Management", "Emergencies"],
};

/** Returns prereqs for a course (empty array if none/unknown). */
export function getPrerequisites(courseName: string): string[] {
  return PREREQUISITES[courseName] ?? [];
}

/** True when every prerequisite is in `passed`. Courses with no prereqs are always eligible. */
export function isEligible(courseName: string, passed: Set<string> | string[]): boolean {
  const set = passed instanceof Set ? passed : new Set(passed);
  const reqs = getPrerequisites(courseName);
  return reqs.every((r) => set.has(r));
}

/** Prereqs the student is still missing for a course. */
export function missingPrerequisites(courseName: string, passed: Set<string> | string[]): string[] {
  const set = passed instanceof Set ? passed : new Set(passed);
  return getPrerequisites(courseName).filter((r) => !set.has(r));
}
