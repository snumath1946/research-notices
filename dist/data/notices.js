/* 공고 데이터: 관리자 화면에서 갱신. 과거 연도와 ID를 보존하세요. */
(function(root) {
const data = /* CATALOG_JSON_START */
{
  "meta": {
    "title": "연구과제 공모 안내",
    "contact": "songh2@snu.ac.kr",
    "reviewedAt": "2026-11-20",
    "draft": false,
    "organization": "서울대학교 수리과학부",
    "repository": "snumath1946\u002fresearch-notices",
    "schemaVersion": 2
  },
  "notices": [
    {
      "id": "2027-leader-r1",
      "year": 2027,
      "order": 1,
      "family": "리더연구",
      "title": "리더연구",
      "fullTitle": "2027년도 기초연구사업 1차 신규과제 공모 안내(리더연구)",
      "program": "기초연구사업",
      "round": "1차 신규과제",
      "agency": "한국연구재단",
      "via": "서울대학교 산학협력단",
      "types": [
        "리더연구"
      ],
      "contentStatus": "verified",
      "postedAt": null,
      "schedules": [
        {
          "label": "리더연구",
          "researcherStart": "2026-11-25T14:00:00+09:00",
          "researcherEnd": "2026-12-08T13:00:00+09:00",
          "institutionEnd": "2026-12-10T13:00:00+09:00"
        }
      ],
      "summary": "2027년도 리더연구 공모 안내입니다.",
      "eligibility": null,
      "funding": null,
      "duration": null,
      "details": [],
      "sourceReference": "Cap 2026-11-20 09-43-10.jpg · 사용자 제공 본문 캡처",
      "attachments": [
        {
          "label": "1. 2027년도 기초연구사업 1차 신규과제 공모 안내(리더연구).zip",
          "filename": "1. 2027년도 기초연구사업 1차 신규과제 공모 안내(리더연구).zip",
          "format": "ZIP",
          "href": "files\u002f2027\u002f2027-leader-r1\u002fattachments\u002ffafd9b810a9f91357c776a8b.zip",
          "available": true,
          "size": 24841445
        }
      ],
      "bodyImages": [
        {
          "href": "files\u002f2027\u002f2027-leader-r1\u002fbody-01.jpg",
          "alt": "리더연구: 사업내용부터 문의처까지의 공문 본문"
        }
      ],
      "bodyText": "",
      "updatedAt": "2026-11-20T05:42:08.136Z"
    },
    {
      "id": "2027-early-career-r1",
      "year": 2027,
      "order": 2,
      "family": "신진연구",
      "title": "신진연구",
      "fullTitle": "2027년도 개인기초연구사업신규 1차 신규과제 공모 안내(신진연구 유형B, 유형A)",
      "program": "개인기초연구사업",
      "round": "1차 신규과제",
      "agency": "한국연구재단",
      "via": "서울대학교 산학협력단",
      "types": [
        "유형 B",
        "유형 A"
      ],
      "contentStatus": "verified",
      "postedAt": null,
      "schedules": [
        {
          "label": "유형 B · 유형 A",
          "researcherStart": "2026-11-25T14:00:00+09:00",
          "researcherEnd": "2026-12-08T13:00:00+09:00",
          "institutionEnd": "2026-12-10T13:00:00+09:00"
        }
      ],
      "summary": "2027년도 개인기초연구사업 신진연구 유형 B·유형 A의 1차 신규과제 공모 안내입니다.",
      "eligibility": null,
      "funding": null,
      "duration": null,
      "details": [],
      "sourceReference": "Cap 2026-11-20 09-43-56.jpg · 사용자 제공 본문 캡처",
      "attachments": [],
      "bodyImages": [
        {
          "href": "files\u002f2027\u002f2027-early-career-r1\u002fbody-01.jpg",
          "alt": "신진연구: 사업내용부터 문의처까지의 공문 본문"
        }
      ],
      "bodyText": ""
    },
    {
      "id": "2027-deep-focus-r1",
      "year": 2027,
      "order": 3,
      "family": "한우물파기",
      "title": "한우물파기 기초연구",
      "fullTitle": "2027년도 개인기초연구사업 1차 신규과제 공모 안내(한우물파기 기초연구)",
      "program": "개인기초연구사업",
      "round": "1차 신규과제",
      "agency": "한국연구재단",
      "via": "서울대학교 산학협력단",
      "types": [
        "한우물파기 기초연구"
      ],
      "contentStatus": "verified",
      "postedAt": null,
      "schedules": [
        {
          "label": "한우물파기 기초연구",
          "researcherStart": "2026-11-25T14:00:00+09:00",
          "researcherEnd": "2026-12-08T13:00:00+09:00",
          "institutionEnd": "2026-12-10T13:00:00+09:00"
        }
      ],
      "summary": "2027년도 개인기초연구사업 한우물파기 기초연구의 1차 신규과제 공모 안내입니다.",
      "eligibility": null,
      "funding": null,
      "duration": null,
      "details": [],
      "sourceReference": "Cap 2026-11-20 09-44-17.jpg · 사용자 제공 본문 캡처",
      "attachments": [],
      "bodyImages": [
        {
          "href": "files\u002f2027\u002f2027-deep-focus-r1\u002fbody-01.jpg",
          "alt": "한우물파기 기초연구: 사업내용부터 문의처까지의 공문 본문"
        }
      ],
      "bodyText": ""
    },
    {
      "id": "2027-core-r1",
      "year": 2027,
      "order": 4,
      "family": "핵심연구",
      "title": "핵심연구",
      "fullTitle": "2027년도 기초연구사업 1차 신규과제 공모 안내(핵심연구 유형C~A, 도약형)",
      "program": "기초연구사업",
      "round": "1차 신규과제",
      "agency": "한국연구재단",
      "via": "서울대학교 산학협력단",
      "types": [
        "유형 C~A",
        "도약형"
      ],
      "contentStatus": "verified",
      "postedAt": null,
      "schedules": [
        {
          "label": "유형 C~A · 도약형",
          "researcherStart": "2026-11-25T14:00:00+09:00",
          "researcherEnd": "2026-12-07T13:00:00+09:00",
          "institutionEnd": "2026-12-09T13:00:00+09:00"
        }
      ],
      "summary": "2027년도 기초연구사업 핵심연구 유형 C~A·도약형의 1차 신규과제 공모 안내입니다.",
      "eligibility": null,
      "funding": null,
      "duration": null,
      "details": [],
      "sourceReference": "Cap 2026-11-20 09-44-50.jpg · 사용자 제공 본문 캡처",
      "attachments": [],
      "bodyImages": [
        {
          "href": "files\u002f2027\u002f2027-core-r1\u002fbody-01.jpg",
          "alt": "핵심연구: 사업내용부터 문의처까지의 공문 본문"
        }
      ],
      "bodyText": ""
    }
  ]
}
/* CATALOG_JSON_END */;
if (typeof module !== "undefined" && module.exports) module.exports = data; else root.ResearchNoticesData = data;
})(typeof window !== "undefined" ? window : globalThis);
