const { test } = require('node:test');
const assert = require('node:assert/strict');
const C = require('../dist/assets/admin-core.js');
const G = require('../dist/assets/github-store.js');

const pages = [
  { page: 1, height: 1000, lines: [{ text: '수신 수리과학부', y: 40 }, { text: '제목 2027년도 연구사업', y: 90 }, { text: '가. 사업내용', y: 220 }, { text: '지원대상 및 연구비 표', y: 280 }, { text: '나. 신청기간', y: 500 }] },
  { page: 2, height: 1000, lines: [{ text: '바. 아이리스 신청시 유의사항', y: 40 }, { text: '사. 문의처', y: 400 }, { text: '사업 관련 문의처', y: 600 }, { text: '붙임 1. 신청요강', y: 780 }, { text: '서울대학교산학협력단장', y: 880 }] }
];

test('본문 가~사 구간만 추천하고 앞뒤 공문 및 붙임 목록을 제외한다', () => {
  const result = C.suggestRanges(pages);
  assert.equal(result.ranges.length, 2);
  assert.ok(result.ranges[0].top > 20 && result.ranges[0].top < 23);
  assert.ok(result.ranges[1].bottom < 78);
  const text = C.textForRanges(pages, result.ranges);
  assert.match(text, /사업내용/);
  assert.match(text, /문의처/);
  assert.doesNotMatch(text, /수신|산학협력단장|붙임 1/);
});
test('텍스트 없는 PDF나 시작 경계가 없으면 전체를 자동 선택하지 않는다', () => {
  assert.equal(C.suggestRanges([{ page: 1, height: 1000, lines: [] }]).ranges.length, 0);
  assert.equal(C.suggestRanges([{ page: 1, height: 1000, lines: [{ text: '제목만 있음', y: 20 }] }]).ranges.length, 0);
});
test('본문에 쓰인 붙임 참조를 문서 끝으로 오인하지 않는다', () => {
  const copy = structuredClone(pages);
  copy[0].lines.push({ text: '붙임의 신청요강 참고', y: 600 });
  assert.equal(C.suggestRanges(copy).ranges.length, 2);
});
test('역전되거나 페이지 밖으로 나간 선택 범위를 거부한다', () => {
  for (const range of [{ page: 1, top: 70, bottom: 20 }, { page: 1, top: -1, bottom: 80 }, { page: 1, top: 0, bottom: 101 }]) assert.throws(() => C.validateRanges([range]));
});
test('사업연도·제목·본문 확인을 등록 전에 검증한다', () => {
  assert.throws(() => C.validateDraft({ title: '', year: 2027, bodyImages: [] }));
  const draft = { id: 'notice-test', title: '익명 연구 공고', year: 2027, family: '기초연구', bodyImages: [{ href: 'files/2027/notice-test/body.jpg' }], reviewed: false };
  assert.throws(() => C.validateDraft(draft));
  assert.equal(C.validateDraft({ ...draft, reviewed: true }), true);
});
test('첨부파일 확장자·크기와 경로를 제한한다', () => {
  assert.equal(C.validateUpload({ name: '신청서류.zip', size: 1024 }), true);
  for (const file of [{ name: 'page.html', size: 100 }, { name: 'x.svg', size: 100 }, { name: 'x.zip', size: 0 }, { name: 'x.zip', size: 30 * 1024 * 1024 }]) assert.throws(() => C.validateUpload(file));
  assert.match(C.filePath(2027, 'notice-test', '신청서류.zip', 'abc123'), /^files\/2027\/notice-test\/attachments\/abc123\.zip$/);
  assert.throws(() => C.filePath(2027, '../bad', 'x.zip', 'abc'));
});
test('기존 연도와 다른 공고를 보존해 변경 공고 하나만 병합한다', () => {
  const base = { meta: {}, notices: [{ id: 'old', year: 2026 }, { id: 'current', year: 2027 }] };
  const merged = C.mergeNotice(base, { id: 'new', year: 2028 });
  assert.equal(merged.notices.length, 3);
  assert.equal(base.notices.length, 2);
  assert.equal(C.mergeNotice(merged, { id: 'new', year: 2028, title: '수정' }).notices.length, 3);
});
test('JSONP 데이터 내 문서 텍스트가 스크립트로 실행되지 않도록 직렬화한다', () => {
  const value = { notices: [{ title: '</script><script>alert(1)</script>\u2028' }] };
  const script = C.catalogScript(value);
  assert.doesNotMatch(script, /<\/script>/i);
  const scope = { window: {} };
  require('node:vm').runInNewContext(script, scope);
  assert.equal(scope.window.ResearchNoticesData.notices[0].title, value.notices[0].title);
});
test('다른 GitHub 계정으로는 파일을 올리기 전에 중단한다', async () => {
  const calls = [];
  const fetcher = async (url, init) => { calls.push({ url, init }); return { ok: true, json: async () => ({ login: 'someone-else' }) }; };
  const store = G.createClient({ owner: 'snumath1946', repo: 'research-notices', token: 'test-only', fetcher });
  await assert.rejects(store.connect(), /snumath1946/);
  assert.equal(calls.length, 1);
});
test('동시 수정 충돌 시 기존 원격 내용을 덮어쓰지 않는다', async () => {
  let patched = false;
  const client = G.createClient({ owner: 'snumath1946', repo: 'research-notices', token: 'test-only', fetcher: async (url, init = {}) => {
    if (url.endsWith('/user')) return response({ login: 'snumath1946' });
    if (url.includes('/repos/snumath1946/research-notices') && !url.includes('/git/') && !url.includes('/contents/')) return response({ default_branch: 'main', permissions: { push: true } });
    if (url.includes('/git/ref/')) return response({ object: { sha: 'new-head' } });
    if (init.method === 'PATCH') patched = true;
    return response({});
  } });
  await client.connect();
  await assert.rejects(client.save({ expectedHead: 'old-head', data: { meta: {}, notices: [] }, files: [] }), /변경|수정|다시/);
  assert.equal(patched, false);
});
test('원격 저장은 파일과 공고목록을 하나의 커밋으로 연결하고 force를 쓰지 않는다', async () => {
  const writes = [];
  const fetcher = async (url, init = {}) => {
    const body = init.body ? JSON.parse(init.body) : null;
    if (init.method) writes.push({ url, method: init.method, body });
    if (url.endsWith('/user')) return response({ login: 'snumath1946' });
    if (url.includes('/git/ref/')) return response({ object: { sha: 'head-1' } });
    if (url.includes('/git/commits/head-1')) return response({ tree: { sha: 'tree-base' } });
    if (url.endsWith('/git/blobs')) return response({ sha: 'blob-' + writes.length });
    if (url.endsWith('/git/trees')) return response({ sha: 'tree-new' });
    if (url.endsWith('/git/commits')) return response({ sha: 'commit-new', html_url: 'https://github.com/snumath1946/research-notices/commit/commit-new' });
    if (init.method === 'PATCH') return response({ object: { sha: 'commit-new' } });
    return response({ default_branch: 'main', permissions: { push: true } });
  };
  const client = G.createClient({ owner: 'snumath1946', repo: 'research-notices', token: 'test-only', fetcher });
  await client.connect();
  const result = await client.save({ expectedHead: 'head-1', data: { meta: {}, notices: [] }, files: [{ path: 'files/2027/sample/body.jpg', bytes: new Uint8Array([1, 2, 3]) }] });
  assert.equal(result.sha, 'commit-new');
  const tree = writes.find(w => w.url.endsWith('/git/trees')).body;
  assert.ok(tree.tree.some(e => e.path === 'dist/data/notices.js'));
  assert.ok(tree.tree.some(e => e.path === 'dist/files/2027/sample/body.jpg'));
  assert.deepEqual(writes.find(w => w.method === 'PATCH').body, { sha: 'commit-new', force: false });
  assert.equal(writes.filter(w => w.url.endsWith('/git/commits')).length, 1);
});
function response(value) { return { ok: true, json: async () => value }; }
