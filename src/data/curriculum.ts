export interface Course {
  name: string;
  credits: number;
}

export interface SemesterCourses {
  year: number;
  semester: number; // 1 or 2, or 0 for annual
  label: string;
  courses: Course[];
}

export const curriculum: SemesterCourses[] = [
  {
    year: 1, semester: 1, label: "Year 1 · Semester 1",
    courses: [
      { name: "Building Bodies", credits: 12 },
      { name: "Principles of Living Matter", credits: 9 },
    ],
  },
  {
    year: 1, semester: 2, label: "Year 1 · Semester 2",
    courses: [
      { name: "The Cell: Molecules and Processes", credits: 6 },
      { name: "The Cell: Functions and Control", credits: 9 },
      { name: "Body Architecture", credits: 11 },
      { name: "Being a Medical Doctor", credits: 6 },
    ],
  },
  {
    year: 2, semester: 1, label: "Year 2 · Semester 1",
    courses: [
      { name: "Body At Work 1", credits: 13 },
      { name: "Mechanism Of Diseases 1", credits: 9 },
      { name: "Molecular Medicine and Computational Biology", credits: 8 },
    ],
  },
  {
    year: 2, semester: 2, label: "Year 2 · Semester 2",
    courses: [
      { name: "Body At Work 2", credits: 13 },
      { name: "Mechanism Of Diseases 2", credits: 10 },
    ],
  },
  {
    year: 3, semester: 1, label: "Year 3 · Semester 1",
    courses: [
      { name: "Pathology and Diagnostics", credits: 9 },
      { name: "Nephrology and Urology", credits: 7 },
      { name: "General Surgery", credits: 3 },
    ],
  },
  {
    year: 3, semester: 2, label: "Year 3 · Semester 2",
    courses: [
      { name: "Head and Neck", credits: 6 },
      { name: "Respiratory Diseases", credits: 7 },
    ],
  },
  {
    year: 3, semester: 0, label: "Year 3 · Annual",
    courses: [
      { name: "Pharmacology", credits: 8 },
      { name: "Cardiovascular Diseases", credits: 8 },
    ],
  },
  {
    year: 4, semester: 1, label: "Year 4 · Semester 1",
    courses: [
      { name: "Endocrinology", credits: 6 },
      { name: "Bone and Joint Diseases", credits: 6 },
      { name: "Biostatistics", credits: 4 },
      { name: "Gastroenterology", credits: 6 },
    ],
  },
  {
    year: 4, semester: 2, label: "Year 4 · Semester 2",
    courses: [
      { name: "Clinical Immunology and Dermatology", credits: 4 },
      { name: "Infectious Diseases", credits: 6 },
      { name: "Public Health and Environmental Medicine", credits: 11 },
      { name: "Informatics and Data Science", credits: 4 },
    ],
  },
  {
    year: 5, semester: 1, label: "Year 5 · Semester 1",
    courses: [
      { name: "Clinical Neuroscience", credits: 9 },
      { name: "Mental Health", credits: 7 },
    ],
  },
  {
    year: 5, semester: 2, label: "Year 5 · Semester 2",
    courses: [
      { name: "Pediatrics", credits: 6 },
      { name: "Obstetrics and Gynecology", credits: 5 },
      { name: "Blood Diseases", credits: 6 },
      { name: "Clinical and Molecular Oncology", credits: 5 },
    ],
  },
  {
    year: 5, semester: 0, label: "Year 5 · Annual",
    courses: [
      { name: "Patient Management", credits: 11 },
    ],
  },
  {
    year: 6, semester: 1, label: "Year 6 · Semester 1",
    courses: [
      { name: "Emergencies", credits: 4 },
      { name: "Forensic Medicine and Bioethics", credits: 4 },
      { name: "Patient Management", credits: 10 },
    ],
  },
  {
    year: 6, semester: 2, label: "Year 6 · Semester 2",
    courses: [
      { name: "Final Exam", credits: 18 },
    ],
  },
];

/** Get courses available for a given year and semester, including annual courses */
export function getCoursesForStudent(year: number, semester: number): Course[] {
  return curriculum
    .filter(s => s.year === year && (s.semester === semester || s.semester === 0))
    .flatMap(s => s.courses);
}

/** Get all courses for a given year */
export function getCoursesForYear(year: number): Course[] {
  return curriculum
    .filter(s => s.year === year)
    .flatMap(s => s.courses);
}
