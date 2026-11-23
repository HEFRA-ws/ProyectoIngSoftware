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
const { migrateDemoAdminName, migrateLegacyEvents } = await import(
  "../lib/migrations.js"
);
const { seedDemoData, demoScenarioCount } = await import(
  "../lib/demo-data.js"
);
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
  activityDescription: "Transportaba cajas en el almacén",
  people: [],
};
after(async () => {
  await new Promise((r) => server.close(r));
  await closeDatabase();
  await rm(directory, { recursive: true, force: true });
});
test("API: autenticación, roles, persistencia, investigación y evidencia", async (t) => {
  await t.test("corrige el nombre demo anterior sin sobrescribir nombres personalizados", async () => {
    const migrationDb = client.db("vigia_demo_name_test");
    const demoUsers = migrationDb.collection("users");
    const legacyAdmin = {
      id: "admin",
      email: "admin@vigia.demo",
      role: "Administrador",
      name: "Administrador",
      password: "hash-conservado",
    };
    await demoUsers.insertMany([
      legacyAdmin,
      {
        id: "other-admin",
        email: "otro@example.com",
        role: "Administrador",
        name: "Administrador",
      },
    ]);
    await migrateDemoAdminName(migrationDb);
    await migrateDemoAdminName(migrationDb);
    const saved = await demoUsers.findOne({ id: "admin" });
    assert.equal(saved.name, "Carlos Ramírez");
    assert.equal(saved.role, legacyAdmin.role);
    assert.equal(saved.password, legacyAdmin.password);
    assert.equal(
      (await demoUsers.findOne({ id: "other-admin" })).name,
      "Administrador",
    );
    await demoUsers.updateOne(
      { id: "admin" },
      { $set: { name: "Nombre personalizado" } },
    );
    await migrateDemoAdminName(migrationDb);
    assert.equal(
      (await demoUsers.findOne({ id: "admin" })).name,
      "Nombre personalizado",
    );
    await migrationDb.dropDatabase();
  });
  await t.test(
    "migra los registros y adjuntos antiguos sin cambiar sus códigos",
    async () => {
      const legacy = client.db("vigia_legacy_test");
      await legacy
        .collection("reports")
        .insertOne({
          id: "SST-ANTERIOR",
          description: "Datos previos",
          history: [{ text: "Reporte registrado" }],
        });
      await legacy
        .collection("evidence")
        .insertOne({
          id: "archivo-anterior",
          reportId: "SST-ANTERIOR",
          content: Buffer.from("prueba"),
        });
      await migrateLegacyEvents(legacy);
      await migrateLegacyEvents(legacy);
      const saved = await legacy
        .collection("events")
        .findOne({ id: "SST-ANTERIOR" });
      assert.equal(saved.description, "Datos previos");
      assert.equal(saved.history.length, 1);
      const file = await legacy
        .collection("evidence")
        .findOne({ id: "archivo-anterior" });
      assert.equal(file.eventId, saved.id);
      assert.equal(file.reportId, undefined);
      assert.equal(
        await legacy.collection("accidentReports").countDocuments(),
        0,
      );
      await legacy.dropDatabase();
    },
  );
  await t.test(
    "precarga datos de demostración coherentes sin duplicarlos",
    async () => {
      const seedDb = client.db("vigia_demo_seed_test");
      const now = Date.now();
      const first = await seedDemoData(seedDb, "hash-demo", now);
      assert.equal(first, 2 + demoScenarioCount + 3 + 2);
      assert.equal(await seedDemoData(seedDb, "hash-demo", now), 0);
      const users = await seedDb.collection("users").find().toArray();
      assert.deepEqual(
        users.map((u) => u.email).sort(),
        ["trabajador2@vigia.demo", "trabajador3@vigia.demo"],
      );
      assert.ok(users.every((u) => u.password === "hash-demo"));
      const events = await seedDb.collection("events").find().toArray();
      assert.equal(events.length, demoScenarioCount);
      for (const e of events) {
        assert.ok(new Date(e.date).getTime() <= now);
        assert.ok(e.history.every((h) => new Date(h.date).getTime() <= now));
        assert.equal(e.history[0].text, "Evento registrado");
        if (e.status !== "Reportado") assert.ok(e.verification);
        if (e.correctiveActions.length) assert.ok(e.investigation);
        if (e.status === "Cerrado")
          assert.ok(
            e.correctiveActions.every(
              (a) => a.status === "Completada" && a.evidence,
            ),
          );
      }
      const closed = events.find((e) => e.id === "SST-DEMO-004");
      assert.equal(closed.status, "Cerrado");
      assert.equal(closed.closedBy, "Daniel Rojas");
      assert.equal(closed.people[0].kind, "Afectado");
      const reports = await seedDb
        .collection("accidentReports")
        .find()
        .toArray();
      assert.equal(reports.length, 3);
      for (const r of reports) {
        const event = events.find((e) => e.id === r.eventId);
        assert.equal(event.type, "Accidente");
        assert.equal(r.severity, event.verification.severity);
        assert.equal(r.owner, event.owner);
      }
      assert.deepEqual(
        reports.map((r) => r.status).sort(),
        ["Borrador", "Emitido", "Emitido"],
      );
      const complaints = await seedDb.collection("complaints").find().toArray();
      assert.deepEqual(
        complaints.map((c) => c.status).sort(),
        ["Radicada", "Respondida"],
      );
      await seedDb
        .collection("events")
        .updateOne({ id: "SST-DEMO-010" }, { $set: { title: "Editado" } });
      await seedDemoData(seedDb, "hash-demo", now);
      assert.equal(
        (await seedDb.collection("events").findOne({ id: "SST-DEMO-010" }))
          .title,
        "Editado",
      );
      await seedDb.dropDatabase();
    },
  );
  let worker, sst, admin, coordinator, id, privateId, fileId, complaintId;
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
    const adminProfile = await request("/me", "GET", null, admin);
    assert.equal(adminProfile.result.name, "Carlos Ramírez");
    assert.equal(adminProfile.result.role, "Administrador");
    assert.equal(adminProfile.result.password, undefined);
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
      (await request("/events/" + privateId + "/evidence", "GET", null, worker))
        .response.status,
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
  await t.test(
    "impide al administrador verificar e investigar eventos",
    async () => {
      for (const body of [
        { action: "classify", type: "Incidente", notes: "Prueba" },
        { action: "investigate", immediate: "A", basic: "B", conclusion: "C" },
      ])
        assert.equal(
          (await request("/events/" + id, "PATCH", body, admin)).response
            .status,
          403,
        );
    },
  );
  await t.test("impide al administrador elaborar informes", async () =>
    assert.equal(
      (await request("/events/" + id + "/report", "POST", {}, admin)).response
        .status,
      403,
    ),
  );
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
    assert.equal(r.result.verification.actor, "Daniel Rojas");
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
  let accidentId, reportVersion;
  const internalReport = {
    affectedWorker: "Persona ficticia",
    activity: "Manipulación de cargas",
    mechanism: "Caída al mismo nivel",
    injury: "Contusión",
    bodyPart: "Miembros inferiores",
    activityDetail: "Trasladaba cajas por el pasillo",
    verifiedDescription:
      "SST verificó el evento ficticio con la evidencia disponible.",
    immediateMeasures: "Aislar el área y solicitar valoración.",
  };
  await t.test(
    "trabajador y SST registran eventos sin generar informes",
    async () => {
      for (const cookie of [worker, sst]) {
        const r = await request(
          "/events",
          "POST",
          { ...event, type: "Accidente" },
          cookie,
        );
        assert.equal(r.response.status, 201);
        assert.equal(r.result.activityDescription, event.activityDescription);
        assert.equal(
          (
            await request(
              "/events/" + r.result.id + "/report",
              "GET",
              null,
              cookie,
            )
          ).result,
          null,
        );
        if (cookie === worker) accidentId = r.result.id;
      }
      assert.equal(
        (await request("/events", "POST", event, coordinator)).response.status,
        403,
      );
    },
  );
  await t.test(
    "el informe exige verificación previa y permiso SST",
    async () => {
      for (const cookie of [worker, coordinator])
        assert.equal(
          (
            await request(
              "/events/" + accidentId + "/report",
              "POST",
              internalReport,
              cookie,
            )
          ).response.status,
          403,
        );
      assert.equal(
        (
          await request(
            "/events/" + accidentId + "/report",
            "POST",
            internalReport,
            sst,
          )
        ).response.status,
        409,
      );
    },
  );
  await t.test(
    "valida gravedad de accidente y no la admite en un incidente",
    async () => {
      for (const severity of [undefined, "Muy grave", "", "Severo"])
        assert.equal(
          (
            await request(
              "/events/" + accidentId,
              "PATCH",
              {
                action: "classify",
                type: "Accidente",
                notes: "Prueba",
                severity,
              },
              sst,
            )
          ).response.status,
          400,
        );
      const incident = await request("/events", "POST", event, worker);
      assert.equal(
        (
          await request(
            "/events/" + incident.result.id,
            "PATCH",
            {
              action: "classify",
              type: "Incidente",
              notes: "Prueba",
              severity: "Leve",
            },
            sst,
          )
        ).response.status,
        400,
      );
      assert.equal(
        (
          await request(
            "/events/" + incident.result.id,
            "PATCH",
            { action: "classify", type: "Incidente", notes: "Prueba" },
            sst,
          )
        ).response.status,
        200,
      );
    },
  );
  await t.test(
    "verifica accidentes leves, graves y mortales sin crear informes",
    async () => {
      for (const severity of ["Leve", "Grave", "Mortal"]) {
        let target = accidentId;
        if (severity !== "Leve")
          target = (
            await request(
              "/events",
              "POST",
              { ...event, type: "Accidente" },
              sst,
            )
          ).result.id;
        const r = await request(
          "/events/" + target,
          "PATCH",
          {
            action: "classify",
            type: "Accidente",
            severity,
            notes: "Clasificación de prueba respaldada por datos ficticios.",
          },
          sst,
        );
        assert.equal(r.response.status, 200);
        assert.equal(r.result.verification.severity, severity);
        assert.equal(
          (await request("/events/" + target + "/report", "GET", null, sst))
            .result,
          null,
        );
      }
    },
  );
  await t.test(
    "un incidente investigado no genera informe de accidente",
    async () => {
      assert.equal(
        (
          await request(
            "/events/" + id + "/report",
            "POST",
            internalReport,
            sst,
          )
        ).response.status,
        409,
      );
      const current = (await request("/events", "GET", null, sst)).result.find(
        (r) => r.id === id,
      );
      assert.ok(current.investigation);
    },
  );
  await t.test(
    "valida campos del informe y catálogos en el servidor",
    async () => {
      for (const invalid of [
        { ...internalReport, activity: "No existe" },
        { ...internalReport, verifiedDescription: "" },
        { ...internalReport, injury: "" },
      ])
        assert.equal(
          (
            await request(
              "/events/" + accidentId + "/report",
              "POST",
              invalid,
              sst,
            )
          ).response.status,
          400,
        );
    },
  );
  await t.test(
    "crea un único borrador incluso ante solicitudes simultáneas",
    async () => {
      const results = await Promise.all([
        request(
          "/events/" + accidentId + "/report",
          "POST",
          internalReport,
          sst,
        ),
        request(
          "/events/" + accidentId + "/report",
          "POST",
          internalReport,
          sst,
        ),
      ]);
      assert.deepEqual(
        results.map((r) => r.response.status).sort(),
        [201, 409],
      );
      const report = results.find((r) => r.response.status === 201).result;
      assert.equal(report.status, "Borrador");
      assert.equal(report.eventId, accidentId);
      assert.equal(report.severity, "Leve");
      assert.equal(report.authorId, "sst");
      reportVersion = report.version;
    },
  );
  await t.test(
    "el informe conserva un relato verificado separado de la declaración inicial",
    async () => {
      const report = (
        await request("/events/" + accidentId + "/report", "GET", null, worker)
      ).result;
      const current = (
        await request("/events", "GET", null, worker)
      ).result.find((r) => r.id === accidentId);
      assert.equal(current.description, event.description);
      assert.equal(current.status, "En investigación");
      assert.equal(current.history.length, 2);
      assert.equal(
        report.verifiedDescription,
        internalReport.verifiedDescription,
      );
      assert.notEqual(report.verifiedDescription, current.description);
    },
  );
  await t.test(
    "el trabajador no puede editar ni emitir el informe",
    async () => {
      assert.equal(
        (
          await request(
            "/events/" + accidentId + "/report",
            "PUT",
            { ...internalReport, version: reportVersion },
            worker,
          )
        ).response.status,
        403,
      );
      assert.equal(
        (
          await request(
            "/events/" + accidentId + "/report/finalize",
            "POST",
            { version: reportVersion },
            worker,
          )
        ).response.status,
        403,
      );
    },
  );
  await t.test(
    "controla versiones al actualizar y emitir borradores",
    async () => {
      const updated = await request(
        "/events/" + accidentId + "/report",
        "PUT",
        {
          ...internalReport,
          version: reportVersion,
          immediateMeasures: "Área señalizada; valoración solicitada.",
        },
        sst,
      );
      assert.equal(updated.response.status, 200);
      assert.equal(updated.result.history.length, 2);
      assert.equal(
        (
          await request(
            "/events/" + accidentId + "/report",
            "PUT",
            { ...internalReport, version: reportVersion },
            sst,
          )
        ).response.status,
        409,
      );
      assert.equal(
        (
          await request(
            "/events/" + accidentId + "/report/finalize",
            "POST",
            { version: reportVersion },
            sst,
          )
        ).response.status,
        409,
      );
      reportVersion = updated.result.version;
    },
  );
  await t.test(
    "emite el informe sin cerrar el evento y protege el documento emitido",
    async () => {
      const r = await request(
        "/events/" + accidentId + "/report/finalize",
        "POST",
        { version: reportVersion },
        sst,
      );
      assert.equal(r.response.status, 200);
      assert.equal(r.result.status, "Emitido");
      assert.ok(r.result.issuedAt);
      assert.equal(r.result.issuedBy, "Daniel Rojas");
      assert.equal(
        (
          await request(
            "/events/" + accidentId + "/report",
            "PUT",
            { ...internalReport, version: r.result.version },
            sst,
          )
        ).response.status,
        409,
      );
      assert.equal(
        (
          await request(
            "/events/" + accidentId + "/report/finalize",
            "POST",
            { version: r.result.version },
            sst,
          )
        ).response.status,
        409,
      );
      assert.equal(
        (await request("/events", "GET", null, worker)).result.find(
          (r) => r.id === accidentId,
        ).status,
        "En investigación",
      );
    },
  );
  await t.test(
    "la consulta de informes respeta propietario y roles",
    async () => {
      const created = await request(
        "/events",
        "POST",
        { ...event, type: "Accidente" },
        sst,
      );
      await request(
        "/events/" + created.result.id,
        "PATCH",
        {
          action: "classify",
          type: "Accidente",
          severity: "Leve",
          notes: "Prueba",
        },
        sst,
      );
      assert.equal(
        (
          await request(
            "/events/" + created.result.id + "/report",
            "POST",
            internalReport,
            sst,
          )
        ).response.status,
        201,
      );
      assert.equal(
        (
          await request(
            "/events/" + created.result.id + "/report",
            "GET",
            null,
            worker,
          )
        ).response.status,
        403,
      );
      const own = (await request("/accident-reports", "GET", null, worker))
        .result;
      assert.equal(own.length, 1);
      assert.equal(own[0].eventId, accidentId);
      assert.equal(
        (await request("/accident-reports", "GET", null, coordinator)).result
          .length,
        2,
      );
    },
  );

  await t.test("radica quejas y reclamos con plazo de respuesta", async () => {
    const queja = {
      type: "Queja",
      subject: "Demora en la revisión",
      description: "El evento lleva varios días sin verificación.",
      eventId: id,
    };
    for (const body of [
      { ...queja, type: "Petición" },
      { ...queja, subject: "" },
      { ...queja, eventId: "SST-NO-EXISTE" },
    ])
      assert.equal(
        (await request("/complaints", "POST", body, worker)).response.status,
        400,
      );
    const r = await request("/complaints", "POST", queja, worker);
    assert.equal(r.response.status, 201);
    assert.match(r.result.id, /^QR-/);
    assert.equal(r.result.status, "Radicada");
    assert.equal(r.result.eventId, id);
    assert.ok(Date.parse(r.result.dueDate) > Date.parse(r.result.createdAt));
    complaintId = r.result.id;
  });
  await t.test(
    "muestra cada queja solo a su autor y a quien responde",
    async () => {
      const reclamo = {
        type: "Reclamo",
        subject: "Consulta de mis eventos",
        description: "No encuentro la evidencia que adjunté.",
      };
      assert.equal(
        (await request("/complaints", "POST", reclamo, coordinator)).response
          .status,
        201,
      );
      const own = (await request("/complaints", "GET", null, worker)).result;
      assert.deepEqual(
        own.map((c) => c.id),
        [complaintId],
      );
      for (const cookie of [sst, admin])
        assert.equal(
          (await request("/complaints", "GET", null, cookie)).result.length,
          2,
        );
    },
  );
  await t.test("solo SST o el administrador responden una vez", async () => {
    const answer = { response: "Se priorizó la verificación del evento." };
    for (const cookie of [worker, coordinator])
      assert.equal(
        (await request("/complaints/" + complaintId, "PATCH", answer, cookie))
          .response.status,
        403,
      );
    const r = await request("/complaints/" + complaintId, "PATCH", answer, sst);
    assert.equal(r.response.status, 200);
    assert.equal(r.result.status, "Respondida");
    assert.equal(r.result.response.actor, "Daniel Rojas");
    assert.equal(
      (await request("/complaints/" + complaintId, "PATCH", answer, admin))
        .response.status,
      409,
    );
    assert.equal(
      (await request("/complaints/QR-NOEXISTE", "PATCH", answer, sst)).response
        .status,
      404,
    );
  });
  let actionEventId, actionId;
  await t.test(
    "exige verificación e investigación antes de asignar acciones",
    async () => {
      const created = await request("/events", "POST", event, worker);
      assert.equal(created.response.status, 201);
      actionEventId = created.result.id;
      const action = {
        description: "Señalizar el pasillo del almacén",
        responsible: "Jefe de almacén",
        dueDate: "2026-12-15",
      };
      assert.equal(
        (
          await request(
            "/events/" + actionEventId + "/actions",
            "POST",
            action,
            sst,
          )
        ).response.status,
        409,
      );
      const verified = await request(
        "/events/" + actionEventId,
        "PATCH",
        {
          action: "classify",
          type: "Incidente",
          notes: "Incidente confirmado en la inspección.",
        },
        sst,
      );
      assert.equal(verified.response.status, 200);
      assert.equal(verified.result.status, "En investigación");
      assert.equal(
        (
          await request(
            "/events/" + actionEventId + "/actions",
            "POST",
            action,
            sst,
          )
        ).response.status,
        409,
      );
      const investigated = await request(
        "/events/" + actionEventId,
        "PATCH",
        {
          action: "investigate",
          immediate: "Cajas apiladas en zona de tránsito.",
          basic: "No existe demarcación del pasillo.",
          conclusion: "Se requiere demarcar y señalizar el pasillo.",
        },
        sst,
      );
      assert.equal(investigated.response.status, 200);
      assert.equal(
        (
          await request(
            "/events/" + actionEventId + "/close",
            "POST",
            {},
            sst,
          )
        ).response.status,
        409,
      );
    },
  );
  await t.test(
    "solo SST asigna acciones y valida responsable y fecha límite",
    async () => {
      const path = "/events/" + actionEventId + "/actions";
      const action = {
        description: "Señalizar el pasillo del almacén",
        responsible: "Jefe de almacén",
        dueDate: "2026-12-15",
      };
      for (const cookie of [worker, coordinator, admin])
        assert.equal(
          (await request(path, "POST", action, cookie)).response.status,
          403,
        );
      for (const invalid of [
        { ...action, responsible: "" },
        { ...action, description: "" },
        { ...action, dueDate: "mañana" },
        { ...action, dueDate: "2026-02-30" },
        { ...action, dueDate: undefined },
      ])
        assert.equal(
          (await request(path, "POST", invalid, sst)).response.status,
          400,
        );
      const r = await request(path, "POST", action, sst);
      assert.equal(r.response.status, 201);
      assert.match(r.result.id, /^AC-/);
      assert.equal(r.result.status, "Pendiente");
      assert.equal(r.result.responsible, "Jefe de almacén");
      assert.equal(r.result.evidence, "");
      assert.equal(r.result.history.length, 1);
      actionId = r.result.id;
    },
  );
  await t.test(
    "actualiza el estado y exige evidencia para completar la acción",
    async () => {
      const path = "/events/" + actionEventId + "/actions/" + actionId;
      assert.equal(
        (await request(path, "PATCH", { status: "En curso" }, worker)).response
          .status,
        403,
      );
      assert.equal(
        (await request(path, "PATCH", { status: "Archivada" }, sst)).response
          .status,
        400,
      );
      assert.equal(
        (
          await request(
            "/events/" + actionEventId + "/actions/AC-NOEXISTE",
            "PATCH",
            { status: "En curso" },
            sst,
          )
        ).response.status,
        404,
      );
      const progress = await request(path, "PATCH", { status: "En curso" }, sst);
      assert.equal(progress.response.status, 200);
      assert.equal(progress.result.status, "En curso");
      assert.equal(
        (await request(path, "PATCH", { status: "Completada" }, sst)).response
          .status,
        400,
      );
      assert.equal(
        (
          await request(
            "/events/" + actionEventId + "/close",
            "POST",
            {},
            sst,
          )
        ).response.status,
        409,
      );
      const done = await request(
        path,
        "PATCH",
        {
          status: "Completada",
          evidence: "Registro fotográfico de la demarcación instalada.",
        },
        sst,
      );
      assert.equal(done.response.status, 200);
      assert.equal(done.result.status, "Completada");
      assert.equal(
        done.result.evidence,
        "Registro fotográfico de la demarcación instalada.",
      );
      assert.equal(done.result.history.length, 3);
    },
  );
  await t.test(
    "solo SST cierra el evento y después no admite cambios",
    async () => {
      const base = "/events/" + actionEventId;
      for (const cookie of [worker, coordinator, admin])
        assert.equal(
          (await request(base + "/close", "POST", {}, cookie)).response.status,
          403,
        );
      const closed = await request(base + "/close", "POST", {}, sst);
      assert.equal(closed.response.status, 200);
      assert.equal(closed.result.status, "Cerrado");
      assert.equal(closed.result.closedBy, "Daniel Rojas");
      assert.ok(closed.result.closedAt);
      assert.equal(
        closed.result.history.at(-1).text,
        "Evento cerrado tras completar las acciones correctivas",
      );
      assert.equal(
        (await request(base + "/close", "POST", {}, sst)).response.status,
        409,
      );
      assert.equal(
        (
          await request(
            base,
            "PATCH",
            {
              action: "investigate",
              immediate: "Cambio tardío",
              basic: "Cambio tardío",
              conclusion: "Cambio tardío",
            },
            sst,
          )
        ).response.status,
        409,
      );
      assert.equal(
        (
          await request(
            base + "/actions",
            "POST",
            {
              description: "Acción tardía",
              responsible: "Jefe de almacén",
              dueDate: "2026-12-20",
            },
            sst,
          )
        ).response.status,
        409,
      );
      assert.equal(
        (
          await request(
            base + "/actions/" + actionId,
            "PATCH",
            { status: "En curso" },
            sst,
          )
        ).response.status,
        409,
      );
      const list = await request("/events", "GET", null, worker);
      assert.equal(
        list.result.find((item) => item.id === actionEventId).status,
        "Cerrado",
      );
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
