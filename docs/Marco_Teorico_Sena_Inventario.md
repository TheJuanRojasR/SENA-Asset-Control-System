# SENA Asset Control System

## Objetivo General

Desarrollar una aplicación web que centralice y automatice la gestión de inventario y solicitudes de equipos del Ambiente 104 del SENA Quiriguá, garantizando trazabilidad completa de los procesos, reduciendo en al menos un 70% los errores asociados a solicitudes informales y disminuyendo los tiempos de administración, con entrega funcional en un plazo de seis (6) meses.

## Específicos

- Diseñar un catálogo interactivo con funcionalidades de búsqueda, filtrado y selección de equipos, que permita a los instructores realizar reservas de manera ordenada y trazable antes de la entrega física del equipo.

- Desarrollar un panel de administración de inventario que permita crear, modificar, dar de baja y consultar equipos.

- Desarrollar un buzón o contenedor de solicitudes donde se registren, organicen y gestionen todas las solicitudes de equipos, permitiendo aprobar o rechazar solicitudes con registro de auditoría y estados definidos (Pendiente, Aprobada, Rechazada, Entregada, Devuelta).

- Implementar la sincronización en tiempo real del inventario disponible, de forma que después de cada solicitud aprobada o devolución registrada, el sistema actualice automáticamente la disponibilidad visible para todos los usuarios.

- Incorporar un sistema de notificaciones automáticas por correo electrónico y/o notificaciones en plataforma para los siguientes eventos: nueva solicitud recibida, aprobación o rechazo de solicitud, vencimiento de plazo de entrega y confirmación de devolución de equipo.

## Planteamiento del Problema

El Ambiente 104 del SENA Quiriguá gestiona actualmente el préstamo y control de equipos tecnológicos a través de canales informales como mensajes de texto, comunicación verbal directa y registros manuales en papel. Esta situación genera una ausencia total de trazabilidad sobre el estado de los equipos, los responsables de cada préstamo y el historial de solicitudes realizadas.

Las consecuencias directas de esta problemática se manifiestan en tres dimensiones principales:

- Errores operativos: las solicitudes realizadas de manera informal generan duplicaciones, malentendidos y pérdida de información, lo que obliga al encargado del ambiente a invertir tiempo adicional en verificación y corrección.

- Baja visibilidad del inventario: no existe un mecanismo que permita consultar en tiempo real qué equipos están disponibles, cuáles están prestados y cuándo serán devueltos, lo que impide una planificación eficiente de los recursos.

- Ausencia de registros históricos: la falta de datos consolidados impide generar reportes de uso, identificar equipos con mayor demanda o deterioro, y tomar decisiones informadas sobre la administración del ambiente.

- Esta situación afecta principalmente a dos actores: el encargado del Ambiente 104, quien debe gestionar manualmente cada solicitud sin herramientas adecuadas, y los instructores solicitantes, quienes no tienen visibilidad del estado de sus peticiones ni de la disponibilidad real del inventario.

## Pregunta Problema

¿De qué manera el desarrollo de una aplicación web puede centralizar la administración del inventario y las solicitudes de equipos del Ambiente 104 del SENA Quiriguá, reduciendo los errores operativos y optimizando los tiempos de respuesta para instructores y el encargado del ambiente?

## Alcance del Proyecto

El sistema será desarrollado como una aplicación web orientada a dos perfiles de usuario: el encargado del Ambiente 104 (rol administrador) y los instructores del SENA Quiriguá (rol solicitante). A continuación, se detallan los límites funcionales del proyecto:

- ### Dentro del Alcance
  - Módulo de catálogo y selección de equipos con búsqueda y filtrado para instructores.

  - Módulo de administración de inventario: altas, bajas, modificaciones y consulta de equipos.

  - Módulo de gestión de usuarios: creación, edición, activación/desactivación y asignación de roles.

  - Módulo de buzón de solicitudes, donde se centralizan, organizan y gestionan todas las solicitudes con seguimiento de su ciclo de vida.

  - Sincronización en tiempo real de la disponibilidad del inventario tras cada transacción.

  - Sistema de notificaciones automáticas por eventos clave del proceso.

  - Registro de auditoría con historial completo de acciones por usuario.

  - Panel de reportes básicos: equipos más solicitados, historial por instructor, tasa de disponibilidad.

- ### Fuera del Alcance
  - Integración con sistemas externos del SENA (Sofía Plus u otros sistemas institucionales).
  - Gestión financiera, de compras o adquisición de nuevos equipos.
  - Soporte simultáneo para múltiples ambientes o sedes del SENA.
  - Desarrollo de aplicación móvil nativa (iOS o Android).
  - Gestión de recursos humanos o nómina del personal del ambiente.

## Justificación

La implementación de un sistema web de gestión para el Ambiente 104 responde a una necesidad operativa concreta: eliminar la dependencia de canales informales que generan errores, pérdida de información y tiempos de respuesta inadecuados. Los principales beneficiarios serán los instructores que realizan solicitudes periódicas y el encargado del ambiente, quien podrá reducir significativamente el tiempo invertido en verificación y coordinación manual.

Una aplicación web fue seleccionada frente a alternativas como hojas de cálculo compartidas, formularios estáticos o aplicaciones de mensajería, por las siguientes razones:

- Control de acceso por roles diferenciados (administrador y solicitante), garantizando que cada usuario opere únicamente dentro de sus permisos.

- Trazabilidad automática de cada acción realizada sobre el inventario, usuarios o las solicitudes, sin depender de la disciplina manual de los usuarios.

- Disponibilidad desde cualquier dispositivo con navegador web y conexión a internet, sin necesidad de instalación de software adicional.

- Escalabilidad futura para incorporar nuevas funcionalidades o extender el sistema a otros ambientes del SENA Quiriguá.

Este proyecto contribuirá directamente a la mejora de la calidad del servicio educativo del SENA Quiriguá, al optimizar el uso de los recursos tecnológicos disponibles y facilitar la labor docente de los instructores a través de procesos más ágiles, transparentes y confiables.
