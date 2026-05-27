// ==================== API / CONNECTIVITY ENGINE ====================

const PUBLIC_WORKER = 'https://ai.jxyxy.eu.org';
const STORAGE_KEY = 'scaleos_settings';

export const MODE = { PUBLIC: 'public', PRIVATE: 'private' };

const DEFAULTS = {
  mode: MODE.PUBLIC,
  url: '',
  apiKey: '',
  model: ''
};

// ==================== PERSISTENCE ====================

export function loadSettings() {
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      var parsed = JSON.parse(raw);
      return Object.assign({}, DEFAULTS, parsed);
    }
  } catch (e) { /* corrupted data — fall through */ }
  return Object.assign({}, DEFAULTS);
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (e) { /* quota exceeded or storage disabled */ }
}

// ==================== CONNECTIVITY TEST ====================

export async function testConnectivity(mode, config) {
  var url = mode === MODE.PUBLIC ? PUBLIC_WORKER : config.url;

  if (!url) {
    throw new Error('未配置节点地址');
  }

  // Use /v1/models as the GET connectivity test endpoint (OpenAI-compatible)
  url = url.replace(/\/+$/, '').replace(/\/(chat\/completions|models)$/, '').replace(/\/v1$/, '');
  url += '/v1/models';

  console.log('[Scale OS] Connectivity test URL:', url);

  var headers = {};
  if (mode === MODE.PRIVATE && config.apiKey) {
    headers['Authorization'] = 'Bearer ' + config.apiKey;
  }

  var controller = new AbortController();
  var timer = setTimeout(function () { controller.abort(); }, 10000);

  try {
    var response = await fetch(url, {
      method: 'GET',
      headers: headers,
      signal: controller.signal
    });
    clearTimeout(timer);

    if (!response.ok) {
      throw new Error('HTTP ' + response.status + ' ' + response.statusText);
    }

    return true;
  } finally {
    clearTimeout(timer);
  }
}

// ==================== CHAT COMPLETION ====================

var currentController = null;

export function abortAIRequest() {
  if (currentController) {
    currentController.abort();
    currentController = null;
  }
}

function normalizeChatUrl(baseUrl) {
  var url = baseUrl.replace(/\/+$/, '');
  if (/\/chat\/completions$/.test(url)) return url;
  if (!/\/v1$/.test(url)) {
    url += '/v1';
  }
  url += '/chat/completions';
  return url;
}

/**
 * @param {function} onToken - receives (deltaText, fullContentSoFar)
 * @returns {Promise<{content: string, aborted: boolean}>}
 */
export async function sendAIRequest(mode, config, messages, onToken) {
  // Abort any in-flight request before starting a new one
  abortAIRequest();

  var url;
  var model;
  var headers = { 'Content-Type': 'application/json' };

  if (mode === MODE.PUBLIC) {
    url = PUBLIC_WORKER + '/chat/completions';
    model = 'qwen/qwen3.5-397b-a17b';
  } else {
    if (!config.url) throw new Error('未配置节点地址');
    url = normalizeChatUrl(config.url);
    model = config.model || 'deepseek-chat';
    headers['Authorization'] = 'Bearer ' + config.apiKey;
  }

  console.log('[Scale OS] Chat completion URL:', url);
  console.log('[Scale OS] Model:', model);

  var SYSTEM_PROMPT = '你现在是一位精通《易经》与《梅花易数》的国学大师。你的断卦风格：文风雅致、通俗易懂、带有古典神韵，绝不使用任何代码、极客或现代 AI 用语。\n\n解析要求：\n1. 【卦象意境】：用优美且通俗的语言解释本、互、变的卦辞意象，讲故事般说明局势变化。\n2. 【易理推演】：底层必须遵循严密的"体用生克"与动爻逻辑，但表面要用正常人听得懂的话讲清因果（如"外境相助"或"自身耗损"），不堆砌晦涩术语。\n3. 【断语箴言】：给出明确的吉凶定论（如：小吉、中平、险中求胜），并结合所问之事，给出 2-3 条兼具古风与实操性的行事建议。\n\n排版清爽，使用【】作为标题分割，言简意赅，坚决不写任何 AI 免责声明。';

  // Prepend system message at index 0 — overrides any caller-supplied system prompt
  var finalMessages = [{ role: 'system', content: SYSTEM_PROMPT }].concat(messages);

  var body = JSON.stringify({
    model: model,
    messages: finalMessages,
    stream: true,
    max_tokens: 2048
  });

  currentController = new AbortController();
  var controller = currentController; // capture locally for finally-block safety

  try {
    var response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: body,
      signal: controller.signal
    });

    if (!response.ok) {
      var errText = '';
      try { errText = await response.text(); } catch (e) {}
      throw new Error('HTTP ' + response.status + ': ' + (errText || response.statusText));
    }

    // --- SSE stream reader ---
    var reader = response.body.getReader();
    var decoder = new TextDecoder();
    var fullContent = '';
    var buffer = '';

    while (true) {
      var chunk = await reader.read();
      if (chunk.done) break;

      buffer += decoder.decode(chunk.value, { stream: true });
      var lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim();
        if (!line || line.indexOf('data:') !== 0) continue;

        var payload = line.slice(5).trim();
        if (payload === '[DONE]') continue;

        try {
          var json = JSON.parse(payload);
          var delta = json.choices && json.choices[0] && json.choices[0].delta && json.choices[0].delta.content;
          if (delta) {
            fullContent += delta;
            if (onToken) onToken(delta, fullContent);
          }
        } catch (e) { /* malformed SSE line — skip */ }
      }
    }

    return { content: fullContent, aborted: false };

  } catch (err) {
    if (err.name === 'AbortError') {
      console.log('[Scale OS] 链路传输已手动中止');
      return { content: '', aborted: true };
    }
    throw err;
  } finally {
    if (currentController === controller) {
      currentController = null;
    }
  }
}
