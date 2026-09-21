import { z } from '@hono/zod-openapi';

function toBoolInt(v: unknown): unknown {
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (v === 'true') return 1;
  if (v === 'false') return 0;
  return v;
}

// Input: accetta bool, string "true"/"false", o number → salva come 0/1 nel DB
export const boolIntIn = z.preprocess(toBoolInt, z.number());

export const boolIntInOptional = z.preprocess(
  (v) => (v === undefined ? undefined : toBoolInt(v)),
  z.number().optional(),
);

// Output: legge 0/1 dal DB → restituisce true/false nella response
export const boolIntOut = z.preprocess(
  (v) => (typeof v === 'number' ? v === 1 : v),
  z.boolean(),
);
