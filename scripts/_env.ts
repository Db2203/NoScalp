/** Load .env.local then .env for standalone scripts (Next does this itself). */
export function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    try {
      process.loadEnvFile(file);
    } catch {
      // file may not exist — fine
    }
  }
}
