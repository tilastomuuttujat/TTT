/* Yhdistää yksittäisen näkymän sovelluskuoreen: teeman synkronointi
   ja näppäinkomentojen välitys. Toimii myös ilman kuorta. */
(function(){
  var KEY = "murros-theme";

  function apply(theme){
    document.documentElement.setAttribute("data-theme", theme === "dark" ? "dark" : "light");
  }

  var stored;
  try { stored = localStorage.getItem(KEY); } catch (e) { stored = null; }
  apply(stored || (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));

  window.addEventListener("message", function(ev){
    var d = ev.data;
    if (d && d.type === "murros:theme") apply(d.theme);
  });

  // Näppäimet, jotka kuuluvat kuorelle (näkymän vaihto), välitetään ylöspäin.
  window.addEventListener("keydown", function(ev){
    if (ev.metaKey || ev.ctrlKey || ev.altKey) return;
    var t = ev.target;
    var tag = t && t.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (t && t.isContentEditable)) return;
    if (["1","2","3"].indexOf(ev.key) === -1) return;
    if (window.parent !== window) window.parent.postMessage({ type: "murros:key", key: ev.key }, "*");
  });

  if (window.parent !== window) {
    window.parent.postMessage({ type: "murros:ready" }, "*");
  }
})();
