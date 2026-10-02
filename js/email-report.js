// ============================================================
// Builds a right/wrong breakdown and sends it by email via EmailJS.
// Gracefully does nothing (no crash) if the student gave no email,
// or if EmailJS hasn't been configured yet (see js/email-config.js).
//
// EmailJS free plan = 200 requests/month and 50Kb per request, so:
//  - the breakdown is kept compact and size-capped (falls back to a shorter
//    version, then to score + link only, instead of failing),
//  - a quota error is reported as reason "quota" so callers can stop and tell
//    the user to use the free Print / Save as PDF report instead.
// ============================================================

const MAX_BREAKDOWN_BYTES = 40000; // stay safely under EmailJS's 50Kb request cap
const byteLen = (s) => new TextEncoder().encode(s).length;

function buildBlocks(questions, answers, { wrongOnly = false, trim = 0 } = {}) {
  const clip = (t) => (trim && t.length > trim ? t.slice(0, trim) + "…" : t);
  return questions.map((q, i) => {
    const given = answers[q.id];
    const { earned, max } = EduUtils.gradeQuestion(q, given);
    const isCorrect = earned >= max && max > 0;
    if (wrongOnly && isCorrect) return "";
    const correctDisplay = EduUtils.escapeHtml(clip((q.correctAnswers || []).join(" / ")));
    const givenDisplay = given === undefined || given === "" ? "(no answer)" : EduUtils.escapeHtml(clip(String(given)));
    const questionText = EduUtils.escapeHtml(clip(q.text));
    const color = isCorrect ? "#15803d" : "#b91c1c";
    const bg = isCorrect ? "#f0fdf4" : "#fef2f2";
    return `<div style="margin:0 0 8px;padding:8px 12px;border-left:4px solid ${color};background:${bg};font-family:Arial,sans-serif;font-size:14px;">` +
      `<b>Q${i + 1}. ${questionText}</b><br>Your answer: <b>${givenDisplay}</b><br>Correct: <b>${correctDisplay}</b><br>` +
      `<span style="color:${color};font-weight:600;">${isCorrect ? "✅ Correct" : "❌ Incorrect"} (${earned}/${max})</span></div>`;
  }).join("");
}

// Returns a breakdown that is guaranteed to fit the size cap.
function buildBreakdownText(questions, answers, resultUrl) {
  const linkLine = resultUrl
    ? `<p style="font-family:Arial,sans-serif;font-size:14px;">Full report (print / save as PDF): <a href="${resultUrl}">${resultUrl}</a></p>`
    : "";
  const attempts = [
    { },
    { wrongOnly: true, trim: 120 },
    { wrongOnly: true, trim: 50 },
  ];
  for (let i = 0; i < attempts.length; i++) {
    const note = i === 0 ? "" : `<p style="font-family:Arial,sans-serif;font-size:13px;color:#6b7280;">(Shortened: only incorrect answers are listed.)</p>`;
    const html = note + buildBlocks(questions, answers, attempts[i]) + linkLine;
    if (byteLen(html) <= MAX_BREAKDOWN_BYTES) return html;
  }
  return `<p style="font-family:Arial,sans-serif;font-size:14px;">The detailed breakdown was too long to email.</p>` + linkLine;
}

function isQuotaError(err) {
  const status = err && err.status;
  const text = String((err && (err.text || err.message)) || "");
  return status === 429 || status === 402 || /limit|quota|exceed/i.test(text);
}

async function sendResultEmail({ studentName, studentEmail, examTitle, questions, answers, totalScore, maxScore, resultUrl }) {
  if (!studentEmail) return { skipped: true, reason: "no-email" };

  const cfg = window.EMAILJS_CONFIG;
  if (!cfg || !cfg.publicKey || cfg.publicKey === "YOUR_PUBLIC_KEY") {
    console.warn("EduExam: EmailJS isn't configured yet (see js/email-config.js) — skipping email send.");
    return { skipped: true, reason: "not-configured" };
  }
  if (!window.emailjs) {
    console.warn("EduExam: EmailJS SDK didn't load — skipping email send.");
    return { skipped: true, reason: "sdk-not-loaded" };
  }

  const percent = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
  const breakdown = buildBreakdownText(questions, answers, resultUrl);

  try {
    await window.emailjs.send(cfg.serviceId, cfg.templateId, {
      to_email: studentEmail,
      student_name: studentName,
      exam_title: examTitle,
      score: totalScore,
      max_score: maxScore,
      percent,
      breakdown,
    });
    return { sent: true };
  } catch (err) {
    console.error("EduExam: failed to send result email", err);
    return { sent: false, reason: isQuotaError(err) ? "quota" : "error", error: err };
  }
}

window.EduEmail = { sendResultEmail };
