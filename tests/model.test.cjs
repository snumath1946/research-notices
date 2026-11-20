const { test } = require('node:test');
const assert = require('node:assert/strict');
const model = require('../dist/assets/model.js');
const data = require('../dist/data/notices.js');

const schedule = { label: '유형 A', researcherStart: '2026-11-20T09:00:00+09:00', researcherEnd: '2026-12-04T18:00:00+09:00', institutionEnd: '2026-12-07T18:00:00+09:00' };
const verified = { id: 'sample', year: 2027, contentStatus: 'verified', schedules: [schedule] };

test('제공된 공고 4건의 본문 캡처와 캡처에서 확인한 신청기간을 보존한다', () => {
  assert.equal(data.notices.length, 4);
  for (const notice of data.notices) {
    assert.equal(notice.year, 2027);
    assert.equal(model.getStatus(notice, new Date('2026-11-20T12:00:00+09:00')).key, 'upcoming');
    assert.equal(notice.schedules.length, 1);
    assert.equal(notice.bodyImages.length, 1);
  }
});

test('유니코드·공백에 관계없이 한국어 공고명과 유형을 검색한다', () => {
  assert.equal(model.filterNotices(data.notices, { query: '한우물 파기' }).length, 1);
  assert.equal(model.filterNotices(data.notices, { query: '유형Ｂ' }).length, 1);
  assert.equal(model.filterNotices(data.notices, { query: '핵심연구 도약형' }).length, 1);
  assert.equal(model.filterNotices(data.notices, { query: '없는 과제' }).length, 0);
});

test('연도·유형·접수상태 필터를 함께 적용한다', () => {
  assert.equal(model.filterNotices(data.notices, { year: '2027', family: '신진연구', status: 'upcoming' }, new Date('2026-11-20T12:00:00+09:00')).length, 1);
  assert.equal(model.filterNotices(data.notices, { year: '2026' }).length, 0);
  assert.equal(model.filterNotices(data.notices, { status: 'open' }).length, 0);
});

test('서로 다른 사업연도를 누적 조회하며 입력 데이터를 수정하지 않는다', () => {
  const history = [...data.notices, { ...data.notices[0], id: 'history-sample', year: 2026 }];
  assert.equal(model.filterNotices(history, { year: 'all' }).length, 5);
  assert.equal(model.filterNotices(history, { year: '2026' }).length, 1);
  assert.deepEqual(model.getYears(history), [2027, 2026]);
  assert.equal(data.notices.length, 4);
});

test('사업연도와 무관하게 한국시간 접수 시작·마감의 정확한 시각으로 판정한다', () => {
  assert.equal(model.getStatus(verified, new Date('2026-11-20T08:59:59+09:00')).key, 'upcoming');
  assert.equal(model.getStatus(verified, new Date('2026-11-20T09:00:00+09:00')).key, 'open');
  assert.equal(model.getStatus(verified, new Date('2026-12-04T18:00:00+09:00')).key, 'open');
  assert.equal(model.getStatus(verified, new Date('2026-12-04T18:00:01+09:00')).key, 'closed');
});

test('기관 승인 마감은 연구자 신청 마감을 연장하지 않는다', () => {
  assert.equal(model.getStatus(verified, new Date('2026-12-05T12:00:00+09:00')).key, 'closed');
});

test('유형마다 기간이 다르면 하나라도 접수중인 공고를 찾는다', () => {
  const mixed = { ...verified, schedules: [schedule, { ...schedule, label: '유형 B', researcherStart: '2026-12-05T09:00:00+09:00', researcherEnd: '2026-12-10T18:00:00+09:00' }] };
  assert.equal(model.getStatus(mixed, new Date('2026-12-06T12:00:00+09:00')).key, 'open');
});

test('누락·잘못된 날짜·확인되지 않은 일정은 접수중으로 표시하지 않는다', () => {
  for (const schedules of [[], [{ label: '미입력' }], [{ ...schedule, researcherEnd: 'invalid' }], [{ ...schedule, researcherEnd: '2026-11-19T18:00:00+09:00' }]]) {
    assert.equal(model.getStatus({ ...verified, schedules }).key, 'unverified');
  }
  assert.equal(model.getStatus({ ...verified, contentStatus: 'pending' }).key, 'unverified');
});

test('실제 준비된 다운로드만 활성화하고 위험한 경로를 차단한다', () => {
  assert.equal(model.getAttachmentHref({ available: false, href: 'files/2027/a.zip' }), null);
  assert.equal(model.getAttachmentHref({ available: true, href: 'files/2027/a.zip' }), 'files/2027/a.zip');
  assert.equal(model.getAttachmentHref({ available: true, href: 'https://example.org/public.zip' }), 'https://example.org/public.zip');
  for (const href of ['javascript:alert(1)', 'data:text/plain,x', '//example.org/a.zip', '../secret.zip', 'files/../secret.zip', 'files/%2e%2e/secret.zip', 'files/\\secret.zip']) {
    assert.equal(model.getAttachmentHref({ available: true, href }), null);
  }
});

test('접수현황 메일에는 요청된 세 필드가 있고 발송 기능은 없다', () => {
  const url = new URL(model.buildReportMailto('리더연구'));
  assert.equal(url.pathname, 'songh2@snu.ac.kr');
  assert.match(url.searchParams.get('body'), /접수번호/);
  assert.match(url.searchParams.get('body'), /사업명: 리더연구/);
  assert.match(url.searchParams.get('body'), /과제명/);
  assert.equal(url.protocol, 'mailto:');
});
