/* Интерфейс: маршрутизация, экраны, уроки. */
(function () {
  'use strict';

  const A = window.App, C = A.COURSE;
  const { $, $$, esc, fmtNum, fmtTime, pct } = A;
  const view = $('#view');

  const TYPE_LABEL = {
    measure: 'Замер', reader: 'Тренажёр', schulte: 'Внимание', wedge: 'Поле зрения',
    scan: 'Поиск', recall: 'Память', flexmatch: 'Решение', checklist: 'Чек-лист', reflection: 'Дневник'
  };

  const ICONS = {
    measure: '<path d="M12 20a8 8 0 1 1 8-8"/><path d="M12 12l4-4"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/>',
    reader: '<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="2.6"/>',
    schulte: '<rect x="3.5" y="3.5" width="17" height="17" rx="3"/><path d="M9 3.5v17M15 3.5v17M3.5 9h17M3.5 15h17"/>',
    wedge: '<path d="M3 19h18M6 15h12M8.5 11h7M11 7h2"/>',
    scan: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
    recall: '<path d="M9.5 4.5a4 4 0 0 0-4 4c0 1 .4 1.9 1 2.6-.6.7-1 1.6-1 2.9a4 4 0 0 0 4 4h.8V4.5z"/><path d="M14.5 4.5a4 4 0 0 1 4 4c0 1-.4 1.9-1 2.6.6.7 1 1.6 1 2.9a4 4 0 0 1-4 4h-.8V4.5z"/>',
    flexmatch: '<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2.2"/><circle cx="8" cy="17" r="2.2"/>',
    checklist: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 12.5l2.5 2.5L16 9.5"/>',
    reflection: '<path d="M4 20l4-1 10-10a2.5 2.5 0 0 0-3.5-3.5L4.5 15.5 4 20z"/><path d="M13.5 6.5l3.5 3.5"/>'
  };

  function icon(type, cls) {
    const body = ICONS[type] || ICONS.reader;
    return '<svg class="' + (cls || 'ex-ic') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' + body + '</svg>';
  }

  function stepHTML(id, n, title, sub, done) {
    return '<button class="step' + (id === 'theory' ? ' on' : '') + (done ? ' done' : '') + '" data-tab="' + id + '">' +
      '<span class="n">' + (done ? '✓' : n) + '</span>' +
      '<div><b>' + esc(title) + '</b><span class="sub">' + esc(sub) + '</span></div></button>';
  }

  function ringSVG(size, stroke, pct, color, track) {
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    const off = c * (1 - Math.max(0, Math.min(100, pct)) / 100);
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '">' +
      '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" style="stroke:' + track + '" stroke-width="' + stroke + '"/>' +
      '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" style="stroke:' + color + '" stroke-width="' + stroke +
      '" stroke-linecap="round" stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + off.toFixed(1) + '"/></svg>';
  }

  /* -------------------------------- темы ------------------------------- */
  const THEME_KEY = 'sr14_theme';
  function currentTheme() { return document.documentElement.getAttribute('data-theme') || 'paper'; }
  function applyTheme(t, silent) {
    const root = document.documentElement;
    root.setAttribute('data-theme', t);
    root.style.colorScheme = t === 'graphite' ? 'dark' : 'light';
    try { localStorage.setItem(THEME_KEY, t); } catch (e) { /* noop */ }
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', t === 'graphite' ? '#0e1014' : (t === 'sand' ? '#f5efe3' : '#3b6ef5'));
    const menu = $('#theme-menu');
    if (menu) menu.hidden = true;
    $$('[data-theme-choice]').forEach(b => b.classList.toggle('on', b.dataset.themeChoice === t));
    if (!silent && parseHash().name === 'progress') render();
  }
  function initTheme() {
    applyTheme(currentTheme(), true);
    const btn = $('#btn-theme'), menu = $('#theme-menu');
    if (!btn || !menu) return;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      menu.hidden = !menu.hidden;
      btn.setAttribute('aria-expanded', String(!menu.hidden));
    });
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.theme-wrap')) { menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); }
    });
    $$('[data-theme-choice]').forEach(b => b.addEventListener('click', () => applyTheme(b.dataset.themeChoice)));
  }

  /* ------------------------------- routing ----------------------------- */
  function parseHash() {
    const h = (location.hash || '#/home').replace(/^#/, '');
    const m = h.match(/^\/day\/(\d+)/);
    if (m) return { name: 'day', day: Math.max(1, Math.min(14, +m[1])) };
    if (h === '/progress') return { name: 'progress' };
    if (h === '/train') return { name: 'train' };
    if (h === '/cheat') return { name: 'cheat' };
    return { name: 'home' };
  }

  function render() {
    window.Train && window.Train.stopAll();
    A.wake.release();
    stopAudio();
    const r = parseHash();
    $$('.mainnav a').forEach(a => a.classList.remove('on'));
    const nav = $('.mainnav a[data-nav="' + (r.name === 'day' ? 'home' : r.name) + '"]');
    if (nav) nav.classList.add('on');
    if (r.name === 'day') renderDay(r.day);
    else if (r.name === 'progress') renderProgress();
    else if (r.name === 'train') renderTrain();
    else if (r.name === 'cheat') renderCheat();
    else renderHome();
    A.renderHud();
    window.scrollTo({ top: 0, behavior: 'instant' in document.documentElement.style ? 'instant' : 'auto' });
  }

  /* -------------------------------- home ------------------------------- */
  function nextDay() {
    for (let d = 1; d <= 14; d++) if (!A.state.days[d]) return d;
    return 14;
  }
  function locked(day) {
    return !(A.state.freeMode || day === 1 || A.state.days[day - 1]);
  }
  function phaseOf(day) {
    return C.phases.find(p => C.lessons[day - 1] && C.lessons[day - 1].phase === p.id) || C.phases[0];
  }

  function heroStat(v, l) {
    return '<div class="hero-stat"><b>' + v + '</b><span>' + l + '</span></div>';
  }

  function renderHome() {
    const st = A.state;
    const nd = nextDay();
    const done = Object.keys(st.days).length;
    const rank = A.rankOf(st.xp);
    const best = st.rec.best;
    const name = st.name ? ', ' + esc(st.name) : '';
    const allDone = done >= 14;

    const daysHTML = C.phases.map(ph => {
      const items = C.lessons.filter(l => l.phase === ph.id).map(l => {
        const isDone = !!st.days[l.day];
        const isLocked = locked(l.day);
        const isCurrent = !isDone && !isLocked && l.day === nd;
        const cls = 'day' + (isDone ? ' done' : '') + (isLocked ? ' locked' : '') + (isCurrent ? ' current' : '');
        const boss = l.exercises.some(e => e.params && e.params.boss);
        const xp = l.exercises.reduce((s, e) => s + e.xp, 0) + l.quiz.xp + 40;
        return '<div class="' + cls + '" data-day="' + l.day + '" role="button" tabindex="0">' +
          '<i class="stripe" style="background:' + ph.color + '"></i>' +
          '<span class="num">ДЕНЬ ' + l.day + '</span>' +
          (isDone ? '<span class="tick">✓</span>' : (isLocked ? '<span class="lock">✕</span>' : '<span class="go">→</span>')) +
          '<span class="t">' + esc(l.title) + '</span>' +
          '<span class="meta"><span class="tag">' + l.minutes + ' мин</span>' +
          (boss ? '<span class="tag boss">босс</span>' : '') +
          '<span>+' + xp + ' XP</span></span>' +
        '</div>';
      }).join('');
      return '<div class="phase-band"><i style="background:' + ph.color + '"></i>' + ph.title +
        ' <span>дни ' + ph.days + ' · ' + esc(ph.desc) + '</span></div>' +
        '<div class="days">' + items + '</div>';
    }).join('');

    const rail = C.phases.map(ph => {
      const ls = C.lessons.filter(l => l.phase === ph.id);
      const dn = ls.filter(l => st.days[l.day]).length;
      const pc = Math.round(dn / ls.length * 100);
      return '<div class="phase-seg" style="--c:' + ph.color + '"><i class="bar-color"></i>' +
        '<b>' + esc(ph.title) + '</b><span>дни ' + ph.days + ' · ' + dn + '/' + ls.length + '</span>' +
        '<div class="fill"><em style="width:' + pc + '%"></em></div></div>';
    }).join('');

    view.innerHTML =
      '<div class="view">' +
      '<section class="hero">' +
        '<svg class="hero-rings" viewBox="0 0 400 400" fill="none" aria-hidden="true">' +
          '<circle cx="200" cy="200" r="130" stroke="#c9d8ff" stroke-width="1.4"/>' +
          '<circle cx="200" cy="200" r="180" stroke="#dbe5ff" stroke-width="1.2"/>' +
          '<circle cx="200" cy="200" r="230" stroke="#e8eeff" stroke-width="1"/>' +
          '<circle cx="200" cy="70" r="7" fill="#3b6ef5"/>' +
          '<circle cx="318" cy="270" r="5" fill="#ff6b2c"/>' +
        '</svg>' +
        '<div class="kicker">14 дней · 20 минут в день · игровой режим</div>' +
        '<h1>Скорость чтения, которая не съедает смысл' + name + '</h1>' +
        '<p class="lead">' + esc(C.meta.tagline) + ' Каждый день — короткая теория, тренажёры и проверка. ' +
        'Задания засчитываются только вместе с пониманием: пролистать быстрее — не значит прочитать.</p>' +
        '<div class="cta-row">' +
          '<a class="btn btn-primary" href="#/day/' + nd + '">' + (allDone ? 'Повторить финальный день' : (done ? 'Продолжить: день ' + nd : 'Начать: день 1')) + ' →</a>' +
          '<button class="btn btn-ghost" data-help>Как играть</button>' +
        '</div>' +
        '<div class="hero-stats">' +
          heroStat(fmtNum(st.xp), 'опыта · ' + rank.name) +
          heroStat(st.streak || 0, 'дней подряд') +
          heroStat(best.wpm || '—', 'лучшая скорость, слов/мин') +
        '</div>' +
      '</section>' +

      '<section class="section" style="margin-top:16px">' +
        '<div class="panel panel-pad" style="display:flex;align-items:center;gap:26px;flex-wrap:wrap">' +
          '<div style="min-width:180px">' +
            '<div style="font-size:10.5px;font-weight:800;letter-spacing:.1em;color:var(--accent)">20 МИНУТ</div>' +
            '<h3 style="font-size:18px;margin-top:3px">Как устроен день</h3>' +
          '</div>' +
          '<div class="flow">' +
            [['1', 'Теория', '3–4 минуты', 'reader'], ['2', 'Практика', '10–12 минут', 'schulte'],
             ['3', 'Проверка', '3 минуты', 'checklist'], ['4', 'Итог', '1–2 минуты', 'reflection']]
              .map(st => '<div class="flow-step"><span class="n">' + st[0] + '</span>' + icon(st[3]) +
                '<div><b>' + st[1] + '</b><span>' + st[2] + '</span></div></div>').join('') +
          '</div>' +
        '</div>' +
      '</section>' +

      '<section class="section">' +
        '<div class="section-head"><h2>Карта курса</h2>' +
        '<span class="hint">Пройдено ' + done + ' из 14 дней · откроется следующий, когда закроете текущий</span></div>' +
        '<div class="phase-rail">' + rail + '</div>' +
        daysHTML +
      '</section>' +

      '<section class="section">' +
        '<div class="section-head"><h2>Ваши цифры</h2><a class="hint" href="#/progress">Весь прогресс →</a></div>' +
        '<div class="tiles">' +
          tile(st.rec.baseline ? st.rec.baseline.wpm : '—', 'стартовая скорость') +
          tile(best.wpm || '—', 'лучшая скорость') +
          tile(best.comp || '—', 'лучшее понимание, %') +
          tile(st.rec.best.eff || '—', 'эффективная скорость') +
        '</div>' +
        '<p class="footer-note" style="margin-top:22px">Версия ' + A.VERSION + ' · ' + A.VERSION_DATE +
        ' · <a href="https://github.com/baikalworks/speed-reading/releases" target="_blank" rel="noopener">история версий и резервные копии</a>' +
        ' · <a href="#" data-restart>начать заново</a></p>' +
      '</section>' +
      '</div>';

    $$('.day', view).forEach(d => {
      const go = () => {
        const day = +d.dataset.day;
        if (locked(day)) {
          A.toast('Сначала закройте день ' + (day - 1), 'bad', '✕');
          return;
        }
        location.hash = '#/day/' + day;
      };
      d.addEventListener('click', go);
      d.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
    });
    $('[data-help]', view).addEventListener('click', helpModal);
    $$('[data-restart]', view).forEach(a => a.addEventListener('click', (e) => {
      e.preventDefault();
      confirmReset();
    }));
  }
  function tile(v, l) {
    return '<div class="tile"><b>' + v + '</b><span>' + l + '</span></div>';
  }

  /* -------------------------------- day -------------------------------- */
  function planExtras(L, day, budget) {
    const n = budget <= 20 ? 0 : budget <= 25 ? 1 : budget <= 30 ? 2 : 3;
    if (!n) return [];
    const custom = (A.state.useCustom && (A.state.customText || '').trim().length > 100)
      ? A.state.customText.trim() : '';
    const t = custom ? { text: custom, title: 'Мой текст' } : { textKey: pickTextKey() };
    const pool = [
      { type: 'timedread', title: 'Чтение на время', xp: 25, optional: true,
        instruction: 'Текст на 90 секунд. Успейте дочитать — таймер подгоняет темп.',
        params: Object.assign({ seconds: 90, questions: [] }, t) },
      { type: 'schulte', title: 'Шульте 5×5 — разминка', xp: 15, optional: true,
        instruction: 'Один подход. Взгляд в центре, голову не поворачивайте.',
        params: { size: 5, rounds: 1, targetSec: 55 } },
      { type: 'wedge', title: 'Клин — захват строки', xp: 15, optional: true,
        instruction: 'Один подход, чтение вслух, взгляд в центре строки.',
        params: { rows: 7, targetSec: 35 } },
      { type: 'reader', title: 'RSVP на скорости', xp: 20, optional: true,
        instruction: 'Слова сменяются в темпе 380. Держите ритм, без проговаривания.',
        params: Object.assign({ mode: 'rsvp', wpm: 380, questions: [] }, t) }
    ];
    const out = [];
    for (let i = 0; i < n; i++) out.push(JSON.parse(JSON.stringify(pool[i % pool.length])));
    return out;
  }

  function nextDayNavHTML(day) {
    if (day >= 14) return '<a class="btn btn-ghost" href="#/home">На карту курса</a>';
    const st = A.state;
    const unlocked = A.lessonReady(day) || !!st.days[day];
    if (unlocked) return '<a class="btn btn-ghost" href="#/day/' + (day + 1) + '">День ' + (day + 1) + ' →</a>';
    return '<span class="muted" style="font-size:13px;align-self:center">Следующий день откроется после проверки</span>';
  }

  function updateDayNav() {
    const slot = $('[data-daynav-next]', view);
    if (!slot) return;
    slot.innerHTML = nextDayNavHTML(parseHash().day);
  }

  function renderDay(day) {
    const L = C.lessons[day - 1];
    const st = A.state;
    if (locked(day)) {
      view.innerHTML = '<div class="view"><div class="panel panel-pad" style="text-align:center;padding:46px 30px">' +
        '<div style="font-size:34px;margin-bottom:10px">✕</div>' +
        '<h1 style="font-size:26px;margin-bottom:8px">День ' + day + ' пока закрыт</h1>' +
        '<p class="muted">Сначала завершите день ' + (day - 1) + '. Так курс держит ритм: каждый следующий навык опирается на предыдущий.</p>' +
        '<div style="display:flex;gap:10px;justify-content:center;margin-top:18px">' +
        '<a class="btn btn-primary" href="#/day/' + (day - 1) + '">К дню ' + (day - 1) + '</a>' +
        '<a class="btn btn-ghost" href="#/home">На карту курса</a></div></div></div>';
      return;
    }

    const ph = phaseOf(day);
    const isDone = !!st.days[day];
    const mainEx = L.exercises.filter(e => !(e.params && e.params.boss) && !e.optional);
    const doneCount = mainEx.filter((e) => {
      const idx = L.exercises.indexOf(e);
      const s = st.ex[A.exKey(day, idx)];
      return s && s.done;
    }).length;
    const quizDone = !!st.quiz[day];
    const ready = A.lessonReady(day);
    const totalXp = L.exercises.filter(e => !e.optional).reduce((s, e) => s + e.xp, 0) + L.quiz.xp + 40;
    const extraXp = L.exercises.filter(e => e.optional).reduce((s, e) => s + e.xp, 0);

    view.innerHTML =
      '<div class="view">' +
      '<div class="lesson-head">' +
        '<div class="crumbs"><a href="#/home">Курс</a> · ' + ph.title + ' · дни ' + ph.days + '</div>' +
        '<h1>' + esc(L.title) + '</h1>' +
        '<p class="goal">' + esc(L.goal) + '</p>' +
        '<div class="lesson-meta">' +
          '<div class="day-ring" title="Прогресс дня">' +
            ringSVG(46, 5, (doneCount + (quizDone ? 1 : 0)) / (mainEx.length + 1) * 100, 'var(--accent)', 'var(--ring-track)') +
            '<span class="lbl">' + (doneCount + (quizDone ? 1 : 0)) + '/' + (mainEx.length + 1) + '</span>' +
          '</div>' +
          '<span class="tag" style="background:' + ph.color + '1a;color:' + ph.color + '">День ' + day + '</span>' +
          '<span class="tag">' + (st.dailyMinutes || L.minutes) + ' минут</span>' +
          '<span class="tag">до +' + totalXp + ' XP</span>' +
          (extraXp ? '<span class="tag">+' + extraXp + ' XP за дополнительные</span>' : '') +
          (isDone ? '<span class="tag" style="background:var(--green-soft);color:#0b6b51">день закрыт ✓</span>' : '') +
          (L.exercises.some(e => e.params && e.params.boss) ? '<span class="tag boss">есть босс</span>' : '') +
        '</div>' +
      '</div>' +

      (isDone ? '<div class="callout" style="border-color:var(--green);background:var(--green-soft)">' +
        '<b>День пройден</b>Можно повторять упражнения и улучшать личные рекорды. XP за повтор не начисляется.</div>' : '') +

      '<div class="steps">' +
        stepHTML('theory', '1', 'Теория', '3–4 мин', true) +
        '<span class="step-arrow">→</span>' +
        stepHTML('train', '2', 'Практика', doneCount + '/' + mainEx.length, doneCount === mainEx.length) +
        '<span class="step-arrow">→</span>' +
        stepHTML('check', '3', 'Проверка', quizDone ? 'готово' : L.quiz.questions.length + ' вопроса', quizDone) +
        '<span class="step-arrow">→</span>' +
        '<div class="step" style="cursor:default;opacity:.9"><span class="n">' + (isDone ? '✓' : '4') + '</span>' +
          '<div><b>Итог</b><span>' + (isDone ? 'день закрыт' : '+40 XP') + '</span></div></div>' +
      '</div>' +

      '<div data-pane="theory">' + theoryHTML(L) +
        '<div class="next-cta"><button class="btn btn-primary" data-goto="train">К практике →</button></div>' +
      '</div>' +
      '<div data-pane="train" style="display:none">' +
        '<div class="tiles" style="margin-bottom:18px">' +
          tile(doneCount + '/' + mainEx.length, 'упражнений выполнено') +
          tile(L.exercises.length, 'всего заданий') +
          tile(L.quiz.questions.length, 'вопросов проверки') +
        '</div>' +
        '<div data-exlist></div>' +
        '<div data-planlist></div>' +
        '<div data-finish style="margin-top:20px"></div>' +
      '</div>' +
      '<div data-pane="check" style="display:none" data-checkpane></div>' +
      '<div style="margin-top:34px;display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap">' +
        (day > 1 ? '<a class="btn btn-ghost" href="#/day/' + (day - 1) + '">← День ' + (day - 1) + '</a>' : '<span></span>') +
        '<span data-daynav-next>' + nextDayNavHTML(day) + '</span>' +
      '</div>' +
      '</div>';

    // шаги урока
    const steps = $$('.steps .step[data-tab]', view);
    const panes = $$('[data-pane]', view);
    function showTab(name) {
      steps.forEach(b => b.classList.toggle('on', b.dataset.tab === name));
      panes.forEach(p => { p.style.display = p.dataset.pane === name ? '' : 'none'; });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    steps.forEach(b => b.addEventListener('click', () => showTab(b.dataset.tab)));
    $$('[data-goto]', view).forEach(b => b.addEventListener('click', () => showTab(b.dataset.goto)));

    // упражнения: основные, дополнительные и план по выбранному времени
    const list = $('[data-exlist]', view);
    const planHost = $('[data-planlist]', view);
    const plan = planExtras(L, day, st.dailyMinutes || 20);
    const items = L.exercises.map((ex, i) => ({ ex: ex, idx: i, plan: false }))
      .concat(plan.map((ex, i) => ({ ex: ex, idx: 300 + i, plan: true })));
    let planItems = null;
    if (plan.length) {
      planHost.innerHTML = '<div class="section-head" style="margin:28px 0 12px">' +
        '<h2 style="font-size:18px">Ещё ' + plan.length + ' задания по вашему плану</h2>' +
        '<span class="hint">' + (st.dailyMinutes || 20) + ' минут в день · для закрытия дня не обязательны</span></div>' +
        '<div data-planitems></div>';
      planItems = planHost.querySelector('[data-planitems]');
    }
    items.forEach((item) => {
      const ex = item.ex, idx = item.idx;
      const isPlan = item.plan;
      const host = isPlan ? planItems : list;
      const card = document.createElement('div');
      card.className = 'ex';
      const isBoss = !!(ex.params && ex.params.boss);
      const isOpt = !!ex.optional;
      const saved = st.ex[A.exKey(day, idx)];
      if (saved && saved.done) card.classList.add('done');
      card.innerHTML =
        '<div class="ex-head">' +
          '<span class="kind' + (isBoss ? ' boss' : '') + '">' +
            (isBoss ? 'Босс' : (isPlan ? 'План' : (isOpt ? 'Дополнительно' : (TYPE_LABEL[ex.type] || 'Задание')))) + '</span>' +
          icon(ex.type) +
          '<div><h4>' + esc(ex.title) + '</h4><div class="hint">' + esc(ex.instruction) + '</div></div>' +
          '<span class="xp">' + (saved && saved.done ? '✓ ' : '+') + ex.xp + ' XP</span>' +
        '</div>' +
        '<div class="ex-body"></div>';
      host.appendChild(card);
      const body = card.querySelector('.ex-body');

      const ctx = {
        day: day, idx: idx, ex: ex,
        complete(result, exx, extra) {
          const merged = Object.assign({}, result || {}, extra || {});
          const r = A.completeExercise(day, idx, exx || ex, merged);
          if (r && r.failed) {
            card.classList.remove('done');
            card.querySelector('.xp').textContent = '+' + ex.xp + ' XP';
            const retry = document.createElement('button');
            retry.className = 'btn btn-primary btn-sm';
            retry.textContent = 'Попробовать снова';
            retry.style.marginTop = '12px';
            retry.addEventListener('click', () => {
              body.innerHTML = '';
              window.Train[ex.type](body, ex, ctx);
            });
            body.appendChild(retry);
            updateFin();
            refreshTiles();
            return;
          }
          card.classList.add('done');
          card.querySelector('.xp').textContent = '✓ ' + ex.xp + ' XP';
          const sum = summaryLine(ex, merged);
          if (sum) {
            const s = document.createElement('div');
            s.className = 'ex-status';
            s.innerHTML = '<span>✓</span><span>' + esc(sum) + '</span>';
            card.querySelector('.ex-head').appendChild(s);
          }
          updateFin();
          refreshTiles();
          updateDayNav();
        }
      };

      // повторная попытка: босс, который не пройден, показываем заново сразу
      if (saved && saved.done && !(isBoss)) {
        const note = document.createElement('div');
        note.className = 'callout';
        note.style.margin = '0 0 14px';
        note.innerHTML = '<b>Уже выполнено</b>' + esc(summaryLine(ex, saved) || 'Результат сохранён.') +
          ' Можно пройти заново — рекорды обновятся, XP за повтор не начисляется.';
        body.appendChild(note);
        const btn = document.createElement('button');
        btn.className = 'btn btn-ghost btn-sm';
        btn.textContent = 'Пройти заново';
        btn.addEventListener('click', () => {
          body.innerHTML = '';
          window.Train[ex.type](body, ex, ctx);
          btn.remove();
        });
        body.appendChild(btn);
      } else {
        window.Train[ex.type](body, ex, ctx);
      }
    });

    function refreshTiles() {
      const doneN = mainEx.filter((e) => {
        const i = L.exercises.indexOf(e);
        const s = A.state.ex[A.exKey(day, i)];
        return s && s.done;
      }).length;
      const tiles = $$('[data-pane="train"] .tile b');
      if (tiles[0]) tiles[0].textContent = doneN + '/' + mainEx.length;
      const tab = $('.steps [data-tab="train"] .sub');
      if (tab) tab.textContent = doneN + '/' + mainEx.length;
    }

    function updateFin() {
      const host = $('[data-finish]', view);
      const readyNow = A.lessonReady(day);
      if (A.state.days[day]) {
        host.innerHTML = '<div class="callout" style="border-color:var(--green);background:var(--green-soft)"><b>День закрыт</b>Возвращайтесь завтра — или повторите тренажёры, чтобы закрепить.</div>';
        return;
      }
      const needEx = mainEx.length - mainEx.filter((e) => {
        const i = L.exercises.indexOf(e); const s = A.state.ex[A.exKey(day, i)]; return s && s.done;
      }).length;
      if (!needEx && !A.state.quiz[day]) {
        host.innerHTML = '<div class="callout" style="border-color:var(--accent);background:var(--accent-soft)">' +
          '<b>Практика готова</b>Осталась проверка — три вопроса по теории дня.</div>' +
          '<div class="next-cta" style="justify-content:flex-start"><button class="btn btn-primary" data-goto="check">К проверке →</button></div>';
        const b = host.querySelector('[data-goto]');
        if (b) b.addEventListener('click', () => showTab('check'));
        return;
      }
      if (!readyNow) {
        host.innerHTML = '<p class="muted" style="font-size:14px">Чтобы закрыть день, осталось: ' +
          (needEx ? 'выполнить упражнений — ' + needEx : '') +
          (needEx && !A.state.quiz[day] ? ' и ' : '') +
          (!A.state.quiz[day] ? 'пройти проверку' : '') + '.</p>';
        return;
      }
      host.innerHTML = '<button class="btn btn-primary" data-close-day style="width:100%;padding:15px">' +
        'Закрыть день ' + day + ' и получить +40 XP</button>';
      host.querySelector('[data-close-day]').addEventListener('click', () => {
        A.completeLesson(day);
        setTimeout(render, 260);
      });
    }
    updateFin();

    // quiz
    renderQuiz(day, $('[data-checkpane]', view));
    wireCalc();
    wireTheoryAudio();
  }

  function summaryLine(ex, r) {
    if (!r) return '';
    if (r.wpm) return Math.round(r.wpm) + ' слов/мин · ' + (r.comp != null ? r.comp : '—') + '% понимания';
    if (r.seconds != null && ex.type === 'schulte') return 'лучший раунд ' + r.seconds + ' с';
    if (r.seconds != null && ex.type === 'wedge') return r.seconds + ' с' + (r.ok ? ' · без ошибок' : '');
    if (r.score != null && r.total) return 'верно ' + r.score + ' из ' + r.total;
    if (r.hits != null) return 'ключевых пунктов ' + r.hits + ' из ' + r.total;
    if (r.checked) return 'пунктов отмечено: ' + r.checked;
    if (r.chars) return 'записано ' + r.chars + ' символов';
    return '';
  }

  function wordize(text, start) {
    let i = start;
    const out = String(text).split(/(\s+)/).map(part => {
      if (!part) return '';
      if (/^\s+$/.test(part)) return part;
      i++;
      return '<span class="tw" data-wi="' + (i - 1) + '">' + esc(part) + '</span>';
    }).join('');
    return { html: out, next: i };
  }

  function theoryHTML(L) {
    let wi = 0;
    const blocks = L.theory.map((b, i) => {
      let inner = '';
      if (b.h) {
        const h = wordize(b.h, wi);
        wi = h.next;
        inner += '<h3>' + h.html + '</h3>';
      }
      if (b.p) {
        const p = wordize(b.p, wi);
        wi = p.next;
        inner += '<p>' + p.html + '</p>';
      }
      if (b.list) inner += '<ul>' + b.list.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul>';
      return '<div class="block theory-block" data-block="' + (i + 1) + '">' + inner + '</div>';
    }).join('');

    const hasAudio = !!(window.THEORY_AUDIO && window.THEORY_AUDIO[String(L.day)]);
    const player = hasAudio ? '<div class="audio-card" data-theory-audio>' +
      '<button class="play" type="button" aria-label="Слушать теорию"></button>' +
      '<div class="meta"><b>Слушать теорию</b><div class="audio-bar" data-bar><i data-fill></i></div></div>' +
      '<select class="audio-select" data-voice aria-label="Голос">' +
        '<option value="svetlana"' + (A.state.voice !== 'dmitry' ? ' selected' : '') + '>Светлана</option>' +
        '<option value="dmitry"' + (A.state.voice === 'dmitry' ? ' selected' : '') + '>Дмитрий</option>' +
      '</select>' +
      '<select class="audio-select" data-rate aria-label="Скорость">' +
        [1, 1.15, 1.3].map(r => '<option value="' + r + '"' +
          (Math.abs((A.state.audioRate || 1.15) - r) < 0.01 ? ' selected' : '') + '>' +
          String(r).replace('.', ',') + '×</option>').join('') +
      '</select>' +
      '<span class="audio-time" data-time>0:00</span></div>' +
      '<div class="karaoke-hint">Абзац подсвечивается по ходу озвучки, прочитанное становится серым. Можно нажать на любой абзац.</div>' : '';

    const calc = L.fig && L.fig.indexOf('fig_metrics') >= 0
      ? '<div class="calc" data-calc>' +
          '<div class="calc-row"><label>Скорость чтения, слов в минуту</label>' +
            '<input type="number" data-speed value="240" min="60" max="900" step="10"></div>' +
          '<div class="calc-row"><label>Понимание, %</label>' +
            '<input type="number" data-comp value="60" min="0" max="100" step="5"></div>' +
          '<div class="calc-out">Эффективная скорость <b data-eff>144</b> слов/мин</div>' +
          '<p class="calc-note">Это интерактивный калькулятор, а не ваши данные. Подставьте числа из своего замера: ' +
          'скорость × понимание ÷ 100.</p>' +
        '</div>'
      : '';

    const fig = L.fig && L.fig.indexOf('fig_metrics') < 0
      ? '<figure><img src="assets/' + L.fig + '" alt="' + esc(L.fig_caption || '') + '" loading="lazy">' +
        '<figcaption>' + esc(L.fig_caption || '') + '</figcaption></figure>'
      : '';

    return '<div class="theory">' +
      player +
      calc +
      fig +
      blocks +
      (L.bullets && L.bullets.length ? '<div class="bullets"><ul>' + L.bullets.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul></div>' : '') +
      (L.takeaway ? '<div class="callout"><b>Главное за 20 секунд</b>' + esc(L.takeaway) + '</div>' : '') +
      (L.bonus ? '<div class="panel panel-pad" style="margin-top:18px"><h3>Бонус дня</h3><p class="muted" style="margin:0">' + esc(L.bonus) + '</p></div>' : '') +
      '</div>';
  }

  function renderQuiz(day, host) {
    const L = C.lessons[day - 1];
    const prev = A.state.quiz[day];
    host.innerHTML = '<div class="panel panel-pad" style="margin-bottom:16px">' +
      '<h3>Проверка дня ' + day + '</h3>' +
      '<p class="muted" style="margin-bottom:0">' + L.quiz.questions.length + ' вопроса · +' + L.quiz.xp + ' XP за первую попытку. ' +
      'Отвечайте по памяти — подглядывать в текст бессмысленно: проверяется не память о тексте, а усвоение идеи.</p></div>' +
      (prev ? '<div class="callout"><b>Предыдущий результат: ' + prev.score + ' из ' + prev.total + '</b>' +
        'Можно пройти заново — вопросы те же, XP не начисляется.</div>' : '') +
      '<div data-quiz></div>';
    window.Train.askQuestions(host.querySelector('[data-quiz]'), L.quiz.questions, (res) => {
      const before = A.state.quiz[day];
      A.completeQuiz(day, res.score, res.total, L.quiz.xp);
      const box = document.createElement('div');
      box.className = 'result ' + (res.score === res.total ? 'win' : '');
      box.innerHTML = '<h4>' + (res.score === res.total ? 'Идеально' : 'Результат: ' + res.score + ' из ' + res.total) + '</h4>' +
        '<div class="msg">' + (res.score === res.total
          ? 'Материал усвоен. День можно закрывать.'
          : 'Разберите объяснения под вопросами — и возвращайтесь к теории, если тема ещё «не села».') + '</div>';
      host.appendChild(box);
      if (!before) A.toast('+' + L.quiz.xp + ' XP · проверка', 'xp', '✓');
      updateDayNav();
      const t = document.querySelector('.steps [data-tab="check"]');
      if (t && !t.querySelector('.dot') && !t.classList.contains('done')) t.insertAdjacentHTML('beforeend', '<span class="dot"></span>');
      const fin = $('[data-finish]', view);
      if (fin) {
        // пересобрать кнопку закрытия дня
        const ev = document.querySelector('[data-close-day]');
        if (!ev && A.lessonReady(day) && !A.state.days[day]) {
          fin.innerHTML = '<button class="btn btn-primary" data-close-day style="width:100%;padding:15px">Закрыть день ' + day + ' и получить +40 XP</button>';
          fin.querySelector('[data-close-day]').addEventListener('click', () => { A.completeLesson(day); setTimeout(render, 260); });
        }
      }
    });
  }

  /* ------------------------------ progress ----------------------------- */
  function cssVar(name, fallback) {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  }

  function chartSVG(measures) {
    if (!measures.length) {
      return '<div class="empty">Пока нет замеров. Пройдите день 1 — и здесь появится график скорости и понимания.</div>';
    }
    const W = 760, H = 280, P = { l: 46, r: 52, t: 16, b: 34 };
    const cGrid = cssVar('--grid', '#eef1f7');
    const cMuted = cssVar('--muted', '#98a1b3');
    const cAccent = cssVar('--accent', '#3b6ef5');
    const cGreen = cssVar('--green', '#0f9d76');
    const iw = W - P.l - P.r, ih = H - P.t - P.b;
    const n = measures.length;
    const xs = i => n === 1 ? P.l + iw / 2 : P.l + iw * i / (n - 1);
    const ySpeed = v => P.t + ih - Math.min(1, v / 500) * ih;
    const yComp = v => P.t + ih - Math.min(1, v / 100) * ih;
    let g = '';
    for (let i = 0; i <= 4; i++) {
      const y = P.t + ih * i / 4;
      g += '<line x1="' + P.l + '" y1="' + y + '" x2="' + (W - P.r) + '" y2="' + y + '" stroke="' + cGrid + '"/>';
      g += '<text x="' + (P.l - 10) + '" y="' + (y + 4) + '" text-anchor="end" font-size="11" fill="' + cMuted + '">' + (500 - 125 * i) + '</text>';
      g += '<text x="' + (W - P.r + 10) + '" y="' + (y + 4) + '" font-size="11" fill="' + cMuted + '">' + (100 - 25 * i) + '</text>';
    }
    const sp = measures.map((m, i) => xs(i) + ',' + ySpeed(m.wpm)).join(' ');
    const cp = measures.map((m, i) => xs(i) + ',' + yComp(m.comp)).join(' ');
    const dots = measures.map((m, i) =>
      '<circle cx="' + xs(i) + '" cy="' + ySpeed(m.wpm) + '" r="4.5" fill="' + cssVar('--panel', '#fff') + '" stroke="' + cAccent + '" stroke-width="2.5">' +
      '<title>День ' + m.day + ': ' + m.wpm + ' слов/мин, ' + m.comp + '%</title></circle>').join('');
    const labels = measures.map((m, i) => '<text x="' + xs(i) + '" y="' + (H - 12) + '" text-anchor="middle" font-size="11" fill="' + cMuted + '">' + (m.label || ('д.' + m.day)) + '</text>').join('');
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" style="width:100%;height:auto;min-width:520px">' +
      g +
      '<polyline points="' + sp + '" fill="none" stroke="' + cAccent + '" stroke-width="2.6" stroke-linejoin="round"/>' +
      '<polyline points="' + cp + '" fill="none" stroke="' + cGreen + '" stroke-width="2" stroke-dasharray="5 4"/>' +
      dots + labels + '</svg>';
  }

  function renderProgress() {
    const st = A.state;
    const m = st.rec.measures;
    const rank = A.rankOf(st.xp);
    const done = Object.keys(st.days).length;
    const ach = C.achievements;
    const got = ach.filter(a => st.ach[a.id]).length;

    const journalKeys = Object.keys(st.journal).filter(k => (st.journal[k] || '').trim()).sort((a, b) => +a - +b);

    view.innerHTML =
      '<div class="view">' +
      '<div class="section-head" style="margin-top:6px"><h1 style="font-size:30px">Прогресс</h1>' +
      '<span class="hint">' + esc(st.name ? st.name + ' · ' : '') + 'с нами с ' + new Date(st.created).toLocaleDateString('ru-RU') + '</span></div>' +

      '<div class="panel rank-card" style="margin-bottom:16px">' +
        '<div class="rank-ring">' + ringSVG(118, 8, rank.progress, 'var(--accent)', 'var(--ring-track)') +
          '<div class="inner"><b>' + esc(rank.name) + '</b><span>' + Math.round(rank.progress) + '%</span></div></div>' +
        '<div><h2 style="font-size:20px;margin-bottom:4px">' + esc(rank.name) + '</h2>' +
        '<p class="muted" style="margin:0;font-size:14px">' + fmtNum(st.xp) + ' XP' +
        (rank.next ? ' · до ранга «' + esc(rank.next) + '» — ' + fmtNum(Math.max(0, rank.nextAt - st.xp)) + ' XP'
          : ' · высший ранг') + '</p></div>' +
      '</div>' +

      '<div class="tiles" style="margin-bottom:22px">' +
        tile(fmtNum(st.xp), 'опыта · ' + rank.name) +
        tile(done + ' / 14', 'дней закрыто') +
        tile(st.streak || 0, 'текущая серия') +
        tile(st.bestStreak || 0, 'лучшая серия') +
        tile(got + ' / ' + ach.length, 'достижений') +
      '</div>' +

      '<div class="section"><div class="section-head"><h2>Скорость и понимание</h2>' +
      '<span class="hint">Синяя линия — слов/мин, зелёная — понимание, %</span></div>' +
      '<div class="chart-box"><div class="chart-legend"><span><i style="background:#3b6ef5"></i>скорость</span>' +
      '<span><i style="background:#0f9d76"></i>понимание</span></div>' + chartSVG(m) + '</div></div>' +

      '<div class="cheat-grid" style="margin-top:22px">' +
        '<div class="panel panel-pad"><h3>Личные рекорды</h3>' +
          '<div class="formula-row"><span>Стартовая скорость</span><b>' + (st.rec.baseline ? st.rec.baseline.wpm + ' сл/мин' : '—') + '</b></div>' +
          '<div class="formula-row"><span>Стартовое понимание</span><b>' + (st.rec.baseline ? st.rec.baseline.comp + '%' : '—') + '</b></div>' +
          '<div class="formula-row"><span>Лучшая скорость</span><b>' + (st.rec.best.wpm || '—') + ' сл/мин</b></div>' +
          '<div class="formula-row"><span>Лучшее понимание</span><b>' + (st.rec.best.comp || '—') + '%</b></div>' +
          '<div class="formula-row"><span>Эффективная скорость</span><b>' + (st.rec.best.eff || '—') + '</b></div>' +
          '<div class="formula-row"><span>Шульте 5×5</span><b>' + (st.rec.schulte[5] ? st.rec.schulte[5].toFixed(1) + ' с' : '—') + '</b></div>' +
          '<div class="formula-row"><span>Клин</span><b>' + (st.rec.wedge ? st.rec.wedge + ' с' : '—') + '</b></div>' +
        '</div>' +
        '<div class="panel panel-pad"><h3>Достижения</h3><div class="ach-grid" style="grid-template-columns:1fr 1fr">' +
          ach.map(a => '<div class="ach ' + (st.ach[a.id] ? 'on' : 'off') + '"><span class="ic">' + esc(a.icon) + '</span>' +
            '<span><b>' + esc(a.title) + '</b><span>' + esc(a.desc) + '</span></span></div>').join('') +
        '</div></div>' +
      '</div>' +

      '<div class="section"><div class="section-head"><h2>История замеров</h2></div>' +
        '<div class="panel" style="padding:6px 20px 10px;overflow:auto">' +
        (m.length ? '<table class="data"><thead><tr><th>Когда</th><th>Замер</th><th>Слов/мин</th><th>Понимание</th><th>Эффективная</th></tr></thead><tbody>' +
          m.slice().reverse().map(x => '<tr><td>' + new Date(x.at).toLocaleDateString('ru-RU') + ' ' +
            new Date(x.at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) + '</td><td>' +
            esc(x.label || '—') + '</td><td><b>' + x.wpm + '</b></td><td>' + x.comp + '%</td><td><b>' + x.eff + '</b></td></tr>').join('') +
          '</tbody></table>' : '<p class="empty">Замеров пока нет.</p>') +
        '</div></div>' +

      '<div class="section"><div class="section-head"><h2>Дневник</h2><span class="hint">ваши ответы из уроков</span></div>' +
        '<div class="panel panel-pad">' +
        (journalKeys.length ? journalKeys.map(k => '<div class="journal-item"><div class="when">День ' + k + ' · ' +
          esc(C.lessons[+k - 1].title) + '</div><p>' + esc(st.journal[k]) + '</p></div>').join('')
          : '<p class="empty">Пока пусто. Дневник появляется после рефлексий в уроках 1, 11, 13 и 14.</p>') +
        '</div></div>' +

      '<div class="section"><div class="section-head"><h2>Оформление</h2>' +
      '<span class="hint">тема применяется сразу и запоминается</span></div>' +
        '<div class="theme-cards">' +
          [['paper', '#3b6ef5', 'Бумага', 'светлая, синий акцент'],
           ['graphite', '#0e1014', 'Графит', 'тёмная, для вечера'],
           ['sand', '#a1521a', 'Тёплая бумага', 'сепия, издательский вид']]
            .map(t => '<button type="button" class="theme-card' + (currentTheme() === t[0] ? ' on' : '') +
              '" data-theme-card="' + t[0] + '"><i style="background:' + t[1] + '"></i>' +
              '<span><b style="display:block;font-size:13px">' + t[2] + '</b>' +
              '<span style="font-size:11.5px;color:var(--muted)">' + t[3] + '</span></span></button>').join('') +
        '</div></div>' +

      '<div class="section"><div class="section-head"><h2>Данные</h2></div>' +
        '<div class="panel panel-pad" style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">' +
          '<span class="muted" style="font-size:13px">Время в день:</span>' +
          [20, 25, 30, 35, 40].map(m => '<button class="choice' + ((st.dailyMinutes || 20) === m ? ' on' : '') +
            '" data-budget="' + m + '">' + m + '</button>').join('') +
          '<span class="hint" style="margin-left:6px">больше 20 минут — добавляются тренажёры и чтение с таймером</span>' +
        '</div>' +
        '<div class="panel panel-pad" style="display:flex;gap:10px;flex-wrap:wrap;margin-top:12px">' +
          '<button class="btn btn-ghost btn-sm" data-export>Скачать прогресс (JSON)</button>' +
          '<button class="btn btn-ghost btn-sm" data-install>Установить на телефон</button>' +
          '<button class="btn btn-ghost btn-sm" data-free>' + (st.freeMode ? 'Включить последовательный режим' : 'Открыть все дни') + '</button>' +
          '<button class="btn btn-ghost btn-sm" data-reset style="color:#a12a20;border-color:#f3d3cf">Начать заново</button>' +
        '</div>' +
        '<p class="footer-note">' + esc(C.meta.note) + '</p>' +
        '<p class="footer-note">Версия ' + A.VERSION + ' · ' + A.VERSION_DATE + '</p></div>' +
      '</div>';

    $('[data-export]', view).addEventListener('click', () => {
      const blob = new Blob([JSON.stringify(A.state, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'skorochtenie-progress.json';
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    });
    $('[data-free]', view).addEventListener('click', () => {
      A.state.freeMode = !A.state.freeMode;
      A.save();
      renderProgress();
      A.toast(A.state.freeMode ? 'Все дни открыты' : 'Снова последовательный режим', '', '✓');
    });
    const instBtn = $('[data-install]', view);
    if (instBtn) instBtn.addEventListener('click', installHelp);
    $$('[data-theme-card]', view).forEach(b => b.addEventListener('click', () => applyTheme(b.dataset.themeCard)));
    $$('[data-budget]', view).forEach(b => b.addEventListener('click', () => {
      A.state.dailyMinutes = +b.dataset.budget;
      A.save();
      renderProgress();
      A.toast('План: ' + b.dataset.budget + ' минут в день', '', '✓');
    }));
    $('[data-reset]', view).addEventListener('click', confirmReset);
  }

    /* ------------------------------- тренажёр ---------------------------- */
  const TRAIN_STATE = () => ({
    train: { schulte: 1, wedge: 1, read: 1, rsvp: 1 },
    trainBoost: { schulte: 1, wedge: 1, read: 1, rsvp: 1 },
    trainAccel: false
  });

  function trainTracks() {
    const qA = C.lessons[0].exercises[0].params.questions;
    return [
      { id: 'schulte', title: 'Таблица Шульте', icon: 'schulte',
        desc: 'Находите числа по порядку. Взгляд держите в центре, голову не поворачивайте.',
        levels: [
          { name: '3×3', type: 'schulte', xp: 10, base: 25, params: { size: 3 } },
          { name: '4×4', type: 'schulte', xp: 15, base: 35, params: { size: 4 } },
          { name: '5×5', type: 'schulte', xp: 20, base: 50, params: { size: 5 } },
          { name: '6×6', type: 'schulte', xp: 25, base: 75, params: { size: 6 } }
        ] },
      { id: 'wedge', title: 'Клин', icon: 'wedge',
        desc: 'Читайте строки вслух, взгляд в центре. Включите точку фокуса, если взгляд соскакивает.',
        levels: [
          { name: '5', type: 'wedge', xp: 10, base: 30, params: { rows: 5 } },
          { name: '6', type: 'wedge', xp: 15, base: 32, params: { rows: 6 } },
          { name: '7', type: 'wedge', xp: 20, base: 35, params: { rows: 7 } },
          { name: '8', type: 'wedge', xp: 25, base: 38, params: { rows: 8 } }
        ] },
      { id: 'read', title: 'Чтение на время', icon: 'reader',
        desc: 'Текст и таймер на убывание. Последние 5 секунд таймер краснеет и мигает.',
        levels: [
          { name: '90', type: 'timedread', xp: 15, base: 90, params: { textKey: 'attention', questions: qA } },
          { name: '75', type: 'timedread', xp: 20, base: 75, params: { textKey: 'attention', questions: qA } },
          { name: '60', type: 'timedread', xp: 25, base: 60, params: { textKey: 'attention', questions: qA } },
          { name: '45', type: 'timedread', xp: 30, base: 45, params: { textKey: 'attention', questions: qA } }
        ] },
      { id: 'rsvp', title: 'RSVP', icon: 'measure',
        desc: 'Слова в центре экрана. Узнавайте без проговаривания, потом проверьте понимание.',
        levels: [
          { name: '250', type: 'rsvp', xp: 15, base: 250, params: { textKey: 'attention', questions: qA } },
          { name: '300', type: 'rsvp', xp: 20, base: 300, params: { textKey: 'attention', questions: qA } },
          { name: '350', type: 'rsvp', xp: 25, base: 350, params: { textKey: 'attention', questions: qA } },
          { name: '400', type: 'rsvp', xp: 30, base: 400, params: { textKey: 'attention', questions: qA } }
        ] }
    ];
  }

  function trainEff(spec, track) {
    const boost = A.state.trainBoost[track.id] || 1;
    if (spec.type === 'rsvp') return Math.round(spec.base / boost);
    return Math.max(8, Math.round(spec.base * boost));
  }

  function trainParams(spec, eff, t) {
    if (spec.type === 'schulte') return { size: spec.params.size, rounds: 1, targetSec: eff };
    if (spec.type === 'wedge') return { rows: spec.params.rows, limit: eff, targetSec: eff };
    const base = t.text ? { text: t.text, title: t.title } : { textKey: t.textKey };
    if (spec.type === 'timedread') return Object.assign(base, { seconds: eff, questions: [] });
    return Object.assign(base, { mode: 'rsvp', wpm: eff, questions: [] });
  }

  function pickTextKey() {
    const pool = Object.keys(C.texts).filter(k => {
      const n = wc(C.texts[k].text);
      return n >= 120 && n <= 520;
    });
    return pool[Math.floor(Math.random() * pool.length)] || 'attention';
  }

  function trackUnlocked(track) { return A.state.train[track.id] || 1; }

  function refreshTrackCard(card, track) {
    const unlocked = trackUnlocked(track);
    card.querySelectorAll('.lvl').forEach(b => {
      const L = +b.dataset.lvl;
      b.classList.toggle('passed', L < unlocked);
      b.classList.toggle('locked', L > unlocked);
      b.disabled = L > unlocked;
    });
    const bl = card.querySelector('[data-boost]');
    if (bl) {
      const boost = A.state.trainBoost[track.id] || 1;
      bl.textContent = boost < 0.999 ? 'ускорение ×' + boost.toFixed(2) : '';
    }
  }

  function startTrainer(track, level, card, trackIdx) {
    const spec = track.levels[level - 1];
    const eff = trainEff(spec, track);
    const custom = (A.state.useCustom && (A.state.customText || '').trim().length > 100)
      ? A.state.customText.trim() : '';
    const rk = pickTextKey();
    const textConf = custom
      ? { text: custom, title: 'Мой текст' }
      : { textKey: rk, title: (C.texts[rk] || {}).title || 'Текст' };
    const ex = {
      type: spec.type === 'rsvp' ? 'reader' : spec.type,
      title: track.title + ' · ' + spec.name,
      instruction: track.desc,
      xp: spec.xp,
      params: trainParams(spec, eff, textConf)
    };
    const host = $('#train-host', view);
    host.innerHTML = '';
    const box = document.createElement('div');
    box.className = 'ex';
    box.innerHTML = '<div class="ex-head"><span class="kind">Тренажёр</span>' + icon(track.icon) +
      '<div><h4>' + esc(track.title) + ' · уровень ' + level + '</h4>' +
      '<div class="hint">' + esc(track.desc) + '</div></div>' +
      '<span class="xp">+' + spec.xp + ' XP</span></div><div class="ex-body"></div>';
    host.appendChild(box);
    const body = box.querySelector('.ex-body');
    const key = 400 + trackIdx * 10 + (level - 1);
    const ctx = {
      day: 0, idx: key, ex: ex,
      complete(result, exx, extra) {
        const r = Object.assign({}, result || {}, extra || {});
        A.completeExercise(0, key, exx || ex, r);
        let pass = false;
        if (spec.type === 'schulte') pass = r.valid !== false && r.seconds <= eff;
        else if (spec.type === 'wedge') pass = !!r.pass;
        else if (spec.type === 'timedread') pass = !!r.pass;
        else pass = true;

        const st = A.state;
        if (pass) {
          if (st.trainAccel) {
            st.trainBoost[track.id] = Math.max(0.6, Math.round((st.trainBoost[track.id] || 1) * 0.9 * 100) / 100);
          }
          const unlocked = st.train[track.id] || 1;
          if (level === unlocked && unlocked < track.levels.length) {
            st.train[track.id] = unlocked + 1;
            A.toast('Уровень ' + (unlocked + 1) + ' открыт', 'ach', '★');
            A.confetti(90);
          } else {
            A.toast('Уровень пройден', '', '✓');
          }
        } else {
          st.trainBoost[track.id] = 1;
          A.toast('Пока не хватает — попробуйте ещё раз', 'bad', '↺');
        }
        A.save();
        refreshTrackCard(card, track);
      }
    };
    window.Train[ex.type](body, ex, ctx);
    box.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function renderTrain() {
    const st = A.state;
    if (!st.train) st.train = {};
    if (!st.trainBoost) st.trainBoost = {};
    const tracks = trainTracks();
    view.innerHTML =
      '<div class="view">' +
      '<div class="section-head" style="margin-top:6px"><h1 style="font-size:30px">Тренажёр</h1>' +
      '<span class="hint">четыре дорожки, по четыре уровня в каждой</span></div>' +
      '<div class="panel panel-pad" style="margin-bottom:20px;display:flex;gap:16px;align-items:center;flex-wrap:wrap">' +
        '<p class="muted" style="margin:0;max-width:70ch;font-size:14px">Начинайте с первого уровня, следующий открывается после успешного прохождения. ' +
        'Включите «Ускорение» — после каждой удачной попытки время будет сокращаться на 10%, а темп расти.</p>' +
        '<label class="switch" style="margin-left:auto"><input type="checkbox" data-accel' + (st.trainAccel ? ' checked' : '') + '> Ускорение</label>' +
      '</div>' +
      '<div class="panel panel-pad" style="margin-bottom:18px">' +
        '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">' +
          '<b style="font-size:14px">Свой текст</b>' +
          '<span class="hint">вставьте текст или загрузите .txt — он пойдёт в «Чтение на время» и RSVP</span>' +
          '<label class="switch" style="margin-left:auto"><input type="checkbox" data-usecustom' + (st.useCustom ? ' checked' : '') + '> использовать мой текст</label>' +
        '</div>' +
        '<textarea class="input" data-custom rows="3" style="margin-top:10px" placeholder="Вставьте сюда свой текст (не меньше 100 символов)…">' + esc(st.customText || '') + '</textarea>' +
        '<div style="display:flex;gap:12px;align-items:center;margin-top:8px;flex-wrap:wrap">' +
          '<button class="btn btn-ghost btn-sm" data-savecustom>Сохранить</button>' +
          '<input type="file" accept=".txt,text/plain" data-file style="font-size:12px">' +
          '<span class="muted" data-customlen>' + (st.customText || '').length + ' символов</span>' +
        '</div>' +
      '</div>' +
      '<div class="train-grid" data-tracks></div>' +
      '<div id="train-host" style="margin-top:22px"></div>' +
      '</div>';

    const grid = $('[data-tracks]', view);
    tracks.forEach((track, trackIdx) => {
      const unlocked = trackUnlocked(track);
      const boost = A.state.trainBoost[track.id] || 1;
      const card = document.createElement('div');
      card.className = 'track';
      card.innerHTML =
        '<div class="head">' + icon(track.icon) + '<h3>' + esc(track.title) + '</h3></div>' +
        '<p>' + esc(track.desc) + '</p>' +
        '<div class="levels">' + track.levels.map((lv, i) =>
          '<button class="lvl' + (i + 1 < unlocked ? ' passed' : '') + (i + 1 > unlocked ? ' locked' : '') +
          '" data-lvl="' + (i + 1) + '"' + (i + 1 > unlocked ? ' disabled' : '') + '>' + esc(lv.name) + '</button>').join('') +
        '</div>' +
        '<div class="row"><span class="muted" style="font-size:12px">уровень ' + unlocked + ' из ' + track.levels.length + '</span>' +
        '<span class="boost" data-boost>' + (boost < 0.999 ? 'ускорение ×' + boost.toFixed(2) : '') + '</span></div>';
      grid.appendChild(card);
      card.querySelectorAll('.lvl').forEach(btn => {
        btn.addEventListener('click', () => startTrainer(track, +btn.dataset.lvl, card, trackIdx));
      });
    });

    const accel = $('[data-accel]', view);
    if (accel) accel.addEventListener('change', () => {
      A.state.trainAccel = accel.checked;
      if (!accel.checked) {
        Object.keys(A.state.trainBoost).forEach(k => { A.state.trainBoost[k] = 1; });
      }
      A.save();
      renderTrain();
    });

    const custom = $('[data-custom]', view);
    const customLen = $('[data-customlen]', view);
    if (custom) custom.addEventListener('input', () => {
      customLen.textContent = custom.value.length + ' символов';
    });
    const saveCustom = $('[data-savecustom]', view);
    if (saveCustom) saveCustom.addEventListener('click', () => {
      A.state.customText = custom.value.trim();
      A.save();
      A.toast(A.state.customText.length > 100 ? 'Текст сохранён' : 'Текст слишком короткий — нужно от 100 символов', A.state.customText.length > 100 ? '' : 'bad', '✓');
      renderTrain();
    });
    const fileInput = $('[data-file]', view);
    if (fileInput) fileInput.addEventListener('change', () => {
      const f = fileInput.files && fileInput.files[0];
      if (!f) return;
      const reader = new FileReader();
      reader.onload = () => {
        custom.value = String(reader.result || '').slice(0, 20000);
        customLen.textContent = custom.value.length + ' символов';
        A.toast('Файл загружен — нажмите «Сохранить»', '', '↓');
      };
      reader.readAsText(f);
    });
    const useCustom = $('[data-usecustom]', view);
    if (useCustom) useCustom.addEventListener('change', () => {
      A.state.useCustom = useCustom.checked;
      A.save();
      if (useCustom.checked && (A.state.customText || '').length < 100) {
        A.toast('Сначала сохраните текст длиннее 100 символов', 'bad', '!');
      }
    });
  }

/* -------------------------------- аудио ------------------------------ */
  let taAudio = null;
  const taState = { index: 0, playing: false, list: [] };
  const PLAY_ICON = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
  const PAUSE_ICON = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>';

  function stopAudio() {
    if (taAudio) { try { taAudio.pause(); } catch (e) { /* noop */ } }
    taAudio = null;
    taState.playing = false;
    if (typeof taStopLoop === 'function') taStopLoop();
  }
  function clock(sec) {
    if (!isFinite(sec)) return '0:00';
    const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
    return m + ':' + (s < 10 ? '0' : '') + s;
  }
  function taSetBlock(i) {
    $$('.theory-block', view).forEach((el, n) => {
      el.classList.toggle('speaking', n === i);
      el.classList.toggle('read', n < i);
    });
  }
  let taRaf = null;
  function taStopLoop() {
    if (taRaf) cancelAnimationFrame(taRaf);
    taRaf = null;
  }
  function taClearWords() {
    $$('.theory-block .tw', view).forEach(s => s.classList.remove('cur', 'read'));
  }

  function wireTheoryAudio() {
    const card = $('[data-theory-audio]', view);
    if (!card) return;
    const day = parseHash().day;
    const archive = (window.THEORY_AUDIO || {})[String(day)];
    if (!archive) return;

    let voice = A.state.voice === 'dmitry' ? 'dmitry' : 'svetlana';
    let rate = A.state.audioRate || 1.15;
    taState.list = archive[voice] || [];
    taState.index = 0;

    const btn = card.querySelector('.play');
    const bar = card.querySelector('[data-bar]');
    const fill = card.querySelector('[data-fill]');
    const time = card.querySelector('[data-time]');
    const voiceSel = card.querySelector('[data-voice]');
    const rateSel = card.querySelector('[data-rate]');
    btn.innerHTML = PLAY_ICON;
    const total = taState.list.reduce((s, x) => s + (x.dur || 0), 0);
    time.textContent = '0:00 / ' + clock(total);

    function playFrom(i, autoplay) {
      stopAudio();
      if (i < 0 || i >= taState.list.length) return;
      taState.index = i;
      taSetBlock(i);
      taClearWords();
      const seg = taState.list[i];
      const blockEl = $$('.theory-block', view)[i];
      const spans = blockEl ? Array.from(blockEl.querySelectorAll('.tw')) : [];
      const times = Array.isArray(seg.times) ? seg.times : [];
      let lastWi = -2;
      const a = new Audio('assets/audio/' + seg.src);
      taAudio = a;
      a.playbackRate = rate;

      function tickWords() {
        if (!taAudio) { taRaf = null; return; }
        if (times.length && spans.length) {
          const ms = taAudio.currentTime * 1000;
          let wi = -1;
          for (let k = 0; k < times.length; k++) {
            if (times[k] <= ms) wi = k;
            else break;
          }
          if (wi !== lastWi) {
            for (let k = 0; k < spans.length; k++) {
              spans[k].classList.toggle('read', k < wi);
              spans[k].classList.toggle('cur', k === wi);
            }
            lastWi = wi;
          }
        }
        taRaf = requestAnimationFrame(tickWords);
      }
      taRaf = requestAnimationFrame(tickWords);
      a.addEventListener('timeupdate', () => {
        const pct = a.duration ? a.currentTime / a.duration * 100 : 0;
        fill.style.width = pct + '%';
        time.textContent = clock(a.currentTime) + ' / ' + clock(a.duration || seg.dur);
      });
      a.addEventListener('ended', () => {
        if (taState.index + 1 < taState.list.length) playFrom(taState.index + 1, true);
        else {
          taState.playing = false;
          btn.innerHTML = PLAY_ICON;
          fill.style.width = '0%';
          time.textContent = '0:00 / ' + clock(total);
          taSetBlock(-1);
        }
      });
      if (autoplay) {
        const p = a.play();
        if (p && p.catch) p.catch(() => { taState.playing = false; btn.innerHTML = PLAY_ICON; });
        taState.playing = true;
        btn.innerHTML = PAUSE_ICON;
      }
    }

    btn.addEventListener('click', () => {
      if (taState.playing && taAudio) {
        taAudio.pause();
        taState.playing = false;
        btn.innerHTML = PLAY_ICON;
      } else if (taAudio) {
        taAudio.play();
        taState.playing = true;
        btn.innerHTML = PAUSE_ICON;
      } else {
        playFrom(0, true);
      }
    });

    bar.addEventListener('click', (e) => {
      if (!taAudio || !taAudio.duration) return;
      const r = bar.getBoundingClientRect();
      taAudio.currentTime = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * taAudio.duration;
    });

    voiceSel.addEventListener('change', () => {
      voice = voiceSel.value;
      A.state.voice = voice;
      A.save();
      taState.list = archive[voice] || [];
      stopAudio();
      taSetBlock(-1);
      fill.style.width = '0%';
      time.textContent = '0:00 / ' + clock(taState.list.reduce((s, x) => s + (x.dur || 0), 0));
      btn.innerHTML = PLAY_ICON;
    });

    rateSel.addEventListener('change', () => {
      rate = +rateSel.value;
      A.state.audioRate = rate;
      A.save();
      if (taAudio) taAudio.playbackRate = rate;
    });

    $$('.theory-block', view).forEach((el, n) => {
      el.style.cursor = 'pointer';
      el.addEventListener('click', () => playFrom(n, true));
    });
  }

  function wireCalc() {
    const box = $('[data-calc]', view);
    if (!box) return;
    const sp = box.querySelector('[data-speed]');
    const cp = box.querySelector('[data-comp]');
    const out = box.querySelector('[data-eff]');
    const upd = () => {
      const v = Math.max(0, Math.min(100, +cp.value || 0));
      out.textContent = Math.round((+sp.value || 0) * v / 100);
    };
    sp.addEventListener('input', upd);
    cp.addEventListener('input', upd);
    upd();
  }

  /* -------------------------------- cheat ------------------------------ */
  function renderCheat() {
    const ch = C.cheat;
    view.innerHTML =
      '<div class="view">' +
      '<div class="section-head" style="margin-top:6px"><h1 style="font-size:30px">Шпаргалка</h1>' +
      '<span class="hint">всё, что нужно помнить между занятиями</span></div>' +

      '<div class="cheat-grid">' +
        '<div class="panel panel-pad"><h3>Формулы</h3>' +
          ch.formulas.map(r => '<div class="formula-row"><span>' + esc(r[0]) + '</span><b>' + esc(r[1]) + '</b></div>').join('') +
        '</div>' +
        '<div class="panel panel-pad"><h3>10 правил</h3><ol class="rule-list">' +
          ch.rules.map(r => '<li>' + esc(r) + '</li>').join('') + '</ol></div>' +
      '</div>' +

      '<div class="section"><div class="section-head"><h2>Техники и дозировка</h2>' +
      '<span class="hint">что тренирует, сколько делать и где предел</span></div>' +
      '<div class="panel" style="padding:8px 20px 14px;overflow:auto"><table class="data"><thead><tr>' +
      ch.techniques.cols.map(c => '<th>' + esc(c) + '</th>').join('') + '</tr></thead><tbody>' +
      ch.techniques.rows.map(r => '<tr>' + r.map((c, i) => '<td>' + (i === 0 ? '<b>' + esc(c) + '</b>' : esc(c)) + '</td>').join('') + '</tr>').join('') +
      '</tbody></table></div></div>' +

      '<div class="section"><div class="section-head"><h2>Мифы о скорочтении</h2></div>' +
        '<div class="cheat-grid">' +
        ch.myths.map(m => '<div class="myth"><div class="m">' + esc(m.m) + '</div><div class="t">' + esc(m.t) + '</div></div>').join('') +
        '</div></div>' +

      '<div class="section"><div class="section-head"><h2>Словарь</h2></div>' +
        '<div class="panel" style="padding:8px 20px 14px"><table class="data"><tbody>' +
        ch.glossary.map(g => '<tr><td style="width:230px"><b>' + esc(g[0]) + '</b></td><td>' + esc(g[1]) + '</td></tr>').join('') +
        '</tbody></table></div></div>' +
      '</div>';
  }

  /* -------------------------------- modals ----------------------------- */
  function confirmReset() {
    A.modal('<h3>Начать курс заново?</h3>' +
      '<p>Сбросятся опыт, достижения, замеры, записи дневника и выбранный план. Отменить это нельзя.</p>' +
      '<p class="muted" style="font-size:13px">Курс откроется с первого дня, прогресс начнётся с чистого листа.</p>' +
      '<div class="row"><button class="btn btn-ghost" data-close>Отмена</button>' +
      '<button class="btn btn-primary" data-yes style="background:#d92d20">Начать заново</button></div>', {
      onMount(root, close) {
        root.querySelector('[data-yes]').addEventListener('click', () => {
          A.reset();
          close();
          location.hash = '#/home';
          setTimeout(() => { render(); onboarding(); A.toast('Начинаем заново', '', '↺'); }, 60);
        });
      }
    });
  }

  function helpModal() {
    A.modal(
      '<h3>Как устроен курс</h3>' +
      '<p><b>20 минут в день.</b> Теория → тренажёры → проверка. День закрывается, когда выполнены все упражнения и пройдена проверка.</p>' +
      '<p><b>XP и ранги.</b> За упражнения дают опыт, за закрытый день — бонус. Опыт двигает ранг: от Новичка до Легенды.</p>' +
      '<p><b>Серия дней.</b> Занимайтесь ежедневно — серия растёт. Пропуск обнуляет серию, но не прогресс.</p>' +
      '<p><b>Боссы.</b> Три испытания на скорость и понимание. Победа даёт много опыта; проигрыш ничего не отнимает.</p>' +
      '<p><b>Честные правила.</b> Скорость засчитывается только при понимании от 70%. Подсматривать в текст при ответах бессмысленно: вы обманываете только свой прогресс.</p>' +
      '<p class="muted" style="font-size:12.5px;margin-top:14px">Версия ' + A.VERSION + ' от ' + A.VERSION_DATE + '.</p>' +
      '<div class="row"><button class="btn btn-primary" data-close>Понятно</button></div>'
    );
  }

  function onboarding() {
    const mins = [20, 25, 30, 35, 40];
    const chosenMin = A.state.dailyMinutes || 20;
    const chosenTheme = currentTheme();
    A.modal(
      '<h3>Настроим курс под вас</h3>' +
      '<p class="muted" style="font-size:13px">Три быстрых вопроса. Всё можно изменить позже.</p>' +
      '<div style="font-weight:700;font-size:14px;margin-top:6px">Как вас зовут?</div>' +
      '<input class="input" id="ob-name" maxlength="24" placeholder="Например, Анна" autocomplete="off" style="margin-top:8px">' +
      '<div style="font-weight:700;font-size:14px;margin-top:18px">Сколько времени в день готовы уделять?</div>' +
      '<div class="choice-row" data-mins>' + mins.map(m =>
        '<button type="button" class="choice' + (m === chosenMin ? ' on' : '') + '" data-min="' + m + '">' +
        (m === 20 ? '20 минут' : m + ' минут') + '</button>').join('') + '</div>' +
      '<p class="muted" style="font-size:12.5px;margin:2px 0 0">20 минут — базовая программа. Больше — добавим тренажёры и чтение с таймером.</p>' +
      '<div style="font-weight:700;font-size:14px;margin-top:18px">Тема оформления</div>' +
      '<div class="theme-cards" data-themes>' +
        [['paper', '#3b6ef5', 'Бумага'], ['graphite', '#0e1014', 'Графит'], ['sand', '#a1521a', 'Тёплая']]
          .map(t => '<button type="button" class="theme-card' + (t[0] === chosenTheme ? ' on' : '') +
            '" data-theme-pick="' + t[0] + '"><i style="background:' + t[1] + '"></i>' + t[2] + '</button>').join('') +
      '</div>' +
      '<div class="row"><button class="btn btn-ghost" data-skip>Пропустить</button>' +
      '<button class="btn btn-primary" data-save>Начать</button></div>', {
      dismissable: false,
      onMount(root, close) {
        let min = chosenMin;
        root.querySelectorAll('[data-min]').forEach(b => b.addEventListener('click', () => {
          min = +b.dataset.min;
          root.querySelectorAll('[data-min]').forEach(x => x.classList.toggle('on', x === b));
        }));
        root.querySelectorAll('[data-theme-pick]').forEach(b => b.addEventListener('click', () => {
          root.querySelectorAll('[data-theme-pick]').forEach(x => x.classList.toggle('on', x === b));
          applyTheme(b.dataset.themePick, true);
        }));
        const inp = root.querySelector('#ob-name');
        inp.focus();
        const save = () => {
          const v = inp.value.trim();
          A.state.dailyMinutes = min;
          if (v) A.state.name = v;
          A.save();
          close();
          render();
          A.toast('План: ' + min + ' минут в день', '', '✓');
        };
        root.querySelector('[data-save]').addEventListener('click', save);
        root.querySelector('[data-skip]').addEventListener('click', close);
        inp.addEventListener('keydown', e => { if (e.key === 'Enter') save(); });
      }
    });
  }

  /* --------------------------------- PWA ------------------------------- */
  function installHelp() {
    const ua = navigator.userAgent;
    const isIOS = /iphone|ipad|ipod/i.test(ua);
    const isAndroid = /android/i.test(ua);
    const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    if (standalone) {
      A.toast('Курс уже установлен на устройство', 'ach', '✓');
      return;
    }
    const body = isIOS
      ? '<p>В Safari нажмите <b>«Поделиться»</b> (квадрат со стрелкой) → <b>«На экран „Домой“»</b> → «Добавить».</p>'
      : (isAndroid
        ? '<p>В Chrome откройте меню <b>⋮</b> → <b>«Установить приложение»</b> или «Добавить на главный экран».</p>'
        : '<p>В Chrome или Edge нажмите значок установки в адресной строке либо меню <b>⋮</b> → <b>«Установить приложение»</b>.</p>');
    A.modal('<h3>Установить курс на телефон</h3>' + body +
      '<p class="muted" style="font-size:13px">Установка доступна по HTTPS или на localhost. После установки курс открывается без адресной строки и работает офлайн.</p>' +
      '<div class="row"><button class="btn btn-primary" data-close>Понятно</button></div>');
  }

  function initPWA() {
    const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    const bar = document.getElementById('install-bar');
    const hideBar = () => { if (bar) bar.hidden = true; };

    let deferred = null;
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferred = e;
      let dismissed = false;
      try { dismissed = localStorage.getItem('sr14_install_dismissed') === '1'; } catch (err) {}
      if (!dismissed && bar && !standalone) bar.hidden = false;
    });
    const btn = document.getElementById('btn-install');
    if (btn) btn.addEventListener('click', async () => {
      if (!deferred) { hideBar(); installHelp(); return; }
      deferred.prompt();
      try { await deferred.userChoice; } catch (err) { /* noop */ }
      deferred = null;
      hideBar();
    });
    const closeBtn = document.getElementById('btn-install-close');
    if (closeBtn) closeBtn.addEventListener('click', () => {
      hideBar();
      try { localStorage.setItem('sr14_install_dismissed', '1'); } catch (err) {}
    });
    window.addEventListener('appinstalled', () => {
      hideBar();
      A.toast('Курс установлен на устройство', 'ach', '✓');
    });

    function offerUpdate(reg) {
      A.modal('<h3>Доступна новая версия</h3><p>Обновите курс, чтобы получить исправления. Прогресс сохранится.</p>' +
        '<div class="row"><button class="btn btn-ghost" data-close>Позже</button>' +
        '<button class="btn btn-primary" data-upd>Обновить</button></div>', {
        onMount(root, close) {
          root.querySelector('[data-upd]').addEventListener('click', () => {
            close();
            if (reg.waiting) reg.waiting.postMessage('SKIP_WAITING');
          });
        }
      });
    }

    if ('serviceWorker' in navigator && /^https?:/.test(location.protocol)) {
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        refreshing = true;
        location.reload();
      });
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('service-worker.js').then((reg) => {
          const check = () => { if (reg.waiting && navigator.serviceWorker.controller) offerUpdate(reg); };
          check();
          reg.addEventListener('updatefound', () => {
            const nw = reg.installing;
            if (!nw) return;
            nw.addEventListener('statechange', () => { if (nw.state === 'installed') check(); });
          });
        }).catch(() => { /* без SW курс работает как обычный сайт */ });
      });
    }

    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if (isIOS && !standalone) {
      let shown = false;
      try { shown = localStorage.getItem('sr14_ios_hint') === '1'; } catch (err) {}
      if (!shown) {
        setTimeout(() => {
          A.modal('<h3>Установить на iPhone</h3>' +
            '<p>В Safari нажмите <b>«Поделиться»</b> (квадрат со стрелкой), затем <b>«На экран „Домой“»</b> и подтвердите «Добавить».</p>' +
            '<p class="muted" style="font-size:13px">После этого курс откроется как приложение — без адресной строки и с офлайн-доступом.</p>' +
            '<div class="row"><button class="btn btn-primary" data-close>Понятно</button></div>', {
            onClose() { try { localStorage.setItem('sr14_ios_hint', '1'); } catch (err) {} }
          });
        }, 7000);
      }
    }
  }

  /* ------------------------------- startup ----------------------------- */
  A.load();
  A.renderHud();
  initTheme();
  initPWA();
  if (!location.hash) location.hash = '#/home';
  window.addEventListener('hashchange', render);
  document.getElementById('btn-help').addEventListener('click', helpModal);
  render();
  if (!A.state.name && !A.state.xp && !Object.keys(A.state.days).length) {
    onboarding();
  }
})();
