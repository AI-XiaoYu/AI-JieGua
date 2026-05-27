import { state, navigateTo } from './router.js';
import { MODE, loadSettings, sendAIRequest, abortAIRequest } from './api.js';

// ==================== UTILS ====================

function escapeHtml(str) {
  var div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

// ==================== MOCK DATA ====================

var _dashboardData = null;

export function buildResult() {
  var P = window.Paipan;
  var question = state.params.question || '未设事由';
  var methodLabel = state.method === 'time' ? '时间起卦' :
                    state.method === 'number' ? '报数起卦' : '随机起卦';

  var year, month, day, hour;
  var upperNum, lowerNum, changingLine;

  if (state.method === 'time') {
    var t = state.params.time;
    if (t) {
      var parts = t.split('T');
      var dParts = parts[0].split('-');
      year  = parseInt(dParts[0]) || 2026;
      month = parseInt(dParts[1]) || 1;
      day   = parseInt(dParts[2]) || 1;
      hour  = parts[1] ? parseInt(parts[1].split(':')[0]) : 12;
    } else {
      var now = new Date();
      year = now.getFullYear();
      month = now.getMonth() + 1;
      day = now.getDate();
      hour = now.getHours();
    }
    var lunarData = P.getLunarData(year, month, day, hour, 0);
    var yearBranch = P.getBranchNumber(lunarData.yearGZ);
    var hourBranch = P.getBranchNumber(lunarData.timeGZ);
    var result = P.calcMeihua(yearBranch, lunarData.lunarMonth, lunarData.lunarDay, hourBranch);
    upperNum = result.upperNum;
    lowerNum = result.lowerNum;
    changingLine = result.changingLine;
  } else if (state.method === 'number') {
    var nums = state.params.numbers;
    if (nums && nums.length >= 3) {
      upperNum = nums[0] % 8; if (upperNum === 0) upperNum = 8;
      lowerNum = nums[1] % 8; if (lowerNum === 0) lowerNum = 8;
      changingLine = nums[2] % 6; if (changingLine === 0) changingLine = 6;
    } else {
      upperNum = 1; lowerNum = 1; changingLine = 1;
    }
    var now = new Date();
    year = now.getFullYear();
    month = now.getMonth() + 1;
    day = now.getDate();
    hour = now.getHours();
  } else {
    upperNum = Math.floor(Math.random() * 8) + 1;
    lowerNum = Math.floor(Math.random() * 8) + 1;
    changingLine = Math.floor(Math.random() * 6) + 1;
    var now = new Date();
    year = now.getFullYear();
    month = now.getMonth() + 1;
    day = now.getDate();
    hour = now.getHours();
  }

  // Lunar data for display (always computed from the year/month/day/hour we have)
  var lunarData = P.getLunarData(year, month, day, hour, 0);
  var solarDate = year + '-' + String(month).padStart(2,'0') + '-' + String(day).padStart(2,'0') + ' ' + String(hour).padStart(2,'0') + ':00';
  var lunarMonthAbs = Math.abs(lunarData.lunarMonth);
  var lunarDate = lunarData.yearGZ + '年 '
    + (lunarData.lunarMonth < 0 ? '闰' : '')
    + P.LUNAR_MONTH_NAMES[lunarMonthAbs] + ' '
    + P.LUNAR_DAY_NAMES[lunarData.lunarDay] + ' '
    + lunarData.timeGZ + '时';

  // Build all hexagrams
  var originalLines = P.buildHexagram(upperNum, lowerNum);
  var originalInfo  = P.getHexagramInfo(originalLines);
  var mutualLines   = P.buildMutualHexagram(originalLines);
  var mutualInfo    = P.getHexagramInfo(mutualLines);
  var changedLines  = P.buildChangedHexagram(originalLines, changingLine);
  var changedInfo   = P.getHexagramInfo(changedLines);
  var zongLines     = originalLines.slice().reverse();
  var zongInfo      = P.getHexagramInfo(zongLines);
  var cuoLines      = originalLines.map(function (l) { return l === 1 ? 0 : 1; });
  var cuoInfo       = P.getHexagramInfo(cuoLines);

  // Trigram elements & palace
  var origUpperNum = P.yaoToTrigramNum(originalLines.slice(3, 6));
  var origLowerNum = P.yaoToTrigramNum(originalLines.slice(0, 3));
  var upperElement = P.TRIGRAM_ELEMENT[origUpperNum];
  var lowerElement = P.TRIGRAM_ELEMENT[origLowerNum];

  // Body trigram (体卦) = the one WITHOUT the changing line
  var bodyIsUpper = changingLine > 3; // changing line in upper trigram → lower is 体
  var tiElement   = bodyIsUpper ? lowerElement : upperElement;
  var yongElement = bodyIsUpper ? upperElement : lowerElement;
  var shengKe     = P.getShengKe(tiElement, yongElement);

  var data = {
    question: question,
    engine: '梅花易数',
    method: methodLabel,
    solarDate: solarDate,
    lunarDate: lunarDate,
    pillars: {
      year:  lunarData.yearGZ,
      month: lunarData.monthGZ,
      day:   lunarData.dayGZ,
      hour:  lunarData.timeGZ,
    },
    empty: P.getEmptyBranch(lunarData.dayGZ),
    originalLines: originalLines,
    changingLine: changingLine,
    hexagrams: [
      { tag: '本卦', name: originalInfo.name, idx: originalInfo.idx, lines: originalLines, changingLine: changingLine, palace: P.TRIGRAM_NATURE[origUpperNum] + '宫', desc: originalInfo.desc },
      { tag: '互卦', name: mutualInfo.name,    idx: mutualInfo.idx,    lines: mutualLines,   changingLine: -1, palace: P.TRIGRAM_NATURE[P.yaoToTrigramNum(mutualLines.slice(3, 6))] + '宫', desc: mutualInfo.desc },
      { tag: '变卦', name: changedInfo.name,    idx: changedInfo.idx,   lines: changedLines,  changingLine: -1, palace: P.TRIGRAM_NATURE[P.yaoToTrigramNum(changedLines.slice(3, 6))] + '宫', desc: changedInfo.desc },
      { tag: '综卦', name: zongInfo.name,       idx: zongInfo.idx,      lines: zongLines,     changingLine: -1, palace: '', desc: zongInfo.desc },
      { tag: '错卦', name: cuoInfo.name,        idx: cuoInfo.idx,       lines: cuoLines,      changingLine: -1, palace: '', desc: cuoInfo.desc },
    ],
    tiYong: { ti: tiElement, yong: yongElement, relation: shengKe },
  };

  _dashboardData = data;
  return data;
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
  var data = buildResult();

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
  var item = document.createElement('div');
  item.className = 'judge-item';
  item.innerHTML =
    '<span class="judge-tag">断语</span>' +
    '<span class="judge-text">' +
    '【聚合断语】凡事以静制动，需待时机，不可冒进（水天需）。在此过程中，虽偶有睽乖之疏离（火泽睽），但若能坚持正道、以柔克刚，终能如井一般，寻得源头活水，滋养而不穷（水风井）。此卦虽含讼争之险，然若守中则吉（天水讼）。暗中潜藏着光明上进、昼日三接之福泽（火地晋）。小吉。' +
    '</span>';
  list.appendChild(item);
}

function wireDashboardButtons(data) {
  // Toggle: show palace
  var togPalace = document.getElementById('togglePalace');
  togPalace.onchange = function () { renderHexRow(_dashboardData); };

  // Toggle: show cuo/zong
  var togCuoZong = document.getElementById('toggleCuoZong');
  togCuoZong.onchange = function () { renderHexRow(_dashboardData); };

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

  // AI button — toggle between start / abort
  var btnAI = document.getElementById('btnAI');
  var _streaming = false;

  function resetAIButton() {
    _streaming = false;
    btnAI.textContent = '⚡ 启动 AI 断卦';
    btnAI.disabled = false;
  }

  function startAIStream() {
    var term = document.getElementById('terminalOutput');
    term.innerHTML = '<span class="text-cyan-400/70">$</span> <span class="text-gray-500">AI 引擎连接中...</span>';
    _streaming = true;
    btnAI.textContent = '■ 中止推演';
    btnAI.disabled = false;

    var settings = loadSettings();
    var hexInfo = data.hexagrams.map(function (h) {
      var yaos = [];
      for (var i = 5; i >= 0; i--) {
        var yaoName = ['初', '二', '三', '四', '五', '上'][i];
        var isYang = h.lines[i] === 1;
        var isChanging = (i + 1) === h.changingLine;
        yaos.push(yaoName + '爻' + (isYang ? '阳' : '阴') + (isChanging ? '（动爻）' : ''));
      }
      return h.tag + '：' + h.name + ' (#' + h.idx + ')\n  ' + yaos.join(' / ');
    }).join('\n');

    var userPrompt = '占问事由：' + data.question + '\n\n卦象数据：\n' + hexInfo;

    var contentEl = null;
    var firstToken = true;

    sendAIRequest(settings.mode, {
      url: settings.url,
      apiKey: settings.apiKey,
      model: settings.model
    }, [
      { role: 'user', content: userPrompt }
    ], function (delta, fullContent) {
      // onToken — stream each delta into the terminal
      if (firstToken) {
        term.innerHTML = '';
        contentEl = document.createElement('span');
        contentEl.className = 'text-green-400';
        term.appendChild(contentEl);
        firstToken = false;
      }
      if (contentEl) {
        contentEl.textContent = fullContent;
      }
      term.scrollTop = term.scrollHeight;
    }).then(function (result) {
      if (result.aborted) {
        if (contentEl) {
          contentEl.textContent += '\n\n$ [System] 链路传输已手动中止...';
        } else {
          term.innerHTML = '<span class="text-gray-500">$ [System] 链路传输已手动中止...</span>';
        }
        resetAIButton();
        return;
      }
      if (!contentEl) {
        term.innerHTML = '<span class="text-green-400/50">$</span> <span class="text-green-400">' + escapeHtml(result.content).replace(/\n/g, '<br>') + '</span>';
      }
      resetAIButton();
    }).catch(function (err) {
      term.innerHTML = '<span class="text-red-400/70">$</span> <span class="text-red-400/60">[Error] ' + escapeHtml(err.message || '未知错误') + '</span>';
      btnAI.textContent = '⚡ 重试 AI 断卦';
      btnAI.disabled = false;
      _streaming = false;
    });
  }

  btnAI.onclick = function () {
    if (_streaming) {
      abortAIRequest();
      btnAI.textContent = '⏳ 中止中...';
      btnAI.disabled = true;
    } else {
      startAIStream();
    }
  };

  // New reading button
  var btnNew = document.getElementById('btnNewReading');
  if (btnNew) {
    btnNew.onclick = function () {
      abortAIRequest();
      state.engine = null;
      state.method = null;
      state.params = { question: '', time: '', numbers: [] };
      navigateTo('engine');
    };
  }
}
