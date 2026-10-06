import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { randomBytes, createHash } from 'node:crypto';

const root = fileURLToPath(new URL('../', import.meta.url));
const android = path.join(root, 'android');
// A public origin can be bundled once so players never configure a server.
const configuredServer = (process.env.DEKI_SERVER_URL ?? 'https://deki-ymh6.onrender.com').trim();
let defaultServer = '';
if (configuredServer) {
  const url = new URL(configuredServer);
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash
  )
    throw new Error('DEKI_SERVER_URL must be an HTTPS origin, e.g. https://deki.example.com');
  defaultServer = url.origin;
}
const sdk = process.env.ANDROID_HOME || path.join(process.env.LOCALAPPDATA, 'Android', 'Sdk');
const tools = path.join(sdk, 'build-tools', '36.0.0');
const platform = path.join(sdk, 'platforms', 'android-36', 'android.jar');
const localTools = path.join(root, '.tools');
const jdk =
  process.env.DEKI_JAVA_HOME ||
  path.join(
    localTools,
    fs.readdirSync(localTools).find((name) => name.startsWith('jdk-')) || 'missing',
  );
const java = path.join(jdk, 'bin', 'java.exe');
const build = path.join(android, 'build');
const releases = path.join(root, 'releases');
const privateDir = path.join(android, '.private');
const manifestSource = fs.readFileSync(path.join(android, 'AndroidManifest.xml'), 'utf8');
const versionCode =
  process.env.ANDROID_VERSION_CODE || manifestSource.match(/android:versionCode="(\d+)"/)[1];
const versionName =
  process.env.ANDROID_VERSION_NAME || manifestSource.match(/android:versionName="([^"]+)"/)[1];
if (!/^\d+$/.test(versionCode) || Number(versionCode) < 1 || Number(versionCode) > 2100000000)
  throw new Error('Invalid Android version code');
if (!/^[a-zA-Z0-9.+-]+$/.test(versionName)) throw new Error('Invalid Android version name');
const keyStore = process.env.DEKI_KEYSTORE_PATH || path.join(privateDir, 'deki-release.p12');
const passwordPath = path.join(privateDir, 'signing-password.txt');
if (process.env.CI && (!fs.existsSync(keyStore) || !process.env.DEKI_SIGNING_PASSWORD))
  throw new Error(
    'CI requires the existing signing key and password; refusing to create a different app identity',
  );
for (const required of [
  java,
  platform,
  path.join(tools, 'core-lambda-stubs.jar'),
  path.join(tools, 'aapt2.exe'),
  path.join(root, 'dist', 'index.html'),
]) {
  if (!fs.existsSync(required)) throw new Error(`Missing build input: ${required}`);
}
// Only generated files inside android/build are replaced. Never touch source or signing material.
if (path.dirname(build) !== android || path.basename(build) !== 'build')
  throw new Error('Unexpected build path');
fs.rmSync(build, { recursive: true, force: true });
for (const dir of ['classes', 'generated', 'dex', 'assets/web'])
  fs.mkdirSync(path.join(build, dir), { recursive: true });
fs.mkdirSync(releases, { recursive: true });
fs.mkdirSync(privateDir, { recursive: true });
const manifest = path.join(build, 'AndroidManifest.xml');
fs.writeFileSync(
  manifest,
  manifestSource
    .replace(/android:versionCode="\d+"/, `android:versionCode="${versionCode}"`)
    .replace(/android:versionName="[^"]+"/, `android:versionName="${versionName}"`),
);
fs.cpSync(path.join(root, 'dist'), path.join(build, 'assets/web'), { recursive: true });
fs.writeFileSync(path.join(build, 'assets/server-url.txt'), defaultServer);
function run(executable, args, extraEnv = {}) {
  const result = spawnSync(executable, args, {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, ...extraEnv },
    windowsHide: true,
  });
  if (result.error || result.status !== 0)
    throw result.error || new Error(`${path.basename(executable)} exited with ${result.status}`);
}
function files(dir, suffix) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) =>
      entry.isDirectory()
        ? files(path.join(dir, entry.name), suffix)
        : entry.name.endsWith(suffix)
          ? [path.join(dir, entry.name)]
          : [],
    );
}
const resources = path.join(build, 'resources.zip'),
  unsigned = path.join(build, 'unsigned.apk');
run(path.join(tools, 'aapt2.exe'), [
  'compile',
  '--dir',
  path.join(android, 'res'),
  '-o',
  resources,
]);
run(path.join(tools, 'aapt2.exe'), [
  'link',
  '-o',
  unsigned,
  '--manifest',
  manifest,
  '-I',
  platform,
  '--java',
  path.join(build, 'generated'),
  resources,
]);
run(path.join(jdk, 'bin', 'javac.exe'), [
  '-encoding',
  'UTF-8',
  '-source',
  '8',
  '-target',
  '8',
  '-bootclasspath',
  path.join(tools, 'core-lambda-stubs.jar') + path.delimiter + platform,
  '-d',
  path.join(build, 'classes'),
  ...files(path.join(android, 'src'), '.java'),
  ...files(path.join(build, 'generated'), '.java'),
]);
run(path.join(jdk, 'bin', 'jar.exe'), [
  '--create',
  '--file',
  path.join(build, 'classes.jar'),
  '-C',
  path.join(build, 'classes'),
  '.',
]);
run(java, [
  '-cp',
  path.join(tools, 'lib', 'd8.jar'),
  'com.android.tools.r8.D8',
  '--lib',
  platform,
  '--min-api',
  '26',
  '--output',
  path.join(build, 'dex'),
  path.join(build, 'classes.jar'),
]);
run(path.join(jdk, 'bin', 'jar.exe'), [
  '--update',
  '--file',
  unsigned,
  '-C',
  path.join(build, 'dex'),
  'classes.dex',
  '-C',
  build,
  'assets',
]);
const aligned = path.join(build, 'aligned.apk');
run(path.join(tools, 'zipalign.exe'), ['-f', '-p', '4', unsigned, aligned]);
if (!process.env.DEKI_SIGNING_PASSWORD && !fs.existsSync(passwordPath))
  fs.writeFileSync(passwordPath, randomBytes(32).toString('hex'), { mode: 0o600 });
const password = process.env.DEKI_SIGNING_PASSWORD || fs.readFileSync(passwordPath, 'utf8').trim();
const signingEnv = { DEKI_SIGNING_PASSWORD: password };
if (!fs.existsSync(keyStore))
  run(
    path.join(jdk, 'bin', 'keytool.exe'),
    [
      '-genkeypair',
      '-keystore',
      keyStore,
      '-storetype',
      'PKCS12',
      '-alias',
      'deki',
      '-keyalg',
      'RSA',
      '-keysize',
      '3072',
      '-validity',
      '10000',
      '-dname',
      'CN=Deki Test Build',
      '-storepass:env',
      'DEKI_SIGNING_PASSWORD',
      '-keypass:env',
      'DEKI_SIGNING_PASSWORD',
      '-noprompt',
    ],
    signingEnv,
  );
const apk = path.join(releases, `IVI-Android-${versionName}.apk`);
run(
  java,
  [
    '-jar',
    path.join(tools, 'lib', 'apksigner.jar'),
    'sign',
    '--ks',
    keyStore,
    '--ks-key-alias',
    'deki',
    '--ks-pass',
    'env:DEKI_SIGNING_PASSWORD',
    '--key-pass',
    'env:DEKI_SIGNING_PASSWORD',
    '--out',
    apk,
    aligned,
  ],
  signingEnv,
);
run(java, ['-jar', path.join(tools, 'lib', 'apksigner.jar'), 'verify', '--verbose', apk]);
run(path.join(tools, 'zipalign.exe'), ['-c', '-p', '4', apk]);
// Windows aapt2 can write backslashes into nested asset entry names. Package
// assets with jar instead, then verify the actual signed archive before release.
const jar = path.join(jdk, 'bin', 'jar.exe');
const listing = spawnSync(jar, ['--list', '--file', apk], { encoding: 'utf8', windowsHide: true });
if (listing.error || listing.status !== 0) throw new Error('Cannot inspect APK assets');
const entries = new Set(listing.stdout.trim().split(/\r?\n/));
const expected = files(path.join(build, 'assets'), '').map((file) => ({
  file,
  entry: path.relative(build, file).split(path.sep).join('/'),
}));
if (!entries.has('assets/web/index.html') || [...entries].some((entry) => entry.includes('\\')))
  throw new Error('Invalid APK asset paths');
for (const { entry } of expected)
  if (!entries.has(entry)) throw new Error(`Missing APK asset: ${entry}`);
const verified = path.join(build, 'verified');
fs.mkdirSync(verified);
const extracted = spawnSync(jar, ['--extract', '--file', apk, 'assets'], {
  cwd: verified,
  windowsHide: true,
});
if (extracted.error || extracted.status !== 0) throw new Error('Cannot extract APK assets');
for (const { file, entry } of expected)
  if (!fs.readFileSync(file).equals(fs.readFileSync(path.join(verified, entry))))
    throw new Error(`APK asset content mismatch: ${entry}`);
console.log(`Verified ${expected.length} bundled assets in the signed APK.`);
const sha256 = createHash('sha256').update(fs.readFileSync(apk)).digest('hex');
fs.writeFileSync(`${apk}.sha256`, `${sha256}  ${path.basename(apk)}\n`);
console.log(JSON.stringify({ apk, bytes: fs.statSync(apk).size, sha256 }, null, 2));
