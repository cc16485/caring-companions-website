// Caring Companions: interactive service area map (Leaflet + Esri light gray tiles).
// Data: assets/service-area-map.json (20 counties in three public groups, their town pages, ZIP -> county).
(function () {
  'use strict';
  var el = document.getElementById('sm-map');
  if (!el) return;
  if (!window.L) { el.classList.add('sm-failed'); return; }

  var OFFICE = [37.22244, -93.25992];
  var PHONE = '(417) 234-8494', TEL = 'tel:14172348494';
  var GROUP = {
    active:  { fill: '#0F5563', op: 0.58, label: 'Counties we actively serve' },
    limited: { fill: '#3E98A8', op: 0.5,  label: 'Availability is limited' },
    future:  { fill: '#A9DDD5', op: 0.55, label: 'Areas we may consider in the future' }
  };
  var mobile = window.matchMedia('(max-width: 720px)').matches;

  var map = L.map(el, { scrollWheelZoom: false, tap: false, zoomSnap: 0.25 });
  if (mobile) map.dragging.disable();
  var ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/';
  L.tileLayer(ESRI + 'World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 16,
    attribution: 'Basemap &copy; <a href="https://www.esri.com/">Esri</a>, HERE, Garmin, &copy; OpenStreetMap contributors'
  }).addTo(map);
  map.createPane('labels');
  map.getPane('labels').style.zIndex = 650;
  map.getPane('labels').style.pointerEvents = 'none';
  L.tileLayer(ESRI + 'World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}', { maxZoom: 16, pane: 'labels' }).addTo(map);

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function actions(group, county) {
    var q = encodeURIComponent(county + ' County');
    if (group === 'active') return '<a class="sm-btn" href="/book">Book a free in-home assessment</a><a class="sm-btn sm-btn-ghost" href="' + TEL + '">Call ' + PHONE + '</a>';
    if (group === 'limited') return '<a class="sm-btn" href="' + TEL + '">Call ' + PHONE + '</a><a class="sm-btn sm-btn-ghost" href="/contact?area=' + q + '">Check availability online</a>';
    return '<a class="sm-btn" href="/contact?waitlist=' + q + '">Leave your name</a>';
  }
  function blurb(group) {
    if (group === 'active') return 'One of our home counties, where our caregivers live and work.';
    if (group === 'limited') return 'We start care here when we have a qualified caregiver nearby and enough weekly hours. Call first and we’ll tell you where things stand.';
    return 'We don’t provide care here right now. Leave your name and number and we’ll keep it on file.';
  }
  function popupHtml(p) {
    var towns = (p.towns || []).map(function (t) { return '<a href="' + t[1] + '">' + esc(t[0]) + '</a>'; }).join('');
    return '<div class="sm-pop sm-' + p.group + '"><p class="sm-pop-kicker">' + GROUP[p.group].label + '</p>' +
      '<p class="sm-pop-name">' + esc(p.name) + ' County</p><p class="sm-pop-text">' + blurb(p.group) + '</p>' +
      (towns ? '<div class="sm-pop-towns">' + towns + '</div>' : '') +
      (p.guide ? '<p class="sm-pop-guide"><a href="' + p.guide + '">' + esc(p.name) + ' County Resource Center &rarr;</a></p>' : '') +
      '<div class="sm-pop-actions">' + actions(p.group, p.name) + '</div></div>';
  }

  var layers = {}, selected = null, group, zips = {};
  function style(f) {
    var g = GROUP[f.properties.group];
    return { color: '#ffffff', weight: 1.6, fillColor: g.fill, fillOpacity: g.op, dashArray: f.properties.group === 'future' ? '4 4' : null };
  }
  function select(layer) {
    if (selected && selected !== layer) group.resetStyle(selected);
    selected = layer;
    layer.setStyle({ fillColor: '#F5D061', fillOpacity: 0.72, weight: 2.5, dashArray: null });
    layer.bringToFront();
  }

  fetch('/assets/service-area-map.json').then(function (r) { return r.json(); }).then(function (data) {
    zips = data.zips || {};
    group = L.geoJSON(data, {
      style: style,
      onEachFeature: function (f, layer) {
        layers[f.properties.name] = layer;
        layer.bindTooltip('<b>' + esc(f.properties.name) + ' County</b><br>' + GROUP[f.properties.group].label, { sticky: true, direction: 'top', className: 'sm-tip' });
        layer.bindPopup(popupHtml(f.properties), { className: 'sm-popup', maxWidth: 300, autoPanPaddingTopLeft: [20, 56], autoPanPaddingBottomRight: [20, 20] });
        layer.on({
          mouseover: function () { if (layer !== selected) layer.setStyle({ fillOpacity: 0.78, weight: 2.4 }); },
          mouseout: function () { if (layer !== selected) group.resetStyle(layer); },
          click: function () { select(layer); }
        });
      }
    }).addTo(map);

    data.features.forEach(function (f) {
      var b = layers[f.properties.name].getBounds(), c = b.getCenter();
      if (b.contains(OFFICE)) c = L.latLng(c.lat + (b.getNorth() - c.lat) * 0.55, c.lng); // keep the office pin clear
      L.marker(c, {
        interactive: false, keyboard: false,
        icon: L.divIcon({ className: 'sm-label sm-label-' + f.properties.group, html: '<span>' + esc(f.properties.name) + '</span>', iconSize: null })
      }).addTo(map);
    });

    L.marker(OFFICE, {
      title: 'Our Springfield office', zIndexOffset: 1000,
      icon: L.divIcon({ className: 'sm-office', iconSize: [46, 46], iconAnchor: [23, 23],
        html: '<span class="sm-office-pulse"></span><svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="22" fill="#fff" stroke="#0D365F" stroke-width="3"/><path d="M13 23 24 14l11 9v11a2 2 0 0 1-2 2H15a2 2 0 0 1-2-2z" fill="#EAF4F6" stroke="#0D365F" stroke-width="2.4" stroke-linejoin="round"/><path d="M24 33s-5.5-3.2-5.5-6.7a2.8 2.8 0 0 1 5.5-.9 2.8 2.8 0 0 1 5.5.9c0 3.5-5.5 6.7-5.5 6.7z" fill="#1F7A8C"/><circle cx="24" cy="20" r="2.4" fill="#F5D061"/></svg>' })
    }).bindPopup('<div class="sm-pop"><p class="sm-pop-kicker">Our office</p><p class="sm-pop-name">Springfield</p><p class="sm-pop-text">1331 N Stewart Ave, Suite B</p><div class="sm-pop-actions"><a class="sm-btn" href="' + TEL + '">Call ' + PHONE + '</a></div></div>', { className: 'sm-popup' })
      .addTo(map);

    function boundsOf(g) {
      var b = null;
      group.eachLayer(function (l) { if (!g || l.feature.properties.group === g) b = b ? b.extend(l.getBounds()) : L.latLngBounds(l.getBounds().getSouthWest(), l.getBounds().getNorthEast()); });
      return b;
    }
    var core = boundsOf('active').extend(boundsOf('limited'));
    function fitCore() { map.fitBounds(core, { padding: mobile ? [6, 6] : [14, 14] }); }
    fitCore();
    window.addEventListener('resize', function () { map.invalidateSize(); });

    document.querySelectorAll('[data-sm-group]').forEach(function (b) {
      b.addEventListener('click', function () {
        document.querySelectorAll('[data-sm-group]').forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
        b.setAttribute('aria-pressed', 'true');
        var g = b.getAttribute('data-sm-group');
        if (g === 'core') fitCore();
        else map.fitBounds(boundsOf(g === 'all' ? null : g), { padding: [16, 16] });
      });
    });

    var form = document.getElementById('sm-check');
    if (!form) return;
    var input = form.querySelector('input'), out = document.getElementById('sm-result');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var z = (input.value || '').replace(/\D/g, '').slice(0, 5);
      out.className = 'sm-result';
      if (z.length !== 5) { out.textContent = 'Please enter a 5-digit ZIP code.'; return; }
      var county = zips[z], layer = county && layers[county];
      if (!layer) {
        out.classList.add('sm-out');
        out.innerHTML = '<b>' + z + ' is outside our home care service area.</b> On MO HealthNet (Medicaid)? Our sister company, Caring Companions CDS, serves many more counties. <a href="https://caringcds.com/service-area" target="_blank" rel="noopener">See where CDS serves</a>';
        fitCore();
        return;
      }
      var g = layer.feature.properties.group, q = encodeURIComponent(county + ' County');
      out.classList.add('sm-' + g);
      if (g === 'active') out.innerHTML = '<b>Yes, we serve ' + z + '.</b> That’s ' + county + ' County, one of our home counties. <a href="/book">Book a free in-home assessment</a>';
      else if (g === 'limited') out.innerHTML = '<b>' + z + ' is in ' + county + ' County, where availability is limited.</b> Call <a href="' + TEL + '">' + PHONE + '</a> and we’ll tell you where things stand, or <a href="/contact?area=' + q + '">check online</a>.';
      else out.innerHTML = '<b>' + z + ' is in ' + county + ' County.</b> We don’t provide care there right now. <a href="/contact?waitlist=' + q + '">Leave your name</a> and we’ll keep it on file.';
      map.fitBounds(layer.getBounds(), { padding: [50, 50], maxZoom: 10 });
      select(layer);
      layer.openPopup(layer.getBounds().getCenter());
    });
  }).catch(function () { el.classList.add('sm-failed'); });
})();
