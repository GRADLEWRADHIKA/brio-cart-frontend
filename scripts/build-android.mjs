/**
 * Builds the Brio Cart Android app.
 *
 *   npm run android:debug                       → artifacts/android/brio-cart-debug.apk
 *   BRIO_API_URL=https://api.example.in npm run android:release
 *                                               → artifacts/android/brio-cart-release[-unsigned].apk + .aab
 *
 * Steps: native web build (Vite, mode "native") → `cap sync android` → Gradle → copy + verify artifact.
 * Capacitor 8 needs JDK 21; if JAVA_HOME points at an older JDK, Android Studio's bundled JBR is used.
 */
import { execSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mode = process.argv[2] === 'release' ? 'release' : 'debug';
const isWin = process.platform === 'win32';
const out = path.join(root, 'artifacts', 'android');
mkdirSync(out, { recursive: true });

function javaMajor(javaHome) {
  const bin = path.join(javaHome, 'bin', isWin ? 'java.exe' : 'java');
  if (!existsSync(bin)) return 0;
  // `java -version` prints to stderr.
  const r = spawnSync(bin, ['-version'], { encoding: 'utf8' });
  return Number(/version "(\d+)/.exec(`${r.stderr}${r.stdout}`)?.[1] ?? 0);
}

function resolveJavaHome() {
  const candidates = [
    process.env.JAVA_HOME,
    isWin && 'C:\\Program Files\\Android\\Android Studio\\jbr',
    !isWin && '/Applications/Android Studio.app/Contents/jbr/Contents/Home',
    !isWin && '/opt/android-studio/jbr',
  ].filter(Boolean);
  for (const c of candidates) {
    if (existsSync(c) && javaMajor(c) >= 21) return c;
  }
  throw new Error('JDK 21+ not found. Install JDK 21 or Android Studio, or set JAVA_HOME to a JDK 21 installation.');
}

function sha256(file) {
  return createHash('sha256').update(readFileSync(file)).digest('hex');
}

/** Minimal sanity check that the artifact is a real APK (ZIP with a manifest and dex code). */
function verifyApk(file) {
  const buf = readFileSync(file);
  if (buf.length < 100_000 || buf.readUInt32LE(0) !== 0x04034b50) throw new Error(`${file} is not a valid APK/ZIP`);
  const text = buf.toString('latin1');
  for (const entry of ['AndroidManifest.xml', 'classes.dex', 'assets/public/index.html']) {
    if (!text.includes(entry)) throw new Error(`${file} is missing ${entry}`);
  }
}

const env = { ...process.env };
if (mode === 'release') {
  const apiUrl = process.env.BRIO_API_URL ?? '';
  if (!/^https:\/\//.test(apiUrl)) {
    console.error('Release builds require BRIO_API_URL=https://… (the production API). Plain HTTP is blocked in release builds.');
    process.exit(1);
  }
  env.VITE_API_URL = apiUrl;
  env.BRIO_NATIVE_ENV = 'production';
}

const run = (cmd, opts = {}) => {
  console.log(`\n> ${cmd}`);
  execSync(cmd, { cwd: root, stdio: 'inherit', env, ...opts });
};

run('npm run build:native');
run('npx cap sync android');

env.JAVA_HOME = resolveJavaHome();
console.log(`\nUsing JAVA_HOME=${env.JAVA_HOME}`);
const gradlew = `"${path.join(root, 'android', isWin ? 'gradlew.bat' : 'gradlew')}"`;
const tasks = mode === 'release' ? 'assembleRelease bundleRelease' : 'assembleDebug';
run(`${gradlew} ${tasks} --no-daemon --console=plain`, { cwd: path.join(root, 'android') });

const results = [];
if (mode === 'debug') {
  const apk = path.join(root, 'android/app/build/outputs/apk/debug/app-debug.apk');
  verifyApk(apk);
  const dest = path.join(out, 'brio-cart-debug.apk');
  copyFileSync(apk, dest);
  results.push(dest);
} else {
  const signed = path.join(root, 'android/app/build/outputs/apk/release/app-release.apk');
  const unsigned = path.join(root, 'android/app/build/outputs/apk/release/app-release-unsigned.apk');
  const apk = existsSync(signed) ? signed : unsigned;
  verifyApk(apk);
  const dest = path.join(out, existsSync(signed) ? 'brio-cart-release.apk' : 'brio-cart-release-unsigned.apk');
  copyFileSync(apk, dest);
  results.push(dest);
  const aab = path.join(root, 'android/app/build/outputs/bundle/release/app-release.aab');
  if (existsSync(aab)) {
    const aabDest = path.join(out, 'brio-cart-release.aab');
    copyFileSync(aab, aabDest);
    results.push(aabDest);
  }
  if (!existsSync(signed)) console.warn('\nNo android/keystore.properties found: the release APK is UNSIGNED and cannot be installed until signed.');
}

console.log('\nArtifacts:');
for (const f of results) console.log(`  ${path.relative(root, f)}  ${(statSync(f).size / 1024 / 1024).toFixed(2)} MB  sha256=${sha256(f)}`);
