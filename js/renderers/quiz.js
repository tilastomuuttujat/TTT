// quiz.js — Omaksumistesti-renderöijä
// Monivalintatesti jossa jokainen vastaus saa välittömän selityksen.
// Ei pisteidenkeruuta ulkopuolelle — kaikki tapahtuu selaimessa.
//
// content-skeema:
// {
//   "body": "johdanto",
//   "questions": [
//     {
//       "q": "kysymys",
//       "options": ["A", "B", "C"],
//       "correct": 1,                       // indeksi options-taulukkoon
//       "explain": "miksi oikea vastaus on oikea"
//     }
//   ],
//   "results": {                            // palaute pistemäärän mukaan (valinnainen)
//     "high": "teksti kun ≥80 %",
//     "mid":  "teksti kun 50–79 %",
//     "low":  "teksti kun <50 %"
//   },
//   "note": "huomio", "source": "lähde"
// }

const esc = v => String(v ?? "").replace(/[&<>'"]/g, c => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
})[c]);

export function render(target, content, opts = {}) {
  // Loader välittää content-objektin suoraan; tuetaan myös appendix-objektia.
  const c = (content && Array.isArray(content.questions)) ? content : (content?.content || {});
  const questions = Array.isArray(c.questions) ? c.questions : [];

  if (!questions.length) {
    target.innerHTML = `<div class="appx-note">Testi ei sisällä kysymyksiä.</div>`;
    return;
  }

  const uid = "quiz-" + Math.random().toString(36).slice(2);
  let html = "";
  if (c.body) html += `<p class="appx-lead">${esc(c.body)}</p>`;

  html += `<div class="quizx" id="${uid}">`;
  questions.forEach((q, qi) => {
    html += `
      <div class="quizx-q" data-q="${qi}" data-answered="false" style="border:1px solid var(--line,#e6dfd0);border-radius:12px;padding:16px 18px;margin:0 0 12px;background:var(--card,#fff)">
        <div style="display:flex;gap:10px;align-items:baseline;margin-bottom:10px">
          <span style="font-family:ui-monospace,monospace;font-size:12px;color:var(--muted-2,#8a8276);flex-shrink:0">${qi + 1}/${questions.length}</span>
          <span style="font-weight:600;font-size:15px;line-height:1.45;color:var(--fg,#1f1b15)">${esc(q.q)}</span>
        </div>
        <div class="quizx-opts" style="display:flex;flex-direction:column;gap:6px">
          ${(q.options || []).map((opt, oi) => `
            <button type="button" class="quizx-opt" data-oi="${oi}"
              style="text-align:left;font:inherit;font-size:14px;line-height:1.45;padding:10px 14px;border:1px solid var(--line,#e6dfd0);border-radius:9px;background:var(--bg-soft,#f4efe5);color:var(--fg-soft,#3a332a);cursor:pointer;transition:border-color .15s,background .15s">
              ${esc(opt)}
            </button>`).join("")}
        </div>
        <div class="quizx-explain" hidden style="margin-top:12px;font-size:13.5px;line-height:1.55;padding:10px 14px;border-radius:0 8px 8px 0"></div>
      </div>`;
  });

  html += `
    <div class="quizx-result" hidden style="border:1px solid var(--line-strong,#c9bfa9);border-radius:12px;padding:18px 20px;margin-top:6px;background:var(--bg-soft,#f4efe5)">
      <div class="quizx-score" style="font-family:'Instrument Serif',Georgia,serif;font-size:22px;margin-bottom:6px;color:var(--fg,#1f1b15)"></div>
      <div class="quizx-verdict" style="font-size:14px;line-height:1.6;color:var(--fg-soft,#3a332a)"></div>
      <button type="button" class="quizx-reset" style="margin-top:12px;font:inherit;font-size:13px;padding:8px 14px;border:1px solid var(--line,#e6dfd0);border-radius:8px;background:var(--card,#fff);color:var(--fg,#1f1b15);cursor:pointer">Tee testi uudelleen</button>
    </div>
  </div>`;

  if (c.note) html += `<div class="appx-note">${esc(c.note)}</div>`;
  if (c.source) html += `<div class="appx-source">${esc(c.source)}</div>`;

  target.innerHTML = html;

  // ── Interaktio ──
  const root = target.querySelector("#" + uid);
  const state = { answered: 0, correct: 0 };

  const OK = "#1d9e75", BAD = "#a3271a";

  root.querySelectorAll(".quizx-q").forEach(qEl => {
    const qi = +qEl.dataset.q;
    const q = questions[qi];
    const explainEl = qEl.querySelector(".quizx-explain");

    qEl.querySelectorAll(".quizx-opt").forEach(btn => {
      btn.addEventListener("click", () => {
        if (qEl.dataset.answered === "true") return;
        qEl.dataset.answered = "true";
        const oi = +btn.dataset.oi;
        const right = oi === q.correct;

        // väritä valittu ja oikea
        qEl.querySelectorAll(".quizx-opt").forEach((b, bi) => {
          b.style.cursor = "default";
          if (bi === q.correct) {
            b.style.borderColor = OK; b.style.background = OK + "14"; b.style.fontWeight = "600";
          } else if (bi === oi) {
            b.style.borderColor = BAD; b.style.background = BAD + "10";
          } else {
            b.style.opacity = ".55";
          }
        });

        explainEl.hidden = false;
        explainEl.style.borderLeft = `3px solid ${right ? OK : BAD}`;
        explainEl.style.background = (right ? OK : BAD) + "0d";
        explainEl.style.color = "var(--fg-soft,#3a332a)";
        explainEl.innerHTML = `<b style="color:${right ? OK : BAD}">${right ? "Oikein." : "Ei aivan."}</b> ${esc(q.explain || "")}`;

        state.answered++; if (right) state.correct++;
        if (state.answered === questions.length) showResult();
      });
    });
  });

  function showResult() {
    const resEl = root.querySelector(".quizx-result");
    const pct = Math.round(100 * state.correct / questions.length);
    resEl.hidden = false;
    resEl.querySelector(".quizx-score").textContent = `${state.correct} / ${questions.length} oikein (${pct} %)`;
    const r = c.results || {};
    let verdict;
    if (pct >= 80)      verdict = r.high || "Mekanismit ovat hallussa.";
    else if (pct >= 50) verdict = r.mid || "Perusta on olemassa — osa mekanismeista kaipaa vielä kertausta.";
    else                verdict = r.low || "Kannattaa palata mekanismilukuihin — testin selitykset kertovat mihin.";
    resEl.querySelector(".quizx-verdict").textContent = verdict;
    resEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  root.querySelector(".quizx-reset")?.addEventListener("click", () => render(target, content, opts));
}

export default { render };
