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
  // Generalised Miller: k = 0.8 is classic Miller, k = 1 is Mercator.
  // `verticalStretch` exaggerates north–south like the reference artwork.
  const K = cfg.projectionK || 0.8, VS = cfg.verticalStretch || 1;
  function millerRaw(l, p) { return [l, VS * Math.log(Math.tan(Math.PI / 4 + K * p / 2)) / K]; }
  millerRaw.invert = (x, y) => [x, (2 / K) * (Math.atan(Math.exp(K * y / VS)) - Math.PI / 4)];

  // country -> region lookup
  const regionOf = new Map();
  for (const r of cfg.regions) for (const c of r.countries) regionOf.set(c, r);
  const regionFor = f => regionOf.get(f.id) || regionOf.get(f.properties.name) || null;

  // merged outlines (no internal borders) for the lit coastline rim
  const geoms = topo.objects.countries.geometries;
  const geomRegion = g => regionOf.get(g.id) || regionOf.get(g.properties && g.properties.name) || null;
  const outlineCache = new Map();
  const outline = keep => {
    const key = keep.key;
    if (!outlineCache.has(key)) outlineCache.set(key, topojson.merge(topo, geoms.filter(g => keep(geomRegion(g)))));
    return outlineCache.get(key);
  };

  const loadImg = src => { const im = new Image(); const p = new Promise(r => { im.onload = r; im.onerror = r; }); im.src = src; return [im, p]; };
  const [tex, texP] = loadImg(cfg.reliefTexture.src);
  const [crumple, crumpleP] = cfg.crumple ? loadImg(cfg.crumple.src) : [null, Promise.resolve()];
  const texReady = Promise.all([texP, crumpleP]);

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
      const baseKeep = Object.assign(r => !raisedIds.has(r?.id), { key: 'base:' + [...raisedIds].join() });
      const base = this.landLayer(projD, W, H, relief, f => !raisedIds.has(regionFor(f)?.id), null, outline(baseKeep));
      this.slab(ctx, base, (v.depth ?? cfg.depth ?? 3) * dpr, 0, 'rgba(38,58,34,.32)', 10 * dpr, 6 * dpr);

      // raised regions: deeper drop shadow, soft glow in the region's colour, lifted a few px
      for (const r of cfg.regions) {
        if (!raisedIds.has(r.id)) continue;
        const lift = 4 * dpr;
        const img = this.landLayer(projD, W, H, relief, f => regionFor(f) === r, r, outline(Object.assign(x => x === r, { key: r.id })));
        ctx.save();
        ctx.shadowColor = hexA(r.glow || r.color, .5);
        ctx.shadowBlur = 16 * dpr;
        ctx.drawImage(img, 0, -lift);
        ctx.restore();
        this.slab(ctx, img, (cfg.raisedDepth ?? 7) * dpr, -lift, 'rgba(25,25,25,.42)', 22 * dpr, 14 * dpr);
      }

      // soft fades into the card background
      const fade = v.fade || {};
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      const edge = (x0, y0, x1, y1, amt) => {
        const g = ctx.createLinearGradient(x0, y0, x1, y1);
        g.addColorStop(0, 'rgba(0,0,0,.94)'); g.addColorStop(.45, 'rgba(0,0,0,.6)'); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      };
      if (fade.left) edge(0, 0, W * fade.left, 0);
      if (fade.right) edge(W, 0, W * (1 - fade.right), 0);
      if (fade.top) edge(0, 0, 0, H * fade.top);
      if (fade.bottom) edge(0, H, 0, H * (1 - fade.bottom));
      if (fade.vignette) {
        // elliptical fade: fully kept inside `inner`, gone by the edge
        const { inner = 0.55, cx = 0.5, cy = 0.5 } = fade.vignette;
        ctx.save();
        ctx.translate(W * cx, H * cy); ctx.scale(W / 2, H / 2);
        const g = ctx.createRadialGradient(0, 0, inner, 0, 0, 1.08);
        g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,1)');
        ctx.fillStyle = g; ctx.fillRect(-2, -2, 4, 4);
        ctx.restore();
      }
      ctx.restore();

      this.placeMarkers(proj, v, w, h);
    }

    // A landmass drawn as a raised slab: drop shadow, darker side wall, lit top
    slab(ctx, img, depth, lift, shadow, blur, offY) {
      ctx.save();
      ctx.shadowColor = shadow; ctx.shadowBlur = blur; ctx.shadowOffsetY = offY;
      ctx.drawImage(img, 0, lift + depth);
      ctx.restore();
      ctx.save();
      ctx.filter = `brightness(${cfg.wallShade ?? .7}) saturate(1.1)`;
      for (let d = depth; d > 0; d -= 1) ctx.drawImage(img, 0, lift + d);
      ctx.restore();
      ctx.drawImage(img, 0, lift);
    }

    // Terrain shading reprojected from the equirectangular texture, one row at a time
    reliefLayer(proj, W, H) {
      const c = layer(W, H), g = c.getContext('2d');
      g.fillStyle = '#808080'; g.fillRect(0, 0, W, H);
      if (!tex.naturalWidth) return c;
      const t = cfg.reliefTexture, ppd = t.pixelsPerDegree;
      // longitude is linear in x; compute the span directly so it can run past ±180
      const lonL = (0 - proj.translate()[0]) / proj.scale() / RAD, lonR = lonL + W / proj.scale() / RAD;
      g.imageSmoothingQuality = 'high';
      const rows = (img, latTop, p, alpha) => {
        // clamp the source to the texture and map the destination to match
        // the texture wraps east–west: split the span into in-texture segments
        const TW = img.naturalWidth, x0 = (lonL + 180) * p, xw = (lonR - lonL) * p;
        const segs = [];
        for (let a = x0; a < x0 + xw - 1e-6;) {
          const k = Math.floor(a / TW), b = Math.min(x0 + xw, (k + 1) * TW);
          segs.push([a - k * TW, b - a, (a - x0) / xw * W, (b - a) / xw * W]);
          a = b;
        }
        g.globalAlpha = alpha;
        // each output row samples the whole band of texture rows it covers (no aliasing)
        let syTop = (latTop - proj.invert([W / 2, 0])[1]) * p;
        for (let y = 0; y < H; y++) {
          const syBot = (latTop - proj.invert([W / 2, y + 1])[1]) * p;
          const s0 = Math.max(0, syTop), s1 = Math.min(img.naturalHeight, syBot);
          if (s1 - s0 > 0.01) {
            const sh = Math.max(1, s1 - s0), sy = Math.min(s0, img.naturalHeight - sh);
            for (const [sx, sw, dx, dw] of segs) g.drawImage(img, sx, sy, sw, sh, dx, y, dw, 1);
          }
          syTop = syBot;
        }
      };
      rows(tex, t.latTop, ppd, 1);
      // boost the real terrain's contrast around mid-grey
      if (cfg.terrainContrast && cfg.terrainContrast !== 1) {
        const copy = layer(W, H); copy.getContext('2d').drawImage(c, 0, 0);
        g.globalAlpha = 1;
        g.filter = `contrast(${cfg.terrainContrast})`;
        g.drawImage(copy, 0, 0);
        g.filter = 'none';
      }
      // stylised "crumpled clay" detail over the real terrain; a pattern pinned to
      // the projection so it pans/zooms with the map and stays isotropic
      if (crumple && crumple.naturalWidth && cfg.crumple.strength > 0) {
        const pat = g.createPattern(crumple, 'repeat');
        const sc = proj.scale() * RAD / cfg.crumple.pixelsPerDegree * (cfg.crumple.scale || 1);
        const [tx, ty] = proj.translate();
        pat.setTransform(new DOMMatrix([sc, 0, 0, sc, tx, ty]));
        g.globalCompositeOperation = 'overlay';
        g.fillStyle = pat;
        let k = cfg.crumple.strength;
        while (k > 0) { g.globalAlpha = Math.min(1, k); g.fillRect(0, 0, W, H); k -= 1; }
        g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
      }
      return c;
    }

    // Coloured countries with terrain blended in, clipped to the land
    landLayer(proj, W, H, relief, keep, region, rim) {
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
      let k = region ? (region.relief ?? cfg.raisedRelief ?? cfg.relief) : cfg.relief;
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
      // soft light rim along the coast
      if (rim && cfg.rim) {
        const dpr = W / this.el.clientWidth;
        g.globalCompositeOperation = 'source-atop';
        g.strokeStyle = `rgba(255,255,255,${cfg.rim.opacity})`;
        g.lineWidth = cfg.rim.width * dpr; g.lineJoin = 'round';
        g.filter = `blur(${cfg.rim.blur * dpr}px)`;
        g.beginPath(); path(rim); g.stroke();
        g.filter = 'none';
      }
      return c;
    }

    placeMarkers(proj, v, w, h) {
      const L = this.markerLayer;
      L.textContent = '';
      // markers shrink with the map so they stay in proportion on small screens
      L.style.setProperty('--fit', Math.max(0.5, Math.min(1, w / 1100)).toFixed(3));
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
