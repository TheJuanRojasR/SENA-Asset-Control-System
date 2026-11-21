# Carrito y reserva de stock — decisión vigente

> **Documento reducido.** La versión anterior (julio de 2026) proponía reservar stock al
> agregar al carrito. Esa propuesta **fue rechazada** por el negocio y hoy induciría a
> implementar lo contrario de lo especificado. El contenido original queda en la historia de
> git de este archivo.

## Lo que rige hoy

- El carrito vive **solo en el navegador**: no es estado del servidor y no compromete
  disponibilidad (`RN-PAN-01`).
- La reserva **nace al crear la solicitud**, no al agregar al carrito (`RN-NEG-03`).
- La disponibilidad se consulta por rango de fechas y el catálogo la informa; el cálculo está
  especificado en [`user-stories/08-catalogo.md`](user-stories/08-catalogo.md).
- El ciclo de la solicitud, incluida la entrega parcial y el cierre, está en
  [`user-stories/06-solicitudes.md`](user-stories/06-solicitudes.md).

Si necesitas volver a la propuesta original: `git log -- docs/mejoras-carrito.md`.
