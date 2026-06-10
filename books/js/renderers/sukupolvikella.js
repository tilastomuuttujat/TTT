// renderers/sukupolvikella.js -- sukupolvikehä inline-liitteenä.
// Käyttö: content.view = "sukupolvikella".
// content: { body?, dims?[[key,label]...], eras?[{birth,at25,person,color,d{...}}], note?, source?, default_active? }
// Jos eras/dims puuttuvat, käytetään sisäänrakennettua oletusta. Keskus = yhteenkuuluvuus; etäisyys = asema.

let cssDone = false;
function injectCss(util) {
  if (cssDone) return; cssDone = true;
  util.injectStyle("appx-css-skk", `
    .appx .skk { margin-top: 6px; }
    .appx .skk-axis { font-size: 12.5px; color: var(--muted-2, #8a8276); margin: 0 0 8px; }
    .appx .skk-svg { width: 100%; height: auto; display: block; touch-action: none; }
    .appx .skk-controls { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; margin: 6px 0 2px; }
    .appx .skk-chips { display: flex; flex-wrap: wrap; gap: 6px; }
    .appx .skk-chip { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; padding: 4px 10px; border: 1px solid var(--line, #e6dfd0); border-radius: 20px; background: var(--bg-soft, #f4efe5); color: var(--fg-soft, #3a332a); cursor: pointer; transition: .15s; }
    .appx .skk-chip:hover { border-color: var(--line-strong, #c9bfa9); }
    .appx .skk-chip.on { border-color: currentColor; background: var(--card, #fff); }
    .appx .skk-cdot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
    .appx .skk-eras { display: flex; flex-wrap: wrap; gap: 5px; align-items: center; }
    .appx .skk-eras .lbl { font-size: 11px; color: var(--muted-2, #8a8276); margin-right: 2px; }
    .appx .skk-erab { font-size: 11px; padding: 4px 8px; border: 1px solid var(--line, #e6dfd0); border-radius: 7px; background: var(--bg-soft, #f4efe5); color: var(--fg-soft, #3a332a); cursor: pointer; transition: .15s; }
    .appx .skk-erab:hover { border-color: var(--line-strong, #c9bfa9); }
    .appx .skk-erab.home { border-color: color-mix(in srgb, #4a7a3c 50%, var(--line, #e6dfd0)); }
    .appx .skk-reset { margin-left: auto; font-size: 11px; padding: 4px 10px; border: 1px solid var(--line, #e6dfd0); border-radius: 7px; background: transparent; color: var(--muted, #6b6356); cursor: pointer; }
    .appx .skk-reset:hover { border-color: var(--line-strong, #c9bfa9); color: var(--fg, #1f1b15); }
    .appx .skk-reading { font-size: 14px; line-height: 1.55; color: var(--fg-soft, #3a332a); border-left: 3px solid var(--line-strong, #c9bfa9); padding: 8px 0 8px 14px; margin: 12px 0 0; min-height: 40px; }
    .appx .skk-reading.in { border-left-color: #4a7a3c; }
    .appx .skk-reading.out { border-left-color: #a3503a; }
  `);
}

const DEFAULT_DIMS = [
  ["yhteisollisyys", "Yhteisöllisyys"], ["rooli", "Selkeä rooli"],
  ["projekti", "Yhteinen suunta"], ["turva", "Turva"], ["tunnustus", "Tulluksi nähdyksi"],
];
const DEFAULT_ERAS = [
  { birth:1925, at25:1950, person:"Vilho",  color:"#1f6f6b", d:{yhteisollisyys:85,rooli:80,projekti:78,turva:45,tunnustus:70} },
  { birth:1945, at25:1970, person:"Helmi",  color:"#4a7a3c", d:{yhteisollisyys:82,rooli:75,projekti:88,turva:75,tunnustus:75} },
  { birth:1965, at25:1990, person:"Esko",   color:"#3a6ea5", d:{yhteisollisyys:72,rooli:70,projekti:74,turva:80,tunnustus:72} },
  { birth:1985, at25:2010, person:"Riikka", color:"#7a5ea8", d:{yhteisollisyys:55,rooli:55,projekti:52,turva:58,tunnustus:58} },
  { birth:2005, at25:2030, person:"Jukka",  color:"#9a6a3c", d:{yhteisollisyys:42,rooli:44,projekti:40,turva:42,tunnustus:46} },
  { birth:2025, at25:2050, person:"Vilja",  color:"#a3503a", d:{yhteisollisyys:36,rooli:38,projekti:34,turva:36,tunnustus:40} },
];

export function render(el, content, opts) {
  const { util } = opts;
  injectCss(util);
  const esc = util.esc;

  const DIMS = (Array.isArray(content.dims) && content.dims.length) ? content.dims : DEFAULT_DIMS;
  const ERAS = (Array.isArray(content.eras) && content.eras.length) ? content.eras : DEFAULT_ERAS;
  const dimKeys = DIMS.map((d) => Array.isArray(d) ? d[0] : d.key);
  const n = ERAS.length;
  const asemaOf = (i) => dimKeys.reduce((s, k) => s + (Number(ERAS[i].d[k]) || 0), 0) / dimKeys.length;

  // geometria: alaspäin aukeava puolikaari (180° vasen → 0° oikea)
  const CX = 380, CY = 66, RMAX = 340, RMIN = 36;
  const spokeDeg = (i) => (n === 1) ? 90 : 180 - i * (180 / (n - 1));
  const radiusFor = (a) => Math.max(RMIN, RMAX * (1 - a / 100));
  const polar = (deg, r) => [CX + r * Math.cos(deg * Math.PI / 180), CY + r * Math.sin(deg * Math.PI / 180)];
  const css = getComputedStyle(document.documentElement);
  const col = (nm, fb) => (css.getPropertyValue(nm).trim() || fb);

  const persons = ERAS.map((e, i) => ({ name: e.person || ("#" + i), color: e.color || "#6b6356", birth: e.birth, at25: e.at25, home: i, cur: i }));
  const st = { active: (Number.isInteger(content.default_active) ? content.default_active : n - 1), dragging: null };

  // runko
  el.innerHTML =
    util.lead(content) +
    `<div class="skk">
      <p class="skk-axis">Keskellä vahva yhteenkuuluvuus ja merkitys; ulompana irrallisuus. Aika vasemmalta (${esc(ERAS[0].birth)}) oikealle (${esc(ERAS[n - 1].birth)}). Vedä henkilöä tai paina aikaa.</p>
      <svg class="skk-svg" viewBox="0 0 760 470" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Sukupolvikehä"></svg>
      <div class="skk-controls"><div class="skk-chips">${persons.map((p, i) => `<button class="skk-chip" data-i="${i}" style="color:${esc(p.color)}"><span class="skk-cdot" style="background:${esc(p.color)}"></span>${esc(p.name)}</button>`).join("")}</div>
        <button class="skk-reset">Palauta</button></div>
      <div class="skk-controls"><div class="skk-eras"><span class="lbl">Sijoita aikaan:</span>${ERAS.map((e, i) => `<button class="skk-erab" data-era="${i}">${esc(e.birth)}</button>`).join("")}</div></div>
      <p class="skk-reading in"></p>
    </div>` +
    util.note(content) + util.source(content);

  const root = el.querySelector(".skk");
  const svg = root.querySelector(".skk-svg");
  const readingEl = root.querySelector(".skk-reading");

  function arcPath(r) { const [ax, ay] = polar(0, r), [bx, by] = polar(180, r); return `M ${ax.toFixed(1)} ${ay.toFixed(1)} A ${r} ${r} 0 0 1 ${bx.toFixed(1)} ${by.toFixed(1)}`; }
  function nearestEra(px, py) {
    const ang = Math.atan2(py - CY, px - CX) * 180 / Math.PI;
    let best = 0, bd = 1e9;
    for (let i = 0; i < n; i++) { const d = Math.abs(((ang - spokeDeg(i) + 540) % 360) - 180); if (d < bd) { bd = d; best = i; } }
    return best;
  }
  function svgPoint(evt) { const pt = svg.createSVGPoint(); pt.x = evt.clientX; pt.y = evt.clientY; const p = pt.matrixTransform(svg.getScreenCTM().inverse()); return [p.x, p.y]; }

  function draw() {
    const cLine = col("--line", "#e6dfd0"), cLineS = col("--line-strong", "#c9bfa9"),
      cFg = col("--fg-soft", "#3a332a"), cMuted = col("--muted", "#6b6356"), cMuted2 = col("--muted-2", "#8a8276"),
      cAccent = col("--accent", "#1f1b15"), cCard = col("--card", "#fff"),
      serif = col("--serif", '"Instrument Serif",Georgia,serif'), sans = col("--sans", '"Work Sans",system-ui,sans-serif');
    let s = "";
    for (const a of [75, 50, 25, 0]) {
      const r = radiusFor(a);
      s += `<path d="${arcPath(r)}" fill="none" stroke="${cLine}" stroke-width="1"/>`;
      s += `<text x="${CX + 4}" y="${(CY + r - 5).toFixed(1)}" fill="${cMuted2}" font-family="${sans}" font-size="10">${a === 0 ? "reuna" : "asema " + a}</text>`;
    }
    const curve = ERAS.map((e, i) => polar(spokeDeg(i), radiusFor(asemaOf(i))));
    s += `<polyline fill="none" stroke="${cLineS}" stroke-width="1.5" opacity="0.55" points="${curve.map((p) => p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ")}"/>`;
    for (let i = 0; i < n; i++) {
      const [rx, ry] = polar(spokeDeg(i), RMAX);
      const hot = st.dragging !== null && persons[st.dragging].cur === i;
      s += `<line x1="${CX}" y1="${CY}" x2="${rx.toFixed(1)}" y2="${ry.toFixed(1)}" stroke="${hot ? cAccent : cLine}" stroke-width="${hot ? 1.4 : 1}" opacity="${hot ? 0.8 : 0.5}"/>`;
      const [lx, ly] = polar(spokeDeg(i), RMAX + 20);
      const c = Math.cos(spokeDeg(i) * Math.PI / 180); const anchor = Math.abs(c) < 0.25 ? "middle" : (c > 0 ? "start" : "end");
      s += `<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="${anchor}" fill="${cFg}" font-family="${serif}" font-size="16">${esc(ERAS[i].birth)}</text>`;
      s += `<text x="${lx.toFixed(1)}" y="${(ly + 13).toFixed(1)}" text-anchor="${anchor}" fill="${cMuted2}" font-family="${sans}" font-size="10">${esc(ERAS[i].person || "")}</text>`;
    }
    s += `<circle cx="${CX}" cy="${CY}" r="4" fill="${cAccent}"/>`;
    s += `<text x="${CX}" y="${CY - 12}" text-anchor="middle" fill="${cMuted}" font-family="${sans}" font-size="11">keskus · yhteenkuuluvuus & merkitys</text>`;
    s += `<text x="${CX}" y="${(CY + RMAX + 38).toFixed(1)}" text-anchor="middle" fill="${cMuted2}" font-family="${sans}" font-size="10.5">mitä lähempänä keskustaa, sitä vahvempi yhteenkuuluvuus · ulompana = irrallisuus</text>`;
    const byEra = {}; persons.forEach((p, i) => { (byEra[p.cur] = byEra[p.cur] || []).push(i); });
    persons.forEach((p, i) => {
      if (p.cur !== p.home) {
        const grp = byEra[p.cur], k = grp.indexOf(i), off = (k - (grp.length - 1) / 2) * 7;
        const [hx, hy] = polar(spokeDeg(p.home), radiusFor(asemaOf(p.home)));
        const [tx, ty] = polar(spokeDeg(p.cur) + off, radiusFor(asemaOf(p.cur)));
        s += `<line x1="${hx.toFixed(1)}" y1="${hy.toFixed(1)}" x2="${tx.toFixed(1)}" y2="${ty.toFixed(1)}" stroke="${esc(p.color)}" stroke-width="1" stroke-dasharray="3 3" opacity="0.5"/>`;
        s += `<circle cx="${hx.toFixed(1)}" cy="${hy.toFixed(1)}" r="6" fill="none" stroke="${esc(p.color)}" stroke-width="1" opacity="0.4"/>`;
      }
    });
    persons.forEach((p, i) => {
      const grp = byEra[p.cur], k = grp.indexOf(i), off = (k - (grp.length - 1) / 2) * 7;
      const [tx, ty] = polar(spokeDeg(p.cur) + off, radiusFor(asemaOf(p.cur)));
      if (i === st.active) s += `<circle cx="${tx.toFixed(1)}" cy="${ty.toFixed(1)}" r="21" fill="none" stroke="${esc(p.color)}" stroke-width="1.5" opacity="0.55"/>`;
      s += `<g data-token="${i}" style="cursor:grab"><circle cx="${tx.toFixed(1)}" cy="${ty.toFixed(1)}" r="15" fill="${esc(p.color)}" stroke="${cCard}" stroke-width="2"/>`;
      s += `<text x="${tx.toFixed(1)}" y="${(ty + 4).toFixed(1)}" text-anchor="middle" fill="#fff" font-family="${sans}" font-size="12" font-weight="600" pointer-events="none">${esc((p.name || "?")[0])}</text></g>`;
    });
    svg.innerHTML = s;

    root.querySelectorAll(".skk-chip").forEach((b) => b.classList.toggle("on", +b.dataset.i === st.active));
    const ap = persons[st.active], a = asemaOf(ap.cur), aHome = asemaOf(ap.home);
    root.querySelectorAll(".skk-erab").forEach((b) => b.classList.toggle("home", +b.dataset.era === ap.home));
    if (ap.cur === ap.home) { readingEl.className = "skk-reading in"; readingEl.textContent = `${ap.name} on omassa ajassaan (s. ${ap.birth}${ap.at25 ? ", 25-vuotias " + ap.at25 : ""}). Vedä hänet toiseen aikaan -- esimerkiksi Vilja vuoteen 1925 -- ja katso, miten paikka kehällä muuttuu.`; }
    else if (a > aHome) { readingEl.className = "skk-reading in"; readingEl.textContent = `${ERAS[ap.cur].birth} olosuhteissa ${ap.name} olisi lähempänä keskustaa: vahvempi yhteenkuuluvuus (asema ${Math.round(a)} vs oma aika ${Math.round(aHome)}). Ei siksi että hän muuttuisi -- vaan koska tuo aika tarjosi tiiviimmän paikan.`; }
    else { readingEl.className = "skk-reading out"; readingEl.textContent = `${ERAS[ap.cur].birth} olosuhteissa ${ap.name} ajautuisi ulommas: ohuempi yhteenkuuluvuus (asema ${Math.round(a)} vs oma aika ${Math.round(aHome)}). Sama ihminen, eri rakenteellinen paikka.`; }
  }

  root.querySelectorAll(".skk-chip").forEach((b) => b.addEventListener("click", () => { st.active = +b.dataset.i; draw(); }));
  root.querySelectorAll(".skk-erab").forEach((b) => b.addEventListener("click", () => { persons[st.active].cur = +b.dataset.era; draw(); }));
  root.querySelector(".skk-reset").addEventListener("click", () => { persons.forEach((p) => p.cur = p.home); draw(); });
  svg.addEventListener("pointerdown", (e) => { const g = e.target.closest("[data-token]"); if (!g) return; st.dragging = +g.getAttribute("data-token"); st.active = st.dragging; try { svg.setPointerCapture(e.pointerId); } catch (x) {} draw(); });
  svg.addEventListener("pointermove", (e) => { if (st.dragging === null) return; const [px, py] = svgPoint(e); const era = nearestEra(px, py); if (persons[st.dragging].cur !== era) { persons[st.dragging].cur = era; draw(); } });
  svg.addEventListener("pointerup", (e) => { st.dragging = null; try { svg.releasePointerCapture(e.pointerId); } catch (x) {} draw(); });
  svg.addEventListener("pointercancel", () => { st.dragging = null; draw(); });

  draw();
}