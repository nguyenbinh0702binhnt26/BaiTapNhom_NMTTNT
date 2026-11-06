/*
 * Nguyễn Hữu Tài - K24DTCN492
 * Đề tài: Ứng dụng tìm đường đi trong mê cung bằng thuật toán BFS và DFS
 *
 * app.js — Nối giao diện với thuật toán: sinh mê cung, chạy BFS/DFS, phát lại
 * từng bước bằng hoạt ảnh, chỉnh sửa tường/điểm S, G bằng chuột.
 *
 * Thuật toán được chạy MỘT lần để lấy toàn bộ vết (trace); hoạt ảnh chỉ phát lại
 * vết đó. Nhờ vậy "thời gian thuật toán" đo được không bị ảnh hưởng bởi việc vẽ.
 */
(function () {
  'use strict';

  const { generate, TYPES, WALL, OPEN } = Maze;
  const { ALGORITHMS, measure } = Search;

  const SIZES = {
    s: { rows: 11, cols: 21, label: 'Nhỏ (11 × 21)' },
    m: { rows: 21, cols: 41, label: 'Vừa (21 × 41)' },
    l: { rows: 31, cols: 61, label: 'Lớn (31 × 61)' },
    xl: { rows: 51, cols: 101, label: 'Rất lớn (51 × 101)' },
  };
  const SPEEDS = [2, 5, 10, 20, 40, 80, 150, 300, 600, 1500]; // số trạng thái được xét mỗi giây
  const LOG_LINES = 80;

  const $ = (sel, el = document) => el.querySelector(sel);

  const ui = {
    type: $('#maze-type'),
    size: $('#maze-size'),
    seed: $('#maze-seed'),
    btnGenerate: $('#btn-generate'),
    btnRandom: $('#btn-random'),
    algoRadios: document.querySelectorAll('input[name="algo"]'),
    btnPlay: $('#btn-play'),
    btnStep: $('#btn-step'),
    btnFinish: $('#btn-finish'),
    btnClear: $('#btn-clear'),
    speed: $('#speed'),
    speedLabel: $('#speed-label'),
    boards: $('#boards'),
    summary: $('#summary'),
  };

  const state = {
    grid: null,
    start: null,
    goal: null,
    mode: 'bfs',
    runners: [],
    prepared: false, // đã chạy thuật toán trên mê cung hiện tại chưa
    playing: false,
    raf: 0, // id của requestAnimationFrame đang chờ
    acc: 0,
    lastTs: 0,
  };

  const fmtCell = (i) => `(${state.grid.row(i)},${state.grid.col(i)})`;
  const sameCell = (a, b) => a[0] === b[0] && a[1] === b[1];

  // ---------------------------------------------------------------- Khung hiển thị

  class Board {
    constructor(el) {
      this.el = el;
      this.title = $('.board-title', el);
      this.status = $('.status', el);
      this.canvas = $('canvas', el);
      this.wrap = $('.canvas-wrap', el);
      this.renderer = new Renderer(this.canvas);
      this.stat = {};
      for (const dd of el.querySelectorAll('[data-stat]')) this.stat[dd.dataset.stat] = dd;
      this.peekLabel = $('.peek-label', el);
      this.peekItems = $('.peek-items', el);
      this.log = $('.log pre', el);
      this.logStep = -1;
    }
  }

  // Một lần chạy của một thuật toán: giữ vết và vị trí phát lại hiện tại.
  class Runner {
    constructor(key, board) {
      this.key = key;
      this.algo = ALGORITHMS[key];
      this.board = board;
      this.trace = null;
      this.reset();
    }

    prepare() {
      this.trace = [];
      this.result = this.algo.run(state.grid, state.start, state.goal, this.trace);
      this.timeMs = measure(this.algo.run, state.grid, state.start, state.goal);
      this.reset();
    }

    reset() {
      this.overlay = new Uint8Array(state.grid.rows * state.grid.cols);
      this.overlay[state.grid.index(state.start[0], state.start[1])] = MARK.OPEN;
      this.step = 0;
      this.current = -1;
      this.maxOpen = 1;
      this.board.logStep = -1;
    }

    get done() {
      return this.trace !== null && this.step >= this.trace.length;
    }

    advance(k) {
      if (!this.trace) return;
      const end = Math.min(this.trace.length, this.step + k);
      for (; this.step < end; this.step++) {
        const s = this.trace[this.step];
        this.overlay[s.node] = MARK.CLOSED;
        for (const v of s.added) this.overlay[v] = MARK.OPEN;
        this.current = s.node;
        if (s.open > this.maxOpen) this.maxOpen = s.open;
      }
      if (this.done) this.current = -1;
    }
  }

  // ---------------------------------------------------------------- Điều khiển

  const allDone = () => state.runners.every((r) => r.done);

  function prepareAll() {
    state.runners.forEach((r) => r.prepare());
    state.prepared = true;
  }

  // Mê cung hoặc S/G thay đổi -> kết quả cũ không còn đúng.
  function invalidate() {
    state.playing = false;
    state.prepared = false;
    state.runners.forEach((r) => {
      r.trace = null;
      r.reset();
    });
  }

  function play() {
    if (!state.prepared) prepareAll();
    else if (allDone()) state.runners.forEach((r) => r.reset());
    state.playing = true;
    state.acc = 1; // bước đầu tiên hiện ngay khi bấm
    state.lastTs = performance.now();
    cancelAnimationFrame(state.raf); // tránh hai vòng hoạt ảnh chạy song song
    state.raf = requestAnimationFrame(tick);
    refresh();
  }

  function pause() {
    state.playing = false;
    refresh();
  }

  function togglePlay() {
    if (state.playing) pause();
    else play();
  }

  function stepOnce() {
    state.playing = false;
    if (!state.prepared) prepareAll();
    state.runners.forEach((r) => r.advance(1));
    refresh();
  }

  function finishNow() {
    state.playing = false;
    if (!state.prepared) prepareAll();
    state.runners.forEach((r) => r.advance(Infinity));
    refresh();
  }

  function clearResults() {
    state.playing = false;
    state.runners.forEach((r) => r.reset());
    refresh();
  }

  function tick(ts) {
    if (!state.playing) return;
    const dt = Math.min(100, Math.max(0, ts - state.lastTs));
    state.lastTs = ts;
    state.acc += (dt / 1000) * SPEEDS[ui.speed.value - 1];
    const k = Math.floor(state.acc);
    if (k > 0) {
      state.acc -= k;
      state.runners.forEach((r) => r.advance(k));
    }
    if (allDone()) state.playing = false;
    refresh();
    if (state.playing) state.raf = requestAnimationFrame(tick);
  }

  function setMode(mode) {
    state.mode = mode;
    const [a, b] = boards;
    state.runners = mode === 'compare' ? [new Runner('bfs', a), new Runner('dfs', b)] : [new Runner(mode, a)];
    state.prepared = false;
    state.playing = false;
    b.el.hidden = mode !== 'compare';
    ui.boards.classList.toggle('compare', mode === 'compare');
    for (const r of state.runners) r.board.title.textContent = r.algo.fullName;
    layout();
    refresh();
    writeParams();
  }

  function loadMaze() {
    const fixed = ui.type.value === 'sample'; // mê cung mẫu có kích thước cố định
    ui.size.disabled = fixed;
    ui.seed.disabled = fixed;
    ui.btnRandom.disabled = fixed;
    const { rows, cols } = SIZES[ui.size.value];
    const seed = Math.max(1, parseInt(ui.seed.value, 10) || 1);
    ui.seed.value = seed;
    const maze = generate(ui.type.value, rows, cols, seed);
    state.grid = maze.grid;
    state.start = maze.start;
    state.goal = maze.goal;
    for (const b of boards) b.renderer.setGrid(state.grid);
  }

  function generateMaze() {
    loadMaze();
    invalidate();
    layout();
    refresh();
    writeParams();
  }

  // ---------------------------------------------------------------- Vẽ & thống kê

  function layout() {
    const maxH = Math.max(260, window.innerHeight * 0.62);
    for (const r of state.runners) r.board.renderer.resize(r.board.wrap.clientWidth, maxH);
  }

  function refresh() {
    for (const r of state.runners) renderRunner(r);
    renderSummary();
    ui.btnPlay.textContent = state.playing ? 'Tạm dừng' : allDone() ? 'Chạy lại' : state.runners[0].step > 0 ? 'Tiếp tục' : 'Chạy';
    ui.btnStep.disabled = allDone();
    ui.btnFinish.disabled = allDone();
    ui.speedLabel.textContent = `${SPEEDS[ui.speed.value - 1]} ô/giây`;
  }

  function renderRunner(r) {
    const b = r.board;
    const path = r.done && r.result.found ? r.result.path : null;
    b.renderer.draw({ overlay: r.overlay, current: r.current, path, start: state.start, goal: state.goal });

    const last = r.step > 0 ? r.trace[r.step - 1] : null;
    b.stat.expanded.textContent = r.trace ? r.step : '–';
    b.stat.open.textContent = r.trace ? (last ? last.open : 1) : '–';
    b.stat.maxOpen.textContent = r.trace ? r.maxOpen : '–';
    b.stat.path.textContent = r.done ? (r.result.found ? `${r.result.pathLength} bước` : 'Không có') : '–';
    b.stat.time.textContent = r.done ? `${r.timeMs.toFixed(3)} ms` : '–';

    let status = 'Sẵn sàng';
    let cls = '';
    if (r.done) {
      status = r.result.found ? 'Đã tìm thấy đường đi' : 'Không có đường đi';
      cls = r.result.found ? 'found' : 'failed';
    } else if (state.playing) {
      status = 'Đang tìm…';
      cls = 'running';
    } else if (r.step > 0) {
      status = 'Tạm dừng';
      cls = 'running';
    }
    b.status.textContent = status;
    b.status.className = 'status ' + cls;

    renderPeek(r, last);
    renderLog(r);
  }

  function renderPeek(r, last) {
    const b = r.board;
    b.peekLabel.textContent = r.key === 'bfs' ? 'OPEN – hàng đợi (đầu → cuối): ' : 'OPEN – ngăn xếp (đỉnh → đáy): ';
    const startIdx = state.grid.index(state.start[0], state.start[1]);
    const items = last ? last.peek : [startIdx];
    const size = last ? last.open : 1;
    const html = items.map((i) => `<code>${fmtCell(i)}</code>`).join('');
    b.peekItems.innerHTML = size === 0 ? '<i>rỗng</i>' : html + (size > items.length ? ` … và ${size - items.length} ô khác` : '');
  }

  function renderLog(r) {
    const b = r.board;
    if (b.logStep === r.step) return;
    b.logStep = r.step;
    if (!r.trace || r.step === 0) {
      b.log.textContent = `Khởi tạo: OPEN = [${fmtCell(state.grid.index(...state.start))}], CLOSED = ∅`;
      return;
    }
    const goalIdx = state.grid.index(state.goal[0], state.goal[1]);
    const lines = [];
    for (let k = Math.max(0, r.step - LOG_LINES); k < r.step; k++) {
      const s = r.trace[k];
      const head = `#${String(k + 1).padStart(4)}  Xét ${fmtCell(s.node).padEnd(9)}`;
      if (s.node === goalIdx) {
        lines.push(`${head} = G → dừng, tìm thấy đường đi ${r.result.pathLength} bước`);
      } else {
        const added = s.added.length ? 'thêm ' + s.added.map(fmtCell).join(' ') : 'không thêm ô nào';
        lines.push(`${head} → ${added.padEnd(34)} |OPEN| = ${s.open}`);
      }
    }
    if (r.done && !r.result.found) lines.push('OPEN rỗng → không tồn tại đường đi từ S đến G');
    b.log.textContent = lines.join('\n');
    b.log.scrollTop = b.log.scrollHeight;
  }

  function renderSummary() {
    const [bfsRun, dfsRun] = state.runners;
    if (state.mode !== 'compare' || !allDone()) {
      ui.summary.hidden = true;
      return;
    }
    const B = bfsRun.result;
    const D = dfsRun.result;
    let text;
    if (!B.found) {
      text = `Không tồn tại đường đi từ S đến G. Cả hai thuật toán đều duyệt hết ${B.expanded} ô liên thông với S rồi dừng.`;
    } else if (B.pathLength === D.pathLength) {
      text = `Hai thuật toán cho đường đi cùng độ dài ${B.pathLength} bước. BFS xét ${B.expanded} ô, DFS xét ${D.expanded} ô.`;
    } else {
      const ratio = D.pathLength / B.pathLength;
      const longer = ratio >= 2 ? `dài gấp ${ratio.toFixed(1).replace('.0', '')} lần` : `dài hơn ${Math.round((ratio - 1) * 100)}%`;
      text = `BFS tìm được đường ngắn nhất ${B.pathLength} bước sau khi xét ${B.expanded} ô. ` +
        `DFS đi ${D.pathLength} bước (${longer}) và xét ${D.expanded} ô.`;
    }
    ui.summary.textContent = text;
    ui.summary.hidden = false;
  }

  // ---------------------------------------------------------------- Chỉnh sửa bằng chuột

  // Các ô nằm trên đoạn thẳng a -> b, để kéo chuột nhanh vẫn vẽ tường liền mạch.
  function cellsBetween(a, b) {
    const n = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]));
    const cells = [];
    for (let t = 1; t <= n; t++) {
      cells.push([Math.round(a[0] + ((b[0] - a[0]) * t) / n), Math.round(a[1] + ((b[1] - a[1]) * t) / n)]);
    }
    return cells;
  }

  function applyEdit([r, c], mode) {
    const onStart = sameCell([r, c], state.start);
    const onGoal = sameCell([r, c], state.goal);
    if (mode === 'draw' || mode === 'erase') {
      const value = mode === 'draw' ? WALL : OPEN;
      if (onStart || onGoal || state.grid.cells[state.grid.index(r, c)] === value) return false;
      state.grid.set(r, c, value);
    } else {
      if (state.grid.isWall(r, c) || onStart || onGoal) return false;
      if (mode === 'start') state.start = [r, c];
      else state.goal = [r, c];
    }
    return true;
  }

  function attachEditing(board) {
    const canvas = board.canvas;
    let mode = null;
    let lastCell = null;

    canvas.addEventListener('pointerdown', (e) => {
      const cell = board.renderer.cellAt(e.clientX, e.clientY);
      if (!cell) return;
      canvas.setPointerCapture(e.pointerId);
      if (sameCell(cell, state.start)) mode = 'start';
      else if (sameCell(cell, state.goal)) mode = 'goal';
      else mode = state.grid.isWall(cell[0], cell[1]) ? 'erase' : 'draw';
      lastCell = cell;
      if (applyEdit(cell, mode)) {
        invalidate();
        refresh();
      }
    });

    canvas.addEventListener('pointermove', (e) => {
      if (!mode) return;
      const cell = board.renderer.cellAt(e.clientX, e.clientY);
      if (!cell || sameCell(cell, lastCell)) return;
      const cells = mode === 'start' || mode === 'goal' ? [cell] : cellsBetween(lastCell, cell);
      lastCell = cell;
      let changed = false;
      for (const c of cells) changed = applyEdit(c, mode) || changed;
      if (changed) {
        invalidate();
        refresh();
      }
    });

    const end = () => {
      mode = null;
    };
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
  }

  // ---------------------------------------------------------------- Tham số URL

  // Ví dụ: index.html?type=loops&size=m&seed=7&algo=compare&run=finish
  function readParams() {
    const p = new URLSearchParams(location.search);
    if (TYPES[p.get('type')]) ui.type.value = p.get('type');
    if (SIZES[p.get('size')]) ui.size.value = p.get('size');
    if (parseInt(p.get('seed'), 10) > 0) ui.seed.value = parseInt(p.get('seed'), 10);
    const algo = p.get('algo');
    if (algo === 'bfs' || algo === 'dfs' || algo === 'compare') {
      for (const radio of ui.algoRadios) radio.checked = radio.value === algo;
    }
    return p.get('run');
  }

  function writeParams() {
    const p = new URLSearchParams({ type: ui.type.value, size: ui.size.value, seed: ui.seed.value, algo: state.mode });
    try {
      history.replaceState(null, '', '?' + p.toString());
    } catch (err) {
      // Một số trình duyệt chặn replaceState khi mở bằng file:// — bỏ qua.
    }
  }

  // ---------------------------------------------------------------- Khởi động

  ui.type.innerHTML = Object.entries(TYPES).map(([k, v]) => `<option value="${k}">${v}</option>`).join('');
  ui.size.innerHTML = Object.entries(SIZES).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join('');
  ui.type.value = 'loops';
  ui.size.value = 'm';

  const boards = [new Board($('#board-a')), new Board($('#board-b'))];
  boards.forEach(attachEditing);

  ui.btnGenerate.addEventListener('click', generateMaze);
  ui.btnRandom.addEventListener('click', () => {
    ui.seed.value = 1 + Math.floor(Math.random() * 999999);
    generateMaze();
  });
  ui.type.addEventListener('change', generateMaze);
  ui.size.addEventListener('change', generateMaze);
  ui.seed.addEventListener('change', generateMaze);
  for (const radio of ui.algoRadios) radio.addEventListener('change', () => setMode(radio.value));
  ui.btnPlay.addEventListener('click', togglePlay);
  ui.btnStep.addEventListener('click', stepOnce);
  ui.btnFinish.addEventListener('click', finishNow);
  ui.btnClear.addEventListener('click', clearResults);
  ui.speed.addEventListener('input', refresh);

  document.addEventListener('keydown', (e) => {
    if (e.target.closest('button, input, select, textarea')) return;
    if (e.code === 'Space') {
      e.preventDefault();
      togglePlay();
    } else if (e.key === 'ArrowRight') {
      stepOnce();
    } else if (e.key === 'Enter') {
      finishNow();
    } else if (e.key === 'r' || e.key === 'R') {
      clearResults();
    }
  });

  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      layout();
      refresh();
    }, 100);
  });

  const runParam = readParams();
  loadMaze();
  setMode([...ui.algoRadios].find((r) => r.checked).value);
  if (runParam === 'finish') finishNow();
  else if (runParam === 'play') play();
})();
