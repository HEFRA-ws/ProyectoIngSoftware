# Calidad y evidencia de validación

Versión 1.0 (entrega final). Objetivo: proteger la declaración inicial, separar eventos e informes, verificar las operaciones por rol y comprobar el producto desplegado.

## Criterios de terminado

Cumplir criterios de aceptación, validar entradas en servidor, aplicar permisos, pasar pruebas relacionadas, revisar interfaz y actualizar documentación. Las historias parciales conservan sus pendientes.

## 1. Pruebas automatizadas de integración

Ejecución: `pnpm test`. Archivo: `test/api.test.js`. Cada ejecución levanta una base MongoDB aislada y un servidor en un puerto temporal; no utiliza la base de la demostración ni la de Atlas.

La suite contiene **40 casos de comprobación** agrupados en una prueba principal; Node Test Runner informa **41 pruebas** contando el grupo. GitHub Actions (`.github/workflows/quality.yml`) ejecuta `node --check` y `pnpm test` en cada push a `main` y en cada pull request.

| Área | Evidencia |
| --- | --- |
| Migración | Conserva código, declaración e historial; cambia referencia de evidencia; repetición idempotente; corrige el nombre del administrador demo |
| Autenticación | Sesión obligatoria, credenciales incorrectas sin revelar usuarios, cuatro roles sin exponer hashes, cookie HttpOnly, limitación de intentos y cierre de sesión |
| Evento | Campos, fecha válida no futura, personas, código, actividad e historial |
| Propiedad y permisos | Solo el trabajador registra eventos y adjunta evidencia; consulta sus casos. SST tramita; coordinador y administrador consultan. Acciones operativas protegidas en API |
| Verificación | Solo SST; Leve, Grave, Mortal; rechazo de Muy grave y de gravedad en incidentes |
| Investigación | Verificación previa y persistencia de causas e historial para ambos tipos |
| Informe | No se crea automáticamente; exige accidente verificado; validación de catálogos y campos |
| Concurrencia | Creación simultánea produce un informe y un conflicto; versiones obsoletas devuelven 409 |
| Emisión | Documento Emitido protegido; no cierra evento ni reemplaza declaración |
| Evidencia | Tamaño y cabecera, metadatos, descarga autorizada y bloqueo al coordinador |
| Quejas y reclamos | Radicación con plazo de 15 días hábiles; cada solicitud visible solo para su autor y responsables; respuesta única por SST o administrador |
| Acciones correctivas | Exigen evento verificado e investigado; solo SST asigna y actualiza; validan responsable, descripción y fecha límite; completar exige evidencia; historial propio de la acción |
| Cierre del evento | Solo SST cierra; rechazo sin acciones o con acciones pendientes; un evento cerrado no admite investigación, acciones ni cambios de estado |
| Datos de demostración | Precarga coherente con las reglas de la API, fechas no futuras, sin duplicados y sin sobrescribir cambios |
| Seguridad HTTP | Rechazo de solicitudes de otro origen |

## 2. Pruebas manuales sobre el producto desplegado

URLs revisadas: `https://vigia-sst-io46.onrender.com` (despliegue documentado, commit `eb06c78`) y `https://vigia-sst.onrender.com`. El 22 de noviembre de 2026, `/api/health` respondió `{"status":"ok"}` en ambas y cargó la pantalla de acceso. Responsable de la verificación funcional completa: `PENDIENTE`.

| # | Caso | Pasos | Resultado esperado | Resultado |
| --- | --- | --- | --- | --- |
| M1 | Salud del servicio | Abrir `/api/health` | Responde `{"status":"ok"}` | OK · 2026-11-22 |
| M2 | Login por rol | Iniciar sesión con trabajador, SST, coordinador y administrador | Cada rol entra y ve su menú | ☐ |
| M3 | Credenciales erróneas | Contraseña incorrecta | Mensaje genérico, sin entrar | ☐ |
| M4 | Registro de evento | Trabajador registra un accidente ficticio con una persona afectada | Se crea con código `SST-…` y estado Reportado | ☐ |
| M5 | Aislamiento | Un segundo trabajador o el listado del trabajador | Solo aparecen sus propios eventos | ☐ |
| M6 | Verificación e investigación | SST verifica como Leve y registra causas | Estado En investigación e historial actualizado | ☐ |
| M7 | Informe SST | SST crea borrador y lo emite | Informe Emitido; el evento sigue abierto | ☐ |
| M8 | Acciones correctivas | SST asigna una acción, la completa con evidencia y cierra el evento | Evento Cerrado; ya no admite cambios | ☐ |
| M9 | Permisos por rol | Solo el trabajador registra y adjunta evidencia; SST tramita; coordinador y administrador consultan | API e interfaz respetan la matriz | ☐ |
| M10 | Evidencia | Adjuntar un PNG o PDF de menos de 2 MB y descargarlo | Se lista y se descarga | ☐ |
| M11 | Quejas y reclamos | Trabajador radica; SST responde | Plazo visible y respuesta registrada | ☐ |
| M12 | Persistencia en Atlas | Reiniciar el servicio en Render y volver a entrar | Los datos creados siguen disponibles | ☐ |
| M13 | Cookie segura | Revisar la cookie `session` en las herramientas del navegador | Marcada `HttpOnly` y `Secure` | ☐ |
| M14 | Cierre de sesión | Salir y recargar | Vuelve a pedir inicio de sesión | ☐ |

Capturas de evidencia: `docs/imagenes/` (prefijo `final-`).

## Defectos y regresión

Issue #1: carga de evidencia del coordinador bloqueada en API y cubierta por regresión. Se conservan las pruebas negativas al añadir el informe independiente, las acciones correctivas y las quejas.

## Límites

Pendientes: carga de 50 usuarios, accesibilidad exhaustiva, antivirus, auditoría externa y respaldo/restauración. En el despliegue registrado en `eb06c78`, la limitación de intentos usa la IP del proxy de Render y puede compartir el bloqueo entre usuarios. La versión actualizada configura `trust proxy` a un salto y calcula la clave con `req.ip`; falta probarla con Node 24 y verificarla después del despliegue. El cluster M0 de Atlas no incluye copias de seguridad automáticas y el usuario de base de datos de la demo tiene permisos amplios; en un entorno real se limitaría a `readWrite` sobre `vigia` y a las IP del servicio. El plan gratuito de Render suspende el servicio tras un periodo sin tráfico, por lo que la primera solicitud puede tardar cerca de un minuto. No se afirma 99 % de disponibilidad ni tiempos máximos medidos. La existencia del workflow no acredita éxito: comprobar cada ejecución en GitHub Actions.
