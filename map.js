/* Real, code-driven relief map.
 *
 * Country shapes come from world-atlas (Natural Earth 1:50m), terrain from a
 * Natural Earth shaded-relief texture. Everything visual — colours, raised
 * regions, markers, view extents — comes from window.MAP_CONFIG.
 */
(function () {
  const cfg = window.MAP_CONFIG;
  const topo = window.WORLD_TOPOLOGY;
  const countries = topojson.feature(topo, topo.objects.countries).features;
  const RAD = Math.PI / 180;

  // Miller cylindrical: x is linear in longitude and y depends only on latitude,
  // so the equirectangular relief texture can be reprojected one row at a time.
  function millerRaw(l, p) { return [l, 1.25 * Math.log(Math.tan(Math.PI / 4 + 0.4 * p))]; }
  millerRaw.invert = (x, y) => [x, 2.5 * Math.atan(Math.exp(0.8 * y)) - 0.625 * Math.PI];

  // country -> region lookup
  const regionOf = new Map();
  for (const r of cfg.regions) for (const c of r.countries) regionOf.set(c, r);
  const regionFor = f => regionOf.get(f.id) || regionOf.get(f.properties.name) || null;

  const tex = new Image();
  const texReady = new Promise(res => { tex.onload = res; tex.onerror = res; });
  tex.src = cfg.reliefTexture.src;

  const layer = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

  class GeoMap {
    constructor(el, viewName, opts = {}) {
      this.el = el;
      this.viewName = viewName;
      this.opts = opts;
      this.zoom = 1;
      this.pan = [0, 0];
      this.canvas = document.createElement('canvas');
      this.markerLayer = document.createElement('div');
      this.markerLayer.className = 'geo-markers';
      el.append(this.canvas, this.markerLayer);
      new ResizeObserver(() => this.schedule()).observe(el);
      texReady.then(() => this.schedule());
      if (opts.interactive) this.enableDrag();
    }

    get view() { return cfg.views[typeof this.viewName === 'function' ? this.viewName() : this.viewName]; }

    projection(w, h) {
      const v = this.view;
      const span = (v.lon[1] - v.lon[0]) * RAD;
      const s = (w / span) * this.zoom;
      const lonC = (v.lon[0] + v.lon[1]) / 2 * RAD;
      const yC = millerRaw(0, v.lat * RAD)[1];
      return d3.geoProjection(millerRaw).scale(s)
        .translate([w / 2 - lonC * s + this.pan[0], h / 2 + yC * s + this.pan[1]]);
    }

    schedule() {
      if (this.raf) return;
      this.raf = requestAnimationFrame(() => { this.raf = 0; this.render(); });
    }

    setZoom(k) { this.zoom = Math.max(1, Math.min(6, k)); if (this.zoom === 1) this.pan = [0, 0]; this.schedule(); }
    reset() { this.zoom = 1; this.pan = [0, 0]; this.schedule(); }

    enableDrag() {
      let start = null;
      this.el.addEventListener('pointerdown', e => {
        if (this.zoom === 1 || e.target.closest('button')) return;
        start = [e.clientX - this.pan[0], e.clientY - this.pan[1]];
        this.el.setPointerCapture(e.pointerId);
        this.el.classList.add('dragging');
      });
      this.el.addEventListener('pointermove', e => {
        if (!start) return;
        this.pan = [e.clientX - start[0], e.clientY - start[1]];
        this.schedule();
      });
      const end = () => { start = null; this.el.classList.remove('dragging'); };
      this.el.addEventListener('pointerup', end);
      this.el.addEventListener('pointercancel', end);
    }

    render() {
      const w = this.el.clientWidth, h = this.el.clientHeight;
      if (!w || !h) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const W = Math.round(w * dpr), H = Math.round(h * dpr);
      const v = this.view;
      const proj = this.projection(w, h);
      const projD = this.projection(w, h).scale(proj.scale() * dpr).translate(proj.translate().map(t => t * dpr));

      this.canvas.width = W; this.canvas.height = H;
      this.canvas.style.width = w + 'px'; this.canvas.style.height = h + 'px';
      const ctx = this.canvas.getContext('2d');

      const relief = this.reliefLayer(projD, W, H);
      const raisedIds = new Set(v.raised || cfg.regions.filter(r => r.raised).map(r => r.id));

      // flat land (everything not raised)
      const base = this.landLayer(projD, W, H, relief, f => !raisedIds.has(regionFor(f)?.id));
      ctx.save();
      ctx.shadowColor = 'rgba(38,58,34,.30)';
      ctx.shadowBlur = 10 * dpr; ctx.shadowOffsetY = 5 * dpr;
      ctx.drawImage(base, 0, 0);
      ctx.restore();

      // raised regions: deeper drop shadow, soft glow in the region's colour, lifted a few px
      for (const r of cfg.regions) {
        if (!raisedIds.has(r.id)) continue;
        const lift = 4 * dpr;
        const img = this.landLayer(projD, W, H, relief, f => regionFor(f) === r, r);
        ctx.save();
        ctx.shadowColor = 'rgba(30,30,30,.38)';
        ctx.shadowBlur = 18 * dpr; ctx.shadowOffsetY = 12 * dpr;
        ctx.drawImage(img, 0, -lift);
        ctx.shadowColor = hexA(r.color, .55);
        ctx.shadowBlur = 14 * dpr; ctx.shadowOffsetY = 0;
        ctx.drawImage(img, 0, -lift);
        ctx.restore();
      }

      // soft fades into the card background
      const fade = v.fade || {};
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      const edge = (x0, y0, x1, y1, amt) => {
        const g = ctx.createLinearGradient(x0, y0, x1, y1);
        g.addColorStop(0, 'rgba(0,0,0,.92)'); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      };
      if (fade.left) edge(0, 0, W * fade.left, 0);
      if (fade.right) edge(W, 0, W * (1 - fade.right), 0);
      if (fade.top) edge(0, 0, 0, H * fade.top);
      if (fade.bottom) edge(0, H, 0, H * (1 - fade.bottom));
      ctx.restore();

      this.placeMarkers(proj, v, w, h);
    }

    // Terrain shading reprojected from the equirectangular texture, one row at a time
    reliefLayer(proj, W, H) {
      const c = layer(W, H), g = c.getContext('2d');
      g.fillStyle = '#808080'; g.fillRect(0, 0, W, H);
      if (!tex.naturalWidth) return c;
      const t = cfg.reliefTexture, ppd = t.pixelsPerDegree;
      const lonL = proj.invert([0, H / 2])[0], lonR = proj.invert([W, H / 2])[0];
      const sx = (lonL + 180) * ppd, sw = (lonR - lonL) * ppd;
      g.imageSmoothingQuality = 'high';
      for (let y = 0; y < H; y++) {
        const lat = proj.invert([W / 2, y + 0.5])[1];
        const sy = (t.latTop - lat) * ppd;
        if (sy < 0 || sy >= tex.naturalHeight - 1) continue;
        g.drawImage(tex, sx, sy, sw, 1, 0, y, W, 1);
      }
      return c;
    }

    // Coloured countries with terrain blended in, clipped to the land
    landLayer(proj, W, H, relief, keep, region) {
      const c = layer(W, H), g = c.getContext('2d');
      const path = d3.geoPath(proj, g);
      const feats = countries.filter(keep);
      for (const f of feats) {
        g.beginPath(); path(f);
        g.fillStyle = (region || regionFor(f))?.color || cfg.baseColor;
        g.fill();
      }
      // terrain: overlay keeps the hue and adds light/shadow from the relief
      g.globalCompositeOperation = 'overlay';
      let k = cfg.relief;
      while (k > 0) { g.globalAlpha = Math.min(1, k); g.drawImage(relief, 0, 0); k -= 1; }
      // gentle top-left light across the whole map
      g.globalAlpha = 0.35;
      const light = g.createLinearGradient(0, 0, W, H);
      light.addColorStop(0, '#ffffff'); light.addColorStop(1, '#000000');
      g.globalCompositeOperation = 'soft-light';
      g.fillStyle = light; g.fillRect(0, 0, W, H);
      // keep land only
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'destination-in';
      g.beginPath(); for (const f of feats) path(f); g.fill();
      return c;
    }

    placeMarkers(proj, v, w, h) {
      const L = this.markerLayer;
      L.textContent = '';
      if (v.markers !== false) {
        for (const m of cfg.markers) {
          const [x, y] = proj([m.lon, m.lat]);
          if (x < 0 || y < 0 || x > w || y > h) continue;
          const el = document.createElement('div');
          el.className = 'geo-marker';
          el.style.transform = `translate(${x}px,${y}px)`;
          el.innerHTML = `<i></i><b>${m.n}</b>`;
          L.append(el);
        }
      }
      if (v.pulse) {
        const [x, y] = proj([v.pulse.lon, v.pulse.lat]);
        const el = document.createElement('div');
        el.className = 'geo-pulse';
        el.style.transform = `translate(${x}px,${y}px)`;
        L.append(el);
      }
    }
  }

  function hexA(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
  }

  window.GeoMap = GeoMap;
})();
