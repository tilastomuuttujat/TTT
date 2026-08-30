import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.cwd());
const DATA_FILE = path.join(ROOT, 'kirjoitukset.json');
const OUT_DIR = path.join(ROOT, 'kirjoitukset');
const SITE = 'https://harrikayhko.fi';

const escapeHtml = value => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
const articles = Array.isArray(data) ? data : data.kirjoitukset;
if (!Array.isArray(articles)) throw new Error('kirjoitukset-taulukko puuttuu');

fs.mkdirSync(OUT_DIR, { recursive: true });

// Generated share pages are flat: kirjoitukset/<slug>.html.
// Remove only previously generated flat HTML files; other files/directories are left untouched.
for (const entry of fs.readdirSync(OUT_DIR, { withFileTypes: true })) {
  if (entry.isFile() && entry.name.endsWith('.html')) {
    fs.rmSync(path.join(OUT_DIR, entry.name));
  }
}

for (const article of articles) {
  const slug = article.slug || article.id;
  if (!slug) continue;

  const title = escapeHtml(article.title || slug);
  const description = escapeHtml(article.ingress || article.subtitle || '');
  const alt = escapeHtml(article.imageAlt || article.title || 'Artikkelin kuva');
  const imageName = article.ogImage || article.image || '';
  const canonical = `${SITE}/kirjoitukset/${encodeURIComponent(slug)}.html`;
  const image = imageName ? `${SITE}/images/${String(imageName).replace(/^\/+/, '')}` : '';
  const target = `/reader.html?id=${encodeURIComponent(slug)}`;

  const imageMeta = image ? `\n<meta property="og:image" content="${escapeHtml(image)}">\n<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">\n<meta property="og:image:alt" content="${alt}">\n<meta name="twitter:image" content="${escapeHtml(image)}">` : '';

  const html = `<!doctype html>
<html lang="fi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<meta name="description" content="${description}">
<link rel="canonical" href="${canonical}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="TTT — Taakka · Totuus · Teko">
<meta property="og:locale" content="fi_FI">
<meta property="og:url" content="${canonical}">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">${imageMeta}
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${description}">
<meta name="robots" content="index,follow">
<meta name="theme-color" content="#f4f0e7">
<script>location.replace(${JSON.stringify(target)});</script>
</head>
<body>
<p><a href="${target}">Avaa artikkeli: ${title}</a></p>
</body>
</html>`;

  const file = path.join(OUT_DIR, `${slug}.html`);
  fs.writeFileSync(file, html, 'utf8');
  console.log(`generated kirjoitukset/${slug}.html`);
}
