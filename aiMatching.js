export function sigmoid(value) {
  return 1 / (1 + Math.exp(-value));
}

export function normalizeMarks(marks) {
  return Math.max(0, Math.min(1, (Number(marks) || 0) / 100));
}

export function normalizeIncome(income) {
  const safe = Number(income) || 0;
  return 1 - Math.max(0, Math.min(1, safe / 1500000));
}

export function skillOverlap(studentSkills = [], requiredSkills = []) {
  if (!requiredSkills.length) return 0.4;
  const student = new Set(studentSkills.map((s) => s.toLowerCase().trim()));
  const matched = requiredSkills.filter((s) => student.has(s.toLowerCase().trim())).length;
  return matched / requiredSkills.length;
}

export function profileCompleteness(profile = {}) {
  const checks = [
    profile.educationLevel,
    profile.institution,
    profile.course,
    profile.academicScore,
    profile.incomeRange,
    profile.state,
    profile.district,
    profile.technicalSkills?.length,
    profile.softSkills?.length,
    profile.careerGoals,
  ];
  const present = checks.filter(Boolean).length;
  return present / checks.length;
}

export function logisticEligibility({
  academicScore,
  income,
  skillMatch,
  qualificationMatch,
  profileScore,
}) {
  const z =
    -1.1 +
    2.2 * normalizeMarks(academicScore) +
    1.3 * normalizeIncome(income) +
    2.1 * (skillMatch || 0) +
    1.7 * (qualificationMatch || 0) +
    1.1 * (profileScore || 0);
  return sigmoid(z);
}

export function eligibilityBand(probability) {
  if (probability >= 0.75) return "Highly Eligible";
  if (probability >= 0.45) return "Moderate Match";
  return "Low Match";
}
