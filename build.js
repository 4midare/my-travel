#!/usr/bin/env node
/**
 * my-travel 정적 사이트 빌드
 *   trips/<id>.json  +  site/ 템플릿  →  dist/
 *
 * 사용: node build.js        (Cloudflare Workers Builds 에서는 `npm run build`)
 * 의존성 없음 (Node 18+)
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const TRIPS_DIR = path.join(ROOT, 'trips');
const STATIC_DIR = path.join(ROOT, 'site', 'static');
const DIST = path.join(ROOT, 'dist');

const SITE = {
  title: 'my-travel',
  emoji: '✈️🗺️',
  tagline: '여행별 일정 · 맛집 · 준비물을 한곳에',
  footer: 'made with ❤️ · <a href="https://github.com/4midare/my-travel" target="_blank">GitHub</a>',
};

// 여행 하위 페이지 탭 (순서 고정)
const TABS = [
  { key: 'index', file: 'index.html', label: '🏠 홈' },
  { key: 'food', file: 'food.html', label: '🍜 맛집' },
  { key: 'cafe', file: 'cafe.html', label: '☕ 카페' },
  { key: 'drink', file: 'drink.html', label: '🍶 술집' },
  { key: 'pack', file: 'pack.html', label: '🧳 준비물' },
];

// ---------- 유틸 ----------
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const attr = (s) => esc(s);
const DOW = ['일', '월', '화', '수', '목', '금', '토'];
const pad2 = (n) => String(n).padStart(2, '0');

function parseDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}
/** "4박 5일 · 2026.07.04(토) ~ 07.08(수)" */
function datesLabel(start, end) {
  const s = parseDate(start), e = parseDate(end);
  const nights = Math.round((e - s) / 86400000);
  return `${nights}박 ${nights + 1}일 · ${s.getFullYear()}.${pad2(s.getMonth() + 1)}.${pad2(s.getDate())}(${DOW[s.getDay()]}) ~ ${pad2(e.getMonth() + 1)}.${pad2(e.getDate())}(${DOW[e.getDay()]})`;
}
const footerOf = (trip) => `${trip.emoji} 즐거운 ${trip.city} 여행 되세요!`;

function write(rel, html) {
  const out = path.join(DIST, rel);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, html);
}
function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const ent of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, ent.name), d = path.join(dst, ent.name);
    ent.isDirectory() ? copyDir(s, d) : fs.copyFileSync(s, d);
  }
}

// ---------- 공통 조각 ----------
function head(title, css) {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<link rel="stylesheet" href="${css}">
</head>`;
}

function tripHeader({ emoji, h1, p, dates }) {
  return `  <header>
    <a class="back-home" href="../index.html" aria-label="여행 목록으로">‹ 여행 목록</a>
    <div class="emoji">${emoji}</div>
    <h1>${esc(h1)}</h1>
    <p>${esc(p)}</p>${dates ? `\n    <div class="dates">📅 ${esc(dates)}</div>` : ''}
  </header>`;
}

function tabsNav(active) {
  return `  <nav class="tabs">
${TABS.map((t) => `    <a href="${t.file}"${t.key === active ? ' class="active"' : ''}>${t.label}</a>`).join('\n')}
  </nav>`;
}

function secHead(badge, title, badgeCls) {
  return `<div class="sec-head"><span class="sec-badge${badgeCls ? ' ' + badgeCls : ''}">${esc(badge)}</span><h2>${title}</h2></div>`;
}

/** 카드 (맛집·항공·숙소·일정 공통). desc/name 은 신뢰하는 HTML 조각 */
function card(c, ind = '        ') {
  const hasTip = !!c.tip;
  const lines = [];
  lines.push(`${ind}<div class="card${hasTip ? ' has-tip" tabindex="0" role="button" aria-expanded="false' : ''}">`);
  for (const t of c.tags || []) {
    lines.push(`${ind}  <span class="tag${t.cls ? ' ' + t.cls : ''}">${esc(t.text)}</span>`);
  }
  if (c.name) lines.push(`${ind}  <div class="name">${c.name}${hasTip ? ' <span class="tip-hint">ⓘ 클릭</span>' : ''}</div>`);
  for (const d of c.desc || []) lines.push(`${ind}  <div class="desc">${d}</div>`);
  for (const l of c.links || []) lines.push(`${ind}  <a class="maplink" href="${attr(l.href)}" target="_blank">${esc(l.label)}</a>`);
  if (hasTip) lines.push(tooltip(c.tip, ind + '  '));
  lines.push(`${ind}</div>`);
  return lines.join('\n');
}

function tooltip(t, ind) {
  const out = [`${ind}<div class="tooltip">`];
  if (t.title) out.push(`${ind}  <div class="tip-title">${t.title}</div>`);
  for (const b of t.blocks || []) {
    if (b.heading) out.push(`${ind}  <div class="tip-sec">${b.heading}</div>`);
    out.push(`${ind}  <ul class="tip-list">`);
    for (const li of b.items) out.push(`${ind}    <li>${li}</li>`);
    out.push(`${ind}  </ul>`);
  }
  if (t.note) out.push(`${ind}  <div class="tip-note">${t.note}</div>`);
  out.push(`${ind}</div>`);
  return out.join('\n');
}

function cardsSection(meta, cards, extraAttr = '') {
  const grid = cards.length !== 1 || meta.grid;
  return `    <section${extraAttr}>
      ${secHead(meta.badge, meta.title, meta.badgeCls)}${meta.note ? `\n      <p class="sec-note">${meta.note}</p>` : ''}
${grid ? '      <div class="grid">\n' : ''}${cards.map((c) => card(c, grid ? '        ' : '      ')).join('\n')}
${grid ? '      </div>\n' : ''}    </section>`;
}

// ---------- 여행 홈 ----------
function renderTripIndex(trip) {
  const w = trip.weather;
  const pages = trip.pages || {};
  const menu = TABS.filter((t) => t.key !== 'index').map((t) => {
    const p = pages[t.key];
    const desc = t.key === 'pack' ? '짐 체크리스트' : (p ? p.subtitle : '');
    return `        <a class="card" style="text-decoration:none;color:inherit" href="${t.file}">
          <div class="name">${t.label} &rsaquo;</div>
          <div class="desc">${esc(desc)}</div>
        </a>`;
  }).join('\n');

  const days = (trip.plan.days || []).map((d) => `      <div class="day-block">
        <div class="day-title"><span class="dnum">DAY ${d.num}</span><span class="ddate">${esc(d.date)}</span></div>
        <div class="timeline">
${d.items.map((it) => `          <div class="tl-item">
            <div class="time">${esc(it.time)}</div>
${card(it, '            ')}
          </div>`).join('\n')}
        </div>
      </div>`).join('\n\n');

  const notes = (trip.notes || []).map((n) => cardsSection(n, n.cards)).join('\n\n');

  return `${head(`${trip.title} ${trip.emoji} | 홈`, '../trip.css')}
<body>
${tripHeader({ emoji: trip.heroEmoji, h1: trip.title, p: trip.subtitle, dates: datesLabel(trip.start, trip.end) })}

${tabsNav('index')}

  <div class="wrap">

    <!-- 실시간 날씨 -->
    <div class="weather" id="weather" data-lat="${w.lat}" data-lon="${w.lon}" data-tz="${attr(w.timezone)}">
      <div class="wx-top">
        <div class="wx-left">
          <div class="wx-icon" id="wxIcon">⏳</div>
          <div class="wx-temp" id="wxTemp">--°</div>
          <div class="wx-meta">
            <div class="wx-place">${esc(w.label)}</div>
            <div class="wx-cond" id="wxCond">날씨 불러오는 중…</div>
          </div>
        </div>
      </div>
      <div class="wx-stats" id="wxStats" style="display:none">
        <div><span>체감</span> <b id="wxFeels">--°</b></div>
        <div><span>습도</span> <b id="wxHum">--%</b></div>
        <div><span>바람</span> <b id="wxWind">-- m/s</b></div>
      </div>
      <div class="wx-week" id="wxWeek" style="display:none"></div>
      <div class="wx-foot" id="wxFoot">실시간 · Open-Meteo</div>
    </div>

    <!-- 항공편 -->
${cardsSection({ badge: 'FLIGHT', badgeCls: 'blue', title: '항공편 ✈️', note: trip.flights.note, grid: true }, trip.flights.cards)}

    <!-- 숙소 -->
${cardsSection({ badge: 'STAY', badgeCls: 'blue', title: '숙소 🏨', note: trip.stay.note }, trip.stay.cards)}

    <!-- 일정 -->
    <section>
      ${secHead('PLAN', '일정 📅')}
${trip.plan.note ? `\n      <p class="sec-note">${trip.plan.note}</p>\n` : ''}
${days}
    </section>
${notes ? '\n' + notes + '\n' : ''}
    <!-- 지도 -->
    <section>
      ${secHead('MAP', '지도 🗺️', 'blue')}
      <p class="sec-note">가고 싶은 곳을 한눈에 — 구글 마이맵에 핀을 모아두면 편해요</p>
      <div class="card">
        <div class="name">📍 내 지도 만들기</div>
        <div class="desc">구글 마이맵(My Maps)에서 맛집·술집을 핀으로 저장하고, 공유 링크를 넣으면 지도가 임베드돼요.</div>
        <a class="maplink" href="https://www.google.com/maps/d/" target="_blank">→ 구글 마이맵 열기</a>
      </div>
    </section>

    <!-- 바로가기 -->
    <section>
      ${secHead('MENU', '둘러보기 👀')}
      <div class="grid">
${menu}
      </div>
    </section>

    <footer>${esc(footerOf(trip))}</footer>
  </div>

  <script src="../js/weather.js"></script>
  <script src="../js/tips.js"></script>
</body>
</html>
`;
}

// ---------- 목록 페이지 (맛집 · 카페 · 술집) ----------
function renderListPage(trip, key) {
  const page = trip.pages[key];
  const groups = page.groups || [];
  const total = groups.reduce((n, g) => n + g.items.length, 0);
  const useTabs = !!page.tabs && groups.length > 0;

  const subTabs = useTabs ? `
  <nav class="sub-tabs" id="areaTabs" role="tablist" aria-label="지역 필터">
    <button class="active" role="tab" aria-selected="true" data-area="all">전체 <span class="cnt">${total}</span></button>
${groups.map((g) => `    <button role="tab" aria-selected="false" data-area="${attr(g.id)}">${esc(g.label || g.title)} <span class="cnt">${g.items.length}</span></button>`).join('\n')}
  </nav>
` : '';

  const summary = page.summary
    ? cardsSection({ ...page.summary, grid: true }, page.summary.cards, ' data-area="summary"') + '\n'
    : '';

  const sections = groups.map((g) =>
    cardsSection({ badge: g.badge, badgeCls: g.badgeCls, title: g.title, note: g.note, grid: true }, g.items, useTabs ? ` data-area="${attr(g.id)}"` : '')
  ).join('\n\n');

  const body = groups.length
    ? `${summary}${sections}`
    : `    <section>
      ${secHead(key.toUpperCase(), page.title)}
      <p class="sec-note">아직 저장한 곳이 없어요 · trips/${trip.id}.json 의 pages.${key}.groups 에 추가하세요</p>
    </section>`;

  return `${head(`${trip.title} ${page.emoji} | ${page.title}`, '../trip.css')}
<body>
${tripHeader({ emoji: page.emoji, h1: page.title, p: page.subtitle })}

${tabsNav(key)}
${subTabs}
  <div class="wrap">

${body}

    <footer>${esc(footerOf(trip))}</footer>
  </div>
${useTabs ? '<script src="../js/areatabs.js"></script>\n' : ''}</body>
</html>
`;
}

// ---------- 준비물 ----------
function renderPack(trip) {
  const sos = trip.sos || { note: '', cards: [] };
  const sosCards = sos.cards.map((c) => `        <div class="sos-card">
          <div class="sos-name">${esc(c.name)}${c.sub ? ` <span class="sos-sub">${esc(c.sub)}</span>` : ''}</div>
${c.tels.map((t) => t.big
    ? `          <a class="sos-tel big" href="tel:${attr(t.href)}"><b>${esc(t.num)}</b></a>`
    : `          <a class="sos-tel" href="tel:${attr(t.href)}">${esc(t.label)} <b>${esc(t.num)}</b></a>`).join('\n')}
        </div>`).join('\n\n');

  return `${head(`${trip.title} 🧳 | 준비물`, '../trip.css')}
<body data-trip="${attr(trip.id)}">
${tripHeader({ emoji: '🧳', h1: '준비물', p: '짐 체크리스트' })}

${tabsNav('pack')}

  <div class="wrap">

    <!-- 긴급 연락처 -->
    <section>
      ${secHead('SOS', '긴급 연락처 🚨', 'red')}
      <p class="sec-note">${sos.note || '현지에서 바로 전화 연결 — 번호를 누르면 통화로 연결돼요'}</p>

      <div class="grid">
${sosCards}
      </div>
    </section>

    <!-- 준비물 -->
    <section>
      ${secHead('PACK', '준비물 리스트 🧳')}
      <p class="sec-note">체크하면 모든 기기에 바로 반영돼요 ☁️ <span class="sync-status" id="syncStatus">연결 중…</span></p>

      <div id="packList"></div>

      <form class="add-item" id="addForm" autocomplete="off">
        <select id="addCat" aria-label="분류"></select>
        <input id="addName" type="text" placeholder="준비물 추가…" maxlength="60" required>
        <button type="submit">추가</button>
      </form>
    </section>

    <footer>${esc(footerOf(trip))}</footer>
  </div>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="../supabase.js"></script>
<script src="../js/pack.js"></script>
</body>
</html>
`;
}

// ---------- 메인 (여행 목록) ----------
function renderHome(trips) {
  const cards = trips.map((t) => `        <article class="trip-card" data-start="${t.start}" data-end="${t.end}">
          <a class="stretched-link" href="${t.id}/index.html" aria-label="${attr(t.title)} 열기"></a>
          <div class="trip-banner"></div>
          <div class="trip-body">
            <div class="trip-top">
              <div class="trip-emoji">${t.emoji}</div>
              <span class="trip-status" data-status></span>
            </div>
            <div class="trip-title">${esc(t.title)}</div>
            <div class="trip-loc">${esc(t.subtitle)}</div>
            <div class="trip-dates">📅 ${esc(datesLabel(t.start, t.end))}</div>
          </div>
        </article>`).join('\n\n');

  return `${head(`${SITE.title} ✈️ | 여행 모음`, 'style.css')}
<body>
  <header>
    <div class="emoji">${SITE.emoji}</div>
    <h1>${esc(SITE.title)}</h1>
    <p>${esc(SITE.tagline)}</p>
    <div class="count-pill" id="tripCount">총 ${trips.length}개의 여행</div>
  </header>

  <div class="wrap">

    <section>
      ${secHead('TRIPS', '여행 목록')}

      <div class="filter-tabs" role="tablist" aria-label="여행 필터">
        <button class="tab active" role="tab" aria-selected="true" data-filter="upcoming">🗓️ 예정 여행 <span class="cnt" data-cnt="upcoming">0</span></button>
        <button class="tab" role="tab" aria-selected="false" data-filter="done">✅ 다녀온 여행 <span class="cnt" data-cnt="done">0</span></button>
      </div>

      <div class="trip-grid" id="tripGrid">

${cards}

        <div class="trip-card placeholder" data-empty="upcoming">
          <div class="ph-emoji">✈️</div>
          <div class="ph-title">예정된 여행이 없어요 ✈️</div>
          <div class="ph-sub">trips/ 폴더에 JSON 파일을 추가하면 여기에 나타나요</div>
        </div>

        <div class="trip-card placeholder" data-empty="done">
          <div class="ph-emoji">🧳</div>
          <div class="ph-title">아직 다녀온 여행이 없어요 🧳</div>
          <div class="ph-sub">첫 여행을 기록해 보세요</div>
        </div>

      </div>
    </section>

    <footer>${SITE.footer}</footer>
  </div>

  <script src="js/home.js"></script>
</body>
</html>
`;
}

// ---------- 검증 ----------
function validate(trip, file) {
  const need = ['id', 'city', 'emoji', 'heroEmoji', 'title', 'subtitle', 'start', 'end', 'weather', 'flights', 'stay', 'plan', 'pages'];
  for (const k of need) if (trip[k] == null) throw new Error(`${file}: "${k}" 누락`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trip.start) || !/^\d{4}-\d{2}-\d{2}$/.test(trip.end)) throw new Error(`${file}: start/end 는 YYYY-MM-DD`);
  if (trip.id !== path.basename(file, '.json')) throw new Error(`${file}: id 는 파일명과 같아야 함 (${trip.id})`);
  for (const key of ['food', 'cafe', 'drink']) {
    const p = trip.pages[key];
    if (!p) throw new Error(`${file}: pages.${key} 누락`);
    if (p.tabs) for (const g of p.groups || []) if (!g.id) throw new Error(`${file}: pages.${key} tabs 사용 시 각 group 에 id 필요`);
  }
}

// ---------- 메인 ----------
function main() {
  fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(DIST, { recursive: true });

  const files = fs.readdirSync(TRIPS_DIR).filter((f) => f.endsWith('.json')).sort();
  const trips = files.map((f) => {
    const trip = JSON.parse(fs.readFileSync(path.join(TRIPS_DIR, f), 'utf8'));
    validate(trip, f);
    return trip;
  });

  // 정적 파일: css/js/supabase.js
  copyDir(STATIC_DIR, DIST);
  fs.renameSync(path.join(DIST, 'home.css'), path.join(DIST, 'style.css'));

  write('index.html', renderHome(trips));
  for (const trip of trips) {
    write(`${trip.id}/index.html`, renderTripIndex(trip));
    for (const key of ['food', 'cafe', 'drink']) write(`${trip.id}/${key}.html`, renderListPage(trip, key));
    write(`${trip.id}/pack.html`, renderPack(trip));
  }
  console.log(`✔ built ${trips.length} trip(s) → dist/  [${trips.map((t) => t.id).join(', ')}]`);
}

main();
