# IGAW Newsletter Editor

뉴스레터 & SNS 콘텐츠 자동 생성 에디터

## 파일 구조

```
├── index.html        ← 에디터 UI
├── app.js            ← 뉴스레터 생성/렌더링/편집 로직
├── style.css         ← 스타일
└── js/
    ├── prompts.js    ← AI 프롬프트 (톤/형식 수정 시 여기)
    └── sns.js        ← SNS 텍스트 생성 모듈
```

## 사용법

1. GitHub Pages 링크로 접속
2. 설정에서 Gemini API 키 입력
3. URL 입력 → 생성 → 편집 → HTML 복사 → 스티비 발송

## 수정 가이드

| 하고 싶은 것 | 수정할 파일 |
|-------------|-----------|
| 프롬프트 톤/규칙 변경 | `js/prompts.js` |
| SNS 글 스타일 변경 | `js/sns.js` |
| 뉴스레터 HTML 렌더링 수정 | `app.js` (buildNL 함수) |
| UI/레이아웃 변경 | `index.html` + `style.css` |

## 작성 유형

- **📊 리포트형 (기본)** — 챕터별 구조 + 카드/테이블 시각화 + 인사이트 박스
- **📝 소제목형** — 이모지 소제목 + 본문 구조
- **📰 매거진형** — 에디토리얼 톤, 업종별 딥 섹션
