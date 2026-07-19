/* Caring Companions — shared page behaviors */
(function () {
  'use strict';

  // Reveal-on-scroll (homepage sections and any .reveal element)
  function initReveal() {
    var els = document.querySelectorAll('.reveal');
    if (!els.length) return;
    if (!('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.classList.add('revealed'); });
      return;
    }
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    els.forEach(function (el) { observer.observe(el); });
  }

  // Generic FAQ accordion: .acc-item > .acc-toggle (+ .acc-marker) + .acc-body
  function initAccordions() {
    document.querySelectorAll('.acc-toggle').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var item = btn.closest('.acc-item');
        var group = item.parentElement;
        var wasOpen = item.classList.contains('open');
        // one open at a time within a group
        group.querySelectorAll('.acc-item.open').forEach(function (other) {
          other.classList.remove('open');
          var m = other.querySelector('.acc-marker');
          if (m) m.textContent = '+';
        });
        if (!wasOpen) {
          item.classList.add('open');
          var marker = btn.querySelector('.acc-marker');
          if (marker) marker.textContent = '−';
        }
      });
    });
  }

  // Mobile menu toggle (homepage nav)
  function initMobileNav() {
    var toggle = document.getElementById('cc-nav-toggle');
    var menu = document.getElementById('cc-mobile-menu');
    if (!toggle || !menu) return;
    toggle.addEventListener('click', function () {
      var open = menu.style.display === 'flex';
      menu.style.display = open ? 'none' : 'flex';
      toggle.setAttribute('aria-expanded', String(!open));
    });
    menu.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () { menu.style.display = 'none'; });
    });
  }

  function init() {
    initReveal();
    initAccordions();
    initMobileNav();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
