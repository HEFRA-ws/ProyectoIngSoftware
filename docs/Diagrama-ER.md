# Diagrama entidad-relación

Modelo lógico de documentos MongoDB, versión 0.3. Las relaciones representan referencias y documentos embebidos; MongoDB no aplica claves foráneas SQL. Los identificadores de dominio son cadenas, además del `_id` interno de MongoDB.

```mermaid
erDiagram
  USUARIO ||--o{ EVENTO : registra
  USUARIO ||--o{ SESION : mantiene
  USUARIO ||--o{ INFORME_ACCIDENTE : elabora
  EVENTO ||--o{ PERSONA_INVOLUCRADA : embebe
  EVENTO ||--o| VERIFICACION_SST : embebe
  EVENTO ||--o| INVESTIGACION : embebe
  EVENTO ||--o{ EVIDENCIA : referencia
  EVENTO ||--o| INFORME_ACCIDENTE : origina
  EVENTO ||--o{ ACCION_CORRECTIVA : embebe
  EVENTO ||--|{ HISTORIAL_EVENTO : embebe
  ACCION_CORRECTIVA ||--|{ HISTORIAL_ACCION : embebe
  INFORME_ACCIDENTE ||--|{ HISTORIAL_INFORME : embebe
  USUARIO {
    string id PK
    string email UK
    string name
    string password
    string role
  }
  EVENTO {
    string id PK
    string owner FK
    string reporter
    string type
    string activityDescription
    string description
    string area
    string location
    datetime date
    string status
    int version
  }
  ACCION_CORRECTIVA {
    string id PK
    string description
    string responsible
    date dueDate
    string status
    string evidence
  }
  HISTORIAL_ACCION {
    datetime date
    string actor
    string text
  }
  PERSONA_INVOLUCRADA {
    string name
    string document
    string contact
    string kind
  }
  VERIFICACION_SST {
    string type
    string severity
    string notes
    string actor
    datetime date
  }
  INVESTIGACION {
    string immediate
    string basic
    string conclusion
    string actor
    datetime date
  }
  EVIDENCIA {
    string id PK
    string eventId FK
    string name
    string type
    int size
    binary content
  }
  INFORME_ACCIDENTE {
    string id PK
    string eventId UK
    string owner FK
    string authorId FK
    string affectedWorker
    string activity
    string activityDetail
    string mechanism
    string injury
    string bodyPart
    string severity
    string verifiedDescription
    string immediateMeasures
    object eventSnapshot
    string status
    int version
    datetime createdAt
    datetime updatedAt
    datetime issuedAt
  }
  SESION {
    string tokenHash PK
    string userId FK
    datetime expires
  }
  HISTORIAL_EVENTO {
    datetime date
    string actor
    string text
  }
  HISTORIAL_INFORME {
    datetime date
    string actor
    string text
  }
```

Colecciones físicas: `users`, `events`, `accidentReports`, `evidence`, `sessions` y `attempts`. Personas, verificación, investigación e historiales son subdocumentos; no son colecciones independientes. `attempts` es almacenamiento técnico del límite de intentos de login y no forma parte del dominio del evento.

El índice único `accidentReports.eventId` impide crear dos informes para el mismo accidente. La relación Evento-Informe es opcional: primero existe el evento; el informe se crea posteriormente y solo si se verificó como accidente. La validación de esta condición se realiza en la API.
