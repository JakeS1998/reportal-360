export const assessmentTypes = ["classwork", "quiz", "test", "essay", "project", "homework", "presentation", "other"];

export function weightedAssessmentAverage(records, weights = {}) {
  const groups = assessmentTypes.map((type) => {
    const scores = records.filter((record) => record.assignment_type === type && typeof record.score === "number" && record.submission_status !== "missed").map((record) => (record.score / (record.max_score || 100)) * 100);
    return { score: scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : null, weight: Number(weights[type] || 0) };
  }).filter((group) => group.score !== null);
  const allocatedWeight = groups.reduce((sum, group) => sum + group.weight, 0);
  if (allocatedWeight > 0) return Math.round(groups.reduce((sum, group) => sum + group.score * group.weight, 0) / allocatedWeight);
  const scores = groups.map((group) => group.score);
  return scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : null;
}