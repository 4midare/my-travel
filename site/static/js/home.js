// 여행 카드 상태 배지 계산 (D-day / 여행 중 / 다녀옴) + 예정/다녀옴 필터
  (function () {
    var grid = document.getElementById("tripGrid");
    var cards = document.querySelectorAll(".trip-card[data-start]");
    var today = new Date();
    today.setHours(0, 0, 0, 0);

    cards.forEach(function (card) {
      var start = new Date(card.getAttribute("data-start") + "T00:00:00");
      var end = new Date(card.getAttribute("data-end") + "T00:00:00");
      var badge = card.querySelector("[data-status]");

      if (today < start) {
        if (badge) badge.textContent = "D-" + Math.ceil((start - today) / (1000 * 60 * 60 * 24));
        card.dataset.group = "upcoming";
      } else if (today >= start && today <= end) {
        if (badge) { badge.textContent = "여행 중"; badge.classList.add("ongoing"); }
        card.dataset.group = "upcoming";
      } else {
        if (badge) { badge.textContent = "다녀옴"; badge.classList.add("done"); }
        card.dataset.group = "done";
      }
    });

    // 예정: 시작일 오름차순(빠른 순) / 다녀옴: 종료일 내림차순(최근 순)
    var sorted = Array.prototype.slice.call(cards).sort(function (a, b) {
      var aUp = a.dataset.group === "upcoming";
      var bUp = b.dataset.group === "upcoming";
      if (aUp && bUp) {
        return new Date(a.getAttribute("data-start")) - new Date(b.getAttribute("data-start"));
      }
      if (!aUp && !bUp) {
        return new Date(b.getAttribute("data-end")) - new Date(a.getAttribute("data-end"));
      }
      return aUp ? -1 : 1;
    });
    sorted.forEach(function (card) { grid.appendChild(card); });

    var upcomingCount = 0, doneCount = 0;
    cards.forEach(function (card) {
      if (card.dataset.group === "upcoming") upcomingCount++; else doneCount++;
    });

    var cntUpcoming = document.querySelector('[data-cnt="upcoming"]');
    var cntDone = document.querySelector('[data-cnt="done"]');
    if (cntUpcoming) cntUpcoming.textContent = upcomingCount;
    if (cntDone) cntDone.textContent = doneCount;

    var tripCount = document.getElementById("tripCount");
    if (tripCount) tripCount.textContent = "총 " + cards.length + "개의 여행";

    var tabs = document.querySelectorAll(".filter-tabs .tab");
    var placeholders = document.querySelectorAll(".trip-card.placeholder[data-empty]");
    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function applyFilter(group) {
      cards.forEach(function (card) {
        card.hidden = card.dataset.group !== group;
      });
      placeholders.forEach(function (ph) {
        var forGroup = ph.getAttribute("data-empty");
        var count = forGroup === "upcoming" ? upcomingCount : doneCount;
        ph.hidden = !(forGroup === group && count === 0);
      });
    }

    function setActiveTab(group, updateUrl) {
      tabs.forEach(function (tab) {
        var active = tab.getAttribute("data-filter") === group;
        tab.classList.toggle("active", active);
        tab.setAttribute("aria-selected", active ? "true" : "false");
      });

      if (reduceMotion) {
        applyFilter(group);
      } else {
        grid.classList.add("is-switching");
        window.setTimeout(function () {
          applyFilter(group);
          grid.classList.remove("is-switching");
        }, 140);
      }

      if (updateUrl) {
        var url = new URL(window.location.href);
        url.searchParams.set("tab", group);
        history.replaceState(null, "", url);
      }
    }

    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        setActiveTab(tab.getAttribute("data-filter"), true);
      });
    });

    var initialTab = new URLSearchParams(window.location.search).get("tab");
    setActiveTab(initialTab === "done" ? "done" : "upcoming", false);
  })();
