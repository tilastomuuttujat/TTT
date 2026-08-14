import "./atlas-stat-card.js";
import "./atlas-article.js";
import "./atlas-topic.js";
import "./atlas-timeline.js";
import "./atlas-network.js";
import "./atlas-matrix.js";
import "./atlas-content-browser.js";
import "./atlas-society-network.js";

export const ATLAS_COMPONENTS = [
  "atlas-stat-card",
  "atlas-article",
  "atlas-topic",
  "atlas-timeline",
  "atlas-network",
  "atlas-matrix",
  "atlas-content-browser",
  "atlas-society-network",
];

const EMBED_SELECTOR = ".atlas-stage";

function makeFrameless(root = document) {
  root.querySelectorAll?.(`${EMBED_SELECTOR} ${ATLAS_COMPONENTS.join(`, ${EMBED_SELECTOR} `)}`)
    .forEach((element) => {
      if (!element.hasAttribute("appearance")) {
        element.setAttribute("appearance", "frameless");
      }
    });
}

function installEmbeddedStyles() {
  if (document.getElementById("atlas-ui-embedded-styles")) return;
  const style = document.createElement("style");
  style.id = "atlas-ui-embedded-styles";
  style.textContent = `
    .atlas-lab .atlas-shell {
      border:0 !important;
      border-radius:0 !important;
      background:transparent !important;
      box-shadow:none !important;
      overflow:visible !important;
    }
    .atlas-lab .atlas-toolbar {
      padding-left:0 !important;
      padding-right:0 !important;
      border-left:0 !important;
      border-right:0 !important;
      background:transparent !important;
    }
    .atlas-lab .atlas-stage {
      padding-left:0 !important;
      padding-right:0 !important;
      border:0 !important;
      background:transparent !important;
      min-height:0 !important;
    }
    .atlas-lab .atlas-status {
      margin-left:0 !important;
      margin-right:0 !important;
    }
    .atlas-lab .atlas-foot {
      border-left:0 !important;
      border-right:0 !important;
      background:transparent !important;
    }
  `;
  document.head.appendChild(style);
}

function enhanceEmbeddedAtlas() {
  if (!document.querySelector(EMBED_SELECTOR)) return;
  installEmbeddedStyles();
  makeFrameless(document);

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (!(node instanceof Element)) continue;
        if (node.matches?.(EMBED_SELECTOR) || node.closest?.(EMBED_SELECTOR) || node.querySelector?.(EMBED_SELECTOR)) {
          makeFrameless(document);
          return;
        }
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", enhanceEmbeddedAtlas, { once: true });
} else {
  enhanceEmbeddedAtlas();
}
