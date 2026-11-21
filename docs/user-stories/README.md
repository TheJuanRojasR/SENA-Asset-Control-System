# Especificación funcional — Sistema de Control de Activos SENA

## 1. Qué es este conjunto

Este directorio es la **especificación funcional** del sistema de inventario y solicitudes del
Ambiente 104 del SENA Quirigüá, escrita antes del código. Las reglas salen del conocimiento del
**negocio** —el responsable del almacén— y **no se infieren de la implementación**: el código solo se
consulta para verificar si cumple lo que la regla dice. Si las historias se escribieran leyendo el
código, los defectos actuales quedarían documentados como requisitos.

Son **doce documentos**: el contexto de negocio con las **126 reglas** y el modelo de reservas, y
**once módulos** con **59 historias** y **285 criterios de aceptación vigentes**. De esos criterios,
**20 se ejecutaron** en el módulo de autenticación —14 `OK` y 6 con defecto— y los otros **265** están
especificados y sin ejecutar. Ninguna pregunta de negocio queda abierta: las **51** que hubo están
respondidas en §8.2 de `00-contexto-negocio.md`.

## 2. Cómo está organizado

| Archivo | Qué contiene | Quién lo lee |
|---------|--------------|--------------|
| [`README.md`](README.md) | Este punto de entrada: qué es el conjunto, cómo se lee, convenciones, índice, orden de construcción y deuda conocida | Los tres roles |
| [`00-contexto-negocio.md`](00-contexto-negocio.md) | El negocio y sus actores, el glosario, el proceso real narrado, las **126 reglas** por familia, el modelo de reservas, las preguntas respondidas, las contradicciones con la implementación y el orden de construcción | Negocio, desarrollo y QA |
| [`01-autenticacion.md`](01-autenticacion.md) | Acceso al sistema: inicio de sesión, renovación, cierre, perfil propio y reparto de permisos por rol | Desarrollo y QA |
| [`02-usuarios.md`](02-usuarios.md) | Padrón de instructores: alta, consulta, edición, desactivación, reactivación y las dos formas de contraseña, más las condiciones que mantienen el sistema operable | Desarrollo y QA |
| [`03-ambientes.md`](03-ambientes.md) | Catálogo de ambientes de destino: alta, consulta con unidades por ambiente, renombrado e impedimentos de borrado | Desarrollo y QA |
| [`04-items.md`](04-items.md) | Catálogo de elementos: serializable, consumible con unidad de medida y umbral, composición de compuestos, su edición y la baja del elemento | Desarrollo y QA |
| [`05-inventario.md`](05-inventario.md) | Unidades serializadas, ensamblaje y desensamblaje, consumibles por cantidad, integridad del conjunto, listado, bajas, estado físico, ubicación, mantenimiento y alertas de stock | Desarrollo y QA |
| [`06-solicitudes.md`](06-solicitudes.md) | Ciclo del pedido con sus dos fechas: creación, decisión, empaque, entrega, cancelación, expiración y consulta, con la reserva por rango y la máquina de estados | Desarrollo y QA |
| [`07-prestamos.md`](07-prestamos.md) | Devolución de lo entregado: condición de retorno, tarea pendiente por daño, pérdida declarada y cierre del préstamo | Desarrollo y QA |
| [`08-catalogo.md`](08-catalogo.md) | Catálogo del instructor: listado por elemento, búsqueda, filtro por categoría, disponibilidad por rango de fechas y paginación | Desarrollo y QA |
| [`10-categorias.md`](10-categorias.md) | Categorías del catálogo: alta con nombre único, consulta paginada, renombrado e impedimento de borrado en uso | Desarrollo y QA |
| [`11-movimientos.md`](11-movimientos.md) | Historial de movimientos que deja cada evento del inventario y su consulta filtrada, paginada y con total | Desarrollo y QA |
| [`12-paneles.md`](12-paneles.md) | Paneles de inicio por rol: qué cuenta cada indicador y con qué pantalla tiene que coincidir | Desarrollo y QA |

El módulo **09 (reportes) no tiene archivo**: el negocio lo descartó.

## 3. Por dónde empezar

1. **`00-contexto-negocio.md`, completo.** Las reglas de negocio, el glosario y el modelo de reservas
   son la autoridad que todos los módulos citan; sin ellos una historia se lee a medias.
2. **Los módulos en el orden de construcción** de la sección 8, no en el orden del número.
3. **Dentro de un módulo:** `Resumen` → `Alcance` → `Reglas de negocio` → `Historias de usuario` →
   `Errores y mensajes` → `Trazabilidad y estado` → `Anexo — Datos de prueba`.

El **número de un módulo es un identificador, no una secuencia**: `10 Categorías` se lee antes que
`04 Ítems`. Los ids no se renumeran cuando cambia el orden ni cuando una historia se retira, así que
los huecos de numeración son intencionales.

## 4. Convenciones de identificadores

| Prefijo | Significado | Ejemplo |
|---------|-------------|---------|
| `US-<MÓDULO>-NN` | Historia de usuario | `US-AUTH-01` |
| `AC-<MÓDULO>-NN-N` | Criterio de aceptación de una historia | `AC-AUTH-01-3` |
| `RN-<FAMILIA>-NN` | Regla de negocio, agrupada por familia temática y no por módulo | `RN-CTX-02` |
| `OPEN-<FAMILIA>-NN` | Pregunta de negocio; todas están respondidas en §8.2 de `00-contexto-negocio.md` | `OPEN-AUTH-01` |
| `DEF-<MÓDULO>-NNN` | Defecto: un criterio que la implementación contradice | `DEF-AUTH-001` |
| `RISK-<MÓDULO>-NN` | Riesgo real que un test de comportamiento HTTP no verifica | `RISK-AUTH-01` |

Una familia `RN-*` agrupa las reglas de un mismo tema y sus reglas se **comparten entre módulos**:
`RN-CTX-02` es origen de criterios de varios módulos, no solo del que la cita. Cada regla declara su
tipo —`Confirmada`, `Estándar`, `Decisión técnica` o `REFUTADA`—; las `REFUTADA` no se implementan y
se conservan con la regla que las reemplazó.

## 5. Cómo se escribe un criterio

Cada `AC` se escribe en Gherkin y fija la regla y su efecto observable —los estados, los códigos, los
mensajes y los límites que la regla nombra—, no los datos con los que se comprueba. **El ejemplo no es
el requisito:** por eso el criterio nombra la **clase** de actor y de estado («un administrador con
sesión iniciada», «una solicitud en `PENDING` con cantidad 3») y no una dirección o una contraseña
concretas.

Qué correo, qué serial, qué IP o cómo se falsea el reloj para provocar un vencimiento pertenece a
**QA**, que elige su propio conjunto de prueba; los valores con los que se ejecutó cada módulo van en
su `Anexo — Datos de prueba`, marcados como ejemplos. Un criterio que no escribe **todos** sus
efectos observables no sirve como regresión: el código de estado, el cuerpo exacto y la ausencia de
efectos son partes distintas y verificables.

## 6. Estados de un criterio

Un criterio se marca solo cuando su test corre, nunca por lectura del código.

| Estado | Significado | Criterios |
|--------|-------------|-----------|
| `OK` | La implementación cumple la regla y el test que la verifica pasa | 14 |
| `GAP` | La implementación contradice la regla. Tiene un defecto `DEF-*` abierto | 6 |
| Sin ejecutar | El criterio está especificado y todavía no tiene test que lo corra | 264 |
| `Derivada` | Se desprende de una regla confirmada, pero **ninguna regla afirma el caso**. No se implementa | 1 |

El único criterio `Derivada` es `AC-ITE-05-2` (módulo 04): `RN-INV-35` afirma el rechazo con unidades
ensambladas y no afirma el caso contrario, así que el criterio se conserva y no se implementa hasta
que el negocio confirme. Un criterio más, `AC-PAN-02-3` del módulo 12, está **retirado** y no cuenta
entre los vigentes.

Los seis defectos del módulo 01 (`DEF-AUTH-001` a `DEF-AUTH-006`) se declaran con `it.failing` y el id
del defecto en el título: el test describe el comportamiento correcto, la suite queda verde y el test
empieza a fallar a propósito cuando el defecto se corrige.

## 7. Índice de módulos

Los conteos salen de recorrer los documentos. Un criterio retirado conserva su número y no suma.

| # | Módulo | Archivo | Historias | Criterios | Estado |
|---|--------|---------|-----------|-----------|--------|
| 00 | Contexto de negocio y modelo de reservas | [`00-contexto-negocio.md`](00-contexto-negocio.md) | — | — | **Decidido** — 126 reglas y las 51 preguntas respondidas |
| 01 | Autenticación y sesión | [`01-autenticacion.md`](01-autenticacion.md) | 5 | 22 | **Ejecutado** — 14 `OK`, 6 `GAP` y 2 sin ejecutar |
| 02 | Usuarios e instructores | [`02-usuarios.md`](02-usuarios.md) | 6 | 23 | **Especificado** — sin ejecutar |
| 03 | Ambientes | [`03-ambientes.md`](03-ambientes.md) | 4 | 10 | **Especificado** — sin ejecutar |
| 04 | Ítems y componentes | [`04-items.md`](04-items.md) | 6 | 27 | **Especificado** — 1 criterio `Derivada` no implementable |
| 05 | Inventario y ensamblaje | [`05-inventario.md`](05-inventario.md) | 12 | 67 | **Especificado** — sin ejecutar; `US-INV-06` retirada, no cuenta |
| 06 | Solicitudes | [`06-solicitudes.md`](06-solicitudes.md) | 9 | 49 | **Especificado** — sin ejecutar |
| 07 | Préstamos y devoluciones | [`07-prestamos.md`](07-prestamos.md) | 6 | 37 | **Especificado** — sin ejecutar |
| 08 | Catálogo y disponibilidad | [`08-catalogo.md`](08-catalogo.md) | 4 | 22 | **Especificado** — sin ejecutar; `AC-CAT-03-9` retirado, no cuenta |
| 09 | ~~Reportes~~ | — | — | — | **Descartado** — el negocio no los solicita |
| 10 | Categorías del catálogo | [`10-categorias.md`](10-categorias.md) | 3 | 10 | **Especificado** — sin ejecutar |
| 11 | Historial de movimientos | [`11-movimientos.md`](11-movimientos.md) | 2 | 11 | **Especificado** — sin ejecutar |
| 12 | Paneles de inicio | [`12-paneles.md`](12-paneles.md) | 2 | 7 | **Especificado** — sin ejecutar; 1 criterio retirado |

**Totales:** **59 historias** y **285 criterios vigentes** en los once módulos especificados.
**20 están ejecutados** —14 `OK` y 6 `GAP`—, **265 sin ejecutar** —de ellos uno es `Derivada` y no se
implementa— y **ninguno está en `OPEN`**. El módulo 12 conserva **8** criterios identificados, de los
cuales **7** están vigentes.

## 8. Orden de construcción y dependencias

El orden lo fija el grafo de dependencias, no el número del módulo.

### Capas

| Capa | Módulos | Qué la desbloquea |
|------|---------|-------------------|
| Previa — documento base | 00 Contexto | Nada: es el documento del que dependen todos |
| 1 — Acceso | 01 Autenticación | Nada. El primer administrador lo crea el **seed**, no la aplicación (`RN-USR-09`) |
| 2 — Datos maestros | 10 Categorías · 03 Ambientes · 02 Usuarios | 01. Las tres pueden construirse en cualquier orden entre sí |
| 3 — Catálogo | 04 Ítems | 10 (necesita categorías para clasificar) y 01 |
| 4 — Inventario | 05 Inventario | 04 (elementos) y 03 (ambientes donde ubicar las unidades) |
| 5 — Visibilidad y ciclo | 08 Catálogo · 06 Solicitudes | 08: 04 y 05 (la disponibilidad sale de las unidades). 06: 05 (unidades para reservar) y 08 (el cálculo de disponibilidad) |
| 6 — Cierre del ciclo | 07 Préstamos | 06 |
| Transversal | 11 Movimientos · 12 Paneles | 11: 04, 05, 06 y 07. 12: **02**, 04, 05, 06 y 07 —el padrón y los instructores activos del panel salen de `US-USR-02` y `US-USR-03`—. No bloquean el orden |

### Secuencia

```
01  →  10 · 03 · 02  →  04  →  05  →  08 · 06  →  07  →  11  →  12
```

Los módulos **11** y **12** son transversales y van **al final**: registran y muestran lo que producen
los demás, así que no tienen nada que mostrar antes. El panel del administrador cuenta los
instructores activos del padrón, y ese padrón solo lo especifica el módulo **02**; como `02` está en
la capa 2, la dependencia no mueve la secuencia.

El orden es una **sugerencia de secuencia**, no un requisito: dos capas pueden construirse en
paralelo cuando sus dependencias ya están resueltas. Una capa espera a **las capas de las que
depende**, no a la anterior por número.

## 9. Cómo se ejecuta lo especificado

```bash
# Un archivo de test puntual
docker compose exec api npm test -- tests/integration/<dominio>.test.js

# Toda la suite del backend
docker compose exec api npm test
```

Requiere la base de tests creada y migrada. Si no existe:

```bash
docker compose exec db mysql -uroot -proot -e "CREATE DATABASE IF NOT EXISTS sena_inventario_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; GRANT ALL PRIVILEGES ON sena_inventario_test.* TO 'sena_user'@'%'; FLUSH PRIVILEGES;"
docker compose exec api sh -c 'export DATABASE_URL="$DATABASE_URL_TEST" && npx prisma migrate deploy'
```

## 10. Deuda conocida

- **Seis defectos de autenticación**, `DEF-AUTH-001` a `DEF-AUTH-006`, con sus criterios en `GAP`, en
  [`01-autenticacion.md`](01-autenticacion.md).
- **Dos criterios del módulo 01 nunca se ejecutaron**: `AC-AUTH-01-7` (límite de intentos por origen)
  y `AC-AUTH-02-6` (duración de la sesión).
- **Un criterio que ninguna regla afirma**: `AC-ITE-05-2` (módulo 04), `Derivada`, no implementable.
- **Una operación que ningún módulo especifica**: el **ajuste de cantidad** de un consumible. El
  módulo 11 verifica el movimiento que deja, no la operación.
- **Historias y criterios retirados**, que no se cuentan: `US-INV-06` con sus cuatro criterios y
  `AC-CAT-03-9`, porque el **préstamo informal no existe** (`RN-INV-15` está `REFUTADA`); y
  `AC-PAN-02-3`, porque el **carrito vive solo en el navegador** y un panel del servidor no puede
  informarlo (`RN-PAN-01`). Los ids no se renumeran.
