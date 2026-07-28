/* Sovelluskuori: näkymien laiska lataus, reititys ja teeman hallinta. */
(function(){
  "use strict";

  var THEME_KEY = "murros-theme";

  var VIEWS = [
    { id: "rengas",   file: "rengas.html",   title: "Murrosrengas",
      blurb: "Nelikenttä: aihepiirit vyöhykkeinä, vuosikymmenet renkaana." },
    { id: "verkko",   file: "verkko.html",   title: "Vaikutusverkko",
      blurb: "Solmut ja vaikutusketjut — raahaa, suodata, seuraa polkua." },
    { id: "matriisi", file: "matriisi.html", title: "Rakennematriisi",
      blurb: "Aikajana, matriisi ja pitkät kaaret luettavana koosteena." }
  ];

  var stage    = document.getElementById("stage");
  var loader   = document.getElementById("loader");
  var blurbEl  = document.getElementById("viewBlurb");
  var themeBtn = document.getElementById("themeBtn");
  var fsBtn    = document.getElementById("fsBtn");
  var tabs     = Array.prototype.slice.call(document.querySelectorAll(".tab"));
  var frames   = {};
  var current  = null;

  /* ---------- teema ---------- */

  function storedTheme(){
    try { return localStorage.getItem(THEME_KEY); } catch (e) { return null; }
  }

  function setTheme(theme, persist){
    document.documentElement.setAttribute("data-theme", theme);
    if (persist) { try { localStorage.setItem(THEME_KEY, theme); } catch (e) {} }
    Object.keys(frames).forEach(function(id){
      var win = frames[id].contentWindow;
      if (win) win.postMessage({ type: "murros:theme", theme: theme }, "*");
    });
  }

  var prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)");
  setTheme(storedTheme() || (prefersDark && prefersDark.matches ? "dark" : "light"), false);

  themeBtn.addEventListener("click", function(){
    var next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    setTheme(next, true);
  });

  if (prefersDark && prefersDark.addEventListener) {
    prefersDark.addEventListener("change", function(ev){
      if (!storedTheme()) setTheme(ev.matches ? "dark" : "light", false);
    });
  }

  /* ---------- näkymät ---------- */

  function ensureFrame(view){
    if (frames[view.id]) return frames[view.id];
    var frame = document.createElement("iframe");
    frame.className = "frame";
    frame.id = "frame-" + view.id;
    frame.title = view.title;
    frame.src = view.file;
    frame.setAttribute("loading", "eager");
    frame.addEventListener("load", function(){
      var win = frame.contentWindow;
      if (win) win.postMessage({ type: "murros:theme", theme: document.documentElement.getAttribute("data-theme") }, "*");
      if (current === view.id) loader.hidden = true;
    });
    stage.appendChild(frame);
    frames[view.id] = frame;
    return frame;
  }

  function show(id, pushHash){
    var view = VIEWS.filter(function(v){ return v.id === id; })[0] || VIEWS[0];
    if (current === view.id) return;
    current = view.id;

    var frame = ensureFrame(view);
    loader.hidden = !!frame.dataset.loaded;

    Object.keys(frames).forEach(function(key){
      frames[key].classList.toggle("active", key === view.id);
    });
    tabs.forEach(function(tab){
      tab.setAttribute("aria-selected", String(tab.dataset.view === view.id));
    });

    blurbEl.textContent = view.blurb;
    document.title = view.title + " · Murrosatlas";
    frame.dataset.loaded = "1";

    if (pushHash) location.hash = "#" + view.id;
    // Näkymä saa näppäimistön heti, jotta sen omat oikotiet toimivat.
    if (frame.contentWindow) frame.contentWindow.focus();
  }

  tabs.forEach(function(tab){
    tab.addEventListener("click", function(){ show(tab.dataset.view, true); });
  });

  window.addEventListener("hashchange", function(){
    show((location.hash || "").replace(/^#\/?/, "") || VIEWS[0].id, false);
  });

  window.addEventListener("message", function(ev){
    var d = ev.data;
    if (!d) return;
    if (d.type === "murros:key") selectByIndex(d.key);
  });

  function selectByIndex(key){
    var view = VIEWS[parseInt(key, 10) - 1];
    if (view) show(view.id, true);
  }

  document.addEventListener("keydown", function(ev){
    if (ev.metaKey || ev.ctrlKey || ev.altKey) return;
    var tag = ev.target && ev.target.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
    if (["1","2","3"].indexOf(ev.key) !== -1) selectByIndex(ev.key);
  });

  fsBtn.addEventListener("click", function(){
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen();
  });

  show((location.hash || "").replace(/^#\/?/, "") || VIEWS[0].id, false);

  /* Esilataa muut näkymät, kun ensimmäinen on valmis. */
  window.addEventListener("load", function(){
    setTimeout(function(){ VIEWS.forEach(ensureFrame); }, 1200);
  });
})();
