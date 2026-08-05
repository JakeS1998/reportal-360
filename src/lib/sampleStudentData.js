// Deterministic in-memory sample student roster generator.
// Data is generated from school info on each load — nothing is persisted,
// so every school gets a full dataset without storing large amounts of data.

const FIRST_NAMES = [
  "James","Mary","John","Patricia","Robert","Jennifer","Michael","Linda","William","Elizabeth",
  "David","Barbara","Richard","Susan","Joseph","Jessica","Thomas","Sarah","Charles","Karen",
  "Christopher","Nancy","Daniel","Lisa","Matthew","Betty","Anthony","Helen","Mark","Sandra",
  "Donald","Donna","Steven","Carol","Paul","Ruth","Andrew","Sharon","Joshua","Michelle",
  "Kenneth","Laura","Kevin","Brian","George","Deborah","Edward","Amy","Ronald","Angela",
  "Timothy","Ashley","Jason","Brenda","Jeffrey","Pamela","Ryan","Nicole","Stephen","Emily",
  "Jacob","Olivia","Tyler","Madison","Jonathan","Abigail","Noah","Sophia","Aaron","Charlotte"
];

const LAST_NAMES = [
  "Smith","Johnson","Williams","Brown","Jones","Garcia","Miller","Davis","Rodriguez","Martinez",
  "Hernandez","Lopez","Gonzalez","Wilson","Anderson","Thomas","Taylor","Moore","Jackson","Martin",
  "Lee","Perez","Thompson","White","Harris","Sanchez","Clark","Ramirez","Lewis","Robinson",
  "Walker","Young","Allen","King","Wright","Scott","Torres","Nguyen","Hill","Flores",
  "Green","Adams","Nelson","Baker","Hall","Rivera","Campbell","Mitchell","Carter","Roberts",
  "Phillips","Evans","Turner","Diaz","Parker","Cruz","Edwards","Collins","Reyes","Stewart"
];

const RACES = ["White","Black","Hispanic","Asian","Two or more","American Indian","Native Hawaiian"];
const RACE_WEIGHTS = [0.5, 0.25, 0.12, 0.06, 0.05, 0.015, 0.005];

function hashString(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h) + str.charCodeAt(i);
    h = h & h;
  }
  return Math.abs(h) || 1;
}

function seededRandom(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

function pickWeighted(rand, items, weights) {
  const r = rand();
  let cum = 0;
  for (let i = 0; i < items.length; i++) {
    cum += weights[i];
    if (r <= cum) return items[i];
  }
  return items[items.length - 1];
}

export function scoreToGrade(score) {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

export function getGradesForType(schoolType) {
  switch (schoolType) {
    case "Elementary": return ["3", "4", "5"];
    case "Middle": return ["6", "7", "8"];
    case "High": return ["9", "10", "11", "12"];
    case "K-12": return ["3","4","5","6","7","8","9","10","11","12"];
    default: return ["3", "4", "5"];
  }
}

export const SUBJECTS = ["Math", "Reading", "Science"];

export function generateStudentRoster(school) {
  const code = school?.school_code || "0000";
  const year = school?.year || "2026";
  const seed = hashString(code + ":" + year);
  const rand = seededRandom(seed);

  const schoolType = school?.school_type || "Elementary";
  const grades = getGradesForType(schoolType);

  const enrollment = school?.enrollment || 300;
  const numStudents = Math.min(Math.max(Math.round(enrollment * 0.15), 20), 60);

  const students = [];
  for (let i = 0; i < numStudents; i++) {
    const grade = grades[Math.floor(rand() * grades.length)];
    const gender = rand() > 0.5 ? "Male" : "Female";
    const race = pickWeighted(rand, RACES, RACE_WEIGHTS);
    const econDis = rand() < 0.55;
    const ell = rand() < 0.06;
    const disab = rand() < 0.12;
    const lunch = econDis ? (rand() < 0.7 ? "Free" : "Reduced") : "Paid";

    const scores = {};
    const letterGrades = {};
    SUBJECTS.forEach((subj) => {
      const score = 55 + Math.floor(rand() * 46);
      scores[subj] = score;
      letterGrades[subj] = scoreToGrade(score);
    });

    const fn = FIRST_NAMES[Math.floor(rand() * FIRST_NAMES.length)];
    const ln = LAST_NAMES[Math.floor(rand() * LAST_NAMES.length)];

    students.push({
      student_number: `${code}-${String(i + 1).padStart(3, "0")}`,
      student_name: `${fn} ${ln}`,
      grade_level: grade,
      gender,
      race_ethnicity: race,
      economically_disadvantaged: econDis,
      english_learner: ell,
      disability: disab,
      lunch_status: lunch,
      scores,
      grades: letterGrades,
      attendanceRate: Math.round(80 + rand() * 20),
    });
  }

  return students;
}