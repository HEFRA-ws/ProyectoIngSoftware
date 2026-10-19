# Correcciones derivadas de la revisión del prototipo

Fecha de registro: 18 de octubre de 2026. Origen: retroalimentación del profesor comunicada por el equipo. No hubo una entrega formal anterior; estas son observaciones sobre la revisión del prototipo.

| Observación | Cambio implementado | Evidencia |
| --- | --- | --- |
| Registrar un suceso y elaborar un informe son cosas distintas | Eventos e informes en colecciones y pantallas diferentes | HU02, HU13; prueba sin informe automático |
| Trabajador y SST deben registrar accidentes/incidentes | Formulario de evento con actividad y declaración inicial para ambos roles | Prueba de creación con ambos roles |
| SST debe verificar antes de elaborar el informe | Confirmación de tipo, observaciones y gravedad para accidente | HU06; rechazo 409 sin verificación |
| El informe corresponde al accidente | Informe permitido solo en accidente verificado; incidentes mantienen investigación | Rechazo de informe para incidente |
| Aclarar gravedad del accidente | Opciones internas Leve, Grave y Mortal; selección por SST con soportes | Pruebas de categorías y rechazo de Muy grave |

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
