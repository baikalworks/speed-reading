/* Тренажёры: интерактивные упражнения курса. */
(function () {
  'use strict';

  const A = window.App;
  const { $, esc, wc, fmtTime, pct } = A;

  const timers = [];
  function every(fn, ms) { const id = setInterval(fn, ms); timers.push(id); return id; }
  function after(fn, ms) { const id = setTimeout(fn, ms); timers.push(id); return id; }
  function stopAll() {
    timers.forEach(id => { clearInterval(id); clearTimeout(id); });
    timers.length = 0;
  }

  function el(tag, cls, html) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }
  function textParas(text) {
    return String(text).split(/\n+/).map(p => p.trim()).filter(Boolean)
      .map(p => '<p>' + esc(p) + '</p>').join('');
  }
  function resultBox(host, opt) {
    const box = el('div', 'result ' + (opt.tone || ''));
    box.innerHTML =
      '<h4>' + esc(opt.title) + '</h4>' +
      (opt.nums && opt.nums.length
        ? '<div class="nums">' + opt.nums.map(n =>
            '<div><b>' + esc(n.v) + '</b><span>' + esc(n.l) + '</span></div>').join('') + '</div>'
        : '') +
      (opt.msg ? '<div class="msg">' + opt.msg + '</div>' : '');
    host.appendChild(box);
    return box;
  }
  function letters(i) { return String.fromCharCode(1040 + i); }

  /* ---------------------------- questions ---------------------------- */
  function askQuestions(host, questions, onDone, opts) {
    opts = opts || {};
    if (!questions || !questions.length) { if (onDone) onDone({ score: 0, total: 0 }); return; }
    const wrap = el('div', 'quiz');
    wrap.innerHTML = questions.map((q, qi) =>
      '<div class="quiz-q" data-q="' + qi + '">' +
        '<div class="qt"><span class="qn">' + (qi + 1) + '.</span><span>' + esc(q.q) + '</span></div>' +
        '<div class="opts">' + q.options.map((o, oi) =>
          '<label class="opt" data-o="' + oi + '"><input type="radio" name="q' + qi + '" value="' + oi + '">' +
          '<span class="k">' + letters(oi) + '</span><span class="ot">' + esc(o) + '</span></label>').join('') +
        '</div>' +
      '</div>').join('') +
      '<div class="quiz-actions"><button class="btn btn-primary" data-check>Проверить ответы</button>' +
      '<span class="muted" data-count>Выбрано 0 из ' + questions.length + '</span></div>';
    host.appendChild(wrap);

    let answered = 0;
    wrap.addEventListener('click', (e) => {
      const opt = e.target.closest('.opt');
      if (opt && !wrap.dataset.done) {
        const q = opt.closest('.quiz-q');
        Array.from(q.querySelectorAll('.opt')).forEach(o => { o.classList.remove('sel'); });
        opt.classList.add('sel');
        const checked = wrap.querySelectorAll('.quiz-q .opt.sel').length;
        wrap.querySelector('[data-count]').textContent = 'Выбрано ' + checked + ' из ' + questions.length;
        answered = checked;
      }
    });

    wrap.querySelector('[data-check]').addEventListener('click', () => {
      if (wrap.dataset.done) return;
      wrap.dataset.done = '1';
      let score = 0;
      questions.forEach((q, qi) => {
        const qEl = wrap.querySelector('.quiz-q[data-q="' + qi + '"]');
        const sel = qEl.querySelector('.opt.sel');
        const chosen = sel ? +sel.dataset.o : -1;
        qEl.querySelectorAll('.opt').forEach((o, oi) => {
          o.style.cursor = 'default';
          if (oi === q.a) o.classList.add('right');
          if (chosen === oi && chosen !== q.a) o.classList.add('wrong');
        });
        if (chosen === q.a) score++;
        if (q.explain) {
          const why = el('div', 'why');
          why.style.cssText = 'font-size:13px;color:#5f6673;margin-top:8px;line-height:1.5';
          why.innerHTML = '<b>Почему:</b> ' + esc(q.explain);
          qEl.appendChild(why);
        }
      });
      wrap.querySelector('[data-check]').style.display = 'none';
      wrap.querySelector('[data-count]').textContent = 'Правильно: ' + score + ' из ' + questions.length;
      if (onDone) onDone({ score: score, total: questions.length });
    });
  }

  /* ------------------------------ measure ----------------------------- */
  function measure(body, ex, ctx) {
    const p = ex.params;
    const txt = A.COURSE.texts[p.textKey];
    const words = wc(txt.text);
    const boss = !!p.boss;

    body.innerHTML =
      (boss ? '<div class="callout" style="border-color:#ff6b2c;background:var(--orange-soft)"><b>Бой с боссом</b>' +
        'Нужно: от ' + p.targetWpm + ' слов/мин при понимании от ' + p.minComp + '%. Рекорд не обязателен — попытку можно повторить.</div>' : '') +
      '<div class="reader-controls">' +
        '<button class="btn btn-primary" data-start>Старт</button>' +
        '<button class="btn btn-ghost" data-finish disabled>Готово</button>' +
        '<div class="timer" data-timer>00:00</div>' +
        '<span class="muted" data-hint>Текст: ' + words + ' слов. Читайте в своём темпе.</span>' +
      '</div>' +
      '<div class="reader-frame" data-frame><div class="reader-text" data-text>' + textParas(txt.text) + '</div></div>' +
      '<div data-q></div>';

    const frame = body.querySelector('[data-frame]');
    const textEl = body.querySelector('[data-text]');
    const timerEl = body.querySelector('[data-timer]');
    const startBtn = body.querySelector('[data-start]');
    const finBtn = body.querySelector('[data-finish]');
    const hint = body.querySelector('[data-hint]');
    let t0 = 0, tick = null, done = false;

    startBtn.addEventListener('click', () => {
      t0 = performance.now();
      A.wake.request();
      startBtn.disabled = true;
      finBtn.disabled = false;
      frame.scrollTop = 0;
      tick = every(() => { timerEl.textContent = fmtTime((performance.now() - t0) / 1000); }, 200);
      hint.textContent = 'Идёт замер. Один проход, без возвратов.';
      timerEl.classList.add('run');
    });

    finBtn.addEventListener('click', () => {
      if (done) return;
      done = true;
      A.wake.release();
      clearInterval(tick);
      const sec = Math.max(1, (performance.now() - t0) / 1000);
      const wpm = words / (sec / 60);
      finBtn.disabled = true;
      startBtn.disabled = true;
      timerEl.textContent = fmtTime(sec);
      timerEl.classList.remove('run');
      textEl.classList.add('hidden');
      const note = el('p', 'muted');
      note.style.margin = '10px 2px 0';
      note.textContent = 'Текст скрыт. ' + Math.round(wpm) + ' слов/мин · отвечайте по памяти.';
      frame.after(note);

      const qhost = body.querySelector('[data-q]');
      askQuestions(qhost, p.questions, (res) => {
        const comp = p.questions.length ? pct(res.score, res.total) : 100;
        const eff = Math.round(wpm * comp / 100);
        const pass = wpm >= (p.targetWpm || 0) && comp >= (p.minComp || 0);
        const base = A.state.rec.baseline;
        let msg;
        if (boss) {
          msg = pass
            ? 'Босс повержен. Скорость и понимание в норме — можно двигаться дальше.'
            : 'Пока не хватает: нужно ' + p.targetWpm + ' слов/мин и ' + p.minComp + '% понимания. ' +
              'Это не провал — перечитайте теорию дня и попробуйте снова.';
        } else if (base) {
          const diff = Math.round((eff - base.eff));
          msg = 'База: ' + base.wpm + ' слов/мин при ' + base.comp + '%. Эффективная скорость: ' + eff +
            ' (' + (diff >= 0 ? '+' : '') + diff + ' к базе).';
        } else {
          msg = 'Это ваша точка отсчёта. Дальше все замеры будут сравниваться с ней.';
        }
        resultBox(body, {
          tone: boss ? (pass ? 'win' : 'lose') : '',
          title: boss ? (pass ? 'Победа' : 'Попытка засчитана') : 'Результат замера',
          nums: [
            { v: Math.round(wpm), l: 'слов/мин' },
            { v: comp + '%', l: 'понимание' },
            { v: eff, l: 'эффективная' }
          ],
          msg: esc(msg)
        });
        const rec = { wpm: wpm, comp: comp, eff: eff, pass: pass, day: ctx.day, label: p.label };
        A.pushMeasure(rec);
        ctx.complete(rec, ex, { wpm: Math.round(wpm), comp: comp, eff: eff, pass: pass, seconds: Math.round(sec) });
      });
    });
  }

  /* ------------------------------ reader ------------------------------ */
  function reader(body, ex, ctx) {
    const p = ex.params;
    const txt = A.COURSE.texts[p.textKey];
    const mode = p.mode || 'plain';
    const words = wc(txt.text);
    const titleNote = {
      plain: 'Читайте в удобном темпе. Когда закончите — «Готово».',
      count: 'Читайте, проговаривая про себя «один-два-три-четыре». Счётчик поможет держать ритм.',
      chunk: 'Читайте блоками: одна остановка глаза — один блок.',
      onepass: 'Один проход. Не возвращайтесь к прочитанному — ведите пальцем под строкой.',
      pacer: 'Держитесь за подсветку. Она задаёт темп — не обгоняйте и не отставайте.',
      rsvp: 'Слова появляются в центре. Не проговаривайте — узнавайте.'
    }[mode] || '';

    if (mode === 'pacer' || mode === 'rsvp') {
      body.innerHTML =
        '<div class="reader-controls">' +
          '<button class="btn btn-primary" data-start>Старт</button>' +
          '<button class="btn btn-ghost" data-pause disabled>Пауза</button>' +
          '<div class="timer" data-timer>00:00</div>' +
          '<span class="muted">' + esc(titleNote) + '</span>' +
        '</div>' +
        '<div class="bar" style="height:6px;margin:0 0 14px"><i data-progress style="width:0"></i></div>' +
        (mode === 'rsvp'
          ? '<div class="rsvp-stage" data-stage><small>Нажмите «Старт»</small></div>'
          : '<div class="reader-frame" data-frame><div class="reader-text" data-text></div></div>') +
        '<div data-q></div>';
      runPaced(body, ex, ctx, mode, words, txt, titleNote);
      return;
    }

    // текстовые режимы
    let textHTML = textParas(txt.text);
    if (mode === 'chunk' && p.marks) {
      textHTML = String(txt.text).split(/\n+/).filter(Boolean).map(par => {
        const ws = par.trim().split(/\s+/);
        const out = [];
        for (let i = 0; i < ws.length; i++) {
          out.push(esc(ws[i]));
          if ((i + 1) % (p.chunkSize || 2) === 0 && i < ws.length - 1) out.push('<span class="chunk-mark"> / </span>');
        }
        return '<p>' + out.join(' ') + '</p>';
      }).join('');
    }

    body.innerHTML =
      '<div class="reader-controls">' +
        '<button class="btn btn-primary" data-start>Старт</button>' +
        '<button class="btn btn-ghost" data-finish disabled>Готово</button>' +
        '<div class="timer" data-timer>00:00</div>' +
        (mode === 'chunk' && p.marks ? '<button class="btn btn-ghost btn-sm" data-marks>Убрать метки</button>' : '') +
        '<span class="muted">' + esc(titleNote) + '</span>' +
      '</div>' +
      (mode === 'count' ? '<div class="count-badge">Считайте про себя: <span class="n" data-count>1</span></div>' : '') +
      '<div class="reader-frame" data-frame><div class="reader-text" data-text>' + textHTML + '</div></div>' +
      '<div data-returns></div>' +
      '<div data-q></div>';

    const frame = body.querySelector('[data-frame]');
    const textEl = body.querySelector('[data-text]');
    const timerEl = body.querySelector('[data-timer]');
    const startBtn = body.querySelector('[data-start]');
    const finBtn = body.querySelector('[data-finish]');
    let t0 = 0, tick = null, countTick = null, done = false;

    if (mode === 'count') {
      const badge = body.querySelector('[data-count]');
      startBtn.addEventListener('click', () => {
        let n = 1;
        countTick = every(() => { n = n % 4 + 1; badge.textContent = n; }, 620);
      });
    }

    startBtn.addEventListener('click', () => {
      t0 = performance.now();
      A.wake.request();
      startBtn.disabled = true;
      finBtn.disabled = false;
      frame.scrollTop = 0;
      tick = every(() => { timerEl.textContent = fmtTime((performance.now() - t0) / 1000); }, 200);
      timerEl.classList.add('run');
    });

    finBtn.addEventListener('click', () => {
      if (done) return;
      done = true;
      A.wake.release();
      clearInterval(tick); clearInterval(countTick);
      const sec = Math.max(1, (performance.now() - t0) / 1000);
      const wpm = words / (sec / 60);
      finBtn.disabled = true;
      timerEl.textContent = fmtTime(sec);
      timerEl.classList.remove('run');
      textEl.classList.add('hidden');

      let returns = null;
      if (p.countReturns) {
        const box = body.querySelector('[data-returns]');
        box.innerHTML = '<div class="callout"><b>Сколько раз захотелось вернуться назад?</b>' +
          '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">' +
          ['0', '1–2', '3–5', 'больше 5'].map((v, i) =>
            '<button class="btn btn-ghost btn-sm" data-ret="' + i + '">' + v + '</button>').join('') + '</div></div>';
        box.querySelectorAll('[data-ret]').forEach(b => b.addEventListener('click', () => {
          returns = ['0', '1–2', '3–5', 'больше 5'][+b.dataset.ret];
          box.innerHTML = '<p class="muted" style="font-size:13px">Возвратов: <b>' + esc(returns) +
            '</b>. Норма для одного прохода — 0–2. Всё, что больше, — привычка перечитывать.</p>';
          goQuestions();
        }));
      } else {
        goQuestions();
      }

      function goQuestions() {
        const qhost = body.querySelector('[data-q]');
        askQuestions(qhost, p.questions, (res) => {
          const comp = p.questions.length ? pct(res.score, res.total) : 100;
          const eff = Math.round(wpm * comp / 100);
          const best = A.state.rec.measures.length ? A.state.rec.best : null;
          const nums = [
            { v: Math.round(wpm), l: 'слов/мин' },
            { v: comp + '%', l: 'понимание' }
          ];
          if (p.questions.length) nums.push({ v: eff, l: 'эффективная' });
          let msg = 'Темп: ' + Math.round(wpm) + ' слов/мин. ';
          if (comp >= 70) msg += 'Понимание в норме — темп можно удерживать.';
          else msg += 'Понимание ниже 70%: для этого текста темп стоит снизить.';
          if (returns) msg += ' Возвратов за проход: ' + returns + '.';
          if (mode === 'onepass' && returns && returns !== '0') msg += ' Цель следующего прохода — ноль.';
          resultBox(body, {
            title: 'Готово',
            nums: nums,
            msg: esc(msg)
          });
          ctx.complete({ wpm: Math.round(wpm), comp: comp, eff: eff, seconds: Math.round(sec), returns: returns }, ex, {});
        });
      }
    });

    const marksBtn = body.querySelector('[data-marks]');
    if (marksBtn) {
      const marked = () => String(txt.text).split(/\n+/).filter(Boolean).map(par => {
        const ws = par.trim().split(/\s+/);
        const out = [];
        for (let i = 0; i < ws.length; i++) {
          out.push(esc(ws[i]));
          if ((i + 1) % (p.chunkSize || 2) === 0 && i < ws.length - 1) out.push('<span class="chunk-mark"> / </span>');
        }
        return '<p>' + out.join(' ') + '</p>';
      }).join('');
      let withMarks = true;
      marksBtn.addEventListener('click', () => {
        withMarks = !withMarks;
        textEl.innerHTML = withMarks ? marked() : textParas(txt.text);
        marksBtn.textContent = withMarks ? 'Убрать метки' : 'Вернуть метки';
      });
    }
  }

  /* -------------------------- paced (pacer/rsvp) ---------------------- */
  function runPaced(body, ex, ctx, mode, wordsCount, txt, note) {
    const p = ex.params;
    const wpm = p.wpm || 350;
    const stage = body.querySelector('[data-stage]');
    const frame = body.querySelector('[data-frame]');
    const textEl = body.querySelector('[data-text]');
    const timerEl = body.querySelector('[data-timer]');
    const startBtn = body.querySelector('[data-start]');
    const pauseBtn = body.querySelector('[data-pause]');
    const progEl = body.querySelector('[data-progress]');
    const qhost = body.querySelector('[data-q]');

    const flat = String(txt.text).split(/\n+/).filter(Boolean)
      .reduce((acc, par) => acc.concat(par.trim().split(/\s+/)), []);
    const total = flat.length;
    const chunk = mode === 'pacer' ? (wpm < 300 ? 2 : (wpm < 380 ? 3 : 4)) : 1;
    const stepMs = chunk / wpm * 60000;

    let ptr = 0, running = false, done = false, elapsed = 0, startAt = 0;
    let stepper = null, ticker = null, spans = [];

    if (mode === 'pacer') {
      let idx = 0;
      textEl.innerHTML = String(txt.text).split(/\n+/).filter(Boolean).map(par => {
        const ws = par.trim().split(/\s+/);
        return '<p>' + ws.map(w => '<span class="pace-word" data-i="' + (idx++) + '">' + esc(w) + '</span>').join(' ') + '</p>';
      }).join('');
      spans = Array.from(textEl.querySelectorAll('.pace-word'));
    }

    function paint() {
      if (mode === 'pacer' && frame) {
        spans.forEach(sp => sp.classList.remove('on'));
        const end = Math.min(total, ptr + chunk);
        for (let i = ptr; i < end; i++) if (spans[i]) spans[i].classList.add('on');
        if (spans[ptr]) frame.scrollTop = Math.max(0, spans[ptr].offsetTop - frame.clientHeight / 2 + 10);
      } else if (stage) {
        stage.innerHTML = '<div>' + esc(flat[ptr] || '') + '</div><small>' +
          Math.round(ptr / total * 100) + '%</small>';
      }
      if (progEl) progEl.style.width = Math.min(100, ptr / total * 100) + '%';
    }

    function step() {
      ptr += chunk;
      if (ptr >= total) { finish(); return; }
      paint();
    }

    function startClock() {
      startAt = performance.now() - elapsed * 1000;
      ticker = setInterval(() => {
        elapsed = (performance.now() - startAt) / 1000;
        timerEl.textContent = fmtTime(elapsed);
      }, 200);
      timers.push(ticker);
      stepper = setInterval(step, stepMs);
      timers.push(stepper);
    }
    function stopClock() {
      clearInterval(ticker); clearInterval(stepper);
      ticker = stepper = null;
    }

    function start() {
      if (done || running) return;
      running = true;
      A.wake.request();
      startBtn.disabled = true;
      pauseBtn.disabled = false;
      pauseBtn.textContent = 'Пауза';
      startClock();
    }

    function pause() {
      if (!running) return;
      running = false;
      stopClock();
      A.wake.release();
      pauseBtn.textContent = 'Продолжить';
      pauseBtn.dataset.resume = '1';
    }

    function finish() {
      if (done) return;
      done = true;
      running = false;
      stopClock();
      A.wake.release();
      startBtn.disabled = true;
      pauseBtn.disabled = true;
      if (mode === 'pacer') {
        spans.forEach(sp => sp.classList.remove('on'));
        if (frame) frame.scrollTop = 0;
      } else if (stage) {
        stage.innerHTML = '<small>Готово. Ответьте на вопросы.</small>';
      }
      timerEl.textContent = fmtTime(elapsed);
      const realWpm = Math.round(total / Math.max(0.05, elapsed / 60));
      askQuestions(qhost, p.questions, (res) => {
        const comp = p.questions.length ? pct(res.score, res.total) : 100;
        const eff = Math.round(realWpm * comp / 100);
        resultBox(body, {
          title: 'Тренажёр пройден',
          nums: [
            { v: realWpm, l: 'фактический темп' },
            { v: wpm, l: 'целевой темп' },
            { v: comp + '%', l: 'понимание' }
          ],
          msg: esc(comp >= 70
            ? 'Понимание держится. Темп чуть выше привычного — это и есть тренировка.'
            : 'Понимание просело. На следующем проходе снизьте темп или прочитайте текст обычным способом.')
        });
        ctx.complete({ wpm: realWpm, comp: comp, eff: eff, seconds: Math.round(elapsed) }, ex, {});
      });
    }

    startBtn.addEventListener('click', start);
    pauseBtn.addEventListener('click', () => {
      if (pauseBtn.dataset.resume) {
        pauseBtn.dataset.resume = '';
        pauseBtn.textContent = 'Пауза';
        running = true;
        startClock();
      } else pause();
    });
  }

  /* ------------------------------ schulte ----------------------------- */
  function schulte(body, ex, ctx) {
    const p = ex.params;
    const n = p.size || 5;
    const total = n * n;
    const rounds = p.rounds || 1;
    const target = p.targetSec || 60;

    body.innerHTML =
      '<div class="schulte-wrap">' +
        '<div><div class="schulte" data-grid style="grid-template-columns:repeat(' + n + ',1fr)"></div></div>' +
        '<div class="schulte-side">' +
          '<div class="lbl">Раунд</div><div class="big" data-round>1 / ' + rounds + '</div>' +
          '<div class="lbl" style="margin-top:14px">Время</div><div class="big" data-time>00:00</div>' +
          '<div class="lbl" style="margin-top:14px">Лучший</div><div class="big" data-best>—</div>' +
          '<div class="schulte-next">Ищите: <b data-next>1</b></div>' +
          '<p class="muted" style="font-size:12.5px;margin-top:14px">Держите взгляд в центре. Голову не поворачивайте.</p>' +
        '</div>' +
      '</div>' +
      '<div data-msg></div>';

    const grid = body.querySelector('[data-grid]');
    const roundEl = body.querySelector('[data-round]');
    const timeEl = body.querySelector('[data-time]');
    const bestEl = body.querySelector('[data-best]');
    const nextEl = body.querySelector('[data-next]');
    const msg = body.querySelector('[data-msg]');

    let round = 1, next = 1, t0 = 0, tick = null, times = [], errors = 0, started = false;

    function build() {
      const nums = Array.from({ length: total }, (_, i) => i + 1);
      for (let i = nums.length - 1; i > 0; i--) {
        const j = (Math.random() * (i + 1)) | 0;
        [nums[i], nums[j]] = [nums[j], nums[i]];
      }
      grid.innerHTML = nums.map(v => '<button data-v="' + v + '">' + v + '</button>').join('');
    }

    function startRound() {
      next = 1; errors = 0; started = true;
      A.wake.request();
      build();
      nextEl.textContent = '1';
      roundEl.textContent = round + ' / ' + rounds;
      t0 = performance.now();
      clearInterval(tick);
      tick = every(() => { timeEl.textContent = fmtTime((performance.now() - t0) / 1000); }, 200);
      timers.push(tick);
    }

    grid.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b || !started) return;
      const v = +b.dataset.v;
      if (v === next) {
        b.classList.add('hit');
        b.disabled = true;
        next++;
        nextEl.textContent = next > total ? '✓' : next;
        if (next > total) {
          const sec = (performance.now() - t0) / 1000;
          times.push(sec);
          clearInterval(tick);
          b.classList.remove('hit');
          if (round < rounds) {
            round++;
            msg.innerHTML = '<div class="result"><h4>Раунд ' + (round - 1) + ': ' + sec.toFixed(1) + ' с</h4>' +
              '<div class="msg">Отдохните 5 секунд и нажмите «Следующий раунд».</div>' +
              '<div class="row" style="display:flex;justify-content:flex-start;margin-top:12px">' +
              '<button class="btn btn-primary btn-sm" data-next-round>Следующий раунд</button></div></div>';
            msg.querySelector('[data-next-round]').addEventListener('click', () => { msg.innerHTML = ''; startRound(); });
            started = false;
          } else {
            finishAll(sec);
          }
        }
      } else {
        errors++;
        b.classList.add('miss');
        setTimeout(() => b.classList.remove('miss'), 320);
      }
    });

    function finishAll(lastSec) {
      started = false;
      A.wake.release();
      const best = Math.min.apply(null, times);
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      const valid = best >= 2; // защита от случайных/автоматических кликов
      const prev = A.state.rec.schulte[n];
      if (valid && (!prev || best < prev)) A.state.rec.schulte[n] = best;
      bestEl.textContent = best.toFixed(1) + ' с';
      resultBox(body, {
        tone: best <= target && valid ? 'win' : '',
        title: !valid ? 'Слишком быстро для честного прохода'
          : (best <= target ? 'Быстрее норматива' : 'Раунд завершён'),
        nums: [
          { v: best.toFixed(1) + ' с', l: 'лучший раунд' },
          { v: avg.toFixed(1) + ' с', l: 'среднее' },
          { v: errors, l: 'ошибок' }
        ],
        msg: !valid
          ? 'Результат не записан. Нажимайте числа руками и ищите их взглядом — упражнение работает только так.'
          : ('Норматив для новичка — ' + target + ' секунд. ' +
            (prev ? 'Ваш прежний рекорд: ' + prev.toFixed(1) + ' с.' : 'Это первый результат, он уже записан.'))
      });
      ctx.complete({ seconds: +best.toFixed(1), errors: errors, valid: valid }, ex, {});
      msg.innerHTML = '';
    }

    msg.innerHTML = '<div class="callout"><b>Готовы?</b> Нажмите «Старт», чтобы начать раунд: числа от 1 до ' + total + ' по порядку.' +
      '<div style="margin-top:12px"><button class="btn btn-primary btn-sm" data-go>Старт</button></div></div>';
    msg.querySelector('[data-go]').addEventListener('click', () => { msg.innerHTML = ''; startRound(); });
  }

  /* ------------------------------- wedge ------------------------------ */
  function wedge(body, ex, ctx) {
    const p = ex.params;
    const rows = p.rows || 7;
    const target = p.targetSec || 35;
    let html = '<div class="wedge">';
    const vals = [];
    for (let i = 0; i < rows; i++) {
      const len = i + 3;
      const s = Array.from({ length: len }, () => (Math.random() * 10) | 0).join('');
      vals.push(s);
      html += '<div class="wedge-row">' + s.split('').join(' ') + '</div>';
    }
    html += '</div>';

    body.innerHTML =
      '<div class="reader-controls">' +
        '<button class="btn btn-primary" data-start>Старт</button>' +
        '<button class="btn btn-ghost" data-finish disabled>Готово</button>' +
        '<div class="timer" data-timer>00:00</div>' +
        '<span class="muted">Читайте вслух, взгляд — в центр строки.</span>' +
      '</div>' + html + '<div data-res></div>';

    const timerEl = body.querySelector('[data-timer]');
    const startBtn = body.querySelector('[data-start]');
    const finBtn = body.querySelector('[data-finish]');
    let t0 = 0, tick = null;

    startBtn.addEventListener('click', () => {
      t0 = performance.now();
      A.wake.request();
      startBtn.disabled = true; finBtn.disabled = false;
      tick = every(() => { timerEl.textContent = fmtTime((performance.now() - t0) / 1000); }, 200);
      timers.push(tick);
    });

    finBtn.addEventListener('click', () => {
      clearInterval(tick);
      A.wake.release();
      finBtn.disabled = true; startBtn.disabled = true;
      const sec = (performance.now() - t0) / 1000;
      timerEl.textContent = fmtTime(sec);
      const res = body.querySelector('[data-res]');
      res.innerHTML = '<div class="callout"><b>Самопроверка</b>Прочитали все строки без ошибок и остановок внутри строки?</div>' +
        '<div style="display:flex;gap:8px;margin-bottom:6px"><button class="btn btn-primary btn-sm" data-ok="1">Да</button>' +
        '<button class="btn btn-ghost btn-sm" data-ok="0">Были ошибки</button></div>';
      res.querySelectorAll('[data-ok]').forEach(b => b.addEventListener('click', () => {
        const ok = b.dataset.ok === '1';
        res.innerHTML = '';
        resultBox(res, {
          tone: ok && sec <= target ? 'win' : '',
          title: ok ? 'Чистое чтение' : 'Есть над чем работать',
          nums: [
            { v: sec.toFixed(1) + ' с', l: 'время' },
            { v: target + ' с', l: 'норматив' }
          ],
          msg: ok
            ? 'Строки прочитаны без остановок внутри — захват расширяется. Повторите завтра.'
            : 'Ошибки внутри строки — норма для начала. Держите взгляд в центре и не помогайте себе головой.'
        });
        ctx.complete({ seconds: +sec.toFixed(1), ok: ok }, ex, {});
      }));
    });
  }

  /* -------------------------------- scan ------------------------------ */
  function scan(body, ex, ctx) {
    const p = ex.params;
    const txt = A.COURSE.texts[p.textKey];
    const limit = p.seconds || 60;
    body.innerHTML =
      '<div class="reader-controls">' +
        '<button class="btn btn-primary" data-start>Старт · ' + limit + ' с</button>' +
        '<div class="timer" data-timer>' + fmtTime(limit) + '</div>' +
        '<span class="muted">Найдите ответы в тексте. Читать всё подряд не нужно.</span>' +
      '</div>' +
      '<div class="reader-frame" style="max-height:300px"><div class="reader-text" data-text>' + textParas(txt.text) + '</div></div>' +
      '<div data-q style="margin-top:16px"></div>';
    const qhost = body.querySelector('[data-q]');
    const timerEl = body.querySelector('[data-timer]');
    const startBtn = body.querySelector('[data-start]');
    let left = limit, iv = null, finished = false;

    qhost.innerHTML = '<div class="muted" style="font-size:14px">Вопросы появятся после старта.</div>';

    startBtn.addEventListener('click', () => {
      startBtn.disabled = true;
      A.wake.request();
      qhost.innerHTML = '';
      askQuestions(qhost, p.questions, (res) => {
        clearInterval(iv);
        A.wake.release();
        if (finished) return;
        finished = true;
        const comp = pct(res.score, res.total);
        resultBox(body, {
          tone: res.score === res.total ? 'win' : '',
          title: 'Сканирование завершено',
          nums: [
            { v: res.score + '/' + res.total, l: 'верных ответов' },
            { v: fmtTime(limit - left), l: 'затрачено' }
          ],
          msg: esc(res.score === res.total
            ? 'Вы нашли всё, не читая текст целиком. Именно так работает режим поиска.'
            : 'Часть ответов ускользнула. Попробуйте сначала выписать ключевые слова вопроса, а потом вести глаз по цифрам и заголовкам.')
        });
        ctx.complete({ score: res.score, total: res.total, seconds: limit - left }, ex, {});
      });
      qhost.querySelector('.quiz-actions') && (qhost.querySelector('.quiz-actions').style.visibility = 'visible');
      iv = setInterval(() => {
        left--;
        timerEl.textContent = fmtTime(Math.max(0, left));
        if (left <= 0) {
          clearInterval(iv);
          const btn = qhost.querySelector('[data-check]');
          if (btn) btn.click();
        }
      }, 1000);
      timers.push(iv);
    });
  }

  /* ------------------------------- recall ----------------------------- */
  function recall(body, ex, ctx) {
    const p = ex.params;
    const txt = A.COURSE.texts[p.textKey];
    const limit = p.seconds || 120;
    body.innerHTML =
      '<div class="callout"><b>Сначала прочитайте текст</b>Один раз, внимательно. Потом текст скроется, и вы напишете всё, что запомнили.</div>' +
      '<div class="reader-frame" style="max-height:340px"><div class="reader-text" data-text>' + textParas(txt.text) + '</div></div>' +
      '<div style="margin-top:14px"><button class="btn btn-primary" data-hide>Скрыть текст и вспомнить</button></div>' +
      '<div data-stage></div>';

    const stage = body.querySelector('[data-stage]');
    body.querySelector('[data-hide]').addEventListener('click', (e) => {
      e.target.disabled = true;
      A.wake.request();
      body.querySelector('[data-text]').classList.add('hidden');
      stage.innerHTML =
        '<div class="reader-controls" style="margin-top:16px"><div class="timer" data-timer>' + fmtTime(limit) + '</div>' +
        '<span class="muted">Пишите свободно, без остановок. Детали тоже считаются.</span></div>' +
        '<textarea class="input" data-ta rows="7" placeholder="Что вы запомнили? Факты, идеи, примеры…"></textarea>' +
        '<div style="margin-top:12px;display:flex;gap:10px;align-items:center">' +
        '<button class="btn btn-primary" data-check>Проверить</button><span class="muted" data-chars>0 символов</span></div>';
      const ta = stage.querySelector('[data-ta]');
      const chars = stage.querySelector('[data-chars]');
      ta.addEventListener('input', () => { chars.textContent = ta.value.length + ' символов'; });
      let left = limit;
      const iv = setInterval(() => {
        left--;
        stage.querySelector('[data-timer]').textContent = fmtTime(Math.max(0, left));
        if (left <= 0) { clearInterval(iv); check(); }
      }, 1000);
      timers.push(iv);

      function check() {
        clearInterval(iv);
        A.wake.release();
        const answer = ta.value.toLowerCase().replace(/ё/g, 'е');
        const hits = p.keywords.filter(k => answer.includes(k.toLowerCase().replace(/ё/g, 'е').slice(0, 6)));
        const score = hits.length;
        const total = p.keywords.length;
        ta.disabled = true;
        stage.querySelector('[data-check]').disabled = true;
        resultBox(stage, {
          tone: score >= Math.ceil(total * 0.6) ? 'win' : '',
          title: 'Припоминание: ' + score + ' из ' + total + ' ключевых пунктов',
          nums: [
            { v: score + '/' + total, l: 'ключевых пунктов' },
            { v: ta.value.trim().split(/\s+/).filter(Boolean).length, l: 'слов написано' }
          ],
          msg: (score === total ? 'Отлично: вы восстановили весь каркас текста. '
            : 'Не страшно. Именно провал показывает, что стоит повторить. ') +
            'Не хватило: <b>' + esc(p.keywords.filter(k => hits.indexOf(k) < 0).join(', ')) + '</b>.'
        });
        ctx.complete({ hits: score, total: total, words: ta.value.trim().split(/\s+/).filter(Boolean).length }, ex, {});
      }
      stage.querySelector('[data-check]').addEventListener('click', check);
    });
  }

  /* ----------------------------- flexmatch ---------------------------- */
  function flexmatch(body, ex, ctx) {
    const p = ex.params;
    let answered = 0, correct = 0;
    body.innerHTML = '<div data-list></div><div data-res></div>';
    const list = body.querySelector('[data-list]');
    p.pairs.forEach((pair, i) => {
      const row = el('div', 'ex');
      row.style.marginBottom = '12px';
      row.innerHTML =
        '<div class="ex-body" style="padding:14px 16px">' +
          '<div style="font-weight:700;margin-bottom:10px">' + (i + 1) + '. ' + esc(pair.scenario) + '</div>' +
          '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
            p.modes.map(m => '<button class="btn btn-ghost btn-sm" data-mode="' + m.id + '">' + esc(m.label) + '</button>').join('') +
          '</div><div data-fb style="font-size:13px;margin-top:8px"></div>' +
        '</div>';
      list.appendChild(row);
      row.querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click', () => {
        if (row.dataset.done) return;
        row.dataset.done = '1';
        answered++;
        const ok = b.dataset.mode === pair.answer;
        if (ok) correct++;
        row.querySelectorAll('[data-mode]').forEach(x => {
          x.disabled = true;
          if (x.dataset.mode === pair.answer) x.style.cssText = 'background:#e6f7f1;border-color:#9fdcc8;color:#0b6b51;font-weight:700';
        });
        if (!ok) b.style.cssText = 'background:#fef3f2;border-color:#f3b4ae;color:#a12a20';
        row.querySelector('[data-fb]').innerHTML = (ok ? '✓ Верно. ' : '✗ Не совсем. ') + esc(pair.explain);
        row.querySelector('[data-fb]').style.color = ok ? '#0b6b51' : '#a12a20';
        if (answered === p.pairs.length) finish();
      }));
    });

    function finish() {
      const res = body.querySelector('[data-res]');
      resultBox(res, {
        tone: correct === p.pairs.length ? 'win' : '',
        title: 'Режимы выбраны: ' + correct + ' из ' + p.pairs.length,
        nums: [
          { v: correct + '/' + p.pairs.length, l: 'верно' }
        ],
        msg: 'Правило простое: сначала цель и цена ошибки, потом скорость. Договор — глубоко, новость — просмотром.'
      });
      ctx.complete({ score: correct, total: p.pairs.length }, ex, {});
    }
  }

  /* ----------------------------- checklist ---------------------------- */
  function checklist(body, ex, ctx) {
    const p = ex.params;
    body.innerHTML =
      '<div data-list>' + p.items.map((it, i) =>
        '<label class="opt" style="margin-bottom:8px" data-i="' + i + '">' +
        '<input type="checkbox"><span class="k">' + (i + 1) + '</span><span>' + esc(it) + '</span></label>').join('') + '</div>' +
      '<div style="margin-top:14px;display:flex;gap:12px;align-items:center">' +
      '<button class="btn btn-primary" data-done disabled>Отметить выполненным</button>' +
      '<span class="muted" data-count>0 из ' + p.items.length + '</span></div>' +
      '<div data-res></div>';
    const boxes = Array.from(body.querySelectorAll('input[type=checkbox]'));
    const btn = body.querySelector('[data-done]');
    const cnt = body.querySelector('[data-count]');
    function upd() {
      boxes.forEach(b => b.closest('.opt').classList.toggle('sel', b.checked));
      const n = boxes.filter(b => b.checked).length;
      cnt.textContent = n + ' из ' + p.items.length;
      btn.disabled = n < p.items.length;
    }
    boxes.forEach(b => b.addEventListener('change', upd));
    btn.addEventListener('click', () => {
      btn.disabled = true;
      boxes.forEach(b => b.disabled = true);
      resultBox(body.querySelector('[data-res]'), {
        tone: 'win',
        title: 'Шаг зафиксирован',
        msg: 'Чек-лист — это не отчёт, а сигнал: действие выполнено. Возвращайтесь к нему, когда начнёте сомневаться в прогрессе.'
      });
      ctx.complete({ checked: boxes.length }, ex, {});
    });
  }

  /* ---------------------------- reflection ---------------------------- */
  function reflection(body, ex, ctx) {
    const p = ex.params;
    const day = ctx.day;
    const saved = A.state.journal[day] || '';
    body.innerHTML =
      '<div style="font-weight:700;margin-bottom:8px">' + esc(p.prompt) + '</div>' +
      '<textarea class="input" rows="5" data-ta placeholder="' + esc(p.placeholder || '') + '">' + esc(saved) + '</textarea>' +
      '<div style="margin-top:10px;display:flex;gap:12px;align-items:center;flex-wrap:wrap">' +
      '<button class="btn btn-primary" data-save>Сохранить</button>' +
      '<span class="muted" data-count>' + saved.length + ' символов · минимум ' + p.minChars + '</span></div>' +
      '<div data-res></div>';
    const ta = body.querySelector('[data-ta]');
    const cnt = body.querySelector('[data-count]');
    const btn = body.querySelector('[data-save]');
    ta.addEventListener('input', () => {
      A.state.journal[day] = ta.value;
      A.save();
      cnt.textContent = ta.value.length + ' символов · минимум ' + p.minChars;
      btn.disabled = ta.value.trim().length < p.minChars;
    });
    btn.disabled = (saved.trim().length < p.minChars);
    btn.addEventListener('click', () => {
      A.state.journal[day] = ta.value;
      A.save();
      btn.disabled = true;
      ta.disabled = true;
      resultBox(body.querySelector('[data-res]'), {
        tone: 'win',
        title: 'Записано',
        msg: 'Ответ сохранён в дневнике (раздел «Прогресс»). К нему стоит вернуться в конце курса.'
      });
      ctx.complete({ chars: ta.value.length }, ex, {});
    });
  }

  window.Train = {
    measure, reader, schulte, wedge, scan, recall, flexmatch, checklist, reflection,
    askQuestions, stopAll, resultBox, textParas
  };
})();
