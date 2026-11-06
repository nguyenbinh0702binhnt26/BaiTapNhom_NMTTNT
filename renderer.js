/*
 * Nguyễn Hữu Tài - K24DTCN492
 * Đề tài: Ứng dụng tìm đường đi trong mê cung bằng thuật toán BFS và DFS
 *
 * renderer.js — Vẽ lưới mê cung, trạng thái OPEN/CLOSED và đường đi lên <canvas>.
 * Màu sắc lấy từ biến CSS (--c-*) để chú thích và hình vẽ luôn khớp nhau.
 */
(function (root) {
  'use strict';

  // Giá trị trong mảng overlay của mỗi ô
  const MARK = { NONE: 0, OPEN: 1, CLOSED: 2 };

  function readColors() {
    const css = getComputedStyle(document.documentElement);
    const get = (name) => css.getPropertyValue(name).trim();
    return {
      open: get('--c-empty'),
      wall: get('--c-wall'),
      gridLine: get('--c-grid-line'),
      frontier: get('--c-frontier'),
      visited: get('--c-visited'),
      current: get('--c-current'),
      pathCell: get('--c-path-cell'),
      path: get('--c-path'),
      start: get('--c-start'),
      goal: get('--c-goal'),
    };
  }

  class Renderer {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.colors = readColors();
      this.cell = 10;
    }

    setGrid(grid) {
      this.grid = grid;
    }

    // Chọn kích thước ô lớn nhất sao cho cả lưới vừa khung maxW × maxH.
    resize(maxW, maxH) {
      const { rows, cols } = this.grid;
      this.cell = Math.max(2, Math.min(72, Math.floor(Math.min(maxW / cols, maxH / rows))));
      const w = this.cell * cols;
      const h = this.cell * rows;
      const dpr = window.devicePixelRatio || 1;
      this.canvas.style.width = w + 'px';
      this.canvas.style.height = h + 'px';
      this.canvas.width = Math.round(w * dpr);
      this.canvas.height = Math.round(h * dpr);
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    // Đổi tọa độ chuột sang ô [hàng, cột]; null nếu nằm ngoài lưới.
    cellAt(clientX, clientY) {
      const rect = this.canvas.getBoundingClientRect();
      const c = Math.floor((clientX - rect.left) / this.cell);
      const r = Math.floor((clientY - rect.top) / this.cell);
      return this.grid.inBounds(r, c) ? [r, c] : null;
    }

    /**
     * Vẽ lại toàn bộ khung hình.
     * view = { overlay, current, path, start, goal }
     */
    draw(view) {
      const { ctx, cell, grid, colors } = this;
      const { rows, cols, cells } = grid;
      const { overlay, current, path, start, goal } = view;

      ctx.fillStyle = colors.open;
      ctx.fillRect(0, 0, cols * cell, rows * cell);

      let lastColor = null;
      for (let i = 0; i < cells.length; i++) {
        let color = null;
        if (cells[i] === 1) color = colors.wall;
        else if (overlay && overlay[i] === MARK.CLOSED) color = colors.visited;
        else if (overlay && overlay[i] === MARK.OPEN) color = colors.frontier;
        if (!color) continue;
        if (color !== lastColor) {
          ctx.fillStyle = color;
          lastColor = color;
        }
        ctx.fillRect((i % cols) * cell, Math.floor(i / cols) * cell, cell, cell);
      }

      if (path && path.length > 0) {
        ctx.fillStyle = colors.pathCell;
        for (const i of path) ctx.fillRect((i % cols) * cell, Math.floor(i / cols) * cell, cell, cell);
      }

      if (current >= 0) {
        ctx.fillStyle = colors.current;
        ctx.fillRect((current % cols) * cell, Math.floor(current / cols) * cell, cell, cell);
      }

      if (cell >= 12) this.drawGridLines();
      if (cell >= 44) this.drawCoordinates();
      if (path && path.length > 1) this.drawPathLine(path);
      this.drawMarker(start, colors.start, 'S');
      this.drawMarker(goal, colors.goal, 'G');
    }

    drawGridLines() {
      const { ctx, cell, grid, colors } = this;
      ctx.strokeStyle = colors.gridLine;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let r = 0; r <= grid.rows; r++) {
        ctx.moveTo(0, r * cell + 0.5);
        ctx.lineTo(grid.cols * cell, r * cell + 0.5);
      }
      for (let c = 0; c <= grid.cols; c++) {
        ctx.moveTo(c * cell + 0.5, 0);
        ctx.lineTo(c * cell + 0.5, grid.rows * cell);
      }
      ctx.stroke();
    }

    // Ghi tọa độ (hàng,cột) lên từng ô đường khi ô đủ lớn, để đối chiếu với nhật ký.
    drawCoordinates() {
      const { ctx, cell, grid } = this;
      ctx.fillStyle = '#64748b';
      ctx.font = `${Math.min(13, Math.floor(cell / 5))}px system-ui, sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      for (let r = 0; r < grid.rows; r++) {
        for (let c = 0; c < grid.cols; c++) {
          if (!grid.isWall(r, c)) ctx.fillText(`${r},${c}`, c * cell + 4, r * cell + 3);
        }
      }
    }

    drawPathLine(path) {
      const { ctx, cell, grid, colors } = this;
      const center = (i) => [(i % grid.cols) * cell + cell / 2, Math.floor(i / grid.cols) * cell + cell / 2];
      ctx.strokeStyle = colors.path;
      ctx.lineWidth = Math.max(2, cell * 0.3);
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.beginPath();
      const [x0, y0] = center(path[0]);
      ctx.moveTo(x0, y0);
      for (let k = 1; k < path.length; k++) {
        const [x, y] = center(path[k]);
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    drawMarker([r, c], color, letter) {
      const { ctx, cell } = this;
      const pad = cell >= 8 ? 1 : 0;
      ctx.fillStyle = color;
      ctx.fillRect(c * cell + pad, r * cell + pad, cell - 2 * pad, cell - 2 * pad);
      if (cell >= 14) {
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${Math.floor(cell * 0.6)}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(letter, c * cell + cell / 2, r * cell + cell / 2 + 1);
      }
    }
  }

  root.Renderer = Renderer;
  root.MARK = MARK;
})(self);
