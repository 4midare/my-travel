// 클릭하면 툴팁 토글 (.has-tip 카드 — 카드에 class="has-tip" + .tooltip 을 넣으면 동작)
  (function () {
    var tips = document.querySelectorAll(".has-tip");
    tips.forEach(function (card) {
      card.addEventListener("click", function (e) {
        e.stopPropagation();
        var isOpen = card.classList.toggle("open");
        card.setAttribute("aria-expanded", isOpen ? "true" : "false");
        // 다른 열린 툴팁은 닫기
        tips.forEach(function (other) {
          if (other !== card) { other.classList.remove("open"); other.setAttribute("aria-expanded", "false"); }
        });
      });
      card.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); card.click(); }
      });
    });
    // 바깥 클릭 시 닫기
    document.addEventListener("click", function () {
      tips.forEach(function (c) { c.classList.remove("open"); c.setAttribute("aria-expanded", "false"); });
    });
  })();
