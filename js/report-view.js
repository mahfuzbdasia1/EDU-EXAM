// ============================================================
// Free, email-free reports: on-screen review + Print / Save as PDF.
// Uses the browser's own print dialog, so Bangla text renders correctly and
// there is no quota, no server and no cost.
// Depends on js/utils.js (EduUtils) being loaded first.
// ============================================================
(function () {
  const esc = (s) => EduUtils.escapeHtml(s);
  const shown = (v) => (v === undefined || v === null || String(v).trim() === "") ? "(no answer)" : String(v);
  const pctOf = (a, b) => (b > 0 ? Math.round((a / b) * 100) : 0);
  const isRight = (q, given) => {
    const { earned, max } = EduUtils.gradeQuestion(q, given);
    return { ok: max > 0 && earned >= max, earned, max };
  };

  function questionBlocks(questions, answers) {
    return (questions || []).map((q, i) => {
      const given = answers ? answers[q.id] : undefined;
      const { ok, earned, max } = isRight(q, given);
      return `
        <div class="rq ${ok ? "ok" : "bad"}">
          <div class="rq-q">Q${i + 1}. ${esc(q.text)}</div>
          <div>Your answer: <strong>${esc(shown(given))}</strong></div>
          <div>Correct answer: <strong>${esc((q.correctAnswers || []).join(" / "))}</strong></div>
          <div class="rq-r">${ok ? "✅ Correct" : "❌ Incorrect"} (${earned}/${max} pts)</div>
        </div>`;
    }).join("");
  }

  // One student's full report (one printed page-group).
  function buildStudentReport({ examTitle, studentName, roll, totalScore, maxScore, questions, answers }) {
    return `
      <section class="report-page">
        <h2 style="margin:0 0 4px;">${esc(examTitle)}</h2>
        <div style="color:#6b7280; margin-bottom:10px;">
          ${esc(studentName)}${roll ? " &middot; Roll/ID: " + esc(roll) : ""}
        </div>
        <div style="font-size:26px; font-weight:700; margin-bottom:14px;">
          ${totalScore} / ${maxScore} &nbsp;(${pctOf(totalScore, maxScore)}%)
        </div>
        ${questionBlocks(questions, answers)}
      </section>`;
  }

  // Teacher's class summary page: stats + per-question accuracy + student table.
  function buildClassSummary({ examTitle, questions, submissions }) {
    const n = submissions.length;
    const pcts = submissions.map((s) => pctOf(s.totalScore, s.maxScore));
    const avg = n ? Math.round(pcts.reduce((a, b) => a + b, 0) / n) : 0;
    const high = n ? Math.max(...pcts) : 0;
    const low = n ? Math.min(...pcts) : 0;

    const qRows = (questions || []).map((q, i) => {
      const right = submissions.filter((s) => isRight(q, (s.answers || {})[q.id]).ok).length;
      return `<tr><td>Q${i + 1}</td><td>${esc((q.text || "").slice(0, 90))}</td><td>${right} / ${n}</td><td>${pctOf(right, n)}%</td></tr>`;
    }).join("");

    const sRows = submissions.map((s) => `
      <tr><td>${esc(s.studentName)}</td><td>${esc(s.studentRoll || "-")}</td>
      <td>${s.totalScore} / ${s.maxScore}</td><td>${pctOf(s.totalScore, s.maxScore)}%</td></tr>`).join("");

    return `
      <section class="report-page">
        <h2 style="margin:0 0 4px;">${esc(examTitle)} — Class Report</h2>
        <div style="margin:8px 0 16px;">
          Submissions: <strong>${n}</strong> &nbsp; Average: <strong>${avg}%</strong> &nbsp;
          Highest: <strong>${high}%</strong> &nbsp; Lowest: <strong>${low}%</strong>
        </div>
        <h3>Question-wise accuracy</h3>
        <table><thead><tr><th>#</th><th>Question</th><th>Correct</th><th>%</th></tr></thead><tbody>${qRows}</tbody></table>
        <h3 style="margin-top:20px;">Students</h3>
        <table><thead><tr><th>Name</th><th>Roll</th><th>Score</th><th>%</th></tr></thead><tbody>${sRows}</tbody></table>
      </section>`;
  }

  // Shows only `html` when printing (everything else on the page is hidden by CSS).
  function print(html) {
    let area = document.getElementById("printArea");
    if (!area) {
      area = document.createElement("div");
      area.id = "printArea";
      document.body.appendChild(area);
    }
    area.innerHTML = html;
    const cleanup = () => { area.innerHTML = ""; window.removeEventListener("afterprint", cleanup); };
    window.addEventListener("afterprint", cleanup);
    setTimeout(() => window.print(), 50);
  }

  window.EduReport = { questionBlocks, buildStudentReport, buildClassSummary, print };
})();
