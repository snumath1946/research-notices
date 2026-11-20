const C = window.ResearchNoticesAdminCore;
const M = window.ResearchNoticesModel;
const D = window.ResearchNoticesDrafts;
const $ = id => document.getElementById(id);
const e = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let catalog = structuredClone(window.ResearchNoticesData);
let current = null, pages = [], pdfDocument = null, files = new Map(), imageUrls = [], client = null, expectedHead = null, prepared = null;
let baseSignature = null, busy = false, hasChanges = false, processingGeneration = 0, rangesDirty = false, exportUrl = null, publishRequested = false;
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
  $('body-preview').innerHTML = current?.bodyImages?.length ? current.bodyImages.map((image, index) => {
    const blob = files.get(image.href)?.blob;
    const href = blob ? blobUrl(blob) : safeBodyHref(image);
    return href ? `<img src="${e(href)}" alt="${e(image.alt || `${current.title} 공문 본문 ${index + 1}`)}"${image.width && image.height ? ` width="${image.width}" height="${image.height}"` : ''}>` : '';
  }).join('') : '<p class="empty-draft">공문 PDF를 올리고 표시할 본문 범위를 선택해 주세요</p>';
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
  processingGeneration++;
  current = structuredClone(value); files = new Map(savedFiles.map(f => [f.path, f])); pages = [];
  baseSignature = JSON.stringify(catalog.notices.find(n => n.id === current.id) || null);
  $('notice-title').value = current.title || '';
  $('notice-full-title').value = current.fullTitle || '';
  $('notice-family').value = current.family || '';
  $('notice-year').value = current.year;
  $('body-text').value = current.bodyText || '';
  $('body-reviewed').checked = false;
  $('schedule-reviewed').checked = current.contentStatus === 'verified';
  $('schedule-list').replaceChildren(); (current.schedules || []).forEach(scheduleRow);
  $('pdf-pages').replaceChildren(); $('pdf-file').value = ''; $('pdf-message').textContent = ''; $('build-body').hidden = true;
  $('attachment-files').value = ''; $('publish-confirm').hidden = true; $('publish-result').hidden = true; publishRequested = false;
  $('attachment-save-state').textContent = '첨부파일 선택은 준비 단계입니다. 공개 사이트에 적용 버튼에서 저장할 내용을 확인하고 최종 적용해 주세요.';
  prepared = null; hasChanges = false; rangesDirty = false; clearError(); renderBody(); renderAttachments(); renderCatalog();
  message(catalog.notices.some(n => n.id === current.id) ? `${current.title} 공고를 편집하고 있습니다. 저장 전까지 방문자 화면은 바뀌지 않습니다.` : '새 공고를 작성하고 있습니다.');
}
function newNotice() {
  const year = Math.max(new Date().getFullYear(), ...catalog.notices.map(n => n.year));
  openNotice({ id: `notice-${crypto.randomUUID()}`, year, order: catalog.notices.length + 1, family: '', title: '', fullTitle: '', program: '기초연구사업', round: '신규과제 공모', agency: '한국연구재단', via: '서울대학교 산학협력단', types: [], contentStatus: 'body-reviewed', postedAt: null, schedules: [], summary: '', eligibility: null, funding: null, duration: null, details: [], attachments: [], bodyImages: [], bodyText: '', sourceReference: null });
}
function renderAttachments() {
  $('attachment-list').innerHTML = current.attachments?.length ? current.attachments.map((file, i) => `<li><div><p>${e(file.filename)}</p><span class="quiet">${e(file.format)} · ${files.has(file.href) ? '이번에 추가한 파일' : file.available ? '기존 등록 파일' : '아직 연결되지 않은 파일'}</span></div><button class="button button-outline button-small" type="button" data-exclude="${i}">목록에서 제외<span class="sr-only"> ${e(file.filename)}</span></button></li>`).join('') : '<li class="quiet">아직 등록된 첨부파일이 없습니다</li>';
  $('attachment-list').querySelectorAll('[data-exclude]').forEach(button => button.addEventListener('click', () => {
    const at = Number(button.dataset.exclude); const [removed] = current.attachments.splice(at, 1); files.delete(removed.href); markChanged(); renderAttachments();
  }));
}
function linesFromText(content, viewport, util) {
  const rows = [];
  const items = content.items.filter(item => typeof item.str === 'string' && item.str.trim()).map(item => {
    const transform = util.transform(viewport.transform, item.transform);
    return { text: item.str, x: transform[4], y: Math.max(0, transform[5] - Math.abs(transform[3])), height: Math.abs(transform[3]) };
  }).sort((a,b) => a.y - b.y || a.x - b.x);
  for (const item of items) {
    const row = rows.find(r => Math.abs(r.y - item.y) < Math.max(3, item.height * .25));
    if (row) row.items.push(item); else rows.push({ y: item.y, items: [item] });
  }
  return rows.sort((a,b) => a.y - b.y).map(row => ({ y: row.y, text: row.items.sort((a,b) => a.x - b.x).map(i => i.text).join(' ') }));
}
async function readPdf(file) {
  if (!file || !/\.pdf$/i.test(file.name) || file.size > C.MAX_FILE || !file.size) throw new Error('25MB 이하의 PDF 공문을 선택해 주세요.');
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!new TextDecoder().decode(bytes.slice(0, 1024)).includes('%PDF-')) throw new Error('PDF 형식이 올바르지 않습니다.');
  const generation = ++processingGeneration;
  rangesDirty = true;
  message('PDF를 읽고 있습니다. 원본은 외부로 전송하지 않습니다.');
  const pdfjs = await import('../vendor/pdfjs/pdf.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('../vendor/pdfjs/pdf.worker.mjs', import.meta.url).href;
  await pdfDocument?.destroy();
  const task = pdfjs.getDocument({ data: bytes, isEvalSupported: false, enableXfa: false, cMapUrl: new URL('../vendor/pdfjs/cmaps/', import.meta.url).href, cMapPacked: true, standardFontDataUrl: new URL('../vendor/pdfjs/standard_fonts/', import.meta.url).href, wasmUrl: new URL('../vendor/pdfjs/wasm/', import.meta.url).href });
  task.onPassword = () => { task.destroy(); };
  pdfDocument = await task.promise;
  if (pdfDocument.numPages > 20) { await pdfDocument.destroy(); pdfDocument = null; throw new Error('20쪽 이하 공문을 올려 주세요. 신청요강은 별도 첨부파일로 등록할 수 있습니다.'); }
  pages = []; $('pdf-pages').replaceChildren();
  let pixelCount = 0;
  for (let num = 1; num <= pdfDocument.numPages; num++) {
    if (generation !== processingGeneration) return;
    message(`PDF ${num}/${pdfDocument.numPages}쪽을 읽고 있습니다.`);
    const page = await pdfDocument.getPage(num), base = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: Math.min(2, 1500 / base.width) });
    pixelCount += viewport.width * viewport.height;
    if (viewport.height > 10000 || pixelCount > 60000000) throw new Error('공문의 이미지 크기가 큽니다. PDF 페이지를 나누어 등록해 주세요.');
    const canvas = document.createElement('canvas'); canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
    const content = await page.getTextContent();
    pages.push({ page: num, width: canvas.width, height: canvas.height, canvas, lines: linesFromText(content, viewport, pdfjs.Util) });
  }
  const suggestion = C.suggestRanges(pages);
  for (const page of pages) {
    const range = suggestion.ranges.find(r => r.page === page.page);
    const element = document.createElement('section'); element.className = 'pdf-page'; element.dataset.page = page.page;
    element.innerHTML = `<div class="pdf-page-head"><label class="check-label"><input type="checkbox" data-include${range ? ' checked' : ''}>${page.page}쪽 표시</label><div class="range-controls"><label>위쪽 % <input data-top type="number" min="0" max="99" step="0.1" value="${range ? range.top.toFixed(1) : 0}" aria-label="${page.page}쪽 위쪽 범위 퍼센트"></label><label>아래쪽 % <input data-bottom type="number" min="1" max="100" step="0.1" value="${range ? range.bottom.toFixed(1) : 100}" aria-label="${page.page}쪽 아래쪽 범위 퍼센트"></label></div></div><div class="pdf-canvas-wrap"></div><p class="pdf-page-selected">위쪽과 아래쪽 범위 사이만 본문으로 저장됩니다</p>`;
    element.querySelector('.pdf-canvas-wrap').append(page.canvas); $('pdf-pages').append(element);
  }
  $('pdf-message').textContent = suggestion.warning;
  $('build-body').hidden = false; current.sourceReference = file.name + ' · 관리자가 선택한 본문 범위';
  const guessYear = file.name.match(/(20\d{2})년도/); if (guessYear) $('notice-year').value = guessYear[1];
  if (!$('notice-full-title').value) $('notice-full-title').value = file.name.replace(/\.pdf$/i, '').replace(/^\d+\.\s*/, '');
  if (!$('notice-title').value) $('notice-title').value = file.name.replace(/\.pdf$/i, '').match(/\(([^)]+)\)/)?.[1] || '새 연구과제 공모';
  markChanged();
  if (suggestion.ranges.length) await buildBody();
  message(suggestion.ranges.length ? '본문 범위를 추천했습니다. 위·아래 경계와 문의처 표의 마지막 행을 확인해 주세요.' : suggestion.warning);
}
function selectedRanges() {
  return [...$('pdf-pages').querySelectorAll('[data-page]')].filter(el => el.querySelector('[data-include]').checked).map(el => ({ page: Number(el.dataset.page), top: Number(el.querySelector('[data-top]').value), bottom: Number(el.querySelector('[data-bottom]').value) }));
}
async function buildBody() {
  const ranges = selectedRanges(); C.validateRanges(ranges);
  current.bodyImages?.forEach(image => files.delete(image.href));
  const images = [];
  const stamp = crypto.randomUUID().slice(0, 8);
  for (const range of ranges) {
    const page = pages.find(p => p.page === range.page);
    const top = Math.floor(page.height * range.top / 100), bottom = Math.ceil(page.height * range.bottom / 100);
    const crop = document.createElement('canvas'); crop.width = page.width; crop.height = bottom - top;
    crop.getContext('2d').drawImage(page.canvas, 0, top, page.width, crop.height, 0, 0, page.width, crop.height);
    const blob = await new Promise(resolve => crop.toBlob(resolve, 'image/webp', .97));
    if (!blob) throw new Error('본문 이미지를 만들지 못했습니다. 범위를 확인해 주세요.');
    const ext = blob.type === 'image/webp' ? 'webp' : 'png';
    const path = `files/${Number($('notice-year').value)}/${current.id}/body-${stamp}-${String(range.page).padStart(2,'0')}.${ext}`;
    files.set(path, { path, blob });
    images.push({ href: path, page: range.page, width: crop.width, height: crop.height, alt: `${$('notice-title').value || '공모 안내'} 본문 ${range.page}쪽` });
  }
  current.bodyImages = images; current.selectedRanges = ranges; rangesDirty = false;
  $('body-text').value = C.textForRanges(pages, ranges); markChanged(); renderBody(); message('선택한 범위로 본문 미리보기를 만들었습니다.');
}
function collect(validate) {
  if (validate && rangesDirty) throw new Error('본문 범위가 변경되었습니다. 선택 범위로 본문 미리보기를 다시 만들어 주세요.');
  const notice = structuredClone(current);
  notice.year = Number($('notice-year').value); notice.title = $('notice-title').value.trim(); notice.fullTitle = $('notice-full-title').value.trim() || notice.title; notice.family = $('notice-family').value.trim();
  notice.bodyText = $('body-text').value; notice.summary = `${notice.year}년도 ${notice.title} 공모 안내입니다.`;
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
  $('publish-summary').innerHTML = `<p><strong>${e(notice.title)}</strong> · ${notice.year}년도</p><p class="panel-help">선택 본문 ${notice.bodyImages.length}개 · 첨부 ${notice.attachments.length}개 · 이번 전송 파일 ${pendingFiles.length}개<br>기존 공고를 포함해 총 ${merged.notices.length}건을 보존합니다. 원본 PDF는 별도 첨부로 선택한 경우에만 포함됩니다.</p>`;
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
$('pdf-file').addEventListener('change', () => guarded(async () => { const file = $('pdf-file').files[0]; if (file) await readPdf(file); }));
$('build-body').addEventListener('click', () => guarded(buildBody));
$('pdf-pages').addEventListener('input', () => { rangesDirty = true; markChanged(); });
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
for (const id of ['notice-year','notice-family','notice-title','notice-full-title','body-text','schedule-list','schedule-reviewed']) $(id).addEventListener('input', markChanged);
window.addEventListener('beforeunload', event => { if (hasChanges) { event.preventDefault(); event.returnValue = ''; } });
newNotice(); await refreshDrafts();

