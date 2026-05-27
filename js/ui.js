import { state, navigateTo } from './router.js';

// ==================== MOCK DATA ====================

export function buildMockResult() {
  return {
    question: state.params.question || '未设事由',
    engine: '梅花易数',
    method: state.method === 'time' ? '时间起卦' :
            state.method === 'number' ? '报数起卦' : '随机起卦',
    solarDate: '2026-05-27 14:30',
    lunarDate: '丙午年 四月十一 未时',
    pillars: {
      year:  '丙午',
      month: '癸巳',
      day:   '戊戌',
      hour:  '己未',
    },
    empty: '辰巳',
    originalLines: [1, 1, 1, 0, 1, 0],  // 水天需
    changingLine: 1,
    hexagrams: [
      { tag: '本卦', name: '水天需',  idx: 5,  lines: [1,1,1,0,1,0], changingLine: 1, palace: '坤宫', desc: '有孚光亨，贞吉。利涉大川。需待时机，饮食宴乐。' },
      { tag: '互卦', name: '火泽睽',  idx: 38, lines: [1,1,0,1,0,1], changingLine: -1, palace: '艮宫', desc: '睽，小事吉。乖离之中，求同存异，以柔克刚。' },
      { tag: '变卦', name: '水风井',  idx: 48, lines: [0,1,1,0,1,0], changingLine: -1, palace: '震宫', desc: '改邑不改井，无丧无得。往来井井，养而不穷。' },
      { tag: '综卦', name: '天水讼',  idx: 6,  lines: [0,1,0,1,1,1], changingLine: -1, palace: '离宫', desc: '有孚窒惕，中吉终凶。争讼不宁，见大人则利。' },
      { tag: '错卦', name: '火地晋',  idx: 35, lines: [0,0,0,1,0,1], changingLine: -1, palace: '乾宫', desc: '康侯用锡马蕃庶，昼日三接。光明上进，柔进上行。' },
    ]
  };
}

// ==================== TOAST ====================

let $toast = null;

export function showToast(msg, type, ms) {
  if (!ms) ms = 2200;
  if (!$toast) $toast = document.getElementById('toast');
  $toast.textContent = msg;
  $toast.className = 'toast show' + (type === 'success' ? ' success' : '');
  clearTimeout($toast._t);
  $toast._t = setTimeout(function () { $toast.className = 'toast'; }, ms);
}

// ==================== WHEEL PICKER ====================

let _wheelReady = false;

export function initWheelPicker() {
  if (_wheelReady) return;
  var yearScroll = document.getElementById('wheelYear');
  var monthScroll = document.getElementById('wheelMonth');
  var dayScroll = document.getElementById('wheelDay');
  var hourScroll = document.getElementById('wheelHour');
  if (!yearScroll || !monthScroll || !dayScroll || !hourScroll) return;
  _wheelReady = true;

  // Populate years (1940-2060)
  for (var y = 1940; y <= 2060; y++) {
    var item = document.createElement('div');
    item.className = 'wheel-item';
    item.textContent = y;
    item.setAttribute('data-value', y);
    yearScroll.appendChild(item);
  }
  // Months 1-12
  for (var m = 1; m <= 12; m++) {
    var item = document.createElement('div');
    item.className = 'wheel-item';
    item.textContent = m;
    item.setAttribute('data-value', m);
    monthScroll.appendChild(item);
  }
  // Days 1-31
  for (var d = 1; d <= 31; d++) {
    var item = document.createElement('div');
    item.className = 'wheel-item';
    item.textContent = d;
    item.setAttribute('data-value', d);
    dayScroll.appendChild(item);
  }
  // Hours 0-23
  for (var h = 0; h <= 23; h++) {
    var item = document.createElement('div');
    item.className = 'wheel-item';
    item.textContent = h;
    item.setAttribute('data-value', h);
    hourScroll.appendChild(item);
  }

  [yearScroll, monthScroll, dayScroll, hourScroll].forEach(function (el) {
    el.addEventListener('scroll', function () { updateWheelSelection(el); });
  });

  // Input -> wheel sync
  var fields = [
    { scroll: yearScroll,  input: document.getElementById('wheelInputYear'),  base: 1940 },
    { scroll: monthScroll, input: document.getElementById('wheelInputMonth'), base: 1 },
    { scroll: dayScroll,   input: document.getElementById('wheelInputDay'),   base: 1 },
    { scroll: hourScroll,  input: document.getElementById('wheelInputHour'),  base: 0 },
  ];
  fields.forEach(function (f) {
    if (!f.input) return;
    f.input.addEventListener('change', function () {
      var v = parseInt(this.value);
      if (isNaN(v)) return;
      v = Math.max(parseInt(this.min), Math.min(parseInt(this.max), v));
      this.value = v;
      scrollWheelTo(f.scroll, v, f.base);
    });
  });

  resetWheelToNow();
}

function scrollWheelTo(scrollEl, value, baseOffset) {
  var index = value - baseOffset;
  scrollEl.scrollTop = index * 40;
  updateWheelSelection(scrollEl);
}

function updateWheelSelection(scrollEl) {
  var idx = Math.round(scrollEl.scrollTop / 40);
  var items = scrollEl.querySelectorAll('.wheel-item');
  for (var i = 0; i < items.length; i++) {
    items[i].classList.toggle('selected', i === idx);
  }
  // Two-way sync: update the input below the wheel
  var sel = items[idx];
  if (sel) {
    var inputId = 'wheelInput' + scrollEl.id.replace('wheel', '');
    var input = document.getElementById(inputId);
    if (input && document.activeElement !== input) {
      input.value = sel.getAttribute('data-value');
    }
  }
}

export function resetWheelToNow() {
  if (!_wheelReady) return;
  var now = new Date();
  scrollWheelTo(document.getElementById('wheelYear'), now.getFullYear(), 1940);
  scrollWheelTo(document.getElementById('wheelMonth'), now.getMonth() + 1, 1);
  scrollWheelTo(document.getElementById('wheelDay'), now.getDate(), 1);
  scrollWheelTo(document.getElementById('wheelHour'), now.getHours(), 0);
}

export function getWheelValues() {
  function val(id) {
    var sel = document.getElementById(id).querySelector('.wheel-item.selected');
    return sel ? parseInt(sel.getAttribute('data-value')) : 0;
  }
  return {
    year: val('wheelYear'),
    month: val('wheelMonth'),
    day: val('wheelDay'),
    hour: val('wheelHour')
  };
}

// ==================== NUMBER MODE TOGGLE ====================

let _numMode = 'two';

export function setupNumberModeToggle() {
  var buttons = document.querySelectorAll('#numberModeToggle .number-mode-btn');
  for (var i = 0; i < buttons.length; i++) {
    buttons[i].addEventListener('click', function () {
      _numMode = this.getAttribute('data-num-mode');
      var btns = document.querySelectorAll('#numberModeToggle .number-mode-btn');
      for (var j = 0; j < btns.length; j++) {
        btns[j].classList.toggle('active', btns[j].getAttribute('data-num-mode') === _numMode);
      }
      document.getElementById('groupNum3').style.display = _numMode === 'three' ? '' : 'none';
    });
  }
  // Default: two-number mode hides third input
  document.getElementById('groupNum3').style.display = 'none';
}

export function getNumMode() { return _numMode; }

export function resetNumberMode() {
  _numMode = 'two';
  var btns = document.querySelectorAll('#numberModeToggle .number-mode-btn');
  for (var j = 0; j < btns.length; j++) {
    btns[j].classList.toggle('active', btns[j].getAttribute('data-num-mode') === 'two');
  }
  document.getElementById('groupNum3').style.display = 'none';
  document.getElementById('paramNum1').value = '';
  document.getElementById('paramNum2').value = '';
  document.getElementById('paramNum3').value = '';
}

// ==================== PAGE 4: DASHBOARD RENDERING ====================

export function buildDashboard() {
  var data = buildMockResult();

  // --- Section A: Metadata ---
  document.getElementById('metaQuestion').textContent = '? ' + data.question;
  var badge = document.getElementById('metaBadge');
  badge.textContent = data.engine + ' · ' + data.method;
  badge.className = 'text-[10px] px-2 py-0.5 rounded border border-[#1a3a1a] text-green-400/70';

  document.getElementById('metaSolar').textContent = data.solarDate;
  document.getElementById('metaLunar').textContent = data.lunarDate;
  document.getElementById('metaPillars').textContent =
    data.pillars.year + ' ' + data.pillars.month + ' ' + data.pillars.day + ' ' + data.pillars.hour;
  document.getElementById('metaEmpty').textContent = data.empty;

  // --- Section B: Hexagram Graphics ---
  renderHexRow(data);

  // --- Section C: Judgments ---
  renderJudgments(data);

  // --- Section D: Terminal ---
  document.getElementById('terminalOutput').innerHTML =
    '<span class="text-green-400/50">$</span> 准备就绪。点击"启动 AI 断卦"开始推演...';

  // Reset copy button
  var btnCopy = document.getElementById('btnCopy');
  btnCopy.textContent = '📋 复制卦象';
  btnCopy.classList.remove('copied');

  // Wire up dashboard buttons
  wireDashboardButtons(data);
}

function renderHexRow(data) {
  var row = document.getElementById('hexRow');
  row.innerHTML = '';

  var showCuoZong = document.getElementById('toggleCuoZong').checked;
  var showPalace = document.getElementById('togglePalace').checked;

  var hexesToShow = showCuoZong ? data.hexagrams : data.hexagrams.slice(0, 3);

  hexesToShow.forEach(function (h) {
    var card = document.createElement('div');
    card.className = 'hex-mini-card' + (h.changingLine > 0 ? ' yao-changing-highlight' : '');

    var nameDiv = document.createElement('div');
    nameDiv.className = 'text-xs font-bold tracking-wider glow-text mb-1';
    nameDiv.textContent = h.name;
    card.appendChild(nameDiv);

    var tagDiv = document.createElement('div');
    tagDiv.className = 'text-[9px] text-gray-600 mb-2';
    tagDiv.textContent = h.tag + ' #' + h.idx;
    card.appendChild(tagDiv);

    if (showPalace) {
      var palDiv = document.createElement('div');
      palDiv.className = 'text-[9px] text-cyan-400/50 mb-1.5';
      palDiv.textContent = h.palace;
      card.appendChild(palDiv);
    }

    // Yao lines (compact, top to bottom)
    var yaoContainer = document.createElement('div');
    yaoContainer.className = 'flex flex-col items-center';
    for (var i = 5; i >= 0; i--) {
      var isChanging = (i + 1) === h.changingLine;
      yaoContainer.appendChild(renderCompactYao(h.lines[i] === 1, isChanging));
    }
    card.appendChild(yaoContainer);

    row.appendChild(card);
  });
}

function renderCompactYao(yang, isChanging) {
  var line = document.createElement('div');
  line.className = 'yao-compact-line' + (isChanging ? ' yao-compact-changing' : '');

  if (yang) {
    var bar = document.createElement('div');
    bar.className = 'yao-compact-yang';
    bar.style.flexShrink = '0';
    line.appendChild(bar);
  } else {
    var wrap = document.createElement('div');
    wrap.className = 'yao-compact-yin';
    var h1 = document.createElement('div');
    h1.className = 'yao-compact-yin-half';
    h1.style.flexShrink = '0';
    var h2 = document.createElement('div');
    h2.className = 'yao-compact-yin-half';
    h2.style.flexShrink = '0';
    wrap.appendChild(h1);
    wrap.appendChild(h2);
    line.appendChild(wrap);
  }
  return line;
}

function renderJudgments(data) {
  var list = document.getElementById('judgmentsList');
  list.innerHTML = '';
  data.hexagrams.forEach(function (h) {
    var item = document.createElement('div');
    item.className = 'judge-item';
    item.innerHTML =
      '<span class="judge-tag">' + h.tag + '</span>' +
      '<span class="judge-text">' +
      '<b class="text-green-400/80">' + h.name + '</b> — ' + h.desc +
      '</span>';
    list.appendChild(item);
  });
}

function wireDashboardButtons(data) {
  // Toggle: show palace
  var togPalace = document.getElementById('togglePalace');
  togPalace.onchange = function () { renderHexRow(buildMockResult()); };

  // Toggle: show cuo/zong
  var togCuoZong = document.getElementById('toggleCuoZong');
  togCuoZong.onchange = function () { renderHexRow(buildMockResult()); };

  // Copy button
  var btnCopy = document.getElementById('btnCopy');
  btnCopy.onclick = function () {
    var text = data.hexagrams.map(function (h) {
      return h.tag + ': ' + h.name + ' (#' + h.idx + ') — ' + h.desc;
    }).join('\n');

    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(function () {
        btnCopy.textContent = '已复制 ✓';
        btnCopy.classList.add('copied');
        setTimeout(function () {
          btnCopy.textContent = '📋 复制卦象';
          btnCopy.classList.remove('copied');
        }, 2000);
      }).catch(function () {
        showToast('复制失败，请手动复制');
      });
    } else {
      showToast('复制失败，请手动复制');
    }
  };

  // AI button
  var btnAI = document.getElementById('btnAI');
  btnAI.onclick = function () {
    var term = document.getElementById('terminalOutput');
    term.innerHTML = '<span class="text-cyan-400/70">$</span> <span class="text-gray-500">AI 引擎连接中...</span>';
    btnAI.textContent = '⏳ 处理中...';
    btnAI.disabled = true;

    setTimeout(function () {
      term.innerHTML =
        '<span class="text-green-400/50">$</span> <span class="text-gray-600">[Mock] AI 断卦引擎尚未接入。</span>\n' +
        '<span class="text-green-400/50">$</span> <span class="text-gray-600">[Mock] 占问：' + data.question + '</span>\n' +
        '<span class="text-green-400/50">$</span> <span class="text-gray-600">[Mock] 本卦' + data.hexagrams[0].name +
        '，' + data.hexagrams[0].desc + '</span>\n' +
        '<span class="text-green-400/50">$</span> <span class="text-gray-600">[Mock] 此处将接入 LLM 流式输出...</span>';
      btnAI.textContent = '⚡ 启动 AI 断卦';
      btnAI.disabled = false;
    }, 1200);
  };

  // New reading button
  var btnNew = document.getElementById('btnNewReading');
  if (btnNew) {
    btnNew.onclick = function () {
      state.engine = null;
      state.method = null;
      state.params = { question: '', time: '', numbers: [] };
      navigateTo('engine');
    };
  }
}
