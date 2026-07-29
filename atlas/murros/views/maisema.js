export const title = 'Maisema 3D';

let frame = null;
let cleanupSelectionFx = null;

function installSelectionFx() {
  cleanupSelectionFx?.();
  cleanupSelectionFx = null;

  const doc = frame?.contentDocument;
  const win = frame?.contentWindow;
  const wrap = doc?.getElementById('canvasWrap');
  const tip = doc?.getElementById('tip');
  const canvas = wrap?.querySelector('canvas');
  if (!doc || !win || !wrap || !canvas) return;

  const style = doc.createElement('style');
  style.dataset.murrosSelectionFx = 'true';
  style.textContent = `
    .murros-node-fx{
      position:absolute;z-index:5;width:12px;height:12px;border-radius:50%;
      transform:translate(-50%,-50%);pointer-events:none;isolation:isolate;
    }
    .murros-node-fx::before,
    .murros-node-fx::after{
      content:"";position:absolute;inset:50%;border:1px solid rgba(255,209,102,.88);
      border-radius:50%;box-shadow:0 0 18px rgba(255,209,102,.45);
      transform:translate(-50%,-50%) scale(.25);opacity:0;
      animation:murros-node-ripple 720ms cubic-bezier(.16,.72,.24,1) forwards;
    }
    .murros-node-fx::after{
      border-color:rgba(127,215,255,.68);animation-delay:110ms;
      animation-duration:860ms;
    }
    .murros-node-fx > i{
      position:absolute;inset:0;border-radius:50%;background:#fff4c8;
      box-shadow:0 0 8px #fff,0 0 22px rgba(255,209,102,.95),0 0 42px rgba(127,215,255,.5);
      animation:murros-node-pop 520ms cubic-bezier(.18,.82,.24,1) forwards;
    }
    @keyframes murros-node-ripple{
      0%{width:12px;height:12px;opacity:.95}
      100%{width:86px;height:86px;opacity:0}
    }
    @keyframes murros-node-pop{
      0%{transform:scale(.25);opacity:0}
      32%{transform:scale(1.7);opacity:1}
      100%{transform:scale(.55);opacity:0}
    }
    @media(prefers-reduced-motion:reduce){
      .murros-node-fx::before,.murros-node-fx::after,.murros-node-fx>i{animation-duration:1ms!important}
    }
  `;
  doc.head.appendChild(style);

  const onClick = event => {
    if (!tip?.classList.contains('on')) return;

    const bounds = wrap.getBoundingClientRect();
    const fx = doc.createElement('span');
    fx.className = 'murros-node-fx';
    fx.style.left = `${event.clientX - bounds.left}px`;
    fx.style.top = `${event.clientY - bounds.top}px`;
    fx.innerHTML = '<i></i>';
    wrap.appendChild(fx);
    win.setTimeout(() => fx.remove(), 1050);
  };

  canvas.addEventListener('click', onClick, true);
  cleanupSelectionFx = () => {
    canvas.removeEventListener('click', onClick, true);
    style.remove();
    doc.querySelectorAll('.murros-node-fx').forEach(node => node.remove());
  };
}

async function buildLandscapeDocument() {
  const htmlUrl = new URL('../../maisema.html', import.meta.url);
  const response = await fetch(htmlUrl, { cache: 'no-store' });
  if (!response.ok) throw new Error(`maisema.html: ${response.status}`);

  const baseUrl = new URL('../../', import.meta.url).href;
  return (await response.text())
    .replace('<head>', `<head>\n<base href="${baseUrl}">`)
    .replace(
      '<script type="module" src="./maisema-app.js"></script>',
      '<script type="module" src="./maisema-overview-bootstrap.js"></script>'
    );
}

export async function mount(root, context = {}) {
  const view = document.createElement('section');
  view.className = 'modular-view maisema-view';
  view.dataset.source = '../maisema.html';
  view.setAttribute('aria-label', 'Kolmiulotteinen historiamaisema');

  frame = document.createElement('iframe');
  frame.className = 'maisema-frame';
  frame.title = 'Maisema 3D · Suomen rakennemuutosten atlas';
  frame.loading = 'eager';
  frame.allow = 'fullscreen';
  frame.addEventListener('load', installSelectionFx, { once: true });
  frame.srcdoc = await buildLandscapeDocument();

  view.appendChild(frame);
  root.replaceChildren(view);
  setTheme(context.theme);
  return view;
}

export function unmount(root) {
  cleanupSelectionFx?.();
  cleanupSelectionFx = null;

  if (frame) {
    frame.src = 'about:blank';
    frame.remove();
    frame = null;
  }
  root.replaceChildren();
}

export function setTheme(theme) {
  if (!frame) return;
  frame.style.colorScheme = theme === 'light' ? 'light' : 'dark';
  frame.contentWindow?.postMessage({ type: 'murros:theme', theme }, '*');
}
