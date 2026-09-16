# my-travel

여행별 일정·맛집·준비물 정리 사이트 모음. 여행마다 `YYYY-MM-도시` 폴더 하나씩 두고, 각 폴더의 `index.html`을 열면 됩니다.

## 여행 목록

| 폴더 | 여행 | 기간 |
|------|------|------|
| [2026-07-matsuyama](./2026-07-matsuyama/index.html) | 마쓰야마 (에히메 · 도고온천) | 2026.07.04 ~ 07.08 |

## 새 여행 추가

```bash
./new-trip.sh
```

질문에 답하면 `YYYY-MM-도시` 폴더가 `_template/` 기준으로 생성되고, 루트 `index.html` 여행 카드와 위 표에 자동으로 추가됩니다. 생성 후 `index.html`(항공·숙소·일정), `food/cafe/drink.html` 카드, 날씨 좌표(`LAT/LON`)를 채우면 됩니다.
