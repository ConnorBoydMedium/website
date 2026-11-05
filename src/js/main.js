/* Contact details come from src/_data/settings.json via window.SITE (set in the page head) */
const SITE = window.SITE || {};
const BOOKING_URL = SITE.booking || 'https://calendly.com/bookings-connorboydmedium/30min';

/* Events are only removed from the site when it's next published, so hide any
   that have already finished in the meantime */
(() => {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  document.querySelectorAll('[data-end]').forEach((el) => {
    if (el.dataset.end && el.dataset.end < today) el.remove();
  });
})();

/* Weekend reading lists: show the next 6 dates, with a button for the rest */
document.querySelectorAll('.weekends').forEach((list) => {
  const SHOWN = 6;
  const extra = [...list.children].slice(SHOWN);
  if (!extra.length) return;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'btn btn--ghost weekends__more';
  button.setAttribute('aria-expanded', 'false');
  const setOpen = (open) => {
    extra.forEach((li) => { li.hidden = !open; });
    button.setAttribute('aria-expanded', String(open));
    button.textContent = open ? 'Show fewer dates' : `Show ${extra.length} more dates`;
  };
  button.addEventListener('click', () => {
    const open = button.getAttribute('aria-expanded') !== 'true';
    setOpen(open);
    if (!open) list.scrollIntoView({ block: 'nearest' });
  });
  setOpen(false);
  list.after(button);
});

document.querySelectorAll('[data-year]').forEach((el) => {
  el.textContent = new Date().getFullYear();
});

/* Navigation: solid background once you scroll past the top */
const nav = document.querySelector('[data-nav]');
if (nav && !nav.classList.contains('nav--solid')) {
  const onScroll = () => nav.classList.toggle('is-scrolled', window.scrollY > 24);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
}

/* Mobile menu */
const menu = document.querySelector('[data-menu]');
const openBtn = document.querySelector('[data-menu-open]');
const closeBtn = document.querySelector('[data-menu-close]');

function setMenu(open) {
  if (!menu) return;
  menu.classList.toggle('is-open', open);
  openBtn.setAttribute('aria-expanded', String(open));
  document.body.style.overflow = open ? 'hidden' : '';
  if (open) {
    closeBtn.focus();
  } else {
    openBtn.focus({ preventScroll: true });
  }
}

if (menu) {
  openBtn.addEventListener('click', () => setMenu(true));
  closeBtn.addEventListener('click', () => setMenu(false));
  menu.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', (e) => {
    if (!menu.classList.contains('is-open')) return;
    if (e.key === 'Escape') setMenu(false);
    if (e.key === 'Tab') {
      // keep focus inside the open menu
      const items = menu.querySelectorAll('a, button');
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });
}

/* Cards turn over as they come into view */
const reveals = document.querySelectorAll('[data-reveal]');
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    },
    { rootMargin: '0px 0px -12% 0px', threshold: 0.25 }
  );
  reveals.forEach((el) => io.observe(el));
} else {
  reveals.forEach((el) => el.classList.add('is-visible'));
}

/* "Before you book" terms. Any [data-terms] link (a direct Calendly link) or
   [data-terms-open] button opens the pop-up first; once the visitor ticks the box
   and continues, the link opens, or the calendar loads on the Book page. */
const termsDialog = document.querySelector('[data-terms-dialog]');
if (termsDialog && typeof termsDialog.showModal === 'function') {
  const agree = termsDialog.querySelector('[data-terms-agree]');
  const go = termsDialog.querySelector('[data-terms-continue]');
  const gate = document.querySelector('[data-calendly-gate]');
  let pendingHref = null;
  let opener = null;

  function loadCalendly() {
    if (!gate) return;
    const widget = document.createElement('div');
    widget.className = 'calendly-inline-widget';
    widget.dataset.url = gate.dataset.url;
    const wrap = document.createElement('div');
    wrap.className = 'calendar';
    wrap.append(widget);
    gate.replaceWith(wrap);
    if (window.Calendly) {
      window.Calendly.initInlineWidget({ url: gate.dataset.url, parentElement: widget });
    } else {
      const s = document.createElement('script');
      s.src = 'https://assets.calendly.com/assets/external/widget.js';
      s.async = true;
      document.body.append(s);
    }
    wrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('[data-terms], [data-terms-open]');
    if (!trigger) return;
    // the Book page calendar is already open once agreed, so let in-page buttons just scroll
    if (trigger.matches('[data-terms-open]') && !document.querySelector('[data-calendly-gate]')) {
      return;
    }
    e.preventDefault();
    pendingHref = trigger.matches('[data-terms]') ? trigger.href : null;
    opener = trigger;
    agree.checked = false;
    go.disabled = true;
    termsDialog.showModal();
  });

  agree.addEventListener('change', () => { go.disabled = !agree.checked; });
  termsDialog.querySelector('[data-terms-close]').addEventListener('click', () => termsDialog.close());
  termsDialog.addEventListener('click', (e) => { if (e.target === termsDialog) termsDialog.close(); });
  termsDialog.addEventListener('close', () => {
    if (!go.dataset.going && opener) opener.focus({ preventScroll: true });
    delete go.dataset.going;
  });

  go.addEventListener('click', () => {
    go.dataset.going = '1';
    termsDialog.close();
    if (pendingHref) {
      window.open(pendingHref, '_blank', 'noopener');
    } else {
      loadCalendly();
    }
  });
}

/* "WhatsApp to book" buttons on reading-day cards: fill in a ready-made
   message naming the event and date, built from the card itself. */
const WHATSAPP_USERNAME = SITE.whatsapp || 'connorboydmedium';
document.querySelectorAll('[data-whatsapp-book]').forEach((a) => {
  const card = a.closest('.event');
  if (!card) return;
  const dow = card.querySelector('.event__date span').textContent.trim();
  const day = card.querySelector('.event__day').textContent.trim();
  const month = card.querySelector('.event__month').textContent.trim().split(/\s+/)[0];
  const title = card.querySelector('h3').textContent.trim();
  const message = `Hi Connor, I'd like to book a 1-2-1 reading at ${title} (${dow} ${day} ${month}).`;
  a.href = `https://wa.me/${WHATSAPP_USERNAME}?text=${encodeURIComponent(message)}`;
  a.setAttribute('aria-label', `WhatsApp to book a reading at ${title}, ${dow} ${day} ${month} (opens WhatsApp)`);
});

/* Events calendar: reads the date, type and title from each .event card,
   so adding or removing a card is all it takes to update the calendar. */
const cal = document.querySelector('[data-calendar]');
if (cal) {
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const keyOf = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  const monthIndex = (d) => d.getFullYear() * 12 + d.getMonth();

  const events = [...document.querySelectorAll('.event')].map((card, i) => {
    const [first, last] = card.querySelector('.event__day').textContent.split(/[–-]/).map((n) => parseInt(n, 10));
    const [monthName, year] = card.querySelector('.event__month').textContent.trim().split(/\s+/);
    const month = MONTHS.indexOf(monthName);
    const label = card.querySelector('.event__type').textContent.trim();
    if (!card.id) card.id = `event-${i + 1}`;
    const days = [];
    for (let d = first; d <= (last || first); d++) days.push(new Date(Number(year), month, d));
    return {
      id: card.id,
      title: card.querySelector('h3').textContent.trim(),
      label,
      type: /mediumship/i.test(label) ? 'evening' : 'reading',
      days,
    };
  }).filter((e) => e.days.length && !Number.isNaN(e.days[0].getTime()));

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Video reading days: the hand-kept list in events.html to start with,
  // replaced by the live feed at /api/video-days once the site has one.
  const VIDEO_FEED_URL = '/api/video-days';
  let videoDates = [];
  try {
    const el = document.querySelector('[data-video-days]');
    videoDates = el ? JSON.parse(el.textContent) : [];
  } catch (err) {
    videoDates = [];
  }

  const toVideoEvents = (dates) => dates
    .map((s) => {
      const [y, m, d] = String(s).split('-').map(Number);
      return new Date(y, m - 1, d);
    })
    .filter((d) => !Number.isNaN(d.getTime()) && d >= today)
    .map((d) => ({
      video: true,
      title: '30-minute video readings',
      label: 'Video readings available',
      type: 'video',
      days: [d],
    }));

  const calendlyDayUrl = (d) => {
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    return `${BOOKING_URL}?month=${ym}&date=${ym}-${String(d.getDate()).padStart(2, '0')}`;
  };

  let videoEvents = [];
  let byDay = new Map();
  let allDays = [];

  function indexDays(dates) {
    videoEvents = toVideoEvents(dates);
    byDay = new Map();
    [...events, ...videoEvents].forEach((e) => e.days.forEach((d) => {
      const k = keyOf(d);
      if (!byDay.has(k)) byDay.set(k, []);
      byDay.get(k).push(e);
    }));
    allDays = [...events, ...videoEvents].flatMap((e) => e.days).sort((a, b) => a - b);
  }

  indexDays(videoDates);

  if (allDays.length) {
    const next = allDays.find((d) => d >= today) || allDays[allDays.length - 1];
    let minMonth = Math.min(monthIndex(today), monthIndex(allDays[0]));
    let maxMonth = Math.max(monthIndex(today), monthIndex(allDays[allDays.length - 1]));
    let shown = new Date(next.getFullYear(), next.getMonth(), 1);
    let selected = null;

    const titleEl = cal.querySelector('[data-cal-title]');
    const daysEl = cal.querySelector('[data-cal-days]');
    const detailEl = cal.querySelector('[data-cal-detail]');
    const prevBtn = cal.querySelector('[data-cal-prev]');
    const nextBtn = cal.querySelector('[data-cal-next]');

    const shortDate = (d) => `${DAYS[d.getDay()].slice(0, 3)} ${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`;

    function itemHtml(e, d) {
      const range = e.days.length > 1 ? `${e.days[0].getDate()}–${e.days[e.days.length - 1].getDate()}` : String(d.getDate());
      const dow = e.days.length > 1
        ? `${DAYS[e.days[0].getDay()].slice(0, 3)}–${DAYS[e.days[e.days.length - 1].getDay()].slice(0, 3)}`
        : DAYS[d.getDay()].slice(0, 3);
      const link = e.video
        ? `href="${calendlyDayUrl(d)}" target="_blank" rel="noopener" data-terms`
        : `href="#${e.id}"`;
      return `<li><a class="weekend cal__item" ${link}>
        <span class="weekend__date"><span>${dow}</span><span class="weekend__day">${range}</span><span>${MONTHS[d.getMonth()].slice(0, 3)}</span></span>
        <span class="weekend__info"><strong>${e.title}</strong><span class="cal__tag"><span class="cal__dot cal__dot--${e.type}" aria-hidden="true"></span>${e.label}</span></span>
      </a></li>`;
    }

    function renderDetail() {
      let heading;
      let list;
      if (selected) {
        const d = new Date(selected);
        heading = `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
        list = (byDay.get(keyOf(d)) || []).map((e) => itemHtml(e, d));
      } else {
        heading = `In ${MONTHS[shown.getMonth()]}`;
        const seen = new Set();
        list = events
          .filter((e) => e.days.some((d) => monthIndex(d) === monthIndex(shown)))
          .sort((a, b) => a.days[0] - b.days[0])
          .filter((e) => !seen.has(e.id) && seen.add(e.id))
          .map((e) => itemHtml(e, e.days.find((d) => monthIndex(d) === monthIndex(shown))));
      }
      const videoCount = selected ? 0 : videoEvents.filter((e) => monthIndex(e.days[0]) === monthIndex(shown)).length;
      const videoNote = videoCount
        ? `<p class="cal__video-note"><span class="cal__dot cal__dot--video" aria-hidden="true"></span>
            <span>Video readings on ${videoCount} ${videoCount === 1 ? 'day' : 'days'} this month.
            <a href="${calendlyDayUrl(shown).split('&date')[0]}" target="_blank" rel="noopener" data-terms>Choose a time</a></span></p>`
        : '';
      detailEl.innerHTML = `<h3 class="cal__detail-title">${heading}</h3>${
        list.length
          ? `<ul class="weekends">${list.join('')}</ul>`
          : (videoCount ? '' : '<p>No dates this month yet. Follow me on Facebook or Instagram to hear when new ones are added.</p>')
      }${videoNote}${selected ? '<button class="cal__all" type="button" data-cal-all>Show the whole month</button>' : ''}`;
      const allBtn = detailEl.querySelector('[data-cal-all]');
      if (allBtn) allBtn.addEventListener('click', () => { selected = null; render(); });
    }

    function render() {
      titleEl.textContent = `${MONTHS[shown.getMonth()]} ${shown.getFullYear()}`;
      prevBtn.disabled = monthIndex(shown) <= minMonth;
      nextBtn.disabled = monthIndex(shown) >= maxMonth;

      const lead = (shown.getDay() + 6) % 7; // Monday first
      const count = new Date(shown.getFullYear(), shown.getMonth() + 1, 0).getDate();
      let html = '<span class="cal__day cal__day--blank"></span>'.repeat(lead);
      for (let n = 1; n <= count; n++) {
        const d = new Date(shown.getFullYear(), shown.getMonth(), n);
        const k = keyOf(d);
        const list = byDay.get(k);
        const cls = ['cal__day'];
        if (d < today) cls.push('is-past');
        if (d.getTime() === today.getTime()) cls.push('is-today');
        if (list) {
          const types = [...new Set(list.map((e) => e.type))];
          const label = `${shortDate(d)}: ${list.map((e) => `${e.label}, ${e.title}`).join('; ')}`;
          html += `<button type="button" class="${cls.join(' ')} has-events" data-key="${d.getTime()}" aria-pressed="${selected === d.getTime()}" aria-label="${label}">
            <span>${n}</span><span class="cal__dots">${types.map((t) => `<span class="cal__dot cal__dot--${t}"></span>`).join('')}</span>
          </button>`;
        } else {
          html += `<span class="${cls.join(' ')}">${n}</span>`;
        }
      }
      daysEl.innerHTML = html;
      renderDetail();
    }

    /* Pop-up with the full details and buttons, copied from the event cards */
    const modal = cal.parentElement.querySelector('[data-cal-modal]');
    const modalTitle = modal && modal.querySelector('[data-cal-modal-title]');
    const modalBody = modal && modal.querySelector('[data-cal-modal-body]');
    let returnFocusKey = null;

    function openModal(d) {
      if (!modal || typeof modal.showModal !== 'function') return false;
      modalTitle.textContent = `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
      modalBody.innerHTML = '';
      (byDay.get(keyOf(d)) || []).forEach((ev) => {
        const item = document.createElement('article');
        item.className = 'cal-modal__event';
        if (ev.video) {
          item.innerHTML = `<p class="event__type">Video readings</p>
            <h3>${ev.title}</h3>
            <ul class="panel__meta">
              <li><svg class="icon" aria-hidden="true"><use href="#i-clock"/></svg> 30 minutes</li>
              <li><svg class="icon" aria-hidden="true"><use href="#i-video"/></svg> From your own home</li>
            </ul>
            <p>Pick a time that suits you. You'll get a confirmation by email straight away.</p>
            <div class="event__actions">
              <a class="btn btn--gold" href="${calendlyDayUrl(d)}" target="_blank" rel="noopener" data-terms><svg class="icon" aria-hidden="true"><use href="#i-calendar"/></svg> Choose a time<span class="visually-hidden"> for a video reading (opens Calendly)</span></a>
            </div>`;
        } else {
          const card = document.getElementById(ev.id);
          item.append(...[...card.querySelector('.event__body').childNodes].map((n) => n.cloneNode(true)));
        }
        modalBody.append(item);
      });
      modal.showModal();
      document.body.style.overflow = 'hidden';
      return true;
    }

    if (modal) {
      modal.querySelector('[data-cal-modal-close]').addEventListener('click', () => modal.close());
      // a click on the dimmed backdrop lands on the dialog itself
      modal.addEventListener('click', (e) => { if (e.target === modal) modal.close(); });
      modal.addEventListener('close', () => {
        document.body.style.overflow = '';
        const btn = daysEl.querySelector(`button[data-key="${returnFocusKey}"]`);
        if (btn) btn.focus();
      });
    }

    daysEl.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-key]');
      if (!btn) return;
      const key = Number(btn.dataset.key);
      selected = key;
      returnFocusKey = key;
      render();
      if (!openModal(new Date(key))) {
        const again = daysEl.querySelector(`button[data-key="${key}"]`);
        if (again) again.focus();
      }
    });

    prevBtn.addEventListener('click', () => {
      shown = new Date(shown.getFullYear(), shown.getMonth() - 1, 1);
      selected = null;
      render();
    });

    nextBtn.addEventListener('click', () => {
      shown = new Date(shown.getFullYear(), shown.getMonth() + 1, 1);
      selected = null;
      render();
    });

    cal.hidden = false;
    render();

    // Swap in live video days if the host provides the feed; otherwise keep the list
    fetch(VIDEO_FEED_URL, { headers: { Accept: 'application/json' } })
      .then((r) => (r.ok ? r.json() : null))
      .then((dates) => {
        if (!Array.isArray(dates)) return;
        indexDays(dates);
        if (allDays.length) {
          minMonth = Math.min(monthIndex(today), monthIndex(allDays[0]));
          maxMonth = Math.max(monthIndex(today), monthIndex(allDays[allDays.length - 1]));
        }
        render();
      })
      .catch(() => {});
  }
}
