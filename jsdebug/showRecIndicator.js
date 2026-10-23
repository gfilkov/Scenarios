var _recEl = null;
var _recStyleEl = null;

function showRecIndicator(opts) {
  opts = opts || {};
  var label = opts.label || 'REC';
  var color = opts.color || '#e53935';

  if (_recEl) return;

  if (!_recStyleEl) {
    _recStyleEl = document.createElement('style');
    _recStyleEl.textContent =
      '@keyframes rec-blink{' +
        '0%,49%{opacity:1}50%,100%{opacity:.15}' +
      '}' +
      '.rec-indicator{' +
        'position:fixed;top:16px;right:16px;z-index:2147483647;' +
        'display:flex;align-items:center;gap:8px;padding:6px 12px;' +
        'border-radius:999px;background:rgba(0,0,0,.55);color:#fff;' +
        'font:600 14px/1 system-ui,sans-serif;letter-spacing:.08em;' +
        'pointer-events:none;user-select:none;' +
      '}' +
      '.rec-indicator .dot{' +
        'width:12px;height:12px;border-radius:50%;' +
        'background:currentColor;' +
        'animation:rec-blink 1s steps(1,end) infinite;' +
      '}' +
      '@media (prefers-reduced-motion:reduce){' +
        '.rec-indicator .dot{animation:none}' +
      '}';
    document.head.appendChild(_recStyleEl);
  }

  _recEl = document.createElement('div');
  _recEl.className = 'rec-indicator';
  _recEl.setAttribute('aria-hidden', 'true');
  _recEl.style.color = color;
  _recEl.innerHTML = '<span class="dot"></span><span>' + label + '</span>';
  document.body.appendChild(_recEl);
}

function hideRecIndicator() {
  if (!_recEl) return;
  _recEl.remove();
  _recEl = null;
}

function isRecIndicatorShown() {
  return _recEl !== null;
}