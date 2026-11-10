// 준비물 체크리스트 (Supabase 실시간 동기화)
  const TRIP = document.body.getAttribute("data-trip");
  var FIXED_CATS = ["👕 옷", "🪥 세면도구", "💻 전자 용품", "💊 약·건강", "📄 서류", "🎒 기타"];
  var packList = document.getElementById('packList');
  var syncStatus = document.getElementById('syncStatus');
  var addForm = document.getElementById('addForm');
  var addCat = document.getElementById('addCat');
  var addName = document.getElementById('addName');
  var lastItems = [];

  function esc(str){
    return String(str).replace(/[&<>"']/g, function(ch){
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  function setStatus(text, cls){
    syncStatus.textContent = text;
    syncStatus.className = 'sync-status' + (cls ? ' ' + cls : '');
  }

  function populateCatOptions(items){
    var cats = FIXED_CATS.slice();
    items.forEach(function(it){
      if(cats.indexOf(it.category) === -1){ cats.push(it.category); }
    });
    var prev = addCat.value;
    addCat.innerHTML = cats.map(function(c){ return '<option value="' + esc(c) + '">' + esc(c) + '</option>'; }).join('');
    if(prev && cats.indexOf(prev) !== -1){ addCat.value = prev; }
  }

  function render(items){
    lastItems = items;
    populateCatOptions(items);

    if(!items.length){
      packList.innerHTML = '<p class="empty">아직 준비물이 없어요. 아래에서 추가해 보세요 🧳</p>';
      return;
    }

    var order = FIXED_CATS.slice();
    items.forEach(function(it){
      if(order.indexOf(it.category) === -1){ order.push(it.category); }
    });

    var groups = {};
    items.forEach(function(it){
      var cat = it.category || '🎒 기타';
      if(!groups[cat]){ groups[cat] = []; }
      groups[cat].push(it);
    });

    var html = '';
    order.forEach(function(cat){
      if(!groups[cat] || !groups[cat].length){ return; }
      html += '<div class="check-group"><h3>' + esc(cat) + '</h3>';
      groups[cat].forEach(function(it){
        html += '<div class="check-item' + (it.checked ? ' done' : '') + '" data-id="' + it.id + '">'
          + '<input type="checkbox"' + (it.checked ? ' checked' : '') + '>'
          + '<label>' + esc(it.name) + '</label>'
          + '<button type="button" class="del" aria-label="삭제">✕</button>'
          + '</div>';
      });
      html += '</div>';
    });
    packList.innerHTML = html;
  }

  function load(){
    sb.from('packing_items').select('*').eq('trip', TRIP).order('sort_order').order('id')
      .then(function(res){
        if(res.error){
          setStatus('오프라인 · 연결 실패', 'err');
          packList.innerHTML = '<p class="empty">목록을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.</p>';
          return;
        }
        render(res.data || []);
        setStatus('동기화됨', 'ok');
      });
  }

  packList.addEventListener('click', function(e){
    var delBtn = e.target.closest('.del');
    var item = e.target.closest('.check-item');
    if(!item){ return; }
    var id = Number(item.getAttribute('data-id'));

    if(delBtn){
      e.stopPropagation();
      if(!confirm('삭제할까요?')){ return; }
      setStatus('저장 중…', 'busy');
      sb.from('packing_items').delete().eq('id', id).then(function(res){
        if(res.error){ setStatus('오프라인 · 연결 실패', 'err'); return; }
        load();
      });
      return;
    }

    var box = item.querySelector('input');
    var next = !box.checked;
    box.checked = next;
    item.classList.toggle('done', next);
    setStatus('저장 중…', 'busy');
    sb.from('packing_items').update({ checked: next }).eq('id', id).then(function(res){
      if(res.error){
        box.checked = !next;
        item.classList.toggle('done', !next);
        setStatus('오프라인 · 연결 실패', 'err');
        return;
      }
      setStatus('동기화됨', 'ok');
    });
  });

  addForm.addEventListener('submit', function(e){
    e.preventDefault();
    var name = addName.value.trim();
    if(!name){ return; }
    var category = addCat.value || '🎒 기타';
    var maxOrder = lastItems.reduce(function(max, it){ return Math.max(max, it.sort_order || 0); }, 0);
    setStatus('저장 중…', 'busy');
    sb.from('packing_items').insert({ trip: TRIP, name: name, category: category, sort_order: maxOrder + 1 })
      .then(function(res){
        if(res.error){ setStatus('오프라인 · 연결 실패', 'err'); return; }
        addName.value = '';
        load();
      });
  });

  sb.channel('packing-' + TRIP)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'packing_items', filter: 'trip=eq.' + TRIP }, function(){ load(); })
    .subscribe();

  load();
