# Diagrama de secuencias

Recorrido principal implementado en la versión 0.2. La sesión debe existir antes de las operaciones de escritura.

```mermaid
sequenceDiagram
  actor T as Trabajador o SST
  participant UI as Interfaz web
  participant API as API Express
  participant DB as MongoDB
  actor S as Profesional SST
  T->>UI: Registrar accidente o incidente y actividad
  UI->>API: POST /api/events
  API->>DB: Validar sesión y rol
  API->>API: Validar fecha, campos y personas
  API->>DB: Insertar Evento con estado Reportado
  DB-->>API: Evento guardado
  API-->>UI: 201 con código de evento
  Note over UI,DB: Registrar el evento no crea un informe
  opt Evidencia inicial
    T->>UI: Seleccionar fotografía o PDF
    UI->>API: POST /api/events/:id/evidence
    API->>API: Validar propiedad, formato y tamaño
    API->>DB: Guardar evidencia vinculada al evento
    API-->>UI: 201 evidencia guardada
  end
  S->>UI: Revisar declaración y evidencia
  UI->>API: GET /api/events
  API->>DB: Consultar eventos autorizados
  API-->>UI: Eventos
  S->>UI: Confirmar tipo, gravedad y observaciones
  UI->>API: PATCH /api/events/:id con acción classify
  API->>API: Verificar rol SST y gravedad aplicable
  API->>DB: Guardar verificación e historial con control de versión
  API-->>UI: Evento en investigación
  alt Accidente verificado
    S->>UI: Completar informe interno
    UI->>API: POST /api/events/:id/report
    API->>API: Exigir accidente verificado y campos del informe
    API->>DB: Insertar informe único en Borrador
    API-->>UI: 201 con código independiente de informe
    opt Ajustar borrador
      S->>UI: Guardar cambios
      UI->>API: PUT /api/events/:id/report con versión
      API->>DB: Actualizar si sigue Borrador y coincide versión
      API-->>UI: Borrador actualizado o conflicto 409
    end
    S->>UI: Emitir informe guardado
    UI->>API: POST /api/events/:id/report/finalize
    API->>DB: Cambiar informe a Emitido y guardar responsable
    API-->>UI: Informe de consulta
    Note over UI,DB: El evento mantiene su estado e investigación
  else Incidente verificado
    Note over UI,DB: No se permite crear informe de accidente
  end
  S->>UI: Documentar causas y conclusión
  UI->>API: PATCH /api/events/:id con acción investigate
  API->>DB: Guardar investigación e historial del evento
  API-->>UI: Investigación actualizada
```

La API devuelve 403 ante un rol no autorizado, 400 ante campos inválidos y 409 cuando falta verificación, existe un informe duplicado o la versión cambió. La investigación está disponible para ambos tipos de evento y no exige emitir primero un informe.
