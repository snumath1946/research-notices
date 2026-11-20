const { test } = require('node:test');
const assert = require('node:assert/strict');
const I = require('../dist/assets/i18n.js');
const M = require('../dist/assets/model.js');
const date = new Date('2026-11-20T12:00:00+09:00');
const original = { id: 'synthetic', year: 2027, title: '신진연구', fullTitle: '합성 공고', family: '신진연구', program: '개인기초연구사업', round: '1차 신규과제', agency: '한국연구재단', via: '서울대학교 산학협력단', types: ['유형 B','유형 A'], bodyText: '원문은 보존합니다', bodyImages: [{ href: 'files/2027/synthetic/body.jpg' }], attachments: [{ filename: '합성자료.txt', href: 'files/2027/synthetic/sample.txt', available: true }], contentStatus: 'verified', schedules: [{ label: '유형 B · 유형 A', researcherStart: '2026-11-23T09:00:00+09:00', researcherEnd: '2026-12-04T18:00:00+09:00', institutionEnd: '2026-12-07T18:00:00+09:00' }] };

test('언어 전환 링크는 공고 경로·검색 조건·기타 쿼리를 보존한다', () => {
  const link = new URL(I.languageUrl('https://example.org/index.html?from=mail#/notice/sample?q=core&year=2027', 'en'));
  assert.equal(link.searchParams.get('lang'), 'en'); assert.equal(link.searchParams.get('from'), 'mail');
  assert.equal(link.hash, '#/notice/sample?q=core&year=2027');
  assert.equal(I.language(link.search), 'en'); assert.equal(I.language('?lang=invalid'), 'ko');
});
test('영문 화면은 원본 데이터·첨부 경로·날짜를 바꾸지 않는다', () => {
  const snapshot = structuredClone(original); const en = I.notice(original, 'en');
  assert.equal(en.title, 'Early-Career Research'); assert.equal(en.program, 'Individual Basic Research Program');
  assert.deepEqual(en.types, ['Type B','Type A']); assert.equal(en.schedules[0].researcherEnd, original.schedules[0].researcherEnd);
  assert.deepEqual(en.attachments, original.attachments); assert.equal(en.bodyText, original.bodyText); assert.deepEqual(original, snapshot);
  assert.equal(I.notice(original, 'ko'), original);
});
test('영문 검색과 한국어 검색을 같은 공고에 적용하며 유형 필터도 유지한다', () => {
  const records = [I.notice(original, 'en')], en = I.model(M, 'en');
  for (const query of ['Early Career', 'Type B', '신진 연구']) assert.equal(en.filterNotices(records, { query }, date).length, 1);
  assert.equal(en.filterNotices(records, { query: 'Early', family: '신진연구', status: 'upcoming' }, date).length, 1);
  assert.equal(en.filterNotices(records, { family: '핵심연구' }, date).length, 0);
});
test('등록자가 입력한 영문을 우선하고 미번역 공고는 원문 안내로 표시한다', () => {
  const en = I.notice({ ...original, english: { title: 'Custom English title', summary: 'Custom summary', bodyText: 'Custom guidance' } }, 'en');
  assert.equal(en.title, 'Custom English title'); assert.equal(en.summary, 'Custom summary'); assert.equal(en.english.bodyText, 'Custom guidance');
  const pending = I.notice({ ...original, title: '새로운 합성 공고' }, 'en');
  assert.equal(pending.englishAvailable, false); assert.match(pending.summary, /English overview has not been added/);
});
test('영문 메일 작성에는 세 필드가 있고 자동 발송하지 않는다', () => {
  const url = new URL(I.model(M, 'en').buildReportMailto('Synthetic Program'));
  assert.equal(url.protocol, 'mailto:');
  for (const text of ['Application number:', 'Funding program: Synthetic Program', 'Project title:']) assert.ok(url.searchParams.get('body').includes(text));
});
test('한국시간의 같은 순간을 영문 날짜로 표시하며 상태 판정은 보존한다', () => {
  const en = I.model(M, 'en'); assert.match(en.formatKst('2026-11-23T09:00:00+09:00'), /23 Nov 2026.*09:00 KST/);
  assert.equal(en.getStatus(original, date).key, M.getStatus(original, date).key); assert.equal(en.getStatus(original, date).label, 'Upcoming');
});
test('동적 공고 수·연도·기관 안내와 문서 제목을 번역한다', () => {
  for (const [ko,en] of [['2027년도','2027'],['4건','4 notices'],['1개 파일','1 file'],['공모기관 NRF · 안내 경유 SNU','Funding agency: NRF · Circulated by: SNU'],['신청 전 확인 | 연구과제 공모 안내','Before You Apply | Research Funding Opportunities']]) assert.equal(I.text(ko),en);
});
