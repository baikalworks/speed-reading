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
        ' · <a href="https://github.com/baikalworks/speed-reading/releases" target="_blank" rel="noopener">история версий и резервные копии</a></p>' +
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
  }
  function tile(v, l) {
    return '<div class="tile"><b>' + v + '</b><span>' + l + '</span></div>';
  }

  /* -------------------------------- day -------------------------------- */
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
          '<span class="tag">' + L.minutes + ' минут</span>' +
          '<span class="tag">до +' + totalXp + ' XP</span>' +
          (extraXp ? '<span class="tag">+' + extraXp + ' XP за дополнительные</span>' : '') +
          (isDone ? '<span class="tag" style="background:var(--green-soft);color:#0b6b51">день закрыт ✓</span>' : '') +
          (L.exercises.some(e => e.params && e.params.boss) ? '<span class="tag boss">есть босс</span>' : '') +
        '</div>' +
      '</div>' +

      (isDone ? '<div class="callout" style="border-color:var(--green);background:var(--green-soft)">' +
        '<b>День пройден</b>Можно повторять упражнения и улучшать личные рекорды. XP за повтор не начисляется.</div>' : '') +

      '<div class="tabs">' +
        '<button data-tab="theory" class="on">Теория</button>' +
        '<button data-tab="train">Тренажёр <span class="muted" style="font-weight:600">' + doneCount + '/' + mainEx.length + '</span></button>' +
        '<button data-tab="check">Проверка ' + (quizDone ? '<span class="dot"></span>' : '') + '</button>' +
      '</div>' +

      '<div data-pane="theory">' + theoryHTML(L) + '</div>' +
      '<div data-pane="train" style="display:none">' +
        '<div class="tiles" style="margin-bottom:18px">' +
          tile(doneCount + '/' + mainEx.length, 'упражнений выполнено') +
          tile(L.exercises.length, 'всего заданий') +
          tile(L.quiz.questions.length, 'вопросов проверки') +
        '</div>' +
        '<div data-exlist></div>' +
        '<div data-finish style="margin-top:20px"></div>' +
      '</div>' +
      '<div data-pane="check" style="display:none" data-checkpane></div>' +
      '<div style="margin-top:34px;display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap">' +
        (day > 1 ? '<a class="btn btn-ghost" href="#/day/' + (day - 1) + '">← День ' + (day - 1) + '</a>' : '<span></span>') +
        (day < 14 ? '<a class="btn btn-ghost" href="#/day/' + (day + 1) + '">День ' + (day + 1) + ' →</a>' : '<a class="btn btn-ghost" href="#/home">На карту курса</a>') +
      '</div>' +
      '</div>';

    // tabs
    const tabs = $$('.tabs button', view);
    const panes = $$('[data-pane]', view);
    function showTab(name) {
      tabs.forEach(b => b.classList.toggle('on', b.dataset.tab === name));
      panes.forEach(p => { p.style.display = p.dataset.pane === name ? '' : 'none'; });
    }
    tabs.forEach(b => b.addEventListener('click', () => showTab(b.dataset.tab)));

    // exercises
    const list = $('[data-exlist]', view);
    L.exercises.forEach((ex, idx) => {
      const card = document.createElement('div');
      card.className = 'ex';
      const isBoss = !!(ex.params && ex.params.boss);
      const isOpt = !!ex.optional;
      const saved = st.ex[A.exKey(day, idx)];
      if (saved && saved.done) card.classList.add('done');
      card.innerHTML =
        '<div class="ex-head">' +
          '<span class="kind' + (isBoss ? ' boss' : '') + '">' +
            (isBoss ? 'Босс' : (isOpt ? 'Дополнительно' : (TYPE_LABEL[ex.type] || 'Задание'))) + '</span>' +
          icon(ex.type) +
          '<div><h4>' + esc(ex.title) + '</h4><div class="hint">' + esc(ex.instruction) + '</div></div>' +
          '<span class="xp">' + (saved && saved.done ? '✓ ' : '+') + ex.xp + ' XP</span>' +
        '</div>' +
        '<div class="ex-body"></div>';
      list.appendChild(card);
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
      const tab = $('.tabs button[data-tab="train"] .muted');
      if (tab) tab.textContent = doneN + '/' + mainEx.length;
    }

    function updateFin() {
      const host = $('[data-finish]', view);
      const readyNow = A.lessonReady(day);
      if (A.state.days[day]) {
        host.innerHTML = '<div class="callout" style="border-color:var(--green);background:var(--green-soft)"><b>День закрыт</b>Возвращайтесь завтра — или повторите тренажёры, чтобы закрепить.</div>';
        return;
      }
      if (!readyNow) {
        const needEx = mainEx.length - mainEx.filter((e) => {
          const i = L.exercises.indexOf(e); const s = A.state.ex[A.exKey(day, i)]; return s && s.done;
        }).length;
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
    wireAudio();
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

  function theoryHTML(L) {
    const blocks = L.theory.map(b => {
      let html = '<div class="block"><h3>' + esc(b.h) + '</h3>' + (b.p ? '<p>' + esc(b.p) + '</p>' : '');
      if (b.list) html += '<ul>' + b.list.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul>';
      return html + '</div>';
    }).join('');
    const audio = L.audio ? '<div class="audio-card" data-audio="' + esc(L.audio) + '">' +
      '<button class="play" type="button" aria-label="Слушать аудио-итог"></button>' +
      '<div class="meta"><b>Аудио-итог дня</b><div class="audio-bar" data-bar><i data-fill></i></div></div>' +
      '<span class="audio-time" data-time>0:00</span></div>' : '';
    return '<div class="theory">' +
      audio +
      (L.fig ? '<figure><img src="assets/' + L.fig + '" alt="' + esc(L.fig_caption || '') + '" loading="lazy">' +
        '<figcaption>' + esc(L.fig_caption || '') + '</figcaption></figure>' : '') +
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
      const t = document.querySelector('.tabs button[data-tab="check"]');
      if (t && !t.querySelector('.dot')) t.insertAdjacentHTML('beforeend', '<span class="dot"></span>');
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

      '<div class="section"><div class="section-head"><h2>Данные</h2></div>' +
        '<div class="panel panel-pad" style="display:flex;gap:10px;flex-wrap:wrap">' +
          '<button class="btn btn-ghost btn-sm" data-export>Скачать прогресс (JSON)</button>' +
          '<button class="btn btn-ghost btn-sm" data-install>Установить на телефон</button>' +
          '<button class="btn btn-ghost btn-sm" data-free>' + (st.freeMode ? 'Включить последовательный режим' : 'Открыть все дни') + '</button>' +
          '<button class="btn btn-ghost btn-sm" data-reset style="color:#a12a20;border-color:#f3d3cf">Сбросить прогресс</button>' +
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
    $('[data-reset]', view).addEventListener('click', () => {
      A.modal('<h3>Сбросить прогресс?</h3><p>Удалятся XP, достижения, замеры и записи дневника. Это нельзя отменить.</p>' +
        '<div class="row"><button class="btn btn-ghost" data-close>Отмена</button>' +
        '<button class="btn btn-primary" data-yes style="background:#d92d20">Сбросить</button></div>', {
        onMount(root, close) {
          root.querySelector('[data-yes]').addEventListener('click', () => {
            A.reset(); close(); location.hash = '#/home'; render();
          });
        }
      });
    });
  }

  /* ------------------------------- тренажёр ---------------------------- */
  function trainers() {
    const qAttention = C.lessons[0].exercises[0].params.questions;
    const qScan = C.lessons[5].exercises[0].params.questions;
    return [
      { id: 'schulte5', title: 'Таблица Шульте 5×5', desc: 'Периферийное внимание и скорость поиска. Держите взгляд в центре.', type: 'schulte', xp: 20, min: '1 мин', params: { size: 5, rounds: 1, targetSec: 55 } },
      { id: 'schulte6', title: 'Таблица Шульте 6×6', desc: 'Больше чисел — шире захват. Не поворачивайте голову.', type: 'schulte', xp: 30, min: '2 мин', params: { size: 6, rounds: 1, targetSec: 90 } },
      { id: 'wedge', title: 'Клиновидные строки', desc: 'Расширение захвата строки: взгляд в центре, края — периферией.', type: 'wedge', xp: 20, min: '1 мин', params: { rows: 7, targetSec: 35 } },
      { id: 'rsvp350', title: 'RSVP · 350 слов/мин', desc: 'Узнавание слов в темпе выше привычного, без возвратов.', type: 'reader', xp: 20, min: '2 мин', params: { textKey: 'attention', mode: 'rsvp', wpm: 350, questions: qAttention } },
      { id: 'rsvp500', title: 'RSVP · 500 слов/мин', desc: 'Проверка предела: на каком темпе рассыпается понимание.', type: 'reader', xp: 20, min: '2 мин', params: { textKey: 'attention', mode: 'rsvp', wpm: 500, questions: qAttention } },
      { id: 'scan', title: 'Сканирование за 60 секунд', desc: 'Поиск фактов в плотном документе: сроки, имена, цифры.', type: 'scan', xp: 20, min: '1 мин', params: { textKey: 'doc_schedule', seconds: 60, questions: qScan } }
    ];
  }

  function renderTrain() {
    const defs = trainers();
    const st = A.state;
    view.innerHTML =
      '<div class="view">' +
      '<div class="section-head" style="margin-top:6px"><h1 style="font-size:30px">Тренажёр</h1>' +
      '<span class="hint">короткие тренировки, не привязанные к дню</span></div>' +
      '<div class="panel panel-pad" style="margin-bottom:20px;display:flex;gap:18px;align-items:center;flex-wrap:wrap">' +
        '<div>' + icon('schulte', 'ex-ic') + '</div>' +
        '<p class="muted" style="margin:0;max-width:70ch;font-size:14px">Эти упражнения можно делать в любой момент — до урока, после или вместо разминки. ' +
        'Опыт начисляется один раз за тренажёр, рекорды обновляются при каждом подходе.</p>' +
      '</div>' +
      '<div class="train-grid">' +
        defs.map((d, i) => {
          const done = !!(st.ex[A.exKey(0, 100 + i)] && st.ex[A.exKey(0, 100 + i)].done);
          return '<div class="train-card">' +
            '<div style="display:flex;align-items:center;gap:10px">' + icon(d.type) +
              '<h3>' + esc(d.title) + '</h3>' + (done ? '<span class="tag" style="margin-left:auto;background:var(--green-soft);color:#0b6b51">пройдено</span>' : '') +
            '</div>' +
            '<p>' + esc(d.desc) + '</p>' +
            '<div class="row"><span class="tag">' + d.min + '</span><span class="tag">+' + d.xp + ' XP</span>' +
              '<button class="btn btn-primary btn-sm" data-train="' + i + '">Начать</button></div>' +
          '</div>';
        }).join('') +
      '</div>' +
      '<div id="train-host" style="margin-top:22px"></div>' +
      '</div>';

    $$('[data-train]', view).forEach(btn => btn.addEventListener('click', () => {
      const def = defs[+btn.dataset.train];
      const host = $('#train-host', view);
      host.innerHTML = '';
      const card = document.createElement('div');
      card.className = 'ex';
      card.innerHTML =
        '<div class="ex-head"><span class="kind">Тренажёр</span>' + icon(def.type) +
          '<div><h4>' + esc(def.title) + '</h4><div class="hint">' + esc(def.desc) + '</div></div>' +
          '<span class="xp">+' + def.xp + ' XP</span></div><div class="ex-body"></div>';
      host.appendChild(card);
      const body = card.querySelector('.ex-body');
      const ex = { type: def.type, title: def.title, instruction: def.desc, xp: def.xp, params: def.params };
      const key = 100 + defs.indexOf(def);
      const ctx = {
        day: 0, idx: key, ex: ex,
        complete(result, exx, extra) {
          A.completeExercise(0, key, exx || ex, Object.assign({}, result || {}, extra || {}));
          card.classList.add('done');
          card.querySelector('.xp').textContent = '✓ ' + def.xp + ' XP';
        }
      };
      window.Train[def.type](body, ex, ctx);
      card.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }));
  }

  /* -------------------------------- аудио ------------------------------ */
  let audioEl = null;
  function stopAudio() { if (audioEl) { try { audioEl.pause(); } catch (e) {} } }
  function clock(sec) {
    if (!isFinite(sec)) return '0:00';
    const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
    return m + ':' + (s < 10 ? '0' : '') + s;
  }
  function wireAudio() {
    const card = $('.audio-card', view);
    if (!card) return;
    const src = 'assets/' + card.dataset.audio;
    audioEl = new Audio(src);
    audioEl.preload = 'metadata';
    const btn = card.querySelector('.play');
    const fill = card.querySelector('[data-fill]');
    const time = card.querySelector('[data-time]');
    const bar = card.querySelector('[data-bar]');
    const playIcon = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
    const pauseIcon = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>';
    btn.innerHTML = playIcon;
    audioEl.addEventListener('loadedmetadata', () => { time.textContent = '0:00 / ' + clock(audioEl.duration); });
    audioEl.addEventListener('timeupdate', () => {
      const pct = audioEl.duration ? audioEl.currentTime / audioEl.duration * 100 : 0;
      fill.style.width = pct + '%';
      time.textContent = clock(audioEl.currentTime) + ' / ' + clock(audioEl.duration);
    });
    audioEl.addEventListener('ended', () => { btn.innerHTML = playIcon; });
    btn.addEventListener('click', () => {
      if (audioEl.paused) { audioEl.play(); btn.innerHTML = pauseIcon; }
      else { audioEl.pause(); btn.innerHTML = playIcon; }
    });
    bar.addEventListener('click', (e) => {
      const r = bar.getBoundingClientRect();
      if (audioEl.duration) audioEl.currentTime = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * audioEl.duration;
    });
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
    A.modal(
      '<h3>Как вас зовут?</h3>' +
      '<p>Имя нужно только для интерфейса — данные хранятся в этом браузере и никуда не отправляются.</p>' +
      '<input class="input" id="ob-name" maxlength="24" placeholder="Например, Анна" autocomplete="off">' +
      '<div class="row"><button class="btn btn-ghost" data-skip>Пропустить</button>' +
      '<button class="btn btn-primary" data-save>Начать</button></div>', {
      dismissable: false,
      onMount(root, close) {
        const inp = root.querySelector('#ob-name');
        inp.focus();
        const save = () => {
          const v = inp.value.trim();
          if (v) { A.state.name = v; A.save(); }
          close();
          render();
          A.toast('Добро пожаловать в курс', 'achievement', '→');
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
