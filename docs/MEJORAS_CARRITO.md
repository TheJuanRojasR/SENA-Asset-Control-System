# Mejoras del módulo Carrito & Préstamos

> Fecha: 2026-07-24 (actualizado: reserva de stock en backend)
> Alcance: frontend (`client/`) y backend (`server/`), módulo de solicitudes.
> Objetivo: reactividad del carrito, consumo eficiente de APIs, validación de stock
> en tiempo real, manejo de errores robusto y **reserva inmediata de stock**.

---

## 1. Problemas detectados (antes)

| #   | Problema                                                                                   | Impacto                                                |
| --- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------ |
| 1   | Sin indicador del estado del carrito fuera de `/instructor/carrito`                        | El usuario no sabía cuántos ítems llevaba              |
| 2   | `CatalogPage` no usaba `select: extractListData` (patrón inconsistente)                    | Doble extracción manual, código frágil                 |
| 3   | El carrito limitaba por `stock` total, pero el backend valida por unidades **disponibles** | Errores 409 `INSUFFICIENT_STOCK` evitables desde la UI |
| 4   | Catálogo no descontaba lo ya agregado al carrito                                           | Se podía intentar agregar más de lo disponible         |
| 5   | Sin invalidación de caché tras crear una solicitud                                         | Catálogo y "Mis solicitudes" quedaban desactualizados  |
| 6   | Manejo de errores genérico (`error?.response?.data?.message`)                              | Sin distinción entre red, auth, validación o stock     |
| 7   | `fetch` manual con `useState(submitting)` en vez de `useMutation`                          | Sin reintentos, sin estados de mutación consistentes   |
| 8   | Stock del carrito podía quedar obsoleto (persist en localStorage)                          | Solicitudes destinadas a fallar al confirmar           |

---

## 2. Cambios realizados

### 2.1 Archivos nuevos

#### `client/src/utils/errorHandler.js`

Normaliza cualquier error (axios, red, desconocido) a `{ type, message, code, status }`.

- `API_ERROR_TYPES`: `network`, `auth`, `forbidden`, `not_found`, `conflict`,
  `validation`, `stock`, `server`, `unknown`.
- `parseApiError(error, fallback?)`: clasifica por código de negocio
  (`INSUFFICIENT_STOCK`, `EMPTY_ITEMS`, `DUPLICATED_ITEMS`) y por HTTP status;
  prioriza el mensaje del backend; mensajes por defecto en español.
- `getApiErrorMessage(error, fallback?)`: atajo que retorna solo el mensaje.

#### `client/src/hooks/useCartValidation.js`

Valida el carrito contra el stock fresco del catálogo **en tiempo real**.

- Reutiliza la query `['items']` (misma clave del catálogo): **comparte caché,
  no duplica peticiones**; React Query hace refetch al montar.
- Retorna `{ issues, hasIssues, isValidating, validationFailed, freshItems }`.
- `issues` incluye ítems con cantidad > disponibilidad y ítems que ya no
  existen en el catálogo (`missing: true`).
- `enabled: false` cuando el carrito está vacío (cero peticiones innecesarias).

#### `client/src/components/common/MiniCartDrawer.jsx`

Vista rápida del carrito (drawer lateral derecho) accesible desde el Navbar:

- Lista con stepper de cantidad (+/−) y eliminar por ítem; operaciones
  inmediatas sobre el store (optimistas por naturaleza, estado local).
- Límite de "+" según disponibilidad (`disabled` al llegar al máximo).
- Footer con total de unidades, "Ir al carrito" y "Vaciar carrito".
- Estado vacío con CTA al catálogo. Animaciones con Framer Motion.
- Accesibilidad: `aria-label` descriptivos y `aria-live` en cantidades.

### 2.2 Archivos modificados

#### `client/src/stores/cartStore.js`

API anterior intacta (los 8 tests originales siguen pasando). Novedades:

- **Disponibilidad efectiva**: `available ?? stock` en todos los límites
  (`addItem`, `updateQty`), alineado con la validación del backend.
- `addItem` ahora **retorna** `{ added, quantity, capped, maxStock }` para que
  la UI dé feedback preciso (agregado / capeado / sin stock).
- `syncWithCatalog(freshItems)`: reconcilia el carrito con el catálogo fresco;
  ajusta cantidades, elimina lo que quedó en cero, actualiza el stock
  almacenado y **retorna la lista de ajustes** para notificar al usuario.
  Los ítems ausentes en la respuesta se conservan (no se asume borrado).
- Selectores reactivos `selectTotalItems` y `selectDistinctItems`
  (suscripciones granulares con primitivos, sin re-renders innecesarios).

#### `client/src/components/common/Sidebar.jsx`

- `Badge` de MUI sobre el ítem **Carrito** con el total de unidades
  (selector reactivo, `max={99}`, oculto en cero).
- Animación "bump" (`key={totalCartItems}` + spring) cada vez que cambia
  el contador. Funciona en modo expandido y colapsado.

#### `client/src/components/common/Navbar.jsx`

- Botón de carrito con `Badge` (solo rol `INSTRUCTOR`) que abre el
  `MiniCartDrawer`. Misma animación "bump" ante cambios.

#### `client/src/pages/instructor/CatalogPage.jsx`

- `select: extractListData` en ambas queries (consistencia con el resto
  de la app).
- **Disponibilidad neta**: `netAvailable = available − cantidadEnCarrito`;
  el input y el botón se limitan/deshabilitan según ese valor.
- Chip "En carrito: N" sobre la imagen del ítem (reactividad visible).
- Feedback por `Toast` usando el resultado de `addItem`:
  éxito / capeado por stock / sin unidades.
- Botón cambia a "Sin stock" cuando `netAvailable` llega a 0.

#### `client/src/pages/instructor/CartPage.jsx`

Reescritura sobre la misma estructura visual:

- **Validación en vivo** con `useCartValidation`.
- **Sincronización automática**: al llegar stock fresco se reconcilia el
  carrito (`syncWithCatalog`) y se notifica por toast cuántos ítems se
  ajustaron o quitaron.
- Ítems que ya no existen en el catálogo: `Alert` de error con detalle por
  ítem y botón **Quitar**; bloquean el envío hasta resolverse.
- Fallo de la verificación de stock (`validationFailed`): `Alert` de aviso,
  el envío sigue permitido porque el backend valida al confirmar (defensa
  en profundidad).
- **Chip "Disponible: N"** por fila del carrito (verde/rojo).
- `useMutation` para crear la solicitud:
  - `retry` solo en errores de red o 5xx (máx. 2, backoff exponencial);
    nunca reintenta errores de negocio 4xx.
  - `onSuccess`: limpia el carrito e **invalida `['items']` y
    `['my-requests']`** antes de navegar (listas siempre frescas).
  - `onError`: mensaje parseado con `parseApiError` (warning si es red,
    error en otro caso), con opción de cerrar.
- Botón de confirmar deshabilitado mientras: envío en curso, formulario
  inválido, validación inicial de stock, o issues pendientes.

### 2.3 Tests nuevos

| Archivo                                      | Tests | Cubre                                                                                                                       |
| -------------------------------------------- | ----- | --------------------------------------------------------------------------------------------------------------------------- |
| `tests/utils/errorHandler.test.js`           | 12    | red, códigos de stock, 4xx/5xx, fallback, mensajes vacíos                                                                   |
| `tests/stores/cartStore.test.js` (extendido) | +8    | prioridad de `available`, resultado de `addItem`, `syncWithCatalog` (ajuste, eliminación, conservación, entradas inválidas) |
| `tests/hooks/useCartValidation.test.jsx`     | 6     | carrito vacío (sin fetch), stock suficiente/insuficiente, ítem faltante, fallback a `stock`, fallo de API                   |

**Resultado:** 43/43 tests pasando, `eslint` sin errores, `vite build` exitoso.

---

## 3. Decisiones de diseño (por qué así)

1. **Caché compartido `['items']`** entre catálogo, validador y carrito:
   una sola fuente de verdad en React Query; invalidarla tras crear la
   solicitud refresca todas las vistas a la vez.
2. **Sincronización automática en vez de bloquear**: si el stock bajó, el
   carrito se ajusta solo y se informa; el usuario no corrige a mano lo que
   el sistema puede corregir. Solo bloquea lo irreconciliable (ítem borrado
   del catálogo).
3. **Reintentos selectivos**: reintentar un 409 o un 400 es inútil y
   genera ruido; solo se reintentan fallos de red/5xx con backoff.
4. **El backend sigue siendo la autoridad**: toda la validación de cliente
   es UX; `createRequest` valida stock de nuevo en servidor (defensa en
   profundidad), y el front muestra el mensaje exacto que retorna.
5. **Sin `useBlocker`**: el proyecto usa `BrowserRouter` (no data router),
   y además es innecesario — el carrito persiste en `localStorage`
   (`zustand/persist`), navegar no pierde datos.
6. **Store sin efectos secundarios**: los toasts viven en la capa de UI;
   el store solo retorna resultados descriptivos. Testabilidad y
   separación de responsabilidades.

---

## 4. Flujo resultante

```
Catálogo                         Carrito                       API
   │                                │                            │
   ├─ addItem → toast + badge bump  │                            │
   ├─ chip "En carrito: N"          │                            │
   │                                ├─ useCartValidation ────────┤ GET /items (caché)
   │                                ├─ syncWithCatalog (auto)    │
   │                                ├─ issues → Alert + Quitar   │
   │                                ├─ Confirm: useMutation ─────┤ POST /requests
   │                                │   retry solo red/5xx       │ 409 INSUFFICIENT_STOCK
   │                                ├─ invalidate items/requests │   → parseApiError → Alert
   │                                └─ navigate + toast          │
```

## 5. Verificación realizada

- `npm test` (client): **43/43** ✓
- `npm run lint` (client): sin errores ✓
- `npm run build` (client): build exitoso ✓
- Humo contra API real (Docker): login instructor, error 409
  `INSUFFICIENT_STOCK` con mensaje detallado, creación 201 y cancelación
  de la solicitud de prueba ✓
- HMR de Vite sin errores tras los cambios ✓

## 6. Mejoras futuras sugeridas (fuera de alcance)

- Sincronizar el carrito con el backend (tabla `Cart`) para persistencia
  entre dispositivos.
- Code-splitting del bundle (warning de chunk > 500 kB, preexistente).
- Suscripción a cambios de stock en tiempo real vía Socket.io
  (infraestructura ya preparada en `app.js`).

---

# PARTE 2: Reserva inmediata de stock (backend)

> Implementado tras detectar que el stock no se descontaba al crear
> solicitudes: solo se reservaba al empacar (`packRequest`), permitiendo
> overbooking entre solicitudes pendientes.

## 7. Cambios de backend

### 7.1 Reserva inmediata en `createRequest` (`request.service.js`)

- Toda la creación ahora ocurre en **una transacción**: validación de stock,
  creación de la solicitud y reserva de unidades son atómicas (sin race
  conditions entre solicitudes simultáneas).
- Nueva función auxiliar `assignUnitsToRequestItem`:
  - **Ítems simples**: toma N unidades `AVAILABLE` → `RESERVED` y crea el
    vínculo `RequestItemUnit`.
  - **Ítems compuestos**: reserva la unidad padre **junto con sus hijos
    ensamblados disponibles**, aunque el ensamblaje esté incompleto (el
    faltante se muestra en la UI; el admin decide al empacar).
- Resultado: el stock visible en el catálogo baja inmediatamente al crear
  la solicitud ("aparece sin stock" aunque esté pendiente de aprobación).

### 7.2 Liberación de unidades

- Nueva función auxiliar `releaseAssignedUnits` (idempotente): devuelve
  todas las unidades asignadas a `AVAILABLE` y elimina las asignaciones.
- `cancelRequest`: ahora libera en **PENDING, APPROVED y PACKED** (antes
  solo liberaba en PACKED).
- `rejectRequest`: ahora **libera las unidades** al rechazar (antes no).

### 7.3 `packRequest` simplificado

- Ya no reserva (está hecho desde la creación). Solo valida que cada ítem
  tenga sus unidades padre asignadas; si falta alguna (solicitudes creadas
  antes de este cambio), las asigna como **respaldo** reutilizando
  `assignUnitsToRequestItem`. Compatibilidad hacia atrás garantizada.

### 7.4 Expiración automática de reservas (24h)

- **Nuevo servicio** `server/src/services/reservationCleanup.service.js`:
  - `cleanupExpiredReservations()`: cancela solicitudes `PENDING` con
    `createdAt` mayor al límite, libera sus unidades y anota el motivo en
    `observations`. Una solicitud fallida no detiene el resto.
  - `startScheduler()`: cron cada hora (`node-cron`) **más una pasada
    inicial al arrancar** (cubre el tiempo de servidor apagado).
  - Configurable: `RESERVATION_TIMEOUT_HOURS` (defecto `24`) y
    `RESERVATION_CLEANUP_CRON` (defecto `0 * * * *`).
- Integrado en `app.js` solo cuando `NODE_ENV !== 'test'` (los tests no
  arrancan cron).
- Nueva dependencia: `node-cron@^4.6.0`.

### 7.5 API de ítems con completitud (`item.service.js`)

- Todos los ítems ahora retornan `available` explícito (antes el front
  recibía `null` y caía al `stock`).
- Ítems compuestos retornan además:
  ```json
  {
    "complete": 7,
    "incomplete": 3,
    "incompleteDetails": [
      {
        "unitId": 93,
        "serialNumber": "TORRE-001",
        "missingComponents": [
          {
            "itemId": 8,
            "itemName": "Procesador Intel Core i5",
            "required": 1,
            "assembled": 0,
            "missing": 1
          }
        ]
      }
    ]
  }
  ```
- Solo cuentan los componentes `isRequired`; una unidad es "completa" si
  tiene ensamblada la cantidad requerida de cada componente.

## 8. Cambios de frontend (completitud)

- **`CatalogPage.jsx`**: nuevo `CompletenessBadge` para ítems compuestos:
  - Verde "Completo" si todas las unidades disponibles están ensambladas.
  - Ámbar "N incompletos" con **tooltip** que detalla, por unidad, qué
    componentes faltan (`ensamblados/requeridos`).
  - La línea de disponibilidad muestra el desglose:
    `Disponible: 3 (2 completos, 1 incompleto)`.

## 9. Verificación de la Parte 2

- **Tests backend**: 97/99 pasan. Los 2 fallos son **preexistentes** y se
  verificó que también fallan con el código original (`git stash`):
  - `request.test.js:658` espera 409 al cancelar una solicitud APPROVED,
    pero el código (viejo y nuevo) permite cancelarla. Test desactualizado.
  - `category.test.js:157` falla por categoría nula tras DELETE; no toca
    código modificado en esta iteración.
- **Tests frontend**: 43/43 ✓ · **Lint** (cliente y server) ✓ · **Build** ✓
- **E2E contra API + BD reales** (todo verificado y limpiado después):
  | Flujo                                               | Resultado                                                                                               |
  | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
  | Crear solicitud (RAM: stock 3, pide 2)              | stock baja a **1** de inmediato                                                                         |
  | Segunda solicitud de 5                              | **409 INSUFFICIENT_STOCK** ("Disponible: 1")                                                            |
  | Cancelar solicitud PENDING                          | stock vuelve a **3**                                                                                    |
  | Rechazar solicitud (admin)                          | stock restaurado (1→0→**1**)                                                                            |
  | Solicitud envejecida 25h + cleanup                  | `{"cancelledRequests":1,"releasedUnits":2}`, stock restaurado, status `CANCELLED` con motivo automático |
  | Ciclo completo create→approve→pack→deliver→complete | estados y stock correctos en cada paso                                                                  |
  | Torre PC con 1/6 componentes ensamblados            | `complete:0, incomplete:1` con los 5 faltantes detallados                                               |

## 10. Flujo de reserva resultante

```
INSTRUCTOR crea solicitud
  └─ TX: validar stock → crear (PENDING) → reservar unidades (AVAILABLE→RESERVED)
       └─ Catálogo muestra el stock descontado de inmediato
       └─ Compuestos: badge "Completo" / "N incompletos" + faltantes

ADMIN
  ├─ Aprueba  → APPROVED (unidades siguen RESERVED) → pack → deliver → complete (libera al devolver)
  └─ Rechaza  → REJECTED + unidades liberadas a AVAILABLE

AUTOMÁTICO (cron cada hora + pasada al arrancar)
  └─ PENDING > 24h → CANCELLED ("Reserva expirada…") + unidades liberadas
```

---

# PARTE 3: Datos del solicitante e historial completo

> Corrección del desfase entre la estructura que retorna la API (objetos
> anidados) y los campos planos que el frontend buscaba, más la paginación
> por defecto (20) que ocultaba el historial.

## 11. Causa raíz

| El frontend buscaba                                              | La API retorna                                           | Resultado                                                  |
| ---------------------------------------------------------------- | -------------------------------------------------------- | ---------------------------------------------------------- |
| `request.requesterName` / `requesterDocument` / `requesterEmail` | `request.requester.fullName` / `.email` (anidado)        | Celdas vacías para el admin                                |
| `request.environmentName`                                        | `request.environment.name`                               | Ambiente vacío                                             |
| `request.items`                                                  | `request.requestItems` (con `item.name`, `requestedQty`) | Conteo y tabla de ítems vacíos                             |
| Todas las solicitudes                                            | Máx. 20 (paginación por defecto)                         | Historial truncado (p. ej. instructor con 23 solo veía 20) |

## 12. Cambios

### Backend

- `request.repository.js`: `requesterSelect` ahora incluye `document` y
  `phone` del solicitante (la relación `requester` ya existía; solo faltaban
  campos). Cambio aditivo, sin migración.

### Frontend

- `utils/api.js`: nuevo helper `fetchAllListPages(requestFn, { limit })` que
  obtiene **todas las páginas** de un endpoint paginado (lee `meta.totalPages`
  y pide las restantes en paralelo). Necesario porque los tabs por estado
  filtran en cliente y la página 1 sola ocultaba registros.
- `requests.api.js`: `getAll` ahora acepta `params` (page/limit/filtros).
- **Admin `RequestsPage`**: columnas Solicitante/Documento leen
  `row.requester.fullName` / `.document` (con fallback `-`); conteo de ítems
  usa `requestItems`; búsqueda por código/nombre/documento con campos reales;
  historial completo vía `fetchAllListPages`.
- **Admin `RequestReviewPage`**: panel del solicitante con nombre, documento,
  correo y **teléfono** desde `request.requester`; ambiente desde
  `request.environment.name`; tabla de ítems desde `requestItems` mostrando
  `item.name`, `item.code` y `approvedQty ?? requestedQty`.
- **Instructor `MyRequestsPage`**: historial completo vía
  `fetchAllListPages` y conteo de ítems con `requestItems`.

## 13. Verificación de la Parte 3

- API: `GET /requests` retorna `requester { fullName, email, document, phone }`,
  `environment.name` y `requestItems[].item` — verificado con curl.
- Instructor cmendoza: **23 solicitudes** visibles (antes 20).
- Tests: cliente 43/43 ✓ · backend 31/32 en `request.test.js` (el fallo es el
  preexistente ya documentado) · lint cliente+server ✓ · build ✓
- `document`/`phone` se muestran como `-` cuando el usuario no los tiene
  registrados (datos del seed sin esos campos).
