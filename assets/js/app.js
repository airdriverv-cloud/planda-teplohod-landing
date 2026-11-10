/* PLANDA · лендинг «Новогодний корпоратив на теплоходе» */
(function () {
  'use strict';

  const fmt = (n) => Math.round(n).toLocaleString('ru-RU').replace(/,/g, ' ');

  /* ---------- КАЛЬКУЛЯТОР ---------- */
  const CLASSES = [
    { id: 'yacht', name: 'речная яхта', max: 30, rent: 25000, banquet: 6000 },
    { id: 'small', name: 'малый теплоход', max: 40, rent: 15000, banquet: 4000 },
    { id: 'mid', name: 'средний теплоход', max: 120, rent: 22000, banquet: 4500 },
    { id: 'large', name: 'большой теплоход', max: 300, rent: 40000, banquet: 5000 }
  ];
  const OPTS = {
    program: { label: 'Программа и артисты', price: 150000 },
    decor: { label: 'Декор и фотозона', price: 80000 },
    transfer: { label: 'Трансфер гостей', price: 45000 },
    photo: { label: 'Фотограф', price: 35000 }
  };
  const SERVICE = 0.15;

  const calcRoot = document.getElementById('calc-app');

  function classFor(guests) {
    return CLASSES.find((c) => guests <= c.max) || CLASSES[CLASSES.length - 1];
  }

  function paintRange(input) {
    const min = +input.min, max = +input.max, val = +input.value;
    const pct = ((val - min) / (max - min)) * 100;
    input.style.setProperty('--fill', pct + '%');
  }

  function recalc() {
    if (!calcRoot) return;
    const guests = +calcRoot.querySelector('[data-calc="guests"]').value;
    const hours = +calcRoot.querySelector('[data-calc="hours"]').value;
    const day = calcRoot.querySelector('[data-day].is-on')?.dataset.day || 'weekday';
    const dayCoef = day === 'weekend' ? 1.25 : 1;
    const cls = classFor(guests);

    let opts = 0;
    const chosen = [];
    calcRoot.querySelectorAll('[data-opt]').forEach((cb) => {
      if (cb.checked) {
        opts += OPTS[cb.dataset.opt].price;
        chosen.push(OPTS[cb.dataset.opt].label);
      }
    });

    const rent = cls.rent * hours * dayCoef;
    const food = cls.banquet * guests * (day === 'weekend' ? 1.1 : 1);
    const sub = rent + food + opts;
    const total = sub * (1 + SERVICE);
    const low = total * 0.88;
    const high = total * 1.14;

    calcRoot.querySelector('[data-out="guests"]').textContent = guests;
    calcRoot.querySelector('[data-out="hours"]').textContent = hours;
    calcRoot.querySelector('[data-out="class"]').textContent = cls.name;
    calcRoot.querySelector('[data-out="total"]').textContent = `${fmt(low)}–${fmt(high)} ₽`;
    calcRoot.querySelector('[data-out="per"]').textContent = `${fmt(low / guests)}–${fmt(high / guests)} ₽`;
    calcRoot.querySelector('[data-out="breakdown"]').innerHTML = [
      ['Аренда судна и экипаж', `${fmt(rent)} ₽`],
      ['Меню, ' + cls.banquet.toLocaleString('ru-RU') + ' ₽/гость', `${fmt(food)} ₽`],
      ['Дополнительно', opts ? `${fmt(opts)} ₽` : '—'],
      ['Сервис и координация, 15 %', `${fmt(sub * SERVICE)} ₽`]
    ].map(([k, v]) => `<li><span>${k}</span><b>${v}</b></li>`).join('');

    calcRoot.querySelectorAll('[data-calc]').forEach(paintRange);

    window.__lastCalc = { guests, hours, day, cls: cls.id, total: Math.round(total), chosen };
  }

  if (calcRoot) {
    calcRoot.addEventListener('input', (e) => {
      if (e.target.matches('[data-calc]')) recalc();
    });
    calcRoot.addEventListener('change', recalc);
    calcRoot.addEventListener('click', (e) => {
      const chip = e.target.closest('[data-day]');
      if (!chip) return;
      calcRoot.querySelectorAll('[data-day]').forEach((c) => c.classList.toggle('is-on', c === chip));
      recalc();
    });
    recalc();
  }

  /* ---------- КВИЗ ---------- */
  const modal = document.getElementById('quiz');
  const state = { step: 1, guests: 60, date: '', format: '', needs: ['Судно', 'Всё под ключ'] };
  let lastFocused = null;

  const steps = modal ? Array.from(modal.querySelectorAll('.quiz__step')) : [];
  const progress = modal ? modal.querySelector('[data-quiz-progress]') : null;

  function showStep(n) {
    steps.forEach((s) => s.classList.toggle('is-active', s.dataset.step === String(n)));
    const numeric = Math.min(n, 5);
    if (progress) progress.style.width = (numeric / 5) * 100 + '%';
    state.step = n;
  }

  function openQuiz(preset) {
    if (!modal) return;
    lastFocused = document.activeElement;
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    if (preset && preset.guests) {
      const range = modal.querySelector('[data-quiz-guests]');
      if (range) { range.value = preset.guests; }
      state.guests = preset.guests;
      const out = modal.querySelector('[data-quiz-guests-out]');
      if (out) out.textContent = preset.guests;
    }
    if (preset && preset.format) {
      state.format = preset.format;
      const chip = modal.querySelector(`[data-quiz-format="${preset.format}"]`);
      if (chip) chip.classList.add('is-on');
    }
    showStep(1);
    const first = modal.querySelector('.quiz__step.is-active h3');
    if (first) first.setAttribute('tabindex', '-1'), first.focus({ preventScroll: true });
    track('quiz_open');
  }

  function closeQuiz() {
    if (!modal) return;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (lastFocused) lastFocused.focus({ preventScroll: true });
  }

  function track(event, params) {
    // Хук под Метрику/GA4: window.ym(ID,'reachGoal',event) и т.п.
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(Object.assign({ event }, params || {}));
    if (typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('pnda:event', { detail: { event, params } }));
    }
  }

  document.addEventListener('click', (e) => {
    const opener = e.target.closest('[data-open-quiz]');
    if (opener) {
      e.preventDefault();
      const fmtMap = { yacht: 'Речная яхта', small: 'Малый теплоход', mid: 'Средний теплоход', large: 'Большой теплоход' };
      const preset = {};
      if (opener.dataset.format) preset.format = fmtMap[opener.dataset.format];
      if (window.__lastCalc && !opener.dataset.format) {
        preset.guests = window.__lastCalc.guests;
      }
      openQuiz(preset);
      return;
    }
    if (e.target.closest('[data-close-quiz]')) { e.preventDefault(); closeQuiz(); }

    const next = e.target.closest('[data-quiz-next]');
    if (next) {
      track('quiz_step_' + state.step);
      showStep(Math.min(state.step + 1, 5));
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal && modal.classList.contains('is-open')) closeQuiz();
  });

  if (modal) {
    const range = modal.querySelector('[data-quiz-guests]');
    const out = modal.querySelector('[data-quiz-guests-out]');
    if (range) {
      paintRange(range);
      range.addEventListener('input', () => {
        state.guests = +range.value;
        out.textContent = range.value;
        paintRange(range);
      });
    }
    modal.querySelectorAll('[data-quiz-preset]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const v = +btn.dataset.quizPreset;
        state.guests = v;
        range.value = v;
        out.textContent = v;
        paintRange(range);
        modal.querySelectorAll('[data-quiz-preset]').forEach((b) => b.classList.toggle('is-on', b === btn));
      });
    });
    modal.querySelectorAll('[data-quiz-date]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.date = btn.dataset.quizDate;
        modal.querySelectorAll('[data-quiz-date]').forEach((b) => b.classList.toggle('is-on', b === btn));
        showStep(3);
      });
    });
    modal.querySelectorAll('[data-quiz-format]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.format = btn.dataset.quizFormat;
        modal.querySelectorAll('[data-quiz-format]').forEach((b) => b.classList.toggle('is-on', b === btn));
        showStep(4);
      });
    });

    const form = modal.querySelector('[data-quiz-form]');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const phone = form.querySelector('[name="phone"]');
      const digits = phone.value.replace(/\D/g, '');
      if (digits.length < 10) {
        phone.classList.add('is-error');
        phone.focus();
        return;
      }
      phone.classList.remove('is-error');
      state.needs = Array.from(modal.querySelectorAll('[data-quiz-need]:checked')).map((c) => c.dataset.quizNeed);
      const lead = {
        name: form.querySelector('[name="name"]').value.trim(),
        phone: phone.value.trim(),
        company: form.querySelector('[name="company"]').value.trim(),
        guests: state.guests,
        date: state.date,
        format: state.format,
        needs: state.needs,
        calc: window.__lastCalc || null,
        page: location.href,
        ts: new Date().toISOString()
      };
      try {
        const all = JSON.parse(localStorage.getItem('pnda_leads') || '[]');
        all.push(lead);
        localStorage.setItem('pnda_leads', JSON.stringify(all));
      } catch (_) { /* приватный режим */ }
      track('lead', { guests: lead.guests, format: lead.format });
      showStep('done');
    });

    form.querySelector('[name="phone"]').addEventListener('input', (e) => {
      e.target.classList.remove('is-error');
      let v = e.target.value.replace(/[^\d+]/g, '');
      if (v.startsWith('8')) v = '+7' + v.slice(1);
      e.target.value = v;
    });
  }

  /* ---------- deep-link: /#quiz открывает квиз ---------- */
  if (location.hash === '#quiz' && modal) {
    setTimeout(() => openQuiz({}), 300);
  }

  /* ---------- плавный скролл к калькулятору для мобильной кнопки ---------- */  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (id.length > 1 && document.querySelector(id)) {
        e.preventDefault();
        document.querySelector(id).scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
})();
