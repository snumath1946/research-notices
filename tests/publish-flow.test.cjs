const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');
const C = require('../dist/assets/admin-core.js');
const M = require('../dist/assets/model.js');
const T = require('../dist/assets/notice-text.js');

async function editor(settings = {}) {
  const elements = new Map(), writes = [], drafts = [], connections = [], publicReads = [];
  class Element {
    constructor() { this.value = ''; this.checked = false; this.hidden = false; this.disabled = false; this.isConnected = true; this.listeners = {}; this.files = []; }
    addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }
    async emit(type) { for (const fn of this.listeners[type] || []) await fn(); }
    querySelectorAll() { return []; }
    replaceChildren() {}
    append() {}
    remove() { this.isConnected = false; }
    scrollIntoView() { this.scrolled = true; }
    focus() { if (!this.disabled) this.focused = true; }
  }
  const get = id => { if (!elements.has(id)) elements.set(id, new Element()); return elements.get(id); };
  const notice = { id: 'synthetic-notice', year: 2027, order: 1, title: '합성 공고', family: '기초연구', bodyImages: [{ href: 'files/2027/synthetic-notice/body.jpg' }], attachments: [], schedules: [], contentStatus: 'body-reviewed' };
  let catalog = { meta: {}, notices: [notice] }, head = 'head-1';
  const client = {
    connect: async () => { if (settings.failConnect) throw new Error('모의 연결 실패'); }, disconnect() {},
    load: async () => {
      const data = structuredClone(catalog);
      if (settings.conflict) data.notices[0].title = '다른 PC에서 수정됨';
      if (settings.otherChanged) data.notices.push({ id: 'other', year: 2026, title: '다른 공고' });
      return { head: settings.otherChanged ? 'newer-head' : head, script: C.catalogScript(data) };
    },
    save: async value => {
      if (settings.beforeSave) await settings.beforeSave();
      if (settings.failSave) throw new Error('모의 저장 실패');
      writes.push(value); catalog = value.data; head = 'head-' + (writes.length + 1);
      return { sha: head, url: 'https://github.com/snumath1946/research-notices/commit/synthetic' };
    }
  };
  const window = { ResearchNoticesData: catalog, ResearchNoticesAdminCore: C, ResearchNoticesText: T, ResearchNoticesModel: M, ResearchNoticesDrafts: { list: async () => [], put: async value => drafts.push(value) }, ResearchNoticesGitHub: { createClient: options => { connections.push(options); return client; } }, location: { href: 'https://example.invalid/admin.html' }, addEventListener() {} };
  if (settings.monitor) window.fetch = async (url, options) => { publicReads.push({ url, options }); return { ok: true, text: async () => C.catalogScript(catalog) }; };
  const document = { getElementById: get, querySelectorAll: () => [...elements.values()], createElement: () => new Element() };
  const html = fs.readFileSync(require.resolve('../dist/admin.html'), 'utf8');
  for (const match of html.matchAll(/id="([^"]+)"/g)) get(match[1]);
  const source = fs.readFileSync(require.resolve('../dist/assets/admin.mjs'), 'utf8');
  const api = await vm.runInNewContext(`(async () => { ${source}\nreturn { openNotice }; })()`, { window, document, structuredClone, crypto: webcrypto, URL, TextDecoder, TextEncoder, Uint8Array, Error, Map, Set, Date });
  api.openNotice(notice);
  async function upload() { get('attachment-files').files = [new File(['synthetic attachment'], 'sample.txt')]; await get('attachment-files').emit('change'); }
  function token() { get('github-token').value = 'synthetic-only'; }
  async function apply() { await get('publish-notice').emit('click'); }
  return { get, writes, drafts, connections, publicReads, upload, token, apply, settings, api };
}

test('첨부파일·토큰·한 개의 적용 버튼을 같은 저장 영역에 제공한다', () => {
  const html = fs.readFileSync(require.resolve('../dist/admin.html'), 'utf8');
  const panel = html.slice(html.indexOf('id="publish-panel"'), html.indexOf('aria-labelledby="english-heading"'));
  for (const id of ['attachment-files','github-token','publish-notice','publish-summary']) assert.ok(panel.includes(`id="${id}"`));
  assert.equal((html.match(/id="publish-notice"/g) || []).length,1);
  assert.doesNotMatch(html,/id="(?:prepare-publish|confirm-publish|publish-confirm|publish-approved|connect-github)"/);
  assert.match(html,/tools\/research-notice-converter\.zip/);
});
test('토큰 입력 뒤 적용 한 번으로 연결과 첨부 저장을 함께 처리한다', async () => {
  const ui=await editor();await ui.upload();ui.token();await ui.apply();
  assert.equal(ui.connections.length,1);assert.equal(ui.writes.length,1);
  assert.equal(ui.get('github-token').value,'');assert.equal(ui.get('token-entry').hidden,true);
  assert.equal(new TextDecoder().decode(ui.writes[0].files[0].bytes),'synthetic attachment');
  assert.equal(ui.writes[0].data.notices.length,1);assert.equal(ui.get('publish-result').hidden,false);
  assert.match(ui.get('attachment-list').innerHTML,/기존 등록 파일/);
  assert.equal(ui.get('publish-notice').disabled,true);
});
test('토큰이 없으면 같은 영역의 입력란으로 안내하고 파일을 보존한다',async()=>{
  const ui=await editor();await ui.upload();await ui.apply();
  assert.equal(ui.get('github-token').focused,true);assert.equal(ui.get('publish-error').hidden,false);assert.match(ui.get('attachment-list').innerHTML,/sample.txt/);assert.equal(ui.writes.length,0);
});
test('같은 창의 다음 저장에는 토큰을 다시 요구하지 않는다',async()=>{
  const ui=await editor();await ui.upload();ui.token();await ui.apply();
  ui.get('notice-title').value='합성 수정';await ui.get('notice-title').emit('input');await ui.apply();
  assert.equal(ui.connections.length,1);assert.equal(ui.writes.length,2);assert.equal(ui.writes[1].data.notices[0].title,'합성 수정');
});
test('임시보관 뒤에도 공개 적용할 수 있으며 임시보관만으로 공개하지 않는다',async()=>{
  const ui=await editor();await ui.upload();await ui.get('save-draft').emit('click');
  assert.equal(ui.drafts.length,1);assert.equal(ui.writes.length,0);assert.equal(ui.get('publish-notice').disabled,false);
  ui.token();await ui.apply();assert.equal(ui.writes.length,1);
});
test('불러온 임시보관의 변경도 적용할 수 있고 다른 PC의 수정을 덮어쓰지 않는다',async()=>{
  const first=await editor();await first.upload();await first.get('save-draft').emit('click');const saved=first.drafts[0];
  for(const conflict of [false,true]){
    const ui=await editor({conflict});ui.api.openNotice(saved.notice,saved.files,saved.baseSignature);assert.equal(ui.get('publish-notice').disabled,false);
    ui.token();await ui.apply();assert.equal(ui.writes.length,conflict?0:1);
  }
});
test('연결 실패·저장 실패·같은 공고 충돌 시 성공 표시 없이 파일을 유지한다',async()=>{
  for(const settings of [{failConnect:true},{failSave:true},{conflict:true}]){
    const ui=await editor(settings);await ui.upload();ui.token();await ui.apply();
    assert.equal(ui.writes.length,0);assert.equal(ui.get('publish-result').hidden,true);assert.match(ui.get('attachment-list').innerHTML,/sample.txt/);assert.equal(ui.get('publish-notice').disabled,false);
  }
});
test('다른 공고가 수정되어도 최신 목록을 병합해 보존한다',async()=>{
  const ui=await editor({otherChanged:true});await ui.upload();ui.token();await ui.apply();
  assert.equal(ui.writes.length,1);assert.equal(ui.writes[0].expectedHead,'newer-head');assert.equal(ui.writes[0].data.notices.length,2);assert.ok(ui.writes[0].data.notices.some(n=>n.id==='other'));
});
test('저장 중 반복 클릭으로 같은 파일을 중복 전송하지 않는다',async()=>{
  let release;const pause=new Promise(resolve=>{release=resolve;});const ui=await editor({beforeSave:()=>pause});await ui.upload();ui.token();
  const first=ui.apply(),second=ui.apply();await new Promise(resolve=>setImmediate(resolve));assert.equal(ui.get('publish-notice').disabled,true);release();await Promise.all([first,second]);assert.equal(ui.writes.length,1);
});
test('토큰은 공고 데이터·임시보관에 저장하지 않는다',async()=>{
  const ui=await editor();await ui.upload();ui.token();await ui.apply();
  assert.equal(JSON.stringify(ui.writes[0].data).includes('synthetic-only'),false);assert.equal(JSON.stringify(ui.drafts).includes('synthetic-only'),false);
});
test('공개 데이터에서 저장 내용을 확인한 경우에만 반영 완료를 표시한다',async()=>{
  const ui=await editor({monitor:true});await ui.upload();ui.token();await ui.apply();await new Promise(resolve=>setImmediate(resolve));
  assert.match(ui.get('publish-result-heading').textContent,/반영 완료/);assert.equal(ui.publicReads[0].options.credentials,'omit');assert.match(ui.get('public-notice-link').href,/#\/notice\/synthetic-notice/);
});
test('kordoc 본문과 영문 입력도 한 번의 적용으로 저장한다',async()=>{
  const ui=await editor();await ui.upload();ui.get('body-import').files=[new File([JSON.stringify({schema:T.SCHEMA,bodyMarkdown:'## 가. 사업내용\n\n합성 본문',extraction:{engine:'kordoc',version:'4.25.2'}})],'synthetic.json')];await ui.get('body-import').emit('change');
  ui.get('notice-english-title').value='Synthetic English';ui.get('notice-english-body').value='Synthetic guidance';ui.token();await ui.apply();
  const n=ui.writes[0].data.notices[0];assert.equal(n.bodyImages.length,0);assert.match(n.bodyMarkdown,/합성 본문/);assert.equal(n.english.title,'Synthetic English');assert.equal(n.attachments.length,1);
});
test('공식 영문 본문의 출처 대조 요건은 한 번 저장에서도 유지한다',async()=>{
  const ui=await editor();await ui.upload();ui.get('notice-call-round').value='1';ui.get('notice-english-official-body').value='Synthetic official text';ui.token();await ui.apply();assert.equal(ui.writes.length,0);
  ui.get('english-source-url').value=T.officialPrograms[0].source.url;ui.get('english-source-reviewed').checked=true;await ui.apply();assert.equal(ui.writes.length,1);assert.equal(ui.writes[0].data.notices[0].english.source.reviewed,true);
});
test('영문 후보는 기존 입력을 보존하고 연도가 바뀌면 대조 확인을 해제한다',async()=>{
  const ui=await editor();ui.get('notice-year').value='2027';ui.get('notice-call-round').value='1';ui.get('notice-family').value='신진연구';ui.get('notice-english-title').value='Existing English';await ui.get('match-nrf').emit('click');
  assert.equal(ui.get('notice-english-title').value,'Existing English');assert.match(ui.get('english-source-url').value,/eng\.nrf\.re\.kr/);ui.get('english-source-reviewed').checked=true;ui.get('notice-year').value='2028';await ui.get('notice-year').emit('input');assert.equal(ui.get('english-source-reviewed').checked,false);
});
test('공개 확인 지연·이전 데이터는 재저장하거나 성공으로 표시하지 않는다',async()=>{
  const notice={id:'synthetic',updatedAt:'new'};let calls=0;
  const state=await C.waitForPublication({notice,url:'https://example.invalid/data/notices.js',delays:[0,0,0],wait:async()=>{},fetcher:async()=>{calls++;return {ok:true,text:async()=>C.catalogScript({meta:{},notices:[{...notice,updatedAt:'old'}]})};}});
  assert.equal(state,'pending');assert.equal(calls,3);
});
test('다른 공고로 이동하면 이전 공개 확인을 중단한다',async()=>{
  let active=true,calls=0;const notice={id:'synthetic'};
  const state=await C.waitForPublication({notice,url:'https://example.invalid/data/notices.js',active:()=>active,delays:[0,0],fetcher:async()=>{calls++;active=false;return {ok:true,text:async()=>C.catalogScript({meta:{},notices:[notice]})};}});
  assert.equal(state,'cancelled');assert.equal(calls,1);
});
