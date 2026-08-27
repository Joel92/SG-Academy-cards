(() => {
  const source = window.DEFAULT_SESSIONS || [];
  const sessionsKey = "sg-padel-academy-guide-v3";
  const metaKey = "sg-padel-academy-guide-meta-v3";
  const blocks = ["Control y espacio", "Inicio del punto", "Defensa y transición", "Juego aéreo", "Presión y recuperación", "Decisión y competición"];
  const phases = [
    { key:"warmup", label:"Calentamiento", time:12, cue:"Movimiento continuo, cooperación y muchas acciones con pelota." },
    { key:"technique", label:"Técnica", time:18, cue:"Una idea clara: calidad y control antes que velocidad." },
    { key:"live", label:"Bola viva", time:25, cue:"Mantener el objetivo técnico, pero decidir con oposición real." },
    { key:"match", label:"Partido", time:20, cue:"La condición orienta el juego; después, el punto continúa libre." }
  ];
  let sessions = loadSessions();
  let currentIndex = 0;
  let editing = false;
  let toastTimer;

  const $ = selector => document.querySelector(selector);
  const els = {
    sidebar:$("#sidebar"), backdrop:$("#sidebarBackdrop"), list:$("#sessionList"), search:$("#sessionSearch"), menu:$("#menuBtn"),
    number:$("#sessionNumber"), block:$("#sessionBlock"), title:$("#sessionTitle"), objective:$("#sessionObjective"), grid:$("#guideGrid"),
    category:$("#categoryField"), level:$("#levelField"), adaptation:$("#adaptationText"), notes:$("#notesField"),
    edit:$("#editBtn"), save:$("#saveBtn"), print:$("#printBtn"), prev:$("#prevBtn"), next:$("#nextBtn"), count:$("#navCount"), toast:$("#toast")
  };

  function loadSessions() {
    try {
      const stored = JSON.parse(localStorage.getItem(sessionsKey));
      if (Array.isArray(stored) && stored.length === source.length && stored[0]?.guides) return stored;
    } catch (_) {}
    return source.map((session, index) => ({ ...structuredClone(session), block:blocks[Math.min(5, Math.floor(index / 4))], guides:buildGuides(session) }));
  }

  function buildGuides(session) {
    return phases.map((phase, index) => ({
      label:phase.label,
      text:session[phase.key],
      cue:index === 1 ? technicalCue(session.mode) : index === 2 ? liveCue(session.target) : index === 3 ? "Contar el marcador y valorar la decisión, no solo quién gana el punto." : phase.cue
    }));
  }

  function technicalCue(mode) {
    const cues = {
      fondo:"Preparación corta · contacto delante · recuperar posición",
      saque:"Rutina estable · dirección profunda · primer paso hacia la red",
      resto:"Leer el saque · gesto compacto · recuperar con la pareja",
      red:"Pala delante · ajustar con los pies · cerrar espacios",
      pared:"Dar espacio al rebote · esperar · salir equilibrado",
      aereo:"Ajustar antes de armar · contacto alto · recuperar la red",
      transicion:"Golpear estable · avanzar juntos · proteger el centro"
    };
    return cues[mode] || "Equilibrio · dirección · recuperación";
  }

  function liveCue(target) {
    const cues = { globo:"El globo sirve para ganar tiempo y recuperar la red.", pies:"Avanzar únicamente cuando la bola queda por debajo de la red.", esquina:"Leer el rebote antes de elegir dirección.", avance:"Subir como pareja y proteger el espacio central.", remate:"Finalizar solo cuando la pelota permite mantener el equilibrio.", decision:"Elegir la solución según la calidad de la pelota." };
    return cues[target] || "Usar el golpe trabajado para crear ventaja en la siguiente acción.";
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
    els.list.innerHTML = sessions.map((session, index) => {
      if (needle && !`${session.id} ${session.title} ${session.objective}`.toLowerCase().includes(needle)) return "";
      return `<button class="session-button ${index === currentIndex ? "active" : ""}" data-index="${index}" type="button"><span>${pad(session.id)}</span><b>${escapeHtml(session.title)}</b></button>`;
    }).join("");
    els.list.querySelectorAll("button").forEach(button => button.addEventListener("click", () => selectSession(Number(button.dataset.index))));
  }

  function selectSession(index) {
    commitCurrent(false);
    currentIndex = Math.max(0, Math.min(sessions.length - 1, index));
    renderSession();
    renderList(els.search.value);
    closeSidebar();
    window.scrollTo({ top:0, behavior:"smooth" });
  }

  function renderSession() {
    const session = sessions[currentIndex];
    const meta = loadMeta(session.id);
    els.number.textContent = pad(session.id);
    els.block.textContent = `Bloque ${Math.floor(currentIndex / 4) + 1} · ${session.block}`;
    els.title.textContent = session.title;
    els.objective.textContent = session.objective;
    els.category.value = meta.category || "Alevín";
    els.level.value = meta.level || "Intermedio";
    els.notes.value = meta.notes || "";
    els.grid.innerHTML = session.guides.map((guide, index) => phaseCard(session, guide, index)).join("");
    setEditing(editing);
    renderAdaptation();
    els.prev.disabled = currentIndex === 0;
    els.next.disabled = currentIndex === sessions.length - 1;
    els.count.textContent = `${pad(session.id)} / ${sessions.length}`;
    document.title = `${pad(session.id)} · ${session.title} · SG Padel Academy`;
  }

  function phaseCard(session, guide, index) {
    return `<article class="phase-card" data-phase="${index}">
      <div class="phase-visual"><div class="phase-head"><span>0${index + 1}</span><b>${phases[index].time} min</b></div><h2 data-field="label" data-editable>${escapeHtml(guide.label)}</h2>${courtSvg(session, index)}</div>
      <div class="phase-body"><h3>Desarrollo</h3><p class="main-copy" data-field="text" data-editable>${escapeHtml(guide.text)}</p><div class="cue"><b>Consigna clave</b><p data-field="cue" data-editable>${escapeHtml(guide.cue)}</p></div></div>
    </article>`;
  }

  function courtSvg(session, phase) {
    const top = phase >= 2;
    const target = targetPosition(session.target, phase);
    const start = top ? [28,76] : phase === 1 ? [30,76] : [34,70];
    const players = phase === 1
      ? `<circle class="player-dot player-home" cx="30" cy="76" r="4"/><text class="player-label" x="30" y="76">J</text><circle class="player-dot player-coach" cx="70" cy="24" r="4"/><text class="player-label" x="70" y="24">E</text>`
      : `<circle class="player-dot player-home" cx="28" cy="76" r="4"/><text class="player-label" x="28" y="76">J</text><circle class="player-dot player-home" cx="72" cy="76" r="4"/><text class="player-label" x="72" y="76">J</text><circle class="player-dot player-rival" cx="28" cy="24" r="4"/><text class="player-label" x="28" y="24">R</text><circle class="player-dot player-rival" cx="72" cy="24" r="4"/><text class="player-label" x="72" y="24">R</text>`;
    return `<svg class="court-mini" viewBox="0 0 100 100" role="img" aria-label="Esquema orientativo de la tarea"><rect class="court-wall" x="8" y="4" width="84" height="92" rx="1"/><rect class="court-fill" x="11" y="7" width="78" height="86"/><path class="court-line" d="M11 50h78M11 37h78M11 63h78M50 37v26"/><path class="net-line" d="M8 50h84"/><rect class="target-zone" x="${target[0]-7}" y="${target[1]-5}" width="14" height="10" rx="2"/><path class="path-line" d="M${start[0]} ${start[1]} Q50 46 ${target[0]} ${target[1]}"/>${players}</svg>`;
  }

  function targetPosition(target, phase) {
    if (phase === 0) return [66,27];
    const map = { cruzado:[72,20], paralelo:[30,20], globo:[72,13], esquina:[78,13], pies:[30,42], bajada:[48,40], volea:[35,28], bloqueo:[52,40], avance:[36,42], defensa:[72,23], vibora:[78,18], remate:[52,13], decision:[66,22], evaluacion:[67,22], bandeja:[72,18] };
    return map[target] || [68,22];
  }

  function renderAdaptation() {
    const category = els.category.value;
    const level = els.level.value;
    const age = {
      Prebenjamín:"Usa media pista, pelota lenta y explicaciones de una sola frase.",
      Benjamín:"Mantén zonas amplias, retos cortos y rotaciones frecuentes.",
      Alevín:"Trabaja en pista completa y ofrece dos soluciones posibles.",
      Infantil:"Añade oposición real y pide que expliquen la decisión.",
      Cadete:"Exige coordinación de pareja y una intención táctica clara.",
      Juvenil:"Plantea contexto competitivo y deja que ajusten el plan."
    }[category];
    const levelText = { Iniciación:"Inicia con bola fácil y prioriza continuidad.", Intermedio:"Libera el punto después de tres contactos.", Alto:"Varía trayectorias y marcador para aumentar la presión." }[level];
    els.adaptation.textContent = `${age} ${levelText}`;
  }

  function setEditing(value) {
    editing = value;
    document.body.classList.toggle("editing", value);
    els.edit.setAttribute("aria-pressed", String(value));
    els.edit.querySelector("span").textContent = value ? "Terminar" : "Editar";
    document.querySelectorAll("[data-editable]").forEach(node => node.contentEditable = value ? "true" : "false");
  }

  function commitCurrent(showToast = true) {
    const session = sessions[currentIndex];
    session.title = els.title.textContent.trim();
    session.objective = els.objective.textContent.trim();
    els.grid.querySelectorAll(".phase-card").forEach((card, index) => {
      session.guides[index].label = card.querySelector('[data-field="label"]').textContent.trim();
      session.guides[index].text = card.querySelector('[data-field="text"]').textContent.trim();
      session.guides[index].cue = card.querySelector('[data-field="cue"]').textContent.trim();
    });
    saveMeta(session.id, { category:els.category.value, level:els.level.value, notes:els.notes.value });
    localStorage.setItem(sessionsKey, JSON.stringify(sessions));
    if (showToast) toast("Cambios guardados en este dispositivo");
  }

  function openSidebar() { els.sidebar.classList.add("open"); els.backdrop.classList.add("show"); }
  function closeSidebar() { els.sidebar.classList.remove("open"); els.backdrop.classList.remove("show"); }
  function toast(message) { clearTimeout(toastTimer); els.toast.textContent = message; els.toast.classList.add("show"); toastTimer = setTimeout(() => els.toast.classList.remove("show"), 2200); }
  function pad(value) { return String(value).padStart(2, "0"); }
  function escapeHtml(value) { const div = document.createElement("div"); div.textContent = value || ""; return div.innerHTML; }

  els.search.addEventListener("input", event => renderList(event.target.value));
  els.menu.addEventListener("click", openSidebar); els.backdrop.addEventListener("click", closeSidebar);
  els.category.addEventListener("change", () => { renderAdaptation(); commitCurrent(false); });
  els.level.addEventListener("change", () => { renderAdaptation(); commitCurrent(false); });
  els.edit.addEventListener("click", () => setEditing(!editing));
  els.save.addEventListener("click", () => { commitCurrent(); setEditing(false); renderList(els.search.value); });
  els.print.addEventListener("click", () => { commitCurrent(false); window.print(); });
  els.prev.addEventListener("click", () => selectSession(currentIndex - 1));
  els.next.addEventListener("click", () => selectSession(currentIndex + 1));
  window.addEventListener("beforeunload", () => commitCurrent(false));

  renderList(); renderSession();
})();
