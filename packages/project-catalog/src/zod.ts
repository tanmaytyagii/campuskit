/**
 * The only place this package imports Zod.
 *
 * Zod normally speeds up validation by generating code with `new Function`,
 * which a strict Content Security Policy (like the CampusKit website's)
 * forbids, and even probing for it is reported as a violation. Jitless mode
 * validates exactly the same rules without generating code. Every schema
 * imports `z` from this module, so the setting is always applied before a
 * schema is created. package.json lists this file under `sideEffects` so
 * bundlers keep the `z.config()` call instead of importing Zod directly.
 */
import { z } from 'zod';

z.config({ jitless: true });

export { z };
