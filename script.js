(function () {
  const TARGET = 20;
  const STORAGE_KEY = 'daily_comments_perplatform_v1';

  const PLATFORMS = [
    { id: 'x',         name: 'X',         icon: '𝕏' },
    { id: 'threads',   name: 'Threads',   icon: '🧵' },
    { id: 'pinterest', name: 'Pinterest', icon: '📌' },
    { id: 'facebook',  name: 'Facebook',  icon: '📘' },
    { id: 'tiktok',    name: 'TikTok',    icon: '🎵' },
    { id: 'other',     name: 'Other',     icon: '＋' }
  ];

  function getTodayKey() {
    const now = new Date();
    return (
      now.getFullYear() + '-' +
      String(now.getMonth() + 1).padStart(2, '0') + '-' +
      String(now.getDate()).padStart(2, '0')
    );
  }

  function formatDateKey(key) {
    const [y, m, d] = key.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric'
    });
  }

  function formatDateKeyShort(key) {
    const [y, m, d] = key.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric'
    });
  }

  function loadData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn('parse error', e);
    }
    return {};
  }

  function saveData(d) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
    } catch (e) {
      console.warn('save error', e);
    }
  }

  function emptyDay() {
    const platforms = {};
    PLATFORMS.forEach(function (p) { platforms[p.id] = 0; });
    return { platforms: platforms };
  }

  function ensureDay(key) {
    if (!data[key] || typeof data[key] !== 'object' || !data[key].platforms) {
      data[key] = emptyDay();
      return;
    }
    PLATFORMS.forEach(function (p) {
      if (typeof data[key].platforms[p.id] !== 'number') data[key].platforms[p.id] = 0;
    });
  }

  function dayTotal(day) {
    if (!day || !day.platforms) return 0;
    return PLATFORMS.reduce(function (s, p) {
      return s + (day.platforms[p.id] || 0);
    }, 0);
  }

  function platformTotal(day, id) {
    return (day && day.platforms && day.platforms[id]) || 0;
  }

  let data = loadData();
  let todayKey = getTodayKey();

  function getTodayDay() {
    ensureDay(todayKey);
    return data[todayKey];
  }

  function adjustPlatform(platformId, delta, dateKey) {
    const key = dateKey || todayKey;
    ensureDay(key);
    const day = data[key];
    const current = day.platforms[platformId] || 0;
    const next = Math.max(0, current + delta);
    if (next === current) return false;

    day.platforms[platformId] = next;
    saveData(data);
    updateUI();

    const el = document.getElementById('pcnum-' + platformId);
    if (el) {
      el.classList.add('bump');
      setTimeout(function () { el.classList.remove('bump'); }, 200);
      if (delta > 0 && next === TARGET) {
        el.classList.add('celebrate');
        setTimeout(function () { el.classList.remove('celebrate'); }, 500);
      }
    }
    return true;
  }

  function resetToday() {
    const day = getTodayDay();
    if (dayTotal(day) === 0) return;
    data[todayKey] = emptyDay();
    saveData(data);
    updateUI();
  }

  function buildPlatformList() {
    const list = document.getElementById('platformList');
    list.innerHTML = '';
    PLATFORMS.forEach(function (p) {
      const row = document.createElement('div');
      row.className = 'platform-row';
      row.innerHTML =
        '<div class="platform-icon">' + p.icon + '</div>' +
        '<div class="platform-info">' +
          '<div class="platform-name">' + p.name +
            '<span class="badge" id="badge-' + p.id + '">✓ done</span>' +
          '</div>' +
          '<div class="pbar-bg">' +
            '<div class="pbar-fill" id="pbar-' + p.id + '" style="width:0%;"></div>' +
          '</div>' +
        '</div>' +
        '<div class="platform-countdown">' +
          '<div class="pc-num" id="pcnum-' + p.id + '">20</div>' +
          '<div class="pc-label" id="pclabel-' + p.id + '">left</div>' +
        '</div>' +
        '<div class="platform-controls">' +
          '<button class="pbtn minus" data-platform="' + p.id + '" data-delta="-1" aria-label="minus one ' + p.name + '" title="−1">−</button>' +
          '<button class="pbtn plus" data-platform="' + p.id + '" data-delta="1" aria-label="plus one ' + p.name + '" title="+1">+</button>' +
        '</div>';
      list.appendChild(row);
    });

    list.addEventListener('click', function (e) {
      const btn = e.target.closest('button[data-platform]');
      if (!btn) return;
      adjustPlatform(btn.dataset.platform, parseInt(btn.dataset.delta, 10), todayKey);
    });
  }

  function renderLiveCountdowns() {
    const day = getTodayDay();
    PLATFORMS.forEach(function (p) {
      const done = platformTotal(day, p.id);
      const remaining = Math.max(0, TARGET - done);
      const numEl = document.getElementById('pcnum-' + p.id);
      const labelEl = document.getElementById('pclabel-' + p.id);
      const barEl = document.getElementById('pbar-' + p.id);
      const badgeEl = document.getElementById('badge-' + p.id);
      if (!numEl) return;

      numEl.textContent = remaining;
      if (remaining === 0) {
        numEl.classList.add('goal-met');
        labelEl.textContent = 'done';
        barEl.classList.add('goal-met');
        badgeEl.classList.add('show');
      } else {
        numEl.classList.remove('goal-met');
        labelEl.textContent = 'left';
        barEl.classList.remove('goal-met');
        badgeEl.classList.remove('show');
      }
      barEl.style.width = Math.min(100, (done / TARGET) * 100) + '%';
    });
  }

  function renderLog() {
    const logList = document.getElementById('logList');
    const keys = Object.keys(data).sort(function (a, b) { return b.localeCompare(a); });
    const logged = keys.filter(function (k) {
      const d = data[k];
      if (!d || !d.platforms) return false;
      return PLATFORMS.some(function (p) {
        return (d.platforms[p.id] || 0) > 0;
      });
    });

    if (logged.length === 0) {
      logList.innerHTML = '<div class="empty-log">no logs yet</div>';
      return;
    }

    logList.innerHTML = '';
    logged.forEach(function (key) {
      const day = data[key];
      const total = dayTotal(day);
      const entry = document.createElement('div');
      entry.className = 'log-entry';

      const dateLabel = (key === todayKey)
        ? 'Today · ' + formatDateKeyShort(key)
        : formatDateKey(key);

      const pills = PLATFORMS.filter(function (p) {
        return (day.platforms[p.id] || 0) > 0;
      }).map(function (p) {
        const cnt = day.platforms[p.id];
        const mark = cnt >= TARGET ? ' ✓' : '';
        return '<span class="log-pill">' + p.icon + ' ' + p.name +
          ' <span class="pcount">' + cnt + '</span>' + mark + '</span>';
      }).join('');

      entry.innerHTML =
        '<div class="log-date">' + dateLabel + '</div>' +
        '<div class="log-platforms">' + pills + '</div>' +
        '<div class="log-total">Σ ' + total + '</div>';
      logList.appendChild(entry);
    });
  }

  function updateUI() {
    const newKey = getTodayKey();
    if (newKey !== todayKey) {
      todayKey = newKey;
      ensureDay(todayKey);
    }

    const dateObj = new Date();
    document.getElementById('dateDisplay').textContent =
      dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

    renderLiveCountdowns();
    renderLog();

    const day = getTodayDay();
    document.getElementById('resetTodayBtn').disabled = dayTotal(day) === 0;
  }

  function checkDateChange() {
    const newKey = getTodayKey();
    if (newKey !== todayKey) {
      todayKey = newKey;
      ensureDay(todayKey);
      saveData(data);
      updateUI();
    } else {
      ensureDay(todayKey);
    }
  }

  function init() {
    buildPlatformList();
    ensureDay(todayKey);
    saveData(data);
    updateUI();

    document.getElementById('resetTodayBtn').addEventListener('click', resetToday);

    setInterval(checkDateChange, 30000);

    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) { checkDateChange(); updateUI(); }
    });

    window.addEventListener('storage', function (e) {
      if (e.key === STORAGE_KEY) {
        data = loadData();
        ensureDay(todayKey);
        updateUI();
      }
    });
  }

  init();
})();