import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {once} from 'node:events';
import {convertPdf,startConverter} from '../scripts/convert-notice.mjs';
const bytes=await readFile(new URL('./fixtures/sample-notice.pdf',import.meta.url));
test('실제 익명 한국어 PDF를 kordoc으로 읽어 본문 경계와 출처 해시를 보존한다',async()=>{
  const r=await convertPdf(bytes);assert.equal(r.extraction.engine,'kordoc');assert.equal(r.extraction.version,'4.25.2');assert.match(r.extraction.sourceHash,/^[a-f0-9]{64}$/);
  assert.match(r.bodyMarkdown,/사업내용/);assert.match(r.bodyMarkdown,/문의처/);assert.doesNotMatch(r.bodyMarkdown,/수신|붙임 1\.|산학협력단장/);
});
test('빈 파일·가짜 PDF는 변환을 거부한다',async()=>{for(const b of [Buffer.alloc(0),Buffer.from('not a PDF')])await assert.rejects(convertPdf(b));});
test('로컬 변환기는 외부 Origin을 거부하고 원본을 저장하지 않고 결과를 반환한다',async()=>{
  const server=startConverter(0);await once(server,'listening');const origin=`http://127.0.0.1:${server.address().port}`;
  try {
    assert.equal((await fetch(origin+'/')).status,200);
    assert.equal((await fetch(origin+'/convert',{method:'POST',headers:{Origin:'https://example.invalid','Content-Type':'application/pdf'},body:bytes})).status,403);
    const res=await fetch(origin+'/convert',{method:'POST',headers:{Origin:origin,'Content-Type':'application/pdf'},body:bytes});assert.equal(res.status,200);
    const r=await res.json();assert.equal(r.extraction.engine,'kordoc');assert.match(r.bodyMarkdown,/사업내용/);assert.equal(r.originalPdf,undefined);
  } finally {await new Promise(resolve=>server.close(resolve));}
});
