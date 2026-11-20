(function (root) {
  'use strict';
  const states = {
    unverified: { key: 'unverified', label: '일정 확인 중' },
    open: { key: 'open', label: '접수 중' },
    upcoming: { key: 'upcoming', label: '접수 예정' },
    closed: { key: 'closed', label: '접수 마감' }
  };
  const normalize = value => String(value || '').normalize('NFKC').toLowerCase().replace(/\s+/g, '');
  function scheduleState(schedule, now) {
    // 날짜만 입력하거나 시간대가 빠진 값으로 브라우저별 다른 판정이 나지 않게 한다.
    const iso = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:Z|[+-]\d{2}:\d{2})$/;
    if (!iso.test(schedule.researcherStart || '') || !iso.test(schedule.researcherEnd || '')) return states.unverified;
    const start = Date.parse(schedule.researcherStart), end = Date.parse(schedule.researcherEnd);
    if (!Number.isFinite(start) || !Number.isFinite(end) || start > end) return states.unverified;
    if (+now < start) return states.upcoming;
    return +now <= end ? states.open : states.closed;
  }
  function getStatus(notice, now = new Date()) {
    if (notice.contentStatus !== 'verified' || !notice.schedules?.length || !Number.isFinite(+now)) return states.unverified;
    const values = notice.schedules.map(item => scheduleState(item, now).key);
    if (values.includes('open')) return states.open;
    if (values.includes('unverified')) return states.unverified;
    if (values.includes('upcoming')) return states.upcoming;
    return states.closed;
  }
  function filterNotices(notices, options = {}, now = new Date()) {
    const terms = String(options.query || '').trim().split(/\s+/).filter(Boolean).map(normalize);
    return notices.filter(n => {
      if (options.year && options.year !== 'all' && String(n.year) !== String(options.year)) return false;
      if (options.family && options.family !== 'all' && n.family !== options.family) return false;
      if (options.status && options.status !== 'all' && getStatus(n, now).key !== options.status) return false;
      const haystack = normalize([n.title, n.fullTitle, n.program, n.family, n.agency, ...(n.types || [])].join(' '));
      return terms.every(term => haystack.includes(term));
    }).sort((a, b) => b.year - a.year || (a.order || 0) - (b.order || 0));
  }
  function getYears(notices) { return [...new Set(notices.map(n => n.year))].sort((a, b) => b - a); }
  function getAttachmentHref(attachment) {
    if (!attachment.available || typeof attachment.href !== 'string') return null;
    const href = attachment.href;
    if (/[\\\u0000-\u001f\u007f]/.test(href)) return null;
    if (href.startsWith('https://')) {
      try { const url = new URL(href); return url.username || url.password ? null : href; } catch { return null; }
    }
    if (!href.startsWith('files/')) return null;
    try {
      const decoded = decodeURIComponent(href);
      if (decoded.includes('\\') || decoded.split('/').some(x => x === '..' || x === '.') || decoded.includes('%') || /[?#]/.test(decoded)) return null;
      return href;
    } catch { return null; }
  }
  function buildReportMailto(program = '') {
    const body = '과제 접수 현황을 알려드립니다.\r\n\r\n접수번호: \r\n사업명: ' + program + '\r\n과제명: \r\n';
    return 'mailto:songh2@snu.ac.kr?subject=' + encodeURIComponent('[과제 접수 현황] ' + program) + '&body=' + encodeURIComponent(body);
  }
  function formatKst(value) {
    if (!value || !Number.isFinite(Date.parse(value))) return '원문 확인 필요';
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(value));
    const get = key => parts.find(p => p.type === key).value;
    return `${get('year')}.${get('month')}.${get('day')} ${get('hour')}:${get('minute')}`;
  }
  const api = { getStatus, scheduleState, filterNotices, getYears, getAttachmentHref, buildReportMailto, formatKst };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.ResearchNoticesModel = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
