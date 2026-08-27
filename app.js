(() => {
  const source = window.DEFAULT_SESSIONS || [];
  const storageKey = "sg-padel-academy-builder-v2";
  const metaKey = "sg-padel-academy-builder-meta-v2";
  const phases = [
    { key: "warmup", label: "Activación jugada", short: "Activación", color: "#6da4ff" },
    { key: "technique", label: "Problema focal", short: "Tarea focal", color: "#ff7856" },
    { key: "live", label: "Aplicación en oposición", short: "Bola viva", color: "#36a878" },
    { key: "match", label: "Partido condicionado", short: "Partido", color: "#f1d33f" }
  ];
  const durationSets = {
    "Prebenjamín": [8, 12, 18, 17], "Benjamín": [10, 14, 20, 16], "Alevín": [10, 15, 25, 20],
    "Infantil": [10, 18, 27, 20], "Cadete": [12, 18, 30, 25], "Juvenil / júnior": [12, 20, 30, 28]
  };
  const blocks = ["Control y espacio", "Inicio y red", "Defensa y transición", "Golpe aéreo", "Presión y recuperación", "Decisión y competición"];

  let sessions = loadSessions();
  let currentIndex = 0;
  let activePhase = 0;
  let editing = false;
  let activeVariant = "base";
  let timerSeconds = 0;
  let timerInitial = 0;
  let timerId = null;
  let toastTimer = null;

  const $ = (s) => document.querySelector(s);
  const els = {
    sidebar: $("#sidebar"), list: $("#sessionList"), search: $("#sessionSearch"), menu: $("#menuBtn"),
    number: $("#sessionNumber"), block: $("#sessionBlock"), title: $("#sessionTitle"), objective: $("#sessionObjective"), total: $("#totalMinutes"),
    category: $("#categoryField"), level: $("#levelField"), players: $("#playersField"), courts: $("#courtsField"), coach: $("#coachField"),
    timeline: $("#phaseTimeline"), phaseIndex: $("#activePhaseIndex"), phaseLabel: $("#activePhaseLabel"), taskTitle: $("#activeTaskTitle"),
    court: $("#courtCanvas"), brief: $("#taskBrief"), organization: $("#taskOrganization"), start: $("#taskStart"),
    continuation: $("#taskContinue"), scoring: $("#taskScoring"), coaching: $("#taskCoaching"),
    versionLabel: $("#versionLabel"), versionText: $("#versionText"), easier: $("#easierText"), harder: $("#harderText"),
    easierBtn: $("#easierBtn"), harderBtn: $("#harderBtn"), notes: $("#notesField"),
    edit: $("#editBtn"), save: $("#saveBtn"), print: $("#printBtn"), export: $("#exportBtn"), import: $("#importInput"),
    prev: $("#prevBtn"), next: $("#nextBtn"), count: $("#navCount"), timer: $("#timerDisplay"), timerToggle: $("#timerToggle"), timerReset: $("#timerReset"),
    toast: $("#toast"), dragHint: $("#dragHint")
  };

  function loadSessions() {
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey));
      if (Array.isArray(stored) && stored.length === source.length && stored[0]?.tasks) return stored;
    } catch (_) {}
    return source.map(enrichSession);
  }

  function enrichSession(s, index) {
    return {
      ...structuredClone(s),
      block: blocks[Math.min(5, Math.floor(index / 4))],
      tasks: phases.map((phase, i) => buildTask(s, phase, i)),
      scenes: phases.map((_, i) => buildScene(s, i))
    };
  }

  function buildTask(s, phase, i) {
    const technical = technicalLanguage(s.mode);
    const common = {
      title: i === 0 ? activationTitle(s) : i === 1 ? s.title : i === 2 ? `Resolver ${s.title.toLowerCase()} en juego` : `Partido: ${s.title.toLowerCase()}`,
      brief: i === 0 ? `Activar percepción, movilidad y cooperación antes de centrar la sesión en ${s.title.toLowerCase()}.` : i === 1 ? s.objective : i === 2 ? `Reconocer cuándo utilizar ${s.title.toLowerCase()} con rivales activos.` : `Transferir la intención de la sesión a un partido con marcador.`,
      organization: organizationFor(s.mode, i),
      start: startFor(s.mode, i),
      continuation: i === 0 ? s.warmup : i === 1 ? s.technique : i === 2 ? s.live : "El punto continúa libre después de cumplir la condición de entrada.",
      scoring: i === 0 ? "Cada pareja intenta superar su mejor serie. Cambiar rol después de dos intentos." : i === 1 ? "1 punto por alcanzar la zona objetivo con control; serie de 6 bolas y rotación." : i === 2 ? scoringFor(s.target) : s.match,
      coaching: i === 0 ? "Pies activos · Observar antes de golpear · Mantener el juego vivo" : i === 1 ? technical : i === 2 ? `${technical} · Recuperar posición con la pareja` : "Plan antes del punto · Comunicación · Ajustar después de cada tres puntos",
      easier: easierFor(s.mode, i),
      harder: harderFor(s.mode, i)
    };
    return common;
  }

  function activationTitle(s) {
    if (["pared", "aereo"].includes(s.mode)) return "Leer trayectorias y ajustar";
    if (["red", "transicion"].includes(s.mode)) return "Pies activos cerca de la red";
    if (["saque", "resto"].includes(s.mode)) return "Reacción y primer desplazamiento";
    return "Cooperar y encontrar espacio";
  }

  function organizationFor(mode, phase) {
    if (phase === 0) return "4 jugadores en una pista, dos parejas. Trabajo continuo sin filas; una pelota por pareja.";
    if (phase === 1) {
      if (mode === "aereo") return "Dos jugadores en red, entrenador en el fondo con carro. Alternar globos y rotar cada 6 bolas.";
      if (mode === "pared") return "Dos jugadores en el fondo, uno en cada lado. Entrenador alimenta desde media pista; compañero recoge y observa.";
      if (mode === "red") return "Dos jugadores en red y entrenador desde el fondo. El resto rota detrás del alimentador cada 6 bolas.";
      if (mode === "saque" || mode === "resto") return "Una pareja saca/resta y otra espera en posición real. Cambiar lado cada 4 repeticiones.";
      return "Dos jugadores en fondo, entrenador en media pista con carro. Series cortas y rotación inmediata.";
    }
    if (phase === 2) return "2 contra 2 en pista completa. Una pareja asume el problema y la otra ofrece oposición real.";
    return "2 contra 2, saque reglamentario y marcador visible. Cambiar parejas o lados cada 7 puntos.";
  }

  function startFor(mode, phase) {
    if (phase === 0) return "Un jugador pone la pelota en juego con lanzamiento o golpe suave; no hay eliminación.";
    if (phase === 1) return mode === "saque" ? "Cada repetición comienza con saque real." : mode === "resto" ? "El entrenador o compañero saca a velocidad controlada." : mode === "aereo" ? "El entrenador lanza un globo con altura acordada." : mode === "pared" ? "El entrenador envía una bola que debe tocar pared antes del golpe." : "El entrenador alimenta una bola visible a la zona de trabajo.";
    if (phase === 2) return "El entrenador inicia desde fuera con una bola neutra; tras el primer contacto se juega sin detenerse.";
    return "Saque reglamentario. La condición de la sesión debe aparecer antes de que el punto quede completamente libre.";
  }

  function technicalLanguage(mode) {
    const map = {
      fondo: "Contacto delante · Preparación compacta · Recuperar detrás de la pelota", saque: "Rutina estable · Impacto por debajo de cintura · Primer paso hacia red",
      resto: "Leer trayectoria · Bloqueo corto · Neutralizar la primera volea", red: "Pala delante · Ajuste con los pies · Cerrar centro con la pareja",
      pared: "Dejar espacio a la pelota · Esperar el rebote · Salir equilibrado", aereo: "Ajustar antes de armar · Contacto alto-lateral · Recuperar la red",
      transicion: "Split-step antes del golpe · Bloqueo profundo · Avanzar como pareja"
    };
    return map[mode] || "Equilibrio · Dirección antes que potencia · Recuperar posición";
  }

  function scoringFor(target) {
    const map = {
      globo: "2 puntos si la pareja supera a los rivales y recupera la red; 1 si solo neutraliza.", pies: "2 puntos si la pelota baja obliga a volear por debajo de la red y permite avanzar.",
      esquina: "2 puntos por salir de la esquina y recuperar formación; no se bonifica un ganador aislado.", avance: "2 puntos si ambos jugadores conquistan la red sin abrir el centro.",
      decision: "Bonus únicamente cuando la solución elegida coincide con la calidad de la pelota.", remate: "2 puntos por finalizar una pelota realmente atacable; error forzado desde mala posición resta el bonus."
    };
    return map[target] || "2 puntos si la acción crea una ventaja para el siguiente golpe; 1 punto por ganar de cualquier otra manera.";
  }

  function easierFor(mode, phase) {
    if (phase === 3) return "Empezar cada punto con una bola cómoda y jugar a 7 puntos.";
    if (mode === "pared") return "Una sola pared, alimentación lenta y zona objetivo central.";
    if (mode === "aereo") return "Lanzamiento manual, sin oposición en la primera respuesta.";
    return phase === 2 ? "Rivales cooperan durante los tres primeros contactos." : "Acortar distancia y ampliar la zona objetivo.";
  }

  function harderFor(mode, phase) {
    if (phase === 3) return "Empezar en 30-30 y exigir un plan diferente cada tres puntos.";
    if (mode === "pared") return "Alternar pared simple y doble sin aviso previo.";
    if (mode === "aereo") return "Variar altura y profundidad para obligar a elegir golpe aéreo.";
    return phase === 2 ? "Rivales activos desde el primer contacto y bonus condicionado a la decisión." : "Reducir la zona y añadir desplazamiento previo al golpe.";
  }

  function buildScene(s, phase) {
    const baseY = ["red", "aereo"].includes(s.mode) ? 122 : s.mode === "transicion" ? 145 : 174;
    const target = targetPosition(s.target);
    const markers = [];
    if (phase === 1) {
      markers.push({ id: "j1", type: "home", label: "J", x: 32, y: baseY });
      markers.push({ id: "c1", type: "coach", label: "E", x: 68, y: 28 });
    } else {
      markers.push({ id: "j1", type: "home", label: "J1", x: 30, y: baseY });
      markers.push({ id: "j2", type: "home", label: "J2", x: 70, y: baseY });
      markers.push({ id: "r1", type: "rival", label: "R1", x: 30, y: 28 });
      markers.push({ id: "r2", type: "rival", label: "R2", x: 70, y: 28 });
    }
    markers.push({ id: "t1", type: "target", label: "●", x: target[0], y: target[1] });
    return { markers, from: "j1", target: "t1", move: phase > 1 ? { from: "j2", x: 66, y: s.target === "globo" ? 80 : 118 } : null };
  }

  function targetPosition(target) {
    const map = { cruzado:[78,18], paralelo:[31,18], globo:[77,12], esquina:[84,11], pies:[31,82], bajada:[48,54], volea:[42,77], bloqueo:[51,82], avance:[37,80], defensa:[74,24], vibora:[82,17], remate:[52,12], decision:[66,20], evaluacion:[68,21] };
    return map[target] || [70, 20];
  }

  function loadMeta(id) {
    try { return JSON.parse(localStorage.getItem(metaKey))?.[id] || {}; } catch (_) { return {}; }
  }

  function saveMeta(id, meta) {
    let all = {};
    try { all = JSON.parse(localStorage.getItem(metaKey)) || {}; } catch (_) {}
    all[id] = meta;
    localStorage.setItem(metaKey, JSON.stringify(all));
  }

  function renderList(filter = "") {
    const needle = filter.trim().toLowerCase();
    els.list.innerHTML = sessions.map((s, index) => {
      if (needle && !`${s.id} ${s.title} ${s.objective} ${s.block}`.toLowerCase().includes(needle)) return "";
      return `<button class="session-button ${index === currentIndex ? "active" : ""}" data-index="${index}" type="button"><span>${pad(s.id)}</span><b>${escapeHtml(s.title)}</b><small>${escapeHtml(s.block)}</small></button>`;
    }).join("");
    els.list.querySelectorAll("button").forEach(button => button.addEventListener("click", () => selectSession(Number(button.dataset.index))));
  }

  function selectSession(index) {
    commitCurrent(false);
    stopTimer();
    currentIndex = Math.max(0, Math.min(sessions.length - 1, index));
    activePhase = 0;
    activeVariant = "base";
    renderSession();
    renderList(els.search.value);
    els.sidebar.classList.remove("open");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function renderSession() {
    const s = sessions[currentIndex];
    const meta = loadMeta(s.id);
    els.number.textContent = pad(s.id);
    els.block.textContent = `Bloque · ${s.block}`;
    els.title.textContent = s.title;
    els.objective.textContent = s.objective;
    els.category.value = meta.category || "Alevín";
    els.level.value = meta.level || "Intermedio";
    els.players.value = meta.players || 4;
    els.courts.value = meta.courts || 1;
    els.coach.value = meta.coach || "";
    els.notes.value = meta.notes || "";
    els.prev.disabled = currentIndex === 0;
    els.next.disabled = currentIndex === sessions.length - 1;
    els.count.textContent = `${pad(s.id)} / ${sessions.length}`;
    renderTimeline();
    renderTask();
    document.title = `${pad(s.id)} · ${s.title} · SG Padel Academy`;
  }

  function durations() { return durationSets[els.category.value] || durationSets.Alevín; }

  function renderTimeline() {
    const times = durations();
    els.total.textContent = times.reduce((a, b) => a + b, 0);
    els.timeline.innerHTML = phases.map((phase, i) => `<button class="phase-step ${i === activePhase ? "active" : ""}" style="--phase-color:${phase.color};--progress:${i < activePhase ? "100%" : "0%"}" data-phase="${i}" data-index="${pad(i + 1)}" type="button"><b>${escapeHtml(sessions[currentIndex].tasks[i].title)}</b><span>${times[i]} min · ${phase.short}</span><i></i></button>`).join("");
    els.timeline.querySelectorAll("button").forEach(button => button.addEventListener("click", () => selectPhase(Number(button.dataset.phase))));
  }

  function selectPhase(index) {
    commitTask();
    stopTimer();
    activePhase = index;
    activeVariant = "base";
    renderTimeline();
    renderTask();
  }

  function renderTask() {
    const task = sessions[currentIndex].tasks[activePhase];
    els.phaseIndex.textContent = pad(activePhase + 1);
    els.phaseLabel.textContent = phases[activePhase].label;
    els.taskTitle.textContent = task.title;
    els.brief.textContent = task.brief;
    els.organization.textContent = task.organization;
    els.start.textContent = task.start;
    els.continuation.textContent = task.continuation;
    els.scoring.textContent = task.scoring;
    els.coaching.textContent = task.coaching;
    els.easier.textContent = task.easier;
    els.harder.textContent = task.harder;
    renderAppliedVersion();
    renderCourt();
    resetTimer();
  }

  function renderAppliedVersion() {
    const category = els.category.value;
    const level = els.level.value;
    const players = Number(els.players.value || 4);
    const courts = Number(els.courts.value || 1);
    const categoryText = {
      "Prebenjamín": "Media pista, pelota lenta, una consigna y retos de menos de 6 minutos.",
      "Benjamín": "Zonas amplias, explicación breve y marcador a 7 puntos.",
      "Alevín": "Pista completa, dos soluciones posibles y rotaciones frecuentes.",
      "Infantil": "Oposición real, lectura de espacios y marcador corto.",
      "Cadete": "Presión temporal, patrón de pareja y responsabilidad táctica.",
      "Juvenil / júnior": "Contexto competitivo, autonomía y ajuste del plan durante el partido."
    }[category];
    const levelText = {
      "Iniciación": "Alimentación visible; tres contactos cooperativos antes de liberar el punto.",
      "Intermedio": "Bola viva desde el tercer contacto y elección entre dos soluciones.",
      "Alto": "Rival activo desde el inicio; el bonus depende de la decisión, no del golpe ganador."
    }[level];
    const logistics = players > courts * 4 ? `Con ${players} jugadores y ${courts} pista(s), usar dos estaciones y rotar cada 4 minutos.` : `${players} jugadores en ${courts} pista(s): mantener todos activos, sin fila de espera.`;
    const variant = activeVariant === "easier" ? ` Variante: ${sessions[currentIndex].tasks[activePhase].easier}` : activeVariant === "harder" ? ` Variante: ${sessions[currentIndex].tasks[activePhase].harder}` : "";
    els.versionLabel.textContent = `${category} · ${level}`;
    els.versionText.textContent = `${categoryText} ${levelText} ${logistics}${variant}`;
    els.easierBtn.classList.toggle("active", activeVariant === "easier");
    els.harderBtn.classList.toggle("active", activeVariant === "harder");
  }

  function courtSvg(scene) {
    const from = scene.markers.find(m => m.id === scene.from);
    const target = scene.markers.find(m => m.id === scene.target);
    const markers = scene.markers.map(m => `<g class="marker ${m.type}" data-marker="${m.id}" transform="translate(${m.x} ${m.y})"><circle r="4.2"/><text>${m.label}</text></g>`).join("");
    const move = scene.move ? `<path id="movePath" class="move-path" marker-end="url(#moveArrow)" d="${movePath(scene)}"/>` : "";
    return `<svg id="interactiveCourt" viewBox="0 0 100 200" role="img" aria-label="Diagrama de pista de pádel editable">
      <defs>
        <marker id="ballArrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0 10 5 0 10Z" fill="#f1d33f"/></marker>
        <marker id="moveArrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto"><path d="M0 0 10 5 0 10Z" fill="rgba(255,255,255,.7)"/></marker>
      </defs>
      <rect class="wall-fill" x="3" y="2" width="94" height="196" rx="2"/>
      <rect class="court-fill" x="6" y="6" width="88" height="188"/>
      <path class="court-lines" d="M6 100h88M6 59h88M6 141h88M50 6v53M50 141v53"/>
      <path class="net-line" d="M5 100h90"/>
      <rect class="target-zone" x="${Math.max(7, target.x - 10)}" y="${Math.max(7, target.y - 8)}" width="20" height="16" rx="2"/>
      <path id="ballPath" class="ball-path" marker-end="url(#ballArrow)" d="${ballPath(from, target)}"/>
      ${move}${markers}
      <text class="court-caption" x="8" y="191">20 × 10 m · paredes de fondo y laterales</text>
    </svg>`;
  }

  function ballPath(from, target) {
    const midX = (from.x + target.x) / 2;
    const midY = (from.y + target.y) / 2 - 12;
    return `M${from.x} ${from.y} Q${midX} ${midY} ${target.x} ${target.y}`;
  }

  function movePath(scene) {
    const marker = scene.markers.find(m => m.id === scene.move.from);
    return `M${marker.x} ${marker.y} L${scene.move.x} ${scene.move.y}`;
  }

  function renderCourt() {
    const scene = sessions[currentIndex].scenes[activePhase];
    els.court.innerHTML = courtSvg(scene);
    els.dragHint.textContent = editing ? "Arrastra jugadores y objetivo para ajustar el ejercicio" : "Activa Editar para mover los elementos";
    attachCourtDrag(scene);
  }

  function attachCourtDrag(scene) {
    const svg = $("#interactiveCourt");
    if (!svg) return;
    let dragged = null;
    svg.addEventListener("pointerdown", event => {
      if (!editing) return;
      const markerEl = event.target.closest(".marker");
      if (!markerEl) return;
      dragged = scene.markers.find(m => m.id === markerEl.dataset.marker);
      svg.setPointerCapture(event.pointerId);
    });
    svg.addEventListener("pointermove", event => {
      if (!dragged) return;
      const point = svg.createSVGPoint(); point.x = event.clientX; point.y = event.clientY;
      const local = point.matrixTransform(svg.getScreenCTM().inverse());
      dragged.x = clamp(local.x, 7, 93); dragged.y = clamp(local.y, 7, 193);
      const markerEl = svg.querySelector(`[data-marker="${dragged.id}"]`);
      markerEl.setAttribute("transform", `translate(${dragged.x} ${dragged.y})`);
      updatePaths(svg, scene);
    });
    svg.addEventListener("pointerup", event => {
      if (!dragged) return;
      dragged = null; svg.releasePointerCapture(event.pointerId); saveSessions(false);
    });
  }

  function updatePaths(svg, scene) {
    const from = scene.markers.find(m => m.id === scene.from);
    const target = scene.markers.find(m => m.id === scene.target);
    svg.querySelector("#ballPath").setAttribute("d", ballPath(from, target));
    const zone = svg.querySelector(".target-zone");
    zone.setAttribute("x", Math.max(7, target.x - 10)); zone.setAttribute("y", Math.max(7, target.y - 8));
    if (scene.move) svg.querySelector("#movePath").setAttribute("d", movePath(scene));
  }

  function commitTask() {
    const task = sessions[currentIndex]?.tasks?.[activePhase];
    if (!task) return;
    task.title = els.taskTitle.textContent.trim();
    task.brief = els.brief.textContent.trim();
    task.organization = els.organization.textContent.trim();
    task.start = els.start.textContent.trim();
    task.continuation = els.continuation.textContent.trim();
    task.scoring = els.scoring.textContent.trim();
    task.coaching = els.coaching.textContent.trim();
    task.easier = els.easier.textContent.trim();
    task.harder = els.harder.textContent.trim();
  }

  function commitCurrent(notify = true) {
    const s = sessions[currentIndex];
    if (!s) return;
    commitTask();
    s.title = els.title.textContent.trim();
    s.objective = els.objective.textContent.trim();
    saveMeta(s.id, { category: els.category.value, level: els.level.value, players: Number(els.players.value), courts: Number(els.courts.value), coach: els.coach.value.trim(), notes: els.notes.value });
    saveSessions(notify);
    renderList(els.search.value);
  }

  function saveSessions(notify = true) {
    localStorage.setItem(storageKey, JSON.stringify(sessions));
    if (notify) showToast("Cambios guardados en este navegador");
  }

  function toggleEditing(force) {
    editing = typeof force === "boolean" ? force : !editing;
    document.body.classList.toggle("editing", editing);
    document.querySelectorAll("[data-editable]").forEach(el => el.contentEditable = editing ? "true" : "false");
    els.edit.setAttribute("aria-pressed", String(editing));
    els.edit.querySelector("span").textContent = editing ? "Terminar" : "Editar";
    renderCourt();
    if (editing) showToast("Edición activa: modifica textos o arrastra la pista");
    else commitCurrent(false);
  }

  function setMode(mode) {
    if (mode === "court" && editing) toggleEditing(false);
    document.body.dataset.mode = mode;
    document.querySelectorAll("[data-set-mode]").forEach(button => button.classList.toggle("active", button.dataset.setMode === mode));
    els.sidebar.classList.remove("open");
    showToast(mode === "court" ? "Modo pista: una tarea cada vez" : "Modo planificación");
  }

  function resetTimer() {
    stopTimer();
    timerInitial = durations()[activePhase] * 60;
    timerSeconds = timerInitial;
    updateTimer();
  }

  function toggleTimer() {
    if (timerId) { stopTimer(); return; }
    if (timerSeconds <= 0) resetTimer();
    els.timerToggle.textContent = "Pausar";
    timerId = setInterval(() => {
      timerSeconds -= 1; updateTimer();
      if (timerSeconds <= 0) { stopTimer(); showToast("Tiempo completado"); }
    }, 1000);
  }

  function stopTimer() {
    if (timerId) clearInterval(timerId);
    timerId = null;
    if (els.timerToggle) els.timerToggle.textContent = "Iniciar";
  }

  function updateTimer() {
    const minutes = Math.floor(timerSeconds / 60); const seconds = timerSeconds % 60;
    els.timer.textContent = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    const progress = timerInitial ? Math.max(0, ((timerInitial - timerSeconds) / timerInitial) * 100) : 0;
    const step = els.timeline.querySelector(`[data-phase="${activePhase}"]`);
    if (step) step.style.setProperty("--progress", `${progress}%`);
  }

  function exportData() {
    commitCurrent(false);
    const meta = JSON.parse(localStorage.getItem(metaKey) || "{}");
    const blob = new Blob([JSON.stringify({ version: 2, exportedAt: new Date().toISOString(), sessions, meta }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    Object.assign(document.createElement("a"), { href: url, download: "SG_Academy_programacion_completa.json" }).click();
    URL.revokeObjectURL(url); showToast("Programación exportada");
  }

  function importData(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (data.version !== 2 || !Array.isArray(data.sessions) || data.sessions.length !== source.length) throw new Error();
        sessions = data.sessions; localStorage.setItem(storageKey, JSON.stringify(sessions)); localStorage.setItem(metaKey, JSON.stringify(data.meta || {}));
        currentIndex = 0; activePhase = 0; renderSession(); renderList(); showToast("Programación importada");
      } catch (_) { showToast("La copia no corresponde a esta versión"); }
      els.import.value = "";
    };
    reader.readAsText(file);
  }

  function showToast(message) {
    clearTimeout(toastTimer); els.toast.textContent = message; els.toast.classList.add("show");
    toastTimer = setTimeout(() => els.toast.classList.remove("show"), 2300);
  }

  function pad(value) { return String(value).padStart(2, "0"); }
  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
  function escapeHtml(value) { return value.replace(/[&<>'"]/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" }[c])); }

  els.search.addEventListener("input", e => renderList(e.target.value));
  els.menu.addEventListener("click", () => els.sidebar.classList.toggle("open"));
  document.querySelectorAll("[data-set-mode]").forEach(button => button.addEventListener("click", () => setMode(button.dataset.setMode)));
  els.edit.addEventListener("click", () => toggleEditing());
  els.save.addEventListener("click", () => commitCurrent(true));
  els.print.addEventListener("click", () => { commitCurrent(false); window.print(); });
  els.prev.addEventListener("click", () => selectSession(currentIndex - 1));
  els.next.addEventListener("click", () => selectSession(currentIndex + 1));
  els.timerToggle.addEventListener("click", toggleTimer);
  els.timerReset.addEventListener("click", resetTimer);
  els.easierBtn.addEventListener("click", () => { activeVariant = activeVariant === "easier" ? "base" : "easier"; renderAppliedVersion(); });
  els.harderBtn.addEventListener("click", () => { activeVariant = activeVariant === "harder" ? "base" : "harder"; renderAppliedVersion(); });
  [els.category, els.level, els.players, els.courts].forEach(el => el.addEventListener("change", () => { commitCurrent(false); activeVariant = "base"; renderTimeline(); renderAppliedVersion(); resetTimer(); }));
  [els.coach, els.notes].forEach(el => el.addEventListener("change", () => commitCurrent(false)));
  els.export.addEventListener("click", exportData);
  els.import.addEventListener("change", e => e.target.files[0] && importData(e.target.files[0]));
  window.addEventListener("beforeunload", () => commitCurrent(false));

  renderList();
  renderSession();
})();
