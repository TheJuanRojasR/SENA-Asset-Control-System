import { z } from 'zod';

/**
 * RN-PRE-04 / RN-PRE-10: la devolución es de unidades concretas (por serial) y cada una
 * lleva su condición de retorno obligatoria, con dos ejes cerrados y una descripción libre.
 * `requestId` es opcional pero, si viene, permite validar que la unidad pertenece a esa
 * solicitud (invariante de AC-PRE-02-5).
 */
export const returnUnitsSchema = z.object({
  requestId: z.number().int().positive().optional(),
  returns: z
    .array(
      z.object({
        serialNumber: z.string().min(1, 'El número de serie es obligatorio'),
        functioning: z.enum(['FUNCIONA', 'FUNCIONA_CON_FALLA', 'NO_FUNCIONA'], {
          errorMap: () => ({
            message: 'La condición de retorno (funcionamiento) es obligatoria',
          }),
        }),
        damageState: z.enum(['SIN_DANO', 'DESGASTE_NORMAL', 'DANADO'], {
          errorMap: () => ({
            message: 'La condición de retorno (estado al devolver) es obligatoria',
          }),
        }),
        description: z.string().optional(),
      })
    )
    .min(1, 'Debe indicar al menos una unidad'),
});

export const damageTaskIdParamSchema = z.object({
  id: z.coerce.number().int().positive('ID inválido'),
});

export const listDamageTasksQuerySchema = z.object({
  status: z.enum(['OPEN', 'RESOLVED']).optional(),
  inventoryUnitId: z.coerce.number().int().positive().optional(),
  // RN-MOV-02: filtro por tipo de movimiento. El historial de este módulo expone las
  // devoluciones (RETURN); cualquier otro tipo devuelve vacío.
  movementType: z.enum(['RETURN', 'LOAN', 'DISPOSAL']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const resolveDamageTaskSchema = z.object({
  resolutionNote: z.string().optional(),
});

export const declareLossSchema = z.object({
  serialNumber: z.string().min(1, 'El número de serie es obligatorio'),
  reason: z.string().min(1, 'El motivo de la pérdida es obligatorio'),
  requestId: z.number().int().positive().optional(),
});

export const listReturnsQuerySchema = z.object({
  serialNumber: z.string().optional(),
  itemId: z.coerce.number().int().positive().optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  // RN-MOV-02: filtro por tipo de movimiento. El historial de este módulo expone las
  // devoluciones (RETURN); cualquier otro tipo devuelve vacío.
  movementType: z.enum(['RETURN', 'LOAN', 'DISPOSAL']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
