const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');
const C = require('../dist/assets/admin-core.js');
const M = require('../dist/assets/model.js');

async function editor({ conflict = false, failSave = false } = {}) {
  const elements = new Map(), writes = [], drafts = [];
  class Element {
    constructor() { this.value = ''; this.checked = false; this.hidden = false; this.disabled = false; this.isConnected = true; this.listeners = {}; this.files = []; }
    addEventListener(type, fn) { this.listeners[type] = fn; }
    async emit(type) { return this.listeners[type]?.(); }
    querySelectorAll() { return []; }
    replaceChildren() {}
    append() {}
    remove() { this.isConnected = false; }
    scrollIntoView() { this.scrolled = true; }
    focus() { if (!this.disabled) this.focused = true; }
  }
  const get = id => { if (!elements.has(id)) elements.set(id, new Element()); return elements.get(id); };
  const notice = { id: 'synthetic-notice', year: 2027, order: 1, title: '합성 공고', family: '기초연구', bodyImages: [{ href: 'files/2027/synthetic-notice/body.jpg' }], attachments: [], schedules: [], contentStatus: 'body-reviewed' };
  const catalog = { meta: {}, notices: [notice] };
  let loads = 0;
  const client = {
    connect: async () => {}, disconnect() {},
    load: async () => ({ head: conflict && ++loads > 1 ? 'changed-head' : 'head-1', script: C.catalogScript(catalog) }),
    save: async value => { if (failSave) throw new Error('모의 저장 실패'); writes.push(value); return { sha: 'head-2', url: 'https://github.com/snumath1946/research-notices/commit/synthetic' }; }
  };
  const window = { ResearchNoticesData: catalog, ResearchNoticesAdminCore: C, ResearchNoticesModel: M, ResearchNoticesDrafts: { list: async () => [], put: async value => drafts.push(value) }, ResearchNoticesGitHub: { createClient: () => client }, addEventListener() {} };
  const document = { getElementById: get, querySelectorAll: () => [...elements.values()], createElement: () => new Element() };
  const html = fs.readFileSync(require.resolve('../dist/admin.html'), 'utf8');
  for (const match of html.matchAll(/id="([^"]+)"/g)) get(match[1]);
  // PDF import paths are unused by this synthetic publishing harness.
  const source = fs.readFileSync(require.resolve('../dist/assets/admin.mjs'), 'utf8').replaceAll('import.meta.url', JSON.stringify('https://example.invalid/assets/admin.mjs'));
  const api = await vm.runInNewContext(`(async () => { ${source}\nreturn { openNotice }; })()`, { window, document, structuredClone, crypto: webcrypto, URL, TextDecoder, TextEncoder, Uint8Array, Error, Map, Set, Date });
  api.openNotice(notice);
  async function upload() { get('attachment-files').files = [new File(['synthetic attachment'], 'sample.txt')]; await get('attachment-files').emit('change'); }
  async function connect() { get('github-token').value = 'synthetic-only'; await get('connect-github').emit('click'); }
  return { get, writes, drafts, upload, connect };
}

test('첨부 적용 버튼은 연결 전에도 동작하고 연결 설정으로 안내하며 파일을 보존한다', async () => {
  const ui = await editor(); await ui.upload();
  assert.equal(ui.get('apply-attachments').disabled, false);
  await ui.get('apply-attachments').emit('click');
  assert.equal(ui.get('github-connection').open, true);
  assert.equal(ui.get('github-token').focused, true);
  assert.match(ui.get('attachment-list').innerHTML, /sample.txt/);
  assert.equal(ui.writes.length, 0);
  await ui.connect();
  assert.equal(ui.get('body-reviewed').focused, true);
  assert.match(ui.get('attachment-list').innerHTML, /sample.txt/);
});

test('관리 화면은 첨부 영역과 하단에 활성 적용 버튼 및 배포 확인 링크를 제공한다', () => {
  const html = fs.readFileSync(require.resolve('../dist/admin.html'), 'utf8');
  for (const id of ['apply-attachments', 'prepare-publish']) {
    const button = html.match(new RegExp('<button[^>]*id="' + id + '"[^>]*>'))?.[0];
    assert.ok(button); assert.doesNotMatch(button, /disabled/);
  }
  assert.match(html, /id="github-connection"/);
  assert.match(html, /actions\/workflows\/pages.yml/);
});

test('검토와 최종 확인 전에는 저장하지 않고 본문·첨부를 한 번에 적용한다', async () => {
  const ui = await editor(); await ui.upload(); await ui.connect();
  await ui.get('apply-attachments').emit('click');
  assert.equal(ui.writes.length, 0);
  ui.get('body-reviewed').checked = true;
  await ui.get('apply-attachments').emit('click');
  assert.equal(ui.get('publish-confirm').hidden, false);
  await ui.get('confirm-publish').emit('click');
  assert.equal(ui.writes.length, 0);
  ui.get('publish-approved').checked = true;
  await ui.get('confirm-publish').emit('click');
  assert.equal(ui.writes.length, 1);
  assert.equal(ui.writes[0].files.length, 1);
  assert.equal(new TextDecoder().decode(ui.writes[0].files[0].bytes), 'synthetic attachment');
  assert.equal(ui.writes[0].data.notices.length, 1);
  assert.equal(ui.get('publish-result').hidden, false);
  assert.match(ui.get('status').textContent, /자동 배포를 기다리고/);
  assert.match(ui.get('attachment-list').innerHTML, /기존 등록 파일/);
});

test('저장 실패나 원격 충돌은 성공으로 표시하지 않고 첨부를 유지한다', async () => {
  for (const option of [{ conflict: true }, { failSave: true }]) {
    const ui = await editor(option); await ui.upload(); await ui.connect();
    ui.get('body-reviewed').checked = true; await ui.get('apply-attachments').emit('click');
    ui.get('publish-approved').checked = true; await ui.get('confirm-publish').emit('click');
    assert.equal(ui.writes.length, 0);
    assert.equal(ui.get('publish-result').hidden, true);
    assert.match(ui.get('attachment-list').innerHTML, /sample.txt/);
  }
});
