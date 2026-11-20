const C = window.ResearchNoticesAdminCore;
const T = window.ResearchNoticesText;
const M = window.ResearchNoticesModel;
const D = window.ResearchNoticesDrafts;
const $ = id => document.getElementById(id);
const e = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let catalog = structuredClone(window.ResearchNoticesData);
let current = null, files = new Map(), imageUrls = [], client = null, expectedHead = null;
let baseSignature = null, busy = false, hasChanges = false, pendingPublish = false, exportUrl = null, publicationGeneration = 0;
const ui = { disabledButtons: [], focusAfterTask: null };
function focusAfterTask(id) { ui.focusAfterTask = id; }
function message(text) { $('status').textContent = text; }
function error(err, id = 'error-summary') { const box = $(id); box.textContent = err instanceof Error ? err.message : '처리에 실패했습니다. 입력과 파일을 확인해 주세요.'; box.hidden = false; box.focus(); }
function clearError() { $('error-summary').hidden = true; $('publish-error').hidden = true; }
function clearExport() { $('update-download-link')?.remove(); if (exportUrl) URL.revokeObjectURL(exportUrl); exportUrl = null; }
function renderSaveSummary() {
  const title = $('notice-title').value.trim() || '공고명을 입력하세요';
  const added = (current?.attachments || []).filter(a => files.has(a.href)).length;
  $('publish-summary').innerHTML = `<strong>${e(title)}</strong><span>${e($('notice-year').value)}년도 · 첨부 ${(current?.attachments || []).length}개${added ? ` (새 파일 ${added}개)` : ''} · ${$('body-text').value.trim() ? '텍스트 본문' : '기존 이미지 본문'}</span><small>저장 대상: snumath1946/research-notices</small>`;
}
function markChanged() {
  hasChanges = true; pendingPublish = true; publicationGeneration++; clearExport(); clearError(); $('publish-result').hidden = true;
  $('attachment-save-state').textContent = '변경사항이 준비되었습니다. 위 공고와 첨부파일을 확인하고 적용 버튼을 한 번 누르세요.';
  renderSaveSummary(); updateConnectionControls();
}
async function guarded(task, errorId) {
  if (busy) return;
  busy = true; clearError();
  ui.disabledButtons = [...document.querySelectorAll('.admin-main button, .admin-main input, .admin-main textarea, .admin-main select')].filter(b => !b.disabled);
  ui.disabledButtons.forEach(b => { b.disabled = true; });
  try { await task(); } catch (err) { error(err, errorId); }
  finally { busy = false; ui.disabledButtons.forEach(b => { if (b.isConnected) b.disabled = false; }); updateConnectionControls(); if (ui.focusAfterTask) { $(ui.focusAfterTask).focus(); ui.focusAfterTask = null; } }
}
function updateConnectionControls() {
  $('publish-notice').disabled = busy || !pendingPublish;
  $('publish-notice').textContent = busy ? '처리 중…' : client ? '공개 사이트에 적용' : '연결하고 공개 사이트에 적용';
  $('token-entry').hidden = !!client; $('disconnect-github').hidden = !client; $('disconnect-github').disabled = busy;
  $('connection-state').textContent = client ? 'GitHub 연결됨 · 이 창에서 유지' : 'GitHub 미연결 · 아래 토큰 입력';
}
function releaseUrls() { imageUrls.forEach(url => URL.revokeObjectURL(url)); imageUrls = []; }
function blobUrl(blob) { const url = URL.createObjectURL(blob); imageUrls.push(url); return url; }
function safeBodyHref(image) { return M.getAttachmentHref({ ...image, available: true }); }
function renderBody() {
  releaseUrls();
  const markdown = $('body-text').value;
  if (markdown.trim()) { $('body-preview').innerHTML = `<div class="notice-text-content">${T.render(markdown)}</div>`; return; }
  $('body-preview').innerHTML = current?.bodyImages?.length ? '<p class="panel-help">기존 이미지 본문입니다. 원본 PDF를 변환해 불러오면 텍스트로 전환됩니다.</p>' + current.bodyImages.map(image => {
    const blob = files.get(image.href)?.blob, href = blob ? blobUrl(blob) : safeBodyHref(image);
    return href ? `<img src="${e(href)}" alt="기존 공문 본문">` : '';
  }).join('') : '<p class="empty-draft">게시할 본문 텍스트를 불러오거나 입력해 주세요</p>';
}
function clearSourceReview() { $('english-source-reviewed').checked = false; }
function findNrf() {
  const candidate = T.officialMatch({ year: Number($('notice-year').value), family: $('notice-family').value, callRound: Number($('notice-call-round').value) || null, round: '' });
  if (!candidate) { $('nrf-match-message').textContent = '이 사업연도·차수·유형으로 확인된 영문 공고가 없습니다. 재단 영문 게시판에서 직접 대조하고 출처를 입력하세요. 비슷한 제목의 다른 연도 공고는 자동 연결하지 않습니다.'; return; }
  if (!$('notice-english-title').value.trim()) $('notice-english-title').value = candidate.title;
  if (!$('notice-english-summary').value.trim()) $('notice-english-summary').value = candidate.summary;
  $('english-source-url').value = candidate.source.url; $('english-source-title').value = candidate.source.title;
  markChanged(); clearSourceReview();
  $('nrf-match-message').textContent = `${candidate.source.year}년도 ${candidate.source.callRound}차 · ${candidate.title} / ${candidate.types.join(' · ')} 후보를 찾았습니다. 기존 영문 입력은 보존했습니다. 재단 원문과 대조한 뒤 확인란을 선택해 주세요.`;
}
async function importBody() {
  const file = $('body-import').files[0]; if (!file) return;
  if (!/\.(json|md|txt)$/i.test(file.name) || file.size > 2 * 1024 * 1024) throw new Error('2MB 이하 JSON·MD·TXT 파일을 선택해 주세요.');
  const raw = await file.text(); let markdown;
  if (/\.json$/i.test(file.name)) { const parsed = T.parseImport(JSON.parse(raw)); markdown = parsed.bodyMarkdown; current.extraction = parsed.extraction; $('import-message').textContent = `kordoc ${parsed.extraction.version}로 변환한 본문입니다. ${parsed.warnings.join(' ')}`; }
  else { if (!raw.trim() || raw.length > T.MAX_TEXT) throw new Error('본문이 비어 있거나 너무 큽니다.'); markdown = raw; current.extraction = { engine: 'manual-text' }; $('import-message').textContent = '본문 텍스트를 불러왔습니다. 표·날짜·본문 범위를 원문과 대조해 주세요.'; }
  $('body-text').value = markdown; current.bodyImages = []; current.sourceReference = '관리자가 검토한 본문 텍스트';
  markChanged(); renderBody(); $('body-import').value = ''; message('본문 텍스트를 불러왔습니다. 검토 후 공개 사이트에 적용해 주세요.');
}
async function importEnglishBody() {
  const file = $('english-body-import').files[0]; if (!file) return;
  if (!/\.(json|md|txt)$/i.test(file.name) || file.size > 2 * 1024 * 1024) throw new Error('2MB 이하 JSON·MD·TXT 파일을 선택해 주세요.');
  const raw = await file.text(), parsed = /\.json$/i.test(file.name) ? T.parseImport(JSON.parse(raw)) : { bodyMarkdown: raw };
  if (!parsed.bodyMarkdown.trim() || parsed.bodyMarkdown.length > T.MAX_TEXT) throw new Error('영문 본문이 비어 있거나 너무 큽니다.');
  $('notice-english-official-body').value = parsed.bodyMarkdown;
  current.english = { ...current.english, extraction: parsed.extraction || { engine: 'manual-text' } };
  clearSourceReview(); markChanged(); $('english-body-import').value = '';
  message('재단 영문 문서에서 선택한 텍스트를 불러왔습니다. 출처와 사업연도·차수·유형을 대조해 주세요.');
}
function renderCatalog() {
  $('catalog-count').textContent = catalog.notices.length + '건';
  $('catalog-list').innerHTML = [...catalog.notices].sort((a, b) => b.year - a.year || a.order - b.order).map(n => `<button type="button" data-notice="${e(n.id)}" aria-current="${n.id === current?.id}">${e(n.title)}<span>${n.year}년도 · 첨부 ${(n.attachments || []).filter(a => a.available).length}개</span></button>`).join('');
  $('catalog-list').querySelectorAll('[data-notice]').forEach(button => button.addEventListener('click', () => guarded(async () => {
    if (hasChanges) await saveLocal(false);
    openNotice(catalog.notices.find(n => n.id === button.dataset.notice));
  })));
  $('family-list').innerHTML = [...new Set(catalog.notices.map(n => n.family))].map(f => `<option value="${e(f)}"></option>`).join('');
}
function toInputDate(value) { return value?.endsWith('+09:00') ? value.slice(0, 16) : ''; }
function scheduleRow(value = {}) {
  const row = document.createElement('div'); row.className = 'schedule-row';
  const unique = 'schedule-' + crypto.randomUUID();
  row.innerHTML = `<label for="${unique}-label">유형 이름</label><input id="${unique}-label" data-schedule="label" type="text" value="${e(value.label || '')}" placeholder="예: 유형 A"><div class="schedule-dates">${[['researcherStart', '연구자 신청 시작'], ['researcherEnd', '연구자 신청 마감'], ['institutionEnd', '주관기관 승인 마감']].map(([name,label]) => `<div><label for="${unique}-${name}">${label} (한국시간)</label><input type="datetime-local" id="${unique}-${name}" data-schedule="${name}" value="${e(toInputDate(value[name]))}"></div>`).join('')}</div><button type="button" class="button button-outline button-small">이 일정 제외</button>`;
  row.querySelector('button').addEventListener('click', () => { row.remove(); markChanged(); $('schedule-reviewed').checked = false; });
  row.addEventListener('input', () => { $('schedule-reviewed').checked = false; });
  $('schedule-list').append(row);
}
function openNotice(value, savedFiles = [], draftBaseSignature) {
  clearExport();
  current = structuredClone(value); files = new Map(savedFiles.map(f => [f.path, f]));
  const baseline = catalog.notices.find(n => n.id === current.id) || null;
  baseSignature = draftBaseSignature === undefined ? JSON.stringify(baseline) : draftBaseSignature;
  pendingPublish = draftBaseSignature !== undefined || (baseline ? JSON.stringify(current) !== JSON.stringify(baseline) : !!(current.title || current.bodyText || current.bodyMarkdown || current.attachments?.length));
  $('notice-title').value = current.title || '';
  $('notice-full-title').value = current.fullTitle || '';
  $('notice-english-title').value = current.english?.title || '';
  $('notice-english-summary').value = current.english?.summary || '';
  $('notice-english-body').value = current.english?.bodyText || '';
  $('notice-english-official-body').value = current.english?.officialBodyMarkdown || '';
  $('english-body-import').value = '';
  $('notice-family').value = current.family || '';
  $('notice-call-round').value = String(T.callRound(current) || '');
  $('english-source-url').value = current.english?.source?.url || '';
  $('english-source-title').value = current.english?.source?.title || '';
  $('english-source-reviewed').checked = !!T.checkedSource(current.english?.source, current);
  $('nrf-match-message').textContent = '';
  $('import-message').textContent = ''; $('body-import').value = '';
  $('notice-year').value = current.year;
  $('body-text').value = current.bodyMarkdown || current.bodyText || '';
    $('schedule-reviewed').checked = current.contentStatus === 'verified';
  $('schedule-list').replaceChildren(); (current.schedules || []).forEach(scheduleRow);
  $('attachment-files').value = ''; $('publish-result').hidden = true; publicationGeneration++;
  $('attachment-save-state').textContent = '변경사항을 입력하거나 첨부파일을 선택하세요.';
  hasChanges = false; clearError(); renderBody(); renderAttachments(); renderCatalog(); renderSaveSummary(); updateConnectionControls();
  message(catalog.notices.some(n => n.id === current.id) ? `${current.title} 공고를 편집하고 있습니다. 저장 전까지 방문자 화면은 바뀌지 않습니다.` : '새 공고를 작성하고 있습니다.');
}
function newNotice() {
  const year = Math.max(new Date().getFullYear(), ...catalog.notices.map(n => n.year));
  openNotice({ id: `notice-${crypto.randomUUID()}`, year, order: catalog.notices.length + 1, family: '', title: '', fullTitle: '', program: '기초연구사업', round: '1차 신규과제', callRound: 1, agency: '한국연구재단', via: '서울대학교 산학협력단', types: [], contentStatus: 'body-reviewed', postedAt: null, schedules: [], summary: '', eligibility: null, funding: null, duration: null, details: [], attachments: [], bodyImages: [], bodyText: '', sourceReference: null });
}
function renderAttachments() {
  $('attachment-list').innerHTML = current.attachments?.length ? current.attachments.map((file, i) => `<li><div><p>${e(file.filename)}</p><span class="quiet">${e(file.format)} · ${files.has(file.href) ? '이번에 추가한 파일' : file.available ? '기존 등록 파일' : '아직 연결되지 않은 파일'}</span></div><button class="button button-outline button-small" type="button" data-exclude="${i}">목록에서 제외<span class="sr-only"> ${e(file.filename)}</span></button></li>`).join('') : '<li class="quiet">아직 등록된 첨부파일이 없습니다</li>';
  $('attachment-list').querySelectorAll('[data-exclude]').forEach(button => button.addEventListener('click', () => {
    const at = Number(button.dataset.exclude); const [removed] = current.attachments.splice(at, 1); files.delete(removed.href); markChanged(); renderAttachments();
  }));
}
function collect(validate) {
  const notice = structuredClone(current);
  notice.year = Number($('notice-year').value); notice.title = $('notice-title').value.trim(); notice.fullTitle = $('notice-full-title').value.trim() || notice.title; notice.family = $('notice-family').value.trim();
  notice.callRound = Number($('notice-call-round').value) || null;
  if (notice.callRound) notice.round = `${notice.callRound}차 신규과제`;
  const english = { title: $('notice-english-title').value.trim(), summary: $('notice-english-summary').value.trim(), officialBodyMarkdown: $('notice-english-official-body').value.trim(), bodyText: $('notice-english-body').value.trim() };
  const sourceUrl = $('english-source-url').value.trim();
  if (validate && $('english-source-reviewed').checked && !T.nrfUrl(sourceUrl)) throw new Error('공식 영문 출처는 eng.nrf.re.kr의 공고 주소여야 합니다.');
  const englishSource = T.checkedSource({ kind: 'nrf-official', url: sourceUrl, title: $('english-source-title').value, year: notice.year, callRound: notice.callRound, reviewed: $('english-source-reviewed').checked }, notice);
  if (validate && $('english-source-reviewed').checked && !englishSource) throw new Error('재단 영문 출처의 사업연도와 공모 차수를 확인해 주세요.');
  if (validate && english.officialBodyMarkdown && !englishSource) throw new Error('재단 영문 본문은 출처 주소와 사업연도·차수·유형을 대조한 뒤 확인란을 선택해 주세요.');
  if (Object.values(english).some(Boolean)) notice.english = { ...notice.english, ...english, source: englishSource }; else delete notice.english;
  notice.bodyMarkdown = $('body-text').value.trim();
  if (notice.bodyMarkdown) { notice.bodyImages = []; delete notice.selectedRanges; notice.sourceReference = notice.sourceReference || '관리자가 검토한 본문 텍스트'; }
  notice.bodyText = notice.bodyMarkdown; notice.summary = `${notice.year}년도 ${notice.title} 공모 안내입니다.`;
  notice.types = notice.types?.length ? notice.types : [notice.family];
  notice.schedules = [...$('schedule-list').querySelectorAll('.schedule-row')].map(row => {
    const value = {};
    row.querySelectorAll('[data-schedule]').forEach(input => { value[input.dataset.schedule] = input.dataset.schedule === 'label' ? input.value.trim() : input.value ? input.value + ':00+09:00' : null; });
    return value;
  });
  if (validate && $('schedule-reviewed').checked) {
    if (!notice.schedules.length || notice.schedules.some(s => !s.label || M.scheduleState(s, new Date()).key === 'unverified')) throw new Error('신청기간이 비어 있거나 순서가 올바르지 않습니다. 유형별 시작·마감 시각을 확인해 주세요.');
  }
  notice.contentStatus = $('schedule-reviewed').checked && notice.schedules.length ? 'verified' : 'body-reviewed';
  if (validate) C.validateDraft({ ...notice, reviewed: true });
  if (validate) notice.updatedAt = new Date().toISOString();
  return notice;
}
async function refreshDrafts() {
  try {
    const drafts = await D.list();
    $('draft-list').innerHTML = drafts.length ? drafts.sort((a,b) => b.savedAt.localeCompare(a.savedAt)).map(d => `<button type="button" data-draft="${e(d.id)}">${e(d.notice.title || '제목 없는 공고')}<span>${e(M.formatKst(d.savedAt))}</span></button>`).join('') : '<p class="quiet">임시보관한 공고가 없습니다</p>';
    $('draft-list').querySelectorAll('[data-draft]').forEach(button => button.addEventListener('click', () => guarded(async () => {
      if (hasChanges) await saveLocal(false);
      const saved = await D.get(button.dataset.draft); openNotice(saved.notice, saved.files, saved.baseSignature); message('이 브라우저에 임시보관한 공고를 불러왔습니다. GitHub 저장 전까지 방문자에게 보이지 않습니다.');
    })));
  } catch (err) { $('draft-list').textContent = err.message; }
}
async function saveLocal(announce = true) {
  const notice = collect(false);
  await D.put({ id: notice.id, notice, files: [...files.values()], baseSignature, savedAt: new Date().toISOString() }); hasChanges = false; updateConnectionControls();
  await refreshDrafts(); if (announce) message('이 브라우저 임시보관함에 저장했습니다. 아직 사이트에 게시되지 않았습니다.');
}
async function getPendingFiles(notice) {
  const paths = new Set([...(notice.bodyImages || []).map(i => i.href), ...(notice.attachments || []).filter(a => a.available).map(a => a.href)]);
  const result = [];
  for (const path of paths) if (files.has(path)) result.push({ path, bytes: new Uint8Array(await files.get(path).blob.arrayBuffer()) });
  return result;
}
function download(blob, name) {
  clearExport();
  const link = document.createElement('a'); exportUrl = URL.createObjectURL(blob); link.href = exportUrl; link.download = name; link.id = 'update-download-link'; link.className = 'button button-primary'; link.textContent = '준비된 ZIP 다운로드'; $('export-update').parentElement.append(link);
}
async function exportUpdate() {
  const notice = collect(true);
  download(await C.buildUpdateZip(window.JSZip, catalog, notice, await getPendingFiles(notice)), `research-notice-update-${notice.id}.zip`);
  await saveLocal(false); message('업데이트 ZIP을 만들었습니다. 준비된 ZIP 다운로드를 눌러 저장하세요. 저장소에 반영하기 전까지 방문자 사이트는 바뀌지 않습니다.');
}
async function connectForSave() {
  const token = $('github-token').value.trim(); $('github-token').value = '';
  if (!token) { focusAfterTask('github-token'); throw new Error('바로 위에 research-notices 저장용 Access token을 입력한 뒤 적용 버튼을 눌러 주세요.'); }
  const candidate = window.ResearchNoticesGitHub.createClient({ owner: 'snumath1946', repo: 'research-notices', token });
  try { await candidate.connect(); client?.disconnect(); client = candidate; }
  catch (err) { candidate.disconnect(); focusAfterTask('github-token'); throw err; }
}
async function monitorPublication(notice, sha, generation) {
  if (typeof window.fetch !== 'function') return;
  const active = () => publicationGeneration === generation;
  const url = new URL('data/notices.js', window.location.href); url.searchParams.set('published', sha);
  const state = await C.waitForPublication({ notice, url: url.href, fetcher: window.fetch.bind(window), active });
  if (!active()) return;
  if (state === 'published') {
    $('publish-result-heading').textContent = '공개 사이트 반영 완료';
    $('deployment-state').textContent = '저장한 본문과 첨부파일이 공개 사이트에 반영된 것을 확인했습니다.';
    $('attachment-save-state').textContent = '공개 사이트 반영 완료';
  } else {
    $('deployment-state').textContent = 'GitHub 저장은 완료됐습니다. 공개 반영 확인에 시간이 더 필요합니다. 다시 저장하지 말고 배포 상태를 확인해 주세요.';
  }
}
async function publish() {
  const notice = collect(true);
  if (!client) await connectForSave();
  const remote = await client.load(), latest = C.parseCatalog(remote.script);
  const latestNotice = latest.notices.find(n => n.id === current.id) || null;
  if (baseSignature !== JSON.stringify(latestNotice)) { catalog = latest; renderCatalog(); throw new Error('이 공고가 다른 창이나 PC에서 변경되었습니다. 준비한 파일은 유지됩니다. 임시보관 후 왼쪽의 최신 공고를 선택해 변경 내용을 대조해 주세요.'); }
  const merged = C.mergeNotice(latest, notice), pendingFiles = await getPendingFiles(notice);
  const result = await client.save({ expectedHead: remote.head, data: merged, files: pendingFiles, message: `공모 안내 업데이트: ${notice.year} ${notice.title}` });
  catalog = merged; expectedHead = result.sha; current = notice; baseSignature = JSON.stringify(current); hasChanges = false; pendingPublish = false;
  renderCatalog();
  try { await saveLocal(false); } catch { /* A completed GitHub save must not be retried because local drafts failed. */ }
  files.clear(); renderAttachments(); renderSaveSummary(); $('publish-result').hidden = false;
  $('publish-result-heading').textContent = 'GitHub 저장 완료 · 공개 반영 확인 중';
  $('deployment-state').textContent = '저장한 내용이 공개 사이트에 보이는지 자동으로 확인하고 있습니다. 창을 닫아도 GitHub의 배포는 계속됩니다.';
  const link = new URL('index.html', window.location.href); link.searchParams.set('updated', result.sha); link.hash = '/notice/' + encodeURIComponent(notice.id); $('public-notice-link').href = link.href;
  $('attachment-save-state').textContent = 'GitHub 저장 완료 · 공개 반영 확인 중'; message('GitHub에 본문과 첨부파일을 저장했습니다. 공개 반영 상태는 같은 저장 영역에서 확인할 수 있습니다.');
  const generation = ++publicationGeneration; void monitorPublication(notice, result.sha, generation);
}
$('body-import').addEventListener('change', () => guarded(importBody));
$('english-body-import').addEventListener('change', () => guarded(importEnglishBody));
$('match-nrf').addEventListener('click', findNrf);
$('add-schedule').addEventListener('click', () => { scheduleRow(); markChanged(); });
$('new-notice').addEventListener('click', () => guarded(async () => { if (hasChanges) await saveLocal(false); newNotice(); }));
$('save-draft').addEventListener('click', () => guarded(() => saveLocal()));
$('export-update').addEventListener('click', () => guarded(exportUpdate));
$('disconnect-github').addEventListener('click', () => { client?.disconnect(); client = null; expectedHead = null; $('github-token').value = ''; updateConnectionControls(); message('GitHub 연결을 해제했습니다. 준비한 본문과 첨부파일은 유지됩니다.'); });
$('publish-notice').addEventListener('click', () => guarded(publish, 'publish-error'));
$('attachment-files').addEventListener('change', () => guarded(async () => {
  const selected = [...$('attachment-files').files]; selected.forEach(C.validateUpload);
  for (const file of selected) {
    const bytes = await file.arrayBuffer();
    const fingerprint = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(b => b.toString(16).padStart(2,'0')).join('').slice(0,24);
    const path = C.filePath(Number($('notice-year').value), current.id, file.name, fingerprint);
    if (!current.attachments.some(a => a.href === path)) current.attachments.push({ label: file.name, filename: file.name, format: file.name.split('.').pop().toUpperCase(), href: path, available: true, size: file.size });
    files.set(path, { path, blob: file });
  }
  $('attachment-files').value = ''; markChanged(); renderAttachments(); message(`${selected.length}개 첨부파일을 준비했습니다. 같은 영역에서 토큰을 입력하고 적용 버튼을 한 번 누르면 저장합니다.`);
}));
for (const id of ['notice-year','notice-call-round','notice-family','notice-title','notice-full-title','body-text','schedule-list','schedule-reviewed','notice-english-title','notice-english-summary','notice-english-official-body','notice-english-body','english-source-url','english-source-title','english-source-reviewed']) $(id).addEventListener('input', markChanged);
for (const id of ['notice-year','notice-call-round','notice-family','notice-title','notice-english-title','notice-english-summary','notice-english-official-body','english-source-url','english-source-title']) $(id).addEventListener('input', clearSourceReview);
$('body-text').addEventListener('input', () => { markChanged(); renderBody(); });
window.addEventListener('beforeunload', event => { if (hasChanges) { event.preventDefault(); event.returnValue = ''; } });
newNotice(); await refreshDrafts();

