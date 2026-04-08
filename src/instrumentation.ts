import { validateAuthEnv, validateDatabaseEnv } from "@/lib/auth-env";

export async function register() {
  validateAuthEnv();
  validateDatabaseEnv();
}
