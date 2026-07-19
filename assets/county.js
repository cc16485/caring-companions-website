/* Caring Companions — county resource center behaviors:
   persona reordering, provider-type comparison filter, and the
   searchable/filterable local directory. Accordion behavior for
   care options / FAQ / question lists comes from site.js. */
(function () {
  'use strict';

  var SELECTED = { bg: '#16283a', color: '#faf9f6', border: '#16283a' };
  var UNSELECTED = { bg: '#ffffff', color: '#55677a', border: '#e4e1d8' };

  function paintChip(btn, on) {
    var c = on ? SELECTED : UNSELECTED;
    btn.style.background = c.bg;
    btn.style.color = c.color;
    btn.style.borderColor = c.border;
  }

  window.CCCounty = {
    // cfg: { personaPriority: { Parent: [keys...], ... } }
    init: function (cfg) {
      // ----- Persona picker: reorders the situations grid -----
      var grid = document.getElementById('situations-grid');
      var originalOrder = grid ? Array.prototype.slice.call(grid.children) : [];
      var activePersona = null;
      document.querySelectorAll('[data-persona]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var p = btn.getAttribute('data-persona');
          activePersona = activePersona === p ? null : p;
          document.querySelectorAll('[data-persona]').forEach(function (b) {
            paintChip(b, b.getAttribute('data-persona') === activePersona);
          });
          if (!grid) return;
          var order = activePersona && cfg.personaPriority ? cfg.personaPriority[activePersona] : null;
          var cards = order
            ? originalOrder.slice().sort(function (a, b) {
                return order.indexOf(a.getAttribute('data-key')) - order.indexOf(b.getAttribute('data-key'));
              })
            : originalOrder;
          cards.forEach(function (c) { grid.appendChild(c); });
        });
      });

      // ----- Compare table: need filter highlights matching rows -----
      var activeNeed = null;
      function paintRows() {
        document.querySelectorAll('tr[data-matches]').forEach(function (row) {
          var matches = (row.getAttribute('data-matches') || '').split(/\s+/).filter(Boolean);
          var isMatch = activeNeed && matches.indexOf(activeNeed) !== -1;
          row.style.background = isMatch ? '#fbf6ec' : 'transparent';
          var labelCell = row.querySelector('.cmp-label');
          if (labelCell) labelCell.style.background = isMatch ? '#fbf6ec' : '#f6f5f0';
          var mark = row.querySelector('.match-mark');
          if (mark) mark.textContent = isMatch ? '✓' : '';
        });
      }
      document.querySelectorAll('[data-need]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var n = btn.getAttribute('data-need');
          activeNeed = activeNeed === n ? null : n;
          document.querySelectorAll('[data-need]').forEach(function (b) {
            paintChip(b, b.getAttribute('data-need') === activeNeed);
          });
          paintRows();
        });
      });

      // ----- Local directory: search + group filter + accordion -----
      var searchInput = document.getElementById('dir-search');
      var noResults = document.getElementById('dir-noresults');
      var noResultsTerm = document.getElementById('dir-noresults-term');
      var activeGroup = 'All';

      function setOpen(cat, open) {
        cat.classList.toggle('open', open);
        var marker = cat.querySelector('.dir-marker');
        if (marker) marker.textContent = open ? '−' : '+';
      }

      function applyFilter() {
        var term = searchInput ? searchInput.value.trim().toLowerCase() : '';
        var visibleCats = 0;
        document.querySelectorAll('.dir-cat').forEach(function (cat) {
          var groupOk = activeGroup === 'All' || cat.getAttribute('data-group') === activeGroup;
          var title = (cat.querySelector('.dir-toggle') || {}).textContent || '';
          var anyEntry = false;
          cat.querySelectorAll('.dir-entry').forEach(function (entry) {
            var hay = (title + ' ' + entry.textContent).toLowerCase();
            var ok = !term || hay.indexOf(term) !== -1;
            entry.style.display = ok ? '' : 'none';
            if (ok) anyEntry = true;
          });
          var show = groupOk && anyEntry;
          cat.style.display = show ? '' : 'none';
          if (show) visibleCats += 1;
          if (term && show) setOpen(cat, true);
        });
        if (noResults) {
          var empty = (term.length > 0 || activeGroup !== 'All') && visibleCats === 0;
          noResults.style.display = empty ? 'block' : 'none';
          if (noResultsTerm) noResultsTerm.textContent = term;
        }
      }

      if (searchInput) searchInput.addEventListener('input', applyFilter);

      document.querySelectorAll('[data-group-filter]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          activeGroup = btn.getAttribute('data-group-filter');
          document.querySelectorAll('[data-group-filter]').forEach(function (b) {
            paintChip(b, b.getAttribute('data-group-filter') === activeGroup);
          });
          applyFilter();
        });
      });

      document.querySelectorAll('.dir-toggle').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var cat = btn.closest('.dir-cat');
          var wasOpen = cat.classList.contains('open');
          document.querySelectorAll('.dir-cat.open').forEach(function (other) {
            if (other !== cat) setOpen(other, false);
          });
          setOpen(cat, !wasOpen);
        });
      });

      // ----- Print buttons -----
      document.querySelectorAll('.js-print').forEach(function (btn) {
        btn.addEventListener('click', function () { window.print(); });
      });
    }
  };
})();
