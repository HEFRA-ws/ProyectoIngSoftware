export function optionalAge(value) {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 120)
    throw Object.assign(Error("La edad debe ser un número entero entre 0 y 120."), { status: 400 });
  return value;
}

export function reportPersonDefaults(event) {
  const person = (event.people || []).find((p) => p.kind === "Afectado");
  return {
    affectedWorker: person?.name || "",
    affectedDocument: person?.document || "",
    affectedContact: person?.contact || "",
    affectedAge: person?.age,
    activityDetail: event.activityDescription || "",
  };
}
