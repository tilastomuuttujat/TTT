// zones.js — Vaikutettavuuskartta-renderöijä
// Kolme vyöhykettä: ajautuminen (drift) / rakenteellinen liikkumavara (structure) / valinta (choice)
//
// content-skeema:
// {
//   "body": "johdantoteksti",
//   "zones": {
//     "drift":     { "label": "Ajautuminen",  "items": ["...", "..."] },
//     "structure": { "label": "Rakenteellinen liikkumavara", "items": ["..."] },
//     "choice":    { "label": "Valinta", "items": ["..."] }
//   },
//   "note": "huomio",
//   "source": "lähde"
// }

const esc = v => String(v ?? "").replace(/[&<>'"]/g, c => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
})[c]);

const ZONE_META = {
  drift:     { color: "#a3271a", bg: "rgba(163,39,26,.07)",  icon: "→",  defaultLabel: "Ajautuminen",
               sub: "Ei voida vaikuttaa — voidaan varautua" },
  structure: { color: "#c98a2b", bg: "rgba(201,138,43,.08)", icon: "⚙",  defaultLabel: "Rakenteellinen liikkumavara",
               sub: "Voidaan muuttaa — hitaasti, rakenteiden kautta" },
  choice:    { color: "#1d9e75", bg: "rgba(29,158,117,.07)", icon: "✓",  defaultLabel: "Valinta",
               sub: "Aidosti poliittista — tahdon asia" }
};

export function render(target, content) {
  // Loader välittää content-objektin suoraan; tuetaan myös koko appendix-objektia.
  const c = (content && content.zones) ? content : (content?.content || {});
  const zones = c.zones || {};

  let html = "";
  if (c.body) html += `<p class="lead">${esc(c.body)}</p>`;

  html += `<div class="zones-grid" style="display:flex;flex-direction:column;gap:10px;margin:14px 0">`;

  for (const key of ["drift", "structure", "choice"]) {
    const z = zones[key];
    if (!z || !Array.isArray(z.items) || !z.items.length) continue;
    const meta = ZONE_META[key];
    const label = z.label || meta.defaultLabel;

    html += `
      <div class="zone" style="border-left:4px solid ${meta.color};background:${meta.bg};border-radius:0 10px 10px 0;padding:14px 16px">
        <div style="display:flex;align-items:baseline;gap:8px;margin-bottom:4px">
          <span style="font-weight:700;font-size:14px;color:${meta.color};letter-spacing:.02em">${esc(label)}</span>
          <span style="font-size:11px;color:var(--muted,#6b6356);text-transform:uppercase;letter-spacing:.06em">${esc(z.sub || meta.sub)}</span>
        </div>
        <ul style="margin:6px 0 0;padding-left:18px;display:flex;flex-direction:column;gap:5px">
          ${z.items.map(item => `<li style="font-size:14px;line-height:1.5;color:var(--fg-soft,#3a332a)">${esc(item)}</li>`).join("")}
        </ul>
      </div>`;
  }

  html += `</div>`;

  if (c.note) html += `<p class="note">${esc(c.note)}</p>`;
  if (c.source) html += `<p class="source">${esc(c.source)}</p>`;

  target.innerHTML = html;
}

export default { render };
