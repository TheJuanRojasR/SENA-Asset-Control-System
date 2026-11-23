# Rol: contexto global del proyecto

Eres un agente de desarrollo del **SENA Asset Control System**. Este contexto se antepone a cualquier tarea: léelo completo antes de tocar archivos y no lo contradigas con la tarea que recibas.

## 1. Qué es el sistema

Sistema web para gestionar el inventario y las solicitudes de equipos del **Ambiente 104 del SENA Quirigüá**. Opera sobre el **inventario real**: entre 1.000 y 1.500 equipos y elementos, y alrededor de 100 instructores. No es una muestra ni un prototipo.

Dos roles y ninguno más (`RN-CTX-05`): **ADMIN** (instructor encargado del almacén: revisa, aprueba, verifica, empaca, entrega y recibe) e **INSTRUCTOR** (solicita, recoge y devuelve). La acción administrativa es del administrador; sin credencial es `401`, con credencial sin permiso es `403`.

Dominio: unidades serializadas con trazabilidad por serial, ítems compuestos ensamblados, consumibles por cantidad con unidad de medida y umbral, reservas por rango de fechas, préstamos reales con devoluciones y condición de retorno, movimientos y paneles por rol.

## 2. La fuente de verdad

**`docs/user-stories/` es la autoridad, no el código.** Si la especificación y la implementación difieren, la especificación gana y el código es la deuda.

| Documento | Qué contiene |
|-----------|--------------|
| `00-contexto-negocio.md` | **126 reglas** `RN-*`, glosario, modelo de reservas, 51 preguntas respondidas y las contradicciones conocidas con el código (§9) |
| `01`–`12` | Los once módulos: historias `US-*` con criterios `AC-*` en Gherkin y su tabla de trazabilidad |
| `README.md` | Índice, convenciones de identificadores y orden de construcción |

El trabajo está sincronizado en GitHub como issues `#4`–`#81` (épicas, historias, defectos), con sub-issues y dependencias `blocked_by`:

```bash
gh issue list --assignee @me --state open --limit 100
gh issue view <número> --json title,body,labels
```

## 3. Arquitectura en treinta segundos

```text
server/  routes → controllers → services → repositories → Prisma → MySQL 8
         validations (Zod), middlewares (auth, roles, errores), JWT
client/  pages (admin/, instructor/) → api/ → stores (Zustand) + React Query
         Material-UI 5 + TailwindCSS, React Hook Form + Zod
tests/   server/tests/integration (Jest + Supertest + MySQL de test)
         client/tests (Vitest + Testing Library)
```

Comandos: `docker compose up -d --build` · `docker compose exec api npm test` · `docker compose exec api npm test -- tests/integration/<dominio>.test.js` · `docker compose exec client npm test` · lint en ambos servicios.

## 4. El equipo y qué te toca

| Persona | GitHub | Verifica | Arregla |
|---------|--------|----------|---------|
| Juan | `@TheJuanRojasR` | 01 Autenticación · 06 Solicitudes | — |
| Julián | `@julian-david-parada-gil` | 05 Inventario · 12 Paneles | — |
| Joseph | `@joseph12n` | 07 Préstamos · 02 Usuarios · 11 Movimientos | 01 · 04 · 08 · 03 · 10 |
| Kevin | `@KevinSRDev` | 04 Ítems · 08 Catálogo · 03 Ambientes · 10 Categorías | 05 · 12 · 07 · 02 · 11 |

**Trabaja solo en las issues asignadas a la persona que te invoca.** El detalle de reglas, propiedad de archivos y rotación está en `.ai/reparto.md`.

## 5. Reglas no negociables

1. **No inventes reglas.** Si la especificación no fija un mensaje, un código, un límite o un formato, no lo decidas tú: repórtalo como pregunta.
2. **Un criterio se marca `OK` o `GAP` solo cuando su test corre**, nunca por lectura de código. El test lleva el id en el nombre: `it('AC-INV-04-1 — …')`.
3. **Nadie certifica lo que arregló.** Quien arregla abre el `DEF-*`; quien verifica el módulo firma el veredicto en la tabla de trazabilidad.
4. **Cada criterio tocado actualiza su fila** en la tabla *Trazabilidad y estado* del módulo, en el mismo PR.
5. **No toques archivos compartidos fuera de tu turno**: `server/prisma/schema.prisma` y `server/src/routes/index.js` (Joseph); `client/src/routes/AppRoutes.jsx` y `client/src/components/**` (Kevin); `server/tests/helpers/**` (Juan); fixtures (Julián).
6. **Conventional Commits** (`feat`, `fix`, `docs`, `test`, `refactor`, `chore`). Ramas `dev<Nombre>`; `main` es producción y `develop` integración: no empujes directo a `main`.
7. **No cierres una issue** si sus criterios no están `OK` o su trazabilidad no está actualizada.

## 6. Cómo ejecutar una tarea

1. Identifica la issue (assignee, número, módulo).
2. Lee el módulo completo en `docs/user-stories/`: resumen, alcance, reglas, historia y criterios.
3. Ubica el código existente antes de escribir: ruta → controlador → servicio → repositorio.
4. Escribe o ajusta **primero el test** del criterio.
5. Implementa el cambio mínimo que hace pasar ese test sin romper los demás.
6. Ejecuta la suite del dominio y reporta el resultado real, no el esperado.
7. Actualiza la trazabilidad del módulo.
8. Abre el PR citando la issue y los ids de los criterios.

## 7. Deuda conocida (no la confundas con requisitos)

- `DEF-AUTH-001` a `DEF-AUTH-006`: seis criterios en `GAP` en autenticación, con `RISK-AUTH-01` a `RISK-AUTH-05` (claves de firma por defecto, `logout` sin autenticación, cookie `secure`, contraseñas del seed públicas).
- La expiración de reservas corre a las 24 h; el negocio fijó **2 días con corte a las 23:59** (`RN-SOL-07`).
- `AC-ITE-05-2` es **`Derivada`**: ninguna regla la afirma, no se implementa.
- El **ajuste de cantidad** de un consumible no lo especifica ningún módulo.
- Los módulos 07, 08, 11 y 12 **no tienen tests de integración** todavía; 102 tests existen para 285 criterios y ninguno lleva el id del criterio.

## 8. Qué devuelves al terminar

1. La issue y los criterios que cubriste.
2. Archivos creados o modificados, con su ruta.
3. Resultado **literal** del comando de verificación.
4. Qué quedó fuera o bloqueado, y por qué.
5. La fila de trazabilidad actualizada, si aplica.
