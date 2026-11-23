# Correcciones derivadas de la revisión del prototipo

Fecha de registro: 18 de octubre de 2026. Origen: retroalimentación del profesor comunicada por el equipo. No hubo una entrega formal anterior; estas son observaciones sobre la revisión del prototipo.

| Observación | Cambio implementado | Evidencia |
| --- | --- | --- |
| Registrar un suceso y elaborar un informe son cosas distintas | Eventos e informes en colecciones y pantallas diferentes | HU02, HU13; prueba sin informe automático |
| La revisión inicial había permitido registrar a trabajador y SST | Tras contrastarlo con HU02, solo el trabajador crea el reporte; SST verifica, investiga y lo gestiona; coordinación y administración consultan sin alterar eventos | HU02–HU08 y permisos por rol de la API |
| SST debe verificar antes de elaborar el informe | Confirmación de tipo, observaciones y gravedad para accidente | HU06; rechazo 409 sin verificación |
| El informe corresponde al accidente | Informe permitido solo en accidente verificado; incidentes mantienen investigación | Rechazo de informe para incidente |
| Aclarar gravedad del accidente | Opciones internas Leve, Grave y Mortal; selección por SST con soportes | Pruebas de categorías y rechazo de Muy grave |

## Roles y separación de responsabilidades

La observación inicial permitió que trabajador y SST registraran eventos. Al contrastarla con HU02 y separar el reporte de su gestión, la decisión actual es que solo el trabajador crea el evento y aporta evidencia. El Profesional SST se encarga de verificarlo, investigarlo, asignar acciones correctivas y elaborar el informe interno. El coordinador y el administrador consultan los casos; las funciones de administración de usuarios siguen pendientes. El trabajador conserva consulta de sus casos e informes, pero no puede clasificarlos, investigarlos, emitir informes ni cerrarlos.

## Decisiones propuestas por el equipo

El profesor no especificó un formato ni los campos del informe. Se implementó un informe interno académico con trabajador afectado, actividad, mecanismo, lesión, parte del cuerpo, descripción verificada y medidas inmediatas. Sus estados Borrador y Emitido y la regla de un informe por accidente son decisiones del prototipo para revisar con el profesor.

No se denomina FURAT. No se afirma que un incidente carezca de investigación: se mantiene para accidentes e incidentes.

## Fuentes consultadas para el diseño

- [Resolución 1401 de 2007: definiciones e investigación de accidentes e incidentes](https://www.cancilleria.gov.co/normograma/compilacion/docs/resolucion_minproteccion_1401_2007.htm).
- [Procedimiento de Idartes: clasificación leve, grave o mortal](https://comunicarte.idartes.gov.co/sites/default/files/Doc_SIG/SST-PD-03_V1_PROCEDIMIENTOPARALAGESTIONDEINCIDENTESYACCIDENTESDETRABAJO.pdf).

Las categorías sirven al diseño del prototipo y la gravedad se registra por el profesional con información disponible; el software no hace diagnóstico médico ni certifica cumplimiento normativo.

## Seguimiento

- [Issue #9: separar evento e informe](https://github.com/HEFRA-ws/ProyectoIngSoftware/issues/9).
- [Issue #10: verificación e informe](https://github.com/HEFRA-ws/ProyectoIngSoftware/issues/10).
- [Issue #11: documentación](https://github.com/HEFRA-ws/ProyectoIngSoftware/issues/11).

Commits funcionales: b13cf20 para la separación y migración; dd9bb47 para verificación e informe. Las pruebas y su resultado están descritos en Calidad.

## Ajustes finales del 22 de noviembre de 2026

- Regla de roles confirmada por el equipo: solo el trabajador registra y adjunta evidencia. SST verifica, investiga, elabora informes y gestiona acciones y cierre. Se corrigieron las tablas y los diagramas que conservaban permisos anteriores.
- Se impide cerrar un accidente sin informe interno Emitido. El cierre de incidentes no exige este informe.
- Se rechazan nuevos adjuntos después del cierre, tanto en la interfaz como en la API.
- La investigación de un caso cerrado se muestra en consulta y el indicador de investigaciones abiertas excluye los casos Cerrados.
- Los ejemplos antiguos no reciben una verificación inventada. La reparación acotada de una fecha automática inválida conserva una entrada de historial.
- Se conserva la evidencia de pruebas aportada por el equipo y se distingue su versión de las regresiones automatizadas finales.

- Revisión final: registro e inicio con Google activados y probados en Render; enlace de privacidad público. La interfaz nombra el botón «Iniciar sesión con Google» y aclara la creación automática de una cuenta Trabajador.
- Error detectado en QA: el vencimiento de quejas radicadas de noche usaba días de UTC. Se corrigió el cálculo para Colombia y se añadieron regresiones de cambio de día; no se reescriben plazos históricos.
