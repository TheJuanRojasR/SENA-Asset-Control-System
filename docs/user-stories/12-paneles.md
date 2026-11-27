# Epic 12 — Paneles de inicio

El resumen de inicio por rol: qué cuenta cada indicador del panel del administrador y del instructor, con qué regla se calcula y con qué pantalla tiene que coincidir.

## Resumen

Este módulo resuelve la **pantalla de inicio por rol**: el panel del administrador con las métricas del almacén y el panel del instructor con el estado de sus propios pedidos.

El panel **no calcula nada nuevo**: **expone** cifras que ya especifican otros epics —los instructores (`US-USR-02`, `US-USR-03`), los elementos del catálogo (`US-ITE-01`, `US-ITE-02`), las solicitudes (`US-SOL-01`, `US-SOL-05`), los préstamos (`US-PRE-01`) y la alerta de stock bajo (`US-INV-13` sobre `RN-INV-44`)—. Lo que este epic posee es **lo que el panel muestra** y la exigencia de que cada cifra se calcule con la misma regla que la pantalla que la detalla (`RN-PAN-01`, `RN-PAN-02`).

Lo usan los dos actores de `RN-CTX-05`, cada uno con su panel: el administrador mira el **almacén completo** —padrón, catálogo, cola de aprobación, stock— y el instructor mira **lo suyo** —sus solicitudes activas y sus devoluciones pendientes—.

Si el módulo falla, el usuario pierde la única vista que reúne el estado sin recorrer seis pantallas y, cuando dos de ellas cuentan distinto, tiene que decidir a cuál de los dos números creerle. Estado hoy: **2 historias y 8 criterios identificados** —**7 vigentes ejecutados y en `OK`, 1 retirado**— en la rama `devJoseph-paneles`.

> **Frontera con los epics 04, 05, 06 y 07.** Los **estados** de la solicitud son del epic 06, las **devoluciones** del epic 07, el **umbral de stock bajo** es `RN-INV-44` del epic 05 y el atributo `minStock` es del elemento (epic 04). Este epic especifica **qué muestra el panel**, no los datos que hay detrás: ningún criterio redefine una métrica, cada uno exige que la cifra del panel **coincida** con la de su pantalla de detalle.

## Alcance

**Incluye**

- Panel del administrador con cinco indicadores: instructores activos, elementos del catálogo, solicitudes pendientes, alertas de stock bajo y últimas solicitudes (`RN-PAN-01`).
- Panel del instructor con sus solicitudes activas y sus devoluciones pendientes (`RN-PAN-01`).
- Coincidencia de cada cifra con la regla de la pantalla que la detalla (`RN-PAN-02`).
- La alerta de stock bajo calculada con `RN-INV-44`: la cantidad disponible de hoy de cada elemento contra su umbral mínimo, sin rango de fechas.
- Respuesta `200` en la apertura del panel propio y exigencia de sesión con el rol del panel.

**No incluye**

| Tema | Dónde se especifica |
|------|---------------------|
| La definición de la alerta de stock bajo y su consulta | `RN-INV-44` en el epic 05 y `US-INV-13`; acá se exige la comparación contra `minStock` y la coincidencia con esa consulta (`AC-PAN-01-4`) |
| El valor del umbral mínimo de cada elemento (`minStock`) | Dato del elemento, epic 04; `OPEN-INV-25` (§8.2) fija que lo declara el administrador y que sin umbral no hay alerta |
| Las pantallas de detalle de cada métrica: padrón, catálogo, solicitudes, préstamos, stock bajo | Epics 02, 04, 05, 06 y 07; el panel solo reutiliza su cálculo (`RN-PAN-02`) |
| El listado paginado completo de solicitudes | Epic 06, `US-SOL-09` y `AC-SOL-09-6` sobre `RN-CTX-02`; el panel no es un listado |
| Qué elementos cuenta el catálogo, por ejemplo si un elemento dado de baja sigue apareciendo | Decisión de la consulta del catálogo (epic 04, sobre `RN-INV-45`); acá solo se exige la coincidencia con ese total (`RN-PAN-02`) |
| Crear, modificar o vaciar el carrito del instructor | Epic 06, `US-SOL-01`; el carrito vive solo en el navegador (`OPEN-PAN-01`, §8.2) y el panel del servidor no lo informa |
| Avisos, recordatorios y la tarea pendiente que deja una devolución con pieza faltante o elemento dañado | Epic 07, `US-PRE-03`: es trabajo del administrador, no un indicador del instructor |
| Métricas adicionales: movimientos del día, préstamos activos, ambientes, unidades totales | Ninguna regla las pide; `RN-PAN-01` enumera las métricas de cada panel |
| Presentación del panel: aspecto, orden de los indicadores, disposición, gráficas, exportación y filtros | Ninguna regla la fija; `RN-PAN-01` fija las métricas, no la pantalla |
| Cuántas solicitudes entran en «las últimas» | `RN-PAN-01` no fija el número; la clave de orden sí está fijada (`AC-PAN-01-5`) |
| Actualización en tiempo real del panel | Ninguna regla la exige |
| Un tercer panel o un panel sin rol | `RN-CTX-05` fija dos actores y ninguno más |

## Actores y permisos

| Actor | Puede | No puede |
|-------|-------|----------|
| **Administrador** (instructor encargado del almacén) | Ver el panel de inicio del almacén con sus cinco indicadores: instructores activos, elementos del catálogo, solicitudes pendientes, alertas de stock bajo y últimas solicitudes | Ver un panel propio de instructor: `RN-CTX-06` fija que no crea solicitudes para sí mismo |
| **Instructor** (quien dicta la clase) | Ver su panel de inicio con sus solicitudes activas y sus devoluciones pendientes; el carrito lo pinta el cliente desde su propio almacenamiento local | Ver el panel del almacén, las alertas de stock bajo, el padrón, las solicitudes de otros instructores y sus devoluciones: `RN-PAN-01` enumera el contenido de cada panel y `RN-CTX-05` fija dos actores |

El panel es **por rol** y no un panel único recortado: `RN-PAN-01` enumera el contenido de cada uno y `RN-CTX-05` reparte los actores. Una petición sin credencial no es un actor: no tiene identidad y recibe `401` (epic 01, `AC-AUTH-05-2`).

## Reglas de negocio

| ID | Regla | Ejemplo |
|----|-------|---------|
| `RN-PAN-01` | El sistema tiene un **panel de inicio por rol**: el administrador ve instructores activos, elementos del catálogo, solicitudes pendientes, alertas de stock bajo y las últimas solicitudes; el instructor ve sus solicitudes activas, sus devoluciones pendientes y su carrito | Un instructor que abre su panel ve sus propias solicitudes y no el padrón ni las alertas de stock |
| `RN-PAN-02` | **Cada indicador del panel se calcula con la misma regla que la pantalla que lo detalla**; el panel no puede inventar un cálculo propio | El número de alertas de stock bajo del panel es el mismo que devuelve la pantalla de stock bajo, no una variante del panel |
| `RN-INV-44` | El administrador recibe una **alerta de stock bajo** por cada elemento cuya **cantidad disponible de hoy** queda **en su umbral mínimo o por debajo**, sin rango de fechas | Un elemento con umbral mínimo 5 y disponible de hoy 5 alerta; con 6 no alerta |
| `RN-INV-11` | Un consumible **no se reserva por fecha**: su stock baja **al registrar la entrega**, no al crear ni al empacar | Entregar un consumible puede meterlo en la alerta de stock bajo; empacarlo no mueve nada |
| `RN-INV-06` | Un consumible se controla por cantidad, no tiene serial y **no entra al flujo de devolución** | Un consumible entregado nunca genera una devolución pendiente |
| `RN-INV-45` | Un elemento del catálogo puede darse de baja si ninguna de sus unidades está comprometida, y no se elimina: sigue consultable para auditoría | Un elemento dado de baja sigue siendo consultable, y qué informa el catálogo sobre él lo decide la consulta del catálogo |
| `RN-SOL-11` | **Entrega parcial**: `PARTIALLY_DELIVERED` vive entre `PACKED` y `DELIVERED`, la solicitud sigue viva hasta entregar todo lo aprobado y lo ya entregado son préstamos reales | Una solicitud en entrega parcial cuenta como activa y sus unidades entregadas cuentan como devolución pendiente |
| `RN-SOL-12` | **Cierre cuando no queda nada afuera**: la solicitud se completa cuando todo lo entregado volvió o fue declarado perdido | Una solicitud completada no cuenta como activa y sus unidades ya no son devoluciones pendientes |
| `RN-PRE-15` | Una unidad **declarada perdida** sale del inventario activo, no bloquea disponibilidad y no vuelve | Una unidad perdida deja de contarse como devolución pendiente del instructor |
| `RN-CTX-02` | Volumen de 1.000 a 1.500 equipos y alrededor de 100 instructores: **todo listado** es paginado y devuelve su **total** | La consulta del catálogo informa su total de elementos, y el panel compara contra ese total |
| `RN-CTX-05` | Dos actores y ninguno más: el administrador revisa, aprueba, verifica, empaca, entrega y recibe; el instructor solicita, recoge y devuelve | El panel del almacén es del administrador; el instructor solo ve su propia operación |

`RN-PAN-01` y `RN-PAN-02` viven en §5.11 de [`00-contexto-negocio.md`](00-contexto-negocio.md); `RN-INV-06`, `RN-INV-11`, `RN-INV-44` y `RN-INV-45` en §5.2, `RN-SOL-11` y `RN-SOL-12` en §5.3, `RN-PRE-15` en §5.4, `RN-CTX-02` en §1 y `RN-CTX-05` en §2. Acá se leen y se citan: ningún criterio agrega condiciones que la regla no diga.

`RN-PAN-01` **no** fija el aspecto del panel, ni el orden de los indicadores, ni cuántas solicitudes entran en «las últimas»: fija **qué métricas** ve cada rol. `RN-PAN-02` es la regla que **limita** este epic: el panel no introduce un cálculo propio.

## Indicadores

Los ocho indicadores son el contrato de este módulo: para cada número, qué cuenta, qué estados entran, qué estados quedan fuera y de dónde sale la cifra. Ningún indicador se calcula acá (`RN-PAN-02`).

### Panel del administrador

| Indicador | Qué cuenta | Incluye | Excluye | De dónde sale el número |
|-----------|------------|---------|---------|-------------------------|
| **Instructores activos** | Usuarios del padrón con rol de instructor que están activos | Solo los instructores activos | Los instructores inactivos, que el padrón conserva al desactivarlos (`US-USR-03`) | Padrón de instructores, epic 02 (`US-USR-02`, `US-USR-03`) |
| **Elementos del catálogo** | Los **elementos** (`Item`), no las unidades físicas (`InventoryUnit`) | Todos los elementos que devuelve la consulta del catálogo | Las unidades físicas; y las **filas de una página**, porque la cifra es el **total** de la consulta paginada (`RN-CTX-02`) | **Total** de la consulta del catálogo, epic 04 (`US-ITE-01`, `US-ITE-02`). Qué elementos entran —por ejemplo un elemento dado de baja— lo decide esa consulta (`RN-INV-45`), no este epic |
| **Solicitudes pendientes** | Las solicitudes que esperan la decisión del administrador | **Solo `PENDING`** | `APPROVED`, `PACKED`, `PARTIALLY_DELIVERED`, `DELIVERED`, `PARTIALLY_RETURNED`, `COMPLETED`, `CANCELLED` y `REJECTED` | Lista de solicitudes, epic 06 (`US-SOL-01`, `US-SOL-05`); estados de §6 |
| **Alertas de stock bajo** | Una alerta por cada elemento cuya **cantidad disponible de hoy** está **en su umbral mínimo (`minStock`) o por debajo**, sin rango de fechas | Los elementos con `minStock` y disponible de hoy igual o menor que ese umbral | Los elementos por encima de su umbral, y los elementos **sin umbral cargado**, que no alertan (`OPEN-INV-25`, §8.2) | `RN-INV-44`, consulta de stock bajo de `US-INV-13` (epic 05); el número del panel tiene que coincidir con el de esa consulta. Para un consumible el disponible de hoy **es su stock** y baja al registrar la entrega, no al empacar (`RN-INV-11`) |
| **Últimas solicitudes** | Una lista de las solicitudes más recientes, ordenada por **fecha de creación descendente** | La solicitud más reciente, con su **estado** y el **instructor que la hizo** | Un orden alfabético, por identificador o ascendente; y el listado paginado completo, que es de `US-SOL-09` (epic 06) | Lista de solicitudes, epic 06; el estado de cada fila se lee con la regla de la pantalla de solicitudes (`RN-PAN-02`). El **tamaño** de la lista no lo fija ninguna regla |

### Panel del instructor

| Indicador | Qué cuenta | Incluye | Excluye | De dónde sale el número |
|-----------|------------|---------|---------|-------------------------|
| **Solicitudes activas** | Sus solicitudes que **no están en un estado final** | `PENDING`, `APPROVED`, `PACKED`, `PARTIALLY_DELIVERED`, `DELIVERED` y `PARTIALLY_RETURNED`; **`PARTIALLY_DELIVERED` cuenta**, porque la solicitud sigue viva hasta entregar todo lo aprobado (`RN-SOL-11`) | `COMPLETED`, `CANCELLED` y `REJECTED`, que son finales (§6); y las solicitudes de **cualquier otro instructor** | Sus solicitudes, epic 06 (`US-SOL-01`); estados de §6 |
| **Devoluciones pendientes** | Las **unidades serializadas ya entregadas** que **todavía no volvieron ni fueron declaradas perdidas** | Las unidades de una **entrega parcial**: ya salieron y son préstamos reales (`RN-SOL-11`) | Las unidades que **todavía no salieron**; las ya **devueltas**; las **declaradas perdidas**, que salen del inventario activo y no vuelven (`RN-PRE-15`); las de **otro instructor**; y los **consumibles**, que no entran al flujo de devolución (`RN-INV-06`, `RN-INV-11`) | Préstamos y devoluciones, epic 07 (`US-PRE-01`, `US-PRE-02`), con el cierre de `RN-SOL-12` |
| **Carrito** | **Ningún número del servidor**: es un borrador que vive **solo en el navegador**, no se guarda en el servidor, no compromete disponibilidad y se vacía al crear la solicitud (`OPEN-PAN-01`, §8.2) | — | Todo el panel calculado en el servidor: no puede informar un contenido que nunca está allí | El cliente lo pinta desde su propio almacenamiento local. `RN-PAN-02` no aplica porque no hay dos cálculos que comparar, y por eso `AC-PAN-02-3` está **retirado** |

## Historias de usuario

Los criterios nombran la **clase** de actor y de estado —«un administrador con sesión iniciada», «el panel con solicitudes en distintos estados», «un elemento con su cantidad disponible de hoy por debajo de su umbral mínimo»—. Los valores concretos con los que se ejecutan los escenarios están en el `Anexo — Datos de prueba`, al final del documento, y son ejemplos, no requisitos.

### US-PAN-01 — Panel del administrador

**Como** administrador del almacén **quiero** ver al entrar un resumen con los instructores activos, los elementos del catálogo, las solicitudes pendientes, las alertas de stock bajo y las últimas solicitudes **para** saber en qué estado está el almacén y qué me toca revisar, sin abrir cinco pantallas una por una.

**Prioridad:** alta — `RN-PAN-01`: es la primera pantalla del rol que administra el almacén y la única vista que reúne el estado completo del inventario.
**Estado:** especificada — no ejecutada.

Cada indicador cierra una trampa distinta: los instructores son los **activos**, porque el padrón conserva a los inactivos; las solicitudes pendientes son **solo `PENDING`**, no todas las que existen; las alertas de stock bajo se calculan con **`RN-INV-44`** y no con un filtro propio del panel (`RN-PAN-02`); y las últimas solicitudes son las más recientes, en orden por fecha de creación. Con 1.000 a 1.500 equipos y alrededor de 100 instructores (`RN-CTX-02`), recorrer las pantallas de detalle para saber el estado no es una opción.

#### AC-PAN-01-1 — El panel informa los instructores activos y no cuenta los inactivos

**Dado** un padrón con instructores activos e instructores inactivos.
**Y** un administrador con sesión iniciada.
**Cuando** el administrador abre el panel de inicio.
**Entonces**:

- la respuesta es `200`;
- el panel informa el número de instructores activos;
- los instructores inactivos no se cuentan.

`Origen: RN-PAN-01`

`RN-PAN-01` dice **instructores activos**, no instructores: un instructor desactivado sigue existiendo como dato y no opera, así que sumarlo mostraría un padrón que no se corresponde con quién puede pedir equipos. El criterio exige las dos mitades —la cifra de activos y la **exclusión** de los inactivos—, y la forma de la respuesta y el orden de los indicadores son decisión de implementación.

#### AC-PAN-01-2 — El panel informa los elementos del catálogo

**Dado** un catálogo con elementos registrados.
**Y** un administrador con sesión iniciada.
**Cuando** el administrador abre el panel de inicio.
**Entonces**:

- el panel informa el número de elementos del catálogo;
- la cifra coincide con el **total de elementos** que informa la consulta del catálogo.

| Dato con el que se compara | ¿Es la cifra del panel? |
|----------------------------|-------------------------|
| **Total** de elementos de la consulta paginada | Sí |
| Número de filas de la primera página | No: la consulta es paginada y su total puede superar el tamaño de página (`RN-CTX-02`) |
| Unidades físicas del inventario | No: el catálogo lista **elementos** (`Item`), no unidades (`InventoryUnit`) |

`Origen: RN-PAN-01`

La métrica dice **elementos del catálogo**, y un elemento es el objeto inventariado, no la unidad física. El criterio exige además la coincidencia con la consulta del catálogo, que es la pantalla que la detalla: si el panel contara unidades o filas de una página, mostraría un número que esa pantalla nunca confirma. **Qué elementos cuenta el catálogo no lo fija este epic** —por ejemplo, si un elemento dado de baja sigue apareciendo (`RN-INV-45`, epic 04)—: lo que `RN-PAN-02` exige es que el panel use **la misma regla** que esa consulta, cualquiera que sea.

#### AC-PAN-01-3 — El panel informa las solicitudes pendientes y no las que ya se atendieron

**Dado** un conjunto de solicitudes en distintos estados: pendientes, aprobadas, empacadas, en entrega parcial, entregadas, parcialmente devueltas, completadas, canceladas y rechazadas.
**Y** un administrador con sesión iniciada.
**Cuando** el administrador abre el panel de inicio.
**Entonces**:

- el panel informa el número de solicitudes **pendientes**;
- las solicitudes en cualquier otro estado no se cuentan como pendientes.

| Estado de la solicitud | ¿Cuenta como pendiente? |
|------------------------|-------------------------|
| `PENDING` | Sí: es el único que espera la decisión del administrador |
| `APPROVED` | No |
| `PACKED` | No |
| `PARTIALLY_DELIVERED` | No: la decisión ya se tomó y parte del pedido ya salió (`RN-SOL-11`) |
| `DELIVERED` | No |
| `PARTIALLY_RETURNED` | No |
| `COMPLETED` | No |
| `CANCELLED` | No |
| `REJECTED` | No |

`Origen: RN-PAN-01`

El indicador es de **trabajo pendiente**: la máquina de estados de §6 distingue lo que espera revisión de lo que ya se decidió, y `PENDING` es el único estado que espera al administrador. Un panel que sumara todas las solicitudes no diría qué le toca, que es la única razón por la que el indicador está ahí. `PARTIALLY_DELIVERED` tampoco entra: lo que sigue pendiente en una solicitud a medio entregar son sus **unidades por entregar**, y eso es trabajo del panel del instructor, no de este indicador.

#### AC-PAN-01-4 — El panel alerta por cada elemento en su umbral mínimo o por debajo y coincide con la consulta de stock bajo

**Dado** un elemento cuya cantidad disponible de hoy es **igual** a su umbral mínimo, otro cuya cantidad disponible de hoy está **por debajo** de su umbral mínimo y otro **por encima**.
**Y** un administrador con sesión iniciada.
**Cuando** el administrador abre el panel de inicio.
**Entonces**:

- el panel informa una alerta por cada elemento en su umbral mínimo o por debajo;
- el elemento en su umbral mínimo está en alerta;
- el elemento por debajo de su umbral mínimo está en alerta;
- el elemento por encima de su umbral mínimo no está en alerta;
- el número de alertas del panel coincide con el que devuelve la consulta de stock bajo.

**Y dado** un catálogo en el que todos los elementos tienen cantidad disponible de hoy por encima de su umbral mínimo.
**Cuando** el administrador abre el panel de inicio.
**Entonces**:

| Efecto | Resultado esperado |
|--------|--------------------|
| Alertas de stock bajo | `0`, informadas y no ocultas |
| Coincidencia con la consulta de stock bajo | El número coincide |

| Cantidad disponible de hoy frente al umbral mínimo | ¿Alerta? |
|----------------------------------------------------|----------|
| Igual al umbral | Sí (borde de la regla) |
| Por debajo del umbral | Sí |
| Por encima del umbral | No |
| Elemento sin umbral cargado | No: sin `minStock` no hay alerta (`OPEN-INV-25`, §8.2) |

`Origen: RN-INV-44, RN-PAN-02`

El criterio tiene **dos mitades** y las dos se exigen. La primera es la de `RN-INV-44`: una alerta **por cada elemento** cuya cantidad disponible de hoy —sin rango de fechas— está en su umbral mínimo o por debajo, con el borde incluido. La segunda es la de `RN-PAN-02`: ese número **coincide** con el de la consulta de stock bajo, de modo que el panel no pueda calcular por su cuenta y mostrar un número distinto del de la pantalla de detalle. El segundo escenario fija el caso de **cero**. El umbral de cada elemento lo fija el elemento (epic 04) y la consulta que lo detalla es `US-INV-13` (epic 05); la forma del indicador y si además lista los elementos son decisión de implementación.

**Un consumible no entra por rango de fechas.** La alerta compara el disponible **de hoy**, y para un consumible ese disponible es su **stock**, que baja **al registrar la entrega** y no al empacar (`RN-INV-11`): una entrega registrada puede meterlo en la alerta y un empaque no.

#### AC-PAN-01-5 — El panel informa las últimas solicitudes

**Dado** un conjunto de solicitudes creadas en fechas distintas, y la más reciente de ellas con su estado y el instructor que la hizo.
**Y** un administrador con sesión iniciada.
**Cuando** el administrador abre el panel de inicio.
**Entonces**:

- el panel informa las últimas solicitudes;
- la solicitud más reciente aparece en esa lista con su estado y el instructor que la hizo;
- ninguna solicitud creada antes que ella aparece antes que ella en la lista;
- el orden de la lista es por **fecha de creación descendente**.

`Origen: RN-PAN-01`

`RN-PAN-01` pide **las últimas solicitudes**, y «últimas» fija tres cosas observables: la lista existe, lo más reciente **está** en ella y el orden va de la más reciente a la más antigua. Sin la clave de orden la aserción no es verificable —una lista alfabética también contiene la más reciente— y «última» significa la que llegó de última. Cada fila lleva además su estado y su instructor, porque una lista de identificadores no le diría al administrador qué llegó. **Cuántas** solicitudes entran en «las últimas» no lo fija ninguna regla: por eso la aserción es sobre la **posición de la más reciente** y no sobre el tamaño de la lista.

### US-PAN-02 — Panel del instructor

**Como** instructor **quiero** ver al entrar mis solicitudes activas, mis devoluciones pendientes y lo que dejé en el carrito **para** saber qué pedí, qué tengo que devolver y qué estaba por solicitar, sin buscarlo en tres pantallas distintas.

**Prioridad:** media — `RN-PAN-01`: el instructor ve el estado de lo que pidió sin recorrer las pantallas de solicitudes y préstamos.
**Estado:** especificada — no ejecutada.

Los indicadores son **suyos**: no son el resumen del almacén sino el resumen de su relación con el almacén, y un panel que mostrara las solicitudes de todos le daría información que no le corresponde (`RN-CTX-05`). Cada uno responde una pregunta de un momento distinto del ciclo —qué pedí y sigue en curso, qué tengo que devolver, qué dejé a medio pedir— y las dos primeras son **personales**: su criterio exige que no cuenten lo ajeno.

El **carrito** lo pinta el cliente desde su propio almacenamiento local: vive solo en el navegador, no se guarda en el servidor y no compromete disponibilidad (`OPEN-PAN-01`, §8.2). Un panel calculado en el servidor **no puede informarlo**, así que su criterio quedó **retirado**.

#### AC-PAN-02-1 — El panel informa solo las solicitudes activas del propio instructor

**Dado** un instructor con solicitudes propias activas y finalizadas, entre ellas una en entrega parcial, y otro instructor con solicitudes activas.
**Y** el instructor con sesión iniciada.
**Cuando** el instructor abre el panel de inicio.
**Entonces**:

- la respuesta es `200`;
- el panel informa el número de **sus** solicitudes activas;
- la solicitud en entrega parcial se cuenta como activa;
- la completada, la cancelada y la rechazada no se cuentan como activas;
- las solicitudes activas del otro instructor no se cuentan.

| Estado de la solicitud | ¿Cuenta como activa? |
|------------------------|----------------------|
| `PENDING` | Sí |
| `APPROVED` | Sí |
| `PACKED` | Sí |
| `PARTIALLY_DELIVERED` | Sí: la solicitud sigue viva hasta que se entregue todo lo aprobado (`RN-SOL-11`) |
| `DELIVERED` | Sí |
| `PARTIALLY_RETURNED` | Sí |
| `COMPLETED` | No: estado final |
| `CANCELLED` | No: estado final |
| `REJECTED` | No: estado final |
| Cualquier estado, de **otro** instructor | No |

`Origen: RN-PAN-01`

Las dos palabras de la regla acotan el cálculo: **activas** deja fuera lo que terminó y **sus** deja fuera lo ajeno. El criterio exige las dos exclusiones por separado porque fallan por motivos distintos: sumar las completadas diría que el instructor tiene trabajo que ya cerró, y sumar las de otros mostraría el padrón completo a quien no lo administra. «Activa» es la solicitud que **no** está en un estado final de §6.

#### AC-PAN-02-2 — El panel informa las devoluciones pendientes del propio instructor

**Dado** un instructor con unidades prestadas sin devolver, una unidad que ya devolvió y otro instructor con unidades prestadas sin devolver.
**Y** el instructor con sesión iniciada.
**Cuando** el instructor abre el panel de inicio.
**Entonces**:

- el panel informa el número de sus devoluciones pendientes;
- la unidad ya devuelta no se cuenta;
- las unidades del otro instructor no se cuentan.

**Y dado** una solicitud del instructor en `PARTIALLY_DELIVERED` con una unidad ya entregada y una sin entregar.
**Cuando** el instructor abre el panel de inicio.
**Entonces**:

| Efecto | Resultado esperado |
|--------|--------------------|
| Devoluciones pendientes | `1` |
| Unidad que todavía no salió | No se cuenta como devolución pendiente |

**Y dado** dos unidades prestadas sin devolver del instructor, una de ellas declarada perdida con su trámite de baja todavía abierto.
**Cuando** el instructor abre el panel de inicio.
**Entonces**:

| Efecto | Resultado esperado |
|--------|--------------------|
| Devoluciones pendientes | `1` |
| Unidad declarada perdida | No se cuenta |

| Unidad | ¿Cuenta como devolución pendiente? |
|--------|------------------------------------|
| Serializada, entregada y sin volver | Sí |
| Serializada y ya devuelta | No |
| Serializada, entregada y declarada perdida | No: sale del inventario activo y no vuelve (`RN-PRE-15`) |
| De una entrega parcial, todavía sin salir | No: no está afuera y no hay nada que devolver |
| De otro instructor | No |
| Consumible | No: se consume al entregarse y no entra al flujo de devolución (`RN-INV-06`, `RN-INV-11`) |

`Origen: RN-PAN-01`

La devolución pendiente es el estado que describe el paso 7 del proceso real: el administrador revisa de nuevo el estado y los guarda. Mientras eso no ocurra, el instructor tiene una devolución pendiente, y el indicador es una lista de **sus** tareas, no el inventario en préstamo —eso último es `US-PRE-01` (epic 07), del administrador—. Cuenta las **unidades serializadas ya entregadas que todavía no volvieron ni fueron declaradas perdidas** (`RN-SOL-12`), lo que fija los tres casos que el criterio agrega: lo ya entregado en una **entrega parcial** sí cuenta porque ya salió y es un préstamo real (`RN-SOL-11`), lo que **todavía no salió** no cuenta, y una unidad **perdida** no cuenta porque `RN-PRE-15` la saca del inventario activo y contarla dejaría al instructor con una tarea imposible de cumplir.

#### AC-PAN-02-3 — *(retirado)* El panel informa el contenido del carrito del instructor

> **Criterio retirado: `AC-PAN-02-3` — El panel informa el contenido del carrito del instructor.**
> `RN-PAN-01` enumera el carrito entre las métricas del panel del instructor, pero `OPEN-PAN-01`
> (§8.2) quedó **respondida** fijando que el carrito vive **solo en el navegador**: es un borrador que
> **no se guarda en el servidor**, **no compromete disponibilidad** y se **vacía al crear la solicitud**.
> El panel se calcula en el servidor, así que **no puede informar** un contenido que nunca está allí:
> el carrito lo pinta el cliente desde su propio almacenamiento local y el indicador del servidor no
> lo reporta. El criterio perdió su objeto y se retira con esta nota: **no se renumera ningún otro
> criterio** y no se reemplaza por uno nuevo.

## Errores y mensajes

| Situación | HTTP | Código | Mensaje |
|-----------|------|--------|---------|
| Abrir el panel propio con sesión iniciada | `200` | No aplica | No aplica |
| Abrir un panel sin credencial | `401` | No lo fija ninguna regla (epic 01, `AC-AUTH-05-2`) | No lo fija ninguna regla; sin datos del panel |
| Abrir el panel del administrador con sesión de instructor | No lo fija ninguna regla | No lo fija ninguna regla | No lo fija ninguna regla; `RN-PAN-01` da un panel por rol y `RN-CTX-05` fija dos actores, así que el instructor no obtiene el estado del almacén |
| Un indicador sin datos que informar, por ejemplo cero alertas de stock bajo | `200` | No aplica | El indicador informa `0` y no se oculta (`AC-PAN-01-4`) |

Ninguna regla de este epic fija un código de error ni un mensaje literal: los únicos estados exigidos son el `200` de la apertura del panel propio y el `401` de una petición sin credencial, que es del epic 01.

## Sesión y seguridad

| Efecto | Regla | Dónde se verifica |
|--------|-------|-------------------|
| Cada panel exige sesión con el rol al que pertenece | `RN-PAN-01`, `RN-CTX-05` | `AC-PAN-01-1`, `AC-PAN-02-1`, `AC-PAN-02-2` |
| Los indicadores del instructor son solo suyos: ni las solicitudes ni las unidades de otro instructor entran en sus cifras | `RN-PAN-01`, `RN-CTX-05` | `AC-PAN-02-1`, `AC-PAN-02-2` |
| El instructor no obtiene el panel del almacén: ni el padrón ni las alertas de stock bajo | `RN-PAN-01`, `RN-CTX-05` | — (ver `Errores y mensajes`) |
| Una petición sin credencial no es una operación de ningún actor: recibe `401` | Epic 01 (`AC-AUTH-05-2`) | — |
| No hay un tercer rol con panel | `RN-CTX-05` | `AC-PAN-01-3` |

Ninguna regla de este epic fija plazos de sesión ni efectos del panel sobre las credenciales: abrir el panel no cierra sesiones ni las renueva. El contrato de sesión es del epic 01.

## Decisiones tomadas

| Decisión | Regla | Responde a |
|----------|-------|------------|
| Un panel **por rol** y no un panel único recortado: el administrador resume el almacén y el instructor su propia operación | `RN-PAN-01`, `RN-CTX-05` | — |
| Cada indicador se calcula **una sola vez**, con la regla de la pantalla que lo detalla; el panel no introduce un cálculo propio | `RN-PAN-02` | — |
| La alerta de stock bajo se compara contra el **`minStock` del elemento**, **sin rango de fechas**, y un elemento **sin umbral no alerta** | `RN-INV-44` | `OPEN-INV-25` |
| El número de **elementos** se compara contra el **total** de la consulta paginada del catálogo, no contra las filas de una página | `RN-CTX-02`, `RN-PAN-02` | — |
| «Solicitudes pendientes» es **solo `PENDING`**: los demás estados, incluida la entrega parcial, ya tuvieron su decisión | `RN-PAN-01`, `RN-SOL-11` | — |
| «Solicitudes activas» del instructor son las que **no están en un estado final**, con `PARTIALLY_DELIVERED` incluida | `RN-PAN-01`, `RN-SOL-11` | — |
| «Devoluciones pendientes» son las **unidades serializadas entregadas** que **no volvieron ni se declararon perdidas**; los consumibles no entran | `RN-SOL-12`, `RN-PRE-15`, `RN-INV-06`, `RN-INV-11` | — |
| Las últimas solicitudes van por **fecha de creación descendente** y cada fila lleva su estado y su instructor | `RN-PAN-01` | — |
| El **carrito** no es una cifra del servidor: lo pinta el cliente y su criterio queda **retirado** | `OPEN-PAN-01`, `RN-PAN-01` | `OPEN-PAN-01` |
| La forma de la respuesta, el orden y el aspecto de los indicadores, el tamaño de la lista de últimas y la actualización en tiempo real son decisión de implementación | `RN-PAN-01` | — |

Sin decisión todavía: **cuántas** solicitudes entran en «las últimas» (la clave de orden sí está fijada) y **qué elementos** cuenta el catálogo, por ejemplo si un elemento dado de baja sigue apareciendo (epic 04, `RN-INV-45`). Ninguna regla los fija y ningún criterio los exige.

## Trazabilidad y estado

Este epic se ejecutó: los **7 criterios vigentes** corren con test y están en `OK` (`server/tests/integration/dashboard.test.js`); `AC-PAN-02-3` queda **Retirado** por `OPEN-PAN-01` y no se renumera. Un criterio se marca solo cuando su test corre, nunca por lectura del código.

| Criterio | Regla | Estado hoy |
|----------|-------|------------|
| `AC-PAN-01-1` | `RN-PAN-01` | `OK` |
| `AC-PAN-01-2` | `RN-PAN-01` | `OK` |
| `AC-PAN-01-3` | `RN-PAN-01` | `OK` |
| `AC-PAN-01-4` | `RN-INV-44`, `RN-PAN-02` | `OK` |
| `AC-PAN-01-5` | `RN-PAN-01` | `OK` |
| `AC-PAN-02-1` | `RN-PAN-01` | `OK` |
| `AC-PAN-02-2` | `RN-PAN-01` | `OK` |
| `AC-PAN-02-3` | `RN-PAN-01` | **Retirado** — `OPEN-PAN-01`: el carrito vive solo en el navegador |

| US | ACs | Vigentes | `RN` | `Derivada` | `OPEN` | Retirados |
|----|-----|----------|------|------------|--------|-----------|
| `US-PAN-01` | 5 | 5 | 5 | 0 | 0 | 0 |
| `US-PAN-02` | 3 | 2 | 2 | 0 | 0 | 1 (`AC-PAN-02-3`) |
| **Total** | **8** | **7** | **7** | **0** | **0** | **1** |

Totales: **2 historias y 8 criterios identificados**: **7 `OK`** (vigentes, con test) y **1 retirado** (`AC-PAN-02-3`). Los 7 vigentes se apoyan en una regla de negocio confirmada: `RN-PAN-01` ×6, `RN-INV-44` ×1 y `RN-PAN-02` ×1 — **8 citas** para **7 criterios**, porque `AC-PAN-01-4` cita dos reglas. Ninguno es `Estándar`, `Derivada` ni `OPEN`. Los ids siguen siendo **8** porque el criterio retirado conserva su número. `RN-PAN-02` aplica además como criterio de coherencia a todo indicador que duplica una pantalla de detalle (`AC-PAN-01-2`, `AC-PAN-01-5`), aunque esas menciones no cuenten como `Origen`.

## Anexo — Datos de prueba

Los valores de esta tabla son **ejemplos**: no son requisitos y QA elige los suyos. Los criterios fijan la clase de actor, la de estado y los límites de la regla; estos datos solo registran con qué se ejecutan las pruebas del módulo.

| Dato | Valor usado |
|------|-------------|
| Administrador del seed | `admin@sena.edu.co` / `AdminSENA2024` |
| Instructor del seed usado en `US-PAN-02` | `cmendoza@sena.edu.co` / `Instructor2024` |
| Padrón de `AC-PAN-01-1` | 5 instructores activos y 2 inactivos |
| Catálogo de `AC-PAN-01-2` | 120 elementos registrados, con páginas de 20 |
| Solicitudes de `AC-PAN-01-3` | 7 pendientes, 3 aprobadas, 2 en entrega parcial y 4 completadas |
| Umbral mínimo de los elementos de `AC-PAN-01-4` | 5, con cantidad disponible de hoy 5, 2 y 6 |
| Catálogo de `AC-PAN-01-4` (caso de cero) | todos los elementos por encima de su umbral mínimo |
| Solicitudes de `AC-PAN-01-5` | «S-3» del instructor `cmendoza`, creada el 20 de abril, y dos anteriores del 10 y del 2 de abril |
| Solicitudes de `AC-PAN-02-1` | 2 activas de `cmendoza` —una pendiente y una en entrega parcial—, más una completada, una cancelada y una rechazada; 3 activas de otro instructor |
| Unidades de `AC-PAN-02-2` | 2 prestadas sin devolver de `cmendoza`, 1 ya devuelta y 3 de otro instructor |
| Solicitud de `AC-PAN-02-2` (entrega parcial) | `PARTIALLY_DELIVERED` con 1 unidad entregada y 1 sin entregar |
| Unidad de `AC-PAN-02-2` (unidad perdida) | una de las prestadas de `cmendoza`, declarada perdida con su trámite de baja abierto |
| Otro instructor de `AC-PAN-02-1` y `AC-PAN-02-2` | otro instructor activo del seed con solicitudes y préstamos propios |

Los usuarios salen del seed del proyecto (`AGENTS.md` §4). Los instructores, los elementos, las solicitudes y los préstamos son datos de los epics 02, 04, 06 y 07: acá se leen, no se crean. El carrito **no es un dato de prueba de este epic**: no lo guarda el servidor.
