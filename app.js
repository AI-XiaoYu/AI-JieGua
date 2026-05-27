(function (P) {
  // ==================== DOM REFS ====================

  var $date = document.getElementById('dateInput');
  var $time = document.getElementById('timeInput');
  var $btn = document.getElementById('calcBtn');
  var $results = document.getElementById('results');
  var $empty = document.getElementById('emptyState');
  var $pillars = document.getElementById('pillars');
  var $hexagrams = document.getElementById('hexagrams');
  var $changingInfo = document.getElementById('changingInfo');
  var $toast = document.getElementById('toast');
  var $historySection = document.getElementById('historySection');
  var $historyList = document.getElementById('historyList');
  var $clearHistory = document.getElementById('clearHistory');

  // ==================== HELPERS ====================

  function setNow() {
    var now = new Date();
    $date.value = now.toISOString().slice(0, 10);
    $time.value = now.toISOString().slice(11, 16);
  }

  function showToast(msg, ms) {
    if (!ms) ms = 2500;
    $toast.textContent = msg;
    $toast.classList.add('show');
    clearTimeout($toast._t);
    $toast._t = setTimeout(function () { $toast.classList.remove('show'); }, ms);
  }

  // ==================== RENDER ====================

  function renderYaoLine(yang, isChanging, lineNum) {
    var div = document.createElement('div');
    div.className = 'yao-line' + (isChanging ? ' yao-changing' : '');

    var marker = document.createElement('span');
    marker.className = 'yao-marker';
    marker.textContent = lineNum === 1 ? '初' : lineNum === 6 ? '上' : ['', '', '二', '三', '四', '五', ''][lineNum];
    div.appendChild(marker);

    if (yang) {
      var bar = document.createElement('div');
      bar.className = 'yao-yang';
      div.appendChild(bar);
    } else {
      var wrap = document.createElement('div');
      wrap.className = 'yao-yin';
      var h1 = document.createElement('div');
      h1.className = 'yao-yin-half';
      var h2 = document.createElement('div');
      h2.className = 'yao-yin-half';
      wrap.appendChild(h1);
      wrap.appendChild(h2);
      div.appendChild(wrap);
    }

    return div;
  }

  function renderHexagramSymbol(lines, changingLine) {
    var container = document.createElement('div');
    container.className = 'flex flex-col-reverse items-center py-2';
    for (var i = 0; i < 6; i++) {
      var isChanging = (i + 1) === changingLine;
      container.appendChild(renderYaoLine(lines[i] === 1, isChanging, i + 1));
    }
    return container;
  }

  function renderPillar(label, ganzhi) {
    var div = document.createElement('div');
    div.className = 'bg-[#0d0d0d] border border-[#1a2a1a] rounded-lg p-2.5 text-center';
    div.innerHTML =
      '<div class="text-[10px] text-gray-600 mb-1 tracking-wider">' + label + '</div>' +
      '<div class="text-lg font-bold tracking-widest glow-text">' + ganzhi + '</div>';
    return div;
  }

  function renderHexCard(title, lines, changingLine, extraClass) {
    var info = P.getHexagramInfo(lines);
    var card = document.createElement('div');
    card.className = 'hex-card ' + (extraClass || '');

    var header = document.createElement('div');
    header.className = 'text-center mb-3';
    var label = document.createElement('div');
    label.className = 'text-[10px] text-gray-600 tracking-widest mb-1';
    label.innerHTML = title;
    var name = document.createElement('div');
    name.className = 'text-base font-bold tracking-wider glow-text';
    name.textContent = info.name;
    var idx = document.createElement('div');
    idx.className = 'text-xs text-gray-600';
    idx.textContent = '第' + info.idx + '卦';
    header.appendChild(label);
    header.appendChild(name);
    header.appendChild(idx);
    card.appendChild(header);

    card.appendChild(renderHexagramSymbol(lines, changingLine));

    if (info.desc) {
      var desc = document.createElement('p');
      desc.className = 'text-xs text-gray-500 text-center mt-2 leading-relaxed px-1';
      desc.textContent = info.desc;
      card.appendChild(desc);
    }

    return card;
  }

  function renderResults(originalLines, mutualLines, changedLines, changingLine, lunarData) {
    $pillars.innerHTML = '';
    $pillars.appendChild(renderPillar('年柱', lunarData.yearGZ));
    $pillars.appendChild(renderPillar('月柱', lunarData.monthGZ));
    $pillars.appendChild(renderPillar('日柱', lunarData.dayGZ));
    $pillars.appendChild(renderPillar('时柱', lunarData.timeGZ));

    $hexagrams.innerHTML = '';
    $hexagrams.appendChild(renderHexCard('&#9775; 本 卦', originalLines, changingLine, ''));
    $hexagrams.appendChild(renderHexCard('&#9775; 互 卦', mutualLines, -1, ''));
    $hexagrams.appendChild(renderHexCard('&#9775; 变 卦', changedLines, -1, ''));

    var origInfo = P.getHexagramInfo(originalLines);
    var changedInfo = P.getHexagramInfo(changedLines);
    $changingInfo.classList.remove('hidden');
    $changingInfo.innerHTML =
      '<div class="text-xs text-gray-500 tracking-widest mb-2">动 爻 信 息</div>' +
      '<div class="text-sm text-cyan-400 glow-cyan leading-relaxed">' +
      '第 <span class="font-bold">' + changingLine + '</span> 爻动' +
      ' &nbsp;·&nbsp; ' + origInfo.name + ' &rarr; ' + changedInfo.name +
      '</div>' +
      '<div class="text-xs text-gray-600 mt-1">' +
      P.TRIGRAM_SHORT[P.yaoToTrigramNum(originalLines.slice(0, 3))] + '下' +
      P.TRIGRAM_SHORT[P.yaoToTrigramNum(originalLines.slice(3, 6))] + '上' +
      ' &rarr; ' +
      P.TRIGRAM_SHORT[P.yaoToTrigramNum(changedLines.slice(0, 3))] + '下' +
      P.TRIGRAM_SHORT[P.yaoToTrigramNum(changedLines.slice(3, 6))] + '上' +
      '</div>';

    $empty.classList.add('hidden');
    $results.classList.remove('hidden');
  }

  // ==================== HISTORY ====================

  var HISTORY_KEY = 'paipan_history';
  var MAX_HISTORY = 20;

  function loadHistory() {
    try {
      return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    } catch (e) { return []; }
  }

  function saveHistory(entry) {
    var hist = loadHistory();
    var idx = -1;
    for (var i = 0; i < hist.length; i++) {
      if (hist[i].iso === entry.iso) { idx = i; break; }
    }
    if (idx >= 0) hist.splice(idx, 1);
    hist.unshift(entry);
    if (hist.length > MAX_HISTORY) hist.pop();
    localStorage.setItem(HISTORY_KEY, JSON.stringify(hist));
    renderHistory();
  }

  function renderHistory() {
    var hist = loadHistory();
    if (hist.length === 0) {
      $historySection.classList.add('hidden');
      return;
    }
    $historySection.classList.remove('hidden');
    $historyList.innerHTML = '';
    hist.forEach(function (h) {
      var div = document.createElement('div');
      div.className = 'history-item flex justify-between items-center text-sm';
      div.innerHTML =
        '<span class="text-gray-400">' + h.iso.replace('T', ' ') + '</span>' +
        '<span class="text-green-400 font-bold tracking-wider">' + h.hexName +
        ' <span class="text-[10px] text-gray-600">#' + h.hexIdx + '</span></span>';
      div.addEventListener('click', function () {
        var parts = h.iso.split('T');
        $date.value = parts[0];
        $time.value = parts[1] ? parts[1].slice(0, 5) : '12:00';
        calculate();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
      $historyList.appendChild(div);
    });
  }

  function clearHistory() {
    localStorage.removeItem(HISTORY_KEY);
    renderHistory();
  }

  // ==================== MAIN ====================

  function calculate() {
    var dateVal = $date.value;
    var timeVal = $time.value || '12:00';

    if (!dateVal) {
      showToast('请选择日期');
      return;
    }

    try {
      var dateParts = dateVal.split('-').map(Number);
      var timeParts = timeVal.split(':').map(Number);
      var y = dateParts[0], m = dateParts[1], d = dateParts[2];
      var hh = timeParts[0], mm = timeParts[1];

      if (!y || !m || !d) throw new Error('日期格式错误');

      var lunarData = P.getLunarData(y, m, d, hh || 12, mm || 0);

      var yearBranch = P.getBranchNumber(lunarData.yearGZ);
      var hourBranch = P.getBranchNumber(lunarData.timeGZ);

      var result = P.calcMeihua(yearBranch, lunarData.lunarMonth, lunarData.lunarDay, hourBranch);

      var originalLines = P.buildHexagram(result.upperNum, result.lowerNum);
      var mutualLines = P.buildMutualHexagram(originalLines);
      var changedLines = P.buildChangedHexagram(originalLines, result.changingLine);

      renderResults(originalLines, mutualLines, changedLines, result.changingLine, lunarData);

      var origInfo = P.getHexagramInfo(originalLines);
      saveHistory({
        iso: dateVal + 'T' + (timeVal || '12:00'),
        hexName: origInfo.name,
        hexIdx: origInfo.idx,
      });

    } catch (err) {
      console.error(err);
      showToast('计算出错：' + (err.message || '未知错误'));
    }
  }

  // ==================== EVENTS ====================

  $btn.addEventListener('click', calculate);

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && document.activeElement && document.activeElement.closest('.glow-border')) {
      calculate();
    }
  });

  $clearHistory.addEventListener('click', clearHistory);

  // ==================== SERVICE WORKER ====================

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(function () {});
  }

  // ==================== INIT ====================

  setNow();
  renderHistory();
})(window.Paipan);
