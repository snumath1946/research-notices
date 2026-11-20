# 설계 결정

## 버전 2 — PDF와 GitHub 관리

- 소유자와 저장소를 사용자 확인에 따라 `snumath1946/research-notices`로 고정했다. 현재 연결된 songh2 계정으로 원격 변경하지 않았다.
- 기존 정적 호스팅을 유지했다. 브라우저에서 PDF.js로 표시할 본문만 이미지로 잘라 표·각주를 보존하고 텍스트를 함께 추출한다. 외부 모델에 공문을 보내지 않는다.
- 캡처 범위인 사업내용~문의처를 추천하되 관리자가 범위를 확정한다. 스캔본·경계 미탐지 시 자동 전체 게시를 하지 않는다.
- 처음 4건은 제공된 캡처를 사용한다. Z: 원문은 실행 환경에서 읽지 못했지만 브라우저 관리 화면에서 실제 리더연구 PDF의 본문 선택과 ZIP 추가를 확인했다.
- IndexedDB 임시보관은 동일 브라우저·주소에 한정됨을 표시한다. 지속적인 공유는 GitHub 저장으로 구분한다.
- 별도 인증 서버를 추가하지 않고 저장소 한정 fine-grained token을 해당 관리자 브라우저 메모리에서만 사용한다. 소스·ZIP·로컬 저장소·서버·로그에는 쓰지 않는다. 다른 GitHub 계정은 파일을 보내기 전에 거부한다.
- GitHub 최신 데이터의 JSON 부분을 파싱하고 변경 공고만 병합한다. 파일·목록을 한 커밋에 넣고 비강제 참조 갱신으로 동시 수정 덮어쓰기를 막는다. 삭제 API와 강제 push를 사용하지 않는다.
- 첨부 제외는 공고 연결만 제외하며 원격 이력의 파일을 지우지 않는다. 개인정보 회수 등 실제 삭제는 별도 결정이 필요하다.
- 관리자의 최종 확인 뒤에만 원격 쓰기를 시작한다. 이번 작업 중 실제 원격 저장·배포는 하지 않았다.
- GitHub Pages 설정 파일은 `dist/` 변경을 게시하도록 준비했다. 활성화 전에는 동작하지 않는다. 관리자 저장 경로와 게시 경로를 일치시켰다.
- PDF.js 5.6.205·JSZip 3.10.1은 기존 제공 파일을 동봉했다. 설치 없이 버전·라이선스·SHA-256 manifest로 고정한다. 보안 감사 API는 접속 오류가 있어 운영 전 검토가 남는다.

이하 내용은 초기 디자인 초안의 설계 기록이다.

- 정적 HTML/CSS/JavaScript를 선택했다. 읽기 중심 공고 및 다운로드에 서버·로그인·패키지 설치가 필요하지 않다. GitHub Pages 등 정적 호스팅으로 이동 가능하다.
- 데이터는 `dist/data/notices.js`, 파일은 `dist/files/사업연도/공고ID/`로 구분한다. 기존 ID와 연도 데이터를 보존하고 신규 항목을 추가한다.
- 공고 ID 해시 주소로 상세 화면을 연결한다. GitHub 프로젝트 하위 경로 및 직접 상세 링크·새로고침을 지원한다.
- 사업연도와 접수일시는 별개다. 여러 유형의 서로 다른 신청기간을 `schedules` 배열에 기록한다. 기관 승인 마감도 별도 필드로 둔다.
- 날짜를 모르면 접수중·마감임박 등으로 계산하지 않는다. 4건 모두 원문 미확인이다.
- 다운로드 링크는 `available: true`이고 실제 경로가 있는 파일에만 생성한다. 부재중인 원문에 가짜 링크를 만들지 않는다.
- 접수 현황은 서버에 수집하지 않는다. 사용자의 메일 앱에 사업명·접수번호·과제명 작성 틀을 연다. 자동 발송하지 않는다.
- 확인되지 않은 공식 로고·부서명·지원금액·자격을 만들지 않는다. 운영부서 표기는 추후 확정한다.

## 디자인 근거
- 요청한 `songh2/ui-ux-pro-max-skill`(2de1134dc4d1cfe112934611ae5803ae17a1bd7e) 및 `songh2/unslop`(620163eedb3529d9cd23a3994ed8d287d06f760d)을 읽었다.
- UI/UX 검색 1차 `university research portal accessible`: Swiss Modernism 2.0 및 institutional navy가 적합했다. Portfolio Grid 구성은 공고 안내와 맞지 않아 사용하지 않았다.
- 검색 재시도 `government public notice archive`: Accessible & Ethical, 16px 이상 본문·명확한 포커스·44px 터치 대상을 채택했다. 단일 CTA 랜딩 구성은 사용하지 않았다. 목록/상세 구성은 사용자 요구에 따른 직접 설계다.
- 영문 서체 추천은 한국어에 맞지 않아 적용하지 않았다. 운영체제의 한국어 서체를 사용해 외부 폰트 연결 없이 읽히게 했다.
- Unslop 방향: 교수의 공고 확인 도구 / 차분함·정확함·정돈됨 / 학내 공문과 연도별 문서철 / 남색 연도 영역과 공고 목록 / 연도 색인선.
- 신규 화면이므로 기존 화면 감사 대상은 없다. 사용자 요청의 '초안 제작 후 피드백'에 따라 방향 승인 대기 없이 초안을 만든다.

## 운영 방식 권고 근거(2026-11-20 확인)
- 공개 가능한 공고·양식만 제공하면 GitHub 저장소 + GitHub Pages가 단순하다. https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages
- 일반 GitHub Pages는 저장소가 비공개여도 사이트가 공개될 수 있으므로 학내 공문 원본의 공개 가능 여부를 확인한다. https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
- 큰 ZIP 누적 시 파일 저장소를 분리한다. GitHub 일반 파일은 100 MiB 초과 업로드를 차단한다. https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github
- 학내 전용 자료를 포함하면 기관이 승인한 접근제어 호스팅/파일 저장소를 사용한다. 이번에 배포·공유 권한을 변경하지 않았다.
