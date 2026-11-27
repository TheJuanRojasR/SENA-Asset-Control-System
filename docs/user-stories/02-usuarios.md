# Epic 02 — Usuarios e instructores

Quién existe en el padrón, cómo entra y cómo se le devuelve el acceso: alta, consulta, edición, desactivación, reactivación y las dos formas de contraseña.

## Resumen

Este módulo resuelve el padrón de personas del sistema: dar de alta a un instructor, consultarlo y editarlo, desactivarlo y reactivarlo, y administrar su contraseña por las dos vías que el negocio reconoce —el cambio propio, con la contraseña actual, y el restablecimiento por el administrador, sin correo—. Cierra además las dos condiciones que mantienen el sistema operable: que exista al menos un administrador activo y que el primero se cree fuera de la aplicación.

Lo usa el **administrador** en todas las operaciones menos una. El **instructor** solo ejerce sobre su propia cuenta el cambio de contraseña que le reconoce `RN-USR-04`; escribir el padrón es acción administrativa (`RN-CTX-05`) y responde `403` sin efectos.

Si el módulo falla, el sistema acepta cuentas que nadie autorizó, deja entrar a un instructor desactivado, borra al deudor de un préstamo en curso o se queda sin ningún administrador activo. Las tres primeras rompen la trazabilidad que `RN-PRE-02` exige; la última deja el sistema inoperable. Estado hoy: **6 historias y 23 criterios ejecutados y en `OK`** en la rama `devJoseph-usuarios`: cada criterio tiene test con su id en `server/tests/integration/user.test.js` y la suite pasa. La revisión independiente de quien implementó queda pendiente en el PR.

## Alcance

**Incluye**

- Alta de instructores por el administrador, con los seis datos obligatorios y la foto opcional (`RN-USR-01`, `RN-USR-02`).
- Consulta del padrón con el estado de cada instructor, filtro por estado y paginación con total (`RN-CTX-02`).
- Edición de los datos de un instructor sin tocar su contraseña.
- Desactivación y reactivación, sin cancelar préstamos ni solicitudes (`RN-USR-05`, `RN-USR-11`).
- Cambio de la propia contraseña exigiendo la actual (`RN-USR-04`, `RN-USR-12`) y el cierre de todas las sesiones que provoca (`RN-USR-06`).
- Restablecimiento de la contraseña de un instructor por el administrador, sin correo (`RN-USR-03`) y con el cierre de todas sus sesiones (`RN-USR-07`).
- Protección del último administrador activo y arranque del sistema (`RN-USR-09`, `RN-USR-10`).

**No incluye**

| Tema | Dónde se especifica |
|------|---------------------|
| Inicio, renovación y cierre de sesión, perfil propio y reparto `401` / `403` por endpoint | Epic 01; acá solo se consumen los efectos de cierre de sesión de `RN-AUTH-05` |
| Matriz de permisos por endpoint de cada dominio | Epics 04, 05, 06, 07 y 08; en este epic solo los dos rechazos del padrón (`AC-USR-01-5`, `AC-USR-05-3`) |
| Mecanismo de la contraseña inicial del alta | Ninguna regla lo fija: la contraseña no está entre los seis datos de `RN-USR-02` |
| Requisitos de fortaleza de la contraseña (longitud, complejidad, caducidad, historial) | Ninguna regla los fija, ni acá ni en el epic 01 |
| Recuperación de contraseña por correo | `RN-USR-03` la excluye; `AC-USR-05-2` exige su ausencia |
| Eliminación de un instructor con historial | `RN-USR-08`: solo se desactiva (`AC-USR-02-4`) |
| Búsqueda y orden del padrón | Ninguna regla los pide: `RN-CAT-02` es la búsqueda del catálogo de elementos del instructor, no del padrón. `RN-CTX-02` fija el volumen y la paginación (`AC-USR-06-3`) |
| Cambio de rol, de instructor a administrador o al revés | Ninguna regla lo describe; `RN-CTX-06` confirma que un solo rol basta |
| Alta de un administrador desde la aplicación | `RN-USR-09`: la aplicación **nunca** crea administradores (`AC-USR-06-2`) |
| Plazos o sanciones para un instructor desactivado con equipos afuera | `RN-PRE-07`: no existe plazo de devolución, así que exceder la fecha estimada no tiene consecuencia |
| Vista de perfil propio del instructor (datos, foto) | Ninguna regla la describe; `RN-USR-04` solo habla de la contraseña |
| Historial de activaciones y desactivaciones (quién, cuándo, por qué) | Ninguna regla lo pide |

## Actores y permisos

| Actor | Puede | No puede |
|-------|-------|----------|
| **Administrador** (instructor encargado del almacén) | Dar de alta instructores, consultar y editar el padrón, filtrarlo por estado, desactivar y reactivar, restablecer la contraseña de un instructor y cambiar la suya | Eliminar a un instructor con historial (`RN-USR-08`); eliminar o desactivar al último administrador activo (`RN-USR-10`); crear un administrador desde la aplicación (`RN-USR-09`) |
| **Instructor** (quien dicta la clase) | Cambiar su propia contraseña indicando la actual (`RN-USR-04`, `RN-USR-12`) | Escribir el padrón: el alta de otro instructor y el restablecimiento de su contraseña responden `403` sin efectos; iniciar sesión con la cuenta desactivada |

Una petición sin credencial no es un actor: no tiene identidad y recibe `401` (epic 01, `AC-AUTH-05-2`). El administrador **es** un instructor (`RN-CTX-05`): no hay un tercer rol ni un usuario de sistema aparte.

## Reglas de negocio

| ID | Regla | Ejemplo |
|----|-------|---------|
| `RN-USR-01` | El administrador da de alta a los instructores; no existe registro público | Ningún instructor puede crearse su propia cuenta, ni completando un formulario ni con una invitación |
| `RN-USR-02` | Datos obligatorios del alta: nombre, tipo de documento, número de documento, teléfono celular, turno y correo electrónico; la foto es opcional | Un alta sin número de documento no crea al instructor; un alta sin foto sí lo crea |
| `RN-USR-03` | No existe recuperación de contraseña por correo: el administrador fija la nueva | Un instructor que olvidó su contraseña recibe una nueva del administrador y ningún mensaje del sistema |
| `RN-USR-04` | Un usuario con sesión iniciada puede cambiar su propia contraseña | El administrador cambia la suya; no puede usar esta operación para la de otro |
| `RN-USR-05` | Desactivar impide iniciar sesión, pero no cancela préstamos ni solicitudes: el instructor sigue obligado a devolver | Un instructor desactivado con 2 equipos afuera sigue figurando como su tenedor y los 2 equipos no vuelven a estar disponibles |
| `RN-USR-06` | Cambiar la propia contraseña cierra todas las sesiones del usuario, incluida la actual | El navegador donde se hizo el cambio también tiene que volver a iniciar sesión |
| `RN-USR-07` | El restablecimiento por el administrador cierra todas las sesiones de ese instructor | Un instructor con sesión en dos dispositivos pierde las dos al recibir la contraseña nueva |
| `RN-USR-08` | Un instructor con historial no se elimina: solo se desactiva | El intento de borrar a un instructor con una solicitud y un préstamo registrados termina en su desactivación, con el historial intacto |
| `RN-USR-09` | El primer administrador se crea fuera de la aplicación, en la base de datos o por el seed; la aplicación nunca crea administradores | Un sistema recién instalado entra con la cuenta de instalación y rechaza cualquier registro de usuario |
| `RN-USR-10` | No se puede eliminar ni desactivar al último administrador activo | Con un solo administrador activo, borrarlo y desactivarlo se rechazan por igual |
| `RN-USR-11` | Un instructor desactivado puede reactivarse | Reactivar devuelve el acceso con la misma contraseña y conserva solicitudes y préstamos |
| `RN-USR-12` | Cambiar la propia contraseña exige indicar la actual | Una contraseña actual que no coincide deja la credencial sin cambio |
| `RN-AUTH-04` | El cierre de sesión invalida la credencial en el servidor | Una copia capturada del token deja de servir después del cierre |
| `RN-AUTH-05` | Un identificador de sesión por usuario, verificado en cada petición, se incrementa al cerrar sesión, al cambiar o restablecer la contraseña y al desactivar la cuenta | El mismo mecanismo corta las sesiones del cambio propio, del restablecimiento y de la desactivación |
| `RN-AUTH-08` | El correo identifica la cuenta sin distinguir mayúsculas | El mismo correo escrito con otras mayúsculas es la misma cuenta y no crea una segunda |
| `RN-CTX-02` | Volumen operativo de alrededor de 100 instructores y entre 1.000 y 1.500 equipos: todo listado es paginado con su total | El padrón devuelve una página acotada con el total y el número de páginas |
| `RN-CTX-05` | Dos actores y ninguno más: administrar el padrón es acción administrativa; el instructor solicita, recoge y devuelve | Un alta o un restablecimiento enviados con sesión de instructor responden `403` sin efectos |
| `RN-CTX-06` | El modelo de un solo rol (`ADMIN` / `INSTRUCTOR`) es suficiente y el administrador no crea solicitudes | No hay un tercer rol que pueda reemplazar al administrador si el padrón se queda sin uno activo |
| `RN-PRE-02` | Debe saberse siempre quién tiene cada elemento y desde cuándo | El nombre del instructor sobrevive a su desactivación, y su préstamo conserva deudor y fecha de entrega |
| `RN-PRE-07` | No existe plazo de devolución | Este epic no fija plazos ni sanciones para un desactivado con equipos afuera |
| `Estándar` (invariantes técnicos) | Unicidad del correo, legibilidad del estado en la consulta y separación entre datos del padrón y credencial | Dos cuentas con el mismo correo harían indeterminable a quién pertenece una sesión o un préstamo |

`RN-USR-01` a `RN-USR-12` viven en §5.7 de `00-contexto-negocio.md`; `RN-AUTH-04`, `RN-AUTH-05` y `RN-AUTH-08` en §5.8, y `RN-CTX-02` en §1. Acá se leen y se citan: ningún criterio agrega condiciones que la regla no diga.

## Historias de usuario

Los criterios nombran la clase de actor y de estado —«un administrador con sesión iniciada», «un instructor activo», «el padrón con tres instructores»—. Los correos, contraseñas, nombres y documentos concretos con los que se ejecutan los escenarios están en el `Anexo — Datos de prueba`, al final del documento, y son ejemplos, no requisitos. Los usuarios del seed no los crea la aplicación: el primer administrador nace fuera de ella (`RN-USR-09`).

### US-USR-01 — Dar de alta un instructor

**Como** administrador del almacén **quiero** dar de alta a los instructores con sus datos obligatorios **para** que puedan iniciar sesión y solicitar equipos, sin que nadie pueda crearse una cuenta por su cuenta.

**Prioridad:** alta — es la puerta de entrada: sin instructores dados de alta no hay solicitante (`RN-CTX-05`) ni deudor (`RN-PRE-02`).
**Estado:** especificada — no ejecutada.

El alta la ejerce solo el administrador (`RN-USR-01`) y exige los seis datos de `RN-USR-02`. La foto es el único dato opcional. Las dos consecuencias se verifican por separado: un alta incompleta **no** crea al instructor y un alta sin foto **sí** lo crea. Ninguna regla fija el código de respuesta del rechazo ni el formato de la petición; los criterios exigen el efecto observable.

#### AC-USR-01-1 — Un alta con los seis datos obligatorios deja al instructor activo

**Dado** un administrador con sesión iniciada y un padrón que no incluye el correo indicado.
**Cuando** da de alta un instructor con los seis datos obligatorios.
**Entonces**:

- la operación se acepta;
- el instructor queda registrado en el padrón con los seis datos indicados;
- el instructor queda con estado activo;
- el instructor puede iniciar sesión con sus credenciales.

El criterio no fija el formato de la petición ni el de la respuesta, ni cómo se almacenan el nombre o el documento: exige el resultado observable. El instructor queda en condiciones de iniciar sesión porque esa es la única razón por la que existe el padrón: solicitar, recoger y devolver (`RN-CTX-05`).

#### AC-USR-01-2 — Si falta cualquier dato obligatorio, el alta se rechaza y no crea al instructor

**Dado** un administrador con sesión iniciada y un padrón con un número conocido de instructores.
**Cuando** intenta dar de alta un instructor al que le falta un dato obligatorio.
**Entonces** cada escenario se comporta así:

| Escenario | Entrada | Resultado esperado |
|-----------|---------|--------------------|
| Falta un dato obligatorio | alta que omite el número de documento | rechazo, ningún instructor creado, el número de instructores del padrón no cambia y el correo indicado en el intento no queda registrado |
| Un dato obligatorio va vacío | alta con el teléfono celular vacío | rechazo, ningún instructor creado y el número de instructores del padrón no cambia |

Los dos escenarios son el mismo criterio y se verifican en el mismo test: `RN-USR-02` no prioriza ninguno de los seis datos. El efecto exigido es doble a propósito —el rechazo y **cero** instructores creados—: un alta rechazada que dejara la fila creada se podría completar después sin que nadie lo decidiera, y el padrón dejaría de decir quién está dado de alta. El código de respuesta no lo fija ninguna regla.

#### AC-USR-01-3 — La foto es opcional

**Dado** un administrador con sesión iniciada y un padrón que no incluye el correo indicado.
**Cuando** da de alta un instructor con los seis datos obligatorios y sin foto.
**Entonces**:

- la operación se acepta;
- el instructor queda registrado con estado activo;
- el instructor puede iniciar sesión con sus credenciales;
- la ausencia de foto no se informa como error.

`RN-USR-02` declara la foto opcional de forma explícita, y el criterio existe para que esa palabra tenga consecuencia verificable. Sin él, un alta que exigiera la foto pasaría los otros criterios del epic, porque todos usan altas completas. El criterio no dice cómo se representa la ausencia de foto ni qué informa la consulta del padrón sobre ella.

#### AC-USR-01-4 — Un correo ya registrado se rechaza sin crear un segundo instructor

**Dado** un instructor ya registrado con un correo, un padrón con un número conocido de instructores y un administrador con sesión iniciada.
**Cuando** intenta dar de alta otro instructor con el mismo correo —escrito igual o con otras mayúsculas— y un número de documento distinto.
**Entonces**:

- la operación se rechaza;
- no se crea un segundo instructor;
- el número de instructores del padrón no cambia;
- los datos del instructor ya registrado no cambian;
- el instructor ya registrado sigue pudiendo iniciar sesión con sus credenciales.

La unicidad del correo es un invariante técnico: el correo es la identidad con la que se inicia sesión y `RN-AUTH-08` fija que no distingue mayúsculas, así que dos cuentas con el mismo correo harían indeterminable a quién pertenece una sesión, un préstamo o una solicitud. El criterio no se conforma con el rechazo: el alta rechazada no puede tocar al instructor existente ni dejar un segundo registro, ni siquiera inactivo. El código de respuesta y el mensaje no los fija ninguna regla.

#### AC-USR-01-5 — El instructor no puede dar de alta a otro instructor

**Dado** un instructor con sesión iniciada y un padrón con un número conocido de instructores.
**Cuando** envía la petición de dar de alta un instructor con los seis datos obligatorios.
**Entonces**:

- la respuesta es `403`;
- no se crea el instructor;
- el número de instructores del padrón no cambia.

`RN-CTX-05` deja el rechazo en el rol, no en la pantalla: el instructor solicita, recoge y devuelve, y administrar el padrón es acción administrativa. El criterio exige el rechazo **y** la ausencia de efectos: un `403` que igual creara la cuenta no cumpliría la regla. El reparto endpoint por endpoint del resto de las operaciones se especifica en cada epic de dominio.

### US-USR-02 — Consultar y editar el padrón de instructores

**Como** administrador del almacén **quiero** consultar el padrón, ver quién está activo y editar sus datos **para** mantener correcta la lista de personas que pueden solicitar equipos sin perder el historial de quien ya tiene o tuvo elementos.

**Prioridad:** media — el padrón identifica al solicitante y al deudor, pero no bloquea la operación diaria.
**Estado:** especificada — no ejecutada.

La consulta es la que hace legible la lista con la que el sistema responde quién puede solicitar y quién tiene cada elemento. Con alrededor de 100 instructores (`RN-CTX-02`), el listado es paginado y devuelve el total: sin eso no se puede leer ni recorrer. La edición no toca la contraseña, y un instructor con historial no se elimina: se desactiva.

#### AC-USR-02-1 — La consulta devuelve los instructores con sus datos y su estado

**Dado** un padrón con un instructor activo y un instructor inactivo, y un administrador con sesión iniciada.
**Cuando** el administrador consulta el padrón de instructores.
**Entonces**:

- la respuesta es `200`;
- la consulta devuelve el instructor activo con sus datos y lo informa como activo;
- la consulta devuelve el instructor inactivo con sus datos y lo informa como inactivo.

Es un invariante de lectura: el estado que `RN-USR-05` usa para impedir el inicio de sesión tiene que ser legible por quien administra el padrón. El criterio pide las dos mitades —datos y estado— y las pide para un activo **y** un inactivo, porque una consulta que solo listara activos escondería justamente a quien hay que reactivar o a quien quedó con equipos afuera. Qué campos devuelve cada fila y con qué vocabulario se nombran los dos estados no lo fija ninguna regla.

#### AC-USR-02-2 — La consulta se puede filtrar por estado activo o inactivo

**Dado** un padrón con 2 instructores activos y 1 instructor inactivo, y un administrador con sesión iniciada.
**Cuando** consulta el padrón filtrando por estado.
**Entonces** cada escenario se comporta así:

| Filtro aplicado | Resultado esperado |
|-----------------|--------------------|
| Estado inactivo | devuelve únicamente el instructor inactivo y no devuelve ninguno de los 2 activos |
| Estado activo | devuelve los 2 instructores activos y no devuelve el instructor inactivo |

Los dos escenarios son el mismo criterio: el filtro se ejerce en las dos direcciones porque las dos preguntas del administrador son reales —quién puede solicitar y quién quedó inactivo—. El criterio exige la **exclusión** de los instructores del otro estado, no solo la presencia de los buscados: un filtro que devolviera todo lo que coincide sin dejar fuera el resto no filtraría nada. El nombre del parámetro y el de los dos valores no los fija ninguna regla.

#### AC-USR-02-3 — Editar los datos de un instructor no obliga a cambiar la contraseña

**Dado** un instructor activo que puede iniciar sesión con su contraseña actual y un administrador con sesión iniciada.
**Cuando** el administrador corrige el teléfono celular de ese instructor.
**Entonces**:

- la operación se acepta;
- la consulta del padrón devuelve el instructor con el teléfono celular corregido;
- los demás datos del instructor no cambian;
- el instructor sigue iniciando sesión con la misma contraseña que ya tenía.

La contraseña es una credencial y los seis datos de `RN-USR-02` son datos del padrón; ninguna regla los vincula. Si editar el teléfono invalidara la contraseña, corregir un dato obligaría a dos operaciones y dejaría al instructor fuera mientras tanto. El criterio no dice qué campos son editables uno por uno, ni qué pasa si una edición deja vacío un dato obligatorio: la lista obligatoria es `RN-USR-02` y su rechazo ya está fijado para el alta en `AC-USR-01-2`.

#### AC-USR-02-4 — Un instructor con historial no se elimina: se desactiva

**Dado** un instructor que registra una solicitud y un préstamo en curso a su nombre, y un administrador con sesión iniciada.
**Cuando** el administrador intenta eliminar a ese instructor del padrón.
**Entonces**:

- el instructor no se elimina;
- el instructor sigue figurando en el padrón;
- el instructor figura como inactivo;
- la solicitud registrada sigue existiendo y sigue siendo de ese instructor;
- el préstamo en curso sigue registrado a nombre de ese instructor;
- el elemento prestado sigue figurando como entregado a ese instructor.

`RN-USR-08` confirma la prohibición como regla propia y su fundamento es `RN-PRE-02`: si debe saberse siempre quién tiene cada elemento y desde cuándo, borrar al instructor deja el préstamo sin deudor legible. `RN-USR-05` ofrece la operación que resuelve el caso —desactivar— sin borrar nada. La regla dice que el instructor **solo se desactiva**, así que el criterio exige las dos mitades: sigue en el padrón con su historial y queda inactivo. El criterio no afirma cómo informa la respuesta HTTP esa sustitución.

Lo que separa este caso de `AC-USR-06-1` es el papel de la cuenta: un instructor con historial se **desactiva** (`RN-USR-08`) y el último administrador activo se **rechaza** (`RN-USR-10`). El mecanismo con el que se intenta el borrado no distingue los dos casos.

#### AC-USR-06-3 — La consulta del padrón es paginada y devuelve el total

**Dado** un padrón con más usuarios que el tamaño de página de la consulta y un administrador con sesión iniciada.
**Cuando** el administrador consulta la primera página del padrón.
**Entonces**:

- la respuesta es `200`;
- la consulta devuelve como máximo el tamaño de página de usuarios;
- la consulta informa el total de usuarios del padrón;
- la consulta informa el número de páginas.

`RN-CTX-02` fija el volumen —alrededor de 100 instructores y entre 1.000 y 1.500 equipos y elementos— y exige que **todo listado** sea paginado con su total, incluido el padrón. En ese volumen la paginación es un **bloqueo funcional**, no un defecto cosmético: el total y el número de páginas son lo que permite saber cuánto hay sin pedirlo todo. El criterio no fija el tamaño de página ni la forma de la respuesta.

Conserva el identificador `AC-USR-06-3` para no renumerar criterios ya referenciados, y vive al final de `US-USR-02` porque lo que exige es la consulta del padrón.

### US-USR-03 — Desactivar y reactivar un instructor

**Como** administrador del almacén **quiero** desactivar a un instructor que ya no debe entrar y poder reactivarlo después **para** sacarlo de circulación sin perder los equipos que tiene afuera ni el registro de que los tiene.

**Prioridad:** alta — desactivar es la salida de un instructor y no puede convertirse en una cancelación encubierta de sus préstamos (`RN-USR-05`).
**Estado:** especificada — no ejecutada.

`RN-USR-05` tiene dos mitades que se leen con la misma fuerza: desactivar impide iniciar sesión y **no** cancela préstamos ni solicitudes, porque el instructor sigue obligado a devolver. Si desactivar cancelara los préstamos, el sistema liberaría unidades que físicamente no están en el almacén —el mismo daño que `RN-NEG-05` evita— y perdería el registro de quién las tiene, que es lo que `RN-PRE-02` prohíbe. Por eso hay tres criterios para la segunda mitad, uno por cada vía por la que se rompe, y un cuarto para la reactivación que fija `RN-USR-11`.

#### AC-USR-03-1 — Un instructor desactivado no puede iniciar sesión

**Dado** un instructor que puede iniciar sesión con su contraseña actual y un administrador con sesión iniciada.
**Cuando** el administrador desactiva a ese instructor y el instructor intenta iniciar sesión con su correo y su contraseña.
**Entonces**:

- el inicio de sesión se rechaza;
- no se emite ninguna sesión para ese instructor;
- la contraseña del instructor no cambia.

El criterio exige el rechazo y, además, que desactivar **no altere la contraseña**, porque desactivar y restablecer son operaciones distintas en este epic: un sistema que invalidara la credencial al desactivar haría que reactivar no bastara para volver a entrar. El criterio no fija qué respuesta recibe el intento rechazado; el contrato del inicio de sesión es del epic 01.

#### AC-USR-03-2 — Al desactivar, los préstamos y solicitudes en curso siguen vigentes

**Dado** un instructor con una solicitud en curso y 2 elementos entregados a su nombre y no devueltos, y un administrador con sesión iniciada.
**Cuando** el administrador desactiva a ese instructor.
**Entonces**:

- la solicitud sigue en el mismo estado en que estaba;
- los 2 elementos siguen registrados como entregados a ese instructor;
- los 2 elementos no vuelven a figurar como disponibles;
- ningún elemento cambia de tenedor.

El efecto más importante es el tercero: cancelar un préstamo en el sistema sin que el equipo vuelva físicamente al almacén produce falsa disponibilidad. El criterio no se conforma con que el registro siga existiendo; exige que su consecuencia sobre la disponibilidad tampoco cambie. Qué estados de solicitud existen y cómo se nombran es materia del epic 06; acá solo se exige que el estado no cambie.

#### AC-USR-03-3 — Un instructor desactivado sigue figurando como deudor

**Dado** un instructor que no devolvió 1 elemento y fue desactivado por el administrador, y un administrador con sesión iniciada.
**Cuando** el administrador consulta quién tiene ese elemento.
**Entonces**:

- ese elemento informa a ese instructor como su tenedor;
- el instructor aparece como inactivo;
- se informa desde cuándo lo tiene.

Si el instructor sigue obligado a devolver, el sistema tiene que poder decir a quién se le reclama. Una consulta que omitiera a los desactivados dejaría el elemento sin deudor visible: el equipo existiría en el inventario y figuraría prestado a alguien que no aparece en ninguna lista. El criterio exige las dos cosas juntas —el instructor como tenedor y su estado inactivo— para que no se confunda con alguien que puede volver a solicitar. La forma de la consulta y el nombre de los campos no los fija ninguna regla.

#### AC-USR-03-4 — El administrador puede reactivar a un instructor

**Dado** un instructor desactivado que no puede iniciar sesión y un administrador con sesión iniciada.
**Cuando** el administrador reactiva a ese instructor.
**Entonces**:

- la operación se acepta;
- la consulta del padrón lo informa como activo;
- el instructor vuelve a poder iniciar sesión con su correo y su contraseña;
- sus solicitudes y préstamos anteriores siguen registrados a su nombre.

`RN-USR-11` lo fija como regla propia: un instructor desactivado puede reactivarse, así que la desactivación no es irreversible. El criterio exige el efecto completo de esa reversión, porque reactivar no es re-crear la cuenta y `RN-USR-05` no borra nada que haya que reponer. Ninguna regla fija si reactivar exige además asignar una contraseña nueva; no se inventa.

### US-USR-04 — Cambiar la propia contraseña

**Como** usuario del sistema, instructor o administrador **quiero** cambiar mi propia contraseña indicando la actual y la nueva **para** no depender de otra persona para proteger mi cuenta.

**Prioridad:** media — sin esta operación toda contraseña quedaría solo en manos del administrador.
**Estado:** especificada — no ejecutada.

`RN-USR-04` tiene alcance preciso: un usuario **con sesión iniciada** puede cambiar **su propia** contraseña. «Con sesión iniciada» excluye cualquier cambio sin autenticación; «su propia» excluye que esta operación sirva para la de otro, que es `US-USR-05` y tiene otro actor. `RN-USR-12` exige indicar la actual, y el cierre de todas las sesiones lo fija `RN-USR-06`.

#### AC-USR-04-1 — Un usuario con sesión iniciada cambia su contraseña

**Dado** un usuario con sesión iniciada y su contraseña actual.
**Cuando** cambia su contraseña indicando la actual y una nueva distinta.
**Entonces**:

- la operación se acepta;
- el usuario puede iniciar sesión con la contraseña nueva;
- el usuario no puede iniciar sesión con la contraseña anterior.

`RN-USR-04` reconoce la operación y el criterio exige sus dos consecuencias: la nueva **sirve** y la anterior **deja de servir**. Sin la segunda mitad, un sistema que aceptara el cambio sin aplicarlo pasaría la prueba. El criterio no fija requisitos de la contraseña nueva —longitud, complejidad, que sea distinta de la anterior— porque ninguna regla los fija; pide que sea distinta solo para que el cambio sea observable. Tampoco fija la forma de la petición ni de la respuesta.

#### AC-USR-04-2 — Si la contraseña actual no coincide, el cambio se rechaza sin efecto

**Dado** un usuario con sesión iniciada y su contraseña actual.
**Cuando** intenta cambiar su contraseña indicando una contraseña actual que no coincide.
**Entonces**:

- la operación se rechaza;
- la contraseña del usuario no cambia;
- el usuario sigue iniciando sesión con la contraseña que tenía;
- la contraseña nueva indicada en el intento no queda vigente.

`RN-USR-12` exige indicar la contraseña actual, y el criterio verifica esa condición con el rechazo. Sin la verificación, el cambio sería una forma de tomar la cuenta con solo tener una sesión abierta, y `RN-USR-04` dejaría de distinguir al dueño de la cuenta de quien encontró el dispositivo desbloqueado. El criterio exige el rechazo y la ausencia de cambio, observable en las dos direcciones: la anterior sigue sirviendo y la nueva no queda vigente. El código de respuesta y el mensaje no los fija ninguna regla.

#### AC-USR-04-3 — El cambio de contraseña cierra todas las sesiones abiertas, incluida la actual

**Dado** un usuario con sesión iniciada en más de un dispositivo y su contraseña actual.
**Cuando** cambia su propia contraseña indicando la actual y una nueva distinta.
**Entonces**:

- la operación se acepta;
- todas las sesiones abiertas de ese usuario quedan cerradas;
- la sesión con la que se hizo el cambio también queda cerrada;
- la siguiente petición con cualquiera de esos tokens se rechaza;
- el usuario debe volver a iniciar sesión;
- el usuario puede iniciar sesión con la contraseña nueva.

`RN-USR-06` no deja el efecto a interpretación, y el criterio lo exige completo porque las dos mitades se pueden cumplir a medias: cerrar solo las de otros dispositivos dejaría la cuenta abierta para quien tiene a mano el cliente con el que se hizo el cambio, y cerrar solo la actual dejaría vivas justamente las sesiones que el usuario quería cortar. Las dos últimas comprobaciones hacen observable que el cierre es real y que el usuario no queda fuera de su cuenta. El mecanismo de invalidación es el de `RN-AUTH-05`, registrado en el epic 01.

### US-USR-05 — Restablecer la contraseña de un instructor

**Como** administrador del almacén **quiero** asignarle una contraseña nueva a un instructor sin necesitar la anterior **para** devolverle el acceso a alguien que la olvidó, ya que el sistema no le manda ningún correo de recuperación.

**Prioridad:** alta — `RN-USR-03` excluye la recuperación por correo: si esta operación falla, un instructor que olvidó su contraseña queda sin forma de volver a entrar.
**Estado:** especificada — no ejecutada.

`RN-USR-03` tiene dos caras y las dos son de negocio. La primera dice que **no hay recuperación por correo**: el sistema no envía enlace ni contraseña temporal, así que la única vuelta a la cuenta es el administrador asignando una contraseña nueva. La segunda describe esa operación: la ejerce **sin conocer la anterior**, porque si la conociera el instructor no necesitaría ayuda. `RN-USR-07` agrega que el restablecimiento **cierra todas** las sesiones del instructor.

#### AC-USR-05-1 — El administrador asigna una contraseña nueva sin conocer la anterior

**Dado** un instructor activo cuya contraseña actual es desconocida para el administrador y un administrador con sesión iniciada.
**Cuando** el administrador restablece la contraseña de ese instructor asignando una contraseña nueva.
**Entonces**:

- la operación se acepta;
- el instructor puede iniciar sesión con la contraseña nueva;
- el instructor no puede iniciar sesión con la contraseña anterior;
- los datos del instructor en el padrón no cambian.

El criterio exige que funcione **sin conocer la anterior**: si el sistema la pidiera, la operación sería `US-USR-04` y el instructor sin acceso seguiría sin acceso. El cuarto efecto separa este restablecimiento de la edición de `AC-USR-02-3`: cambiar la credencial no es editar los seis datos de `RN-USR-02`. Qué requisitos tiene la contraseña nueva y cómo la comunica el administrador no lo fija ninguna regla.

#### AC-USR-05-2 — El restablecimiento no envía ningún correo

**Dado** un instructor activo con correo electrónico registrado y un administrador con sesión iniciada.
**Cuando** el administrador restablece la contraseña de ese instructor.
**Entonces**:

- no se envía ningún correo al instructor;
- no se emite ningún enlace ni código de recuperación;
- el restablecimiento se completa con la sola acción del administrador;
- el instructor puede iniciar sesión con la contraseña nueva.

`RN-USR-03` excluye **explícitamente** la recuperación por correo, así que este criterio exige una **ausencia**, no una funcionalidad. La ausencia también se puede romper: agregar un «olvidé mi contraseña» con enlace por correo contradice la regla aunque parezca una mejora. El criterio se verifica comprobando que el restablecimiento no produce ningún mensaje saliente ni emite enlace o código. Si el instructor se entera del cambio es responsabilidad del administrador; ninguna regla pide una notificación.

#### AC-USR-05-3 — Un instructor no puede restablecer la contraseña de otro

**Dado** un instructor con sesión iniciada y otro instructor activo que puede iniciar sesión con su contraseña actual.
**Cuando** el primer instructor envía la petición de restablecer la contraseña del segundo.
**Entonces**:

- la respuesta es `403`;
- la contraseña del segundo instructor no cambia;
- el segundo instructor sigue iniciando sesión con la contraseña que tenía.

`RN-CTX-05` fija el reparto: administrar las cuentas del padrón es acción administrativa. El criterio exige el rechazo y la ausencia de efectos, porque un `403` que igual cambiara la contraseña sería peor que un permiso faltante: sería la toma de una cuenta ajena. Que el segundo instructor siga entrando con su contraseña es la forma de observar que nada cambió. El instructor conserva, en cambio, el cambio de **su propia** contraseña (`RN-USR-04`): este criterio no se lo quita.

#### AC-USR-05-4 — El restablecimiento cierra todas las sesiones del instructor

**Dado** un instructor con sesión iniciada en más de un dispositivo y un administrador con sesión iniciada.
**Cuando** el administrador restablece la contraseña de ese instructor asignando una contraseña nueva.
**Entonces**:

- la operación se acepta;
- todas las sesiones abiertas de ese instructor quedan cerradas;
- la siguiente petición del instructor con cualquiera de los tokens anteriores se rechaza;
- el instructor puede iniciar sesión con la contraseña nueva;
- los datos del instructor en el padrón no cambian.

`RN-USR-07` agrega el efecto que `RN-USR-03` no decía: todas las sesiones del instructor se cierran. El restablecimiento es la operación de recuperación de acceso y la credencial anterior deja de servir en `AC-USR-05-1`; una sesión emitida con esa credencial no puede quedar viva, o el cambio conviviría con la cuenta abierta en otros dispositivos. El mecanismo de invalidación es el de `RN-AUTH-05`, registrado en el epic 01; el código de respuesta de la petición rechazada no lo fija este epic.

### US-USR-06 — Proteger al último administrador y al arranque del sistema

**Como** administrador del almacén **quiero** que el sistema no me deje quedarme sin ningún administrador activo y que el primero se cree fuera de la aplicación **para** no dejar el sistema inoperable por un borrado o una desactivación, y no abrir un camino de registro público que nadie autorizó.

**Prioridad:** alta — sin ningún administrador activo el sistema queda **inoperable**: nadie puede dar de alta instructores, restablecer contraseñas ni escribir el catálogo.
**Estado:** especificada — no ejecutada.

Todo lo que este epic especifica lo hace un administrador. `RN-CTX-05` fija dos actores y ninguno más y `RN-CTX-06` confirma que un solo rol es suficiente: **no hay un tercer rol que pueda reemplazar al administrador**. Si el padrón se queda sin ninguno activo, no queda nadie facultado para crear uno. `RN-USR-10` fija ese límite, y `RN-USR-09` fija el otro extremo: el primer administrador se crea fuera de la aplicación y la aplicación **nunca** crea administradores.

#### AC-USR-06-1 — No se puede eliminar ni desactivar al último administrador activo

**Dado** un padrón con un solo administrador activo, que es el que tiene la sesión iniciada.
**Cuando** ese administrador intenta eliminar o desactivar su propia cuenta, la única cuenta administrativa activa del padrón.
**Entonces** cada escenario se comporta así:

| Operación intentada | Resultado esperado |
|---------------------|--------------------|
| Eliminar la propia cuenta, única cuenta administrativa activa | rechazo, el administrador sigue activo, el número de administradores activos del padrón sigue siendo 1 y ese administrador inicia sesión con su contraseña actual |
| Desactivar la propia cuenta, única cuenta administrativa activa | rechazo, el administrador sigue activo, el número de administradores activos del padrón sigue siendo 1 y ese administrador inicia sesión con su contraseña actual |

`RN-USR-10` lo fija sin rodeos: no se puede **eliminar ni desactivar** al último administrador activo. Los dos escenarios son el mismo criterio porque las dos operaciones producen el mismo resultado observable —un padrón sin administradores activos— y las dos se rechazan. Con un solo administrador activo, la única sesión `ADMIN` posible es la de esa cuenta, y lo que se prueba es que el sistema no la deja desaparecer.

La comprobación tiene que observar al **administrador**, no al padrón de instructores: el padrón que se lista y se pagina en `AC-USR-06-3` cuenta instructores, así que «el número de usuarios del padrón no cambia» no diría nada sobre la cuenta administrativa. Por eso el criterio exige que el número de administradores activos siga siendo 1 y que ese administrador siga entrando con su contraseña.

#### AC-USR-06-2 — El primer administrador se crea fuera de la aplicación

**Dado** un sistema recién instalado, con su padrón y sus cuentas administrativas en el estado que se indica.
**Cuando** se intenta iniciar sesión o registrar un usuario.
**Entonces** cada escenario se comporta así:

| Escenario | Entrada | Resultado esperado |
|-----------|---------|--------------------|
| Arranque | primer administrador creado en la base de datos o por el seed, sin ninguna sesión iniciada, e inicio de sesión con sus credenciales | la sesión se inicia con el rol de administrador |
| Registro sin sesión de administrador | petición de registro de usuario, sin ninguna sesión iniciada, con un padrón de número conocido de usuarios | rechazo, ningún usuario creado y el número de usuarios del padrón no cambia |
| Registro de un administrador con sesión de administrador | un administrador con sesión iniciada envía una petición de registro de un usuario con rol administrador, con un padrón de número conocido de usuarios y de administradores | rechazo, ningún usuario creado, el número de usuarios del padrón no cambia y el número de administradores tampoco |

`RN-USR-09` lo fija: el primer administrador se crea fuera de la aplicación, no hay registro público y la aplicación **nunca** crea administradores. El primer escenario exige que esa cuenta de instalación sirva para lo único que tiene que servir. Los otros dos exigen la ausencia de todo camino alternativo, y los dos hacen falta porque son distintos: sin sesión de administrador se rechaza cualquier registro —incluido el instructor que intentara crearse su propia cuenta (`RN-USR-01`)— y **con** sesión de administrador el registro de un usuario con rol `ADMIN` también se rechaza. Qué código de respuesta acompaña cada rechazo y cómo se crea el primer administrador no los fija ninguna regla.

## Errores y mensajes

| Situación | HTTP | Código | Mensaje |
|-----------|------|--------|---------|
| Alta de instructor sin uno de los seis datos obligatorios | No lo fija ninguna regla | No lo fija ninguna regla | No lo fija ninguna regla; sin instructor creado |
| Alta de instructor con un correo ya registrado, escrito igual o con otras mayúsculas | No lo fija ninguna regla | No lo fija ninguna regla | No lo fija ninguna regla; el instructor existente queda intacto |
| Alta de instructor con sesión de instructor | `403` | No lo fija ninguna regla (el epic 01 usa `FORBIDDEN`) | No lo fija ninguna regla; sin efectos |
| Intento de eliminar a un instructor con historial | No lo fija ninguna regla | No lo fija ninguna regla | No lo fija ninguna regla; el instructor queda inactivo y conserva su historial |
| Cambio de la propia contraseña con una contraseña actual que no coincide | No lo fija ninguna regla | No lo fija ninguna regla | No lo fija ninguna regla; la credencial no cambia |
| Restablecimiento de la contraseña de otro instructor con sesión de instructor | `403` | No lo fija ninguna regla (el epic 01 usa `FORBIDDEN`) | No lo fija ninguna regla; la contraseña del otro instructor no cambia |
| Intento de eliminar o desactivar al último administrador activo | No lo fija ninguna regla | No lo fija ninguna regla | No lo fija ninguna regla; el administrador sigue activo |
| Registro de usuario sin sesión de administrador | No lo fija ninguna regla | No lo fija ninguna regla | No lo fija ninguna regla; sin usuario creado |
| Registro de un usuario con rol administrador, con sesión de administrador | No lo fija ninguna regla | No lo fija ninguna regla | No lo fija ninguna regla; sin usuario creado |
| Operación del padrón sin credencial | `401` | No lo fija ninguna regla (epic 01, `AC-AUTH-05-2`) | No lo fija ninguna regla; sin efectos sobre datos |

Ninguna regla de este epic fija un mensaje literal: a diferencia del epic 01, cuyos rechazos de sesión tienen textos decididos, acá lo exigido es el rechazo y su ausencia de efectos.

## Sesión y seguridad

| Efecto | Regla | Dónde se verifica |
|--------|-------|-------------------|
| Cambiar la propia contraseña cierra todas las sesiones del usuario, incluida la actual; hay que volver a iniciar sesión | `RN-USR-06` | `AC-USR-04-3` |
| Restablecer la contraseña de un instructor cierra todas las sesiones de ese instructor | `RN-USR-07` | `AC-USR-05-4` |
| Desactivar corta el acceso: el inicio de sesión se rechaza y la sesión ya emitida deja de valer | `RN-USR-05` con `RN-AUTH-05` | `AC-USR-03-1`; el corte de la sesión emitida en el epic 01 (`AC-AUTH-02-4`, `AC-AUTH-04-5`, defecto `DEF-AUTH-006`) |
| Un solo mecanismo de revocación: el identificador de sesión por usuario se incrementa al cerrar sesión, al cambiar o restablecer la contraseña y al desactivar la cuenta | `RN-AUTH-05` | `AC-USR-04-3`, `AC-USR-05-4`; verificación del mecanismo en el epic 01 |
| El cierre invalida la credencial en el servidor: una copia capturada deja de servir | `RN-AUTH-04` | `AC-USR-04-3`, `AC-USR-05-4` |
| Desactivar no cambia la contraseña, y reactivar devuelve el acceso con la misma credencial | `RN-USR-05`, `RN-USR-11` | `AC-USR-03-1`, `AC-USR-03-4` |
| El correo identifica la cuenta sin distinguir mayúsculas, también al dar de alta | `RN-AUTH-08` | `AC-USR-01-4` |
| El restablecimiento no envía correo ni emite enlace o código de recuperación | `RN-USR-03` | `AC-USR-05-2` |

## Decisiones tomadas

| Decisión | Regla | Responde a |
|----------|-------|------------|
| Solo el administrador escribe el padrón: no hay registro público ni auto-registro | `RN-USR-01` | — |
| Los datos del alta son seis y la foto es el único opcional | `RN-USR-02` | — |
| No hay recuperación de contraseña por correo: el administrador fija la nueva | `RN-USR-03` | `OPEN-AUTH-05` |
| El usuario con sesión iniciada cambia su propia contraseña, indicando la actual | `RN-USR-04`, `RN-USR-12` | `OPEN-AUTH-05` |
| Desactivar impide entrar sin cancelar préstamos ni solicitudes | `RN-USR-05` | — |
| Cambiar la propia contraseña cierra todas las sesiones, incluida la actual | `RN-USR-06` | `OPEN-USR-01`, `OPEN-AUTH-05` |
| El restablecimiento por el administrador cierra todas las sesiones del instructor | `RN-USR-07` | `OPEN-AUTH-05` |
| Un instructor con historial no se elimina: se desactiva | `RN-USR-08` | — |
| El primer administrador se crea fuera de la aplicación; la aplicación nunca crea administradores | `RN-USR-09` | — |
| No se puede eliminar ni desactivar al último administrador activo | `RN-USR-10` | — |
| Un instructor desactivado puede reactivarse | `RN-USR-11` | — |
| Desactivar corta el acceso de inmediato, sin ventana que aceptar | `RN-USR-05` con `RN-AUTH-05` | `OPEN-AUTH-03` |
| El padrón es paginado con su total, como todo listado | `RN-CTX-02` | — |

Sin decisión todavía: los requisitos de fortaleza de la contraseña, el mecanismo de la contraseña inicial del alta, la búsqueda y el orden del padrón, y el cambio de rol. Ninguna regla los fija y ningún criterio los exige.

## Trazabilidad y estado

Un criterio se marca `OK` o `GAP` **solo** cuando su test corre, nunca por lectura del código. Este epic se ejecutó en la rama `devJoseph-usuarios` con `server/tests/integration/user.test.js`: los 23 criterios tienen test con su id y pasan.

| Criterio | Regla | Estado hoy |
|----------|-------|------------|
| `AC-USR-01-1` | `RN-USR-01`, `RN-USR-02` | `OK` |
| `AC-USR-01-2` | `RN-USR-02` | `OK` |
| `AC-USR-01-3` | `RN-USR-02` | `OK` |
| `AC-USR-01-4` | `Estándar` | `OK` |
| `AC-USR-01-5` | `RN-CTX-05` | `OK` |
| `AC-USR-02-1` | `Estándar` | `OK` |
| `AC-USR-02-2` | `Estándar` | `OK` |
| `AC-USR-02-3` | `Estándar` | `OK` |
| `AC-USR-02-4` | `RN-USR-08` | `OK` |
| `AC-USR-06-3` | `RN-CTX-02` | `OK` |
| `AC-USR-03-1` | `RN-USR-05` | `OK` |
| `AC-USR-03-2` | `RN-USR-05` | `OK` |
| `AC-USR-03-3` | `RN-USR-05` | `OK` |
| `AC-USR-03-4` | `RN-USR-11` | `OK` |
| `AC-USR-04-1` | `RN-USR-04` | `OK` |
| `AC-USR-04-2` | `RN-USR-12` | `OK` |
| `AC-USR-04-3` | `RN-USR-06` | `OK` |
| `AC-USR-05-1` | `RN-USR-03` | `OK` |
| `AC-USR-05-2` | `RN-USR-03` | `OK` |
| `AC-USR-05-3` | `RN-CTX-05` | `OK` |
| `AC-USR-05-4` | `RN-USR-07` | `OK` |
| `AC-USR-06-1` | `RN-USR-10` | `OK` |
| `AC-USR-06-2` | `RN-USR-09` | `OK` |

Totales: **6 historias y 23 criterios**, **23 `OK`** (verificación ejecutada en Linux; la revisión independiente del código queda pendiente). **19** se apoyan en una regla de negocio confirmada y **4** en un invariante técnico (`Estándar`: `AC-USR-01-4`, `AC-USR-02-1`, `AC-USR-02-2`, `AC-USR-02-3`). Ninguno está en `OPEN` ni es `Derivada`: las preguntas que este epic tenía abiertas quedaron respondidas por las reglas confirmadas de §5.7 y §5.8.

## Anexo — Datos de prueba

Los valores de esta tabla son **ejemplos**: no son requisitos y QA elige los suyos. Los criterios fijan la clase de actor, la de estado y los límites de la regla; estos datos solo registran con qué se ejecutan las pruebas del módulo.

| Dato | Valor usado |
|------|-------------|
| Administrador del seed | `admin@sena.edu.co` / `AdminSENA2024` |
| Instructores del seed citados | `cmendoza@sena.edu.co`, `mgomez@misena.edu.co` y `ltorres@misena.edu.co` / `Instructor2024` |
| Alta de `AC-USR-01-1` y `AC-USR-01-3` | nombre `Laura Torres`, tipo de documento `CC`, número `1020304050`, teléfono celular `3001234567`, turno `Mañana`, correo `ltorres@misena.edu.co`; sin foto en `AC-USR-01-3` |
| Correo duplicado de `AC-USR-01-4` | `cmendoza@sena.edu.co`, y su variante en mayúsculas |
| Variante con otras mayúsculas | `LTORRES@MISENA.EDU.CO` para `ltorres@misena.edu.co` |
| Padrón de `AC-USR-02-1` | un instructor activo y uno inactivo |
| Padrón de `AC-USR-02-2` | 2 instructores activos y 1 inactivo |
| Teléfono corregido en `AC-USR-02-3` | de `3001234567` a `3109876543` |
| Instructor con historial de `AC-USR-02-4` | una solicitud registrada, un préstamo en curso y el elemento entregado |
| Padrón de `AC-USR-06-3` | más usuarios que el tamaño de página de la consulta; altas del propio epic |
| Instructor con equipos afuera de `AC-USR-03-2` | una solicitud en curso y 2 elementos entregados sin devolver |
| Instructor desactivado de `AC-USR-03-3` | 1 elemento no devuelto, con su fecha de entrega |
| Sesiones múltiples de `AC-USR-04-3` y `AC-USR-05-4` | el mismo usuario con sesión abierta en dos clientes |
| Contraseña nueva de `AC-USR-04-1` y `AC-USR-05-1` | `NuevaSENA2024`, distinta de la anterior |
| Padrón de `AC-USR-06-1` | un solo administrador activo, que es quien tiene la sesión |
| Instalación de `AC-USR-06-2` | primer administrador creado por el seed del proyecto |
