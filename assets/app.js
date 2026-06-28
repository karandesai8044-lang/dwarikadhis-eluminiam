/* ============================================================
   Dwarkadhish — Animations Engine + PWA registration
   Lightweight: ~2 KB minified, native APIs only
   ============================================================ */
(function () {
  'use strict';

  // -------- 1. Intersection Observer (scroll-triggered reveals) --------
  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');

          // Trigger any counter elements inside
          var counters = entry.target.querySelectorAll('.counter:not(.counted)');
          counters.forEach(animateCounter);

          observer.unobserve(entry.target);
        }
      });
    }, {
      rootMargin: '0px 0px -40px 0px',
      threshold: 0.05
    });

    var selectors = [
      'section',
      '.cat-grid', '.why-list', '.gallery-grid',
      '.contact-cards', '.brand-cards', '.mv-grid',
      '.stats-grid', '.faq-list', '.fade-in'
    ];
    document.querySelectorAll(selectors.join(',')).forEach(function (el) {
      observer.observe(el);
    });
  }

  // -------- 2. Auto-tag stat numbers as counters --------
  document.querySelectorAll('.stat-item strong, .hero-strip strong').forEach(function (el) {
    var text = el.textContent.trim();
    if (/^\d/.test(text)) {
      el.classList.add('counter');
    }
  });

  // -------- 3. Number counter animation --------
  function animateCounter(el) {
    el.classList.add('counted');
    var raw = el.dataset.count || el.textContent.trim();
    var match = raw.match(/^(\d+)(.*)$/);
    if (!match) return;
    var target = parseInt(match[1], 10);
    var suffix = match[2] || '';
    if (target < 5) return; // skip very small values

    var duration = 1300;
    var startTime = performance.now();
    el.textContent = '0' + suffix;

    function step(now) {
      var progress = Math.min((now - startTime) / duration, 1);
      // Ease-out cubic
      var eased = 1 - Math.pow(1 - progress, 3);
      var value = Math.floor(target * eased);
      el.textContent = value + suffix;
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        el.textContent = target + suffix;
      }
    }

    requestAnimationFrame(step);
  }

  // -------- 4. Offline indicator --------
  function createOfflineBanner() {
    if (document.getElementById('offline-banner')) return;
    var div = document.createElement('div');
    div.id = 'offline-banner';
    div.textContent = 'Offline — cached version dikha rahe hain';
    document.body.appendChild(div);
  }

  function updateOnlineStatus() {
    var banner = document.getElementById('offline-banner');
    if (!banner) {
      if (!navigator.onLine) {
        createOfflineBanner();
        document.getElementById('offline-banner').classList.add('show');
      }
      return;
    }
    if (navigator.onLine) {
      banner.classList.remove('show');
    } else {
      banner.classList.add('show');
    }
  }

  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
  if (!navigator.onLine) updateOnlineStatus();

  // -------- 5. Register Service Worker (offline + fast loading) --------
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').then(function (reg) {
        // Optional: listen for updates
        reg.addEventListener('updatefound', function () {
          // New version available, will activate on next reload
        });
      }).catch(function () {
        // SW registration failed - site still works without it
      });
    });
  }

})();
