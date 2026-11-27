# Epic 06 — Solicitudes

El ciclo completo del pedido de equipos: crearlo con sus dos fechas, decidirlo, empacarlo, entregarlo, cancelarlo o expirarlo, y consultarlo.

## Resumen

Este módulo es la **solicitud**: el pedido que un instructor deja por escrito con una **fecha de retiro** y una **fecha estimada de devolución**, y que el administrador del almacén decide, verifica, empaca y entrega. Es el dueño de la **reserva por rango de fechas** —su creación la descuenta, el rechazo y la cancelación la liberan—, de la **máquina de estados** del pedido y del **aviso al instructor** como efecto del empaque.

Existe para reemplazar el pedido que hoy llega por WhatsApp, mensaje o llamada. Sin él, el administrador no sabe si el elemento está disponible, prestado o en el taller, y el instructor no sabe qué pasó con lo que pidió.

Lo usan **ambos actores**, con papeles distintos: el instructor crea, modifica y cancela mientras la solicitud está pendiente, y consulta **las suyas**; el administrador aprueba, rechaza, empaca, entrega, cancela antes de la entrega y consulta **todas** (`RN-CTX-05`, `RN-CTX-06`).

Este módulo es dueño de **la reserva y de cada transición de la solicitud**. Las **devoluciones** y la **condición de retorno** son del epic 07; el **cálculo de la disponibilidad** que el instructor consulta es del epic 08; las **unidades y sus estados físicos** son del epic 05; el **alta del elemento** y la marca obligatorio/opcional de sus componentes son del epic 04.

Estado: **en ejecución parcial**. Nueve historias, 49 criterios; **11 `OK`** (US-SOL-01) y 38 sin ejecutar.

## Índice de historias

| Historia | Título en lenguaje llano | Criterios | Prioridad |
|----------|--------------------------|-----------|-----------|
| `US-SOL-01` | Crear una solicitud | 11 | Alta |
| `US-SOL-02` | Aprobar una solicitud | 6 | Alta |
| `US-SOL-03` | Rechazar una solicitud | 3 | Alta |
| `US-SOL-04` | Modificar una solicitud pendiente | 2 | Media |
| `US-SOL-05` | Empacar una solicitud | 6 | Alta |
| `US-SOL-06` | Entregar una solicitud | 6 | Alta |
| `US-SOL-07` | Cancelar una solicitud | 5 | Alta |
| `US-SOL-08` | Expirar una solicitud no retirada | 3 | Media |
| `US-SOL-09` | Consultar solicitudes | 7 | Alta |
| **Total** | | **49** | |

## Alcance

**Incluye**

- Crear la solicitud con **fecha de retiro** y **fecha estimada de devolución**, descontando la disponibilidad del rango al crear (`RN-NEG-03`, `RN-NEG-04`).
- Rechazar la creación cuando el rango **no tiene stock**, sin crear nada ni reservar; hacer competir los rangos que se solapan y convivir los que no (`RN-NEG-01`, `RN-NEG-02`, `RN-NEG-05`).
- Aprobar **solo hacia abajo**: la misma cantidad o menos de lo solicitado y nunca más de lo disponible en el almacén para el rango (`RN-SOL-03`, `RN-SOL-09`).
- La **nota del administrador**: obligatoria al rechazar y al aprobar un total menor que el solicitado, opcional al aprobar lo solicitado (`RN-SOL-04`).
- Rechazar con **motivo obligatorio**, dejando actor y fecha, y **liberando la reserva** (`RN-SOL-04`, `RN-NEG-03`).
- **Modificar** la solicitud mientras está pendiente, con ajuste de la reserva al nuevo rango y la nueva cantidad (`RN-SOL-05`).
- **Empacar**: asignar las unidades concretas por su serial, verificar los componentes del compuesto y rechazar si el rango ya no alcanza; el aviso de «listo para retirar» es su efecto (`RN-SOL-02`, `RN-NOT-01`, `RN-INV-02`, `RN-INV-24`, `RN-INV-37`).
- **Entregar** todo lo aprobado o solo una parte, registrando quién se lleva cada unidad y desde cuándo, y descontando el stock de los consumibles en ese momento (`RN-PRE-02`, `RN-INV-11`, `RN-SOL-11`).
- **Cancelar** a mano antes de que se registre la entrega, liberando la reserva y conservando la traza de los seriales asignados (`RN-SOL-05`, `RN-SOL-06`, `RN-SOL-08`, `RN-PRE-02`).
- **Expirar** la solicitud no retirada pasados más de dos días de la fecha de retiro, con corte a las 23:59 del segundo día en la zona local de la aplicación, distinguiendo la causa (`RN-SOL-07`, `RN-SOL-10`).
- **Consultar** las solicitudes propias con su estado, el motivo del rechazo y los avisos; consultar todas y filtrar por estado; paginar con su total (`RN-PRE-17`, `RN-NOT-01`, `RN-NOT-02`, `RN-USR-05`, `RN-CTX-02`).

**No incluye**

| Tema | Dónde se especifica |
|------|---------------------|
| Devoluciones, totales o parciales, y la revisión del estado físico al devolver (`RN-PRE-01`, `RN-PRE-03`) | Epic 07; este ciclo llega hasta `DELIVERED` |
| Condición de retorno obligatoria de toda unidad serializada devuelta (`RN-PRE-10`) | Epic 07 (`AC-PRE-02-10`); acá solo se fija la otra mitad: un consumible entregado no vuelve y no la lleva |
| Cierre de la solicitud cuando no queda nada afuera (`RN-SOL-12`) | Regla fijada en el ciclo de vida; la operación es del epic 07 (`US-PRE-04`, `US-PRE-05`) |
| Declaración de pérdida de una unidad prestada y su registro (`RN-PRE-15`, `RN-PRE-16`) | Epic 07 (`US-PRE-05`) |
| Cálculo de la disponibilidad de un elemento para un rango de fechas (`RN-CAT-03`, `RN-CAT-04`) | Epic 08 (`US-CAT-03`, `AC-CAT-03-7`); acá se exige el descuento que la solicitud produce |
| Unidades físicas, lista de estados físicos y ensamblaje del compuesto (`RN-INV-30`, `RN-INV-31`, `RN-INV-33`, `RN-INV-01`) | Epic 05 (`US-INV-02`, `US-INV-03`, `US-INV-10`) |
| Alta del elemento y marca obligatorio/opcional de cada componente (`RN-INV-37`) | Epic 04; acá solo se lee la marca al empacar |
| Ubicación de cada unidad (`RN-CTX-07`) | Epic 05 (`US-INV-11`) |
| Desactivar la cuenta de un instructor (`RN-USR-05` en su operación) | Epic 02 (`US-USR-03`); acá solo se lee el efecto sobre sus solicitudes |
| Aritmética del stock de un consumible y rechazo cuando la cantidad ya no existe | Epic 05 (`AC-INV-04-4`, `AC-INV-04-5`, `AC-INV-04-7`) |
| Elección del número de serie | `RN-CAT-01` lo excluye; los asigna el administrador al empacar |
| Historial de las modificaciones de una solicitud | `RN-INV-29` exige ese registro para la composición de un compuesto, no para las solicitudes |
| Motivo de la cancelación | `RN-SOL-04` solo lo exige al aprobar y al rechazar; ver *Decisiones tomadas* |
| Búsqueda, orden, tamaño de página y formato del listado | Ninguna regla los fija |
| Reportes y exportación de solicitudes | Ninguna regla; el epic de reportes está descartado |

## Actores y permisos

| Actor | Puede | No puede |
|-------|-------|----------|
| **Instructor** | Crear solicitudes con un rango que empieza hoy o después; modificarlas y cancelarlas mientras están en `PENDING`; consultar **las suyas** con su estado, el motivo del rechazo y sus avisos | Crear con una fecha de retiro anterior a hoy; aprobar o rechazar (responde `403` sin efectos); elegir el número de serie; modificar o cancelar fuera de `PENDING` (`403`); consultar solicitudes de otro instructor; cancelar una solicitud con entrega registrada |
| **Administrador** (instructor encargado del almacén) | Aprobar, rechazar, empacar, entregar —de una vez o por partes—, cancelar antes de que se registre la entrega, y consultar **todas** las solicitudes filtrando por estado | Crear solicitudes (`403`, nunca pide equipos para sí mismo); aprobar más de lo solicitado o más de lo disponible para el rango; empacar con un componente obligatorio ausente o sin stock suficiente en el rango; entregar una solicitud que no está en `PACKED` o `PARTIALLY_DELIVERED`; cancelar una solicitud cuya entrega ya se registró; borrar el registro de los seriales asignados |
| **Sistema** | Cancelar por vencimiento la solicitud no retirada, liberar su reserva, conservar la traza de los seriales y dejar el aviso de vencimiento | Cancelar por vencimiento una solicitud con entrega registrada |
| **Sin credencial** | Nada: una petición sin sesión no es un actor y recibe `401` (epic 01, `AC-AUTH-05-2`) | Consultar o escribir solicitudes |

No hay un tercer rol: el administrador **es** un instructor (`RN-CTX-05`).

## Reglas de negocio

| ID | Regla | Ejemplo |
|----|-------|---------|
| `RN-CTX-02` | El volumen real es de 1.000 a 1.500 equipos y elementos y alrededor de 100 instructores: la consulta de solicitudes es **paginada y devuelve el total** | Una lista de 25 solicitudes con páginas de 20 informa el total 25 y permite llegar a las 5 restantes |
| `RN-CTX-05` | Dos actores y ninguno más: el administrador revisa, aprueba, verifica, empaca y entrega; el instructor solicita, recoge y devuelve | Una aprobación enviada con sesión de instructor responde `403` sin efectos |
| `RN-CTX-06` | El administrador **no crea solicitudes**: nunca pide equipos para sí mismo | Una creación con sesión de administrador responde `403` sin reservar nada |
| `RN-NEG-01` | El mismo elemento se puede solicitar para **días distintos**: la primera reserva no bloquea la segunda | Dos rangos sin ningún día en común reservan las mismas unidades |
| `RN-NEG-02` | Para el **mismo día** el elemento **sí** se bloquea: no hay dos reservas de la misma unidad con fechas que se solapen | Dos rangos que comparten al menos un día no pueden comprometer la misma unidad |
| `RN-NEG-03` | Al crear la solicitud la disponibilidad del rango **se descuenta inmediatamente** | Crear 2 unidades de un elemento con 3 deja 1 disponible en ese rango |
| `RN-NEG-04` | Cada solicitud declara **fecha de retiro** y **fecha estimada de devolución**, y la reserva ocupa el rango completo `[fecha de retiro, fecha estimada de devolución]` | Una solicitud que retira el 10 y estima devolver el 13 ocupa cuatro días |
| `RN-NEG-05` | Una unidad **prestada** —entregada y no devuelta— no está disponible para **ningún rango futuro** hasta que se registre su devolución | Una unidad entregada no cuenta ni para un rango posterior a la fecha estimada de devolución |
| `RN-SOL-01` | Las solicitudes son **de un día para el otro**; la entrega el mismo día ocurre solo si el administrador tiene disponibilidad para hacerlo | El retiro se propone para el día siguiente, y un retiro de hoy también se acepta |
| `RN-SOL-02` | La **verificación física** y el empaque ocurren **antes** de avisar al instructor que puede retirar: el aviso de retiro es el **efecto de `PACKED`** | Aprobar no avisa que se puede retirar; empacar sí |
| `RN-SOL-03` | Al aprobar, el administrador **puede modificar** la solicitud **solo hacia abajo**: la misma cantidad o menos del **total solicitado**, nunca más | Una solicitud de 5 no se aprueba con 6 |
| `RN-SOL-04` | Al aprobar o rechazar se deja una **nota del porqué**, **obligatoria** al rechazar y al aprobar un **total menor** que el solicitado, y **opcional** cuando los dos totales coinciden | Aprobar 3 de 3 sin nota se acepta; aprobar 2 de 3 sin nota se rechaza |
| `RN-SOL-05` | El instructor puede **cancelar o modificar** su solicitud **solo mientras está pendiente** | Una cancelación del instructor sobre una solicitud `APPROVED` responde `403` |
| `RN-SOL-06` | El administrador puede cancelar la solicitud si el instructor **no retira**, y solo mientras la entrega no se haya registrado | Una solicitud pendiente con la fecha de retiro pasada, dentro de la ventana de 2 días, se cancela |
| `RN-SOL-07` | Una reserva **sin retiro se cancela automáticamente pasados más de 2 días** desde la fecha de retiro, a las **23:59 del segundo día** en la zona horaria local de la aplicación (**America/Bogota**) | Una solicitud que se retira el 10 vence a las 23:59 del 12 y sigue viva a las 23:58 |
| `RN-SOL-08` | El administrador cancela **antes de que se registre la entrega**; una solicitud ya entregada no se cancela | El intento de cancelar una solicitud `DELIVERED` se rechaza |
| `RN-SOL-09` | No se puede **aprobar** una cantidad mayor a la **disponible en el almacén** para el rango de la solicitud | Con 1 unidad disponible en el rango, una aprobación de 3 se rechaza |
| `RN-SOL-10` | El sistema **distingue** una cancelación por **vencimiento** de una **manual**, y la causa queda registrada | Una solicitud vencida informa vencimiento; una cancelada a mano no |
| `RN-SOL-11` | Una **entrega parcial** deja la solicitud en `PARTIALLY_DELIVERED` y **no se cierra** hasta que se entregue todo lo aprobado | 2 de 3 unidades entregadas dejan la solicitud abierta con lo pendiente comprometido |
| `RN-SOL-12` | La solicitud pasa a `COMPLETED` cuando **no queda nada afuera**: todo lo entregado volvió con su condición de retorno o fue declarado perdido | Declarar perdida la última unidad pendiente cierra la solicitud |
| `RN-NOT-01` | El sistema **avisa dentro del sistema** la aprobación, el rechazo con su motivo, el pedido **listo para retirar**, el vencimiento y la **cancelación manual**; la **entrega registrada no se avisa**; el instructor puede consultar esos avisos | Aprobar deja un aviso; entregar no deja ninguno |
| `RN-NOT-02` | Además del aviso interno, el aviso **puede** salir por correo electrónico y por WhatsApp; sin esos canales el aviso interno **sigue funcionando** | Con un solo canal configurado el aviso sale por ese canal y el interno se mantiene |
| `RN-PRE-02` | Debe poderse saber **siempre** quién tiene cada elemento y **desde cuándo** | La entrega registra el instructor y la fecha de cada unidad |
| `RN-PRE-17` | El instructor ve **solo sus propios** préstamos; el mismo límite rige sus solicitudes | La consulta de un instructor no devuelve la solicitud de otro |
| `RN-USR-05` | Desactivar a un instructor **le impide iniciar sesión**, pero **no cancela** sus solicitudes en curso | Una solicitud `APPROVED` sigue a nombre del instructor desactivado |
| `RN-INV-02` | Un elemento compuesto se **entrega completo**: si falta un componente obligatorio no se entrega como conjunto | Empacar un compuesto sin su componente obligatorio se rechaza |
| `RN-INV-24` | La falta de un componente **opcional** no impide prestar el conjunto, pero la ausencia **queda documentada** | El compuesto se empaca y la pieza opcional faltante queda anotada |
| `RN-INV-37` | El **administrador** marca cada componente como **obligatorio u opcional** al definir la composición | La marca decide qué falta impide empacar y qué falta solo se documenta |
| `RN-INV-11` | Un consumible **no se reserva por fecha**: se descuenta del stock **al registrar la entrega**, no al empacar | Empacar una solicitud con 2 consumibles deja el stock en 10; entregarla lo deja en 8 |
| `RN-INV-18` | Las cantidades de consumibles son **enteras** | Una solicitud con cantidad 1,5 se rechaza |
| `RN-CAT-01` | El instructor **no elige un número de serie**: el catálogo lista elementos, no unidades | La solicitud pide elementos y cantidades; los seriales los asigna el administrador al empacar |

**Reglas de otros epics que este módulo cita como frontera.** Explican un límite y no aportan criterios propios:

| ID | Qué delimita | Dónde se especifica |
|----|--------------|---------------------|
| `RN-CAT-04` | La cantidad disponible se informa siempre con el rango que la produce; el cálculo es del catálogo | Epic 08 |
| `RN-CTX-04` | `Environment` existe por trazabilidad de destino, y la ubicación de una unidad se registra al entregarla y devolverla | Epic 05 (`US-INV-11`) |
| `RN-CTX-07` | El sistema registra dónde está cada unidad; la entrega no reescribe esa ubicación por su cuenta | Epic 05 (`US-INV-11`) |
| `RN-INV-01` | El instructor solicita **el conjunto**, no sus componentes por separado | Epic 05 |
| `RN-INV-06` | Un consumible no tiene serial y **no se devuelve**: el descuento de la entrega es definitivo y no lleva condición de retorno | Epic 05, `RN-PRE-10` |
| `RN-INV-08` | Una pieza de un conjunto ensamblado puede prestarse por separado, que es el caso que deja un compuesto incompleto | Epic 05 |
| `RN-INV-10` | La auditoría exige informar si un conjunto está completo y qué le falta, y documentar la ausencia del opcional es su insumo | Epic 05 (`US-INV-05`) |
| `RN-INV-13` | Ninguna unidad se pierde sin quedar registrada | Epic 05 (`US-INV-08`) |
| `RN-INV-14` | La baja de una unidad donada es inmediata; la del SENA no | Epic 05 (`US-INV-08`, `US-INV-09`) |
| `RN-INV-17` | Toda baja exige motivo y actor y queda registrada | Epic 05 (`US-INV-08`) |
| `RN-INV-19` | La unidad del SENA en trámite de baja sigue en el inventario hasta la confirmación | Epic 05 (`US-INV-09`) |
| `RN-INV-29` | El registro de cambios es de la **composición** de un compuesto, no de las solicitudes | Epic 04 |
| `RN-INV-31` | Fija qué se puede prestar en cada estado físico, y por eso el stock del rango puede reducirse entre la aprobación y el empaque | Epic 05 (`US-INV-10`) |
| `RN-PRE-01` | La devolución puede ser **parcial**, y por eso lo ya entregado de una entrega parcial puede volver | Epic 07 |
| `RN-PRE-03` | Al devolver se revisa el estado físico de cada elemento | Epic 07 |
| `RN-PRE-04` | La entrega la registra el administrador con el instructor presente, y por eso la entrega no genera aviso | Epic 07 |
| `RN-PRE-10` | La condición de retorno es obligatoria en toda **unidad serializada devuelta**; un consumible no entra al flujo de devolución | Epic 07 (`AC-PRE-02-10`) |
| `RN-PRE-15` | Una unidad declarada perdida sale del inventario activo y no bloquea disponibilidad | Epic 07 (`US-PRE-05`) |
| `RN-PRE-16` | La pérdida declarada deja el evento registrado | Epic 07 (`US-PRE-05`) |
| `RN-PRE-18` | La parte ya entregada se rige por las reglas del préstamo, de `RN-PRE-01` a `RN-PRE-18` | Epic 07 |

## Ciclo de vida de la solicitud

Los estados son los de la tabla de ciclo de vida de `00-contexto-negocio.md` §6, sin agregados: `PARTIALLY_DELIVERED` es de este epic y `PARTIALLY_RETURNED` y `COMPLETED` se disparan desde el epic 07.

| Estado | Qué significa | Quién dispara la salida | Qué deja al salir |
|--------|---------------|-------------------------|--------------------|
| `PENDING` | Creada y con la reserva descontada, esperando la decisión del administrador | `APPROVED` o `REJECTED`: el **administrador** (`RN-SOL-04`, `RN-SOL-09`, `RN-SOL-03`). `CANCELLED`: el **instructor** (`RN-SOL-05`) o el **sistema** por vencimiento (`RN-SOL-07`) | Las dos fechas y la reserva; al aprobar, la cantidad aprobada y la nota cuando redujo; al rechazar, el motivo, el actor y la fecha, con la reserva liberada; al cancelar, la causa registrada y la reserva liberada |
| `APPROVED` | Aprobada contra un pedido concreto, todavía no empacada | `PACKED`: el **administrador**. `CANCELLED`: el **administrador** mientras la entrega no se registre (`RN-SOL-08`) o el **sistema** por vencimiento (`RN-SOL-07`) | Al empacar, las unidades concretas por su serial y el aviso de «listo para retirar»; al cancelar, la reserva liberada y la traza de lo asignado conservada |
| `PACKED` | Verificada y empacada, y **el instructor ya fue avisado** porque el aviso es su efecto (`RN-SOL-02`, `RN-NOT-01`) | `PARTIALLY_DELIVERED` o `DELIVERED`: el **administrador** al registrar la entrega. `CANCELLED`: el **administrador** mientras la entrega no se registre (`RN-SOL-08`) o el **sistema** por vencimiento (`RN-SOL-07`) | Al entregar, el tenedor y la fecha de cada unidad y el descuento de los consumibles; al cancelar o vencer, la reserva liberada y la traza de los seriales conservada |
| `PARTIALLY_DELIVERED` | Se entregó **parte** de lo aprobado; lo que falta sigue comprometido y lo ya entregado es un préstamo (`RN-SOL-11`) | `DELIVERED` cuando sale lo último que falta; `PARTIALLY_RETURNED` o `COMPLETED` según el epic 07. **No se cancela**: la entrega ya quedó registrada (`RN-SOL-08`) | Cada unidad entregada con su tenedor y su fecha; lo pendiente sigue comprometido con la solicitud |
| `DELIVERED` | Salió **todo** lo aprobado, de una vez o en la última entrega parcial | `PARTIALLY_RETURNED` o `COMPLETED`: el **epic 07** (`RN-PRE-01`, `RN-SOL-12`) | El conjunto de unidades afuera, con quién las tiene y desde cuándo |
| `PARTIALLY_RETURNED` | Volvió **parte** de lo entregado; falta algo por volver o por declararse perdido | `PARTIALLY_RETURNED` otra vez, o `COMPLETED`: el **epic 07** (`RN-SOL-12`) | Lo devuelto con su condición de retorno y lo que sigue afuera |
| `COMPLETED` | **No queda nada afuera**: todo lo entregado volvió con su condición de retorno o fue declarado perdido (`RN-SOL-12`). Un consumible no entra en esa cuenta, porque nunca vuelve (`RN-INV-06`, `RN-INV-11`) | Estado final | La solicitud cerrada y sus eventos registrados |
| `CANCELLED` | Cancelada **antes** de registrar la entrega (`RN-SOL-06`, `RN-SOL-08`), con la causa registrada: vencimiento o cancelación manual (`RN-SOL-10`) | Estado final | La reserva liberada y la traza de qué unidades estuvieron asignadas, conservada |
| `REJECTED` | Rechazada, con el motivo obligatorio, el actor y la fecha (`RN-SOL-04`) | Estado final | La reserva liberada y el motivo consultable por el instructor |

Consecuencias que este módulo hace exigibles:

- **El aviso no es un estado.** Entrar en `PACKED` avisa al instructor de que puede retirar, y ese aviso es su efecto (`RN-SOL-02`, `RN-NOT-01`): no es una operación aparte ni la consecuencia de aprobar.
- **La entrega parcial no cierra nada.** Mientras falte algo por entregar, la solicitud sigue en `PARTIALLY_DELIVERED` y lo pendiente sigue comprometido (`RN-SOL-11`). Lo ya entregado puede volver mientras la solicitud espera el resto (`RN-PRE-01`), y esa devolución no la saca de `PARTIALLY_DELIVERED`: manda el pendiente de entrega.
- **La cancelación no borra la traza.** El registro de qué unidades estuvieron asignadas sobrevive a la cancelación manual y al vencimiento, porque `RN-PRE-02` exige saber siempre quién tuvo cada elemento.
- **El vencimiento tiene hora y zona.** Ocurre a las 23:59 del segundo día contado desde la fecha de retiro, en la zona local de la aplicación (`America/Bogota`): la reserva sigue vigente a las 23:58 y se cancela a las 23:59.
- **Un consumible no entra al cierre.** Se descuenta al entregarse y no vuelve, así que nunca es algo que quede afuera.

## Historias de usuario

Los criterios nombran la **clase** de actor y de estado —«un instructor», «un administrador», «una solicitud en `PENDING` con cantidad 3», «una solicitud con dos líneas», «un rango que comparte días con una reserva»—. Los valores concretos con los que se ejecutan los escenarios están en el `Anexo — Datos de prueba`, al final del documento, y son ejemplos, no requisitos.

### US-SOL-01 — Crear una solicitud

**Como** instructor **quiero** crear una solicitud con la fecha en que retiro los elementos, la fecha en que estimo devolverlos y los elementos que necesito **para** dejar mi pedido por escrito y que las unidades queden comprometidas para esas fechas sin ir al almacén a preguntar si están.

**Prioridad:** alta — es la entrada del ciclo y el momento en que la disponibilidad se descuenta.
**Estado:** especificada — no ejecutada.

Crear convierte el pedido informal en un compromiso con fechas: la solicitud declara **dos fechas** y su rango completo se descuenta al crear (`RN-NEG-04`, `RN-NEG-03`). Los rangos que no comparten días conviven y los que se solapan compiten solo por la misma unidad (`RN-NEG-01`, `RN-NEG-02`); una unidad prestada no cuenta para ningún rango (`RN-NEG-05`). El instructor pide **elementos y cantidades** y no elige seriales (`RN-CAT-01`), y el administrador no crea solicitudes (`RN-CTX-06`).

#### AC-SOL-01-1 — Crear una solicitud reserva las unidades para el rango de fechas

**Dado** un elemento con 3 unidades en estado físico `OPERATIVO`, ningún compromiso por fechas sobre ese elemento y un instructor con sesión iniciada.
**Cuando** el instructor crea una solicitud del elemento con cantidad 2, una fecha de retiro y una fecha estimada de devolución posterior.
**Entonces**:

- la respuesta es `201`;
- la solicitud queda en estado `PENDING`;
- la solicitud registra la fecha de retiro y la fecha estimada de devolución indicadas;
- 2 unidades del elemento quedan reservadas para ese rango;
- la cantidad disponible del elemento para ese rango baja a 1.

El descuento ocurre **al crear**, no al empacar, y se hace **sobre el rango** declarado: sin rango no hay nada que descontar y sin descuento la fecha sería decorativa.

#### AC-SOL-01-2 — Sin disponibilidad suficiente se rechaza y no se reserva nada

**Dado** un elemento con 3 unidades en estado físico `OPERATIVO`, una solicitud activa que ya reserva 1 unidad del elemento en un rango, un instructor con sesión iniciada y un número conocido de solicitudes.
**Cuando** el instructor crea una solicitud del elemento con cantidad 3 para ese mismo rango.
**Entonces**:

- la respuesta es `409` con código `INSUFFICIENT_STOCK`;
- el mensaje indica `"Disponible: 2, solicitado: 3"`;
- no se crea ninguna solicitud;
- el número de solicitudes no cambia;
- ninguna unidad queda reservada por el intento;
- la cantidad disponible del elemento para ese rango sigue siendo 2.

El rechazo no puede dejar efectos: ni solicitud, ni reserva, ni consumo de disponibilidad.

#### AC-SOL-01-3 — Dos solicitudes con rangos que no se solapan se aceptan ambas

**Dado** un elemento con 2 unidades en estado físico `OPERATIVO`, una solicitud activa que reserva las 2 unidades en un rango y un instructor con sesión iniciada.
**Cuando** el instructor crea una solicitud del mismo elemento con cantidad 2 para otro rango que no comparte ningún día con el primero.
**Entonces**:

- la respuesta es `201`;
- la segunda solicitud queda en estado `PENDING`;
- 2 unidades del elemento quedan reservadas para el rango nuevo;
- la primera solicitud no cambia.

Las dos solicitudes usan **las mismas 2 unidades**: lo que habilita la segunda es que el rango no se solapa, no que sobre inventario.

#### AC-SOL-01-4 — Dos solicitudes con rangos que se solapan compiten por el mismo stock

**Dado** un elemento en estado físico `OPERATIVO` y un instructor con sesión iniciada.

| Caso | Unidades del elemento | Reserva previa en un rango | Nueva solicitud | Efecto |
|------|-----------------------|----------------------------|-----------------|--------|
| el solapamiento agota el stock | 2 | 2 unidades del elemento | cantidad 1 en un rango que comparte días con la reserva | `409` con código `INSUFFICIENT_STOCK`; no se crea la segunda solicitud y las 2 unidades siguen reservadas por la primera |
| el solapamiento todavía alcanza | 3 | 1 unidad del elemento | cantidad 2 en un rango que comparte días con la reserva | `201`; la segunda solicitud queda en `PENDING` y 2 unidades quedan reservadas para su rango |

Lo que se bloquea es **la misma unidad**, no el elemento: prohibir cualquier solapamiento sería más estricto que la regla y dejaría sin equipos que están libres.

#### AC-SOL-01-5 — El administrador no puede crear solicitudes

**Dado** un administrador con sesión iniciada, un elemento con 3 unidades en estado físico `OPERATIVO` y un número conocido de solicitudes.
**Cuando** el administrador envía la petición de crear una solicitud del elemento.
**Entonces**:

- la respuesta es `403`;
- no se crea ninguna solicitud;
- el número de solicitudes no cambia;
- ninguna unidad queda reservada.

El rechazo es completo: una solicitud fantasma o una reserva huérfana serían peores que el error.

#### AC-SOL-01-6 — El mismo elemento repetido en la misma solicitud se rechaza

**Dado** un elemento con 3 unidades en estado físico `OPERATIVO`, un instructor con sesión iniciada y un número conocido de solicitudes.
**Cuando** el instructor crea una solicitud que incluye el mismo elemento en dos líneas.
**Entonces**:

- la respuesta es `400`;
- no se crea ninguna solicitud;
- el número de solicitudes no cambia;
- ninguna unidad queda reservada.

La cantidad es **una sola** por elemento y el instructor no elige seriales (`RN-CAT-01`), así que dos líneas del mismo elemento dejarían dos reservas parciales del mismo rango sin un número único que reservar. El criterio exige el rechazo con efecto nulo, no la fusión silenciosa de las dos líneas.

#### AC-SOL-01-7 — Una unidad prestada no cuenta como disponible para ningún rango

**Dado** un elemento con 2 unidades en estado físico `OPERATIVO`, una de ellas entregada en un préstamo activo y todavía no devuelta, ningún otro compromiso por fechas sobre ese elemento, un instructor con sesión iniciada y un número conocido de solicitudes.
**Cuando** el instructor crea una solicitud del elemento con cantidad 2 para un rango que no se solapa con ningún compromiso.
**Entonces**:

- la respuesta es `409` con código `INSUFFICIENT_STOCK`;
- el mensaje indica `"Disponible: 1, solicitado: 2"`;
- no se crea ninguna solicitud;
- el número de solicitudes no cambia;
- ninguna unidad queda reservada por el intento.

Una reserva ocupa solo su rango y se cancela sola si no se retira (`RN-SOL-07`); un préstamo bloquea **todas** las fechas hasta que se registre la devolución. Por eso el rango pedido no se solapa con nada y aun así no alcanza.

#### AC-SOL-01-8 — Una cantidad decimal de un consumible se rechaza

**Dado** un consumible registrado con su unidad de medida, un instructor con sesión iniciada y un número conocido de solicitudes.
**Cuando** el instructor crea una solicitud de ese consumible con cantidad 1,5.
**Entonces**:

- la respuesta es `400`;
- no se crea ninguna solicitud;
- el número de solicitudes no cambia;
- la cantidad disponible del consumible no cambia.

No se exige ninguna reserva por fechas: un consumible no se reserva por rango y su stock baja al registrar la entrega.

#### AC-SOL-01-9 — Una fecha de retiro anterior a hoy se rechaza y nada se reserva

**Dado** un elemento con 3 unidades en estado físico `OPERATIVO`, un instructor con sesión iniciada y un número conocido de solicitudes.

| Fecha de retiro | Efecto |
|-----------------|--------|
| el día anterior a hoy | `400`; no se crea ninguna solicitud; el número de solicitudes no cambia; ninguna unidad queda reservada por el intento; la cantidad disponible del elemento para ese rango no cambia |
| hoy | `201`; la solicitud queda en `PENDING` y 1 unidad del elemento queda reservada desde hoy hasta la fecha estimada de devolución |

Un rango que ya empezó no se puede reservar, y el borde deja el día de hoy adentro: una entrega el mismo día ocurre solo si el administrador tiene disponibilidad para hacerlo (`RN-SOL-01`).

#### AC-SOL-01-10 — Una fecha estimada de devolución anterior a la de retiro se rechaza

**Dado** un elemento con 3 unidades en estado físico `OPERATIVO`, un instructor con sesión iniciada y un número conocido de solicitudes.
**Cuando** el instructor crea una solicitud del elemento con cantidad 1 cuya fecha estimada de devolución es anterior a la fecha de retiro.
**Entonces**:

- la respuesta es `400`;
- no se crea ninguna solicitud;
- el número de solicitudes no cambia;
- ninguna unidad queda reservada por el intento.

Un intervalo cuyo fin es anterior al inicio no existe, y ninguna regla autoriza a corregir en silencio las fechas que el instructor escribió.

#### AC-SOL-01-11 — La fecha de retiro por defecto es el día siguiente

**Dado** un elemento con 3 unidades en estado físico `OPERATIVO` y un instructor con sesión iniciada.
**Cuando** el instructor crea una solicitud del elemento con cantidad 1 indicando solo la fecha estimada de devolución.
**Entonces**:

- la respuesta es `201`;
- la solicitud queda en estado `PENDING`;
- la solicitud registra como fecha de retiro el día siguiente a hoy;
- 1 unidad del elemento queda reservada desde el día siguiente a hoy hasta la fecha estimada de devolución indicada.

El día siguiente es un **valor de interfaz** coherente con el ritmo de un día para el otro (`RN-SOL-01`), no un valor que la regla fije.

### US-SOL-02 — Aprobar una solicitud

**Como** administrador del almacén **quiero** aprobar la solicitud del instructor, ajustando la cantidad si hace falta y dejando constancia de por qué **para** que el instructor sepa qué se le va a entregar y qué cambió respecto de lo que pidió.

**Prioridad:** alta — es la decisión del administrador y el único punto en que dos techos distintos se aplican juntos.
**Estado:** especificada — no ejecutada.

Aprobar es la **decisión** sobre el pedido, no un aviso: el aviso de que puede retirar llega al empacar. El administrador puede **reducir** la cantidad y nunca aumentarla (`RN-SOL-03`), y no puede aprobar más de lo disponible para el rango (`RN-SOL-09`); cuando los dos techos aplican, manda el más chico. La nota del porqué es obligatoria cuando el **total aprobado** es menor que el **total solicitado** y opcional cuando coinciden (`RN-SOL-04`). Solo el administrador aprueba (`RN-CTX-05`).

#### AC-SOL-02-1 — Aprobar sin cambios lleva la solicitud de `PENDING` a `APPROVED`

**Dado** una solicitud en estado `PENDING` con cantidad solicitada 2 y un administrador con sesión iniciada.
**Cuando** el administrador aprueba la solicitud sin modificar la cantidad.
**Entonces**:

- la respuesta es `200`;
- la solicitud queda en estado `APPROVED`;
- la solicitud registra cantidad aprobada 2;
- las 2 unidades siguen reservadas para el rango de la solicitud.

Aprobar **no toca la reserva**: la solicitud ya la había descontado al crear y aprobar no es un segundo compromiso.

#### AC-SOL-02-2 — Al aprobar se puede reducir la cantidad y queda registrada la aprobada

**Dado** un administrador con sesión iniciada y una solicitud en estado `PENDING`.

| Caso | Solicitado | Aprobado | Nota | Efecto |
|------|------------|----------|------|--------|
| una línea | cantidad 3 | cantidad 2 | la nota del porqué de la reducción | `200`; la solicitud queda en `APPROVED` y registra cantidad solicitada 3, cantidad aprobada 2 y la nota del administrador |
| dos líneas | 3 del primero y 2 del segundo | 3 del primero y 1 del segundo | la nota del porqué de la reducción | `200`; la solicitud queda en `APPROVED` y registra un total solicitado de 5, un total aprobado de 4 y la nota del administrador |

Las dos cifras quedan registradas y distinguibles: sin la cantidad aprobada, el instructor no sabe qué va a recibir y el empaque no tiene contra qué verificar. La reducción se mide sobre el **total** de la solicitud, y en este caso la nota es obligatoria, que es lo que exige el escenario.

#### AC-SOL-02-3 — No se puede aprobar una cantidad mayor a la solicitada

**Dado** una solicitud en estado `PENDING` con cantidad solicitada 2 y un administrador con sesión iniciada.
**Cuando** el administrador aprueba la solicitud con cantidad aprobada 3.
**Entonces**:

- la respuesta es `400`;
- la solicitud sigue en estado `PENDING`;
- la solicitud no registra una cantidad aprobada;
- la reserva de la solicitud no cambia.

Aprobar **más** de lo pedido sería decidir por el instructor, que es quien pide lo que necesita. El techo se compara **total contra total**; este es el techo del **pedido**, distinto del techo del **stock** de AC-SOL-02-6. Los dos se aplican a la vez y la cantidad aprobada nunca supera el más chico.

#### AC-SOL-02-4 — La nota al aprobar: obligatoria al reducir la cantidad y opcional al aprobar lo solicitado

**Dado** un administrador con sesión iniciada y una solicitud en estado `PENDING` con su reserva para el rango.

| Caso | Entrada | Efecto |
|------|---------|--------|
| una línea que reduce sin nota | cantidad solicitada 3, cantidad aprobada 2, sin nota | `400`; la respuesta indica que la nota es obligatoria cuando se reduce la cantidad; la solicitud sigue en `PENDING`, no registra cantidad aprobada y su reserva no cambia |
| una línea que aprueba exactamente lo solicitado sin nota | cantidad solicitada 2, cantidad aprobada 2 | `200`; la solicitud queda en `APPROVED` y registra cantidad aprobada 2 |
| dos líneas cuyos totales coinciden, sin nota | 3 y 2 solicitadas, 3 y 2 aprobadas | `200`; la solicitud queda en `APPROVED` y registra un total aprobado de 5 sobre un total solicitado de 5 |
| dos líneas cuyo total aprobado es menor, sin nota | 3 y 2 solicitadas, 3 y 1 aprobadas | `400`; la respuesta indica que la nota es obligatoria cuando el total aprobado es menor que el total solicitado; la solicitud sigue en `PENDING` y no registra cantidades aprobadas |

La comparación es de **totales**. La nota existe para decirle al instructor algo que no sabe: una reducción es un rechazo parcial disfrazado de aprobación, y una aprobación idéntica al pedido no le comunica nada nuevo.

#### AC-SOL-02-5 — Solo el administrador aprueba

**Dado** una solicitud en estado `PENDING` creada por un instructor y ese instructor con sesión iniciada.
**Cuando** el instructor envía la petición de aprobar la solicitud.
**Entonces**:

- la respuesta es `403`;
- la solicitud sigue en estado `PENDING`;
- la solicitud no registra una cantidad aprobada;
- la reserva de la solicitud no cambia.

Una autoaprobación aceptada rompería además el orden del proceso: la verificación física ocurre antes de avisar que puede retirar (`RN-SOL-02`).

#### AC-SOL-02-6 — No se puede aprobar más de lo que hay disponible en el almacén para el rango

**Dado** un administrador con sesión iniciada y una solicitud en estado `PENDING` con su rango.

| Caso | Disponible en el almacén para el rango | Aprobación | Efecto |
|------|----------------------------------------|------------|--------|
| aprueba más de lo disponible | 1 unidad, con cantidad solicitada 3 | cantidad aprobada 3, con la nota del porqué | `409` con código `INSUFFICIENT_STOCK`; la solicitud sigue en `PENDING`, no registra cantidad aprobada y su reserva no cambia |
| aprueba exactamente lo disponible | 2 unidades, con cantidad solicitada 2 | cantidad aprobada 2 | `200`; la solicitud queda en `APPROVED`, registra cantidad aprobada 2 y las 2 unidades siguen reservadas para el rango |

La comprobación no se puede dejar solo al empaque: entre la creación y el empaque pueden pasar días, y en ese lapso una unidad puede pasar a un estado que no permite prestar (`RN-INV-31`) o declararse perdida (`RN-PRE-15`). La aprobación es el último punto en que el administrador lo detecta antes de comprometerse a entregar. El escenario de rechazo usa la misma cantidad solicitada y aprobada para que el único límite violado sea el del almacén.

### US-SOL-03 — Rechazar una solicitud

**Como** administrador del almacén **quiero** rechazar una solicitud dejando escrito el motivo **para** que el instructor sepa por qué no se le puede entregar y pueda pedir otra cosa a tiempo.

**Prioridad:** alta — el motivo es obligatorio y el rechazo tiene que devolver la reserva al rango.
**Estado:** especificada — no ejecutada.

El motivo no es cortesía: es lo que convierte un «no» en información útil, y queda registrado con quién rechazó y cuándo (`RN-SOL-04`). El rechazo además **libera la reserva**, porque la solicitud ya la había descontado al crear (`RN-NEG-03`): si la retuviera, las unidades quedarían comprometidas para un rango en el que nadie las va a retirar.

#### AC-SOL-03-1 — Rechazar exige un motivo y deja registrado quién, cuándo y por qué

**Dado** una solicitud en estado `PENDING` y un administrador con sesión iniciada.
**Cuando** el administrador rechaza la solicitud con un motivo.
**Entonces**:

- la respuesta es `200`;
- la solicitud queda en estado `REJECTED`;
- la solicitud registra el motivo indicado;
- la solicitud registra quién la rechazó;
- la solicitud registra la fecha en que se rechazó.

Cómo se nombra el campo del motivo es decisión de implementación; el efecto exigido es que el texto quede registrado y sea consultable.

#### AC-SOL-03-2 — Rechazar libera la reserva del rango

**Dado** un elemento con 2 unidades en estado físico `OPERATIVO`, una solicitud en estado `PENDING` que reserva esas 2 unidades en un rango, la cantidad disponible del elemento para ese rango en 0 y un administrador con sesión iniciada.
**Cuando** el administrador rechaza la solicitud con un motivo.
**Entonces**:

- la solicitud queda en estado `REJECTED`;
- las 2 unidades dejan de estar reservadas para ese rango;
- la cantidad disponible del elemento para ese rango es 2.

Liberar sin cambiar el estado, o cambiar el estado sin liberar, son las dos formas de incumplirlo.

#### AC-SOL-03-3 — Un rechazo sin motivo se rechaza y la solicitud sigue en `PENDING`

**Dado** una solicitud en estado `PENDING` con su reserva para el rango y un administrador con sesión iniciada.
**Cuando** el administrador rechaza la solicitud sin escribir un motivo.
**Entonces**:

- la respuesta es `400`;
- la respuesta indica que el motivo es obligatorio;
- la solicitud sigue en estado `PENDING`;
- la reserva de la solicitud no cambia.

Una solicitud que queda `REJECTED` sin razón, o una reserva liberada por un intento fallido, serían peores que el error.

### US-SOL-04 — Modificar una solicitud pendiente

**Como** instructor **quiero** modificar mi solicitud mientras todavía está pendiente **para** corregir la cantidad o las fechas sin tener que anularla y volver a pedir.

**Prioridad:** media — la modificación está acotada a `PENDING`.
**Estado:** especificada — no ejecutada.

Solo se modifica mientras la solicitud está pendiente: en `APPROVED` y en `PACKED` el administrador ya verificó y empacó contra un pedido concreto, así que el pedido deja de ser del instructor (`RN-SOL-05`). Modificar no es un cambio de texto: es un cambio de **reserva**, que sigue a la nueva cantidad y al nuevo rango (`RN-NEG-03`, `RN-NEG-04`).

#### AC-SOL-04-1 — El instructor modifica su solicitud pendiente y se ajusta la reserva

**Dado** un elemento con 3 unidades en estado físico `OPERATIVO`, una solicitud en estado `PENDING` del instructor, del elemento con cantidad 1 y con su fecha de retiro y su fecha estimada de devolución, y ese instructor con sesión iniciada.
**Cuando** el instructor modifica su solicitud a cantidad 2 y a una fecha estimada de devolución posterior.
**Entonces**:

- la respuesta es `200`;
- la solicitud sigue en estado `PENDING`;
- la solicitud registra cantidad 2 y la nueva fecha estimada de devolución;
- 2 unidades del elemento quedan reservadas para el rango nuevo;
- la reserva anterior deja de existir.

El estado no cambia y la reserva queda la nueva: cualquiera de las dos cosas sola deja el inventario describiendo un pedido que ya no existe.

#### AC-SOL-04-2 — Si la modificación pide más de lo disponible, se rechaza y todo queda como estaba

**Dado** un elemento con 2 unidades en estado físico `OPERATIVO`, una solicitud en estado `PENDING` del instructor, del elemento con cantidad 1 y con su rango, otra solicitud activa que reserva 1 unidad del elemento en un rango que comparte días con el primero, y ese instructor con sesión iniciada.
**Cuando** el instructor modifica su solicitud a cantidad 2 para el mismo rango.
**Entonces**:

- la respuesta es `409` con código `INSUFFICIENT_STOCK`;
- la solicitud conserva la cantidad 1;
- la solicitud conserva la fecha de retiro y la fecha estimada de devolución;
- la reserva de la solicitud no cambia.

El criterio exige la **atomicidad**: ni la cantidad, ni las fechas, ni la reserva cambian cuando el nuevo pedido no cabe. Una modificación a medias dejaría al instructor creyendo que pidió 2 y al inventario reservando 1.

### US-SOL-05 — Empacar una solicitud

**Como** administrador del almacén **quiero** empacar la solicitud aprobada, comprobando que cada elemento funciona y asignando las unidades concretas que se van a entregar **para** avisarle al instructor que puede retirar al día siguiente con la certeza de que lo que se lleva es lo que se aprobó.

**Prioridad:** alta — es la verificación física del proceso y el momento en que el pedido abstracto se convierte en seriales.
**Estado:** especificada — no ejecutada.

Empacar es verificar y **empacar** antes de avisar: el aviso de «listo para retirar» es su **efecto** y no un paso aparte (`RN-SOL-02`, `RN-NOT-01`). El instructor pide elementos y cantidades (`RN-CAT-01`), así que acá se asignan las unidades concretas. El compuesto se entrega completo (`RN-INV-02`) y la ausencia de un componente **opcional** solo se documenta (`RN-INV-24`), porque el administrador es quien marca cada componente como obligatorio u opcional al definir la composición (`RN-INV-37`). Los consumibles no se descuentan acá.

#### AC-SOL-05-1 — Empacar lleva la solicitud a `PACKED` y asigna las unidades concretas

**Dado** una solicitud en estado `APPROVED` con cantidad aprobada 2 de un elemento serializado, 2 unidades del elemento en estado físico `OPERATIVO` disponibles para el rango de la solicitud y un administrador con sesión iniciada.
**Cuando** el administrador empaca la solicitud.
**Entonces**:

- la respuesta es `200`;
- la solicitud queda en estado `PACKED`;
- la solicitud registra las 2 unidades concretas que se entregarán, identificadas por su número de serie;
- ninguna de esas 2 unidades queda disponible para otra solicitud en ese rango.

Las dos caras del mismo efecto: la solicitud avanza y los seriales quedan registrados. Las unidades asignadas dejan de estar disponibles para que el rango no se prometa dos veces.

#### AC-SOL-05-2 — Un compuesto al que le falta un componente obligatorio no se puede empacar

**Dado** una solicitud en estado `APPROVED` que incluye un elemento compuesto, cuyo componente obligatorio tiene su unidad prestada por separado, y un administrador con sesión iniciada.
**Cuando** el administrador empaca la solicitud.
**Entonces**:

- la operación se rechaza;
- la solicitud sigue en estado `APPROVED`;
- la solicitud no registra unidades asignadas para el compuesto;
- la reserva de la solicitud no cambia.

Un compuesto se entrega completo (`RN-INV-02`): la ausencia **documentada** que autoriza `RN-INV-24` no alcanza para una pieza obligatoria.

#### AC-SOL-05-3 — Si falta un componente opcional, se empaca y la ausencia queda documentada

**Dado** una solicitud en estado `APPROVED` que incluye un elemento compuesto cuyo componente opcional no está presente y cuyos componentes obligatorios están completos, y un administrador con sesión iniciada.
**Cuando** el administrador empaca la solicitud.
**Entonces**:

- la respuesta es `200`;
- la solicitud queda en estado `PACKED`;
- la solicitud documenta cuál componente opcional falta.

Aceptar sin documentar dejaría el conjunto sin la trazabilidad que la auditoría necesita; rechazar por una pieza opcional sería más estricto que la regla.

#### AC-SOL-05-4 — Si ya no hay stock suficiente para el rango, empacar falla y no avanza

**Dado** una solicitud en estado `APPROVED` con cantidad aprobada 2 de un elemento, solo 1 unidad del elemento disponible para el rango de la solicitud y un administrador con sesión iniciada.
**Cuando** el administrador empaca la solicitud.
**Entonces**:

- la operación se rechaza;
- la solicitud sigue en estado `APPROVED`;
- la solicitud no registra unidades asignadas;
- la reserva de la solicitud no cambia.

El descuento al crear hacía la situación anómala, no imposible: una unidad puede cambiar de estado físico o declararse perdida después de la aprobación. Exigir el rechazo sin efectos evita la peor salida, que es empacar 1 unidad para una solicitud de 2 y enterarse al entregar.

#### AC-SOL-05-5 — Empacar una solicitud no descuenta stock de consumibles

**Dado** un consumible con stock 10, una solicitud en estado `APPROVED` que incluye 2 unidades de ese consumible y un administrador con sesión iniciada.
**Cuando** el administrador empaca la solicitud.
**Entonces**:

- la respuesta es `200`;
- la solicitud queda en estado `PACKED`;
- el stock del consumible sigue siendo 10;
- no se registra ningún descuento de cantidad en ese momento.

El consumible sigue en el almacén hasta que la entrega se registra: empacar es verificar y preparar.

#### AC-SOL-05-6 — El aviso de que el instructor puede retirar es el efecto de empacar

**Dado** una solicitud con su reserva para el rango, el instructor autor de la solicitud con sesión iniciada, ningún aviso de «listo para retirar» para esa solicitud y un administrador con sesión iniciada.

| Caso | Acción | Efecto |
|------|--------|--------|
| empacar avisa | el administrador empaca la solicitud, que está en `APPROVED` con cantidad aprobada 2 | `200`; la solicitud queda en `PACKED`; queda **exactamente un** aviso de «listo para retirar» para esa solicitud, y el instructor lo consulta dentro del sistema |
| aprobar no avisa | el administrador aprueba sin modificar la cantidad de una solicitud en `PENDING` con cantidad solicitada 2 | `200`; la solicitud queda en `APPROVED`; el aviso de aprobación queda disponible para el instructor y **no** queda ningún aviso de «listo para retirar» |

Los dos escenarios son necesarios: el primero exige que el aviso **nazca al empacar** y el segundo que **no** nazca al aprobar, cuando el pedido todavía no está verificado ni empacado. El segundo no niega el aviso de aprobación, que la regla enumera: niega el de «listo para retirar». Los canales externos son opcionales y se verifican en AC-SOL-09-7.

### US-SOL-06 — Entregar una solicitud

**Como** administrador del almacén **quiero** registrar la entrega de una solicitud empaquetada **para** que quede asentado que el instructor se llevó esas unidades y desde qué día las tiene.

**Prioridad:** alta — es el momento en que el compromiso pasa de reserva a préstamo y en que los consumibles salen del almacén.
**Estado:** especificada — no ejecutada.

La entrega se registra solo sobre una solicitud empaquetada, porque entregar sin empacar saltearía la verificación y dejaría la solicitud entregada sin seriales asignados. Puede ser **total o parcial**: si sale todo, la solicitud va a `DELIVERED`; si sale parte, queda en `PARTIALLY_DELIVERED` sin cerrarse (`RN-SOL-11`). Cada unidad entregada queda con su tenedor y su fecha (`RN-PRE-02`), y los consumibles se descuentan **en ese momento** (`RN-INV-11`).

#### AC-SOL-06-1 — Entregar todo lo aprobado lleva la solicitud de `PACKED` a `DELIVERED`

**Dado** una solicitud en estado `PACKED` con la totalidad de lo aprobado asignado en unidades concretas y un administrador con sesión iniciada.
**Cuando** el administrador registra la entrega de todo lo aprobado.
**Entonces**:

- la respuesta es `200`;
- la solicitud queda en estado `DELIVERED`;
- las unidades asignadas quedan registradas como entregadas;
- la solicitud no pasa por el estado `PARTIALLY_DELIVERED`.

El estado de la solicitud y el de las unidades se exigen juntos: una solicitud entregada cuyas unidades siguen en el almacén describe un préstamo que no existe.

#### AC-SOL-06-2 — Solo se puede entregar una solicitud en `PACKED` o en `PARTIALLY_DELIVERED`

**Dado** un administrador con sesión iniciada.

| Caso | Estado de la solicitud | Efecto |
|------|------------------------|--------|
| entrega de una solicitud no empacada | `PENDING` | la operación se rechaza; la solicitud sigue en `PENDING`; ninguna unidad queda registrada como entregada |
| entrega de una solicitud aprobada sin empacar | `APPROVED` | la operación se rechaza; la solicitud sigue en `APPROVED`; ninguna unidad queda registrada como entregada |
| entrega repetida | `DELIVERED` con sus unidades entregadas | la operación se rechaza; la solicitud sigue en `DELIVERED`; la fecha de entrega registrada no cambia |

Los estados de origen válidos son `PACKED` y `PARTIALLY_DELIVERED`, y solo esos dos: entregar una solicitud que nunca se empacó salta un paso del proceso, y `RN-SOL-11` mantiene vivo un pedido entregado a medias, que sigue siendo entregable porque lo que falta ya se verificó. El tercer caso es la **idempotencia**: si la entrega repetida se aceptara, la fecha desde la que el instructor tiene cada unidad se reescribiría y `RN-PRE-02` respondería con un dato falso.

#### AC-SOL-06-3 — Al entregar queda registrado quién tiene cada unidad y desde cuándo

**Dado** una solicitud en estado `PACKED` de un instructor, con 2 unidades concretas asignadas, y un administrador con sesión iniciada.
**Cuando** el administrador registra la entrega de la solicitud en una fecha.
**Entonces**:

- cada unidad asignada queda registrada como entregada a ese instructor;
- cada unidad registra esa fecha como la fecha desde la que la tiene el instructor;
- la consulta de quién tiene cada unidad devuelve ese instructor y esa fecha.

El dato se asocia a la **unidad**, no solo a la solicitud: los préstamos duran un mes o más y saber desde cuándo es la mitad de la regla. Un registro que existe pero no se puede leer tampoco la cumple.

#### AC-SOL-06-4 — Registrar la entrega descuenta del stock la cantidad de consumibles entregados

**Dado** un consumible con stock 10, una solicitud en estado `PACKED` que incluye 2 unidades de ese consumible y un administrador con sesión iniciada.
**Cuando** el administrador registra la entrega de la solicitud.
**Entonces**:

- la respuesta es `200`;
- el stock del consumible queda en 8;
- el descuento queda registrado como cantidad entregada, no como reserva por rango de fechas;
- no se crea ninguna unidad serializada del consumible.

La cantidad descontada es la **entregada**; un consumible no vuelve y no se reserva por fecha. Sin este descuento, el catálogo seguiría ofreciendo unidades que ya salieron del almacén.

#### AC-SOL-06-5 — Una entrega parcial deja la solicitud en `PARTIALLY_DELIVERED`

**Dado** una solicitud en estado `PACKED` con 3 unidades concretas asignadas y un administrador con sesión iniciada.
**Cuando** el administrador registra la entrega de 2 de esas 3 unidades.
**Entonces**:

- la respuesta es `200`;
- la solicitud queda en estado `PARTIALLY_DELIVERED`;
- la solicitud no queda en estado `DELIVERED`;
- las 2 unidades entregadas quedan registradas a nombre del instructor;
- la unidad no entregada sigue comprometida con la solicitud.

El estado existe para que la solicitud no figure como entregada —lo que mentiría sobre lo que falta— ni como pendiente —lo que borraría la constancia de lo que ya salió—. Lo entregado pasa a regirse por las reglas del préstamo y lo pendiente sigue comprometido.

#### AC-SOL-06-6 — La entrega de lo que falta lleva la solicitud de `PARTIALLY_DELIVERED` a `DELIVERED`

**Dado** una solicitud en estado `PARTIALLY_DELIVERED` con 2 de sus 3 unidades ya entregadas y un administrador con sesión iniciada.
**Cuando** el administrador registra la entrega de la unidad restante.
**Entonces**:

- la respuesta es `200`;
- la solicitud queda en estado `DELIVERED`;
- las 3 unidades de la solicitud quedan registradas como entregadas;
- la solicitud no queda en estado `COMPLETED`.

Una solicitud `DELIVERED` con una unidad todavía comprometida sería la mentira contraria a la de AC-SOL-06-5. `DELIVERED` no es `COMPLETED`: el cierre exige que no quede nada afuera, y ese paso pertenece al epic 07.

### US-SOL-07 — Cancelar una solicitud

**Como** instructor **quiero** cancelar mi solicitud mientras todavía está pendiente, y **como** administrador del almacén **quiero** cancelarla cuando el instructor no va a retirarla, **para** liberar los elementos para otro instructor y dejar asentado que ese pedido no se va a entregar.

**Prioridad:** alta — es la salida manual del ciclo, con dos alcances distintos según el actor.
**Estado:** especificada — no ejecutada.

El instructor cancela **solo en `PENDING`** (`RN-SOL-05`); el administrador cancela **mientras la entrega no se haya registrado**, que abarca `PENDING`, `APPROVED` y `PACKED` (`RN-SOL-06`, `RN-SOL-08`). Cancelar libera la reserva y **conserva la traza** de qué unidades estuvieron asignadas, porque borrarla destruye la respuesta a quién tuvo qué (`RN-PRE-02`). El aviso de la cancelación manual al instructor se consulta en `US-SOL-09`.

#### AC-SOL-07-1 — El instructor cancela solo en `PENDING`

**Dado** un instructor con sesión iniciada y una solicitud suya en cada uno de los estados de origen.

| Caso | Estado de la solicitud | Efecto |
|------|------------------------|--------|
| cancela su solicitud pendiente | `PENDING` | `200`; la solicitud queda en `CANCELLED` |
| intenta cancelar una solicitud aprobada | `APPROVED` | `403`; la solicitud sigue en `APPROVED`; la reserva no cambia |
| intenta cancelar una solicitud empaquetada | `PACKED`, con 2 unidades asignadas | `403`; la solicitud sigue en `PACKED`; las 2 unidades siguen registradas como asignadas a esa solicitud |

El tercer caso agrega la mitad que importa: el rechazo **no toca las asignaciones**. Si el intento fallido las borrara, el daño ocurriría igual sin que la solicitud cambie de estado.

#### AC-SOL-07-2 — El administrador cancela una solicitud antes de que se registre la entrega

**Dado** un administrador con sesión iniciada y una solicitud en cada uno de los estados de origen.

| Caso | Estado de la solicitud | Efecto |
|------|------------------------|--------|
| cancela una solicitud empaquetada antes de la entrega | `PACKED`, con 2 unidades concretas asignadas | `200`; la solicitud queda en `CANCELLED` |
| cancela una solicitud pendiente que el instructor no retiró | `PENDING`, con la fecha de retiro de ayer y dentro de la ventana de 2 días | `200`; la solicitud queda en `CANCELLED` |
| cancela una solicitud aprobada antes de la entrega | `APPROVED`, con 2 unidades reservadas para su rango | `200`; la solicitud queda en `CANCELLED` y las 2 unidades dejan de estar reservadas para ese rango |

La fecha de retiro del segundo caso es la de **ayer** y no una más antigua: pasados más de dos días la solicitud ya venció y no estaría `PENDING` cuando el administrador lo intentara.

#### AC-SOL-07-3 — La cancelación libera la reserva del rango

**Dado** un elemento con 2 unidades en estado físico `OPERATIVO`, una solicitud en estado `APPROVED` creada por un instructor que reserva esas 2 unidades en un rango, la cantidad disponible del elemento para ese rango en 0 y un administrador con sesión iniciada.
**Cuando** el administrador cancela esa solicitud.
**Entonces**:

- la solicitud queda en estado `CANCELLED`;
- las 2 unidades dejan de estar reservadas para ese rango;
- la cantidad disponible del elemento para ese rango es 2.

La liberación no depende de quién cancela ni del estado de origen, sino de que la entrega no se haya registrado: una solicitud cancelada que retuviera su reserva dejaría unidades comprometidas para un rango en el que nadie las va a retirar.

#### AC-SOL-07-4 — Cancelar una solicitud empaquetada no borra las unidades asignadas

**Dado** una solicitud en estado `PACKED` con 2 unidades concretas asignadas, identificadas por su número de serie, y un administrador con sesión iniciada.
**Cuando** el administrador cancela la solicitud.
**Entonces**:

- la solicitud queda en estado `CANCELLED`;
- el registro de qué unidades estuvieron asignadas a esa solicitud se conserva;
- la consulta de esa solicitud sigue informando esos 2 números de serie.

El registro tiene que sobrevivir **y** ser consultable: guardar el dato sin poder leerlo no cumple la regla.

#### AC-SOL-07-5 — Cancelar una solicitud con entrega registrada se rechaza

**Dado** un administrador con sesión iniciada y una solicitud con la entrega ya registrada.

| Caso | Estado de la solicitud | Efecto |
|------|------------------------|--------|
| intenta cancelar una solicitud ya entregada | `DELIVERED`, con sus unidades entregadas a un instructor | la operación se rechaza; la solicitud sigue en `DELIVERED`; las unidades siguen registradas a nombre del instructor |
| intenta cancelar una solicitud con entrega parcial | `PARTIALLY_DELIVERED`, con parte de lo aprobado entregado | la operación se rechaza; la solicitud sigue en `PARTIALLY_DELIVERED`; las unidades ya entregadas siguen a nombre del instructor y lo que falta sigue comprometido |

El límite es la **entrega** y no la devolución: cancelar deshace un compromiso que todavía no ocurrió, y una solicitud ya entregada se cierra por devolución o por pérdida registrada, ambas del epic 07. Si el intento se aceptara y liberara las unidades, el sistema tendría que decidir qué pasó con equipos que físicamente están afuera.

### US-SOL-08 — Expirar una solicitud no retirada

**Como** sistema **quiero** cancelar automáticamente las solicitudes que no se retiraron dentro del plazo **para** que la disponibilidad no quede comprometida por pedidos que nadie va a recoger.

**Prioridad:** media — es la salida automática del ciclo y la única transición que ningún usuario dispara.
**Estado:** especificada — no ejecutada.

El plazo es **más de 2 días** contados desde la **fecha de retiro**, no desde la aprobación, y el corte es a las **23:59 del segundo día** en la zona horaria local de la aplicación (`America/Bogota`), con la causa registrada (`RN-SOL-07`, `RN-SOL-10`). Los estados de origen son los que todavía tienen reserva y ninguna entrega registrada: `PENDING`, `APPROVED` y `PACKED`. El vencimiento libera la reserva y conserva la traza de los seriales asignados (`RN-NEG-03`, `RN-PRE-02`).

#### AC-SOL-08-1 — Pasados más de 2 días desde la fecha de retiro sin entrega, la solicitud se cancela

**Dado** una solicitud con fecha de retiro y sin entrega registrada, y una solicitud con la entrega registrada el día de su fecha de retiro.

| Caso | Estado y momento observado | Efecto |
|------|----------------------------|--------|
| solicitud aprobada que no se retiró | `APPROVED`, pasados más de 2 días desde la fecha de retiro | la solicitud queda en `CANCELLED` y registra que su cancelación fue por vencimiento |
| solicitud empaquetada que no se retiró | `PACKED` con 2 unidades concretas asignadas, pasados más de 2 días desde la fecha de retiro | la solicitud queda en `CANCELLED` y el registro de qué unidades estuvieron asignadas se conserva |
| el plazo no se cumple todavía | a las 00:00 del segundo día contado desde la fecha de retiro, en la hora local de la aplicación | la solicitud **no** se cancela automáticamente y conserva el estado que tenía |
| el corte todavía no llega | a las 23:58 del segundo día, en la hora local de la aplicación (`America/Bogota`) | la solicitud **no** se cancela automáticamente y conserva el estado que tenía |
| el corte llega | a las 23:59 del segundo día, en la hora local de la aplicación (`America/Bogota`) | la solicitud queda en `CANCELLED` y registra que su cancelación fue por vencimiento |
| solicitud retirada a tiempo | con la entrega registrada el día de su fecha de retiro, pasados más de 2 días | la solicitud **no** se cancela automáticamente y conserva el estado de entrega registrado |

El punto de partida no se mide desde la aprobación: una solicitud aprobada con semanas de anticipación vence por su fecha de retiro. La **zona horaria** es parte del criterio y no un detalle de implementación: el test tiene que producir el instante en esa zona, porque un corte a las 23:59 en otra zona cancela hasta cinco horas antes o después y el instructor pierde su reserva —o la conserva— un día de más.

#### AC-SOL-08-2 — La cancelación automática libera la reserva

**Dado** un elemento con 2 unidades en estado físico `OPERATIVO`, una solicitud activa con fecha de retiro que reserva esas 2 unidades en un rango y sin entrega registrada.
**Cuando** transcurren más de 2 días desde la fecha de retiro.
**Entonces**:

- la solicitud queda cancelada automáticamente;
- las 2 unidades dejan de estar reservadas para ese rango;
- la cantidad disponible del elemento para ese rango es 2.

Un vencimiento que no libere la reserva deja el inventario peor que antes: la solicitud ya no existe para el instructor y las unidades siguen sin poder prestarse.

#### AC-SOL-08-3 — La cancelación por vencimiento se distingue de una cancelación manual

**Dado** una solicitud cancelada automáticamente por no haberse retirado y otra solicitud cancelada por el administrador.
**Cuando** se consultan las dos solicitudes.
**Entonces**:

- las dos figuran canceladas;
- la primera informa que su cancelación fue por vencimiento;
- la segunda no informa vencimiento.

Las dos producen la misma transición por causas distintas, y sin esa distinción no se puede saber si el instructor no retiró o si alguien canceló el pedido.

### US-SOL-09 — Consultar solicitudes

**Como** instructor **quiero** consultar mis solicitudes con su estado actual, el motivo del rechazo y los avisos que el sistema me dejó **para** saber qué pasó con mi pedido sin preguntar por WhatsApp y sin ir al almacén.

**Prioridad:** alta — es el único punto donde el instructor lee el resultado de su pedido.
**Estado:** especificada — no ejecutada.

El instructor ve **solo sus** solicitudes (`RN-PRE-17`), el **motivo del rechazo** y de la reducción (`RN-SOL-04`), y los **avisos** que el sistema le dejó dentro del sistema, con los canales externos como posibilidad configurable (`RN-NOT-01`, `RN-NOT-02`). La desactivación de su cuenta no cancela ni oculta lo que está en curso (`RN-USR-05`). El administrador consulta **todas** y filtra por estado; el volumen obliga a paginar con el total (`RN-CTX-02`). Consultar no cambia el estado de nada.

#### AC-SOL-09-1 — El instructor consulta sus solicitudes con su estado actual

**Dado** un instructor con sesión iniciada.

| Caso | Situación | Efecto |
|------|-----------|--------|
| consulta sus solicitudes | una solicitud suya en `PENDING`, otra en `APPROVED` y otra en `REJECTED` | la consulta devuelve las tres; cada una informa su estado actual: la pendiente figura en `PENDING`, la aprobada en `APPROVED` y la rechazada en `REJECTED` |
| instructor desactivado con una solicitud en curso | una solicitud suya en `APPROVED` todavía no entregada, y la cuenta de ese instructor queda desactivada; el administrador consulta las solicitudes | la solicitud sigue registrada a nombre de ese instructor, conserva su estado `APPROVED` y no figura cancelada |

Dar de baja una cuenta **impide entrar** y no cierra el pedido por la puerta de atrás: la solicitud compromete unidades para unas fechas y tiene un dueño identificable.

#### AC-SOL-09-2 — El instructor ve el motivo del rechazo registrado por el administrador

**Dado** un instructor con sesión iniciada y una solicitud suya decidida por el administrador con su nota.

| Caso | Solicitud | Efecto |
|------|-----------|--------|
| rechazada | rechazada por el administrador con su nota | la consulta informa el estado `REJECTED` y muestra la nota que registró el administrador |
| aprobada con menos cantidad de la pedida | solicitada con una cantidad y aprobada con una cantidad menor, con la nota del administrador | la consulta informa la cantidad solicitada y la cantidad aprobada, y muestra la nota que registró el administrador |

La nota es obligatoria justo en los dos casos en que el instructor necesita saber la razón, y una nota que solo ve el administrador no cumple su función. El caso de la aprobación idéntica al pedido queda fuera porque ahí la nota es opcional.

#### AC-SOL-09-3 — El instructor no ve las solicitudes de otros instructores

**Dado** un instructor A con sesión iniciada y una solicitud propia, y un instructor B con una solicitud propia.
**Cuando** A consulta sus solicitudes.
**Entonces**:

- la consulta devuelve la solicitud de A;
- la solicitud de B no aparece en el resultado;
- un intento de consultar directamente la solicitud de B no devuelve sus datos.

Las dos formas del mismo límite: una lista filtrada con un acceso directo abierto no protege nada.

#### AC-SOL-09-4 — El administrador consulta todas las solicitudes y filtra por estado

**Dado** un administrador con sesión iniciada y solicitudes de dos instructores distintos en `PENDING`, `APPROVED` y `REJECTED`.
**Cuando** el administrador consulta las solicitudes sin filtro.
**Entonces**:

- la consulta incluye las solicitudes de los dos instructores;
- cada una informa su estado;
- cuando filtra por estado `APPROVED`, el resultado contiene solo las solicitudes en estado `APPROVED`.

El administrador es el actor que decide, empaca y entrega: si viera solo una parte, la cola de pendientes dependería de la memoria. Que sin filtro no se oculte ninguna solicitud y con filtro no se cuele ninguna de otro estado son las dos mitades de la comprobación.

#### AC-SOL-09-5 — El instructor consulta los avisos que el sistema le dejó

**Dado** un instructor con sesión iniciada.

| Caso | Situación | Efecto |
|------|-----------|--------|
| avisos de sus solicitudes | una solicitud suya aprobada, otra rechazada con la nota del administrador, otra cancelada por vencimiento y otra cancelada manualmente por el administrador | los avisos incluyen la aprobación de la primera, el rechazo de la segunda con su motivo, el vencimiento de la tercera y la cancelación manual de la cuarta, distinta del vencimiento de la tercera |
| entrega registrada | una solicitud suya entregada por el administrador | no hay ningún aviso de entrega registrada |

La entrega no se avisa porque la registra el administrador con el instructor presente y no le comunica nada nuevo. La cancelación manual sí: sin su aviso, la solicitud aparecería cancelada sin que nadie le diga por qué.

#### AC-SOL-09-6 — La consulta de solicitudes es paginada y devuelve el total

**Dado** un instructor cuyas solicitudes registradas superan el tamaño de página.
**Cuando** consulta sus solicitudes pidiendo una página.
**Entonces**:

- la respuesta devuelve tantas solicitudes como el tamaño de página;
- la respuesta informa el total de solicitudes registradas;
- la página siguiente devuelve las siguientes sin repetir ninguna;
- ninguna solicitud aparece en dos páginas distintas.

El efecto es el que se exige, no el número: la respuesta es una página, informa el **total** para que el instructor sepa cuántas hay sin pedirlas todas, y las páginas no se repiten entre sí.

#### AC-SOL-09-7 — El aviso puede salir también por correo y por WhatsApp

**Dado** un instructor con una solicitud decidida por el administrador y la configuración de canales externos.

| Caso | Configuración | Efecto |
|------|---------------|--------|
| los dos canales configurados | correo electrónico y WhatsApp configurados, sobre una solicitud aprobada que el sistema registra | el aviso queda disponible dentro del sistema, se envía por correo electrónico y se envía por WhatsApp; el envío externo es opcional y no es condición para que el aviso exista |
| un solo canal configurado | correo electrónico configurado y WhatsApp sin configurar, sobre una solicitud aprobada | el aviso queda disponible dentro del sistema, se envía por correo electrónico y no se envía por WhatsApp; la falta de ese canal no impide el aviso interno |
| ningún canal configurado | sin correo electrónico ni WhatsApp, sobre una solicitud rechazada con la nota del administrador | el aviso de rechazo con su motivo está disponible dentro del sistema |

La regla dice **«puede»** y **«según se configure»**: el aviso interno es el único obligatorio y los canales externos son opcionales. Lo que se exige es que su ausencia **no** tumbe el aviso interno. Cómo se observa el envío externo en el test es decisión de la prueba; el proveedor, las credenciales y la garantía de entrega no los fija ninguna regla.

## Errores y mensajes

| Situación | HTTP | Código | Mensaje |
|-----------|------|--------|---------|
| Crear una solicitud sin stock suficiente para el rango | `409` | `INSUFFICIENT_STOCK` | `"Disponible: 2, solicitado: 3"`; sin solicitud creada y sin reserva |
| Crear una solicitud cuando una unidad está prestada y no devuelta | `409` | `INSUFFICIENT_STOCK` | `"Disponible: 1, solicitado: 2"`; sin solicitud creada y sin reserva |
| Modificar una solicitud pidiendo más de lo disponible en el rango | `409` | `INSUFFICIENT_STOCK` | No lo fija ninguna regla; la solicitud conserva cantidad, fechas y reserva |
| Aprobar más de lo disponible en el almacén para el rango | `409` | `INSUFFICIENT_STOCK` | No lo fija ninguna regla; la solicitud sigue en `PENDING` y su reserva no cambia |
| Aprobar una cantidad mayor a la solicitada | `400` | No lo fija ninguna regla | No lo fija ninguna regla; sin cantidad aprobada y sin cambio de reserva |
| Aprobar reduciendo la cantidad sin nota | `400` | No lo fija ninguna regla | La respuesta indica que la **nota es obligatoria cuando se reduce la cantidad** |
| Aprobar con un total aprobado menor que el total solicitado y sin nota | `400` | No lo fija ninguna regla | La respuesta indica que la **nota es obligatoria cuando el total aprobado es menor que el total solicitado** |
| Rechazar sin motivo | `400` | No lo fija ninguna regla | La respuesta indica que el **motivo es obligatorio** |
| Crear una solicitud con el mismo elemento en dos líneas | `400` | No lo fija ninguna regla | No lo fija ninguna regla; sin solicitud, sin reserva y sin cambio en el número de solicitudes |
| Crear una solicitud con una cantidad decimal de un consumible | `400` | No lo fija ninguna regla | No lo fija ninguna regla; sin solicitud y sin cambio de stock |
| Crear una solicitud con fecha de retiro anterior a hoy | `400` | No lo fija ninguna regla | No lo fija ninguna regla; sin solicitud y sin reserva |
| Crear una solicitud con la fecha estimada de devolución anterior a la de retiro | `400` | No lo fija ninguna regla | No lo fija ninguna regla; sin solicitud y sin reserva |
| Empacar con un componente obligatorio ausente o con stock insuficiente en el rango | No lo fija ninguna regla | No lo fija ninguna regla | No lo fija ninguna regla; la solicitud sigue en `APPROVED` y sin unidades asignadas |
| Entregar una solicitud que no está en `PACKED` ni en `PARTIALLY_DELIVERED`, o repetir la entrega | No lo fija ninguna regla | No lo fija ninguna regla | No lo fija ninguna regla; sin unidades entregadas y la fecha de entrega no cambia |
| Cancelar como instructor fuera de `PENDING` | `403` | No lo fija ninguna regla (el epic 01 usa `FORBIDDEN`) | No lo fija ninguna regla; la solicitud y sus asignaciones no cambian |
| Cancelar una solicitud con entrega registrada | No lo fija ninguna regla | No lo fija ninguna regla | No lo fija ninguna regla; la solicitud y el tenedor no cambian |
| Crear una solicitud con sesión de administrador | `403` | No lo fija ninguna regla (el epic 01 usa `FORBIDDEN`) | No lo fija ninguna regla; sin solicitud y sin reserva |
| Aprobar o rechazar con sesión de instructor | `403` | No lo fija ninguna regla (el epic 01 usa `FORBIDDEN`) | No lo fija ninguna regla; la solicitud sigue en `PENDING` y su reserva no cambia |
| Consultar la solicitud de otro instructor | No lo fija ninguna regla | No lo fija ninguna regla | No lo fija ninguna regla; no devuelve los datos de la solicitud ajena |
| Petición sin credencial | `401` | No lo fija ninguna regla (epic 01, `AC-AUTH-05-2`) | No lo fija ninguna regla; sin datos |

Las únicas exigencias de texto son las de AC-SOL-01-2 y AC-SOL-01-7 —el par «disponible, solicitado» con sus cifras— y las de AC-SOL-02-4 y AC-SOL-03-3 —que la respuesta indique que la nota o el motivo son obligatorios—. Ninguna regla fija el texto literal de los demás rechazos: lo exigido es el estado y la ausencia de efectos.

## Sesión y seguridad

| Efecto | Regla | Dónde se verifica |
|--------|-------|-------------------|
| Crear una solicitud exige sesión de instructor: el administrador no crea y recibe `403` sin efectos | `RN-CTX-06`, `RN-CTX-05` | AC-SOL-01-5 |
| Aprobar, rechazar, empacar, entregar y cancelar como administrador son escrituras administrativas; con sesión de instructor responden `403` | `RN-CTX-05` | AC-SOL-02-5 |
| Modificar y cancelar como instructor solo valen en `PENDING`; en cualquier otro estado responden `403` sin tocar la solicitud ni sus asignaciones | `RN-SOL-05` | AC-SOL-07-1 |
| El instructor consulta **solo sus** solicitudes y no accede a las de otro instructor | `RN-PRE-17` | AC-SOL-09-3 |
| Desactivar una cuenta impide iniciar sesión y no cancela, oculta ni cierra las solicitudes en curso | `RN-USR-05` | AC-SOL-09-1 |
| La cancelación manual y el vencimiento conservan el registro de qué unidades estuvieron asignadas | `RN-PRE-02` | AC-SOL-07-4, AC-SOL-08-1 |
| La entrega registra el tenedor y la fecha de cada unidad, y una entrega repetida no reescribe la fecha | `RN-PRE-02` | AC-SOL-06-2, AC-SOL-06-3 |
| Una petición sin credencial no es una petición de ningún actor: recibe `401` | Epic 01 (`AC-AUTH-05-2`) | — |
| No hay un tercer rol que decida ni escriba: el administrador **es** un instructor | `RN-CTX-05` | AC-SOL-01-5, AC-SOL-02-5 |

Ninguna regla de este epic fija plazos de sesión ni efectos de la solicitud sobre las credenciales: aprobar, empacar o cancelar no cierran sesiones. El contrato de sesión es del epic 01.

## Decisiones tomadas

| Decisión | Regla |
|----------|-------|
| La solicitud se crea con **dos fechas** y la reserva ocupa el rango completo, descontado **al crear**; no hay reserva sin rango | `RN-NEG-04`, `RN-NEG-03` |
| Los rangos que no comparten días conviven y los que se solapan compiten solo por la misma unidad | `RN-NEG-01`, `RN-NEG-02` |
| Un préstamo bloquea **todas** las fechas; una reserva ocupa solo su rango y se cancela sola si no se retira | `RN-NEG-05`, `RN-SOL-07` |
| La aprobación se mueve **solo hacia abajo**, y la cantidad se compara **total contra total** | `RN-SOL-03` |
| Los techos del **pedido** y del **stock** se aplican juntos y manda el más chico | `RN-SOL-03`, `RN-SOL-09` |
| La nota es obligatoria al rechazar y al aprobar un total menor, y opcional cuando los totales coinciden; queda registrada y el instructor la lee | `RN-SOL-04` |
| El rechazo deja motivo, actor y fecha, y **libera la reserva** del rango | `RN-NEG-03`, `RN-SOL-04` |
| Solo `PENDING` se modifica, y la reserva sigue a la nueva cantidad y al nuevo rango | `RN-SOL-05`, `RN-NEG-03` |
| Empacar asigna los seriales, verifica los componentes, **no** descuenta consumibles y **avisa** que el pedido está listo para retirar | `RN-SOL-02`, `RN-NOT-01`, `RN-INV-11`, `RN-INV-02`, `RN-INV-24`, `RN-INV-37` |
| La entrega registra el tenedor y la fecha de cada unidad, y descuenta del stock los consumibles entregados | `RN-PRE-02`, `RN-INV-11` |
| Una entrega parcial mantiene la solicitud abierta, conserva lo pendiente comprometido y no la cierra | `RN-SOL-11` |
| El instructor cancela solo en `PENDING`; el administrador cancela antes de que se registre la entrega; ninguna cancelación borra la traza de seriales | `RN-SOL-05`, `RN-SOL-06`, `RN-SOL-08`, `RN-PRE-02` |
| El vencimiento ocurre a las 23:59 del segundo día desde la fecha de retiro en `America/Bogota`, libera la reserva y registra su causa | `RN-SOL-07`, `RN-SOL-10`, `RN-NEG-03` |
| El aviso interno es obligatorio y los canales externos son opcionales: su ausencia no tumba el aviso interno | `RN-NOT-01`, `RN-NOT-02` |
| La solicitud se completa cuando no queda nada afuera, y un consumible entregado no vuelve ni lleva condición de retorno | `RN-SOL-12`, `RN-INV-06`, `RN-PRE-10` |
| El instructor no elige seriales: los asigna el administrador al empacar | `RN-CAT-01` |

Sin decisión todavía: la reserva excedente cuando se aprueba menos de lo solicitado y si se libera; si la aprobación puede subir una línea compensándola con otra, porque los criterios comparan totales y no especifican compensaciones; el rango vacío —retiro y devolución el mismo día— y la fecha estimada de devolución ausente; cómo se registra la verificación física del empaque y qué ocurre si un elemento no funciona; el motivo de la cancelación; si el instructor puede modificar una solicitud de otro instructor; qué unidades concretas reserva la creación y si son las mismas que el empaque asigna; aprobar o rechazar fuera de `PENDING`; una entrega registrada después del vencimiento; marcar un aviso como leído, archivarlo o borrarlo; el proveedor, las credenciales y la garantía de entrega de los canales externos; la búsqueda, el orden, el tamaño de página y el formato del listado. Ninguna regla los fija y ningún criterio los exige.

## Trazabilidad y estado

Un criterio se marca `OK` o `GAP` **solo** cuando su test corre, nunca por lectura del código. Este epic está **en ejecución parcial**: 11 de los **49** criterios corren con test y están en `OK` (US-SOL-01, rama `devJoseph-solicitudes`); el resto sigue sin ejecutar.

| Criterio | Regla | Estado hoy |
|----------|-------|------------|
| `AC-SOL-01-1` | `RN-NEG-03`, `RN-NEG-04` | `OK` |
| `AC-SOL-01-2` | `Estándar` | `OK` |
| `AC-SOL-01-3` | `RN-NEG-01` | `OK` |
| `AC-SOL-01-4` | `RN-NEG-02` | `OK` |
| `AC-SOL-01-5` | `RN-CTX-06` | `OK` |
| `AC-SOL-01-6` | `Estándar` | `OK` |
| `AC-SOL-01-7` | `RN-NEG-05` | `OK` |
| `AC-SOL-01-8` | `RN-INV-18` | `OK` |
| `AC-SOL-01-9` | `Estándar` | `OK` |
| `AC-SOL-01-10` | `Estándar` | `OK` |
| `AC-SOL-01-11` | `Estándar` | `OK` |
| `AC-SOL-02-1` | Ciclo de vida | Sin ejecutar |
| `AC-SOL-02-2` | `RN-SOL-03`, `RN-SOL-04` | Sin ejecutar |
| `AC-SOL-02-3` | `RN-SOL-03` | Sin ejecutar |
| `AC-SOL-02-4` | `RN-SOL-04` | Sin ejecutar |
| `AC-SOL-02-5` | `RN-CTX-05` | Sin ejecutar |
| `AC-SOL-02-6` | `RN-SOL-09` | Sin ejecutar |
| `AC-SOL-03-1` | `RN-SOL-04` | Sin ejecutar |
| `AC-SOL-03-2` | `RN-NEG-03` | Sin ejecutar |
| `AC-SOL-03-3` | `RN-SOL-04` | Sin ejecutar |
| `AC-SOL-04-1` | `RN-SOL-05` | Sin ejecutar |
| `AC-SOL-04-2` | `Estándar` | Sin ejecutar |
| `AC-SOL-05-1` | `RN-SOL-02` | Sin ejecutar |
| `AC-SOL-05-2` | `RN-INV-02`, `RN-INV-24` | Sin ejecutar |
| `AC-SOL-05-3` | `RN-INV-24` | Sin ejecutar |
| `AC-SOL-05-4` | `Estándar` | Sin ejecutar |
| `AC-SOL-05-5` | `RN-INV-11` | Sin ejecutar |
| `AC-SOL-05-6` | `RN-SOL-02`, `RN-NOT-01` | Sin ejecutar |
| `AC-SOL-06-1` | Ciclo de vida | Sin ejecutar |
| `AC-SOL-06-2` | Ciclo de vida, `Estándar` | Sin ejecutar |
| `AC-SOL-06-3` | `RN-PRE-02` | Sin ejecutar |
| `AC-SOL-06-4` | `RN-INV-11` | Sin ejecutar |
| `AC-SOL-06-5` | `RN-SOL-11` | Sin ejecutar |
| `AC-SOL-06-6` | `RN-SOL-11` | Sin ejecutar |
| `AC-SOL-07-1` | `RN-SOL-05` | Sin ejecutar |
| `AC-SOL-07-2` | `RN-SOL-06`, `RN-SOL-08` | Sin ejecutar |
| `AC-SOL-07-3` | `RN-NEG-03` | Sin ejecutar |
| `AC-SOL-07-4` | `RN-PRE-02` | Sin ejecutar |
| `AC-SOL-07-5` | `RN-SOL-08` | Sin ejecutar |
| `AC-SOL-08-1` | `RN-SOL-07`, `RN-PRE-02` | Sin ejecutar |
| `AC-SOL-08-2` | `RN-NEG-03` | Sin ejecutar |
| `AC-SOL-08-3` | `RN-SOL-10` | Sin ejecutar |
| `AC-SOL-09-1` | `RN-USR-05` | Sin ejecutar |
| `AC-SOL-09-2` | `RN-SOL-04` | Sin ejecutar |
| `AC-SOL-09-3` | `RN-PRE-17` | Sin ejecutar |
| `AC-SOL-09-4` | `Estándar` | Sin ejecutar |
| `AC-SOL-09-5` | `RN-NOT-01` | Sin ejecutar |
| `AC-SOL-09-6` | `RN-CTX-02` | Sin ejecutar |
| `AC-SOL-09-7` | `RN-NOT-02` | Sin ejecutar |

| US | ACs | Regla de negocio | Ciclo de vida | `Estándar` |
|----|-----|------------------|---------------|------------|
| `US-SOL-01` | 11 | 6 | 0 | 5 |
| `US-SOL-02` | 6 | 5 | 1 | 0 |
| `US-SOL-03` | 3 | 3 | 0 | 0 |
| `US-SOL-04` | 2 | 1 | 0 | 1 |
| `US-SOL-05` | 6 | 5 | 0 | 1 |
| `US-SOL-06` | 6 | 4 | 2 | 0 |
| `US-SOL-07` | 5 | 5 | 0 | 0 |
| `US-SOL-08` | 3 | 3 | 0 | 0 |
| `US-SOL-09` | 7 | 6 | 0 | 1 |
| **Total** | **49** | **38** | **3** | **8** |

**Ejecución:** 11 de 49 criterios en `OK` (US-SOL-01). **38** criterios se apoyan en una regla de negocio confirmada, **8** declaran un invariante técnico y
**3** declaran el ciclo de vida. `AC-SOL-06-2` declara las dos últimas —la entrega es idempotente y su
transición es del ciclo—, así que las tres columnas **no son excluyentes**: el total de la tabla cuenta
criterios, no declaraciones.

## Anexo — Datos de prueba

Los valores de esta tabla son **ejemplos**: no son requisitos y QA elige los suyos. Los criterios fijan la clase de actor, la de estado y los límites de la regla; estos datos solo registran con qué se ejecutan las pruebas del módulo.

| Dato | Valor usado |
|------|-------------|
| Administrador del seed | `admin@sena.edu.co` / `AdminSENA2024` |
| Instructor autor de las solicitudes | `cmendoza@sena.edu.co` / `Instructor2024` |
| Segundo instructor, control de AC-SOL-09-3 y AC-SOL-09-4 | `mgomez@misena.edu.co` / `Instructor2024` |
| Instructor desactivado de AC-SOL-09-1 | una cuenta del seed desactivada con la operación de `US-USR-03` (epic 02) |
| Elemento serializado con tres unidades operativas | «Multímetro digital» |
| Elemento serializado con dos unidades operativas | «Cargador de portátil» |
| Rango de la reserva de prueba | retiro el 10 de marzo y devolución estimada el 13 de marzo |
| Rango que comparte días con la reserva de prueba | 12 al 15 de marzo |
| Rango sin ningún día en común | 20 al 22 de marzo |
| Rango sin compromisos previos y con una unidad prestada | 20 al 22 de abril |
| Solicitudes de prueba de una línea | cantidades 1, 2 y 3 |
| Solicitud de prueba de dos líneas | 3 del primer elemento y 2 del segundo, con total 5 |
| Solicitud aprobada con cantidad reducida | solicitada 10, aprobada 6 |
| Consumible con unidad de medida y stock | «cable», con stock 10 y 2 unidades pedidas |
| Cantidad decimal de consumible | 1,5 |
| Compuesto con componentes marcados | un compuesto con un componente obligatorio y otro opcional |
| Compuesto incompleto por un obligatorio | el compuesto anterior con la unidad de su componente obligatorio prestada por separado |
| Motivo de rechazo de prueba | «equipo en mantenimiento» |
| Nota del administrador de prueba | una nota que explica la reducción de cantidad |
| Fecha de retiro de una solicitud pendiente que no se retiró | ayer, dentro de la ventana de 2 días |
| Corte del vencimiento | 00:00, 23:58 y 23:59 del segundo día contado desde la fecha de retiro, en `America/Bogota` |
| Consulta paginada | 25 solicitudes del mismo instructor con páginas de 10 |
| Canales externos | correo electrónico y WhatsApp configurados en el entorno de prueba, y el mismo escenario con uno solo y con ninguno |

Los usuarios salen del seed del proyecto (`AGENTS.md` §4). Los elementos, las unidades, su estado físico, la composición de los compuestos y la ubicación son datos de los epics 04 y 05; los préstamos y las devoluciones, del epic 07: acá se leen, no se crean.
