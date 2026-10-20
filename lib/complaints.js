import { randomBytes } from "node:crypto";

export const complaintTypes = ["Queja", "Reclamo"];
const handlers = ["Profesional SST", "Administrador"];
const fail = (status, message) => Object.assign(Error(message), { status });
const canHandle = (user) => handlers.includes(user.role);
function text(value, label, max) {
  if (typeof value !== "string" || !value.trim() || value.length > max)
    throw fail(400, `${label}: dato requerido o demasiado largo.`);
  return value.trim();
}
// Plazo interno de referencia: 15 días hábiles, sin contar sábados ni domingos.
export function responseDeadline(from, businessDays = 15) {
  const day = new Date(from);
  let left = businessDays;
  while (left > 0) {
    day.setUTCDate(day.getUTCDate() + 1);
    if (![0, 6].includes(day.getUTCDay())) left--;
  }
  return day.toISOString();
}
export function registerComplaints(app, { complaints, events, privileged }) {
  app.get("/api/complaints", async (req, res) =>
    res.json(
      await complaints
        .find(canHandle(req.user) ? {} : { owner: req.user.id }, {
          projection: { _id: 0 },
        })
        .sort({ createdAt: -1 })
        .toArray(),
    ),
  );
  app.post("/api/complaints", async (req, res) => {
    const b = req.body;
    if (!complaintTypes.includes(b.type))
      throw fail(400, "Selecciona si es una queja o un reclamo.");
    let eventId = null;
    if (b.eventId) {
      const event = await events.findOne({ id: String(b.eventId) });
      if (!event || (!privileged(req.user) && event.owner !== req.user.id))
        throw fail(400, "El evento relacionado no existe o no tienes acceso.");
      eventId = event.id;
    }
    const now = new Date().toISOString();
    const complaint = {
      id: "QR-" + randomBytes(4).toString("hex").toUpperCase(),
      owner: req.user.id,
      author: req.user.name,
      type: b.type,
      subject: text(b.subject, "Asunto", 200),
      description: text(b.description, "Descripción", 3000),
      eventId,
      status: "Radicada",
      createdAt: now,
      dueDate: responseDeadline(now),
      response: null,
    };
    await complaints.insertOne({ ...complaint });
    res.status(201).json(complaint);
  });
  app.patch("/api/complaints/:id", async (req, res) => {
    if (!canHandle(req.user))
      throw fail(403, "Solo SST o el administrador pueden responder.");
    const now = new Date().toISOString();
    const result = await complaints.findOneAndUpdate(
      { id: req.params.id, status: "Radicada" },
      {
        $set: {
          status: "Respondida",
          response: {
            text: text(req.body.response, "Respuesta", 3000),
            actor: req.user.name,
            date: now,
          },
        },
      },
      { returnDocument: "after", projection: { _id: 0 } },
    );
    if (!result) {
      if (await complaints.findOne({ id: req.params.id }))
        throw fail(409, "Esta queja o reclamo ya fue respondida.");
      throw fail(404, "Queja o reclamo no encontrado.");
    }
    res.json(result);
  });
}
