import { z } from 'zod';

export const returnUnitsSchema = z.object({
  unitIds: z.array(z.number().int().positive()).min(1),
  physicalStateReturned: z.enum(['GOOD', 'REGULAR', 'DAMAGED', 'DISPOSED']).optional(),
});
