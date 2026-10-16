/* Map configuration — colours, regions, markers and views are all set here.
 *
 * Countries are matched by ISO 3166-1 numeric id (world-atlas ids) or by name.
 * `raised: true` regions are drawn lifted off the map with their own shadow/glow.
 */
window.MAP_CONFIG = {
  // Land that isn't in a region
  baseColor: '#7aaa5e',
  // Projection: generalised Miller (0.8 = Miller, 1 = Mercator) with a north–south stretch
  projectionK: 0.8,
  verticalStretch: 1.13,
  // Strength of the terrain shading (0 = flat colour, 1 = default, 2 = very rough)
  relief: 1.25,
  // Terrain strength on raised regions (a region can override with its own `relief`)
  raisedRelief: 2.1,
  // Stylised crumpled-clay detail over the real terrain (0 = off)
  crumple: { src: 'assets/crumple.jpg', strength: 0.6, pixelsPerDegree: 8, scale: 2.0 },
  // Extra contrast for the real terrain before the stylised detail goes on
  terrainContrast: 1.6,
  // Slab thickness in px for ordinary land and for raised regions
  depth: 2,
  raisedDepth: 5,
  // Side-wall darkness (1 = same as top) and the lit coastline rim
  wallShade: 0.62,
  rim: { width: 3, blur: 1.5, opacity: 0.55 },
  // Shaded relief texture: equirectangular, cropped to latTop..latBottom
  reliefTexture: { src: 'assets/relief.jpg', latTop: 84, latBottom: -60, pixelsPerDegree: 16 },

  regions: [
    {
      id: 'europe', label: 'Europe', risk: 'Extreme Heat', color: '#b9a43a', raised: true,
      countries: ['250', '276', '616', '380', '724', '620', '756', '040', '203', '703', '348', '056', '528', '442',
        '208', '705', '191', '070', '688', '499', '008', '807', '300', '100', '642', '498', '440', '428', '233',
        '112', '804', 'Kosovo']
    },
    {
      id: 'africa', label: 'Africa', risk: 'Water Stress', color: '#38c4b0', raised: true,
      countries: ['012', '024', '204', '072', '854', '108', '120', '132', '140', '148', '174', '178', '180', '384',
        '262', '818', '226', '232', '748', '231', '266', '270', '288', '324', '624', '404', '426', '430', '434',
        '450', '454', '466', '478', '480', '504', '508', '516', '562', '566', '646', '678', '686', '690', '694',
        '706', '710', '728', '729', '834', '768', '788', '800', '894', '716', '732', 'Somaliland']
    },
    {
      id: 'eastAsia', label: 'Central & East Asia', risk: 'Flood', color: '#f58f78', raised: true,
      countries: ['156', '496', '398', '860', '795', '417', '762', '104', '418', '704', '764', '116', '458', '064', '524', '158']
    }
  ],

  // Numbered asset markers
  markers: [
    { n: 1, lat: 50.5, lon: 15, region: 'europe' },
    { n: 2, lat: 62, lon: 95 },
    { n: 3, lat: 64, lon: 150 },
    { n: 4, lat: 24, lon: 45 },
    { n: 5, lat: 22, lon: 27, region: 'africa' },
    { n: 6, lat: 38, lon: 104, region: 'eastAsia' }
  ],

  // Named views: longitude span fitted to the width, centred on `lat`
  views: {
    overview: { lon: [-121, 210], lat: 31, fade: { left: 0.3, bottom: 0.36, vignette: { inner: 0.7, cx: 0.52, cy: 0.42 } } },
    world:    { lon: [-93.8, 222.7], lat: 46, fade: { left: 0.5, top: 0.06 } },
    worldNarrow: { lon: [-22, 150], lat: 32, fade: { left: 0.12 } },
    mini:     { lon: [-130, 165], lat: 30, fade: { top: 0.35 }, markers: false, raised: ['eastAsia'], pulse: { lat: 38, lon: 98 } }
  }
};
