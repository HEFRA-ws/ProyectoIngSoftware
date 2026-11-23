# Calidad y evidencia de validación

Versión 1.0 (entrega final). Objetivo: proteger la declaración inicial, separar eventos e informes, verificar las operaciones por rol y comprobar el producto desplegado.

## Criterios de terminado

Cumplir criterios de aceptación, validar entradas en servidor, aplicar permisos, pasar pruebas relacionadas, revisar interfaz y actualizar documentación. Las historias parciales conservan sus pendientes.

## 1. Pruebas automatizadas de integración

Ejecución: `pnpm test`. Archivos: `test/api.test.js` y `test/google-auth.test.js`. Cada ejecución levanta bases MongoDB aisladas y servidores en puertos temporales; no utiliza la base de la demostración ni la de Atlas.

La suite contiene **63 casos de comprobación** agrupados en dos pruebas principales; Node Test Runner informa **65 pruebas** contando los grupos. GitHub Actions (`.github/workflows/quality.yml`) ejecuta `node --check` y `pnpm test` en cada push a `main` y en cada pull request. Los 18 casos del grupo Google verifican firmas RSA y el flujo con proveedor simulado; no equivalen a una autorización real en producción.

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
| Cierre del evento | Solo SST cierra; rechazo sin acciones o con acciones pendientes; un evento cerrado no admite investigación, acciones, nuevos adjuntos ni cambios de estado; los accidentes requieren informe Emitido antes del cierre |
| Datos de demostración | Precarga coherente con las reglas de la API, fechas no futuras, sin duplicados y sin sobrescribir cambios del usuario; reparación acotada de fecha en un ejemplo antiguo, con registro en historial |
| Seguridad HTTP | Rechazo de solicitudes de otro origen |

## 2. Pruebas manuales sobre el producto desplegado

URL oficial probada: `https://vigia-sst-io46.onrender.com` (Render, región Virginia, base en MongoDB Atlas). Fecha: 22 de noviembre de 2026. Responsable: Juan Esteban Aponte. Las pruebas M1–M8 y M12–M14 se ejecutaron sobre el despliegue con datos precargados, antes del ajuste de permisos del PR #12 (solo el trabajador registra eventos y adjunta evidencia), que queda cubierto por las pruebas automatizadas.

| # | Caso | Pasos | Resultado esperado | Resultado | Evidencia |
| --- | --- | --- | --- | --- | --- |
| M1 | Salud del servicio | Abrir `/api/health` | Responde `{"status":"ok"}` | OK | [final-01](imagenes/final-01-health.png) |
| M2 | Login por rol | Iniciar sesión con distintas cuentas | Cada rol entra y ve su menú | OK (trabajador, trabajador2, coordinador y SST; administrador no se probó en esta ronda) | [final-05](imagenes/final-05-aislamiento-trabajador2.png), [final-06](imagenes/final-06-coordinador-lista.png) |
| M3 | Credenciales erróneas | Contraseña incorrecta | Mensaje genérico, sin entrar | OK | [final-02](imagenes/final-02-login-incorrecto.png) |
| M4 | Registro de evento | Trabajador registra un accidente ficticio con una persona afectada | Se crea con código `SST-…` y estado Reportado | OK (`SST-843F4001AD`) | [final-04](imagenes/final-04-evento-registrado.png) |
| M5 | Aislamiento | `trabajador2` abre el listado de eventos | Solo aparecen sus propios eventos | OK (2 eventos propios; no ve los de otros trabajadores) | [final-05](imagenes/final-05-aislamiento-trabajador2.png) |
| M6 | Verificación e investigación | SST verifica como Leve y registra causas | Estado En investigación e historial actualizado | OK | [final-08](imagenes/final-08-verificacion-investigacion.png) |
| M7 | Informe SST | SST crea borrador y lo emite | Informe Emitido; el evento sigue abierto | No ejecutada en esta ronda; cubierta por pruebas automatizadas y visible en los informes precargados | — |
| M8 | Acciones correctivas y cierre | SST asigna una acción, la completa con evidencia y cierra el evento | Evento Cerrado; ya no admite cambios | OK | [final-09](imagenes/final-09-acciones-y-cierre.png) |
| M9 | Permisos por rol | Coordinador intenta registrar un evento | La API lo rechaza | OK ("El coordinador tiene acceso de consulta", versión previa al PR #12) | [final-07](imagenes/final-07-coordinador-bloqueado.png) |
| M10 | Evidencia | Adjuntar un PNG o PDF de menos de 2 MB y descargarlo | Se lista y se descarga | No ejecutada en esta ronda; cubierta por pruebas automatizadas | — |
| M11 | Quejas y reclamos | Trabajador radica; SST responde | Plazo visible y respuesta registrada | No ejecutada en esta ronda; cubierta por pruebas automatizadas y datos precargados | — |
| M12 | Persistencia en Atlas | Registrar un evento, redesplegar el servicio en Render y volver a entrar | Los datos creados siguen disponibles | OK (`SST-843F4001AD` registrado a las 19:00 sigue disponible tras el redespliegue de las 19:49) | [final-06](imagenes/final-06-coordinador-lista.png), [final-10](imagenes/final-10-persistencia.png) |
| M13 | Cookie segura | Revisar la cookie `session` en las herramientas del navegador | Marcada `HttpOnly` y `Secure` | No ejecutada en esta ronda; `HttpOnly` cubierta por pruebas automatizadas | — |
| M14 | Cierre de sesión | Salir y volver a entrar con otro rol | Vuelve a pedir inicio de sesión | OK | — |

Capturas de evidencia: `docs/imagenes/` (prefijo `final-`).

## Revisión final del 22 de noviembre de 2026

Se ejecutaron 44 pruebas locales sobre MongoDB aislado. La regresión del cierre comprueba el rechazo sin informe, con borrador y la aceptación con informe Emitido. Otra comprobación impide adjuntar después del cierre. La precarga no inventa verificación para el ejemplo antiguo y repara su fecha automática incoherente con historial, sin reescribir verificaciones personalizadas. Estas comprobaciones no sustituyen la verificación del commit desplegado.

## Defectos y regresión

Ampliación de autenticación: 65 pruebas locales pasan después de añadir Google. La revisión de dependencias actualizó `body-parser` a 2.4.0 y `qs` a 6.16.1 dentro de los rangos compatibles de Express; `pnpm audit --prod` no informa vulnerabilidades conocidas en esa ejecución. La pantalla se revisó localmente con configuración ficticia de OAuth y se comprobó el acceso normal de trabajador. Esa primera ronda acreditó la interfaz y la regresión local; el acceso real en producción se completó después y se registra en la verificación final.

La primera ejecución en `main` detectó que las dos suites podían descargar simultáneamente el binario de MongoDB en una máquina nueva (`ENOENT` al renombrar la descarga). Se ajustó el comando de pruebas para ejecutar los archivos secuencialmente; se mantienen todas las comprobaciones y sus bases aisladas.

Prueba real adicional de Google (22 de noviembre, entorno local): se completó la selección de cuenta y la autorización del proveedor, se creó una cuenta Trabajador sin acceso a eventos ajenos y se comprobó salir y volver a entrar. El aviso `/privacidad.html` es accesible sin sesión. La comprobación local se completó después con la autorización real en Render, registrada en la sección de verificación final.

Revisión visual local final: el contador «En investigación» excluye los eventos Cerrados; en un ejemplo con diez eventos y dos cerrados muestra tres investigaciones abiertas. El detalle de un caso cerrado muestra la investigación en consulta, sin formulario de edición. Evidencias: [resumen local](imagenes/final-13-resumen-local.png), [caso cerrado local](imagenes/final-12-cierre-informe-local.png) y [listado local](imagenes/final-11-listado-local.png). Estas capturas no se atribuyen al despliegue de Render.

Se comprobó también la instalación de dependencias en un directorio nuevo con `pnpm install --frozen-lockfile --ignore-scripts`, usando Node.js 24 y pnpm 11.25.0. La instalación completó 114 paquetes sin modificar el lockfile. Esta comprobación no equivale a probar todos los sistemas operativos desde cero.

Issue #1: carga de evidencia del coordinador bloqueada en API y cubierta por regresión. Se conservan las pruebas negativas al añadir el informe independiente, las acciones correctivas y las quejas.

## Verificación final en la URL pública

Fecha: 22 de noviembre de 2026, 23:09 de Colombia. Despliegue comprobado: `0612796`. El registro [validacion-produccion-final.json](validacion-produccion-final.json) conserva **68 comprobaciones HTTP correctas**, independientes de las 65 pruebas aisladas. Incluye salud de MongoDB, Google habilitado, privacidad, acceso de los cuatro roles, aislamiento de trabajadores, cookies Secure/HttpOnly, consulta de informes y quejas, adjuntos y descarga, verificación e investigación, medidas, emisión de informe y cierre de sesión.

Los casos ficticios `SST-0626B0C900` (Incidente) y `SST-D0D6D00463` (Accidente) quedaron Cerrados. El incidente rechazó crear un informe de accidente; el accidente rechazó el cierre sin informe y con Borrador, y lo permitió después de emitirlo. Ambos rechazaron nuevos adjuntos tras cerrar. Se verificó también un acceso real con Google en Render, con rol Trabajador y sin casos ajenos. No se atribuyen estas comprobaciones a una prueba de carga ni a una auditoría de seguridad externa.

La [captura del accidente de validación en producción](imagenes/final-14-validacion-produccion.png) muestra el informe Emitido, la acción Completada y el estado Cerrado. Los nombres, el relato y la evidencia corresponden a una simulación académica.

La revisión detectó además un error de calendario en quejas radicadas de noche: el cálculo contaba días de UTC, mientras la interfaz usa Colombia. Se corrigió `responseDeadline` para contar días de Colombia (UTC-5), conservando el plazo interno de 15 días de lunes a viernes, sin calendario de festivos. La regresión cubre domingo y viernes de noche, y lunes de día. La corrección se aplica a las nuevas radicaciones; no modifica los plazos históricos. El cambio se comprobó después en el redespliegue final registrado a continuación.

### Comprobación después del redespliegue final

El 22 de noviembre a las 23:22 de Colombia se completaron **24 comprobaciones HTTP adicionales**, todas correctas, sobre el código funcional de `9fe790f`. El frontend publicado coincide con el del repositorio y muestra «Iniciar sesión con Google»; el reingreso real con Google también funcionó. Los dos casos Cerrados, sus adjuntos y el informe Emitido permanecieron disponibles tras el redespliegue.

El reclamo ficticio `QR-7E65CEA0` verificó radicación, aislamiento, rechazo de respuestas de trabajador y coordinador, respuesta SST y bloqueo de respuesta duplicada. El vencimiento se calculó para viernes en Colombia, confirmando la corrección del calendario en producción. El plazo interno cuenta lunes a viernes y no descuenta festivos. El reclamo quedó Respondido.

Evidencias: [registro de las 24 comprobaciones](validacion-redespliegue-final.json) y [pantalla final de Google en producción](imagenes/final-15-google-produccion.png). En total se conservaron 68 + 24 = **92 comprobaciones HTTP**, además de las 65 pruebas aisladas.

## Límites de la validación

Pendientes: carga de 50 usuarios, accesibilidad exhaustiva, antivirus, auditoría externa y respaldo/restauración. En el despliegue registrado en `eb06c78`, la limitación de intentos usa la IP del proxy de Render y puede compartir el bloqueo entre usuarios. La versión actualizada configura `trust proxy` a un salto y calcula la clave con `req.ip`; las pruebas de limitación pasan en Node.js 24; queda pendiente comprobar el aislamiento del límite desde varias IP reales. El cluster M0 de Atlas no incluye copias de seguridad automáticas y el usuario de base de datos de la demo tiene permisos amplios; en un entorno real se limitaría a `readWrite` sobre `vigia` y a las IP del servicio. El plan gratuito de Render suspende el servicio tras un periodo sin tráfico, por lo que la primera solicitud puede tardar cerca de un minuto. No se afirma 99 % de disponibilidad ni tiempos máximos medidos. La existencia del workflow no acredita éxito: comprobar cada ejecución en GitHub Actions.
