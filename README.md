# 서울대학교 수리과학부 연구과제 공모 안내

저장 대상은 **snumath1946/research-notices**입니다. 공고를 연도별로 보관하고, 관리자가 PDF에서 필요한 본문만 선택해 등록하는 정적 사이트입니다.

## 이번 버전의 기능

- 방문자: 공고 목록·상세·검색·유형/연도/상태 필터·지난 공고 보관함.
- 관리자: PDF 올리기 → 가. 사업내용~사. 문의처 범위 추천 → 페이지별 위/아래 범위 조정 → 본문 이미지와 텍스트 검토 → 별도 첨부파일 추가.
- 스캔 PDF 또는 경계를 찾지 못한 문서는 자동 선택하지 않으며 직접 범위를 선택합니다. 외부 AI·OCR 서비스에 원문을 보내지 않습니다.
- PDF 원본 전체는 자동 게시하지 않습니다. 선택한 본문 이미지만 표시하며, 원본 다운로드를 원할 때만 별도 첨부파일로 직접 추가합니다.
- 브라우저 임시보관, 업데이트 ZIP 생성, GitHub에 공고와 자료를 한 번에 저장.
- 이전 연도 공고와 파일을 보존합니다. 수정 시에도 기존 파일을 원격에서 삭제하지 않습니다.
- IRIS 신청·과제별 일정 차이·공문/관인 요청 서류·접수번호/사업명/과제명을 songh2@snu.ac.kr로 보내달라는 공통 안내를 유지했습니다.

## 바로 확인하기

압축을 해제한 뒤 `미리보기-시작.cmd`를 실행하세요. Node.js 또는 이 컴퓨터의 Codex 제공 Node가 필요합니다. 관리자 주소는 http://127.0.0.1:4173/admin.html 입니다. 방문자 화면은 같은 주소의 `/index.html`입니다. 종료는 미리보기 명령창에서 Ctrl+C입니다.

다른 방법: 이 폴더에서 `node scripts/serve.cjs`를 실행합니다. 관리 화면은 PDF 처리용 모듈을 사용하므로 파일을 더블클릭하는 방식 대신 HTTP 미리보기나 배포 주소에서 열어야 합니다. 함께 제공하는 단일 HTML은 방문자 화면 검토용이며 관리자 기능을 포함하지 않습니다.

## 현재 4건

리더연구, 신진연구 유형 B·A, 한우물파기 기초연구, 핵심연구 유형 C~A·도약형에 사용자가 제공한 본문 캡처를 연결했습니다. 캡처에서 확인한 연구자 신청기간·기관 승인 마감을 입력했습니다. 사이트 데이터에 실제 ZIP을 미리 넣지는 않았으며 관리자가 추가할 수 있습니다.

명령 실행 환경에서는 Z: PDF 접근이 거부됐습니다. 브라우저 관리 화면에서는 실제 리더연구 PDF의 본문 선택·텍스트 추출과 ZIP 첨부 상태를 확인했습니다. 해당 편집본은 브라우저 임시보관함에 보존했습니다. 임시보관은 동일한 브라우저와 동일한 주소에서만 복원됩니다.

## GitHub 최초 연결

아직 원격 저장소를 만들거나 소스를 올리거나 배포하지 않았습니다. 현재 Codex의 연결 계정은 songh2이므로 이 계정에는 쓰지 않았습니다.

1. snumath1946 계정에서 research-notices 저장소를 준비합니다. 공문 본문과 첨부파일의 공개 가능 여부를 먼저 결정합니다.
2. 이 소스의 구조를 유지해 전체 내용을 저장소에 올립니다. `dist/`를 저장소 루트로 풀어 올리지 마세요. 관리자 저장 경로는 `dist/data/notices.js` 및 `dist/files/`입니다. 숨김 폴더 `.github/`도 포함합니다.
3. 저장소 Settings → Pages의 Source를 GitHub Actions로 설정합니다. 포함된 Pages 작업을 실행하면 `dist/`만 게시됩니다. 이후 main의 dist 변경 시 갱신됩니다. 이 설정과 실행은 아직 하지 않았습니다.
4. 배포된 사이트의 공고 관리 화면에서 snumath1946 계정이 발급한 저장소 한정 fine-grained token으로 연결합니다. 대상 저장소만 선택하고 Contents 읽기·쓰기 권한을 사용하세요. 인증값을 채팅·소스·공유 문서에 넣지 마세요. 화면은 메모리에서만 사용하며 임시보관·ZIP·로그에 저장하지 않습니다.
5. 연결하면 최신 목록을 읽습니다. 공고 본문과 첨부파일을 확인한 뒤 GitHub 저장 내용 확인을 누르고 최종 저장합니다. 다른 사람의 수정이 있으면 덮어쓰지 않고 중단합니다.

GitHub Pages는 저장소 비공개와 별개로 사이트가 공개될 수 있습니다. 학내 전용 자료라면 기관이 승인한 접근제어 호스팅/파일 저장소를 선택해야 합니다.

## 확인된 범위와 남은 확인

자동 기능 테스트 23개, 실제 한국어 PDF 경계 통합 테스트, 정적/동봉파일 점검 293개가 통과했습니다. 브라우저에서 실제 PDF 본문 선택, 첨부 추가, 임시보관 및 복원을 확인했습니다. 관리자 375/768/1024/1440px 및 방문자 모바일에서 가로 넘침이 없었습니다.

앱 내 브라우저의 ZIP 다운로드 완료 이벤트는 세 차례 시간 초과로 확인하지 못해 중단했습니다. 생성된 ZIP 링크는 표시됩니다. 같은 ZIP 생성 함수의 실제 압축 데이터·CRC·파일 내용·이전 공고 보존·원문 제외는 자동 테스트로 확인했습니다. 최종 파일 저장은 일반 Chrome·Edge에서 추가 확인하거나 GitHub 저장 방식을 사용하세요. 실제 GitHub 쓰기는 새 계정 권한이 없어 모의 프로토콜 테스트까지만 수행했습니다.

## 검증 명령

```text
node tests/model.test.cjs
node tests/admin.test.cjs
node tests/export.test.cjs
node scripts/verify.cjs
```

PDF 실입력 테스트는 `tests/pdf-integration.mjs`와 `tests/fixtures/sample-notice.pdf`를 사용하며, Node에서는 RESEARCH_CANVAS_PATH에 제공된 @napi-rs/canvas 경로가 필요합니다. 브라우저 사이트에는 이 Node 테스트 의존성을 배포하지 않습니다.

본문/첨부 데이터 구조는 docs/DATA_DICTIONARY.md, 상세 결과는 docs/VERIFICATION_V2.md, 설계는 docs/DECISIONS.md를 참고하세요. 제공된 PDF.js와 JSZip을 재사용했으며 새 패키지를 설치하지 않았습니다. 라이선스 및 파일 해시는 dist/vendor에 포함했습니다.

공식 근거: [PDF.js](https://mozilla.github.io/pdf.js/examples/), [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages), [GitHub 커밋 API](https://docs.github.com/en/rest/git/commits), [Git 참조 업데이트](https://docs.github.com/en/rest/git/refs).
