# my-travel

여행별 일정 · 맛집 · 카페 · 술집 · 준비물을 한곳에 모아두는 정적 사이트.

- 주소: https://travel.neungae.com
- 호스팅: Cloudflare Workers(정적 자산). `main`에 푸시하면 자동 빌드·배포.

## 구조

```
trips/                 여행 데이터 (여행 1개 = JSON 1개)  ← 내용은 여기만 고치면 됨
  2026-07-matsuyama.json
  2026-12-hongkong.json
site/static/           공통 CSS · JS (템플릿 한 벌)
  home.css  trip.css  supabase.js  js/*.js
build.js               trips/*.json + 템플릿 → dist/ 생성 (의존성 없음)
dist/                  빌드 결과물 (git 미추적, Cloudflare가 서빙)
wrangler.jsonc         Cloudflare 설정 (assets.directory = ./dist, 커스텀 도메인)
```

## 로컬 미리보기

```bash
npm run preview        # dist/ 빌드 후 http://localhost:8788
```

## 새 여행 추가

1. `trips/<YYYY-MM-city>.json` 파일을 만든다. 기존 파일을 복사해서 시작하면 편하다.
2. `id`는 파일명과 같아야 한다. `start`/`end`는 `YYYY-MM-DD`.
3. 푸시하면 메인 화면 카드와 하위 페이지 5개가 자동으로 생성된다.

### JSON 요약

| 키 | 설명 |
|---|---|
| `id` `city` `emoji` `heroEmoji` `title` `subtitle` `start` `end` | 카드·헤더 정보. 날짜 라벨("4박 5일 · …")은 자동 계산 |
| `weather` | `{ lat, lon, label, timezone }` — Open-Meteo 실시간 날씨 |
| `flights` `stay` | `{ note?, cards: [card] }` |
| `plan` | `{ note?, days: [{ num, date, items: [{ time, ...card }] }] }` |
| `notes` | 선택. `[{ badge, title, note?, cards }]` 추가 섹션 |
| `pages.food` `pages.cafe` `pages.drink` | `{ emoji, title, subtitle, tabs?, summary?, groups: [{ id, label?, badge, title, note?, items: [card] }] }` |
| `sos` | 준비물 페이지 긴급 연락처 `{ note, cards: [{ name, sub?, tels: [{ label, num, href, big? }] }] }` |

**card** = `{ tags?: [{ text, cls? }], name, desc?: [html], links?: [{ label, href }], tip? }`
`desc`와 `name`에는 `<b>` 같은 HTML을 그대로 쓸 수 있다.

- `pages.*.tabs: true`면 `groups`가 지역 탭 + 지역별 섹션으로 렌더링된다(홍콩). 없으면 섹션만 나열된다(마쓰야마).
- `tip`을 넣으면 일정 카드가 클릭 시 펼쳐지는 툴팁 카드가 된다. `{ title, blocks: [{ heading?, items: [html] }], note? }`
- `tags[].cls`: `want`(강조) `time`(시간) `rest`(휴식)

## 준비물 체크리스트

`pack.html`은 Supabase(`packing_items` 테이블, `trip` = 여행 id)로 기기 간 동기화된다.
무료 플랜은 일주일 미사용 시 일시정지되므로 "연결 실패"가 뜨면 Supabase 대시보드에서 Restore.
