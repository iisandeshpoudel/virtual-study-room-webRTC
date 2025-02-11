if (typeof window !== 'undefined') {
  window.global = window;
  window.process = {
    env: {},
    version: '',
    nextTick: function(fn) { setTimeout(fn, 0); },
    browser: true
  };
} 