import { MODE, loadSettings, saveSettings, testConnectivity } from './api.js';

// ==================== STATE ====================

var _settings = loadSettings();
var _testing = false;

// ==================== DOM REFS (lazy) ====================

var $drawer = null;
var $overlay = null;
var $panel = null;

// ==================== TERMINAL OUTPUT ====================

function termPrint(msg, cls) {
  var term = document.getElementById('terminalOutput');
  if (!term) return;
  var line = document.createElement('div');
  line.className = cls || 'text-gray-500';
  line.textContent = msg;
  term.appendChild(line);
  term.scrollTop = term.scrollHeight;
}

// ==================== DRAWER RENDER ====================

function renderDrawer() {
  if ($panel) {
    // Already rendered — refresh dynamic parts
    refreshModeUI();
    return;
  }

  // Create drawer DOM
  $overlay = document.createElement('div');
  $overlay.className = 'settings-overlay';
  // Only close when clicking the backdrop, not the panel
  $overlay.addEventListener('click', function (e) {
    if (e.target === $overlay) closeDrawer();
  });

  $panel = document.createElement('div');
  $panel.className = 'settings-panel';
  // Stop panel clicks from bubbling to overlay
  $panel.addEventListener('click', function (e) {
    e.stopPropagation();
  });

  $panel.innerHTML =
    '<div class="settings-header">' +
      '<span class="settings-title">&#9881; 系统设置</span>' +
      '<button class="settings-close" id="btnSettingsClose">&times;</button>' +
    '</div>' +

    // Mode switcher
    '<div class="settings-section">' +
      '<div class="settings-label">算力模式</div>' +
      '<div class="mode-switch" id="modeSwitch">' +
        '<button class="mode-switch-btn" data-mode="' + MODE.PUBLIC + '">游鳞公共算力</button>' +
        '<button class="mode-switch-btn" data-mode="' + MODE.PRIVATE + '">私有节点直连</button>' +
      '</div>' +
    '</div>' +

    // Private config (hidden when public)
    '<div class="settings-section" id="privateConfig">' +
      '<label class="settings-label">API URL</label>' +
      '<input type="url" class="settings-input" id="cfgUrl" placeholder="https://your-node.example.com/v1">' +
      '<label class="settings-label">API Key</label>' +
      '<input type="password" class="settings-input" id="cfgKey" placeholder="sk-...">' +
      '<label class="settings-label">Model Name</label>' +
      '<input type="text" class="settings-input" id="cfgModel" placeholder="deepseek-v4-pro">' +
    '</div>' +

    // Test + status
    '<div class="settings-section">' +
      '<div class="settings-test-row">' +
        '<button class="settings-btn settings-btn-test" id="btnTest">&#9889; 测试连接</button>' +
        '<span class="status-light" id="statusLight"></span>' +
      '</div>' +
      '<div class="settings-status-text" id="statusText"></div>' +
    '</div>' +

    // Save
    '<div class="settings-section">' +
      '<button class="settings-btn settings-btn-save" id="btnSave">保存配置</button>' +
    '</div>';

  $overlay.appendChild($panel);
  document.body.appendChild($overlay);

  // Wire events
  document.getElementById('btnSettingsClose').addEventListener('click', closeDrawer);
  document.getElementById('modeSwitch').addEventListener('click', handleModeSwitch);
  document.getElementById('btnTest').addEventListener('click', handleTest);
  document.getElementById('btnSave').addEventListener('click', handleSave);

  // Private inputs — save on change
  ['cfgUrl', 'cfgKey', 'cfgModel'].forEach(function (id) {
    document.getElementById(id).addEventListener('input', handleConfigInput);
  });

  refreshModeUI();
}

// ==================== MODE SWITCHING ====================

function handleModeSwitch(e) {
  var btn = e.target.closest('.mode-switch-btn');
  if (!btn) return;
  _settings.mode = btn.getAttribute('data-mode');
  refreshModeUI();
}

function handleConfigInput() {
  _settings.url    = document.getElementById('cfgUrl').value.trim();
  _settings.apiKey = document.getElementById('cfgKey').value.trim();
  _settings.model  = document.getElementById('cfgModel').value.trim();
}

function refreshModeUI() {
  // Mode buttons
  var buttons = document.querySelectorAll('.mode-switch-btn');
  for (var i = 0; i < buttons.length; i++) {
    var active = buttons[i].getAttribute('data-mode') === _settings.mode;
    buttons[i].classList.toggle('active', active);
  }

  // Private config visibility
  var cfg = document.getElementById('privateConfig');
  if (cfg) {
    cfg.style.display = _settings.mode === MODE.PRIVATE ? '' : 'none';
  }

  // Restore saved values
  var urlInput = document.getElementById('cfgUrl');
  var keyInput = document.getElementById('cfgKey');
  var modelInput = document.getElementById('cfgModel');
  if (urlInput)   urlInput.value   = _settings.url;
  if (keyInput)   keyInput.value   = _settings.apiKey;
  if (modelInput) modelInput.value = _settings.model;

  // Reset status if not testing
  if (!_testing) {
    setStatus('idle', '');
  }
}

// ==================== STATUS INDICATOR ====================

function setStatus(state, msg) {
  var light = document.getElementById('statusLight');
  var text  = document.getElementById('statusText');
  if (!light) return;

  light.className = 'status-light status-' + state;
  if (text) {
    text.textContent = msg || '';
    text.className = 'settings-status-text status-text-' + state;
  }
}

// ==================== HANDLERS ====================

function handleTest() {
  if (_testing) return;
  _testing = true;

  var modeLabel = _settings.mode === MODE.PUBLIC ? '游鳞公共算力' : '私有节点直连';

  setStatus('testing', '握手检测中...');
  termPrint('$ [System] 正在握手 [' + modeLabel + '] ...', 'text-cyan-400/70');

  // Sync config from inputs before test
  if (_settings.mode === MODE.PRIVATE) {
    handleConfigInput();
  }

  testConnectivity(_settings.mode, {
    url: _settings.url,
    apiKey: _settings.apiKey,
    model: _settings.model
  }).then(function () {
    setStatus('success', '连接成功 — 链路通畅');
    termPrint('$ [System] 链路通畅 ✓', 'text-green-400/80');
    _testing = false;
  }).catch(function (err) {
    setStatus('error', '连接失败 — ' + (err.message || '未知错误'));
    termPrint('$ [System Error] 连接失败：' + (err.message || '未知错误'), 'text-red-400/70');
    _testing = false;
  });
}

function handleSave() {
  // Sync config
  if (_settings.mode === MODE.PRIVATE) {
    handleConfigInput();
  }
  saveSettings(_settings);
  setStatus('idle', '配置已保存');
  setTimeout(function () {
    var text = document.getElementById('statusText');
    if (text && text.textContent === '配置已保存') {
      setStatus('idle', '');
    }
  }, 1500);
}

// ==================== OPEN / CLOSE ====================

function openDrawer() {
  if (!$panel) renderDrawer();
  // Refresh from storage (in case it was changed externally)
  _settings = loadSettings();
  refreshModeUI();
  $overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeDrawer() {
  if ($overlay) {
    $overlay.classList.remove('open');
    document.body.style.overflow = '';
  }
}

// ==================== PUBLIC API ====================

export function initSettings() {
  // Settings trigger button
  var btn = document.getElementById('btnSettings');
  if (btn) {
    btn.addEventListener('click', openDrawer);
  }

  // Close on Escape
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && $overlay && $overlay.classList.contains('open')) {
      closeDrawer();
    }
  });
}
