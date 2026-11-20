const {test}=require('node:test');
const assert=require('node:assert/strict');
const T=require('../dist/assets/notice-text.js');
const C=require('../dist/assets/admin-core.js');
const I=require('../dist/assets/i18n.js');
const md=require('markdown-it');
const sample={schema:T.SCHEMA,bodyMarkdown:'## 가. 사업내용\n\n합성 본문',extraction:{engine:'kordoc',version:'4.25.2',sourceHash:'a'.repeat(64)}};
test('kordoc JSON은 데이터로 읽고 원본 경로·추가 필드·실행 코드는 가져오지 않는다',()=>{
  const value=T.parseImport({...sample,token:'synthetic',originalPdf:'synthetic',extraction:{...sample.extraction,sourcePath:'/synthetic/private.pdf'}});
  assert.equal(value.bodyMarkdown,sample.bodyMarkdown); assert.equal(value.extraction.engine,'kordoc');
  for(const key of ['token','originalPdf','sourcePath'])assert.equal(JSON.stringify(value).includes(key),false);
  for(const value of [{}, {...sample,bodyMarkdown:''},{...sample,schema:'wrong'},{...sample,extraction:{engine:'unknown'} }])assert.throws(()=>T.parseImport(value));
});
test('kordoc 문단·목록의 본문만 추천하고 수신·결재·붙임·서명을 제외한다',()=>{
  const input='수신 합성부서\n제목 합성 공고\n- 가. 사업내용\n내용\n붙임의 안내 참고\n- 사. 문의처\n합성 담당부서\n- 붙임 1. 서식\n서울대학교산학협력단장';
  const value=T.selectBody(input);assert.match(value.bodyMarkdown,/가\. 사업내용/);assert.match(value.bodyMarkdown,/합성 담당부서/);assert.doesNotMatch(value.bodyMarkdown,/수신|붙임 1|산학협력단장/);
  assert.equal(T.selectBody('제목만 있는 합성문서').bodyMarkdown,'');
});
test('텍스트 본문은 이미지 없이도 검토 후 저장할 수 있고 빈 본문은 거부한다',()=>{
  const n={id:'synthetic',year:2027,title:'합성',family:'합성',reviewed:true,bodyMarkdown:'본문',bodyImages:[]};
  assert.equal(C.validateDraft(n),true);assert.throws(()=>C.validateDraft({...n,reviewed:false}));assert.throws(()=>C.validateDraft({...n,bodyMarkdown:'  '}));
});
test('Markdown은 표·목록을 표시하며 HTML·스크립트·외부 이미지를 실행하지 않는다',()=>{
  const output=T.render('## 제목\n\n| 항목 | 값 |\n|---|---|\n| 표 | 텍스트 |\n\n- 목록\n\n<script>alert(1)</script>\n\n[bad](javascript:alert(1))\n\n![image](https://example.invalid/tracker.png)',md);
  assert.match(output,/<table>/);assert.match(output,/<ul>/);assert.doesNotMatch(output,/<script|<img|href="javascript:/i);assert.match(output,/&lt;script&gt;/);
});
test('공식 매칭은 연도·차수·연구유형이 같은 경우에만 제공하고 복사본을 반환한다',()=>{
  const n={year:2027,round:'1차 신규과제',family:'신진연구'};const p=T.officialMatch(n);
  assert.equal(p.title,'Young Scientist Grants');assert.ok(T.nrfUrl(p.source.url));
  p.title='changed';assert.equal(T.officialMatch(n).title,'Young Scientist Grants');
  for(const x of [{...n,year:2028},{...n,round:'2차 신규과제'},{...n,round:''},{...n,family:'알 수 없는 사업'}])assert.equal(T.officialMatch(x),null);
});
test('공식 출처는 재단 HTTPS 주소와 관리자 대조 확인이 필요하다',()=>{
  const n={year:2027,callRound:1};const s={...T.officialPrograms[0].source,reviewed:true};
  assert.ok(T.checkedSource(s,n));
  for(const x of [{...s,reviewed:false},{...s,url:'https://eng.nrf.re.kr.evil.invalid/page/x'},{...s,url:'javascript:alert(1)'},{...s,url:'https://user:secret@eng.nrf.re.kr/page/x'},{...s,year:2026},{...s,callRound:2}])assert.equal(T.checkedSource(x,n),null);
});
test('공식 영어와 학부 번역을 구분하고 원문의 날짜·첨부를 보존한다',()=>{
  const n={year:2027,round:'1차 신규과제',family:'신진연구',title:'신진연구',types:['유형 B','유형 A'],schedules:[{researcherEnd:'2026-12-08T13:00:00+09:00'}],attachments:[{href:'files/2027/synthetic/file.pdf'}]};
  const before=structuredClone(n);const en=I.notice(n,'en');assert.equal(en.title,'Young Scientist Grants');assert.equal(en.englishSource.kind,'nrf-official');assert.deepEqual(n,before);assert.deepEqual(en.schedules,n.schedules.map(s=>({...s,label:''})));assert.deepEqual(en.attachments,n.attachments);
  const manual=I.notice({...n,english:{title:'Manual translation',summary:'Manual overview'}},'en');assert.equal(manual.title,'Manual translation');assert.equal(manual.englishSource,null);
});
