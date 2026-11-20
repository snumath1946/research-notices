(function () {
  'use strict';
  const I = window.ResearchNoticesI18n;
  const T = window.ResearchNoticesText;
  const lang = I.language(location.search), english = lang === 'en';
  const data = { ...window.ResearchNoticesData, notices: window.ResearchNoticesData.notices.map(n => I.notice(n, lang)) };
  const M = I.model(window.ResearchNoticesModel, lang);
  document.documentElement.lang = lang;
  const main = document.getElementById('main');
  let lastListHash = '#/';
  let currentOptions = {};
  let archiveMode = false;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const languageLink = document.getElementById('language-toggle');
  function updateLanguageLink() { languageLink.href = I.languageUrl(location.href, english ? 'ko' : 'en'); }
  languageLink.textContent = english ? '한국어' : 'English'; languageLink.lang = english ? 'ko' : 'en';
  languageLink.setAttribute('aria-label', english ? '한국어로 보기' : 'View in English'); updateLanguageLink();
  if (english) {
    document.getElementById('language-note').hidden = false;
    document.querySelector('meta[name="description"]').content = 'Research funding opportunities for faculty at the Department of Mathematical Sciences, Seoul National University. View funding calls, dates and application guidance.';
    I.translateDOM(document.body);
  }
  document.querySelector('.skip-link').addEventListener('click', event => {
    event.preventDefault();
    main.focus();
  });
  const icons = {
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/>',
    file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8M8 17h6"/>',
    archive: '<rect x="3" y="3" width="18" height="4" rx="1"/><path d="M5 7v14h14V7M10 11h4"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    external: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 8h18M7 5.5h.01M10 5.5h.01"/>',
    download: '<path d="M12 3v12m-4-4 4 4 4-4M4 16v4h16v-4"/>'
  };
  const icon = name => `<span class="icon" aria-hidden="true"><svg viewBox="0 0 24 24">${icons[name] || icons.file}</svg></span>`;
  document.querySelectorAll('[data-icon]').forEach(el => { el.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${icons[el.dataset.icon] || icons.file}</svg>`; });
  const reportButton = program => `<a class="button button-primary" href="${esc(M.buildReportMailto(program))}">${icon('mail')}접수 정보 이메일 작성</a>`;
  const irisLink = (wide = false) => `<a class="button button-outline${wide ? ' button-wide' : ''}" href="https://www.iris.go.kr/" target="_blank" rel="noopener noreferrer">IRIS 온라인 신청${icon('external')}<span class="sr-only">새 창</span></a>`;
  const sourceAlert = () => `<div class="source-alert" role="note">${icon('info')}<p><strong>원문 확인 전인 디자인 초안입니다.</strong> 공고명과 공통 안내를 먼저 정리했습니다. 신청기간·지원요건 및 첨부파일은 원문 확인 후 제공됩니다.</p></div>`;
  const status = notice => { const s = M.getStatus(notice); return `<span class="status status-${s.key}">${s.label}</span>`; };
  const imageHref = item => data.meta.offlinePreview && /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(item.href || '') ? item.href : M.getAttachmentHref({ ...item, available: true });
  function sidebar(program = '') {
    return `<aside class="sidebar" aria-label="신청 유의사항과 접수 현황 안내">
      <section class="guide-card"><h2>신청 전 꼭 확인하세요</h2>
        <div class="guide-item"><h3>${icon('calendar')}과제마다 신청기간이 달라요</h3><p>유형별 연구자 온라인 신청기간과 주관기관 승인 마감을 각각 확인해 주세요.</p></div>
        <div class="guide-item"><h3>${icon('external')}온라인 신청은 IRIS에서</h3><p>범부처통합연구지원시스템(IRIS)을 통해 온라인 신청을 진행해 주세요.</p></div>
        <div class="guide-item"><h3>${icon('file')}공문·관인 요청이 필요한 경우</h3><p>공문 신청 또는 주관연구개발기관 확약서 직인이 필요한 과제는 신청서 첫 페이지와 연구계획서 등을 보내주셔야 관인 날인 및 공문 처리가 가능합니다.</p></div>
        <a class="button button-outline button-wide" href="#/guide">신청 유의사항 자세히 보기</a>
      </section>
      <section class="report-card">${icon('mail')}<h2>접수하셨다면 알려주세요</h2><p>과제 신청 현황을 파악할 수 있도록 접수 후 <strong>접수번호·사업명·과제명</strong>을 이메일로 보내주세요.</p><a class="report-email" href="mailto:songh2@snu.ac.kr">songh2@snu.ac.kr</a>${reportButton(program)}<p class="mail-helper">사용 중인 메일 앱에서 작성됩니다</p></section>
    </aside>`;
  }
  function renderList(archive, params) {
    archiveMode = archive;
    const years = M.getYears(data.notices);
    const latest = years[0];
    const defaultYear = archive ? 'all' : String(latest);
    currentOptions = {
      year: params.get('year') || defaultYear,
      query: params.get('q') || '',
      family: params.get('family') || 'all',
      status: params.get('status') || 'all'
    };
    if (currentOptions.year !== 'all' && !years.map(String).includes(currentOptions.year)) currentOptions.year = defaultYear;
    const families = [...new Set(data.notices.map(n => n.family))];
    if (!families.includes(currentOptions.family)) currentOptions.family = 'all';
    if (!['all', 'unverified', 'open', 'upcoming', 'closed'].includes(currentOptions.status)) currentOptions.status = 'all';
    const label = archive ? '공고 보관함' : '연구과제 공모 안내';
    document.title = label + ' | 서울대학교 수리과학부';
    main.innerHTML = `<section class="hero" aria-labelledby="page-title"><div class="container hero-inner"><div><p class="eyebrow">${archive ? '연도별로 쌓이는 연구지원 정보' : '한국연구재단 · 기초연구사업'}</p><h1 id="page-title">${label}</h1><p class="intro">${archive ? '지난 공고도 한곳에서.<br>사업연도를 선택해 필요한 공고와 자료를 찾아보세요.' : '지원할 과제를 살펴보고,<br>신청에 필요한 내용을 확인하세요.'}</p></div><div class="year-panel"><span class="label">${archive ? '공고 보관' : '사업연도'}</span><div class="year-number">${archive ? esc(years.length) : esc(latest)}</div><p class="year-caption">${archive ? '개 사업연도' : '1차 신규과제 공모'}</p><span class="year-count">${archive ? '기존 공고와 자료를 연도별로 보관합니다' : '현재 등록된 공고 ' + data.notices.filter(n => n.year === latest).length + '건'}</span></div></div></section>
      <div class="container content-wrap">${data.meta.draft ? sourceAlert() : ''}<div class="workspace"><section aria-labelledby="notice-list-heading"><div class="section-top"><h2 id="notice-list-heading">${archive ? '전체 공고' : '공모 목록'}<span class="count" id="result-count" role="status" aria-live="polite" aria-atomic="true"></span></h2><span class="quiet">사업연도 기준</span></div>
      <form class="toolbar" id="filter-form" role="search" aria-label="공고 검색">
        <div class="field"><label class="sr-only" for="year-filter">사업연도</label><select id="year-filter" name="year"><option value="all">전체 연도</option>${years.map(y => `<option value="${y}"${String(y) === currentOptions.year ? ' selected' : ''}>${y}년도</option>`).join('')}</select></div>
        <div class="field search-field">${icon('search')}<label class="sr-only" for="notice-search">공고명·사업명 검색</label><input id="notice-search" name="q" type="search" placeholder="공고명·사업명 검색" value="${esc(currentOptions.query)}" autocomplete="off"></div>
        <div class="field status-field"><label class="sr-only" for="status-filter">접수 상태</label><select id="status-filter" name="status">${[['all','전체 상태'],['open','접수 중'],['upcoming','접수 예정'],['closed','접수 마감'],['unverified','일정 확인 중']].map(([v,l]) => `<option value="${v}"${v === currentOptions.status ? ' selected' : ''}>${l}</option>`).join('')}</select></div>
      </form>
      <div class="filter-tabs" role="group" aria-label="연구유형 선택">${['all', ...families].map(f => `<button type="button" class="filter-tab" data-family="${esc(f)}" aria-pressed="${f === currentOptions.family}">${f === 'all' ? '전체' : esc(f)}</button>`).join('')}</div>
      <div class="list-columns" aria-hidden="true"><span>공고명</span><span>연구자 온라인 신청</span><span>첨부자료</span></div><ul id="notice-results" aria-label="연구과제 공고 목록"></ul><p class="list-footnote">모든 일정은 한국시간(KST) 기준입니다. 과제·유형별 신청기간을 확인해 주세요.</p>
      <div class="archive-note">${icon('archive')}<p>공고는 사업연도별로 계속 보관됩니다.<br>${archive ? '현재 ' + years.map(y => y + '년도').join('·') + ' 공고 ' + data.notices.length + '건이 등록되어 있습니다.' : '<a class="text-link" href="#/archive">공고 보관함</a>에서 지난 연도 자료도 확인할 수 있습니다.'}</p></div></section>${sidebar()}</div></div>`;
    document.getElementById('year-filter').value = currentOptions.year;
    document.getElementById('filter-form').addEventListener('submit', e => { e.preventDefault(); updateFilters(); });
    document.getElementById('notice-search').addEventListener('input', updateFilters);
    document.getElementById('year-filter').addEventListener('change', updateFilters);
    document.getElementById('status-filter').addEventListener('change', updateFilters);
    document.querySelectorAll('[data-family]').forEach(button => button.addEventListener('click', () => {
      currentOptions.family = button.dataset.family;
      document.querySelectorAll('[data-family]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
      updateFilters();
    }));
    renderResults();
    lastListHash = location.hash || '#/';
  }
  function updateFilters() {
    currentOptions.query = document.getElementById('notice-search').value;
    currentOptions.year = document.getElementById('year-filter').value;
    currentOptions.status = document.getElementById('status-filter').value;
    const params = new URLSearchParams();
    for (const [name, value] of Object.entries({ year: currentOptions.year, q: currentOptions.query, family: currentOptions.family, status: currentOptions.status })) {
      if (value && (name === 'year' || value !== 'all')) params.set(name, value);
    }
    const hash = '#/' + (archiveMode ? 'archive' : '') + (params.size ? '?' + params.toString() : '');
    history.replaceState(null, '', hash);
    updateLanguageLink();
    lastListHash = hash;
    renderResults();
  }
  function renderResults() {
    const found = M.filterNotices(data.notices, currentOptions);
    document.getElementById('result-count').textContent = found.length + '건';
    const results = document.getElementById('notice-results');
    results.innerHTML = found.length ? found.map(n => {
      const dates = n.contentStatus === 'verified' && n.schedules.length ? `<span class="date-caption">유형별 일정 확인</span>` : '<span class="date-caption">원문 확인 필요</span>';
      const readyCount = n.attachments.filter(a => M.getAttachmentHref(a)).length;
      const typeSummary = n.types.length === 1 && n.types[0] === n.title ? n.program : n.types.join(' · ');
      return `<li class="notice-row"><a class="notice-link" href="#/notice/${encodeURIComponent(n.id)}"><div><p class="notice-meta"><span>${n.year}년도</span><span>${esc(n.round)}</span></p><h3 class="notice-title">${esc(n.title)}</h3><p class="notice-types">${esc(typeSummary)}</p></div><div class="notice-date">${status(n)}${dates}</div><div class="attachment-meta"><span class="formats">첨부파일</span>${readyCount ? readyCount + '개 파일' : '등록 전'}</div></a></li>`;
    }).join('') : `<li class="empty-state"><h3>조건에 맞는 공고가 없습니다</h3><p>검색어 또는 필터를 바꿔 다시 확인해 주세요.</p><button type="button" id="reset-filters" class="button button-outline">검색 조건 초기화</button></li>`;
    document.getElementById('reset-filters')?.addEventListener('click', () => {
      currentOptions = { year: 'all', query: '', family: 'all', status: 'all' };
      document.getElementById('notice-search').value = '';
      document.getElementById('year-filter').value = 'all';
      document.getElementById('status-filter').value = 'all';
      document.querySelectorAll('[data-family]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.family === 'all')));
      updateFilters();
      document.getElementById('notice-search').focus();
    });
    if (english) { I.translateDOM(results); I.translateDOM(document.getElementById('result-count')); }
  }
  function renderDetail(id) {
    const n = data.notices.find(item => item.id === id);
    if (!n) { renderMissing(); return; }
    if (n.bodyImages?.length || n.bodyMarkdown?.trim() || n.bodyText?.trim()) { renderBodyDetail(n); return; }
    document.title = n.title + ' | 연구과제 공모 안내';
    const verified = n.contentStatus === 'verified';
    const fact = value => verified && value ? esc(value) : '<span class="unconfirmed">원문 확인 후 안내</span>';
    const scheduleRows = verified && n.schedules.length ? `<div class="schedule-list">${n.schedules.map(s => `<div class="schedule-entry"><h3>${esc(s.label)}</h3><p>연구자 온라인 신청<br>${esc(M.formatKst(s.researcherStart))} ~ ${esc(M.formatKst(s.researcherEnd))}</p><p>주관기관 승인 마감: ${esc(M.formatKst(s.institutionEnd))}</p></div>`).join('')}</div>` : '<div class="schedule-entry"><p>연구자 온라인 신청기간 및 주관기관 승인 마감은 원문 확인 후 안내합니다.</p></div>';
    main.innerHTML = `<div class="container"><nav class="breadcrumb" aria-label="현재 위치"><a href="${esc(lastListHash)}">공모 목록</a><span aria-hidden="true">/</span><span>${n.year}년도</span><span aria-hidden="true">/</span><span>${esc(n.title)}</span></nav><header class="detail-heading"><div class="tagline"><span>${n.year}년도 · ${esc(n.round)}</span>${status(n)}</div><h1>${esc(n.fullTitle)}</h1><p class="detail-meta">공모기관 ${esc(n.agency)} · 안내 경유 ${esc(n.via)}</p></header>
      <div class="workspace detail-layout"><article aria-label="공모 상세 안내"><p class="detail-summary">${esc(n.summary)}</p>${verified ? '' : sourceAlert()}
      <section class="detail-section"><h2>주요 내용</h2><dl class="facts"><div><dt>사업연도</dt><dd>${n.year}년도</dd></div><div><dt>사업명</dt><dd>${esc(n.program)} · ${esc(n.title)}</dd></div><div><dt>공모 유형</dt><dd>${esc(n.types.join(' · '))}</dd></div><div><dt>신청 대상</dt><dd>${fact(n.eligibility)}</dd></div><div><dt>지원 규모</dt><dd>${fact(n.funding)}</dd></div><div><dt>연구 기간</dt><dd>${fact(n.duration)}</dd></div><div><dt>온라인 신청</dt><dd><a class="text-link" href="https://www.iris.go.kr/" target="_blank" rel="noopener noreferrer">IRIS 범부처통합연구지원시스템<span class="sr-only"> 새 창</span></a></dd></div></dl></section>
      <section class="detail-section"><h2>신청 일정</h2>${scheduleRows}<p class="schedule-hint">같은 사업 안에서도 유형별 신청기간이 다를 수 있습니다. 연구자 신청 마감과 주관기관 승인 마감을 구분해 확인해 주세요.</p></section>
      ${verified && n.details?.length ? `<section class="detail-section"><h2>공문 주요 안내</h2><ul class="detail-common">${n.details.map(item => `<li>${esc(item)}</li>`).join('')}</ul>${n.sourceReference ? `<p class="quiet">근거: ${esc(n.sourceReference)}</p>` : ''}</section>` : ''}
      <section class="detail-section"><h2>공문 및 신청서류</h2><ul class="attachment-list">${n.attachments.map(a => {
        const href = M.getAttachmentHref(a);
        return `<li class="attachment-row"><span class="file-symbol" aria-hidden="true">${esc(a.format)}</span><div class="file-description"><p class="file-label">${esc(a.label)}</p><p class="file-name">${esc(a.filename)}</p></div>${href ? `<a class="button button-outline button-small" href="${esc(href)}" download>${icon('download')}다운로드<span class="sr-only"> ${esc(a.label)}</span></a>` : `<button class="button button-muted button-small" disabled aria-label="${esc(a.label)} 준비 중">자료 준비 중</button>`}</li>`;
      }).join('')}</ul><p class="list-footnote">${n.attachments.every(a => M.getAttachmentHref(a)) ? '첨부자료의 공고문 및 작성 양식을 확인해 주세요.' : '원본 자료가 연결되면 이곳에서 PDF 공문과 ZIP 신청서류를 다운로드할 수 있습니다.'}</p></section>
      <section class="detail-section"><h2>공통 유의사항</h2><ul class="detail-common"><li>과제별 온라인 신청기간이 상이합니다. 해당 과제와 유형의 신청기간을 확인하고 IRIS를 통해 온라인 신청을 진행해 주세요.</li><li>과제에 따라 공문 신청 또는 주관연구개발기관 확약서 직인 날인을 위한 공문 요청이 필요할 수 있습니다. 처리가 필요한 경우 <strong>과제 신청서 첫 페이지, 연구계획서 등</strong>을 보내주셔야 관인 날인 및 공문 처리가 가능합니다.</li><li>접수 후 <strong>접수번호, 사업명, 과제명</strong> 등 접수 정보를 <a class="text-link" href="mailto:songh2@snu.ac.kr">songh2@snu.ac.kr</a>로 보내주세요.</li></ul></section><div class="detail-actions"><a class="button button-outline" href="${esc(lastListHash)}">공모 목록으로</a></div></article>${sidebar(n.title)}</div></div>`;
  }
  function renderBodyDetail(n) {
    document.title = n.title + ' | 서울대학교 수리과학부';
    const images = (n.bodyImages || []).map((item, index) => {
      const href = imageHref(item);
      return href ? `<figure class="notice-body-figure"><img src="${esc(href)}" alt="${esc(item.alt || n.title + ' 공문 본문 ' + (index + 1))}"${item.width && item.height ? ` width="${Number(item.width)}" height="${Number(item.height)}"` : ''}${index ? ' loading="lazy"' : ''}></figure>` : '';
    }).join('');
    const originalBody = n.bodyMarkdown || n.bodyText || '';
    const textBody = originalBody.trim() ? `<div class="notice-text-content" lang="ko" data-preserve-language>${T.render(originalBody)}</div>` : `<div class="notice-body-images" lang="ko" data-preserve-language>${images}</div>`;
    const source = n.englishSource;
    const sourceNote = source ? `<div class="official-source"><strong>Based on the NRF official English call</strong><p>${esc(source.title)} · ${source.year} · Round ${source.callRound}</p><a class="text-link" href="${esc(source.url)}" target="_blank" rel="noopener noreferrer">Read the NRF English call</a>${source.documentUrl ? ` · <a class="text-link" href="${esc(source.documentUrl)}" target="_blank" rel="noopener noreferrer">Official English document</a>` : ''}</div>` : '<p class="list-footnote">This English guidance has not been linked to a verified NRF English call.</p>';
    const overview = english ? `<section class="english-overview" aria-labelledby="english-overview-heading"><h2 id="english-overview-heading">English overview</h2><p>${esc(n.summary)}</p>${sourceNote}${source && n.english?.officialBodyMarkdown ? `<h3>NRF English call — selected program text</h3><div class="notice-text-content" data-preserve-language>${T.render(n.english.officialBodyMarkdown)}</div>` : ''}<dl class="facts"><div><dt>Funding program</dt><dd>${esc(n.program)}</dd></div><div><dt>Funding types</dt><dd>${esc(n.types.join(' · '))}</dd></div></dl><h3>Application schedule</h3><p class="list-footnote">Dates below follow the department notice. All times are Korea Standard Time (KST).</p>${n.contentStatus === 'verified' && n.schedules.length ? n.schedules.map(s => `<div class="schedule-entry"><h4>${esc(s.label)}</h4><p>Researcher applications: ${esc(M.formatKst(s.researcherStart))} – ${esc(M.formatKst(s.researcherEnd))}</p><p>Institutional approval deadline: ${esc(M.formatKst(s.institutionEnd))}</p></div>`).join('') : '<p>Application dates have not yet been verified. Please check the Korean notice.</p>'}${n.english?.bodyText ? `<h3>Department guidance (English translation)</h3><div class="notice-text-content" data-preserve-language>${T.render(n.english.bodyText)}</div>` : ''}<p class="list-footnote">Consult the NRF English call for program rules and the department notice for local submission instructions. Check both sources before applying.</p></section>` : '';
    const attachments = n.attachments || [];
    main.innerHTML = `<div class="container"><nav class="breadcrumb" aria-label="현재 위치"><a href="${esc(lastListHash)}">공모 목록</a><span aria-hidden="true">/</span><span>${n.year}년도</span><span aria-hidden="true">/</span><span>${esc(n.title)}</span></nav><header class="detail-heading"><div class="tagline"><span>${n.year}년도 · ${esc(n.round)}</span>${status(n)}</div><h1>${esc(n.fullTitle)}</h1><p class="detail-meta">공모기관 ${esc(n.agency)} · 안내 경유 ${esc(n.via)}</p></header><div class="workspace detail-layout"><article aria-label="공모 상세 안내">${overview}<section class="notice-body-section"><h2>공문 본문</h2><p class="list-footnote">사업내용 · 신청기간 · 제출서류 · 신청방법 · 유의사항 · 문의처</p>${english ? `<details class="original-notice"><summary>Original department notice (Korean)</summary>${textBody}</details>` : textBody}</section><section class="detail-section"><h2>신청서류 및 첨부자료</h2>${attachments.length ? `<ul class="attachment-list">${attachments.map(a => { const href = M.getAttachmentHref(a); return `<li class="attachment-row"><span class="file-symbol" aria-hidden="true">${esc(a.format)}</span><div class="file-description"><p class="file-label">${esc(a.label || a.filename)}</p><p class="file-name">${esc(a.filename)}</p></div>${href ? `<a class="button button-outline button-small" href="${esc(href)}" download>${icon('download')}다운로드<span class="sr-only"> ${esc(a.filename)}</span></a>` : '<span class="quiet">자료 준비 중</span>'}</li>`; }).join('')}</ul>` : '<p class="unconfirmed">아직 등록된 첨부파일이 없습니다. 담당자가 신청서류를 추가하면 이곳에서 다운로드할 수 있습니다.</p>'}</section><div class="detail-actions"><a class="button button-outline" href="${esc(lastListHash)}">공모 목록으로</a></div></article>${sidebar(n.title)}</div></div>`;
  }
  function renderGuide() {
    document.title = '신청 전 확인 | 연구과제 공모 안내';
    main.innerHTML = `<div class="container guide-page"><div class="page-heading"><p class="eyebrow">연구과제 신청 안내</p><h1>신청 전 확인하세요</h1><p>공고 확인부터 접수 현황 공유까지, 필요한 절차를 안내합니다.</p></div><div class="workspace"><article aria-label="신청 절차">
      <section class="guide-step"><h2>과제별 일정 확인</h2><div><p>온라인 신청기간은 과제와 유형에 따라 상이합니다. 지원할 공고의 원문에서 신청 대상, 연구자 온라인 신청기간, 주관연구개발기관 승인 마감을 각각 확인해 주세요.</p><p class="schedule-hint">사업연도와 실제 접수연도는 다를 수 있습니다. 예를 들어 2027년도 사업의 접수는 전년도에 진행될 수 있으므로 공고에 명시된 날짜를 기준으로 확인해 주세요.</p></div></section>
      <section class="guide-step"><h2>공문·관인 요청</h2><div><p>과제별로 공문으로 신청해야 하거나, 주관연구개발기관 확약서에 직인 날인을 위한 공문 요청이 필요한 경우가 있습니다.</p><p>신청 또는 관인 날인·공문 처리가 필요한 경우에는 다음 자료 등을 보내주세요.</p><ul><li>과제 신청서 첫 페이지</li><li>연구계획서</li><li>해당 과제에서 요구하는 추가 서류</li></ul><p>자료를 보내주셔야 관인 날인 및 공문 처리가 가능합니다. 필요 서류와 일정은 과제별 공문을 확인해 주세요.</p></div></section>
      <section class="guide-step"><h2>IRIS 온라인 신청</h2><div><p>범부처통합연구지원시스템(IRIS)을 통해 온라인 신청을 진행해 주세요. 기관의 공문 처리가 온라인 신청을 대신하는지는 과제별 공고를 확인해 주세요.</p>${irisLink()}</div></section>
      <section class="guide-step"><h2>접수 현황 공유</h2><div><p>과제 신청 현황 파악을 위해 접수하신 후 어떤 과제에 접수하셨는지 <strong>접수번호, 사업명, 과제명</strong> 등 정보를 <a class="text-link" href="mailto:songh2@snu.ac.kr">songh2@snu.ac.kr</a>로 보내주세요.</p><div class="mail-template">접수번호:\n사업명:\n과제명:</div>${reportButton()}<p class="list-footnote">이 버튼은 메일 작성 화면을 엽니다. 내용을 입력한 후 직접 발송해 주세요.</p></div></section>
      <div class="detail-actions"><a class="button button-outline" href="#/">공모 목록 보기</a></div></article>${sidebar()}</div></div>`;
  }
  function renderMissing() {
    document.title = '공고를 찾을 수 없습니다 | 연구과제 공모 안내';
    main.innerHTML = '<div class="container guide-page"><div class="empty-state"><h1>공고를 찾을 수 없습니다</h1><p>주소를 확인하거나 공모 목록에서 다시 선택해 주세요.</p><a class="button button-primary" href="#/">공모 목록 보기</a></div></div>';
  }
  function route(initial = false) {
    const [path, query = ''] = (location.hash.slice(1) || '/').split('?');
    const params = new URLSearchParams(query);
    let nav = 'list';
    if (path === '/' || path === '') renderList(false, params);
    else if (path === '/archive') { renderList(true, params); nav = 'archive'; }
    else if (path === '/guide') { renderGuide(); nav = 'guide'; }
    else if (path.startsWith('/notice/')) { try { renderDetail(decodeURIComponent(path.slice(8))); } catch { renderMissing(); } }
    else renderMissing();
    document.querySelectorAll('[data-nav]').forEach(el => {
      if (el.dataset.nav === nav) el.setAttribute('aria-current', 'page');
      else el.removeAttribute('aria-current');
    });
    if (english) { I.translateDOM(main); document.title = I.text(document.title); }
    updateLanguageLink();
    if (!initial) { window.scrollTo(0, 0); main.focus({ preventScroll: true }); }
  }
  window.addEventListener('hashchange', () => route());
  // 열린 화면도 1분마다 상태를 다시 계산한다. 사용자가 입력 중인 필터는 보존한다.
  window.setInterval(() => { if (document.getElementById('notice-results')) renderResults(); }, 60000);
  route(true);
})();
