import type { StorageAdapter } from "../types.js";

export class SupabaseStorageAdapter implements StorageAdapter {
  private baseUrl: string;
  private accessToken: string;

  constructor(config: { baseUrl: string; accessToken: string }) {
    this.baseUrl = config.baseUrl;
    this.accessToken = config.accessToken;
  }

  async upload(bucket: string, path: string, data: Buffer, contentType: string): Promise<{ key: string }> {
    const res = await fetch(`${this.baseUrl}/storage/v1/object/${bucket}/${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": contentType,
      },
      body: new Uint8Array(data),
    });
    const result = await res.json() as any;
    return { key: result.Key };
  }

  async getSignedUrl(bucket: string, path: string, expiresIn: number = 3600): Promise<{ signedURL: string }> {
    const res = await fetch(`${this.baseUrl}/storage/v1/object/sign/${bucket}/${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.accessToken}`,
      },
      body: JSON.stringify({ expiresIn }),
    });
    const data = await res.json() as any;
    return { signedURL: data.signedURL };
  }
}
