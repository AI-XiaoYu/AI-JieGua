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

  var SYSTEM_PROMPT = '你现在是 Scale OS 专属的易学算力引擎，精通《易经》与《梅花易数》。\n你的断卦风格：专业、极客、冷峻、直击要害。\n解析要求：\n1. 必须清晰拆解排盘要素（本卦、互卦、变卦的五行属性）。\n2. 严密推演【体用生克】的核心逻辑。\n3. 结合用户所测之事，给出极其明确的吉凶结论与行动建议。\n4. 语言风格采用‘现代极客终端风’与‘易学古文’交织，排版使用结构化列表，切忌啰嗦、坚决不写 AI 免责声明。';

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
