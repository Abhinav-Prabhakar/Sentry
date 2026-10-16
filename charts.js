/* Data-driven charts (D3) + view switching.
 * All series live in data/dashboard-data.js; every chart re-renders when its
 * container is resized and shows a tooltip on hover.
 */
(function () {
  const DATA = window.DASHBOARD_DATA;
  const parse = d3.utcParse('%Y-%m-%d');
  const fmtDay = d3.utcFormat('%b %-d, %Y');
  const LEVEL = { low: '#1fac60', moderate: '#14c2cf', high: '#ea324d', critical: '#f6761f' };
  const TYPE = {
    wildfire: { color: '#f2b01e', label: 'Wildfire Exposure' },
    flood: { color: '#e8344a', label: 'Flood Risk' },
    water: { color: '#19bfcc', label: 'Water Stress' },
    heat: { color: '#22a85d', label: 'Extreme Heat' }
  };
  const GRAY = '#d9d9d9';
  let uid = 0;

  /* ---------- shared tooltip ---------- */
  const tip = d3.select('body').append('div').attr('class', 'chart-tip');
  const showTip = (event, html) => {
    tip.html(html).classed('on', true);
    const r = tip.node().getBoundingClientRect();
    let x = event.clientX + 14, y = event.clientY - r.height - 12;
    if (x + r.width > innerWidth - 8) x = event.clientX - r.width - 14;
    if (y < 8) y = event.clientY + 16;
    tip.style('transform', `translate(${x}px,${y}px)`);
  };
  const hideTip = () => tip.classed('on', false);

  /* ---------- responsive mount helper ---------- */
  function mount(el, draw) {
    if (!el) return;
    let w = 0;
    const run = () => {
      const nw = Math.round(el.clientWidth);
      if (!nw || nw === w) return;
      w = nw;
      el.textContent = '';
      draw(d3.select(el), nw);
    };
    new ResizeObserver(run).observe(el);
    run();
  }

  /* ---------- KPI sparklines ---------- */
  document.querySelectorAll('.kpi').forEach((card, ci) => {
    const k = DATA.kpis[ci];
    mount(card.querySelector('.spark'), (root, W) => {
      const H = 78, id = 'kf' + (++uid);
      const svg = root.append('svg').attr('width', W).attr('height', H);
      const defs = svg.append('defs');
      const g1 = defs.append('linearGradient').attr('id', id);
      g1.append('stop').attr('offset', 0).attr('stop-color', k.fill).attr('stop-opacity', 0);
      g1.append('stop').attr('offset', 1).attr('stop-color', k.fill).attr('stop-opacity', .95);
      const endX = W - 20;
      const x = d3.scaleBand().domain(d3.range(k.values.length)).range([3, endX - 6]).paddingInner(.62);
      const ext = d3.extent(k.values);
      const h = d3.scaleLinear().domain(ext).range([27, 32]);
      svg.append('rect').attr('x', 3).attr('y', 11).attr('width', endX - 3).attr('height', 63).attr('fill', `url(#${id})`);
      svg.append('g').selectAll('rect').data(k.values).join('rect')
        .attr('x', (d, i) => x(i)).attr('width', x.bandwidth()).attr('y', d => 74 - h(d)).attr('height', d => h(d))
        .attr('fill', k.color).attr('opacity', .9)
        .on('mousemove', (e, d) => showTip(e, `<b>${d.toFixed(1)}</b> assets<br><span>${k.values.length - k.values.indexOf(d)} days ago</span>`))
        .on('mouseleave', hideTip);
      [-3, 0, 3].forEach(dx => svg.append('rect').attr('x', endX + dx - .65).attr('y', 17).attr('width', 1.3).attr('height', 57).attr('fill', k.color));
      svg.append('circle').attr('cx', endX).attr('cy', 11).attr('r', 5.3).attr('fill', '#fff').attr('stroke', k.color).attr('stroke-width', 3);
      const trendUp = k.trend !== 'down';
      svg.append('path').attr('d', trendUp ? 'M25 4.5 L29.5 12 H20.5 Z' : 'M25 12 L29.5 4.5 H20.5 Z')
        .attr('fill', k.color).attr('stroke', k.color).attr('stroke-linejoin', 'round');
    });
  });

  /* ---------- Portfolio score gauge ---------- */
  mount(document.getElementById('gauge'), root => {
    const { value, max } = DATA.portfolioScore;
    const r = 43.5, a0 = -135 * Math.PI / 180, sweep = 270 * Math.PI / 180;
    const svg = root.append('svg').attr('width', 120).attr('height', 120).append('g').attr('transform', 'translate(60,60)');
    const id = 'gr' + (++uid);
    const lg = svg.append('defs').append('linearGradient').attr('id', id).attr('x1', 0).attr('y1', 1).attr('x2', 1).attr('y2', 0);
    lg.append('stop').attr('offset', 0).attr('stop-color', '#f7a3ae');
    lg.append('stop').attr('offset', .35).attr('stop-color', '#e5304d');
    lg.append('stop').attr('offset', 1).attr('stop-color', '#e2304d');
    svg.append('circle').attr('r', 56).attr('fill', 'none').attr('stroke', '#f6cbd2').attr('stroke-width', 5).attr('stroke-dasharray', '0.7 1.6').attr('opacity', .55);
    const arc = d3.arc().innerRadius(r - 2.2).outerRadius(r + 2.2).cornerRadius(2.2);
    svg.append('path').attr('d', arc({ startAngle: a0, endAngle: a0 + sweep })).attr('fill', '#ececec');
    svg.append('path').attr('d', arc({ startAngle: a0, endAngle: a0 + sweep * value / max })).attr('fill', `url(#${id})`);
    svg.append('circle').attr('r', 22).attr('fill', '#fdeaed');
    svg.append('circle').attr('r', 11.5).attr('fill', '#ea3b4f');
    svg.append('path').attr('d', 'M0 -6.4 L6.3 4.6 H-6.3 Z').attr('fill', '#fff').attr('stroke', '#fff').attr('stroke-width', 1.6).attr('stroke-linejoin', 'round');
    svg.append('path').attr('d', 'M0 -2.8v3.6').attr('stroke', '#ea3b4f').attr('stroke-width', 1.6).attr('stroke-linecap', 'round');
    svg.append('circle').attr('cy', 2.9).attr('r', .9).attr('fill', '#ea3b4f');
    root.attr('title', `Portfolio risk score ${value}/${max}`);
  });

  /* ---------- Risk exposure dot matrix ---------- */
  mount(document.getElementById('dots'), (root, W) => {
    const cols = DATA.exposure, rows = d3.max(cols, c => c.assets);
    const H = 254, padL = 22, padR = 24, bottom = 247, rowGap = 11.14;
    const x = d3.scalePoint().domain(cols.map(c => c.week)).range([padL, W - padR]);
    const r = Math.min(3.45, x.step() * .24);
    const svg = root.append('svg').attr('width', W).attr('height', H);
    const col = svg.selectAll('g').data(cols).join('g').attr('transform', c => `translate(${x(c.week)},0)`);
    col.append('rect').attr('x', -x.step() / 2).attr('width', x.step()).attr('y', bottom - rows * rowGap).attr('height', rows * rowGap + 8).attr('fill', 'transparent');
    col.selectAll('circle').data(c => d3.range(c.assets).map(i => ({ i, c }))).join('circle')
      .attr('cy', d => bottom - d.i * rowGap).attr('r', r)
      .attr('fill', d => d.i < d.c.exposed ? LEVEL[d.c.level] : GRAY);
    col.on('mousemove', (e, c) => showTip(e, `<b>Week ${c.week}</b><br>${c.exposed} of ${c.assets} assets exposed${c.level ? `<br><span style="color:${LEVEL[c.level]}">● ${c.level[0].toUpperCase() + c.level.slice(1)}</span>` : ''}`))
      .on('mouseleave', hideTip);
  });

  /* ---------- Trend charts ---------- */
  function trend(el, T, o) {
    mount(el, (root, W) => {
      const dates = T.dates.map(parse);
      const series = dates.map((d, i) => ({ d, v: T.score[i], vol: T.volume[i] }));
      const x = d3.scaleUtc().domain(d3.extent(dates)).range([o.left, W - o.right]);
      const y = d3.scaleLinear().domain(T.yDomain).range([o.bottom, o.top]);
      const hi = T.highlight.map(parse);
      const svg = root.append('svg').attr('width', W).attr('height', o.height);
      const id = 'tr' + (++uid);
      const defs = svg.append('defs');
      const rg = defs.append('linearGradient').attr('id', id + 'r').attr('x1', 0).attr('x2', 0).attr('y1', 1).attr('y2', 0);
      [[0, '#c81d3a', 1], [.55, '#ec5a72', 1], [1, '#f8c4cd', .6]].forEach(([o2, c, a]) => rg.append('stop').attr('offset', o2).attr('stop-color', c).attr('stop-opacity', a));
      const hg = defs.append('linearGradient').attr('id', id + 'h').attr('x1', 0).attr('x2', 0).attr('y1', 0).attr('y2', 1);
      hg.append('stop').attr('offset', 0).attr('stop-color', '#fde3e7').attr('stop-opacity', 0);
      hg.append('stop').attr('offset', 1).attr('stop-color', '#fde3e7').attr('stop-opacity', .8);

      // y axis / grid
      if (T.yTicks) {
        svg.append('g').selectAll('text').data(T.yTicks).join('text')
          .attr('class', 'ax').attr('x', o.yLabelX).attr('y', d => y(d) + 4.5).text(d => d);
        svg.append('line').attr('x1', o.left).attr('x2', W - o.right).attr('y1', y(T.yTicks.at(-1))).attr('y2', y(T.yTicks.at(-1))).attr('stroke', '#f1f1f1');
      }
      // highlight band
      svg.append('rect').attr('x', x(hi[0])).attr('width', x(hi[1]) - x(hi[0])).attr('y', o.hiTop).attr('height', o.bottom - o.hiTop).attr('fill', `url(#${id}h)`);

      // exposure volume bars, bucketed to fit the width
      const n = Math.max(20, Math.floor((W - o.left - o.right) / o.pitch));
      const bucket = d3.bin().value(d => d.d).domain(x.domain()).thresholds(x.ticks(n))(series)
        .filter(b => b.length).map(b => ({ d: b[Math.floor(b.length / 2)].d, vol: d3.mean(b, s => s.vol), v: d3.mean(b, s => s.v), x0: b.x0, x1: b.x1 }));
      svg.append('g').selectAll('rect').data(bucket).join('rect')
        .attr('x', b => x(b.d) - o.bw / 2).attr('width', o.bw)
        .attr('y', b => y(b.vol)).attr('height', b => o.bottom - y(b.vol))
        .attr('fill', b => b.d >= hi[0] && b.d <= hi[1] ? `url(#${id}r)` : '#dedede')
        .attr('opacity', b => b.d >= hi[0] && b.d <= hi[1] ? 1 : .85);

      // score line
      const line = d3.line().x(s => x(s.d)).y(s => y(s.v)).curve(d3.curveMonotoneX);
      svg.append('path').attr('d', line(series)).attr('fill', 'none').attr('stroke', '#fff').attr('stroke-width', 5).attr('stroke-linecap', 'round').attr('opacity', .9);
      svg.append('path').attr('d', line(series)).attr('fill', 'none').attr('stroke', '#cc3550').attr('stroke-width', 1.9).attr('stroke-linejoin', 'round');

      // month axis
      svg.append('g').selectAll('text').data(d3.utcMonth.range(...x.domain().map((d, i) => i ? d3.utcDay.offset(d, 1) : d))).join('text')
        .attr('class', 'ax').attr('text-anchor', 'middle').attr('x', d => Math.max(o.left + 8, x(d))).attr('y', o.monthY).text(d3.utcFormat('%b'));

      // annotation (peak in the highlighted window)
      const A = T.annotation, ad = parse(A.date), av = series[d3.bisector(s => s.d).left(series, ad)];
      const mx = x(ad), my = y(av.v);
      const ann = svg.append('g');
      const tx = Math.min(W - 98, Math.max(4, mx - 49)), ty = Math.max(2, my - o.tipDy);
      ann.append('rect').attr('x', tx).attr('y', ty).attr('width', 94).attr('height', 44).attr('rx', 6).attr('fill', '#fff').attr('filter', 'drop-shadow(0 2px 6px rgba(0,0,0,.08))');
      ann.append('circle').attr('cx', tx + 13).attr('cy', ty + 11).attr('r', 3.3).attr('fill', '#e8314c');
      ann.append('circle').attr('cx', tx + 13).attr('cy', ty + 31).attr('r', 3.3).attr('fill', '#e3e3e3');
      const t = (xx, yy, s, cls) => ann.append('text').attr('class', cls).attr('x', xx).attr('y', yy).text(s);
      t(tx + 22, ty + 14.5, A.label, 'tt-l'); t(tx + 61, ty + 14.5, A.value, 'tt-v');
      t(tx + 22, ty + 34.5, A.sub, 'tt-l'); t(tx + 49, ty + 34.5, A.subValue, 'tt-v');
      ann.append('circle').attr('cx', mx).attr('cy', my).attr('r', 10.5).attr('fill', '#e8314c');
      ann.append('circle').attr('cx', mx).attr('cy', my).attr('r', 4).attr('fill', '#fff');

      // hover crosshair
      const focus = svg.append('g').attr('class', 'focus').style('display', 'none');
      focus.append('line').attr('y1', o.top).attr('y2', o.bottom).attr('stroke', '#bdbdbd').attr('stroke-dasharray', '2 3');
      focus.append('circle').attr('r', 4).attr('fill', '#fff').attr('stroke', '#cc3550').attr('stroke-width', 2);
      svg.append('rect').attr('x', o.left).attr('y', 0).attr('width', W - o.left - o.right).attr('height', o.bottom).attr('fill', 'transparent')
        .on('mousemove', e => {
          const [px] = d3.pointer(e);
          const s = series[Math.min(series.length - 1, d3.bisector(s => s.d).center(series, x.invert(px)))];
          focus.style('display', null);
          focus.select('line').attr('x1', x(s.d)).attr('x2', x(s.d));
          focus.select('circle').attr('cx', x(s.d)).attr('cy', y(s.v));
          showTip(e, `<b>${fmtDay(s.d)}</b><br>Risk score <b>${s.v.toFixed(1)}</b><br><span>Exposure ${s.vol.toFixed(0)}</span>`);
        })
        .on('mouseleave', () => { focus.style('display', 'none'); hideTip(); });
    });
  }

  trend(document.getElementById('trend2'), DATA.portfolioTrend,
    { height: 190, left: 21, right: 14, top: 4, bottom: 157, hiTop: 55, pitch: 4.6, bw: 1.3, monthY: 183, tipDy: 59 });
  trend(document.getElementById('trend1'), DATA.riskTrend,
    { height: 206, left: 44, right: 18, top: 17, bottom: 179, hiTop: 22, pitch: 3.3, bw: 1.3, monthY: 200, tipDy: 67, yLabelX: 19 });

  /* ---------- Risk type distribution ---------- */
  mount(document.getElementById('dist'), (root, W) => {
    const bars = DATA.distribution.bars, H = 232, base = 227;
    const x = d3.scalePoint().domain(d3.range(bars.length)).range([19, W - 19]);
    const y = d3.scaleLinear().domain([0, 100]).range([base, 7]);
    const bw = Math.max(1.4, Math.min(2.2, x.step() * .3));
    const svg = root.append('svg').attr('width', W).attr('height', H);
    svg.append('g').selectAll('rect').data(bars).join('rect')
      .attr('x', (d, i) => x(i) - bw / 2).attr('width', bw).attr('rx', bw / 2)
      .attr('y', d => y(d.count)).attr('height', d => base - y(d.count))
      .attr('fill', d => d.type ? TYPE[d.type].color : GRAY);
    // hover targets
    svg.append('g').selectAll('rect').data(bars).join('rect')
      .attr('x', (d, i) => x(i) - x.step() / 2).attr('width', x.step()).attr('y', 0).attr('height', base).attr('fill', 'transparent')
      .on('mousemove', (e, d) => showTip(e, `<b>${d.count}</b> assets<br><span>${d.type ? TYPE[d.type].label : 'Other / unclassified'}</span>`))
      .on('mouseleave', hideTip);
    // trend markers above each risk type's run
    for (const [type, dir] of Object.entries(DATA.distribution.trend)) {
      const idx = bars.map((b, i) => b.type === type ? i : -1).filter(i => i >= 0);
      const at = idx[Math.round((idx.length - 1) * (dir === 'up' ? .62 : .55))];
      const top = d3.min(idx.slice(Math.max(0, idx.indexOf(at) - 1), idx.indexOf(at) + 2), i => y(bars[i].count));
      const cx = x(at), cy = Math.min(top - 14, dir === 'up' ? y(bars[at].count) - 14 : base - 40);
      const g = svg.append('g').attr('transform', `translate(${cx},${cy})`).style('pointer-events', 'none');
      g.append('circle').attr('r', 7.5).attr('fill', TYPE[type].color).attr('stroke', '#fff').attr('stroke-width', 1.5);
      g.append('path').attr('d', dir === 'up' ? 'M-2.4 2.4 L2.4 -2.4 M-1 -2.4 H2.4 V1' : 'M-2.4 -2.4 L2.4 2.4 M2.4 -1 V2.4 H-1')
        .attr('stroke', '#fff').attr('stroke-width', 1.3).attr('fill', 'none').attr('stroke-linecap', 'round').attr('stroke-linejoin', 'round');
    }
  });

  /* ---------- Maps ---------- */
  const overviewMap = new GeoMap(document.getElementById('geo-overview'), 'overview', { interactive: true });
  const worldEl = document.getElementById('geo-world');
  new GeoMap(worldEl, () => worldEl.clientWidth < 700 ? 'worldNarrow' : 'world');
  new GeoMap(document.getElementById('geo-mini'), 'mini');
  document.querySelectorAll('[data-zoom]').forEach(b => b.addEventListener('click', () => {
    const z = b.dataset.zoom;
    if (z === 'reset') overviewMap.reset();
    else overviewMap.setZoom(overviewMap.zoom * (z === 'in' ? 1.5 : 1 / 1.5));
  }));

  /* ---------- view switching ---------- */
  const views = [...document.querySelectorAll('.view')];
  const links = [...document.querySelectorAll('.nav a[data-view]')];
  const show = () => {
    let id = (location.hash || '#overview').slice(1);
    if (!views.some(v => v.dataset.view === id)) id = 'overview';
    views.forEach(v => v.classList.toggle('on', v.dataset.view === id));
    links.forEach(a => a.classList.toggle('active', a.dataset.view === id));
  };
  addEventListener('hashchange', show);
  show();
})();
