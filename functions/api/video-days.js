// Cloudflare Pages Function: GET /api/video-days
// Returns the days that have free video-reading slots on Calendly, as
// ["YYYY-MM-DD", ...]. The Events calendar reads this to show video days.
// Calendly doesn't let browsers ask directly, so the server asks for them.

// From the public booking page calendly.com/bookings-connorboydmedium/30min
const EVENT_TYPE = '7f3bbbb0-3c7c-40a2-bd59-392f78e2ae18';
const SCHEDULING_LINK = 'd238-yxr-rdh';
const MONTHS_AHEAD = 4;
const CACHE_SECONDS = 600;

const ymd = (d) => d.toISOString().slice(0, 10);

async function fetchRange(start, end) {
  const url = `https://calendly.com/api/booking/event_types/${EVENT_TYPE}/calendar/range`
    + `?timezone=Europe%2FLondon&diagnostics=false&scheduling_link_uuid=${SCHEDULING_LINK}`
    + `&range_start=${ymd(start)}&range_end=${ymd(end)}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Calendly responded ${res.status}`);
  const data = await res.json();
  return (data.days || []).filter((d) => d.status === 'available').map((d) => d.date);
}

export async function onRequestGet(context) {
  const cache = caches.default;
  const cacheKey = new Request(new URL('/api/video-days', context.request.url).toString());
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const now = new Date();
  const ranges = [];
  for (let i = 0; i < MONTHS_AHEAD; i++) {
    const start = i === 0
      ? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
      : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + i, 1));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + i + 1, 0));
    ranges.push(fetchRange(start, end));
  }

  try {
    const days = [...new Set((await Promise.all(ranges)).flat())].sort();
    const response = new Response(JSON.stringify(days), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': `public, max-age=${CACHE_SECONDS}`,
      },
    });
    context.waitUntil(cache.put(cacheKey, response.clone()));
    return response;
  } catch (err) {
    // The calendar simply shows no video days if Calendly can't be reached
    return new Response('[]', {
      status: 502,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  }
}
