const C = window.ResearchNoticesAdminCore;
const T = window.ResearchNoticesText;
const M = window.ResearchNoticesModel;
const D = window.ResearchNoticesDrafts;
const $ = id => document.getElementById(id);
const e = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let catalog = structuredClone(window.ResearchNoticesData);
let current = null, files = new Map(), imageUrls = [], client = null, expectedHead = null, prepared = null;
let baseSignature = null, busy = false, hasChanges = false, exportUrl = null, publishRequested = false;
const ui = { disabledButtons: [], focusAfterTask: null };
function focusAfterTask(id) { ui.focusAfterTask = id; }
function message(text) { $('status').textContent = text; }
function error(err) { const box = $('error-summary'); box.textContent = err instanceof Error ? err.message : '처리에 실패했습니다. 입력과 파일을 확인해 주세요.'; box.hidden = false; box.focus(); }
function clearError() { $('error-summary').hidden = true; }
function clearExport() { $('update-download-link')?.remove(); if (exportUrl) URL.revokeObjectURL(exportUrl); exportUrl = null; }
function markChanged() { hasChanges = true; prepared = null; clearExport(); $('publish-confirm').hidden = true; $('publish-result').hidden = true; $('body-reviewed').checked = false; $('attachment-save-state').textContent = '변경사항이 있습니다. 공개 사이트에 적용하려면 본문·첨부파일을 확인한 뒤 아래 적용 버튼을 눌러 주세요.'; }
async function guarded(task) {
  if (busy) return;
  busy = true; clearError();
  ui.disabledButtons = [...document.querySelectorAll('.admin-main button, .admin-main input, .admin-main textarea, .admin-main select')].filter(b => !b.disabled);
  ui.disabledButtons.forEach(b => { b.disabled = true; });
  try { await task(); } catch (err) { error(err); }
  finally { busy = false; ui.disabledButtons.forEach(b => { if (b.isConnected) b.disabled = false; }); updateConnectionControls(); if (ui.focusAfterTask) { $(ui.focusAfterTask).focus(); ui.focusAfterTask = null; } }
}
function updateConnectionControls() { $('prepare-publish').disabled = busy; $('apply-attachments').disabled = busy; $('disconnect-github').disabled = !client || busy; }
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
function openNotice(value, savedFiles = []) {
  clearExport();
  current = structuredClone(value); files = new Map(savedFiles.map(f => [f.path, f]));
  baseSignature = JSON.stringify(catalog.notices.find(n => n.id === current.id) || null);
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
  $('body-reviewed').checked = false;
  $('schedule-reviewed').checked = current.contentStatus === 'verified';
  $('schedule-list').replaceChildren(); (current.schedules || []).forEach(scheduleRow);
  $('attachment-files').value = ''; $('publish-confirm').hidden = true; $('publish-result').hidden = true; publishRequested = false;
  $('attachment-save-state').textContent = '첨부파일 선택은 준비 단계입니다. 공개 사이트에 적용 버튼에서 저장할 내용을 확인하고 최종 적용해 주세요.';
  prepared = null; hasChanges = false; clearError(); renderBody(); renderAttachments(); renderCatalog();
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
  if (validate) C.validateDraft({ ...notice, reviewed: $('body-reviewed').checked });
  notice.updatedAt = new Date().toISOString();
  return notice;
}
async function refreshDrafts() {
  try {
    const drafts = await D.list();
    $('draft-list').innerHTML = drafts.length ? drafts.sort((a,b) => b.savedAt.localeCompare(a.savedAt)).map(d => `<button type="button" data-draft="${e(d.id)}">${e(d.notice.title || '제목 없는 공고')}<span>${e(M.formatKst(d.savedAt))}</span></button>`).join('') : '<p class="quiet">임시보관한 공고가 없습니다</p>';
    $('draft-list').querySelectorAll('[data-draft]').forEach(button => button.addEventListener('click', () => guarded(async () => {
      if (hasChanges) await saveLocal(false);
      const saved = await D.get(button.dataset.draft); openNotice(saved.notice, saved.files); message('이 브라우저에 임시보관한 공고를 불러왔습니다. GitHub 저장 전까지 방문자에게 보이지 않습니다.');
    })));
  } catch (err) { $('draft-list').textContent = err.message; }
}
async function saveLocal(announce = true) {
  const notice = collect(false);
  await D.put({ id: notice.id, notice, files: [...files.values()], savedAt: new Date().toISOString() }); hasChanges = false;
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
async function connect() {
  const token = $('github-token').value.trim(); $('github-token').value = '';
  const candidate = window.ResearchNoticesGitHub.createClient({ owner: 'snumath1946', repo: 'research-notices', token });
  try {
    await candidate.connect(); const remote = await candidate.load(); const next = C.parseCatalog(remote.script);
    const remoteNotice = next.notices.find(n => n.id === current.id) || null;
    if (baseSignature !== JSON.stringify(remoteNotice)) { catalog = next; expectedHead = null; renderCatalog(); throw new Error('편집 중인 공고의 원격 내용이 달라졌습니다. 현재 내용을 임시보관한 뒤 왼쪽의 최신 공고를 다시 선택해 주세요.'); }
    client?.disconnect(); client = candidate; expectedHead = remote.head; catalog = next; renderCatalog();
    $('connection-state').textContent = 'snumath1946/research-notices 연결됨'; message('GitHub 최신 목록을 불러왔습니다. 본문·첨부자료 검토 후 저장할 수 있습니다.');
    if (publishRequested) { publishRequested = false; $('publish-panel').scrollIntoView({ block: 'center' }); focusAfterTask('body-reviewed'); message('GitHub에 연결했습니다. 준비한 본문·첨부파일은 유지됩니다. 확인란을 선택한 뒤 공개 사이트에 적용을 눌러 주세요.'); }
  } catch (err) { candidate.disconnect(); throw err; }
}
async function preparePublish() {
  if (!client || !expectedHead) {
    publishRequested = true; $('github-connection').open = true; $('github-connection').scrollIntoView({ block: 'center' }); focusAfterTask('github-token');
    message('공개 사이트에 적용하려면 GitHub 저장 연결이 필요합니다. 첨부파일은 이 화면에 그대로 있습니다. 연결한 뒤 본문·첨부파일을 확인하고 다시 적용해 주세요.'); return;
  }
  if (!$('body-reviewed').checked) { $('publish-panel').scrollIntoView({ block: 'center' }); focusAfterTask('body-reviewed'); throw new Error('선택된 본문과 첨부파일을 확인했다는 확인란을 선택한 뒤 다시 적용해 주세요.'); }
  const notice = collect(true);
  const remote = await client.load();
  if (remote.head !== expectedHead) throw new Error('다른 변경이 있습니다. 임시보관 후 GitHub 최신 목록을 다시 불러와 주세요.');
  const merged = C.mergeNotice(C.parseCatalog(remote.script), notice), pendingFiles = await getPendingFiles(notice);
  prepared = { notice, data: merged, files: pendingFiles, expectedHead };
  $('publish-summary').innerHTML = `<p><strong>${e(notice.title)}</strong> · ${notice.year}년도</p><p class="panel-help">본문 ${notice.bodyMarkdown ? '텍스트' : '기존 이미지 ' + notice.bodyImages.length + '개'} · 첨부 ${notice.attachments.length}개 · 이번 전송 파일 ${pendingFiles.length}개<br>기존 공고를 포함해 총 ${merged.notices.length}건을 보존합니다. 원본 PDF는 별도 첨부로 선택한 경우에만 포함됩니다.</p>`;
  $('publish-approved').checked = false; $('publish-confirm').hidden = false; $('publish-confirm').scrollIntoView({ block: 'center' });
}
async function publish() {
  if (!prepared || !$('publish-approved').checked) throw new Error('저장할 내용과 공개 범위를 확인한 후 확인란을 선택해 주세요.');
  const submission = prepared;
  const result = await client.save({ expectedHead: submission.expectedHead, data: submission.data, files: submission.files, message: `공모 안내 업데이트: ${submission.notice.year} ${submission.notice.title}` });
  catalog = submission.data; expectedHead = result.sha; current = submission.notice; baseSignature = JSON.stringify(current); prepared = null; hasChanges = false;
  $('publish-confirm').hidden = true; renderCatalog();
  try { await saveLocal(false); } catch { message('GitHub 저장은 완료됐지만 이 브라우저 임시보관은 실패했습니다. 아래 배포 상태를 확인해 주세요.'); }
  files.clear(); renderAttachments(); $('publish-result').hidden = false;
  $('attachment-save-state').textContent = 'GitHub에 본문·첨부파일을 저장했습니다. 공개 사이트 반영은 자동 배포가 성공한 뒤 완료됩니다.';
  message('GitHub 저장 완료 · 공개 사이트 자동 배포를 기다리고 있습니다. 배포 상태 확인에서 성공 여부를 확인한 뒤 공개 사이트를 열어 주세요.');
  const link = document.createElement('a'); link.href = result.url; link.className = 'text-link'; link.textContent = ' 저장 내역 보기'; link.target = '_blank'; link.rel = 'noopener noreferrer'; $('status').append(link);
}
$('body-import').addEventListener('change', () => guarded(importBody));
$('english-body-import').addEventListener('change', () => guarded(importEnglishBody));
$('match-nrf').addEventListener('click', findNrf);
$('body-reviewed').addEventListener('change', () => { prepared = null; $('publish-confirm').hidden = true; });
$('add-schedule').addEventListener('click', () => { scheduleRow(); markChanged(); });
$('new-notice').addEventListener('click', () => guarded(async () => { if (hasChanges) await saveLocal(false); newNotice(); }));
$('save-draft').addEventListener('click', () => guarded(() => saveLocal()));
$('export-update').addEventListener('click', () => guarded(exportUpdate));
$('connect-github').addEventListener('click', () => guarded(connect));
$('disconnect-github').addEventListener('click', () => { client?.disconnect(); client = null; expectedHead = null; prepared = null; $('github-token').value = ''; $('publish-confirm').hidden = true; $('connection-state').textContent = '연결되지 않음'; updateConnectionControls(); message('GitHub 연결을 해제했습니다.'); });
$('prepare-publish').addEventListener('click', () => guarded(preparePublish));
$('apply-attachments').addEventListener('click', () => guarded(preparePublish));
$('confirm-publish').addEventListener('click', () => guarded(publish));
$('attachment-files').addEventListener('change', () => guarded(async () => {
  const selected = [...$('attachment-files').files]; selected.forEach(C.validateUpload);
  for (const file of selected) {
    const bytes = await file.arrayBuffer();
    const fingerprint = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(b => b.toString(16).padStart(2,'0')).join('').slice(0,24);
    const path = C.filePath(Number($('notice-year').value), current.id, file.name, fingerprint);
    if (!current.attachments.some(a => a.href === path)) current.attachments.push({ label: file.name, filename: file.name, format: file.name.split('.').pop().toUpperCase(), href: path, available: true, size: file.size });
    files.set(path, { path, blob: file });
  }
  $('attachment-files').value = ''; markChanged(); renderAttachments(); message(`${selected.length}개 첨부파일을 준비했습니다. 아직 공개되지 않았습니다. 파일 목록과 본문을 확인한 뒤 공개 사이트에 적용을 눌러 주세요.`);
}));
for (const id of ['notice-year','notice-call-round','notice-family','notice-title','notice-full-title','body-text','schedule-list','schedule-reviewed','notice-english-title','notice-english-summary','notice-english-official-body','notice-english-body','english-source-url','english-source-title','english-source-reviewed']) $(id).addEventListener('input', markChanged);
for (const id of ['notice-year','notice-call-round','notice-family','notice-title','notice-english-title','notice-english-summary','notice-english-official-body','english-source-url','english-source-title']) $(id).addEventListener('input', clearSourceReview);
$('body-text').addEventListener('input', () => { markChanged(); renderBody(); });
window.addEventListener('beforeunload', event => { if (hasChanges) { event.preventDefault(); event.returnValue = ''; } });
newNotice(); await refreshDrafts();

