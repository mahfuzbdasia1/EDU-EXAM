// Small shared helpers used across pages. Loaded as a plain (non-module) script
// so it can be used easily even on pages that don't need Firebase.

function toast(message, type = "info") {
  let container = document.querySelector(".toast-container");
  if (!container) {
    container = document.createElement("div");
    container.className = "toast-container";
    document.body.appendChild(container);
  }
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = message;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

// Unambiguous alphabet (no 0/O/1/I/L) so codes are easy to read out and type.
// 32 symbols => 32^6 ≈ 1.07 billion combinations per exam key (was 36^4 ≈ 1.7 million).
const KEY_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // exactly 32 chars
function randomCode(len) {
  const bytes = new Uint8Array(len);
  (window.crypto || window.msCrypto).getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < len; i++) out += KEY_ALPHABET[bytes[i] & 31]; // 256 % 32 === 0 => no modulo bias
  return out;
}

function generateExamKey(subject = "GEN") {
  const clean = (subject || "GEN").replace(/[^A-Za-z]/g, "").toUpperCase().slice(0, 4) || "GEN";
  return `${clean}-${randomCode(6)}`;
}

function uid() {
  return "id-" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

// Unicode-aware: Bangla (and any other script) names keep their letters/marks/digits
// instead of collapsing to an empty string — the old a-z0-9 version made every
// Bangla-named student share the same submission ID and overwrite each other.
// \p{M} is required so Bangla vowel signs (া ি ী ু ে ...) are not stripped.
function slugify(text) {
  const clean = (text || "").normalize("NFC").trim().toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, "-")
    .replace(/(^-|-$)/g, "");
  if (clean) return clean;
  // Fallback (emoji-only / symbols-only input): short stable hash so the ID is never empty.
  let h = 5381;
  const raw = text || "";
  for (let i = 0; i < raw.length; i++) h = ((h * 33) ^ raw.charCodeAt(i)) >>> 0;
  return "x" + h.toString(36);
}

// Submission / participant ID. Name + optional roll, so two students who share a
// name but have different roll numbers no longer collide.
function participantKey(name, roll) {
  const n = slugify(name);
  const r = (roll || "").trim() ? "__" + slugify(roll) : "";
  return n + r;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

function formatDuration(totalSeconds) {
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const s = Math.floor(totalSeconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

// Grades one question given the student's answer. Returns { earned, max }.
function gradeQuestion(question, studentAnswer) {
  const max = Number(question.points) || 0;
  if (question.type === "mcq" || question.type === "truefalse") {
    const correct = (question.correctAnswers || [])[0];
    const earned = studentAnswer !== undefined && studentAnswer === correct ? max : 0;
    return { earned, max };
  }
  if (question.type === "short") {
    const accepted = (question.correctAnswers || []).map((a) => a.trim().toLowerCase());
    const given = (studentAnswer || "").trim().toLowerCase();
    const earned = accepted.includes(given) ? max : 0;
    return { earned, max };
  }
  // Unknown/manual types default to 0 (would need manual grading in a future version)
  return { earned: 0, max };
}

function gradeSubmission(exam, answers) {
  let autoScore = 0;
  let autoMax = 0;
  exam.questions.forEach((q) => {
    const { earned, max } = gradeQuestion(q, answers[q.id]);
    autoScore += earned;
    autoMax += max;
  });
  return { autoScore, autoMax };
}

const TEAM_COLORS = ["#2563eb", "#dc2626", "#16a34a", "#d97706", "#7c3aed", "#0891b2", "#db2777", "#65a30d"];
function teamColor(teamIndex) {
  return TEAM_COLORS[teamIndex % TEAM_COLORS.length];
}

function generateBattleCode() {
  return randomCode(6);
}

const MEDALS = ["🥇", "🥈", "🥉"];

window.EduUtils = {
  toast, generateExamKey, uid, slugify, participantKey, escapeHtml, formatDuration, gradeQuestion, gradeSubmission,
  teamColor, generateBattleCode, MEDALS,
};
