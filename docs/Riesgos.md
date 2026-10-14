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

## Seguimiento

Revisar al comienzo de cada sprint y cuando se produzca un incidente. Registrar en una issue el riesgo materializado, su impacto, acciones y responsable. La aceptación de un riesgo no equivale a declarar que está resuelto.
