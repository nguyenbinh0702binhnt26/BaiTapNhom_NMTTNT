/*
 * Nguyễn Hữu Tài - K24DTCN492
 * Đề tài: Ứng dụng tìm đường đi trong mê cung bằng thuật toán BFS và DFS
 *
 * algorithms.js — Hai thuật toán tìm kiếm mù trên không gian trạng thái mê cung.
 *
 *   Trạng thái  : ô (hàng, cột) mà robot đang đứng, mã hóa thành số u = hàng * cols + cột
 *   Ban đầu     : ô xuất phát S;   Đích: ô G
 *   Hành động   : Lên, Phải, Xuống, Trái (không đi vào tường, không ra ngoài lưới)
 *   Chi phí     : mỗi bước đi tốn 1
 *
 * Cả hai thuật toán dùng hai danh sách như trong giáo trình:
 *   OPEN   — các trạng thái đã sinh ra nhưng chưa xét (BFS: hàng đợi FIFO, DFS: ngăn xếp LIFO)
 *   CLOSED — các trạng thái đã xét
 * Một trạng thái v chỉ được đưa vào OPEN nếu v chưa có trong OPEN và CLOSED.
 *
 * Nếu truyền mảng `trace`, mỗi lần xét một trạng thái sẽ ghi lại một bước để
 * giao diện phát lại hoạt ảnh; khi đo thời gian thì bỏ qua `trace`.
 */
(function (root, factory) {
  const lib = factory();
  if (typeof module === 'object' && module.exports) module.exports = lib;
  else root.Search = lib;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const DIRECTIONS = [
    { name: 'Lên', dr: -1, dc: 0 },
    { name: 'Phải', dr: 0, dc: 1 },
    { name: 'Xuống', dr: 1, dc: 0 },
    { name: 'Trái', dr: 0, dc: -1 },
  ];

  // Số phần tử đầu OPEN được lưu ở mỗi bước để hiển thị trên giao diện.
  const PEEK = 8;

  // Các trạng thái kề của u, theo thứ tự Lên, Phải, Xuống, Trái.
  function successors(grid, u) {
    const r = grid.row(u);
    const c = grid.col(u);
    const result = [];
    for (const d of DIRECTIONS) {
      const nr = r + d.dr;
      const nc = c + d.dc;
      if (grid.inBounds(nr, nc) && !grid.isWall(nr, nc)) result.push(grid.index(nr, nc));
    }
    return result;
  }

  // Lần ngược mảng cha từ đích về xuất phát để lấy đường đi.
  function reconstructPath(parent, s, g) {
    const path = [];
    for (let v = g; v !== -1; v = parent[v]) {
      path.push(v);
      if (v === s) break;
    }
    return path.reverse();
  }

  function finish(found, parent, s, g, expanded, maxOpen) {
    const path = found ? reconstructPath(parent, s, g) : [];
    return {
      found,
      path,
      pathLength: found ? path.length - 1 : null, // số bước đi
      expanded, // số trạng thái đã xét (|CLOSED|)
      maxOpen, // kích thước lớn nhất của OPEN
    };
  }

  // Tìm kiếm theo chiều rộng: OPEN là hàng đợi (FIFO).
  function bfs(grid, startCell, goalCell, trace) {
    const n = grid.rows * grid.cols;
    const s = grid.index(startCell[0], startCell[1]);
    const g = grid.index(goalCell[0], goalCell[1]);
    const parent = new Int32Array(n).fill(-1);
    const seen = new Uint8Array(n); // 1 nếu đã có trong OPEN hoặc CLOSED

    // Mỗi trạng thái vào hàng đợi tối đa một lần nên dùng mảng cố định + con trỏ đầu/cuối.
    const queue = new Int32Array(n);
    let head = 0;
    let tail = 0;
    queue[tail++] = s;
    seen[s] = 1;
    let expanded = 0;
    let maxOpen = 1;
    const peekFront = () => Array.from(queue.subarray(head, Math.min(tail, head + PEEK)));

    while (head < tail) {
      const u = queue[head++]; // lấy trạng thái ở ĐẦU hàng đợi
      expanded++;
      if (u === g) {
        if (trace) trace.push({ node: u, added: [], open: tail - head, peek: peekFront() });
        return finish(true, parent, s, g, expanded, maxOpen);
      }
      const added = [];
      for (const v of successors(grid, u)) {
        if (!seen[v]) {
          seen[v] = 1;
          parent[v] = u;
          queue[tail++] = v; // thêm vào CUỐI hàng đợi
          added.push(v);
        }
      }
      if (tail - head > maxOpen) maxOpen = tail - head;
      if (trace) trace.push({ node: u, added, open: tail - head, peek: peekFront() });
    }
    return finish(false, parent, s, g, expanded, maxOpen);
  }

  // Tìm kiếm theo chiều sâu: OPEN là ngăn xếp (LIFO).
  function dfs(grid, startCell, goalCell, trace) {
    const n = grid.rows * grid.cols;
    const s = grid.index(startCell[0], startCell[1]);
    const g = grid.index(goalCell[0], goalCell[1]);
    const parent = new Int32Array(n).fill(-1);
    const seen = new Uint8Array(n);

    const stack = [s];
    seen[s] = 1;
    let expanded = 0;
    let maxOpen = 1;
    const peekTop = () => stack.slice(-PEEK).reverse(); // đỉnh ngăn xếp đứng trước

    while (stack.length > 0) {
      const u = stack.pop(); // lấy trạng thái ở ĐỈNH ngăn xếp
      expanded++;
      if (u === g) {
        if (trace) trace.push({ node: u, added: [], open: stack.length, peek: peekTop() });
        return finish(true, parent, s, g, expanded, maxOpen);
      }
      const added = successors(grid, u).filter((v) => !seen[v]);
      for (const v of added) {
        seen[v] = 1;
        parent[v] = u;
      }
      // Đẩy theo thứ tự ngược để hướng đầu tiên (Lên) nằm trên đỉnh và được xét trước.
      for (let i = added.length - 1; i >= 0; i--) stack.push(added[i]);
      if (stack.length > maxOpen) maxOpen = stack.length;
      if (trace) trace.push({ node: u, added, open: stack.length, peek: peekTop() });
    }
    return finish(false, parent, s, g, expanded, maxOpen);
  }

  const ALGORITHMS = {
    bfs: { name: 'BFS', fullName: 'Tìm kiếm theo chiều rộng (BFS)', run: bfs },
    dfs: { name: 'DFS', fullName: 'Tìm kiếm theo chiều sâu (DFS)', run: dfs },
  };

  // Đo thời gian chạy trung bình (ms), không ghi vết, chạy lặp đến khi đủ ~minMs.
  function measure(run, grid, start, goal, minMs = 20) {
    const now = typeof performance !== 'undefined' ? () => performance.now() : () => Date.now();
    let runs = 0;
    const t0 = now();
    let elapsed = 0;
    do {
      run(grid, start, goal, null);
      runs++;
      elapsed = now() - t0;
    } while (elapsed < minMs && runs < 10000);
    return elapsed / runs;
  }

  return { DIRECTIONS, ALGORITHMS, successors, reconstructPath, bfs, dfs, measure };
});
