/* GitHub 星标雷达 — 前端逻辑（零依赖，纯原生） */
(function () {
  'use strict';

  var FAV_KEY = 'gh-radar-favs';
  var state = {
    date: null,
    dates: [],
    snap: null,
    board: 'growth',
    favs: loadFavs()
  };

  /* ---------------- 工具 ---------------- */
  function $(id) { return document.getElementById(id); }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function fmtNum(n) {
    if (n == null || isNaN(n)) return '—';
    if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    return String(n);
  }

  function fmtFull(n) {
    if (n == null || isNaN(n)) return '—';
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  function toast(msg) {
    var t = $('toast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { t.hidden = true; }, 1900);
  }

  /* ---------------- 收藏 ---------------- */
  function loadFavs() {
    try {
      var raw = localStorage.getItem(FAV_KEY);
      var v = raw ? JSON.parse(raw) : [];
      return Array.isArray(v) ? v : [];
    } catch (e) { return []; }
  }

  function saveFavs() {
    try { localStorage.setItem(FAV_KEY, JSON.stringify(state.favs)); }
    catch (e) { toast('收藏保存失败（存储空间不足）'); }
    updateFavCount();
  }

  function isFav(fullName) {
    return state.favs.some(function (f) { return f.repo === fullName; });
  }

  function toggleFav(repo, extra) {
    var i = state.favs.findIndex(function (f) { return f.repo === repo; });
    if (i >= 0) {
      state.favs.splice(i, 1);
      saveFavs();
      return false;
    }
    state.favs.unshift({
      repo: repo,
      addedAt: new Date().toISOString(),
      rank: extra && extra.rank != null ? extra.rank : null,
      board: extra && extra.board ? extra.board : state.board,
      note: '',
      stars: extra && extra.stars != null ? extra.stars : null,
      description: extra && extra.description ? extra.description : '',
      html_url: extra && extra.html_url ? extra.html_url : ('https://github.com/' + repo)
    });
    saveFavs();
    return true;
  }

  function updateFavCount() {
    var el = $('favCount');
    if (el) el.textContent = String(state.favs.length);
  }

  /* ---------------- 语言颜色 ---------------- */
  var LANG_COLOR = {
    JavaScript: '#F1E05A', TypeScript: '#3178C6', Python: '#3572A5',
    Rust: '#DEA584', Go: '#00ADD8', Java: '#B07219', 'C++': '#F34B7D',
    C: '#555555', 'C#': '#178600', Ruby: '#701516', PHP: '#4F5D95',
    Swift: '#F05138', Kotlin: '#A97BFF', Shell: '#89E051',
    HTML: '#E34C26', CSS: '#563D7C', Vue: '#41B883', Dart: '#00B4AB',
    Zig: '#EC915C', Lua: '#000080', 'Jupyter Notebook': '#DA5B0B',
    'Jupyter Notebook': '#DA5B0B', Haskell: '#5E5086', Elixir: '#6E4A7E'
  };

  function langColor(lang) {
    return LANG_COLOR[lang] || 'rgba(255,255,255,.32)';
  }

  /* ---------------- 徽章 ---------------- */
  function renderBadges(r) {
    var out = [];
    if (r.badge_milestones && r.badge_milestones.length) {
      r.badge_milestones.forEach(function (m) {
        out.push('<span class="bdg bdg-milestone">' + esc(m) + '</span>');
      });
    }
    if (r.badge_debut) out.push('<span class="bdg bdg-debut">头回上榜</span>');
    else if (r.badge_return) out.push('<span class="bdg bdg-return">回头上榜</span>');
    if (r.badge_faster) out.push('<span class="bdg bdg-fast">比昨天快</span>');
    return out.length ? '<div class="badges">' + out.join('') + '</div>' : '';
  }

  /* ---------------- 行渲染 ---------------- */
  function gainHtml(r) {
    if (r.daily_gain == null || r.first_day) {
      return '<span class="gain is-first" title="首日数据：无昨日快照可比对">首日</span>';
    }
    var g = r.daily_gain;
    var cls = g < 0 ? 'gain is-neg' : 'gain';
    return '<span class="' + cls + '" title="较昨日快照 +' + fmtFull(g) + '">'
      + (g >= 0 ? '+' : '') + fmtFull(g) + '</span>';
  }

  function rowHtml(r, board) {
    var parts = (r.full_name || '').split('/');
    var owner = parts[0] || '';
    var name = parts[1] || r.full_name;
    var desc = r.description || '';
    var lang = r.language || '';
    var ageDays = r.age_days;
    var onBoard = r.on_board_days;

    var foot = [];
    foot.push('<span class="foot-item">' +
      '<i class="lang-dot" style="background:' + langColor(lang) + '"></i>' +
      esc(lang || '未知') + '</span>');
    foot.push('<span class="foot-item">★ ' + fmtNum(r.stars) + '</span>');
    foot.push('<span class="foot-item">⑂ ' + fmtNum(r.forks) + '</span>');
    if (ageDays != null) foot.push('<span class="foot-item">' + ageDays + ' 天</span>');
    if (onBoard != null) foot.push('<span class="foot-item">在榜 ' + onBoard + ' 天</span>');

    return '<article class="row" data-repo="' + esc(r.full_name) + '" data-board="' + board + '" tabindex="0" role="button">'
      + '<div class="row-head">'
      +   '<span class="rank">' + (r.rank != null ? r.rank : '') + '</span>'
      +   '<span class="repo"><span class="owner">' + esc(owner) + '/</span>' + esc(name) + '</span>'
      +   gainHtml(r)
      + '</div>'
      + '<div class="desc' + (desc ? '' : ' is-empty') + '">'
      +   esc(desc || '暂无简介') + '</div>'
      + '<div class="row-foot">' + foot.join('') + '</div>'
      + renderBadges(r)
      + '</article>';
  }

  /* ---------------- 榜单渲染 ---------------- */
  function renderBoards() {
    var snap = state.snap;
    var growth = (snap && snap.growth) || [];
    var rising = (snap && snap.rising) || [];

    var gHead = '<div class="board-head"><span>涨星榜 · 当日增量</span><span>'
      + growth.length + ' 条</span></div>';
    var rHead = '<div class="board-head"><span>新锐榜 · 60 天内新建</span><span>'
      + rising.length + ' 条</span></div>';

    $('board-growth').innerHTML = gHead + (growth.length
      ? '<div class="grid">' + growth.map(function (r) { return rowHtml(r, 'growth'); }).join('') + '</div>'
      : '<div class="empty">该日无涨星榜数据</div>');

    $('board-rising').innerHTML = rHead + (rising.length
      ? '<div class="grid">' + rising.map(function (r) { return rowHtml(r, 'rising'); }).join('') + '</div>'
      : '<div class="empty">该日无新锐榜数据</div>');

    renderFavs();
    bindRows();
  }

  function bindRows() {
    Array.prototype.forEach.call(document.querySelectorAll('.row'), function (el) {
      el.addEventListener('click', function () {
        openDetail(el.getAttribute('data-repo'), el.getAttribute('data-board'));
      });
      el.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openDetail(el.getAttribute('data-repo'), el.getAttribute('data-board'));
        }
      });
    });
  }

  /* ---------------- 收藏页 ---------------- */
  function renderFavs() {
    var box = $('board-favs');
    if (!state.favs.length) {
      box.innerHTML = '<div class="empty">还没有收藏。点开任意项目，点「收藏」即可加入。</div>';
      return;
    }
    var sorted = state.favs.slice().sort(function (a, b) {
      return (b.addedAt || '').localeCompare(a.addedAt || '');
    });
    var html = '<div class="fav-note">共 ' + sorted.length + ' 个收藏 · 按收藏时间排序 · 存于本机浏览器</div>';
    html += sorted.map(function (f) {
      var d = new Date(f.addedAt);
      var when = isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
      return '<div class="fav-item" data-repo="' + esc(f.repo) + '">'
        + '<div class="fav-top">'
        +   '<span class="repo">' + esc(f.repo) + '</span>'
        +   '<span class="fav-actions">'
        +     '<button class="mini-btn" data-act="open">详情</button>'
        +     '<button class="mini-btn is-danger" data-act="remove">移除</button>'
        +   '</span>'
        + '</div>'
        + '<div class="fav-meta">收藏于 ' + esc(when)
        +   (f.rank != null ? ' · 当日第 ' + f.rank + ' 名' : '')
        +   (f.stars != null ? ' · ★ ' + fmtNum(f.stars) : '') + '</div>'
        + '<input class="fav-note-input" data-act="note" placeholder="添加备注…" value="' + esc(f.note || '') + '">'
        + '</div>';
    }).join('');
    box.innerHTML = html;

    Array.prototype.forEach.call(box.querySelectorAll('.fav-item'), function (el) {
      var repo = el.getAttribute('data-repo');
      el.querySelector('[data-act="open"]').addEventListener('click', function () {
        openDetail(repo, 'favs');
      });
      el.querySelector('[data-act="remove"]').addEventListener('click', function () {
        var i = state.favs.findIndex(function (f) { return f.repo === repo; });
        if (i >= 0) { state.favs.splice(i, 1); saveFavs(); renderFavs(); toast('已移除'); }
      });
      el.querySelector('[data-act="note"]').addEventListener('input', function (e) {
        var i = state.favs.findIndex(function (f) { return f.repo === repo; });
        if (i >= 0) { state.favs[i].note = e.target.value; saveFavs(); }
      });
    });
  }

  /* ---------------- 详情 ---------------- */
  function findRepo(repo, board) {
    var snap = state.snap || {};
    var pools = [].concat(snap.growth || [], snap.rising || []);
    var hit = pools.filter(function (r) { return r.full_name === repo; })[0];
    if (hit) return hit;
    // 收藏条目可能来自别的历史日期：回退到收藏记录里保存的快照字段
    var fav = state.favs.filter(function (f) { return f.repo === repo; })[0];
    if (fav) {
      return {
        full_name: fav.repo,
        stars: fav.stars,
        description: fav.description,
        html_url: fav.html_url || ('https://github.com/' + repo),
        rank: fav.rank,
        _fromFav: true
      };
    }
    return null;
  }

  function starsHistory(repo) {
    // 从 history.json 的 stars_history 取曲线；未加载则返回空
    var h = state.history && state.history[repo];
    if (!h || !h.stars_history) return [];
    return Object.keys(h.stars_history).sort().map(function (d) {
      return { date: d, stars: h.stars_history[d] };
    });
  }

  function svgChart(points) {
    if (!points.length) {
      return '<div class="d-readme" style="color:var(--txt-mute)">暂无历史曲线（需要累计 2 天以上数据）</div>';
    }
    if (points.length === 1) {
      return '<div class="d-readme" style="color:var(--txt-mute)">仅 1 天数据（★ ' +
        fmtFull(points[0].stars) + '），明日起可显示曲线</div>';
    }
    var W = 380, H = 110, PL = 6, PR = 6, PT = 10, PB = 18;
    var vals = points.map(function (p) { return p.stars; });
    var min = Math.min.apply(null, vals);
    var max = Math.max.apply(null, vals);
    var span = (max - min) || 1;
    var iw = W - PL - PR, ih = H - PT - PB;
    var coords = points.map(function (p, i) {
      var x = PL + (points.length === 1 ? iw / 2 : (i / (points.length - 1)) * iw);
      var y = PT + ih - ((p.stars - min) / span) * ih;
      return [x, y];
    });
    var line = coords.map(function (c, i) {
      return (i ? 'L' : 'M') + c[0].toFixed(1) + ' ' + c[1].toFixed(1);
    }).join(' ');
    var area = line + ' L' + coords[coords.length - 1][0].toFixed(1) + ' ' + (PT + ih)
      + ' L' + coords[0][0].toFixed(1) + ' ' + (PT + ih) + ' Z';
    var last = coords[coords.length - 1];
    var first = points[0].date.slice(5);
    var lastDate = points[points.length - 1].date.slice(5);

    return '<div class="chart-box"><svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none">'
      + '<defs><linearGradient id="grd" x1="0" y1="0" x2="0" y2="1">'
      +   '<stop offset="0%" stop-color="#5E6AD2" stop-opacity=".28"/>'
      +   '<stop offset="100%" stop-color="#5E6AD2" stop-opacity="0"/>'
      + '</linearGradient></defs>'
      + '<path d="' + area + '" fill="url(#grd)"/>'
      + '<path d="' + line + '" fill="none" stroke="#5E6AD2" stroke-width="1.6" '
      +   'stroke-linejoin="round" stroke-linecap="round"/>'
      + '<circle cx="' + last[0].toFixed(1) + '" cy="' + last[1].toFixed(1) + '" r="2.6" fill="#5E6AD2"/>'
      + '<text x="' + PL + '" y="' + (H - 4) + '" fill="#5C6169" font-size="8.5" '
      +   'font-family="monospace">' + esc(first) + '</text>'
      + '<text x="' + (W - PR) + '" y="' + (H - 4) + '" fill="#5C6169" font-size="8.5" '
      +   'text-anchor="end" font-family="monospace">' + esc(lastDate) + '</text>'
      + '</svg></div>';
  }

  function openDetail(repo, board) {
    var r = findRepo(repo, board);
    var fav = isFav(repo);
    var body = $('drawerBody');

    var common = r || { full_name: repo, stars: null, description: '', html_url: 'https://github.com/' + repo };
    var parts = (common.full_name || '').split('/');

    var stats = [
      ['Star 总数', common.stars != null ? fmtFull(common.stars) : '—'],
      ['日增', (common.daily_gain != null && !common.first_day) ? ((common.daily_gain >= 0 ? '+' : '') + fmtFull(common.daily_gain)) : '首日'],
      ['Forks', common.forks != null ? fmtFull(common.forks) : '—'],
      ['上线天数', common.age_days != null ? common.age_days + ' 天' : '—'],
      ['在榜天数', common.on_board_days != null ? common.on_board_days + ' 天' : '—'],
      ['最近提交', common.days_since_push != null ? (common.days_since_push === 0 ? '今天' : common.days_since_push + ' 天前') : '—'],
      ['许可证', common.license || '未标注'],
      ['主语言', common.language || '未知']
    ];

    var html = '<div class="d-title"><span style="color:var(--txt-dim)">' + esc(parts[0] || '') + '/</span>'
      + esc(parts[1] || repo) + '</div>';

    html += '<div class="d-desc">' + esc(common.description || '暂无简介') + '</div>';
    html += '<div class="d-stats">' + stats.map(function (s) {
      return '<div class="d-stat"><div class="d-stat-k">' + esc(s[0]) + '</div>'
        + '<div class="d-stat-v">' + esc(s[1]) + '</div></div>';
    }).join('') + '</div>';

    html += '<div class="d-section-t">Star 增长曲线</div>';
    html += svgChart(starsHistory(repo));

    html += '<div class="d-section-t">README 摘要</div>';
    if (common.readme_summary) {
      html += '<div class="d-readme">' + esc(common.readme_summary) + '</div>';
    } else {
      html += '<div class="d-readme" style="color:var(--txt-mute)">该仓库没有可读取的 README 文本</div>';
    }

    if (common.badge_debut || common.badge_return || common.badge_faster
        || (common.badge_milestones && common.badge_milestones.length)) {
      html += '<div class="d-section-t">本期标记</div>' + renderBadges(common);
    }

    html += '<div class="d-actions">'
      + '<a class="btn btn-primary" href="' + esc(common.html_url || ('https://github.com/' + repo))
      + '" target="_blank" rel="noopener noreferrer">在 GitHub 打开 ↗</a>'
      + '<button class="btn btn-fav' + (fav ? ' is-on' : '') + '" id="favBtn">'
      + (fav ? '★ 已收藏' : '☆ 收藏') + '</button>'
      + '</div>';

    body.innerHTML = html;
    $('drawer').hidden = false;
    $('overlay').hidden = false;
    document.body.style.overflow = 'hidden';

    $('favBtn').addEventListener('click', function () {
      var nowFav = toggleFav(repo, common);
      this.textContent = nowFav ? '★ 已收藏' : '☆ 收藏';
      this.classList.toggle('is-on', nowFav);
      toast(nowFav ? '已加入收藏' : '已从收藏移除');
      renderFavs();
    });
  }

  function closeDetail() {
    $('drawer').hidden = true;
    $('overlay').hidden = true;
    document.body.style.overflow = '';
  }

  /* ---------------- 日期 ---------------- */
  function fillDates(dates, current) {
    var sel = $('datePicker');
    if (!dates.length) { sel.style.display = 'none'; return; }
    sel.style.display = '';
    sel.innerHTML = dates.slice().reverse().map(function (d) {
      return '<option value="' + esc(d) + '"' + (d === current ? ' selected' : '') + '>'
        + esc(d) + '</option>';
    }).join('');
  }

  function renderMeta() {
    var snap = state.snap || {};
    $('dataDate').textContent = snap.date || state.date || '—';
    $('genTime').textContent = snap.generated_at
      ? '生成于 ' + snap.generated_at.replace('T', ' ').slice(0, 16) : '';

    var notice = $('staleNotice');
    if (snap.stale) {
      notice.hidden = false;
      notice.textContent = '数据延迟：本次抓取失败，当前显示 ' + (snap.stale_from || '上一份') + ' 的数据。';
    } else {
      notice.hidden = true;
    }
  }

  /* ---------------- 加载 ---------------- */
  function loadIndex() {
    return fetch('data/index.json', { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error('no index'); return r.json(); })
      .catch(function () {
        // 回退：直接从内嵌日期读取
        return { dates: state.date ? [state.date] : [] };
      });
  }

  function loadSnapshot(date) {
    var url = date ? ('data/' + date + '.json') : 'data/latest.json';
    return fetch(url, { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error('not found'); return r.json(); });
  }

  function loadHistory() {
    return fetch('data/history.json', { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : {}; })
      .catch(function () { return {}; });
  }

  function boot() {
    updateFavCount();

    var bootDate = window.__RADAR_DATE__ || null;
    loadSnapshot(bootDate).then(function (snap) {
      state.snap = snap;
      state.date = snap.date;
      renderMeta();
      renderBoards();
      return loadIndex().then(function (idx) {
        state.dates = (idx && idx.dates) || [];
        fillDates(state.dates, state.date);
      });
    }).then(function () {
      return loadHistory();
    }).then(function (h) {
      state.history = h || {};
    }).catch(function (err) {
      $('board-growth').innerHTML = '<div class="empty">数据加载失败：' + esc(err.message)
        + '<br><br>请先运行 <code>python scripts/build_site.py</code></div>';
    });
  }

  /* ---------------- 事件 ---------------- */
  document.addEventListener('DOMContentLoaded', function () {
    // tab 切换
    Array.prototype.forEach.call(document.querySelectorAll('.tab'), function (btn) {
      btn.addEventListener('click', function () {
        var board = btn.getAttribute('data-board');
        state.board = board;
        Array.prototype.forEach.call(document.querySelectorAll('.tab'), function (b) {
          var on = b === btn;
          b.classList.toggle('is-active', on);
          b.setAttribute('aria-selected', on ? 'true' : 'false');
        });
        Array.prototype.forEach.call(document.querySelectorAll('.board'), function (s) {
          s.classList.toggle('is-active', s.id === 'board-' + board);
        });
        $('legend').style.display = board === 'favs' ? 'none' : '';
      });
    });

    // 日期切换
    $('datePicker').addEventListener('change', function (e) {
      var d = e.target.value;
      if (!d) return;
      loadSnapshot(d).then(function (snap) {
        state.snap = snap;
        state.date = snap.date;
        renderMeta();
        renderBoards();
      }).catch(function () { toast('该日期数据缺失'); });
    });

    // 抽屉关闭
    $('drawerClose').addEventListener('click', closeDetail);
    $('overlay').addEventListener('click', closeDetail);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !$('drawer').hidden) closeDetail();
    });

    boot();
  });
})();
