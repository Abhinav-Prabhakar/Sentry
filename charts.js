/* Static chart rendering + view switching for the dashboard mockup. */
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const el = (tag, attrs, parent) => {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  };
  // deterministic pseudo-random so the bars never change between loads
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

  // Catmull-Rom → cubic bezier path through points
  function smooth(pts) {
    let d = `M${pts[0][0]},${pts[0][1]}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      const t = 6;
      d += ` C${p1[0] + (p2[0] - p0[0]) / t},${p1[1] + (p2[1] - p0[1]) / t} ${p2[0] - (p3[0] - p1[0]) / t},${p2[1] - (p3[1] - p1[1]) / t} ${p2[0]},${p2[1]}`;
    }
    return d;
  }
  const interp = (pts, x) => {
    if (x <= pts[0][0]) return pts[0][1];
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
      if (x <= x1) return y0 + (y1 - y0) * (x - x0) / (x1 - x0);
    }
    return pts[pts.length - 1][1];
  };

  /* ---------- KPI sparklines ---------- */
  document.querySelectorAll('.kpi').forEach((card, ci) => {
    const svg = card.querySelector('.spark');
    const c = card.dataset.color, f = card.dataset.fill;
    const id = 'kf' + ci;
    const defs = el('defs', {}, svg);
    const lg = el('linearGradient', { id, x1: 0, x2: 1, y1: 0, y2: 0 }, defs);
    el('stop', { offset: 0, 'stop-color': f, 'stop-opacity': 0 }, lg);
    el('stop', { offset: 1, 'stop-color': f, 'stop-opacity': .95 }, lg);
    const vg = el('linearGradient', { id: id + 'v', x1: 0, x2: 0, y1: 0, y2: 1 }, defs);
    el('stop', { offset: 0, 'stop-color': '#fff', 'stop-opacity': 0 }, vg);
    el('stop', { offset: 1, 'stop-color': '#fff', 'stop-opacity': .35 }, vg);
    el('rect', { x: 3, y: 11, width: 218, height: 63, fill: `url(#${id})` }, svg);
    el('rect', { x: 3, y: 11, width: 218, height: 63, fill: `url(#${id}v)` }, svg);
    // faint ticks in the fill area
    for (let x = 6; x < 120; x += 7.4) {
      const h = 10 + rnd() * 18;
      el('rect', { x, y: 42 - h, width: 1, height: h, fill: '#e9e9e9', opacity: .7 }, svg);
    }
    for (let x = 3.5; x < 214; x += 3.62) el('rect', { x, y: 42, width: 1.3, height: 32, fill: c }, svg);
    [217.2, 220.2, 223.2].forEach(x => el('rect', { x: x - .65, y: 17, width: 1.3, height: 57, fill: c }, svg));
    el('circle', { cx: 220.2, cy: 11, r: 5.3, fill: '#fff', stroke: c, 'stroke-width': 3 }, svg);
    el('path', { d: 'M25 4.5 L29.5 12 H20.5 Z', fill: c, 'stroke-linejoin': 'round', stroke: c, 'stroke-width': 1 }, svg);
  });

  /* ---------- Risk exposure dot matrix ---------- */
  const dots = document.getElementById('dots');
  if (dots) {
    const cols = [
      '....gggggggggggggggggg', '....gggggggggggggggggg', '....gggggggggggggggggg',
      '..........gggggggggggg', '..........gggggggggggg', '..........gggggggggggg',
      '..........oooooooooooo', '......oooooooooooooooo', '.....ooooooooooooooooo',
      '........oooooooooooooo', '........oooooooooooooo', '....oooooooooooooooooo',
      '...........GGGGGGGGGGG', '...........GGGGGGGGGGG', '...........GGGGGGGGGGG',
      '....gggggggGGGGGGGGGGG', 'ggggrrrrrrrrrrrrrrrrrr', 'ggggrrrrrrrrrrrrrrrrrr',
      'ggggrrrrrrrrrrrrrrrrrr', '......gggggggggggggggg', '......gggggggggggggggg',
      '........gggggggggggggg', '....gggggggggggggggggg', '.....ggggggggggggggggg',
      '...........ttttttttttt', '........tttttttttttttt', '........tttttttttttttt',
      '........tttttttttttttt'];
    const pal = { g: '#d9d9d9', o: '#f6761f', r: '#ea324d', G: '#1fac60', t: '#14c2cf' };
    cols.forEach((s, i) => {
      [...s].forEach((ch, j) => {
        if (ch === '.') return;
        el('circle', { cx: 22 + i * 14.85, cy: 93 + j * 11.14, r: 3.45, fill: pal[ch] }, dots);
      });
    });
  }

  /* ---------- Trend chart helper ---------- */
  function trend(svg, o) {
    const [ox, oy] = o.origin;
    const pts = o.line.map(([x, y]) => [x - ox, y - oy]);
    const defs = el('defs', {}, svg);
    const rg = el('linearGradient', { id: o.id + 'r', x1: 0, x2: 0, y1: 1, y2: 0 }, defs);
    el('stop', { offset: 0, 'stop-color': '#c81d3a' }, rg);
    el('stop', { offset: .55, 'stop-color': '#ec5a72' }, rg);
    el('stop', { offset: 1, 'stop-color': '#f8c4cd', 'stop-opacity': .6 }, rg);
    const hg = el('linearGradient', { id: o.id + 'h', x1: 0, x2: 0, y1: 0, y2: 1 }, defs);
    el('stop', { offset: 0, 'stop-color': '#fde3e7', 'stop-opacity': 0 }, hg);
    el('stop', { offset: 1, 'stop-color': '#fde3e7', 'stop-opacity': .8 }, hg);

    (o.grid || []).forEach(y => el('rect', { x: o.x0 - ox, y: y - oy, width: o.x1 - o.x0, height: 1, fill: '#f3f3f3' }, svg));
    const base = o.base - oy;
    const [h0, h1] = o.hi.map(x => x - ox);
    el('rect', { x: h0, y: o.hiTop - oy, width: h1 - h0, height: base - (o.hiTop - oy), fill: `url(#${o.id}h)` }, svg);
    for (let x = o.x0 - ox; x <= o.x1 - ox; x += o.pitch) {
      const ly = interp(pts, x);
      const top = ly - (o.minH + rnd() * o.varH) - (o.rise ? o.rise * (x - (o.x0 - ox)) / (o.x1 - o.x0) : 0);
      const hot = x >= h0 && x <= h1;
      el('rect', { x: x - o.bw / 2, y: top, width: o.bw, height: base - top, fill: hot ? `url(#${o.id}r)` : '#dedede', opacity: hot ? 1 : .85 }, svg);
    }
    el('path', { d: smooth(pts), fill: 'none', stroke: '#fff', 'stroke-width': 5, 'stroke-linecap': 'round', opacity: .9 }, svg);
    el('path', { d: smooth(pts), fill: 'none', stroke: '#cc3550', 'stroke-width': 1.8, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, svg);

    const [mx, my] = [o.marker[0] - ox, o.marker[1] - oy];
    el('circle', { cx: mx, cy: my, r: 10.5, fill: '#e8314c' }, svg);
    el('circle', { cx: mx, cy: my, r: 4, fill: '#fff' }, svg);

    // tooltip
    const [tx, ty] = [o.tip[0] - ox, o.tip[1] - oy];
    const g = el('g', {}, svg);
    el('rect', { x: tx, y: ty, width: 94, height: 44, rx: 6, fill: '#fff', filter: 'drop-shadow(0 2px 6px rgba(0,0,0,.08))' }, g);
    el('circle', { cx: tx + 13, cy: ty + 11, r: 3.3, fill: '#e8314c' }, g);
    el('circle', { cx: tx + 13, cy: ty + 31, r: 3.3, fill: '#e3e3e3' }, g);
    const txt = (x, y, s, fill, w) => { const t = el('text', { x, y, fill, 'font-size': 10, 'font-weight': w || 400, 'font-family': 'Inter', 'letter-spacing': '-.2' }, g); t.textContent = s; };
    txt(tx + 22, ty + 14.5, 'Risk Up', '#a8a8a8'); txt(tx + 61, ty + 14.5, '12.6%', '#333', 500);
    txt(tx + 22, ty + 34.5, 'Over', '#a8a8a8'); txt(tx + 49, ty + 34.5, '90 Days', '#333', 500);

    o.months.forEach(([m, x]) => {
      const t = el('text', { x: x - ox, y: o.monthY - oy, fill: '#5a5a5a', 'font-size': 12.5, 'font-family': 'Inter', 'text-anchor': 'middle' }, svg);
      t.textContent = m;
    });
    (o.yLabels || []).forEach(([v, y]) => {
      const t = el('text', { x: o.yx - ox, y: y - oy + 4.5, fill: '#6a6a6a', 'font-size': 12, 'font-family': 'Inter' }, svg);
      t.textContent = v;
    });
  }

  const M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'];
  const t2 = document.getElementById('trend2');
  if (t2) trend(t2, {
    id: 't2', origin: [1466, 563], x0: 1487, x1: 1856, pitch: 4.6, bw: 1.3, base: 810,
    minH: 6, varH: 22, rise: 18, hi: [1668, 1739], hiTop: 735,
    line: [[1487, 810], [1496, 806.4], [1503, 797], [1507, 799.6], [1511, 797.4], [1515, 799], [1519, 799], [1522, 793], [1530, 787.6], [1538, 788.6], [1543, 778.4], [1551, 769.6], [1559, 778], [1562, 777], [1565.6, 780.4], [1570, 774.4], [1583, 766], [1588, 773], [1592, 766], [1600, 760], [1608, 763], [1611, 753], [1616, 756], [1623, 751.6], [1628, 753], [1629.5, 744], [1638, 741.6], [1644, 754], [1649, 751], [1650.5, 755.4], [1659, 752], [1664, 762], [1670, 767.5], [1678, 762], [1683, 749], [1689, 755], [1694, 748.4], [1703, 753], [1707, 744], [1711, 752], [1719, 762], [1723, 749], [1725, 750], [1734, 741.6], [1738, 748], [1744, 762], [1756, 752.4], [1762, 753.6], [1764, 747], [1772, 745], [1774, 730], [1779, 729.6], [1780.5, 721], [1786, 723], [1795, 707], [1801, 703], [1807, 720], [1811, 720], [1816, 703], [1823, 709], [1828, 705.6], [1831, 705], [1834, 698], [1841, 700.4], [1850, 692.4], [1855, 694.4]],
    marker: [1707, 721], tip: [1658, 662],
    monthY: 832, months: M.map((m, i) => [m, [1496, 1545, 1595, 1645, 1695, 1746, 1794, 1842][i]])
  });

  const t1 = document.getElementById('trend1');
  if (t1) trend(t1, {
    id: 't1', origin: [1374, 973], x0: 1418, x1: 1856, pitch: 3.3, bw: 1.3, base: 1236,
    minH: 0, varH: 0, hi: [1547, 1661], hiTop: 1110,
    line: [[1419, 1236], [1434, 1217.5], [1447.5, 1192.5], [1452.5, 1189.5], [1457.5, 1193], [1464, 1191], [1472, 1179], [1479, 1185.5], [1483, 1183], [1495, 1196], [1506, 1198], [1522.5, 1179], [1542.5, 1189.5], [1555, 1184], [1570, 1175], [1587.5, 1162.5], [1597.5, 1145], [1607.5, 1134], [1617.5, 1140], [1630, 1155], [1639, 1157.5], [1647.5, 1149.5], [1659, 1144], [1670, 1172.5], [1679, 1157.5], [1691, 1148], [1702.5, 1160], [1712.5, 1171], [1724, 1171], [1737.5, 1196], [1750, 1184], [1757.5, 1183], [1772.5, 1189], [1787.5, 1177], [1800, 1159], [1807.5, 1162.5], [1816, 1177.5], [1822.5, 1171], [1835, 1179], [1845, 1166], [1855, 1134.5]],
    marker: [1607.5, 1134], tip: [1557, 1067],
    grid: [1080, 1104],
    monthY: 1257, months: M.map((m, i) => [m, [1419, 1479, 1541, 1601, 1663, 1726, 1784, 1843][i]]),
    yx: 1393, yLabels: [['100', 1078], ['70', 1117], ['50', 1155], ['25', 1194], ['0', 1240]]
  });
  // Trend 1 bars are a flat band (tops independent of the line)
  if (t1) {
    // re-draw: bars in this chart sit in a 1105–1160 band regardless of the line
    t1.querySelectorAll('rect[height]').forEach(r => {
      const x = +r.getAttribute('x');
      if (+r.getAttribute('width') > 2) return;
      const top = 1108 + rnd() * 50 - 973;
      r.setAttribute('y', top); r.setAttribute('height', 1236 - 973 - top);
    });
  }

  /* ---------- Risk type distribution bars ---------- */
  const dist = document.getElementById('dist');
  if (dist) {
    const groups = [
      ['#d9d9d9', [1303, 1304, 1298, 1264, 1281, 1299, 1298, 1303, 1299, 1293]],
      ['#f2b01e', [1233, 1233, 1210, 1209, 1173, 1143, 1159, 1183]],
      ['#d9d9d9', [1300, 1289, 1303, 1303]],
      ['#e8344a', [1183, 1148, 1136, 1178, 1185, 1213, 1215, 1200, 1226, 1232, 1209, 1146, 1128, 1130, 1106]],
      ['#d9d9d9', [1300, 1316, 1303]],
      ['#19bfcc', [1303, 1243, 1225, 1232, 1209, 1233, 1233, 1221, 1209, 1230, 1303, 1303, 1303, 1303, 1303, 1303, 1303, 1303, 1298]],
      ['#d9d9d9', [1264, 1281, 1299, 1298, 1303, 1298, 1293, 1234, 1304, 1304]],
      ['#22a85d', [1303, 1303, 1303, 1243, 1225, 1231, 1209, 1233, 1215, 1221, 1209, 1230, 1303, 1303, 1303]],
      ['#d9d9d9', [1303, 1304, 1303, 1316, 1303, 1299]]
    ];
    const flat = groups.flatMap(([c, hs]) => hs.map(h => [c, h]));
    const step = (903 - 229) / (flat.length - 1);
    flat.forEach(([c, top], i) => {
      const x = 229 + i * step - 210;
      el('rect', { x: x - 1, y: top - 875, width: 2, height: 1322 - top, rx: 1, fill: c }, dist);
    });
    const marks = [[327, 1193, '#f2a516', 'up'], [453, 1200, '#e8302f', 'up'], [612, 1283, '#18bccb', 'down'], [809, 1218, '#22a35a', 'down']];
    marks.forEach(([x, y, c, d]) => {
      const cx = x - 210, cy = y - 875;
      el('circle', { cx, cy, r: 7.5, fill: c, stroke: '#fff', 'stroke-width': 1.5 }, dist);
      const p = d === 'up' ? `M${cx - 2.4},${cy + 2.4} L${cx + 2.4},${cy - 2.4} M${cx - 1},${cy - 2.4} H${cx + 2.4} V${cy + 1}` : `M${cx - 2.4},${cy - 2.4} L${cx + 2.4},${cy + 2.4} M${cx + 2.4},${cy - 1} V${cx === 0 ? 0 : cy + 2.4} H${cx - 1}`;
      el('path', { d: p, stroke: '#fff', 'stroke-width': 1.3, fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, dist);
    });
  }

  /* ---------- view switching + fit-to-window ---------- */
  const views = [...document.querySelectorAll('.view')];
  const show = () => {
    const id = (location.hash || '#overview').slice(1);
    views.forEach(v => v.classList.toggle('on', v.id === (views.some(x => x.id === id) ? id : 'overview')));
  };
  addEventListener('hashchange', show); show();
  document.querySelectorAll('.side a').forEach((a, i) => {
    if (i % 8 === 0) a.href = '#overview';
    if (i % 8 === 1) a.href = '#map';
  });
  const stage = document.getElementById('stage');
  const fit = () => {
    const s = Math.min(innerWidth / 2000, innerHeight / 1500);
    stage.style.transform = `scale(${s})`;
  };
  addEventListener('resize', fit); fit();
})();
