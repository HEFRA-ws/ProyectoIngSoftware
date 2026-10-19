# Diagrama de clases

Modelo de dominio de la versión 0.2. El servidor está implementado con funciones y documentos MongoDB; este diagrama expresa las entidades y sus relaciones, no una jerarquía de clases Java.

```mermaid
classDiagram
  class Usuario {
    +String id
    +String name
    +String email
    +String passwordHash
    +Rol role
  }
  class Evento {
    +String id
    +String owner
    +TipoEvento type
    +String activityDescription
    +String description
    +String area
    +String location
    +Date date
    +EstadoEvento status
    +int version
  }
  class PersonaInvolucrada {
    +String name
    +String document
    +String contact
    +String kind
  }
  class VerificacionSST {
    +TipoEvento type
    +Gravedad severity
    +String notes
    +String actor
    +Date date
  }
  class Investigacion {
    +String immediate
    +String basic
    +String conclusion
    +String actor
    +Date date
  }
  class InformeAccidente {
    +String id
    +String eventId
    +String authorId
    +String owner
    +String affectedWorker
    +String activity
    +String activityDetail
    +String mechanism
    +String injury
    +String bodyPart
    +String verifiedDescription
    +String immediateMeasures
    +Gravedad severity
    +EstadoInforme status
    +int version
    +Date createdAt
    +Date issuedAt
  }
  class Evidencia {
    +String id
    +String eventId
    +String name
    +String type
    +int size
    +Binary content
  }
  class Cambio {
    +Date date
    +String actor
    +String text
  }
  class Sesion {
    +String tokenHash
    +String userId
    +Date expires
  }
  Usuario "1" --> "0..*" Evento : registra
  Usuario "1" --> "0..*" InformeAccidente : elabora como SST
  Usuario "1" --> "0..*" Sesion : autentica
  Evento "1" *-- "0..20" PersonaInvolucrada : incluye
  Evento "1" *-- "0..1" VerificacionSST : confirma SST
  Evento "1" *-- "0..1" Investigacion : documenta causas
  Evento "1" --> "0..5" Evidencia : respalda
  Evento "1" --> "0..1" InformeAccidente : solo accidente verificado
  Evento "1" *-- "1..*" Cambio : historial del evento
  InformeAccidente "1" *-- "1..*" Cambio : historial del informe
```

Reglas: trabajador y SST registran eventos; SST y administrador verifican y elaboran informes. Coordinador consulta. La gravedad se registra únicamente para accidentes: Leve, Grave o Mortal. Los incidentes conservan investigación sin generar InformeAccidente. El informe pasa de Borrador a Emitido; emitirlo no cierra el evento.
