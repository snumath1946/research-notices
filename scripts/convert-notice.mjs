import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { resolve, extname } from 'node:path';
const require = createRequire(import.meta.url);
const T = require('../dist/assets/notice-text.js');
const version = require('../node_modules/kordoc/package.json').version;
const MAX_FILE = 25 * 1024 * 1024;
process.env.KORDOC_OFFLINE = '1';
const { parse } = await import('kordoc');
export async function convertPdf(bytes) {
  if (!bytes.length || bytes.length > MAX_FILE || !bytes.subarray(0, 1024).includes(Buffer.from('%PDF-'))) throw new Error('25MB 이하의 PDF 공문을 선택해 주세요.');
  const result = await parse(bytes, { images: false, ocr: false, plain: true, tableFormat: 'gfm' });
  if (!result.success) throw new Error('PDF의 텍스트를 읽지 못했습니다. 암호와 파일 형식을 확인해 주세요.');
  if (!result.markdown.trim()) throw new Error('텍스트가 없는 스캔본입니다. 텍스트가 포함된 원본 PDF가 필요합니다.');
  const selected = T.selectBody(result.markdown);
  return { schema: T.SCHEMA, bodyMarkdown: selected.bodyMarkdown, fullMarkdown: result.markdown, extraction: { engine: 'kordoc', version, sourceHash: createHash('sha256').update(bytes).digest('hex'), selection: selected.selection }, warnings: [selected.warning] };
}
export function startConverter(port = 4184) {
  let converting = false;
  const server = createServer(async (req, res) => {
    const host = `127.0.0.1:${server.address().port}`, origin = `http://${host}`;
    const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'Content-Security-Policy': "default-src 'self'; connect-src 'self'; script-src 'self'; style-src 'self'; img-src 'none'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'" };
    const reply = (status, value) => { res.writeHead(status, { ...headers, 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(value)); };
    if (req.headers.host !== host) return reply(403, { error: '이 컴퓨터에서만 사용할 수 있습니다.' });
    if (req.method === 'GET' && ['/', '/converter.js', '/converter.css'].includes(req.url)) {
      const name = req.url === '/' ? 'converter.html' : req.url.slice(1);
      res.writeHead(200, { ...headers, 'Content-Type': ({'.html':'text/html','.js':'text/javascript','.css':'text/css'})[extname(name)] + '; charset=utf-8' });
      res.end(await readFile(new URL('./converter/' + name, import.meta.url))); return;
    }
    if (req.method !== 'POST' || req.url !== '/convert') return reply(404, { error: '요청한 화면이 없습니다.' });
    if (req.headers.origin !== origin || req.headers['content-type'] !== 'application/pdf') return reply(403, { error: '변환 도우미 화면에서 PDF를 선택해 주세요.' });
    if (converting) return reply(409, { error: '다른 공문을 변환 중입니다. 잠시 후 다시 시도해 주세요.' });
    converting = true;
    try {
      const chunks = []; let size = 0;
      for await (const chunk of req) { size += chunk.length; if (size > MAX_FILE) { reply(413, { error: '25MB 이하 PDF만 변환할 수 있습니다.' }); req.resume(); return; } chunks.push(chunk); }
      reply(200, await convertPdf(Buffer.concat(chunks)));
    } catch { reply(422, { error: '공문 텍스트를 추출하지 못했습니다. 텍스트가 포함된 25MB 이하 PDF인지 확인해 주세요.' }); }
    finally { converting = false; }
  });
  server.listen(port, '127.0.0.1', () => console.log(`공문 텍스트 변환 도우미: http://127.0.0.1:${server.address().port}\nPDF는 이 컴퓨터에서 처리하며 외부로 전송하거나 저장하지 않습니다. 종료: Ctrl+C`));
  return server;
}
async function main() {
  const [input, output] = process.argv.slice(2);
  if (!input || input === '--serve') { startConverter(); return; }
  if (!output) throw new Error('사용법: npm run convert:notice -- 원본.pdf 결과.json');
  const result = await convertPdf(await readFile(input));
  if (!result.bodyMarkdown) throw new Error('본문 범위를 찾지 못했습니다. npm run convert:notice로 도우미 화면을 열어 직접 선택해 주세요.');
  delete result.fullMarkdown;
  await writeFile(output, JSON.stringify(result, null, 2), { flag: 'wx' });
  console.log('본문 텍스트 JSON을 저장했습니다. 관리 화면에서 불러온 뒤 원문과 대조해 주세요.');
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(() => { console.error('변환에 실패했습니다. PDF 형식·본문 범위와 새 출력 파일 경로를 확인하거나 변환 도우미 화면을 이용해 주세요.'); process.exitCode = 1; });
