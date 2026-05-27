import {
  buildDashboard, showToast,
  initWheelPicker, resetWheelToNow, getWheelValues,
  setupNumberModeToggle, getNumMode, resetNumberMode
} from './ui.js';

// ==================== STATE MACHINE ====================

export const state = {
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

const $pages = {
  engine:   document.getElementById('page-engine'),
  method:   document.getElementById('page-method'),
  params:   document.getElementById('page-params'),
  dashboard: document.getElementById('page-dashboard'),
};

// ==================== ROUTER ====================

export function navigateTo(pageName) {
  Object.keys($pages).forEach(function (k) {
    $pages[k].classList.remove('active');
  });
  void $pages[pageName].offsetWidth;
  $pages[pageName].classList.add('active');
  state.page = pageName;
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (pageName === 'params') setupParamsPage();
  if (pageName === 'dashboard') buildDashboard();
}

export function goBack(target) {
  navigateTo(target);
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
        state.params.question = '随机起卦';
        state.params.time = '';
        state.params.numbers = [];
        navigateTo('dashboard');
      } else {
        navigateTo('params');
      }
    });
  }

  var backBtns = document.querySelectorAll('#page-method .back-btn');
  for (var j = 0; j < backBtns.length; j++) {
    backBtns[j].addEventListener('click', function () {
      goBack(this.getAttribute('data-back'));
    });
  }
}

// ==================== PAGE 3: PARAMS ====================

function setupParamsPage() {
  var panelTime = document.getElementById('panel-time');
  var panelNumber = document.getElementById('panel-number');

  panelTime.classList.add('hidden');
  panelNumber.classList.add('hidden');

  if (state.method === 'time') {
    panelTime.classList.remove('hidden');
    initWheelPicker();
    resetWheelToNow();
  } else if (state.method === 'number') {
    panelNumber.classList.remove('hidden');
    resetNumberMode();
  }

  var backBtns = document.querySelectorAll('#page-params .back-btn');
  for (var j = 0; j < backBtns.length; j++) {
    backBtns[j].onclick = function () {
      goBack(this.getAttribute('data-back'));
    };
  }
}

// ==================== PAGE 3 EVENTS ====================

function setupParamsEvents() {
  setupNumberModeToggle();

  var btnNow = document.getElementById('btnNow');
  if (btnNow) {
    btnNow.onclick = function () { resetWheelToNow(); };
  }

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
        var v = getWheelValues();
        state.params.time = v.year + '-' + String(v.month).padStart(2,'0') + '-' + String(v.day).padStart(2,'0') + 'T' + String(v.hour).padStart(2,'0') + ':00';
      } else if (state.method === 'number') {
        var n1 = parseInt(document.getElementById('paramNum1').value) || 0;
        var n2 = parseInt(document.getElementById('paramNum2').value) || 0;
        if (!n1 || !n2) {
          showToast('请输入两个有效数字');
          return;
        }
        var n3;
        if (getNumMode() === 'two') {
          n3 = (n1 + n2) % 6;
          if (n3 === 0) n3 = 6;
        } else {
          n3 = parseInt(document.getElementById('paramNum3').value) || 0;
          if (!n3) {
            showToast('请输入动爻数');
            return;
          }
        }
        state.params.numbers = [n1, n2, n3];
      }

      navigateTo('dashboard');
    };
  }
}

// ==================== INIT ====================

export function initRouter() {
  setupEnginePage();
  setupMethodPage();
  setupParamsEvents();
  navigateTo('engine');
}
