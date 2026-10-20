import express from "express";
import { migrateLegacyEvents } from "./lib/migrations.js";
import { registerAccidentReports } from "./lib/accident-reports.js";
import { MongoClient } from "mongodb";
import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
  createHash,
} from "node:crypto";
import { promisify } from "node:util";
import { mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const scrypt = promisify(scryptCallback);
const root = dirname(fileURLToPath(import.meta.url));
let localMongo;
let uri = process.env.MONGODB_URI;
if (!uri) {
  if (process.env.DEMO_MODE !== "true" || process.env.NODE_ENV === "production")
    throw Error("Configura MONGODB_URI para conectar MongoDB.");
  const { MongoMemoryServer } = await import("mongodb-memory-server");
  const dbPath = resolve(process.env.DATA_DIR || resolve(root, "data"));
  mkdirSync(dbPath, { recursive: true });
  localMongo = await MongoMemoryServer.create({
    instance: { dbPath, storageEngine: "wiredTiger", dbName: "vigia" },
  });
  uri = localMongo.getUri();
  console.log(
    "MongoDB local de demostración iniciado. Datos persistidos en data/.",
  );
}
export const client = new MongoClient(uri, { serverSelectionTimeoutMS: 15000 });
await client.connect();
const db = client.db(process.env.MONGODB_DB || "vigia");
await migrateLegacyEvents(db);
const users = db.collection("users"),
  sessions = db.collection("sessions"),
  events = db.collection("events"),
  accidentReports = db.collection("accidentReports"),
  attempts = db.collection("attempts"),
  evidence = db.collection("evidence");
await Promise.all([
  users.createIndex({ email: 1 }, { unique: true }),
  sessions.createIndex({ expires: 1 }, { expireAfterSeconds: 0 }),
  events.createIndex({ id: 1 }, { unique: true }),
  events.createIndex({ owner: 1, createdAt: -1 }),
  accidentReports.createIndex({ eventId: 1 }, { unique: true }),
  attempts.createIndex({ expires: 1 }, { expireAfterSeconds: 0 }),
  evidence.createIndex({ eventId: 1 }),
]);
const hashToken = (t) => createHash("sha256").update(t).digest("hex");
async function passwordHash(p) {
  const salt = randomBytes(16).toString("hex");
  return salt + ":" + (await scrypt(p, salt, 64)).toString("hex");
}
async function verify(p, h) {
  const [salt, value] = h.split(":");
  return timingSafeEqual(await scrypt(p, salt, 64), Buffer.from(value, "hex"));
}
if (process.env.DEMO_MODE === "true" && !(await users.findOne({}))) {
  if (!process.env.DEMO_PASSWORD || process.env.DEMO_PASSWORD.length < 12)
    throw Error("DEMO_PASSWORD debe tener al menos 12 caracteres.");
  const password = await passwordHash(process.env.DEMO_PASSWORD);
  await users.insertMany([
    {
      id: "worker",
      name: "Laura Méndez",
      email: "trabajador@vigia.demo",
      password,
      role: "Trabajador",
    },
    {
      id: "sst",
      name: "Daniel Rojas",
      email: "sst@vigia.demo",
      password,
      role: "Profesional SST",
    },
    {
      id: "coordinator",
      name: "Ana Torres",
      email: "coordinador@vigia.demo",
      password,
      role: "Coordinador",
    },
    {
      id: "admin",
      name: "Administrador",
      email: "admin@vigia.demo",
      password,
      role: "Administrador",
    },
  ]);
  const now = new Date().toISOString();
  await events.insertMany(
    [
      [
        "001",
        "Incidente",
        "Almacén",
        "Reportado",
        "Objeto suelto en zona de circulación",
      ],
      [
        "002",
        "Accidente",
        "Producción",
        "En investigación",
        "Caída al mismo nivel",
      ],
      [
        "003",
        "Incidente",
        "Administración",
        "Reportado",
        "Cable expuesto en puesto de trabajo",
      ],
    ].map(([n, type, area, status, title]) => ({
      id: "SST-DEMO-" + n,
      owner: "worker",
      reporter: "Laura Méndez",
      type,
      area,
      status,
      title,
      location: area,
      date: now,
      description:
        "Registro ficticio para demostrar el prototipo. No corresponde a una persona ni a un evento real.",
      activityDescription:
        "Actividad ficticia de demostración; pendiente de verificar por SST.",
      people: [],
      createdAt: now,
      version: 0,
      history: [
        {
          date: now,
          actor: "Datos de demostración",
          text: "Evento registrado",
        },
        ...(status === "En investigación"
          ? [
              {
                date: now,
                actor: "Daniel Rojas",
                text: "Evento clasificado como Accidente",
              },
            ]
          : []),
      ],
    })),
  );
}
export const app = express();
app.disable("x-powered-by");
app.use((req, res, next) => {
  res.set({
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "same-origin",
    "X-Frame-Options": "DENY",
    "Content-Security-Policy":
      "default-src 'self'; style-src 'self'; script-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
  });
  if (req.path.startsWith("/api/")) res.set("Cache-Control", "no-store");
  if (
    !["GET", "HEAD"].includes(req.method) &&
    req.headers.origin &&
    new URL(req.headers.origin).host !== req.headers.host
  )
    return res.status(403).json({ error: "Origen no permitido." });
  next();
});
app.use(express.json({ limit: "4mb" }));
const fail = (status, message) => Object.assign(Error(message), { status });
function field(v, label, max = 200) {
  if (typeof v !== "string" || !v.trim() || v.length > max)
    throw fail(400, `${label}: dato requerido o demasiado largo.`);
  return v.trim();
}
const tokenFrom = (req) =>
  /(?:^|; )session=([a-f0-9]{64})(?:;|$)/.exec(req.headers.cookie || "")?.[1];
const privileged = (u) =>
  ["Profesional SST", "Coordinador", "Administrador"].includes(u.role);
const publicUser = (u) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  role: u.role,
});
app.get("/api/health", async (req, res) => {
  await db.command({ ping: 1 });
  res.json({ status: "ok" });
});
app.post("/api/login", async (req, res) => {
  const email = field(req.body.email, "Correo").toLowerCase(),
    password = field(req.body.password, "Contraseña", 256);
  const key = hashToken((req.socket.remoteAddress || "local") + ":" + email),
    prev = await attempts.findOne({ _id: key });
  if (prev && prev.expires > new Date() && prev.count >= 8)
    throw fail(429, "Demasiados intentos. Espera 15 minutos.");
  const u = await users.findOne({ email });
  if (!u || !(await verify(password, u.password))) {
    if (!prev || prev.expires <= new Date())
      await attempts.updateOne(
        { _id: key },
        { $set: { count: 1, expires: new Date(Date.now() + 900000) } },
        { upsert: true },
      );
    else await attempts.updateOne({ _id: key }, { $inc: { count: 1 } });
    throw fail(401, "Correo o contraseña incorrectos.");
  }
  await attempts.deleteOne({ _id: key });
  const token = randomBytes(32).toString("hex");
  await sessions.insertOne({
    _id: hashToken(token),
    userId: u.id,
    expires: new Date(Date.now() + 28800000),
  });
  res.cookie("session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.COOKIE_SECURE === "true",
    maxAge: 28800000,
    path: "/",
  });
  res.json(publicUser(u));
});
app.use("/api", async (req, res, next) => {
  const token = tokenFrom(req),
    session =
      token &&
      (await sessions.findOne({
        _id: hashToken(token),
        expires: { $gt: new Date() },
      }));
  const u = session && (await users.findOne({ id: session.userId }));
  if (!u) throw fail(401, "Inicia sesión para continuar.");
  req.user = publicUser(u);
  next();
});
app.get("/api/me", (req, res) => res.json(req.user));
app.post("/api/logout", async (req, res) => {
  await sessions.deleteOne({ _id: hashToken(tokenFrom(req)) });
  res.clearCookie("session", {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.COOKIE_SECURE === "true",
  });
  res.json({ ok: true });
});
app.get("/api/events", async (req, res) =>
  res.json(
    await events
      .find(privileged(req.user) ? {} : { owner: req.user.id }, {
        projection: { _id: 0 },
      })
      .sort({ createdAt: -1 })
      .toArray(),
  ),
);
app.post("/api/events", async (req, res) => {
  if (
    !["Trabajador", "Profesional SST", "Administrador"].includes(req.user.role)
  )
    throw fail(403, "El coordinador tiene acceso de consulta.");
  const b = req.body;
  if (!["Accidente", "Incidente"].includes(b.type))
    throw fail(400, "Tipo de evento inválido.");
  const date = field(b.date, "Fecha");
  if (!Number.isFinite(Date.parse(date)) || Date.parse(date) > Date.now())
    throw fail(400, "La fecha debe ser válida y no puede ser futura.");
  if (!Array.isArray(b.people) || b.people.length > 20)
    throw fail(400, "Personas involucradas inválidas.");
  const people = b.people.map((p) => ({
    name: field(p.name, "Nombre"),
    document: field(p.document, "Identificación", 40),
    contact: field(p.contact, "Contacto"),
    kind: field(p.kind, "Tipo"),
  }));
  if (people.some((p) => !["Afectado", "Testigo"].includes(p.kind)))
    throw fail(400, "Tipo de persona inválido.");
  const now = new Date().toISOString(),
    report = {
      id: "SST-" + randomBytes(5).toString("hex").toUpperCase(),
      owner: req.user.id,
      reporter: req.user.name,
      title: field(b.title, "Título"),
      type: b.type,
      area: field(b.area, "Área"),
      location: field(b.location, "Lugar"),
      date,
      description: field(b.description, "Descripción", 5000),
      activityDescription: field(
        b.activityDescription,
        "Actividad realizada",
        3000,
      ),
      people,
      status: "Reportado",
      createdAt: now,
      version: 0,
      history: [{ date: now, actor: req.user.name, text: "Evento registrado" }],
    };
  await events.insertOne({ ...report });
  res.status(201).json(report);
});
async function authorizedEvent(req) {
  const r = await events.findOne({ id: req.params.id });
  if (!r) throw fail(404, "Evento no encontrado.");
  if (!privileged(req.user) && r.owner !== req.user.id)
    throw fail(403, "No tienes acceso a este evento.");
  return r;
}
app.patch("/api/events/:id", async (req, res) => {
  if (req.user.role !== "Profesional SST")
    throw fail(403, "Esta acción requiere un profesional SST.");
  const r = await authorizedEvent(req),
    b = req.body,
    now = new Date().toISOString(),
    change = {};
  let text;
  if (b.action === "classify") {
    if (r.verification) throw fail(409, "El evento ya fue verificado.");
    if (!["Accidente", "Incidente"].includes(b.type))
      throw fail(400, "Tipo inválido.");
    if (
      b.type === "Accidente" &&
      !["Leve", "Grave", "Mortal"].includes(b.severity)
    )
      throw fail(
        400,
        "Selecciona la gravedad del accidente: Leve, Grave o Mortal.",
      );
    if (b.type === "Incidente" && b.severity)
      throw fail(400, "La gravedad de accidente no aplica a incidentes.");
    Object.assign(change, {
      type: b.type,
      status: "En investigación",
      verification: {
        type: b.type,
        severity: b.type === "Accidente" ? b.severity : null,
        notes: field(b.notes, "Observaciones", 3000),
        actor: req.user.name,
        date: now,
      },
    });
    text =
      "Evento verificado como " +
      b.type +
      (b.type === "Accidente" ? " · " + b.severity : "");
  } else if (b.action === "investigate") {
    if (!r.verification)
      throw fail(409, "Verifica el evento antes de investigarlo.");
    change.investigation = {
      immediate: field(b.immediate, "Causas inmediatas", 3000),
      basic: field(b.basic, "Causas básicas", 3000),
      conclusion: field(b.conclusion, "Conclusión", 5000),
      actor: req.user.name,
      date: now,
    };
    text = "Investigación guardada";
  } else throw fail(400, "Acción inválida.");
  const result = await events.findOneAndUpdate(
    { id: r.id, version: r.version },
    {
      $set: change,
      $inc: { version: 1 },
      $push: { history: { date: now, actor: req.user.name, text } },
    },
    { returnDocument: "after", projection: { _id: 0 } },
  );
  if (!result)
    throw fail(409, "El evento cambió. Actualiza e intenta de nuevo.");
  res.json(result);
});
registerAccidentReports(app, { events, accidentReports, authorizedEvent });
const formats = {
  "image/png": {
    extension: "png",
    check: (b) =>
      b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
  },
  "image/jpeg": {
    extension: "jpg",
    check: (b) => b[0] === 255 && b[1] === 216 && b[2] === 255,
  },
  "application/pdf": {
    extension: "pdf",
    check: (b) => b.subarray(0, 5).toString() === "%PDF-",
  },
};
app.post("/api/events/:id/evidence", async (req, res) => {
  if (req.user.role === "Coordinador")
    throw fail(403, "El coordinador tiene acceso de consulta.");
  const r = await authorizedEvent(req),
    b = req.body,
    format = formats[b.type];
  if (!format || typeof b.content !== "string")
    throw fail(400, "Solo se permiten PNG, JPG y PDF.");
  const bytes = Buffer.from(b.content, "base64");
  if (!bytes.length || bytes.length > 2097152)
    throw fail(400, "El archivo debe pesar como máximo 2 MB.");
  if (!format.check(bytes))
    throw fail(400, "El contenido no corresponde al tipo de archivo.");
  if ((await evidence.countDocuments({ eventId: r.id })) >= 5)
    throw fail(400, "Máximo cinco archivos por evento.");
  const file = {
    id: randomBytes(12).toString("hex"),
    eventId: r.id,
    name: field(b.name, "Nombre", 180),
    type: b.type,
    size: bytes.length,
    createdAt: new Date().toISOString(),
    content: bytes,
  };
  await evidence.insertOne(file);
  res
    .status(201)
    .json({ id: file.id, name: file.name, size: file.size, type: file.type });
});
app.get("/api/events/:id/evidence", async (req, res) => {
  await authorizedEvent(req);
  res.json(
    await evidence
      .find({ eventId: req.params.id }, { projection: { _id: 0, content: 0 } })
      .toArray(),
  );
});
app.get("/api/events/:id/evidence/:fileId", async (req, res) => {
  await authorizedEvent(req);
  const file = await evidence.findOne({
    id: req.params.fileId,
    eventId: req.params.id,
  });
  if (!file) throw fail(404, "Archivo no encontrado.");
  res.set({
    "Content-Type": file.type,
    "Content-Disposition": `attachment; filename="evidencia.${formats[file.type].extension}"`,
  });
  res.send(Buffer.from(file.content.buffer));
});
app.use("/api", (req, res) =>
  res.status(404).json({ error: "Ruta no disponible." }),
);
app.get("/vendor/bootstrap.min.css", (req, res) =>
  res.sendFile(
    resolve(root, "node_modules/bootstrap/dist/css/bootstrap.min.css"),
  ),
);
app.use(express.static(resolve(root, "public")));
app.use((error, req, res, next) => {
  const status = error.type === "entity.too.large" ? 413 : error.status || 500;
  res.status(status).json({
    error:
      status === 500
        ? "No se pudo procesar la solicitud."
        : status === 413
          ? "La solicitud supera el tamaño permitido."
          : error.message,
  });
  if (status === 500) console.error(error.message);
});
export async function closeDatabase() {
  await client.close();
  if (localMongo) await localMongo.stop();
}
if (process.env.NODE_ENV !== "test") {
  const server = app.listen(Number(process.env.PORT) || 3000, "0.0.0.0", () =>
    console.log(
      "Vigía SST disponible en http://localhost:" + (process.env.PORT || 3000),
    ),
  );
  for (const signal of ["SIGTERM", "SIGINT"])
    process.on(signal, () =>
      server.close(async () => {
        await closeDatabase();
        process.exit(0);
      }),
    );
}
