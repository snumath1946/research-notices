(function (root) {
  'use strict';
  const phrases = {
    '본문 바로가기': 'Skip to content', '서울대학교 수리과학부': 'Department of Mathematical Sciences, SNU',
    '서울대학교': 'Seoul National University', '수리과학부 연구지원': 'Mathematical Sciences · Research Support',
    '연구지원 안내': 'Research Support', '연구과제 공모 안내 홈': 'Research funding opportunities home',
    '주요 메뉴': 'Main navigation', '공모 안내': 'Funding Opportunities', '신청 전 확인': 'Before You Apply',
    '공고 보관함': 'Notice Archive', 'IRIS 신청': 'Apply via IRIS', '새 창': 'opens in a new tab',
    '서울대학교 수리과학부 · 연구과제 공모 안내': 'Research Funding Opportunities · Mathematical Sciences, SNU',
    '공고별 신청기간과 세부 요건은 반드시 해당 공문 및 공고 원문을 확인해 주세요.': 'Check the original notice for the application period and detailed requirements of each call.',
    '공고 관리': 'Manage notices (Korean)', '연구과제 공모 안내': 'Research Funding Opportunities',
    '접수 정보 이메일 작성': 'Email your submission details', 'IRIS 온라인 신청': 'Apply online via IRIS',
    '원문 확인 전인 디자인 초안입니다.': 'This draft has not been checked against the original notice.',
    '공고명과 공통 안내를 먼저 정리했습니다. 신청기간·지원요건 및 첨부파일은 원문 확인 후 제공됩니다.': 'Application dates, eligibility and attachments will be provided after the original notice has been reviewed.',
    '신청 유의사항과 접수 현황 안내': 'Application guidance and submission reporting',
    '신청 전 꼭 확인하세요': 'Before you apply', '과제마다 신청기간이 달라요': 'Dates vary by call',
    '유형별 연구자 온라인 신청기간과 주관기관 승인 마감을 각각 확인해 주세요.': 'Check both the researcher application period and the institutional approval deadline for your funding type.',
    '온라인 신청은 IRIS에서': 'Submit online through IRIS',
    '범부처통합연구지원시스템(IRIS)을 통해 온라인 신청을 진행해 주세요.': 'Submit your application through IRIS, the Integrated R&D Information System.',
    '공문·관인 요청이 필요한 경우': 'Official letters and institutional seals',
    '공문 신청 또는 주관연구개발기관 확약서 직인이 필요한 과제는 신청서 첫 페이지와 연구계획서 등을 보내주셔야 관인 날인 및 공문 처리가 가능합니다.': 'If a call requires an official letter or an institutional seal on a commitment form, send the first page of your application, your research plan and other required documents to the department office.',
    '신청 유의사항 자세히 보기': 'Read the application guide', '접수하셨다면 알려주세요': 'Let us know once you apply',
    '과제 신청 현황을 파악할 수 있도록 접수 후': 'After submitting your application, email your',
    '접수번호·사업명·과제명': 'application number, funding program and project title',
    '을 이메일로 보내주세요.': 'to the department office.', '사용 중인 메일 앱에서 작성됩니다': 'Opens a draft in your email app',
    '연도별로 쌓이는 연구지원 정보': 'Research funding information by year', '한국연구재단 · 기초연구사업': 'National Research Foundation of Korea · Basic Research',
    '지난 공고도 한곳에서.': 'Past notices, all in one place.', '사업연도를 선택해 필요한 공고와 자료를 찾아보세요.': 'Choose a funding year to find notices and related documents.',
    '지원할 과제를 살펴보고,': 'Explore research funding opportunities', '신청에 필요한 내용을 확인하세요.': 'and find the information you need to apply.',
    '공고 보관': 'Archive', '사업연도': 'Funding year', '개 사업연도': 'funding years',
    '1차 신규과제 공모': 'First round · New projects', '기존 공고와 자료를 연도별로 보관합니다': 'Notices and documents are retained by funding year',
    '전체 공고': 'All notices', '공모 목록': 'Funding calls', '사업연도 기준': 'By funding year',
    '공고 검색': 'Search funding calls', '전체 연도': 'All years', '공고명·사업명 검색': 'Search calls or programs',
    '접수 상태': 'Application status', '전체 상태': 'All statuses', '접수 중': 'Open', '접수 예정': 'Upcoming',
    '접수 마감': 'Closed', '일정 확인 중': 'Dates under review', '연구유형 선택': 'Choose a research category',
    '전체': 'All', '공고명': 'Funding call', '연구자 온라인 신청': 'Researcher applications', '첨부자료': 'Documents',
    '연구과제 공고 목록': 'Research funding notices',
    '모든 일정은 한국시간(KST) 기준입니다. 과제·유형별 신청기간을 확인해 주세요.': 'All times are Korea Standard Time (KST, UTC+9). Check the dates for your call and funding type.',
    '공고는 사업연도별로 계속 보관됩니다.': 'Notices remain available in the archive by funding year.',
    '에서 지난 연도 자료도 확인할 수 있습니다.': 'also includes documents from previous funding years.',
    '유형별 일정 확인': 'See dates by funding type', '원문 확인 필요': 'Check the original notice',
    '첨부파일': 'Attachments', '등록 전': 'Not yet available', '조건에 맞는 공고가 없습니다': 'No matching notices',
    '검색어 또는 필터를 바꿔 다시 확인해 주세요.': 'Try another search term or adjust the filters.', '검색 조건 초기화': 'Reset filters',
    '원문 확인 후 안내': 'To be confirmed against the original notice', '현재 위치': 'Breadcrumb', '공모 상세 안내': 'Funding call details',
    '주요 내용': 'Overview', '사업명': 'Funding program', '공모 유형': 'Funding types', '신청 대상': 'Eligibility',
    '지원 규모': 'Funding amount', '연구 기간': 'Research period', '온라인 신청': 'Online application',
    'IRIS 범부처통합연구지원시스템': 'IRIS · Integrated R&D Information System', '신청 일정': 'Application schedule',
    '연구자 온라인 신청기간 및 주관기관 승인 마감은 원문 확인 후 안내합니다.': 'The researcher application period and institutional approval deadline are awaiting verification.',
    '같은 사업 안에서도 유형별 신청기간이 다를 수 있습니다. 연구자 신청 마감과 주관기관 승인 마감을 구분해 확인해 주세요.': 'Dates may differ by funding type within a program. The researcher application deadline and institutional approval deadline are separate.',
    '공문 주요 안내': 'Notice highlights', '공문 및 신청서류': 'Official notice and application documents',
    '다운로드': 'Download', '자료 준비 중': 'Not yet available',
    '첨부자료의 공고문 및 작성 양식을 확인해 주세요.': 'Read the attached notice and use the required application forms.',
    '원본 자료가 연결되면 이곳에서 PDF 공문과 ZIP 신청서류를 다운로드할 수 있습니다.': 'The official PDF and application documents will be available here once they are uploaded.',
    '공통 유의사항': 'General guidance', '과제별 온라인 신청기간이 상이합니다. 해당 과제와 유형의 신청기간을 확인하고 IRIS를 통해 온라인 신청을 진행해 주세요.': 'Application periods vary by call and funding type. Check your dates and apply through IRIS.',
    '과제에 따라 공문 신청 또는 주관연구개발기관 확약서 직인 날인을 위한 공문 요청이 필요할 수 있습니다. 처리가 필요한 경우': 'Some calls require an official letter or an institutional seal on a commitment form. To arrange this, send the',
    '과제 신청서 첫 페이지, 연구계획서 등': 'first page of your application, research plan and other required documents',
    '을 보내주셔야 관인 날인 및 공문 처리가 가능합니다.': 'to the department office.', '접수 후': 'After applying, email your',
    '접수번호, 사업명, 과제명': 'application number, funding program and project title', '등 접수 정보를': 'to', '로 보내주세요.': '.',
    '공모 목록으로': 'Back to funding calls', '공문 본문': 'Official notice (Korean)',
    '사업내용 · 신청기간 · 제출서류 · 신청방법 · 유의사항 · 문의처': 'Program details · Dates · Documents · How to apply · Guidance · Contacts',
    '본문 텍스트로 보기': 'Read the original Korean text', '신청서류 및 첨부자료': 'Application documents and attachments',
    '아직 등록된 첨부파일이 없습니다. 담당자가 신청서류를 추가하면 이곳에서 다운로드할 수 있습니다.': 'No attachments have been uploaded yet. Application documents will be available here when added by the department office.',
    '연구과제 신청 안내': 'Research funding application guide', '신청 전 확인하세요': 'Before you apply',
    '공고 확인부터 접수 현황 공유까지, 필요한 절차를 안내합니다.': 'From reading a call to reporting your submission: the steps you need to take.',
    '신청 절차': 'Application process', '과제별 일정 확인': 'Check the dates',
    '온라인 신청기간은 과제와 유형에 따라 상이합니다. 지원할 공고의 원문에서 신청 대상, 연구자 온라인 신청기간, 주관연구개발기관 승인 마감을 각각 확인해 주세요.': 'Dates vary by call and funding type. Read the original notice to check eligibility, the researcher application period and the institutional approval deadline.',
    '사업연도와 실제 접수연도는 다를 수 있습니다. 예를 들어 2027년도 사업의 접수는 전년도에 진행될 수 있으므로 공고에 명시된 날짜를 기준으로 확인해 주세요.': 'The funding year may differ from the calendar year when applications open. For example, applications for a 2027 program may open in 2026. Follow the dates in the notice.',
    '공문·관인 요청': 'Request a letter or seal',
    '과제별로 공문으로 신청해야 하거나, 주관연구개발기관 확약서에 직인 날인을 위한 공문 요청이 필요한 경우가 있습니다.': 'Some calls require submission by official letter, or a letter requesting an institutional seal on the host institution commitment form.',
    '신청 또는 관인 날인·공문 처리가 필요한 경우에는 다음 자료 등을 보내주세요.': 'To arrange an official letter or institutional seal, send the following documents:',
    '과제 신청서 첫 페이지': 'First page of the application', '연구계획서': 'Research plan', '해당 과제에서 요구하는 추가 서류': 'Additional documents required by the call',
    '자료를 보내주셔야 관인 날인 및 공문 처리가 가능합니다. 필요 서류와 일정은 과제별 공문을 확인해 주세요.': 'The office needs these documents to process letters and seals. Check the original notice for the documents and deadlines that apply.',
    '범부처통합연구지원시스템(IRIS)을 통해 온라인 신청을 진행해 주세요. 기관의 공문 처리가 온라인 신청을 대신하는지는 과제별 공고를 확인해 주세요.': 'Apply through IRIS, the Integrated R&D Information System. Check the call to confirm whether an institutional letter replaces any part of the online application.',
    '접수 현황 공유': 'Report your submission', '과제 신청 현황 파악을 위해 접수하신 후 어떤 과제에 접수하셨는지': 'After submitting your application, email your',
    '등 정보를': 'to', '접수번호:\n사업명:\n과제명:': 'Application number:\nFunding program:\nProject title:',
    '이 버튼은 메일 작성 화면을 엽니다. 내용을 입력한 후 직접 발송해 주세요.': 'This button opens an email draft. Complete the details and send it yourself.',
    '공모 목록 보기': 'Browse funding calls', '공고를 찾을 수 없습니다': 'Notice not found',
    '주소를 확인하거나 공모 목록에서 다시 선택해 주세요.': 'Check the address or choose a notice from the funding calls list.'
  };
  const programs = {
    '리더연구': 'Leader Research', '신진연구': 'Early-Career Research', '한우물파기': 'Deep-Focus Research',
    '한우물파기 기초연구': 'Deep-Focus Basic Research', '핵심연구': 'Core Research',
    '기초연구사업': 'Basic Research Program', '개인기초연구사업': 'Individual Basic Research Program',
    '한국연구재단': 'National Research Foundation of Korea', '서울대학교 산학협력단': 'SNU R&DB Foundation',
    '1차 신규과제': 'First round · New projects', '신규과제 공모': 'Call for new projects',
    '유형 A': 'Type A', '유형 B': 'Type B', '유형 C': 'Type C', '유형 C~A': 'Types C–A', '도약형': 'Leap-Forward Type'
  };
  const knownTitles = ['리더연구', '신진연구', '한우물파기 기초연구', '핵심연구'];
  const programText = value => programs[value] || String(value || '').split(' · ').map(part => programs[part] || part).join(' · ');
  function language(search = '') { return new URLSearchParams(search).get('lang') === 'en' ? 'en' : 'ko'; }
  function languageUrl(value, lang) {
    const url = new URL(value); url.searchParams.set('lang', lang === 'en' ? 'en' : 'ko'); return url.href;
  }
  function text(value) {
    const raw = String(value ?? ''), key = raw.trim();
    const translated = phrases[key] || programs[key];
    if (translated) return raw.replace(key, translated);
    if (/^\d{4}년도$/.test(key)) return raw.replace('년도', '');
    if (/^\d+건$/.test(key)) return raw.replace(/(\d+)건/, (_, n) => `${n} ${n === '1' ? 'notice' : 'notices'}`);
    if (/^\d+개 파일$/.test(key)) return raw.replace(/(\d+)개 파일/, (_, n) => `${n} ${n === '1' ? 'file' : 'files'}`);
    if (/^현재 등록된 공고 \d+건$/.test(key)) return key.replace(/^현재 등록된 공고 (\d+)건$/, '$1 notices currently listed');
    if (/^현재 .* 공고 \d+건이 등록되어 있습니다\.$/.test(key)) return key.replace(/^현재 (.*) 공고 (\d+)건이 등록되어 있습니다\.$/, (_, years, count) => `${count} notices are available for ${years.replaceAll('년도', '').replaceAll('·', ', ')}.`);
    if (/^공모기관 /.test(key)) return key.replace('공모기관 ', 'Funding agency: ').replace(' · 안내 경유 ', ' · Circulated by: ');
    if (/^주관기관 승인 마감:/.test(key)) return key.replace('주관기관 승인 마감:', 'Institutional approval deadline:');
    if (/^근거:/.test(key)) return key.replace('근거:', 'Source:');
    if (/^문의 /.test(key)) return key.replace('문의 ', 'Contact: ');
    if (key.includes(' | ')) return key.split(' | ').map(part => text(part)).join(' | ');
    if (/^\d{4}년도 · /.test(key)) return key.replace('년도', '');
    return raw;
  }
  function notice(source, lang) {
    if (lang !== 'en') return source;
    const en = source.english || {}, known = knownTitles.includes(source.title), title = en.title || programText(source.title);
    return { ...source, title, fullTitle: en.title || (known ? `${source.year} ${programText(source.program)} — ${programText(source.round)}: ${title}` : source.fullTitle || title),
      program: programText(source.program), round: programText(source.round), agency: programText(source.agency), via: programText(source.via),
      types: (source.types || []).map(programText),
      summary: en.summary || (known ? `${source.year} call for ${title}. Check the application dates and the original Korean notice below.` : 'An English overview has not been added yet. Please refer to the original Korean notice.'),
      schedules: (source.schedules || []).map(s => ({ ...s, label: programText(s.label) })),
      englishAvailable: !!en.title || known, originalSearchText: [source.title, source.fullTitle, source.program, source.family, source.agency, ...(source.types || [])].join(' ') };
  }
  function model(base, lang) {
    if (lang !== 'en') return base;
    return { ...base,
      getStatus: (n, now) => { const s = base.getStatus(n, now); return { ...s, label: text(s.label) }; },
      filterNotices: (records, options = {}, now) => {
        const normalize = value => String(value || '').normalize('NFKC').toLowerCase().replace(/\s+/g, '');
        const terms = String(options.query || '').trim().split(/\s+/).filter(Boolean).map(normalize);
        return base.filterNotices(records, { ...options, query: '' }, now).filter(n => {
          const haystack = normalize([n.title, n.fullTitle, n.program, n.family, n.agency, n.originalSearchText, ...(n.types || [])].join(' '));
          return terms.every(term => haystack.includes(term));
        });
      },
      buildReportMailto: (program = '') => {
        const body = `I would like to report my research funding application.\r\n\r\nApplication number: \r\nFunding program: ${program}\r\nProject title: \r\n`;
        const original = new URL(base.buildReportMailto()); original.searchParams.set('subject', '[Research funding application] ' + program); original.searchParams.set('body', body); return original.href;
      },
      formatKst: value => !value || !Number.isFinite(Date.parse(value)) ? 'Check the original notice' : new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Seoul', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(value)) + ' KST'
    };
  }
  function translateDOM(parent) {
    const doc = parent.ownerDocument || parent, walker = doc.createTreeWalker(parent, 4), nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) {
      if (node.parentElement?.closest('[data-preserve-language], script, style, textarea, .file-name, .file-label')) continue;
      node.nodeValue = text(node.nodeValue);
    }
    for (const el of parent.querySelectorAll('[aria-label], [placeholder], img[alt]')) {
      if (el.closest('[data-preserve-language]')) continue;
      for (const attr of ['aria-label', 'placeholder', 'alt']) if (el.hasAttribute(attr)) el.setAttribute(attr, text(el.getAttribute(attr)));
    }
  }
  const api = { language, languageUrl, text, programText, notice, model, translateDOM };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.ResearchNoticesI18n = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
