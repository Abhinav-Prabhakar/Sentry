/* Map configuration — colours, regions, markers and views are all set here.
 *
 * Countries are matched by ISO 3166-1 numeric id (world-atlas ids) or by name.
 * `raised: true` regions are drawn lifted off the map with their own shadow/glow.
 */
window.MAP_CONFIG = {
  // Land that isn't in a region
  baseColor: '#64a556',
  // Strength of the terrain shading (0 = flat colour, 1 = default, 2 = very rough)
  relief: 2.4,
  // Shaded relief texture: equirectangular, cropped to latTop..latBottom
  reliefTexture: { src: 'assets/relief.jpg', latTop: 84, latBottom: -60, pixelsPerDegree: 16 },

  regions: [
    {
      id: 'europe', label: 'Europe', risk: 'Extreme Heat', color: '#b8a02c', raised: true,
      countries: ['250', '276', '616', '380', '724', '620', '756', '040', '203', '703', '348', '056', '528', '442',
        '208', '705', '191', '070', '688', '499', '008', '807', '300', '100', '642', '498', '440', '428', '233',
        '112', '804', 'Kosovo']
    },
    {
      id: 'africa', label: 'Africa', risk: 'Water Stress', color: '#36c2b4', raised: true,
      countries: ['012', '024', '204', '072', '854', '108', '120', '132', '140', '148', '174', '178', '180', '384',
        '262', '818', '226', '232', '748', '231', '266', '270', '288', '324', '624', '404', '426', '430', '434',
        '450', '454', '466', '478', '480', '504', '508', '516', '562', '566', '646', '678', '686', '690', '694',
        '706', '710', '728', '729', '834', '768', '788', '800', '894', '716', '732', 'Somaliland']
    },
    {
      id: 'eastAsia', label: 'East Asia', risk: 'Flood', color: '#e45a4b', raised: true,
      countries: ['156', '496', '104', '418', '704', '764', '116', '458', '064', '524', '050', '158']
    }
  ],

  // Numbered asset markers
  markers: [
    { n: 1, lat: 50.5, lon: 11, region: 'europe' },
    { n: 2, lat: 60, lon: 62 },
    { n: 3, lat: 64, lon: 140 },
    { n: 4, lat: 25, lon: 45 },
    { n: 5, lat: 17, lon: 13, region: 'africa' },
    { n: 6, lat: 33, lon: 101, region: 'eastAsia' }
  ],

  // Named views: longitude span fitted to the width, centred on `lat`
  views: {
    overview: { lon: [-112, 162], lat: 36, fade: { left: 0.30, right: 0.07, top: 0.10, bottom: 0.16 } },
    world:    { lon: [-62, 168], lat: 40, fade: { left: 0.30 } },
    worldNarrow: { lon: [-22, 150], lat: 32, fade: { left: 0.12 } },
    mini:     { lon: [-130, 165], lat: 30, fade: { top: 0.35 }, markers: false, raised: ['eastAsia'], pulse: { lat: 38, lon: 98 } }
  }
};
