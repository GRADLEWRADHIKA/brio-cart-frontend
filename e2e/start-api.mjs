/**
 * Starts an isolated Brio Cart API for end-to-end tests:
 * fresh SQLite database → migrations → seed → a throwaway super admin → server on port 4710.
 * The generated admin credentials are written to e2e/.admin.json (gitignored) for the tests.
 *
 * The API lives in its own project: set BRIO_BACKEND_DIR to a brio-cart-backend checkout
 * (with `npm install` already run there).
 */
import { execSync, spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
if (!process.env.BRIO_BACKEND_DIR || !existsSync(path.join(process.env.BRIO_BACKEND_DIR, 'src/server.ts'))) {
  console.error('Set BRIO_BACKEND_DIR to the brio-cart-backend project folder to run the e2e tests.');
  process.exit(1);
}
const backend = path.resolve(process.env.BRIO_BACKEND_DIR);
const env = {
  ...process.env,
  NODE_ENV: 'test', // disables rate limiting for the test run
  PORT: '4710',
  DATABASE_URL: 'file:./e2e.db',
  JWT_SECRET: randomBytes(48).toString('base64url'),
  CORS_ORIGINS: 'http://localhost:5710',
};

for (const f of ['e2e.db', 'e2e.db-journal']) rmSync(path.join(backend, 'prisma', f), { force: true });
const run = (cmd, extra = {}) => execSync(cmd, { cwd: backend, env: { ...env, ...extra }, stdio: 'inherit' });
run('npx prisma migrate deploy');
run('npx tsx prisma/seed.ts');

const admin = { phone: '9111111111', password: 'e2e-' + randomBytes(12).toString('base64url') };
run(`npx tsx scripts/create-admin.ts --role SUPERADMIN --name "E2E Admin" --phone ${admin.phone}`, { ADMIN_PASSWORD: admin.password });
writeFileSync(path.join(here, '.admin.json'), JSON.stringify(admin));

// Run the API with the backend's own tsx (and tsconfig) as a child, and stop it when this process stops.
const api = spawn(process.execPath, ['--import', 'tsx', 'src/server.ts'], { cwd: backend, env, stdio: 'inherit' });
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => api.kill(sig));
api.on('exit', (code) => process.exit(code ?? 0));
