#!/usr/bin/env bash
#
# new-trip.sh — _template/ 을 복사해 새 여행 폴더를 만들고,
#               루트 index.html 카드와 README 표에 자동으로 추가합니다.
#
# 사용법:
#   ./new-trip.sh                         (질문에 답하는 대화형 모드)
#   ./new-trip.sh --city 후쿠오카 --city-en fukuoka \
#                 --start 2026-12-20 --end 2026-12-24 \
#                 [--emoji 🍜] [--title "..."] [--subtitle "..."] \
#                 [--lat 33.59 --lon 130.40]
#
set -euo pipefail
export LC_ALL=en_US.UTF-8

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

TEMPLATE_DIR="_template"
ROOT_INDEX="index.html"
README="README.md"
MARKER="        <!-- NEW_TRIP_CARD -->"

die() { printf '\n❌ %s\n' "$*" >&2; exit 1; }

# ---------------------------------------------------------------- 환경 감지
IS_GNU_DATE=0
if date --version >/dev/null 2>&1; then IS_GNU_DATE=1; fi

if sed --version >/dev/null 2>&1; then
  SED_INPLACE=(-i)          # GNU sed
else
  SED_INPLACE=(-i '')       # BSD / macOS sed
fi

date_epoch() {   # $1 = YYYY-MM-DD
  if [ "$IS_GNU_DATE" -eq 1 ]; then
    date -d "$1 12:00:00" +%s 2>/dev/null
  else
    date -j -f "%Y-%m-%d %H:%M:%S" "$1 12:00:00" +%s 2>/dev/null
  fi
}

date_fmt() {     # $1 = YYYY-MM-DD, $2 = strftime 포맷
  if [ "$IS_GNU_DATE" -eq 1 ]; then
    date -d "$1 12:00:00" +"$2" 2>/dev/null
  else
    date -j -f "%Y-%m-%d %H:%M:%S" "$1 12:00:00" +"$2" 2>/dev/null
  fi
}

# %u : 1(월) ~ 7(일)
KO_DOW_1=월; KO_DOW_2=화; KO_DOW_3=수; KO_DOW_4=목; KO_DOW_5=금; KO_DOW_6=토; KO_DOW_7=일
ko_dow() {       # $1 = YYYY-MM-DD
  local n
  n="$(date_fmt "$1" %u)" || return 1
  case "$n" in
    1) printf '%s' "$KO_DOW_1" ;;
    2) printf '%s' "$KO_DOW_2" ;;
    3) printf '%s' "$KO_DOW_3" ;;
    4) printf '%s' "$KO_DOW_4" ;;
    5) printf '%s' "$KO_DOW_5" ;;
    6) printf '%s' "$KO_DOW_6" ;;
    7) printf '%s' "$KO_DOW_7" ;;
  esac
}

valid_date() {   # $1 = YYYY-MM-DD → 형식 + 실제 파싱 확인
  printf '%s' "$1" | grep -Eq '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' || return 1
  date_epoch "$1" >/dev/null 2>&1 || return 1
  return 0
}

sed_escape() {   # sed 치환값에서 \ & | 를 이스케이프
  printf '%s' "$1" | sed -e 's/[\\&|]/\\&/g'
}

# ---------------------------------------------------------------- 인자 파싱
CITY=""; CITY_EN=""; START=""; END=""
EMOJI=""; TITLE=""; SUBTITLE=""; LAT=""; LON=""

while [ $# -gt 0 ]; do
  case "$1" in
    --city)      CITY="${2:-}";     shift 2 ;;
    --city-en)   CITY_EN="${2:-}";  shift 2 ;;
    --start)     START="${2:-}";    shift 2 ;;
    --end)       END="${2:-}";      shift 2 ;;
    --emoji)     EMOJI="${2:-}";    shift 2 ;;
    --title)     TITLE="${2:-}";    shift 2 ;;
    --subtitle)  SUBTITLE="${2:-}"; shift 2 ;;
    --lat)       LAT="${2:-}";      shift 2 ;;
    --lon)       LON="${2:-}";      shift 2 ;;
    -h|--help)
      sed -n '2,12p' "$0" | sed 's/^# \{0,1\}//'
      exit 0 ;;
    *) die "알 수 없는 옵션: $1" ;;
  esac
done

[ -d "$TEMPLATE_DIR" ] || die "'$TEMPLATE_DIR' 폴더가 없습니다."
[ -f "$ROOT_INDEX" ]   || die "'$ROOT_INDEX' 파일이 없습니다."
[ -f "$README" ]       || die "'$README' 파일이 없습니다."

NON_INTERACTIVE=0
if [ -n "$CITY" ] && [ -n "$CITY_EN" ] && [ -n "$START" ] && [ -n "$END" ]; then
  NON_INTERACTIVE=1
fi

# ---------------------------------------------------------------- 입력 받기
ask() {          # $1 = 질문, $2 = 기본값(없으면 빈 문자열)
  local label="$1" def="${2:-}" ans=""
  if [ -n "$def" ]; then
    printf '%s [%s]: ' "$label" "$def" >&2
  else
    printf '%s: ' "$label" >&2
  fi
  IFS= read -r ans || ans=""
  if [ -z "$ans" ]; then ans="$def"; fi
  printf '%s' "$ans"
}

if [ "$NON_INTERACTIVE" -eq 0 ]; then
  printf '\n🧳 새 여행 만들기 — 질문에 답해주세요 (Enter = 기본값)\n\n'

  while [ -z "$CITY" ]; do
    CITY="$(ask '1) 도시 (한글, 예: 후쿠오카)')"
    [ -n "$CITY" ] || printf '   ⚠️ 도시 이름은 필수입니다.\n'
  done

  while :; do
    [ -n "$CITY_EN" ] || CITY_EN="$(ask '2) 도시 (영문 소문자, 폴더명용, 예: fukuoka)')"
    if printf '%s' "$CITY_EN" | grep -Eq '^[a-z0-9-]+$'; then break; fi
    printf '   ⚠️ 영문 소문자·숫자·하이픈만 사용할 수 있어요.\n'
    CITY_EN=""
  done

  while :; do
    [ -n "$START" ] || START="$(ask '3) 시작일 (YYYY-MM-DD)')"
    if valid_date "$START"; then break; fi
    printf '   ⚠️ 날짜 형식이 올바르지 않아요 (예: 2026-12-20).\n'
    START=""
  done

  while :; do
    [ -n "$END" ] || END="$(ask '4) 종료일 (YYYY-MM-DD)')"
    if ! valid_date "$END"; then
      printf '   ⚠️ 날짜 형식이 올바르지 않아요 (예: 2026-12-24).\n'
      END=""; continue
    fi
    if [ "$(date_epoch "$END")" -lt "$(date_epoch "$START")" ]; then
      printf '   ⚠️ 종료일은 시작일보다 빠를 수 없어요.\n'
      END=""; continue
    fi
    break
  done

  EMOJI="$(ask '5) 이모지' "${EMOJI:-✈️}")"
  TITLE="$(ask '6) 여행 제목' "${TITLE:-민수의 ${CITY} 여행}")"
  SUBTITLE="$(ask '7) 한 줄 소개' "${SUBTITLE:-${CITY} 여행}")"
  printf '   ℹ️ 날씨 위젯용 · 모르면 Enter, 나중에 index.html 상단 LAT/LON 수정\n'
  LAT="$(ask '8) 위도' "${LAT:-0}")"
  LON="$(ask '   경도' "${LON:-0}")"
  printf '\n'
fi

# ---------------------------------------------------------------- 검증 + 기본값
[ -n "$CITY" ] || die "도시(한글)는 필수입니다."
printf '%s' "$CITY_EN" | grep -Eq '^[a-z0-9-]+$' || die "도시(영문)는 소문자·숫자·하이픈만 가능합니다: '$CITY_EN'"
valid_date "$START" || die "시작일 형식이 올바르지 않습니다: '$START'"
valid_date "$END"   || die "종료일 형식이 올바르지 않습니다: '$END'"
[ "$(date_epoch "$END")" -ge "$(date_epoch "$START")" ] || die "종료일은 시작일보다 빠를 수 없습니다."

EMOJI="${EMOJI:-✈️}"
TITLE="${TITLE:-민수의 ${CITY} 여행}"
SUBTITLE="${SUBTITLE:-${CITY} 여행}"
LAT="${LAT:-0}"
LON="${LON:-0}"

# ---------------------------------------------------------------- 파생 값
TRIP="$(date_fmt "$START" %Y-%m)-$CITY_EN"
CITY_EN_CAP="$(printf '%s' "${CITY_EN:0:1}" | tr '[:lower:]' '[:upper:]')${CITY_EN:1}"

NIGHTS=$(( ( $(date_epoch "$END") - $(date_epoch "$START") ) / 86400 ))
if [ "$NIGHTS" -eq 0 ]; then
  STAY_LABEL="당일치기"
else
  STAY_LABEL="${NIGHTS}박 $((NIGHTS + 1))일"
fi

START_Y="$(date_fmt "$START" %Y)"
END_Y="$(date_fmt "$END" %Y)"
START_FULL="$(date_fmt "$START" %Y.%m.%d)($(ko_dow "$START"))"
if [ "$START_Y" = "$END_Y" ]; then
  END_SHORT="$(date_fmt "$END" %m.%d)($(ko_dow "$END"))"
  README_RANGE="$(date_fmt "$START" %Y.%m.%d) ~ $(date_fmt "$END" %m.%d)"
else
  END_SHORT="$(date_fmt "$END" %Y.%m.%d)($(ko_dow "$END"))"
  README_RANGE="$(date_fmt "$START" %Y.%m.%d) ~ $(date_fmt "$END" %Y.%m.%d)"
fi

if [ "$NIGHTS" -eq 0 ]; then
  DATES_LABEL="${STAY_LABEL} · ${START_FULL}"
else
  DATES_LABEL="${STAY_LABEL} · ${START_FULL} ~ ${END_SHORT}"
fi

# ---------------------------------------------------------------- 폴더 생성
[ -e "./$TRIP" ] && die "'$TRIP' 폴더(파일)가 이미 있습니다. 먼저 정리해 주세요."

cp -R "$TEMPLATE_DIR" "$TRIP"

E_TRIP="$(sed_escape "$TRIP")"
E_TITLE="$(sed_escape "$TITLE")"
E_EMOJI="$(sed_escape "$EMOJI")"
E_CITY="$(sed_escape "$CITY")"
E_CITY_EN="$(sed_escape "$CITY_EN_CAP")"
E_SUBTITLE="$(sed_escape "$SUBTITLE")"
E_DATES="$(sed_escape "$DATES_LABEL")"
E_START="$(sed_escape "$START")"
E_END="$(sed_escape "$END")"
E_LAT="$(sed_escape "$LAT")"
E_LON="$(sed_escape "$LON")"

for f in "$TRIP"/*.html; do
  sed "${SED_INPLACE[@]}" \
    -e "s|{{TRIP}}|$E_TRIP|g" \
    -e "s|{{TITLE}}|$E_TITLE|g" \
    -e "s|{{EMOJI}}|$E_EMOJI|g" \
    -e "s|{{CITY_EN}}|$E_CITY_EN|g" \
    -e "s|{{CITY}}|$E_CITY|g" \
    -e "s|{{SUBTITLE}}|$E_SUBTITLE|g" \
    -e "s|{{DATES_LABEL}}|$E_DATES|g" \
    -e "s|{{START}}|$E_START|g" \
    -e "s|{{END}}|$E_END|g" \
    -e "s|{{LAT}}|$E_LAT|g" \
    -e "s|{{LON}}|$E_LON|g" \
    "$f"
done

LEFTOVER="$(grep -l '{{' "$TRIP"/*.html 2>/dev/null || true)"
[ -z "$LEFTOVER" ] || printf '⚠️ 치환되지 않은 자리표시자가 남아있습니다: %s\n' "$LEFTOVER"

# ---------------------------------------------------------------- 루트 index.html 카드 추가
TRIP="$TRIP" TITLE="$TITLE" EMOJI="$EMOJI" SUBTITLE="$SUBTITLE" \
DATES_LABEL="$DATES_LABEL" START="$START" END="$END" \
ROOT_INDEX="$ROOT_INDEX" MARKER="$MARKER" \
python3 - <<'PY'
import io, os, sys

path   = os.environ["ROOT_INDEX"]
marker = os.environ["MARKER"]

card = (
    '        <article class="trip-card" data-start="{START}" data-end="{END}">\n'
    '          <a class="stretched-link" href="{TRIP}/index.html" aria-label="{TITLE} 열기"></a>\n'
    '          <div class="trip-banner"></div>\n'
    '          <div class="trip-body">\n'
    '            <div class="trip-top">\n'
    '              <div class="trip-emoji">{EMOJI}</div>\n'
    '              <span class="trip-status" data-status></span>\n'
    '            </div>\n'
    '            <div class="trip-title">{TITLE}</div>\n'
    '            <div class="trip-loc">{SUBTITLE}</div>\n'
    '            <div class="trip-dates">📅 {DATES_LABEL}</div>\n'
    '          </div>\n'
    '        </article>\n'
    '\n'
).format(**{k: os.environ[k] for k in
            ("START", "END", "TRIP", "TITLE", "EMOJI", "SUBTITLE", "DATES_LABEL")})

src = io.open(path, encoding="utf-8").read()
if marker not in src:
    sys.exit("❌ '%s' 에서 <!-- NEW_TRIP_CARD --> 마커를 찾지 못했습니다." % path)
if ('href="%s/index.html"' % os.environ["TRIP"]) in src:
    sys.exit("❌ '%s' 에 이미 같은 여행 카드가 있습니다." % path)

src = src.replace(marker, card + marker, 1)
io.open(path, "w", encoding="utf-8").write(src)
print("   ✅ %s 에 여행 카드 추가" % path)
PY

# ---------------------------------------------------------------- README 표 한 줄 추가
TRIP="$TRIP" CITY="$CITY" SUBTITLE="$SUBTITLE" README_RANGE="$README_RANGE" README="$README" \
python3 - <<'PY'
import io, os, sys

path = os.environ["README"]
row = "| [{trip}](./{trip}/index.html) | {city} ({sub}) | {rng} |".format(
    trip=os.environ["TRIP"], city=os.environ["CITY"],
    sub=os.environ["SUBTITLE"], rng=os.environ["README_RANGE"])

lines = io.open(path, encoding="utf-8").read().split("\n")
idxs = [i for i, l in enumerate(lines) if l.startswith("| [")]
if not idxs:
    sys.exit("❌ '%s' 에서 여행 목록 표를 찾지 못했습니다." % path)
if any(("[%s]" % os.environ["TRIP"]) in l for l in lines):
    sys.exit("❌ '%s' 에 이미 같은 여행 행이 있습니다." % path)

lines.insert(idxs[-1] + 1, row)
io.open(path, "w", encoding="utf-8").write("\n".join(lines))
print("   ✅ %s 표에 한 줄 추가" % path)
PY

# ---------------------------------------------------------------- 요약
printf '\n'
printf '🎉 새 여행 폴더를 만들었습니다: %s\n' "$TRIP"
printf '   %s %s · %s\n' "$EMOJI" "$TITLE" "$DATES_LABEL"
printf '\n📁 생성된 파일\n'
for f in "$TRIP"/*; do printf '   - %s\n' "$f"; done
printf '\n📝 다음으로 채우면 되는 것\n'
printf '   1. %s/index.html — 항공편(편명·시간), 숙소(이름·예약번호·지도), 일정(day-block)\n' "$TRIP"
printf '   2. %s/food.html · cafe.html · drink.html — 가게 카드 추가 (지도 링크는 maps.app.goo.gl)\n' "$TRIP"
printf '   3. %s/pack.html — 현지 영사관/응급 번호 (TODO 주석 참고)\n' "$TRIP"
if [ "$LAT" = "0" ] || [ "$LON" = "0" ]; then
  printf '   4. %s/index.html 상단 스크립트의 LAT/LON — 지금 %s, %s (날씨 위젯이 안 맞으면 수정)\n' "$TRIP" "$LAT" "$LON"
fi
printf '\n🧳 준비물은 Supabase 에 trip = "%s" 로 자동 분리되어 저장돼요.\n' "$TRIP"
printf '   pack.html 하단 입력창에서 바로 추가하면 되고, 다른 여행과 섞이지 않습니다.\n'
printf '\n💾 확인 후 커밋\n'
printf '   git add %s index.html README.md && git commit -m "%s 여행 페이지 추가"\n\n' "$TRIP" "$CITY"
