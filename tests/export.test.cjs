const { test } = require('node:test');
const assert = require('node:assert/strict');
const C = require('../dist/assets/admin-core.js');
const JSZip = require('../dist/vendor/jszip/jszip.min.js');
test('실제 ZIP의 CRC·파일 내용·연도 보존·공문 원본 제외를 확인한다', async () => {
  const notice = { id: 'notice-test', year: 2028, title: '익명 공고', bodyImages: [{href:'files/2028/notice-test/body.webp'}], attachments: [{href:'files/2028/notice-test/attachments/abc.txt',available:true}] };
  const catalog={meta:{},notices:[{id:'old',year:2027,title:'이전 공고'}]};
  const files=[{path:notice.bodyImages[0].href,bytes:new Uint8Array([1,2,3])},{path:notice.attachments[0].href,bytes:new TextEncoder().encode('익명 신청서')}];
  const blob=await C.buildUpdateZip(JSZip,catalog,notice,files);
  const zip=await JSZip.loadAsync(await blob.arrayBuffer(),{checkCRC32:true});
  const list=C.parseCatalog(await zip.file('dist/data/notices.js').async('string'));
  assert.equal(list.notices.length,2);
  assert.ok(list.notices.some(n=>n.id==='old'));
  assert.equal(await zip.file('dist/'+notice.attachments[0].href).async('string'),'익명 신청서');
  assert.deepEqual([...await zip.file('dist/'+notice.bodyImages[0].href).async('uint8array')],[1,2,3]);
  assert.equal(Object.keys(zip.files).some(name=>name.endsWith('.pdf')),false);
});
test('연결되지 않은 원본 PDF를 자동으로 ZIP에 넣지 못한다', async () => {
  await assert.rejects(C.buildUpdateZip(JSZip,{meta:{},notices:[]},{id:'sample',bodyImages:[],attachments:[]},[{path:'files/2027/sample/original.pdf',bytes:new Uint8Array([1])}]),/연결되지/);
});
