import { readFile } from 'node:fs/promises';
import { realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const address = 'http://127.0.0.1:4184/';
export function browserCommand(platform) {
  if (platform === 'win32') return ['cmd.exe', ['/d', '/s', '/c', 'start', '""', address]];
  if (platform === 'darwin') return ['open', [address]];
  return ['xdg-open', [address]];
}
async function ready() {
  try {
    const pkg = JSON.parse(await readFile(join(root, 'node_modules/kordoc/package.json'), 'utf8'));
    const expected = require('../package.json').devDependencies.kordoc;
    return pkg.version === expected;
  } catch { return false; }
}
export async function ensureDependencies() {
  if (await ready()) return;
  console.log('최초 실행에 필요한 공개 도구를 설치합니다. PDF와 인증값은 전송하지 않습니다.');
  const args = ['ci', '--omit=optional', '--ignore-scripts', '--cache', '.converter-cache'];
  // npm.cmd must be launched through the Windows shell. All arguments are fixed.
  const command = process.platform === 'win32' ? 'cmd.exe' : 'npm';
  const parameters = process.platform === 'win32' ? ['/d', '/s', '/c', 'npm.cmd', ...args] : args;
  const child = spawn(command, parameters, { cwd: root, stdio: 'inherit', windowsHide: true });
  const [code] = await once(child, 'exit');
  if (code !== 0 || !(await ready())) throw new Error('필요한 도구를 설치하지 못했습니다. 인터넷 연결과 Node.js 설치를 확인해 주세요.');
}
async function openBrowser() {
  const [command, args] = browserCommand(process.platform);
  const child = spawn(command, args, { stdio: 'ignore', windowsHide: true });
  child.on('error', () => console.log(`브라우저 주소창에 ${address} 를 입력해 주세요.`));
  child.unref();
}
export async function launch({ check = false, open = true } = {}) {
  if (Number(process.versions.node.split('.')[0]) < 20) throw new Error('Node.js 20 이상이 필요합니다. 공식 LTS 버전을 설치해 주세요.');
  await ensureDependencies();
  const { startConverter } = await import('./convert-notice.mjs');
  if (check) { console.log(JSON.stringify({ ready: true, platform: process.platform, kordoc: require('../package.json').devDependencies.kordoc })); return; }
  try {
    const response = await fetch(address, { signal: AbortSignal.timeout(1000) });
    if (response.ok && (await response.text()).includes('공문 텍스트 변환 도우미')) { if (open) await openBrowser(); return; }
  } catch { /* Start the local converter when it is not running yet. */ }
  const server = startConverter();
  server.on('error', () => { console.error('변환 도우미를 시작하지 못했습니다. 4184번 주소가 사용 중인지 확인해 주세요.'); process.exitCode = 1; });
  server.on('listening', () => { if (open) void openBrowser(); });
  return server;
}
if (process.argv[1] && realpathSync(resolve(process.argv[1])) === realpathSync(fileURLToPath(import.meta.url))) {
  launch({ check: process.argv.includes('--check'), open: !process.argv.includes('--no-open') }).catch(err => { console.error(err.message || '변환 도우미 실행에 실패했습니다.'); process.exitCode = 1; });
}
