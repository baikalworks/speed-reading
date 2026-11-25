/* Ядро приложения: состояние, XP, ранги, достижения, уведомления. */
(function () {
  'use strict';

  const COURSE = window.COURSE;
  const KEY = 'speedread14_v1';
  const VERSION = '1.9.2';
  const VERSION_DATE = '24.11.2026';

  const RANKS = COURSE.ranks;
  const ACH = COURSE.achievements;

  /* ------------------------------ helpers ------------------------------ */
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  function wc(text) {
    const m = String(text).match(/[A-Za-zА-Яа-яЁё0-9]+(?:[-'][A-Za-zА-Яа-яЁё0-9]+)*/g);
    return m ? m.length : 0;
  }
  function fmtTime(sec) {
    sec = Math.max(0, sec);
    const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
    return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
  }
  function fmtNum(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); }
  function todayKey() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function dayDiff(a, b) {
    const pa = new Date(a + 'T12:00:00'), pb = new Date(b + 'T12:00:00');
    return Math.round((pb - pa) / 86400000);
  }
  function pct(a, b) { return b ? Math.round(a / b * 100) : 0; }

  /* ------------------------------- store ------------------------------- */
  const blank = () => ({
    v: 1, name: '', created: new Date().toISOString(),
    xp: 0, streak: 0, bestStreak: 0, lastDay: null,
    dailyMinutes: 20, voice: 'svetlana', audioRate: 1.15,
    mode: 'adult', kids: {},
    train: {}, trainBoost: {}, trainAccel: false, customText: '', useCustom: false,
    days: {}, ex: {}, quiz: {}, boss: {}, ach: {},
    rec: { baseline: null, best: { wpm: 0, comp: 0, eff: 0 }, measures: [], schulte: {}, wedge: null },
    journal: {}, cheatSeen: false
  });

  let state;
  let memoryOnly = false;

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        state = Object.assign(blank(), JSON.parse(raw));
        state.rec = Object.assign(blank().rec, state.rec || {});
        return;
      }
    } catch (e) { memoryOnly = true; }
    state = blank();
  }
  function save() {
    if (memoryOnly) return;
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { memoryOnly = true; }
  }

  /* ------------------------------- ranks ------------------------------- */
  function rankOf(xp) {
    let i = 0;
    for (let k = 0; k < RANKS.length; k++) if (xp >= RANKS[k].min) i = k;
    const cur = RANKS[i], next = RANKS[i + 1] || null;
    const progress = next ? Math.min(100, Math.max(0, (xp - cur.min) / (next.min - cur.min) * 100)) : 100;
    return { i, name: cur.name, next: next ? next.name : null, nextAt: next ? next.min : cur.min, progress };
  }

  /* ------------------------------ gamify ------------------------------- */
  function toast(text, kind, icon) {
    const host = $('#toasts');
    if (!host) return;
    const t = document.createElement('div');
    t.className = 'toast ' + (kind || '');
    t.innerHTML = '<span class="ic">' + esc(icon || '+') + '</span><span>' + esc(text) + '</span>';
    host.appendChild(t);
    setTimeout(() => {
      t.style.transition = 'opacity .35s, transform .35s';
      t.style.opacity = '0';
      t.style.transform = 'translateY(8px)';
      setTimeout(() => t.remove(), 380);
    }, 3200);
  }

  let lastRank = null;
  function addXP(n, label) {
    if (!n) return;
    const before = rankOf(state.xp).i;
    state.xp += n;
    save();
    renderHud();
    toast('+' + n + ' XP' + (label ? ' · ' + label : ''), 'xp', '+');
    const after = rankOf(state.xp).i;
    if (before !== after && lastRank !== null) {
      const r = rankOf(state.xp);
      toast('Новый ранг: ' + r.name, 'rank', '★');
      confetti(90);
    }
    lastRank = after;
  }

  const ACH_ICON = {};
  ACH.forEach(a => { ACH_ICON[a.id] = a.icon; });

  function unlock(id) {
    if (state.ach[id]) return false;
    const meta = ACH.find(a => a.id === id);
    if (!meta) return false;
    state.ach[id] = new Date().toISOString();
    save();
    toast('Достижение: ' + meta.title, 'ach', meta.icon);
    confetti(70);
    return true;
  }

  function checkAchievements() {
    if (Object.keys(state.days).length > 0) unlock('first_lesson');
    if (state.streak >= 3) unlock('streak_3');
    if (state.streak >= 7) unlock('streak_7');
    if (state.rec.schulte[5] && state.rec.schulte[5] <= 45) unlock('schulte_45');
    if (state.rec.best.wpm >= 300 && state.rec.best.comp >= 70) unlock('speed_300');
    if (state.rec.best.wpm >= 400 && state.rec.best.comp >= 70) unlock('speed_400');
    if (state.rec.best.comp >= 90) unlock('comp_90');
    if (state.boss[1]) unlock('boss_1');
    if (state.boss[2]) unlock('boss_2');
    if (state.boss[3]) unlock('boss_3');
    Object.keys(state.quiz).forEach(d => {
      const q = state.quiz[d];
      if (q && q.total && q.score === q.total) unlock('perfect_quiz');
    });
    if (Object.keys(state.days).length >= COURSE.lessons.length) unlock('all_lessons');
  }

  /* ------------------------------ records ------------------------------ */
  function pushMeasure(rec) {
    const m = {
      at: new Date().toISOString(),
      day: rec.day, label: rec.label || '',
      wpm: Math.round(rec.wpm), comp: Math.round(rec.comp),
      eff: Math.round(rec.eff), pass: !!rec.pass
    };
    state.rec.measures.push(m);
    if (!state.rec.baseline) state.rec.baseline = m;
    if (m.wpm > state.rec.best.wpm) {
      state.rec.best.wpm = m.wpm;
      state.rec.best.comp = m.comp;
      state.rec.best.eff = m.eff;
    }
    if (m.comp > state.rec.best.comp) state.rec.best.comp = m.comp;
    save();
    return m;
  }

  function exKey(day, idx) { return 'd' + day + 'e' + idx; }

  function completeExercise(day, idx, ex, result) {
    const key = exKey(day, idx);
    const isBoss = !!(ex.params && ex.params.boss);
    const success = !isBoss || !!(result && result.pass);
    const first = !state.ex[key];
    const prev = state.ex[key] || {};
    state.ex[key] = Object.assign({ done: success, at: new Date().toISOString() }, result || {});
    let gained = 0;
    if (first && success) { gained = ex.xp || 0; }
    if (gained) { state.xp += gained; }
    save();
    if (gained) {
      renderHud();
      toast('+' + gained + ' XP · ' + ex.title, 'xp', '+');
      const before = rankOf(state.xp - gained).i, after = rankOf(state.xp).i;
      if (before !== after && lastRank !== null) {
        toast('Новый ранг: ' + rankOf(state.xp).name, 'rank', '★');
        confetti(90);
      }
      lastRank = after;
    }
    if (ex.type === 'measure' && result && result.wpm) {
      result.day = day;
      if (isBoss && result.pass) {
        const n = day <= 3 ? 1 : (day <= 8 ? 2 : 3);
        state.boss[n] = true;
        save();
        confetti(140);
        toast('Босс побеждён!', 'ach', '⚔');
      }
    }
    checkAchievements();
    return { first: first, gained: gained, prev: prev, failed: !success };
  }

  function completeQuiz(day, score, total, xp) {
    const first = !state.quiz[day];
    state.quiz[day] = { score: score, total: total, at: new Date().toISOString() };
    let gained = 0;
    if (first) { gained = xp || 0; state.xp += gained; }
    save();
    if (gained) {
      renderHud();
      toast('+' + gained + ' XP · проверка', 'xp', '✓');
    }
    checkAchievements();
    return { first: first, gained: gained };
  }

  function lessonReady(day) {
    const L = COURSE.lessons[day - 1];
    if (!L) return false;
    const main = L.exercises.filter((e, i) => !e.params.boss && !e.optional);
    const allEx = main.every((e) => {
      const idx = L.exercises.indexOf(e);
      return state.ex[exKey(day, idx)] && state.ex[exKey(day, idx)].done;
    });
    return allEx && !!state.quiz[day];
  }

  function completeLesson(day) {
    if (state.days[day]) return false;
    state.days[day] = { done: true, at: new Date().toISOString() };
    const today = todayKey();
    if (state.lastDay === today) {
      /* уже занимались сегодня — серия не меняется */
    } else if (state.lastDay && dayDiff(state.lastDay, today) === 1) {
      state.streak += 1;
    } else if (!state.lastDay) {
      state.streak = 1;
    } else {
      state.streak = 1;
    }
    state.bestStreak = Math.max(state.bestStreak || 0, state.streak);
    state.lastDay = today;
    state.xp += 40;
    save();
    renderHud();
    toast('День ' + day + ' закрыт · +40 XP', 'ach', '✓');
    confetti(120);
    checkAchievements();
    return true;
  }

  /* ------------------------------- hud -------------------------------- */
  function renderHud() {
    const r = rankOf(state.xp);
    const rankEl = $('#hud-rank'), xpEl = $('#hud-xp'), barEl = $('#hud-bar'), st = $('#hud-streak');
    if (!rankEl) return;
    const bv = $('#brand-version');
    if (bv) bv.textContent = 'v' + VERSION;
    rankEl.textContent = r.name;
    xpEl.textContent = fmtNum(state.xp) + ' XP';
    barEl.style.width = r.progress + '%';
    st.textContent = state.streak || 0;
    const wrap = st.parentElement;
    wrap.title = 'Серия: ' + (state.streak || 0) + ' дн. Лучшая: ' + (state.bestStreak || 0);
  }

  /* ------------------------------ confetti ----------------------------- */
  const cv = document.getElementById('fx');
  let fxParticles = [], fxRaf = null;
  function confetti(n) {
    if (!cv) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
    cv.style.display = 'block';
    const ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const colors = ['#3b6ef5', '#ff6b2c', '#0f9d76', '#7c3aed', '#ffc94d'];
    for (let i = 0; i < (n || 80); i++) {
      fxParticles.push({
        x: innerWidth * (0.2 + Math.random() * 0.6),
        y: innerHeight * 0.35 + Math.random() * 60,
        vx: (Math.random() - 0.5) * 9,
        vy: -Math.random() * 9 - 3,
        g: 0.22 + Math.random() * 0.12,
        s: 3 + Math.random() * 5,
        c: colors[(Math.random() * colors.length) | 0],
        rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3,
        life: 90 + Math.random() * 40
      });
    }
    if (!fxRaf) tick();
    function tick() {
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      fxParticles = fxParticles.filter(p => p.life > 0 && p.y < innerHeight + 40);
      fxParticles.forEach(p => {
        p.vy += p.g; p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life--;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.globalAlpha = Math.max(0, Math.min(1, p.life / 40));
        ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.6);
        ctx.restore();
      });
      if (fxParticles.length) { fxRaf = requestAnimationFrame(tick); }
      else { fxRaf = null; cv.style.display = 'none'; ctx.clearRect(0, 0, innerWidth, innerHeight); }
    }
  }

  /* ----------------------------- wake lock ---------------------------- */
  /* Не даём экрану телефона гаснуть во время замера или чтения под темп. */
  const wake = {
    sentinel: null,
    wanted: false,
    async request() {
      this.wanted = true;
      if (!('wakeLock' in navigator) || this.sentinel) return;
      try {
        this.sentinel = await navigator.wakeLock.request('screen');
        this.sentinel.addEventListener('release', () => { this.sentinel = null; });
      } catch (e) { this.sentinel = null; }
    },
    release() {
      this.wanted = false;
      if (!this.sentinel) return;
      try { this.sentinel.release(); } catch (e) { /* noop */ }
      this.sentinel = null;
    }
  };
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && wake.wanted) wake.request();
  });

  /* ------------------------------- modal ------------------------------ */
  function modal(html, opts) {
    opts = opts || {};
    const root = $('#modal-root');
    root.innerHTML = '<div class="modal-back"><div class="modal">' + html + '</div></div>';
    const back = root.firstChild;
    back.addEventListener('click', (e) => { if (e.target === back && opts.dismissable !== false) close(); });
    function close() { root.innerHTML = ''; if (opts.onClose) opts.onClose(); }
    $$('[data-close]', root).forEach(b => b.addEventListener('click', close));
    if (opts.onMount) opts.onMount(root.querySelector('.modal'), close);
    return close;
  }

  /* ------------------------------ exports ----------------------------- */
  window.App = {
    COURSE, RANKS, ACH, ACH_ICON, VERSION, VERSION_DATE,
    $, $$, esc, wc, fmtTime, fmtNum, pct, todayKey, dayDiff,
    get state() { return state; },
    save, load, reset() { state = blank(); save(); },
    rankOf, addXP, unlock, checkAchievements,
    pushMeasure, completeExercise, completeQuiz, completeLesson, lessonReady, exKey,
    renderHud, toast, confetti, modal, wake
  };
})();
