import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const directory = await mkdtemp(join(tmpdir(), "vigia-test-"));
process.env.NODE_ENV = "test";
process.env.DEMO_MODE = "true";
process.env.DEMO_PASSWORD = "PruebasLocales123!";
process.env.MONGODB_DB = "vigia_test";
process.env.DATA_DIR = directory;
delete process.env.MONGODB_URI;
const { app, closeDatabase, client } = await import("../server.js");
const { migrateLegacyEvents } = await import("../lib/migrations.js");
const server = app.listen(0, "127.0.0.1");
await new Promise((r) => server.once("listening", r));
const base = `http://127.0.0.1:${server.address().port}`;
async function request(path, method = "GET", body, cookie, origin) {
  const response = await fetch(base + "/api" + path, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
      ...(origin ? { Origin: origin } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const result = (response.headers.get("content-type") || "").includes(
    "application/json",
  )
    ? await response.json()
    : await response.arrayBuffer();
  return { response, result };
}
async function login(email) {
  const { response } = await request("/login", "POST", {
    email,
    password: process.env.DEMO_PASSWORD,
  });
  assert.equal(response.status, 200);
  assert.match(response.headers.get("set-cookie"), /HttpOnly/);
  return response.headers.get("set-cookie").split(";")[0];
}
const event = {
  title: "Prueba de integración",
  type: "Incidente",
  date: new Date(Date.now() - 60000).toISOString(),
  area: "Almacén",
  location: "Pasillo",
  description: "Evento ficticio para verificar el flujo completo.",
  people: [],
};
after(async () => {
  await new Promise((r) => server.close(r));
  await closeDatabase();
  await rm(directory, { recursive: true, force: true });
});
test("API: autenticación, roles, persistencia, investigación y evidencia", async (t) => {
  await t.test("migra los registros y adjuntos antiguos sin cambiar sus códigos", async () => {
    const legacy = client.db("vigia_legacy_test");
    await legacy.collection("reports").insertOne({id:"SST-ANTERIOR",description:"Datos previos",history:[{text:"Reporte registrado"}]});
    await legacy.collection("evidence").insertOne({id:"archivo-anterior",reportId:"SST-ANTERIOR",content:Buffer.from("prueba")});
    await migrateLegacyEvents(legacy);
    await migrateLegacyEvents(legacy);
    const saved=await legacy.collection("events").findOne({id:"SST-ANTERIOR"});
    assert.equal(saved.description,"Datos previos");
    assert.equal(saved.history.length,1);
    const file=await legacy.collection("evidence").findOne({id:"archivo-anterior"});
    assert.equal(file.eventId,saved.id);
    assert.equal(file.reportId,undefined);
    assert.equal(await legacy.collection("accidentReports").countDocuments(),0);
    await legacy.dropDatabase();
  });
  let worker, sst, admin, coordinator, id, privateId, fileId;
  await t.test("bloquea consultas sin sesión", async () =>
    assert.equal((await request("/events")).response.status, 401),
  );
  await t.test(
    "rechaza credenciales incorrectas sin revelar si existe el usuario",
    async () => {
      const r = await request("/login", "POST", {
        email: "trabajador@vigia.demo",
        password: "incorrecta",
      });
      assert.equal(r.response.status, 401);
      assert.equal(r.result.error, "Correo o contraseña incorrectos.");
    },
  );
  await t.test("autentica los cuatro roles sin exponer hashes", async () => {
    worker = await login("trabajador@vigia.demo");
    sst = await login("sst@vigia.demo");
    admin = await login("admin@vigia.demo");
    coordinator = await login("coordinador@vigia.demo");
    const r = await request("/me", "GET", null, worker);
    assert.equal(r.result.role, "Trabajador");
    assert.equal(r.result.password, undefined);
  });
  await t.test("valida campos, tipo y fechas futuras", async () => {
    for (const value of [
      { ...event, title: "" },
      { ...event, type: "Otro" },
      { ...event, date: "invalida" },
      { ...event, date: "2099-01-01T00:00:00Z" },
    ])
      assert.equal(
        (await request("/events", "POST", value, worker)).response.status,
        400,
      );
  });
  await t.test("guarda personas y genera código e historial", async () => {
    const r = await request(
      "/events",
      "POST",
      {
        ...event,
        people: [
          {
            name: "Persona ficticia",
            document: "DEMO-01",
            contact: "test@example.com",
            kind: "Testigo",
          },
        ],
      },
      worker,
    );
    assert.equal(r.response.status, 201);
    id = r.result.id;
    assert.match(id, /^SST-/);
    assert.equal(r.result.status, "Reportado");
    assert.equal(r.result.history.length, 1);
    assert.equal(r.result.people[0].kind, "Testigo");
  });
  await t.test("aísla los eventos de otro usuario", async () => {
    const own = await request("/events", "POST", event, admin);
    privateId = own.result.id;
    const r = await request("/events", "GET", null, worker);
    assert.ok(r.result.some((r) => r.id === id));
    assert.ok(!r.result.some((r) => r.id === privateId));
    assert.equal(
      (
        await request(
          "/events/" + privateId + "/evidence",
          "GET",
          null,
          worker,
        )
      ).response.status,
      403,
    );
  });
  await t.test("impide modificar al trabajador y al coordinador", async () => {
    for (const cookie of [worker, coordinator])
      assert.equal(
        (
          await request(
            "/events/" + id,
            "PATCH",
            { action: "classify", type: "Incidente", notes: "Prueba" },
            cookie,
          )
        ).response.status,
        403,
      );
  });
  await t.test("requiere clasificar antes de investigar", async () =>
    assert.equal(
      (
        await request(
          "/events/" + id,
          "PATCH",
          {
            action: "investigate",
            immediate: "A",
            basic: "B",
            conclusion: "C",
          },
          sst,
        )
      ).response.status,
      409,
    ),
  );
  await t.test("clasifica y evita clasificaciones duplicadas", async () => {
    const action = {
      action: "classify",
      type: "Incidente",
      notes: "Clasificación de prueba.",
    };
    const r = await request("/events/" + id, "PATCH", action, sst);
    assert.equal(r.response.status, 200);
    assert.equal(r.result.status, "En investigación");
    assert.equal(r.result.classification.actor, "Daniel Rojas");
    assert.equal(
      (await request("/events/" + id, "PATCH", action, sst)).response.status,
      409,
    );
  });
  await t.test("guarda investigación e historial", async () => {
    const r = await request(
      "/events/" + id,
      "PATCH",
      {
        action: "investigate",
        immediate: "Obstáculo en pasillo",
        basic: "Inspección pendiente",
        conclusion: "Reforzar inspecciones",
      },
      sst,
    );
    assert.equal(r.response.status, 200);
    assert.equal(r.result.investigation.basic, "Inspección pendiente");
    assert.equal(r.result.history.length, 3);
  });
  await t.test("rechaza formato falso y archivos grandes", async () => {
    const endpoint = "/events/" + id + "/evidence";
    assert.equal(
      (
        await request(
          endpoint,
          "POST",
          {
            name: "falso.pdf",
            type: "application/pdf",
            content: Buffer.from("HTML").toString("base64"),
          },
          worker,
        )
      ).response.status,
      400,
    );
    assert.equal(
      (
        await request(
          endpoint,
          "POST",
          {
            name: "grande.pdf",
            type: "application/pdf",
            content: Buffer.alloc(2097153).toString("base64"),
          },
          worker,
        )
      ).response.status,
      400,
    );
  });
  await t.test(
    "el coordinador no puede adjuntar evidencia aunque conozca la ruta",
    async () =>
      assert.equal(
        (
          await request(
            "/events/" + id + "/evidence",
            "POST",
            {
              name: "prueba.pdf",
              type: "application/pdf",
              content: Buffer.from("%PDF-1.4").toString("base64"),
            },
            coordinator,
          )
        ).response.status,
        403,
      ),
  );
  await t.test(
    "adjunta, lista y descarga evidencia con autorización",
    async () => {
      const content = Buffer.from("%PDF-1.4\nDocumento ficticio de prueba.");
      const r = await request(
        "/events/" + id + "/evidence",
        "POST",
        {
          name: "prueba.pdf",
          type: "application/pdf",
          content: content.toString("base64"),
        },
        worker,
      );
      assert.equal(r.response.status, 201);
      fileId = r.result.id;
      const list = await request(
        "/events/" + id + "/evidence",
        "GET",
        null,
        worker,
      );
      assert.equal(list.result.length, 1);
      assert.equal(list.result[0].content, undefined);
      const download = await request(
        "/events/" + id + "/evidence/" + fileId,
        "GET",
        null,
        worker,
      );
      assert.equal(download.response.status, 200);
      assert.ok(Buffer.from(download.result).equals(content));
    },
  );
  await t.test("bloquea solicitudes de otro origen", async () =>
    assert.equal(
      (await request("/events", "POST", event, worker, "https://otro.example"))
        .response.status,
      403,
    ),
  );
  await t.test("limita intentos fallidos de login", async () => {
    for (let i = 0; i < 8; i++)
      await request("/login", "POST", {
        email: "fallos@example.com",
        password: "invalida",
      });
    assert.equal(
      (
        await request("/login", "POST", {
          email: "fallos@example.com",
          password: "invalida",
        })
      ).response.status,
      429,
    );
  });
  await t.test("cerrar sesión invalida el acceso", async () => {
    assert.equal(
      (await request("/logout", "POST", {}, worker)).response.status,
      200,
    );
    assert.equal(
      (await request("/events", "GET", null, worker)).response.status,
      401,
    );
  });
});
