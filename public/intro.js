(function () {
  'use strict';
  var intro = document.getElementById('nexora-intro');
  var root = document.getElementById('root');
  if (!intro || !root) return;

  var done = false;
  var observer;
  var ready = root.childElementCount > 0;
  var started = Date.now();
  var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var minimumDuration = reducedMotion ? 150 : 3600;
  var maximumDuration = reducedMotion ? 600 : 5000;
  var status = intro.querySelector('.nx-status');
  var progress = intro.querySelector('.nx-track span');
  var phases = [
    ['INICIALIZANDO NEXORA INTELLIGENCE', '22%'],
    ['CONECTANDO GOVERNANÇA E SEGURANÇA', '48%'],
    ['PREPARANDO AMBIENTE EXECUTIVO', '76%'],
    ['EXPERIÊNCIA PRONTA', '100%']
  ];
  function finish() {
    if (done) return;
    done = true;
    if (observer) observer.disconnect();
    intro.classList.add('nexora-exit');
    intro.setAttribute('aria-hidden', 'true');
    window.setTimeout(function () { intro.remove(); }, 700);
  }

  observer = new MutationObserver(function () {
    if (root.childElementCount > 0) {
      ready = true;
      if (Date.now() - started >= minimumDuration) finish();
    }
  });
  observer.observe(root, { childList: true });
  function advance(index) {
    if (done) return;
    if (status) status.textContent = phases[index][0];
    if (progress) progress.style.width = phases[index][1];
  }
  advance(0);
  if (!reducedMotion) {
    window.setTimeout(function () { advance(1); }, 850);
    window.setTimeout(function () { advance(2); }, 1850);
    window.setTimeout(function () { advance(3); }, 3000);
  }
  window.setTimeout(function () { if (ready) finish(); }, minimumDuration);

  // A failed frontend must expose a recoverable error, never an endless animation.
  window.setTimeout(function () {
    if (!ready && status) status.textContent = 'O ACESSO DEMOROU. TENTE RECARREGAR A PÁGINA.';
    if (!ready && retry) retry.style.display = 'block';
    if (ready) finish();
  }, maximumDuration);
  var skip = intro.querySelector('.nx-skip');
  if (skip) skip.addEventListener('click', finish);
  var retry = intro.querySelector('.nx-retry');
  if (retry) retry.addEventListener('click', function () { window.location.reload(); });
})();
