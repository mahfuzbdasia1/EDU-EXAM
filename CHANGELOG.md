# Changelog

## Bug fixes + rules hardening
- **Bangla names**: `slugify` now supports Unicode (incl. Bangla vowel signs), so students with Bangla names no longer share one submission ID and overwrite each other. Added `EduUtils.participantKey(name, roll)` (name + optional roll) used for submissions and battle participants.
- **Submit**: `take-exam.html` now retries (4 attempts with backoff), marks `submitted` only after the write succeeds, shows "Retry Submit" on failure, and keeps retrying in the background if the timer already ended.
- **Autosave**: error handling + a "Saving… / ✓ Saved / ⚠ Not saved" indicator; pending autosave is cancelled before the final submit.
- **Load failure**: exam page no longer hangs on "Loading exam…" if the network fails.
- **firestore.rules** (must be re-published in Firebase Console):
  - `exams` / `battles` list restricted to the owner inside the rule itself.
  - `submissions`: created only as `in-progress` without score fields; once `submitted`/`graded`, students can no longer modify it (only the exam owner, or the `reportEmailSent` flag).

## Free reports (no email quota needed)
- **Student**: result page now shows a full question-by-question review + **🖨 Print / Save as PDF** button (`js/report-view.js`).
- **Teacher**: Results page has **🖨 Print all reports (PDF)** (class summary with per-question accuracy + every student's report) and a per-student **Report** button. CSV export now has Bangla-safe BOM, per-question marks (Q1..Qn) and formula-injection protection.
- **Battle**: final results page has a Print / Save as PDF button.
- **Email is now optional**: new "Email each student their report" checkbox in Create/Edit Exam (default on; old exams unchanged).
- **Quota-safe email** (`js/email-report.js`): breakdown is size-capped (<40KB, EmailJS limit is 50Kb) with automatic shortening; quota errors are detected, sending stops immediately, and users are told to use the free PDF report instead of a misleading "couldn't email" message. Emails include a link to the full report.

## Scale + privacy (1000+ users)
- **Local-first autosave** (`js/draft-sync.js`, `take-exam.html`, `team-battle-live.html`): every answer is saved instantly in the browser (localStorage); Firestore is written only ~10 times per exam (every 30s–5min depending on duration, battles every 30s) plus the final submit. Measured in simulation: ~12–14 writes/student (was ~31–135) → ~12–14K writes per 1000 students, inside the free 20K/day quota. Refresh/crash restores the newest of local vs cloud copy.
- **Roll/ID is now required** on the join form, so same-name students no longer share a submission.
- **Exam keys**: `SUBJ-XXXXXX` using a secure random generator and an unambiguous 32-char alphabet (~1 billion combos, was ~1.7 million); battle codes are 6 chars. Both are checked against existing docs before saving, and create-exam now shows errors instead of failing silently.
- **Privacy**: each submission stores the exam owner's `teacherId` (verified by Firestore rules against the exam doc). Only that teacher can list it — other teachers can no longer read student names/emails/rolls. Dashboard/Results queries filter by `teacherId`.
- **Teacher email verification**: signup sends a verification email (Firebase Auth, free); unverified accounts can't use teacher pages and Firestore rules require `email_verified` for creating/editing/listing exams & battles.

## ⚠️ Upgrade notes
1. Publish the new `firestore.rules` AND upload the new site files **at the same time, when no exam is live** (old cached pages can't create submissions under the new rules — ask students to hard-refresh).
2. Submissions created *before* this update have no `teacherId`, so they won't appear in Results (they're not deleted). New submissions are unaffected.
3. Existing teacher accounts must verify their email once (login page walks them through it).

## Known limitation
Grading is still client-side and `correctAnswers` is stored in the public exam doc. Fixing this fully needs the answer key moved to an owner-only doc plus teacher/server-side grading.
