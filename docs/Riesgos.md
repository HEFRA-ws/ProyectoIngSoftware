# Gestión de riesgos del software

Estos riesgos corresponden al desarrollo y operación del software. Son distintos de los accidentes laborales que registra la aplicación.

Escala: probabilidad e impacto de 1 a 3. Exposición = probabilidad por impacto; 6-9 alta, 3-4 media, 1-2 baja. Las responsabilidades indicadas son funciones por asignar al equipo.

| ID | Riesgo | P | I | Exposición | Respuesta | Responsable funcional |
| --- | --- | --- | --- | --- | --- | --- |
| R01 | No completar el alcance antes de la revisión | 3 | 3 | 9 | Priorizar HU01-HU07 y diferir módulos secundarios | Coordinación |
| R02 | Exponer credenciales de Atlas | 2 | 3 | 6 | Variables privadas, .gitignore y revisión antes de push | Backend |
| R03 | Acceso de un trabajador a reportes ajenos | 2 | 3 | 6 | Filtro por propietario y pruebas negativas | Backend / QA |
| R04 | Pérdida de registros por configuración del alojamiento | 2 | 3 | 6 | Atlas separado del servidor; verificar persistencia después del despliegue | Despliegue |
| R05 | Fallo al instalar MongoDB local durante la demostración | 2 | 2 | 4 | Ejecutar la primera descarga con anticipación y conservar datos locales | Despliegue |
| R06 | Archivo adjunto peligroso | 2 | 3 | 6 | Formatos acotados, validación de cabecera, descarga forzada y tamaño máximo; antivirus pendiente | Backend |
| R07 | Interfaz poco usable en móvil | 2 | 2 | 4 | Revisión de ancho móvil y tablas con desplazamiento | Frontend |
| R08 | Diferencias entre documentos y código | 2 | 2 | 4 | Actualizar arquitectura, estados y alcance con cada cambio | Documentación |
| R09 | El equipo no comprende el código generado con asistencia | 2 | 3 | 6 | Revisión, demostración individual y explicación del flujo | Todo el equipo |
| R10 | Servicio gratuito lento o suspendido | 2 | 2 | 4 | Ensayar antes de presentar y disponer de ejecución local | Despliegue |
| R11 | El rol Administrador tiene permisos de Profesional SST (clasificar, investigar y elaborar informes) | 3 | 2 | 6 | Restringir clasificación, investigación e informes al rol SST y añadir pruebas negativas para el administrador | Backend / QA |
| R12 | Trabajo concentrado en un solo integrante | 3 | 3 | 9 | Asignar issues por integrante en GitHub Projects y revisar avances en cada sprint | Coordinación |
| R13 | Fallo al ejecutar el proyecto en Windows (`pnpm` no reconocido o `corepack enable` sin permisos) | 3 | 2 | 6 | Documentar `corepack pnpm start` y verificar la ejecución en el equipo de cada integrante | Despliegue / Documentación |
| R14 | Modificar el repositorio después de la fecha de entrega, lo que puede anular la entrega | 2 | 3 | 6 | Fijar una hora límite interna previa y no hacer push después de la entrega | Todo el equipo |
| R15 | Pérdida de la carpeta local del proyecto (clon en carpetas temporales) | 2 | 2 | 4 | Clonar en una carpeta de trabajo estable y subir los cambios con frecuencia | Todo el equipo |

## Riesgos materializados

| Fecha | Riesgo | Qué ocurrió | Acción |
| --- | --- | --- | --- |
| 2026-10-15 | R13 | Al ejecutar el prototipo en Windows, PowerShell no reconoció `pnpm` | Se ejecutó con `corepack pnpm start` |
| 2026-10-20 | R11 | En la revisión de permisos se encontró que el administrador puede clasificar, investigar y elaborar informes | Corregido en el commit b74b8a5: solo el profesional SST verifica, investiga y elabora informes; pruebas de rechazo 403 para el administrador |

## Seguimiento

Revisar al comienzo de cada sprint y cuando se produzca un incidente. Registrar en una issue el riesgo materializado, su impacto, acciones y responsable. La aceptación de un riesgo no equivale a declarar que está resuelto.
