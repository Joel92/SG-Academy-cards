(() => {
  const defaults = window.DEFAULT_SESSIONS || [];
  const storageKey = "sg-padel-academy-sessions-v1";
  const metaKey = "sg-padel-academy-meta-v1";
  let sessions = loadSessions();
  let currentIndex = 0;
  let editing = false;
  let toastTimer;

  const $ = (selector) => document.querySelector(selector);
  const els = {
    list: $("#sessionList"), search: $("#sessionSearch"), sheet: $("#trainingSheet"),
    number: $("#sessionNumber"), title: $("#sessionTitle"), objective: $("#sessionObjective"),
    warmup: $("#warmupText"), technique: $("#techniqueText"), live: $("#liveText"), match: $("#matchText"),
    levels: $("#levelAdjustments"), ages: $("#ageAdjustments"), techCourt: $("#techCourt"), liveCourt: $("#liveCourt"),
    category: $("#categoryField"), level: $("#levelField"), date: $("#dateField"), coach: $("#coachField"), notes: $("#notesField"),
    edit: $("#editBtn"), save: $("#saveBtn"), print: $("#printBtn"), prev: $("#prevBtn"), next: $("#nextBtn"),
    count: $("#navCount"), crumb: $("#crumbTitle"), footerTitle: $("#sheetFooterTitle"), toast: $("#toast"),
    menu: $("#menuBtn"), sidebar: $(".sidebar"), export: $("#exportBtn"), import: $("#importInput")
  };

  const levelCopy = "Iniciación: alimentación previsible, zona grande y prioridad a la continuidad. · Intermedio: bola viva desde el tercer contacto y elección entre dos soluciones. · Alto: inicio bajo presión, oponente activo y bonus solo si la decisión es adecuada.";
  const ageCopy = "Prebenjamín: minipista, alimentación manual y reto cooperativo. · Benjamín: media pista y partidos a 7 puntos. · Alevín: pista completa y dos opciones de decisión. · Infantil: oposición real y marcador corto. · Cadete: presión temporal y objetivo táctico. · Juvenil/júnior: patrón libre, lectura rival y autoevaluación.";

  function loadSessions() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey));
      if (Array.isArray(saved) && saved.length === defaults.length) return saved;
    } catch (_) {}
    return structuredClone(defaults);
  }

  function loadMeta(id) {
    try { return JSON.parse(localStorage.getItem(metaKey))?.[id] || {}; } catch (_) { return {}; }
  }

  function saveMeta(id, value) {
    let all = {};
    try { all = JSON.parse(localStorage.getItem(metaKey)) || {}; } catch (_) {}
    all[id] = value;
    localStorage.setItem(metaKey, JSON.stringify(all));
  }

  function renderList(filter = "") {
    const needle = filter.trim().toLowerCase();
    els.list.innerHTML = sessions.map((s, i) => {
      if (needle && !`${s.id} ${s.title} ${s.objective}`.toLowerCase().includes(needle)) return "";
      return `<button class="session-button ${i === currentIndex ? "active" : ""}" data-index="${i}" type="button"><span>${String(s.id).padStart(2, "0")}</span><b>${escapeHtml(s.title)}</b></button>`;
    }).join("");
    els.list.querySelectorAll("button").forEach(btn => btn.addEventListener("click", () => selectSession(Number(btn.dataset.index))));
  }

  function selectSession(index) {
    commitCurrent(false);
    currentIndex = Math.max(0, Math.min(sessions.length - 1, index));
    renderSession();
    renderList(els.search.value);
    els.sidebar.classList.remove("open");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function renderSession() {
    const s = sessions[currentIndex];
    const meta = loadMeta(s.id);
    els.number.textContent = String(s.id).padStart(2, "0");
    els.title.textContent = s.title;
    els.objective.textContent = s.objective;
    els.warmup.textContent = s.warmup;
    els.technique.textContent = s.technique;
    els.live.textContent = s.live;
    els.match.textContent = s.match;
    els.levels.textContent = s.levels || levelCopy;
    els.ages.textContent = s.ages || ageCopy;
    els.category.value = meta.category || "Alevín";
    els.level.value = meta.level || "Intermedio";
    els.date.value = meta.date || "";
    els.coach.value = meta.coach || "";
    els.notes.value = meta.notes || "";
    els.crumb.textContent = `Sesión ${String(s.id).padStart(2, "0")} · ${s.title}`;
    els.footerTitle.textContent = `${String(s.id).padStart(2, "0")} / ${s.title.toUpperCase()}`;
    els.count.textContent = `${String(s.id).padStart(2, "0")} / ${sessions.length}`;
    els.prev.disabled = currentIndex === 0;
    els.next.disabled = currentIndex === sessions.length - 1;
    els.techCourt.innerHTML = courtSvg(s.mode, s.target, false);
    els.liveCourt.innerHTML = courtSvg(s.mode, s.target, true);
    document.title = `${String(s.id).padStart(2, "0")} · ${s.title} · SG Padel Academy`;
  }

  function commitCurrent(notify = true) {
    const s = sessions[currentIndex];
    if (!s) return;
    s.title = els.title.textContent.trim();
    s.objective = els.objective.textContent.trim();
    s.warmup = els.warmup.textContent.trim();
    s.technique = els.technique.textContent.trim();
    s.live = els.live.textContent.trim();
    s.match = els.match.textContent.trim();
    s.levels = els.levels.textContent.trim();
    s.ages = els.ages.textContent.trim();
    localStorage.setItem(storageKey, JSON.stringify(sessions));
    saveMeta(s.id, { category: els.category.value, level: els.level.value, date: els.date.value, coach: els.coach.value.trim(), notes: els.notes.value });
    renderList(els.search.value);
    if (notify) showToast("Cambios guardados en este navegador");
  }

  function toggleEditing() {
    editing = !editing;
    document.body.classList.toggle("editing", editing);
    document.querySelectorAll("[data-editable]").forEach(el => el.contentEditable = editing ? "true" : "false");
    els.edit.setAttribute("aria-pressed", String(editing));
    els.edit.querySelector("span").textContent = editing ? "Terminar" : "Editar";
    if (editing) { els.title.focus(); showToast("Edición activada: pulsa sobre cualquier texto"); }
    else commitCurrent(false);
  }

  function courtSvg(mode, target, live) {
    const baseY = ["red", "aereo"].includes(mode) ? 62 : mode === "transicion" ? 78 : 91;
    const startX = mode === "resto" ? 70 : 34;
    const targetMap = { cruzado:[77,13], globo:[77,13], esquina:[82,10], paralelo:[34,16], pies:[36,39], bajada:[40,29], volea:[43,42], bloqueo:[47,42], avance:[42,43] };
    const [tx, ty] = targetMap[target] || [59,18];
    const players = live
      ? `<g class="players"><circle cx="31" cy="${baseY}" r="3.6"/><circle cx="69" cy="${baseY}" r="3.6"/><circle class="rival" cx="31" cy="16" r="3.6"/><circle class="rival" cx="69" cy="16" r="3.6"/></g>`
      : `<g class="players"><circle cx="${startX}" cy="${baseY}" r="3.6"/><circle class="rival" cx="68" cy="17" r="3.6"/></g>`;
    return `<svg viewBox="0 0 100 105" role="img" aria-label="Diagrama de pista">
      <defs><marker id="arrow-${live ? "l" : "t"}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0 10 5 0 10Z" fill="#f2d34f"/></marker></defs>
      <rect class="court-surface" x="5" y="4" width="90" height="97" rx="1"/>
      <path class="court-lines" d="M5 52.5h90M5 31h90M5 74h90M50 4v27M50 74v27"/>
      <path class="net" d="M5 52.5h90"/>
      <path class="trajectory" marker-end="url(#arrow-${live ? "l" : "t"})" d="M${startX} ${baseY} Q${(startX+tx)/2} ${(baseY+ty)/2-8} ${tx} ${ty}"/>
      ${players}<circle class="ball" cx="${tx}" cy="${ty}" r="2.4"/>
      <text x="7" y="99">J jugador${live ? "es · R rivales" : " · A entrenador"}</text>
    </svg>`;
  }

  function exportData() {
    commitCurrent(false);
    const meta = JSON.parse(localStorage.getItem(metaKey) || "{}");
    const blob = new Blob([JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), sessions, meta }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement("a"), { href: url, download: "SG_Padel_Academy_programacion.json" });
    a.click(); URL.revokeObjectURL(url);
    showToast("Copia exportada");
  }

  function importData(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!Array.isArray(data.sessions) || data.sessions.length !== defaults.length) throw new Error();
        sessions = data.sessions;
        localStorage.setItem(storageKey, JSON.stringify(sessions));
        localStorage.setItem(metaKey, JSON.stringify(data.meta || {}));
        currentIndex = 0; renderSession(); renderList(); showToast("Programación importada");
      } catch (_) { showToast("El archivo no contiene una programación válida"); }
      els.import.value = "";
    };
    reader.readAsText(file);
  }

  function showToast(message) {
    clearTimeout(toastTimer); els.toast.textContent = message; els.toast.classList.add("show");
    toastTimer = setTimeout(() => els.toast.classList.remove("show"), 2400);
  }

  function escapeHtml(value) { return value.replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c])); }

  els.search.addEventListener("input", e => renderList(e.target.value));
  els.edit.addEventListener("click", toggleEditing);
  els.save.addEventListener("click", () => commitCurrent(true));
  els.print.addEventListener("click", () => { commitCurrent(false); window.print(); });
  els.prev.addEventListener("click", () => selectSession(currentIndex - 1));
  els.next.addEventListener("click", () => selectSession(currentIndex + 1));
  els.menu.addEventListener("click", () => els.sidebar.classList.toggle("open"));
  els.export.addEventListener("click", exportData);
  els.import.addEventListener("change", e => e.target.files[0] && importData(e.target.files[0]));
  [els.category, els.level, els.date, els.coach, els.notes].forEach(el => el.addEventListener("change", () => commitCurrent(false)));
  window.addEventListener("beforeunload", () => commitCurrent(false));

  renderList(); renderSession();
})();
