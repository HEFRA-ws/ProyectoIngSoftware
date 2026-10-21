export const DEMO_ADMIN_NAME = "Carlos Ramírez";

export async function migrateDemoAdminName(db) {
  await db.collection("users").updateOne(
    {
      id: "admin",
      email: "admin@vigia.demo",
      role: "Administrador",
      name: "Administrador",
    },
    { $set: { name: DEMO_ADMIN_NAME } },
  );
}

export async function migrateLegacyEvents(db) {
  const names = (
    await db.listCollections({}, { nameOnly: true }).toArray()
  ).map((collection) => collection.name);
  if (names.includes("reports")) {
    if (names.includes("events")) {
      throw Error(
        "Existen reports y events. Revisa la migración antes de iniciar; no se sobrescribieron datos.",
      );
    }
    await db.collection("reports").rename("events");
  }
  await db
    .collection("evidence")
    .updateMany(
      { reportId: { $exists: true }, eventId: { $exists: false } },
      { $rename: { reportId: "eventId" } },
    );
}
