const $ = (s) => document.querySelector(s);
const esc = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const paths = {
  shield: "M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6l-8-3m-4 9 3 3 5-6",
  grid: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
  file: "M14 2H5v20h14V7l-5-5v5h5M8 12h8M8 16h6",
  plus: "M12 5v14M5 12h14",
  arrow: "M5 12h14m-5-5 5 5-5 5",
  clock: "M12 8v5l3 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0",
  check: "m5 12 4 4L19 6",
  search: "M21 21l-6-6M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0",
  logout: "M9 4H4v16h5M10 12h11m-4-4 4 4-4 4",
  chart: "M4 20V10m8 10V4m8 16v-7",
  info: "M12 11v6m0-10v1M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0",
  back: "M19 12H5m5-5-5 5 5 5",
  calendar: "M3 5h18v16H3zM7 3v4m10-4v4M3 10h18",
  upload: "M12 16V3m-4 4 4-4 4 4M4 15v6h16v-6",
  x: "m6 6 12 12M6 18 18 6",
  users:
    "M16 21v-4a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v4M12 6a4 4 0 1 1-8 0 4 4 0 0 1 8 0M20 21v-4a4 4 0 0 0-3-3.9M16 2a4 4 0 0 1 0 8",
};
const icon = (n) =>
  `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[n] || paths.file}"/></svg>`;
const brand = () =>
  `<div class="brand"><span class="brand-mark">${icon("shield")}</span><div>vigía<span class="muted">.</span><small>SEGURIDAD Y SALUD</small></div></div>`;
let user,
  events = [],
  accidentReports = [],
  accidentReport = null,
  reportOptions = {},
  page = "dashboard",
  selectedId,
  files = [],
  filter = { search: "", status: "", type: "" },
  busy = false;
const date = (v) =>
  new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Bogota",
  }).format(new Date(v));
const badge = (r) =>
  `<span class="badge-state ${r.status === "En investigación" ? "investigation" : ""}">${esc(r.status)}</span>`;
const professional = () =>
  ["Profesional SST", "Administrador"].includes(user?.role);
async function api(path, method = "GET", data) {
  const res = await fetch("/api" + path, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
  });
  const result = await res.json();
  if (!res.ok) {
    const e = Error(result.error || "No se pudo completar la operación.");
    e.status = res.status;
    throw e;
  }
  return result;
}
function toast(message) {
  $("#toast").textContent = message;
  $("#toast").classList.add("show");
  setTimeout(() => $("#toast").classList.remove("show"), 5000);
}
function login(error = "") {
  $("#app").innerHTML =
    `<main class="login"><section class="login-story">${brand()}<div class="story-main"><div class="eyebrow">Cuidar empieza por actuar</div><h1>Un entorno seguro.<br><span>Un equipo protegido.</span></h1><div class="story-line"></div><p>Registra lo que sucede, comprende las causas y construye un lugar de trabajo más seguro.</p></div><div class="story-foot">${icon("shield")}<span>Gestión de accidentes e incidentes laborales</span></div></section><section class="login-form-area"><div class="login-box"><div class="eyebrow">Bienvenido a Vigía SST</div><h2>Tu seguridad, en un solo lugar.</h2><p class="muted">Ingresa a tu cuenta para continuar con la gestión y el seguimiento de tus eventos.</p><form id="login-form"><div><label class="form-label" for="email">Correo electrónico</label><input id="email" name="email" type="email" class="form-control" placeholder="nombre@empresa.com" autocomplete="username" required maxlength="200"></div><div><label class="form-label" for="password">Contraseña</label><input id="password" name="password" type="password" class="form-control" placeholder="Ingresa tu contraseña" autocomplete="current-password" required maxlength="256"></div><div class="error" id="form-error" role="alert">${esc(error)}</div><button class="btn btn-primary" type="submit">Iniciar sesión ${icon("arrow")}</button></form><div class="login-note"><details><summary>Accesos para la demostración académica</summary><div class="mt-2">Trabajador: <code>trabajador@vigia.demo</code><br>Profesional SST: <code>sst@vigia.demo</code><br>Coordinador: <code>coordinador@vigia.demo</code><br>Administrador: <code>admin@vigia.demo</code><br>Usa la contraseña configurada por el equipo.</div></details></div><p class="hint mt-4">Prototipo académico. Utiliza únicamente datos ficticios.</p></div></section></main>`;
}
function shell() {
  const labels = {
    dashboard: "Resumen general",
    events: "Eventos",
    reports: "Informes SST",
    new: "Registrar evento",
    detail: "Detalle del evento",
    about: "Acerca del prototipo",
  };
  $("#app").innerHTML =
    `<div class="shell"><aside class="sidebar">${brand()}<nav aria-label="Navegación principal"><div class="eyebrow">Espacio de trabajo</div>${[
      ["dashboard", "grid", "Resumen general"],
      ["events", "file", "Eventos"],
      ["reports", "file", "Informes SST"],
      ["new", "plus", "Registrar evento"],
      ["about", "info", "Acerca del prototipo"],
    ]
      .map(
        ([key, i, label]) =>
          `<button data-nav="${key}" class="nav-item ${page === key ? "active" : ""}" ${page === key ? 'aria-current="page"' : ""}>${icon(i)}${label}${key === "events" ? `<span class="nav-count">${events.length}</span>` : ""}</button>`,
      )
      .join(
        "",
      )}</nav><div class="sidebar-bottom"><div class="sidebar-note">${icon("shield")}<strong>La prevención es de todos</strong>Cada evento es una oportunidad para cuidar a tu equipo.</div><p class="version">VIGÍA SST / PROTOTIPO 0.2</p></div></aside><div class="workspace"><header class="topbar"><div class="breadcrumb">Espacio de trabajo <span>/</span><strong>${labels[page]}</strong></div><div class="user-menu"><span class="avatar">${esc(
      user.name
        .split(" ")
        .slice(0, 2)
        .map((s) => s[0])
        .join(""),
    )}</span><div class="identity"><div class="name">${esc(user.name)}</div><small>${esc(user.role)}</small></div><button class="logout" data-action="logout" aria-label="Cerrar sesión" title="Cerrar sesión">${icon("logout")}</button></div></header><main class="content" id="content"></main></div></div>`;
  renderContent();
}
function heading(title, subtitle, action = "") {
  return `<div class="page-heading"><div><h1>${title}</h1><p>${subtitle}</p></div>${action}</div>`;
}
const newButton = () =>
  `<button class="btn btn-primary" data-nav="new">${icon("plus")} Registrar evento</button>`;
function rows(data) {
  return data
    .map(
      (r) =>
        `<tr><td><button class="report-title" data-report="${esc(r.id)}">${esc(r.title)}</button><span class="report-code">${esc(r.id)}</span></td><td><span class="badge-type ${r.type === "Accidente" ? "accident" : "incident"}">${esc(r.type)}</span></td><td>${esc(r.area)}</td><td>${badge(r)}</td><td><button class="text-button" data-report="${esc(r.id)}" aria-label="Ver ${esc(r.id)}">Ver ${icon("arrow")}</button></td></tr>`,
    )
    .join("");
}
function table(data) {
  return data.length
    ? `<div class="table-wrap"><table class="report-table"><thead><tr><th>Evento</th><th>Tipo de evento</th><th>Área</th><th>Estado</th><th>Detalle</th></tr></thead><tbody>${rows(data)}</tbody></table></div>`
    : `<div class="empty">No hay eventos que coincidan. Puedes registrar un evento nuevo.</div>`;
}
function dashboard() {
  const total = events.length,
    accidents = events.filter((r) => r.type === "Accidente").length,
    incidents = total - accidents,
    pending = events.filter((r) => !r.verification).length;
  const activity = events
    .flatMap((r) => r.history.map((h) => ({ ...h, id: r.id })))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 4);
  return `${heading("Resumen general", "Una mirada a la seguridad de tu equipo.", `<div class="date-label">${icon("calendar")}${new Intl.DateTimeFormat("es-CO", { dateStyle: "long", timeZone: "America/Bogota" }).format(new Date())}</div>`)}<section class="welcome"><div><div class="eyebrow">Cada evento cuenta</div><h2>La prevención comienza contigo.</h2><p>Documenta un evento y da el primer paso hacia un entorno más seguro.</p><div class="mt-3">${newButton()}</div></div><div class="welcome-symbol">${icon("shield")}</div></section><section class="metrics" aria-label="Indicadores de eventos">${[
    ["Total de eventos", total, "file", "", "Eventos registrados"],
    ["Por verificar", pending, "clock", "orange", "Pendientes de revisión SST"],
    [
      "En investigación",
      total - pending,
      "search",
      "blue",
      "Eventos verificados",
    ],
    [
      "Incidentes",
      incidents,
      "shield",
      "gray",
      "Eventos sin accidente confirmado",
    ],
  ]
    .map(
      ([label, n, i, color, caption]) =>
        `<div class="metric"><div class="metric-top">${label}<span class="metric-icon ${color}">${icon(i)}</span></div><div class="metric-number">${n.toString().padStart(2, "0")}</div><div class="metric-caption">${caption}</div></div>`,
    )
    .join(
      "",
    )}</section><div class="dashboard-grid"><section class="panel"><div class="panel-head"><div><h2>Eventos recientes</h2><p>Consulta el estado y los detalles de cada evento.</p></div><button class="text-button" data-nav="events">Ver todos ${icon("arrow")}</button></div>${table(events.slice(0, 6))}</section><div class="dashboard-side"><section class="panel"><div class="panel-head"><h2>Tipos de evento</h2>${icon("chart")}</div><div class="panel-body">${[
    ["Incidentes", incidents, ""],
    ["Accidentes", accidents, "orange"],
  ]
    .map(
      ([label, n, color]) =>
        `<div class="distribution-item"><div class="distribution-row"><span>${label}</span><strong>${n}</strong></div><div class="progress" role="progressbar" aria-label="${label}" aria-valuenow="${total ? Math.round((n / total) * 100) : 0}" aria-valuemin="0" aria-valuemax="100"><div class="progress-bar ${color}" data-width="${total ? (n / total) * 100 : 0}"></div></div></div>`,
    )
    .join(
      "",
    )}<p class="hint">Información calculada con los eventos visibles para tu rol.</p></div></section><section class="panel"><div class="panel-head"><h2>Actividad reciente</h2></div><div class="panel-body">${activity.length ? activity.map((a) => `<div class="activity"><span class="activity-dot"></span><div><p>${esc(a.text)}</p><small>${esc(a.id)} · ${esc(a.actor)}<br>${date(a.date)}</small></div></div>`).join("") : '<p class="hint">Aún no hay actividad.</p>'}</div></section></div></div><div class="footer-note"><span>Vigía SST · Gestión de accidentes e incidentes laborales</span><span>Prototipo académico · Datos de demostración</span></div>`;
}
function eventsPage() {
  return `${heading("Eventos", "Registra, consulta y sigue el avance de los eventos.", newButton())}<section class="panel"><div class="panel-head"><div><h2>Registro de eventos</h2><p>${events.length} eventos disponibles para tu rol</p></div></div><div class="filters"><input class="form-control" id="search" type="search" placeholder="Buscar por código, título o área" aria-label="Buscar eventos" value="${esc(filter.search)}"><select class="form-select" id="status-filter" aria-label="Filtrar por estado"><option value="">Todos los estados</option><option ${filter.status === "Reportado" ? "selected" : ""}>Reportado</option><option ${filter.status === "En investigación" ? "selected" : ""}>En investigación</option></select><select class="form-select" id="type-filter" aria-label="Filtrar por tipo"><option value="">Todos los tipos</option><option ${filter.type === "Accidente" ? "selected" : ""}>Accidente</option><option ${filter.type === "Incidente" ? "selected" : ""}>Incidente</option></select></div><div id="report-results">${table(filtered())}</div></section>`;
}
function filtered() {
  return events.filter(
    (r) =>
      (!filter.status || r.status === filter.status) &&
      (!filter.type || r.type === filter.type) &&
      `${r.id} ${r.title} ${r.area}`
        .toLowerCase()
        .includes(filter.search.toLowerCase()),
  );
}
function input(name, label, type = "text", extra = "") {
  return `<div><label class="form-label" for="${name}">${label}</label><input class="form-control" id="${name}" name="${name}" type="${type}" required maxlength="200" ${extra}></div>`;
}
function section(n, title, description) {
  return `<div class="section-title"><span class="section-number">${n}</span><div><h2>${title}</h2><p>${description}</p></div></div>`;
}
function newEvent() {
  return `${heading("Registrar evento", "Comparte los hechos. Tu información ayuda a prevenir.")}<form id="report-form"><section class="panel form-panel">${section("01", "Información del evento", "Los campos de esta sección son obligatorios.")}<div class="form-grid"><div class="full">${input("title", "Título del evento", "text", 'placeholder="Ej. Objeto suelto en zona de circulación"')}</div><div><label class="form-label" for="type">Tipo de evento</label><select class="form-select" id="type" name="type" required><option value="">Selecciona una opción</option><option>Incidente</option><option>Accidente</option></select></div>${input("date", "Fecha y hora del evento", "datetime-local")}<div class="full">${input("activityDescription", "Actividad que estabas realizando", "text", 'placeholder="Ej. Transportaba cajas desde el almacén"')}</div><div><label class="form-label" for="area">Área</label><select class="form-select" name="area" id="area" required><option value="">Selecciona el área</option><option>Producción</option><option>Almacén</option><option>Administración</option><option>Operaciones</option><option>Otra</option></select></div>${input("location", "Lugar específico", "text", 'placeholder="Ej. Pasillo de acceso al almacén"')}<div class="full"><label class="form-label" for="description">Descripción de lo ocurrido</label><textarea class="form-control" id="description" name="description" rows="4" required maxlength="5000" placeholder="Describe qué ocurrió, cómo ocurrió y las condiciones del lugar."></textarea></div></div><div class="divider"></div>${section("02", "Personas involucradas", "Registra afectados o testigos. Un incidente puede reportarse sin personas lesionadas.")}<div id="people"></div><button type="button" class="btn btn-light btn-sm mt-2" data-action="add-person">${icon("plus")} Añadir persona</button><div class="divider"></div>${section("03", "Evidencia", "Podrás adjuntar fotografías o documentos después de guardar el evento.")}<p class="hint">Formatos PNG, JPG y PDF. Máximo 2 MB por archivo y cinco archivos por evento.</p><div class="error" id="form-error" role="alert"></div><div class="form-actions"><button type="button" class="btn btn-light" data-nav="events">Cancelar</button><button class="btn btn-primary" type="submit">${icon("check")} Guardar evento</button></div></section></form>`;
}
function personRow() {
  return `<div class="person-row"><label class="small-label">Nombre<input class="form-control mt-1" name="person-name" required maxlength="200"></label><label class="small-label">Identificación<input class="form-control mt-1" name="person-document" required maxlength="40"></label><label class="small-label">Contacto<input class="form-control mt-1" name="person-contact" required maxlength="200"></label><label class="small-label">Participación<select class="form-select mt-1" name="person-kind"><option>Afectado</option><option>Testigo</option></select></label><button type="button" class="person-remove" data-action="remove-person" aria-label="Quitar persona">${icon("x")}</button></div>`;
}
function detail() {
  const r = events.find((r) => r.id === selectedId);
  if (!r) return `<div class="empty">Evento no encontrado.</div>`;
  return `${heading(esc(r.title), `${esc(r.id)} · Registrado por ${esc(r.reporter)}`, `<button class="btn btn-light" data-nav="events">${icon("back")} Volver</button>`)}<div class="detail-grid"><div><section class="panel form-panel"><div class="d-flex justify-content-between mb-4"><h2>Información del evento</h2>${badge(r)}</div><dl class="detail-meta">${[
    ["Tipo de evento", r.type],
    ["Fecha y hora", date(r.date)],
    ["Área", r.area],
    ["Lugar", r.location],
  ]
    .map(([key, value]) => `<div><dt>${key}</dt><dd>${esc(value)}</dd></div>`)
    .join(
      "",
    )}</dl><h3>Actividad inicial</h3><p class="prose">${esc(r.activityDescription || "No registrada en la versión anterior.")}</p><h3>Descripción inicial</h3><p class="prose">${esc(r.description)}</p><div class="detail-section"><h3>Personas involucradas</h3>${r.people.length ? r.people.map((p) => `<div class="status-note mb-2"><strong>${esc(p.name)}</strong> · ${esc(p.kind)}<br>Identificación: ${esc(p.document)}<br>Contacto: ${esc(p.contact)}</div>`).join("") : '<p class="hint">No se registraron personas involucradas.</p>'}</div></section><section class="panel form-panel"><h2>Evidencia del evento</h2><p class="hint">PNG, JPG o PDF. Hasta 2 MB por archivo, máximo cinco archivos.</p><ul class="file-list">${files.map((f) => `<li><a href="/api/events/${esc(r.id)}/evidence/${esc(f.id)}">${esc(f.name)}</a><span class="muted">${Math.ceil(f.size / 1024)} KB</span></li>`).join("") || '<li class="muted">No hay archivos adjuntos.</li>'}</ul>${user.role !== "Coordinador" ? `<form id="evidence-form"><label for="evidence-file" class="form-label">Seleccionar evidencia</label><input type="file" id="evidence-file" class="form-control" accept="image/png,image/jpeg,application/pdf" required><div class="error mt-2" id="evidence-error" role="alert"></div><button class="btn btn-light btn-sm mt-3" type="submit">${icon("upload")} Adjuntar archivo</button></form>` : ""}</section>${r.verification ? `<section class="panel form-panel"><h2>Verificación SST</h2><p><strong>${esc(r.verification.type)}${r.verification.severity ? " · " + esc(r.verification.severity) : ""}</strong></p><p class="hint">${esc(r.verification.actor)} · ${date(r.verification.date)}</p><p class="prose">${esc(r.verification.notes)}</p></section>` : ""}${professional() ? investigationForm(r) : r.investigation ? investigationRead(r) : ""}${accidentReportSection(r)}</div><aside><section class="panel form-panel"><h2>Seguimiento del caso</h2><p class="hint mb-4">Historial de cambios y responsables.</p><ol class="timeline">${r.history.map((h) => `<li><p>${esc(h.text)}</p><small>${esc(h.actor)}<br>${date(h.date)}</small></li>`).join("")}</ol></section><div class="status-note">${!r.verification ? "El evento está pendiente de verificación por un profesional SST." : "El evento está en investigación. El cierre y las acciones correctivas se implementarán en el siguiente sprint."}</div></aside></div>`;
}
function investigationRead(r) {
  return `<section class="panel form-panel"><h2>Investigación</h2>${[
    ["Causas inmediatas", r.investigation.immediate],
    ["Causas básicas", r.investigation.basic],
    ["Conclusión", r.investigation.conclusion],
  ]
    .map(
      ([label, value]) =>
        `<h3 class="mt-4">${label}</h3><p class="prose">${esc(value)}</p>`,
    )
    .join(
      "",
    )}<p class="hint">${esc(r.investigation.actor)} · ${date(r.investigation.date)}</p></section>`;
}
function investigationForm(r) {
  const verify = !r.verification;
  return `<section class="panel form-panel"><h2>${verify ? "Verificar evento" : "Investigación de causas"}</h2><p class="hint mb-4">${verify ? "Revisa la declaración y la evidencia. Confirma el tipo y la gravedad con los soportes disponibles." : "Se conserva la investigación tanto de accidentes como de incidentes."}</p><form class="detail-form" id="investigation-form"><input type="hidden" name="action" value="${verify ? "classify" : "investigate"}">${
    verify
      ? `<div><label for="classification-type" class="form-label">Tipo verificado por SST</label><select id="classification-type" class="form-select" name="type"><option ${r.type === "Incidente" ? "selected" : ""}>Incidente</option><option ${r.type === "Accidente" ? "selected" : ""}>Accidente</option></select></div><div id="severity-field" ${r.type === "Incidente" ? "hidden" : ""}><label class="form-label" for="severity">Gravedad del accidente</label><select class="form-select" name="severity" id="severity" ${r.type === "Incidente" ? "disabled" : "required"}><option value="">Selecciona la gravedad</option><option>Leve</option><option>Grave</option><option>Mortal</option></select></div><div><label for="notes" class="form-label">Observaciones de la verificación</label><textarea id="notes" name="notes" class="form-control" rows="3" required maxlength="3000"></textarea></div>`
      : [
          ["immediate", "Causas inmediatas"],
          ["basic", "Causas básicas"],
          ["conclusion", "Conclusión"],
        ]
          .map(
            ([name, label]) =>
              `<div><label class="form-label" for="${name}">${label}</label><textarea class="form-control" id="${name}" name="${name}" rows="3" required maxlength="${name === "conclusion" ? 5000 : 3000}">${esc(r.investigation?.[name] || "")}</textarea></div>`,
          )
          .join("")
  }<div class="error" id="form-error" role="alert"></div><div><button type="submit" class="btn btn-primary">${icon("check")} ${verify ? "Confirmar verificación" : "Guardar investigación"}</button></div></form></section>`;
}
function reportSelect(name, label, value) {
  return `<div><label class="form-label" for="report-${name}">${label}</label><select class="form-select" id="report-${name}" name="${name}" required><option value="">Selecciona una opción</option>${(reportOptions[name] || []).map((option) => `<option ${value === option ? "selected" : ""}>${esc(option)}</option>`).join("")}</select></div>`;
}
function accidentReportSection(event) {
  if (event.type !== "Accidente")
    return `<section class="panel form-panel"><h2>Informe de accidente</h2><p class="hint">Este evento es un incidente. Conserva su registro e investigación; no genera un informe de accidente.</p></section>`;
  if (!event.verification)
    return `<section class="panel form-panel"><h2>Informe del accidente</h2><div class="status-note">Pendiente de verificación de SST. Registrar el accidente no crea automáticamente su informe.</div></section>`;
  const r = accidentReport;
  if (!professional() && !r)
    return `<section class="panel form-panel"><h2>Informe del accidente</h2><p class="hint">SST aún no ha elaborado el informe interno.</p></section>`;
  const head = `<h2>Informe interno del accidente</h2><p class="hint">${r ? esc(r.id) + " · " + esc(r.status) : "Pendiente de elaboración"} · Evento ${esc(event.id)}</p><p class="hint">Documento académico interno. No corresponde al FURAT ni realiza un envío a la ARL.</p>`;
  if (r && (!professional() || r.status === "Emitido"))
    return `<section class="panel form-panel">${head}<dl class="detail-meta">${[
      ["Trabajador afectado", r.affectedWorker],
      ["Gravedad", r.severity],
      ["Actividad", r.activity],
      ["Mecanismo", r.mechanism],
      ["Lesión", r.injury],
      ["Parte afectada", r.bodyPart],
    ]
      .map(
        ([label, value]) =>
          `<div><dt>${label}</dt><dd>${esc(value)}</dd></div>`,
      )
      .join("")}</dl>${[
      ["Detalle de la actividad", r.activityDetail],
      ["Descripción verificada", r.verifiedDescription],
      ["Medidas inmediatas", r.immediateMeasures],
    ]
      .map(
        ([label, value]) =>
          `<h3 class="mt-4">${label}</h3><p class="prose">${esc(value)}</p>`,
      )
      .join(
        "",
      )}<p class="hint">Elaborado por ${esc(r.author)} · ${date(r.createdAt)}${r.issuedAt ? "<br>Emitido por " + esc(r.issuedBy) + " · " + date(r.issuedAt) : ""}</p>${reportHistory(r)}</section>`;
  return `<section class="panel form-panel">${head}<form id="accident-report-form" class="detail-form"><div><label class="form-label" for="affectedWorker">Trabajador afectado</label><input class="form-control" id="affectedWorker" name="affectedWorker" required maxlength="5000" value="${esc(r?.affectedWorker || event.people.find((p) => p.kind === "Afectado")?.name || "")}"></div><div class="form-grid">${reportSelect("activity", "Actividad realizada", r?.activity)}${reportSelect("mechanism", "Mecanismo del accidente", r?.mechanism)}${reportSelect("injury", "Tipo de lesión", r?.injury)}${reportSelect("bodyPart", "Parte del cuerpo afectada", r?.bodyPart)}</div>${[
    [
      "activityDetail",
      "Detalle de la actividad",
      r?.activityDetail || event.activityDescription || "",
    ],
    [
      "verifiedDescription",
      "Descripción verificada por SST",
      r?.verifiedDescription || "",
    ],
    [
      "immediateMeasures",
      "Medidas inmediatas adoptadas",
      r?.immediateMeasures || "",
    ],
  ]
    .map(
      ([name, label, value]) =>
        `<div><label class="form-label" for="${name}">${label}</label><textarea class="form-control" id="${name}" name="${name}" rows="3" required maxlength="5000">${esc(value)}</textarea></div>`,
    )
    .join(
      "",
    )}<p class="hint">Gravedad verificada: ${esc(event.verification.severity)}. El relato inicial del trabajador se conserva en el evento.</p><div class="error" role="alert"></div><div><button class="btn btn-primary" type="submit">${icon("file")} ${r ? "Guardar borrador" : "Crear borrador del informe"}</button></div></form>${r ? `<div class="divider"></div><form id="emit-report-form"><p class="hint">Emite la última versión guardada. El informe emitido queda de consulta; el evento continúa con su investigación.</p><div class="error" role="alert"></div><button class="btn btn-light" type="submit">${icon("check")} Emitir informe guardado</button></form>${reportHistory(r)}` : ""}</section>`;
}
function reportHistory(r) {
  return `<div class="divider"></div><h3>Historial del informe</h3><ol class="timeline mt-3">${r.history.map((h) => `<li><p>${esc(h.text)}</p><small>${esc(h.actor)} · ${date(h.date)}</small></li>`).join("")}</ol>`;
}
function accidentReportsPage() {
  return `${heading("Informes SST", "Documentos internos asociados a accidentes verificados.")}<section class="panel"><div class="panel-head"><div><h2>Informes de accidentes</h2><p>El registro del evento y el informe son elementos distintos.</p></div></div>${accidentReports.length ? `<div class="table-wrap"><table class="report-table"><thead><tr><th>Informe</th><th>Accidente</th><th>Gravedad</th><th>Estado del informe</th><th>Acción</th></tr></thead><tbody>${accidentReports.map((r) => `<tr><td>${esc(r.id)}</td><td>${esc(r.eventTitle)}<span class="report-code">${esc(r.eventId)}</span></td><td>${esc(r.severity)}</td><td><span class="badge-state ${r.status === "Emitido" ? "investigation" : ""}">${esc(r.status)}</span></td><td><button class="text-button" data-report="${esc(r.eventId)}">Ver accidente ${icon("arrow")}</button></td></tr>`).join("")}</tbody></table></div>` : `<div class="empty">Todavía no hay informes. SST puede elaborar uno desde el detalle de un accidente verificado.</div>`}</section>`;
}

function about() {
  return `${heading("Acerca del prototipo", "Una base funcional para recibir retroalimentación del proyecto.")}<section class="panel form-panel"><div class="eyebrow mb-3">Vigía SST · Avance de curso</div><h2>Del evento a la investigación</h2><p class="prose">Aplicación web para centralizar accidentes e incidentes laborales, con acceso por roles y trazabilidad de los cambios.</p><div class="divider"></div><h3>Disponible en esta versión</h3><ul class="about-list"><li>Inicio de sesión con correo y contraseña y sesiones protegidas.</li><li>Registro de accidentes e incidentes, afectados y testigos.</li><li>Adjuntos PNG, JPG y PDF, con validación de formato y tamaño.</li><li>Consulta, búsqueda y filtros de eventos, con acceso según el rol.</li><li>Verificación, gravedad e investigación por el profesional SST.</li><li>Informe interno de accidente con borrador y emisión.</li><li>Historial del caso e indicadores básicos a partir de los datos registrados.</li></ul><h3 class="mt-4">Siguiente sprint</h3><p class="prose">Acciones correctivas y cierre, notificaciones, tablero estadístico avanzado, exportación del informe y administración de usuarios.</p><div class="divider"></div><h3>Tecnologías</h3><p class="prose">HTML, CSS, JavaScript y Bootstrap 5 para la interfaz. Node.js y Express para la API REST. MongoDB para la persistencia. Despliegue preparado para Render y MongoDB Atlas.</p><div class="status-note mt-4">El porcentaje de avance se valida contra los criterios de aceptación. Este prototipo no acredita cumplimiento normativo y debe demostrarse con datos ficticios.</div></section>`;
}
function renderContent() {
  const content = $("#content");
  content.innerHTML = {
    dashboard,
    events: eventsPage,
    reports: accidentReportsPage,
    new: newEvent,
    detail,
    about,
  }[page]();
  document.querySelectorAll("[data-width]").forEach((el) => {
    el.style.width = el.dataset.width + "%";
  });
}
async function navigate(next, id) {
  if (busy) return;
  page = next;
  if (id) {
    selectedId = id;
    [files, accidentReport] = await Promise.all([
      api("/events/" + id + "/evidence"),
      api("/events/" + id + "/report"),
    ]);
  }
  shell();
  window.scrollTo(0, 0);
}
async function refresh() {
  [events, accidentReports, reportOptions] = await Promise.all([
    api("/events"),
    api("/accident-reports"),
    api("/report-options"),
  ]);
}
document.addEventListener("click", async (e) => {
  const nav = e.target.closest("[data-nav]"),
    report = e.target.closest("[data-report]"),
    action = e.target.closest("[data-action]");
  try {
    if (nav) await navigate(nav.dataset.nav);
    if (report) await navigate("detail", report.dataset.report);
    if (action?.dataset.action === "logout") {
      await api("/logout", "POST", {});
      user = null;
      events = [];
      login();
    }
    if (action?.dataset.action === "add-person")
      $("#people").insertAdjacentHTML("beforeend", personRow());
    if (action?.dataset.action === "remove-person")
      action.closest(".person-row").remove();
  } catch (error) {
    toast(error.message);
  }
});
document.addEventListener("input", (e) => {
  if (e.target.id === "search") {
    filter.search = e.target.value;
    $("#report-results").innerHTML = table(filtered());
  }
});
document.addEventListener("change", (e) => {
  if (e.target.id === "classification-type") {
    const accident = e.target.value === "Accidente";
    $("#severity-field").hidden = !accident;
    $("#severity").disabled = !accident;
    $("#severity").required = accident;
    if (!accident) $("#severity").value = "";
  }
  if (e.target.id === "status-filter") filter.status = e.target.value;
  if (e.target.id === "type-filter") filter.type = e.target.value;
  if (["status-filter", "type-filter"].includes(e.target.id))
    $("#report-results").innerHTML = table(filtered());
});
document.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (busy) return;
  const form = e.target,
    button = form.querySelector('[type="submit"]');
  const errorBox = form.querySelector(".error");
  if (errorBox) errorBox.textContent = "";
  busy = true;
  if (button) button.disabled = true;
  try {
    const values = Object.fromEntries(new FormData(form));
    if (form.id === "login-form") {
      user = await api("/login", "POST", values);
      await refresh();
      page = "dashboard";
      shell();
    }
    if (form.id === "report-form") {
      values.people = [...form.querySelectorAll(".person-row")].map((row) => ({
        name: row.querySelector('[name="person-name"]').value,
        document: row.querySelector('[name="person-document"]').value,
        contact: row.querySelector('[name="person-contact"]').value,
        kind: row.querySelector('[name="person-kind"]').value,
      }));
      values.date = new Date(values.date).toISOString();
      const result = await api("/events", "POST", values);
      await refresh();
      selectedId = result.id;
      files = [];
      accidentReport = null;
      page = "detail";
      shell();
      toast("Evento registrado. Ya puedes adjuntar evidencia.");
    }
    if (form.id === "accident-report-form") {
      accidentReport = await api(
        "/events/" + selectedId + "/report",
        accidentReport ? "PUT" : "POST",
        {
          ...values,
          ...(accidentReport ? { version: accidentReport.version } : {}),
        },
      );
      await refresh();
      shell();
      toast("Borrador del informe guardado.");
    }
    if (form.id === "emit-report-form") {
      accidentReport = await api(
        "/events/" + selectedId + "/report/finalize",
        "POST",
        { version: accidentReport.version },
      );
      await refresh();
      shell();
      toast("Informe interno emitido. El evento conserva su investigación.");
    }
    if (form.id === "investigation-form") {
      await api("/events/" + selectedId, "PATCH", values);
      await refresh();
      shell();
      toast("Información guardada correctamente.");
    }
    if (form.id === "evidence-form") {
      const file = $("#evidence-file").files[0];
      if (!file || file.size > 2097152)
        throw Error("Elige un archivo de hasta 2 MB.");
      const content = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(",")[1]);
        reader.onerror = () => reject(Error("No se pudo leer el archivo."));
        reader.readAsDataURL(file);
      });
      await api("/events/" + selectedId + "/evidence", "POST", {
        name: file.name,
        type: file.type,
        content,
      });
      files = await api("/events/" + selectedId + "/evidence");
      shell();
      toast("Evidencia adjuntada correctamente.");
    }
  } catch (error) {
    if (errorBox) errorBox.textContent = error.message;
    else toast(error.message);
  } finally {
    busy = false;
    if (button) button.disabled = false;
  }
});
(async () => {
  try {
    user = await api("/me");
    await refresh();
    shell();
  } catch (error) {
    login(error.status === 401 ? "" : error.message);
  }
})();
