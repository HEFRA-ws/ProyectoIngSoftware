import { responseDeadline } from "./complaints.js";

// Datos ficticios precargados para la demostración. Ninguna persona, documento
// ni evento corresponde a un caso real. La carga es idempotente: solo inserta
// lo que todavía no existe y nunca sobrescribe cambios hechos desde la app.

const SST = "Daniel Rojas";
const DAY = 86400000;

export const demoUsers = [
  {
    id: "worker2",
    name: "Jorge Castillo",
    email: "trabajador2@vigia.demo",
    role: "Trabajador",
  },
  {
    id: "worker3",
    name: "Marcela Ortiz",
    email: "trabajador3@vigia.demo",
    role: "Trabajador",
  },
];

const owners = {
  worker: "Laura Méndez",
  worker2: "Jorge Castillo",
  worker3: "Marcela Ortiz",
};

function at(now, days, hour = 9) {
  const date = new Date(now - days * DAY);
  date.setUTCHours(hour + 5, 0, 0, 0);
  return date.toISOString();
}
const day = (iso) => iso.slice(0, 10);

const person = (name, document, contact, kind) => ({
  name,
  document,
  contact,
  kind,
});

// Cada evento describe su estado final; los historiales se construyen con las
// mismas frases que registra la API para que la línea de tiempo sea coherente.
const scenarios = [
  {
    n: "004",
    owner: "worker2",
    type: "Accidente",
    area: "Producción",
    location: "Línea de empaque 2",
    title: "Corte en la mano con cuchilla de empaque",
    description:
      "Al abrir una caja de material de empaque, la cuchilla se deslizó y produjo un corte en la palma de la mano izquierda.",
    activity: "Apertura de cajas de material de empaque con cuchilla retráctil.",
    daysAgo: 24,
    people: [
      person("Jorge Castillo", "CC-DEMO-1001", "jorge.castillo@demo.local", "Afectado"),
      person("Paola Rincón", "CC-DEMO-1002", "paola.rincon@demo.local", "Testigo"),
    ],
    severity: "Leve",
    notes: "Se confirma accidente leve; atención en enfermería sin incapacidad.",
    investigation: {
      immediate: "Uso de cuchilla sin protector y corte en dirección al cuerpo.",
      basic: "No existe procedimiento escrito para apertura de cajas ni guantes anticorte disponibles en la línea.",
      conclusion: "Dotar guantes anticorte, cambiar a cuchillas de seguridad y capacitar al personal de empaque.",
    },
    actions: [
      {
        description: "Entregar guantes anticorte al personal de la línea de empaque",
        responsible: "Coordinador de producción",
        dueIn: -14,
        status: "Completada",
        evidence: "Acta de entrega de 12 pares de guantes firmada por los operarios.",
      },
      {
        description: "Capacitar en uso seguro de herramientas cortopunzantes",
        responsible: "Profesional SST",
        dueIn: -7,
        status: "Completada",
        evidence: "Lista de asistencia de la capacitación del turno de la mañana.",
      },
    ],
    report: {
      status: "Emitido",
      activity: "Uso de herramientas",
      mechanism: "Corte o punción",
      injury: "Herida",
      bodyPart: "Manos",
      activityDetail: "Abría cajas de material de empaque con cuchilla retráctil sin protector.",
      verifiedDescription: "Corte superficial en la palma de la mano izquierda durante la apertura de una caja.",
      immediateMeasures: "Primeros auxilios en enfermería y retiro de la cuchilla sin protector.",
    },
    closed: true,
  },
  {
    n: "005",
    owner: "worker3",
    type: "Accidente",
    area: "Operaciones",
    location: "Bodega principal, nave 1",
    title: "Caída desde escalera durante cambio de luminaria",
    description:
      "Durante el cambio de una luminaria, la escalera tipo tijera se desplazó y la trabajadora cayó desde el tercer peldaño.",
    activity: "Cambio de luminaria a 2,5 metros de altura con escalera tipo tijera.",
    daysAgo: 9,
    people: [
      person("Marcela Ortiz", "CC-DEMO-1003", "marcela.ortiz@demo.local", "Afectado"),
      person("Andrés Gómez", "CC-DEMO-1004", "andres.gomez@demo.local", "Testigo"),
    ],
    severity: "Grave",
    notes: "Esguince de tobillo con incapacidad; se clasifica como accidente grave para seguimiento.",
    investigation: {
      immediate: "Escalera apoyada sobre piso húmedo y sin segunda persona sosteniéndola.",
      basic: "No se aplicó permiso de trabajo en alturas ni inspección previa de la escalera.",
      conclusion: "Exigir permiso de trabajo en alturas y acompañamiento para tareas con escalera.",
    },
    actions: [
      {
        description: "Implementar formato de inspección de escaleras antes de cada uso",
        responsible: "Jefe de mantenimiento",
        dueIn: 5,
        status: "En curso",
        evidence: "",
      },
      {
        description: "Capacitar al equipo de mantenimiento en trabajo seguro en alturas",
        responsible: "Profesional SST",
        dueIn: 20,
        status: "Pendiente",
        evidence: "",
      },
    ],
    report: {
      status: "Borrador",
      activity: "Trabajo en alturas",
      mechanism: "Caída de altura",
      injury: "Esguince",
      bodyPart: "Miembros inferiores",
      activityDetail: "Cambiaba una luminaria subida en el tercer peldaño de una escalera tipo tijera.",
      verifiedDescription: "La escalera se desplazó sobre piso húmedo y la trabajadora cayó lateralmente.",
      immediateMeasures: "Inmovilización, traslado a urgencias y aislamiento de la zona húmeda.",
    },
  },
  {
    n: "006",
    owner: "worker",
    type: "Incidente",
    area: "Operaciones",
    location: "Patio de cargue",
    title: "Montacargas sin alarma de reversa",
    description:
      "Un montacargas retrocedió sin alarma sonora y pasó a menos de un metro de un auxiliar que caminaba por el patio.",
    activity: "Tránsito peatonal por el patio de cargue durante operación de montacargas.",
    daysAgo: 31,
    people: [
      person("Luis Herrera", "CC-DEMO-1005", "luis.herrera@demo.local", "Testigo"),
    ],
    notes: "Incidente sin lesionados; se confirma falla en la alarma de reversa.",
    investigation: {
      immediate: "Alarma de reversa desconectada y ausencia de demarcación peatonal.",
      basic: "El mantenimiento preventivo no incluía la verificación de alarmas del montacargas.",
      conclusion: "Reparar la alarma, incluirla en la lista de chequeo diaria y demarcar senderos peatonales.",
    },
    actions: [
      {
        description: "Reparar la alarma de reversa y agregarla a la lista de chequeo diaria",
        responsible: "Jefe de logística",
        dueIn: -20,
        status: "Completada",
        evidence: "Orden de trabajo cerrada y lista de chequeo actualizada.",
      },
    ],
    closed: true,
  },
  {
    n: "007",
    owner: "worker2",
    type: "Accidente",
    area: "Almacén",
    location: "Pasillo de estibas, zona B",
    title: "Golpe con estiba al retirar mercancía",
    description:
      "Al retirar una estiba con el gato hidráulico, la estiba golpeó el pie derecho del trabajador.",
    activity: "Retiro de estibas con gato hidráulico manual.",
    daysAgo: 2,
    people: [
      person("Jorge Castillo", "CC-DEMO-1001", "jorge.castillo@demo.local", "Afectado"),
    ],
  },
  {
    n: "008",
    owner: "worker3",
    type: "Incidente",
    area: "Administración",
    location: "Pasillo del segundo piso",
    title: "Derrame de café en pasillo sin señalizar",
    description:
      "Se encontró un derrame de café en el pasillo principal sin señalización; una persona resbaló sin caer.",
    activity: "Desplazamiento entre oficinas.",
    daysAgo: 5,
    people: [
      person("Sofía Vargas", "CC-DEMO-1006", "sofia.vargas@demo.local", "Testigo"),
    ],
    notes: "Incidente confirmado; no hubo lesionados.",
  },
  {
    n: "009",
    owner: "worker",
    type: "Accidente",
    area: "Producción",
    location: "Selladora térmica 1",
    title: "Quemadura leve con superficie caliente de selladora",
    description:
      "La trabajadora apoyó el antebrazo en la resistencia descubierta de la selladora mientras retiraba un empaque atascado.",
    activity: "Retiro de empaque atascado en selladora térmica en funcionamiento.",
    daysAgo: 13,
    people: [
      person("Laura Méndez", "CC-DEMO-1007", "laura.mendez@demo.local", "Afectado"),
    ],
    severity: "Leve",
    notes: "Quemadura de primer grado atendida en enfermería.",
    investigation: {
      immediate: "Intervención de la máquina sin apagarla y resistencia sin guarda.",
      basic: "La guarda fue retirada en un mantenimiento anterior y no se reinstaló.",
      conclusion: "Reinstalar la guarda y aplicar bloqueo de energía antes de intervenir la selladora.",
    },
    actions: [
      {
        description: "Reinstalar la guarda de la resistencia de la selladora",
        responsible: "Jefe de mantenimiento",
        dueIn: 3,
        status: "Pendiente",
        evidence: "",
      },
    ],
    report: {
      status: "Emitido",
      activity: "Operación de maquinaria",
      mechanism: "Contacto con sustancias",
      injury: "Quemadura",
      bodyPart: "Miembros superiores",
      activityDetail: "Retiraba un empaque atascado con la selladora encendida.",
      verifiedDescription: "Contacto del antebrazo con la resistencia caliente sin guarda.",
      immediateMeasures: "Enfriamiento con agua, curación en enfermería y apagado del equipo.",
    },
  },
  {
    n: "010",
    owner: "worker3",
    type: "Incidente",
    area: "Almacén",
    location: "Estantería E-4",
    title: "Estantería con anclaje flojo",
    description:
      "Durante el inventario se detectó que la estantería E-4 se mueve al empujarla porque dos anclajes al piso están flojos.",
    activity: "Conteo de inventario en estanterías.",
    daysAgo: 1,
    people: [],
  },
];

function buildEvent(s, now) {
  const reporter = owners[s.owner];
  const date = at(now, s.daysAgo, 8);
  const created = at(now, s.daysAgo, 10);
  const history = [{ date: created, actor: reporter, text: "Evento registrado" }];
  const event = {
    id: "SST-DEMO-" + s.n,
    owner: s.owner,
    reporter,
    title: s.title,
    type: s.type,
    area: s.area,
    location: s.location,
    date,
    description: s.description,
    activityDescription: s.activity,
    people: s.people,
    correctiveActions: [],
    status: "Reportado",
    createdAt: created,
    demo: true,
  };
  if (s.notes) {
    const verified = at(now, s.daysAgo - 1, 9);
    event.status = "En investigación";
    event.verification = {
      type: s.type,
      severity: s.type === "Accidente" ? s.severity : null,
      notes: s.notes,
      actor: SST,
      date: verified,
    };
    history.push({
      date: verified,
      actor: SST,
      text:
        "Evento verificado como " +
        s.type +
        (s.type === "Accidente" ? " · " + s.severity : ""),
    });
  }
  if (s.investigation) {
    const investigated = at(now, s.daysAgo - 2, 11);
    event.investigation = { ...s.investigation, actor: SST, date: investigated };
    history.push({ date: investigated, actor: SST, text: "Investigación guardada" });
  }
  (s.actions || []).forEach((a, i) => {
    const assigned = at(now, s.daysAgo - 3, 9 + i);
    const action = {
      id: `AC-DEMO${s.n}${i + 1}`,
      description: a.description,
      responsible: a.responsible,
      dueDate: day(new Date(now + a.dueIn * DAY).toISOString()),
      status: a.status,
      evidence: a.evidence,
      createdAt: assigned,
      history: [{ date: assigned, actor: SST, text: "Acción asignada" }],
    };
    history.push({
      date: assigned,
      actor: SST,
      text: `Acción correctiva asignada a ${a.responsible}`,
    });
    if (a.status !== "Pendiente") {
      const updated = at(now, Math.max(s.daysAgo - 6, 0), 15 + i);
      const text =
        a.status === "Completada"
          ? "Acción completada con evidencia registrada"
          : `Acción actualizada a ${a.status}`;
      action.history.push({ date: updated, actor: SST, text });
      history.push({ date: updated, actor: SST, text: `${action.id}: ${text}` });
    }
    event.correctiveActions.push(action);
  });
  if (s.closed) {
    const closedAt = at(now, Math.max(s.daysAgo - 8, 0), 17);
    Object.assign(event, { status: "Cerrado", closedAt, closedBy: SST });
    history.push({
      date: closedAt,
      actor: SST,
      text: "Evento cerrado tras completar las acciones correctivas",
    });
  }
  history.sort((a, b) => a.date.localeCompare(b.date));
  return { ...event, history, version: history.length - 1 };
}

function buildReport(s, event, now) {
  const { status, ...fields } = s.report;
  const created = at(now, s.daysAgo - 2, 14);
  const report = {
    id: "INF-" + event.id,
    eventId: event.id,
    eventTitle: event.title,
    owner: event.owner,
    status: "Borrador",
    version: 0,
    severity: event.verification.severity,
    eventSnapshot: {
      type: event.type,
      date: event.date,
      area: event.area,
      location: event.location,
      description: event.description,
    },
    affectedWorker: event.people.find((p) => p.kind === "Afectado").name,
    ...fields,
    author: SST,
    authorId: "sst",
    createdAt: created,
    updatedAt: created,
    history: [{ date: created, actor: SST, text: "Borrador de informe creado" }],
    demo: true,
  };
  if (status === "Emitido") {
    const issuedAt = at(now, s.daysAgo - 3, 16);
    Object.assign(report, {
      status: "Emitido",
      version: 1,
      issuedAt,
      issuedBy: SST,
      updatedAt: issuedAt,
    });
    report.history.push({ date: issuedAt, actor: SST, text: "Informe interno emitido" });
  }
  return report;
}

function buildComplaints(now) {
  const filed = at(now, 1, 10);
  const answeredFiled = at(now, 4, 15);
  return [
    {
      id: "QR-DEMO001",
      owner: "worker2",
      author: owners.worker2,
      type: "Queja",
      subject: "Seguimiento del golpe con estiba",
      description:
        "Reporté el golpe en el pie hace dos días y el caso SST-DEMO-007 sigue sin verificación.",
      eventId: "SST-DEMO-007",
      status: "Radicada",
      createdAt: filed,
      dueDate: responseDeadline(filed),
      response: null,
      demo: true,
    },
    {
      id: "QR-DEMO002",
      owner: "worker3",
      author: owners.worker3,
      type: "Reclamo",
      subject: "Pasillo sin señalización",
      description:
        "Después del derrame del pasillo del segundo piso no se instalaron avisos de piso húmedo.",
      eventId: "SST-DEMO-008",
      status: "Respondida",
      createdAt: answeredFiled,
      dueDate: responseDeadline(answeredFiled),
      response: {
        text: "Se instalaron dos avisos plegables y se acordó la limpieza inmediata de derrames con servicios generales.",
        actor: SST,
        date: at(now, 3, 11),
      },
      demo: true,
    },
  ];
}

// Inserta usuarios, eventos, informes y quejas de demostración que falten.
// `password` es el hash ya calculado de DEMO_PASSWORD.
export async function seedDemoData(db, password, now = Date.now()) {
  const users = db.collection("users"),
    events = db.collection("events"),
    reports = db.collection("accidentReports"),
    complaints = db.collection("complaints");
  let inserted = 0;
  const insertMissing = async (collection, filter, doc) => {
    const r = await collection.updateOne(
      filter,
      { $setOnInsert: doc },
      { upsert: true },
    );
    inserted += r.upsertedCount;
  };
  for (const user of demoUsers)
    await insertMissing(users, { email: user.email }, { ...user, password });
  for (const s of scenarios) {
    const event = buildEvent(s, now);
    await insertMissing(events, { id: event.id }, event);
    if (s.report)
      await insertMissing(
        reports,
        { eventId: event.id },
        buildReport(s, event, now),
      );
  }
  for (const complaint of buildComplaints(now))
    await insertMissing(complaints, { id: complaint.id }, complaint);
  // El evento de ejemplo SST-DEMO-002 de la primera versión quedó "En
  // investigación" sin verificación; se completa solo si sigue así.
  const legacy = await events.updateOne(
    {
      id: "SST-DEMO-002",
      status: "En investigación",
      verification: { $exists: false },
    },
    {
      $set: {
        verification: {
          type: "Accidente",
          severity: "Leve",
          notes: "Caída sin lesiones de consideración; se confirma accidente leve.",
          actor: SST,
          date: at(now, 1, 9),
        },
      },
    },
  );
  inserted += legacy.modifiedCount;
  return inserted;
}

export const demoScenarioCount = scenarios.length;
