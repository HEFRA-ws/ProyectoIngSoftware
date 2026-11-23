# Entrega final de Vigía SST

Fecha de entrega: 22 de noviembre de 2026, antes de las 23:59:59 de Colombia. No publicar commits después de esa hora. Las instrucciones del curso fijan el plazo y la evaluación.

## Enlaces de entrega

| Elemento | Enlace |
| --- | --- |
| Aplicación oficial | https://vigia-sst-io46.onrender.com |
| Repositorio | https://github.com/HEFRA-ws/ProyectoIngSoftware |
| Wiki | https://github.com/HEFRA-ws/ProyectoIngSoftware/wiki |
| Instalación en otro computador | [README](../README.md#guía-de-instalación-en-un-computador-nuevo) |
| Arquitectura final | [Arquitectura](Arquitectura.md) |
| Diagramas | [Clases, secuencias y E-R](Diagramas.md) |
| Pruebas y evidencias | [Calidad](Calidad.md) |
| Presentación final | [Diapositivas](Presentacion-Final-Vigia-SST.pptx) |
| Presentación en PDF | [Lectura sin PowerPoint](Presentacion-Final-Vigia-SST.pdf) |
| GCS fuera de la wiki | [PDF de gestión de configuración](GCS.pdf) |

## Producto y alcance

La aplicación funciona con Node.js y Express en Render y MongoDB Atlas. El trabajador registra accidentes e incidentes y adjunta evidencia a sus eventos abiertos. SST verifica e investiga, elabora informes internos de accidentes y gestiona acciones correctivas y cierre. Coordinador y administrador consultan los eventos. SST y administrador responden quejas y reclamos.

El informe se mantiene separado de la declaración inicial. Un accidente requiere su informe Emitido antes del cierre. Los incidentes conservan investigación y acciones sin informe de accidente. Un caso cerrado no admite nuevas investigaciones, cambios en acciones ni adjuntos.

Las cuentas de demostración aparecen en el README. El equipo debe entregar al profesor la contraseña vigente por el canal privado de entrega. Nunca publicar `.env` ni credenciales de Atlas. Los datos precargados son ficticios.

## Validación

La revisión local ejecuta 44 pruebas automatizadas (43 casos y el grupo principal) con MongoDB aislado. Calidad conserva los resultados manuales y capturas aportados por el equipo sobre el despliegue, indicando las comprobaciones no ejecutadas. El endpoint de salud comprueba conexión a MongoDB, pero por sí solo no prueba todos los roles ni el flujo completo.

Las comprobaciones del código corregido y las de producción deben registrar su commit y su resultado por separado. La existencia del workflow no equivale a una ejecución exitosa ni a un despliegue automático. Véase [Despliegue](Despliegue.md).

## Límites conservados

Pendientes: notificaciones, estadísticas avanzadas, exportación de informes, administración completa de usuarios, archivos como evidencia de acciones, antivirus, pruebas de carga y respaldo/restauración. El resumen básico no sustituye estadísticas avanzadas y el informe en pantalla no equivale a exportación PDF. No se afirma disponibilidad garantizada ni cumplimiento normativo. El formulario interno no es FURAT ni hace envíos a la ARL.
