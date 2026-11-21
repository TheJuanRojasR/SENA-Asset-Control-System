# Contexto de negocio — Sistema de Control de Activos SENA

Documento base del que dependen todos los epics: el negocio, sus actores, el glosario del
dominio y las **126 reglas de negocio**.

## Cómo leer este documento

Cada regla es una fila con su **id**, la regla en una frase, un **ejemplo** concreto y su **tipo**.
Los ids no se renumeran: los epics los citan.

| Tipo | Significado | ¿Se implementa? |
|------|-------------|-----------------|
| **Confirmada** | El responsable del almacén lo afirmó explícitamente | Sí |
| **Estándar** | Invariante técnico (unicidad, integridad, permisos). No es una decisión de negocio | Sí |
| **Decisión técnica** | El negocio delegó la elección al equipo técnico; se implementa y se documenta la razón | Sí |
| **REFUTADA** | Una regla que el negocio desmintió. Se conserva como historia, con la regla que la reemplazó | **No** |

Cada familia de `RN-*` vive en una sección fija: `RN-CTX` en §1 y §2, `RN-NEG` en §5.1, `RN-INV` en
§5.2, `RN-SOL` en §4 y §5.3, `RN-PRE` en §5.4, `RN-CAT` en §5.6, `RN-USR` en §5.7, `RN-AUTH` en
§5.8, `RN-CATEG` en §5.9, `RN-MOV` en §5.10, `RN-PAN` en §5.11 y `RN-NOT` en §5.12.

Las **notas** que acompañan a algunas reglas solo declaran una **prevalencia** o una **excepción**
que cambia la conducta. Las preguntas ya respondidas están en §8.2, cada una con la regla que la
responde, para que ninguna referencia `OPEN-*` quede muerta.

---

## 1. El negocio

El sistema controla el **inventario real del Ambiente 104 del SENA Quirigüá**: entre **1.000 y
1.500 equipos y elementos** y alrededor de **100 instructores**. Se despliega y tiene que funcionar:
no es una muestra ni un prototipo.

Los actores son dos (§2): el **administrador**, instructor encargado del almacén, y el
**instructor**, que dicta la clase y pide equipos.

**El problema que el sistema existe para resolver** es que hoy nadie sabe qué hay. El instructor
pide por WhatsApp o por llamada, el administrador no sabe si el elemento está disponible, prestado o
en el taller, y tiene que **caminar hasta el almacén a buscar cada elemento** antes de responder
(§4). El valor del producto es contestar «¿qué hay y cuánto?» en pantalla, sin ese viaje.

| ID | Regla | Ejemplo | Tipo |
|----|-------|---------|------|
| `RN-CTX-01` | El sistema se implementa en el **inventario real del Ambiente 104** y debe desplegarse y funcionar correctamente: no es una muestra ni un prototipo, así que los defectos de seguridad del epic 01 son **críticos** | El inventario del 104 se administra en la aplicación en producción, no en una demo con datos de ejemplo | Confirmada |
| `RN-CTX-02` | Volumen operativo de **1.000 a 1.500 equipos y elementos** y alrededor de **100 instructores**: **todo listado** de la aplicación es **paginado con su total** | El catálogo, el padrón de instructores, el inventario de unidades, los ambientes, las categorías, las solicitudes, los préstamos activos, el historial de devoluciones y el historial de movimientos devuelven una página acotada e informan el total | Confirmada |
| `RN-CTX-03` | Existe **un único inventario**, el del Ambiente 104: el modelo `Environment` **no representa sedes** ni inventarios paralelos | Una unidad que pasa semanas en otro ambiente sigue perteneciendo al inventario del 104 | Confirmada |
| `RN-CTX-04` | `Environment` existe por **trazabilidad de destino**: cuando un equipo se presta puede quedarse mucho tiempo en otro ambiente, y interesa saber **dónde está** | Un portátil prestado durante un mes figura en el ambiente donde está y no en el 104 | Confirmada |

> **Nota de `RN-CTX-02`.** La paginación actual —corte fijo en 20 filas, ninguna pantalla
> pagina— es un **bloqueo funcional**, no un defecto cosmético: una lista que crece sin límite y no
> se pagina no se puede usar.

> **Nota de `RN-CTX-03`.** «Inventario» no es «dónde está la unidad». No hay dos inventarios que
> compitan, pero una unidad del 104 puede estar semanas en otro ambiente (`RN-CTX-04`,
> `RN-CTX-08`): la ubicación es un dato de la unidad, no un segundo inventario.

## 2. Actores

Dos actores y ninguno más (`RN-CTX-05`):

| Actor | Quién es | Qué hace |
|-------|----------|----------|
| **Administrador** | Instructor encargado del almacén | Revisa, aprueba, verifica físicamente, empaca, entrega y recibe |
| **Instructor** | Quien dicta la clase | Solicita, recoge y devuelve |

| ID | Regla | Ejemplo | Tipo |
|----|-------|---------|------|
| `RN-CTX-05` | Hay exactamente **dos actores**: el administrador y el instructor | No existe un rol de bodega ni de coordinación: el administrador es un instructor del padrón | Confirmada |
| `RN-CTX-06` | El administrador **no crea solicitudes** y nunca pide equipos para sí mismo; un solo rol por usuario (`ADMIN` / `INSTRUCTOR`) es suficiente y no necesita cambios | A un administrador la pantalla no le ofrece crear una solicitud a su nombre | Confirmada |
| `RN-CTX-07` | El sistema registra **dónde está cada unidad**: su **ubicación actual** o el **nombre del ambiente** donde se encuentra | Un osciloscopio prestado hace un mes figura en el Ambiente 203 | Confirmada |
| `RN-CTX-08` | Toda unidad tiene **ubicación obligatoria**; la de una unidad nueva es el **Ambiente 104**, y la ubicación **se actualiza** cuando la unidad se lleva a otro ambiente | Registrar una unidad sin ubicación se rechaza; llevarla al 203 actualiza su ubicación | Confirmada |
| `RN-CTX-09` | **No se puede eliminar** un ambiente que tiene **unidades ubicadas**, ni el **Ambiente 104**, que es el inventario base por defecto | Eliminar el 203 con tres unidades responde error y no borra nada | Confirmada |
| `RN-CTX-10` | Se puede consultar **por ambiente**: cuántas unidades hay en él y cuáles son | Consultar el 104 devuelve su lista de unidades y el total | Confirmada |
| `RN-CTX-11` | Un ambiente puede **renombrarse** y su nombre es **único**; renombrarlo **no reubica** sus unidades, solo cambia la etiqueta del lugar | Cambiar el nombre del 203 no mueve ninguna unidad, y dos ambientes no pueden llamarse igual | Confirmada |

> **Nota de `RN-CTX-07` y `RN-CTX-08`.** Hay instructores que se llevan elementos por **más de un
> mes** y el administrador **olvida** dónde quedaron: la ubicación no puede quedar solo en su
> memoria, tiene que estar registrada.

## 3. Glosario

Un solo significado por término. Si dos epics usan la misma palabra para cosas distintas, algo está
mal diseñado.

| Término | Significado | Regla que lo fija |
|---------|-------------|-------------------|
| **Elemento** | Objeto inventariado, serializado o consumible. Es lo que lista el catálogo | `RN-CAT-01`, `RN-INV-05` |
| **Unidad** | La instancia física concreta de un elemento serializado, identificada por su serial | `RN-INV-06`, `RN-INV-40` |
| **Elemento compuesto** (también **conjunto** y **kit**) | Elemento que requiere otros elementos para funcionar. «Kit», «conjunto» y «elemento compuesto» designan lo mismo | `RN-INV-01`, `RN-INV-26` |
| **Composición** | La lista de componentes que declara un compuesto, con la marca de **obligatorio** u **opcional** de cada uno | `RN-INV-21`, `RN-INV-37` |
| **Ensamblaje** | Unir físicamente las unidades serializadas de un compuesto hasta considerarlo **completo** | `RN-INV-03`, `RN-INV-38` |
| **Consumible** | Elemento que **no vuelve** y **no tiene serial**: se controla por cantidad y su stock baja **al registrar la entrega** | `RN-INV-06`, `RN-INV-11` |
| **Tenencia** | Si una unidad o un elemento es **propiedad del SENA** o **donado**. Cambia el camino de la baja, no la disponibilidad | `RN-INV-07`, `RN-INV-14`, `RN-INV-20` |
| **Estado físico de la unidad** | La condición en que está la unidad **ahora**: un solo valor de la lista cerrada | `RN-INV-30` |
| **Estado al devolver** | Cómo volvió el elemento, dentro de la condición de retorno. **Es otro campo**, distinto del estado físico de la unidad | `RN-PRE-10` (`RN-PRE-05` lo llama «estado físico») |
| **Condición de retorno** | El registro que el administrador deja al recibir **cada unidad serializada** devuelta: **funcionamiento**, **estado al devolver** y descripción libre. Es obligatoria y un **consumible nunca la lleva**, porque no entra al flujo de devolución | `RN-PRE-08`, `RN-PRE-10` |
| **Pieza suelta** | Componente de un compuesto que se presta **por separado**, fuera de su conjunto. No confundir con **pieza faltante**, que es la que el conjunto debería tener y no tiene | `RN-INV-08`, `RN-INV-09`, `RN-INV-24` |
| **Ubicación** | El lugar donde está hoy la unidad, expresado como ambiente. **No** es un segundo inventario | `RN-CTX-07`, `RN-CTX-08` |
| **Ambiente** (o **ambiente de destino**) | Lugar donde se ubica una unidad; existe por **trazabilidad de destino**, no como sede | `RN-CTX-03`, `RN-CTX-04` |
| **Solicitud** | Pedido de un instructor para usar elementos en un rango de fechas; recorre los estados de §6 | `RN-SOL-05`, §6 |
| **Fecha de retiro** | El día en que el instructor recoge los elementos | `RN-NEG-04` |
| **Fecha estimada de devolución** | El día en que el instructor declara que los devolverá. Es informativa: no cumplirla no tiene consecuencia | `RN-NEG-04`, `RN-PRE-07` |
| **Reserva** | Compromiso de una **unidad serializada** para un rango de fechas. Un consumible **no se reserva**, y una reserva **no es un préstamo** | `RN-NEG-02`, `RN-INV-11` |
| **Préstamo** | Entrega física real: empieza al retirar y termina al devolver. Solo existe a través de una solicitud | `RN-NEG-05` |
| **Empacar** | Verificar que el elemento funciona y dejarlo preparado para entrega. El aviso al instructor es su **efecto** | `RN-SOL-02`, `RN-INV-11` |
| **Tarea pendiente** | Aviso que el administrador debe resolver tras una devolución con **pieza faltante**, **elemento que no funciona** o **elemento dañado**. Tiene dos estados —pendiente y resuelta—, no se reabre y una falla nueva abre una tarea nueva | `RN-PRE-06`, `RN-PRE-09`, `RN-PRE-13` |
| **Nota de la decisión** | El texto que el administrador deja al **aprobar o rechazar**: obligatorio al rechazar y al aprobar un total menor que el solicitado, opcional al aprobar lo pedido. No es la nota de la tarea | `RN-SOL-04` |
| **Nota de la tarea** | La descripción **opcional** que el administrador deja al **resolver una tarea pendiente**. No es la nota de la decisión | `RN-PRE-09` |
| **Movimiento** | Registro de un **evento** que cambia la situación de una unidad o de un elemento. **No es un estado**: es la historia de lo que pasó | `RN-MOV-01` |
| **Alerta de stock bajo** | Aviso al administrador cuando la cantidad disponible **de hoy** de un elemento queda **en su umbral mínimo o por debajo**. Sin umbral cargado no hay alerta ni valor por defecto | `RN-INV-44` |
| **Aviso** | Notificación **dentro del propio sistema** para el instructor: aprobación, rechazo con su motivo, listo para retirar, vencimiento de la reserva y cancelación manual. Es distinto del correo o el WhatsApp, que son opcionales | `RN-NOT-01`, `RN-NOT-02` |
| **Categoría** | Agrupación del catálogo que administra el administrador y el instructor usa para filtrar. Tiene nombre único y no se borra si tiene elementos asociados | `RN-CATEG-01`, `RN-CATEG-02`, `RN-CATEG-03`, `RN-CAT-02` |
| **Baja** | Salida de una unidad o de un elemento del inventario activo, con motivo y actor, que no se deshace. **La pérdida es un motivo de baja, no un estado** | `RN-INV-17`, `RN-PRE-15` |
| **Sesión** | El par (token de acceso, token de refresco) emitido en un inicio de sesión. Cerrar la sesión termina el par, no solo una de sus mitades | `RN-AUTH-01` |
| **Reactivar** | Volver a **habilitar** una cuenta desactivada: el usuario recupera el acceso y conserva sus datos y su historial | `RN-USR-11` |

## 4. El proceso real, de punta a punta

El proceso tal como ocurre hoy en el almacén y el estado de la solicitud que produce cada paso:

| # | Qué pasa | Estado de la solicitud |
|---|----------|------------------------|
| 1 | El instructor pide elementos al administrador **por WhatsApp, mensaje o llamada** | `PENDING` |
| 2 | El administrador **no sabe** si el elemento está disponible, prestado o en el taller | `PENDING` |
| 3 | El administrador **va físicamente al almacén** y busca cada elemento | `PENDING` |
| 4 | El administrador decide: aprueba lo pedido, aprueba menos o rechaza | `APPROVED` o `REJECTED` |
| 5 | Si están, **verifica que cada elemento funcione** y lo **empaca** | `PACKED` |
| 6 | **Ya empacado**, avisa al instructor que puede retirarlos **al día siguiente** | `PACKED` — el aviso es el efecto del paso 5, no un paso con estado propio |
| 7 | Al día siguiente el instructor los busca, los revisa y se los lleva | `DELIVERED`, o `PARTIALLY_DELIVERED` si retira solo parte de lo aprobado |
| 8 | Al devolver, el administrador **revisa de nuevo el estado** y los guarda | `PARTIALLY_RETURNED` o `COMPLETED` |

**Verificar y empacar primero, avisar después.** Avisar antes de empacar promete algo que todavía no
está verificado, y el instructor puede llegar a buscar un equipo que no funciona.

Los pasos 2 y 3 son el **propósito central del producto**: eliminar el «no sé si está» y el viaje
físico al almacén. La **visibilidad de disponibilidad** es el valor principal y no un epic
secundario (§10).

| ID | Regla | Ejemplo | Tipo |
|----|-------|---------|------|
| `RN-SOL-01` | Las solicitudes son **de un día para el otro**; la entrega el **mismo día** ocurre solo si el administrador tiene disponibilidad para hacerlo | Un instructor pide hoy para retirar mañana; retirar hoy queda sujeto a que el administrador pueda verificar y empacar hoy | Confirmada |
| `RN-SOL-02` | La **verificación física** ocurre **antes** de avisar al instructor que puede retirar; el aviso es el **efecto de `PACKED`** y no un estado propio | El instructor recibe el aviso de «listo para retirar» cuando la solicitud entra en `PACKED`, nunca antes | Confirmada |

La secuencia `PENDING → APPROVED → PACKED → DELIVERED → COMPLETED` **no cambia**; la **entrega
parcial** (`RN-SOL-11`) y el **cierre** del ciclo (`RN-SOL-12`) están en §6.

## 5. Reglas de negocio

Cada familia conserva su subsección, su número y el orden de sus ids.

### 5.1 Fechas y reservas *(el núcleo)*

| ID | Regla | Ejemplo | Tipo |
|----|-------|---------|------|
| `RN-NEG-01` | Un instructor puede solicitar el mismo elemento para **días distintos** que otro: la primera reserva no bloquea la segunda | Una reserva que ocupa del 10 al 13 de marzo no impide reservar la misma unidad para el 15 | Confirmada |
| `RN-NEG-02` | Para el **mismo día** el elemento **sí** se bloquea: no puede haber dos reservas activas de la misma unidad para fechas que se solapen | Pedir la misma unidad del 10 al 13 y del 12 al 15 se rechaza, porque comparten dos días | Confirmada |
| `RN-NEG-03` | Al crear la solicitud la disponibilidad **se descuenta inmediatamente**, para que otro instructor no solicite lo mismo y luego no lo tenga; el descuento aplica **solo a unidades serializadas** y es la **reserva** de §6 | Dos instructores piden la misma unidad para el martes: el segundo ve 0 disponible | Confirmada |
| `RN-NEG-04` | Cada solicitud declara **dos fechas** —**fecha de retiro** y **fecha estimada de devolución**— y la reserva ocupa el rango completo entre ellas, extremos incluidos | Una solicitud con retiro el 10 y devolución estimada el 13 ocupa cuatro días | Confirmada |
| `RN-NEG-05` | Una unidad **prestada** —entregada y todavía no devuelta— **no está disponible para ningún rango futuro** hasta que se registre su devolución y vuelva al inventario | Una unidad prestada en marzo no cuenta como disponible para junio | Confirmada |

> **Nota de `RN-NEG-03`.** **Prevalece `RN-INV-11`**: el descuento al crear es la reserva de una
> unidad concreta, no el consumo de stock. Un **consumible no se descuenta al crear** ni al empacar.

> **Nota de `RN-NEG-05`.** Una reserva ocupa solo su rango y se cancela sola si no se retira
> (`RN-SOL-07`); un préstamo bloquea **todas** las fechas. Todo préstamo nace de una solicitud: el
> **préstamo informal** no existe (`RN-INV-15`, `REFUTADA`).

### 5.2 Elementos compuestos y consumibles

| ID | Regla | Ejemplo | Tipo |
|----|-------|---------|------|
| `RN-INV-01` | El instructor solicita **el conjunto**, no los componentes por separado | Una solicitud de un portátil compuesto incluye su cargador y su mouse; el instructor no pide el cargador por su cuenta | Confirmada |
| `RN-INV-02` | Si se presta un elemento compuesto, se entrega **completo**: si falta un componente **obligatorio**, el compuesto no se entrega como conjunto | Un portátil al que le falta el cargador obligatorio no sale del almacén como conjunto | Confirmada |
| `RN-INV-03` | Un elemento ensamblado queda **marcado como completo** | Al unir todos sus componentes obligatorios el conjunto queda completo, y al sacar uno vuelve a estar incompleto | Confirmada |
| `RN-INV-04` | **`REFUTADA`.** «Un componente que forma parte de un ensamblaje **no es solicitable por separado**». La reemplaza `RN-INV-08`: el ensamblaje es una comodidad, no un candado, y el componente puede salir del conjunto | El cargador de un portátil ensamblado **sí** se puede pedir solo, y queda registro de que el conjunto está incompleto | **REFUTADA** |
| `RN-INV-05` | Existen elementos **consumibles** | La cinta aislante es un consumible del catálogo | Confirmada |
| `RN-INV-06` | Los consumibles **no tienen número de serie** y se controlan **por cantidad**: no generan unidades, no autogeneran seriales y no se devuelven | Cien metros de cable son un número de stock, no cien unidades con serial | Confirmada |
| `RN-INV-07` | Existen **dos tenencias** —equipos **propiedad del SENA** y **elementos donados**—, y los del SENA **no se pueden perder**: incluso averiados deben poder presentarse **completos** en una auditoría | Un portátil del SENA con la pantalla rota sigue en el inventario y en la presentación de auditoría hasta completar su baja | Confirmada |
| `RN-INV-08` | Un componente de un conjunto ensamblado **puede prestarse por separado**, y **debe quedar registro** porque el conjunto deja de estar completo | De un computador del SENA con la CPU dañada se presta el mouse, y queda registrado quién lo tiene | Confirmada |
| `RN-INV-09` | Un conjunto puede guardarse **incompleto**, con **trazabilidad** de qué falta | Se guarda el portátil sin su mouse y el sistema indica que falta el mouse | Confirmada |
| `RN-INV-10` | **Requisito de auditoría**: el sistema debe poder informar, para cada conjunto, si está **completo**, qué piezas **faltan** y **dónde están** | La consulta de un conjunto informa la pieza faltante y el instructor que la tiene | Confirmada |
| `RN-INV-11` | Un consumible se controla **descontando cantidad del stock**, y el descuento ocurre **al registrar la entrega**, no al empacar: mientras la solicitud está `PACKED` el stock todavía no baja | Se piden 2 metros de cable, hay 100 y quedan 98 al registrar la entrega | Confirmada |
| `RN-INV-12` | Cada consumible declara **su propia unidad de medida**, que depende del consumible | Cable en metros, cinta aislante en rollos, limpia contactos en frascos, estaño y fundente en su propia unidad | Confirmada |
| `RN-INV-13` | **Ninguna unidad, del SENA o donada, se pierde sin quedar registrada**: la pérdida sí ocurre, lo que se prohíbe es que una unidad desaparezca sin dejar rastro | Una unidad extraviada se registra con su motivo y su actor y no desaparece del historial | Confirmada |
| `RN-INV-14` | Los elementos **donados** se pueden dañar y **darse de baja de inmediato y sin trámite**; la baja de un equipo **del SENA** requiere **confirmación** y un trámite largo | Un mouse donado dañado se da de baja en el acto; el mismo paso sobre un portátil del SENA se rechaza | Confirmada |
| `RN-INV-15` | **`REFUTADA`.** «El **administrador** registra el **préstamo informal** de una pieza suelta, sin solicitud formal, para dejar trazabilidad de quién la tiene». La reemplaza la respuesta de `OPEN-INV-24`: el préstamo informal **no existe**, un préstamo solo existe a través de una solicitud y lo prestado por fuera del sistema queda fuera de la responsabilidad del sistema | Ningún registro de préstamo se crea sin una solicitud | **REFUTADA** |
| `RN-INV-16` | Los listados de inventario muestran **todas** las unidades: sin importar su tenencia y **sin ocultar** las que son componentes dentro de un conjunto | El listado incluye el mouse que está dentro de un portátil ensamblado | Confirmada |
| `RN-INV-17` | Toda baja de una unidad exige **motivo y actor**; queda registrada, es auditable y **no se puede deshacer** | Una baja sin motivo se rechaza, y con motivo queda registrado quién la hizo | Confirmada |
| `RN-INV-18` | Las cantidades de consumibles son **enteras**: no se admiten decimales | Se piden 3 rollos de cinta y no 2,5 | Confirmada |
| `RN-INV-19` | La baja de un equipo **del SENA** requiere **confirmación** y recorre un **trámite administrativo que puede durar entre 6 meses y 1 año**; hasta que se confirme, la unidad **no** queda dada de baja y **sigue existiendo en el inventario** | Iniciar el trámite de un portátil averiado no lo saca del inventario ni de la auditoría | Confirmada |
| `RN-INV-20` | La **tenencia** (SENA / donado) vive en la **unidad física** para los equipos serializados y en el **elemento** para los consumibles, que no tienen unidades | Dos portátiles del mismo modelo pueden ser uno del SENA y otro donado | Confirmada |
| `RN-INV-21` | Un elemento compuesto se **define al crear el elemento**, eligiendo sus componentes del catálogo existente | Al crear una estación de soldadura se eligen sus componentes entre los elementos ya registrados | Confirmada |
| `RN-INV-22` | Un compuesto **puede incluir componentes consumibles**: componentes sin serial, controlados por cantidad | Un kit de electrónica incluye estaño como componente consumible | Confirmada |
| `RN-INV-23` | La composición de un compuesto es **variable**: cada compuesto declara su propia lista y un mismo componente **puede repetirse** dentro de ella | Un kit declara dos pilas del mismo elemento entre sus componentes | Confirmada |
| `RN-INV-24` | La falta de un componente **opcional** **no impide** prestar el conjunto, pero la ausencia **debe quedar documentada** en el conjunto | Se presta el portátil sin el mouse opcional y el sistema registra que falta | Confirmada |
| `RN-INV-25` | Un componente **presente pero agotado o descargado** —por ejemplo una pila sin carga— **no se considera faltante**: se sigue mostrando y cuenta como presente en el conjunto, y la conducta es la misma si el componente es donado | Una pila descargada dentro del kit sigue contando como presente | Confirmada |
| `RN-INV-26` | Un **kit** es un elemento compuesto que incluye **el aparato como un componente más**; el aparato es un elemento **independiente** del catálogo y puede prestarse solo, sin sus pinzas, estuche o pila, porque agotarse es una **condición física** y no una salida del inventario | El multímetro de un kit se presta solo, sin sus puntas ni su estuche | Confirmada |
| `RN-INV-27` | Un compuesto **puede contener otro compuesto** como componente, y la completitud se evalúa de forma **recursiva**: está completo solo si sus componentes y los componentes de esos componentes están presentes | Un kit que contiene una estación de soldadura se informa completo solo si la estación y las piezas de la estación están | Confirmada |
| `RN-INV-28` | Las pilas que forman parte de un elemento **del SENA** se tratan como **no consumibles** y se entregan y devuelven con él; las demás pilas **pueden** tratarse como consumibles | Las pilas de un multímetro del SENA vuelven con el multímetro y no se descuentan del stock | Confirmada |
| `RN-INV-29` | La composición de un compuesto **puede editarse** después de creado el elemento, y **todo cambio queda registrado**: qué cambió, quién lo cambió y cuándo | Agregar un componente olvidado deja registro con su autor y su fecha | Confirmada |
| `RN-INV-30` | Los **estados físicos** de una unidad son una lista cerrada: `OPERATIVO`, `DESCARGADO_AGOTADO`, `CON_FALLA`, `AVERIADO`, `EN_MANTENIMIENTO` y `DADO_DE_BAJA` | `RESERVED` y `PERDIDA` no son estados físicos: la reserva es un compromiso (§6) y la pérdida es un motivo de baja | Confirmada |
| `RN-INV-31` | Fija **qué se presta** según el estado físico, en dos planos: la unidad **como unidad** y sus **piezas sueltas** | Con falla o averiada no se presta la unidad y sí sus piezas; descargada, en mantenimiento o dada de baja no se presta nada | Confirmada |
| `RN-INV-32` | El **administrador** registra la **confirmación de la baja** de un equipo del SENA, que equivale a registrar que el proceso externo concluyó, no a autorizar la baja | Cuando el trámite institucional termina, el administrador registra la confirmación y la unidad queda dada de baja | Confirmada |
| `RN-INV-33` | Mientras una unidad del SENA está **en trámite de baja** queda **bloqueada**: no se presta la unidad **ni sus piezas sueltas** | Un monitor averiado en trámite deja de prestar sus cables mientras el trámite está abierto | Confirmada |
| `RN-INV-34` | El carácter **consumible** se fija **por elemento**: un mismo tipo de objeto que deba tratarse de las dos formas exige **dos elementos distintos** en el catálogo, y el catálogo presenta consumibles y serializados en listas separadas | «Pila serializada» y «pila consumible» serían dos elementos del catálogo | **Decisión técnica** |
| `RN-INV-35` | Con **unidades ensambladas** existentes **no se puede quitar** un componente de la composición; sí se pueden **agregar** componentes olvidados | Con un portátil ensamblado no se quita el cargador de la composición, pero sí se agrega un mouse olvidado | Confirmada |
| `RN-INV-36` | `CON_FALLA` es el estado de un equipo **reparable**, que se manda a reparar, y `AVERIADO` el de un equipo **no reparable**, que entra al trámite de baja; la diferencia no está en la conducta de préstamo sino en **qué se hace con el equipo** | Un teclado con falla se envía a reparar; uno averiado entra al trámite de baja | Confirmada |
| `RN-INV-37` | El **administrador** marca cada componente de un compuesto como **obligatorio** u **opcional** al definir la composición; uno **obligatorio** faltante impide entregar el conjunto y uno **opcional** faltante no lo impide, pero la ausencia queda documentada | Al definir el portátil, el cargador se marca obligatorio y el mouse opcional | Confirmada |
| `RN-INV-38` | No se puede **desensamblar** un equipo que tiene un **préstamo vigente** **ni una reserva activa**: mientras cualquiera de sus piezas esté **comprometida** (§6), el conjunto no se toca | Con una pieza prestada o reservada, el intento de desensamblar se rechaza | Confirmada |
| `RN-INV-39` | Una unidad **dada de baja no vuelve**: no se asigna a una solicitud, no se ensambla y no se reactiva | Asignar a una solicitud una unidad dada de baja se rechaza | Confirmada |
| `RN-INV-40` | El sistema **no autogenera** números de serie ni unidades al crear un elemento: el administrador registra cada serial, uno por uno | Al crear un elemento de cinco unidades, el administrador escribe los cinco seriales | Confirmada |
| `RN-INV-41` | La composición de un compuesto **no puede formar ciclos**, ni directos ni indirectos, y validar la composición exige **detección de ciclos** | Que A contenga B y B contenga A se rechaza | Confirmada |
| `RN-INV-42` | Un equipo **con falla** es **reparable**: el administrador lo envía a **mantenimiento** y, cuando vuelve, decide su nuevo estado físico; un equipo **averiado** no se repara y entra al **trámite de baja** | Al volver operativa la unidad se presta otra vez; al volver averiada, no | Confirmada |
| `RN-INV-43` | **Solo el administrador** puede cambiar el **estado físico** de una unidad | Un cambio de estado enviado con sesión de instructor responde `403` y la unidad conserva su estado | Confirmada |
| `RN-INV-44` | El sistema muestra una **alerta de stock bajo al administrador** cuando la **cantidad disponible de hoy** de un elemento queda **en su umbral mínimo (`minStock`) o por debajo**, comparando sin rango de fechas; el umbral lo fija el administrador por elemento | Con umbral 5 alertan las cantidades 5 y 2, y no alerta 6 | Confirmada |
| `RN-INV-45` | Un **elemento** del catálogo puede **darse de baja** si **ninguna de sus unidades está comprometida** —ni prestada ni reservada—, y no se elimina físicamente: sigue siendo consultable para auditoría | Un elemento con una unidad reservada no se da de baja; uno sin compromisos sí | Confirmada |
| `RN-INV-46` | Un elemento **del SENA no puede configurarse como consumible**: solo un elemento **donado** puede serlo | La pila de un elemento del SENA se registra como activo serializado y no como consumible | Confirmada |

> **Nota de `RN-INV-02`, `RN-INV-24` y `RN-INV-37`.** La distinción **obligatorio / opcional** la
> marca el administrador al definir el compuesto; el conjunto completo se mide así en dos planos:
> **completitud funcional** (¿se puede prestar?) y **completitud documental** (¿está íntegro para
> auditoría?).

> **Nota de `RN-INV-11`.** El stock se verifica **dos veces**: al empacar —si no alcanza, el
> conjunto no se empaca— y de nuevo al registrar la entrega. Si la cantidad **ya no existe**, **la
> entrega se rechaza**: no se descuenta stock que no hay.

> **Nota de `RN-INV-13`.** Para el procedimiento de la pérdida **prevalecen `RN-PRE-15` y
> `RN-PRE-16`**; esta regla fija la **obligación de registro**.

> **Nota de `RN-INV-14`.** «Sin consecuencia administrativa» significa **sin trámite ni
> confirmación**, no sin motivo ni actor: `RN-INV-17` exige motivo y actor en **toda** baja y
> **prevalece** sobre cualquier lectura de esta regla.

> **Nota de `RN-INV-19`.** La baja de un equipo del SENA es un **proceso con estados**, no una
> acción instantánea: necesita un **estado de trámite** distinto de «dado de baja» (§7, filas 10 y
> 12). **Excepción:** una unidad **declarada perdida** sale del inventario activo aunque su trámite
> siga abierto, porque entonces el trámite es **solo administrativo** y `RN-PRE-15` **prevalece**
> sobre «sigue existiendo en el inventario».

> **Nota de `RN-INV-23`.** **Composición ≠ ensamblaje**: la composición dice *de qué está hecho* un
> elemento y admite consumibles; el ensamblaje une **unidades físicas serializadas**, así que un
> consumible puede estar en la composición pero nunca en el ensamblaje.

> **Nota de `RN-INV-25`.** **Presencia** y **funcionamiento** son condiciones distintas: que una
> pieza no funcione no la convierte en ausente, y que esté ausente no dice nada sobre si funciona.

> **Nota de `RN-INV-26`.** **Prevalece sobre `RN-INV-31`**: el **aparato principal** de un kit se
> presta solo **aunque su unidad esté `DESCARGADO_AGOTADO`**, y lo que `RN-INV-31` sí bloquea para
> una unidad agotada es **la unidad agotada como unidad** y **sus demás componentes**. Una pila
> agotada sigue siendo un activo que hay que presentar en auditoría y no se descuenta como
> consumible.

> **Nota de `RN-INV-31`.** «¿Se prestan sus piezas sueltas?» es la columna que aplica a una **pieza
> suelta**, y su préstamo se decide por el estado del **padre**: por eso la disponibilidad de §6
> mira el estado del padre para las piezas de un ensamblaje. El estado físico es independiente de la
> presencia: una unidad averiada o agotada sigue **presente** aunque no se pueda prestar.

> **Nota de `RN-INV-33`.** **Prevalece sobre `RN-INV-31`** para las unidades en trámite: una unidad
> averiada, cuyas piezas sí se prestarían, deja de prestarlas mientras el trámite está abierto.
> **Única excepción:** una unidad **declarada perdida**, sobre la que **prevalece `RN-PRE-15`**
> (sale del inventario activo, no bloquea disponibilidad y sus piezas sueltas siguen prestables).

> **Nota de `RN-INV-35`.** Sin unidades ensambladas con ese componente, quitarlo debería ser posible:
> el negocio no lo afirmó.

> **Nota de `RN-INV-36` y `RN-INV-42`.** Las dos reglas afirman lo mismo y **se conservan los dos
> ids** porque otros documentos citan cada uno: `RN-INV-42` agrega solo el camino del reparable
> (`EN_MANTENIMIENTO`). Ningún epic debe implementar una sin la otra.

> **Nota de `RN-INV-38` y `RN-INV-45`.** «Comprometida» significa ocupando una **reserva** o un
> **préstamo** de §6. Una unidad **en trámite de baja** no está comprometida con ninguna solicitud.

> **Nota de `RN-INV-43`.** La condición de retorno actualiza el estado **automáticamente** al
> registrar la devolución, y quien la registra es el administrador (`RN-PRE-04`, `RN-PRE-11`): la
> automatización no crea un segundo actor.

> **Nota de `RN-INV-44`.** La alerta mira el **stock de hoy**, sin fechas, y por eso no entra en
> conflicto con `RN-CAT-04`, que rige la disponibilidad **por rango**. Si el elemento **no tiene
> umbral cargado no hay alerta** y el sistema **no aplica ningún valor por defecto**; el cálculo es
> uno solo y ningún panel puede inventar otra variante (`RN-PAN-02`).

**Matriz de préstamo por estado físico (`RN-INV-31`)**

| Estado | ¿Se presta la unidad? | ¿Se prestan sus piezas sueltas? |
|--------|----------------------|---------------------------------|
| `OPERATIVO` | Sí | Aplica la regla general de componentes (`RN-INV-08`) |
| `DESCARGADO_AGOTADO` | **No**, salvo el **aparato de un kit** (`RN-INV-26`) | **No** |
| `CON_FALLA` | **No** | **Sí** |
| `AVERIADO` | **No** | **Sí** |
| `EN_MANTENIMIENTO` | **No** | **No** |
| `DADO_DE_BAJA` | **No** | **No** |

`CON_FALLA` y `AVERIADO` comparten la regla de préstamo y se conservan los dos porque difieren en
qué se hace con el equipo (`RN-INV-36`, `RN-INV-42`).

### 5.3 Ciclo de la solicitud

| ID | Regla | Ejemplo | Tipo |
|----|-------|---------|------|
| `RN-SOL-03` | Al aprobar, el administrador **puede modificar** la solicitud y esa modificación es **solo hacia abajo**: la **misma cantidad o menos** de la solicitada, **nunca más** | Se piden 10 unidades y el administrador aprueba 6 | Confirmada |
| `RN-SOL-04` | Al aprobar o al rechazar el administrador deja una **nota del porqué**: **obligatoria** al **rechazar** y al **aprobar reduciendo la cantidad**, **opcional** al aprobar **exactamente lo solicitado** | Un rechazo sin nota se rechaza, y aprobar 6 de 10 exige nota | Confirmada |
| `RN-SOL-05` | El instructor puede **cancelar o modificar** su solicitud **solo mientras está pendiente**, antes de que cambie de estado | Una solicitud ya aprobada no se puede modificar ni cancelar por el instructor | Confirmada |
| `RN-SOL-06` | Si el instructor **no retira** los elementos, el **administrador** puede cancelar la solicitud **mientras la entrega no se haya registrado** | Una solicitud aprobada y sin retirar se puede cancelar; una ya entregada, no | Confirmada |
| `RN-SOL-07` | Una reserva **sin retiro se cancela automáticamente si pasan más de 2 días** desde la **fecha de retiro**, con corte a las **23:59 del segundo día** en la zona horaria local (**America/Bogota**) | Con fecha de retiro el 10, la reserva sigue vigente durante el 11 y el 12 y se cancela al llegar el corte del 12 | Confirmada |
| `RN-SOL-08` | El administrador puede cancelar una solicitud **antes de que se registre la entrega**; una solicitud ya **entregada no se cancela**, porque se cierra por **devolución** o por **pérdida registrada** | Cancelar una solicitud entregada se rechaza; el camino es registrar la devolución o la pérdida | Confirmada |
| `RN-SOL-09` | **No se puede aprobar** una cantidad mayor a la **disponible en el almacén** para el rango solicitado | Si hay 3 disponibles y se piden 5, el máximo aprobable es 3 | Confirmada |
| `RN-SOL-10` | El sistema **distingue** una cancelación por **vencimiento** de una **cancelación manual**: el registro debe permitir saber cuál fue la causa | El historial de la solicitud informa si venció o si la canceló el administrador | Confirmada |
| `RN-SOL-11` | **Entrega parcial: la solicitud sigue viva.** Si se entrega solo **parte** de lo aprobado, la solicitud queda en **`PARTIALLY_DELIVERED`** —entre `PACKED` y `DELIVERED`— y **no se cierra** hasta que se entregue **todo** lo aprobado; lo ya entregado se rige por las reglas del préstamo y lo que falta sigue comprometido | De 3 unidades aprobadas se entrega 1: la solicitud queda en `PARTIALLY_DELIVERED` con 2 pendientes | Confirmada |
| `RN-SOL-12` | **La solicitud se completa cuando no queda nada afuera**: pasa a `COMPLETED` cuando **todo** lo que salió volvió con su condición de retorno o fue **declarado perdido**, y la pérdida cierra lo que esa unidad tenía pendiente dejando el evento registrado | Si la única unidad que faltaba se declara perdida, la solicitud queda `COMPLETED` y la pérdida queda anotada | Confirmada |

> **Nota de `RN-SOL-03` y `RN-SOL-04`.** «La cantidad» es la de la **solicitud entera**, no línea
> por línea: la nota es obligatoria cuando el **total aprobado** es menor que el **total
> solicitado**, y los dos techos aplican a la vez —`RN-SOL-03` acota por lo que se **pidió** y
> `RN-SOL-09` por lo que **hay**—, así que el resultado es siempre el más chico de los dos.

> **Nota de `RN-SOL-06` y `RN-SOL-08`.** Son **una sola regla con dos ids**: `RN-SOL-06` nombra el
> disparador típico —no hubo retiro— y `RN-SOL-08` fija el límite único, la entrega no registrada.

> **Nota de `RN-SOL-11`.** La devolución de lo ya entregado **no saca** la solicitud de
> `PARTIALLY_DELIVERED`: manda el pendiente de entrega, y cuando el resto se entrega el estado que
> resulta es `DELIVERED`, `PARTIALLY_RETURNED` o `COMPLETED` según lo que haya vuelto
> (`RN-SOL-12`). Si lo que falta no se entrega nunca, la solicitud tampoco se cancela: sigue viva
> hasta que lo entregado vuelva o se declare perdido, y entonces se completa.

> **Nota de `RN-SOL-12`.** Un **consumible no es «algo que quedó afuera»**: no tiene serial, no
> vuelve y su cantidad se descuenta al entregarse, así que no entra en la cuenta del cierre.

### 5.4 Préstamos y trazabilidad

| ID | Regla | Ejemplo | Tipo |
|----|-------|---------|------|
| `RN-PRE-01` | La devolución **puede ser parcial** | De 3 unidades prestadas vuelven 2 hoy y 1 mañana | Confirmada |
| `RN-PRE-02` | Se debe poder saber **siempre** quién tiene cada elemento y **desde cuándo** | Un préstamo de un mes o más sigue informando su tenedor y su fecha de entrega | Confirmada |
| `RN-PRE-03` | Al devolver se **revisa el estado físico** de cada elemento antes de guardarlo | La devolución de una unidad registra la revisión de su estado | Confirmada |
| `RN-PRE-04` | El registro de la devolución lo hace el **administrador**, seleccionando las **unidades concretas** que se devuelven; el instructor no opera el sistema | El instructor dice en voz alta qué devuelve y el administrador lo registra | Confirmada |
| `RN-PRE-05` | Al registrar una devolución se anota la **condición de retorno** con una **escala distinta** de la del estado físico de la unidad, más una **descripción** libre | La devolución de un portátil registra su funcionamiento y su estado al devolver, que no son los estados físicos de `RN-INV-30` | Confirmada |
| `RN-PRE-06` | Un elemento devuelto **dañado** queda registrado y genera una **tarea pendiente visible** para el administrador, **sin ninguna consecuencia** sobre el instructor | Una unidad devuelta dañada aparece en las tareas pendientes del administrador | Confirmada |
| `RN-PRE-07` | **No existe plazo de devolución**: el instructor puede declarar una fecha estimada, pero **no pasa nada** si no la cumple | Una devolución posterior a la fecha estimada no genera consecuencia ni estado | Confirmada |
| `RN-PRE-08` | La **condición de retorno** registra **dos dimensiones independientes** —**funcionamiento** y **estado al devolver**— más una descripción libre, y registra **evidencia de daño**, no una impresión general | Un portátil que funciona pero volvió rayado registra las dos cosas por separado | Confirmada |
| `RN-PRE-09` | La **tarea pendiente** la resuelve el **administrador**, que decide **si deja una nota o no**; la resolución queda registrada cambiando el estado de la tarea y, si la deja, con una descripción de lo que se hizo | El administrador resuelve la tarea de un cable faltante con o sin nota, y la tarea queda resuelta | Confirmada |
| `RN-PRE-10` | La **condición de retorno** usa **dos ejes independientes** con valores cerrados más una descripción libre, y es **obligatoria en toda unidad serializada devuelta** | Una unidad devuelta sin condición de retorno se rechaza; un consumible entregado nunca la lleva | Confirmada |
| `RN-PRE-11` | La condición de retorno **actualiza automáticamente** el estado físico de la unidad, sin paso manual, y el administrador **puede corregirlo** después | Un portátil devuelto que funciona y sin daño queda `OPERATIVO` sin que nadie lo cambie a mano | Confirmada |
| `RN-PRE-12` | La condición de retorno se **traduce automáticamente** al estado físico de la unidad con el mapeo de abajo; los estados `AVERIADO`, `DESCARGADO_AGOTADO`, `EN_MANTENIMIENTO` y `DADO_DE_BAJA` **no son automáticos** | Un equipo que vuelve sin funcionar queda `CON_FALLA`; que entre al trámite de baja lo decide el administrador | **Decisión técnica** |
| `RN-PRE-13` | El administrador **no puede rechazar** una devolución —siempre **recibe el elemento**— y al registrar deja una **nota pendiente** cuando **falta algo**, cuando **algo no sirve** o cuando **algo se entregó dañado**; **no existe** un estado de «rechazo de devolución» | Una devolución con una pieza faltante se acepta y abre la tarea pendiente | Confirmada |
| `RN-PRE-14` | Completar una solicitud después de una devolución parcial **no reescribe ni duplica** los registros de devolución ya existentes | La devolución de hoy conserva su registro cuando mañana se completa lo que faltaba | Confirmada |
| `RN-PRE-15` | Cuando una unidad prestada **se pierde**, el **administrador declara la pérdida** y esta se registra como **motivo de la baja** con motivo y actor; la baja sigue el camino de la tenencia —trámite para una unidad del SENA, baja inmediata para una donada— y el instructor **no recibe consecuencia** pero **queda registrado como quien la tenía** | Un portátil extraviado por un instructor se registra como baja por pérdida, con su nombre | Confirmada |
| `RN-PRE-16` | Una unidad perdida queda registrada como **perdida**, de forma **distinguible** de una unidad que simplemente **no fue devuelta** | El listado informa «perdida» y no «prestada» | Confirmada |
| `RN-PRE-17` | El instructor ve **solo sus propios** préstamos | Un instructor no accede a los préstamos de otro | Confirmada |
| `RN-PRE-18` | Una unidad cuya fecha estimada de devolución ya pasó se muestra con una **marca informativa de vencida**, **sin estado propio y sin consecuencia** | Una unidad prestada desde hace dos meses aparece marcada como vencida y sigue prestada | Confirmada |

**Valores cerrados de la condición de retorno (`RN-PRE-10`)**

| Dimensión | Valores | Genera tarea por daño |
|-----------|---------|----------------------|
| **Funcionamiento** | `FUNCIONA` · `FUNCIONA_CON_FALLA` · `NO_FUNCIONA` | Sí cuando no es `FUNCIONA` |
| **Estado al devolver** | `SIN_DAÑO` · `DESGASTE_NORMAL` · `DAÑADO` | Sí cuando es `DAÑADO` |
| **Descripción** | texto libre | — |

**Mapeo al estado físico (`RN-PRE-12`)**

| Funcionamiento | Estado al devolver | Estado resultante |
|----------------|--------------------|-------------------|
| `FUNCIONA` | `SIN_DAÑO` o `DESGASTE_NORMAL` | `OPERATIVO` |
| `FUNCIONA` | `DAÑADO` | `OPERATIVO` |
| `FUNCIONA_CON_FALLA` | cualquiera | `CON_FALLA` |
| `NO_FUNCIONA` | cualquiera | `CON_FALLA` |

> **Nota de `RN-PRE-06` y `RN-PRE-13`.** El disparador de la tarea pendiente no es solo el daño: se
> genera con **pieza faltante**, con **elemento que no funciona** o con **elemento dañado**.

> **Nota de `RN-PRE-09`.** La tarea tiene **exactamente dos estados** —pendiente y resuelta—, la
> resuelve el administrador y **no se reabre**: si la misma unidad vuelve a fallar se crea una
> **tarea nueva**.

> **Nota de `RN-PRE-10`.** `DESGASTE_NORMAL` existe para **absolver al instructor**: el uso desgasta
> y, sin ese valor, todo roce se marcaría `DAÑADO` y abriría tareas fantasma. Los dos ejes son
> necesarios porque el caso que rompe una escala única es el **portátil rayado que funciona**.

> **Nota de `RN-PRE-12`.** `FUNCIONA` + `DAÑADO` queda **`OPERATIVO`**: la unidad sigue **prestable**,
> el daño abre su **tarea pendiente** y el administrador la atiende. **Límite conocido:** el mapeo no
> distingue «se agotó» de «se rompió», así que una pila descargada devuelta queda en `CON_FALLA` y
> es el administrador quien la reclasifica.

> **Nota de `RN-PRE-15`.** La unidad perdida **sale del inventario activo de inmediato**, **no
> bloquea** disponibilidad y sus **piezas sueltas siguen prestables** durante el trámite: lo que se
> perdió es la unidad, no sus componentes. **Prevalece sobre `RN-INV-33`** —no se le aplica el
> bloqueo total— y sobre `RN-INV-19` en cuanto a «sigue existiendo en el inventario». La pérdida es
> el **motivo** de un registro de baja que ya existe, no un estado nuevo.

### 5.5 Correcciones a hallazgos técnicos previos

El hallazgo que describía una **doble reserva** de un componente ensamblado estaba **mal
diagnosticado**: que una pieza salga de un conjunto ocioso es lo que el negocio quiere (`RN-INV-08`) y
al empacar se reservan el padre **y sus hijos**. El defecto que sobrevive es otro —el empacado nunca
verifica que los componentes **obligatorios** estén presentes, así que un compuesto puede entregarse
incompleto contra `RN-INV-02`— y está registrado en §9, fila 6.

### 5.6 Catálogo del instructor

| ID | Regla | Ejemplo | Tipo |
|----|-------|---------|------|
| `RN-CAT-01` | El catálogo del instructor lista **elementos**, no unidades físicas, y el instructor **no elige un número de serie** | Un elemento con tres unidades aparece como una fila con cantidad 3 y ningún serial | Confirmada |
| `RN-CAT-02` | El catálogo se puede **buscar por nombre** y **filtrar por categoría** | Buscar un fragmento del nombre y filtrar por una categoría deja solo los elementos de esa categoría que lo contienen | Confirmada |
| `RN-CAT-03` | La disponibilidad se informa **por elemento, como cantidad**, y se calcula para el **rango de fechas** solicitado | Un elemento con tres unidades y una reservada dentro del rango informa 2, y en otro rango informa 3 | Confirmada |
| `RN-CAT-04` | El catálogo **muestra el rango de fechas con el que calcula** la disponibilidad, visible y modificable en la misma pantalla, y **nunca informa una cantidad sin un rango asociado**; la **fecha de retiro más temprana que el rango admite es hoy** | El catálogo permite consultar con el rango que empieza hoy, y cambiar el rango cambia la cantidad informada | Confirmada |
| `RN-CAT-05` | Un elemento **sin disponibilidad** sigue apareciendo en el catálogo con cantidad **0**, pero **no se puede seleccionar** para una solicitud | Un elemento con todas sus unidades reservadas en el rango aparece con 0 y no se ofrece como seleccionable | Confirmada |

> **Nota de `RN-CAT-04`.** **Prevalece `RN-SOL-01`**: el catálogo **no puede impedir consultar hoy**.
> El **valor inicial** del rango —hoy o mañana— y el de la fecha estimada de devolución son
> decisiones de interfaz, no reglas de negocio.

### 5.7 Usuarios

| ID | Regla | Ejemplo | Tipo |
|----|-------|---------|------|
| `RN-USR-01` | El **administrador** da de alta a los instructores y **no existe registro público** | Nadie crea su propia cuenta: el alta la hace el administrador | Confirmada |
| `RN-USR-02` | Datos **obligatorios** de un instructor: **nombre, tipo de documento, número de documento, teléfono celular, turno y correo electrónico**; la **foto es opcional** | Un alta sin turno se rechaza; sin foto se acepta | Confirmada |
| `RN-USR-03` | **No existe recuperación de contraseña por correo**: si un instructor olvida su contraseña, el **administrador se la cambia** y el sistema **no envía ningún correo** | El administrador fija una contraseña nueva y no sale ningún correo de restablecimiento | Confirmada |
| `RN-USR-04` | Un usuario **con sesión iniciada puede cambiar su propia contraseña** | El instructor cambia su contraseña desde la aplicación | Confirmada |
| `RN-USR-05` | Desactivar a un instructor **le impide iniciar sesión**, pero **no cancela sus préstamos ni sus solicitudes en curso**: sigue **obligado a devolver** lo que tiene | Un instructor desactivado con dos equipos afuera sigue debiéndolos | Confirmada |
| `RN-USR-06` | Cambiar la **propia** contraseña cierra **todas** las sesiones abiertas del usuario, **incluida la actual** | Después del cambio hay que volver a iniciar sesión | Confirmada |
| `RN-USR-07` | Cuando el **administrador** restablece la contraseña de un instructor, **todas** las sesiones de ese instructor **se cierran** | El instructor restablecido vuelve a iniciar sesión con la contraseña nueva | Confirmada |
| `RN-USR-08` | Un instructor **con historial no se elimina**: solo se **desactiva**, y su historial se conserva | Eliminar un instructor con préstamos se rechaza; desactivarlo se acepta | Confirmada |
| `RN-USR-09` | El **primer administrador** se crea **fuera de la aplicación**, en la base de datos o mediante el seed; la aplicación **no** ofrece registro público | La aplicación nunca crea administradores | Confirmada |
| `RN-USR-10` | **No se puede eliminar ni desactivar al último administrador activo** | El intento de desactivar al único administrador se rechaza | Confirmada |
| `RN-USR-11` | Un instructor **desactivado puede reactivarse** | Al reactivarlo recupera el acceso y conserva sus datos y su historial | Confirmada |
| `RN-USR-12` | Para cambiar la **propia** contraseña hay que **indicar la contraseña actual** | Un cambio sin la contraseña actual se rechaza | Confirmada |

### 5.8 Autenticación y sesión

| ID | Regla | Ejemplo | Tipo |
|----|-------|---------|------|
| `RN-AUTH-01` | Fija el vocabulario de la sesión: **token de acceso**, **token de refresco** y **sesión** tienen un solo significado en todo el sistema | «Cerrar la sesión» es terminar el par de tokens; borrar solo el de acceso no cerró la sesión | **Estándar** |
| `RN-AUTH-02` | El **token de refresco nunca viaja en el cuerpo** de la respuesta: solo se entrega como cookie `httpOnly` | Una respuesta que incluya el token de refresco en el cuerpo es un defecto, aunque también lo entregue por cookie | **Estándar** |
| `RN-AUTH-03` | Los mensajes de error de autenticación **no revelan si una cuenta existe**: un correo inexistente, una contraseña incorrecta y una cuenta inactiva producen la **misma** respuesta observable | Los tres casos responden igual, sin permitir enumerar los correos registrados | **Estándar** |
| `RN-AUTH-04` | El **cierre de sesión invalida la credencial en el servidor**: una copia capturada del token deja de servir, y **borrar la cookie no es** cerrar la sesión | Un token copiado antes del cierre ya no sirve después | Confirmada |
| `RN-AUTH-05` | Cada usuario tiene un **identificador de sesión** que viaja en el token y se verifica en cada petición; cerrar sesión, cambiar o restablecer la contraseña y desactivar la cuenta lo **incrementan**, con lo que todos los tokens anteriores dejan de valer | Los tres eventos de seguridad se resuelven con un solo mecanismo | **Decisión técnica** |
| `RN-AUTH-06` | El inicio de sesión tiene un **límite de intentos por origen** con **espera progresiva** y **sin bloqueo de cuenta**: **5 intentos fallidos** por **IP de origen + correo** dentro de una **ventana de 15 minutos** | Al sexto intento fallido de la misma IP y el mismo correo se aplica espera progresiva, y fallar contra un correo no deja a esa cuenta sin poder entrar desde otro origen | Confirmada |
| `RN-AUTH-07` | La **sesión dura una jornada de 8 horas**: el token de acceso vive **15 minutos** y el de refresco **8 horas**, contadas de forma **absoluta desde el inicio de sesión** | Usar la aplicación **no renueva** la sesión: a las 8 horas hay que volver a iniciar sesión | Confirmada |
| `RN-AUTH-08` | El correo identifica la cuenta **sin distinguir mayúsculas** | `Admin@…` y `admin@…` son la misma cuenta, con independencia de la colación de la base de datos | Confirmada |

**Vocabulario de la sesión (`RN-AUTH-01`)**

| Término | Definición |
|---------|------------|
| **Token de acceso** | Credencial de **corta** duración, enviada en `Authorization: Bearer <token>`. Prueba la identidad en cada petición |
| **Token de refresco** | Credencial de **larga** duración, entregada solo como cookie `httpOnly`. Sirve únicamente para emitir un token de acceso nuevo |
| **Sesión** | El par (token de acceso, token de refresco) emitido en un inicio de sesión |

> **Nota de `RN-AUTH-03`.** La cuenta inactiva **no puede** iniciar sesión (`RN-USR-05`), pero su
> rechazo tiene que ser **indistinguible** del de una contraseña incorrecta.

> **Nota de `RN-AUTH-05`.** El mecanismo implica una **lectura por petición** del identificador
> vigente —o una **caché** con el mismo efecto—, y es lo que hace exigible `RN-USR-05`: la
> desactivación corta el acceso de inmediato, sin esperar a que venza el token.

> **Nota de `RN-AUTH-06`.** Un **bloqueo de cuenta** sería un regalo para una denegación de
> servicio: cualquiera que adivine un correo podría dejar a esa persona sin poder entrar. El límite
> es de la **combinación IP + correo**, así que varias personas del mismo taller pueden compartir una
> dirección de red sin bloquearse entre sí.

> **Nota de `RN-AUTH-07`.** Una sesión de un turno resuelve el riesgo real de este proyecto: una
> sesión abierta en una **máquina compartida del taller**, que con un refresco de siete días
> sobreviviría una semana para la siguiente persona.

### 5.9 Categorías

| ID | Regla | Ejemplo | Tipo |
|----|-------|---------|------|
| `RN-CATEG-01` | El **administrador** es el único que administra las categorías; los instructores solo las consultan para filtrar el catálogo | Crear una categoría con sesión de instructor responde `403` | Confirmada |
| `RN-CATEG-02` | Una categoría tiene **nombre único** y se puede **editar** | Intentar crear una segunda categoría con el mismo nombre se rechaza | Confirmada |
| `RN-CATEG-03` | **No se puede eliminar** una categoría que tiene elementos asociados | Eliminar una categoría con elementos referenciados se rechaza y no deja elementos sin agrupación | Confirmada |

> **Nota de `RN-CATEG-01` y `RN-CATEG-03`.** Es la misma separación de actores de `RN-CTX-05`
> aplicada a un dato del catálogo —el instructor usa la categoría como filtro (`RN-CAT-02`), no la
> edita— y el mismo criterio de `RN-CTX-09` con los ambientes: un dato que otros registros
> referencian no se borra.

### 5.10 Historial de movimientos

| ID | Regla | Ejemplo | Tipo |
|----|-------|---------|------|
| `RN-MOV-01` | El sistema mantiene un **historial de movimientos**: cada evento que cambia la situación de una unidad o de un elemento —**alta, ensamblaje, desensamblaje, reserva, entrega, devolución, baja y ajuste de cantidad**— con **tipo de movimiento, sujeto afectado, actor, fecha** y la **solicitud asociada** cuando corresponda | La secuencia completa de una unidad se lee del historial, evento por evento | Confirmada |
| `RN-MOV-02` | El historial es **consultable por el administrador**, con filtros por **unidad, elemento, tipo de movimiento y rango de fechas** | El administrador reconstruye qué pasó con una unidad y quién lo hizo | Confirmada |

> **Nota de `RN-MOV-01`.** La **pérdida no es un movimiento propio**: deja su movimiento por el
> camino de la **baja**, cuyo **motivo** es la pérdida (`RN-PRE-15`, `RN-INV-17`). El **ajuste de
> cantidad** también es un movimiento y es el único que no mueve una unidad física.

> **Nota de `RN-MOV-02`.** El instructor **no** accede al historial completo: ve solo lo suyo
> (`RN-PRE-17`).

### 5.11 Paneles de inicio

| ID | Regla | Ejemplo | Tipo |
|----|-------|---------|------|
| `RN-PAN-01` | El sistema tiene un **panel de inicio por rol**: el **administrador** ve instructores **activos**, elementos del catálogo, solicitudes pendientes, **alertas de stock bajo** y las últimas solicitudes; el **instructor** ve sus solicitudes activas, sus devoluciones pendientes y su carrito | El panel del instructor no muestra el padrón ni las alertas de stock, que son indicadores del almacén | Confirmada |
| `RN-PAN-02` | **Cada indicador del panel se calcula con la misma regla que la pantalla que lo detalla**: un panel no puede inventar un cálculo propio | El número de alertas de stock bajo del panel es el de `RN-INV-44`, no una variante | Confirmada |

> **Nota de `RN-PAN-01`.** El **carrito** del instructor vive **solo en el navegador**, no se guarda
> en el servidor, **no compromete disponibilidad** y se **vacía al crear la solicitud**: es un
> borrador, no un compromiso. Los dos paneles no son el mismo panel recortado: uno resume el almacén
> y el otro la operación del instructor, y que el instructor no vea el padrón ni las alertas de stock
> sale de esta regla y de `RN-CTX-05` y `RN-CTX-06`, no de `RN-PRE-17`.

### 5.12 Notificaciones

| ID | Regla | Ejemplo | Tipo |
|----|-------|---------|------|
| `RN-NOT-01` | El sistema **avisa dentro del propio sistema** los eventos que el instructor necesita conocer: la **aprobación**, el **rechazo con su motivo**, que el pedido está **listo para retirar**, el **vencimiento** de la reserva y la **cancelación manual** de su solicitud; el instructor puede consultar esos avisos | El instructor ve el motivo del rechazo en el aviso, no en una llamada | Confirmada |
| `RN-NOT-02` | Además del aviso interno, el sistema **puede enviar el aviso por correo electrónico y por WhatsApp**, según se configure | Un canal externo configurado duplica el aviso interno, que es el garantizado | Confirmada |

> **Nota de `RN-NOT-01`.** La lista es **cerrada** y **la entrega no se avisa**, porque ocurre con el
> instructor presente (`RN-PRE-04`). El **motivo del rechazo** es la nota de `RN-SOL-04`; el aviso de
> **listo para retirar** es el **efecto de `PACKED`** (`RN-SOL-02`), y el **vencimiento** es el de
> `RN-SOL-07`, que `RN-SOL-10` obliga a distinguir de la cancelación manual.

> **Nota de `RN-NOT-02`.** Hoy el proyecto **no tiene servidor de correo ni integración con
> WhatsApp**: la regla fija la intención y esos canales son **dependencia externa**. El aviso interno
> es el que el sistema debe garantizar por sí solo y **no bloquea** ninguna otra regla.

## 6. Modelo de reservas

`RN-NEG-01` a `RN-NEG-04` no se pueden cumplir con el modelo actual: `InventoryUnit.status` es un
único valor global y no puede expresar «libre el martes, ocupado el miércoles».

### Resumen del modelo

| Entidad | Qué representa | Dónde vive |
|---------|----------------|------------|
| **Elemento** | El objeto del catálogo, serializado o consumible, con su tenencia cuando es consumible | `Item` |
| **Unidad** | La instancia física de un elemento serializado, con su serial, su tenencia y su ubicación | `InventoryUnit` |
| **Composición** | De qué está hecho un compuesto, con la marca obligatorio u opcional de cada componente | `ItemComponent` |
| **Ensamblaje** | Qué unidades físicas están unidas formando un conjunto | `parentUnitId` |
| **Solicitud** | El pedido y su estado | `Request` |
| **Reserva** | El compromiso de una unidad serializada en un rango de fechas | **Entidad nueva** |
| **Préstamo** | La entrega real, con su responsable y sus fechas | `RequestItemUnit` |
| **Condición de retorno** | Cómo volvió cada unidad devuelta: funcionamiento, estado al devolver y descripción | `RequestItemUnit` |
| **Movimiento** | El registro de cada evento que cambia la situación de una unidad o de un elemento | **Entidad nueva** |

**Estados físicos de la unidad: lista cerrada** (`RN-INV-30`): `OPERATIVO`,
`DESCARGADO_AGOTADO`, `CON_FALLA`, `AVERIADO`, `EN_MANTENIMIENTO` y `DADO_DE_BAJA`. `RESERVED` deja
de ser un estado físico, porque pasa a ser una reserva. La **presencia** es otro eje, independiente
del estado (`RN-INV-25`).

**Estados de la solicitud**, en una línea cada uno:

- `PENDING` — creada, esperando la decisión del administrador.
- `APPROVED` — aprobada, todavía sin empacar.
- `PACKED` — verificada y empacada; el instructor ya fue avisado.
- `PARTIALLY_DELIVERED` — se entregó parte de lo aprobado y lo que falta sigue comprometido.
- `DELIVERED` — salió todo lo aprobado.
- `PARTIALLY_RETURNED` — volvió parte de lo entregado y algo sigue afuera.
- `COMPLETED` — no queda nada afuera.
- `CANCELLED` — cancelada antes de registrar la entrega, por vencimiento o a mano.
- `REJECTED` — rechazada, con la nota del porqué.

El **estado de trámite de baja** no es un estado físico de la lista: es una **bandera de proceso**
separada, y una unidad `AVERIADO` puede estar además en trámite.

**Disponibilidad de una unidad para un rango** = su **estado físico lo permite** —con la excepción
del **aparato principal de un kit**, que se presta solo aunque su unidad esté `DESCARGADO_AGOTADO`
(`RN-INV-26`)—, **no tiene una reserva solapada** con ese rango, **no está prestada** (`RN-NEG-05`),
**no está en trámite de baja** (`RN-INV-33`) y, **si es una pieza suelta de un ensamblaje, su padre
lo permite** (`RN-INV-31`).

```
¿Hay N unidades del elemento X libres entre el 10 y el 13 de marzo?
  → unidades con estado apto
  → que no tengan reserva solapada con [10, 13]
  → que no estén en trámite de baja (RN-INV-33), salvo que estén declaradas perdidas (RN-PRE-15)
  → que, siendo pieza suelta de un ensamblaje, el estado de su padre permita prestarlas (RN-INV-31)
  → que no estén comprometidas en una reserva o préstamo activo de su conjunto padre
```

La **cuarta** condición es imprescindible porque el bloqueo por trámite de baja **no se puede
expresar** con la lista cerrada de estados físicos. La **quinta** existe porque el estado que manda
sobre una **pieza suelta** es el de su **padre**: mirar solo el estado de la pieza dejaría
disponible una pieza que su padre no puede soltar. Pertenecer a un ensamblaje **no** quita
disponibilidad: lo que bloquea es estar **comprometido** dentro de la reserva o el préstamo de su
padre (`RN-INV-08`). Una unidad **declarada perdida** no aparece en la consulta: no es una unidad
disponible, es una unidad que ya no está (`RN-PRE-15`).

**Forma de la reserva** — describe **solo unidades serializadas**, que son el único caso con reserva
por rango de fechas:

| Caso | Sujeto de la reserva | Cantidad |
|------|----------------------|----------|
| Elemento serializado | Una unidad concreta (`InventoryUnit`) | Siempre 1 |

Un **consumible nunca se reserva por fecha**: se descuenta del stock al **registrar la entrega**
(`RN-INV-11`), en su **unidad de medida** (`RN-INV-12`) y en cantidades **enteras** (`RN-INV-18`).
Lo que se descuenta al crear la solicitud es la **reserva** de una unidad serializada (`RN-NEG-03`).
Ver `OPEN-INV-04` en §8.2.

### Ciclo de vida de la solicitud

Estados **cerrados** de una `Request`.

| Estado | Qué significa | Cómo se sale |
|--------|---------------|--------------|
| `PENDING` | Creada, esperando la decisión del administrador | `APPROVED` o `REJECTED` (`RN-SOL-04`); `CANCELLED` por el instructor (`RN-SOL-05`) o por vencimiento de la reserva (`RN-SOL-07`, `RN-SOL-10`) |
| `APPROVED` | Aprobada, todavía no empacada | `PACKED`; `CANCELLED` mientras la entrega no se registre (`RN-SOL-08`), o por vencimiento de la reserva (`RN-SOL-06`, `RN-SOL-07`) |
| `PACKED` | Verificada y empacada; **el instructor ya fue avisado**, porque el aviso es el efecto de `PACKED` (`RN-SOL-02`, `RN-NOT-01`) | `PARTIALLY_DELIVERED`, `DELIVERED`, o `CANCELLED` mientras la entrega no se registre (`RN-SOL-08`), o por vencimiento de la reserva (`RN-SOL-07`) |
| `PARTIALLY_DELIVERED` | Se entregó **parte** de lo aprobado; lo que falta sigue comprometido y lo ya entregado se rige por las reglas del préstamo (`RN-SOL-11`, `RN-PRE-01` a `RN-PRE-18`) | `PARTIALLY_DELIVERED` otra vez —la devolución de lo ya entregado no la saca de acá—; `DELIVERED` o `PARTIALLY_RETURNED` cuando ya salió todo; `COMPLETED` cuando no queda nada afuera (`RN-PRE-01`, `RN-SOL-12`) |
| `DELIVERED` | Salió **todo** lo aprobado, de una vez o en la última de las parciales | `PARTIALLY_RETURNED` o `COMPLETED` (`RN-PRE-01`, `RN-SOL-12`) |
| `PARTIALLY_RETURNED` | Volvió **parte** de lo entregado; falta algo por volver o por declararse perdido | `PARTIALLY_RETURNED` otra vez, o `COMPLETED` (`RN-SOL-12`) |
| `COMPLETED` | **No queda nada afuera**: todo lo que salió volvió o fue declarado perdido (`RN-SOL-12`). Un **consumible** no entra en esa cuenta, porque nunca vuelve (`RN-INV-06`, `RN-INV-11`) | Estado final |
| `CANCELLED` | Cancelada **antes** de registrar la entrega (`RN-SOL-06`, `RN-SOL-08`); el registro distingue vencimiento de cancelación manual (`RN-SOL-10`) | Estado final |
| `REJECTED` | Rechazada, con la nota obligatoria del porqué (`RN-SOL-04`) | Estado final |

**Consecuencias del ciclo de vida**

1. **La entrega parcial no cierra nada.** Mientras quede algo por entregar, la solicitud sigue viva
   en `PARTIALLY_DELIVERED` y lo pendiente sigue comprometido (`RN-SOL-11`). Lo que **ya salió** es
   un **préstamo** y vuelve por las reglas de la devolución, incluso por partes (`RN-PRE-01`).
2. **La pérdida declarada cierra lo que esa unidad tenía pendiente y deja el evento registrado**
   (`RN-PRE-15`, `RN-PRE-16`, `RN-SOL-12`). No se inventa un estado `PERDIDA` para la solicitud ni
   para la unidad.
3. **Se completa cuando no queda nada afuera** (`RN-SOL-12`): todo lo entregado volvió con su
   condición de retorno (`RN-PRE-10`) o fue declarado perdido. `PARTIALLY_RETURNED` **no** es un
   final, y un **consumible no cuenta** en esa suma.
4. **Una solicitud con entrega parcial recibe devoluciones sin cambiar de estado.** La devolución no
   la pasa a `PARTIALLY_RETURNED` mientras exista un pendiente de entrega; cuando el resto se
   entrega, toma el estado que sus unidades dictan: `DELIVERED`, `PARTIALLY_RETURNED` o `COMPLETED`.
5. **Si lo que falta no se entrega nunca**, la solicitud **no se cancela** —`RN-SOL-08` pone el
   límite en la entrega y ya hubo una— y sigue en `PARTIALLY_DELIVERED` con lo entregado sujeto a la
   trazabilidad del préstamo (`RN-PRE-02`) hasta que esas unidades vuelvan o se declaren perdidas;
   entonces pasa a `COMPLETED`.
6. **El aviso no es un estado.** La secuencia sigue siendo `PENDING → APPROVED → PACKED → DELIVERED
   → COMPLETED`, con los estados parciales **intercalados** sin reemplazar a ninguno.

## 7. Cambios que el modelo necesita

Los cambios de modelo que **exigen las reglas confirmadas** de este documento. Se registran acá para
que ningún epic los invente por su cuenta.

| # | Cambio | Motivo |
|---|--------|--------|
| 1 | `Request` necesita `pickupDate` y `estimatedReturnDate` | `RN-NEG-04`. Hoy existe `estimatedDate` con significado ambiguo |
| 2 | Entidad `Reservation` (unidad + solicitud + desde/hasta; solo unidades serializadas) | `RN-NEG-01`, `RN-NEG-02` |
| 3 | `Item` necesita una cantidad de stock para consumibles | `RN-INV-06`. El stock no se puede contar en unidades |
| 4 | Campos para la nota de aprobación y el motivo de rechazo | `RN-SOL-04` |
| 5 | Ubicación actual de la unidad | `RN-CTX-04`, `RN-CTX-07` |
| 6 | Mecanismo de cancelación automática a los 2 días | `RN-SOL-07` |
| 7 | Campo de **tenencia** en la unidad (serializados) y en el elemento (consumibles) | `RN-INV-07`, `RN-INV-14`, `RN-INV-20` |
| 8 | **Unidad de medida** y cantidad **entera** por consumible | `RN-INV-12`, `RN-INV-18` |
| 9 | ~~Registro de préstamo informal sin solicitud~~ — **DESCARTADO**: `RN-INV-15` está `REFUTADA` (§8.2) | `RN-INV-15` |
| 10 | **Estado de trámite de baja**, distinto de «dado de baja», como **bandera de proceso** independiente de la lista cerrada de estados físicos | `RN-INV-19`, `RN-INV-33` |
| 11 | **Motivo y actor de la baja** | `RN-INV-17` |
| 12 | **Confirmación de la baja** de un equipo del SENA | `RN-INV-19`, `RN-INV-32` |
| 13 | **Condición de retorno** y **descripción** por unidad devuelta | `RN-PRE-05` |
| 14 | **Tarea pendiente** por pieza faltante, elemento que no funciona o elemento dañado, con su estado de resolución | `RN-PRE-06`, `RN-PRE-13` |
| 15 | **Funcionamiento** y **estado al devolver**, como **dos campos distintos** | `RN-PRE-08` |
| 16 | **Estado y descripción de resolución** de la tarea por pieza faltante, elemento que no funciona o elemento dañado | `RN-PRE-06`, `RN-PRE-09`, `RN-PRE-13` |
| 17 | **Actualización automática del estado físico** de la unidad a partir de la condición de retorno | `RN-PRE-11` |
| 18 | **Bloqueo total** de una unidad en trámite de baja: ni la unidad ni sus piezas sueltas | `RN-INV-33` |
| 19 | **Tipo de documento** separado del **número de documento** | `RN-USR-02` |
| 20 | **Turno obligatorio** en el alta de instructor | `RN-USR-02` |
| 21 | **Cambio de contraseña** propio y **restablecimiento** por el administrador | `RN-USR-03`, `RN-USR-04` |
| 22 | **Registro de piezas faltantes** de un conjunto: qué pieza falta y en poder de quién está | `RN-INV-09`, `RN-INV-24` |
| 23 | **Registro de cambios de la composición**: qué cambió, quién lo cambió y cuándo | `RN-INV-29` |
| 24 | **Lista cerrada de estados físicos** de la unidad | `RN-INV-30` |
| 25 | **Bandera obligatorio / opcional** por componente de la composición | `RN-INV-37` |
| 26 | **Detección de ciclos** al validar la composición de un compuesto | `RN-INV-41` |
| 27 | **Registro de pérdida** de una unidad: ninguna unidad se pierde sin quedar registrada | `RN-INV-13` |
| 28 | **Identificador de sesión por usuario**, verificado en cada petición | `RN-AUTH-05` |
| 29 | **Registro de pérdida como motivo de baja** de una unidad prestada, con su motivo, su actor y su fecha | `RN-INV-17`, `RN-PRE-15` |
| 30 | **Historial de movimientos**: cada evento que cambia la situación de una unidad o de un elemento, con tipo, sujeto, actor, fecha y solicitud asociada cuando corresponda | `RN-MOV-01`, `RN-MOV-02` |
| 31 | **Aviso dentro del sistema** para el instructor, consultable por él | `RN-NOT-01` |
| 32 | **Umbral mínimo de stock** (`minStock`) por elemento, con su **alerta de stock bajo** al administrador | `RN-INV-44` |
| 33 | **Flujo de mantenimiento** de un equipo `CON_FALLA`: envío a mantenimiento y decisión de su nuevo estado físico al volver | `RN-INV-42` |
| 34 | **Baja de un elemento del catálogo**, con su registro: el elemento no se elimina físicamente y sigue consultable | `RN-INV-45` |
| 35 | **Protección del último administrador activo**: no se puede eliminar ni desactivar | `RN-USR-10` |
| 36 | **Estado `PARTIALLY_DELIVERED`** de la solicitud, entre `PACKED` y `DELIVERED` | `RN-SOL-11` |
| 37 | **Cierre de la solicitud** cuando no queda nada afuera, con la pérdida declarada como evento registrado | `RN-SOL-12`, `RN-PRE-15`, `RN-PRE-16` |

## 8. Preguntas

### 8.1 Preguntas abiertas

**Ninguna abierta:** todas las preguntas de este documento están respondidas en 8.2, con la regla que
las responde.

| ID | Pregunta | Bloquea |
|----|----------|---------|

### 8.2 Preguntas ya respondidas

Los epics citan estos ids como autoridad: acá está la regla que los respondió y ninguno está abierto.

| ID | Pregunta | Respondida por |
|----|----------|----------------|
| `OPEN-CTX-02` | ¿El sistema debe registrar **dónde está** cada unidad? | `RN-CTX-07` |
| `OPEN-CTX-03` | ¿Se construye el **epic 09 de reportes**? | No: descartado por decisión del negocio (§10) |
| `OPEN-NEG-01` | ¿Qué **fechas** declara una solicitud? | `RN-NEG-04` |
| `OPEN-NEG-02` | ¿Una unidad **prestada** bloquea la disponibilidad futura? | `RN-NEG-05` |
| `OPEN-INV-01` | ¿Un componente de un ensamblaje **puede prestarse suelto**? | `RN-INV-08` (refuta `RN-INV-04`) |
| `OPEN-INV-02` | ¿Los consumibles tienen **número de serie**? | `RN-INV-06` |
| `OPEN-INV-04` | ¿Un consumible **se reserva por fecha**? | `RN-INV-11` |
| `OPEN-INV-09` | ¿**Dónde vive la tenencia** (SENA / donado)? | `RN-INV-20` |
| `OPEN-INV-11` | ¿**Quién confirma** la baja de un equipo del SENA? | `RN-INV-32` |
| `OPEN-INV-12` | ¿Qué pasa con la unidad **y sus piezas** durante el trámite de baja? | `RN-INV-33` (con la excepción de `RN-PRE-15`) |
| `OPEN-INV-13` | ¿Un componente **opcional** faltante impide prestar el conjunto? | `RN-INV-24` |
| `OPEN-INV-14` | ¿Un **kit** incluye el **aparato** como un componente más? | `RN-INV-26` |
| `OPEN-INV-15` | ¿Un componente **presente pero agotado** cuenta como faltante? | `RN-INV-25` |
| `OPEN-INV-16` | ¿Un compuesto **puede contener otro compuesto**? | `RN-INV-27` |
| `OPEN-INV-17` | ¿**Todas las pilas** son serializadas? | `RN-INV-28` |
| `OPEN-INV-18` | ¿Cuál es la **lista cerrada de estados físicos**? | `RN-INV-30` |
| `OPEN-INV-19` | ¿Se puede **editar la composición** de un compuesto? | `RN-INV-29` |
| `OPEN-INV-20` | ¿El carácter **consumible** se fija por elemento o por unidad? | `RN-INV-34` |
| `OPEN-INV-21` | ¿Se puede **quitar un componente** de la composición? | `RN-INV-35` |
| `OPEN-INV-23` | ¿Qué distingue `CON_FALLA` de `AVERIADO`? | `RN-INV-36`, confirmada por `RN-INV-42` |
| `OPEN-INV-24` | ¿Cómo **termina** un **préstamo informal** y **compromete disponibilidad** mientras dura? | `RN-INV-15`, **`REFUTADA`**: no existe el préstamo informal |
| `OPEN-INV-25` | El **umbral mínimo de stock** (`minStock`): ¿**quién** lo fija y **con qué valor**? | `RN-INV-44`: lo fija el administrador por elemento; sin umbral no hay alerta ni valor por defecto |
| `OPEN-INV-26` | Una unidad `DESCARGADO_AGOTADO` no presta sus piezas sueltas (`RN-INV-31`), pero `RN-INV-26` declara prestable el aparato de un kit. ¿Qué prevalece? | `RN-INV-26` **prevalece**: el aparato se presta solo aunque su unidad esté `DESCARGADO_AGOTADO` |
| `OPEN-INV-27` | ¿`RN-INV-25` aplica igual a un componente **donado** presente pero agotado? | `RN-INV-25`: sí, **sin variante por tenencia** |
| `OPEN-SOL-01` | ¿Existe **expiración automática** de una reserva sin retiro? | `RN-SOL-07` |
| `OPEN-SOL-04` | ¿Hasta cuándo puede el administrador **cancelar** una solicitud? | `RN-SOL-06` y `RN-SOL-08` |
| `OPEN-SOL-06` | ¿En qué momento **se descuenta** la cantidad de un consumible? | `RN-INV-11` |
| `OPEN-SOL-07` | «**La cantidad**» de `RN-SOL-03`: ¿**por línea** o **por solicitud entera**? | `RN-SOL-03` y `RN-SOL-04`: **por solicitud entera** |
| `OPEN-SOL-08` | El vencimiento de la reserva a los **2 días**: ¿**a qué hora** y en **qué zona horaria**? | `RN-SOL-07`: a las **23:59 del segundo día**, en **America/Bogota** |
| `OPEN-PRE-02` | ¿Qué registra la **condición de retorno**? | `RN-PRE-08` |
| `OPEN-PRE-04` | ¿Quién **resuelve la tarea** y con qué nota? | `RN-PRE-09` |
| `OPEN-PRE-05` | ¿La condición de retorno **actualiza el estado físico**? | `RN-PRE-11` |
| `OPEN-PRE-06` | ¿Qué **escala** usa la condición de retorno? | `RN-PRE-10` |
| `OPEN-PRE-07` | ¿El administrador **puede rechazar** una devolución? | `RN-PRE-13` |
| `OPEN-PRE-08` | ¿Cómo se **traduce** la condición de retorno al estado físico? | `RN-PRE-12` |
| `OPEN-PRE-09` | ¿Completar una solicitud **reescribe** las devoluciones parciales? | `RN-PRE-14` |
| `OPEN-PRE-10` | ¿Qué pasa cuando una unidad prestada **se pierde**? | `RN-PRE-15` |
| `OPEN-PRE-11` | La **tarea pendiente**: ¿qué **estados** tiene, **quién** la resuelve y puede **reabrirse**? | `RN-PRE-09`: dos estados, la resuelve el administrador, no se reabre y una falla nueva abre una tarea nueva |
| `OPEN-PRE-12` | `FUNCIONA` + `DAÑADO`: ¿`CON_FALLA` o `OPERATIVO`? | `RN-PRE-12`: **`OPERATIVO`**, con la **tarea de daño abierta** |
| `OPEN-CAT-01` | ¿El catálogo **muestra el rango** con el que calcula la disponibilidad? | `RN-CAT-04` |
| `OPEN-USR-01` | ¿Cambiar la propia contraseña **cierra las sesiones** abiertas? | `RN-USR-06` |
| `OPEN-AUTH-01` | ¿Debe existir **bloqueo tras N intentos fallidos**? | `RN-AUTH-06` (límite por origen, **sin** bloqueo de cuenta) |
| `OPEN-AUTH-03` | ¿Al desactivar un usuario debe **cortarse su sesión** de inmediato? | `RN-USR-05` + `RN-AUTH-05`: **sí**, sin ventana que aceptar |
| `OPEN-AUTH-05` | ¿El **cambio** y la **recuperación** de contraseña cierran las sesiones abiertas? | `RN-USR-03` y `RN-USR-04`, con `RN-USR-06` y `RN-USR-07` |
| `OPEN-AUTH-06` | ¿**Qué roles** pueden iniciar sesión y puede autenticarse un usuario **inactivo**? | `RN-CTX-05` + `RN-USR-05` |
| `OPEN-AUTH-02` | ¿Son correctas las **duraciones de sesión**? | `RN-AUTH-07` |
| `OPEN-AUTH-04` | ¿El cierre de sesión **invalida la credencial en el servidor**? | `RN-AUTH-04` y `RN-AUTH-05` |
| `OPEN-AUTH-07` | El **límite de intentos por origen**: ¿**cuántos** intentos, en **qué ventana** y **qué** cuenta como «origen»? | `RN-AUTH-06`: 5 fallos por IP de origen + correo en 15 minutos, con espera progresiva y sin bloqueo de cuenta |
| `OPEN-AUTH-08` | El **refresco de 8 horas**: ¿**absoluto** o **deslizante**? | `RN-AUTH-07`: **absoluto** desde el inicio de sesión |
| `OPEN-PAN-01` | El **carrito** del instructor: ¿**cuánto vive**, **qué** lo vacía y **compromete disponibilidad**? | `RN-PAN-01`: vive solo en el navegador, no compromete disponibilidad y se vacía al crear la solicitud |
| `OPEN-NOT-01` | ¿El instructor recibe aviso de la **cancelación manual** y de la **entrega registrada**? | `RN-NOT-01`: **sí** a la cancelación manual, **no** a la entrega |

## 9. Contradicciones entre el negocio y la implementación

Registro de deuda: lo que el negocio pide y lo que el sistema hace hoy.

| # | Regla del negocio | Qué hace el sistema | Gravedad |
|---|-------------------|---------------------|----------|
| 1 | Descontar disponibilidad al crear (`RN-NEG-03`) | Al crear solo **cuenta** el stock actual; reserva recién al empacar | **Alta** — dos instructores reciben «sí» por lo mismo |
| 2 | Reserva por rango de fechas (`RN-NEG-01/02/04`) | No existe dimensión temporal: estado global | **Alta** — imposible sin cambio de modelo |
| 3 | Cancelar solo en `PENDING` (`RN-SOL-05`) | Permite cancelar en `APPROVED` y `PACKED` | Media — el alcance del negocio queda cerrado por `RN-SOL-05`, `RN-SOL-06` y `RN-SOL-08`; lo que queda es el defecto del código |
| 4 | Trazabilidad permanente (`RN-PRE-02`) | Al cancelar una solicitud empaquetada **borra** las asignaciones de seriales | **Alta** |
| 5 | Aprobar permite modificar y dejar nota (`RN-SOL-03/04`) | No se puede modificar; no existe campo de nota ni motivo | Media |
| 6 | Se entrega completo (`RN-INV-02`) | `isRequired` existe y solo se usa para informar completitud en el detalle de una unidad: el empacado nunca lo consulta, así que un conjunto con una pieza suelta afuera puede empacarse y entregarse **incompleto** | **Alta** |
| 7 | 1.500 unidades (`RN-CTX-02`) | Ninguna pantalla pagina; el backend corta en 20 filas | **Alta** |
| 8 | El propósito es ver qué hay sin ir al almacén | El catálogo muestra «Disponible: X / X» con el mismo número | **Alta** |
| 9 | Consumibles sin serial, por cantidad (`RN-INV-06`) | Crea seriales para todo ítem y calcula el stock contando unidades: un consumible vale siempre 0. La autogeneración queda resuelta por `RN-INV-40`; el stock por cantidad sigue pendiente | **Alta** |
| 10 | Cancelación automática a los 2 días (`RN-SOL-07`) y distinción de la causa (`RN-SOL-10`) | El job **existe** (`reservationCleanup.service.js`, enganchado en `app.js`) pero cancela a las **24 h desde la creación** y solo solicitudes `PENDING`, en vez de a los **2 días desde la fecha de retiro**; tampoco distingue el vencimiento de una cancelación manual | Media |
| 11 | Dos tenencias —SENA y donado— con regla de auditoría distinta (`RN-INV-07`) | La tenencia no existe en el modelo: todo ítem es indistinguible y no se puede tratar distinto una baja donada de una del SENA | **Alta** |
| 12 | Consumibles por cantidad con unidad de medida (`RN-INV-11`, `RN-INV-12`) | No existe unidad de medida ni cantidad propia; el stock se cuenta en unidades. El momento del descuento queda resuelto por `RN-INV-11`; el modelo de cantidad sigue pendiente | **Alta** |
| 13 | ~~El administrador registra el préstamo informal de una pieza suelta (`RN-INV-15`)~~ — **DESCARTADO**: `RN-INV-15` está `REFUTADA` | No hay defecto: el sistema **no debe** registrar préstamos fuera de una solicitud | — |
| 14 | La baja de un equipo del SENA requiere confirmación y un trámite de 6 meses a 1 año (`RN-INV-19`) | No existe estado de trámite ni confirmación: la baja es una acción única e inmediata y no puede representar un proceso de 6 a 12 meses | **Alta** |
| 15 | Presencia y funcionamiento son condiciones distintas (`RN-INV-25`) | El sistema no las distingue: una unidad solo tiene estado (`AVAILABLE` / `LOANED` / …) sin condición física, así que no puede representar «está presente pero descargada» | Media |
| 16 | Un compuesto puede contener otro compuesto, con completitud recursiva (`RN-INV-27`, `RN-INV-41`) | No existe detección de ciclos: nada impide que un elemento contenga a otro que lo contenga a él. Resuelto en la regla por `RN-INV-41`; queda la implementación | Media |
| 17 | La composición puede editarse y todo cambio queda registrado (`RN-INV-29`) | No existe registro de cambios de la composición | Media |
| 18 | La fecha estimada de devolución no tiene consecuencia si se excede (`RN-PRE-07`), y una unidad prestada debe dejar de figurar como disponible (`RN-NEG-05`) | No hay dimensión temporal ni bloqueo por préstamo activo: la unidad prestada vuelve a contarse para rangos futuros. Resuelto en la regla por `RN-NEG-05`; queda la implementación | **Alta** — **falsa disponibilidad** |
| 19 | El cierre de sesión invalida la credencial en el servidor (`RN-AUTH-04`) | El cierre solo **borra la cookie**: nada revoca el token, que sirve hasta que vence. Resuelto en la regla por `RN-AUTH-04` y `RN-AUTH-05`; queda la implementación | **Alta** |
| 20 | Desactivar a un instructor le impide iniciar sesión (`RN-USR-05`, `RN-USR-07`) | El servidor confía en el token sin consultar la base: una cuenta desactivada sigue entrando hasta que vence su token. Resuelto en la regla por `RN-AUTH-05`; queda la implementación | **Alta** |
| 21 | La alerta de stock bajo se calcula con una sola regla (`RN-INV-44`, `RN-PAN-02`) | No existe umbral mínimo ni alerta, y conviven dos cálculos distintos de la misma alerta: el del panel y el de la pantalla que la detalla. Resuelto en la regla; queda la implementación | Media |
| 22 | El instructor recibe avisos dentro del sistema (`RN-NOT-01`) y, si se configura, por correo y WhatsApp (`RN-NOT-02`) | La infraestructura está solo preparada: no hay aviso interno, ni consulta de avisos, ni servidor de correo, ni integración con WhatsApp. Resuelto en la regla; queda la implementación | Media |

## 10. Orden de construcción

El **número de cada epic es un identificador, no su posición**: lo que fija el orden es la columna
**Depende de**, y la tabla se ordena por capas. El grafo, las capas y la razón de ese orden están en
el README (`Grafo de dependencias y orden de construcción`) y cada epic repite su dependencia en su
propio encabezado; acá solo queda el orden.

| Capa | Epic | Depende de | Estado |
|------|------|------------|--------|
| Previa — documento base | 00 Contexto y modelo de reservas | Nada: es el documento del que dependen todos los epics | **Decidido** |
| 1 — Acceso | 01 Autenticación | Nada. El primer administrador lo crea el **seed**, no la aplicación (`RN-USR-09`) | Ejecutado: 14 `OK`, 6 defectos y 2 criterios sin ejecutar |
| 2 — Datos maestros | 10 Categorías | 01 | Especificado |
| 2 — Datos maestros | 03 Ambientes | 01 | Especificado |
| 2 — Datos maestros | 02 Usuarios | 01 | Especificado |
| 3 — Catálogo | 04 Ítems y componentes | 10 (necesita categorías para clasificar) y 01 | Especificado |
| 4 — Inventario | 05 Inventario y ensamblaje | 04 (elementos) y 03 (ambientes donde ubicar las unidades) | Especificado |
| 5 — Visibilidad y ciclo | 08 Catálogo y disponibilidad | 04 y 05 (la disponibilidad sale de las unidades) | Especificado — valor central del producto |
| 5 — Visibilidad y ciclo | 06 Solicitudes | 05 (unidades para reservar) y 08 (el cálculo de disponibilidad) | Especificado |
| 6 — Cierre del ciclo | 07 Préstamos y devoluciones | 06 | Especificado |
| Transversal | 11 Historial de movimientos | 04, 05, 06 y 07. No bloquea el orden | Especificado |
| Transversal | 12 Paneles de inicio | 02, 04, 05, 06 y 07. No bloquea el orden | Especificado |
| — | ~~09 Reportes~~ — **DESCARTADO** | Nada: no se construye | **Descartado** por decisión del negocio, que cierra `OPEN-CTX-03` |

```
01  →  10 · 03 · 02  →  04  →  05  →  08 · 06  →  07  →  11  →  12
```
