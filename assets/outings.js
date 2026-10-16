// Caring Companions Oklahoma: "Good days out" page.
// Data: assets/outings.json  { items: [{ id, name, category, town, address, website, what, access, cost, schedule, months, lat, lon, minutes }] }
(function () {
  'use strict';

  var CATS = {
    'senior-center':      { label: 'Senior centers',      icon: 'i-handshake',  color: '#0F5563' },
    'library':            { label: 'Libraries',           icon: 'i-book',       color: '#2C6E8F' },
    'park-garden':        { label: 'Parks & gardens',     icon: 'i-sprout',     color: '#3E8E5A' },
    'museum-history':     { label: 'Museums & history',   icon: 'i-compass',    color: '#9C6410' },
    'arts-music-classes': { label: 'Arts, music & classes', icon: 'i-music',    color: '#7A4E9C' },
    'exercise':           { label: 'Staying active',      icon: 'i-strength',   color: '#1F7A8C' },
    'events-seasonal':    { label: 'Events & festivals',  icon: 'i-calendar',   color: '#C1532E' },
    'everyday':           { label: 'Everyday outings',    icon: 'i-bag',        color: '#55677a' },
    'volunteering':       { label: 'Giving back',         icon: 'i-heart-honey', color: '#B07A12' }
  };
  var INTERESTS = [
    { key: 'friends',  label: 'Making friends',      cats: ['senior-center', 'arts-music-classes'] },
    { key: 'active',   label: 'Staying active',      cats: ['exercise', 'park-garden'] },
    { key: 'learning', label: 'Learning something',  cats: ['library', 'museum-history'] },
    { key: 'nature',   label: 'Fresh air & nature',  cats: ['park-garden'] },
    { key: 'history',  label: 'History & stories',   cats: ['museum-history'] },
    { key: 'arts',     label: 'Music & art',         cats: ['arts-music-classes'] },
    { key: 'giving',   label: 'Giving back',         cats: ['volunteering'] },
    { key: 'everyday', label: 'Little errands out',  cats: ['everyday'] },
    { key: 'events',   label: 'Festivals & events',  cats: ['events-seasonal'] }
  ];
  var TOWNS = {
    'Mustang': [35.3842, -97.7245], 'Yukon': [35.5067, -97.7625], 'Tuttle': [35.2909, -97.8120],
    'El Reno': [35.5323, -97.9550], 'Piedmont': [35.6420, -97.7464], 'Bethany': [35.5187, -97.6323],
    'Nichols Hills': [35.5509, -97.5489], 'West Oklahoma City': [35.4580, -97.6480],
    'Southwest Oklahoma City': [35.3570, -97.6180], 'Northwest Oklahoma City': [35.5800, -97.6300]
  };
  var HOME_PARTS = [
    'Seated exercise together to warm up',
    'A hot lunch cooked at home and eaten together',
    'Medication reminder, right on time',
    'Photos, cards or a favorite show over coffee',
    'A short walk to the mailbox and a chat on the porch'
  ];
  var DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  // Per-site settings (mo-care.com sets window.OG_CONFIG before this script)
  var CFG = window.OG_CONFIG || {};
  if (CFG.towns) TOWNS = CFG.towns;
  var OFFICE = CFG.office || [35.3842, -97.7245];
  var OFFICE_NAME = CFG.officeName || 'Mustang';
  var OFFICE_NOTE = CFG.officeNote || 'Outings start from home, Monday to Friday';
  var DATA_URL = CFG.data || 'assets/outings.json';
  var ICONS = CFG.icons || 'assets/icons.svg';
  var MAX_MILES = CFG.maxMiles || 18;
  if (CFG.homeParts) HOME_PARTS = CFG.homeParts;

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function icon(id, cls) { return '<svg class="' + (cls || 'og-ic') + '" aria-hidden="true"><use href="' + ICONS + '#' + id + '"/></svg>'; }
  function miles(a, b) {
    var R = 3958.8, t = Math.PI / 180, dLa = (b[0] - a[0]) * t, dLo = (b[1] - a[1]) * t;
    var h = Math.sin(dLa / 2) * Math.sin(dLa / 2) + Math.cos(a[0] * t) * Math.cos(b[0] * t) * Math.sin(dLo / 2) * Math.sin(dLo / 2);
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  function hostOf(u) { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return ''; } }

  var DATA = [], map, markers = {}, state = { cat: 'all', town: 'all', q: '' };

  function cardHtml(it, extra) {
    var c = CATS[it.category] || CATS.everyday;
    var meta = [];
    var vague = /not stated|not confirmed|^unknown/i;
    if (it.schedule && !vague.test(it.schedule)) meta.push('<span>' + icon('i-calendar', 'og-mi') + esc(it.schedule) + '</span>');
    if (it.cost && !vague.test(it.cost)) meta.push('<span>' + icon('i-money', 'og-mi') + esc(it.cost) + '</span>');
    if (it.minutes != null) meta.push('<span>' + icon('i-car', 'og-mi') + 'about ' + it.minutes + ' min from ' + OFFICE_NAME + '</span>');
    return '<article class="og-card" data-id="' + it.id + '" style="--c:' + c.color + '">' +
      '<div class="og-card-top"><span class="og-tag">' + icon(c.icon, 'og-tag-ic') + esc(c.label) + '</span><span class="og-town">' + esc(it.town) + '</span></div>' +
      '<h3>' + esc(it.name) + '</h3>' +
      '<p>' + esc(it.what) + '</p>' +
      (it.family ? '<p class="og-family">' + icon('i-family', 'og-mi') + 'Weekends or evenings, outside our visit hours. A great family day.</p>' : '') +
      (it.access ? '<p class="og-access">' + icon('i-check', 'og-mi') + esc(it.access) + '</p>' : '') +
      (meta.length ? '<div class="og-meta">' + meta.join('') + '</div>' : '') +
      (extra || '') +
      '<div class="og-links">' +
        (it.lat ? '<button type="button" class="og-show" data-id="' + it.id + '">Show on map</button>' : '') +
        (it.website ? '<a href="' + esc(it.website) + '" target="_blank" rel="noopener">' + esc(hostOf(it.website)) + ' &rarr;</a>' : '') +
      '</div></article>';
  }

  /* ---------- Explorer ---------- */
  function filtered() {
    var q = state.q.toLowerCase();
    return DATA.filter(function (it) {
      if (state.cat !== 'all' && it.category !== state.cat) return false;
      if (state.town !== 'all' && it.town !== state.town) return false;
      if (q && (it.name + ' ' + it.what + ' ' + it.town).toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
  }
  function renderExplorer() {
    var list = filtered(), grid = document.getElementById('og-grid'), count = document.getElementById('og-count');
    if (!grid) return;
    grid.innerHTML = list.length ? list.map(function (it) { return cardHtml(it); }).join('') :
      '<p class="og-empty">Nothing matches yet. Try another town or type of outing.</p>';
    count.textContent = list.length + (list.length === 1 ? ' place' : ' places');
    if (map) {
      var ids = {}; list.forEach(function (it) { ids[it.id] = 1; });
      Object.keys(markers).forEach(function (id) {
        var m = markers[id];
        if (ids[id]) { if (!map.hasLayer(m)) m.addTo(map); } else if (map.hasLayer(m)) map.removeLayer(m);
      });
    }
  }
  function setupFilters() {
    var cats = document.getElementById('og-cats');
    if (!cats) return;
    var present = {}; DATA.forEach(function (it) { present[it.category] = (present[it.category] || 0) + 1; });
    var html = '<button type="button" data-cat="all" aria-pressed="true">Everything <b>' + DATA.length + '</b></button>';
    Object.keys(CATS).forEach(function (k) {
      if (present[k]) html += '<button type="button" data-cat="' + k + '" aria-pressed="false" style="--c:' + CATS[k].color + '">' + icon(CATS[k].icon, 'og-chip-ic') + CATS[k].label + ' <b>' + present[k] + '</b></button>';
    });
    cats.innerHTML = html;
    cats.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      cats.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
      b.setAttribute('aria-pressed', 'true');
      state.cat = b.getAttribute('data-cat'); renderExplorer();
    });
    var towns = document.getElementById('og-town'), seen = {};
    DATA.forEach(function (it) { seen[it.town] = 1; });
    Object.keys(seen).sort().forEach(function (t) { var o = document.createElement('option'); o.value = t; o.textContent = t; towns.appendChild(o); });
    towns.addEventListener('change', function () { state.town = towns.value; renderExplorer(); });
    var q = document.getElementById('og-q');
    q.addEventListener('input', function () { state.q = q.value.trim(); renderExplorer(); });
    document.getElementById('og-grid').addEventListener('click', function (e) {
      var b = e.target.closest('.og-show'); if (!b || !map) return;
      var m = markers[b.getAttribute('data-id')]; if (!m) return;
      document.getElementById('og-map').scrollIntoView({ behavior: 'smooth', block: 'center' });
      map.setView(m.getLatLng(), 14); m.openPopup();
    });
  }

  /* ---------- Map ---------- */
  function setupMap() {
    var el = document.getElementById('og-map');
    if (!el || !window.L) { if (el) el.classList.add('og-map-failed'); return; }
    var mobile = window.matchMedia('(max-width: 720px)').matches;
    map = L.map(el, { scrollWheelZoom: false, tap: false, zoomSnap: 0.25 });
    if (mobile) map.dragging.disable();
    var ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/';
    L.tileLayer(ESRI + 'World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', { maxZoom: 16, attribution: 'Basemap &copy; <a href="https://www.esri.com/">Esri</a>, HERE, Garmin, &copy; OpenStreetMap contributors' }).addTo(map);
    map.createPane('labels'); map.getPane('labels').style.zIndex = 650; map.getPane('labels').style.pointerEvents = 'none';
    L.tileLayer(ESRI + 'World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}', { maxZoom: 16, pane: 'labels' }).addTo(map);
    var pts = [];
    DATA.forEach(function (it) {
      if (it.lat == null) return;
      var c = CATS[it.category] || CATS.everyday;
      var m = L.marker([it.lat, it.lon], {
        title: it.name,
        icon: L.divIcon({ className: 'og-pin', iconSize: [34, 34], iconAnchor: [17, 17], html: '<span style="--c:' + c.color + '">' + icon(c.icon, 'og-pin-ic') + '</span>' })
      }).bindPopup('<div class="og-pop"><p class="og-pop-cat" style="color:' + c.color + '">' + esc(c.label) + '</p><p class="og-pop-name">' + esc(it.name) + '</p><p class="og-pop-town">' + esc(it.town) + (it.minutes != null ? ' &middot; about ' + it.minutes + ' min from ' + OFFICE_NAME : '') + '</p>' + (it.website ? '<a href="' + esc(it.website) + '" target="_blank" rel="noopener">Visit their site &rarr;</a>' : '') + '</div>', { className: 'og-popup', maxWidth: 260 });
      m.addTo(map); markers[it.id] = m; pts.push([it.lat, it.lon]);
    });
    L.marker(OFFICE, { zIndexOffset: 1000, title: 'Our ' + OFFICE_NAME + ' office',
      icon: L.divIcon({ className: 'og-office', iconSize: [40, 40], iconAnchor: [20, 20], html: '<span>' + icon('i-home', 'og-office-ic') + '</span>' }) })
      .bindPopup('<div class="og-pop"><p class="og-pop-name">Our ' + OFFICE_NAME + ' office</p><p class="og-pop-town">' + OFFICE_NOTE + '</p></div>', { className: 'og-popup' }).addTo(map);
    if (pts.length) map.fitBounds(pts, { padding: [24, 24] }); else map.setView([35.45, -97.7], 10);
    window.addEventListener('resize', function () { map.invalidateSize(); });
  }

  /* ---------- Week builder ---------- */
  function setupBuilder() {
    var wrap = document.getElementById('og-builder');
    if (!wrap) return;
    var chips = document.getElementById('og-interests'), townSel = document.getElementById('og-home'),
        visitsSel = document.getElementById('og-visits'), nameIn = document.getElementById('og-name'),
        out = document.getElementById('og-week'), again = document.getElementById('og-again');
    chips.innerHTML = INTERESTS.map(function (i, n) {
      return '<button type="button" data-k="' + i.key + '" aria-pressed="' + (n < 2 ? 'true' : 'false') + '">' + i.label + '</button>';
    }).join('');
    Object.keys(TOWNS).forEach(function (t) { var o = document.createElement('option'); o.value = t; o.textContent = t; townSel.appendChild(o); });
    var seed = 0;
    chips.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') === 'true' ? 'false' : 'true'); build();
    });
    [townSel, visitsSel].forEach(function (s) { s.addEventListener('change', build); });
    nameIn.addEventListener('input', function () { clearTimeout(nameIn._t); nameIn._t = setTimeout(build, 250); });
    again.addEventListener('click', function () { seed++; build(); });

    function build() {
      var picked = [].slice.call(chips.querySelectorAll('[aria-pressed="true"]')).map(function (b) { return b.getAttribute('data-k'); });
      if (!picked.length) { out.innerHTML = '<p class="og-empty">Pick at least one thing they enjoy and we’ll sketch a week.</p>'; return; }
      var home = TOWNS[townSel.value], visits = +visitsSel.value, who = (nameIn.value || '').trim() || 'your loved one';
      var cats = []; picked.forEach(function (k) { INTERESTS.forEach(function (i) { if (i.key === k) cats = cats.concat(i.cats); }); });
      var pool = DATA.filter(function (it) { return it.lat != null && !it.family && cats.indexOf(it.category) > -1 && it.category !== 'events-seasonal'; })
        .map(function (it) { return { it: it, d: miles(home, [it.lat, it.lon]) }; })
        .filter(function (x) { return x.d <= MAX_MILES; })
        .sort(function (a, b) { return a.d - b.d; });
      // rotate through categories so the week has variety
      var byCat = {}; pool.forEach(function (x) { (byCat[x.it.category] = byCat[x.it.category] || []).push(x); });
      var order = cats.filter(function (c, i) { return cats.indexOf(c) === i && byCat[c]; });
      var picks = [], used = {};
      for (var v = 0; v < visits && order.length; v++) {
        var c = order[(v + seed) % order.length], list = byCat[c], k = 0;
        while (k < list.length && used[list[(k + seed) % list.length].it.id]) k++;
        if (k < list.length) { var x = list[(k + seed) % list.length]; used[x.it.id] = 1; picks.push(x); }
      }
      var dayIdx = visits === 1 ? [2] : visits === 2 ? [1, 3] : visits === 3 ? [0, 2, 4] : [0, 1, 2, 3, 4];
      var html = '<p class="og-week-title">A week for <b>' + esc(who) + '</b> could look like this</p><ol class="og-days">';
      for (var i = 0; i < visits; i++) {
        var p = picks[i], c2 = p ? CATS[p.it.category] : null;
        html += '<li style="--c:' + (c2 ? c2.color : '#1F7A8C') + '"><div class="og-day-head"><span class="og-day">' + DAYS[dayIdx[i]] + '</span><span class="og-hours">4-hour visit</span></div>' +
          '<ul class="og-steps">' +
          '<li>' + icon('i-home', 'og-mi') + HOME_PARTS[(i + seed) % HOME_PARTS.length] + '</li>' +
          (p ? '<li class="og-out">' + icon(c2.icon, 'og-mi') + '<span><b>Out to ' + esc(p.it.name) + '</b><small>' + esc(p.it.town) + ', about ' + Math.max(1, Math.round(p.d)) + (Math.max(1, Math.round(p.d)) === 1 ? ' mile away' : ' miles away') + (p.it.schedule && !/not stated|not confirmed/i.test(p.it.schedule) ? ' &middot; ' + esc(p.it.schedule) : '') + '</small></span></li>'
             : '<li>' + icon('i-sprout', 'og-mi') + 'A walk or drive somewhere they love</li>') +
          '<li>' + icon('i-bowl', 'og-mi') + (i % 2 ? 'Home for a snack and a rest' : 'Back home, dinner prepped for later') + '</li>' +
          '</ul></li>';
      }
      html += '</ol><p class="og-week-note">A sketch, not a schedule. At your free visit we plan the real one together, around what ' + esc(who) + ' enjoys and how they feel that day.</p>';
      out.innerHTML = html;
    }
    build();
  }

  /* ---------- Seasonal calendar ---------- */
  function setupCalendar() {
    var el = document.getElementById('og-cal');
    if (!el) return;
    var M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], by = {};
    DATA.forEach(function (it) { (it.months || []).forEach(function (m) { (by[m] = by[m] || []).push(it); }); });
    var now = new Date().getMonth() + 1;
    el.innerHTML = M.map(function (lab, i) {
      var list = by[i + 1] || [];
      return '<div class="og-month' + (i + 1 === now ? ' og-now' : '') + '"><p class="og-mname">' + lab + '</p>' +
        (list.length ? list.map(function (it) { return '<a href="' + esc(it.website || '#') + '" target="_blank" rel="noopener">' + esc(it.name) + '<small>' + esc(it.town) + (it.family ? ' &middot; family day' : '') + '</small></a>'; }).join('') : '<span class="og-quiet">Library programs, senior centers and parks all year</span>') +
        '</div>';
    }).join('');
  }

  fetch(DATA_URL).then(function (r) { return r.json(); }).then(function (d) {
    DATA = (d.items || []).map(function (it, i) { it.id = it.id || 'o' + i; return it; });
    setupBuilder(); setupFilters(); setupMap(); renderExplorer(); setupCalendar();
  }).catch(function () {
    var g = document.getElementById('og-grid'); if (g) g.innerHTML = '<p class="og-empty">The list couldn’t load. Please call us and we’ll share ideas.</p>';
  });
})();
