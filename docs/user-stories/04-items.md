# Epic 04 — Ítems y componentes

El catálogo que existe antes del inventario: registrar un elemento serializable, registrar un consumible con su unidad de medida, definir y consultar la composición de un compuesto, editarla y dar de baja un elemento.

## Resumen

Este módulo resuelve el **catálogo de elementos**: el elemento serializable que después se llena de unidades, el consumible controlado por cantidad con su unidad de medida y su umbral mínimo de stock, el compuesto con su composición de componentes obligatorios y opcionales, la consulta y la edición de esa composición, y la baja de un elemento.

El catálogo **no es un listado de existencias**: es la definición del modelo. Un elemento recién creado no tiene nada adentro (`RN-INV-40`) y su stock inicial es cero; las unidades las da de alta el epic 05 una por una. Lo **escribe el administrador** (`RN-CTX-05`); el instructor solicita, recoge y devuelve, y la escritura sobre el catálogo es acción administrativa. El alta exige una **categoría existente**, que administra el epic 10 (`RN-CATEG-01`, `RN-CATEG-02`).

Si el módulo falla, no hay modelo al que dar unidades, un consumible vale siempre cero o no tiene unidad de medida, o la composición no dice qué piezas forman el conjunto que el instructor pide completo. Estado hoy: **avance parcial**. US-ITE-01 y US-ITE-02 están ejecutados y en `OK` en la rama `devJoseph-items` (10 de 27 criterios, con test `AC-ITE-*` en `server/tests/integration/item.test.js`); US-ITE-03…06 siguen sin ejecutar. `AC-ITE-05-2` sigue siendo **No implementable** por la regla `Derivada`.

> **Frontera con los epics 05, 06, 07, 08 y 10.** Las **unidades** y el **stock** del elemento son el epic 05; la verificación de los componentes al empacar y el registro de la ausencia son el epic 06; la condición de retorno de una unidad devuelta es el epic 07; la disponibilidad por rango es el epic 08; y el **alta y la administración de categorías** es el epic 10. Este epic especifica **solo la definición del catálogo**: ningún criterio de esas historias se repite acá.

## Alcance

**Incluye**

- Alta de un elemento serializable con nombre y categoría existente, sin unidades ni seriales (`RN-INV-40`).
- Alta de un elemento consumible con su tenencia, su unidad de medida y su cantidad inicial (`RN-INV-05`, `RN-INV-06`, `RN-INV-12`, `RN-INV-20`).
- Rechazo de un consumible sin unidad de medida y de un elemento del SENA configurado como consumible (`RN-INV-12`, `RN-INV-46`).
- Umbral mínimo de stock (`minStock`) declarado por elemento, con la comparación de la alerta contra el umbral propio (`RN-INV-44`).
- Definición de la composición de un compuesto al crear el elemento, con consumibles y con compuestos como componentes y con repeticiones (`RN-INV-21`, `RN-INV-22`, `RN-INV-23`, `RN-INV-27`).
- Rechazo de un componente inexistente, de un elemento componente de sí mismo y de una composición que formaría un ciclo (`RN-INV-41`).
- Marcado de cada componente como obligatorio u opcional por el administrador (`RN-INV-37`).
- Consulta de la composición con todos sus componentes, su opcionalidad y la distinción entre consumible y serializado (`RN-INV-23`, `RN-INV-24`, `RN-INV-25`).
- Edición de la composición: agregar siempre, quitar solo sin unidades ensambladas, con el cambio registrado (`RN-INV-29`, `RN-INV-35`).
- Baja de un elemento sin unidades comprometidas, sin eliminarlo físicamente (`RN-INV-45`, `RN-INV-16`).
- Listado del catálogo paginado con su total (`RN-CTX-02`), y escritura reservada al administrador (`RN-CTX-05`).

**No incluye**

| Tema | Dónde se especifica |
|------|---------------------|
| Alta y administración de categorías | Epic 10 (`RN-CATEG-01` a `RN-CATEG-03`); acá solo se exige que la categoría **exista** (`AC-ITE-01-2`) |
| Alta de unidades serializadas, ensamblaje y stock de los consumibles | Epic 05 (`US-INV-01`, `US-INV-02`, `US-INV-04`) |
| Aritmética del stock: descontar al entregar, no quedar negativo, rechazar la entrega si la cantidad ya no existe | `RN-INV-11`; epic 05 (`AC-INV-04-4`, `AC-INV-04-5`, `AC-INV-04-8`) |
| Cantidades decimales de un consumible | `RN-INV-18`; ya especificado en `AC-INV-04-7` del epic 05, y acá no se duplica |
| Reserva de un consumible por rango de fechas | `RN-INV-11` la descarta: el stock baja al registrar la entrega |
| Reposición de un consumible (compra o recarga) | Ninguna regla define la suma de cantidad |
| La **alerta** de stock bajo y su cálculo | `RN-INV-44`; el **atributo** `minStock` se declara acá (`AC-ITE-02-5`) y la alerta es `US-INV-13` del epic 05 (`AC-INV-13-1`, `AC-INV-13-2`) |
| Verificar los componentes obligatorios al empacar y documentar la ausencia | Epic 06 (`AC-SOL-05-3`); acá solo se define la marca obligatorio/opcional |
| Qué componentes faltan realmente y quién los tiene | Epic 05 (`US-INV-05`, `RN-INV-10`): compara la composición contra las unidades reales |
| Estados físicos de una unidad y qué se puede prestar en cada uno | `RN-INV-30`, `RN-INV-31`; epic 05 (`US-INV-10`) |
| Evaluación **recursiva** de la completitud de un compuesto anidado | `RN-INV-27` admite el anidamiento; su evaluación es del epic 05 |
| Edición de los atributos del elemento (nombre, categoría, unidad de medida, tenencia, `minStock`) y reconfiguración de un elemento ya creado como consumible | Ninguna regla la fija: `RN-INV-29` cubre la **composición**, no los demás campos del catálogo, y `RN-INV-46` decide el **alta**; el epic 05 solo lee el efecto de esa clasificación sobre el inventario (`AC-INV-07-4`) |
| Unicidad del nombre de un elemento | Ninguna regla la fija; ningún criterio la exige |
| Código interno, ubicación o foto del elemento | Ninguna regla los pide: el inventario es uno solo (`RN-CTX-03`) y la ubicación de la unidad es `RN-CTX-07`, especificada en `US-INV-11` del epic 05 |
| Stock inicial de un elemento serializable | Se define en cero porque el stock se cuenta en unidades (`AC-ITE-01-3`); ninguna regla permite declarar stock sin unidades |
| Cómo se registra una pila de un elemento del SENA | `RN-INV-28` las declara **no consumibles** y `RN-INV-34` exige dos elementos distintos si hay que tratarlas de las dos formas |
| Baja de una **unidad** y su motivo y actor | `RN-INV-17`; epic 05 |
| Eliminar físicamente un elemento o sus unidades | Prohibido por `RN-INV-45` y verificado en `AC-ITE-06-3` |
| Reactivar un elemento dado de baja | Ninguna regla lo contempla |
| Qué pasa con la composición de un elemento dado de baja | Ninguna regla lo fija |
| Historial completo o versionado de la composición, y deshacer un cambio | `RN-INV-29` exige el registro de **cada** cambio con qué, quién y cuándo; no fija un formato ni una reversión |
| Cierre de una solicitud por lo que quedó afuera | `RN-SOL-12`; epic 07 |
| Formato, vista o exportación de la composición | Ninguna regla fija formatos ni reportes: el epic 09 está descartado por decisión del negocio (§10 de `00-contexto-negocio.md`) |
| Disponibilidad del compuesto por rango de fechas | Epic 08 |

## Actores y permisos

| Actor | Puede | No puede |
|-------|-------|----------|
| **Administrador** (instructor encargado del almacén) | Registrar elementos serializables y consumibles, definir, consultar y editar composiciones, y dar de baja un elemento | Dar de baja un elemento con unidades prestadas o reservadas (`RN-INV-45`); quitar un componente con unidades ensambladas (`RN-INV-35`); registrar consumibles del SENA (`RN-INV-46`); eliminar físicamente un elemento (`RN-INV-45`) |
| **Instructor** (quien dicta la clase) | Nada en este módulo: no administra el catálogo. Su lectura del catálogo y su disponibilidad son el epic 08 | Registrar elementos o consumibles, definir o editar composiciones o dar de baja: la escritura del catálogo es administrativa y responde `403` sin efectos (`RN-CTX-05`) |

Una petición sin credencial no es un actor: no tiene identidad y recibe `401` (epic 01, `AC-AUTH-05-2`). No hay un tercer rol (`RN-CTX-05`): el administrador **es** un instructor y nadie más escribe el catálogo.

## Reglas de negocio

| ID | Regla | Ejemplo |
|----|-------|---------|
| `RN-CTX-05` | Dos actores y ninguno más: la escritura del catálogo es **acción administrativa** y el instructor solicita, recoge y devuelve | Un alta de elemento enviada con sesión de instructor responde `403` y no crea nada |
| `RN-CTX-02` | Volumen de 1.000 a 1.500 equipos y elementos: **todo listado** es paginado con su total, incluido el catálogo de elementos | El listado devuelve una página acotada e informa el total de elementos |
| `RN-INV-05` | Existen elementos **consumibles** | Un consumible se registra como consumible y no como un serializado más |
| `RN-INV-06` | Un consumible **no tiene número de serie**: se controla **por cantidad**, no genera unidades y su creación no genera seriales automáticos | Registrar un consumible con una cantidad inicial deja ese stock y **cero** unidades serializadas |
| `RN-INV-12` | Cada consumible declara **su propia unidad de medida** | Un consumible se cuenta por frascos y otro por metros, y cada stock se lee en su unidad |
| `RN-INV-20` | La **tenencia** vive en la unidad física para los equipos serializados y en el **elemento** para los consumibles | La tenencia de un consumible queda registrada en el elemento porque no tiene unidades donde guardarla |
| `RN-INV-46` | Un elemento **del SENA no puede configurarse como consumible**: solo uno **donado** puede serlo | Registrar como consumible un elemento del SENA se rechaza y el donado se acepta |
| `RN-INV-07` | Dos tenencias —SENA y donado— y los del SENA **no se pueden perder** | Es la razón de la prohibición de `RN-INV-46`: un consumible se descuenta y no vuelve |
| `RN-INV-44` | La **alerta de stock bajo** compara la cantidad disponible de hoy, sin rango de fechas, contra el **umbral mínimo del elemento** (`minStock`), que fija el administrador y que, si falta, no genera alerta ni admite valor por defecto | Dos consumibles con umbrales distintos se comparan cada uno con el suyo, y el que no tiene umbral no alerta |
| `RN-INV-21` | Un compuesto se **define al crear el elemento**, eligiendo sus componentes del **catálogo existente** | Un compuesto registrado con dos componentes declara esa lista en el alta y no después |
| `RN-INV-22` | Un compuesto **puede incluir componentes consumibles** | Un consumible figura como componente de un compuesto |
| `RN-INV-23` | La composición es **variable**: cada compuesto declara su lista y un mismo componente **puede repetirse** | El mismo componente aparece dos veces en una composición |
| `RN-INV-24` | La falta de un componente **opcional** no impide prestar el conjunto, pero la ausencia **queda documentada**: completitud funcional y completitud documental son distintas | Un componente opcional ausente no bloquea el préstamo y aun así queda anotado |
| `RN-INV-25` | Un componente **presente pero agotado o descargado** no se considera faltante: se sigue mostrando y cuenta como presente, sin variante por tenencia | Una pila descargada figura como presente en la composición |
| `RN-INV-37` | **El administrador** marca cada componente como **obligatorio u opcional** al definir la composición; esa marca es lo que vuelve determinable «se entrega completo» | Un componente marcado como opcional se consulta como opcional |
| `RN-INV-26` | Un **kit** es un compuesto que incluye el aparato como un componente más, y el aparato es un **elemento independiente** del catálogo | El aparato del kit no es componente de sí mismo: es otro elemento del catálogo |
| `RN-INV-27` | Un compuesto **puede contener otro compuesto** como componente, y la composición resultante se acepta y se consulta | Un compuesto registrado como componente de otro se consulta como tal |
| `RN-INV-28` | Las pilas de un elemento **del SENA** son **no consumibles** y se entregan y devuelven con él; las demás **pueden** ser consumibles | Registrar un consumible no convierte en consumible la pila de un elemento del SENA |
| `RN-INV-34` | El carácter **consumible** se fija **por elemento**: un tipo de objeto que deba tratarse de las dos formas exige **dos elementos distintos** | La misma pila se registra como elemento serializado y, si es de otro tipo, como consumible aparte |
| `RN-INV-40` | El sistema **no autogenera números de serie ni unidades**: cada serial lo registra el administrador, uno por uno | Un elemento serializable recién creado queda con cero unidades y ningún serial |
| `RN-INV-41` | La composición **no puede formar ciclos**, ni directos ni indirectos | Un compuesto que ya contiene a otro no puede registrarse como componente de ese otro |
| `RN-INV-29` | La composición **se puede editar** después de creado el elemento y **todo cambio queda registrado**: qué cambió, quién y cuándo | Agregar un componente a una composición existente se acepta y se ve al consultarla |
| `RN-INV-35` | Con **unidades ensambladas** existentes **no se puede quitar** un componente; sí se pueden **agregar** componentes olvidados | Quitar un componente de un compuesto con una unidad ensamblada se rechaza |
| `RN-INV-45` | Un **elemento** puede darse de baja si **ninguna de sus unidades está comprometida** —prestada o reservada— y **no se elimina físicamente** | Dar de baja un elemento con una unidad prestada se rechaza; sin unidades comprometidas se acepta y el elemento sigue consultable |
| `RN-INV-16` | Los listados de inventario muestran **todas** las unidades: dar de baja un elemento **no** las esconde | Las unidades de un elemento dado de baja siguen figurando en los listados de inventario |
| `RN-INV-33` | Una unidad **en trámite de baja** queda bloqueada; la excepción es la **declarada perdida** (`RN-PRE-15`) | Una unidad en trámite sigue en el inventario y sigue siendo auditable |
| `RN-PRE-15` | Una unidad **declarada perdida** sale del inventario activo y **no bloquea** disponibilidad | Una unidad perdida no compromete el elemento y no impide su baja |
| `RN-PRE-02` | Debe saberse **siempre** quién tiene cada elemento y desde cuándo | Un serial inventado no es trazable y una baja con unidades afuera dejaría el registro sin sujeto |
| `RN-PRE-10` | La **condición de retorno** es obligatoria en toda **unidad serializada devuelta**; un **consumible no entra** al flujo de devolución y nunca la lleva | Un consumible entregado no se devuelve, y una unidad serializada devuelta siempre deja condición |
| `RN-MOV-01` | El **historial de movimientos** queda registrado y es consultable por el administrador | Es la razón por la que un elemento dado de baja sigue siendo consultable |
| `RN-INV-02` | Un compuesto se entrega **completo** | Es el límite de lo que este epic define: la verificación al empacar es el epic 06 |
| `RN-CATEG-01` | El administrador administra las categorías y el instructor las consulta para filtrar | La categoría con la que se clasifica un elemento la registra el administrador en el epic 10 |
| `RN-CATEG-02` | Una categoría tiene **nombre único** y se puede **editar** | Renombrar una categoría conserva los elementos clasificados con ella |
| `Estándar` (invariantes técnicos) | Integridad referencial del catálogo, prohibición de la autorreferencia y validación de entrada: ningún criterio de este módulo puede incumplirlos | Un elemento no se crea con una categoría inexistente ni con un componente que no está en el catálogo |

`RN-INV-05` a `RN-INV-46` viven en §5.2 de `00-contexto-negocio.md`; `RN-CTX-02` en §1, `RN-CTX-05` en §2, `RN-PRE-02`, `RN-PRE-10` y `RN-PRE-15` en §5.4, `RN-MOV-01` en §5.10 y `RN-CATEG-01` a `RN-CATEG-03` en §5.9. Acá se leen y se citan: ningún criterio agrega condiciones que la regla no diga.

`RN-INV-07`, `RN-INV-26`, `RN-INV-28`, `RN-INV-33`, `RN-INV-34`, `RN-PRE-02`, `RN-PRE-10`, `RN-MOV-01` y `RN-INV-02` se citan como fundamento y como frontera: explican por qué existe cada límite, y ninguno agrega un criterio propio a este epic.

## Historias de usuario

Los criterios nombran la clase de actor y de estado —«un administrador con sesión iniciada», «un catálogo con dos elementos registrados», «un compuesto con una unidad ensamblada»—. Los nombres concretos de los elementos, las categorías, las unidades de medida, las cantidades y los umbrales con los que se ejecutan los escenarios están en el `Anexo — Datos de prueba`, al final del documento, y son ejemplos, no requisitos.

### US-ITE-01 — Registrar un elemento serializable

**Como** administrador del almacén **quiero** registrar un elemento serializable con su nombre y su categoría **para** que el catálogo tenga el modelo al que después le daré unidades con su número de serie.

**Prioridad:** alta — sin elemento no hay unidades ni composición; los epics 05 y 08 construyen sobre este catálogo (`RN-INV-40`, `RN-CTX-05`).
**Estado:** especificada — no ejecutada.

Registrar un elemento registra el **modelo**, no una existencia: un elemento recién creado **no tiene nada adentro**. La categoría tiene que existir porque es la agrupación con la que el catálogo se clasifica y se filtra (epic 10), y la escritura es administrativa (`RN-CTX-05`), igual que el alta de una unidad (`AC-INV-01-5`, epic 05). Ninguna regla fija el código ni el mensaje de un rechazo, así que los criterios exigen el **efecto observable**.

#### AC-ITE-01-1 — Un elemento serializable registrado con nombre y categoría queda en el catálogo con stock 0

**Dado** un administrador con sesión iniciada.
**Y** una categoría existente en el catálogo.
**Cuando** registra un elemento serializable con un nombre y esa categoría.
**Entonces**:

- la operación se acepta;
- el elemento queda creado en el catálogo;
- el elemento aparece en el catálogo con stock 0.

`Origen: Estándar`

El stock 0 es la consecuencia de `AC-ITE-01-3`: el stock de un serializable se cuenta en unidades y un elemento recién creado no tiene ninguna. El criterio exige el **efecto** —el elemento existe y el catálogo lo informa con stock 0—, no la forma de la petición ni el código HTTP de la creación.

#### AC-ITE-01-2 — Un elemento con una categoría inexistente se rechaza sin crear nada

**Dado** un administrador con sesión iniciada.
**Y** una categoría que no existe en el catálogo.
**Cuando** registra un elemento serializable indicando esa categoría.
**Entonces**:

- la operación se rechaza;
- no se crea el elemento;
- el catálogo no incorpora ningún elemento con ese nombre.

`Origen: Estándar`

Es el invariante de integridad referencial: un elemento no puede pertenecer a una categoría que no está. El rechazo tiene que ser **total** —ningún elemento creado a medias—, porque un elemento sin categoría válida contaría en el catálogo y no se podría agrupar ni filtrar.

#### AC-ITE-01-3 — Un elemento serializable recién creado no tiene unidades ni seriales

**Dado** un administrador con sesión iniciada.
**Y** una categoría existente.
**Cuando** registra un elemento serializable con nombre y categoría.
**Entonces**:

- el elemento queda con cero unidades serializadas;
- el sistema no genera ningún número de serie;
- no queda ninguna unidad asociada al elemento.

`Origen: RN-INV-40`

Un serial inventado no es trazable, y la trazabilidad por serial es `RN-PRE-02`. Un elemento con unidades fantasma hace que el catálogo muestre existencias que no existen físicamente; por eso las unidades se registran **una por una** (epic 05) y `RN-INV-40` lo fija como regla propia, sin excepción para el serializable.

#### AC-ITE-01-4 — El instructor no puede registrar elementos

**Dado** un instructor con sesión iniciada.
**Cuando** envía la petición de registrar un elemento serializable con nombre y categoría.
**Entonces**:

- la respuesta es `403`;
- no se crea ningún elemento;
- el catálogo no cambia.

`Origen: RN-CTX-05`

`RN-CTX-05` reparte los actores sin ambigüedad: el instructor solicita, recoge y devuelve, y el alta del catálogo es escritura administrativa. El criterio exige el rechazo **y** la ausencia de efectos, porque un `403` que igual creara el elemento no cumpliría la regla.

#### AC-ITE-01-5 — El listado de elementos es paginado y devuelve el total

**Dado** un catálogo con más elementos registrados que el tamaño de página de la consulta.
**Y** un administrador con sesión iniciada.
**Cuando** consulta la primera página de elementos.
**Entonces**:

- la respuesta es `200`;
- la consulta devuelve como máximo el tamaño de página de elementos;
- la consulta informa el total de elementos del catálogo.

`Origen: RN-CTX-02`

`RN-CTX-02` fija el volumen —**1.000 a 1.500 equipos y elementos**— y su consecuencia: **todo listado** es paginado con su total, y en ese volumen la paginación es un **bloqueo funcional**. El criterio no fija el tamaño de página ni la forma de la respuesta. Un elemento **dado de baja** no es una excepción a este listado: aparece en él con su estado y cuenta en el total (`AC-ITE-06-1`).

### US-ITE-02 — Registrar un elemento consumible

**Como** administrador del almacén **quiero** registrar un elemento consumible con su tenencia, su unidad de medida y una cantidad inicial **para** que su existencia sea un número en vez de un serial que nadie puede presentar.

**Prioridad:** alta — sin consumibles no hay forma de registrar lo que se gasta, y hoy un consumible vale siempre 0 porque el stock se calcula contando unidades (`RN-INV-05`, `RN-INV-06`, `RN-INV-12`).
**Estado:** especificada — no ejecutada.

Un consumible se controla **por cantidad**: no genera unidades, su stock no se calcula contando seriales y su unidad de medida es **propia** (`RN-INV-12`), porque el almacén no tiene una unidad única. Solo un elemento **donado** puede ser consumible (`RN-INV-46`), y su tenencia vive en el elemento porque no tiene unidades donde guardarla (`RN-INV-20`). El **alta** es el único momento en que el carácter consumible se decide: editar los atributos de un elemento no está definido por ninguna regla.

#### AC-ITE-02-1 — Un consumible registrado con unidad de medida y cantidad inicial queda con ese stock y cero unidades

**Dado** un administrador con sesión iniciada.
**Y** una categoría existente en el catálogo.
**Cuando** registra un elemento consumible con su unidad de medida y una cantidad inicial.
**Entonces**:

- el elemento queda creado como consumible;
- su stock es la cantidad inicial, expresado en la unidad de medida con la que se registró;
- el elemento tiene cero unidades serializadas;
- no se generó ningún número de serie.

`Origen: RN-INV-06, RN-INV-12`

Los dos orígenes cubren dos mitades: `RN-INV-06` exige que la existencia sea **una cantidad y cero unidades**, y `RN-INV-12` que esa cantidad se lea en la unidad de medida del propio consumible. El criterio exige el **efecto**, no el tipo de dato del campo ni el formato de la unidad.

#### AC-ITE-02-2 — Un consumible sin unidad de medida se rechaza y la respuesta lo indica

**Dado** un administrador con sesión iniciada.
**Y** una categoría existente en el catálogo.
**Cuando** registra un elemento consumible sin indicar su unidad de medida.
**Entonces**:

- la operación se rechaza;
- la respuesta indica que la unidad de medida es obligatoria;
- no se crea el elemento;
- el catálogo no incorpora ningún consumible con ese nombre.

`Origen: RN-INV-12`

Un consumible sin unidad no se puede leer: su stock sería un número sin significado y cualquier resta posterior estaría restando magnitudes incomparables. El rechazo tiene que ser total, porque editar después el atributo no está definido por ninguna regla. Que la respuesta **indique** la obligatoriedad es parte del criterio; el texto literal del mensaje no lo fija ninguna regla.

#### AC-ITE-02-3 — El instructor no puede registrar consumibles

**Dado** un instructor con sesión iniciada.
**Cuando** envía la petición de registrar un elemento consumible con unidad de medida y cantidad.
**Entonces**:

- la respuesta es `403`;
- no se crea ningún elemento;
- el catálogo no cambia.

`Origen: RN-CTX-05`

Mismo fundamento que `AC-ITE-01-4`: el alta del catálogo es escritura administrativa y `RN-CTX-05` solo reconoce dos actores, de los cuales el instructor solicita, recoge y devuelve.

#### AC-ITE-02-4 — Solo un elemento donado se registra como consumible

**Dado** un administrador con sesión iniciada.
**Y** una categoría existente en el catálogo.
**Cuando** registra un elemento como consumible, cada escenario se comporta así:

| Escenario | Entrada | Resultado esperado |
|-----------|---------|--------------------|
| Elemento del SENA | registro como consumible de un elemento cuya tenencia es del SENA | rechazo; no se crea el elemento consumible y el catálogo no incorpora ningún consumible con ese nombre |
| Elemento donado | registro como consumible de un elemento donado, con su unidad de medida y cantidad inicial | el elemento queda creado como consumible; su tenencia donada queda registrada en el elemento; tiene cero unidades serializadas |

`Origen: RN-INV-46`

Los dos escenarios son las dos mitades de `RN-INV-46` y se verifican en el mismo test. La mitad negativa es de auditoría: un elemento del SENA se presenta **completo** (`RN-INV-07`) y un consumible se descuenta y no vuelve, así que marcarlo consumible lo dejaría presentándose incompleto. La mitad positiva evita que la regla se implemente prohibiendo el carácter consumible para todo elemento. El criterio exige el **efecto**, no la forma del campo de tenencia.

#### AC-ITE-02-5 — Cada consumible declara su propio umbral mínimo de stock

**Dado** un administrador con sesión iniciada.
**Y** una categoría existente en el catálogo.
**Cuando** se consulta el umbral mínimo de cada consumible y la alerta de stock bajo, cada escenario se comporta así:

| Escenario | Estado | Resultado esperado |
|-----------|--------|--------------------|
| Umbrales distintos | dos consumibles registrados con umbrales mínimos diferentes | cada elemento informa el umbral con el que se registró; la alerta compara cada elemento contra **su propio** umbral y no contra un número fijo |
| Sin umbral | un consumible registrado sin umbral mínimo y con cantidad disponible 0 | ese consumible no genera ninguna alerta; sigue sin umbral mínimo y el sistema no le asigna ningún valor por defecto |

`Origen: RN-INV-44`

Comparar contra un número fijo haría que el mismo corte sirviera para un consumible que se cuenta por metros y para otro que se cuenta por frascos, y la alerta dejaría de decir cuánto hay que reponer de cada cosa. El umbral lo **fija el administrador** por elemento, y por eso el criterio puede exigir el segundo escenario: un elemento **sin `minStock` no genera alerta** y el sistema **no inventa un umbral**. Los dos valores del escenario son datos de prueba: la regla fija **quién** decide el umbral y qué pasa cuando no lo decide. La alerta que compara los números es `US-INV-13` del epic 05; acá se fija solo el atributo contra el que compara.

### US-ITE-03 — Definir la composición de un elemento compuesto

**Como** administrador del almacén **quiero** declarar de qué elementos está hecho un elemento compuesto **para** que el sistema sepa qué piezas forman el conjunto que el instructor solicita completo.

**Prioridad:** alta — sin composición no hay ensamblaje (epic 05) ni forma de saber si un conjunto está completo (`RN-INV-21`, `RN-INV-24`, `RN-INV-37`).
**Estado:** especificada — no ejecutada.

`RN-INV-21` fija el **momento**: la composición se define **al crear el elemento**, con componentes del **catálogo existente**. `RN-INV-23` fija la **forma**: la lista es variable y un componente **puede repetirse**. `RN-INV-22` admite consumibles como componentes —en la composición sí, en el ensamblaje nunca, porque un consumible no tiene unidad física que unir—. `RN-INV-37` fija **quién** marca cada componente como **obligatorio u opcional**, y esa marca es lo que vuelve determinable «se entrega completo» (`RN-INV-02`). `RN-INV-41` cierra el límite: la relación no puede volver al punto de partida.

#### AC-ITE-03-1 — Un compuesto se registra declarando sus componentes en el alta

**Dado** un administrador con sesión iniciada.
**Y** un catálogo con dos elementos registrados.
**Cuando** registra un elemento compuesto declarando esos dos elementos como sus componentes.
**Entonces**:

- el elemento queda registrado como compuesto;
- su composición queda consultable;
- la composición informa esos dos elementos como sus componentes.

`Origen: RN-INV-21`

El criterio verifica las dos partes de la regla: que la definición ocurre **en el alta** y que los componentes salen del catálogo existente. «Queda consultable» es lo que después lee `US-ITE-04`; sin eso, el ensamblaje del epic 05 no tendría contra qué comparar.

#### AC-ITE-03-2 — Un componente puede repetirse en la composición

**Dado** un administrador con sesión iniciada.
**Y** un catálogo con un elemento registrado.
**Cuando** registra un elemento compuesto declarando ese elemento dos veces en su composición.
**Entonces**:

- el elemento queda registrado como compuesto;
- la composición refleja las dos apariciones del componente;
- la composición no colapsa las dos apariciones en una sola.

`Origen: RN-INV-23`

`RN-INV-23` es explícita: la composición es variable y un mismo componente **puede repetirse**. El criterio exige el **efecto** —las dos apariciones se reflejan— y no la forma de guardarlas: sea una cantidad o dos filas, la regla se cumple igual.

#### AC-ITE-03-3 — Un elemento no puede ser componente de sí mismo

**Dado** un administrador con sesión iniciada.
**Cuando** intenta registrar un elemento compuesto declarándose a sí mismo como componente.
**Entonces**:

- la operación se rechaza;
- no se crea el elemento;
- no queda ninguna composición registrada.

`Origen: Estándar`

Un elemento que se contiene a sí mismo no describe ninguna realidad física y deja la composición imposible de recorrer —la completitud nunca terminaría de calcularse—. `RN-INV-26` lo respalda: en un kit el aparato es **un componente más** de un elemento **independiente**, así que nada exige la autorreferencia.

#### AC-ITE-03-4 — Un componente que no está en el catálogo se rechaza

**Dado** un administrador con sesión iniciada.
**Y** un catálogo que no contiene el elemento que se va a declarar como componente.
**Cuando** registra un elemento compuesto declarando ese elemento inexistente como componente.
**Entonces**:

- la operación se rechaza;
- no se crea el elemento compuesto;
- el catálogo no incorpora el elemento inexistente.

`Origen: Estándar`

`RN-INV-21` dice que los componentes se eligen **del catálogo existente**, y este criterio es su contraparte verificable. El rechazo tiene que ser total: una composición a medio escribir describiría un conjunto que no es el que el administrador declaró.

#### AC-ITE-03-5 — Un consumible puede ser componente de un compuesto

**Dado** un administrador con sesión iniciada.
**Y** un catálogo con un elemento consumible.
**Cuando** registra un elemento compuesto declarando ese consumible como componente.
**Entonces**:

- el elemento queda registrado como compuesto;
- la composición incluye ese consumible como componente.

`Origen: RN-INV-22`

`RN-INV-22` es explícita: un compuesto **puede incluir componentes consumibles**. El consumible puede estar en la **composición** y **nunca** en el **ensamblaje**, porque no tiene unidad física que unir. Cuándo se descuenta su cantidad del stock es `RN-INV-11` y la mecánica de la resta es `US-INV-04` del epic 05.

#### AC-ITE-03-6 — Un componente puede quedar marcado como opcional

**Dado** un administrador con sesión iniciada.
**Y** un compuesto con dos componentes obligatorios y uno opcional.
**Cuando** el administrador define la composición y marca uno de esos componentes como opcional.
**Entonces**:

- ese componente queda registrado como opcional en la composición;
- la composición consultada informa que ese componente es opcional;
- la consulta no informa como opcional ningún componente que el administrador no haya marcado así.

`Origen: RN-INV-37`

`RN-INV-37` fija el actor y el momento: **el administrador** marca cada componente como obligatorio u opcional **al definir la composición**. El criterio verifica el **efecto** —la marca queda y la consulta la informa—, no cómo se guarda. La regla **no** fija un valor por defecto, y por eso el último paso niega que se informe como opcional un componente que nadie marcó, en vez de afirmar cuál es la marca de los demás. La consecuencia sobre el empaque y la entrega es `AC-SOL-05-3` del epic 06.

#### AC-ITE-03-7 — Un compuesto puede ser componente de otro compuesto

**Dado** un administrador con sesión iniciada.
**Y** un catálogo con dos elementos compuestos registrados.
**Cuando** registra uno de ellos declarando el otro como uno de sus componentes.
**Entonces**:

- la operación se acepta;
- el elemento queda registrado como compuesto;
- la composición del nuevo compuesto queda consultable e informa el otro compuesto como uno de sus componentes.

`Origen: RN-INV-27`

`RN-INV-27` admite el anidamiento y exige que la composición resultante se **acepte** y se pueda **consultar**. El criterio verifica el **efecto**, no la forma de guardarlo. La evaluación **recursiva** de la completitud que la misma regla describe es del epic 05.

#### AC-ITE-03-8 — Una composición que haría que un compuesto se contenga a sí mismo se rechaza

**Dado** un administrador con sesión iniciada.
**Y** un catálogo con dos elementos compuestos registrados.
**Y** la composición de uno de ellos incluye al compuesto que se va a crear.
**Cuando** el administrador registra el nuevo compuesto declarando como componente al compuesto que ya lo contiene.
**Entonces**:

- la operación se rechaza;
- no se crea el elemento compuesto;
- no queda ninguna composición que haga que el compuesto se contenga a sí mismo, directa o indirectamente.

`Origen: RN-INV-41`

`AC-ITE-03-3` prohíbe el caso **directo** y este criterio extiende la misma razón al caso **indirecto**: una composición circular no describe ninguna realidad física y deja la completitud imposible de recorrer. El borde preexistente se siembra como dato del catálogo y lo que se exige es que el alta se rechace cuando el grafo resultante contendría un ciclo.

### US-ITE-04 — Consultar la composición de un elemento

**Como** administrador del almacén **quiero** consultar de qué está hecho un elemento compuesto y qué componentes son opcionales **para** saber qué piezas tengo que buscar antes de entregar el conjunto y cuáles pueden faltar.

**Prioridad:** media — es la lectura que el ensamblaje del epic 05 y la auditoría de `RN-INV-10` necesitan de la composición.
**Estado:** especificada — no ejecutada.

Una composición que se define y no se puede leer no sirve: se consulta para preparar el conjunto y para responder una auditoría. `RN-INV-23` exige que la lectura devuelva **todos** los componentes, `RN-INV-24` que informe la **opcionalidad**, `RN-INV-22` que **distinga** el consumible del serializado —uno se busca por serial y el otro se descuenta por cantidad— y `RN-INV-25` que una pieza **presente pero agotada** siga contando como presente.

#### AC-ITE-04-1 — La consulta devuelve todos los componentes registrados y su opcionalidad

**Dado** un compuesto con dos componentes obligatorios y uno opcional.
**Cuando** el administrador consulta la composición de ese elemento.
**Entonces**:

- la consulta devuelve todos los componentes registrados;
- cada componente informa si es opcional.

`Origen: RN-INV-23, RN-INV-24`

`RN-INV-23` exige que la lectura refleje la composición declarada, repeticiones incluidas, y `RN-INV-24` exige la **opcionalidad**, que es lo que separa la completitud funcional de la documental. La consulta devuelve **todos** los componentes: una lista filtrada haría creer que el conjunto está completo. El criterio no fija cómo se informa una repetición; solo exige que todas las apariciones registradas se informen.

#### AC-ITE-04-2 — La consulta distingue el consumible del componente controlado por unidades

**Dado** un compuesto cuya composición incluye un consumible y un elemento serializable.
**Cuando** el administrador consulta la composición de ese elemento.
**Entonces**:

- la consulta distingue el componente consumible del componente controlado por unidades serializadas;
- el consumible no se informa con unidades serializadas.

`Origen: RN-INV-22`

Un consumible puede estar en la composición pero **nunca** en el ensamblaje, porque no tiene unidad física que unir. Si la consulta presentara los dos igual, el administrador intentaría ensamblar un serial que no existe o descontar cantidad de un elemento que sí lo tiene. El criterio exige el **efecto**, no cómo se nombra la distinción.

#### AC-ITE-04-3 — Un componente presente pero agotado figura como presente

**Dado** un compuesto cuya composición incluye un componente registrado.
**Y** ese componente es un elemento del SENA.
**Y** ese componente está presente pero agotado o descargado.
**Cuando** el administrador consulta la composición de ese elemento.
**Entonces**:

- ese componente figura como presente en la composición;
- no figura como faltante.

`Origen: RN-INV-25`

Una pieza **agotada sigue en el inventario**: agotarse es una **condición física**, no una salida del inventario. **Presencia** y **funcionamiento** son condiciones distintas y el sistema no debe confundirlas: reportar como faltante algo que está en la caja produce un faltante inexistente en auditoría. La regla nombra solo los elementos del SENA y aplica **sin variante por tenencia**, así que el criterio no extrapola nada: verifica el caso que la regla nombra.

### US-ITE-05 — Editar la composición de un compuesto

**Como** administrador del almacén **quiero** agregar y quitar componentes de la composición de un elemento ya creado **para** que la composición diga qué piezas tiene hoy el conjunto, sin tener que crear un elemento nuevo cada vez que una pieza cambia.

**Prioridad:** alta — sin edición, cada cambio de una pieza obligaría a crear un elemento nuevo (`RN-INV-29`, `RN-INV-35`).
**Estado:** especificada — no ejecutada.

`RN-INV-21` fijó el momento del alta y `RN-INV-29` completa la regla: la composición **se puede editar** y **todo cambio queda registrado** —qué cambió, quién y cuándo—. Editar sin dejar registro rompería la trazabilidad que `RN-PRE-02` y `RN-INV-10` exigen, porque un componente que desaparece de la composición sería indistinguible de un error de carga. `RN-INV-35` pone el límite: con **unidades ensambladas** existentes **no se puede quitar** un componente, y sí se pueden **agregar** componentes olvidados. La edición es escritura administrativa (`RN-CTX-05`).

#### AC-ITE-05-1 — El administrador agrega un componente a una composición existente

**Dado** un administrador con sesión iniciada.
**Y** un compuesto ya creado cuya composición incluye un elemento del catálogo.
**Y** otro elemento del catálogo que no forma parte de esa composición.
**Cuando** el administrador agrega ese otro elemento a la composición.
**Entonces**:

- la operación se acepta;
- la composición consultada de ese compuesto informa los dos elementos como sus componentes.

`Origen: RN-INV-29`

El criterio verifica el efecto completo: la operación se acepta **y** el cambio se ve al consultar. Una edición aceptada que la consulta no refleja no sirve, porque es esa lectura la que el ensamblaje del epic 05 usa para saber qué piezas tiene el conjunto.

#### AC-ITE-05-2 — Quitar un componente queda registrado con qué cambió, quién y cuándo

**Dado** un administrador con sesión iniciada.
**Y** un compuesto ya creado cuya composición incluye dos elementos.
**Y** ese compuesto **no** tiene unidades ensambladas.
**Cuando** el administrador quita uno de esos dos componentes de la composición.
**Entonces**:

- la operación se acepta;
- la composición consultada de ese compuesto ya no informa el componente quitado;
- queda registrado el cambio, con el componente quitado, el administrador que lo quitó y el momento en que ocurrió.

`Origen: Derivada` — `RN-INV-29` confirma el registro del cambio; que quitar un componente sea **posible** cuando no hay unidades ensambladas no está afirmado por ninguna regla.

El criterio pide los tres datos que `RN-INV-29` nombra —qué cambió, quién y cuándo— y no el formato del registro ni dónde se guarda. La condición «no tiene unidades ensambladas» es la de `RN-INV-35` leída al revés: si existiera **una** unidad ensamblada, la edición se rechaza (`AC-ITE-05-3`).

> **No implementable todavía.** La aceptación del caso se desprende de `RN-INV-29` y `RN-INV-35`, pero **no fue afirmada**: `RN-INV-35` solo afirma el caso contrario —con unidades ensambladas se rechaza— y su nota `Derivada` registra el hueco. El criterio se conserva con su condición y no se implementa hasta que el negocio confirme que quitar es posible cuando no hay unidades ensambladas.

#### AC-ITE-05-3 — Quitar un componente con unidades ensambladas se rechaza

**Dado** un compuesto con al menos una unidad ensamblada.
**Cuando** el administrador intenta quitar uno de sus componentes de la composición.
**Entonces**:

- la operación se rechaza;
- la composición consultada sigue informando ese componente;
- ninguna de las unidades ya ensambladas cambia.

`Origen: RN-INV-35`

`RN-INV-35` confirma la conducta con **unidades ensambladas** existentes y admite a la vez el agregado de componentes olvidados (`AC-ITE-05-1`). El rechazo protege la coherencia entre la composición declarada y las unidades ya armadas: si el componente desapareciera de la definición, las unidades existentes quedarían con una pieza que ya no está declarada y la completitud recursiva de `RN-INV-27` dejaría de poder evaluarse.

### US-ITE-06 — Dar de baja un elemento del catálogo

**Como** administrador del almacén **quiero** dar de baja un elemento del catálogo que ya no se usa **para** dejar de ofrecerlo sin borrar el historial de las unidades que pasaron por él.

**Prioridad:** media — la baja se rechaza mientras alguna unidad esté comprometida y nunca elimina el elemento (`RN-INV-45`).
**Estado:** especificada — no ejecutada.

`RN-INV-45` fija las dos mitades: un **elemento** se da de baja si **ninguna de sus unidades está comprometida** —ni prestada ni reservada— y **no se elimina físicamente**. La baja es un **estado** del elemento, no una desaparición: el elemento sigue apareciendo en el listado del catálogo con ese estado y lo que deja de existir es su **oferta para una solicitud nueva**. La razón de no borrarlo es el registro: `RN-MOV-01` exige que el historial de movimientos sea consultable y `RN-PRE-02` que se sepa quién tuvo cada elemento. `RN-INV-16` completa la trazabilidad desde el otro lado: los listados de inventario siguen mostrando **todas** las unidades.

#### AC-ITE-06-1 — Se da de baja un elemento sin unidades comprometidas y no desaparece del catálogo

**Dado** un elemento del catálogo que no tiene unidades comprometidas.
**Y** un administrador con sesión iniciada.
**Cuando** el administrador da de baja ese elemento.
**Entonces**:

- la operación se acepta;
- el elemento deja de ofrecerse para una solicitud nueva;
- el elemento sigue apareciendo en el listado del catálogo, informado como dado de baja, y cuenta en el total que ese listado informa;
- las unidades registradas de ese elemento siguen figurando en los listados de inventario.

`Origen: RN-INV-45`

`RN-INV-45` habilita la baja con una sola condición —**sin unidades comprometidas**— y prohíbe eliminarlo físicamente, así que el elemento **deja de ofrecerse** sin desaparecer. La última mitad la garantiza `RN-INV-16`: la baja **no esconde** las unidades. La distinción es entre **aparecer**, que la baja no oculta porque hace falta para auditar (`AC-ITE-06-3`), y **ofrecerse**, que es lo que la baja suspende. Qué forma tiene el estado de baja es decisión de implementación.

#### AC-ITE-06-2 — La baja se rechaza con unidades comprometidas y se acepta con la unidad declarada perdida

**Dado** un elemento del catálogo.
**Y** un administrador con sesión iniciada.
**Cuando** el administrador intenta dar de baja ese elemento, cada escenario se comporta así:

| Escenario | Estado del elemento | Resultado esperado |
|-----------|---------------------|--------------------|
| Unidad en préstamo | una unidad prestada a un instructor | rechazo; el elemento sigue ofreciéndose en el catálogo; la unidad sigue registrada como prestada al mismo instructor |
| Unidad reservada | una unidad reservada para un rango de fechas | rechazo; el elemento sigue ofreciéndose en el catálogo; la reserva sigue activa |
| Única unidad declarada perdida | su única unidad fue declarada perdida | la baja se acepta y el elemento deja de ofrecerse para una solicitud nueva |

`Origen: RN-INV-45`

`RN-INV-45` pone la condición en la letra: con una unidad prestada o con una reserva activa la baja se rechaza. Los dos primeros escenarios exigen el rechazo **y** la ausencia de efectos —el elemento sigue ofreciéndose y la unidad sigue prestada o la reserva sigue activa—, porque un rechazo que igual cambiara algo dejaría el registro tan ilegible como la baja. El tercer escenario es la otra cara: una unidad **declarada perdida** sale del inventario activo y no bloquea nada (`RN-PRE-15`, que prevalece sobre `RN-INV-33`), así que no está comprometida y no impide la baja. Los tres escenarios son el mismo criterio y se verifican en el mismo test.

#### AC-ITE-06-3 — Un elemento dado de baja sigue siendo consultable

**Dado** un elemento del catálogo dado de baja.
**Y** un administrador con sesión iniciada.
**Cuando** el administrador consulta ese elemento.
**Entonces**:

- la consulta devuelve el elemento con sus datos;
- la consulta informa que el elemento está dado de baja;
- el elemento no se ofrece en el catálogo como opción para una solicitud nueva.

`Origen: RN-INV-45`

`RN-INV-45` prohíbe **eliminarlo físicamente**: la baja es un estado y no un borrado. Eliminar el elemento dejaría los movimientos de `RN-MOV-01` sin sujeto y el «quién tuvo cada elemento» de `RN-PRE-02` sin referencia. El criterio exige las dos mitades: sigue **consultable** con su estado de baja y a la vez ya **no se ofrece**. Aparecer en el listado del administrador (`AC-ITE-06-1`) no contradice lo anterior: el listado lo muestra con su estado.

## Errores y mensajes

| Situación | HTTP | Código | Mensaje |
|-----------|------|--------|---------|
| Registro de un elemento con una categoría inexistente | No lo fija ninguna regla | No lo fija ninguna regla | No lo fija ninguna regla; sin elemento creado |
| Registro de un consumible sin unidad de medida | No lo fija ninguna regla | No lo fija ninguna regla | La respuesta indica que la **unidad de medida es obligatoria**; sin consumible creado |
| Registro como consumible de un elemento del SENA | No lo fija ninguna regla | No lo fija ninguna regla | No lo fija ninguna regla; sin consumible creado |
| Registro de un elemento con sesión de instructor | `403` | No lo fija ninguna regla (el epic 01 usa `FORBIDDEN`) | No lo fija ninguna regla; sin efectos |
| Registro de un compuesto con un componente que no está en el catálogo | No lo fija ninguna regla | No lo fija ninguna regla | No lo fija ninguna regla; sin compuesto creado |
| Registro de un compuesto declarándose a sí mismo como componente | No lo fija ninguna regla | No lo fija ninguna regla | No lo fija ninguna regla; sin elemento ni composición |
| Registro de un compuesto que cerraría un ciclo | No lo fija ninguna regla | No lo fija ninguna regla | No lo fija ninguna regla; sin compuesto creado |
| Intento de quitar un componente con unidades ensambladas | No lo fija ninguna regla | No lo fija ninguna regla | No lo fija ninguna regla; la composición y las unidades quedan como estaban |
| Intento de dar de baja un elemento con unidades comprometidas | No lo fija ninguna regla | No lo fija ninguna regla | No lo fija ninguna regla; el elemento sigue ofreciéndose y la unidad o la reserva sigue activa |
| Operación de escritura del catálogo sin credencial | `401` | No lo fija ninguna regla (epic 01, `AC-AUTH-05-2`) | No lo fija ninguna regla; sin efectos sobre datos |

La única exigencia de mensaje del epic es la de `AC-ITE-02-2`: que la respuesta **indique** que la unidad de medida es obligatoria. Ninguna regla fija el texto literal ni el código de los demás rechazos: lo exigido es el rechazo y su ausencia de efectos.

## Sesión y seguridad

| Efecto | Regla | Dónde se verifica |
|--------|-------|-------------------|
| Escribir el catálogo —alta de elemento y de consumible, composición y baja— exige sesión con rol de administrador | `RN-CTX-05` | `AC-ITE-01-4`, `AC-ITE-02-3` |
| La escritura con sesión de instructor responde `403` sin efectos | `RN-CTX-05` | `AC-ITE-01-4`, `AC-ITE-02-3` |
| Una operación de escritura sin credencial no es una operación de ningún actor: recibe `401` | Epic 01 (`AC-AUTH-05-2`) | — |
| No hay un tercer rol que escriba el catálogo: el administrador **es** un instructor | `RN-CTX-05` | `AC-ITE-01-4`, `AC-ITE-02-3` |
| Registrar un elemento no crea credenciales, unidades ni seriales | `RN-INV-40` | `AC-ITE-01-3` |

Ninguna regla de este epic fija plazos de sesión ni efectos del catálogo sobre las credenciales: registrar, editar una composición o dar de baja un elemento no cierra sesiones. El contrato de sesión es del epic 01.

## Decisiones tomadas

| Decisión | Regla |
|----------|-------|
| El catálogo define el modelo y no las existencias: un elemento nace sin unidades y sin seriales, y su stock inicial es cero | `RN-INV-40`, `RN-PRE-02` |
| Un consumible es un elemento controlado por cantidad, con su propia unidad de medida y cero unidades serializadas | `RN-INV-06`, `RN-INV-12` |
| Solo un elemento **donado** puede ser consumible, y su tenencia vive en el elemento | `RN-INV-46`, `RN-INV-20` |
| El carácter consumible se fija **por elemento**: un tipo de objeto que deba tratarse de las dos formas exige dos elementos distintos | `RN-INV-34` |
| El `minStock` lo fija el administrador por elemento; sin umbral no hay alerta y no hay valor por defecto | `RN-INV-44` |
| La composición se define **en el alta**, con componentes del catálogo existente, y admite consumibles, compuestos y repeticiones | `RN-INV-21`, `RN-INV-22`, `RN-INV-23`, `RN-INV-27` |
| La composición **no puede formar ciclos**, ni directos ni indirectos, y un elemento no es componente de sí mismo | `RN-INV-41` |
| El **administrador** marca cada componente como obligatorio u opcional; la regla no fija un valor por defecto para el componente no marcado | `RN-INV-37` |
| La composición **se edita** y todo cambio queda registrado con qué cambió, quién y cuándo | `RN-INV-29` |
| Con **unidades ensambladas** existentes no se quita un componente; agregar siempre se puede | `RN-INV-35` |
| Un elemento se da de baja **sin unidades comprometidas** y **no se elimina**: sigue consultable y deja de ofrecerse | `RN-INV-45` |
| Una unidad **declarada perdida** sale del inventario activo y no bloquea la baja del elemento | `RN-PRE-15` |
| Dar de baja un elemento no esconde sus unidades en los listados de inventario | `RN-INV-16` |
| La escritura del catálogo es del administrador; el instructor solicita, recoge y devuelve | `RN-CTX-05` |
| El catálogo de elementos es paginado con su total, como todo listado | `RN-CTX-02` |
| La **administración de categorías** pertenece al epic 10 y la **verificación al empacar** al epic 06; este epic solo exige que la categoría exista y define la marca obligatorio/opcional | `RN-CATEG-01`, `RN-INV-02` |

Sin decisión todavía: la unicidad del nombre de un elemento, la edición de los atributos del elemento (nombre, categoría, unidad de medida, tenencia, `minStock`), la reconfiguración de un elemento como consumible después de creado, la reposición de un consumible, el formato de historial o la reversión de un cambio de composición, el destino de la composición de un elemento dado de baja, la reactivación de un elemento dado de baja, y —la que deja un criterio sin implementar— si quitar un componente es posible cuando el elemento **no** tiene unidades ensambladas. Ninguna regla los fija y ningún criterio los exige.

## Trazabilidad y estado

Un criterio se marca `OK` o `GAP` **solo** cuando su test corre, nunca por lectura del código. Este epic está **en ejecución parcial**: US-ITE-01 y US-ITE-02 ya corren con test y quedaron en `OK`; el resto sigue sin ejecutar hasta su encadenado. La verificación encontró y corrigió varios `GAP` reales (un serializable autogeneraba seriales, el consumible no tenía stock propio, no existía la tenencia y `minStock` no podía quedar sin umbral).

| Criterio | Regla | Estado hoy |
|----------|-------|------------|
| `AC-ITE-01-1` | `Estándar` | `OK` |
| `AC-ITE-01-2` | `Estándar` | `OK` |
| `AC-ITE-01-3` | `RN-INV-40` | `OK` |
| `AC-ITE-01-4` | `RN-CTX-05` | `OK` |
| `AC-ITE-01-5` | `RN-CTX-02` | `OK` |
| `AC-ITE-02-1` | `RN-INV-06`, `RN-INV-12` | `OK` |
| `AC-ITE-02-2` | `RN-INV-12` | `OK` |
| `AC-ITE-02-3` | `RN-CTX-05` | `OK` |
| `AC-ITE-02-4` | `RN-INV-46` | `OK` |
| `AC-ITE-02-5` | `RN-INV-44` | `OK` |
| `AC-ITE-03-1` | `RN-INV-21` | Sin ejecutar |
| `AC-ITE-03-2` | `RN-INV-23` | Sin ejecutar |
| `AC-ITE-03-3` | `Estándar` | Sin ejecutar |
| `AC-ITE-03-4` | `Estándar` | Sin ejecutar |
| `AC-ITE-03-5` | `RN-INV-22` | Sin ejecutar |
| `AC-ITE-03-6` | `RN-INV-37` | Sin ejecutar |
| `AC-ITE-03-7` | `RN-INV-27` | Sin ejecutar |
| `AC-ITE-03-8` | `RN-INV-41` | Sin ejecutar |
| `AC-ITE-04-1` | `RN-INV-23`, `RN-INV-24` | Sin ejecutar |
| `AC-ITE-04-2` | `RN-INV-22` | Sin ejecutar |
| `AC-ITE-04-3` | `RN-INV-25` | Sin ejecutar |
| `AC-ITE-05-1` | `RN-INV-29` | Sin ejecutar |
| `AC-ITE-05-2` | `RN-INV-29` + `Derivada` (`RN-INV-35`) | **No implementable** — ninguna regla afirma que quitar un componente sea posible cuando el elemento no tiene unidades ensambladas |
| `AC-ITE-05-3` | `RN-INV-35` | Sin ejecutar |
| `AC-ITE-06-1` | `RN-INV-45`, `RN-INV-16` | Sin ejecutar |
| `AC-ITE-06-2` | `RN-INV-45` | Sin ejecutar |
| `AC-ITE-06-3` | `RN-INV-45` | Sin ejecutar |

| US | ACs | Implementables (`RN` / `Estándar`) | `Derivada` (no implementable) | `OPEN` |
|----|-----|-----------------------------------|-------------------------------|--------|
| `US-ITE-01` | 5 | 5 | 0 | 0 |
| `US-ITE-02` | 5 | 5 | 0 | 0 |
| `US-ITE-03` | 8 | 8 | 0 | 0 |
| `US-ITE-04` | 3 | 3 | 0 | 0 |
| `US-ITE-05` | 3 | 2 | 1 | 0 |
| `US-ITE-06` | 3 | 3 | 0 | 0 |
| **Total** | **27** | **26** | **1** | **0** |

Totales: **6 historias y 27 criterios**, **10 `OK` y 17 sin ejecutar** (avance parcial en `devJoseph-items`). **26 son implementables**: **22** se apoyan en una regla de negocio confirmada y **4** en un invariante técnico (`Estándar`: `AC-ITE-01-1`, `AC-ITE-01-2`, `AC-ITE-03-3`, `AC-ITE-03-4`). **Uno es `Derivada` y no se implementa**: `AC-ITE-05-2`. Ninguno está en `OPEN`. Las citas de regla suman **27** sobre los **23** criterios que citan al menos una: `AC-ITE-02-1`, `AC-ITE-04-1`, `AC-ITE-05-2` y `AC-ITE-06-1` citan dos.

## Anexo — Datos de prueba

Los valores de esta tabla son **ejemplos**: no son requisitos y QA elige los suyos. Los criterios fijan la clase de actor, la de estado y los límites de la regla; estos datos solo registran con qué se ejecutan las pruebas del módulo.

| Dato | Valor usado |
|------|-------------|
| Administrador del seed | `admin@sena.edu.co` / `AdminSENA2024` |
| Instructor del seed usado en `AC-ITE-01-4` y `AC-ITE-02-3` | `cmendoza@sena.edu.co` / `Instructor2024` |
| Categoría existente en el catálogo | «Herramientas de taller» |
| Categoría inexistente de `AC-ITE-01-2` | un identificador o nombre que no pertenece a ninguna categoría registrada |
| Catálogo de `AC-ITE-01-5` | más elementos registrados que el tamaño de página de la consulta |
| Cantidad inicial de `AC-ITE-02-1` | 100, en la unidad de medida del consumible |
| Unidad de medida propia del consumible | la del elemento: el negocio nombra limpiador de contactos, cinta aislante, cable, estaño y fundente |
| Consumibles de control cruzado de `AC-ITE-02-1` | dos con unidades de medida distintas, cada stock en la suya |
| Umbrales mínimos de `AC-ITE-02-5` | 5 y 10 en dos consumibles distintos; y un consumible **sin** umbral con cantidad disponible 0 |
| Elementos de `AC-ITE-03-1` | un compuesto y los dos elementos del catálogo que declara como componentes |
| Elemento repetido de `AC-ITE-03-2` | un elemento del catálogo declarado dos veces en la misma composición |
| Componente inexistente de `AC-ITE-03-4` | un identificador que no pertenece a ningún elemento del catálogo |
| Consumible componente de `AC-ITE-03-5` | un consumible ya registrado en el catálogo |
| Compuesto de `AC-ITE-03-6` | dos componentes obligatorios y uno marcado como opcional |
| Compuestos de `AC-ITE-03-7` y `AC-ITE-03-8` | dos compuestos ya registrados: el nuevo se registra declarando al primero como componente; en `AC-ITE-03-8` la composición del primero ya incluye al que se va a crear, como dato sembrado |
| Composición de `AC-ITE-04-1` | un compuesto con dos componentes obligatorios y uno opcional |
| Composición de `AC-ITE-04-2` | un consumible y un elemento serializable |
| Componente de `AC-ITE-04-3` | un elemento **del SENA**, presente pero agotado o descargado |
| Composición de `AC-ITE-05-1` a `AC-ITE-05-3` | un compuesto con dos componentes; en `AC-ITE-05-1` un tercer elemento fuera de la composición; en `AC-ITE-05-2` sin unidades ensambladas; en `AC-ITE-05-3` con al menos una unidad ensamblada |
| Elemento de `AC-ITE-06-1` | sin unidades comprometidas, con al menos una unidad registrada |
| Elementos de `AC-ITE-06-2` | uno con una unidad prestada a un instructor; otro con una unidad reservada para un rango de fechas; otro cuya única unidad fue declarada perdida |
| Elemento de `AC-ITE-06-3` | previamente dado de baja |

Los usuarios salen del seed del proyecto (`AGENTS.md` §4). Los elementos, las unidades, sus préstamos y sus reservas son datos de los epics 05 y 07: acá se leen, no se crean.
