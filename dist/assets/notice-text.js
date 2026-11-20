(function (root) {
  'use strict';
  const SCHEMA = 'research-notice-text/v1';
  const MAX_TEXT = 500000;
  const source = {
    kind: 'nrf-official', year: 2027, callRound: 1, checkedAt: '2026-11-20',
    title: '2027 first-round individual basic research call (MSIT)',
    url: 'https://eng.nrf.re.kr/page/62a7fecb-959a-4dcb-80ff-11dcd9913d1e?ac=view&postKey=bb73e9d3-24a2-4837-86e5-7697ba64e06b&boardKey=e0e1b6d7-f66f-4e5b-a69a-8a6e42ea8fb0',
    documentUrl: 'https://eng.nrf.re.kr/download/post/loading/3c28676b-a042-4fd0-a8bc-0e9809e89e2f'
  };
  // Names and grant categories checked against the NRF English call, pp. 1–2.
  // These are summaries of the official call; department deadlines remain separate.
  const officialPrograms = [
    { family: '리더연구', title: 'Leader Grants', program: 'Individual Research Grants', types: ['Type B (Top-Tier)', 'Type A'], summary: 'Long-term support for internationally competitive researchers pursuing advanced basic research.', source },
    { family: '신진연구', title: 'Young Scientist Grants', program: 'Individual Research Grants', types: ['Type B', 'Type A'], summary: 'Support for early-career scientists to establish independent research programs and build research capacity.', source },
    { family: '한우물파기', title: 'Hanwoomul-Phagi Basic Research', program: 'Core Research Grants', types: ['Hanwoomul-Phagi Basic Research'], summary: 'Long-term support for sustained, challenging work in one research area by eligible early-career researchers.', source },
    { family: '핵심연구', title: 'Core Research Grants', program: 'Individual Research Grants', types: ['Type C', 'Type B', 'Type A', 'Merit Research Program'], summary: 'Support for creative investigator-led research, including the Merit Research Program for eligible researchers completing earlier grants.', source }
  ];
  const compact = value => String(value || '').normalize('NFKC').replace(/\s+/g, '');
  function callRound(notice) {
    if (Number.isInteger(notice.callRound)) return notice.callRound;
    const match = String(notice.round || '').match(/([1-9])\s*차/);
    return match ? Number(match[1]) : null;
  }
  function officialMatch(notice) {
    const family = compact(notice.family || notice.title);
    const titles = { '리더연구': ['리더연구'], '신진연구': ['신진연구'], '한우물파기': ['한우물파기', '한우물파기기초연구'], '핵심연구': ['핵심연구'] };
    const item = officialPrograms.find(p => p.source.year === Number(notice.year) && p.source.callRound === callRound(notice) && compact(p.family) === family && (!notice.title || titles[p.family].includes(compact(notice.title))));
    return item ? JSON.parse(JSON.stringify(item)) : null;
  }
  function nrfUrl(value) {
    try { const url = new URL(value); return url.protocol === 'https:' && url.hostname === 'eng.nrf.re.kr' && !url.username && !url.password && !url.port && /^\/(?:page|download\/post)\//.test(url.pathname) ? url.href : null; } catch { return null; }
  }
  function checkedSource(value, notice) {
    if (!value || value.kind !== 'nrf-official' || value.reviewed !== true || Number(value.year) !== Number(notice.year) || Number(value.callRound) !== callRound(notice) || !nrfUrl(value.url)) return null;
    return { kind: 'nrf-official', title: String(value.title || 'NRF English call').slice(0, 500), url: nrfUrl(value.url), documentUrl: nrfUrl(value.documentUrl), year: Number(value.year), callRound: Number(value.callRound), reviewed: true };
  }
  function parseImport(input) {
    if (!input || input.schema !== SCHEMA || input.extraction?.engine !== 'kordoc') throw new Error('공문 변환 도우미에서 만든 JSON을 선택해 주세요.');
    const markdown = input.bodyMarkdown;
    if (typeof markdown !== 'string' || !markdown.trim() || markdown.length > MAX_TEXT) throw new Error('선택한 본문이 비어 있거나 너무 큽니다. 변환 도우미에서 본문 범위를 확인해 주세요.');
    const version = String(input.extraction.version || '');
    if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error('변환 도구의 버전 정보가 올바르지 않습니다.');
    return { bodyMarkdown: markdown.trim(), extraction: { engine: 'kordoc', version, sourceHash: /^[a-f0-9]{64}$/.test(input.extraction.sourceHash) ? input.extraction.sourceHash : null, selection: String(input.extraction.selection || 'review-required').slice(0, 80) }, warnings: Array.isArray(input.warnings) ? input.warnings.filter(x => typeof x === 'string').slice(0, 10) : [] };
  }
  function selectBody(markdown) {
    const lines = String(markdown || '').split('\n');
    const clean = line => compact(line.replace(/^\s*(?:#{1,6}\s+|[-+*]\s+|>\s*)/, '').replace(/\*\*/g, '').replace(/^\s*\|\s*/, ''));
    const start = lines.findIndex(line => /^가[.．·)]?사업(내용|개요)/.test(clean(line)));
    if (start < 0) return { bodyMarkdown: '', selection: 'review-required', warning: '사업내용의 시작을 찾지 못했습니다. 전체 추출문에서 게시할 본문을 직접 골라 주세요.' };
    const contact = lines.findIndex((line, i) => i > start && /^[가-하][.．·)]?문의처/.test(clean(line)));
    const end = lines.findIndex((line, i) => i > (contact < 0 ? start : contact) && (/^붙임(?:[:：]|\d|$)/.test(clean(line)) || /^서울대학교산학협력단장/.test(clean(line)) || /^시행[가-힣]+-\d/.test(clean(line))));
    return { bodyMarkdown: lines.slice(start, end < 0 ? undefined : end).join('\n').trim(), selection: 'suggested-body', warning: '사업내용부터의 본문을 추천했습니다. 표·문의처의 끝과 붙임 제외 여부를 원문과 대조해 주세요.' };
  }
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function render(markdown, factory = root.markdownit) {
    if (typeof factory !== 'function') return '<pre>' + escape(markdown) + '</pre>';
    const parser = factory({ html: false, linkify: false, breaks: true, typographer: false });
    parser.renderer.rules.image = (tokens, index) => escape(tokens[index].content);
    const clean = String(markdown || '').slice(0, MAX_TEXT).replace(/<br\s*\/?>/gi, ' / ').replace(/<!--\s*<table\b[^>]*>\s*-->/gi, '');
    return parser.render(clean);
  }
  const api = { SCHEMA, MAX_TEXT, officialPrograms, officialMatch, callRound, nrfUrl, checkedSource, parseImport, selectBody, render, escape };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.ResearchNoticesText = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
