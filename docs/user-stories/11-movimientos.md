# Epic 11 — Historial de movimientos

El registro único de eventos del inventario y su consulta: cada alta, ensamblaje, desensamblaje, reserva, entrega, devolución, baja y ajuste de cantidad deja un movimiento, y el administrador lo lee filtrado por unidad, elemento, tipo y rango de fechas, paginado y con su total.

## Resumen

Este módulo resuelve el **historial de movimientos**: registrar un movimiento por cada evento que cambia el inventario y dejar que el administrador lo consulte con filtros, de forma paginada y con su total.

El historial es **transversal y lo escribe el sistema** (`RN-MOV-01`). Los eventos que lo alimentan los producen los epics 04 a 07: el alta, el ensamblaje, el desensamblaje y las bajas en el epic 05; la reserva y la entrega en el epic 06; la devolución y la pérdida en el epic 07. Este epic no especifica esas operaciones: especifica **el movimiento que dejan** y **la consulta del historial**.

Si el módulo falla, el registro se acumula y nadie puede leerlo: no se puede reconstruir qué le pasó a una unidad, qué pasó con un elemento, quién lo hizo ni cuándo, y el administrador vuelve a depender de su memoria para auditar el almacén.

Estado hoy: **2 historias y 11 criterios especificados y sin ejecutar**; ningún criterio es `OK` ni `GAP`, porque todavía no hay test que los corra.

> **Frontera con los epics 05, 06 y 07.** El alta de una unidad es `US-INV-01`, el ensamblaje `US-INV-02`, el desensamblaje `US-INV-03` y las bajas `US-INV-08` y `US-INV-09`; la reserva al crear la solicitud es `US-SOL-01` y la entrega `US-SOL-06`; la devolución y la pérdida son `US-PRE-02` y `US-PRE-05`. Este epic especifica **el movimiento que esas operaciones dejan** y **la consulta del historial**: ningún criterio de esos epics se repite acá.

## Alcance

**Incluye**

- Registro de un movimiento por cada uno de los ocho eventos de `RN-MOV-01`, con su tipo, el sujeto afectado —la unidad o el elemento—, el actor, la fecha y la solicitud asociada cuando corresponda (`RN-MOV-01`).
- La cuenta por unidad: una reserva de dos unidades deja dos movimientos, y entregar dos unidades deja dos movimientos de entrega (`RN-MOV-01`, `RN-SOL-11`).
- La pérdida como **motivo de una baja**, con el motivo y el actor que exige `RN-INV-17` y con el efecto de `RN-PRE-15`: la unidad sale del inventario activo y no bloquea disponibilidad (`RN-INV-13`).
- La entrega de un consumible con el elemento como sujeto, y ningún movimiento de reserva para él (`RN-INV-11`).
- El ajuste de cantidad de un consumible, que deja movimiento cuando cambia la cantidad y ninguno cuando la deja igual (`RN-MOV-01`).
- Consulta del historial por el administrador, con filtros por **unidad**, **elemento**, **tipo de movimiento** y **rango de fechas** cerrado en días de calendario (`RN-MOV-02`).
- Paginación con total, con un orden estable que reparta las páginas sin repetir ni dejar fuera un movimiento (`RN-CTX-02`).
- Rechazo del instructor en la consulta, sin entregarle ningún movimiento (`RN-MOV-02`).

**No incluye**

| Tema | Dónde se especifica |
|------|---------------------|
| Las operaciones que producen cada evento: alta (`US-INV-01`), ensamblaje (`US-INV-02`), desensamblaje (`US-INV-03`), bajas (`US-INV-08`, `US-INV-09`), reserva al crear la solicitud (`US-SOL-01`), entrega (`US-SOL-06`), devolución (`US-PRE-02`) y declaración de pérdida (`US-PRE-05`) | Epics 05, 06 y 07; acá solo se exige el movimiento que dejan |
| Un tipo de movimiento llamado «pérdida» | `RN-PRE-15` fija la pérdida como **motivo de la baja**: el movimiento es de tipo baja con `motivo = pérdida` |
| La reserva de un consumible por fechas | No existe (`RN-INV-11`): el consumible deja movimiento de **entrega** y ninguno de reserva |
| La operación de ajuste de cantidad de un consumible | Ningún epic la especifica como operación propia; acá solo se verifica el **movimiento** que deja cuando la cantidad cambia |
| El vocabulario y la representación interna de cada tipo de evento | `RN-MOV-01` los enumera; el nombre interno del tipo es decisión de implementación |
| Un movimiento por intento fallido o por operación rechazada | Ninguna regla lo pide: el historial registra eventos del inventario, y una operación rechazada no cambia el inventario |
| Movimientos creados, corregidos o borrados a mano, y anulación de un movimiento | `RN-MOV-01` dice «el sistema registra»; no hay actor que escriba el historial ni regla que lo enmiende |
| Combinaciones de filtros y filtros adicionales (por actor, por solicitud, por ambiente) | `RN-MOV-02` enumera cuatro filtros y no fija combinaciones; la ubicación de la unidad es `US-INV-11` del epic 05 |
| La clave de orden y la exportación del historial | Ninguna regla las fija. La **estabilidad** del orden sí es exigible: sin un orden total y determinista el reparto en páginas de `AC-MOV-02-4` no se puede verificar |
| Totales, gráficas y resúmenes del historial | `RN-MOV-02` pide la consulta con filtros, no agregaciones |
| Una vista del historial para el instructor, completa o de sus propias solicitudes | `RN-MOV-02` fija el historial como consulta del administrador y no define ninguna vista parcial |

## Actores y permisos

| Actor | Puede | No puede |
|-------|-------|----------|
| **Sistema** (no es una persona) | Registrar el movimiento de cada evento del inventario con su tipo, su sujeto, su actor, su fecha y su solicitud asociada cuando corresponda (`RN-MOV-01`) | Consultar, decidir ni omitir un evento: el registro es efecto de una operación que ya tiene su propio actor |
| **Administrador** (instructor encargado del almacén) | Consultar el historial con los cuatro filtros y su paginación; sus operaciones de almacén —altas, ensamblajes, bajas, entregas y devoluciones— dejan movimiento | Crear, corregir o borrar un movimiento a mano; ver el historial sin sesión |
| **Instructor** (quien dicta la clase) | Crear sus solicitudes, lo que deja el movimiento de reserva | Consultar el historial de movimientos: responde `403` sin entregar ningún movimiento (`RN-MOV-02`, `AC-MOV-02-3`) |

Una petición sin credencial no es un actor: no tiene identidad y recibe `401` (epic 01, `AC-AUTH-05-2`). `RN-CTX-05` fija dos actores y ninguno más: el administrador revisa, aprueba, entrega, recibe y audita; el instructor solicita, recoge y devuelve. El historial completo del almacén es una vista administrativa.

## Reglas de negocio

| ID | Regla | Ejemplo |
|----|-------|---------|
| `RN-MOV-01` | El **sistema registra** un historial de movimientos con **tipo, unidad o elemento afectado, actor, fecha y solicitud asociada cuando corresponda**, alimentado por el alta, el ensamblaje, el desensamblaje, la reserva, la entrega, la devolución, la baja y el ajuste de cantidad | Entregar una unidad deja un movimiento de entrega con esa unidad, el administrador que entregó, la fecha y la solicitud |
| `RN-MOV-02` | El historial es **consultable por el administrador**, con filtros por **unidad, elemento, tipo de movimiento y rango de fechas** | Filtrar por una unidad devuelve solo los movimientos de esa unidad, y filtrar por el tipo baja devuelve solo las bajas |
| `RN-INV-17` | Toda **baja de una unidad exige motivo y actor**, queda registrada y no se puede deshacer | Dar de baja una unidad sin declarar el motivo se rechaza y no deja movimiento |
| `RN-INV-13` | **Ninguna unidad se pierde sin quedar registrada**: la pérdida se declara y queda distinguible de una unidad simplemente no devuelta (`RN-PRE-16`) | Una unidad perdida tiene su baja con el motivo pérdida; una unidad que solo no volvió no la tiene |
| `RN-PRE-15` | Cuando una unidad prestada se pierde, el administrador declara la pérdida y esta se registra como el **motivo de la baja**; la unidad **sale del inventario activo** y **no bloquea** disponibilidad aunque su trámite siga abierto | Declarar perdida una unidad entregada deja un movimiento de **baja** con `motivo = pérdida`, y la unidad deja de contarse como disponible |
| `RN-INV-11` | Un consumible **no se reserva por fecha**: su stock se descuenta **al registrar la entrega**, no al crear ni al empacar | Crear y empacar una solicitud de un consumible no deja movimiento de reserva; la entrega deja uno de entrega y baja el stock |
| `RN-SOL-11` | **Entrega parcial**: una solicitud en `PARTIALLY_DELIVERED` **ya tiene unidades afuera** y sigue viva por lo que falta entregar | Entregar dos de tres unidades deja dos movimientos de entrega y ninguno por la que no salió |
| `RN-CTX-02` | Todo **listado** de la aplicación es **paginado y devuelve su total**, incluido el historial de movimientos | La consulta devuelve una página acotada, informa el total de movimientos y las páginas no se repiten entre sí |

`RN-MOV-01` y `RN-MOV-02` viven en §5.10 de [`00-contexto-negocio.md`](00-contexto-negocio.md); `RN-CTX-02` en §1, `RN-INV-11`, `RN-INV-13` y `RN-INV-17` en §5.2, `RN-SOL-11` en §5.3 y `RN-PRE-15` en §5.4. Acá se leen y se citan: ningún criterio agrega condiciones que la regla no diga.

`RN-MOV-01` **no** fija el nombre interno de cada tipo de evento ni la forma de guardarlo, y `RN-MOV-02` **no** fija la forma de la respuesta ni la clave de orden de la consulta. La **paginación con su total** la fija `RN-CTX-02`, que aplica a todo listado y por lo tanto también al historial.

## Eventos registrados

La lista de eventos es **cerrada**: son los ocho de `RN-MOV-01` y ninguno más. Cada uno deja **un movimiento por sujeto afectado** —por unidad cuando el evento mueve unidades, por elemento cuando corrige una cantidad— y ningún evento deja dos movimientos por el mismo sujeto.

| Tipo de evento | Qué registra el movimiento | Sujeto | Lo produce |
|----------------|---------------------------|--------|------------|
| **Alta** | la unidad que entra al inventario, con su actor y su fecha | la unidad | Epic 05, `US-INV-01` |
| **Ensamblaje** | la unidad que se arma y el compuesto del que pasa a formar parte | la unidad y el compuesto | Epic 05, `US-INV-02` |
| **Desensamblaje** | la unidad que se desarma y los componentes que libera | la unidad y sus componentes | Epic 05, `US-INV-03` |
| **Reserva** | la unidad comprometida y la solicitud que la compromete | la unidad y el elemento | Epic 06, `US-SOL-01` |
| **Entrega** | la unidad serializada que sale, o la cantidad de consumible que se descuenta del stock, con la solicitud asociada | la unidad o el elemento | Epic 06, `US-SOL-06` |
| **Devolución** | la unidad serializada que vuelve, con la solicitud asociada | la unidad | Epic 07, `US-PRE-02` |
| **Baja** | la unidad que sale del inventario, con su **motivo** y su actor | la unidad | Epic 05 (`US-INV-08`, `US-INV-09`) y epic 07 (`US-PRE-05`) |
| **Ajuste de cantidad** | la corrección del stock de un consumible, que no mueve ninguna unidad física | el elemento | Ningún epic: la operación no está especificada |

Lo que cada movimiento registra siempre, además del tipo y el sujeto, es el **actor** que produjo el evento y la **fecha** en que ocurrió; la **solicitud asociada** aparece cuando el evento pertenece a un pedido —reserva, entrega, devolución y la baja de una unidad prestada—.

**La pérdida no es un tipo de la lista.** `RN-PRE-15` fija que la pérdida es el **motivo** de la **baja** de esa unidad, con motivo y actor (`RN-INV-17`), así que una unidad perdida deja un movimiento de tipo **baja** con `motivo = pérdida`. Un tipo propio sería un segundo vocabulario para el mismo hecho y volvería ambiguo el filtro por tipo de `RN-MOV-02`. El motivo es además lo que mantiene distinguible una unidad perdida de una que solo no volvió (`RN-INV-13`).

**La reserva es de unidades serializadas.** Un consumible no se reserva por fecha: su stock baja al registrar la entrega (`RN-INV-11`), de modo que crear o empacar una solicitud de un consumible **no deja movimiento de reserva** y su salida deja un movimiento de **entrega** con el elemento como sujeto. El **ajuste de cantidad** es el otro evento sin unidad: corrige el stock y solo deja movimiento cuando la cantidad cambia.

## Historias de usuario

Los criterios nombran la **clase** de actor y de estado —«un administrador con sesión iniciada», «una unidad serializada», «un elemento con dos unidades disponibles», «un rango de fechas»—. Los valores concretos con los que se ejecutan los escenarios están en el `Anexo — Datos de prueba`, al final del documento, y son ejemplos, no requisitos.

### US-MOV-01 — Registrar los movimientos del inventario

**Como** sistema **quiero** registrar un movimiento por cada evento que cambia el inventario, con su tipo, el sujeto afectado, el actor y la fecha **para** que el administrador pueda reconstruir después qué pasó con una unidad o un elemento.

**Prioridad:** alta — `RN-MOV-01`: un evento sin movimiento es información que se perdió para siempre.
**Estado:** especificada — no ejecutada.

El movimiento no se crea a mano: es el efecto de una operación de otro epic que ya tiene su propio actor. Lo que se exige acá es que esa operación **deje el movimiento**, con sus datos y con la cuenta correcta: exactamente uno por sujeto afectado, ni cero —el evento se perdería— ni dos —la auditoría contaría el mismo hecho dos veces—.

#### AC-MOV-01-1 — El alta de una unidad deja un movimiento con su actor y su fecha

**Dado** un catálogo con una categoría y un elemento serializable, un historial de movimientos con un número conocido de movimientos y un administrador con sesión iniciada.
**Cuando** el administrador registra una unidad serializada de ese elemento.
**Entonces**:

- el historial incorpora **exactamente un** movimiento;
- el tipo de ese movimiento corresponde al alta;
- el movimiento identifica la unidad registrada;
- el movimiento registra como actor al administrador que hizo el alta;
- el movimiento registra la fecha del alta.

`Origen: RN-MOV-01`

`RN-MOV-01` incluye el **alta** entre los eventos que dejan movimiento y fija los campos que este debe llevar; el criterio exige los cuatro datos en su forma observable y la fecha del alta que produjo el movimiento, no una fecha cualquiera. Qué operación concreta es el alta y cómo se identifica la unidad por dentro pertenecen al epic 05.

#### AC-MOV-01-2 — El ensamblaje y el desensamblaje dejan un movimiento cada uno

**Dado** un elemento compuesto con su composición definida y las unidades de sus componentes, un historial de movimientos con un número conocido de movimientos y un administrador con sesión iniciada.
**Cuando** el administrador ensambla una unidad de ese compuesto.
**Entonces**:

- el historial incorpora **exactamente un** movimiento;
- el tipo de ese movimiento corresponde al ensamblaje;
- el movimiento identifica la unidad ensamblada y el compuesto;
- el movimiento registra como actor al administrador que ensambló;
- el movimiento registra la fecha del ensamblaje.

**Y cuando** el administrador desensambla esa unidad.
**Entonces**:

- el historial incorpora **exactamente un** movimiento;
- el tipo de ese movimiento corresponde al desensamblaje;
- el movimiento identifica la unidad desensamblada y los componentes liberados;
- el movimiento registra como actor al administrador que desensambló;
- el movimiento registra la fecha del desensamblaje.

`Origen: RN-MOV-01`

`RN-MOV-01` enumera **ensamblaje** y **desensamblaje** como eventos separados y los criterios los exigen por separado porque son hechos distintos: uno arma un compuesto y el otro lo desarma. Un movimiento genérico de «cambio de composición» no permitiría saber en qué dirección ocurrió. Las operaciones son `US-INV-02` y `US-INV-03` del epic 05.

#### AC-MOV-01-3 — La entrega y la devolución dejan un movimiento cada uno, con la solicitud asociada

**Dado** una solicitud aprobada y empacada con una unidad reservada, un historial de movimientos con un número conocido de movimientos y un administrador con sesión iniciada.
**Cuando** el administrador entrega la unidad de esa solicitud.
**Entonces**:

- el historial incorpora **exactamente un** movimiento;
- el tipo de ese movimiento corresponde a la entrega;
- el movimiento identifica la unidad entregada;
- el movimiento registra como actor al administrador que entregó;
- el movimiento registra la fecha de la entrega;
- el movimiento registra la solicitud asociada.

**Y cuando** el administrador registra la devolución de esa unidad.
**Entonces**:

- el historial incorpora **exactamente un** movimiento;
- el tipo de ese movimiento corresponde a la devolución;
- el movimiento identifica la unidad devuelta;
- el movimiento registra como actor al administrador que recibió;
- el movimiento registra la fecha de la devolución;
- el movimiento registra la solicitud asociada.

**Y cuando** el administrador entrega solo parte de lo aprobado de una solicitud con tres unidades reservadas, entregando dos de ellas.
**Entonces** cada sujeto se comporta así:

| Sujeto | Efecto en el historial |
|--------|------------------------|
| Cada una de las dos unidades entregadas | un movimiento de entrega con su unidad y la solicitud asociada |
| La unidad que no salió | ningún movimiento de entrega |
| Total | exactamente dos movimientos de entrega |

`Origen: RN-MOV-01, RN-SOL-11`

Una entrega y una devolución siempre corresponden a una solicitud —son la salida y el regreso de un pedido—, así que el criterio exige la solicitud asociada en los dos movimientos: sin ese dato el historial diría que una unidad salió y volvió, pero no para qué pedido. La **entrega parcial** no inventa un movimiento nuevo: `RN-SOL-11` deja la solicitud en `PARTIALLY_DELIVERED` con unidades ya afuera y el movimiento se cuenta **por unidad entregada**, que es el sujeto que `RN-MOV-01` le asigna; el estado de la solicitud no es el sujeto del movimiento y no cambia la cuenta. La entrega es `US-SOL-06` del epic 06 y la devolución `US-PRE-02` del epic 07.

#### AC-MOV-01-4 — La baja y la pérdida dejan un movimiento de baja con su motivo

**Dado** una unidad del inventario, un motivo de baja declarado, un historial de movimientos con un número conocido de movimientos y un administrador con sesión iniciada.
**Cuando** el administrador da de baja esa unidad indicando el motivo.
**Entonces**:

- el historial incorpora **exactamente un** movimiento;
- el tipo de ese movimiento corresponde a la baja;
- el movimiento identifica la unidad dada de baja;
- el movimiento registra como actor al administrador que la dio de baja;
- el movimiento registra la fecha de la baja;
- el movimiento registra el motivo declarado.

**Y cuando** el administrador declara la pérdida de una unidad entregada en el marco de una solicitud, indicando el motivo pérdida.
**Entonces**:

- el historial incorpora **exactamente un** movimiento;
- el tipo de ese movimiento corresponde a la baja;
- el movimiento registra la pérdida como motivo;
- el movimiento identifica la unidad;
- el movimiento registra como actor al administrador que la declaró;
- el movimiento registra la fecha de la declaración;
- el movimiento registra la solicitud asociada;
- la unidad sale del inventario activo y no vuelve a contarse como disponible.

`Origen: RN-INV-17, RN-PRE-15, RN-INV-13`

El **motivo** no lo enuncia `RN-MOV-01`: lo exigen las reglas que fijan la operación que produce el evento —`RN-INV-17` en toda baja, `RN-PRE-15` en la pérdida de una unidad prestada y `RN-INV-13` para que ninguna unidad se pierda sin quedar registrada y la pérdida quede distinguible de una unidad simplemente no devuelta—. Un movimiento de baja sin motivo diría que la unidad salió, pero no **por qué**, que es lo que la auditoría necesita reconstruir.

La pérdida **no es un tipo de movimiento**: es el motivo de una baja, y así el filtro por tipo de `AC-MOV-02-2` no cuenta el mismo hecho dos veces. El último efecto es de `RN-PRE-15` y no de `RN-INV-13`: la unidad declarada perdida **sale del inventario activo** sin esperar al trámite de baja y **no bloquea** disponibilidad aunque el trámite siga abierto. El criterio exige ese efecto observable, no una marca interna.

#### AC-MOV-01-5 — Crear una solicitud deja un movimiento de reserva por unidad reservada

**Dado** un elemento serializado con unidades disponibles y sin reservas para un rango de fechas, un historial de movimientos con un número conocido de movimientos y un instructor con sesión iniciada.
**Cuando** el instructor crea una solicitud de una unidad de ese elemento para ese rango.
**Entonces**:

- el historial incorpora **exactamente un** movimiento;
- el tipo de ese movimiento corresponde a la reserva;
- el movimiento identifica el elemento y la unidad reservada;
- el movimiento registra como actor al instructor que creó la solicitud;
- el movimiento registra la fecha de la creación;
- el movimiento registra la solicitud asociada.

**Y cuando** el instructor crea una solicitud de dos unidades de ese elemento para ese mismo rango.
**Entonces**:

- el historial incorpora **exactamente dos** movimientos de reserva;
- cada movimiento identifica una de las dos unidades reservadas;
- los dos movimientos registran la solicitud asociada.

`Origen: RN-MOV-01`

La reserva ocurre donde la regla dice: **al crear la solicitud**, cuando la disponibilidad se descuenta sobre el rango completo de retiro y devolución (`RN-NEG-03`, `RN-NEG-04`, `AC-SOL-01-1`). El sujeto que `RN-MOV-01` le asigna al movimiento es la **unidad o el elemento**, no la solicitud: reservar dos unidades deja **dos** movimientos, igual que entregar dos unidades deja dos movimientos de entrega. Los escenarios fijan cuántas unidades se piden para que la cuenta sea verificable.

**La reserva es de unidades serializadas y de nadie más.** Un consumible no se reserva por fecha (`RN-INV-11`), así que una solicitud de un consumible no deja ningún movimiento de reserva: deja el de entrega, con el elemento como sujeto, que verifica `AC-MOV-01-7`. Crear la solicitud es `US-SOL-01` del epic 06.

#### AC-MOV-01-6 — El ajuste de cantidad de un consumible deja un movimiento

**Dado** un consumible controlado por cantidad con una cantidad disponible conocida, un historial de movimientos con un número conocido de movimientos y un administrador con sesión iniciada.
**Cuando** el administrador ajusta la cantidad disponible del consumible a otro valor.
**Entonces**:

- el historial incorpora **exactamente un** movimiento;
- el tipo de ese movimiento corresponde al ajuste de cantidad;
- el movimiento identifica el consumible y no una unidad;
- el movimiento registra como actor al administrador que hizo el ajuste;
- el movimiento registra la fecha del ajuste.

**Y cuando** el administrador envía un ajuste que deja la cantidad disponible en el valor que ya tenía.
**Entonces** cada sujeto se comporta así:

| Sujeto | Efecto |
|--------|--------|
| Historial | no incorpora ningún movimiento de ajuste de cantidad |
| Cantidad disponible del consumible | sigue siendo la misma |

`Origen: RN-MOV-01`

El **ajuste de cantidad** es el único de los ocho eventos que **no mueve una unidad física**: corrige el stock de un consumible, que se controla por cantidad (`RN-INV-06`, `RN-INV-11`). Por eso el movimiento identifica el **elemento y no una unidad**, que es el caso que hace necesaria la disyuntiva «unidad **o** elemento» de la regla y el que sostiene el filtro por elemento de `AC-MOV-02-2`. El movimiento existe cuando el ajuste **cambia** la cantidad y no cuando el valor enviado coincide con el actual. La operación de ajuste no está especificada en otro epic; lo que este criterio verifica es el movimiento que deja.

#### AC-MOV-01-7 — La entrega de un consumible deja un movimiento de entrega y ninguno de reserva

**Dado** un consumible con stock conocido y una solicitud empacada que incluye unidades de ese consumible, un historial de movimientos con un número conocido de movimientos y un administrador con sesión iniciada.
**Cuando** el administrador registra la entrega de esas unidades del consumible.
**Entonces**:

- el historial incorpora **exactamente un** movimiento;
- el tipo de ese movimiento corresponde a la entrega;
- el movimiento identifica el consumible y no una unidad;
- el movimiento registra como actor al administrador que entregó;
- el movimiento registra la fecha de la entrega;
- el movimiento registra la solicitud asociada.

**Y cuando** un instructor crea una solicitud de un consumible y el administrador la empaca.
**Entonces**:

- el historial no incorpora ningún movimiento de reserva;
- el stock del consumible no cambia.

`Origen: RN-MOV-01, RN-INV-11`

Un consumible **no se reserva por fecha**: su stock se descuenta **al registrar la entrega**, no al empacar (`RN-INV-11`). Por eso su efecto sobre el historial tiene dos mitades: no deja movimiento de reserva —no hay unidades que comprometer en un rango— y sí deja **un movimiento de entrega** cuando sale, con el **elemento** como sujeto y sin unidad. Es el complemento de `AC-MOV-01-5`: aquel exige la reserva de las unidades serializadas y este excluye la reserva de los consumibles, para que el filtro por tipo no cuente hechos que no ocurrieron.

### US-MOV-02 — Consultar el historial de movimientos

**Como** administrador del almacén **quiero** consultar el historial de movimientos y filtrarlo por unidad, por elemento, por tipo y por rango de fechas **para** reconstruir qué pasó con un equipo, con un elemento o durante un período, sin depender de mi memoria ni de recorrer una tabla completa.

**Prioridad:** alta — `RN-MOV-02`: un historial que no se puede leer no sirve para auditar.
**Estado:** especificada — no ejecutada.

Los cuatro filtros no son variantes del mismo: la **unidad** responde «qué le pasó a este equipo», el **elemento** responde «qué pasó con este modelo o este consumible», el **tipo** responde «cuántas bajas hubo» o «qué se entregó», y el **rango de fechas** responde «qué pasó en este mes». La unidad y el elemento no son intercambiables porque los movimientos no siempre tienen los dos: `RN-MOV-01` dice «unidad **o** elemento», y un ajuste de cantidad tiene elemento y no unidad.

El **rango** del filtro es **cerrado en los dos extremos** y va por **días de calendario**: los dos extremos entran, no existe el día parcial y el movimiento se ubica por el día de su fecha, sin conversión de zona horaria. Es la semántica que `RN-NEG-04` escribe para el rango de una reserva. La **hora** del corte del vencimiento de una reserva es otra cosa y sigue abierta (`OPEN-SOL-08`): este filtro no fija ninguna hora.

#### AC-MOV-02-1 — La consulta devuelve los movimientos con tipo, sujeto, actor y fecha

**Dado** un historial con exactamente dos movimientos de una misma unidad —su alta y su entrega—, ambos producidos por el administrador.
**Y** un tamaño de página que contiene los dos movimientos.
**Y** un administrador con sesión iniciada.
**Cuando** el administrador consulta la primera página del historial de movimientos.
**Entonces**:

- la respuesta es `200`;
- la consulta incluye el movimiento del alta de esa unidad;
- la consulta incluye el movimiento de la entrega de esa unidad;
- cada movimiento devuelto informa su tipo;
- cada movimiento devuelto informa la unidad o el elemento afectado;
- cada movimiento devuelto informa el actor;
- cada movimiento devuelto informa la fecha.

`Origen: RN-MOV-02`

Una consulta que devolviera los movimientos sin sus datos no permitiría auditar nada: `RN-MOV-01` fija justamente los campos que la auditoría necesita y la consulta tiene que exponerlos. La pertenencia no depende de la posición: el escenario fija **exactamente dos** movimientos y un **tamaño de página** que los contiene, para que ninguno quede fuera de la primera página por el orden en que salgan. La forma de la respuesta y la clave de orden no las fija ninguna regla; la paginación con su total sí (`AC-MOV-02-4`).

#### AC-MOV-02-2 — Se puede filtrar por unidad, por elemento, por tipo y por rango de fechas

**Dado** un administrador con sesión iniciada y un historial con movimientos registrados.
**Cuando** consulta el historial con cada uno de los cuatro filtros.
**Entonces** cada filtro se comporta así:

| Filtro | Historial de partida | Resultado exigido |
|--------|---------------------|-------------------|
| **Unidad** | movimientos de dos unidades distintas | devuelve solo los movimientos de la unidad consultada; ninguno de la otra unidad |
| **Elemento** | movimientos de dos elementos distintos | devuelve solo los movimientos del elemento consultado; ninguno del otro elemento |
| **Tipo de movimiento** | un alta y una baja de la misma unidad | devuelve el movimiento del tipo consultado y no el del otro tipo |
| **Rango de fechas** | un movimiento del primer día del rango consultado, otro de un día intermedio, otro del último día y otro de un día posterior al rango | devuelve los tres primeros —los dos bordes incluidos— y ninguno del día posterior |

`Origen: RN-MOV-02`

`RN-MOV-02` enumera los **cuatro** filtros y cada uno acota por un campo distinto: sin el de **unidad** no se puede reconstruir un equipo, sin el de **elemento** no se ve qué pasó con un consumible —que no tiene unidades—, sin el de **tipo** no se aíslan «las bajas del período» y sin el de **fechas** no se acota una auditoría a un mes. Cada caso exige las dos mitades del filtro: aparecer lo que coincide **y** no aparecer lo que no coincide. Si los filtros se combinan entre sí lo decide la implementación: la regla enumera los cuatro y no fija combinaciones.

El escenario de fechas incluye los dos **bordes** a propósito: el rango es cerrado en los dos extremos, y sin fijarlo un filtro exclusivo en el fin dejaría fuera el último día sin que ninguna aserción lo notara.

#### AC-MOV-02-3 — El instructor no accede al historial de movimientos

**Dado** un instructor con sesión iniciada y un historial con movimientos registrados.
**Cuando** el instructor envía la petición de consultar el historial de movimientos.
**Entonces**:

- la respuesta es `403`;
- la respuesta no contiene ningún movimiento del historial.

`Origen: RN-MOV-02`

`RN-MOV-02` fija que el historial es **del administrador**, y `RN-CTX-05` confirma el reparto: el instructor solicita, recoge y devuelve, no audita el almacén. El criterio exige el rechazo **y** que la respuesta no entregue datos: un `403` acompañado de la lista de movimientos no habría protegido nada, y ninguna regla le da al instructor una vista parcial del historial.

#### AC-MOV-02-4 — La consulta del historial es paginada y devuelve el total

**Dado** un historial con más movimientos registrados que el tamaño de página de la consulta, sin cambios entre una petición y la siguiente.
**Y** un administrador con sesión iniciada.
**Cuando** el administrador consulta la primera página del historial.
**Entonces**:

- la respuesta es `200`;
- la consulta devuelve como máximo el tamaño de página de movimientos;
- la consulta informa el total de movimientos del historial;
- la página siguiente devuelve movimientos que no aparecen en la primera;
- las páginas juntas cubren el total informado.

**Y** el orden con el que se reparten las páginas es **estable, total y determinista**: con el mismo historial, dos recorridos sucesivos devuelven el mismo reparto y ningún movimiento cae en dos páginas ni queda fuera.

`Origen: RN-CTX-02`

`RN-CTX-02` fija que **todo listado** de la aplicación es **paginado y devuelve su total**, y el historial lo es: se acumula solo —cada evento del inventario agrega filas— y nadie borra de él. El criterio exige el **efecto** —una página acotada, el **total** informado, páginas que no se repiten y páginas que juntas cubren el total— y no fija el tamaño de página, que ninguna regla determina. El reparto solo es verificable si el orden es **total y determinista**: con un orden cambiante el mismo movimiento podría caer en dos páginas o en ninguna. Cuál es la clave —fecha descendente, identificador— es decisión de implementación; el criterio no nombra ninguna y exige que exista.

## Errores y mensajes

| Situación | HTTP | Código | Mensaje |
|-----------|------|--------|---------|
| Consulta del historial con sesión de instructor | `403` | No lo fija ninguna regla (el epic 01 usa `FORBIDDEN`) | No lo fija ninguna regla; la respuesta no contiene ningún movimiento |
| Consulta del historial sin credencial | `401` | No lo fija ninguna regla (epic 01, `AC-AUTH-05-2`) | No lo fija ninguna regla; sin datos del historial |
| Operación de la que se esperaba un movimiento, rechazada por su propio epic | La de la operación, en el epic que la especifica | La del epic que la especifica | No lo fija ninguna regla; no deja movimiento, porque el inventario no cambió |

El historial no tiene errores propios: el registro es el efecto de operaciones de otros epics y sus rechazos pertenecen a esos epics. Ninguna regla de este epic fija un mensaje literal: lo único que exige un rechazo es el `403` del instructor, y su forma no está fijada.

## Sesión y seguridad

| Efecto | Regla | Dónde se verifica |
|--------|-------|-------------------|
| Consultar el historial exige sesión con rol de administrador | `RN-MOV-02`, `RN-CTX-05` | `AC-MOV-02-1`, `AC-MOV-02-3` |
| La consulta con sesión de instructor responde `403` y no entrega ningún movimiento | `RN-MOV-02` | `AC-MOV-02-3` |
| Una petición sin credencial no es una operación de ningún actor: recibe `401` | Epic 01 (`AC-AUTH-05-2`) | — |
| No hay un tercer rol que consulte el historial | `RN-CTX-05` | `AC-MOV-02-3` |
| Escribir el historial no es una acción de ningún actor: lo escribe el sistema como efecto de otro evento | `RN-MOV-01` | `AC-MOV-01-1` a `AC-MOV-01-7` |

Ninguna regla de este epic fija plazos de sesión ni efectos del historial sobre las credenciales: consultar el historial no cierra sesiones. El contrato de sesión es del epic 01.

## Decisiones tomadas

| Decisión | Regla | Responde a |
|----------|-------|------------|
| La lista de eventos es **cerrada**: los ocho de la regla y ninguno más | `RN-MOV-01` | — |
| La pérdida **no** tiene tipo propio: es el motivo de una baja, con motivo y actor | `RN-PRE-15`, `RN-INV-17`, `RN-INV-13` | — |
| La cuenta de movimientos es **por unidad**, no por solicitud: dos unidades reservadas dejan dos movimientos | `RN-MOV-01` | — |
| Un consumible **no** deja movimiento de reserva y sí deja el de entrega, con el elemento como sujeto | `RN-INV-11` | `OPEN-INV-04` |
| El ajuste de cantidad solo deja movimiento cuando la cantidad **cambia** | `RN-MOV-01` | — |
| El historial se **consulta**; no se crea, corrige ni borra a mano | `RN-MOV-01` | — |
| La consulta es del **administrador**; no hay vista parcial para el instructor | `RN-MOV-02` | — |
| Los filtros son exactamente **cuatro** y se verifican por separado; las combinaciones quedan a la implementación | `RN-MOV-02` | — |
| El rango de fechas del filtro es **cerrado** en los dos extremos y por **días de calendario**, y no fija ninguna hora | `RN-MOV-02` (semántica de `RN-NEG-04`) | — |
| El historial es **paginado con su total** y su orden debe ser total y determinista, **sin** que la regla fije la clave | `RN-CTX-02` | — |
| Las operaciones que producen los movimientos pertenecen a los epics 05, 06 y 07; este epic posee el **registro** y su **consulta** | `RN-MOV-01`, `RN-MOV-02` | — |
| La forma de la respuesta, el nombre interno de cada tipo y el tamaño de página son decisión de implementación | `RN-MOV-01`, `RN-MOV-02`, `RN-CTX-02` | — |

Sin decisión todavía: la clave de orden, el tamaño de página, las combinaciones de filtros y la exportación del historial. La **hora** del corte del vencimiento de una reserva sigue abierta (`OPEN-SOL-08`) y este filtro no la necesita.

## Trazabilidad y estado

Un criterio se marca `OK` o `GAP` **solo** cuando su test corre, nunca por lectura del código. Este epic está **especificado y no ejecutado**: los 11 criterios están sin estado y ninguno es `OK`, `GAP` ni `FALTA` hoy.

| Criterio | Regla | Estado hoy |
|----------|-------|------------|
| `AC-MOV-01-1` | `RN-MOV-01` | Sin ejecutar |
| `AC-MOV-01-2` | `RN-MOV-01` | Sin ejecutar |
| `AC-MOV-01-3` | `RN-MOV-01`, `RN-SOL-11` | Sin ejecutar |
| `AC-MOV-01-4` | `RN-INV-17`, `RN-PRE-15`, `RN-INV-13` | Sin ejecutar |
| `AC-MOV-01-5` | `RN-MOV-01` | Sin ejecutar |
| `AC-MOV-01-6` | `RN-MOV-01` | Sin ejecutar |
| `AC-MOV-01-7` | `RN-MOV-01`, `RN-INV-11` | Sin ejecutar |
| `AC-MOV-02-1` | `RN-MOV-02` | Sin ejecutar |
| `AC-MOV-02-2` | `RN-MOV-02` | Sin ejecutar |
| `AC-MOV-02-3` | `RN-MOV-02` | Sin ejecutar |
| `AC-MOV-02-4` | `RN-CTX-02` | Sin ejecutar |

| US | ACs | Implementables (`RN`) | `Estándar` | `Derivada` | `OPEN` |
|----|-----|-----------------------|------------|------------|--------|
| `US-MOV-01` | 7 | 7 | 0 | 0 | 0 |
| `US-MOV-02` | 4 | 4 | 0 | 0 | 0 |
| **Total** | **11** | **11** | **0** | **0** | **0** |

Totales: **2 historias y 11 criterios**, todos sin ejecutar. Los 11 se apoyan en una regla de negocio confirmada: `RN-MOV-01` ×6, `RN-MOV-02` ×3, `RN-INV-11` ×1, `RN-INV-13` ×1, `RN-INV-17` ×1, `RN-PRE-15` ×1, `RN-SOL-11` ×1 y `RN-CTX-02` ×1 — **15 citas** para **11 criterios**, porque `AC-MOV-01-3` cita dos reglas, `AC-MOV-01-4` cita tres y `AC-MOV-01-7` cita dos. Ninguno es `Estándar`, `Derivada` ni `OPEN`.

Los **ocho eventos** de `RN-MOV-01` tienen criterio: el alta (`AC-MOV-01-1`), el ensamblaje y el desensamblaje (`AC-MOV-01-2`), la entrega y la devolución (`AC-MOV-01-3`), la baja (`AC-MOV-01-4`), la reserva (`AC-MOV-01-5`) y el ajuste de cantidad (`AC-MOV-01-6`). La **pérdida** se verifica en `AC-MOV-01-4` como **motivo de la baja**, no como tipo propio, y `AC-MOV-01-7` agrega la entrega de un consumible.

## Anexo — Datos de prueba

Los valores de esta tabla son **ejemplos**: no son requisitos y QA elige los suyos. Los criterios fijan la clase de actor, la de estado y los límites de la regla; estos datos solo registran con qué se ejecutan las pruebas del módulo.

| Dato | Valor usado |
|------|-------------|
| Administrador del seed | `admin@sena.edu.co` / `AdminSENA2024` |
| Instructor del seed usado en `AC-MOV-01-5` y `AC-MOV-02-3` | `cmendoza@sena.edu.co` / `Instructor2024` |
| Unidad serializada de `AC-MOV-01-1` | serial «S-001», registrada sobre un elemento serializable del catálogo |
| Elemento compuesto de `AC-MOV-01-2` | un compuesto con composición definida y unidades de sus componentes, ensamblado y luego desensamblado |
| Solicitud de `AC-MOV-01-3` | aprobada y empacada, con 3 unidades reservadas de las que se entregan 2 |
| Unidad entregada de `AC-MOV-01-3` y `AC-MOV-01-4` | una unidad de la solicitud anterior, devuelta y luego declarada perdida |
| Motivo de baja de `AC-MOV-01-4` | «pérdida» en la declaración; un motivo declarado cualquiera en la baja |
| Rango de fechas de `AC-MOV-01-5` | del 10 al 13 de marzo, sin reservas de partida |
| Elemento serializado de `AC-MOV-01-5` | 3 unidades disponibles |
| Consumible de `AC-MOV-01-6` | cantidad disponible 10, ajustada a 12 y luego ajustada a 10 |
| Consumible de `AC-MOV-01-7` | stock 10; la solicitud incluye 2 unidades |
| Historial de `AC-MOV-02-1` | historial con exactamente dos movimientos: el alta de «S-001» del 10 de marzo y su entrega del 12 de marzo, ambos por el administrador |
| Tamaño de página de `AC-MOV-02-1` | 20 movimientos |
| Unidades de `AC-MOV-02-2` (filtro por unidad) | «S-001» y «S-002» |
| Elementos de `AC-MOV-02-2` (filtro por elemento) | «Teclado» y «Monitor» |
| Movimientos de `AC-MOV-02-2` (filtro por fechas) | 1 de marzo, 15 de marzo, 31 de marzo y 20 de abril, con el rango del 1 al 31 de marzo |
| Historial de `AC-MOV-02-3` | al menos un movimiento registrado |
| Historial de `AC-MOV-02-4` | más movimientos registrados que el tamaño de página de la consulta |
| Historial de partida de `US-MOV-01` | un número conocido de movimientos antes de cada operación |

Los usuarios salen del seed del proyecto (`AGENTS.md` §4). El elemento, el compuesto, la solicitud y las unidades son datos de los epics 04 a 07: acá se producen las operaciones que esos epics ya especifican y se lee el movimiento que dejan. Los movimientos del historial **no se insertan a mano**.
