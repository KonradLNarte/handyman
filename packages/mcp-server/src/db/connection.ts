/**
 * PGlite connection — PostgreSQL in WASM, zero external dependencies.
 * [FEEDBACK:gen1-impl] No RLS support — tenant isolation is application-level only.
 */
import { PGlite } from '@electric-sql/pglite';
import { vector } from '@electric-sql/pglite/vector';

let instance: PGlite | null = null;

export interface DatabaseOptions {
  dataDir?: string; // undefined = in-memory
}

export async function createDatabase(
  options: DatabaseOptions = {},
): Promise<PGlite> {
  const db = new PGlite({
    dataDir: options.dataDir,
    extensions: { vector },
  });

  await db.waitReady;
  return db;
}

export async function getDatabase(
  options?: DatabaseOptions,
): Promise<PGlite> {
  if (!instance) {
    instance = await createDatabase(options);
  }
  return instance;
}

export async function closeDatabase(): Promise<void> {
  if (instance) {
    await instance.close();
    instance = null;
  }
}

export type { PGlite };
