# Flujo de usuario

```mermaid
flowchart TD
  A[Iniciar sesión] --> B{Rol}
  B -->|Trabajador| C[Registrar accidente o incidente]
  C --> D[Actividad, declaración, fecha y lugar]
  D --> E[Guardar evento y adjuntar evidencia]
  E --> F[Consultar estado e historial del evento]
  B -->|SST| G[Revisar eventos y evidencia]
  G --> H[Verificar tipo y gravedad aplicable]
  H --> I{Tipo verificado}
  I -->|Accidente| J[Elaborar borrador de informe interno]
  J --> K[Guardar cambios y emitir informe]
  K --> L[Consultar informe e historial propios]
  I -->|Incidente| M[Investigar causas y conclusión]
  I -->|Accidente| M
  B -->|Coordinador| N[Consultar eventos, evidencia e informes]
  M --> P[Asignar acciones correctivas]
  P --> Q[Completar acciones con evidencia]
  Q --> R{Accidente con informe emitido o incidente}
  R --> S[Cerrar evento]
  B -->|Administrador| O[Consulta general y respuesta a quejas]
```

El trabajador puede consultar el informe asociado a su evento, pero no modificarlo. SST puede investigar un accidente antes o después de elaborar el informe. Emitirlo no equivale a cerrar el caso. La administración completa de usuarios continúa pendiente.
