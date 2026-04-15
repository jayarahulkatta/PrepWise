export const TONES = {
  confident: "💪 Confident",
  story: "📖 Story-driven",
  concise: "⚡ Concise",
  humble: "🙏 Humble",
  technical: "🔧 Technical",
};

export const QUESTION_TYPES = ["Technical", "HR", "Background", "Behavioral", "Java & DSA"];
export const EXPERIENCE_LEVELS = ["Fresher", "1-3 Years", "3-5 Years", "Senior"];
export const DIFFICULTIES = ["Easy", "Medium", "Hard"];

export const SCORE_AXES = [
  { key: "technicalAccuracy", label: "Technical Accuracy", weight: 0.25, icon: "🔬" },
  { key: "communicationClarity", label: "Communication", weight: 0.20, icon: "🗣️" },
  { key: "structureOrganization", label: "Structure", weight: 0.15, icon: "📐" },
  { key: "depthOfExamples", label: "Depth of Examples", weight: 0.20, icon: "📊" },
  { key: "roleRelevance", label: "Role Relevance", weight: 0.10, icon: "🎯" },
  { key: "overallImpression", label: "Overall", weight: 0.10, icon: "⭐" },
];

export function scoreColor(v) {
  if (v >= 75) return "var(--green)";
  if (v >= 50) return "var(--yellow)";
  return "var(--red)";
}

export function readinessLabel(score) {
  if (score >= 85) return "Interview Ready";
  if (score >= 70) return "Getting There";
  if (score >= 50) return "Needs Practice";
  if (score >= 30) return "Just Starting";
  return "Not Started";
}

export function formatTimeAgo(date) {
  const now = new Date();
  const d = new Date(date);
  const diffMs = now - d;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function daysUntil(date) {
  if (!date) return null;
  const d = new Date(date);
  const now = new Date();
  const diff = Math.ceil((d - now) / 86400000);
  return diff > 0 ? diff : null;
}
