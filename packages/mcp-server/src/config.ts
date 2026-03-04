/**
 * Environment variable configuration.
 */

export interface Config {
  port: number;
  jwtSecret: string;
  dataDir?: string;
  openaiApiKey?: string;
}

export function loadConfig(): Config {
  return {
    port: parseInt(process.env.PORT ?? '3001', 10),
    jwtSecret: process.env.JWT_SECRET ?? 'dev-secret-key-change-in-production-min-32!!',
    dataDir: process.env.DATA_DIR,
    openaiApiKey: process.env.OPENAI_API_KEY,
  };
}
