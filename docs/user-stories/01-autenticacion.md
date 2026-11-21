# Epic 01 — Autenticación y sesión

Cómo se entra al sistema, cuánto dura la sesión y quién puede hacer qué: inicio, renovación, cierre, perfil propio y separación por rol.

## Resumen

Este módulo resuelve el acceso al sistema: comprobar la identidad de quien inicia sesión, mantener la sesión de quien está trabajando y cerrarla sin dejar nada reutilizable. Los dos actores del sistema —administrador del almacén e instructor— entran por acá; lo que los separa no es la sesión sino la **acción administrativa** (`RN-CTX-05`, `US-AUTH-05`).

Lo usan **ambos actores**: el administrador para llegar a la escritura del padrón y del inventario, y el instructor para solicitar, recoger y devolver equipos. En la práctica este módulo, y no otro, decide cuánto dura una sesión (15 minutos el acceso y 8 horas el refresco), cuándo se rechaza un intento de inicio y cuándo una sesión deja de servir.

Si el módulo falla, el sistema permite confirmar qué correos existen, seguir usando una credencial capturada después de cerrar sesión o entrar con una cuenta desactivada. Sobre el inventario real del Ambiente 104 (`RN-CTX-01`) esas son brechas de producción, no defectos cosméticos. Estado hoy: **14 criterios `OK`, 6 `GAP`** con sus defectos `DEF-AUTH-001` a `DEF-AUTH-006`, y **2 criterios sin ejecutar**.

## Alcance

**Incluye**

- Inicio de sesión con correo y contraseña, sus tres rechazos indistinguibles y el límite de intentos por origen.
- Renovación del token de acceso con el token de refresco y el plazo de la sesión.
- Cierre de sesión, incluida la invalidación de la credencial en el servidor.
- Consulta del perfil propio con el token de acceso.
- Reparto de permisos por rol: `401` sin credencial y `403` con credencial sin permiso.
- Duraciones de las credenciales y los eventos que cierran una sesión.

**No incluye**

| Tema | Dónde se especifica |
|------|---------------------|
| Alta, edición, desactivación y reactivación de usuarios | Epic 02 (`RN-USR-01`, `RN-USR-02`, `RN-USR-05`); acá solo se consumen `RN-USR-05` sobre el acceso y `RN-CTX-05` |
| Cambio de la propia contraseña y restablecimiento por el administrador | Epic 02 (`US-USR-04`, `US-USR-05`, `RN-USR-03`, `RN-USR-04`); acá solo se consumen sus efectos de cierre de sesión (`RN-USR-06`, `RN-USR-07`, `RN-AUTH-05`) |
| Matriz de endpoints y rol de cada recurso | Cada epic de dominio (04, 05, 06, 07 y 08) |
| Requisitos de fortaleza de la contraseña (longitud, complejidad, caducidad, historial) | Ninguna regla los fija, ni en este módulo ni en el 02 |
| Rotación real del token de refresco | Ninguna regla confirmada la exige; `RN-AUTH-04` y `RN-AUTH-05` resuelven la invalidación en el servidor, no la rotación |
| Dónde vive el contador de intentos y cómo se obtiene la IP del cliente detrás de un proxy | Implementación: ninguna regla lo fija |
| Bloqueo de cuenta tras intentos fallidos | Descartado explícitamente por `RN-AUTH-06` |
| Cerrar todas las sesiones como acción del propio usuario | Ninguna regla la pide; el cierre masivo lo disparan `RN-USR-06` y `RN-USR-07` |
| Sesiones concurrentes o límite de dispositivos | Ninguna regla lo pide |
| Bitácora de inicios y cierres de sesión; auditoría de intentos rechazados | Ninguna regla las pide |
| Validación del correo más allá de su formato | Ninguna regla la pide |
| Riesgos de infraestructura no verificables por comportamiento HTTP | `RISK-AUTH-01` a `RISK-AUTH-05`, al final de este documento |

## Actores y permisos

| Actor | Puede | No puede |
|-------|-------|----------|
| **Administrador** (instructor encargado del almacén) | Iniciar sesión, renovarla, cerrarla y consultar su propio perfil; ejecutar las escrituras administrativas sobre usuarios, ítems, ambientes, categorías e inventario | Omitir los rechazos de autenticación: credenciales inválidas, token vencido y cuenta desactivada responden igual que para cualquier otro actor; su sesión tampoco sobrevive al cierre ni a las 8 horas |
| **Instructor** (quien dicta la clase) | Iniciar sesión, renovarla, cerrarla y consultar su propio perfil; solicitar, recoger y devolver equipos | Ejecutar una acción administrativa: recibe `403 FORBIDDEN` sin efectos; seguir entrando después de que su cuenta se desactive |

El rol viaja en el token de acceso (`RN-AUTH-01`): mientras el token viva, el rol que lleva es el que se aplica y no existe un cambio de rol durante la sesión (`RN-CTX-06`). Una petición sin credencial no es un actor: no tiene identidad y recibe `401`.

## Reglas de negocio

| ID | Regla | Ejemplo |
|----|-------|---------|
| `RN-AUTH-01` | La sesión es el par (token de acceso, token de refresco): el acceso es de corta duración y viaja en `Authorization: Bearer`; el refresco es de larga duración y solo viaja en cookie `httpOnly` | Un inicio de sesión de `admin@sena.edu.co` emite el par; borrar solo la cookie del navegador no cierra la sesión |
| `RN-AUTH-02` | El token de refresco nunca viaja en el cuerpo: solo se entrega como cookie `httpOnly`, y una respuesta que lo incluya en el cuerpo es un defecto | La respuesta de `POST /api/auth/login` trae el token de acceso en el JSON y el de refresco solo en la cookie; ningún cuerpo de `login` ni de `refresh` lo contiene |
| `RN-AUTH-03` | Un correo inexistente, una contraseña incorrecta y una cuenta inactiva producen la misma respuesta observable | Las tres ramas responden `401 INVALID_CREDENTIALS` con «Credenciales inválidas»; distinguir una sola permite enumerar los correos registrados |
| `RN-AUTH-04` | El cierre de sesión invalida la credencial en el servidor: una copia capturada del token deja de servir, y borrar la cookie del navegador no es cerrar la sesión | Un refresco copiado a las 10:00 deja de renovar a las 10:05, después de que el usuario cierre sesión |
| `RN-AUTH-05` | Cada usuario tiene un identificador de sesión que viaja en el token y se verifica en cada petición; cerrar sesión, cambiar o restablecer la contraseña y desactivar la cuenta lo incrementan, con lo que todos los tokens emitidos antes dejan de valer | El cierre de sesión de las 10:05 incrementa el identificador y todo token emitido antes de esa hora deja de valer |
| `RN-AUTH-06` | El inicio de sesión admite 5 intentos fallidos por combinación de IP de origen y correo dentro de una ventana de 15 minutos, con espera progresiva y sin bloqueo de cuenta | `cmendoza@sena.edu.co` falla 5 veces desde `190.0.0.10` entre las 09:00 y las 09:05: el sexto intento se rechaza, el mismo correo entra desde `190.0.0.20` y a las 09:21 la combinación de `190.0.0.10` vuelve a entrar |
| `RN-AUTH-07` | La sesión dura una jornada de 8 horas: 15 minutos el token de acceso y 8 horas el de refresco, contadas de forma absoluta desde el inicio de sesión | Un inicio a las 08:00 con renovaciones a las 08:15, 12:00 y 15:00 se rechaza a las 16:01 y obliga a volver a entrar |
| `RN-AUTH-08` | El correo identifica la cuenta sin distinguir mayúsculas, y la conducta no depende de la colación de la base | `ADMIN@SENA.EDU.CO` inicia sesión como `admin@sena.edu.co` y no crea una segunda cuenta |
| `RN-USR-05` | Desactivar a un instructor le impide iniciar sesión, sin cancelar sus préstamos ni sus solicitudes en curso | Un instructor desactivado a las 10:00 no entra, y la sesión que ya tenía abierta deja de servir antes de que venza su token de acceso |
| `RN-USR-06` | Cambiar la propia contraseña cierra todas las sesiones del usuario, incluida la actual | `ltorres@misena.edu.co` cambia su contraseña a las 11:00 y el navegador donde lo hizo también tiene que volver a entrar |
| `RN-USR-07` | El restablecimiento de la contraseña por el administrador cierra todas las sesiones del instructor | `admin@sena.edu.co` restablece a las 14:00 la contraseña de `mgomez@misena.edu.co` y la sesión abierta de ese instructor deja de servir |
| `RN-CTX-05` | Dos actores y ninguno más: el administrador revisa, aprueba, verifica, empaca, entrega y recibe; el instructor solicita, recoge y devuelve; la acción administrativa es del administrador | Una escritura administrativa enviada con el token de `cmendoza@sena.edu.co` responde `403 FORBIDDEN` y no crea nada |
| `RN-CTX-06` | El modelo de un solo rol es suficiente y el administrador no crea solicitudes para sí mismo | `cmendoza@sena.edu.co` no puede convertirse en administrador durante la sesión: el rol del token es el que se aplica |
| `RN-CTX-01` | El sistema opera con el inventario real del Ambiente 104, así que los defectos de seguridad de este módulo son críticos | Una credencial que sigue sirviendo después de cerrar sesión es una brecha de producción, no un detalle cosmético |
| `Estándar` (invariantes técnicos) | Forma del `401`, coherencia de contratos entre endpoints, validación de entrada y permiso de escritura: ningún criterio de este módulo puede incumplirlos | `GET /api/auth/me` ubica al usuario en el mismo lugar del cuerpo que `POST /api/auth/login` |

## Historias de usuario

Los criterios nombran la clase de actor y de estado; los correos, contraseñas, IPs y horas concretas con las que se ejecutaron los escenarios están en el `Anexo — Datos de prueba`, al final del documento, y son ejemplos, no requisitos. Los usuarios del seed no los crea la aplicación: el primer administrador nace fuera de ella (`RN-USR-09`).

### US-AUTH-01 — Iniciar sesión con correo y contraseña

**Como** administrador o instructor **quiero** iniciar sesión con mi correo y mi contraseña **para** acceder a las funciones que corresponden a mi rol.

**Prioridad:** alta — sin sesión no existe ninguna otra función del sistema (`RN-CTX-05`).
**Estado:** implementada en su mayoría — 5 `OK`, 1 `GAP` (`DEF-AUTH-001`); `AC-AUTH-01-7` está sin ejecutar.

#### AC-AUTH-01-1 — Inicio de sesión exitoso

**Dado** un usuario activo.
**Cuando** envía `POST /api/auth/login` con su correo y su contraseña.
**Entonces**:

- la respuesta es 200 con éxito;
- el cuerpo contiene el usuario autenticado con su id, correo, nombre y rol;
- el cuerpo contiene un token de acceso no vacío;
- el cuerpo **no** contiene la contraseña ni su hash;
- el cuerpo **no** contiene el token de refresco;
- la respuesta entrega el token de refresco en una cookie `httpOnly`;
- la fecha de último ingreso del usuario queda registrada.

El criterio no fija el nombre de los campos ni la forma exacta del cuerpo. La cookie es `httpOnly`, `sameSite: strict` y `secure` solo en producción.

#### AC-AUTH-01-2 — Correo inexistente

**Cuando** se envía `POST /api/auth/login` con un correo que no pertenece a ningún usuario.
**Entonces**:

| Efecto | Resultado esperado |
|--------|--------------------|
| Estado y código | `401 INVALID_CREDENTIALS` |
| Mensaje | «Credenciales inválidas» |
| Cookie | ninguna |
| Datos | no se crea ni se modifica ningún usuario |

Un rechazo que dejara una cuenta creada o actualizada sería un alta o una reactivación encubierta.

#### AC-AUTH-01-3 — Contraseña incorrecta

**Dado** un usuario activo registrado.
**Cuando** se envía `POST /api/auth/login` con la contraseña equivocada.
**Entonces**:

- la respuesta es **idéntica** a la del escenario de correo inexistente: mismo estado, mismo código y mismo mensaje;
- no se emite ninguna cookie;
- la fecha de último ingreso **no** se modifica.

La afirmación del criterio es la igualdad con `AC-AUTH-01-2`, no un valor propio. La última condición prueba que un intento fallido no cuenta como ingreso.

#### AC-AUTH-01-4 — El correo no distingue mayúsculas

**Dado** un usuario activo registrado.
**Cuando** envía `POST /api/auth/login` con su correo escrito con otras mayúsculas y la contraseña correcta.
**Entonces** la respuesta es 200 con éxito.

Dos escrituras del mismo correo no son dos cuentas distintas y el inicio de sesión resuelve siempre la misma. **Hoy cumple gracias a la colación `utf8mb4_unicode_ci`**, no por normalización: la búsqueda es por coincidencia exacta y la validación no normaliza el correo. Un cambio de motor o de colación rompería la conducta sin que otra prueba lo anticipe.

#### AC-AUTH-01-5 — Cuenta inactiva

**Dado** un usuario con correo y contraseña correctos pero desactivado.
**Cuando** se envía `POST /api/auth/login`.
**Entonces**:

- la respuesta es idéntica a la de credenciales inválidas;
- no se emite ninguna cookie.

La cuenta **existe**, pero el intento de acceso no puede decirlo. Las tres ramas de `RN-AUTH-03` se leen juntas:

| Intento | Respuesta exigida |
|---------|-------------------|
| Correo que no existe | `401 INVALID_CREDENTIALS` / «Credenciales inválidas» |
| Contraseña incorrecta | Idéntica a la anterior |
| Cuenta desactivada | Idéntica a la anterior |

Hoy responde `401 USER_INACTIVE` con «Usuario inactivo», distinto de `INVALID_CREDENTIALS`, y permite confirmar que un correo existe: es `DEF-AUTH-001`.

#### AC-AUTH-01-6 — Cuerpo inválido

**Cuando** se envía `POST /api/auth/login` sin correo, o con un correo sin formato válido.
**Entonces**:

| Efecto | Resultado esperado |
|--------|--------------------|
| Estado y código | `400 VALIDATION_ERROR` |
| Detalle | la respuesta indica qué campos fallaron |
| Cookie | ninguna |
| Base de datos | no se intenta autenticar contra la base |

El rechazo de validación es una rama distinta del rechazo de credenciales: se corta antes de tocar los datos.

#### AC-AUTH-01-7 — Límite de intentos por origen, sin bloquear ninguna cuenta

**Dado** un usuario activo con la contraseña correcta.
**Cuando** su combinación de IP de origen y correo acumula intentos fallidos dentro de la ventana de 15 minutos.
**Entonces** cada escenario se comporta así:

| Escenario | Entrada | Resultado esperado |
|-----------|---------|--------------------|
| Superar el límite | 5 intentos fallidos desde un mismo origen contra ese correo dentro de una ventana de 15 minutos, y después otro intento con la contraseña correcta desde ese origen | rechazo **sin verificar la contraseña**, que no revela si la cuenta existe y sin cookie |
| La ventana pasa | la misma combinación de IP y correo, con la contraseña correcta, una vez transcurridos los 15 minutos | inicia sesión con éxito |
| Otro origen, misma cuenta | el mismo correo desde otro origen con la contraseña correcta | 200 con un token de acceso no vacío |
| Fallos fuera de la ventana | 5 intentos fallidos del mismo origen contra el mismo correo, separados más de 15 minutos entre sí, y después un intento correcto | 200 con un token de acceso no vacío |

Ninguna cuenta queda bloqueada en ningún escenario. Que el sexto intento lleve credenciales **válidas** es lo que vuelve observable que el rechazo no miró la contraseña. El código HTTP del rechazo no lo fija ninguna regla, porque el criterio todavía no se ha ejecutado. Hoy **no existe ningún límite**: no hay limitador montado ni la dependencia que lo aportaría, así que se pueden probar contraseñas sin restricción.

### US-AUTH-02 — Renovar la sesión sin volver a escribir la contraseña

**Como** instructor o administrador con una sesión iniciada **quiero** obtener un token de acceso nuevo cuando el mío vence **para** seguir trabajando sin escribir mi contraseña otra vez.

**Prioridad:** alta — sin renovación, el usuario tendría que escribir la contraseña otra vez cada 15 minutos de trabajo.
**Estado:** implementada en su mayoría — 4 `OK`, 1 `GAP` (`DEF-AUTH-002`); `AC-AUTH-02-6` está sin ejecutar.

La renovación existe porque las dos credenciales duran distinto: la que viaja en cada petición caduca rápido y la larga solo sirve para emitir un acceso nuevo. La renovación es además el único punto donde el sistema vuelve a mirar el estado de la cuenta (`RN-USR-05`).

#### AC-AUTH-02-1 — Renovación exitosa

**Dado** un inicio de sesión previo de un usuario activo.
**Cuando** se envía `POST /api/auth/refresh` con su cookie de refresco.
**Entonces**:

- la respuesta es 200 con éxito;
- el cuerpo contiene un token de acceso nuevo;
- el cuerpo **no** contiene el token de refresco;
- la respuesta reemite la cookie de refresco.

El criterio **no** exige que el valor reemitido sea distinto: afirmarlo convertiría la rotación real, que ninguna regla confirmada pide, en un requisito. Hoy el token reemitido es byte por byte idéntico al anterior dentro del mismo segundo —el JWT no lleva identificador único—, así que la rotación es aparente; no se declara defecto porque la rotación no está decidida.

#### AC-AUTH-02-2 — Sin token de refresco

**Cuando** se envía `POST /api/auth/refresh` sin cookie y sin token en el cuerpo.
**Entonces** la respuesta es `400 MISSING_TOKEN` y no se emite ninguna cookie.

#### AC-AUTH-02-3 — Token de refresco inválido o expirado

**Cuando** se envía `POST /api/auth/refresh` con un token firmado con otra clave.
**Entonces** la respuesta es `401 INVALID_TOKEN` y no se emite ninguna cookie.

Un token **expirado** cae en la misma rama y el criterio lo nombra en su título, sin exigir un código distinto: distinguir «vencido» de «falsificado» solo se exige donde el cliente lo necesita para decidir si renueva, y eso es `AC-AUTH-04-4`.

#### AC-AUTH-02-4 — Usuario desactivado después de iniciar sesión

**Dado** un usuario que inició sesión cuando estaba activo y que fue desactivado después.
**Cuando** intenta renovar su token de refresco.
**Entonces** la respuesta es `401` y no se emite ninguna cookie nueva.

Sin la segunda mitad, un rechazo podría reemitir la credencial y dejar la sesión viva. Hoy cumple: es la única verificación de estado en tiempo real del módulo.

#### AC-AUTH-02-5 — Tipo de dato inválido

**Cuando** se envía `POST /api/auth/refresh` con un cuerpo cuyo token es un número.
**Entonces** la respuesta es `400 VALIDATION_ERROR` y **no** se intenta verificar la firma.

«Tu petición está mal formada» no es «tu sesión es inválida y hay que volver a entrar». Hoy `/refresh` no valida el esquema: el valor llega a la verificación del token y responde `401 INVALID_TOKEN`. El esquema de validación existe en el código y nunca se usa (`DEF-AUTH-002`).

#### AC-AUTH-02-6 — La sesión dura una jornada: 8 horas de refresco y 15 minutos de acceso

**Dado** un inicio de sesión previo de un usuario activo.
**Cuando** se envía `POST /api/auth/refresh` con su cookie de refresco.
**Entonces** cada escenario se comporta así:

| Escenario | Entrada | Resultado esperado |
|-----------|---------|--------------------|
| Renovar dentro del plazo | token de refresco emitido hace menos de 8 horas desde el inicio de sesión | 200 con token de acceso nuevo y cookie de refresco reemitida |
| Renovar después de las 8 horas | token de refresco emitido hace más de 8 horas desde el inicio de sesión | `401`, sin cookie nueva, y el usuario tiene que iniciar sesión de nuevo |
| El uso no extiende la sesión | inicio de sesión seguido de renovaciones del acceso repartidas dentro de la jornada; renovación pedida justo después de cumplirse las 8 horas desde el inicio de sesión | `401`, sin cookie nueva, y el usuario tiene que iniciar sesión de nuevo |

El plazo de 15 minutos del token de acceso no tiene escenario propio: lo que el usuario observa es que la sesión se renueva sin volver a escribir la contraseña mientras el refresco viva, y que a las 8 horas hay que volver a entrar. El código del rechazo no lo fija ninguna regla.

El plazo es **absoluto desde el inicio de sesión**: renovar el token de acceso no corre la fecha de corte. Sin el tercer escenario, una implementación deslizante —que reemite un refresco de 8 horas en cada renovación— pasaría los dos primeros y la sesión podría durar indefinidamente en una máquina compartida del taller. La verificación puede leer el vencimiento del token emitido o adelantar el reloj del servidor: las dos observan lo mismo.

Hoy el acceso vive 15 minutos (coincide con la regla) y el refresco vive **7 días**: es la deuda de este criterio, sin resultado observado todavía.

### US-AUTH-03 — Cerrar la sesión

**Como** instructor o administrador con una sesión iniciada **quiero** cerrar mi sesión **para** que nadie pueda continuar usándola en este dispositivo.

**Prioridad:** alta — si cerrar sesión no cierra nada, la credencial de un dispositivo sigue sirviendo en otro.
**Estado:** implementada en su mayoría — 1 `OK`, 1 `GAP` (`DEF-AUTH-003`).

Cerrar la sesión es terminar **el par** de tokens, no solo olvidar una de sus mitades: eliminar la cookie es la mitad visible, e invalidar la credencial en el servidor es la que importa.

#### AC-AUTH-03-1 — Cierre de sesión

**Dado** un usuario con sesión iniciada.
**Cuando** se envía `POST /api/auth/logout`.
**Entonces** la respuesta es 200 y la cookie de refresco se elimina en el navegador.

El criterio no dice nada sobre el servidor: esa mitad es `AC-AUTH-03-2`.

#### AC-AUTH-03-2 — El token de refresco deja de servir

**Dado** un usuario que capturó su token de refresco antes de cerrar sesión.
**Cuando** cierra sesión y luego intenta renovar con ese token capturado.
**Entonces** la respuesta es `401`.

El mecanismo es un identificador de sesión por usuario que se incrementa al cerrar sesión; el criterio no fija cómo se guarda ni se consulta. Hoy el cierre de sesión **solo borra la cookie en el cliente**: no hay registro de revocación, y la credencial capturada sigue siendo válida hasta su vencimiento (hoy 7 días en el código) — `DEF-AUTH-003`.

### US-AUTH-04 — Consultar el perfil propio

**Como** instructor o administrador con una sesión iniciada **quiero** obtener mis propios datos **para** mostrarlos en la interfaz y saber con qué rol estoy trabajando.

**Prioridad:** media — es cómo la interfaz sabe con qué rol se está trabajando; no bloquea la operación.
**Estado:** implementada en parte — 2 `OK`, 3 `GAP` (`DEF-AUTH-004`, `DEF-AUTH-005`, `DEF-AUTH-006`).

#### AC-AUTH-04-1 — Contrato idéntico al del inicio de sesión

**Dado** un usuario con sesión iniciada.
**Cuando** envía `GET /api/auth/me` con su token de acceso.
**Entonces**:

- la respuesta es 200;
- los datos del usuario están en el mismo lugar del cuerpo que en la respuesta de inicio de sesión;
- el cuerpo **no** contiene la contraseña ni su hash.

El cliente no puede tener una ruta de lectura para `login` y otra para `me`. El criterio no fija el nombre del campo contenedor: exige que sea el mismo en las dos respuestas. Hoy no lo es —`login` anida el usuario en `data.user` y `me` lo coloca directamente en `data`—, y los tests existentes fijan esa inconsistencia (`DEF-AUTH-004`).

#### AC-AUTH-04-2 — Sin token

**Cuando** se envía `GET /api/auth/me` sin cabecera `Authorization`.
**Entonces** la respuesta es `401` y el cuerpo no revela ningún dato de usuario.

Un `401` que igual filtrara el correo entregaría la información que el rechazo debía proteger.

#### AC-AUTH-04-3 — Token falsificado

**Cuando** se envía `GET /api/auth/me` con un Bearer firmado con otra clave.
**Entonces** la respuesta es `401`.

Es la misma verificación de `AC-AUTH-02-3` aplicada al token de acceso.

#### AC-AUTH-04-4 — Token expirado

**Cuando** se envía `GET /api/auth/me` con un token de acceso ya vencido.
**Entonces**:

| Efecto | Resultado esperado |
|--------|--------------------|
| Estado | `401` |
| Código | `TOKEN_EXPIRED`, que distingue «renovar la sesión» de «credenciales inválidas» |

El cliente necesita esa distinción para decidir si renueva, porque un vencimiento normal no es un motivo para expulsar al usuario. Hoy el token vencido cae en el mismo caso que el falsificado y responde `UNAUTHORIZED` con «Token inválido o expirado» (`DEF-AUTH-005`).

#### AC-AUTH-04-5 — Cuenta desactivada con token vigente

**Dado** un usuario que obtuvo un token de acceso estando activo y que fue desactivado después.
**Cuando** consulta `GET /api/auth/me` con ese token.
**Entonces** la respuesta es `401`.

La ventana de 15 minutos hasta el vencimiento del token no es aceptable: en ese tiempo el usuario desactivado sigue consultando datos del sistema. El criterio no fija cómo se verifica el estado de la cuenta. Hoy solo se comprueba que el usuario exista y la autenticación confía en el contenido del token sin consultar la base, así que desactivar una cuenta **no le corta el acceso** hasta que venza su token de acceso, y su rol también queda congelado (`DEF-AUTH-006`).

### US-AUTH-05 — Impedir que un instructor ejecute acciones administrativas

**Como** administrador del almacén **quiero** que una acción administrativa sea inaccesible para un instructor **para** que el inventario y los usuarios solo los modifique quien debe.

**Prioridad:** alta — es el límite que separa al instructor que solicita del administrador que escribe el inventario.
**Estado:** implementada — 2 `OK`, 0 `GAP`.

El reparto de `RN-CTX-05` no es una jerarquía de pantallas: la acción administrativa —cualquier escritura sobre usuarios, ítems, ambientes, categorías o inventario— es del administrador, y el instructor que la intenta recibe un rechazo sin efectos. `401` y `403` son las dos únicas respuestas que expresan el reparto: sin credencial, `401`; con credencial válida pero sin permiso, `403`.

#### AC-AUTH-05-1 — Instructor en una acción administrativa

**Dado** un instructor con sesión iniciada.
**Cuando** envía una petición de escritura a un endpoint reservado al administrador.
**Entonces**:

- la respuesta es `403 FORBIDDEN`;
- no se crea ni modifica ningún registro.

El criterio no enumera los endpoints uno por uno —eso pertenece a cada epic de dominio— y conserva `FORBIDDEN` como código; el endpoint concreto con el que se ejecutó es dato de prueba (anexo).

#### AC-AUTH-05-2 — Endpoint protegido sin sesión

**Cuando** se envía una petición sin token a un endpoint que exige autenticación.
**Entonces**:

- la respuesta es `401 UNAUTHORIZED`;
- no se ejecuta ninguna operación sobre datos.

Ninguna regla fija el mensaje ni la forma del cuerpo; el endpoint concreto con el que se ejecutó es dato de prueba (anexo).

## Errores y mensajes

| Situación | HTTP | Código | Mensaje |
|-----------|------|--------|---------|
| Correo que no pertenece a ninguna cuenta | 401 | `INVALID_CREDENTIALS` | «Credenciales inválidas» |
| Contraseña incorrecta | 401 | `INVALID_CREDENTIALS` | «Credenciales inválidas», idéntico al anterior |
| Cuenta desactivada | 401 | `INVALID_CREDENTIALS` | «Credenciales inválidas», idéntico a los dos anteriores. Hoy: `USER_INACTIVE` / «Usuario inactivo» (`DEF-AUTH-001`) |
| Cuerpo de inicio de sesión inválido (sin correo o correo sin formato) | 400 | `VALIDATION_ERROR` | Detalla los campos fallidos; el texto no lo fija ninguna regla |
| Combinación de IP y correo con 5 fallos en 15 minutos | No lo fija ninguna regla | No lo fija ninguna regla | No debe revelar si la cuenta existe; sin cookie |
| Renovación sin credencial | 400 | `MISSING_TOKEN` | No lo fija ninguna regla |
| Renovación con token firmado con otra clave o vencido | 401 | `INVALID_TOKEN` | No lo fija ninguna regla |
| Renovación de una cuenta desactivada | 401 | No lo fija ninguna regla | No lo fija ninguna regla; sin cookie nueva |
| Renovación con token de tipo incorrecto | 400 | `VALIDATION_ERROR` | No lo fija ninguna regla. Hoy: 401 `INVALID_TOKEN` (`DEF-AUTH-002`) |
| Renovación después de las 8 horas del inicio de sesión | 401 | No lo fija ninguna regla | No lo fija ninguna regla; sin cookie nueva |
| Perfil sin cabecera `Authorization` | 401 | No lo fija ninguna regla (hoy `UNAUTHORIZED`) | El cuerpo no revela ningún dato del usuario |
| Perfil con token firmado con otra clave | 401 | No lo fija ninguna regla | No lo fija ninguna regla |
| Perfil con token vencido | 401 | `TOKEN_EXPIRED` | Debe distinguir «renovar la sesión» de «credenciales inválidas». Hoy: `UNAUTHORIZED` / «Token inválido o expirado» (`DEF-AUTH-005`) |
| Perfil de una cuenta desactivada con token vigente | 401 | No lo fija ninguna regla | No lo fija ninguna regla |
| Escritura administrativa con sesión de instructor | 403 | `FORBIDDEN` | No lo fija ninguna regla; sin efectos |
| Endpoint protegido sin token | 401 | `UNAUTHORIZED` | No lo fija ninguna regla; sin efectos sobre datos |

## Sesión y seguridad

| Parámetro | Valor | Detalle |
|-----------|-------|---------|
| Token de acceso | 15 minutos | Viaja en el cuerpo de `login` y `refresh` y se envía en `Authorization: Bearer`; al vencer, el cliente renueva con el refresco |
| Token de refresco | 8 horas, absolutas desde el inicio de sesión | Solo cookie `httpOnly`, `sameSite: strict`, `secure` solo en producción; renovar el acceso **no** corre el corte |
| Sesión | El par (acceso, refresco): una jornada de 8 horas | Pasado el plazo hay que volver a iniciar sesión, aunque se haya usado la aplicación sin interrupción |
| Límite de intentos | 5 fallos por combinación de IP de origen y correo en una ventana de 15 minutos, con espera progresiva | Sin bloqueo de cuenta: superar el límite nunca deja a un usuario sin poder entrar |
| Cierre de sesión | Incrementa el identificador de sesión en el servidor | El token capturado deja de renovar (`401`); borrar la cookie del navegador no es cerrar la sesión |
| Cambio de la propia contraseña (`RN-USR-06`) | Cierra todas las sesiones del usuario, incluida la actual | Después del cambio hay que volver a iniciar sesión |
| Restablecimiento por el administrador (`RN-USR-07`) | Cierra todas las sesiones del instructor | El mecanismo es el mismo de `RN-AUTH-05` |
| Desactivación de la cuenta (`RN-USR-05`) | Corta el acceso sin ventana | La renovación responde `401` (`AC-AUTH-02-4`) y el perfil también (`AC-AUTH-04-5`) |
| Vencimiento de las 8 horas | Cierra la sesión | A las 8 horas del inicio de sesión hay que volver a iniciar sesión, se haya usado la aplicación o no |
| Valores en el código hoy | Acceso: 15 minutos; refresco: 7 días | El acceso coincide con la regla; el refresco es la deuda de `AC-AUTH-02-6` |

## Decisiones tomadas

| Decisión | Regla | Responde a |
|----------|-------|------------|
| La sesión es el par de los dos tokens y cerrarla exige terminarla en el servidor, no solo borrar la cookie | `RN-AUTH-04` | `OPEN-AUTH-04` |
| Un solo mecanismo de revocación: identificador de sesión por usuario verificado en cada petición | `RN-AUTH-05` | `OPEN-AUTH-04` |
| Frente a la fuerza bruta, límite por origen con espera progresiva; **no** hay bloqueo de cuenta, porque cualquiera podría bloquear la cuenta de otro | `RN-AUTH-06` | `OPEN-AUTH-01` |
| Parámetros del límite: 5 intentos fallidos por IP de origen y correo, en una ventana de 15 minutos | `RN-AUTH-06` | `OPEN-AUTH-07` |
| La sesión dura una jornada: 15 minutos el acceso y 8 horas el refresco, en lugar de los 7 días heredados de la biblioteca | `RN-AUTH-07` | `OPEN-AUTH-02` |
| El plazo de las 8 horas es absoluto desde el inicio de sesión y no se extiende con el uso | `RN-AUTH-07` | `OPEN-AUTH-08` |
| Desactivar corta el acceso de inmediato: no hay ventana que aceptar | `RN-USR-05` | `OPEN-AUTH-03` |
| Cambiar la propia contraseña cierra todas las sesiones, incluida la actual | `RN-USR-06` | `OPEN-USR-01` |
| El restablecimiento por el administrador cierra todas las sesiones del instructor | `RN-USR-07` | — |
| No hay recuperación de contraseña por correo: el administrador fija la nueva | `RN-USR-03` | `OPEN-AUTH-05` |
| El correo identifica la cuenta sin distinguir mayúsculas, sin depender de la colación de la base | `RN-AUTH-08` | — |
| Dos actores y ninguno más; la acción administrativa es del administrador | `RN-CTX-05` | `OPEN-AUTH-06` |

Sin decisión todavía: la **rotación real** del token de refresco. Nadie ha definido si el valor reemitido debe cambiar, y `RN-AUTH-04` y `RN-AUTH-05` resuelven la invalidación, no la rotación.

## Trazabilidad y estado

Un criterio se marca `OK` o `GAP` **solo** cuando su test corre, nunca por lectura del código.

| Criterio | Regla | Estado hoy |
|----------|-------|------------|
| `AC-AUTH-01-1` | `RN-AUTH-02` | `OK` |
| `AC-AUTH-01-2` | `RN-AUTH-03` | `OK` |
| `AC-AUTH-01-3` | `RN-AUTH-03` | `OK` |
| `AC-AUTH-01-4` | `RN-AUTH-08` | `OK` |
| `AC-AUTH-01-5` | `RN-AUTH-03` | `GAP` — `DEF-AUTH-001` |
| `AC-AUTH-01-6` | `Estándar` | `OK` |
| `AC-AUTH-01-7` | `RN-AUTH-06` | Sin ejecutar |
| `AC-AUTH-02-1` | `RN-AUTH-02` | `OK` |
| `AC-AUTH-02-2` | `Estándar` | `OK` |
| `AC-AUTH-02-3` | `Estándar` | `OK` |
| `AC-AUTH-02-4` | `RN-USR-05` | `OK` |
| `AC-AUTH-02-5` | `Estándar` | `GAP` — `DEF-AUTH-002` |
| `AC-AUTH-02-6` | `RN-AUTH-07` | Sin ejecutar |
| `AC-AUTH-03-1` | `RN-AUTH-01` | `OK` |
| `AC-AUTH-03-2` | `RN-AUTH-04` | `GAP` — `DEF-AUTH-003` |
| `AC-AUTH-04-1` | `Estándar` | `GAP` — `DEF-AUTH-004` |
| `AC-AUTH-04-2` | `Estándar` | `OK` |
| `AC-AUTH-04-3` | `Estándar` | `OK` |
| `AC-AUTH-04-4` | `Estándar` | `GAP` — `DEF-AUTH-005` |
| `AC-AUTH-04-5` | `RN-USR-05` | `GAP` — `DEF-AUTH-006` |
| `AC-AUTH-05-1` | `RN-CTX-05` | `OK` |
| `AC-AUTH-05-2` | `Estándar` | `OK` |

Totales: **22 criterios, 14 `OK`, 6 `GAP`, 2 sin ejecutar**. Los dos sin ejecutar quedarán `FALTA` —trabajo pendiente de implementación, no defecto— cuando se ejecuten: no hay ningún limitador de intentos y el refresco vive 7 días en lugar de 8 horas.

### Defectos

| ID | Criterio | Qué diverge | Evidencia |
|----|----------|-------------|-----------|
| `DEF-AUTH-001` | `AC-AUTH-01-5` | La cuenta inactiva responde `USER_INACTIVE` / «Usuario inactivo», distinto de `INVALID_CREDENTIALS` / «Credenciales inválidas» | `auth.service.js:27-29` |
| `DEF-AUTH-002` | `AC-AUTH-02-5` | `/refresh` no valida el esquema del cuerpo: un token de tipo numérico responde 401 en lugar de 400, y el esquema de validación es código muerto | `auth.routes.js:10`, `auth.validation.js:8-10` |
| `DEF-AUTH-003` | `AC-AUTH-03-2` | El cierre de sesión no invalida el token de refresco en el servidor: solo borra la cookie del cliente | `auth.controller.js:39-42` |
| `DEF-AUTH-004` | `AC-AUTH-04-1` | `login` anida el usuario en `data.user` y `me` lo coloca directo en `data` | `auth.controller.js:20` frente a `:46`; `auth.test.js:33,62` |
| `DEF-AUTH-005` | `AC-AUTH-04-4` | Un token vencido responde el mismo código que uno falsificado | `middlewares/auth.js:19-25` |
| `DEF-AUTH-006` | `AC-AUTH-04-5` | `GET /me` no verifica el estado de la cuenta y la autenticación confía en el contenido del token | `auth.service.js:81-85`, `middlewares/auth.js:16-17` |

### Riesgos sin criterio de aceptación

Son defectos reales que un test HTTP no prueba. Todos tienen severidad crítica (`RN-CTX-01`).

| ID | Hallazgo | Evidencia |
|----|----------|-----------|
| `RISK-AUTH-01` | Claves de firma con valor por defecto si faltan las variables de entorno: cualquiera que conozca el repositorio puede firmar tokens válidos; el arranque debería abortar | `server/src/config/env.js:16-17` |
| `RISK-AUTH-02` | Sin límite de intentos de inicio de sesión: no hay protección de fuerza bruta. La política ya está decidida por `RN-AUTH-06` y falta implementarla (`AC-AUTH-01-7`) | `server/src/app.js:57-67` |
| `RISK-AUTH-03` | `POST /logout` no exige autenticación y siempre responde 200 | `server/src/routes/auth.routes.js:11` |
| `RISK-AUTH-04` | Cookie `secure` desactivada fuera de producción, y `sameSite: strict` dificulta los flujos con frontend en otro origen si se despliega separado | `auth.controller.js:6-11` |
| `RISK-AUTH-05` | Las contraseñas del seed son públicas: `Instructor2024` para todos los instructores, escrita en `AGENTS.md`, que está versionado. Hay que cambiarlas antes de desplegar | `AGENTS.md` §4 — credenciales de prueba |

## Anexo — Datos de prueba

Los valores de esta tabla son **ejemplos**: no son requisitos y QA elige los suyos. Los criterios fijan la clase de actor, la de estado y los límites de la regla; estos datos solo registran con qué se ejecutaron las pruebas del módulo.

| Dato | Valor usado |
|------|-------------|
| Administrador del seed | `admin@sena.edu.co` / `AdminSENA2024` |
| Instructor del seed usado en `AC-AUTH-01-7` | `cmendoza@sena.edu.co` / `Instructor2024` |
| Otros instructores citados en las reglas | `mgomez@misena.edu.co` y `ltorres@misena.edu.co` / `Instructor2024` |
| Variante en mayúsculas usada en `AC-AUTH-01-4` | `ADMIN@SENA.EDU.CO` |
| Origen de los intentos fallidos de `AC-AUTH-01-7` | `190.0.0.10` |
| Origen alterno de `AC-AUTH-01-7` | `190.0.0.20` |
| Horas del tercer escenario de `AC-AUTH-02-6` | inicio 08:00; renovaciones del acceso a las 08:15, 12:00 y 15:00; renovación pedida a las 16:01 |
| Escritura administrativa usada en `AC-AUTH-05-1` | `POST /api/users` |
| Endpoint protegido usado en `AC-AUTH-05-2` | `GET /api/users` |
