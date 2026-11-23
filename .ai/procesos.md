# Procesos del equipo — SENA Asset Control System

> Documento operativo del equipo: responde **cómo y cuándo** se trabaja.
> **Quién** hace qué está en [`reparto.md`](reparto.md); **qué** hay que hacer vive en las issues
> (`#4`–`#81`) y en la especificación `docs/user-stories/`.

## 0. Principio rector

La **especificación es la fuente** y **el tablero es la verdad del avance**. Nada se da por hecho
por lectura del código: un criterio existe cuando su test corre y pasa.

## 1. Facilitación (Scrum Master)

La facilitación es un rol de servicio, no de mando: no decide el alcance ni el diseño, quita
obstáculos y custodia el proceso.

**Propuesta: Juan (`@TheJuanRojasR`) como facilitador inicial**, porque ya es dueño del proceso de
trazabilidad. Rota cada cuatro sprints.

Qué hace:

- Prepara y modera el planning; mantiene **un objetivo de sprint** por persona.
- Vigila el WIP y los bloqueos que superan 48 h.
- Custodia las tablas de trazabilidad: ningún criterio cambia de estado sin test que lo respalde.
- Verifica el cierre del sprint contra la definición de terminado (sección 5).
- Escala cuando una dependencia del grafo no avanza.

## 2. Cadencia

Sprints de **una semana** (lunes a viernes). Si el equipo pasa a medio tiempo, se pasan a dos semanas.

| Ceremonia | Cuándo | Duración | Salida |
|-----------|--------|----------|--------|
| Planning | lunes 09:00 | 45 min | Objetivo del sprint y una issue por persona |
| Sync | miércoles | 15 min | Bloqueos, nada más |
| Review | viernes | 30 min | Criterios certificados (evidencia, no código) |
| Retro | viernes | 30 min | Una acción concreta para el próximo sprint |

El resto es asíncrono: **el tablero es la fuente**, no los mensajes.

## 3. El tablero sin Projects

No hace falta un tablero aparte: GitHub ya lo da.

| Columna | Cómo se ve |
|---------|-------------|
| Backlog | abierta, sin assignee o bloqueada |
| Listo (DoR) | assignee definido, dependencias cerradas, criterios legibles |
| En curso | rama `dev<Nombre>` abierta e issue con la etiqueta `flujo/en-curso` |
| En revisión | PR abierto |
| Terminado | issue cerrada con sus criterios en `OK` y trazabilidad actualizada |

Comandos por columna:

```bash
gh issue list --assignee @me --state open     # mi trabajo
gh issue list --label flujo/en-curso           # qué hay en vuelo
gh pr list --state open                        # qué espera revisión
gh issue view <n> --json body                  # épica, dependencias y criterios
```

## 4. Flujo de una issue

1. **Elegir** en el planning: solo issues desbloqueadas, una por persona.
2. **Leer** el módulo completo en `docs/user-stories/` y las reglas que cita.
3. **Rama** `dev<Nombre>` desde `develop`.
4. **Test primero**: `it('AC-… — …')`. Si el criterio está en `GAP`, el test se declara
   `it.failing` y la suite queda verde.
5. **Código mínimo** que hace pasar ese test sin romper los demás.
6. **Verificar** con el comando del dominio y pegar la salida literal en el PR.
7. **Actualizar la trazabilidad** del criterio (solo si no fuiste quien arregló).
8. **PR** con la plantilla del repo y una aprobación según la sección 7.
9. **Cerrar** únicamente con los criterios en `OK`.

## 5. Listo y terminado

**Definition of Ready** — una issue se toma solo si:

- Está asignada, sin bloqueos abiertos y con su módulo legible en la especificación.
- Sus criterios están escritos en Gherkin, con el efecto observable completo.
- Se sabe qué archivo del código y qué test van a cambiar.

**Definition of Done** — una issue se cierra solo si:

- Todos sus criterios vigentes están `OK` o, si son `GAP`, tienen su `DEF-*` abierto y enlazado.
- Cada criterio tiene test con su id en el nombre y ese test corre.
- La tabla *Trazabilidad y estado* del módulo refleja el estado real.
- El PR fue aprobado por alguien que no lo escribió.
- No quedaron pendientes ni código comentado en el cambio.

## 6. WIP y bloqueos

- **Máximo una issue en curso por persona.** Excepción: verificación que espera un arreglo puede
  tener dos.
- Un bloqueo se escribe en la issue: qué falta y a quién se espera. Si pasa de 48 h, el facilitador
  reasigna o cambia la prioridad.
- **No se salta una capa** cuando la de arriba está estancada: se empuja la que la bloquea.

## 7. Revisión e integración

- `dev<Nombre>` → PR a `develop`. `main` solo recibe `develop` al cerrar un módulo.
- **Una aprobación obligatoria**: código de producto la da quien verifica ese módulo; tests, una
  persona de desarrollo. El autor nunca se aprueba a sí mismo.
- PRs de **400 líneas o menos**; si crece, se parte.
- El PR cita la issue y los ids `AC-*` que cubre. Sin eso no se revisa.
- Prohibido el auto-merge y el push directo a `main`.

## 8. Métricas del sprint

Se presentan en la review, sin herramientas nuevas:

| Indicador | Cómo se mide | Meta |
|-----------|--------------|------|
| Criterios certificados | Contar las filas en `OK` de las tablas de trazabilidad | +10 por sprint |
| Defectos abiertos | `gh issue list --label tipo/defecto --state open` | bajar cada sprint |
| PRs abiertos | `gh pr list --state open` | 4 o menos |
| Criterios sin test | script del Sprint 0 | bajar cada sprint |

## 9. Mapa de sprints

Referencia, no compromiso: **se replanifica cada lunes** según lo que el sprint anterior descubra.

| Sprint | Objetivo | Módulos |
|--------|----------|---------|
| S0 | Habilitadores: entorno, mapa AC↔test, plantillas | — |
| S1 | Cerrar acceso y abrir la capa 2 | 01 · 10 |
| S2 | Datos maestros cerrados | 03 · 02 |
| S3 | Catálogo | 04 |
| S4–S5 | Inventario (el bloque más grande) | 05 |
| S6 | Visibilidad y ciclo | 08 · 06 |
| S7 | Cierre del ciclo | 07 |
| S8 | Transversales | 11 · 12 |

## 10. Riesgos y su tratamiento

| Riesgo | Cómo se maneja |
|--------|----------------|
| Descubrimiento tardío de incumplimientos (265 criterios sin ejecutar) | Cada hallazgo entra como `DEF-*` y se prioriza en el planning siguiente; no se arregla en caliente |
| Dependencias estancadas | Si 05 no avanza, 08 y 06 no existen: la prioridad la fija el grafo, no el gusto |
| Estimación optimista | La capacidad real se mide en el primer sprint que cierre 01 y con eso se recalcula el mapa |
| Entorno ausente | Hoy el comando de verificación no corre en todas las máquinas (Sprint 0); mientras no esté, ninguna issue de verificación avanza |
| Cambio de alcance | Lo que no está en `docs/user-stories/` no se implementa: se abre la pregunta al negocio |

## 11. Agentes de IA en el proceso

- Cada persona trabaja con su agente, que recibe el contexto global
  ([`global.prompt.md`](agentes/global.prompt.md)) y las reglas del equipo.
- El agente **propone y ejecuta tareas pequeñas**; no decide alcance, no certifica y no cierra issues.
- Un PR generado por un agente se revisa igual que uno humano: **el autor responde por él**.
- En cada turno el agente cita los `AC-*` que cubre y la salida real del comando de verificación.

### Mensaje de arranque

```text
Trabajamos en SENA-Asset-Control-System (client React/Vite, server Express+Prisma+MySQL).
Antes de escribir nada:

1. Lee AGENTS.md, .ai/reparto.md y .ai/procesos.md.
2. Corre gh issue list --assignee @me --state all --json number,title,labels y dime qué es mío.
3. Con gh issue view <n> --json body, dime qué está bloqueado y por qué.
4. Propón el siguiente paso: primero lo desbloqueado, luego lo que más desbloquea.
5. Antes de tocar código, lee el módulo en docs/user-stories/ y cita los ids AC-* que vas a cubrir.
6. Enséñame el plan (archivos, test, comando de verificación) y espera mi OK.

Reglas que no puedes romper:
- Si la especificación y el código difieren, gana la especificación.
- Un criterio solo pasa a OK o GAP cuando su test corre.
- No toques prisma/schema.prisma, routes/index.js, AppRoutes.jsx ni components/** sin avisarme.
- No actualices la trazabilidad de un criterio que tú mismo arreglaste.
- Commits convencionales, rama dev<Nombre>, nunca main.

Al cerrar cada turno: issue y criterios cubiertos, archivos tocados, salida literal de la
verificación y qué quedó bloqueado.
```

## 12. Reglas de convivencia

- **Nadie certifica lo suyo** (detalle en [`reparto.md`](reparto.md), sección 4).
- **Un archivo, un dueño de turno** (detalle en la sección 5 de `reparto.md`).
- Lo que no está en la especificación **no se implementa**: se pregunta.
- Un criterio que no se entiende se pregunta el lunes, no se resuelve por cuenta propia.
