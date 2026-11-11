(function () {
  'use strict';
  var intro = document.getElementById('nexora-intro');
  var root = document.getElementById('root');
  if (!intro || !root) return;

  var done = false;
  var observer;
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
      window.requestAnimationFrame(finish);
    }
  });
  observer.observe(root, { childList: true });
  if (root.childElementCount > 0) finish();

  // Regardless of React/API state, the introduction must never block login.
  window.setTimeout(finish, 2500);
  var retry = intro.querySelector('.nx-retry');
  if (retry) retry.addEventListener('click', function () { window.location.reload(); });
})();
