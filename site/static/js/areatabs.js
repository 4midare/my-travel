// 지역 필터 탭 — 섹션 data-area 로 표시/숨김, URL 해시로 상태 유지
  (function(){
    var tabs = document.querySelectorAll('#areaTabs button');
    var sections = document.querySelectorAll('section[data-area]');
    var mainNav = document.querySelector('nav.tabs');
    var sub = document.getElementById('areaTabs');

    function place(){ sub.style.top = mainNav.offsetHeight + 'px'; }
    place(); window.addEventListener('resize', place);

    function apply(area, push){
      tabs.forEach(function(b){
        var on = b.getAttribute('data-area') === area;
        b.classList.toggle('active', on);
        b.setAttribute('aria-selected', on ? 'true' : 'false');
        if (on) sub.scrollLeft = b.offsetLeft - (sub.clientWidth - b.offsetWidth) / 2;
      });
      sections.forEach(function(sec){
        var a = sec.getAttribute('data-area');
        sec.hidden = !(area === 'all' ? true : a === area);
      });
      if (push) history.replaceState(null, '', area === 'all' ? location.pathname : '#' + area);
    }
    tabs.forEach(function(b){
      b.addEventListener('click', function(){ apply(b.getAttribute('data-area'), true); });
    });
    var init = location.hash.replace('#','');
    var valid = Array.prototype.some.call(tabs, function(b){ return b.getAttribute('data-area') === init; });
    apply(valid ? init : 'all', false);
  })();
