/*
 * Nguyễn Hữu Tài - K24DTCN492
 * Đề tài: Ứng dụng tìm đường đi trong mê cung bằng thuật toán BFS và DFS
 *
 * maze.js — Mô hình lưới mê cung và các cách sinh mê cung.
 * Mỗi ô của lưới là TƯỜNG (1) hoặc ĐƯỜNG (0). Ô xuất phát mặc định là (1, 1),
 * ô đích là (rows - 2, cols - 2); viền ngoài luôn là tường.
 */
(function (root, factory) {
  const lib = factory();
  if (typeof module === 'object' && module.exports) module.exports = lib;
  else root.Maze = lib;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const OPEN = 0;
  const WALL = 1;

  // Bộ sinh số ngẫu nhiên có seed (mulberry32): cùng seed -> cùng mê cung,
  // giúp lặp lại được thí nghiệm.
  function createRng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  class Grid {
    constructor(rows, cols, fill = OPEN) {
      this.rows = rows;
      this.cols = cols;
      this.cells = new Uint8Array(rows * cols).fill(fill);
    }

    index(r, c) {
      return r * this.cols + c;
    }

    row(i) {
      return Math.floor(i / this.cols);
    }

    col(i) {
      return i % this.cols;
    }

    inBounds(r, c) {
      return r >= 0 && r < this.rows && c >= 0 && c < this.cols;
    }

    isWall(r, c) {
      return this.cells[this.index(r, c)] === WALL;
    }

    set(r, c, value) {
      this.cells[this.index(r, c)] = value;
    }

    clone() {
      const g = new Grid(this.rows, this.cols);
      g.cells.set(this.cells);
      return g;
    }
  }

  function shuffle(arr, rng) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function withBorder(rows, cols) {
    const g = new Grid(rows, cols, OPEN);
    for (let c = 0; c < cols; c++) {
      g.set(0, c, WALL);
      g.set(rows - 1, c, WALL);
    }
    for (let r = 0; r < rows; r++) {
      g.set(r, 0, WALL);
      g.set(r, cols - 1, WALL);
    }
    return g;
  }

  // Mê cung hoàn hảo bằng thuật toán "recursive backtracker" (chính là DFS
  // ngẫu nhiên): giữa hai ô bất kỳ có đúng một đường đi. Các "phòng" nằm ở tọa
  // độ lẻ, tường nằm giữa chúng, nên rows và cols phải là số lẻ.
  function generatePerfect(rows, cols, rng) {
    const g = new Grid(rows, cols, WALL);
    const steps = [[-2, 0], [0, 2], [2, 0], [0, -2]];
    const stack = [[1, 1]];
    g.set(1, 1, OPEN);

    while (stack.length > 0) {
      const [r, c] = stack[stack.length - 1];
      const options = [];
      for (const [dr, dc] of steps) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr > 0 && nr < rows - 1 && nc > 0 && nc < cols - 1 && g.isWall(nr, nc)) {
          options.push([nr, nc]);
        }
      }
      if (options.length === 0) {
        stack.pop();
        continue;
      }
      const [nr, nc] = options[Math.floor(rng() * options.length)];
      g.set((r + nr) / 2, (c + nc) / 2, OPEN); // đục tường ở giữa
      g.set(nr, nc, OPEN);
      stack.push([nr, nc]);
    }
    return g;
  }

  // Đục thêm một tỉ lệ tường bên trong để tạo vòng lặp, khi đó mê cung có nhiều
  // đường đi khác nhau và BFS/DFS bắt đầu cho kết quả khác nhau.
  function addLoops(g, ratio, rng) {
    const candidates = [];
    for (let r = 1; r < g.rows - 1; r++) {
      for (let c = 1; c < g.cols - 1; c++) {
        if (!g.isWall(r, c)) continue;
        const horizontal = !g.isWall(r, c - 1) && !g.isWall(r, c + 1) && g.isWall(r - 1, c) && g.isWall(r + 1, c);
        const vertical = !g.isWall(r - 1, c) && !g.isWall(r + 1, c) && g.isWall(r, c - 1) && g.isWall(r, c + 1);
        if (horizontal || vertical) candidates.push([r, c]);
      }
    }
    shuffle(candidates, rng);
    const count = Math.floor(candidates.length * ratio);
    for (let i = 0; i < count; i++) g.set(candidates[i][0], candidates[i][1], OPEN);
    return g;
  }

  function generateObstacles(rows, cols, density, rng) {
    const g = withBorder(rows, cols);
    for (let r = 1; r < rows - 1; r++) {
      for (let c = 1; c < cols - 1; c++) {
        if (rng() < density) g.set(r, c, WALL);
      }
    }
    return g;
  }

  // Đọc mê cung từ các dòng ký tự: '#' tường, '.' đường, 'S' xuất phát, 'G' đích.
  function fromAscii(lines) {
    const grid = new Grid(lines.length, lines[0].length);
    let start = null;
    let goal = null;
    lines.forEach((line, r) => {
      [...line].forEach((ch, c) => {
        if (ch === '#') grid.set(r, c, WALL);
        else if (ch === 'S') start = [r, c];
        else if (ch === 'G') goal = [r, c];
      });
    });
    return { grid, start, goal };
  }

  // Ví dụ nhỏ dùng trong báo cáo: một vòng tròn, G ở ngay dưới S hai ô.
  const SAMPLE = [
    '#######',
    '#S....#',
    '#.###.#',
    '#G....#',
    '#######',
  ];

  const TYPES = {
    perfect: 'Mê cung hoàn hảo (1 lối đi)',
    loops: 'Mê cung nhiều lối đi',
    obstacles: 'Chướng ngại ngẫu nhiên',
    empty: 'Lưới trống',
    sample: 'Ví dụ nhỏ trong báo cáo (5 × 7)',
  };

  const LOOP_RATIO = 0.1;
  const OBSTACLE_DENSITY = 0.25;

  // Sinh mê cung theo kiểu; trả về lưới cùng ô xuất phát và ô đích.
  // Kiểu 'sample' có kích thước cố định nên bỏ qua rows, cols, seed.
  function generate(type, rows, cols, seed) {
    if (type === 'sample') return fromAscii(SAMPLE);
    const rng = createRng(seed);
    let grid;
    switch (type) {
      case 'perfect':
        grid = generatePerfect(rows, cols, rng);
        break;
      case 'loops':
        grid = addLoops(generatePerfect(rows, cols, rng), LOOP_RATIO, rng);
        break;
      case 'obstacles':
        grid = generateObstacles(rows, cols, OBSTACLE_DENSITY, rng);
        break;
      case 'empty':
        grid = withBorder(rows, cols);
        break;
      default:
        throw new Error('Kiểu mê cung không hợp lệ: ' + type);
    }
    const start = [1, 1];
    const goal = [rows - 2, cols - 2];
    grid.set(start[0], start[1], OPEN);
    grid.set(goal[0], goal[1], OPEN);
    return { grid, start, goal };
  }

  return { OPEN, WALL, Grid, createRng, generate, generatePerfect, addLoops, fromAscii, TYPES };
});
