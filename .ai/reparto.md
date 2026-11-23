# Reparto del equipo y verificación

Este archivo fija **cómo** se trabaja el backlog de la especificación. **Qué** hacer y en qué estado está vive en las issues de GitHub, no acá: la cola de cada persona es su filtro de assignee.

```bash
gh issue list --assignee @me --state open --limit 100
gh issue view <número> --json title,body,labels
```

El índice de módulos, historias y criterios es el issue `#81`; cada issue enlaza su sección exacta de `docs/user-stories/`.

## 1. Roles

| Persona | GitHub | Rol principal | Rol secundario |
|---------|--------|---------------|----------------|
| **Juan** | `@TheJuanRojasR` | Verificación: tests de criterios, veredictos y tablas de trazabilidad | Revisión de la especificación |
| **Julián** | `@julian-david-parada-gil` | Verificación: datos de prueba, fixtures y E2E | Revisión de tests |
| **Joseph** | `@joseph12n` | Desarrollo backend y seguridad | Verificación de módulos ajenos |
| **Kevin** | `@KevinSRDev` | Desarrollo y dominio de inventario | Verificación de módulos ajenos |

Los roles **no son excluyentes**: las cuatro personas escriben tests de criterios de aceptación (§3) y cualquiera puede tomar una implementación, con la condición de §4.

## 2. Quién verifica qué y quién arregla

| Módulo | Criterios | Verifica (tests + veredicto) | Arregla (código) |
|--------|-----------|------------------------------|------------------|
| 01 Autenticación | 22 | Juan | Joseph |
| 06 Solicitudes | 49 | Juan | Joseph |
| 05 Inventario | 67 | Julián | Kevin |
| 12 Paneles | 8 | Julián | Kevin |
| 07 Préstamos | 37 | Joseph | Kevin |
| 02 Usuarios | 23 | Joseph | Kevin |
| 11 Movimientos | 11 | Joseph | Kevin |
| 04 Ítems | 27 | Kevin | Joseph |
| 08 Catálogo | 22 | Kevin | Joseph |
| 03 Ambientes | 10 | Kevin | Joseph |
| 10 Categorías | 10 | Kevin | Joseph |

Equilibrio de criterios por persona: **Juan 71 · Julián 75 · Joseph 71 · Kevin 69**.

Los seis defectos `DEF-AUTH-001` a `DEF-AUTH-006` y los cinco `RISK-AUTH-*` los trabaja **Joseph** (no verifica el módulo 01) y los certifica **Juan**.

## 3. Un criterio está terminado cuando

1. Existe un test con el id del criterio en el nombre: `it('AC-INV-04-1 — el stock parte de la cantidad registrada', ...)`.
2. Corre contra la base de tests (`NODE_ENV=test` → `sena_inventario_test`) y pasa.
3. Verifica el **texto del criterio**, no el comportamiento del código: si el código hace otra cosa, el criterio es `GAP` y se abre un `DEF-*`.
4. La fila del criterio en la tabla **Trazabilidad y estado** del módulo (`docs/user-stories/NN-*.md`) queda actualizada en el mismo PR.
5. Nunca se marca por lectura de código. Un criterio sin test que lo corra sigue **Sin ejecutar**.

## 4. Regla de independencia

**Nadie certifica lo que arregló.** En concreto:

- Si un criterio falla, quien verifica abre un issue `DEF-*` (`tipo/defecto`) y lo asigna a quien arregla según §2.
- El arreglo entra con su test, escrito por quien arregla (TDD), y ese test **no** se marca `OK` por la misma persona.
- Quien verifica el módulo ejecuta, revisa y firma el veredicto en la tabla de trazabilidad.
- Si alguien de verificación toma una implementación, la certificación pasa a su pareja: el módulo nunca se queda sin segundo lector.

## 5. Propiedad de archivos compartidos

| Zona | Dueño de turno |
|------|----------------|
| `server/prisma/schema.prisma`, `server/src/routes/index.js` | Joseph |
| `client/src/routes/AppRoutes.jsx`, `client/src/components/**` | Kevin |
| `server/tests/helpers/**`, `client/tests/setup.js` | Juan |
| Fixtures y datos de los anexos (`server/tests/helpers/factories*`) | Julián |
| Tablas de trazabilidad de `docs/user-stories/**` | cada verificador, solo en sus módulos |

Los archivos de test de un módulo grande se parten por dominio (`inventory.units.test.js`, `inventory.consumables.test.js`, `request.flow.test.js`, …) y **cada archivo tiene un solo dueño** en cada momento.

## 6. Revisión de PR

- Todo PR necesita **1 aprobación**.
- PR con código de producto → lo revisa quien verifica ese módulo.
- PR con tests → lo revisa una persona de desarrollo.
- PR que toca más de una capa (controlador + repositorio + UI) → lo revisa **Joseph** antes de mezclar.
- El PR no cierra la issue a mano: la issue se cierra cuando sus criterios están `OK` y la trazabilidad está actualizada.

## 7. Orden de trabajo

El grafo de dependencias manda (relaciones `blocked_by` de las épicas):

```text
01 → 10 · 03 · 02 → 04 → 05 → 08 · 06 → 07 → 11 → 12
```

Si una épica está bloqueada, se trabaja en la desbloqueada. El tablero de GitHub es la fuente: no se adelanta trabajo de una capa cuyas dependencias no están cerradas.

## 8. Rotación

Al cerrar **05 Inventario** (mitad del backlog) se intercambian los bloques de verificación entre las dos personas de verificación y entre las dos de desarrollo. Ningún módulo se queda con un solo lector y nadie acumula un dominio completo.

## 9. Reglas para agentes de IA

- La **especificación es la fuente**; si el código y `docs/user-stories/` difieren, el código es la deuda (ver `AGENTS.md` §9).
- Nunca inventes una regla, un mensaje de error o un límite que la especificación no fije.
- Antes de tocar un archivo compartido, revisa §5.
- Todo cambio de lógica va con tests; todo criterio tocado va con su fila de trazabilidad.
- El agente de cada persona trabaja **solo** en las issues asignadas a esa persona.
