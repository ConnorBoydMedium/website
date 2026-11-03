import { eleventyImageTransformPlugin } from '@11ty/eleventy-img';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// Dates in the content files are "YYYY-MM-DD"; read them as UTC so the day never shifts
const toDate = (s) => {
  const [y, m, d] = String(s).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};
const endOf = (e) => toDate(e.end || e.start);
const isMultiDay = (e) => Boolean(e.end) && e.end !== e.start;
const todayUTC = () => {
  const n = new Date();
  return new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()));
};

export default function (eleventyConfig) {
  // Changes on every publish, so browsers fetch fresh styles and scripts
  eleventyConfig.addGlobalData('version', () => Date.now().toString(36));

  eleventyConfig.addPassthroughCopy('src/css');
  eleventyConfig.addPassthroughCopy('src/js');
  eleventyConfig.addPassthroughCopy({ 'src/assets/img/logo.jpg': 'assets/img/logo.jpg' });

  // Every <img> on the site gets resized and converted to fast formats at build time,
  // including photos uploaded through the editing screen
  eleventyConfig.addPlugin(eleventyImageTransformPlugin, {
    formats: ['webp', 'jpeg'],
    widths: [480, 900, 'auto'],
    htmlOptions: {
      imgAttributes: { loading: 'lazy', decoding: 'async' },
      pictureAttributes: {},
    },
  });

  // Upcoming events, sorted by date; type is "evening" or "reading"
  eleventyConfig.addFilter('upcoming', (events = [], type) => events
    .filter((e) => e && e.start && (!type || e.type === type))
    .filter((e) => endOf(e) >= todayUTC())
    .sort((a, b) => toDate(a.start) - toDate(b.start)));

  eleventyConfig.addFilter('limit', (arr = [], n) => arr.slice(0, n));

  // Card date block: "Saturday" / "Sat and Sun", "7" / "14–15", "November 2026"
  eleventyConfig.addFilter('dayLabel', (e) => {
    const s = toDate(e.start);
    if (!isMultiDay(e)) return DAYS[s.getUTCDay()];
    return `${DAYS[s.getUTCDay()].slice(0, 3)} and ${DAYS[endOf(e).getUTCDay()].slice(0, 3)}`;
  });
  eleventyConfig.addFilter('dayShortLabel', (e) => {
    const s = toDate(e.start);
    if (!isMultiDay(e)) return DAYS[s.getUTCDay()].slice(0, 3);
    return `${DAYS[s.getUTCDay()].slice(0, 3)}–${DAYS[endOf(e).getUTCDay()].slice(0, 3)}`;
  });
  eleventyConfig.addFilter('dateRange', (e) => {
    const s = toDate(e.start).getUTCDate();
    return isMultiDay(e) ? `${s}–${endOf(e).getUTCDate()}` : String(s);
  });
  eleventyConfig.addFilter('monthYear', (e) => {
    const s = toDate(e.start);
    return `${MONTHS[s.getUTCMonth()]} ${s.getUTCFullYear()}`;
  });
  eleventyConfig.addFilter('monthShort', (e) => MONTHS[toDate(e.start).getUTCMonth()].slice(0, 3));
  eleventyConfig.addFilter('shortDate', (e) => `${toDate(e.start).getUTCDate()} ${MONTHS[toDate(e.start).getUTCMonth()]}`);
  eleventyConfig.addFilter('endDate', (e) => e.end || e.start);

  eleventyConfig.addFilter('mapsUrl', (address) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address || '')}`);
  eleventyConfig.addFilter('urlencode', (s) => encodeURIComponent(s || ''));

  return {
    dir: { input: 'src', output: '_site', includes: '_includes', data: '_data' },
    templateFormats: ['njk'],
    htmlTemplateEngine: 'njk',
  };
}
