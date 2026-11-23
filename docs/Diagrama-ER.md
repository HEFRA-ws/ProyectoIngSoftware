# Diagrama entidad-relación

Modelo lógico de documentos MongoDB, versión 1.0. Las relaciones representan referencias y documentos embebidos; MongoDB no aplica claves foráneas SQL. Los identificadores de dominio son cadenas, además del `_id` interno de MongoDB.

```mermaid
erDiagram
  USUARIO ||--o{ EVENTO : registra
  USUARIO ||--o{ SESION : mantiene
  USUARIO ||--o{ INFORME_ACCIDENTE : elabora
  USUARIO ||--o{ QUEJA_RECLAMO : radica
  EVENTO |o--o{ QUEJA_RECLAMO : relaciona
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
    string googleSub UK
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
  QUEJA_RECLAMO {
    string id PK
    string owner FK
    string eventId FK
    string type
    string subject
    string description
    string status
    datetime createdAt
    datetime dueDate
    object response
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

Colecciones físicas: `users`, `events`, `accidentReports`, `evidence`, `sessions`, `complaints`, `attempts` y `oauthStates`. Personas, verificación, investigación e historiales son subdocumentos; no son colecciones independientes. `attempts` limita los intentos de login y `oauthStates` conserva durante cinco minutos el estado, nonce y verificador PKCE del acceso con Google; son colecciones técnicas.

En USUARIO, `password` contiene un hash solo para cuentas locales y `googleSub` el identificador estable solo para cuentas Google. El índice de `googleSub` es único y `sparse`, de modo que permite cuentas locales sin ese campo. Las cuentas nuevas de Google reciben rol Trabajador; no se vinculan cuentas locales automáticamente por coincidencia de correo.

El índice único `accidentReports.eventId` impide crear dos informes para el mismo accidente. La relación Evento-Informe es opcional: primero existe el evento; el informe se crea posteriormente y solo si se verificó como accidente. La validación de esta condición se realiza en la API.
