(function (root) {
  'use strict';
  const MAX_FILE = 25 * 1024 * 1024;
  const extension = name => String(name).split('.').pop().toLowerCase();
  const compact = text => String(text || '').normalize('NFKC').replace(/\s+/g, '');
  function validateRanges(ranges) {
    if (!Array.isArray(ranges) || !ranges.length) throw new Error('표시할 본문 범위를 선택해 주세요.');
    const seen = new Set();
    for (const r of ranges) {
      if (!Number.isInteger(r.page) || r.page < 1 || seen.has(r.page) || !Number.isFinite(r.top) || !Number.isFinite(r.bottom) || r.top < 0 || r.bottom > 100 || r.bottom - r.top < 1) throw new Error('페이지와 본문 위·아래 범위를 확인해 주세요.');
      seen.add(r.page);
    }
    return true;
  }
  function suggestRanges(pages) {
    const all = pages.flatMap(p => p.lines.map(l => ({ ...l, page: p.page, height: p.height }))).sort((a, b) => a.page - b.page || a.y - b.y);
    const start = all.findIndex(l => /^가[.．·)]?사업(내용|개요)/.test(compact(l.text)));
    if (start < 0) return { ranges: [], warning: '사업내용 제목을 찾지 못했습니다. 스캔본 또는 다른 양식일 수 있으니 표시할 페이지와 범위를 직접 선택해 주세요.' };
    const contacts = all.findIndex((l, i) => i > start && /^[가-하][.．·)]?문의처/.test(compact(l.text)));
    const end = all.findIndex((l, i) => i > (contacts < 0 ? start : contacts) && (/^붙임(?:[:：]|\d|$)/.test(compact(l.text)) || /^서울대학교산학협력단장/.test(compact(l.text)) || /^시행[가-힣]+-\d/.test(compact(l.text))));
    const first = all[start], last = end < 0 ? null : all[end];
    const ranges = pages.filter(p => p.page >= first.page && (!last || p.page <= last.page)).map(p => ({ page: p.page, top: p.page === first.page ? Math.max(0, (first.y - 12) / p.height * 100) : 0, bottom: last && p.page === last.page ? Math.max(0, (last.y - 12) / p.height * 100) : 100 })).filter(r => r.bottom - r.top >= 1);
    return { ranges, warning: contacts < 0 ? '문의처의 끝을 자동 확인하지 못했습니다. 선택된 본문 범위를 검토해 주세요.' : '가. 사업내용부터 문의처까지의 범위를 추천했습니다. 표와 마지막 행이 빠지지 않았는지 확인해 주세요.' };
  }
  function textForRanges(pages, ranges) {
    return ranges.map(r => {
      const p = pages.find(p => p.page === r.page);
      if (!p) return '';
      return p.lines.filter(l => l.y >= p.height * r.top / 100 && l.y < p.height * r.bottom / 100).map(l => l.text).join('\n');
    }).filter(Boolean).join('\n\n');
  }
  function validateUpload(file) {
    if (!file || !/^(pdf|zip|hwp|hwpx|doc|docx|xls|xlsx|ppt|pptx|txt|csv)$/.test(extension(file.name))) throw new Error('PDF·ZIP·한글·오피스 문서·TXT·CSV 파일을 선택해 주세요.');
    if (!Number.isFinite(file.size) || file.size <= 0 || file.size > MAX_FILE) throw new Error('첨부파일은 0바이트보다 크고 개당 25MB 이하여야 합니다.');
    return true;
  }
  function filePath(year, id, name, fingerprint) {
    if (!Number.isInteger(year) || year < 2000 || !/^[a-z0-9-]+$/.test(id) || !/^[a-f0-9-]+$/.test(fingerprint)) throw new Error('올바르지 않은 파일 저장 경로입니다.');
    return `files/${year}/${id}/attachments/${fingerprint}.${extension(name)}`;
  }
  function validateDraft(draft) {
    if (!draft || !/^[a-z0-9-]+$/.test(draft.id || '')) throw new Error('공고 식별자를 확인해 주세요.');
    if (!draft.title?.trim() || !draft.family?.trim()) throw new Error('공고명과 연구유형을 입력해 주세요.');
    if (!Number.isInteger(draft.year) || draft.year < 2000 || draft.year > 2200) throw new Error('사업연도를 확인해 주세요.');
    if (!draft.bodyImages?.length) throw new Error('PDF에서 본문 범위를 선택하고 미리보기를 만들어 주세요.');
    if (!draft.reviewed) throw new Error('표시할 본문과 첨부파일을 확인한 후 확인란을 선택해 주세요.');
    return true;
  }
  function mergeNotice(catalog, notice) {
    const copy = JSON.parse(JSON.stringify(catalog));
    const at = copy.notices.findIndex(n => n.id === notice.id);
    if (at >= 0) copy.notices[at] = JSON.parse(JSON.stringify(notice));
    else copy.notices.push(JSON.parse(JSON.stringify(notice)));
    copy.meta = { ...copy.meta, repository: 'snumath1946/research-notices' };
    return copy;
  }
  function catalogScript(catalog) {
    const json = JSON.stringify(catalog, null, 2).replace(/</g, '\\u003c').replace(/\//g, '\\u002f').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
    return '/* 공고 데이터: 관리자 화면에서 갱신. 과거 연도와 ID를 보존하세요. */\n(function(root) {\nconst data = /* CATALOG_JSON_START */\n' + json + '\n/* CATALOG_JSON_END */;\nif (typeof module !== "undefined" && module.exports) module.exports = data; else root.ResearchNoticesData = data;\n})(typeof window !== "undefined" ? window : globalThis);\n';
  }
  function parseCatalog(script) {
    const match = script.match(/\/\* CATALOG_JSON_START \*\/([\s\S]*?)\/\* CATALOG_JSON_END \*\//);
    if (!match) throw new Error('저장소 공고 데이터 형식이 다릅니다. 최신 사이트 소스를 먼저 올려 주세요.');
    const value = JSON.parse(match[1]);
    if (!Array.isArray(value.notices) || !value.meta) throw new Error('공고 목록 형식이 올바르지 않습니다.');
    return value;
  }
  async function buildUpdateZip(JSZip, catalog, notice, pendingFiles) {
    const zip = new JSZip(), merged = mergeNotice(catalog, notice);
    zip.file('dist/data/notices.js', catalogScript(merged), { compression: 'DEFLATE' });
    const referenced = new Set([...(notice.bodyImages || []).map(i => i.href), ...(notice.attachments || []).filter(a => a.available).map(a => a.href)]);
    for (const file of pendingFiles) {
      if (!referenced.has(file.path) || !/^files\/[0-9]{4}\/[a-z0-9-]+\/(?:attachments\/)?[a-zA-Z0-9._-]+$/.test(file.path) || file.path.split('/').includes('..')) throw new Error('공고에 연결되지 않은 파일은 업데이트에 포함할 수 없습니다.');
      zip.file('dist/' + file.path, file.bytes);
    }
    zip.file('업데이트-적용안내.txt', '이 ZIP은 전체 사이트가 아니라 업데이트 파일입니다.\n대상: snumath1946/research-notices\n동일 경로에 파일을 추가·교체하고 기존 공고 및 파일은 보존하세요.\n다른 관리자의 변경이 있으면 최신 목록을 불러와 다시 내보내세요.\n원문 PDF 전체는 자동 포함되지 않습니다.\n');
    return zip.generateAsync({ type: 'blob', compression: 'STORE' });
  }
  const api = { MAX_FILE, suggestRanges, textForRanges, validateRanges, validateUpload, filePath, validateDraft, mergeNotice, catalogScript, parseCatalog, buildUpdateZip };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.ResearchNoticesAdminCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
