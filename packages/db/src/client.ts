import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Drizzle ORM instance connected via DATABASE_URL.
 * Used in Server Components and Server Actions.
 */
function createDb() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is not set");
  }
  const sql = postgres(connectionString);
  return drizzle(sql);
}

let _db: ReturnType<typeof createDb> | null = null;

export function getDb() {
  if (!_db) {
    _db = createDb();
  }
  return _db;
}

export { _db as db };

/**
 * Supabase client with service_role key.
 * Used ONLY for:
 * - Tenant creation (before user has a tenant_id in JWT)
 * - Migration scripts
 * - Background jobs
 * NEVER in user-facing API handlers or Server Actions.
 */
export function createSupabaseServiceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set"
    );
  }
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
