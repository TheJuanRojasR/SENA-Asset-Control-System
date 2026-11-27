# Epic 05 — Inventario y ensamblaje

Las unidades físicas y su estado: dar de alta una unidad con su serial, ensamblar y desensamblar un compuesto, controlar los consumibles por cantidad, ubicar cada unidad, dar de baja, reparar y alertar el stock bajo.

## Resumen

Este módulo resuelve el **inventario físico**: la **unidad** identificada por su serial, el **ensamblaje** de los componentes de un compuesto, los **consumibles** controlados por cantidad, el **estado físico** de cada unidad y la **ubicación** donde está. Es el dueño de la aritmética del inventario —cuántas unidades hay, en qué estado y dónde están—; el **catálogo** del que esas unidades son instancias es el epic 04.

Lo escribe el **administrador** (`RN-CTX-05`): el alta de una unidad, el ensamblaje, el estado físico, la ubicación, la baja y el envío a mantenimiento son acciones administrativas. El instructor solicita, recoge y devuelve, y figura como tenedor de lo que se consulta.

Si el módulo falla, un consumible vale siempre cero, no se sabe dónde quedó un equipo que salió hace un mes, una unidad averiada desaparece del inventario, se presta una unidad en trámite de baja o el conjunto que se entrega está incompleto. Estado hoy: **en ejecución parcial**: 16 de 67 criterios ejecutados y en `OK` en la rama `devJoseph-inventario` (`US-INV-01`, `US-INV-02` y `US-INV-03`), con `PhysicalState` ya migrado a los seis estados de `RN-INV-30`. Los demás bloques siguen sin ejecutar.

> **Frontera con los epics 03, 04, 06, 07, 08 y 12.** El **ciclo de la solicitud** —su creación, la aprobación, la verificación al empacar y la entrega— es el epic 06. La **disponibilidad por rango de fechas** es el epic 08. Los **préstamos y las devoluciones** —quién tiene cada unidad, la condición de retorno y la pérdida de una unidad prestada— son el epic 07. El **catálogo de ambientes** es el epic 03. El **alta del elemento**, su composición y su categoría son los epics 04 y 10. El **panel del administrador** es el epic 12. Este epic es dueño de **las unidades físicas y su estado**: ningún criterio de esas historias se repite acá.

## Índice de historias

| Historia | Título en lenguaje llano | Criterios | Prioridad |
|----------|--------------------------|-----------|-----------|
| `US-INV-01` | Registrar una unidad con su serial | 5 | Alta |
| `US-INV-02` | Armar un equipo compuesto con sus piezas | 8 | Alta |
| `US-INV-03` | Sacar una pieza de un equipo compuesto | 3 | Alta |
| `US-INV-04` | Llevar los consumibles por cantidad | 8 | Alta |
| `US-INV-05` | Saber si un conjunto está completo y qué le falta | 4 | Alta |
| `US-INV-07` | Ver todas las unidades en una sola lista | 5 | Alta |
| `US-INV-08` | Dar de baja una unidad y qué cambia según su tenencia | 9 | Media |
| `US-INV-09` | Tramitar la baja de un equipo del SENA | 7 | Media |
| `US-INV-10` | Registrar en qué estado está cada unidad | 7 | Alta |
| `US-INV-11` | Saber dónde está cada unidad | 5 | Alta |
| `US-INV-12` | Enviar a mantenimiento y recibir de vuelta | 4 | Alta |
| `US-INV-13` | Ver las alertas de stock bajo | 2 | Media |
| **Total** | | **67** | |

La numeración tiene un hueco intencional: `US-INV-06` está retirada y los ids no se renumeran.

## Alcance

**Incluye**

- Alta de una unidad serializada dentro de un elemento, con su serial único y obligatorio, en el estado físico `OPERATIVO` (`RN-INV-30`, `RN-CTX-05`).
- Ensamblaje de los componentes de un compuesto, completo y parcial, con la marca de completitud de la unidad (`RN-INV-01`, `RN-INV-03`, `RN-INV-09`, `RN-INV-26`).
- Desensamblaje de un componente, bloqueado por préstamo vigente o reserva activa, y la ruptura de la marca de completo (`RN-INV-03`, `RN-INV-38`).
- Consumibles por cantidad: stock como cantidad, sin unidades, con unidad de medida propia y cantidad entera; descuento al registrar la entrega y no al empacar; stock no negativo (`RN-INV-06`, `RN-INV-11`, `RN-INV-12`, `RN-INV-18`).
- Consulta de integridad de un conjunto: si está completo, qué falta y quién lo tiene, con evaluación recursiva (`RN-INV-10`, `RN-INV-24`, `RN-INV-27`).
- Listado de todas las unidades —las componentes y las dos tenencias— separado de la lista de consumibles y paginado con su total (`RN-INV-16`, `RN-INV-34`, `RN-CTX-02`).
- Registro del estado físico con la lista cerrada de seis estados y qué se presta en cada uno, como unidad y por piezas sueltas (`RN-INV-25`, `RN-INV-30`, `RN-INV-31`).
- Ubicación actual obligatoria de cada unidad, con el Ambiente 104 por defecto, su cambio y la consulta por ambiente (`RN-CTX-07`, `RN-CTX-08`, `RN-CTX-10`).
- Baja inmediata de una unidad donada con motivo y actor, y registro de la pérdida de una unidad fuera de un préstamo (`RN-INV-13`, `RN-INV-14`, `RN-INV-17`, `RN-PRE-15`).
- Trámite de baja de un equipo del SENA con confirmación del administrador y bloqueo de la unidad y sus piezas (`RN-INV-19`, `RN-INV-32`, `RN-INV-33`).
- Envío a mantenimiento de un equipo con falla y decisión del nuevo estado al volver (`RN-INV-36`, `RN-INV-42`, `RN-INV-43`).
- Alerta de stock bajo contra el umbral mínimo del elemento, sin rango de fechas (`RN-INV-44`).

**No incluye**

| Tema | Dónde se especifica |
|------|---------------------|
| Alta del elemento, su tenencia, su unidad de medida, su cantidad inicial y su umbral mínimo (`minStock`) | Epic 04 (`US-ITE-02`, `AC-ITE-02-5`); acá se **lee** ese dato ya registrado y se fija la aritmética del stock |
| Definición y edición de la composición de un compuesto, la marca obligatorio/opcional y la prohibición de quitar un componente con unidades ensambladas | Epic 04 (`RN-INV-35`); acá se ensamblan y desensamblan **unidades**, no se edita la composición |
| Qué elemento puede configurarse como consumible | Epic 04 (`RN-INV-46`, `AC-ITE-02-4`); acá se verifica el **efecto** de esa clasificación sobre el inventario |
| Alta y administración de categorías | Epic 10 |
| Ciclo de la solicitud: creación, aprobación, empacado, entrega, entrega parcial y cierre | Epic 06; acá solo se fija cuándo baja el stock y que la entrega se rechaza si la cantidad ya no existe |
| Verificación de los componentes obligatorios al empacar una solicitud | Epic 06 (`AC-SOL-05-3`); acá se define el ensamblaje y la consulta de integridad |
| Disponibilidad de un compuesto o de una unidad por rango de fechas | Epic 08; la alerta de `US-INV-13` no usa rango |
| Préstamos y devoluciones: condición de retorno, revisión al devolver y pérdida de una unidad prestada | Epic 07 (`RN-PRE-03`, `RN-PRE-10`, `RN-PRE-15`) |
| Catálogo de ambientes: registrarlo, renombrarlo, eliminarlo y contar las unidades de cada uno | Epic 03 (`RN-CTX-09`, `AC-AMB-02-2`, `AC-AMB-03-1`); este epic **escribe** la ubicación y el epic 03 la **cuenta** |
| Panel del administrador y el número de alertas | Epic 12 (`RN-PAN-02`, `AC-PAN-01-4`) |
| Reposición de un consumible por compra o recarga | Ninguna regla define la suma de cantidad: `RN-INV-11` solo fija la resta |
| Editar o borrar una unidad ya registrada | Ninguna regla; `RN-INV-17` conserva el registro y la baja es un estado |
| Motivos de baja y su vocabulario | `RN-INV-17` exige el motivo; ninguna regla fija qué motivos existen |
| Reincorporar una unidad dada de baja | Prohibido por `RN-INV-17` y `RN-INV-39` |
| Historial de traslados de ubicación y de estados físicos | `RN-CTX-07` exige la ubicación **actual** y `AC-INV-11-2` el registro del cambio; ninguna regla pide la secuencia histórica |
| Ejecución de la reparación: quién repara, cuánto dura y qué piezas se reemplazan | `RN-INV-42` fija el flujo del almacén —enviar y decidir el estado al volver—, no el taller |
| Recurrencia de la alerta de stock bajo y su envío por un canal externo | `RN-INV-44` fija que el sistema **muestra** la alerta al administrador; ninguna regla fija periodicidad ni canal |
| Tamaño de página, orden y filtros de los listados | Ninguna regla; `RN-CTX-02` exige paginación **con su total** |
| Reportes, exportación y formatos de informe | Ninguna regla; el epic 09 está descartado por decisión del negocio |
| Plazos, recordatorios y abandono del trámite de baja | `RN-INV-19` describe una duración observada, no un plazo que el sistema controle |
| Un estado `PERDIDA` de la unidad | `RN-PRE-15`: la pérdida es el **motivo de la baja**, no un estado físico |

## Actores y permisos

| Actor | Puede | No puede |
|-------|-------|----------|
| **Administrador** (instructor encargado del almacén) | Dar de alta unidades, ensamblar y desensamblar, cambiar el estado físico y la ubicación, dar de baja una unidad donada, tramitar y confirmar la baja de un equipo del SENA, declarar pérdidas, enviar a mantenimiento y decidir el estado al volver, y consultar el listado, la integridad, la ubicación y las alertas de stock | Prestar una unidad cuyo estado físico no lo permite ni las piezas que la regla bloquea (`RN-INV-31`, `RN-INV-33`); desensamblar un conjunto con préstamo vigente o reserva activa (`RN-INV-38`); reactivar una unidad dada de baja (`RN-INV-39`); entregar un consumible sin cantidad (`RN-INV-11`) |
| **Instructor** (quien dicta la clase) | Figurar como tenedor de la unidad o de la pieza suelta que la consulta informa (`RN-PRE-02`) | Escribir el inventario: dar de alta unidades, ensamblar, cambiar el estado físico o la ubicación y dar de baja responden `403` sin efectos (`RN-CTX-05`, `RN-INV-43`) |

Una petición sin credencial no es un actor: no tiene identidad y recibe `401` (epic 01, `AC-AUTH-05-2`). No hay un tercer rol (`RN-CTX-05`): el administrador **es** un instructor y nadie más escribe el inventario.

## Reglas de negocio

| ID | Regla | Ejemplo |
|----|-------|---------|
| `RN-CTX-02` | Volumen de 1.000 a 1.500 equipos y elementos: **todo listado** es paginado con su total, **incluido el de unidades** | El listado de unidades devuelve una página acotada e informa el total del inventario |
| `RN-CTX-03` | Existe **un único inventario**, el del Ambiente 104, y `Environment` no representa sedes ni inventarios paralelos | Un ambiente de destino registra dónde quedó un equipo, no una segunda bodega |
| `RN-CTX-04` | `Environment` existe por **trazabilidad de destino**: interesa saber dónde está el equipo que se queda mucho tiempo en otro ambiente | Un equipo prestado durante dos meses conserva un destino nombrable |
| `RN-CTX-05` | Dos actores y ninguno más: la escritura del inventario es **acción administrativa** y el instructor solicita, recoge y devuelve | Un alta de unidad enviada con sesión de instructor responde `403` sin efectos |
| `RN-CTX-07` | El sistema registra **dónde está cada unidad**: su ubicación actual o el nombre del ambiente donde se encuentra | La ficha de una unidad dice «Ambiente 205» y no «prestada a un instructor» |
| `RN-CTX-08` | La ubicación es **obligatoria**, la de una unidad nueva es el **Ambiente 104** y **se actualiza** cuando la unidad se lleva a otro ambiente | Una unidad recién registrada aparece en el 104; ninguna queda sin ubicación |
| `RN-CTX-10` | Se puede consultar **por ambiente**: cuántas unidades hay en él y cuáles son | La consulta por ambiente devuelve las unidades que allí están y no las que siguen en el 104 |
| `RN-INV-01` | El instructor solicita **el conjunto**, no los componentes por separado | El compromiso de un compuesto alcanza a sus componentes y ninguno se cuenta dos veces |
| `RN-INV-02` | Un elemento compuesto se entrega **completo**: si falta un componente obligatorio no se entrega como conjunto | Un portátil compuesto se entrega con su cargador y su mouse |
| `RN-INV-03` | Un elemento ensamblado queda **marcado como completo** | Al ensamblar todos los obligatorios la unidad queda completa; al desensamblar uno obligatorio deja de estarlo |
| `RN-INV-04` | **`REFUTADA`**: «un componente ensamblado no es solicitable por separado». No se implementa, porque `RN-INV-08` afirma lo contrario | Un componente de un conjunto ensamblado **sí** se presta por separado, con registro propio |
| `RN-INV-05` | Existen elementos **consumibles** | Un consumible se registra como consumible y no como un serializado más |
| `RN-INV-06` | Un consumible **no tiene serial** y se controla **por cantidad**: no genera unidades ni seriales automáticos y no se devuelve | Su alta deja una cantidad y **cero** unidades serializadas |
| `RN-INV-07` | Dos tenencias —SENA y donado— y los del SENA **no se pueden perder**: incluso averiados se presentan **completos** en una auditoría | Una unidad del SENA con falla sigue en el inventario y en la presentación de auditoría |
| `RN-INV-08` | Un componente de un conjunto ensamblado **puede prestarse por separado**, con registro propio | De un computador con la CPU dañada se presta el monitor y queda el registro de quién lo tiene |
| `RN-INV-09` | Un conjunto puede guardarse **incompleto**, con **trazabilidad** de qué falta | Un equipo al que se le dañó una pieza se ensambla con las demás y queda marcado incompleto |
| `RN-INV-10` | Requisito de auditoría: el sistema informa, para cada conjunto, si está **completo**, qué piezas **faltan** y **quién las tiene** | El informe declara el conjunto incompleto y nombra al instructor que tiene la pieza |
| `RN-INV-11` | Un consumible se **descuenta por cantidad** y **no se reserva por fecha**; el descuento ocurre **al registrar la entrega** y no al empacar, y la cantidad se verifica en los dos momentos | De 100 bajan 2 al entregar, quedan 98, y empacar no descuenta nada |
| `RN-INV-12` | Cada consumible declara **su propia unidad de medida** y su stock se lee en esa unidad | Dos consumibles con unidades distintas conservan cada uno la suya |
| `RN-INV-13` | **Ninguna unidad se pierde sin quedar registrada**: la pérdida es un evento con motivo y actor | Una unidad que desaparece del depósito deja su registro de pérdida |
| `RN-INV-14` | Una unidad **donada** se da de baja **de inmediato** y sin trámite; la de un equipo del SENA **no** es inmediata | La baja inmediata de una donada se acepta; el mismo camino sobre una del SENA se rechaza |
| `RN-INV-15` | **`REFUTADA`**: el préstamo informal **no existe**. Un préstamo **solo existe a través de una solicitud**, y lo que se preste por fuera del sistema queda fuera de su responsabilidad | Ningún criterio de este epic registra un préstamo fuera de una solicitud |
| `RN-INV-16` | Los listados de inventario muestran **todas** las unidades: sin ocultar las que son componentes de un conjunto y sin filtrar por tenencia | Una pieza ensamblada figura en el listado con el conjunto del que forma parte |
| `RN-INV-17` | Toda baja exige **motivo y actor**, queda registrada, es auditable y **no se puede deshacer** | La baja sin motivo se rechaza; con motivo queda registrado quién la hizo |
| `RN-INV-18` | Las cantidades de consumibles son **enteras**: no se admiten decimales | Un consumo de 2,5 unidades se rechaza |
| `RN-INV-19` | La baja de un equipo **del SENA** requiere **confirmación** y un trámite de **6 meses a 1 año**; hasta confirmarla la unidad **no** queda dada de baja y **sigue en el inventario** | Iniciar el trámite no saca la unidad del listado |
| `RN-INV-20` | La **tenencia** vive en la **unidad física** para los serializados y en el **elemento** para los consumibles | Dos unidades del mismo elemento pueden ser una del SENA y una donada |
| `RN-INV-24` | La falta de un componente **opcional** no impide prestar, pero la ausencia **queda documentada**: completitud funcional y documental son distintas | Un conjunto con un opcional ausente se informa completo y el faltante queda anotado |
| `RN-INV-25` | **Presencia** y **funcionamiento** son condiciones distintas: una unidad presente pero agotada o descargada **no es faltante** | Una pila descargada cuenta como presente en el conjunto |
| `RN-INV-26` | Un **kit** incluye el **aparato como un componente más** y el aparato es un elemento **independiente** que se presta solo | El aparato sale sin sus pinzas, estuche ni pila |
| `RN-INV-27` | Un compuesto **puede contener otro compuesto** y la completitud se evalúa de forma **recursiva** | A contiene B y B no tiene C: A se informa incompleto |
| `RN-INV-28` | Las pilas de un elemento **del SENA** son **no consumibles** y se entregan y devuelven con él; las demás **pueden** ser consumibles | La pila de un elemento del SENA no se descuenta como consumible |
| `RN-INV-30` | Los estados físicos son una **lista cerrada** de seis: `OPERATIVO`, `DESCARGADO_AGOTADO`, `CON_FALLA`, `AVERIADO`, `EN_MANTENIMIENTO` y `DADO_DE_BAJA` | Un estado fuera de la lista se rechaza |
| `RN-INV-31` | Fija **qué se puede prestar** en cada estado, en dos planos: la unidad **como unidad** y sus **piezas sueltas** | Con falla o averiada no se presta la unidad y sí sus piezas; descargada, en mantenimiento o dada de baja no se presta nada |
| `RN-INV-32` | El **administrador** registra la **confirmación de la baja** de un equipo del SENA | La misma confirmación enviada con sesión de instructor responde `403` |
| `RN-INV-33` | Mientras una unidad del SENA está **en trámite de baja** queda **bloqueada**: no se presta la unidad **ni sus piezas sueltas**; prevalece sobre `RN-INV-31` | Una unidad averiada en trámite deja de prestar sus piezas |
| `RN-INV-34` | El carácter **consumible** se fija **por elemento** y el catálogo presenta consumibles y serializados en **listas separadas** | Un tipo de objeto que deba tratarse de las dos formas exige **dos elementos distintos** |
| `RN-INV-35` | Con **unidades ensambladas** no se quita un componente de la **composición**; sí se agregan componentes olvidados (epic 04) | Quitar un componente de un compuesto con una unidad ensamblada se rechaza en el epic 04 |
| `RN-INV-36` | `CON_FALLA` es el estado **reparable** y `AVERIADO` el **no reparable**: la diferencia no está en el préstamo sino en qué se hace con el equipo | La con falla se envía a mantenimiento; la averiada entra al trámite de baja |
| `RN-INV-38` | No se puede **desensamblar** un equipo con **préstamo vigente** ni con **reserva activa** | El intento se rechaza y el ensamblaje queda intacto |
| `RN-INV-39` | Una unidad **dada de baja no vuelve**: no se asigna a una solicitud, no se ensambla y no se reactiva | Asignar esa unidad a una solicitud se rechaza |
| `RN-INV-41` | La composición **no puede formar ciclos** (epic 04): es lo que garantiza que la evaluación recursiva termine | Un compuesto que ya contiene a otro no puede ser componente de ese otro |
| `RN-INV-42` | Un equipo **con falla** es reparable: el administrador lo envía a **mantenimiento** y decide el nuevo estado al volver; un **averiado** no se envía y entra al trámite de baja | Al volver operativa la unidad se presta otra vez; al volver averiada, no |
| `RN-INV-43` | **Solo el administrador** cambia el **estado físico** de una unidad | El cambio enviado con sesión de instructor responde `403` y la unidad conserva su estado |
| `RN-INV-44` | El sistema alerta el **stock bajo** cuando la **cantidad disponible de hoy** queda **en el umbral mínimo del elemento o por debajo**, sin rango de fechas; sin umbral no hay alerta ni valor por defecto | Con umbral 5 alertan las cantidades 5 y 2, y no alerta 6 |
| `RN-INV-46` | Un elemento **del SENA no puede configurarse como consumible**: solo uno **donado** puede serlo | El elemento del SENA nunca aparece en la lista de consumibles |
| `RN-NEG-05` | Una unidad **prestada** no está disponible para ningún rango futuro hasta su devolución | Mientras el préstamo siga vigente la unidad no se ofrece para otra fecha |
| `RN-PRE-02` | Debe saberse **siempre** quién tiene cada elemento y desde cuándo | La pieza suelta prestada informa a quién se entregó y desde qué fecha |
| `RN-PRE-03` | Al devolver se **revisa el estado físico** de cada elemento antes de guardarlo | El registro de esa revisión y su traducción al estado físico son del epic 07 (`RN-PRE-11`, `RN-PRE-12`) |
| `RN-PRE-10` | La **condición de retorno** es obligatoria en toda **unidad serializada devuelta**; un **consumible no entra** al flujo de devolución y nunca la lleva | Un consumible entregado no se devuelve y no lleva condición de retorno |
| `RN-PRE-15` | Una unidad **declarada perdida** **sale del inventario activo**, **no bloquea** disponibilidad y sus **piezas sueltas siguen prestables**, con el trámite **solo administrativo**; prevalece sobre `RN-INV-33` | La unidad perdida no figura en el inventario activo y su pieza se sigue prestando |
| `RN-SOL-02` | **Empacar** es verificar y preparar: el aviso al instructor es el **efecto de `PACKED`** y empacar **no descuenta stock** | Empacar una solicitud con un consumible deja su cantidad intacta |
| `RN-SOL-12` | La solicitud **se completa cuando no queda nada afuera**: todo lo entregado volvió o fue **declarado perdido** | Declarar la pérdida de la única unidad pendiente cierra la solicitud |
| `RN-CAT-04` | La disponibilidad del **catálogo** se informa **por rango de fechas**; la alerta de `RN-INV-44` no usa rango y por eso no se contradicen | El catálogo exige un rango y la alerta compara el stock de hoy |
| `RN-PAN-02` | Cada indicador del panel se calcula con la **misma regla** que la pantalla que lo detalla | El número de alertas del panel coincide con la lista de `US-INV-13` |
| `Estándar` (invariantes técnicos) | Unicidad y obligatoriedad del serial, atomicidad del ensamblaje, aritmética del stock y validación de entrada: ningún criterio de este módulo puede incumplirlos | Un serial repetido no crea una segunda unidad y un lote con una pieza inválida no se ensambla a medias |

`RN-CTX-02`, `RN-CTX-03` y `RN-CTX-04` a `RN-CTX-10` viven en §1 y §2 de `00-contexto-negocio.md`; `RN-INV-01` a `RN-INV-46` en §5.2; `RN-NEG-05` en §5.1; `RN-PRE-02`, `RN-PRE-03`, `RN-PRE-10` y `RN-PRE-15` en §5.4; `RN-SOL-02` y `RN-SOL-12` en §4 y §5.3; `RN-CAT-04` en §5.6 y `RN-PAN-02` en §5.11. Acá se leen y se citan: ningún criterio agrega condiciones que la regla no diga.

`RN-INV-02`, `RN-INV-04`, `RN-INV-05`, `RN-INV-15`, `RN-INV-28`, `RN-INV-35`, `RN-INV-41`, `RN-NEG-05`, `RN-PRE-03`, `RN-PRE-10`, `RN-SOL-02`, `RN-SOL-12`, `RN-CAT-04` y `RN-PAN-02` se citan como fundamento y como frontera: explican por qué existe cada límite y ninguno agrega un criterio propio a este epic.

## Historias de usuario

Los criterios nombran la clase de actor y de estado —«un administrador con sesión iniciada», «una unidad serializada disponible», «un compuesto con dos componentes ensamblados», «un consumible con stock 100»—. Los valores concretos con los que se ejecutan los escenarios están en el `Anexo — Datos de prueba`, al final del documento, y son ejemplos, no requisitos.

### US-INV-01 — Registrar una unidad serializada

**Como** administrador del almacén **quiero** registrar una unidad física con su número de serie dentro de un elemento **para** que el inventario refleje la existencia real y cada equipo sea trazable por su serial.

**Prioridad:** alta — sin unidades registradas no hay disponibilidad que mostrar ni préstamo posible.
**Estado:** especificada — no ejecutada.

Registrar inventario es dar de alta **unidades** dentro de un elemento que ya existe en el catálogo (epic 04). El serial es la identidad de la unidad, así que su unicidad y su obligatoriedad son invariantes técnicos. La escritura es administrativa (`RN-CTX-05`) y la unidad nace `OPERATIVO`, que es uno de los seis valores de `RN-INV-30`. «Disponible» no es un estado físico: la disponibilidad es la conclusión del estado, la reserva y el préstamo (§6).

#### AC-INV-01-1 — Una unidad con un serial nuevo queda en el inventario del elemento

**Dado** un administrador con sesión iniciada, un elemento serializado registrado y un serial que no pertenece a ninguna unidad.
**Cuando** el administrador registra una unidad con ese serial en ese elemento.
**Entonces**:

- la respuesta es `201`;
- la unidad queda creada y asociada al elemento;
- la unidad queda en estado físico `OPERATIVO`;
- la unidad aparece en el inventario del elemento;
- el conteo de unidades del elemento aumenta en 1.

El criterio no fija la forma de la petición ni el nombre del campo del serial.

#### AC-INV-01-2 — Un serial ya registrado se rechaza sin crear una segunda unidad

**Dado** una unidad registrada con un serial.
**Cuando** el administrador registra otra unidad con ese mismo serial.
**Entonces**:

- la respuesta es `409`;
- el mensaje identifica el serial como ya registrado;
- no se crea ninguna unidad nueva;
- el conteo de unidades no cambia.

El mismo rechazo aplica si la segunda unidad se intenta registrar **en otro elemento**: el serial identifica la instancia física, no la fila de un elemento concreto.

#### AC-INV-01-3 — Un serial vacío o de solo espacios se rechaza

**Dado** un elemento serializado registrado con un número conocido de unidades.
**Cuando** el administrador registra una unidad con un serial vacío o formado solo por espacios.
**Entonces**:

- la respuesta es `400`;
- la respuesta indica que el serial es obligatorio;
- no se crea ninguna unidad nueva;
- el conteo de unidades del elemento no cambia.

Un serial en blanco no identifica nada: dos unidades con serial vacío serían indistinguibles y `RN-PRE-02` dejaría de poder cumplirse. Si el serial válido se guarda normalizado es una decisión de implementación.

#### AC-INV-01-4 — Un elemento inexistente se rechaza

**Dado** un administrador con sesión iniciada y un serial que no pertenece a ninguna unidad.
**Cuando** el administrador registra una unidad con ese serial indicando un elemento que no existe en el catálogo.
**Entonces**:

- la respuesta es `404`;
- no se crea ninguna unidad nueva;
- no se crea ningún elemento.

#### AC-INV-01-5 — El instructor no puede registrar unidades

**Dado** un instructor con sesión iniciada y un elemento con un número conocido de unidades.
**Cuando** envía la petición de alta de una unidad serializada.
**Entonces**:

- la respuesta es `403`;
- no se crea ninguna unidad nueva;
- el conteo de unidades del elemento no cambia.

`RN-CTX-05` deja el rechazo en el rol: dar de alta inventario es escritura administrativa, y el instructor solicita, recoge y devuelve.

### US-INV-02 — Ensamblar un equipo compuesto

**Como** administrador del almacén **quiero** ensamblar las unidades de los componentes dentro de una unidad del elemento compuesto **para** que el equipo quede completo y pueda entregarse como conjunto.

**Prioridad:** alta — `RN-INV-02` no se puede cumplir sin ensamblaje, y el instructor pide el conjunto (`RN-INV-01`).
**Estado:** especificada — no ejecutada.

El ensamblaje une físicamente las unidades de los componentes de un compuesto. `RN-INV-09` admite guardarlo **incompleto** con trazabilidad de qué falta —el caso real es un equipo al que se le dañó una pieza— y `RN-INV-08` confirma que una pieza de un conjunto ensamblado **sí** puede prestarse aparte, con registro propio: el ensamblaje es una comodidad, no un candado. Lo único que impide que una pieza salga es que el conjunto esté **comprometido**.

#### AC-INV-02-1 — El ensamblaje de todos los componentes obligatorios deja la unidad completa

**Dado** un elemento compuesto con sus componentes obligatorios definidos.
**Y** una unidad de ese compuesto sin ningún componente ensamblado.
**Y** una unidad disponible de cada componente obligatorio.
**Cuando** el administrador ensambla esas unidades dentro de la unidad del compuesto.
**Entonces**:

- la operación se acepta;
- cada componente queda registrado como parte de esa unidad del compuesto;
- la unidad del compuesto queda marcada como completa en su **completitud funcional**.

`RN-INV-03` es literal: un elemento ensamblado queda marcado como completo, y la marca es del ensamblaje y no del elemento. «Completa» quiere decir **funcionalmente completa**, que es la noción que `RN-INV-24` separa de la documental: la ausencia de un **opcional** no vuelve incompleto al conjunto y queda documentada en el informe de integridad (`AC-INV-05-1`).

#### AC-INV-02-2 — El ensamblaje parcial se acepta y deja la unidad marcada como incompleta

**Dado** un elemento compuesto con tres componentes obligatorios.
**Y** una unidad disponible de solo dos de ellos.
**Cuando** el administrador ensambla esos dos componentes dentro de la unidad del compuesto.
**Entonces**:

- la operación se acepta;
- los dos componentes quedan registrados como parte de esa unidad del compuesto;
- la unidad del compuesto queda marcada como incompleta;
- el componente obligatorio que falta se informa como faltante al consultar la integridad del conjunto.

`RN-INV-09` confirma que no poder completar el conjunto **no** invalida el ensamblaje: el conjunto queda utilizable y su marca declara la verdad, que es lo que la auditoría de `RN-INV-10` lee después (`US-INV-05`). Exigir el conjunto completo para poder guardar convertiría un equipo con una pieza dañada en un equipo inexistente.

#### AC-INV-02-3 — Un componente que no pertenece al elemento compuesto se rechaza

**Dado** un elemento compuesto cuyos componentes son dos elementos del catálogo.
**Y** una unidad disponible de un elemento que no es componente de ese compuesto.
**Cuando** el administrador intenta ensamblar los tres dentro de la unidad del compuesto.
**Entonces**:

- la operación se rechaza;
- ninguna de las tres unidades queda ensamblada;
- las unidades de los componentes válidos siguen disponibles por separado.

El criterio fija además la **atomicidad**: un lote con una pieza inválida no deja el ensamblaje a medias. Sin eso, el «queda completo» de `RN-INV-03` dejaría de ser confiable.

#### AC-INV-02-4 — Un componente que ya está dentro de otro equipo se rechaza

**Dado** una unidad componente ya ensamblada dentro de la unidad de un compuesto.
**Cuando** el administrador intenta ensamblar esa misma unidad dentro de otro equipo.
**Entonces**:

- la operación se rechaza;
- no se ensambla ninguna otra unidad del lote;
- el componente sigue perteneciendo únicamente al primer equipo.

Una unidad física no puede estar en dos equipos a la vez: permitirlo haría que el mismo serial aparezca entregado dos veces, contra `RN-PRE-02`.

#### AC-INV-02-5 — Un componente prestado se rechaza

**Dado** una unidad componente entregada en un préstamo vigente.
**Cuando** el administrador intenta ensamblarla dentro de un equipo compuesto.
**Entonces**:

- la operación se rechaza;
- no se ensambla ninguna unidad del lote;
- el préstamo del componente no se modifica.

El componente no está físicamente en el almacén, y alterar un ensamblaje en curso dejaría el préstamo describiendo un conjunto que ya no existe.

#### AC-INV-02-6 — Los componentes de un conjunto comprometido no se ofrecen por separado

**Dado** un equipo compuesto ensamblado y marcado como completo.
**Y** ese conjunto comprometido en un préstamo vigente o en una reserva activa (§6).
**Cuando** el administrador consulta el inventario de sus componentes.
**Entonces**:

- ninguna unidad componente se informa como disponible por separado;
- el ensamblaje del conjunto no cambia.

`RN-INV-08` confirma que un componente de un conjunto ensamblado **sí** puede prestarse por separado con registro propio, así que lo único que este criterio fija es la mitad que pertenece al **inventario**: mientras el conjunto está comprometido, sus piezas no se ofrecen aparte. La fórmula de disponibilidad por rango de fechas no se define acá: es el epic 08.

#### AC-INV-02-7 — Un componente ensamblado no se cuenta dos veces

**Dado** un equipo compuesto ensamblado y marcado como completo, con dos componentes obligatorios.
**Y** ningún compromiso por fechas sobre el compuesto ni sobre sus componentes.
**Y** un instructor con sesión iniciada.
**Cuando** el instructor solicita ese compuesto con cantidad 1.
**Entonces**:

- el compuesto queda comprometido para el rango solicitado;
- las unidades de sus dos componentes quedan comprometidas en el mismo compromiso;
- ninguno de los componentes se informa como disponible por separado en ese rango.

`RN-INV-01` fija qué pide el instructor —**el conjunto**, no los componentes—, así que un compromiso que alcanzara solo a la unidad del compuesto contaría las mismas piezas dos veces. Qué estado toma la solicitud al crearse y cuándo vence la reserva es el epic 06; la disponibilidad por rango es el epic 08.

#### AC-INV-02-8 — El aparato de un kit es un elemento independiente

**Dado** un kit ensamblado cuyos componentes incluyen el aparato y sus accesorios.
**Y** el aparato es un elemento propio del catálogo, distinto del kit.
**Y** el kit no está comprometido con ninguna reserva ni préstamo vigente.
**Cuando** el aparato se presta solo, sin sus accesorios.
**Entonces**:

- la operación se acepta;
- el aparato queda prestado como elemento independiente;
- los accesorios no quedan prestados.

`RN-INV-26` declara el aparato **elemento independiente del catálogo** y admite que se preste solo. La salida se registra como cualquier préstamo, a través de una **solicitud**; lo que el criterio fija es **qué** se puede prestar por separado, no la forma del registro. Que el kit quede marcado como incompleto con lo que falta lo verifica `AC-INV-05-2`.

### US-INV-03 — Desensamblar un componente

**Como** administrador del almacén **quiero** sacar un componente de un equipo compuesto **para** que ese componente vuelva a estar disponible por separado y el equipo refleje lo que realmente tiene.

**Prioridad:** alta — un ensamblaje que no se puede deshacer es irreversible en el inventario real.
**Estado:** especificada — no ejecutada.

Desensamblar es la operación inversa de `US-INV-02` y la que revela si la marca de completo de `RN-INV-03` se mantiene. `RN-INV-38` pone el límite: mientras alguna pieza del conjunto esté **comprometida** —préstamo vigente o reserva activa—, el conjunto no se toca. La reserva como entidad es de §6 y del epic 06; acá solo se lee su efecto sobre el ensamblaje.

#### AC-INV-03-1 — Desensamblar libera el componente

**Dado** un equipo compuesto ensamblado y marcado como completo.
**Y** ese equipo no entregado en ningún préstamo vigente.
**Cuando** el administrador desensambla uno de sus componentes.
**Entonces**:

- el componente deja de estar registrado dentro de ese equipo;
- el componente vuelve a estar disponible por separado;
- el equipo conserva ensamblados los demás componentes.

Es la operación inversa del ensamblaje: la unidad vuelve a su propio elemento y el desensamblaje **no arrastra** al resto. El rechazo de un equipo que está afuera lo exige `AC-INV-03-2`.

#### AC-INV-03-2 — No se puede desensamblar un equipo comprometido

**Dado** un equipo compuesto entregado en un préstamo vigente.
**Cuando** el administrador intenta desensamblar uno de sus componentes.
**Entonces**:

- la operación se rechaza;
- el ensamblaje queda intacto;
- el préstamo no se modifica.

**Dado** un equipo compuesto con una reserva activa sobre él o sobre alguna de sus piezas.
**Cuando** el administrador intenta desensamblar uno de sus componentes.
**Entonces**:

- la operación se rechaza;
- el ensamblaje queda intacto;
- la reserva sigue activa.

`RN-INV-38` confirma el rechazo en las dos formas de compromiso y los dos escenarios se verifican en el mismo test. Sacar una pieza dejaría el préstamo o la reserva describiendo un conjunto que ya no existe, contra `RN-PRE-02` y `RN-INV-02`.

#### AC-INV-03-3 — Desensamblar un componente obligatorio rompe la marca de completo

**Dado** un equipo compuesto marcado como completo.
**Cuando** el administrador desensambla uno de sus componentes obligatorios.
**Entonces**:

- el equipo deja de estar marcado como completo;
- el componente desensamblado vuelve a estar disponible por separado.

Una marca que sobrevive al desensamblaje no describe nada del inventario real.

### US-INV-04 — Controlar consumibles por cantidad

**Como** administrador del almacén **quiero** controlar los consumibles por cantidad **para** saber cuántas unidades quedan de algo que no tiene serial y no vuelve.

**Prioridad:** alta — hoy un consumible vale siempre cero porque el stock se calcula contando unidades.
**Estado:** especificada — no ejecutada.

`RN-INV-05` confirma que existen consumibles y `RN-INV-06` fija cómo se controlan: **sin serial**, **por cantidad**, sin generar unidades y sin devolución. `RN-INV-12` fija la unidad de medida propia y `RN-INV-18` que la cantidad es entera. `RN-INV-11` fija el **momento**: la cantidad baja **al registrar la entrega**, no al empacar (`RN-SOL-02`), y se **verifica dos veces** —al empacar y al entregar— porque un consumible puede agotarse entre las dos. El **alta** del consumible es del epic 04 (`US-ITE-02`); acá se fija la aritmética del stock.

#### AC-INV-04-1 — El stock de un consumible parte de la cantidad registrada en su alta

**Dado** un elemento consumible ya registrado en el catálogo con su unidad de medida y su cantidad inicial.
**Y** ese elemento sin ninguna unidad serializada.
**Cuando** el administrador consulta el inventario de consumibles.
**Entonces**:

- el inventario informa un stock igual a la cantidad inicial, expresado en la unidad de medida del consumible;
- el elemento figura en la lista de consumibles controlados por cantidad;
- no hay ninguna unidad serializada asociada al elemento.

`RN-INV-06` exige que la existencia de un consumible sea **una cantidad y cero unidades**. El criterio **lee** el dato que el alta del epic 04 registró y verifica la mitad que le toca a este epic: que el inventario informe la cantidad y que no haya unidades detrás.

#### AC-INV-04-2 — Un consumible no admite unidades serializadas

**Dado** un elemento consumible registrado con stock 100.
**Cuando** el administrador intenta registrar una unidad serializada de ese elemento.
**Entonces**:

- la operación se rechaza;
- el elemento no obtiene ninguna unidad serializada;
- su stock sigue siendo 100.

Aceptar una unidad serializada de un consumible crearía un segundo mecanismo de stock para el mismo elemento y volvería a contradecir la cantidad.

#### AC-INV-04-3 — El stock es la cantidad, no el conteo de unidades

**Dado** un elemento consumible registrado en el catálogo con cantidad 100.
**Y** ese elemento sin ninguna unidad serializada.
**Cuando** se consulta el stock del elemento.
**Entonces**:

- el stock informado es 100;
- el stock se informa en la unidad de medida del consumible;
- el elemento no aparece con stock 0.

Es el criterio que ataca el defecto de origen: contar unidades para todos los elementos deja en cero a todo consumible. El criterio exige el **efecto observable** —el stock informado es la cantidad— y no cómo se calcula.

#### AC-INV-04-4 — Registrar la entrega descuenta cantidad del stock; empacar no descuenta

**Dado** un elemento consumible con stock 100.
**Y** una solicitud que incluye 2 unidades de ese consumible.
**Cuando** el administrador empaca la solicitud.
**Entonces** el stock del consumible sigue siendo 100.

**Dado** un elemento consumible con stock 100.
**Y** una solicitud empaquetada que incluye 2 unidades de ese consumible.
**Cuando** el administrador registra la entrega de la solicitud.
**Entonces**:

- el stock del consumible queda en 98;
- el descuento ocurre al registrar la entrega, no al empacar;
- el descuento es una resta de cantidad, no una reserva por rango de fechas;
- no se crea ninguna unidad serializada;
- no queda ninguna reserva con fecha asociada al elemento.

`RN-INV-11` fija el **momento** además del hecho, y los dos escenarios se verifican en el mismo test: una cuenta que bajara al empacar describiría una salida que todavía no ocurrió, y una entrega que no descontara dejaría el número intacto después de que el consumible salió. La resta es en la unidad de medida del consumible (`RN-INV-12`). El efecto de la misma entrega sobre el estado de la solicitud es del epic 06.

#### AC-INV-04-5 — El stock no puede quedar negativo

**Dado** un elemento consumible con stock 10.
**Cuando** el administrador intenta registrar un consumo de 15 unidades.
**Entonces**:

- la operación se rechaza;
- el stock del elemento sigue siendo 10.

Un stock negativo no representa ninguna realidad física. Es el mismo límite que `AC-INV-04-8`, visto desde la aritmética.

#### AC-INV-04-6 — Cada consumible conserva su propia unidad de medida en el inventario

**Dado** dos consumibles registrados, cada uno con una unidad de medida distinta y su cantidad.
**Cuando** el administrador consulta el inventario de consumibles.
**Entonces**:

- cada consumible se informa con su propia unidad de medida;
- el stock de cada uno se expresa en la unidad de medida con la que se registró;
- ninguno se informa en la unidad de medida del otro.

No hay una unidad de medida única para todo el almacén (`RN-INV-12`), así que la unidad se fija **por consumible**. El criterio exige que el inventario **lea** cada stock en su propia unidad; el formato del campo no lo fija ninguna regla.

#### AC-INV-04-7 — Una cantidad decimal de un consumible se rechaza

**Dado** un elemento consumible con stock 100.
**Cuando** el administrador intenta registrar un consumo de una cantidad decimal de unidades.
**Entonces**:

- la operación se rechaza;
- la respuesta indica que la cantidad debe ser entera;
- el stock del elemento sigue siendo 100;
- no queda registrado ningún consumo.

`RN-INV-18` cubre el **tipo** de la cantidad. El criterio exige el rechazo **y** la ausencia de cambio en el stock: un consumo rechazado que igual descontara dejaría el inventario describiendo algo que no pasó.

#### AC-INV-04-8 — La entrega se rechaza si la cantidad del consumible ya no existe

**Dado** un elemento consumible con stock 2.
**Y** una solicitud que incluye 5 unidades de ese consumible.
**Cuando** el administrador intenta empacar la solicitud.
**Entonces**:

- la operación se rechaza;
- el stock del consumible sigue siendo 2.

**Dado** un elemento consumible con stock 2.
**Y** una solicitud empaquetada que incluye 5 unidades de ese consumible.
**Cuando** el administrador registra la entrega de la solicitud.
**Entonces**:

- la operación se rechaza;
- el stock del consumible sigue siendo 2;
- la solicitud no queda entregada.

`RN-INV-11` fija que el consumible **no se reserva**, así que entre el empaque y la entrega la cantidad puede cambiar: se verifica al empacar y se vuelve a verificar al entregar. Los dos escenarios son las dos verificaciones del mismo criterio y se verifican en el mismo test. Que la solicitud no quede entregada es el efecto de inventario de ese rechazo; su ciclo es del epic 06.

### US-INV-05 — Verificar la integridad de un conjunto para auditoría

**Como** administrador del almacén **quiero** consultar si un conjunto está completo, qué piezas le faltan y quién las tiene **para** poder responder una auditoría sobre el inventario sin ir físicamente al almacén.

**Prioridad:** alta — `RN-INV-10` es un requisito de auditoría: el conjunto se entrega completo (`RN-INV-02`) y hoy no hay forma de saber si lo está.
**Estado:** especificada — no ejecutada.

La consulta solo es posible porque `RN-INV-09` deja registrado lo que falta y `RN-INV-08` exige registro propio para la pieza que salió. `RN-PRE-02` es lo que convierte «qué falta» en «quién lo tiene»: toda salida ocurre por una **solicitud**. `RN-INV-24` separa la completitud **funcional** de la **documental** y `RN-INV-27` la evalúa de forma recursiva. Este epic **consulta** el estado del conjunto; verificar los componentes al empacar una solicitud es el epic 06.

#### AC-INV-05-1 — Un conjunto completo se informa como completo

**Dado** un equipo compuesto ensamblado con todos sus componentes obligatorios.
**Y** ese conjunto marcado como completo.
**Cuando** el administrador consulta la integridad de ese conjunto.
**Entonces**:

- el informe lo declara completo;
- no lista ningún componente obligatorio como faltante.

**Dado** un equipo compuesto ensamblado con todos sus componentes obligatorios.
**Y** un componente opcional de su composición que no está ensamblado.
**Cuando** el administrador consulta la integridad de ese conjunto.
**Entonces**:

- el informe lo declara completo;
- documenta que falta ese componente opcional;
- no lo informa como faltante que impida prestar el conjunto.

`RN-INV-10` exige informar si está completo, qué falta y quién lo tiene, y `RN-INV-24` especifica qué significa «completo»: un conjunto con todos sus obligatorios es **funcionalmente completo** y la ausencia de un **opcional** se **documenta** sin volverlo incompleto. El criterio no fija el formato del informe.

#### AC-INV-05-2 — Un conjunto con una pieza prestada suelta se informa como incompleto

**Dado** un equipo compuesto ensamblado.
**Y** uno de sus componentes obligatorios prestado por separado a un instructor.
**Y** el conjunto marcado como incompleto con el registro de qué pieza salió.
**Cuando** el administrador consulta la integridad de ese conjunto.
**Entonces**:

- el informe lo declara incompleto;
- lista ese componente como faltante;
- indica quién tiene esa pieza.

El «quién la tiene» se lee del préstamo que `RN-INV-08` exige registrar, y ese préstamo es una **solicitud**: el criterio exige el efecto —el informe nombra al tenedor—, no la forma del registro.

#### AC-INV-05-3 — Se listan los conjuntos funcionalmente incompletos del inventario

**Dado** un inventario con conjuntos completos y conjuntos a los que les falta al menos un componente obligatorio.
**Cuando** el administrador pide la lista de conjuntos incompletos.
**Entonces**:

- la lista contiene solo los conjuntos a los que les falta al menos un componente obligatorio;
- cada conjunto de la lista indica qué componentes obligatorios le faltan;
- los conjuntos completos no aparecen en la lista.

`RN-INV-10` fija la obligación de auditoría para cada conjunto y esta es la misma obligación leída para todo el inventario de una vez. La lista es de incompletos **funcionales**, que es la noción que `RN-INV-24` separa de la documental: un conjunto completo con un opcional ausente no entra acá y su ausencia ya queda documentada en `AC-INV-05-1`.

#### AC-INV-05-4 — La completitud se evalúa de forma recursiva

**Dado** un elemento compuesto A que contiene al compuesto B como componente obligatorio.
**Y** B contiene al componente obligatorio C.
**Y** la unidad de B ensamblada dentro de la unidad de A.
**Y** la unidad de C sin ensamblar dentro de la unidad de B.
**Cuando** el administrador consulta la integridad de A.
**Entonces**:

- el informe declara A incompleto;
- lista el componente C como faltante.

`RN-INV-27` confirma el anidamiento y la evaluación **recursiva**: sin la recursión, A se informaría completo por tener ensamblado a B y la auditoría presentaría un equipo al que le falta la pieza del segundo nivel. `RN-INV-41` (epic 04) prohíbe los ciclos, así que la evaluación termina siempre.

### US-INV-07 — Listar todas las unidades del inventario

**Como** administrador del almacén **quiero** ver en una sola lista todas las unidades del inventario, incluidas las que están dentro de un conjunto y las donadas **para** poder prestar una pieza suelta sin perder de vista el resto de lo que hay en el almacén.

**Prioridad:** alta — sin un listado completo no se encuentra la unidad que se necesita, esté suelta o dentro de un conjunto.
**Estado:** especificada — no ejecutada.

`RN-INV-16` fija la exigencia en dos direcciones: el listado **no oculta** los componentes de un conjunto y **no filtra** por tenencia, porque la auditoría presenta las dos (`RN-INV-07`). Con **1.000 a 1.500** equipos y elementos (`RN-CTX-02`) el listado es **paginado con su total**: un listado que devolviera todas las unidades no se puede leer ni recorrer. Este listado es distinto de la lista de conjuntos incompletos de `AC-INV-05-3`: aquella muestra solo incompletos, este muestra **todas** las unidades.

#### AC-INV-07-1 — Los componentes de un conjunto aparecen en el listado

**Dado** un equipo compuesto ensamblado con al menos un componente dentro.
**Cuando** el administrador consulta el listado de unidades del inventario.
**Entonces**:

- el listado incluye la unidad de ese componente;
- no la oculta por estar dentro de un conjunto.

Una pieza ensamblada no deja de ser inventario: sigue siendo una unidad con su serial y su responsable. Ocultarla haría que el listado describa menos de lo que existe, contra `RN-PRE-02`.

#### AC-INV-07-2 — Equipos del SENA y elementos donados en el mismo listado

**Dado** un inventario con unidades de equipos del SENA y unidades donadas.
**Cuando** el administrador consulta el listado de unidades del inventario.
**Entonces**:

- el listado incluye las unidades de las dos tenencias;
- no excluye ninguna unidad por su tenencia.

La distinción SENA / donado existe (`RN-INV-07`) y no es un filtro de negocio: las dos tenencias se auditan, aunque con consecuencias distintas ante una baja (`US-INV-08`).

#### AC-INV-07-3 — Cada unidad informa si está dentro de un conjunto

**Dado** un inventario con unidades sueltas y unidades que son componentes de un conjunto.
**Cuando** el administrador consulta el listado de unidades del inventario.
**Entonces**:

- cada unidad del listado indica si está dentro de un conjunto;
- las que están dentro indican de cuál conjunto;
- las que no están dentro no informan ningún conjunto.

Si el listado muestra **todas** las unidades, tiene que decir cuál está dentro y de cuál conjunto: sin eso, la fila de un componente sería indistinguible de la de una pieza suelta.

#### AC-INV-07-4 — Consumibles y equipos serializados se presentan en listas separadas

**Dado** un inventario con equipos serializados y con elementos consumibles registrados con cantidad.
**Cuando** el administrador consulta el listado de unidades del inventario.
**Entonces**:

- el listado de unidades incluye los equipos serializados;
- no incluye elementos consumibles;
- los consumibles se informan en una lista propia, por cantidad;
- esa lista propia no informa unidades serializadas.

No contradice a `RN-INV-16`: un consumible **no tiene unidades** (`RN-INV-06`), así que no hay nada que ocultar, sino dos formas de stock distintas. Mezclarlas obligaría a presentar un consumible como si fuera un serial.

#### AC-INV-07-5 — El listado de unidades es paginado y devuelve el total

**Dado** un inventario con más unidades registradas que el tamaño de página de la consulta.
**Y** un administrador con sesión iniciada.
**Cuando** el administrador consulta la primera página del listado de unidades.
**Entonces**:

- la respuesta es `200`;
- la consulta devuelve como máximo el tamaño de página de unidades;
- la consulta informa el total de unidades del inventario.

`RN-CTX-02` nombra el **inventario de unidades** entre los listados paginados con su total, y con ese volumen la paginación es un **bloqueo funcional**. La página es una porción de **todas** las unidades —las componentes y las dos tenencias incluidas— y el total las cuenta a todas. El tamaño de página y la forma de la respuesta no los fija este criterio.

### US-INV-08 — Dar de baja una unidad según su tenencia

**Como** administrador del almacén **quiero** dar de baja una unidad que se dañó y saber qué se conserva de ella según su tenencia **para** que deje de estar disponible sin perder el registro de lo que había en el inventario.

**Prioridad:** media — hoy no existe forma de retirar del inventario una unidad que se dañó, y la tenencia decide qué camino sigue la baja.
**Estado:** especificada — no ejecutada.

Las dos tenencias (`RN-INV-07`) tienen consecuencias distintas. Para una unidad **donada** la baja es **inmediata** y sin trámite (`RN-INV-14`); para una **del SENA** exige el trámite de `US-INV-09` (`RN-INV-19`). `RN-INV-17` exige **motivo y actor** en toda baja, y el dato de la tenencia se lee de la **unidad** y no del elemento (`RN-INV-20`). `RN-INV-13` fija la contraparte: ninguna unidad se pierde sin dejar registro.

#### AC-INV-08-1 — La baja de una unidad donada averiada se acepta

**Dado** un administrador con sesión iniciada.
**Y** una unidad donada averiada registrada en el inventario.
**Cuando** el administrador da de baja esa unidad.
**Entonces**:

- la operación se acepta;
- la unidad deja de estar disponible.

El criterio verifica el **efecto**, no la forma de la petición. Que la baja exija además motivo y actor es `AC-INV-08-4`.

#### AC-INV-08-2 — Una unidad dada de baja no puede usarse

**Dado** una unidad dada de baja.
**Cuando** se intenta asignarla a una solicitud.
**Entonces**:

- la operación se rechaza;
- la unidad no queda asignada a ninguna solicitud.

**Dado** una unidad dada de baja que es componente de un elemento compuesto.
**Cuando** el administrador intenta ensamblarla dentro de un equipo compuesto.
**Entonces**:

- la operación se rechaza;
- la unidad no queda registrada dentro de ningún equipo.

`RN-INV-39` confirma la conducta completa: una unidad dada de baja **no vuelve**, así que no se asigna ni se ensambla. Los dos escenarios son el mismo criterio y se verifican en el mismo test.

#### AC-INV-08-3 — La baja no borra el registro

**Dado** una unidad dada de baja.
**Cuando** el administrador consulta esa unidad en el inventario.
**Entonces**:

- la unidad sigue existiendo en el registro con su serial;
- figura como dada de baja;
- no figura como disponible.

Es la parte de auditoría de la baja: `RN-INV-17` exige motivo y actor, y eso solo se puede presentar si el registro se conserva; una baja que borra la fila no es auditable ni irreversible.

#### AC-INV-08-4 — La baja exige motivo y deja registrado al actor

**Dado** un administrador con sesión iniciada.
**Y** una unidad donada registrada y disponible.
**Cuando** el administrador da de baja esa unidad sin registrar el motivo.
**Entonces**:

- la operación se rechaza;
- la unidad no cambia de estado;
- la unidad sigue disponible.

**Dado** un administrador con sesión iniciada.
**Y** una unidad donada registrada y disponible.
**Cuando** el administrador da de baja esa unidad indicando el motivo.
**Entonces**:

- la operación se acepta;
- la baja queda registrada con el motivo;
- queda registrado el actor que la hizo;
- la unidad deja de estar disponible.

`RN-INV-17` es afirmativa: toda baja exige **motivo y actor**, queda registrada y es auditable, de modo que una baja sin motivo se rechaza sin dejar la unidad a medio camino. La misma regla fija que la baja **no se puede deshacer**.

#### AC-INV-08-5 — La pérdida de una unidad fuera de un préstamo queda registrada

**Dado** una unidad registrada en el inventario que no está prestada.
**Y** un administrador con sesión iniciada.
**Cuando** el administrador registra que esa unidad se perdió.
**Entonces**:

- la operación se acepta;
- la pérdida queda registrada como evento de pérdida, con el motivo y el actor que la declaró;
- la unidad sale del inventario activo y no se ofrece.

**Dado** una unidad del SENA con piezas sueltas y con el trámite de baja iniciado.
**Y** esa unidad declarada perdida.
**Cuando** el administrador entrega una de sus piezas sueltas a un instructor por una solicitud.
**Entonces**:

- la operación se acepta;
- el trámite de baja de la unidad sigue abierto, sin bloquear la pieza.

`RN-INV-13` cubre las dos tenencias y no distingue dónde estaba la unidad: ninguna se pierde **sin quedar registrada**. La pérdida de una unidad **prestada** es del epic 07; este criterio cubre la unidad que desaparece del depósito. Lo que cambia al declararla lo fija `RN-PRE-15`: **sale del inventario activo**, **no bloquea** disponibilidad y sus **piezas sueltas siguen prestables** mientras el trámite siga abierto. Los dos escenarios se verifican en el mismo test.

#### AC-INV-08-6 — Una unidad del SENA no se da de baja por el camino inmediato

**Dado** una unidad del SENA registrada y disponible.
**Y** un administrador con sesión iniciada.
**Cuando** el administrador intenta darla de baja por el camino inmediato.
**Entonces**:

- la operación se rechaza;
- la unidad no queda dada de baja;
- la unidad sigue registrada y disponible.

`RN-INV-14` tiene dos mitades y esta es la peligrosa: la baja **inmediata** es la de una unidad **donada**, mientras la de un equipo del SENA exige el trámite con confirmación (`US-INV-09`). Aceptarla sacaría del inventario un activo institucional sin trámite ni confirmación.

#### AC-INV-08-7 — Dos unidades del mismo elemento pueden tener tenencia distinta

**Dado** dos unidades del mismo elemento, una del SENA y una donada.
**Y** las dos registradas y disponibles.
**Cuando** el administrador da de baja la unidad donada.
**Entonces**:

- la baja se acepta;
- la unidad donada deja de estar disponible;
- la unidad del SENA sigue registrada y disponible.

`RN-INV-20` ubica la tenencia en la **unidad física**: si viviera en el catálogo, dar de baja la donada arrastraría a la del SENA o la del SENA heredaría la baja inmediata.

#### AC-INV-08-8 — Una unidad del SENA que deja de funcionar no desaparece del inventario

**Dado** un conjunto de equipos del SENA registrado para la auditoría.
**Y** una unidad del SENA de ese conjunto, registrada en el inventario en estado físico `OPERATIVO`.
**Y** la unidad deja de funcionar y el administrador registra su estado físico como `CON_FALLA`.
**Cuando** el administrador consulta el inventario y la presentación de auditoría de ese conjunto.
**Entonces**:

- la unidad sigue registrada en el inventario;
- sigue siendo consultable con su serial y su tenencia del SENA;
- conserva el estado físico `CON_FALLA`, que es una condición y no una salida del inventario;
- figura en la presentación de auditoría de ese conjunto;
- no se ofrece como disponible para préstamo.

`RN-INV-07` es la regla que separa las tenencias: los equipos del SENA no se pueden perder y, incluso averiados, se presentan completos en una auditoría. El criterio verifica las dos caras: la unidad sigue **consultable y presentable** y a la vez **no se presta**, porque lo que se presta en cada estado lo fija `RN-INV-31`. Dejar de funcionar es una **condición**, no una salida, igual que `RN-INV-25` fija para una pila agotada. `CON_FALLA` es el estado **reparable** de `RN-INV-36`.

#### AC-INV-08-9 — Un elemento del SENA nunca se informa como consumible

**Dado** un elemento del SENA ya registrado en el inventario, con sus unidades serializadas.
**Y** un administrador con sesión iniciada.
**Cuando** el administrador consulta el inventario de consumibles.
**Entonces**:

- ese elemento no aparece en la lista de consumibles controlados por cantidad;
- sus unidades serializadas siguen en el inventario de unidades.

**Dado** un elemento donado registrado en el catálogo como consumible, con su cantidad y su unidad de medida.
**Y** un administrador con sesión iniciada.
**Cuando** el administrador consulta el inventario de consumibles.
**Entonces**:

- el elemento aparece en la lista de consumibles controlados por cantidad;
- se informa con su cantidad y su unidad de medida;
- no tiene ninguna unidad serializada.

`RN-INV-46` fija la regla: un elemento del SENA **no** puede configurarse como consumible y solo uno **donado** puede serlo. Un elemento del SENA se presenta **completo** (`RN-INV-07`) y un consumible se descuenta y no vuelve (`RN-INV-11`), así que tratarlo como consumible dejaría el equipo presentándose incompleto. El **alta** y la clasificación del elemento son del epic 04 (`AC-ITE-02-4`); lo que se verifica acá es el **efecto** de esa clasificación sobre el inventario. El caso de las **pilas** lo describe `RN-INV-28`: se entregan y devuelven con el elemento y no pueden ser consumibles.

### US-INV-09 — Tramitar la baja de un equipo del SENA

**Como** administrador del almacén **quiero** iniciar y seguir el trámite de baja de un equipo del SENA **para** que la unidad quede dada de baja solo cuando se confirme, sin desaparecer del inventario mientras el trámite avanza.

**Prioridad:** media — `RN-INV-19`: la baja de un equipo del SENA no es instantánea y hoy no existe ningún estado que represente el trámite.
**Estado:** especificada — no ejecutada.

El trámite institucional **puede durar entre 6 meses y 1 año**, así que la baja no es una acción instantánea: hasta que se registre la confirmación, la unidad **no** queda dada de baja y **sigue en el inventario**. El trámite es un **proceso**, no un valor de la lista cerrada de estados físicos de `RN-INV-30`. `RN-INV-17` exige motivo y actor como en toda baja, `RN-INV-32` reserva la confirmación al administrador y `RN-INV-33` bloquea la unidad y sus piezas mientras el trámite está abierto. La **única excepción** la fija `RN-PRE-15`: si la unidad fue declarada perdida, el trámite es **solo administrativo**.

#### AC-INV-09-1 — Iniciar el trámite no da de baja la unidad

**Dado** un administrador con sesión iniciada.
**Y** una unidad registrada que es propiedad del SENA.
**Cuando** el administrador inicia el trámite de baja de esa unidad.
**Entonces**:

- la operación se acepta;
- la unidad queda con el trámite de baja iniciado;
- el trámite queda registrado como abierto;
- la unidad no queda dada de baja.

`RN-INV-19` distingue **en trámite** de **dada de baja**. Los pasos internos del trámite no los fija ninguna regla.

#### AC-INV-09-2 — La unidad en trámite sigue en el inventario

**Dado** una unidad del SENA con el trámite de baja iniciado.
**Cuando** el administrador consulta el inventario.
**Entonces**:

- la unidad sigue apareciendo en el listado de unidades;
- la unidad sigue siendo consultable;
- el trámite no la borra ni la oculta del inventario.

Ocultarla durante meses equivaldría a darla de baja sin confirmación, que es lo que `RN-INV-19` prohíbe. Que además no se pueda prestar, ni ella ni sus piezas, lo fija `AC-INV-09-6`.

#### AC-INV-09-3 — La baja solo se efectiviza con la confirmación

**Dado** una unidad del SENA con el trámite de baja iniciado.
**Y** que todavía no se registró ninguna confirmación.
**Cuando** se consulta el estado de esa unidad.
**Entonces**:

- la unidad sigue con el trámite de baja abierto;
- la unidad no pasa a estar dada de baja.

**Dado** una unidad del SENA con el trámite de baja iniciado.
**Cuando** se registra la confirmación de esa baja.
**Entonces**:

- la unidad pasa a estar dada de baja;
- la unidad deja de estar disponible.

Los dos escenarios son el mismo criterio: la confirmación es lo que separa el trámite de la baja efectiva. **Quién** la registra lo fija `RN-INV-32` (`AC-INV-09-5`); la evidencia que la respalda no la fija ninguna regla.

#### AC-INV-09-4 — El trámite registra motivo y actor, y la confirmación registra quién la otorga

**Dado** un administrador con sesión iniciada.
**Y** una unidad del SENA registrada.
**Cuando** el administrador inicia el trámite de baja sin registrar el motivo.
**Entonces**:

- la operación se rechaza;
- la unidad no cambia de estado;
- no queda ningún trámite de baja registrado.

**Dado** un administrador con sesión iniciada.
**Y** una unidad del SENA registrada.
**Cuando** el administrador inicia el trámite de baja indicando el motivo.
**Entonces**:

- el trámite queda registrado con el motivo;
- queda registrado el actor que lo inicia;
- cuando se registra la confirmación, queda registrado quién la otorga.

`RN-INV-17` vale para toda baja. En un trámite de hasta un año el actor que lo inicia y el que lo confirma son datos distintos y los dos tienen que quedar escritos, porque `RN-PRE-02` pide poder responder siempre quién hizo qué y cuándo. El criterio exige el **efecto**, no la forma de guardarlos.

#### AC-INV-09-5 — La confirmación de la baja la registra el administrador

**Dado** un administrador con sesión iniciada.
**Y** una unidad del SENA con el trámite de baja iniciado.
**Cuando** el administrador registra la confirmación de esa baja.
**Entonces**:

- la operación se acepta;
- la confirmación queda registrada con el administrador que la registró;
- la unidad pasa a estar dada de baja.

**Dado** un instructor con sesión iniciada.
**Y** una unidad del SENA con el trámite de baja iniciado.
**Cuando** envía la petición de registrar la confirmación de esa baja.
**Entonces**:

- la respuesta es `403`;
- no queda ninguna confirmación registrada;
- la unidad permanece en trámite de baja.

`RN-INV-32` reserva la confirmación al **administrador**, y no como autorización de la baja: el trámite es **externo**, así que confirmar equivale a **registrar que el proceso concluyó**. Que el instructor no pueda hacerlo es la misma regla de actores de `RN-CTX-05` que impide el alta de unidades.

#### AC-INV-09-6 — Una unidad en trámite de baja no se presta, ni por piezas

**Dado** una unidad del SENA en estado físico `OPERATIVO`.
**Y** esa unidad con el trámite de baja iniciado.
**Cuando** se intenta prestar esa unidad como unidad.
**Entonces**:

- la operación se rechaza;
- la unidad no queda asignada a ningún préstamo.

**Dado** una unidad del SENA en estado físico averiado.
**Y** esa unidad con el trámite de baja iniciado.
**Y** una pieza suelta de esa unidad que podría prestarse por separado.
**Cuando** el administrador intenta prestar esa pieza suelta.
**Entonces**:

- la operación se rechaza;
- la pieza no queda asignada a ningún préstamo;
- la unidad y la pieza siguen en el inventario.

`RN-INV-33` bloquea la unidad **y sus piezas sueltas** mientras el trámite está abierto, y **prevalece** sobre `RN-INV-31`. Cada escenario usa el estado en el que el contraste se ve: la unidad `OPERATIVO` se prestaría como unidad, y de una **averiada** `RN-INV-31` sí prestaría sus piezas (`AC-INV-10-5`). La única excepción es la unidad **declarada perdida** (`AC-INV-09-7`).

#### AC-INV-09-7 — Una unidad declarada perdida no bloquea nada y sus piezas siguen prestables

**Dado** una unidad del SENA con el trámite de baja iniciado.
**Y** esa unidad declarada perdida.
**Cuando** el administrador consulta el inventario de unidades.
**Entonces**:

- la unidad no figura en el inventario activo;
- el trámite de baja sigue abierto como trámite administrativo.

**Dado** una unidad del SENA con piezas sueltas y con el trámite de baja iniciado.
**Y** esa unidad declarada perdida.
**Cuando** el administrador entrega una de sus piezas sueltas a un instructor por una solicitud.
**Entonces**:

- la operación se acepta;
- el trámite de baja abierto no bloquea la pieza.

`RN-PRE-15` fija la **excepción** a `RN-INV-33`: la unidad perdida **sale del inventario activo**, **no bloquea** disponibilidad y sus **piezas sueltas siguen prestables**, porque lo que se perdió es la unidad y no sus componentes. Es la **única** excepción y no se extiende a ningún otro caso de trámite abierto. La pérdida queda registrada con motivo y actor (`RN-INV-13`, `RN-INV-17`) y **cierra lo que esa unidad tenía pendiente** en la solicitud (`RN-SOL-12`); el cierre de la solicitud es del epic 07.

### US-INV-10 — Registrar el estado físico de una unidad

**Como** administrador del almacén **quiero** registrar el estado físico de cada unidad **para** saber cuáles se pueden prestar como equipo y cuáles solo se pueden prestar por piezas.

**Prioridad:** alta — sin estado físico el inventario no puede decir qué se puede prestar, y `RN-INV-25` separa presencia de funcionamiento.
**Estado:** especificada — no ejecutada.

El estado físico dice **cómo está** la unidad, no **dónde está**. `RN-INV-25` separa **presencia** y **funcionamiento**: una unidad presente pero agotada o descargada **no es faltante** y sigue en el inventario. `RN-INV-30` fija los seis estados y `RN-INV-31` qué se puede prestar en cada uno, en dos planos: la unidad **como unidad** y sus **piezas sueltas**. `CON_FALLA` y `AVERIADO` prestan igual y se distinguen por lo que se hace con el equipo (`RN-INV-36`). Solo el administrador escribe el estado (`RN-INV-43`), y el trámite de baja no es un estado físico: mientras está abierto lo bloquea todo (`RN-INV-33`).

#### AC-INV-10-1 — Una unidad operativa se presta como unidad

**Dado** una unidad registrada en estado físico `OPERATIVO`.
**Y** esa unidad disponible.
**Cuando** se asigna esa unidad a una solicitud.
**Entonces**:

- la operación se acepta;
- la unidad queda registrada como entregada a quien la recibe;
- el estado físico de la unidad sigue siendo `OPERATIVO`.

Prestar **no cambia** el estado físico: el estado describe cómo está la unidad y la disponibilidad describe dónde está, que es la distinción de `RN-INV-25`.

#### AC-INV-10-2 — Una unidad descargada o agotada no se presta, ni como unidad ni por piezas

**Dado** una unidad en estado físico `DESCARGADO_AGOTADO`.
**Y** esa unidad sigue registrada en el inventario.
**Cuando** se intenta prestar esa unidad como unidad.
**Entonces**:

- la operación se rechaza;
- la unidad no queda asignada a ningún préstamo;
- la unidad sigue en el inventario con su estado físico.

**Dado** una unidad en estado físico `DESCARGADO_AGOTADO`.
**Y** una pieza suelta de esa unidad que podría prestarse por separado.
**Cuando** el administrador intenta prestar esa pieza suelta.
**Entonces**:

- la operación se rechaza;
- la pieza no queda asignada a ningún préstamo;
- la pieza sigue en el inventario.

`RN-INV-31` cierra los dos planos para este estado. Los dos escenarios se verifican en el mismo test. El escenario de la unidad agrega el efecto de `RN-INV-25`: el rechazo no la saca del inventario, porque agotarse es condición y no ausencia.

#### AC-INV-10-3 — Una unidad con falla no se presta como unidad, pero sus piezas sueltas sí

**Dado** una unidad en estado físico `CON_FALLA`.
**Cuando** se intenta prestar esa unidad como unidad.
**Entonces**:

- la operación se rechaza;
- la unidad no queda asignada a ningún préstamo;
- la unidad sigue en el inventario con su estado físico.

**Dado** una unidad en estado físico `CON_FALLA`.
**Y** una pieza suelta de esa unidad.
**Y** un instructor registrado.
**Cuando** el administrador entrega esa pieza suelta al instructor por una solicitud.
**Entonces**:

- la operación se acepta;
- la pieza queda registrada como prestada a ese instructor;
- queda registrada la fecha desde la que la tiene;
- el estado físico de la unidad no cambia.

Es la respuesta que separa este estado de los demás: la unidad **no** se presta y sus **piezas sueltas sí**. El segundo escenario verifica el registro que `RN-PRE-02` exige —quién la tiene y desde cuándo—, y ese registro lo produce la **solicitud** por la que sale la pieza. `RN-INV-36` precisa por qué: `CON_FALLA` es el estado **reparable** y sus piezas pueden seguir circulando.

#### AC-INV-10-4 — Una unidad en mantenimiento no se presta, ni como unidad ni por piezas

**Dado** una unidad en estado físico `EN_MANTENIMIENTO`.
**Cuando** se intenta prestar esa unidad como unidad.
**Entonces**:

- la operación se rechaza;
- la unidad no queda asignada a ningún préstamo;
- la unidad sigue en el inventario con su estado físico.

**Dado** una unidad en estado físico `EN_MANTENIMIENTO`.
**Y** una pieza suelta de esa unidad que podría prestarse por separado.
**Cuando** el administrador intenta prestar esa pieza suelta.
**Entonces**:

- la operación se rechaza;
- la pieza no queda asignada a ningún préstamo;
- la pieza sigue en el inventario.

`RN-INV-31` cierra también los dos planos: en mantenimiento no se presta la unidad **ni** sus piezas. Cuánto dura el mantenimiento y quién lo ejecuta no lo fija ninguna regla.

#### AC-INV-10-5 — Una unidad averiada no se presta como unidad, pero sus piezas sueltas sí

**Dado** una unidad en estado físico `AVERIADO`.
**Cuando** se intenta prestar esa unidad como unidad.
**Entonces**:

- la operación se rechaza;
- la unidad no queda asignada a ningún préstamo;
- la unidad sigue en el inventario con su estado físico.

**Dado** una unidad en estado físico `AVERIADO`.
**Y** una pieza suelta de esa unidad.
**Y** un instructor registrado.
**Cuando** el administrador entrega esa pieza suelta al instructor por una solicitud.
**Entonces**:

- la operación se acepta;
- la pieza queda registrada como prestada a ese instructor;
- queda registrada la fecha desde la que la tiene;
- el estado físico de la unidad no cambia.

La misma conducta que `AC-INV-10-3`, y los dos escenarios se verifican en el mismo test. `RN-INV-36` precisa que `AVERIADO` es el estado **no reparable**, que entra al trámite de baja; mientras ese trámite está abierto, `RN-INV-33` bloquea también las piezas y eso prevalece sobre este criterio.

#### AC-INV-10-6 — Un estado físico fuera de la lista cerrada se rechaza

**Dado** una unidad registrada en el inventario con su estado físico actual.
**Y** un administrador con sesión iniciada.
**Cuando** el administrador intenta registrar para esa unidad un estado que no está entre los seis de la lista cerrada.
**Entonces**:

- la operación se rechaza;
- el estado físico de la unidad no cambia;
- la unidad sigue en el estado que tenía.

`RN-INV-30` fija los estados como **lista cerrada**, y una lista cerrada que acepta valores nuevos no lo es: cada valor inventado dejaría una unidad con una conducta de préstamo que ninguna regla define. El paso por mantenimiento no necesita un valor nuevo: usa `EN_MANTENIMIENTO`, que ya está en la lista (`US-INV-12`).

#### AC-INV-10-7 — El instructor no puede cambiar el estado físico de una unidad

**Dado** una unidad registrada en estado físico `OPERATIVO`.
**Y** un instructor con sesión iniciada.
**Cuando** el instructor envía la petición de registrar para esa unidad el estado físico `AVERIADO`.
**Entonces**:

- la respuesta es `403`;
- el estado físico de la unidad sigue siendo `OPERATIVO`;
- la unidad no queda en averiado.

`RN-INV-43` reserva al **administrador** todo cambio de estado físico, y la frontera es la de `RN-CTX-05`: el instructor solicita, recoge y devuelve. El criterio exige el rechazo **y** que la unidad conserve su estado, porque un cambio aceptado alteraría qué se puede prestar de ella (`RN-INV-31`).

### US-INV-11 — Registrar y consultar la ubicación de una unidad

**Como** administrador del almacén **quiero** registrar y consultar dónde está cada unidad **para** saber a qué ambiente fue a parar un equipo que salió hace más de un mes, sin depender de mi memoria.

**Prioridad:** alta — `RN-CTX-07`: hay elementos que se van por más de un mes y, con el tiempo, el administrador olvida dónde quedaron.
**Estado:** especificada — no ejecutada.

`RN-CTX-07` convierte esa memoria en un dato: cada unidad tiene una **ubicación actual** registrada y consultable. `RN-CTX-04` da a `Environment` su propósito —el **destino** donde el equipo queda, no un segundo inventario— y `RN-CTX-03` mantiene una sola ubicación de inventario, el Ambiente 104, que es la ubicación por defecto de una unidad nueva (`RN-CTX-08`). La ubicación dice **dónde** está; el estado físico dice **cómo** está (`US-INV-10`), y la consulta informa las dos. El registro del cambio no es una bitácora de movimientos.

#### AC-INV-11-1 — Toda unidad tiene una ubicación actual y por defecto es el Ambiente 104

**Dado** un administrador con sesión iniciada.
**Y** un elemento serializado registrado.
**Cuando** el administrador registra una unidad de ese elemento sin indicar otra ubicación.
**Entonces**:

- la operación se acepta;
- la unidad queda con una ubicación actual registrada;
- esa ubicación actual es el Ambiente 104.

`RN-CTX-08` confirma las dos mitades: la ubicación es **obligatoria** y la de una unidad nueva es el **Ambiente 104**, que `RN-CTX-03` fija como única ubicación de inventario hasta que un traslado la cambie. El criterio exige el **efecto**, no si la ubicación se guarda como referencia o como texto.

#### AC-INV-11-2 — El administrador cambia la ubicación de una unidad

**Dado** una unidad cuya ubicación actual es el Ambiente 104.
**Y** un ambiente de destino registrado, distinto del 104.
**Cuando** el administrador cambia la ubicación de esa unidad indicando ese ambiente de destino.
**Entonces**:

- la operación se acepta;
- la ubicación actual de la unidad pasa a ser el ambiente indicado;
- el cambio de ubicación queda registrado.

Si el cambio no quedara registrado, el sistema seguiría diciendo que la unidad está en el 104 cuando ya no está: el mismo olvido que `RN-CTX-07` quiere eliminar.

#### AC-INV-11-3 — Al consultar una unidad se informa su ubicación actual junto con su estado físico

**Dado** una unidad registrada cuya ubicación actual es el Ambiente 104.
**Y** esa unidad en estado físico `OPERATIVO`.
**Cuando** el administrador consulta esa unidad.
**Entonces**:

- la consulta informa la ubicación actual de la unidad;
- la consulta informa el estado físico de la unidad;
- la ubicación informada es el Ambiente 104.

Una consulta que no informe dónde está deja el dato escrito pero inaccesible. El estado físico acompaña porque son las dos preguntas distintas del inventario —**dónde** y **cómo**—, tal como separa `RN-INV-25`.

#### AC-INV-11-4 — Se puede consultar qué unidades están en un ambiente

**Dado** un inventario con unidades cuya ubicación actual es el Ambiente 104.
**Y** unidades cuya ubicación actual es otro ambiente.
**Cuando** el administrador consulta qué unidades están en ese otro ambiente.
**Entonces**:

- la consulta devuelve las unidades cuya ubicación actual es ese ambiente;
- no devuelve las unidades que siguen en el Ambiente 104.

`RN-CTX-10` confirma la consulta **por ambiente**, y este criterio es la mitad de **cuáles**: saber que *una* unidad se fue no resuelve el olvido, hace falta preguntar **qué hay en un ambiente**. La otra mitad —**cuántas**— es el conteo del epic 03 (`AC-AMB-02-2`): el epic 03 informa la cifra y este la lista, y las dos lecturas salen de la misma regla. La forma de la pantalla y el orden de los resultados no los fija el criterio.

#### AC-INV-11-5 — Una unidad prestada informa la ubicación donde fue llevada

**Dado** una unidad cuya ubicación actual es el Ambiente 104.
**Y** esa unidad entregada en un préstamo vigente y llevada a otro ambiente.
**Cuando** el administrador consulta esa unidad.
**Entonces**:

- la ubicación informada es el ambiente donde fue llevada;
- la ubicación informada no es el Ambiente 104.

`RN-CTX-08` confirma que la ubicación **se actualiza** al llevarse la unidad a otro ambiente, y `RN-CTX-04` explica por qué importa: el ambiente es el **destino** donde el equipo queda durante el préstamo. Una ubicación que no se actualiza convertiría el registro de `RN-CTX-07` en un dato viejo.

### US-INV-12 — Enviar a reparación y devolver del mantenimiento

**Como** administrador del almacén **quiero** enviar a mantenimiento un equipo que tiene falla y, cuando vuelve, decidir su nuevo estado físico **para** que un equipo reparable vuelva a estar disponible en lugar de quedarse quieto o entrar al trámite de baja sin motivo.

**Prioridad:** alta — `RN-INV-36` distingue el equipo reparable del no reparable y ningún criterio decía qué se hace con un equipo `CON_FALLA`.
**Estado:** especificada — no ejecutada.

`RN-INV-36` separó dos estados que prestan **igual** por lo que **se hace con el equipo**, y `RN-INV-42` convierte esa distinción en un flujo: el administrador **envía a mantenimiento** el equipo con falla y **decide el nuevo estado** cuando vuelve; un equipo averiado **no** se envía y entra al trámite de baja. El regreso usa el vocabulario cerrado de `RN-INV-30` y la disponibilidad que resulta la fija `RN-INV-31` según el estado asignado. `RN-INV-43` reserva las dos transiciones al administrador.

#### AC-INV-12-1 — El administrador envía a mantenimiento un equipo con falla

**Dado** una unidad en estado físico `CON_FALLA`.
**Y** un administrador con sesión iniciada.
**Cuando** el administrador envía esa unidad a mantenimiento.
**Entonces**:

- la operación se acepta;
- la unidad queda en estado físico `EN_MANTENIMIENTO`;
- sus piezas sueltas dejan de prestarse mientras la unidad está en mantenimiento.

El criterio exige el **cambio** que la transición produce: la unidad ya no se prestaba como unidad en `CON_FALLA` (`AC-INV-10-3`), así que lo que cambia es que **sus piezas sueltas dejan de prestarse**, la conducta que verifica `AC-INV-10-4`.

#### AC-INV-12-2 — Al volver del mantenimiento el administrador decide el nuevo estado

**Dado** una unidad en estado físico `EN_MANTENIMIENTO`.
**Y** un administrador con sesión iniciada.
**Cuando** el administrador registra el regreso del mantenimiento y le asigna el estado `OPERATIVO`.
**Entonces**:

- la operación se acepta;
- la unidad queda en estado físico `OPERATIVO`;
- la unidad vuelve a estar disponible.

**Dado** una unidad en estado físico `EN_MANTENIMIENTO`.
**Y** un administrador con sesión iniciada.
**Cuando** el administrador registra el regreso del mantenimiento y le asigna el estado `AVERIADO`.
**Entonces**:

- la operación se acepta;
- la unidad queda en estado físico `AVERIADO`;
- la unidad no se presta como unidad;
- sus piezas sueltas se prestan.

El **regreso** es una operación del administrador y el **estado** lo **decide** él: `RN-INV-42` no dice que el equipo vuelva operativo. La disponibilidad no la otorga haber vuelto del mantenimiento sino el estado asignado, y es la tabla de `RN-INV-31` la que decide qué se presta en cada uno. Los dos escenarios se verifican en el mismo test.

#### AC-INV-12-3 — Un equipo averiado no se envía a mantenimiento

**Dado** una unidad en estado físico `AVERIADO`.
**Y** un administrador con sesión iniciada.
**Cuando** el administrador intenta enviarla a mantenimiento.
**Entonces**:

- la operación se rechaza;
- la unidad sigue en estado físico `AVERIADO`;
- la unidad no queda en mantenimiento.

`RN-INV-42` nombra el destino de cada estado: el `CON_FALLA` va a mantenimiento y el `AVERIADO` entra al trámite de baja (`US-INV-09`). Aceptar el envío de un averiado lo sacaría de la lista de equipos que esperan el trámite sin ninguna de las dos vías.

#### AC-INV-12-4 — Solo el administrador cambia el estado físico

**Dado** una unidad en estado físico `CON_FALLA`.
**Y** un instructor con sesión iniciada.
**Cuando** el instructor intenta enviarla a mantenimiento.
**Entonces**:

- la respuesta es `403`;
- la unidad sigue en estado físico `CON_FALLA`.

`RN-INV-43` no admite excepciones, y es la misma frontera de `RN-CTX-05`. El criterio exige el rechazo **y** que la unidad no cambie, porque un cambio de estado alteraría qué se puede prestar de ella.

### US-INV-13 — Consultar las alertas de stock bajo

**Como** administrador del almacén **quiero** ver la lista de elementos cuya cantidad disponible está en su umbral mínimo o por debajo **para** reponerlos antes de que un instructor los pida y no haya.

**Prioridad:** media — hoy no existe ninguna alerta: un consumible puede quedar en cero sin que nadie lo note hasta que el instructor lo pide.
**Estado:** especificada — no ejecutada.

`RN-INV-11` fija que la cantidad de un consumible **baja al registrar la entrega** y ninguna regla agrega cantidad por reposición, así que sin alerta el descuento es irreversible hasta que alguien descubre el faltante. `RN-INV-44` compara la **cantidad disponible de hoy** —sin rango de fechas— contra el **umbral mínimo del elemento** y alerta cuando queda en el umbral **o por debajo**. No usa la disponibilidad por rango, así que no entra en conflicto con `RN-CAT-04`. El **atributo** `minStock` se declara en el alta del elemento (epic 04, `AC-ITE-02-5`) y su **valor** lo fija el **administrador** por elemento, sin valor por defecto; esta historia **lee** ese dato. `RN-PAN-02` cierra la otra mitad: el número del panel del epic 12 se calcula con la misma regla que esta lista, y esa igualdad se verifica en `AC-PAN-01-4`.

#### AC-INV-13-1 — Se listan los elementos en su umbral mínimo o por debajo

**Dado** un elemento cuyo umbral mínimo es 5 y cuya cantidad disponible hoy es 5.
**Y** otro elemento cuyo umbral mínimo es 5 y cuya cantidad disponible hoy es 2.
**Y** un administrador con sesión iniciada.
**Cuando** el administrador consulta las alertas de stock bajo.
**Entonces**:

- la lista incluye los dos elementos;
- la comparación se hace contra la cantidad disponible de hoy, sin rango de fechas;
- cada elemento de la lista informa su cantidad disponible y su umbral mínimo.

`RN-INV-44` compara dos números del **hoy**, y el escenario incluye el **borde**: una cantidad **igual** al umbral genera alerta. Cada fila informa la cantidad y el umbral porque con un umbral distinto por elemento, sin los dos números, la alerta no dice cuánto reponer. Que la comparación no use rango es lo que la separa de `RN-CAT-04`, la disponibilidad por fechas del epic 08.

#### AC-INV-13-2 — Un elemento por encima de su umbral no aparece

**Dado** un elemento cuyo umbral mínimo es 5 y cuya cantidad disponible hoy es 6.
**Y** un administrador con sesión iniciada.
**Cuando** el administrador consulta las alertas de stock bajo.
**Entonces** ese elemento no aparece en la lista.

Es la mitad negativa de la misma regla y la que evita que la alerta se vuelva ruido: si todo elemento apareciera, la lista dejaría de ser una alerta. El par con `AC-INV-13-1` fija el corte exacto.

## Errores y mensajes

| Situación | HTTP | Código | Mensaje |
|-----------|------|--------|---------|
| Alta de una unidad con un serial ya registrado | `409` | No lo fija ninguna regla | Identifica el serial como ya registrado; sin unidad creada |
| Alta de una unidad con serial vacío o de solo espacios | `400` | No lo fija ninguna regla | La respuesta indica que el **serial es obligatorio**; sin unidad creada |
| Alta de una unidad para un elemento inexistente | `404` | No lo fija ninguna regla | No lo fija ninguna regla; sin unidad creada |
| Alta de una unidad con sesión de instructor | `403` | No lo fija ninguna regla (el epic 01 usa `FORBIDDEN`) | No lo fija ninguna regla; sin efectos |
| Ensamblaje con un componente ajeno, ya ensamblado en otro equipo o prestado | No lo fija ninguna regla | No lo fija ninguna regla | No lo fija ninguna regla; ninguna unidad del lote queda ensamblada |
| Desensamblaje de un conjunto con préstamo vigente o reserva activa | No lo fija ninguna regla | No lo fija ninguna regla | No lo fija ninguna regla; el ensamblaje y el compromiso quedan como estaban |
| Consumo con cantidad decimal | No lo fija ninguna regla | No lo fija ninguna regla | La respuesta indica que la **cantidad debe ser entera**; el stock no cambia |
| Consumo que dejaría el stock negativo | No lo fija ninguna regla | No lo fija ninguna regla | No lo fija ninguna regla; el stock no cambia |
| Empacar o entregar cuando la cantidad del consumible ya no existe | No lo fija ninguna regla | No lo fija ninguna regla | No lo fija ninguna regla; el stock no cambia y la solicitud no queda entregada |
| Alta de una unidad serializada de un consumible | No lo fija ninguna regla | No lo fija ninguna regla | No lo fija ninguna regla; sin unidad creada y sin cambio de stock |
| Asignar a una solicitud o ensamblar una unidad dada de baja | No lo fija ninguna regla | No lo fija ninguna regla | No lo fija ninguna regla; sin efectos |
| Baja inmediata sin motivo | No lo fija ninguna regla | No lo fija ninguna regla | No lo fija ninguna regla; la unidad sigue disponible |
| Baja inmediata de una unidad del SENA | No lo fija ninguna regla | No lo fija ninguna regla | No lo fija ninguna regla; la unidad sigue registrada y disponible |
| Inicio del trámite de baja sin motivo | No lo fija ninguna regla | No lo fija ninguna regla | No lo fija ninguna regla; sin trámite registrado |
| Confirmación de la baja con sesión de instructor | `403` | No lo fija ninguna regla (el epic 01 usa `FORBIDDEN`) | No lo fija ninguna regla; sin confirmación y la unidad sigue en trámite |
| Cambio de estado físico con sesión de instructor | `403` | No lo fija ninguna regla (el epic 01 usa `FORBIDDEN`) | No lo fija ninguna regla; la unidad conserva su estado |
| Estado físico fuera de la lista cerrada | No lo fija ninguna regla | No lo fija ninguna regla | No lo fija ninguna regla; la unidad conserva el estado que tenía |
| Envío a mantenimiento de un equipo averiado | No lo fija ninguna regla | No lo fija ninguna regla | No lo fija ninguna regla; la unidad sigue averiada |
| Operación de escritura del inventario sin credencial | `401` | No lo fija ninguna regla (epic 01, `AC-AUTH-05-2`) | No lo fija ninguna regla; sin efectos sobre datos |

Las únicas exigencias de mensaje del epic son las de `AC-INV-01-2`, `AC-INV-01-3` y `AC-INV-04-7`: que la respuesta identifique el serial como ya registrado, indique que el serial es obligatorio e indique que la cantidad debe ser entera. Ninguna regla fija el texto literal de los demás rechazos: lo exigido es el rechazo y su ausencia de efectos.

## Sesión y seguridad

| Efecto | Regla | Dónde se verifica |
|--------|-------|-------------------|
| Escribir el inventario —alta de unidad, ensamblaje, estado físico, ubicación, baja y mantenimiento— exige sesión con rol de administrador | `RN-CTX-05` | `AC-INV-01-5`, `AC-INV-09-5`, `AC-INV-10-7`, `AC-INV-12-4` |
| La escritura con sesión de instructor responde `403` sin efectos | `RN-CTX-05` | `AC-INV-01-5`, `AC-INV-09-5`, `AC-INV-10-7`, `AC-INV-12-4` |
| Solo el administrador cambia el estado físico de una unidad | `RN-INV-43` | `AC-INV-10-7`, `AC-INV-12-4` |
| Solo el administrador registra la confirmación de la baja de un equipo del SENA | `RN-INV-32` | `AC-INV-09-5` |
| Toda baja queda registrada con el actor que la hizo y no se puede deshacer | `RN-INV-17` | `AC-INV-08-4`, `AC-INV-09-4` |
| Una operación de escritura sin credencial no es una operación de ningún actor: recibe `401` | Epic 01 (`AC-AUTH-05-2`) | — |
| No hay un tercer rol que escriba el inventario: el administrador **es** un instructor | `RN-CTX-05` | `AC-INV-01-5`, `AC-INV-10-7` |
| El instructor figura como tenedor de la unidad o de la pieza suelta que se consulta, no como escritor | `RN-PRE-02` | `AC-INV-05-2`, `AC-INV-10-3`, `AC-INV-10-5` |

Ninguna regla de este epic fija plazos de sesión ni efectos del inventario sobre las credenciales: dar de alta una unidad, cambiar un estado o dar de baja no cierra sesiones. El contrato de sesión es del epic 01, y la lectura del catálogo y de la disponibilidad por parte del instructor es el epic 08.

## Decisiones tomadas

| Decisión | Regla | Responde a |
|----------|-------|------------|
| La unidad nace `OPERATIVO` y «disponible» **no** es un estado físico: la disponibilidad es la conclusión del estado, la reserva y el préstamo | `RN-INV-30` | `OPEN-INV-18` |
| El serial es único y obligatorio, y una unidad física no puede estar en dos equipos a la vez | `Estándar` | — |
| El ensamblaje parcial se acepta y el conjunto queda marcado como incompleto, con trazabilidad de lo que falta | `RN-INV-03`, `RN-INV-09` | — |
| Un componente de un conjunto ensamblado se presta por separado con registro propio: el ensamblaje no es un candado | `RN-INV-08` | `OPEN-INV-01` |
| El compromiso de un conjunto alcanza a sus componentes: la misma unidad no se cuenta dos veces | `RN-INV-01` | — |
| Con préstamo vigente o reserva activa no se desensambla | `RN-INV-38` | — |
| Un consumible es una cantidad con unidad de medida propia, sin unidades, y la cantidad es entera | `RN-INV-06`, `RN-INV-12`, `RN-INV-18` | — |
| La cantidad del consumible baja al registrar la entrega, no al empacar, y se verifica en los dos momentos | `RN-INV-11`, `RN-SOL-02` | `OPEN-SOL-06` |
| Un consumible no entra al flujo de devolución y nunca lleva condición de retorno | `RN-INV-06`, `RN-PRE-10` | — |
| Completitud funcional y documental son distintas: un opcional ausente no impide prestar y queda documentado | `RN-INV-24`, `RN-INV-10` | `OPEN-INV-13` |
| La completitud se evalúa de forma recursiva y la composición no forma ciclos | `RN-INV-27`, `RN-INV-41` | `OPEN-INV-16` |
| Presencia y funcionamiento son condiciones distintas: agotarse es una condición, no una salida del inventario | `RN-INV-25` | `OPEN-INV-15`, `OPEN-INV-27` |
| Los estados físicos son una lista cerrada de seis y solo el administrador la escribe | `RN-INV-30`, `RN-INV-43` | `OPEN-INV-18` |
| El aparato de un kit se presta solo, sin sus accesorios, aunque su unidad esté descargada | `RN-INV-26` | `OPEN-INV-26` |
| La tenencia vive en la **unidad física** —y en el **elemento** solo para los consumibles—, así que dos unidades del mismo elemento pueden diferir | `RN-INV-20` | `OPEN-INV-09` |
| La baja de una unidad donada es inmediata, con motivo y actor; la del SENA es un trámite con confirmación del administrador | `RN-INV-14`, `RN-INV-17`, `RN-INV-19`, `RN-INV-32` | `OPEN-INV-11` |
| Mientras el trámite de baja está abierto la unidad y sus piezas sueltas no se prestan | `RN-INV-33` | `OPEN-INV-12` |
| Una unidad declarada perdida sale del inventario activo, no bloquea y deja sus piezas prestables: es la **única** excepción al bloqueo del trámite | `RN-PRE-15` | `OPEN-PRE-10` |
| Una unidad dada de baja no vuelve: no se asigna a una solicitud, no se ensambla y no se reactiva | `RN-INV-39` | — |
| `CON_FALLA` es reparable y `AVERIADO` no; el estado al volver del mantenimiento lo decide el administrador | `RN-INV-36`, `RN-INV-42` | `OPEN-INV-23` |
| La alerta de stock bajo compara el stock de hoy contra el `minStock` del elemento, sin rango y sin valor por defecto | `RN-INV-44` | `OPEN-INV-25` |
| La ubicación es obligatoria, por defecto el Ambiente 104, y se actualiza al trasladar la unidad | `RN-CTX-07`, `RN-CTX-08`, `RN-CTX-03` | `OPEN-CTX-02` |
| La ubicación de una unidad y la lista de unidades por ambiente son de este epic; el conteo por ambiente y el catálogo de ambientes son del epic 03 | `RN-CTX-04`, `RN-CTX-10` | — |
| Los dos tipos de stock —serializado y consumible— se presentan en listas separadas | `RN-INV-34` | — |
| Todo listado del inventario es paginado con su total | `RN-CTX-02` | — |

Sin decisión todavía: los motivos de baja y su vocabulario, la reposición de un consumible, el cierre de un préstamo vigente cuando la unidad entra en trámite de baja por una causa distinta de la pérdida, la ejecución y la duración de la reparación, el historial de traslados de ubicación, el historial de estados físicos, la recurrencia y el canal externo de la alerta de stock bajo, el tamaño de página y el orden de los listados, y la reversión del trámite de baja. Ninguna regla los fija y ningún criterio los exige.

## Trazabilidad y estado

Un criterio se marca `OK` o `GAP` **solo** cuando su test corre, nunca por lectura del código. Este epic está **en ejecución parcial**: US-INV-01, US-INV-02 y US-INV-03 ya corren con test y están en `OK` (16 criterios); el resto sigue sin ejecutar hasta sus bloques. Antes de empezar se migró el enum `PhysicalState` a la lista cerrada de seis estados (`RN-INV-30`) y se corrigió que el alta autogeneraba seriales (`RN-INV-40`). La verificación del ensamblaje añadió la guarda de `RN-INV-38`: no se desensambla un conjunto comprometido.

| Criterio | Regla | Estado hoy |
|----------|-------|------------|
| `AC-INV-01-1` | `Estándar` | `OK` |
| `AC-INV-01-2` | `Estándar` | `OK` |
| `AC-INV-01-3` | `Estándar` | `OK` |
| `AC-INV-01-4` | `Estándar` | `OK` |
| `AC-INV-01-5` | `RN-CTX-05` | `OK` |
| `AC-INV-02-1` | `RN-INV-03` | `OK` |
| `AC-INV-02-2` | `RN-INV-09` | `OK` |
| `AC-INV-02-3` | `Estándar` | `OK` |
| `AC-INV-02-4` | `Estándar` | `OK` |
| `AC-INV-02-5` | `Estándar` | `OK` |
| `AC-INV-02-6` | `RN-INV-08` | `OK` |
| `AC-INV-02-7` | `RN-INV-01` | `OK` |
| `AC-INV-02-8` | `RN-INV-26` | `OK` |
| `AC-INV-03-1` | `Estándar` | `OK` |
| `AC-INV-03-2` | `RN-INV-38` | `OK` |
| `AC-INV-03-3` | `RN-INV-03` | `OK` |
| `AC-INV-04-1` | `RN-INV-06` | Sin ejecutar |
| `AC-INV-04-2` | `RN-INV-06` | Sin ejecutar |
| `AC-INV-04-3` | `RN-INV-06` | Sin ejecutar |
| `AC-INV-04-4` | `RN-INV-11` | Sin ejecutar |
| `AC-INV-04-5` | `Estándar` | Sin ejecutar |
| `AC-INV-04-6` | `RN-INV-12` | Sin ejecutar |
| `AC-INV-04-7` | `RN-INV-18` | Sin ejecutar |
| `AC-INV-04-8` | `RN-INV-11` | Sin ejecutar |
| `AC-INV-05-1` | `RN-INV-10`, `RN-INV-24` | Sin ejecutar |
| `AC-INV-05-2` | `RN-INV-10` | Sin ejecutar |
| `AC-INV-05-3` | `RN-INV-10` | Sin ejecutar |
| `AC-INV-05-4` | `RN-INV-27` | Sin ejecutar |
| `AC-INV-07-1` | `RN-INV-16` | Sin ejecutar |
| `AC-INV-07-2` | `RN-INV-16` | Sin ejecutar |
| `AC-INV-07-3` | `RN-INV-16` | Sin ejecutar |
| `AC-INV-07-4` | `RN-INV-34` | Sin ejecutar |
| `AC-INV-07-5` | `RN-CTX-02` | Sin ejecutar |
| `AC-INV-08-1` | `RN-INV-14` | Sin ejecutar |
| `AC-INV-08-2` | `RN-INV-39` | Sin ejecutar |
| `AC-INV-08-3` | `RN-INV-17` | Sin ejecutar |
| `AC-INV-08-4` | `RN-INV-17` | Sin ejecutar |
| `AC-INV-08-5` | `RN-INV-13`, `RN-PRE-15` | Sin ejecutar |
| `AC-INV-08-6` | `RN-INV-14` | Sin ejecutar |
| `AC-INV-08-7` | `RN-INV-20` | Sin ejecutar |
| `AC-INV-08-8` | `RN-INV-07` | Sin ejecutar |
| `AC-INV-08-9` | `RN-INV-46` | Sin ejecutar |
| `AC-INV-09-1` | `RN-INV-19` | Sin ejecutar |
| `AC-INV-09-2` | `RN-INV-19` | Sin ejecutar |
| `AC-INV-09-3` | `RN-INV-19` | Sin ejecutar |
| `AC-INV-09-4` | `RN-INV-17` | Sin ejecutar |
| `AC-INV-09-5` | `RN-INV-32` | Sin ejecutar |
| `AC-INV-09-6` | `RN-INV-33` | Sin ejecutar |
| `AC-INV-09-7` | `RN-PRE-15` | Sin ejecutar |
| `AC-INV-10-1` | `RN-INV-31` | Sin ejecutar |
| `AC-INV-10-2` | `RN-INV-31` | Sin ejecutar |
| `AC-INV-10-3` | `RN-INV-31` | Sin ejecutar |
| `AC-INV-10-4` | `RN-INV-31` | Sin ejecutar |
| `AC-INV-10-5` | `RN-INV-31` | Sin ejecutar |
| `AC-INV-10-6` | `RN-INV-30` | Sin ejecutar |
| `AC-INV-10-7` | `RN-INV-43` | Sin ejecutar |
| `AC-INV-11-1` | `RN-CTX-08` | Sin ejecutar |
| `AC-INV-11-2` | `RN-CTX-07` | Sin ejecutar |
| `AC-INV-11-3` | `RN-CTX-07` | Sin ejecutar |
| `AC-INV-11-4` | `RN-CTX-10` | Sin ejecutar |
| `AC-INV-11-5` | `RN-CTX-08` | Sin ejecutar |
| `AC-INV-12-1` | `RN-INV-42` | Sin ejecutar |
| `AC-INV-12-2` | `RN-INV-42` | Sin ejecutar |
| `AC-INV-12-3` | `RN-INV-42` | Sin ejecutar |
| `AC-INV-12-4` | `RN-INV-43` | Sin ejecutar |
| `AC-INV-13-1` | `RN-INV-44` | Sin ejecutar |
| `AC-INV-13-2` | `RN-INV-44` | Sin ejecutar |

| US | ACs | Regla de negocio | `Estándar` | `Derivada` | `OPEN` |
|----|-----|------------------|------------|------------|--------|
| `US-INV-01` | 5 | 1 | 4 | 0 | 0 |
| `US-INV-02` | 8 | 5 | 3 | 0 | 0 |
| `US-INV-03` | 3 | 2 | 1 | 0 | 0 |
| `US-INV-04` | 8 | 7 | 1 | 0 | 0 |
| `US-INV-05` | 4 | 4 | 0 | 0 | 0 |
| `US-INV-07` | 5 | 5 | 0 | 0 | 0 |
| `US-INV-08` | 9 | 9 | 0 | 0 | 0 |
| `US-INV-09` | 7 | 7 | 0 | 0 | 0 |
| `US-INV-10` | 7 | 7 | 0 | 0 | 0 |
| `US-INV-11` | 5 | 5 | 0 | 0 | 0 |
| `US-INV-12` | 4 | 4 | 0 | 0 | 0 |
| `US-INV-13` | 2 | 2 | 0 | 0 | 0 |
| **Total** | **67** | **58** | **9** | **0** | **0** |

Totales: **12 historias y 67 criterios**, **16 `OK` y 51 sin ejecutar** (avance parcial en `devJoseph-inventario`). **58** se apoyan en una regla de negocio confirmada y **9** en un invariante técnico (`Estándar`: `AC-INV-01-1` a `AC-INV-01-4`, `AC-INV-02-3` a `AC-INV-02-5`, `AC-INV-03-1` y `AC-INV-04-5`). Ninguno está en `OPEN` ni es `Derivada`. Las citas de regla suman **60** sobre los **58** criterios que se apoyan en al menos una: `AC-INV-05-1` y `AC-INV-08-5` citan dos. `RN-INV-04` y `RN-INV-15` están `REFUTADAS`, no se implementan y no son origen de ningún criterio.

## Anexo — Datos de prueba

Los valores de esta tabla son **ejemplos**: no son requisitos y QA elige los suyos. Los criterios fijan la clase de actor, la de estado y los límites de la regla; estos datos solo registran con qué se ejecutan las pruebas del módulo.

| Dato | Valor usado |
|------|-------------|
| Administrador del seed | `admin@sena.edu.co` / `AdminSENA2024` |
| Instructor del seed usado en `AC-INV-01-5`, `AC-INV-09-5`, `AC-INV-10-7` y `AC-INV-12-4` | `cmendoza@sena.edu.co` / `Instructor2024` |
| Instructor tenedor de la pieza de `AC-INV-05-2`, `AC-INV-10-3` y `AC-INV-10-5` | `cmendoza@sena.edu.co` |
| Elemento serializado de `AC-INV-01-1` a `AC-INV-01-4` | un elemento serializable del catálogo, sin unidades y con unidades según el escenario |
| Serial de las pruebas de alta | `SN-2024-0001`, y un serial ausente del inventario para el alta limpia |
| Serial de solo espacios de `AC-INV-01-3` | `"   "` |
| Elemento inexistente de `AC-INV-01-4` | un identificador que no pertenece a ningún elemento del catálogo |
| Compuesto de `AC-INV-02` | un elemento compuesto con dos componentes obligatorios; en `AC-INV-02-2`, con tres |
| Elemento ajeno de `AC-INV-02-3` | un elemento del catálogo que no es componente del compuesto |
| Conjunto comprometido de `AC-INV-02-6` y `AC-INV-03-2` | uno con préstamo vigente y otro con reserva activa sobre él o sobre una pieza |
| Kit de `AC-INV-02-8` | un kit con el aparato, las pinzas, el estuche y la pila como componentes, y el aparato como elemento propio del catálogo |
| Compuesto de `AC-INV-05-4` | A contiene a B como obligatorio, B contiene a C como obligatorio y la unidad de C no está ensamblada en B |
| Consumible de `AC-INV-04` | uno con cantidad inicial 100 en su unidad de medida; en `AC-INV-04-5`, con 10; en `AC-INV-04-8`, con 2 |
| Cantidades de `AC-INV-04-4` | la solicitud incluye 2 unidades del consumible y el stock queda en 98 |
| Cantidad de `AC-INV-04-5` | consumo intentado de 15 unidades sobre un stock de 10 |
| Cantidad decimal de `AC-INV-04-7` | 2,5 unidades sobre un stock de 100 |
| Consumibles de `AC-INV-04-6` | limpiador de contactos (10) y cable (100), con unidades de medida distintas |
| Solicitud de `AC-INV-04-8` | una que incluye 5 unidades de un consumible con stock 2 |
| Unidades de `AC-INV-07` | un compuesto ensamblado con un componente, una unidad suelta, unidades del SENA y donadas, y un inventario mayor que el tamaño de página |
| Unidades de `AC-INV-08` | una donada averiada; una ya dada de baja; una del SENA disponible; dos del mismo elemento con tenencia distinta; una del SENA en un conjunto presentado en auditoría |
| Unidad perdida de `AC-INV-08-5` y `AC-INV-09-7` | una registrada y no prestada; y una del SENA con trámite de baja abierto y con piezas sueltas |
| Elementos de `AC-INV-08-9` | un elemento del SENA con unidades serializadas y un elemento donado registrado como consumible |
| Unidades en trámite de baja de `AC-INV-09-6` | una en estado `OPERATIVO` y otra en estado `AVERIADO`, con el trámite iniciado |
| Unidades de `AC-INV-10` | una por cada estado físico, con sus piezas sueltas; y un valor fuera de la lista cerrada, por ejemplo `EN_REPARACION` |
| Ambiente que es la ubicación de inventario | «Ambiente 104» |
| Ambiente de destino de `AC-INV-11-2`, `AC-INV-11-4` y `AC-INV-11-5` | «Ambiente 205», distinto del 104 |
| Elementos de `AC-INV-13` | tres consumibles con umbral mínimo 5 y cantidades disponibles 5, 2 y 6 |

Los usuarios salen del seed del proyecto (`AGENTS.md` §4). Los elementos, las unidades, sus préstamos, sus reservas, sus ambientes y sus umbrales son datos de los epics 03, 04, 06, 07 y 08: acá se leen, no se crean.
