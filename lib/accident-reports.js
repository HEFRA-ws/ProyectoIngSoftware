export const reportOptions = {
  activity: [
    "Manipulación de cargas",
    "Desplazamiento",
    "Uso de herramientas",
    "Operación de maquinaria",
    "Trabajo en alturas",
    "Otra",
  ],
  mechanism: [
    "Caída al mismo nivel",
    "Caída de altura",
    "Golpe contra objeto",
    "Caída de objetos",
    "Sobreesfuerzo",
    "Corte o punción",
    "Contacto con sustancias",
    "Otro",
  ],
  injury: [
    "Contusión",
    "Herida",
    "Esguince",
    "Fractura",
    "Quemadura",
    "Otra",
    "Por determinar",
  ],
  bodyPart: [
    "Cabeza",
    "Ojos",
    "Tronco",
    "Miembros superiores",
    "Manos",
    "Miembros inferiores",
    "Pies",
    "Varias partes",
    "Por determinar",
  ],
};
const fail = (status, message) => Object.assign(Error(message), { status });
const canWrite = (user) => user.role === "Profesional SST";
function content(body) {
  const data = {};
  for (const [key, options] of Object.entries(reportOptions)) {
    if (!options.includes(body[key]))
      throw fail(400, `Selecciona una opción válida para ${key}.`);
    data[key] = body[key];
  }
  for (const key of [
    "affectedWorker",
    "activityDetail",
    "verifiedDescription",
    "immediateMeasures",
  ]) {
    if (
      typeof body[key] !== "string" ||
      !body[key].trim() ||
      body[key].length > 5000
    )
      throw fail(
        400,
        "Completa los datos del trabajador, actividad, descripción y medidas inmediatas.",
      );
    data[key] = body[key].trim();
  }
  return data;
}
export function registerAccidentReports(
  app,
  { events, accidentReports, authorizedEvent },
) {
  app.get("/api/report-options", (req, res) => res.json(reportOptions));
  app.get("/api/accident-reports", async (req, res) => {
    const filter = ["Profesional SST", "Coordinador", "Administrador"].includes(
      req.user.role,
    )
      ? {}
      : { owner: req.user.id };
    res.json(
      await accidentReports
        .find(filter, { projection: { _id: 0 } })
        .sort({ updatedAt: -1 })
        .toArray(),
    );
  });
  app.get("/api/events/:id/report", async (req, res) => {
    await authorizedEvent(req);
    res.json(
      await accidentReports.findOne(
        { eventId: req.params.id },
        { projection: { _id: 0 } },
      ),
    );
  });
  app.post("/api/events/:id/report", async (req, res) => {
    if (!canWrite(req.user))
      throw fail(403, "Solo SST puede elaborar el informe del accidente.");
    const event = await authorizedEvent(req);
    if (!event.verification)
      throw fail(409, "Verifica el evento antes de elaborar el informe.");
    if (event.type !== "Accidente")
      throw fail(
        409,
        "Los incidentes conservan su investigación y no generan un informe de accidente.",
      );
    const data = content(req.body);
    const now = new Date().toISOString();
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
      ...data,
      author: req.user.name,
      authorId: req.user.id,
      createdAt: now,
      updatedAt: now,
      history: [
        { date: now, actor: req.user.name, text: "Borrador de informe creado" },
      ],
    };
    try {
      await accidentReports.insertOne({ ...report });
    } catch (error) {
      if (error.code === 11000)
        throw fail(
          409,
          "Este accidente ya tiene un informe. Actualiza la página.",
        );
      throw error;
    }
    res.status(201).json(report);
  });
  app.put("/api/events/:id/report", async (req, res) => {
    if (!canWrite(req.user))
      throw fail(403, "Solo SST puede editar el informe del accidente.");
    await authorizedEvent(req);
    const data = content(req.body);
    if (!Number.isInteger(req.body.version))
      throw fail(400, "Versión de informe inválida.");
    const now = new Date().toISOString();
    const result = await accidentReports.findOneAndUpdate(
      { eventId: req.params.id, status: "Borrador", version: req.body.version },
      {
        $set: { ...data, updatedAt: now },
        $inc: { version: 1 },
        $push: {
          history: {
            date: now,
            actor: req.user.name,
            text: "Borrador actualizado",
          },
        },
      },
      { returnDocument: "after", projection: { _id: 0 } },
    );
    if (!result)
      throw fail(
        409,
        "El informe cambió, ya fue emitido o no existe. Actualiza la página.",
      );
    res.json(result);
  });
  app.post("/api/events/:id/report/finalize", async (req, res) => {
    if (!canWrite(req.user))
      throw fail(403, "Solo SST puede emitir el informe del accidente.");
    const event = await authorizedEvent(req);
    if (!event.verification || event.type !== "Accidente")
      throw fail(409, "El informe requiere un accidente verificado.");
    if (!Number.isInteger(req.body.version))
      throw fail(400, "Versión de informe inválida.");
    const now = new Date().toISOString();
    const result = await accidentReports.findOneAndUpdate(
      { eventId: event.id, status: "Borrador", version: req.body.version },
      {
        $set: {
          status: "Emitido",
          issuedAt: now,
          issuedBy: req.user.name,
          updatedAt: now,
        },
        $inc: { version: 1 },
        $push: {
          history: {
            date: now,
            actor: req.user.name,
            text: "Informe interno emitido",
          },
        },
      },
      { returnDocument: "after", projection: { _id: 0 } },
    );
    if (!result)
      throw fail(
        409,
        "El informe cambió, ya fue emitido o no existe. Actualiza la página.",
      );
    res.json(result);
  });
}
