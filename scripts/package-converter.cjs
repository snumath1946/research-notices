const fs = require('node:fs');
const path = require('node:path');
const JSZip = require('../dist/vendor/jszip/jszip.min.js');
const root = path.resolve(__dirname, '..');
const files = ['package-lock.json', 'start-converter.cmd', 'start-converter.command', 'scripts/start-converter.mjs', 'scripts/convert-notice.mjs', 'scripts/converter/converter.html', 'scripts/converter/converter.js', 'scripts/converter/converter.css', 'dist/assets/notice-text.js'];
async function main() {
  const zip = new JSZip(), pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const packageJson = { name: pkg.name, version: pkg.version, private: true, scripts: { start: 'node scripts/start-converter.mjs' }, devDependencies: pkg.devDependencies, engines: pkg.engines };
  const options = { date: new Date('2026-11-20T00:00:00Z'), compression: 'DEFLATE' };
  zip.file('package.json', JSON.stringify(packageJson, null, 2) + '\n', options);
  for (const name of files) {
    const bytes = fs.readFileSync(path.join(root, name));
    const content = name.endsWith('.cmd') ? bytes.toString('utf8').replace(/\r?\n/g, '\r\n') : bytes;
    zip.file(name, content, { ...options, unixPermissions: name.endsWith('.command') ? 0o100755 : 0o100644 });
  }
  zip.file('README.txt', '\uFEFF' + [
    '공문 텍스트 변환 도우미 — Windows / Mac', '',
    '1. ZIP을 내 컴퓨터의 폴더에 모두 압축 해제하세요. ZIP 안에서 바로 실행하지 마세요.',
    '2. Node.js 공식 LTS 버전을 최초 한 번 설치하세요: https://nodejs.org/',
    '3. Windows: start-converter.cmd를 더블클릭하세요.',
    '   Mac: start-converter.command를 실행하세요.',
    '4. 최초 실행 시 필요한 공개 도구를 자동 설치합니다. 다음부터는 바로 시작합니다.',
    '5. 열린 브라우저에서 PDF 선택 → 본문 검토 → JSON 받기를 진행하세요.',
    '6. 공개 관리 화면에서 JSON을 불러오고 첨부파일을 선택한 뒤 공개 사이트에 적용하세요.', '',
    '브라우저가 열리지 않으면 http://127.0.0.1:4184/ 를 입력하세요.',
    '사용하는 동안 실행 창을 열어 두세요. 종료는 실행 창에서 Ctrl+C입니다.',
    'PDF는 해당 컴퓨터에서 처리하며 외부로 보내지 않습니다. 스캔본 OCR과 자동 번역은 포함하지 않습니다.',
    '공개 저장한 공고는 PC가 달라도 같습니다. 임시보관·연결 상태와 저장한 JSON 파일은 PC별입니다.',
    'GitHub Access token은 공개 관리 화면에서만 입력하세요. 이 변환 도우미에는 입력하지 않습니다.', ''
  ].join('\r\n'), options);
  const output = path.join(root, 'dist/tools/research-notice-converter.zip');
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, await zip.generateAsync({ type: 'nodebuffer', platform: 'UNIX' }));
  console.log('Portable converter packaged: Windows and macOS; no notice data, credentials or original PDFs included.');
}
main().catch(() => { console.error('변환 도우미 패키지 생성에 실패했습니다.'); process.exitCode = 1; });
