# Epic 03 — Ambientes

El catálogo de ambientes de destino: registrar un ambiente, consultarlo con el número de unidades que hay en cada uno, renombrarlo y no poder eliminar uno en uso ni el inventario base.

## Resumen

Este módulo resuelve el **catálogo de ambientes de destino**: registrar un ambiente con su nombre, consultar los ambientes registrados junto con el número de unidades que hay en cada uno, corregir el nombre de uno ya registrado e impedir que se elimine un ambiente con unidades ubicadas o el que sirve de inventario base.

El ambiente **no es un segundo almacén**: el inventario es uno solo (`RN-CTX-03`) y el catálogo existe por **trazabilidad de destino** (`RN-CTX-04`), para que el sistema pueda decir dónde está un equipo que se quedó más de un mes en otro ambiente (`RN-CTX-07`). Lo escribe el administrador; el instructor lo consulta (`RN-CTX-05`).

Si el módulo falla, el administrador no puede nombrar el destino donde quedó un equipo, no puede saber qué se fue a cada ambiente, o borra un ambiente y deja unidades con una ubicación ilegible. Estado hoy: **4 historias y 10 criterios ejecutados y en `OK`** en la rama `devJoseph-ambientes`: cada criterio tiene test con su id en `server/tests/integration/environment.test.js` y la suite pasa. La revisión independiente de quien implementó queda pendiente en el PR.

> **Frontera con el epic 05.** La **ubicación de una unidad** —que toda unidad tenga una, que el administrador pueda cambiarla y consultarla, y qué unidades hay en un ambiente— es `US-INV-11` del epic 05. Este epic especifica **solo el catálogo de ambientes** sobre el que esa ubicación se apoya: ningún criterio de `US-INV-11` se repite acá.

## Alcance

**Incluye**

- Registro de un ambiente de destino con su nombre, y su disponibilidad como ubicación elegible (`RN-CTX-04`).
- Rechazo del nombre vacío o de solo espacios, sin crear nada.
- Consulta del catálogo con el nombre de cada ambiente, el número de unidades ubicadas en él y paginación con total (`RN-CTX-07`, `RN-CTX-10`, `RN-CTX-02`).
- Edición del nombre de un ambiente, con la unicidad del nombre y sin reubicar sus unidades (`RN-CTX-11`).
- Prohibición de eliminar un ambiente con unidades ubicadas y de eliminar el ambiente que es el inventario base (`RN-CTX-09`, `RN-CTX-03`, `RN-CTX-08`).
- Escritura del catálogo reservada al administrador (`RN-CTX-05`).

**No incluye**

| Tema | Dónde se especifica |
|------|---------------------|
| Asignar, cambiar y consultar la **ubicación de una unidad**, y qué unidades hay en un ambiente | Epic 05, `US-INV-11` (`RN-CTX-07`, `AC-INV-11-4`); acá solo se exige que el ambiente quede **elegible** como ubicación y se informa su **cantidad** de unidades |
| Historial de ubicaciones (dónde estuvo antes una unidad) | Ninguna regla lo fija: `RN-CTX-07` exige la ubicación **actual** |
| Traslado masivo de unidades a un ambiente | Ninguna regla describe mover un conjunto de unidades en una sola operación; `US-INV-11` especifica el cambio de una unidad |
| Jerarquías de ubicación, sedes, sub-ambientes o inventarios paralelos | Excluidos por `RN-CTX-03`: el inventario es uno solo y el modelo `Environment` no representa sedes |
| Campos del ambiente distintos del nombre (capacidad, responsable, código, dirección) | Ninguna regla los pide; `RN-CTX-07` expresa la ubicación con el **nombre** del ambiente |
| Validaciones del nombre distintas del vacío y de la unicidad (longitud máxima, caracteres admitidos) | Ninguna regla las fija |
| Búsqueda y filtros del catálogo de ambientes | Ninguna regla los pide; `RN-CAT-02` es la búsqueda del catálogo de **elementos**. `RN-CTX-02` solo exige la paginación |
| Desactivar o archivar un ambiente en lugar de eliminarlo | Ninguna regla lo describe |
| Conteo de consumibles por ambiente | Un consumible no tiene unidades (`RN-INV-06`), así que no hay unidad a la que asignar un ambiente |
| Historial de cambios del nombre de un ambiente | Ninguna regla pide conservar los nombres anteriores |

## Actores y permisos

| Actor | Puede | No puede |
|-------|-------|----------|
| **Administrador** (instructor encargado del almacén) | Registrar ambientes, consultar el catálogo con el conteo por ambiente y renombrar un ambiente | Eliminar un ambiente con unidades ubicadas ni el ambiente que es el inventario base (`RN-CTX-09`); crear sedes o inventarios paralelos (`RN-CTX-03`) |
| **Instructor** (quien dicta la clase) | Consultar los ambientes y el número de unidades de cada uno: la consulta no es escritura | Registrar, renombrar o eliminar ambientes: la escritura del catálogo es acción administrativa y responde `403` sin efectos (`RN-CTX-05`) |

Una petición sin credencial no es un actor: no tiene identidad y recibe `401` (epic 01, `AC-AUTH-05-2`). No hay un tercer rol (`RN-CTX-06`): el administrador **es** un instructor y nadie más administra ambientes.

## Reglas de negocio

| ID | Regla | Ejemplo |
|----|-------|---------|
| `RN-CTX-03` | Existe un único inventario, el del Ambiente 104, y `Environment` no representa sedes ni inventarios paralelos | Registrar el «Ambiente 205» añade un destino de equipo, no una segunda bodega con su propio inventario |
| `RN-CTX-04` | `Environment` existe por trazabilidad de destino: interesa saber dónde está el equipo que se fue a otro ambiente | Un equipo prestado que lleva dos meses en el «Ambiente 205» sigue teniendo un destino nombrable en el sistema |
| `RN-CTX-07` | El sistema registra dónde está cada unidad, con la ubicación actual o el nombre del ambiente donde se encuentra | La ficha de una unidad dice «Ambiente 205» y no «prestada a un instructor» |
| `RN-CTX-08` | Toda unidad tiene ubicación obligatoria; la de una unidad nueva es el Ambiente 104 y se actualiza al llevarla a otro ambiente | Una unidad recién registrada aparece en el Ambiente 104; ninguna queda sin ubicación |
| `RN-CTX-09` | No se puede eliminar un ambiente que tiene unidades ubicadas, ni el Ambiente 104 | Borrar el «Ambiente 205» con 2 unidades allí se rechaza, y borrar el Ambiente 104 también |
| `RN-CTX-10` | Se puede consultar por ambiente: cuántas unidades hay en él y cuáles son | El catálogo informa 3 unidades en el Ambiente 104 y 2 en el «Ambiente 205» |
| `RN-CTX-11` | Un ambiente puede renombrarse y su nombre es único; renombrarlo no reubica sus unidades | Renombrar el «Ambiente 205» a «Ambiente 206» deja sus 2 unidades en el mismo ambiente, con la etiqueta nueva |
| `RN-CTX-02` | Volumen operativo de 1.000 a 1.500 equipos y elementos: todo listado es paginado con su total, incluido el catálogo de ambientes | El catálogo devuelve una página acotada con el total y el número de páginas |
| `RN-CTX-05` | Dos actores y ninguno más: la escritura del catálogo es acción administrativa y el instructor consulta | Un alta de ambiente enviada con sesión de instructor responde `403` sin efectos |
| `RN-CTX-06` | El modelo de un solo rol (`ADMIN` / `INSTRUCTOR`) es suficiente y el administrador no crea solicitudes | No hay un tercer rol que pudiera administrar el catálogo en su lugar |
| `Estándar` (invariantes técnicos) | Validación de entrada del nombre, permiso de escritura y coherencia entre el ambiente elegible y el que informa el conteo | Un ambiente sin nombre no se crea; un ambiente listado es un ambiente asignable |

`RN-CTX-02` a `RN-CTX-11` viven en §1 y §2 de `00-contexto-negocio.md`. Acá se leen y se citan: ningún criterio agrega condiciones que la regla no diga. `RN-CTX-09`, `RN-CTX-10` y `RN-CTX-11` son las tres que amplían el catálogo más allá del alta y la consulta.

## Historias de usuario

Los criterios nombran la clase de actor y de estado —«un administrador con sesión iniciada», «un catálogo con dos ambientes registrados», «el ambiente que es la ubicación de inventario»—. Los nombres concretos de los ambientes, los correos y los conteos con los que se ejecutan los escenarios están en el `Anexo — Datos de prueba`, al final del documento, y son ejemplos, no requisitos.

### US-AMB-01 — Registrar un ambiente de destino

**Como** administrador del almacén **quiero** registrar los ambientes de destino con su nombre **para** poder indicar después a qué ambiente se fue un equipo que puede quedarse allí más de un mes.

**Prioridad:** alta — sin ambientes registrados no hay destino que asignar y la trazabilidad de ubicación no se puede usar (`RN-CTX-04`).
**Estado:** especificada — no ejecutada.

Registrar un ambiente es registrar un **destino**, no una segunda bodega (`RN-CTX-03`). La escritura la ejerce solo el administrador (`RN-CTX-05`, `RN-CTX-06`) y ninguna regla fija cómo se valida el nombre ni qué código acompaña un rechazo: los criterios exigen el efecto observable.

#### AC-AMB-01-1 — Un ambiente registrado con su nombre queda disponible como ubicación

**Dado** un catálogo de ambientes que no incluye un ambiente con el nombre indicado.
**Cuando** un administrador con sesión iniciada registra un ambiente con ese nombre.
**Entonces**:

- la operación se acepta;
- el ambiente aparece en el catálogo de ambientes con el nombre indicado;
- ese ambiente se puede elegir como ubicación de una unidad.

`RN-CTX-04` dice para qué existe el registro: el ambiente es el **destino** del equipo, y un destino sirve solo si después se puede elegir al anotar dónde está una unidad. El criterio no fija cómo se identifica el ambiente por dentro ni la forma de la petición; la asignación de la ubicación es `US-INV-11` del epic 05.

#### AC-AMB-01-2 — Un nombre vacío o de solo espacios se rechaza sin crear nada

**Dado** un catálogo de ambientes con un número conocido de ambientes y un administrador con sesión iniciada.
**Cuando** el administrador intenta registrar un ambiente con un nombre vacío o formado solo por espacios.
**Entonces** cada escenario se comporta así:

| Escenario | Entrada | Resultado esperado |
|-----------|---------|--------------------|
| Nombre vacío | registro con el nombre vacío | rechazo, ningún ambiente creado y el número de ambientes del catálogo no cambia |
| Nombre de solo espacios | registro con un nombre formado solo por espacios | rechazo, ningún ambiente creado y el número de ambientes del catálogo no cambia |

Los dos escenarios son el mismo criterio y se verifican en el mismo test: un ambiente sin nombre destruye justamente el dato que `RN-CTX-07` necesita, porque la ubicación se expresa con el **nombre** del ambiente. El rechazo tiene que dejar **cero** ambientes creados; qué código lo acompaña no lo fija ninguna regla.

#### AC-AMB-01-3 — Un instructor no puede registrar ambientes

**Dado** un instructor con sesión iniciada y un catálogo de ambientes con un número conocido de ambientes.
**Cuando** envía la petición de registrar un ambiente.
**Entonces**:

- la respuesta es `403`;
- no se crea ningún ambiente;
- el número de ambientes del catálogo no cambia.

`RN-CTX-05` deja el rechazo en el rol: el instructor solicita, recoge y devuelve, y administrar el catálogo es acción administrativa. Un `403` que igual creara el ambiente no cumpliría la regla, así que el criterio exige el rechazo **y** la ausencia de efectos.

### US-AMB-02 — Consultar los ambientes y cuántas unidades hay en cada uno

**Como** administrador del almacén **quiero** consultar los ambientes registrados y cuántas unidades hay en cada uno **para** saber a dónde se fueron los equipos que salieron hace más de un mes, sin depender de mi memoria ni de buscarlos uno por uno.

**Prioridad:** alta — la trazabilidad de destino no sirve si no se puede leer qué ambientes existen y qué hay en ellos (`RN-CTX-04`).
**Estado:** especificada — no ejecutada.

El olvido que atacan `RN-CTX-04` y `RN-CTX-07` tiene dos formas: no saber qué destinos existen y saber el destino pero no cuánto hay allí. `RN-CTX-10` confirma la consulta **inversa** por ambiente, así que el conteo no es una inferencia. Los dos actores consultan: `RN-CTX-05` no le quita la lectura al instructor, y el `403` de `AC-AMB-01-3` no aplica acá porque consultar no es escribir. **Qué unidades** hay en un ambiente es `AC-INV-11-4` del epic 05; acá se informa la **cantidad**.

#### AC-AMB-02-1 — La consulta devuelve los ambientes con su nombre y son los elegibles

**Dado** un catálogo con dos ambientes registrados y un usuario con sesión iniciada.
**Cuando** el usuario consulta los ambientes.
**Entonces**:

- la respuesta es `200`;
- la consulta devuelve los dos ambientes con su nombre;
- los ambientes devueltos son los que se pueden elegir como ubicación de una unidad.

El destino de `RN-CTX-04` se identifica por su nombre, y la consulta tiene que devolver exactamente los ambientes que después se pueden **elegir**: si listara ambientes que no se pueden asignar, o dejara fuera alguno que sí, la lista no describiría lo que el sistema acepta. La paginación de esa misma consulta es `AC-AMB-02-3`.

#### AC-AMB-02-2 — Se informa cuántas unidades hay en cada ambiente

**Dado** un catálogo con dos ambientes registrados.
**Y** 3 unidades cuya ubicación actual es el primero de los ambientes.
**Y** 2 unidades cuya ubicación actual es el segundo.
**Y** ninguna otra unidad registrada.
**Cuando** el usuario consulta los ambientes.
**Entonces**:

- la consulta informa 3 unidades en el primer ambiente;
- la consulta informa 2 unidades en el segundo ambiente.

`RN-CTX-10` confirma que se puede consultar **por ambiente**, así que el criterio exige la cifra por ambiente y no un total: un total no distingue «2 aquí» de «2 allá», que son situaciones distintas para el administrador. La consulta no crea ni modifica ubicaciones; solo cuenta lo que `US-INV-11` ya registró. Qué unidades concretas son y en qué orden salen no lo fija este criterio.

#### AC-AMB-02-3 — La consulta de ambientes es paginada

**Dado** un catálogo con más ambientes registrados que el tamaño de página de la consulta y un administrador con sesión iniciada.
**Cuando** el administrador consulta la primera página de ambientes.
**Entonces**:

- la respuesta es `200`;
- la consulta devuelve como máximo el tamaño de página de ambientes;
- la consulta informa el total de ambientes registrados;
- la consulta informa el número de páginas.

`RN-CTX-02` exige que **todo listado** sea paginado con su total, incluido el catálogo de ambientes, y fija el volumen de 1.000 a 1.500 equipos y elementos: en ese volumen la paginación es un **bloqueo funcional**, no un detalle cosmético. El criterio no fija el tamaño de página ni la forma de la respuesta.

### US-AMB-03 — Impedir la eliminación de un ambiente en uso

**Como** administrador del almacén **quiero** que el sistema no me deje eliminar un ambiente que tiene equipos ubicados en él ni el ambiente del que parte todo el inventario **para** no perder el registro de dónde están los equipos, ni el punto de partida de las unidades nuevas, por un borrado accidental.

**Prioridad:** media — protege la trazabilidad de `RN-CTX-07`: borrar un ambiente en uso destruye el dato de dónde está un equipo.
**Estado:** especificada — no ejecutada.

Si el ambiente desaparece mientras hay unidades ubicadas allí, la unidad queda sin destino legible y ninguna regla dice a dónde iría: el rechazo es la única respuesta que no destruye el dato. La segunda prohibición no se infiere de la primera, la fija `RN-CTX-09`: el ambiente que es el inventario base tampoco se elimina, porque de él parte toda unidad nueva (`RN-CTX-08`) y el inventario es uno solo (`RN-CTX-03`). Los dos rechazos tienen que ser **sin efectos**, ni sobre el ambiente ni sobre las unidades.

#### AC-AMB-03-1 — No se puede eliminar un ambiente con unidades ubicadas en él

**Dado** un ambiente registrado y 2 unidades cuya ubicación actual es ese ambiente.
**Cuando** un administrador con sesión iniciada intenta eliminar ese ambiente.
**Entonces**:

- la operación se rechaza;
- el ambiente sigue en el catálogo de ambientes;
- las 2 unidades siguen con ese ambiente como ubicación actual;
- ninguna unidad cambia de ubicación.

`RN-CTX-09` lo fija como regla propia, y la protege `RN-CTX-07`: si la ubicación se expresa con el nombre del ambiente, borrarlo deja unidades con una ubicación que ya no se puede leer. Que el rechazo no reubique unidades también es parte del criterio: un rechazo que las moviera a otro ambiente estaría inventando un destino que ninguna regla fija.

#### AC-AMB-03-2 — No se puede eliminar el ambiente que es el inventario base

**Dado** el ambiente que es la ubicación de inventario y el destino por defecto de toda unidad nueva.
**Cuando** un administrador con sesión iniciada intenta eliminar ese ambiente.
**Entonces**:

- la operación se rechaza;
- el ambiente sigue en el catálogo de ambientes;
- una unidad registrada después del intento sigue teniendo ese ambiente como ubicación actual.

`RN-CTX-09` lo confirma **directamente**. La regla se apoya en `RN-CTX-03` —existe una única ubicación de inventario— y en `RN-CTX-08`, que fija ese ambiente como la ubicación de una unidad nueva: si se pudiera eliminar, toda unidad nueva quedaría sin punto de partida y la ubicación obligatoria dejaría de cumplirse.

### US-AMB-04 — Editar el nombre de un ambiente

**Como** administrador del almacén **quiero** corregir el nombre de un ambiente que ya registré **para** que las unidades ubicadas allí se lean con el nombre correcto y no con el error que quedó al registrarlo.

**Prioridad:** media — la ubicación de una unidad se expresa con el **nombre** del ambiente, así que un nombre mal escrito deja unidades ubicadas en un destino ilegible (`RN-CTX-07`).
**Estado:** especificada — no ejecutada.

Un ambiente se registra una vez y se nombra muchas. Corregir un dígito equivocado no puede obligar a borrar el ambiente y volver a ubicar sus unidades, que es justamente lo que `RN-CTX-09` prohíbe cuando hay unidades allí. La edición no crea un dato ni reubica nada: el ambiente sigue siendo el mismo destino y solo cambia su etiqueta (`RN-CTX-11`). La unicidad del nombre también es `RN-CTX-11`: con dos ambientes del mismo nombre, la ubicación dejaría de identificar **un** destino.

#### AC-AMB-04-1 — El administrador edita el nombre de un ambiente y el cambio se refleja

**Dado** un catálogo con un ambiente registrado y 2 unidades cuya ubicación actual es ese ambiente.
**Cuando** un administrador con sesión iniciada edita el nombre de ese ambiente a un nombre que el catálogo no tiene.
**Entonces**:

- la operación se acepta;
- la consulta de ambientes devuelve ese ambiente con el nombre nuevo;
- la consulta de ambientes no devuelve ningún ambiente con el nombre anterior;
- las 2 unidades siguen ubicadas en el ambiente editado, ahora con el nombre nuevo.

`RN-CTX-11` exige las dos mitades del renombrado: la consulta devuelve el nombre nuevo y ya no el viejo, y las unidades ubicadas allí **siguen en el mismo ambiente**, porque renombrar **no reubica**. Las 2 unidades del escenario fijan que la corrección no las mueve ni las deja apuntando a un ambiente inexistente. El criterio no fija cómo se identifica el ambiente ni la forma de la petición.

#### AC-AMB-04-2 — Editar el nombre a uno que ya existe se rechaza y nada cambia

**Dado** un catálogo con dos ambientes registrados y un administrador con sesión iniciada.
**Cuando** el administrador intenta renombrar el segundo ambiente con el nombre del primero.
**Entonces**:

- la operación se rechaza;
- el catálogo sigue teniendo los dos ambientes;
- el ambiente editado conserva el nombre que tenía;
- el número de ambientes con el nombre del primero sigue siendo uno;
- el número de ambientes del catálogo no cambia.

`RN-CTX-11` fija que el nombre es **único**, no un invariante que haya que inferir: dos ambientes con el mismo nombre volverían ambigua la respuesta a «dónde está esta unidad» sin ninguna regla que la desambigüe. El criterio exige el rechazo **y** la ausencia de efectos: un rechazo que fusionara o renombrara de todos modos destruiría el destino que `RN-CTX-09` protege. Qué código acompaña el rechazo no lo fija ninguna regla.

## Errores y mensajes

| Situación | HTTP | Código | Mensaje |
|-----------|------|--------|---------|
| Registro de un ambiente con el nombre vacío o de solo espacios | No lo fija ninguna regla | No lo fija ninguna regla | No lo fija ninguna regla; sin ambiente creado |
| Registro de un ambiente con sesión de instructor | `403` | No lo fija ninguna regla (el epic 01 usa `FORBIDDEN`) | No lo fija ninguna regla; sin efectos |
| Eliminación de un ambiente con unidades ubicadas | No lo fija ninguna regla | No lo fija ninguna regla | No lo fija ninguna regla; el ambiente y las unidades quedan como estaban |
| Eliminación del ambiente que es el inventario base | No lo fija ninguna regla | No lo fija ninguna regla | No lo fija ninguna regla; el ambiente sigue en el catálogo |
| Renombrado de un ambiente a un nombre ya registrado | No lo fija ninguna regla | No lo fija ninguna regla | No lo fija ninguna regla; los dos nombres quedan como estaban |
| Operación de escritura del catálogo sin credencial | `401` | No lo fija ninguna regla (epic 01, `AC-AUTH-05-2`) | No lo fija ninguna regla; sin efectos sobre datos |

Ninguna regla de este epic fija un mensaje literal: lo exigido es el rechazo y su ausencia de efectos.

## Sesión y seguridad

| Efecto | Regla | Dónde se verifica |
|--------|-------|-------------------|
| Escribir el catálogo —registrar, renombrar y eliminar— exige sesión con rol de administrador | `RN-CTX-05` | `AC-AMB-01-3` |
| La escritura con sesión de instructor responde `403` sin efectos | `RN-CTX-05` | `AC-AMB-01-3` |
| Una operación de escritura sin credencial no es una operación de ningún actor: recibe `401` | Epic 01 (`AC-AUTH-05-2`) | — |
| Consultar los ambientes no es escritura: el instructor conserva la lectura | `RN-CTX-05` | `AC-AMB-02-1` |
| No hay un tercer rol que administre el catálogo | `RN-CTX-06` | `AC-AMB-01-3` |

Ninguna regla de este epic fija plazos de sesión ni efectos del catálogo sobre las credenciales: registrar o renombrar un ambiente no cierra sesiones. El contrato de sesión es del epic 01.

## Decisiones tomadas

| Decisión | Regla | Responde a |
|----------|-------|------------|
| El catálogo registra **destinos de equipo**, no un segundo almacén ni sedes | `RN-CTX-03` | — |
| El ambiente se identifica por su **nombre**, y el nombre es único | `RN-CTX-11` | — |
| Renombrar un ambiente **no reubica** las unidades que están en él | `RN-CTX-11` | — |
| El catálogo informa el **número de unidades** de cada ambiente | `RN-CTX-10` | — |
| No se elimina un ambiente con unidades ubicadas **ni** el ambiente que es el inventario base | `RN-CTX-09` | — |
| La escritura del catálogo es del administrador; el instructor consulta | `RN-CTX-05`, `RN-CTX-06` | `OPEN-AUTH-06` |
| El catálogo de ambientes es paginado con su total, como todo listado | `RN-CTX-02` | — |
| La **ubicación** de una unidad —asignarla, cambiarla y consultar qué unidades hay en un ambiente— pertenece al epic 05 (`US-INV-11`); este catálogo solo aporta el destino | `RN-CTX-07` | `OPEN-CTX-02` |
| Un ambiente tiene nombre y nada más: no se especifican capacidad, responsable, código ni dirección | `RN-CTX-07` | — |

Sin decisión todavía: los campos del ambiente distintos del nombre, las validaciones del nombre más allá del vacío y de la unicidad, el tamaño de página y el orden del listado, el historial de ubicaciones, la búsqueda y los filtros, desactivar o archivar en lugar de eliminar, y el traslado masivo de unidades. Ninguna regla los fija y ningún criterio los exige.

## Trazabilidad y estado

Un criterio se marca `OK` o `GAP` **solo** cuando su test corre, nunca por lectura del código. Este epic se ejecutó en la rama `devJoseph-ambientes` con `server/tests/integration/environment.test.js`: los 10 criterios tienen test con su id y pasan. La verificación encontró 5 `GAP` reales (nombre en blanco, conteo por ambiente, paginación, protección del ambiente base y unicidad del nombre) que se corrigieron en el mismo encadenado.

| Criterio | Regla | Estado hoy |
|----------|-------|------------|
| `AC-AMB-01-1` | `RN-CTX-04` | `OK` |
| `AC-AMB-01-2` | `Estándar` | `OK` |
| `AC-AMB-01-3` | `RN-CTX-05` | `OK` |
| `AC-AMB-02-1` | `RN-CTX-04` | `OK` |
| `AC-AMB-02-2` | `RN-CTX-10` | `OK` |
| `AC-AMB-02-3` | `RN-CTX-02` | `OK` |
| `AC-AMB-03-1` | `RN-CTX-09` | `OK` |
| `AC-AMB-03-2` | `RN-CTX-09` | `OK` |
| `AC-AMB-04-1` | `RN-CTX-11` | `OK` |
| `AC-AMB-04-2` | `RN-CTX-11` | `OK` |

Totales: **4 historias y 10 criterios**, **10 `OK`** (verificación ejecutada en Linux; la revisión independiente del código queda pendiente). **9** se apoyan en una regla de negocio confirmada y **1** en un invariante técnico (`Estándar`: `AC-AMB-01-2`). Ninguno está en `OPEN` ni es `Derivada`: las reglas de §1 y §2 responden todo lo que este epic necesita.

## Anexo — Datos de prueba

Los valores de esta tabla son **ejemplos**: no son requisitos y QA elige los suyos. Los criterios fijan la clase de actor, la de estado y los límites de la regla; estos datos solo registran con qué se ejecutan las pruebas del módulo.

| Dato | Valor usado |
|------|-------------|
| Administrador del seed | `admin@sena.edu.co` / `AdminSENA2024` |
| Instructor del seed usado en `AC-AMB-01-3` y `AC-AMB-02-1` | `cmendoza@sena.edu.co` / `Instructor2024` |
| Ambiente que es la ubicación de inventario y el destino por defecto de toda unidad nueva | «Ambiente 104» |
| Segundo ambiente usado en los escenarios | «Ambiente 205» |
| Nombre con el que se registra el ambiente de `AC-AMB-01-1` | «Ambiente 205», ausente del catálogo de partida |
| Nombre de solo espacios de `AC-AMB-01-2` | `"   "` |
| Nombre nuevo de `AC-AMB-04-1` | «Ambiente 206», ausente del catálogo |
| Conteo de `AC-AMB-02-2` | 3 unidades en el «Ambiente 104» y 2 en el «Ambiente 205», sin ninguna otra unidad registrada |
| Unidades de `AC-AMB-03-1` y `AC-AMB-04-1` | 2 unidades ubicadas en el «Ambiente 205» |
| Unidad de `AC-AMB-03-2` | registrada después del intento de eliminar el «Ambiente 104» |
| Catálogo de `AC-AMB-02-3` | más ambientes que el tamaño de página de la consulta |
| Unidad de `AC-AMB-01-1` | una unidad registrada, para comprobar que el ambiente recién creado es elegible como su ubicación |
