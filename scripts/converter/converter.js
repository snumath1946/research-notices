'use strict';
const $ = id => document.getElementById(id);
let converted = null;
$('pdf').addEventListener('change', async () => {
  const file = $('pdf').files[0]; if (!file) return;
  converted = null; $('editor').hidden = true; $('pdf').disabled = true; $('status').textContent = '이 컴퓨터에서 공문 텍스트를 읽고 있습니다.';
  try {
    if (!file.size || file.size > 25 * 1024 * 1024) throw new Error('25MB 이하 PDF를 선택해 주세요.');
    const response = await fetch('/convert', { method: 'POST', headers: { 'Content-Type': 'application/pdf' }, body: file });
    const value = await response.json(); if (!response.ok) throw new Error(value.error);
    converted = value; $('body').value = value.bodyMarkdown; $('full').textContent = value.fullMarkdown;
    $('reviewed').checked = false; $('download').disabled = true; $('editor').hidden = false; $('status').textContent = value.warnings.join(' ');
  } catch (err) { $('status').textContent = err.message || '변환에 실패했습니다. PDF를 확인해 주세요.'; }
  finally { $('pdf').disabled = false; }
});
$('body').addEventListener('input', () => { $('reviewed').checked = false; $('download').disabled = true; });
$('reviewed').addEventListener('change', () => { $('download').disabled = !$('reviewed').checked || !$('body').value.trim(); });
$('download').addEventListener('click', () => {
  if (!converted || !$('reviewed').checked || !$('body').value.trim()) return;
  const value = { ...converted, bodyMarkdown: $('body').value.trim(), extraction: { ...converted.extraction, selection: 'user-selected-body' } }; delete value.fullMarkdown;
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = 'notice-text.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
});
