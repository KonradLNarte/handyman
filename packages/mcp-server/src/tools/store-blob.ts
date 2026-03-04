/**
 * store_blob / get_blob tools — local filesystem blob storage.
 * [FEEDBACK:gen1-impl] Uses local filesystem, not external object storage.
 */
import type { PGlite } from '../db/connection.js';
import type { AuthContext } from '../auth/context.js';
import { StoreBlobParams, GetBlobParams } from './schemas.js';
import { generateUUIDv7 } from '../db/uuid.js';
import { McpError } from '../errors.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

const BLOB_DIR = path.resolve('./data/blobs');

function ensureBlobDir() {
  if (!fs.existsSync(BLOB_DIR)) {
    fs.mkdirSync(BLOB_DIR, { recursive: true });
  }
}

export async function storeBlob(
  db: PGlite,
  auth: AuthContext,
  rawParams: unknown,
) {
  const params = StoreBlobParams.parse(rawParams);
  const tenantId = auth.resolveTenantId(params.tenant_id);
  auth.checkScope(`tenant:${tenantId}:write`);

  const actorId = await auth.getActorForTenant(tenantId);
  const blobId = generateUUIDv7();
  const eventId = generateUUIDv7();
  const now = new Date().toISOString();

  // Decode and store
  const buffer = Buffer.from(params.data_base64, 'base64');
  const sizeBytes = buffer.length;

  ensureBlobDir();
  const storageRef = path.join(BLOB_DIR, blobId);
  fs.writeFileSync(storageRef, buffer);

  // Atomic event + blob row
  await db.query('BEGIN');
  try {
    const relatedId = params.related_entity_id ?? null;
    const nodeIdsArray = relatedId ? [relatedId] : [];

    await db.query(
      `INSERT INTO events (event_id, tenant_id, intent_type, payload,
                          stream_id, node_ids, occurred_at, recorded_at, created_by)
       VALUES ($1, $2, 'blob_stored', $3, $4, $5, $6, $6, $7)`,
      [
        eventId,
        tenantId,
        JSON.stringify({
          blob_id: blobId,
          content_type: params.content_type,
          size_bytes: sizeBytes,
          storage_ref: storageRef,
          related_entity_id: relatedId,
        }),
        relatedId,
        nodeIdsArray,
        now,
        actorId,
      ],
    );

    await db.query(
      `INSERT INTO blobs (blob_id, tenant_id, content_type, storage_ref,
                         size_bytes, node_id, created_at, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        blobId,
        tenantId,
        params.content_type,
        storageRef,
        sizeBytes,
        params.related_entity_id ?? null,
        now,
        actorId,
      ],
    );

    await db.query('COMMIT');
  } catch (e) {
    await db.query('ROLLBACK');
    // Clean up file on failure
    try { fs.unlinkSync(storageRef); } catch {}
    throw e;
  }

  return {
    blob_id: blobId,
    content_type: params.content_type,
    size_bytes: sizeBytes,
    event_id: eventId,
  };
}

export async function getBlob(
  db: PGlite,
  auth: AuthContext,
  rawParams: unknown,
) {
  const params = GetBlobParams.parse(rawParams);

  const result = await db.query<{
    blob_id: string;
    tenant_id: string;
    content_type: string;
    storage_ref: string;
    size_bytes: number;
  }>(
    `SELECT blob_id, tenant_id, content_type, storage_ref, size_bytes
     FROM blobs WHERE blob_id = $1`,
    [params.blob_id],
  );

  if (result.rows.length === 0) {
    throw McpError.notFound('blob', params.blob_id);
  }

  const blob = result.rows[0]!;
  auth.checkScope(`tenant:${blob.tenant_id}:read`);

  if (!fs.existsSync(blob.storage_ref)) {
    throw McpError.internalError('Blob file missing from storage');
  }

  const buffer = fs.readFileSync(blob.storage_ref);
  const dataBase64 = buffer.toString('base64');

  return {
    blob_id: blob.blob_id,
    content_type: blob.content_type,
    size_bytes: blob.size_bytes,
    data_base64: dataBase64,
  };
}
