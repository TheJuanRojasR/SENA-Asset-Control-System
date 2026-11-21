# Epic 07 — Préstamos y devoluciones

Devolución de lo entregado, condición de retorno, daño con tarea pendiente, pérdida declarada y cierre del préstamo.

## Resumen

Este módulo es la **devolución**: qué unidades vuelven, cómo vuelve cada una, qué se hace con un daño y cuándo el préstamo termina. Es el otro extremo del ciclo que abre una solicitud entregada; el préstamo «empieza al retirar y termina al devolver».

Existe para responder dos preguntas que hoy se contestan caminando al almacén: quién tiene cada elemento y desde cuándo, y cómo volvió lo que ya regresó. `RN-PRE-02` exige poder responderlas **siempre**, con préstamos de un mes o más.

Lo usan **ambos actores**, con papeles distintos: el administrador **recibe** —revisa el estado, registra la devolución, resuelve el daño y declara la pérdida— y el instructor **devuelve** y consulta **solo sus propios** préstamos (`RN-CTX-05`, `RN-PRE-17`).

Este módulo es dueño de **la devolución y la condición de retorno**, de **la tarea pendiente por daño**, de **la pérdida declarada** y del **cierre del préstamo**. Los estados y las transiciones de la solicitud son del epic 06; los estados físicos de la unidad y sus reglas de préstamo, del epic 05; el cálculo de la disponibilidad para un rango, del epic 08; el historial completo de movimientos, del epic 11. Acá se produce la devolución y se lee su consecuencia.

Estado: **especificado y no ejecutado**. Seis historias, 37 criterios, ninguno `OK` ni `GAP` hoy.

## Índice de historias

| Historia | Título en lenguaje llano | Criterios | Prioridad |
|----------|--------------------------|-----------|-----------|
| `US-PRE-01` | Consultar los préstamos activos | 5 | Alta |
| `US-PRE-02` | Registrar una devolución | 10 | Alta |
| `US-PRE-03` | Registrar daños en la devolución | 9 | Alta |
| `US-PRE-04` | Cerrar el préstamo | 5 | Alta |
| `US-PRE-05` | Declarar la pérdida de una unidad prestada | 5 | Alta |
| `US-PRE-06` | Consultar el historial de devoluciones | 3 | Media |
| **Total** | | **37** | |

## Alcance

**Incluye**

- La consulta de las unidades **prestadas**, con su tenedor, la fecha de retiro y la fecha estimada de devolución (`RN-PRE-02`, `RN-NEG-04`).
- El registro de la devolución de **unidades concretas**, total o parcial (`RN-PRE-01`, `RN-PRE-04`).
- La **condición de retorno obligatoria** de cada unidad serializada devuelta, en dos ejes más una descripción (`RN-PRE-08`, `RN-PRE-10`).
- El **mapeo automático** de la condición al estado físico de la unidad y la corrección posterior del administrador (`RN-PRE-11`, `RN-PRE-12`).
- El **daño, la pieza faltante y la falla** como hecho registrado y como **tarea pendiente** de dos estados (`RN-PRE-06`, `RN-PRE-13`, `RN-PRE-09`).
- La **pérdida declarada** de una unidad prestada, con motivo y actor (`RN-PRE-15`, `RN-INV-17`).
- El **cierre del préstamo**: `PARTIALLY_RETURNED` mientras falte algo y `COMPLETED` cuando no queda nada afuera (`RN-PRE-01`, `RN-SOL-12`).
- La **consulta del historial de devoluciones**, con los filtros de `RN-MOV-02` y paginada (`RN-CTX-02`).

**No incluye**

| Tema | Dónde se especifica |
|------|---------------------|
| Crear, aprobar, rechazar, empacar, entregar, cancelar o expirar una solicitud, y los estados y transiciones de su ciclo de vida | Epic 06 (`RN-SOL-01` a `RN-SOL-11` y la tabla de ciclo de vida de `00-contexto-negocio.md` §6). Acá se lee el estado de origen y se exige el de destino que la devolución produce |
| La entrega parcial que deja la solicitud en `PARTIALLY_DELIVERED` | Epic 06 (`US-SOL-06`, `RN-SOL-11`). `AC-PRE-02-2` solo verifica que lo ya entregado se devuelve como cualquier préstamo y que la solicitud no cambia de estado por esa devolución |
| Los estados físicos de la unidad, su significado y qué se presta en cada uno (`RN-INV-30`, `RN-INV-31`, `RN-INV-36`) | Epic 05. Acá solo se usa el vocabulario, el mapeo de `RN-PRE-12` y `RN-INV-31` como criterio de si la unidad vuelve a prestarse |
| La baja de la unidad dañada o perdida: su procedimiento, su confirmación y el trámite de 6 meses a 1 año (`RN-INV-17`, `RN-INV-19`, `RN-INV-33`) | Epic 05. Acá se exige que la pérdida **registre el motivo y arranque** el camino que corresponde a su tenencia |
| Las acciones concretas con las que se resuelve la tarea por daño —reparar, descartar, dar de baja— | Epic 05. `RN-PRE-09` fija quién la resuelve, cómo y con qué opcionalidad; ver *Decisiones tomadas* |
| El cálculo de la disponibilidad para un rango de fechas y la disponibilidad futura de una unidad prestada (`RN-NEG-05`) | Epic 08. Acá solo se delimita qué significa que una unidad «siga prestada» (`AC-PRE-01-1`, `AC-PRE-02-2`, `AC-PRE-05-3`) |
| El historial completo de movimientos —altas, entregas, bajas, ajustes de cantidad— y su pantalla | Epic 11 (`RN-MOV-01`, `RN-MOV-02`). Acá se especifica la lectura de las **devoluciones** sobre ese registro |
| Notificar una devolución, un daño o una pérdida al instructor, al administrador o a un tercero | Ninguna regla lo pide; ningún criterio lo exige |
| Plazos, sanciones o bloqueos por devolución tardía | `RN-PRE-07` establece que **no existen**: la fecha estimada es informativa (`RN-PRE-18`) y llegar tarde se acepta igual que a tiempo (`AC-PRE-01-5`) |
| El costo, la responsabilidad o el resarcimiento de un daño o de una pérdida | Ninguna regla los menciona; `RN-PRE-06` y `RN-PRE-15` niegan la consecuencia sobre el instructor |
| Exportar o imprimir los listados | Ninguna regla lo pide |

## Actores y permisos

| Actor | Puede | No puede |
|-------|-------|----------|
| **Administrador** (instructor encargado del almacén) | Consultar los préstamos activos, registrar devoluciones totales o parciales con su condición de retorno, resolver la tarea por daño, corregir el estado físico de la unidad, declarar la pérdida y consultar el historial de devoluciones | **Rechazar** una devolución: siempre recibe el elemento (`RN-PRE-13`). Reabrir una tarea resuelta (`RN-PRE-09`). Devolver una unidad que esa solicitud no tiene prestada (`AC-PRE-02-5`). Devolver dos veces la misma unidad (`AC-PRE-04-3`) |
| **Instructor** (quien dicta la clase) | Consultar **solo sus propios** préstamos activos (`RN-PRE-17`) y devolver lo que tiene en voz alta, que el administrador registra | Consultar los préstamos de otro instructor. Registrar una devolución. Resolver la tarea por daño (`AC-PRE-03-5`). Declarar una pérdida. Consultar el historial del administrador (`RN-MOV-02`) |
| **Sin credencial** | Nada: una petición sin sesión no es un actor | Consultar o registrar cualquier cosa (epic 01, `AC-AUTH-05-2`) |

No hay un tercer rol: el administrador **es** un instructor (`RN-CTX-05`).

## Reglas de negocio

| ID | Regla | Ejemplo |
|----|-------|---------|
| `RN-PRE-01` | La devolución **puede ser parcial** | Devolver dos de tres unidades deja la tercera prestada al mismo instructor |
| `RN-PRE-02` | Se debe poder saber **siempre** quién tiene cada elemento y **desde cuándo**, con préstamos de un mes o más | Una unidad devuelta registra la fecha en que volvió, deja de figurar como prestada y esa fecha no se reescribe |
| `RN-PRE-03` | Al devolver se **revisa el estado físico** de cada elemento **antes de guardarlo** | Una devolución sin condición de retorno se rechaza sin efectos, porque no hubo revisión |
| `RN-PRE-04` | El registro de la devolución lo hace el **administrador**, seleccionando las **unidades concretas** | Una devolución de «dos de tres» sin seriales se rechaza; con dos seriales devuelve exactamente esos dos |
| `RN-PRE-05` | Cada unidad devuelta anota su **condición de retorno**, en una escala **distinta** de la del estado físico de la unidad, más una **descripción** libre | La condición se registra por unidad, no una sola vez por devolución |
| `RN-PRE-06` | Un elemento devuelto dañado queda **registrado** y genera una **tarea pendiente visible** para el administrador, **sin consecuencia** para el instructor | Una unidad que vuelve dañada deja una tarea abierta y el instructor sigue activo y sin sanción |
| `RN-PRE-07` | **No existe plazo de devolución**: la fecha estimada es una declaración del instructor y no produce bloqueo, sanción ni plazo forzoso | Devolver después de la fecha estimada se acepta igual que a tiempo |
| `RN-PRE-08` | La condición de retorno registra **dos dimensiones independientes** —funcionamiento y estado al devolver— más una descripción libre | Dos unidades que difieren solo en el funcionamiento quedan distinguibles entre sí |
| `RN-PRE-09` | La **tarea por daño** la resuelve el **administrador** cambiando su estado, con **nota opcional**; tiene **dos estados**, no se reabre y una falla nueva abre una tarea nueva | Una tarea resuelta sin nota es válida; la misma unidad que vuelve a fallar deja una tarea nueva y la anterior sigue resuelta |
| `RN-PRE-10` | La condición de retorno usa **dos ejes** con listas cerradas —`FUNCIONA` · `FUNCIONA_CON_FALLA` · `NO_FUNCIONA` y `SIN_DAÑO` · `DESGASTE_NORMAL` · `DAÑADO`— más descripción, y es **obligatoria** en toda unidad serializada devuelta | `DESGASTE_NORMAL` con `FUNCIONA` no abre tarea; `NO_FUNCIONA` con `SIN_DAÑO` sí |
| `RN-PRE-11` | La condición de retorno **actualiza el estado físico de la unidad** en la misma operación de devolución | Una unidad que vuelve `NO_FUNCIONA` queda `CON_FALLA` sin un paso aparte |
| `RN-PRE-12` | **Decisión técnica delegada**: fija el **mapeo** de la condición de retorno al estado físico de la unidad | `FUNCIONA` + `DAÑADO` deja la unidad `OPERATIVO`, prestable, con su tarea por daño abierta |
| `RN-PRE-13` | La devolución **no se puede rechazar**: el administrador siempre **recibe** el elemento y deja una **nota pendiente** cuando falta algo, algo no funciona o algo vuelve dañado | Una unidad que no funciona y vuelve dañada se registra igual y deja su nota pendiente |
| `RN-PRE-14` | Completar después de una devolución parcial **no reescribe ni duplica** los registros de devolución ya existentes | Devolver lo que falta agrega exactamente esas devoluciones y conserva la fecha y la condición de la anterior |
| `RN-PRE-15` | Cuando una unidad prestada **se pierde**, el **administrador declara la pérdida** y esta se registra como el **motivo de la baja**, con motivo y actor; el instructor no recibe consecuencia pero **queda registrado como quien la tenía** | Una unidad perdida sale del inventario activo, no bloquea disponibilidad y la solicitud se resuelve con las demás |
| `RN-PRE-16` | Una unidad perdida queda registrada como **perdida**, distinguible de una unidad que **no fue devuelta** | La consulta informa una unidad perdida con su baja y una no devuelta como prestada |
| `RN-PRE-17` | El instructor ve **solo sus propios** préstamos | La consulta de un instructor no devuelve ni el número de serie de la unidad de otro |
| `RN-PRE-18` | Una unidad con **fecha estimada vencida** se muestra con una **marca informativa**, **sin estado propio y sin consecuencia** | La unidad vencida figura marcada, sigue prestada y conserva su estado físico |
| `RN-SOL-11` | Una **entrega parcial** deja la solicitud en `PARTIALLY_DELIVERED`; lo ya entregado se rige por `RN-PRE-01` a `RN-PRE-18` y lo pendiente sigue comprometido | Una unidad entregada a medias se devuelve como cualquier préstamo y la solicitud sigue esperando el resto |
| `RN-SOL-12` | **La solicitud se completa cuando no queda nada afuera**: todo lo entregado volvió con su condición de retorno o fue declarado perdido | Devolver la última unidad afuera, o declarar perdida la única que faltaba, deja la solicitud `COMPLETED` |
| `RN-CTX-02` | El volumen es de **1.000 a 1.500** equipos y elementos y unos **100 instructores**: la paginación es un **bloqueo funcional** | La consulta de préstamos activos devuelve una página acotada y el total |
| `RN-CTX-05` | Dos actores y ninguno más: el administrador revisa, verifica, entrega y **recibe**; el instructor solicita, recoge y **devuelve** | Registrar la devolución y resolver la tarea por daño son acciones del administrador |
| `RN-NEG-04` | Cada solicitud declara **fecha de retiro** y **fecha estimada de devolución**, y la reserva ocupa el rango completo | La consulta de préstamos activos informa las dos fechas por unidad |
| `RN-NEG-05` | Una unidad **prestada y todavía no devuelta** no está disponible para **ningún rango futuro** hasta que su devolución se registre | Una unidad declarada perdida deja de bloquear porque sale del inventario activo |
| `RN-INV-06` | Los consumibles **no tienen número de serie** y **no se devuelven**: se consumen al entregarse | Un consumible entregado no aparece entre las unidades por devolver |
| `RN-INV-07` | Los equipos del SENA deben poder presentarse **completos** en una auditoría | Una unidad a la que le falta una pieza deja su nota pendiente con la pieza faltante |
| `RN-INV-11` | Un consumible se controla **por cantidad** y su stock baja **al registrar la entrega** | Su cantidad no depende de fechas y no vuelve al registrarse una devolución |
| `RN-INV-13` | **Ninguna unidad se pierde sin quedar registrada** | Declarar la pérdida deja una baja registrada con motivo y actor |
| `RN-INV-14` | Los elementos **donados** se dan de baja **de inmediato y sin consecuencia administrativa** | Una unidad donada perdida queda dada de baja en el acto |
| `RN-INV-16` | Los listados muestran **todas** las unidades, sin ocultar las que son componentes | Una unidad perdida o en trámite sigue apareciendo en el inventario |
| `RN-INV-17` | Toda baja exige **motivo y actor**, queda auditable y **no se puede deshacer** | La pérdida se registra con su motivo y su actor y no se revierte |
| `RN-INV-19` | La baja de un equipo **del SENA** exige **confirmación** y un trámite de **6 meses a 1 año**; hasta confirmarla la unidad sigue existiendo | Una unidad del SENA perdida entra al trámite y todavía no figura dada de baja |
| `RN-INV-30` | Los estados físicos son una **lista cerrada** de seis: `OPERATIVO`, `DESCARGADO_AGOTADO`, `CON_FALLA`, `AVERIADO`, `EN_MANTENIMIENTO`, `DADO_DE_BAJA` | El estado resultante de una devolución es uno de esos seis |
| `RN-INV-31` | Fija **qué se puede prestar** según el estado físico de la unidad | Una unidad devuelta en `CON_FALLA` no se presta como unidad; sus piezas sueltas sí |
| `RN-INV-33` | Una unidad **en trámite de baja** queda bloqueada —no se presta ni ella ni sus piezas sueltas—, salvo que haya sido **declarada perdida** | Una unidad en trámite deja de contarse mientras el trámite está abierto |
| `RN-INV-36` | `CON_FALLA` es el estado de un equipo **reparable** y `AVERIADO` el de uno **no reparable**; la conducta de préstamo de los dos es la misma | Una unidad devuelta que no funciona queda `CON_FALLA` y el administrador decide después si la manda a reparar |
| `RN-MOV-01` | El sistema **registra** un historial de movimientos con tipo, unidad o elemento, actor, fecha y solicitud asociada | La devolución es un movimiento del historial, con su actor y su fecha |
| `RN-MOV-02` | El historial es **consultable por el administrador**, con filtros por **unidad, elemento, tipo de movimiento y rango de fechas** | Un filtro por tipo deja solo los movimientos de devolución y descarta las entregas |
| `Estándar` | Invariantes técnicos: una devolución solo se refiere a lo que esa solicitud tiene prestado, una unidad se devuelve una sola vez y una respuesta es coherente entre endpoints | Devolver en una solicitud una unidad prestada en otra se rechaza sin efectos |

## Devolución y condición de retorno

Es el contrato central del módulo y se declara una sola vez. Ningún criterio puede cambiarlo por su cuenta.

**Qué exige registrar una devolución**

| Elemento | Exigencia | Regla |
|----------|-----------|-------|
| Unidades | las **concretas**, identificadas por su número de serie, nunca una cantidad | `RN-PRE-04` |
| Condición de retorno | **obligatoria** en cada unidad serializada devuelta | `RN-PRE-03`, `RN-PRE-10` |
| Descripción | texto libre por unidad | `RN-PRE-05` |
| Fecha de devolución | la unidad registra cuándo volvió y deja de figurar como prestada | `RN-PRE-02` |
| Estado físico | se actualiza **en la misma operación** con el mapeo de abajo; el administrador puede corregirlo después | `RN-PRE-11`, `RN-PRE-12` |

**Los dos ejes**

| Eje | Valores admitidos | Genera tarea por daño |
|-----|-------------------|----------------------|
| **Funcionamiento** | `FUNCIONA` · `FUNCIONA_CON_FALLA` · `NO_FUNCIONA` | Sí cuando no es `FUNCIONA` |
| **Estado al devolver** | `SIN_DAÑO` · `DESGASTE_NORMAL` · `DAÑADO` | Sí cuando es `DAÑADO` |
| **Descripción** | texto libre | — |

Los dos ejes son **independientes y separados**: un valor de un eje escrito en el otro se rechaza (`AC-PRE-02-6`). El **estado al devolver** no es el **estado físico de la unidad** (`RN-INV-30`): el primero dice cómo volvió, el segundo en qué condición está ahora.

**El mapeo al estado físico (`RN-PRE-12`)**

| Funcionamiento | Estado al devolver | Estado físico resultante | ¿Se presta? |
|----------------|--------------------|--------------------------|-------------|
| `FUNCIONA` | `SIN_DAÑO` | `OPERATIVO` | Sí |
| `FUNCIONA` | `DESGASTE_NORMAL` | `OPERATIVO` | Sí |
| `FUNCIONA` | `DAÑADO` | `OPERATIVO`, con la tarea por daño abierta | Sí |
| `FUNCIONA_CON_FALLA` | cualquiera | `CON_FALLA` | No; sus piezas sueltas sí |
| `NO_FUNCIONA` | cualquiera | `CON_FALLA` | No; sus piezas sueltas sí |

Los cuatro estados severos —`AVERIADO`, `DESCARGADO_AGOTADO`, `EN_MANTENIMIENTO` y `DADO_DE_BAJA`— **no se asignan automáticamente**: los pone el administrador a mano después de revisar, y el procedimiento de cada uno es del epic 05.

**La tarea por daño**

| Aspecto | Exigencia |
|---------|-----------|
| Cuándo nace | cuando la condición registra una **pieza faltante**, un elemento que **no funciona** o un elemento **dañado** (`RN-PRE-06`, `RN-PRE-13`) |
| Estados | **exactamente dos**: pendiente y resuelta |
| Quién la resuelve | el **administrador** |
| Cómo | cambiando su estado, con **nota opcional** de lo que se hizo |
| Reapertura | una tarea resuelta **no se reabre** |
| Falla nueva | abre una **tarea nueva**; cada evento conserva su propia tarea |
| Consecuencia para el instructor | **ninguna**: ni bloqueo ni sanción |
| Rechazo de la devolución | **no existe**: el administrador siempre recibe el elemento |

**Qué produce la devolución en la solicitud**

Los estados y las transiciones del ciclo de vida son del epic 06; estas son las que produce esta operación:

| Lo que vuelve | Efecto en la solicitud | Regla |
|---------------|------------------------|-------|
| Parte de lo entregado, con el resto afuera | `PARTIALLY_RETURNED` | `RN-PRE-01` |
| Todo lo entregado | `COMPLETED` | `RN-PRE-01`, `RN-SOL-12` |
| Parte de una solicitud en `PARTIALLY_DELIVERED` | Sigue en `PARTIALLY_DELIVERED`: manda el pendiente de entrega | `RN-SOL-11` |
| Nada, porque se declara perdida la última unidad que estaba afuera | `COMPLETED`, con el evento de pérdida registrado | `RN-PRE-15`, `RN-SOL-12` |

**Lo que este contrato no decide.** Un consumible **no entra al flujo de devolución** (`RN-INV-06`): no se devuelve y nunca lleva condición de retorno. Qué acciones admite la resolución de la tarea, y si una falta obliga a reparar o a dar de baja la unidad, es del epic 05 (`RN-INV-17`, `RN-INV-19`). Cómo distingue el sistema una descripción que reporta un faltante de una que no, y qué forma tiene la respuesta, ninguna regla lo fija; ver *Decisiones tomadas*.

## Historias de usuario

Los criterios nombran la **clase** de actor y de estado —«un administrador», «un instructor», «una solicitud entregada con dos unidades prestadas», «una unidad devuelta con funcionamiento correcto y desgaste normal»—. Los valores concretos con los que se ejecutan los escenarios están en el `Anexo — Datos de prueba`, al final del documento, y son ejemplos, no requisitos.

### US-PRE-01 — Consultar los préstamos activos

**Como** administrador del almacén **quiero** consultar qué unidades están prestadas, a quién y desde y hasta qué fecha **para** saber qué hay afuera y a quién reclamárselo sin buscar equipo por equipo.

**Prioridad:** alta — `RN-PRE-02` exige saber siempre quién tiene cada elemento y desde cuándo, y hoy ninguna verificación cubre esa consulta.
**Estado:** especificada — no ejecutada.

La consulta lista unidades **en manos de alguien**, no unidades del catálogo, y una unidad devuelta deja de figurar en ella. La fecha estimada de devolución se **informa** y no se **aplica**: su marca de vencida es informativa (`RN-PRE-18`) y llegar tarde no tiene ninguna consecuencia (`RN-PRE-07`).

#### AC-PRE-01-1 — La consulta lista las unidades prestadas con su tenedor y sus dos fechas

**Dado** un instructor con dos unidades entregadas, una solicitud con su fecha de retiro y su fecha estimada de devolución, una unidad del inventario ya devuelta por otro instructor y un administrador con sesión iniciada.
**Cuando** el administrador consulta los préstamos activos.
**Entonces**:

- la respuesta es `200`;
- la consulta lista las dos unidades prestadas, identificadas por su número de serie;
- por cada una informa el instructor que la tiene, la fecha de retiro y la fecha estimada de devolución de la solicitud;
- la unidad ya devuelta no figura en la consulta.

Los cuatro datos por unidad son los que `RN-PRE-02` exige —quién y desde cuándo— y las dos fechas son las de `RN-NEG-04`. El préstamo termina al devolver, así que una unidad devuelta que siguiera figurando como préstamo activo convertiría la consulta en un inventario de rumores.

#### AC-PRE-01-2 — Una fecha estimada ya pasada figura como vencida, sin ninguna consecuencia

**Dado** un instructor con una unidad prestada, la fecha estimada de devolución de esa solicitud anterior a hoy y un administrador con sesión iniciada.
**Cuando** el administrador consulta los préstamos activos.
**Entonces**:

- la respuesta es `200`;
- la unidad figura marcada como vencida;
- la unidad sigue figurando como prestada, al mismo instructor;
- la unidad conserva su fecha de retiro registrada.

**Y dado** un instructor con una unidad prestada cuya fecha estimada de devolución ya pasó, ese instructor con sesión iniciada, un número conocido de solicitudes de ese instructor y un elemento con stock disponible.
**Cuando** el instructor crea una nueva solicitud.
**Entonces**:

- la respuesta es `201`;
- el número de solicitudes aumenta en `1`;
- el instructor no figura bloqueado;
- la unidad vencida conserva su estado físico;
- la unidad vencida sigue figurando como prestada.

Las dos mitades tienen regla propia: la **marca** la fija `RN-PRE-18` y la **ausencia de consecuencia** la fija `RN-PRE-07`. El criterio no afirma nada sobre devoluciones tardías porque no hay regla que las prohíba: una unidad con la fecha estimada pasada se devuelve como cualquier otra (`US-PRE-02`).

#### AC-PRE-01-3 — El instructor solo ve sus propios préstamos

**Dado** una unidad prestada a un instructor, otra unidad prestada a otro instructor y el primer instructor con sesión iniciada.
**Cuando** el primer instructor consulta los préstamos activos.
**Entonces**:

- la respuesta es `200`;
- la consulta lista la unidad prestada a él;
- la consulta no lista la unidad prestada al otro instructor;
- la consulta no informa ningún dato de la unidad prestada al otro instructor.

`RN-PRE-17` fija el alcance y la última condición fija su límite: una consulta que devolviera el número de serie del préstamo ajeno con el nombre oculto seguiría violando la regla.

#### AC-PRE-01-4 — La consulta de préstamos activos es paginada y devuelve el total

**Dado** un conjunto de unidades prestadas mayor que el tamaño de página de la consulta y un administrador con sesión iniciada.
**Cuando** el administrador consulta la primera página de préstamos activos.
**Entonces**:

- la respuesta es `200`;
- la consulta devuelve como máximo el tamaño de página de unidades prestadas;
- la consulta informa el total de unidades prestadas.

`RN-CTX-02` hace de la paginación un **bloqueo funcional** con 1.000 a 1.500 equipos y elementos, y el total es lo que permite saber cuánto hay afuera sin pedirlo todo. El tamaño de página y la forma de la respuesta no los fija ninguna regla.

#### AC-PRE-01-5 — La fecha estimada de devolución no tiene ningún efecto sobre la devolución

**Dado** un instructor con una unidad prestada, la fecha estimada de devolución de esa solicitud **anterior a hoy**, un administrador con sesión iniciada y el número conocido de devoluciones registradas.
**Cuando** el administrador registra la devolución de esa unidad con su condición de retorno y una descripción.
**Entonces**:

- la respuesta es `200`;
- el número de devoluciones registradas aumenta en `1`;
- la unidad figura como devuelta;
- la unidad deja de figurar como prestada a ese instructor;
- la condición de retorno queda registrada tal como se indicó;
- la devolución no registra ninguna penalidad, sanción ni marca por haber llegado tarde;
- el instructor no figura bloqueado ni sancionado.

**Y dado** el mismo escenario con la fecha estimada de devolución **posterior a hoy**.
**Cuando** el administrador registra la devolución de esa unidad con su condición de retorno y una descripción.
**Entonces** el resultado es el mismo: la devolución se acepta, queda registrada y el instructor no figura bloqueado ni sancionado.

Los dos escenarios difieren **solo** en la fecha estimada y esperan el **mismo** resultado: eso es lo que demuestra que la fecha no tiene efecto sobre la devolución. `RN-PRE-07` es una negación, y una prueba que solo cubriera el caso tardío la dejaría pasar en un sistema que tratara distinto las dos situaciones.

### US-PRE-02 — Registrar una devolución

**Como** administrador del almacén **quiero** registrar la devolución indicando exactamente qué unidades vuelven, en qué condición y con qué descripción **para** que el almacén vuelva a saber qué tiene y quede asentado cómo volvió cada unidad.

**Prioridad:** alta — es el paso 7 del proceso real y el único punto donde se cierra un préstamo; hoy el registro de la devolución no tiene ninguna verificación automatizada.
**Estado:** especificada — no ejecutada.

Se distinguen tres cosas que el lenguaje diario mezcla: **qué unidades vuelven** (`RN-PRE-04`), que la devolución **puede ser parcial** (`RN-PRE-01`) y **cómo vuelve cada una** (`RN-PRE-05`, `RN-PRE-08`, `RN-PRE-10`). El administrador **no puede rechazar** una devolución (`RN-PRE-13`) y la condición de retorno es **obligatoria** (`AC-PRE-02-10`), porque la revisión de `RN-PRE-03` ocurre antes de guardar. El mapeo de la condición al estado físico y la tarea por daño están declarados en *Devolución y condición de retorno*.

#### AC-PRE-02-1 — Registrar una devolución exige seleccionar las unidades concretas

**Dado** una solicitud entregada con dos unidades prestadas a un instructor, un administrador con sesión iniciada y el número conocido de devoluciones registradas.
**Cuando** el administrador intenta registrar una devolución sin indicar unidades.
**Entonces**:

- la operación se rechaza;
- la respuesta indica que debe indicarse al menos una unidad;
- el número de devoluciones registradas no cambia;
- las dos unidades siguen prestadas al instructor;
- la solicitud conserva su estado.

**Y dado** una solicitud entregada con tres unidades prestadas, identificadas por su número de serie, y un administrador con sesión iniciada.
**Cuando** el administrador registra la devolución indicando los seriales de dos de esas tres unidades, con la condición de retorno de cada una.
**Entonces**:

- la respuesta es `200`;
- las dos unidades indicadas figuran como devueltas;
- la tercera unidad no figura como devuelta.

La devolución es **de unidades**, no de cantidades: una devolución sin unidades no describe ningún hecho físico y una devolución de «las que quiera» haría que la selección del administrador no significara nada.

#### AC-PRE-02-2 — La devolución puede ser parcial y lo no devuelto sigue prestado

**Dado** una solicitud entregada con tres unidades prestadas a un instructor y un administrador con sesión iniciada.
**Cuando** el administrador registra la devolución de dos de esas tres unidades con la condición de retorno de cada una.
**Entonces**:

- la respuesta es `200`;
- las dos unidades devueltas dejan de figurar como prestadas;
- la unidad no seleccionada sigue figurando como prestada;
- la unidad no seleccionada sigue registrando al mismo instructor como tenedor;
- la unidad no seleccionada conserva la fecha de retiro registrada.

**Y dado** una solicitud en estado `PARTIALLY_DELIVERED` con dos de tres unidades ya entregadas al instructor y un administrador con sesión iniciada.
**Cuando** el administrador registra la devolución de una de esas dos unidades con su condición de retorno.
**Entonces**:

- la respuesta es `200`;
- la unidad devuelta deja de figurar como prestada;
- la otra unidad ya entregada sigue figurando como prestada al mismo instructor;
- la solicitud sigue en estado `PARTIALLY_DELIVERED`;
- la unidad que falta entregar sigue comprometida con la solicitud.

Lo que vuelve deja de estar prestado y lo que no vuelve sigue prestado **exactamente como estaba**. `RN-SOL-11` remite la parte ya entregada de una solicitud `PARTIALLY_DELIVERED` a las reglas del préstamo, así que una unidad puede volver antes de que se entregue el resto; la solicitud no cambia de estado porque el pendiente de entrega manda y el cierre exige que no quede nada afuera (`RN-SOL-12`).

#### AC-PRE-02-3 — Cada unidad devuelta registra su condición de retorno y una descripción

**Dado** una solicitud entregada con dos unidades prestadas y un administrador con sesión iniciada.
**Cuando** el administrador registra la devolución de las dos unidades indicando para cada una su condición de retorno y una descripción.
**Entonces**:

- la respuesta es `200`;
- cada unidad devuelta registra su condición de retorno;
- cada unidad devuelta registra la descripción indicada;
- la consulta de cada unidad devuelta informa su condición de retorno y su descripción.

La condición se pide **por unidad y no por devolución** porque dos unidades de la misma solicitud pueden volver en condiciones distintas, y una sola condición para las dos convertiría la revisión de `RN-PRE-03` en un trámite. Los **valores** de la escala son los de `RN-PRE-10` (`AC-PRE-02-6`).

#### AC-PRE-02-4 — La unidad devuelta registra su fecha de devolución y vuelve a estar disponible si su estado lo permite

**Dado** una unidad prestada a un instructor y un administrador con sesión iniciada.
**Cuando** el administrador registra la devolución de esa unidad con un funcionamiento `FUNCIONA` y un estado al devolver `SIN_DAÑO`.
**Entonces**:

- la respuesta es `200`;
- la unidad queda en estado físico `OPERATIVO`;
- la unidad vuelve a estar disponible para prestarse, porque `OPERATIVO` es un estado que permite prestar;
- la unidad registra la fecha en que se registró la devolución;
- la unidad ya no figura como prestada a ese instructor;
- la unidad ya no figura en la consulta de préstamos activos.

Registrar la fecha sin liberar deja la unidad inmovilizada; liberar sin registrarla deja un préstamo sin final. La disponibilidad **no es incondicional**: `RN-INV-31` decide con el estado que resulte del mapeo, así que una unidad devuelta con `FUNCIONA_CON_FALLA` queda `CON_FALLA` y no se presta, mientras que `FUNCIONA` + `DAÑADO` queda `OPERATIVO` y sigue prestable con su tarea por daño abierta.

#### AC-PRE-02-5 — Devolver una unidad que no está prestada en esa solicitud se rechaza sin efectos

**Dado** una solicitud entregada con dos unidades prestadas, una unidad del inventario en estado físico `OPERATIVO` que no está prestada, un administrador con sesión iniciada y el número conocido de devoluciones registradas.
**Cuando** el administrador intenta registrar la devolución de esa unidad en esa solicitud.
**Entonces**:

- la operación se rechaza;
- el número de devoluciones registradas no cambia;
- la unidad sigue en estado físico `OPERATIVO` y fuera de la solicitud;
- las dos unidades de la solicitud siguen prestadas.

**Y dado** una solicitud entregada A con una unidad prestada, otra solicitud entregada B con una unidad prestada, un administrador con sesión iniciada y el número conocido de devoluciones registradas.
**Cuando** el administrador intenta registrar en la solicitud A la devolución de la unidad de B.
**Entonces**:

- la operación se rechaza;
- la unidad de B sigue prestada y asociada a la solicitud B;
- la unidad de la solicitud A sigue prestada;
- el número de devoluciones registradas no cambia;
- ninguna de las dos solicitudes cambia de estado.

Sin el invariante, `RN-PRE-02` deja de ser verificable: una unidad podría figurar devuelta por una solicitud que nunca la entregó y su préstamo real quedaría abierto sin registro. El segundo escenario es el que importa, porque la unidad **sí** está prestada y un control que solo mirara el estado global de la unidad la aceptaría.

#### AC-PRE-02-6 — La condición de retorno registra funcionamiento y estado al devolver con la escala aprobada

**Dado** una solicitud entregada con dos unidades prestadas y un administrador con sesión iniciada.
**Cuando** el administrador registra la devolución de las dos unidades indicando para cada una su funcionamiento, su estado al devolver y una descripción.
**Entonces**:

- la respuesta es `200`;
- el funcionamiento registrado es uno de `FUNCIONA`, `FUNCIONA_CON_FALLA` o `NO_FUNCIONA`;
- el estado al devolver registrado es uno de `SIN_DAÑO`, `DESGASTE_NORMAL` o `DAÑADO`;
- la descripción libre queda registrada;
- la consulta de cada unidad devuelta informa las dos dimensiones.

**Y dado** una solicitud entregada con una unidad prestada, un administrador con sesión iniciada y el número conocido de devoluciones registradas.
**Cuando** el administrador intenta registrar la devolución indicando un funcionamiento de `DESGASTE_NORMAL` y un estado al devolver de `FUNCIONA`.
**Entonces**:

- la operación se rechaza;
- el número de devoluciones registradas no cambia;
- la unidad sigue prestada al mismo instructor.

Los dos ejes son obligatorios y **separados**: dos listas cerradas que no se mezclan. Una única escala de seis valores aceptaría el valor cruzado y volvería a colapsar lo que `RN-PRE-08` exige distinguir. Cuándo el registro genera tarea por daño se verifica en `US-PRE-03`; a qué estado físico se traduce cada combinación, en `AC-PRE-02-9`.

#### AC-PRE-02-7 — La condición de retorno actualiza el estado físico de la unidad

**Dado** una unidad prestada en estado físico `OPERATIVO` y un administrador con sesión iniciada.
**Cuando** el administrador registra la devolución de esa unidad con un funcionamiento `FUNCIONA_CON_FALLA` y un estado al devolver `SIN_DAÑO`.
**Entonces**:

- la respuesta es `200`;
- la actualización ocurre en la misma operación de devolución, sin un paso adicional;
- la consulta de la unidad informa el estado físico que fija el mapeo de `RN-PRE-12` para esa combinación;
- ese estado es `CON_FALLA`.

Una actualización diferida dejaría la unidad en el almacén con un estado que ya no es cierto, y `RN-INV-31` decidiría con ese estado si se puede volver a prestar. El criterio exige el **resultado del mapeo** y no un cambio garantizado: `FUNCIONA` + `SIN_DAÑO` deja la unidad en el mismo `OPERATIVO` que ya tenía.

#### AC-PRE-02-8 — La condición de retorno registra funcionamiento y estado al devolver por separado

**Dado** una solicitud entregada con dos unidades prestadas y un administrador con sesión iniciada.
**Cuando** el administrador registra la devolución de las dos unidades indicando para cada una su funcionamiento, su estado al devolver y una descripción.
**Entonces**:

- la respuesta es `200`;
- cada unidad devuelta registra por separado su funcionamiento;
- cada unidad devuelta registra por separado su estado al devolver;
- cada unidad devuelta registra la descripción indicada;
- la consulta de cada unidad devuelta informa las dos dimensiones y la descripción;
- dos unidades devueltas que difieren en una sola de las dos dimensiones quedan distinguibles entre sí.

La última cláusula verifica la **independencia**: con una sola escala ordinal, «regular» no distingue «anda mal» de «está rayado», y las dos cosas llevan a decisiones distintas sobre la unidad.

#### AC-PRE-02-9 — El estado físico de la unidad se determina por el mapeo de `RN-PRE-12`

**Dado** una unidad prestada en estado físico `OPERATIVO` y un administrador con sesión iniciada.
**Cuando** el administrador registra la devolución de esa unidad con un funcionamiento y un estado al devolver de la escala aprobada.
**Entonces**:

- la respuesta es `200`;
- el estado físico de la unidad es el que fija el mapeo para esa combinación:

| Condición de retorno | Estado físico resultante |
|----------------------|--------------------------|
| `FUNCIONA` + `SIN_DAÑO` | `OPERATIVO` |
| `FUNCIONA` + `DESGASTE_NORMAL` | `OPERATIVO` |
| `FUNCIONA` + `DAÑADO` | `OPERATIVO`, y la tarea pendiente por daño se abre igual |
| `FUNCIONA_CON_FALLA` + cualquiera | `CON_FALLA` |
| `NO_FUNCIONA` + cualquiera | `CON_FALLA` |

- la unidad queda en el estado que fija el mapeo, aunque coincida con el que ya tenía.

**Y dado** una unidad prestada en estado físico `OPERATIVO` y un administrador con sesión iniciada.
**Cuando** el administrador registra la devolución indicando funcionamiento `NO_FUNCIONA` y estado al devolver `DAÑADO`.
**Entonces**:

- la respuesta es `200`;
- la unidad queda en estado `CON_FALLA`;
- la unidad no queda en `AVERIADO`;
- la unidad no queda en `DESCARGADO_AGOTADO`;
- la unidad no queda en `EN_MANTENIMIENTO`;
- la unidad no queda en `DADO_DE_BAJA`;
- un administrador con sesión iniciada puede corregir el estado físico de la unidad a mano;
- la condición de retorno registrada en la devolución se conserva.

`RN-PRE-12` decide la fila que separa el desgaste de la falla y la que deja prestable una unidad que **funciona** aunque vuelva **dañada**: el daño no se pierde, queda en la condición de retorno y abre su tarea pendiente. El segundo escenario fija el **límite** del mapeo automático: los cuatro estados severos no se asignan solos, porque el mapeo no distingue «se agotó» de «se rompió» y no decide por sí mismo una baja, que arrastra `RN-INV-17` y, para el SENA, `RN-INV-19`.

#### AC-PRE-02-10 — Registrar una devolución exige la condición de retorno de cada unidad

**Dado** una solicitud entregada con dos unidades prestadas a un instructor, un administrador con sesión iniciada y el número conocido de devoluciones registradas.
**Cuando** el administrador intenta registrar la devolución de las dos unidades sin indicar su condición de retorno.
**Entonces**:

- la operación se rechaza;
- la respuesta indica que debe indicarse la condición de retorno de cada unidad;
- el número de devoluciones registradas no cambia;
- las dos unidades siguen prestadas al instructor;
- las dos unidades conservan su estado físico;
- la solicitud conserva su estado.

**Y dado** una solicitud entregada con dos unidades prestadas a un instructor y un administrador con sesión iniciada.
**Cuando** el administrador registra la devolución de las dos unidades indicando la condición de retorno de cada una.
**Entonces**:

- la respuesta es `200`;
- las dos unidades figuran como devueltas;
- cada unidad devuelta registra la condición de retorno indicada;
- la unidad ya no figura como prestada a ese instructor.

**Y dado** una solicitud entregada que incluye un consumible ya descontado del stock y un administrador con sesión iniciada.
**Cuando** el administrador consulta las unidades por devolver de esa solicitud.
**Entonces**:

- el consumible no figura entre las unidades por devolver;
- no existe ninguna condición de retorno que registrar para el consumible.

Sin la condición, el sistema guardaría la devolución sin que nadie haya revisado el estado y `RN-PRE-11` y `RN-PRE-12` actualizarían el estado físico desde un dato inexistente. El tercer escenario fija el otro extremo del alcance: un consumible no tiene serie y no vuelve (`RN-INV-06`, `RN-INV-11`), así que la obligación aplica exactamente a lo que **se devuelve**.

### US-PRE-03 — Registrar daños en la devolución

**Como** administrador del almacén **quiero** dejar registrado que una unidad volvió dañada, con su descripción, y tener una tarea pendiente hasta resolverla **para** que el daño no se pierda al guardar la unidad y alguien tenga que ocuparse de ella.

**Prioridad:** alta — `RN-INV-07` exige que los equipos del SENA se puedan presentar completos en una auditoría, y un daño detectado al devolver que no queda registrado se pierde al guardar la unidad.
**Estado:** especificada — no ejecutada.

El daño no es solo un dato histórico: es un trabajo que alguien tiene que hacer y cerrar. `RN-PRE-10` fija **cuándo** nace la tarea, `RN-PRE-09` **quién** la resuelve y **cómo**, y `RN-PRE-13` confirma los tres disparadores —pieza faltante, elemento que no funciona, elemento dañado—. El daño **no** produce ninguna consecuencia sobre el instructor (`RN-PRE-06`).

#### AC-PRE-03-1 — Una devolución con daño queda registrada con su descripción

**Dado** una solicitud entregada con una unidad prestada y un administrador con sesión iniciada.
**Cuando** el administrador registra la devolución de esa unidad indicando que vuelve dañada y una descripción del daño.
**Entonces**:

- la respuesta es `200`;
- la devolución queda registrada como devolución con daño;
- la devolución registra la descripción indicada;
- la consulta de la unidad devuelta informa que volvió dañada y su descripción.

Marcar el daño como una nota cualquiera no cumple la regla: la tarea pendiente de `AC-PRE-03-2` no tendría de dónde nacer ni qué mostrar.

#### AC-PRE-03-2 — El daño genera una tarea pendiente visible para el administrador

**Dado** una solicitud entregada con una unidad prestada y un administrador con sesión iniciada.
**Cuando** el administrador registra la devolución de esa unidad indicando un daño.
**Entonces**:

- la respuesta es `200`;
- queda una tarea pendiente visible para el administrador;
- la tarea pendiente identifica la unidad devuelta y el daño registrado;
- el número de tareas pendientes visibles aumenta en `1`.

**Y dado** una solicitud entregada con una unidad prestada, un administrador con sesión iniciada y el número conocido de tareas pendientes visibles.
**Cuando** el administrador registra la devolución de esa unidad sin registrar daño.
**Entonces**:

- la respuesta es `200`;
- el número de tareas pendientes visibles no cambia.

El control negativo es lo que hace que la tarea signifique algo: generarla por cada devolución cumpliría el primer escenario y vaciaría el registro de daños. La tarea tiene que identificar la unidad y el daño, porque es lo que le permite al administrador saber qué hay que hacer.

#### AC-PRE-03-3 — La tarea pendiente puede marcarse como resuelta

**Dado** una devolución con daño registrada y su tarea pendiente visible, el número conocido de tareas pendientes visibles y un administrador con sesión iniciada.
**Cuando** el administrador marca esa tarea como resuelta.
**Entonces**:

- la respuesta es `200`;
- la tarea deja de figurar entre las tareas pendientes;
- el número de tareas pendientes visibles disminuye en `1`;
- la devolución con daño sigue registrada con su descripción.

Resolver la tarea **no puede borrar el hecho**: la salida cómoda sería borrar la devolución con daño para cerrar la tarea, y eso destruiría la trazabilidad que `RN-INV-07` necesita para la auditoría.

#### AC-PRE-03-4 — El daño no produce ninguna consecuencia sobre el instructor

**Dado** una devolución con daño registrada de un instructor, ese instructor con sesión iniciada, un número conocido de solicitudes de ese instructor y un elemento con stock disponible.
**Cuando** el instructor crea una nueva solicitud.
**Entonces**:

- la respuesta es `201`;
- el número de solicitudes aumenta en `1`;
- el instructor no figura bloqueado;
- el instructor no figura con ninguna sanción registrada;
- el instructor puede consultar sus préstamos activos.

Un bloqueo implementado «por las dudas» es la forma habitual en que una regla de este tipo se incumple sin que nadie lo note. Nada de lo que ocurre con la unidad dañada es asunto del instructor.

#### AC-PRE-03-5 — La tarea la resuelve el administrador, cambiando su estado y con nota opcional

**Dado** una devolución con daño registrada y su tarea pendiente visible, un administrador con sesión iniciada y el número conocido de tareas pendientes visibles.
**Cuando** el administrador resuelve esa tarea indicando el nuevo estado y una nota de lo que se hizo.
**Entonces**:

- la respuesta es `200`;
- la tarea registra el nuevo estado;
- la tarea registra la nota de lo que se hizo;
- la nota de lo hecho se puede volver a leer en la tarea;
- la tarea deja de figurar entre las tareas pendientes;
- el número de tareas pendientes visibles disminuye en `1`;
- la devolución con daño sigue registrada con su descripción.

**Y dado** una devolución con daño registrada y su tarea pendiente visible, un administrador con sesión iniciada y el número conocido de tareas pendientes visibles.
**Cuando** el administrador resuelve esa tarea indicando el nuevo estado y sin dejar nota.
**Entonces**:

- la respuesta es `200`;
- la tarea registra el nuevo estado;
- la tarea queda resuelta sin nota;
- la tarea deja de figurar entre las tareas pendientes;
- el número de tareas pendientes visibles disminuye en `1`;
- la devolución con daño sigue registrada con su descripción.

**Y dado** una devolución con daño registrada y su tarea pendiente visible, el instructor que hizo el préstamo con sesión iniciada y el número conocido de tareas pendientes visibles.
**Cuando** el instructor intenta resolver esa tarea indicando un nuevo estado.
**Entonces**:

- la operación se rechaza;
- la tarea sigue pendiente;
- el número de tareas pendientes visibles no cambia;
- la tarea conserva el estado que tenía.

**Y dado** una devolución con daño registrada y su tarea ya resuelta por el administrador, un administrador con sesión iniciada y el número conocido de tareas pendientes visibles.
**Cuando** el administrador intenta volver a poner esa tarea en estado pendiente.
**Entonces**:

- la operación se rechaza;
- la tarea sigue en estado resuelta;
- el número de tareas pendientes visibles no cambia.

**Y dado** una unidad cuya tarea por daño anterior ya fue resuelta, la misma unidad prestada otra vez y devuelta con un daño nuevo, un administrador con sesión iniciada y el número conocido de tareas pendientes visibles.
**Cuando** el administrador registra la devolución con el daño nuevo.
**Entonces**:

- el número de tareas pendientes visibles aumenta en `1`;
- la tarea nueva figura pendiente;
- la tarea anterior sigue resuelta;
- las dos tareas quedan asociadas a la misma unidad y son distinguibles entre sí.

`RN-PRE-09` afirma las tres cosas que exigen los dos primeros escenarios: la tarea la resuelve el **administrador**, se resuelve **cambiando su estado** y la nota es **opcional**. El tercero fija el actor. El cuarto y el quinto fijan los dos estados: uno resuelto es un registro cerrado y una falla nueva abre una tarea nueva, así que ninguna cambia de significado hacia atrás.

#### AC-PRE-03-6 — Un desgaste normal con funcionamiento correcto no genera tarea por daño

**Dado** una solicitud entregada con una unidad prestada, un administrador con sesión iniciada y el número conocido de tareas pendientes visibles.
**Cuando** el administrador registra la devolución de esa unidad con funcionamiento `FUNCIONA`, estado al devolver `DESGASTE_NORMAL` y una descripción del desgaste.
**Entonces**:

- la respuesta es `200`;
- la devolución queda registrada con ese funcionamiento y ese estado al devolver;
- la devolución registra la descripción indicada;
- el número de tareas pendientes visibles no cambia;
- la devolución no figura como devolución con daño.

`RN-PRE-10` genera tarea solo cuando el funcionamiento no es `FUNCIONA` o el estado al devolver es `DAÑADO`; `DESGASTE_NORMAL` con funcionamiento correcto queda fuera de las dos condiciones. Tratar cualquier desgaste como `DAÑADO` generaría tareas fantasma por cada equipo usado. El desgaste **queda registrado**: la regla evita la tarea, no el dato.

#### AC-PRE-03-7 — A una devolución le falta una pieza y deja una nota pendiente

**Dado** una solicitud entregada con una unidad prestada, un administrador con sesión iniciada y el número conocido de tareas pendientes visibles.
**Cuando** el administrador registra la devolución de esa unidad con funcionamiento `FUNCIONA`, estado al devolver `SIN_DAÑO` y una descripción que reporta la pieza faltante.
**Entonces**:

- la respuesta es `200`;
- la devolución queda registrada como devolución con nota pendiente;
- la devolución registra la descripción indicada;
- el número de tareas pendientes visibles aumenta en `1`;
- la tarea pendiente identifica la unidad devuelta;
- la tarea pendiente muestra la descripción registrada en la devolución;
- la unidad figura como devuelta y ya no figura como prestada.

**Y dado** una solicitud entregada con una unidad prestada, un administrador con sesión iniciada y el número conocido de tareas pendientes visibles.
**Cuando** el administrador registra la devolución de esa unidad con funcionamiento `FUNCIONA`, estado al devolver `SIN_DAÑO` y sin anotar ninguna pieza faltante en la descripción.
**Entonces**:

- la respuesta es `200`;
- el número de tareas pendientes visibles no cambia;
- la devolución no figura como devolución con nota pendiente.

Una unidad que funciona y no tiene daño visible puede volver **incompleta**, y `RN-INV-07` prohíbe que un equipo del SENA al que le falta una pieza no pueda presentarse completo en una auditoría. Qué pieza falta **no es un campo propio**: se escribe en la **descripción libre**, y el criterio exige que ese dato exista y se pueda volver a leer.

#### AC-PRE-03-8 — Una unidad que vuelve sin funcionar deja una nota pendiente

**Dado** una solicitud entregada con una unidad prestada, un administrador con sesión iniciada y el número conocido de tareas pendientes visibles.
**Cuando** el administrador registra la devolución de esa unidad con funcionamiento `NO_FUNCIONA`, estado al devolver `SIN_DAÑO` y una descripción de la falla.
**Entonces**:

- la respuesta es `200`;
- la devolución queda registrada como devolución con nota pendiente;
- la devolución registra la descripción indicada;
- el número de tareas pendientes visibles aumenta en `1`;
- la tarea pendiente identifica la unidad devuelta;
- la unidad figura como devuelta y ya no figura como prestada.

**Y dado** una solicitud entregada con una unidad prestada, un administrador con sesión iniciada y el número conocido de tareas pendientes visibles.
**Cuando** el administrador registra la devolución de esa unidad con funcionamiento `FUNCIONA` y estado al devolver `SIN_DAÑO`.
**Entonces**:

- la respuesta es `200`;
- el número de tareas pendientes visibles no cambia;
- la devolución no figura como devolución con nota pendiente.

`RN-PRE-13` nombra tres disparadores de la nota pendiente: que **falte algo**, que **algo no sirva** y que algo vuelva **dañado**. Este criterio cubre el segundo: una unidad sin daño visible que no funciona también deja nota, y `RN-PRE-10` lo confirma desde la escala.

#### AC-PRE-03-9 — La devolución no se puede rechazar, ni siquiera cuando vuelve dañada

**Dado** una solicitud entregada con una unidad prestada, un administrador con sesión iniciada y el número conocido de devoluciones registradas.
**Cuando** el administrador registra la devolución de esa unidad con funcionamiento `NO_FUNCIONA`, estado al devolver `DAÑADO` y una descripción del daño.
**Entonces**:

- la devolución se registra y no se rechaza;
- el número de devoluciones registradas aumenta en `1`;
- la unidad figura como devuelta y ya no figura como prestada;
- queda una nota pendiente con la descripción registrada;
- el administrador no dispone de ninguna acción para rechazar la devolución.

El escenario usa el peor caso posible porque es el único en el que alguien querría rechazar: si ahí la devolución se registra, la regla se cumple en todos los demás. La nota pendiente no es un rechazo: es la tarea de `RN-PRE-06` y el daño queda registrado en vez de devolver la unidad al instructor.

### US-PRE-04 — Cerrar el préstamo

**Como** administrador del almacén **quiero** que la solicitud quede completada cuando ya no queda nada afuera, y con devolución parcial mientras falte algo **para** saber qué préstamos siguen abiertos sin revisarlos uno por uno.

**Prioridad:** alta — es el desenlace del préstamo, y hoy cerrar una solicitud que ya tenía una devolución parcial duplica los registros de las unidades que ya habían vuelto.
**Estado:** especificada — no ejecutada.

`RN-PRE-01` obliga a que el cierre tenga **dos** desenlaces y `RN-SOL-12` los unifica: la solicitud se completa cuando **no queda nada afuera**. El cierre no es una operación aparte: la solicitud pasa a `COMPLETED` cuando se registra la devolución de la última unidad que estaba afuera, y no existe un paso de «completar» que reescriba el cierre. `PARTIALLY_RETURNED` **no es un final**: se sale de él con la devolución de lo que falta o con la pérdida declarada de lo que no va a volver.

#### AC-PRE-04-1 — Cuando se devuelven todas las unidades, la solicitud queda completada

**Dado** una solicitud en estado `DELIVERED` con dos unidades prestadas y un administrador con sesión iniciada.
**Cuando** el administrador registra la devolución de las dos unidades con la condición de retorno de cada una.
**Entonces**:

- la respuesta es `200`;
- la solicitud queda en estado `COMPLETED`;
- la solicitud registra la fecha en que se completó;
- ninguna unidad de la solicitud figura como prestada;
- la solicitud ya no tiene ninguna unidad en la consulta de préstamos activos;
- no hizo falta ninguna operación de cierre aparte para que la solicitud pasara a `COMPLETED`.

Una solicitud «completada» con una unidad todavía prestada, o con fecha de cierre pero sin liberar el stock, sigue describiendo un préstamo abierto con otro nombre. La última condición es la que hace del cierre la devolución de lo que falta y no una segunda devolución de todo.

#### AC-PRE-04-2 — Cuando se devuelve parte, la solicitud queda en `PARTIALLY_RETURNED`

**Dado** una solicitud en estado `DELIVERED` con tres unidades prestadas y un administrador con sesión iniciada.
**Cuando** el administrador registra la devolución de una de esas tres unidades con la condición de retorno de la unidad devuelta.
**Entonces**:

- la respuesta es `200`;
- la solicitud queda en estado `PARTIALLY_RETURNED`;
- la solicitud no queda en estado `COMPLETED`;
- las dos unidades no devueltas siguen prestadas;
- al menos una de sus unidades sigue figurando en la consulta de préstamos activos.

`RN-PRE-02` necesita que el administrador pueda ver que aún hay algo que reclamar: una solicitud con devolución parcial cuyas unidades desaparecieran del listado las dejaría sin rastro de a quién pedírselas. El estado se nombra con el vocabulario del ciclo de vida del epic 06.

#### AC-PRE-04-3 — Registrar dos veces la devolución de la misma unidad se rechaza

**Dado** una solicitud entregada con una unidad prestada, la devolución de esa unidad ya registrada con su condición de retorno, un administrador con sesión iniciada y el número conocido de devoluciones registradas.
**Cuando** el administrador intenta registrar la devolución de la misma unidad otra vez.
**Entonces**:

- la operación se rechaza;
- el número de devoluciones registradas no cambia;
- la unidad conserva la fecha de devolución de la primera devolución;
- la unidad conserva la condición de retorno registrada la primera vez;
- la solicitud conserva su estado.

El daño real no es el rechazo que falta sino el que se acepta: una segunda devolución aceptada reescribiría la fecha en que la unidad volvió y dejaría el préstamo cerrado dos veces. Una unidad se devuelve una sola vez.

#### AC-PRE-04-4 — La devolución de lo que falta no reescribe ni duplica lo ya devuelto

**Dado** una solicitud en estado `PARTIALLY_RETURNED` con tres unidades entregadas, la devolución de una de esas unidades ya registrada con su fecha y su condición de retorno, las dos unidades restantes prestadas, un administrador con sesión iniciada y el número conocido de devoluciones registradas.
**Cuando** el administrador registra la devolución de las dos unidades restantes con la condición de retorno de cada una.
**Entonces**:

- la unidad devuelta antes conserva su fecha de devolución;
- la unidad devuelta antes conserva su condición de retorno;
- el número de devoluciones registradas aumenta exactamente en `2`;
- ninguna unidad figura con más de una devolución registrada;
- la solicitud queda en estado `COMPLETED`.

`RN-PRE-14` confirma que el cierre **no toca** lo ya devuelto, y `RN-PRE-02` prohíbe reescribir la fecha en que una unidad volvió. El conteo **exacto** es lo que impide el duplicado: un conteo abierto dejaría pasar una devolución repuesta de más. El comportamiento observado del cierre vigente —que recorre todas las unidades asignadas y vuelve a escribir fecha y condición de las ya devueltas— es la deuda de este criterio y no se corrige en este documento.

#### AC-PRE-04-5 — La devolución de lo que falta lleva la solicitud de `PARTIALLY_RETURNED` a `COMPLETED`

**Dado** una solicitud en estado `PARTIALLY_RETURNED` con tres unidades entregadas y una ya devuelta, las dos unidades restantes prestadas al instructor y un administrador con sesión iniciada.
**Cuando** el administrador registra la devolución de las dos unidades restantes con la condición de retorno de cada una.
**Entonces**:

- la respuesta es `200`;
- la solicitud queda en estado `COMPLETED`;
- la solicitud registra la fecha en que se completó;
- ninguna unidad de la solicitud figura como prestada;
- la solicitud ya no tiene ninguna unidad en la consulta de préstamos activos.

`RN-SOL-12` fija que la solicitud se completa cuando no queda nada afuera, y la devolución de lo que falta es una de las dos formas de llegar ahí; la otra es la pérdida declarada (`AC-PRE-05-5`). El escenario declara el **estado de origen**, que `AC-PRE-04-4` deja de lado al verificar solo la ausencia de duplicados.

### US-PRE-05 — Declarar la pérdida de una unidad prestada

**Como** administrador del almacén **quiero** declarar que una unidad prestada se perdió, dejando registrado el motivo **para** sacarla del inventario por el camino que corresponde a su tenencia y poder cerrar la solicitud sin que la unidad quede bloqueada para siempre.

**Prioridad:** alta — `RN-INV-13` exige que ninguna unidad se pierda sin quedar registrada, y una unidad perdida que sigue «prestada» bloquea todas las fechas futuras (`RN-NEG-05`) sin que nadie pueda cerrar el préstamo.
**Estado:** especificada — no ejecutada.

La pérdida **no crea un estado nuevo**: se registra como el **motivo de la baja** que `RN-INV-17` ya exige, con motivo y actor, y sigue el camino de la tenencia —trámite para el SENA (`RN-INV-19`), baja inmediata para lo donado (`RN-INV-14`)—. Cierra lo que esa unidad tenía pendiente y **deja el evento registrado**; si era lo único que quedaba afuera, la solicitud queda `COMPLETED` (`RN-SOL-12`). El instructor **queda registrado como quien la tenía** y no recibe ninguna consecuencia administrativa.

#### AC-PRE-05-1 — La pérdida se declara con su motivo y queda registrado el actor

**Dado** una solicitud entregada con dos unidades en poder de un instructor, un administrador con sesión iniciada y el número conocido de bajas registradas.
**Cuando** el administrador declara la pérdida de una de esas unidades con un motivo.
**Entonces**:

- la respuesta es `200`;
- la pérdida queda registrada como baja de esa unidad con el motivo indicado;
- el registro informa al administrador como actor de la baja;
- el registro informa la fecha en que la pérdida se declaró;
- el número de bajas registradas aumenta exactamente en `1`;
- la pérdida no se puede deshacer.

Una baja sin motivo no es auditable y una declaración sin actor no dice quién respondió por ella (`RN-INV-17`). El conteo **exacto** es lo que hace visible una declaración repetida, y la última condición recoge la irreversibilidad del registro.

#### AC-PRE-05-2 — La unidad perdida deja de estar disponible por el camino de su tenencia

**Dado** una unidad prestada de tenencia SENA, una unidad prestada de tenencia donada y un administrador con sesión iniciada.
**Cuando** el administrador declara la pérdida de la unidad del SENA.
**Entonces**:

- la unidad del SENA entra al trámite de baja;
- la unidad del SENA todavía no figura como dada de baja.

**Cuando** el administrador declara la pérdida de la unidad donada.
**Entonces**:

- la unidad donada queda dada de baja de inmediato;
- ninguna de las dos unidades queda disponible para préstamo.

`RN-PRE-15` no inventa un camino de baja: usa el de la tenencia. El error barato sería dar de baja de inmediato cualquier unidad perdida, y eso borraría del inventario un equipo del SENA que una auditoría todavía tiene que poder presentar. La última condición habla de **disponibilidad** y no de existencia: `RN-INV-16` exige que el listado muestre todas las unidades y una unidad en trámite **sigue apareciendo**; lo que cambia es que no se presta.

#### AC-PRE-05-3 — La unidad perdida deja de bloquear disponibilidad

**Dado** una solicitud entregada con una unidad prestada, la pérdida de esa unidad ya declarada por el administrador y un administrador con sesión iniciada.
**Cuando** el administrador consulta la disponibilidad del elemento para un rango posterior a la pérdida.
**Entonces**:

- la unidad perdida no cuenta como disponible para ese rango;
- la unidad perdida no figura como prestada sin devolver;
- la unidad perdida no bloquea ningún rango del elemento.

Es la consecuencia que hace que la historia exista: mientras la unidad cuenta como prestada, `RN-NEG-05` la bloquea en **todos** los rangos. Contarla como disponible prometería equipo que no existe, y dejarla bloqueando dejaría el elemento con menos stock del real para siempre.

#### AC-PRE-05-4 — El instructor queda registrado como quien la tenía y no recibe consecuencia

**Dado** una solicitud entregada con dos unidades en poder de un instructor, la pérdida de una de esas unidades ya declarada por el administrador y un administrador con sesión iniciada.
**Cuando** el administrador consulta el registro de la unidad perdida.
**Entonces**:

- el registro informa a ese instructor como quien tenía la unidad;
- el instructor sigue activo;
- el instructor puede crear una solicitud nueva;
- el instructor no tiene ninguna sanción ni bloqueo registrado por la pérdida.

La **trazabilidad** se conserva porque `RN-PRE-02` exige saber siempre a quién se le entregó cada elemento; la **consecuencia** no existe, y el escenario la exige como efecto observable, porque una regla que solo dice «no hay consecuencia» se cumple sola mientras nadie la pruebe.

#### AC-PRE-05-5 — La solicitud se resuelve con las unidades restantes

**Dado** una solicitud en estado `DELIVERED` con tres unidades prestadas, la pérdida de una de esas unidades ya declarada por el administrador y un administrador con sesión iniciada.
**Cuando** el administrador registra la devolución de las dos unidades restantes con la condición de retorno de cada una.
**Entonces**:

- la respuesta es `200`;
- la solicitud queda en estado `COMPLETED`;
- la unidad perdida no impide el paso de la solicitud a `COMPLETED`.

**Y dado** una solicitud en estado `DELIVERED` con tres unidades prestadas, la pérdida de una de ellas ya declarada y un administrador con sesión iniciada.
**Cuando** el administrador registra la devolución de una sola de las dos unidades restantes con la condición de retorno de esa unidad.
**Entonces**:

- la respuesta es `200`;
- la solicitud queda en estado `PARTIALLY_RETURNED`;
- la solicitud no queda en estado `COMPLETED`.

**Y dado** una solicitud en estado `PARTIALLY_RETURNED` con dos de sus tres unidades ya devueltas, la unidad restante todavía prestada al instructor, un administrador con sesión iniciada y el número conocido de bajas registradas.
**Cuando** el administrador declara la pérdida de esa unidad con un motivo.
**Entonces**:

- la respuesta es `200`;
- la solicitud queda en estado `COMPLETED`;
- el número de bajas registradas aumenta exactamente en `1`;
- el evento de pérdida queda registrado con su motivo y su actor;
- no queda ninguna unidad de esa solicitud por volver.

`RN-PRE-16` confirma que la unidad perdida queda registrada como **perdida** y distinguible de una que simplemente **no fue devuelta**; `RN-SOL-12` fija que lo declarado perdido **no queda afuera**. Los dos primeros escenarios aplican la regla a la devolución de las restantes y el tercero al caso que cierra el ciclo por el otro extremo: la declaración es la que completa la solicitud cuando era lo único que faltaba.

### US-PRE-06 — Consultar el historial de devoluciones

**Como** administrador del almacén **quiero** consultar las devoluciones ya registradas, con la unidad, el instructor, la fecha y la condición de retorno **para** auditar qué volvió, cuándo y cómo, sin ir unidad por unidad ni pedir la información a mano.

**Prioridad:** media — `RN-PRE-02` exige saber quién tiene cada elemento, y la otra mitad de esa respuesta es qué pasó cuando volvió.
**Estado:** especificada — no ejecutada.

Este módulo no crea el registro de la devolución: lo **expone**. `RN-MOV-01` confirma que el historial existe con tipo, unidad o elemento, actor, fecha y solicitud asociada, y `RN-MOV-02` que es **consultable por el administrador** con filtros por **unidad, elemento, tipo de movimiento y rango de fechas**. El historial completo de movimientos es del epic 11; acá se filtra sobre él para leer las **devoluciones**, y la consulta del instructor sigue limitada a sus propios préstamos (`RN-PRE-17`).

#### AC-PRE-06-1 — La consulta lista las devoluciones con unidad, instructor, fecha y condición

**Dado** un instructor que devolvió una unidad con una condición de retorno registrada y un administrador con sesión iniciada.
**Cuando** el administrador consulta el historial de devoluciones.
**Entonces**:

- la respuesta es `200`;
- la consulta lista la devolución registrada;
- por cada devolución informa la unidad devuelta, identificada por su número de serie;
- por cada devolución informa el instructor que la tenía;
- por cada devolución informa la fecha de devolución;
- por cada devolución informa la condición de retorno registrada.

Sin la fecha y la condición, la respuesta a «quién lo tuvo» se corta en el momento en que la unidad volvió. La consulta no crea ni modifica nada; la forma de la respuesta y el orden son decisión de implementación.

#### AC-PRE-06-2 — El historial se puede filtrar por unidad, por elemento, por tipo de movimiento y por rango de fechas

**Dado** un historial con devoluciones de dos unidades de dos elementos distintos, en fechas distintas, y con la entrega y la devolución de una misma unidad registradas como movimientos de tipo distinto, y un administrador con sesión iniciada.
**Cuando** el administrador consulta el historial aplicando cada filtro de `RN-MOV-02`, uno por vez.
**Entonces**:

| Filtro | Devuelve | No devuelve |
|--------|----------|-------------|
| por unidad | las devoluciones de esa unidad | ninguna devolución de la otra unidad |
| por elemento | las devoluciones de unidades de ese elemento | ninguna devolución de una unidad del otro elemento |
| por tipo de movimiento de devolución | el movimiento de devolución de la unidad | el movimiento de entrega de la misma unidad |
| por rango de fechas | la devolución de dentro del rango | la devolución de fuera del rango |

Los cuatro filtros **salen de la regla** y son exactamente esos: el **instructor** no es un filtro —es un dato que la consulta informa (`AC-PRE-06-1`)— y ninguna regla fija la forma de los parámetros, su combinación, el orden ni el tamaño de página.

#### AC-PRE-06-3 — La consulta del historial es paginada y devuelve el total

**Dado** un historial con más devoluciones registradas que el tamaño de página de la consulta y un administrador con sesión iniciada.
**Cuando** el administrador consulta la primera página del historial de devoluciones.
**Entonces**:

- la respuesta es `200`;
- la consulta devuelve como máximo el tamaño de página de devoluciones;
- la consulta informa el total de devoluciones registradas.

`RN-CTX-02` fija el volumen y su consecuencia: un historial devuelto entero con 1.000 a 1.500 equipos y elementos no se puede leer ni recorrer. El criterio exige el **efecto** y no fija el tamaño de página ni la forma de la respuesta.

## Errores y mensajes

| Situación | HTTP | Código | Mensaje |
|-----------|------|--------|---------|
| Consultar los préstamos activos o el historial de devoluciones | `200` | — | Éxito: unidades o devoluciones con sus datos, la página pedida y el total |
| Registrar una devolución con la condición de retorno de cada unidad | `200` | — | Éxito: las unidades figuran devueltas, con su condición, su descripción y su fecha |
| Registrar una devolución sin unidades indicadas | No lo fija ninguna regla | No lo fija ninguna regla | La respuesta indica que debe indicarse **al menos una unidad**; sin efectos |
| Registrar una devolución sin la condición de retorno de cada unidad | No lo fija ninguna regla | No lo fija ninguna regla | La respuesta indica que debe indicarse **la condición de retorno de cada unidad**; sin efectos |
| Registrar una devolución con un valor de un eje escrito en el otro | No lo fija ninguna regla | No lo fija ninguna regla | No lo fija ninguna regla; sin devolución, sin cambio de estado físico y sin liberar la unidad |
| Registrar una devolución de una unidad que esa solicitud no tiene prestada | No lo fija ninguna regla | No lo fija ninguna regla | No lo fija ninguna regla; sin efectos y sin cambio de estado de ninguna solicitud |
| Registrar dos veces la devolución de la misma unidad | No lo fija ninguna regla | No lo fija ninguna regla | No lo fija ninguna regla; la fecha y la condición de la primera devolución se conservan |
| Devolver después de la fecha estimada de devolución | `200` | — | Éxito, sin penalidad, sanción ni marca por haber llegado tarde |
| Crear una solicitud con una unidad ya vencida en manos del instructor | `201` | — | Éxito: la marca de vencida no bloquea al instructor |
| Resolver la tarea por daño con sesión de instructor | No lo fija ninguna regla | No lo fija ninguna regla | No lo fija ninguna regla; la tarea sigue pendiente y conserva su estado |
| Volver a poner en pendiente una tarea resuelta | No lo fija ninguna regla | No lo fija ninguna regla | No lo fija ninguna regla; la tarea sigue resuelta |
| Consultar con sesión de instructor los préstamos de otro instructor | No lo fija ninguna regla | No lo fija ninguna regla | No lo fija ninguna regla; no devuelve ningún dato del préstamo ajeno |
| Petición sin credencial | `401` | No lo fija ninguna regla (epic 01, `AC-AUTH-05-2`) | No lo fija ninguna regla; sin datos |

Las únicas exigencias de texto son las de `AC-PRE-02-1` y `AC-PRE-02-10`: que la respuesta indique que falta indicar al menos una unidad y que falta la condición de retorno de cada unidad. Ninguna regla fija el texto literal de los demás rechazos: lo exigido es el estado y la ausencia de efectos.

## Sesión y seguridad

| Efecto | Regla | Dónde se verifica |
|--------|-------|-------------------|
| Consultar los préstamos activos y el historial de devoluciones exige sesión: una petición sin credencial no es de ningún actor y recibe `401` | Epic 01 (`AC-AUTH-05-2`) | — |
| El instructor consulta **solo sus propios** préstamos y la respuesta no informa ningún dato del préstamo ajeno | `RN-PRE-17` | AC-PRE-01-3 |
| Registrar la devolución, resolver la tarea por daño y declarar la pérdida son acciones administrativas: con sesión de instructor se rechazan sin efectos | `RN-CTX-05`, `RN-PRE-04`, `RN-PRE-09` | AC-PRE-03-5 |
| El historial completo de movimientos es una consulta del **administrador**; el instructor no la recibe | `RN-MOV-02` | — |
| La condición de retorno se puede leer por unidad y ninguna regla permite reescribirla después de registrada | `RN-PRE-05`, `RN-PRE-11` | — |
| La pérdida conserva al instructor como quien tenía la unidad y no le registra ninguna sanción ni bloqueo | `RN-PRE-15` | AC-PRE-05-4 |
| Ni la marca de vencida ni un daño registrado bloquean la cuenta del instructor | `RN-PRE-18`, `RN-PRE-06` | AC-PRE-01-2, AC-PRE-03-4 |
| No hay un tercer rol que reciba, resuelva ni declare: el administrador **es** un instructor | `RN-CTX-05` | AC-PRE-03-5 |

Ninguna regla de este módulo fija plazos de sesión ni efectos de la devolución sobre las credenciales: registrar una devolución o declarar una pérdida no cierran sesiones. El contrato de sesión es del epic 01.

## Decisiones tomadas

| Decisión | Regla |
|----------|-------|
| La devolución es **de unidades concretas** y **puede ser parcial**; lo no devuelto sigue prestado con su tenedor y su fecha de retiro | `RN-PRE-01`, `RN-PRE-04`, `RN-PRE-02` |
| La condición de retorno es **obligatoria** en toda unidad serializada devuelta, y un consumible nunca la lleva porque no se devuelve | `RN-PRE-10`, `RN-PRE-03`, `RN-INV-06` |
| La condición usa **dos ejes independientes** con listas cerradas más una descripción libre; un valor de un eje en el otro se rechaza | `RN-PRE-08`, `RN-PRE-10` |
| La condición **actualiza el estado físico** de la unidad en la misma operación, y el administrador puede corregirlo después | `RN-PRE-11`, `RN-PRE-12` |
| `FUNCIONA` + `DAÑADO` deja la unidad `OPERATIVO` —sigue prestable— y la tarea por daño se abre igual | `RN-PRE-12`, `RN-PRE-06` |
| `AVERIADO`, `DESCARGADO_AGOTADO`, `EN_MANTENIMIENTO` y `DADO_DE_BAJA` **no se asignan automáticamente** | `RN-PRE-12`, `RN-INV-30` |
| El administrador **no puede rechazar** una devolución: siempre recibe el elemento y lo que falta, falla o viene dañado deja una nota pendiente | `RN-PRE-13` |
| La tarea por daño tiene **exactamente dos estados**, la resuelve el administrador con **nota opcional**, no se reabre y una falla nueva abre una tarea nueva | `RN-PRE-09` |
| El daño, la pieza faltante y la falla **no** producen bloqueo, sanción ni pérdida de acceso para el instructor | `RN-PRE-06`, `RN-PRE-13` |
| El cierre **no duplica** lo ya devuelto: devolver lo que falta agrega solo esas devoluciones y conserva la fecha y la condición de las anteriores | `RN-PRE-14`, `RN-PRE-02` |
| La solicitud se completa **cuando no queda nada afuera**, y `PARTIALLY_RETURNED` no es un final | `RN-SOL-12`, `RN-PRE-01` |
| La pérdida de una unidad prestada se registra como el **motivo de la baja**, con motivo y actor, y **no** crea un estado nuevo; sigue el camino de la tenencia | `RN-PRE-15`, `RN-INV-17`, `RN-INV-14`, `RN-INV-19` |
| La unidad perdida sale del inventario activo, no bloquea disponibilidad y sus piezas sueltas siguen prestables | `RN-PRE-15`, `RN-NEG-05` |
| El instructor queda registrado como quien tenía la unidad perdida, sin ninguna consecuencia administrativa | `RN-PRE-15` |
| No existe plazo de devolución: la fecha estimada es informativa y su marca de vencida no tiene consecuencia ni estado propio | `RN-PRE-07`, `RN-PRE-18` |
| El instructor ve **solo sus propios** préstamos | `RN-PRE-17` |
| Los filtros del historial de devoluciones son **unidad, elemento, tipo de movimiento y rango de fechas**, y ninguno más | `RN-MOV-02` |
| Ambas consultas son paginadas y siempre informan su total | `RN-CTX-02` |

Sin decisión todavía: qué **acciones concretas** puede relatar la nota de la resolución de la tarea —reparar, descartar, dar de baja— y qué evidencia adicional queda registrada; cómo distingue el sistema una descripción que reporta una pieza faltante de una que no; la forma de la respuesta, el orden de los resultados y el tamaño de página de las dos consultas; si una unidad a la que le falta una pieza debe repararse o darse de baja; el texto de los rechazos que ninguna regla fija; y qué se hace con una unidad perdida que reaparece, porque `RN-INV-17` dice que la baja no se puede deshacer. Ninguna regla los fija y ningún criterio los exige.

## Trazabilidad y estado

Un criterio se marca `OK` o `GAP` **solo** cuando su test corre, nunca por lectura del código. Este epic está **especificado y no ejecutado**: los **37** criterios están sin estado y ninguno es `OK`, `GAP` ni `FALTA` hoy.

| Criterio | Regla | Estado hoy |
|----------|-------|------------|
| `AC-PRE-01-1` | `RN-PRE-02`, `RN-NEG-04` | Sin ejecutar |
| `AC-PRE-01-2` | `RN-PRE-18`, `RN-PRE-07` | Sin ejecutar |
| `AC-PRE-01-3` | `RN-PRE-17` | Sin ejecutar |
| `AC-PRE-01-4` | `RN-CTX-02` | Sin ejecutar |
| `AC-PRE-01-5` | `RN-PRE-07` | Sin ejecutar |
| `AC-PRE-02-1` | `RN-PRE-04` | Sin ejecutar |
| `AC-PRE-02-2` | `RN-PRE-01`, `RN-SOL-11` | Sin ejecutar |
| `AC-PRE-02-3` | `RN-PRE-05` | Sin ejecutar |
| `AC-PRE-02-4` | `RN-PRE-02` | Sin ejecutar |
| `AC-PRE-02-5` | `Estándar` | Sin ejecutar |
| `AC-PRE-02-6` | `RN-PRE-10` | Sin ejecutar |
| `AC-PRE-02-7` | `RN-PRE-11` | Sin ejecutar |
| `AC-PRE-02-8` | `RN-PRE-08` | Sin ejecutar |
| `AC-PRE-02-9` | `RN-PRE-12` (decisión técnica delegada) | Sin ejecutar |
| `AC-PRE-02-10` | `RN-PRE-03`, `RN-PRE-05`, `RN-PRE-10` | Sin ejecutar |
| `AC-PRE-03-1` | `RN-PRE-06` | Sin ejecutar |
| `AC-PRE-03-2` | `RN-PRE-06` | Sin ejecutar |
| `AC-PRE-03-3` | `RN-PRE-06` | Sin ejecutar |
| `AC-PRE-03-4` | `RN-PRE-06` | Sin ejecutar |
| `AC-PRE-03-5` | `RN-PRE-09` | Sin ejecutar |
| `AC-PRE-03-6` | `RN-PRE-10` | Sin ejecutar |
| `AC-PRE-03-7` | `RN-PRE-13` | Sin ejecutar |
| `AC-PRE-03-8` | `RN-PRE-13` | Sin ejecutar |
| `AC-PRE-03-9` | `RN-PRE-13` | Sin ejecutar |
| `AC-PRE-04-1` | `RN-PRE-01` | Sin ejecutar |
| `AC-PRE-04-2` | `RN-PRE-01` | Sin ejecutar |
| `AC-PRE-04-3` | `Estándar` | Sin ejecutar |
| `AC-PRE-04-4` | `RN-PRE-14` | Sin ejecutar |
| `AC-PRE-04-5` | `RN-SOL-12`, `RN-PRE-01` | Sin ejecutar |
| `AC-PRE-05-1` | `RN-PRE-15` | Sin ejecutar |
| `AC-PRE-05-2` | `RN-PRE-15` | Sin ejecutar |
| `AC-PRE-05-3` | `RN-PRE-15` | Sin ejecutar |
| `AC-PRE-05-4` | `RN-PRE-15` | Sin ejecutar |
| `AC-PRE-05-5` | `RN-PRE-16`, `RN-SOL-12` | Sin ejecutar |
| `AC-PRE-06-1` | `RN-PRE-02`, `RN-MOV-01` | Sin ejecutar |
| `AC-PRE-06-2` | `RN-MOV-02` | Sin ejecutar |
| `AC-PRE-06-3` | `RN-CTX-02` | Sin ejecutar |

| US | ACs | Regla de negocio | `Estándar` |
|----|-----|------------------|------------|
| `US-PRE-01` | 5 | 5 | 0 |
| `US-PRE-02` | 10 | 9 | 1 |
| `US-PRE-03` | 9 | 9 | 0 |
| `US-PRE-04` | 5 | 4 | 1 |
| `US-PRE-05` | 5 | 5 | 0 |
| `US-PRE-06` | 3 | 3 | 0 |
| **Total** | **37** | **35** | **2** |

Totales: **6 historias y 37 criterios**, todos sin ejecutar. **35** se apoyan en una regla de negocio y **2** en un invariante técnico (`Estándar`: `AC-PRE-02-5` y `AC-PRE-04-3`). De los 35, **34** salen de una regla `Confirmada` y **1** —`AC-PRE-02-9`— de la **decisión técnica delegada** `RN-PRE-12`; ninguno es `Derivada` ni `OPEN`. Las citas de regla suman **43** sobre los 35 criterios que se apoyan en al menos una, porque `AC-PRE-01-1`, `AC-PRE-01-2`, `AC-PRE-02-2`, `AC-PRE-04-5`, `AC-PRE-05-5` y `AC-PRE-06-1` citan dos reglas cada uno y `AC-PRE-02-10` cita tres.

Dos deudas observadas, que este documento no corrige: el módulo de préstamos **no tiene hoy ningún test automatizado** —no existe `loan.test.js` ni otro archivo que cubra la devolución—, y el cierre vigente de una solicitud con devolución parcial vuelve a escribir la fecha y la condición de las unidades ya devueltas y registra un segundo movimiento de devolución por unidad, que es exactamente lo que prohíben `RN-PRE-14` y `AC-PRE-04-4`.

## Anexo — Datos de prueba

Los valores de esta tabla son **ejemplos**: no son requisitos y QA elige los suyos. Los criterios fijan la clase de actor, la de estado y los límites de la regla; estos datos solo registran con qué se ejecutan las pruebas del módulo.

| Dato | Valor usado |
|------|-------------|
| Administrador del seed | `admin@sena.edu.co` / `AdminSENA2024` |
| Instructor tenedor de las unidades | `cmendoza@sena.edu.co` / `Instructor2024` |
| Segundo instructor, control de `AC-PRE-01-3` y `AC-PRE-05-4` | `mgomez@misena.edu.co` / `Instructor2024` |
| Elemento con unidades serializadas | «Multímetro digital» y «Cargador de portátil» |
| Fecha de retiro de la solicitud de prueba | 10 de marzo |
| Fecha estimada de devolución de la solicitud de prueba | 13 de marzo |
| Fecha estimada de devolución vencida (`AC-PRE-01-2`, `AC-PRE-01-5`) | retiro el 1 de marzo, estimada el 3 de marzo, hoy 10 de marzo |
| Fecha estimada de devolución no vencida (`AC-PRE-01-5`) | estimada el 20 de marzo, hoy 10 de marzo |
| Fecha en que se registra una devolución | 20 de marzo |
| Rango posterior a una pérdida (`AC-PRE-05-3`) | 1 al 5 de abril |
| Descripción de un daño | «carcasa agrietada» |
| Descripción de un desgaste | «desgaste normal por uso» |
| Descripción de una pieza faltante | «falta el cargador» |
| Descripción de una falla | «el equipo no enciende» |
| Descripción de una devolución dañada (`AC-PRE-03-9`) | «carcasa rota y no enciende» |
| Motivo de una pérdida | «no se encontró al devolver» |
| Nota de la resolución de una tarea | «se reemplazó la carcasa» |
| Unidades de los filtros del historial (`AC-PRE-06-2`) | U1 y U2, de los elementos E1 y E2 |
| Devoluciones de los filtros de fecha (`AC-PRE-06-2`) | una del 20 de marzo y otra del 5 de abril; rango consultado 1 al 31 de marzo |
| Consulta paginada (`AC-PRE-01-4`, `AC-PRE-06-3`) | más de 25 unidades prestadas y más de 25 devoluciones, con páginas de 10 |
| Unidades de tenencia distinta (`AC-PRE-05-2`) | una del SENA y una donada, las dos prestadas |

Los usuarios salen del seed del proyecto (`AGENTS.md` §4). Las solicitudes entregadas y las unidades con su estado físico son datos de los epics 05 y 06; el elemento y su composición, del epic 04: acá se leen o se producen con la operación de devolución de `US-PRE-02`.
