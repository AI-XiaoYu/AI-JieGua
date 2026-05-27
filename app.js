(function (P) {
  // ==================== STATE MACHINE ====================

  var state = {
    page: 'engine',     // 'engine' | 'method' | 'params' | 'dashboard'
    engine: null,       // 'meihua'
    method: null,       // 'time' | 'number' | 'random'
    params: {
      question: '',
      time: '',
      numbers: []
    }
  };

  // ==================== DOM REFS ====================

  var $pages = {
    engine:   document.getElementById('page-engine'),
    method:   document.getElementById('page-method'),
    params:   document.getElementById('page-params'),
    dashboard: document.getElementById('page-dashboard'),
  };

  var $toast = document.getElementById('toast');

  // ==================== MOCK DATA ====================

  function buildMockResult() {
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

  // ==================== ROUTER ====================

  function navigateTo(pageName) {
    // Hide all pages
    Object.keys($pages).forEach(function (k) {
      $pages[k].classList.remove('active');
    });

    // Force reflow to restart animation
    void $pages[pageName].offsetWidth;

    // Show target page
    $pages[pageName].classList.add('active');
    state.page = pageName;

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Page-specific setup
    if (pageName === 'params') setupParamsPage();
    if (pageName === 'dashboard') buildDashboard();
  }

  function goBack(target) {
    navigateTo(target);
  }

  // ==================== TOAST ====================

  function showToast(msg, type, ms) {
    if (!ms) ms = 2200;
    $toast.textContent = msg;
    $toast.className = 'toast show' + (type === 'success' ? ' success' : '');
    clearTimeout($toast._t);
    $toast._t = setTimeout(function () { $toast.className = 'toast'; }, ms);
  }

  // ==================== PAGE 1: ENGINE ====================

  function setupEnginePage() {
    var cards = document.querySelectorAll('#page-engine .engine-card.active');
    for (var i = 0; i < cards.length; i++) {
      cards[i].addEventListener('click', function () {
        var engine = this.getAttribute('data-engine');
        if (engine === 'meihua') {
          state.engine = 'meihua';
          navigateTo('method');
        }
      });
    }
  }

  // ==================== PAGE 2: METHOD ====================

  function setupMethodPage() {
    var cards = document.querySelectorAll('#page-method .method-card');
    for (var i = 0; i < cards.length; i++) {
      cards[i].addEventListener('click', function () {
        var method = this.getAttribute('data-method');
        state.method = method;

        if (method === 'random') {
          // Random: generate mock data directly, skip params
          state.params.question = '随机起卦';
          state.params.time = '';
          state.params.numbers = [];
          navigateTo('dashboard');
        } else {
          navigateTo('params');
        }
      });
    }

    // Back buttons
    var backBtns = document.querySelectorAll('#page-method .back-btn');
    for (var j = 0; j < backBtns.length; j++) {
      backBtns[j].addEventListener('click', function () {
        goBack(this.getAttribute('data-back'));
      });
    }
  }

  // ==================== PAGE 3: PARAMS ====================

  function setupParamsPage() {
    // Show/hide panels based on method
    var panelTime = document.getElementById('panel-time');
    var panelNumber = document.getElementById('panel-number');

    panelTime.classList.add('hidden');
    panelNumber.classList.add('hidden');

    if (state.method === 'time') {
      panelTime.classList.remove('hidden');
    } else if (state.method === 'number') {
      panelNumber.classList.remove('hidden');
    }

    // Back buttons
    var backBtns = document.querySelectorAll('#page-params .back-btn');
    for (var j = 0; j < backBtns.length; j++) {
      backBtns[j].onclick = function () {
        goBack(this.getAttribute('data-back'));
      };
    }
  }

  function setupParamsEvents() {
    // "此刻" button - fill current time
    var btnNow = document.getElementById('btnNow');
    if (btnNow) {
      btnNow.onclick = function () {
        var now = new Date();
        var iso = now.getFullYear() + '-' +
          String(now.getMonth() + 1).padStart(2, '0') + '-' +
          String(now.getDate()).padStart(2, '0') + 'T' +
          String(now.getHours()).padStart(2, '0') + ':' +
          String(now.getMinutes()).padStart(2, '0');
        document.getElementById('paramTime').value = iso;
      };
    }

    // Submit button
    var btnSubmit = document.getElementById('btnSubmit');
    if (btnSubmit) {
      btnSubmit.onclick = function () {
        var question = document.getElementById('paramQuestion').value.trim();
        if (!question) {
          showToast('请输入占问事由');
          return;
        }
        state.params.question = question;

        if (state.method === 'time') {
          state.params.time = document.getElementById('paramTime').value;
        } else if (state.method === 'number') {
          var n1 = parseInt(document.getElementById('paramNum1').value) || 0;
          var n2 = parseInt(document.getElementById('paramNum2').value) || 0;
          var n3 = parseInt(document.getElementById('paramNum3').value) || 0;
          if (!n1 || !n2 || !n3) {
            showToast('请输入三个有效数字');
            return;
          }
          state.params.numbers = [n1, n2, n3];
        }

        navigateTo('dashboard');
      };
    }
  }

  // ==================== PAGE 4: DASHBOARD RENDERING ====================

  function buildDashboard() {
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

      // Hexagram name
      var nameDiv = document.createElement('div');
      nameDiv.className = 'text-xs font-bold tracking-wider glow-text mb-1';
      nameDiv.textContent = h.name;
      card.appendChild(nameDiv);

      // Tag
      var tagDiv = document.createElement('div');
      tagDiv.className = 'text-[9px] text-gray-600 mb-2';
      tagDiv.textContent = h.tag + ' #' + h.idx;
      card.appendChild(tagDiv);

      // Palace (if toggled)
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

  // ==================== GLOBAL NAVIGATION ====================

  function setupGlobalNav() {
    // Back buttons are set up per-page
    // All pages have back-btn with data-back attribute

    // Engine page back buttons (none in current design, but handle if present)
    var allBackBtns = document.querySelectorAll('.back-btn');
    // These are set up individually in page setup functions
  }

  // ==================== INIT ====================

  function init() {
    // Page 1: Engine cards
    setupEnginePage();

    // Page 2: Method cards
    setupMethodPage();

    // Page 3: Params event wiring (panel show/hide is dynamic)
    setupParamsEvents();

    // Start on engine page
    navigateTo('engine');

    // Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    }
  }

  // Wait for DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})(window.Paipan);
