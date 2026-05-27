import { initRouter } from './router.js';

console.log('[Scale OS] main.js loaded');

// ==================== BOOT MODAL — Global Event Delegation ====================

var _systemBooted = false;

function bootSystem() {
  if (_systemBooted) return;
  _systemBooted = true;

  console.log('[Scale OS] 接管协议已确认，正在初始化系统...');

  var modal = document.getElementById('boot-modal');
  if (modal) {
    modal.style.opacity = '0';
    modal.style.pointerEvents = 'none';
    setTimeout(function () {
      modal.style.display = 'none';
    }, 650);
  }

  try { localStorage.setItem('disclaimerAccepted', 'true'); } catch (e) {}

  try {
    initRouter();
  } catch (e) {
    console.error('[Scale OS] Router init failed:', e);
  }
}

document.addEventListener('click', function (e) {
  var btn = e.target.closest('#boot-accept-btn');
  if (!btn) return;
  e.preventDefault();
  bootSystem();
});

// ==================== INIT ====================

function init() {
  // Return visit: already accepted — skip modal, boot immediately
  if (localStorage.getItem('disclaimerAccepted') === 'true') {
    var modal = document.getElementById('boot-modal');
    if (modal) modal.style.display = 'none';
    bootSystem();
    return;
  }

  // First visit: modal covers the screen, wait for click
  // (nothing to do — the document listener above handles it)

  // Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(function () {});
  }
}

init();
