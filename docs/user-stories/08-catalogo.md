# Epic 08 — Catálogo y disponibilidad del instructor

Qué ve el instructor en el catálogo y cómo se calcula la cantidad disponible de un elemento para un rango de fechas: listado por elemento, búsqueda, filtro, disponibilidad y paginación.

## Resumen

Este módulo es el catálogo que consulta el instructor: los **elementos** con su **cantidad disponible**, la búsqueda por nombre, el filtro por categoría, la disponibilidad **para un rango de fechas** y el recorrido **paginado**.

Existe para eliminar un viaje físico. El administrador del almacén declaró que «en ocasiones no sabe si está o no está algún elemento o si está prestado o no», y por eso va al Ambiente 104 a buscar cada elemento antes de responder. El catálogo con disponibilidad real responde esa pregunta en pantalla. Hoy la cifra no distingue nada: muestra *Disponible: X / X* con el mismo número y nunca dice que no.

Lo usan **ambos actores**, con papeles distintos: el instructor consulta, busca, filtra y cambia el rango de fechas; la escritura del catálogo es administrativa (`RN-CTX-05`).

Este módulo es dueño de **qué muestra el catálogo** y de **cómo se calcula la disponibilidad para un rango**. La reserva y su ciclo de vida son del epic 06; los estados físicos de la unidad, del epic 05; la alerta de stock bajo es `RN-INV-44` y su panel, del epic 12.

Estado: **en ejecución**. Cuatro historias y 22 criterios; **21 ya ejecutados y en `OK`** en la rama `devJoseph-catalogo` con test `AC-CAT-*` en `server/tests/integration/catalog.test.js`. Resta `AC-CAT-03-8` (trámite de baja y piezas) en el siguiente encadenado.

## Alcance

**Incluye**

- El listado del catálogo por **elemento**, con su cantidad disponible, sin unidades físicas ni seriales.
- La **búsqueda por nombre** y el **filtro por categoría**, y las dos operaciones combinadas.
- El **cálculo de la disponibilidad para un rango de fechas**, con su semántica de días de calendario.
- El **rango de fechas visible y modificable en la misma pantalla**, siempre asociado a la cantidad.
- El elemento **sin disponibilidad**, que sigue listado con `0` y no se ofrece como seleccionable.
- El **listado paginado** con su total.
- La **cantidad de un consumible** en su propia unidad de medida, sin rango de fechas.

**No incluye**

| Tema | Dónde se especifica |
|------|---------------------|
| Elegir un número de serie | `RN-CAT-01` lo excluye del catálogo del instructor; la asignación de unidades es del administrador, epic 06 |
| Carrito, creación de la solicitud, descuento al crear (`RN-NEG-03`) y cancelación de una reserva sin retiro (`RN-SOL-07`) | Epic 06 |
| Préstamo, devolución y declaración de pérdida (`RN-PRE-04`, `RN-PRE-07`, `RN-PRE-15` en su procedimiento) | Epic 07; acá solo se lee su efecto sobre la cantidad (AC-CAT-03-7, AC-CAT-03-11) |
| Alta, edición y baja de elementos y categorías | Epic 04; acá solo se exige que el instructor no escriba (AC-CAT-01-5) |
| Estados físicos, ensamblaje y trámite de baja (`RN-INV-30`, `RN-INV-31`, `RN-INV-33`, `RN-INV-19`) | Epic 05; acá solo se lee qué estado cuenta como disponible |
| Alerta de stock bajo: compara la cantidad disponible de hoy, sin rango, contra el umbral mínimo del elemento (`RN-INV-44`), que fija el administrador y no tiene valor por defecto | Consulta y pantalla: `US-INV-13` del epic 05. Panel: `US-PAN-01` del epic 12 |
| Forma de la pantalla: valor inicial del rango y de la fecha estimada de devolución | Decisión de interfaz; los criterios de este epic reciben el rango como dato de entrada |
| Orden de los resultados, tamaño de página, sensibilidad a mayúsculas y acentos | Ninguna regla lo fija; ver *Decisiones tomadas* |
| Exportación o reporte del catálogo | Ninguna regla lo pide; el epic de reportes está descartado |

## Actores y permisos

| Actor | Puede | No puede |
|-------|-------|----------|
| **Instructor** | Consultar el catálogo, buscar por nombre, filtrar por categoría, cambiar el rango de fechas y leer la cantidad disponible de cada elemento | Crear ni modificar elementos del catálogo: recibe `403` sin efectos. Elegir un número de serie: el catálogo no expone unidades |
| **Administrador** (instructor encargado del almacén) | Consultar el catálogo y la disponibilidad para un rango igual que el instructor; escribir el catálogo según el epic 04 | Ver el catálogo como un selector de seriales: `RN-CAT-01` lo excluye para los dos actores |
| **Sin credencial** | Nada: una petición sin sesión no es un actor y recibe `401` | Consultar el catálogo (epic 01, `AC-AUTH-05-2`) |

No hay un tercer rol: el administrador **es** un instructor (`RN-CTX-05`).

## Reglas de negocio

| ID | Regla | Ejemplo |
|----|-------|---------|
| `RN-CAT-01` | El catálogo lista **elementos**, no unidades físicas, y el instructor **no elige un número de serie** | La consulta de un elemento con tres unidades devuelve una fila con cantidad 3 y ningún serial |
| `RN-CAT-02` | El catálogo se puede **buscar por nombre** y **filtrar por categoría** | Buscar un fragmento del nombre y filtrar por una categoría deja solo los elementos de esa categoría cuyo nombre contiene el fragmento |
| `RN-CAT-03` | La disponibilidad se informa **por elemento, como cantidad**, y se calcula para el **rango de fechas** solicitado | Un elemento con tres unidades y una reservada dentro del rango informa 2; el mismo elemento en otro rango informa 3 |
| `RN-CAT-04` | El catálogo **muestra el rango de fechas con el que calcula** la disponibilidad, visible y modificable en la misma pantalla, y **nunca informa una cantidad sin un rango asociado** | Cambiar el rango en la pantalla cambia la cantidad informada y el rango devuelto es el nuevo |
| `RN-CAT-05` | Un elemento **sin disponibilidad** sigue en el catálogo con cantidad `0` y **no se puede seleccionar** para una solicitud | Un elemento con todas sus unidades reservadas en el rango aparece con 0 y la respuesta lo informa como no seleccionable |
| `RN-SOL-01` | Las solicitudes son de un día para el otro y la entrega el mismo día ocurre si hay disponibilidad, así que la **fecha de retiro más temprana que el rango admite es hoy** | El catálogo permite consultar con el rango que empieza hoy |
| `RN-CTX-02` | El volumen real es de **1.000 a 1.500** equipos y elementos, así que el catálogo tiene que paginarse | Una lista de 25 elementos con páginas de 20 informa el total 25 y permite llegar a los 5 restantes |
| `RN-CTX-05` | Dos actores y ninguno más: el instructor **consulta**; la **escritura del catálogo es administrativa** | Una petición de alta de elemento con sesión de instructor responde `403` y no crea nada |
| `RN-INV-11` | Un consumible **no se reserva por fecha**: su stock baja al **registrar la entrega**, no al crear ni al empacar | Un consumible con stock 10 informa 10 en cualquier rango; baja a 8 al entregar 2 unidades |
| `RN-INV-12` | Cada consumible declara **su propia unidad de medida**, y su cantidad se lee en esa unidad | Un consumible se informa en su unidad y nunca en la unidad de otro |
| `RN-INV-08` | Una pieza de un conjunto **comprometido** en la reserva o el préstamo de su padre no se cuenta como disponible por separado | Un conjunto reservado en el rango deja su pieza interior fuera de la cantidad del elemento de la pieza |
| `RN-NEG-01` | El mismo elemento se puede solicitar para **días distintos**: la primera reserva no bloquea la segunda | Una unidad reservada y sin retirar, consultada fuera de su rango, vuelve a contarse |
| `RN-NEG-02` | Para el **mismo día** el elemento **sí** se bloquea: no puede haber dos reservas de la misma unidad con fechas que se solapen | Dos rangos que comparten al menos un día no pueden comprometer la misma unidad |
| `RN-NEG-04` | La reserva ocupa el rango completo `[fecha de retiro, fecha estimada de devolución]` | Una reserva que empieza el 10 y termina el 13 ocupa cuatro días |
| `RN-NEG-05` | Una unidad **entregada y no devuelta** no está disponible para **ningún rango futuro** hasta que se registre su devolución | Una unidad prestada no cuenta aunque el rango consultado esté muy por delante de la fecha estimada de devolución |
| `RN-SOL-11` | Una **entrega parcial** deja la solicitud en `PARTIALLY_DELIVERED` y lo ya entregado sigue afuera como préstamo real | Una solicitud de 3 unidades con 1 entregada deja 2 disponibles, en cualquier rango |
| `RN-INV-31` | Fija **qué se puede prestar** según el estado físico: una unidad cuyo estado no permite prestar no está disponible, y el averiado no se presta como unidad pero **sí** presta sus piezas sueltas | De tres unidades, una en un estado que no permite prestar deja 2 disponibles |
| `RN-INV-33` | Una unidad **en trámite de baja** queda bloqueada —no se presta **ni ella ni sus piezas sueltas**— y esta regla **prevalece** sobre `RN-INV-31` | Una unidad averiada en trámite de baja deja de prestar sus piezas sueltas mientras el trámite está abierto |
| `RN-PRE-15` | Una unidad **declarada perdida** sale del inventario activo y **no bloquea** disponibilidad, y sus **piezas sueltas siguen prestables**: es la **única** excepción y **prevalece** sobre `RN-INV-33` | Un conjunto declarado perdido, con su trámite abierto, no bloquea la pieza suelta que lleva dentro |
| `RN-INV-15` | **`REFUTADA`**: el **préstamo informal no existe**, porque un préstamo existe solo a través de una solicitud y lo prestado por fuera del sistema queda fuera de su responsabilidad | No hay un segundo tipo de préstamo que restar de la cantidad disponible |
| `Estándar` | Invariantes técnicos: una cantidad `0` no es un error, una búsqueda sin coincidencias no es un error, las páginas no se solapan | Consultar un elemento agotado responde `200` con cantidad 0 |

## Disponibilidad por rango de fechas

Es el contrato central del módulo y se declara una sola vez. Ningún criterio puede cambiarlo por su cuenta.

La cantidad se calcula **para el rango solicitado** (`RN-CAT-03`), se informa **por elemento** y **nunca sin el rango que la produce** (`RN-CAT-04`). El rango se muestra y se modifica en la misma pantalla, y la **fecha de retiro más temprana que admite es hoy** (`RN-SOL-01`): el catálogo no puede impedir consultar hoy.

**Semántica del rango**

| Aspecto | Semántica | De dónde sale |
|---------|-----------|---------------|
| **Límites** | **Inclusivo en los dos extremos**: un rango que empieza el día 10 y termina el 13 ocupa el 10, el 11, el 12 y el 13. El rango consultado se interpreta igual, así que el último día reservado sigue ocupado y el día siguiente ya está libre | `RN-NEG-04` escribe la reserva como intervalo cerrado y `RN-NEG-02` prohíbe el solapamiento |
| **Granularidad** | **Días de calendario**: un rango son días, no instantes. **No existe el día parcial** —ni «desde las 14:00» ni «hasta el mediodía»— y **dos rangos se solapan si comparten al menos un día** | Las reglas hablan siempre de **fechas** de retiro y de devolución, nunca de horas |
| **Zona horaria** | **No hay conversión**: la fecha es el día de calendario que declara la solicitud (`pickupDate`, `estimatedReturnDate`). Sin hora en la comparación no hay frontera horaria que desplazar | Consecuencia de la granularidad: sin hora no hay instante que convertir |

**Qué descuenta la cantidad**

| Condición de la unidad o del elemento | Efecto | Regla |
|---------------------------------------|--------|-------|
| Está en un estado físico que no permite prestar | No cuenta | `RN-INV-31` |
| Está en trámite de baja | No cuenta la unidad **ni sus piezas sueltas**, aunque su estado las prestara | `RN-INV-33` |
| Fue declarada perdida | Sale del inventario activo y **no bloquea**; sus piezas sueltas siguen prestables | `RN-PRE-15` |
| Tiene una reserva que ocupa un rango que **comparte al menos un día** con el consultado | No cuenta en ese rango | `RN-NEG-02`, `RN-NEG-04` |
| Tiene una reserva y todavía no se retiró, consultada **fuera** de su rango | Cuenta | `RN-NEG-01` |
| Está entregada en un préstamo y todavía no se devolvió | No cuenta para **ningún** rango | `RN-NEG-05` |
| Salió en una entrega parcial (`PARTIALLY_DELIVERED`) | No cuenta para ningún rango; lo pendiente sigue comprometido | `RN-SOL-11` |
| Es una pieza dentro de un conjunto **comprometido** | No cuenta por separado para el elemento de la pieza | `RN-INV-08` |
| Es un consumible | Su cantidad es el stock, igual en cualquier rango, y baja **al registrar la entrega** | `RN-INV-11` |

Un elemento cuya cantidad en el rango es `0` es un resultado correcto, no un error.

**Fuera de esta semántica**

- El **corte del vencimiento** de una reserva sin retiro (`RN-SOL-07`) es del epic 06 y no cambia la semántica de días de calendario: ninguna comparación de este módulo usa horas.
- Un **rango mal formado** —fin anterior al inicio, rango vacío, fechas ausentes— no está definido: ninguna regla fija su validación ni el efecto de su rechazo. Ver *Decisiones tomadas*.

## Historias de usuario

Los criterios nombran la **clase** de actor y de estado —«un instructor», «un elemento con tres unidades disponibles», «una unidad con reserva en el rango»—. Los valores concretos con los que se ejecutan los escenarios están en el `Anexo — Datos de prueba`, al final del documento, y son ejemplos, no requisitos.

### US-CAT-01 — Consultar el catálogo de elementos

**Como** instructor **quiero** ver el catálogo de elementos con la cantidad disponible de cada uno **para** saber qué hay en el almacén antes de pedirlo, sin ir a preguntar ni caminar hasta el 104.

**Prioridad:** alta — es el valor central del producto y responde a la contradicción #8: hoy la cifra mostrada no distingue lo que hay de lo que no hay.
**Estado:** especificada — no ejecutada.

El catálogo no es un selector de seriales: lista **elementos** y responde «¿qué hay y cuánto?» (`RN-CAT-01`, `RN-CAT-03`). La cantidad viaja siempre con el rango que la produce, visible y modificable en la misma pantalla (`RN-CAT-04`). Los consumibles no tienen serial y cada uno declara su unidad de medida (`RN-INV-12`); su cantidad no depende del rango, porque su stock baja al registrar la entrega (`RN-INV-11`). La escritura del catálogo es administrativa (`RN-CTX-05`).

#### AC-CAT-01-1 — El catálogo lista elementos, no unidades físicas

**Dado** un elemento serializado con tres unidades en el inventario y un instructor con sesión iniciada.
**Cuando** el instructor consulta el catálogo.
**Entonces**:

- la respuesta es `200`;
- la respuesta lista el elemento;
- la respuesta no lista ninguna unidad física de ese elemento;
- la respuesta no informa ningún número de serie.

`RN-CAT-01` es explícito en las dos mitades: el catálogo lista elementos y el instructor no elige un serial.

#### AC-CAT-01-2 — Cada elemento informa su cantidad disponible como número

**Dado** un catálogo con un elemento que tiene tres unidades disponibles y otro que tiene una.
**Cuando** el instructor consulta el catálogo.
**Entonces** cada elemento informa una cantidad disponible, y esa cantidad es un número y no un estado ni una lista de existencias:

| Elemento | Cantidad disponible informada |
|----------|-------------------------------|
| el que tiene tres unidades | `3` |
| el que tiene una unidad | `1` |

La comprobación no depende del orden de la lista. Cómo se nombra el campo es decisión de implementación. Ninguna regla fija el orden de los resultados, así que el criterio identifica cada elemento por lo que tiene, no por su posición.

#### AC-CAT-01-3 — Un consumible muestra su cantidad en su propia unidad de medida

**Dado** dos consumibles registrados con unidades de medida distintas y cantidades distintas.
**Cuando** el instructor consulta el catálogo.
**Entonces**:

- el catálogo muestra cada consumible con su cantidad;
- cada cantidad se informa en la unidad de medida con la que ese consumible se registró;
- la cantidad de un consumible no se informa en la unidad del otro.

No hay una unidad de medida única para el almacén: cada consumible se cuenta en lo suyo (`RN-INV-12`). Cuáles son los valores admitidos de unidad de medida no lo fija ninguna regla, así que el escenario no los nombra. La cantidad de un consumible tampoco depende del rango de fechas (`RN-INV-11`, AC-CAT-03-10).

#### AC-CAT-01-4 — Un elemento sin disponibilidad aparece con cantidad 0 y no se ofrece como seleccionable

**Dado** un elemento sin ninguna unidad disponible.
**Cuando** el instructor consulta el catálogo.
**Entonces**:

- el elemento aparece en la lista;
- su cantidad disponible es `0`;
- la respuesta no es un error;
- la respuesta lo informa como **no seleccionable** para una solicitud.

`RN-CAT-05` confirma las dos mitades: la fila no desaparece y el elemento no se puede seleccionar. Que `0` sea un valor válido de la cantidad sale de `RN-CAT-03`. Rechazar la selección dentro del carrito es el epic 06; lo que no puede pasar es que el catálogo ofrezca como seleccionable un elemento que informa `0`.

#### AC-CAT-01-5 — El instructor no puede crear ni modificar elementos

**Dado** un instructor con sesión iniciada, un catálogo con un número conocido de elementos y un elemento registrado con su nombre y su cantidad disponible.
**Cuando** el instructor envía la petición de crear un elemento.
**Y cuando** envía la petición de modificar el elemento registrado.
**Entonces**:

| Petición | Estado | Elementos del catálogo | Elemento registrado |
|----------|--------|------------------------|---------------------|
| crear | `403` | el número no cambia | — |
| modificar | `403` | el número no cambia | conserva su nombre y su cantidad disponible |

`RN-CTX-05` deja el rechazo en el rol: la escritura del catálogo es administrativa. El alta y la edición de elementos son el epic 04; lo que este criterio exige es que el instructor no pueda hacerlas y que el rechazo no deje efectos.

#### AC-CAT-01-6 — El catálogo informa el rango con el que calcula y permite cambiarlo

**Dado** un elemento con tres unidades en estado físico operativo y una unidad con una reserva que ocupa un rango.
**Cuando** el instructor consulta el catálogo con un rango que comparte días con esa reserva.
**Entonces**:

- la respuesta incluye el rango de fechas con el que calculó la disponibilidad;
- el rango informado es exactamente el rango que se pidió;
- la cantidad informada es `2`.

**Y cuando** el instructor cambia el rango de fechas de la pantalla por otro que no comparte ningún día con la reserva.
**Entonces**:

- la cantidad informada es `3`;
- la respuesta incluye el rango nuevo como el rango usado.

`RN-CAT-04` tiene dos mitades y el criterio las verifica juntas: una cantidad nunca se informa sin el rango que la produce, y el rango se cambia en la misma pantalla con efecto sobre la cifra. Un rango decorativo no produce el segundo resultado.

La **fecha de retiro más temprana que el rango admite es hoy** (`RN-SOL-01`): el catálogo no puede impedir consultar hoy. Cuál de los valores posibles viene seleccionado al abrir la pantalla y cuál es el valor inicial de la fecha estimada de devolución son decisiones de interfaz, y el criterio no las fija.

### US-CAT-02 — Buscar y filtrar el catálogo

**Como** instructor **quiero** buscar elementos por nombre y filtrarlos por categoría **para** encontrar lo que necesito en un catálogo de más de mil elementos sin recorrerlo entero.

**Prioridad:** alta — con 1.000 a 1.500 elementos (`RN-CTX-02`) un catálogo sin búsqueda ni filtros no se puede recorrer.
**Estado:** especificada — no ejecutada.

`RN-CAT-02` es una regla corta y completa: el catálogo se busca **por nombre** y se filtra **por categoría**, que son los dos datos que el instructor conoce. La regla fija **qué** se puede hacer, no **cómo**: no dice si la búsqueda distingue mayúsculas, si ignora acentos, ni si admite varios términos. Una búsqueda sin resultados es una respuesta correcta, no una falla.

#### AC-CAT-02-1 — Buscar por nombre devuelve las coincidencias parciales

**Dado** un catálogo con dos elementos cuyos nombres comparten un fragmento y difieren en el resto.
**Cuando** el instructor busca con ese fragmento.
**Entonces**:

- la lista devuelve el elemento cuyo nombre contiene el fragmento;
- la lista no devuelve el otro.

**Y cuando** busca con un fragmento que aparece en el medio del nombre de un elemento, no al inicio.
**Entonces** la lista devuelve ese elemento.

Para que «buscar por nombre» sirva con nombres compuestos la coincidencia tiene que ser **parcial**. Mayúsculas, acentos y varios términos no los afirma ninguna regla y el criterio no los exige.

#### AC-CAT-02-2 — Una búsqueda sin coincidencias devuelve una lista vacía, no un error

**Dado** un catálogo sin ningún elemento cuyo nombre contenga el texto buscado.
**Cuando** el instructor busca ese texto.
**Entonces**:

- la respuesta es `200`;
- la lista devuelve `0` elementos;
- la respuesta no es un error;
- el catálogo no cambia.

Que una consulta legítima no encuentre nada es una respuesta correcta. Buscar no crea, ni modifica, ni borra elementos.

#### AC-CAT-02-3 — Filtrar por categoría devuelve solo los elementos de esa categoría

**Dado** un catálogo con elementos de dos categorías distintas.
**Cuando** el instructor consulta el catálogo filtrando por una de esas categorías.
**Entonces**:

- la lista devuelve solo elementos de la categoría pedida;
- ningún elemento de la otra categoría aparece en la lista;
- todos los elementos de la categoría pedida aparecen.

Las dos direcciones existen para que un filtro no se confunda con una omisión. El «todos» se evalúa sobre el **conjunto completo** del resultado y no sobre una página: el catálogo está paginado (US-CAT-04, `RN-CTX-02`), así que la comprobación recorre las páginas o compara contra el **total** informado.

#### AC-CAT-02-4 — La búsqueda por nombre y el filtro de categoría se aplican juntos

**Dado** un catálogo con dos elementos cuyo nombre contiene el mismo fragmento y que pertenecen a categorías distintas.
**Cuando** el instructor busca ese fragmento filtrando por una de las dos categorías.
**Entonces**:

- la lista devuelve el elemento de esa categoría;
- la lista no devuelve el elemento de la otra categoría.

Aplicar las dos operaciones deja la **intersección**: si el filtro de categoría se ignorara aparecería el elemento de la otra categoría, y si la búsqueda se ignorara aparecería todo el contenido de la categoría.

### US-CAT-03 — Ver la disponibilidad para un rango de fechas

**Como** instructor **quiero** ver cuántas unidades de un elemento estarían disponibles en las fechas en que las necesito **para** pedir con seguridad de que me las van a poder entregar, sin que el administrador tenga que ir al almacén a comprobarlo.

**Prioridad:** alta — responde a la contradicción #8, porque una cifra que no puede bajar no dice que no, y a la contradicción #2, porque hoy no existe dimensión temporal.
**Estado:** especificada — no ejecutada.

La pregunta del instructor nunca es «¿cuántas hay hoy?» sino «¿cuántas van a estar cuando las necesite?»: las solicitudes son de un día para el otro (`RN-SOL-01`) y la reserva ocupa su rango completo (`RN-NEG-04`). La semántica del rango —cerrado en los dos extremos, días de calendario, sin día parcial y sin conversión de zona— está declarada una sola vez en *Disponibilidad por rango de fechas*.

**Reserva y préstamo no son lo mismo.** Una reserva ocupa **solo su rango** y, si no se retira, se cancela sola (`RN-SOL-07`); un préstamo ya sacó la unidad del almacén, la fecha estimada de devolución es informativa (`RN-PRE-07`) y bloquea **todas** las fechas hasta que se registre la devolución (`RN-NEG-05`).

#### AC-CAT-03-1 — La disponibilidad se calcula para el rango solicitado

**Dado** un elemento con tres unidades en estado físico operativo, ninguna reservada hoy.
**Y** una unidad de ese elemento con una reserva que ocupa un rango.
**Cuando** el instructor consulta la disponibilidad del elemento para distintos rangos.
**Entonces**:

| Reserva de la unidad | Rango consultado | Cantidad informada |
|----------------------|------------------|--------------------|
| ocupa el rango consultado | el mismo rango de la reserva | `2` |
| ocupa un rango futuro: hoy la unidad está libre | el rango de la reserva | `2` |
| ocupa un rango futuro | otro rango, sin días en común | `3` |

`RN-CAT-03` y `RN-NEG-04` fijan las dos cosas que el criterio verifica: la cifra depende del **rango pedido** y de nada más, y una reserva **descuenta dentro de su rango** aunque hoy la unidad esté libre.

#### AC-CAT-03-2 — Una reserva que se solapa no se cuenta como disponible

**Dado** un elemento con dos unidades disponibles y una unidad con una reserva que ocupa un rango.
**Cuando** el instructor consulta la disponibilidad para un rango que comparte al menos un día con la reserva.
**Entonces** la cantidad informada es `1`.

Bordes que fija la semántica del rango:

| Rango consultado | Cantidad informada |
|------------------|--------------------|
| empieza en el último día reservado | `1` |
| empieza el día siguiente al último día reservado | `2` |

`RN-NEG-02` prohíbe dos reservas de la misma unidad con fechas que se solapen. Sin los dos bordes, «se solapa» admitiría una lectura inclusiva y otra exclusiva: si el solapamiento se evaluara solo por el día de retiro, la unidad se contaría dos veces y el catálogo prometería un equipo que el almacén no puede entregar.

#### AC-CAT-03-3 — Una unidad reservada y sin retirar, fuera de su rango, sí se cuenta como disponible

**Dado** un elemento con dos unidades en estado físico operativo y una unidad con una reserva que ocupa un rango, todavía sin retirar.
**Cuando** el instructor consulta la disponibilidad para un rango que no comparte ningún día con la reserva.
**Entonces** la cantidad informada es `2`.

`RN-NEG-01` confirma que el mismo elemento se puede solicitar para días distintos. El criterio es la contraparte de AC-CAT-03-2 y comprueba que el solapamiento se evalúa contra el **rango pedido** y no contra la existencia de cualquier reserva. Para una unidad **prestada** la regla es la contraria (AC-CAT-03-7).

#### AC-CAT-03-4 — Una unidad cuyo estado físico no permite prestar no se cuenta

**Dado** un elemento con tres unidades, una de ellas en un estado físico que no permite prestar, y ningún compromiso por fechas sobre el elemento.
**Cuando** el instructor consulta la disponibilidad para cualquier rango.
**Entonces**:

- la cantidad informada es `2`;
- la unidad con ese estado no se cuenta como disponible.

`RN-INV-31` fija qué se puede prestar en cada estado, averiado incluido: la unidad averiada no se presta como unidad y sus piezas sueltas sí. Los valores posibles del estado son los seis de `RN-INV-30`. La diferencia entre «con falla» y «averiado» no cambia esta conducta: `RN-INV-36` aclara que lo que distingue a los dos estados es qué se hace con el equipo, y eso es del epic 05.

#### AC-CAT-03-5 — Una unidad comprometida dentro de un conjunto no se cuenta por separado

**Dado** un conjunto ensamblado con una pieza de un elemento propio del catálogo y ese conjunto comprometido en una solicitud activa que ocupa un rango.
**Cuando** el instructor consulta la disponibilidad del elemento de esa pieza para un rango que comparte días con el compromiso del conjunto.
**Entonces** la unidad de esa pieza, que está dentro del conjunto, no se cuenta como disponible de su elemento.

`RN-INV-08` fija la condición y su límite: pertenecer a un ensamblaje **no** quita disponibilidad —la pieza de un conjunto ocioso se presta suelta— y lo que la quita es estar **comprometido** en la reserva o el préstamo del padre. El caso del conjunto ocioso está especificado en el epic 05 (`AC-INV-02-6`) y acá no se reescribe.

#### AC-CAT-03-6 — Un elemento con cero unidades disponibles devuelve 0, no un error

**Dado** un elemento con una única unidad, comprometida en un rango.
**Cuando** el instructor consulta la disponibilidad para un rango que comparte días con ese compromiso.
**Entonces**:

- la respuesta es `200`;
- la cantidad informada es `0`;
- la respuesta no es un error.

Una cantidad `0` es un resultado correcto: el instructor necesita saber que no hay para decidir qué hacer. Un error impediría distinguir «no hay» de «la consulta falló». La contraparte —que el elemento con `0` siga apareciendo en el catálogo— es AC-CAT-01-4.

#### AC-CAT-03-7 — Una unidad prestada no se cuenta como disponible para ningún rango

**Dado** un elemento con dos unidades en estado físico operativo y una de ellas entregada en un préstamo activo, todavía no devuelta.
**Cuando** el instructor consulta la disponibilidad para un rango posterior a la fecha estimada de devolución de ese préstamo.
**Entonces** la cantidad informada es `1` y la unidad entregada no se cuenta.

| Situación | Cantidad informada |
|-----------|--------------------|
| una unidad prestada y no devuelta, consultada para un rango posterior a su fecha estimada de devolución (de 2 unidades) | `1` |
| el administrador registra la devolución de esa unidad y se consulta el mismo rango | `2` |
| una solicitud con tres unidades aprobadas y solo una entregada, en `PARTIALLY_DELIVERED`, consultada para un rango posterior a su fecha estimada de devolución (de 3 unidades) | `2` |

`RN-NEG-05` confirma que una unidad entregada y no devuelta no está disponible para **ningún** rango futuro: la fecha estimada es informativa (`RN-PRE-07`) y la única forma de volver a contarla es que su devolución quede registrada. Si el cálculo usara el rango como límite, el catálogo prometería un equipo que está afuera.

`RN-SOL-11` agrega que una entrega parcial deja unidades afuera: esas unidades son préstamos reales y no vuelven a sumar por estar la solicitud a medio despachar, mientras lo pendiente sigue comprometido.

#### AC-CAT-03-8 — Una unidad en trámite de baja no se cuenta, ni ella ni sus piezas sueltas

**Dado** un elemento con tres unidades en estado físico operativo, una de ellas en trámite de baja, y ningún compromiso por fechas sobre el elemento.
**Cuando** el instructor consulta la disponibilidad para cualquier rango.
**Entonces** la cantidad informada es `2` y la unidad en trámite no se cuenta.

| Elemento | Unidad en trámite | Cantidad informada |
|----------|-------------------|--------------------|
| tres unidades `OPERATIVO` | una de ellas | `2` |
| dos unidades en estado `AVERIADO`, que presta sus piezas sueltas | una de ellas | `1` |

`RN-INV-33` bloquea la unidad **mientras el trámite está abierto** y el bloqueo alcanza a la unidad **y a sus piezas sueltas**; **prevalece** sobre `RN-INV-31`, que es lo que verifica la segunda fila. La unidad en trámite sigue presente en el inventario: lo que no hace es contarse como disponible. La **única excepción** es la unidad declarada perdida (`RN-PRE-15`), que es AC-CAT-03-11.

#### AC-CAT-03-10 — La cantidad de un consumible no depende del rango de fechas

**Dado** un consumible con stock diez, su unidad de medida registrada y ninguna entrega registrada.
**Cuando** el instructor consulta la disponibilidad del consumible para dos rangos distintos.
**Entonces** la cantidad informada es `10` en los dos rangos y no cambia entre uno y otro.

| Situación | Cantidad informada |
|-----------|--------------------|
| una solicitud en `PACKED` que incluye dos unidades del consumible está empacada | `10` |
| el administrador registra la entrega de esas dos unidades y luego se consulta | `8` |

Un consumible **no se reserva por fecha** (`RN-INV-11`): no hay unidades que comprometer en un rango y su stock baja **al registrar la entrega**, no al crear ni al empacar. La aritmética del stock y el rechazo de una cantidad que ya no existe son del epic 06; la unidad de medida en la que se informa la cifra es AC-CAT-01-3.

#### AC-CAT-03-11 — Una unidad declarada perdida no se cuenta ni bloquea disponibilidad

**Dado** un elemento con tres unidades en estado físico operativo y una de ellas entregada en un préstamo y declarada perdida, con su trámite de baja todavía abierto.
**Cuando** el instructor consulta la disponibilidad para cualquier rango.
**Entonces** la cantidad informada es `2` y la unidad declarada perdida no se cuenta.

**Y dado** un elemento X con dos unidades en estado físico operativo, una de ellas ensamblada como pieza de un conjunto declarado perdido con su trámite abierto.
**Cuando** el instructor consulta la disponibilidad del elemento X para cualquier rango.
**Entonces** la cantidad informada es `2` y la unidad de X no queda bloqueada por el trámite del conjunto perdido.

`RN-PRE-15` **prevalece** sobre `RN-INV-33` y sobre el «sigue existiendo en el inventario» de `RN-INV-19` cuando la unidad fue declarada perdida: sale del inventario activo y no bloquea disponibilidad, aunque su trámite administrativo continúe. Sus **piezas sueltas siguen prestables**, porque lo que se perdió es la unidad y no sus componentes. Es la única excepción y no se extiende a ningún otro caso de trámite abierto.

Declarar la pérdida y dejar su registro son del epic 07 (`US-PRE-05`), con motivo y actor (`RN-INV-17`, `RN-INV-13`); acá solo se lee la consecuencia sobre la cantidad.

### US-CAT-04 — Navegar el catálogo paginado

**Como** instructor **quiero** recorrer el catálogo por páginas y saber cuántos elementos hay en total **para** llegar a los elementos que no entran en la primera pantalla, sin bajar una lista de mil filas.

**Prioridad:** alta — contradicción #7: con 1.000 a 1.500 elementos (`RN-CTX-02`) el corte fijo en 20 filas es un bloqueo funcional, no un defecto cosmético.
**Estado:** especificada — no ejecutada.

Un corte fijo no es paginación: si la respuesta trae solo las primeras filas y no informa cuántas hay en total, el instructor no puede saber que falta algo ni pedirlo. `RN-CTX-02` no fija **cómo** se pagina: no dice el tamaño de página, ni la clave de orden, ni si se pagina por número o por desplazamiento. Los criterios exigen el **efecto** —alcanzar todo el catálogo y conocer el total— y dejan el detalle a la implementación.

#### AC-CAT-04-1 — La respuesta paginada informa el total y permite llegar al resto

**Dado** un catálogo con 25 elementos y un tamaño de página de 20.
**Cuando** el instructor consulta la primera página del catálogo.
**Entonces**:

- la respuesta incluye 20 elementos;
- la respuesta informa que el total de elementos es 25;
- los 5 elementos restantes son alcanzables pidiendo otra página.

`RN-CTX-02` es la razón del criterio: sin el total el instructor no puede saber que falta algo, y sin acceso a las filas restantes esos elementos quedan inalcanzables.

#### AC-CAT-04-2 — Se puede pedir una página concreta

**Dado** un catálogo con 25 elementos, sin cambios entre una petición y la siguiente, y un tamaño de página de 20.
**Cuando** el instructor pide la primera página y después la página 2.
**Entonces**:

- la respuesta de la página 2 incluye los 5 elementos que no estaban en la primera;
- ninguno de esos elementos aparece además en la primera página;
- las dos páginas juntas cubren los 25 elementos.

El reparto tiene que ser **estable**: sin estabilidad, un mismo elemento podría caer en dos páginas y el recorrido no terminaría. Cuál es la clave de orden —nombre, identificador, fecha de alta— es decisión de implementación: el criterio no nombra ninguna y cualquier orden total y determinista satisface lo que exige.

## Errores y mensajes

| Situación | HTTP | Código | Mensaje |
|-----------|------|--------|---------|
| Crear o modificar un elemento con sesión de instructor | `403` | No lo fija ninguna regla (el epic 01 usa `FORBIDDEN`) | No lo fija ninguna regla; sin efectos y el catálogo no cambia |
| Consultar el catálogo con un rango de fechas | `200` | — | Éxito: lista de elementos con su cantidad disponible y el rango usado |
| Consultar un elemento cuya cantidad en el rango es `0` | `200` | — | Éxito con cantidad `0`, no es un error |
| Buscar un texto sin coincidencias | `200` | — | Éxito con lista vacía, no es un error |
| Consultar el catálogo sin credencial | `401` | No lo fija ninguna regla (epic 01, `AC-AUTH-05-2`) | No lo fija ninguna regla; sin datos |
| Consultar con un rango mal formado | No lo fija ninguna regla | No lo fija ninguna regla | No lo fija ninguna regla; ver *Decisiones tomadas* |

Ninguna regla de este epic fija el texto literal de un mensaje: lo exigido es el estado y la ausencia de efectos. Los dos únicos estados que el módulo fija son `200` para una consulta válida y `403` para la escritura del instructor.

## Sesión y seguridad

| Efecto | Regla | Dónde se verifica |
|--------|-------|-------------------|
| Consultar el catálogo exige sesión; una petición sin credencial no es de ningún actor y recibe `401` | Epic 01 (`AC-AUTH-05-2`) | — |
| La escritura del catálogo es administrativa: con sesión de instructor responde `403` sin efectos | `RN-CTX-05` | AC-CAT-01-5 |
| El catálogo no expone unidades físicas ni seriales, así que no hay dato administrativo que el instructor pueda leer de más | `RN-CAT-01` | AC-CAT-01-1 |
| No hay un tercer rol que consulte ni escriba: el administrador **es** un instructor | `RN-CTX-05` | AC-CAT-01-5 |
| Consultar el catálogo no cierra sesiones ni altera credenciales | Epic 01 | — |

El contrato de sesión es del epic 01. Este módulo solo agrega la consecuencia del rol sobre la escritura del catálogo y la ausencia de datos administrativos en la consulta.

## Decisiones tomadas

| Decisión | Regla |
|----------|-------|
| El catálogo lista **elementos** y no expone unidades ni seriales | `RN-CAT-01` |
| La disponibilidad es una **cantidad** por elemento, no un estado ni una lista de existencias | `RN-CAT-03` |
| Nunca se informa una cantidad sin el rango que la produce; el rango se muestra y se modifica en la misma pantalla | `RN-CAT-04` |
| La fecha de retiro más temprana que el rango admite es **hoy**; el valor inicial del rango y de la fecha estimada de devolución es decisión de interfaz | `RN-CAT-04`, `RN-SOL-01` |
| El rango es **cerrado en los dos extremos**, en **días de calendario**, sin día parcial y sin conversión de zona; dos rangos se solapan si comparten al menos un día | `RN-NEG-04`, `RN-NEG-02` |
| Una reserva descuenta solo dentro de su rango; una unidad prestada bloquea **todas** las fechas hasta su devolución | `RN-NEG-04`, `RN-NEG-05` |
| Una entrega parcial ya tiene unidades afuera y no las devuelve al catálogo | `RN-SOL-11` |
| Un estado que no permite prestar no cuenta; el trámite de baja bloquea la unidad y sus piezas sueltas y prevalece sobre el estado | `RN-INV-31`, `RN-INV-33` |
| La unidad declarada perdida es la **única** excepción: sale del inventario activo, no bloquea y deja sus piezas prestables | `RN-PRE-15` |
| Una pieza dentro de un conjunto comprometido no cuenta por separado | `RN-INV-08` |
| Un consumible no se reserva por fecha: su cantidad es el stock en cualquier rango y baja al registrar la entrega | `RN-INV-11`, `RN-INV-12` |
| El elemento sin disponibilidad sigue listado con `0` y no se ofrece como seleccionable | `RN-CAT-05` |
| El catálogo se busca por nombre y se filtra por categoría, y las dos operaciones se combinan | `RN-CAT-02` |
| El listado es paginado y siempre informa su total | `RN-CTX-02` |
| La escritura del catálogo es administrativa; el instructor solo consulta | `RN-CTX-05` |
| El préstamo informal no existe: todo préstamo nace de una solicitud | `RN-INV-15` (`REFUTADA`) |

Sin decisión todavía: la validación de un rango mal formado y el efecto de su rechazo; el orden de los elementos y de los resultados de búsqueda; el tamaño de página; la sensibilidad de la búsqueda a mayúsculas y acentos y la admisión de varios términos; el valor inicial del rango y de la fecha estimada de devolución en la pantalla; el texto de los rechazos que ninguna regla fija. Ninguna regla los fija y ningún criterio los exige.

## Trazabilidad y estado

Un criterio se marca `OK` o `GAP` **solo** cuando su test corre, nunca por lectura del código. Este epic está **en ejecución**: 21 de los 22 criterios corren con test y quedaron en `OK`; `AC-CAT-03-8` sigue sin ejecutar hasta el siguiente encadenado. La verificación implementó el catálogo completo (motor de disponibilidad por rango) y corrigió una conversión de `categoryId` que rompía los filtros.

| Criterio | Regla | Estado hoy |
|----------|-------|------------|
| `AC-CAT-01-1` | `RN-CAT-01` | `OK` |
| `AC-CAT-01-2` | `RN-CAT-03` | `OK` |
| `AC-CAT-01-3` | `RN-INV-12` | `OK` |
| `AC-CAT-01-4` | `RN-CAT-05` | `OK` |
| `AC-CAT-01-5` | `RN-CTX-05` | `OK` |
| `AC-CAT-01-6` | `RN-CAT-04` | `OK` |
| `AC-CAT-02-1` | `RN-CAT-02` | `OK` |
| `AC-CAT-02-2` | `Estándar` | `OK` |
| `AC-CAT-02-3` | `RN-CAT-02` | `OK` |
| `AC-CAT-02-4` | `Estándar` | `OK` |
| `AC-CAT-03-1` | `RN-CAT-03`, `RN-NEG-04` | `OK` |
| `AC-CAT-03-2` | `RN-NEG-02` | `OK` |
| `AC-CAT-03-3` | `RN-NEG-01` | `OK` |
| `AC-CAT-03-4` | `RN-INV-31` | `OK` |
| `AC-CAT-03-5` | `RN-INV-08` | `OK` |
| `AC-CAT-03-6` | `Estándar` | `OK` |
| `AC-CAT-03-7` | `RN-NEG-05`, `RN-SOL-11` | `OK` |
| `AC-CAT-03-8` | `RN-INV-33` | Sin ejecutar |
| `AC-CAT-03-10` | `RN-INV-11` | `OK` |
| `AC-CAT-03-11` | `RN-PRE-15` | `OK` |
| `AC-CAT-04-1` | `RN-CTX-02` | `OK` |
| `AC-CAT-04-2` | `Estándar` | `OK` |

| US | ACs | Regla de negocio | `Estándar` |
|----|-----|------------------|------------|
| `US-CAT-01` | 6 | 6 | 0 |
| `US-CAT-02` | 4 | 2 | 2 |
| `US-CAT-03` | 10 | 9 | 1 |
| `US-CAT-04` | 2 | 1 | 1 |
| **Total** | **22** | **18** | **4** |

Totales: **4 historias y 22 criterios**, **21 `OK` y 1 sin ejecutar** (`AC-CAT-03-8`, trámite de baja y piezas). **18** se apoyan en una regla de negocio confirmada y **4** en un invariante técnico (`Estándar`: AC-CAT-02-2, AC-CAT-02-4, AC-CAT-03-6 y AC-CAT-04-2). Las citas de regla suman **20** sobre los 18 criterios que se apoyan en al menos una: AC-CAT-03-1 y AC-CAT-03-7 citan dos reglas cada uno. `RN-INV-15` está `REFUTADA` y no es origen de ningún criterio.

La numeración de `AC-CAT-03` salta un número: el criterio que describía el efecto de un préstamo informal se retiró porque ese préstamo no existe (`RN-INV-15`, `REFUTADA`), y los ids no se renumeran.

## Anexo — Datos de prueba

Los valores de esta tabla son **ejemplos**: no son requisitos y QA elige los suyos. Los criterios fijan la clase de actor, la de estado y los límites de la regla; estos datos solo registran con qué se ejecutan las pruebas del módulo.

| Dato | Valor usado |
|------|-------------|
| Instructor del seed | `cmendoza@sena.edu.co` / `Instructor2024` |
| Administrador del seed, control cruzado de AC-CAT-01-5 | `admin@sena.edu.co` / `AdminSENA2024` |
| Elemento serializado con tres unidades | «Multímetro digital» |
| Elemento serializado con una unidad | «Cargador de portátil» |
| Elemento sin ninguna unidad disponible | un elemento con todas sus unidades comprometidas en el rango consultado |
| Consumibles con unidades de medida distintas | «limpiador de contactos» con cantidad 10 y «cable» con cantidad 100, cada uno en su unidad |
| Elementos con un fragmento común en el nombre | «Multímetro digital» y «Multímetro de pinza» |
| Categorías del filtro | «herramientas», «medición» y «cómputo» |
| Texto sin ninguna coincidencia | «zzz» |
| Rango de una reserva de prueba | 10 al 13 de marzo |
| Rango sin días en común con esa reserva | 20 al 22 de abril |
| Rango que empieza en el último día reservado | 13 al 15 de marzo |
| Rango que empieza el día siguiente al último reservado | 14 al 16 de marzo |
| Rango posterior a una reserva | 5 al 7 de mayo |
| Rango posterior a la fecha estimada de devolución de un préstamo | 1 al 5 de junio |
| Estado que no permite prestar | `CON_FALLA`, `AVERIADO` o `EN_MANTENIMIENTO`; `OPERATIVO` como control |
| Unidades en trámite de baja | una `OPERATIVO` y otra `AVERIADO` |
| Conjunto con una pieza comprometida | un compuesto ensamblado con una pieza de un elemento propio del catálogo, con una solicitud activa sobre el conjunto |
| Préstamo activo | una unidad entregada con devolución estimada el 30 de abril y sin devolución registrada |
| Entrega parcial | una solicitud con tres unidades aprobadas y una entregada, en estado `PARTIALLY_DELIVERED` |
| Unidad declarada perdida | una unidad prestada, declarada perdida, con el trámite de baja abierto |
| Conjunto declarado perdido | un compuesto con una pieza del elemento X ensamblada, declarado perdido y con el trámite abierto |
| Consumible con stock 10 y una solicitud `PACKED` con 2 unidades | «cable», con la entrega de esas 2 unidades registrada para AC-CAT-03-10 |
| Catálogo paginado | 25 elementos con tamaño de página 20; elementos 20 y 21 en el borde de página |

Los usuarios salen del seed del proyecto (`AGENTS.md` §4). Los elementos, las categorías, las unidades, las reservas y los préstamos son datos de los epics 04, 05, 06 y 07: acá se leen, no se crean.
