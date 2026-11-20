const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../dist');
const data = require('../dist/data/notices.js');
const model = require('../dist/assets/model.js');
let checks = 0;
const check = (condition, message) => { assert.ok(condition, message); checks++; };
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
check(/<html lang="ko">/.test(html), '한국어 문서');
check(/name="viewport"/.test(html), '모바일 viewport');
check(/href="#main"/.test(html), '본문 건너뛰기');
const adminHtml = fs.readFileSync(path.join(root, 'admin.html'), 'utf8');
for (const match of (html + adminHtml).matchAll(/(?:src|href)="([^"#]+)"/g)) {
  if (/^(https:|mailto:)/.test(match[1])) continue;
  const resource = match[1].split(/[?#]/)[0];
  if (!resource) continue;
  check(fs.existsSync(path.join(root, resource)), '없는 정적 파일: ' + match[1]);
}
for (const file of ['assets/model.js', 'assets/notice-text.js', 'assets/i18n.js', 'assets/app.js', 'assets/admin-core.js', 'assets/github-store.js', 'assets/draft-store.js', 'data/notices.js']) {
  new vm.Script(fs.readFileSync(path.join(root, file), 'utf8'), { filename: file });
  checks++;
}
const ids = new Set();
let ready = 0, pending = 0;
for (const notice of data.notices) {
  check(/^[a-z0-9-]+$/.test(notice.id) && !ids.has(notice.id), '고유 공고 ID: ' + notice.id);
  ids.add(notice.id);
  check(Number.isInteger(notice.year) && notice.year >= 2000, '사업연도');
  for (const key of ['title', 'fullTitle', 'family', 'agency', 'program', 'summary']) check(typeof notice[key] === 'string' && !!notice[key], '필수 텍스트: ' + key);
  check(['pending', 'body-reviewed', 'verified'].includes(notice.contentStatus), '검토 상태');
  check(Array.isArray(notice.types) && notice.types.length > 0, '공모 유형');
  if (notice.contentStatus === 'verified') {
    check(!!notice.sourceReference, '확인한 공고는 출처 위치 필요');
    check(notice.schedules.length > 0, '확인한 공고는 유형별 일정 필요');
    for (const schedule of notice.schedules) check(model.scheduleState(schedule, new Date()).key !== 'unverified', '올바른 시각 및 시간대');
  } else check(model.getStatus(notice).key === 'unverified', '미확인 일정 판정');
  check(Array.isArray(notice.attachments), '첨부자료 목록');
  check(!!notice.bodyMarkdown?.trim() || !!notice.bodyImages?.length, '게시할 본문 존재');
  for (const image of [...(notice.bodyImages || []), ...(notice.legacyBodyImages || [])]) {
    const href = model.getAttachmentHref({ ...image, available: true });
    check(!!href && fs.existsSync(path.join(root, href)), '게시할 본문 이미지 존재');
  }
  for (const file of notice.attachments) {
    const href = model.getAttachmentHref(file);
    check(!file.available || !!href, '유효한 첨부 경로');
    if (href && !href.startsWith('https://')) {
      const target = path.resolve(root, href);
      check(target.startsWith(root + path.sep) && fs.existsSync(target), '준비된 첨부 파일의 존재');
      const size = fs.statSync(target).size;
      check(size > 0 && size <= 100 * 1024 * 1024, '0바이트 또는 GitHub 일반 파일 한도 초과');
    }
    if (href) ready++; else pending++;
  }
}
const css = fs.readFileSync(path.join(root, 'assets/styles.css'), 'utf8');
check(css.includes('prefers-reduced-motion'), '동작 줄이기 설정');
check(css.includes(':focus-visible'), '키보드 포커스');
check(css.includes('@media print'), '인쇄 스타일');
check(adminHtml.includes('snumath1946/research-notices'), '지정 GitHub 저장소');
const crypto = require('node:crypto');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'vendor/manifest.json'), 'utf8'));
for (const [name, hash] of Object.entries(manifest.files)) {
  check(crypto.createHash('sha256').update(fs.readFileSync(path.join(root, 'vendor', name))).digest('hex') === hash, '동봉 라이브러리 무결성');
}
console.log(`PASS: ${checks} checks; ${data.notices.length} notices; ${ready} available attachments; ${pending} pending attachments.`);
console.log(`INFO: ${data.notices.filter(n => n.bodyMarkdown?.trim()).length} text notices; ${data.notices.filter(n => n.legacyBodyImages?.length).length} original captures retained. Live admin GitHub writes are not tested.`);

