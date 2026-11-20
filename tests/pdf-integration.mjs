// 관리 기능의 순수 PDF 처리를 실제 한국어 PDF로 확인한다. 브라우저 제어를 하지 않는다.
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
// PDF.js의 브라우저 빌드가 기대하는 표준 메서드를 구형 Node 테스트 환경에만 보완한다.
if (!Uint8Array.prototype.toHex) Object.defineProperty(Uint8Array.prototype, 'toHex', { value() { return Buffer.from(this).toString('hex'); } });
const canvasPackage = process.env.RESEARCH_CANVAS_PATH;
if (canvasPackage) {
  const canvas = require(canvasPackage);
  globalThis.DOMMatrix = canvas.DOMMatrix; globalThis.ImageData = canvas.ImageData; globalThis.Path2D = canvas.Path2D;
}
const pdfjs = await import('../dist/vendor/pdfjs/pdf.mjs');
pdfjs.GlobalWorkerOptions.workerSrc = new URL('../dist/vendor/pdfjs/pdf.worker.mjs', import.meta.url).href;
const C = require('../dist/assets/admin-core.js');
const fixture = process.argv[2];
if (!fixture) throw new Error('한국어 익명 PDF 샘플 경로가 필요합니다.');
const document = await pdfjs.getDocument({ data: new Uint8Array(fs.readFileSync(fixture)), isEvalSupported: false, useSystemFonts: false }).promise;
const pages = [];
for (let n=1; n<=document.numPages; n++) {
  const page = await document.getPage(n), viewport = page.getViewport({ scale: 1 });
  const text = await page.getTextContent();
  const rows = text.items.filter(i => i.str?.trim()).map(i => { const t=pdfjs.Util.transform(viewport.transform, i.transform); return { text:i.str, y:t[5]-Math.abs(t[3]) }; });
  pages.push({ page:n, height:viewport.height, lines:rows });
}
const ranges=C.suggestRanges(pages).ranges, text=C.textForRanges(pages,ranges).replace(/\s+/g,'');
if(ranges.length!==2 || !text.includes('가.사업내용') || !text.includes('사.문의처') || text.includes('수신') || text.includes('붙임1.') || text.includes('산학협력단장')) throw new Error('본문 경계 실입력 검증 실패');
console.log('PASS: actual 2-page Korean PDF parsed; selected body includes sections and excludes header, attachment list, signature.');
await document.destroy();
