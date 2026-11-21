# Epic 10 — Categorías del catálogo

El catálogo de categorías que clasifica los elementos y alimenta el filtro del instructor: registrar con nombre único, consultar con paginación y total, renombrar sin perder los elementos y no poder eliminar una categoría en uso.

## Resumen

Este módulo resuelve el **catálogo de categorías**: registrar una categoría con su nombre, consultar las categorías registradas de forma paginada, corregir el nombre de una ya registrada e impedir que se elimine una categoría con elementos asociados.

La categoría es el **cimiento de dos historias ya especificadas**: `US-ITE-01` del epic 04 exige la categoría en el alta de un elemento y rechaza una inexistente, y `US-CAT-02` del epic 08 ofrece filtrar el catálogo por categoría. La **escribe el administrador**; el instructor **solo la consulta para filtrar** (`RN-CATEG-01`).

Si el módulo falla, no se puede clasificar ningún elemento, el filtro del catálogo no tiene valores que ofrecer, o se borra una categoría en uso y deja elementos sin la agrupación que los clasifica. Estado hoy: **3 historias y 10 criterios especificados y sin ejecutar**; ningún criterio es `OK` ni `GAP`, porque todavía no hay test que los corra.

> **Frontera con los epics 04 y 08.** Asignar la categoría a un elemento es `US-ITE-01` (epic 04) y el filtro por categoría es `US-CAT-02` (epic 08). Este epic especifica **solo el catálogo de categorías** sobre el que esas dos historias se apoyan: ningún criterio de ellas se repite acá.

## Alcance

**Incluye**

- Registro de una categoría con nombre único y su disponibilidad como clasificación elegible (`RN-CATEG-01`, `RN-CATEG-02`).
- Rechazo del nombre duplicado en el alta, sin crear nada.
- Consulta del catálogo con el nombre de cada categoría, paginación y total (`RN-CTX-02`).
- Edición del nombre de una categoría sin recrearla y sin desasociar sus elementos (`RN-CATEG-02`).
- Rechazo del renombrado a un nombre que ya tiene otra categoría, sin efectos.
- Eliminación de una categoría sin elementos asociados, y prohibición de eliminar una que los tenga sin reasignar ninguno (`RN-CATEG-03`).
- Escritura del catálogo reservada al administrador; consulta abierta a los dos actores (`RN-CATEG-01`, `RN-CTX-05`).

**No incluye**

| Tema | Dónde se especifica |
|------|---------------------|
| Asignar la categoría a un elemento, rechazar una categoría inexistente en el alta de un elemento | Epic 04, `US-ITE-01`; acá solo se exige que la categoría quede **elegible** (`AC-CATEG-01-1`) |
| Filtrar el catálogo de elementos por categoría | Epic 08, `US-CAT-02`; acá solo se exige que el instructor obtenga las categorías con las que filtra (`AC-CATEG-02-3`) |
| Unicidad insensible a mayúsculas, espacios o acentos | `RN-CATEG-02` fija «nombre único» y **no fija la comparación**: se exige el duplicado literal, en el alta (`AC-CATEG-01-2`) y en el renombrado (`AC-CATEG-02-4`) |
| Validaciones del nombre distintas del duplicado: nombre vacío o de solo espacios, longitud máxima, caracteres admitidos | Ninguna regla de §5.9 las fija. La validación de entrada es un invariante técnico y **no tiene criterio en este epic** |
| Campos de la categoría distintos del nombre (descripción, color, ícono, orden) | Ninguna regla los pide; `RN-CATEG-02` habla solo del **nombre** |
| Jerarquías de categorías (categoría padre, subcategoría) | Ninguna regla las menciona |
| Tamaño de página y orden del listado de categorías | `RN-CTX-02` exige que todo listado sea **paginado con su total**, no un tamaño ni un orden (`AC-CATEG-02-5`) |
| Búsqueda del catálogo de categorías | Ninguna regla la pide; `RN-CAT-02` es la búsqueda del catálogo de **elementos** |
| Historial de nombres de una categoría | `RN-CATEG-02` exige que el nombre se pueda editar; no exige conservar los anteriores |
| Reasignar a otra categoría los elementos de una categoría que se quiere eliminar | Ninguna regla fija un destino; `AC-CATEG-03-2` exige que **ningún** elemento cambie de categoría |
| Operaciones masivas (alta, edición o baja de varias categorías a la vez) | Ninguna regla las describe ni dice qué pasa con las que fallan |
| Desactivar o archivar una categoría en lugar de eliminarla | Ninguna regla lo describe |

## Actores y permisos

| Actor | Puede | No puede |
|-------|-------|----------|
| **Administrador** (instructor encargado del almacén) | Registrar categorías, consultar el catálogo con su paginación y total, renombrar una categoría y eliminar una que no tenga elementos asociados | Eliminar una categoría con elementos asociados (`RN-CATEG-03`); reasignar esos elementos a otra categoría |
| **Instructor** (quien dicta la clase) | Consultar las categorías y usarlas para filtrar el catálogo de elementos: la consulta no es escritura | Registrar, renombrar o eliminar categorías: la escritura del catálogo es acción administrativa y responde `403` sin efectos (`RN-CATEG-01`) |

Una petición sin credencial no es un actor: no tiene identidad y recibe `401` (epic 01, `AC-AUTH-05-2`). `RN-CTX-05` fija dos actores y ninguno más, así que no hay un tercer rol que administre el catálogo.

## Reglas de negocio

| ID | Regla | Ejemplo |
|----|-------|---------|
| `RN-CATEG-01` | El administrador es el único que administra las categorías; los instructores solo las consultan, para filtrar el catálogo | Un alta de categoría enviada con sesión de instructor responde `403` sin crear nada |
| `RN-CATEG-02` | Una categoría tiene **nombre único** y se puede **editar** | Registrar una segunda categoría con un nombre ya usado se rechaza; renombrar una categoría conserva los elementos que ya estaban asociados a ella |
| `RN-CATEG-03` | No se puede **eliminar** una categoría que tiene **elementos asociados** | Eliminar una categoría con 3 elementos se rechaza y los 3 siguen clasificados con ella |
| `RN-CTX-02` | Volumen de 1.000 a 1.500 equipos y elementos: **todo listado** es paginado con su total, incluido el catálogo de categorías | El catálogo devuelve una página acotada e informa el total de categorías |
| `RN-CTX-05` | Dos actores y ninguno más: la escritura del catálogo es acción administrativa y el instructor consulta | Un renombrado enviado con sesión de instructor responde `403` y no cambia el nombre |

`RN-CATEG-01` a `RN-CATEG-03` viven en §5.9 de `00-contexto-negocio.md`; `RN-CTX-02` está en §1 y `RN-CTX-05` en §2. Acá se leen y se citan: ningún criterio agrega condiciones que la regla no diga.

`RN-CATEG-01` dice que el instructor **consulta para filtrar**, no que no pueda **leer** categorías: por eso `US-CATEG-02` tiene los dos actores y `AC-CATEG-01-3` prohíbe solo la escritura.

## Historias de usuario

Los criterios nombran la clase de actor y de estado —«un administrador con sesión iniciada», «un catálogo con dos categorías registradas», «una categoría con elementos asociados»—. Los nombres concretos de las categorías, los elementos, los correos y los conteos con los que se ejecutan los escenarios están en el `Anexo — Datos de prueba`, al final del documento, y son ejemplos, no requisitos.

### US-CATEG-01 — Registrar una categoría

**Como** administrador del almacén **quiero** registrar las categorías del catálogo con un nombre único **para** poder clasificar cada elemento y que el instructor pueda filtrar el catálogo por categoría.

**Prioridad:** alta — sin categorías registradas no se puede registrar un elemento (`US-ITE-01`) ni filtrar el catálogo (`US-CAT-02`); `RN-CATEG-01` y `RN-CATEG-02`.
**Estado:** especificada — no ejecutada.

La unicidad de `RN-CATEG-02` se cumple solo si el duplicado **no se crea**, así que los criterios exigen el rechazo y la ausencia de efectos. Ninguna regla fija cómo se valida el nombre ni qué código acompaña un rechazo: se exige el efecto observable.

#### AC-CATEG-01-1 — Una categoría registrada con nombre único queda disponible para clasificar elementos

**Dado** un catálogo de categorías que no incluye ninguna categoría con el nombre indicado.
**Y** un administrador con sesión iniciada.
**Cuando** registra una categoría con ese nombre.
**Entonces**:

- la operación se acepta;
- la categoría aparece en el catálogo de categorías con el nombre indicado;
- esa categoría se puede elegir al registrar un elemento.

`Origen: RN-CATEG-01, RN-CATEG-02`

`RN-CATEG-02` fija el nombre único como condición del alta y `RN-CATEG-01` la reserva al administrador. El criterio exige las dos mitades del efecto: la categoría queda en el catálogo **y** es elegible, que es lo que consume `US-ITE-01`. Cómo se identifica la categoría por dentro y la forma de la petición son decisión de implementación.

#### AC-CATEG-01-2 — Un nombre duplicado se rechaza sin crear nada

**Dado** un catálogo de categorías que ya incluye una categoría con el nombre indicado.
**Y** un administrador con sesión iniciada.
**Cuando** intenta registrar otra categoría con ese mismo nombre.
**Entonces**:

- la operación se rechaza;
- no se crea ninguna categoría;
- el número de categorías del catálogo no cambia;
- la categoría existente con ese nombre sigue igual.

`Origen: RN-CATEG-02`

Una regla de unicidad se cumple solo si el segundo registro con el mismo nombre **no se crea**: el criterio exige el rechazo y la ausencia de efectos, porque un rechazo que igual dejara una categoría duplicada estaría contradiciendo la regla que lo motiva. Se verifica el duplicado literal; qué código acompaña el rechazo no lo fija ninguna regla.

#### AC-CATEG-01-3 — El instructor no puede registrar categorías

**Dado** un instructor con sesión iniciada.
**Y** un catálogo de categorías con un número conocido de categorías.
**Cuando** envía la petición de registrar una categoría con un nombre que el catálogo no tiene.
**Entonces**:

- la respuesta es `403`;
- no se crea ninguna categoría;
- el número de categorías del catálogo no cambia.

`Origen: RN-CATEG-01`

`RN-CATEG-01` reparte los actores sin ambigüedad: solo el administrador administra las categorías. El criterio exige el rechazo **y** la ausencia de efectos, porque un `403` que igual creara la categoría no cumpliría la regla.

### US-CATEG-02 — Consultar y editar categorías

**Como** administrador del almacén **quiero** consultar las categorías y cambiar el nombre de una de ellas **para** mantener el catálogo ordenado y corregir un nombre mal escrito sin perder los elementos ya clasificados con esa categoría.

**Y como** instructor **quiero** consultar las categorías disponibles **para** filtrar el catálogo de elementos por la categoría que me interesa.

**Prioridad:** alta — el instructor necesita la lista para filtrar el catálogo y el administrador necesita corregir un nombre sin recrear la categoría (`RN-CATEG-01`, `RN-CATEG-02`).
**Estado:** especificada — no ejecutada.

La lista que devuelve la consulta tiene que ser la misma que sirve para clasificar y para filtrar; si dijera algo distinto del catálogo real, el filtro del epic 08 mostraría categorías inexistentes o dejaría fuera alguna. **Editar es renombrar, no volver a crear**: si la edición borrara la categoría y creara otra, los elementos ya clasificados perderían la categoría que `US-ITE-01` les exige.

#### AC-CATEG-02-1 — La consulta devuelve las categorías registradas y son las elegibles

**Dado** un catálogo con dos categorías registradas.
**Y** un usuario con sesión iniciada.
**Cuando** el usuario consulta las categorías.
**Entonces**:

- la respuesta es `200`;
- la consulta devuelve las dos categorías con su nombre;
- las categorías devueltas son las que se pueden elegir al registrar un elemento.

`Origen: RN-CATEG-01`

La categoría se identifica por su **nombre**, y la consulta tiene que devolver exactamente las categorías que después se pueden **elegir**. La forma y el orden de la respuesta no los fija ninguna regla; la paginación sí (`AC-CATEG-02-5`). «Un usuario» incluye a los dos actores: la consulta no es escritura y el `403` de `AC-CATEG-01-3` no aplica acá.

#### AC-CATEG-02-2 — El administrador edita el nombre y el cambio se refleja sin perder los elementos

**Dado** un catálogo con una categoría asociada a 2 elementos.
**Y** un administrador con sesión iniciada.
**Cuando** cambia el nombre de esa categoría a uno que el catálogo no tiene.
**Entonces**:

- la operación se acepta;
- la consulta de categorías devuelve esa categoría con el nombre nuevo;
- el nombre anterior ya no aparece en el catálogo;
- los 2 elementos siguen asociados a esa misma categoría.

`Origen: RN-CATEG-02`

El criterio exige el efecto completo y no solo el cambio de texto: el nombre nuevo aparece, el viejo desaparece **y los elementos conservan su categoría**, porque editar es renombrar la misma categoría, no dar de baja una y crear otra. Si los elementos quedaran sin categoría, se rompería `US-ITE-01` como efecto lateral de una edición de nombre.

#### AC-CATEG-02-3 — El instructor consulta las categorías para filtrar el catálogo y no las modifica

**Dado** un instructor con sesión iniciada.
**Y** un catálogo con dos categorías registradas.
**Cuando** consulta las categorías para filtrar el catálogo.
**Entonces**:

- la respuesta es `200`;
- el instructor obtiene las dos categorías;
- esas son las categorías con las que puede filtrar el catálogo de elementos.

**Y cuando** envía la petición de cambiar el nombre de una de esas categorías.
**Entonces**:

- la respuesta es `403`;
- esa categoría sigue en el catálogo con el mismo nombre.

`Origen: RN-CATEG-01`

La frontera es exactamente esa: **leer sí, escribir no**. El primer escenario exige que la consulta funcione para el instructor y devuelva las mismas categorías con las que el catálogo se filtra; el segundo, que no pueda escribir. La correspondencia se verifica como igualdad de conjuntos; el comportamiento del filtro pertenece a `US-CAT-02` del epic 08.

#### AC-CATEG-02-4 — Renombrar una categoría a un nombre ya usado se rechaza y nada cambia

**Dado** un catálogo con dos categorías, la primera asociada a 2 elementos.
**Y** un administrador con sesión iniciada.
**Cuando** intenta cambiar el nombre de la segunda categoría por el nombre de la primera.
**Entonces**:

- la operación se rechaza;
- la categoría editada sigue en el catálogo con su nombre;
- la categoría que ya tenía ese nombre sigue en el catálogo con su nombre y sus 2 elementos;
- el número de categorías del catálogo no cambia.

`Origen: RN-CATEG-02`

La unicidad no depende de si el nombre entra por un alta o por una edición: si el renombrado se aceptara, el catálogo quedaría con dos categorías llamadas igual. El criterio exige el rechazo **sin efectos** en las tres direcciones —la categoría editada conserva su nombre, la otra queda intacta con sus elementos y el número de categorías no cambia—, porque un rechazo que renombrara o fusionara estaría contradiciendo la regla que lo motiva. Se verifica el duplicado literal.

#### AC-CATEG-02-5 — El listado de categorías es paginado y devuelve el total

**Dado** un catálogo con más categorías registradas que el tamaño de página de la consulta.
**Y** un usuario con sesión iniciada.
**Cuando** consulta la primera página de categorías.
**Entonces**:

- la respuesta es `200`;
- la consulta devuelve como máximo el tamaño de página de categorías;
- la consulta informa el total de categorías del catálogo.

`Origen: RN-CTX-02`

`RN-CTX-02` fija que todo listado es paginado y devuelve su total, y el catálogo de categorías es un listado. El criterio exige el **efecto** —una página acotada y el **total** informado— y no fija el tamaño de página, que ninguna regla determina.

### US-CATEG-03 — Eliminar una categoría

**Como** administrador del almacén **quiero** eliminar una categoría del catálogo y que el sistema no me deje eliminar una que tiene elementos asociados **para** mantener limpio el catálogo sin dejar elementos sin la categoría con la que se clasifican.

**Prioridad:** media — protege la clasificación de `US-ITE-01`: borrar una categoría en uso deja elementos sin la agrupación que la regla les exige.
**Estado:** especificada — no ejecutada.

`RN-CATEG-03` fija el límite: no se elimina una categoría con elementos asociados. La regla no describe **qué hacer** con esos elementos —no fija una reasignación a otra categoría—, así que el rechazo es la única respuesta que no destruye el dato y el criterio exige además que ningún elemento cambie de categoría.

#### AC-CATEG-03-1 — Se elimina una categoría sin elementos asociados

**Dado** un catálogo con una categoría que no tiene elementos asociados y al menos otra categoría.
**Y** un administrador con sesión iniciada.
**Cuando** elimina la categoría sin elementos.
**Entonces**:

- la operación se acepta;
- esa categoría ya no aparece en el catálogo de categorías;
- las demás categorías siguen en el catálogo.

`Origen: RN-CATEG-03`

`RN-CATEG-03` prohíbe eliminar una categoría **con elementos asociados**, y el criterio exige el efecto observable del caso contrario: la baja se acepta y **las demás categorías no se tocan**, para que la eliminación no se confunda con un vaciado del catálogo. Si la baja es física o deja la categoría inactiva es decisión de implementación; el efecto exigido es que no se pueda elegir, listar ni clasificar con ella.

#### AC-CATEG-03-2 — Se rechaza eliminar una categoría con elementos asociados y ningún elemento cambia de categoría

**Dado** un catálogo con una categoría asociada a 3 elementos.
**Y** un administrador con sesión iniciada.
**Cuando** intenta eliminar esa categoría.
**Entonces**:

- la operación se rechaza;
- la categoría sigue en el catálogo de categorías;
- los 3 elementos siguen asociados a esa categoría;
- ningún elemento cambia de categoría.

`Origen: RN-CATEG-03`

El criterio exige el rechazo **sin efectos** en las dos direcciones: la categoría sigue existiendo y los elementos siguen clasificados con **ella**, no reasignados a otra. La segunda mitad es parte del criterio: un rechazo que moviera los elementos habría cumplido la letra —la categoría sobrevive— y habría violado el propósito, que es no perder la clasificación declarada. Qué código acompaña el rechazo no lo fija ninguna regla.

## Errores y mensajes

| Situación | HTTP | Código | Mensaje |
|-----------|------|--------|---------|
| Registro de una categoría con un nombre ya registrado | No lo fija ninguna regla | No lo fija ninguna regla | No lo fija ninguna regla; sin categoría creada y sin cambio en el número de categorías |
| Registro de una categoría con sesión de instructor | `403` | No lo fija ninguna regla (el epic 01 usa `FORBIDDEN`) | No lo fija ninguna regla; sin efectos |
| Renombrado de una categoría a un nombre que ya tiene otra | No lo fija ninguna regla | No lo fija ninguna regla | No lo fija ninguna regla; las dos categorías quedan como estaban |
| Renombrado con sesión de instructor | `403` | No lo fija ninguna regla (el epic 01 usa `FORBIDDEN`) | No lo fija ninguna regla; el nombre no cambia |
| Eliminación de una categoría con elementos asociados | No lo fija ninguna regla | No lo fija ninguna regla | No lo fija ninguna regla; la categoría y sus elementos quedan como estaban |
| Operación de escritura del catálogo sin credencial | `401` | No lo fija ninguna regla (epic 01, `AC-AUTH-05-2`) | No lo fija ninguna regla; sin efectos sobre datos |

Ninguna regla de este epic fija un mensaje literal: lo exigido es el rechazo y su ausencia de efectos.

## Sesión y seguridad

| Efecto | Regla | Dónde se verifica |
|--------|-------|-------------------|
| Escribir el catálogo —registrar, renombrar y eliminar— exige sesión con rol de administrador | `RN-CATEG-01`, `RN-CTX-05` | `AC-CATEG-01-3`, `AC-CATEG-02-3` |
| La escritura con sesión de instructor responde `403` sin efectos | `RN-CATEG-01` | `AC-CATEG-01-3`, `AC-CATEG-02-3` |
| Una operación de escritura sin credencial no es una operación de ningún actor: recibe `401` | Epic 01 (`AC-AUTH-05-2`) | — |
| Consultar las categorías no es escritura: el instructor conserva la lectura para filtrar | `RN-CATEG-01` | `AC-CATEG-02-1`, `AC-CATEG-02-3` |
| No hay un tercer rol que administre el catálogo | `RN-CTX-05` | `AC-CATEG-01-3` |

Ninguna regla de este epic fija plazos de sesión ni efectos del catálogo sobre las credenciales: registrar, renombrar o eliminar una categoría no cierra sesiones. El contrato de sesión es del epic 01.

## Decisiones tomadas

| Decisión | Regla | Responde a |
|----------|-------|------------|
| El administrador administra las categorías y el instructor las consulta para filtrar; leer sí, escribir no | `RN-CATEG-01`, `RN-CTX-05` | — |
| La categoría se identifica por su **nombre**, y el nombre es único en el alta y en el renombrado | `RN-CATEG-02` | — |
| Se verifica el duplicado **literal**: la comparación insensible a mayúsculas, espacios o acentos no está fijada por ninguna regla | `RN-CATEG-02` | — |
| Renombrar una categoría **no la recrea**: los elementos ya clasificados conservan su categoría | `RN-CATEG-02` | — |
| No se elimina una categoría con elementos asociados, y un rechazo no reasigna ningún elemento | `RN-CATEG-03` | — |
| La baja de una categoría **sin** elementos se acepta como lectura por omisión de la prohibición de `RN-CATEG-03`; la regla no afirma ese caso con una frase propia | `RN-CATEG-03` | — |
| El catálogo de categorías es paginado con su total, como todo listado | `RN-CTX-02` | — |
| La **asignación** de la categoría a un elemento pertenece al epic 04 (`US-ITE-01`) y el **filtro** al epic 08 (`US-CAT-02`); este catálogo solo los abastece | `RN-CATEG-01` | — |
| Una categoría tiene nombre y nada más: no se especifican descripción, color, ícono, orden ni jerarquías | `RN-CATEG-02` | — |

Sin decisión todavía: los campos de la categoría distintos del nombre, la comparación del nombre más allá del duplicado literal, las validaciones del nombre distintas del duplicado, el tamaño de página y el orden del listado, la búsqueda, las operaciones masivas y desactivar o archivar en lugar de eliminar. Ninguna regla los fija y ningún criterio los exige.

## Trazabilidad y estado

Un criterio se marca `OK` o `GAP` **solo** cuando su test corre, nunca por lectura del código. Este epic está **especificado y no ejecutado**: los 10 criterios están sin estado y ninguno es `OK`, `GAP` ni `FALTA` hoy.

| Criterio | Regla | Estado hoy |
|----------|-------|------------|
| `AC-CATEG-01-1` | `RN-CATEG-01`, `RN-CATEG-02` | Sin ejecutar |
| `AC-CATEG-01-2` | `RN-CATEG-02` | Sin ejecutar |
| `AC-CATEG-01-3` | `RN-CATEG-01` | Sin ejecutar |
| `AC-CATEG-02-1` | `RN-CATEG-01` | Sin ejecutar |
| `AC-CATEG-02-2` | `RN-CATEG-02` | Sin ejecutar |
| `AC-CATEG-02-3` | `RN-CATEG-01` | Sin ejecutar |
| `AC-CATEG-02-4` | `RN-CATEG-02` | Sin ejecutar |
| `AC-CATEG-02-5` | `RN-CTX-02` | Sin ejecutar |
| `AC-CATEG-03-1` | `RN-CATEG-03` | Sin ejecutar |
| `AC-CATEG-03-2` | `RN-CATEG-03` | Sin ejecutar |

| US | ACs | Implementables (`RN`) | `Estándar` | `Derivada` | `OPEN` |
|----|-----|-----------------------|------------|------------|--------|
| `US-CATEG-01` | 3 | 3 | 0 | 0 | 0 |
| `US-CATEG-02` | 5 | 5 | 0 | 0 | 0 |
| `US-CATEG-03` | 2 | 2 | 0 | 0 | 0 |
| **Total** | **10** | **10** | **0** | **0** | **0** |

Totales: **3 historias y 10 criterios**, todos sin ejecutar. Los 10 se apoyan en una regla de negocio confirmada: `RN-CATEG-01` ×4, `RN-CATEG-02` ×4, `RN-CATEG-03` ×2 y `RN-CTX-02` ×1 — **11 citas** para **10 criterios**, porque `AC-CATEG-01-1` cita dos reglas. Ninguno es `Derivada` ni `OPEN`.

## Anexo — Datos de prueba

Los valores de esta tabla son **ejemplos**: no son requisitos y QA elige los suyos. Los criterios fijan la clase de actor, la de estado y los límites de la regla; estos datos solo registran con qué se ejecutan las pruebas del módulo.

| Dato | Valor usado |
|------|-------------|
| Administrador del seed | `admin@sena.edu.co` / `AdminSENA2024` |
| Instructor del seed usado en `AC-CATEG-01-3`, `AC-CATEG-02-1`, `AC-CATEG-02-3` y `AC-CATEG-02-5` | `cmendoza@sena.edu.co` / `Instructor2024` |
| Nombre registrado en `AC-CATEG-01-1` | «Herramientas de taller», ausente del catálogo de partida |
| Nombre duplicado de `AC-CATEG-01-2` | «Herramientas de taller», ya registrado |
| Catálogo de `AC-CATEG-02-1` y `AC-CATEG-02-3` | «Herramientas de taller» y «Equipos de cómputo» |
| Categoría de `AC-CATEG-02-2` | «Herramientas», asociada a 2 elementos; nombre nuevo «Herramientas de taller», ausente del catálogo |
| Categorías de `AC-CATEG-02-4` | «Equipos de cómputo», sin elementos, renombrada al nombre de «Herramientas de taller», que ya existe con sus 2 elementos |
| Catálogo de `AC-CATEG-02-5` | más categorías registradas que el tamaño de página de la consulta |
| Categoría de `AC-CATEG-03-1` | «Herramientas de taller», sin elementos asociados, con al menos otra categoría en el catálogo |
| Categoría de `AC-CATEG-03-2` | «Herramientas de taller», asociada a 3 elementos |
| Elemento de `AC-CATEG-01-1` | un elemento por registrar, para comprobar que la categoría recién creada es elegible al clasificarlo |

Los usuarios salen del seed del proyecto (`AGENTS.md` §4). Los elementos son datos del epic 04: acá solo se leen para comprobar la elegibilidad de la categoría en el alta, que la edición del nombre no los desasocia y que el rechazo de la baja no los reasigna.
