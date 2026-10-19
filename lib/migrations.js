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
