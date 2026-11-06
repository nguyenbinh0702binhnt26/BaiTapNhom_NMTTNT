# Tìm đường đi trong mê cung bằng BFS và DFS

Bài tập nhóm — Đề tài: **Ứng dụng tìm đường đi trong mê cung bằng thuật toán BFS và DFS**.

Ứng dụng web trực quan hóa từng bước hai thuật toán tìm kiếm mù trong không gian trạng thái:
tìm kiếm theo chiều rộng (BFS) và tìm kiếm theo chiều sâu (DFS), có chế độ chạy song song để so sánh.

**Demo trực tuyến:** [Mở ứng dụng](https://nguyenbinh0702binhnt26.github.io/BaiTapNhom_NMTTNT/)

![So sánh BFS và DFS trên cùng một mê cung](docs/screenshot-compare.png)

## Tính năng

- Sinh mê cung theo 4 kiểu: mê cung hoàn hảo (một lối đi), mê cung nhiều lối đi, chướng ngại ngẫu nhiên, lưới trống;
  4 kích thước từ 11 × 21 đến 51 × 101. Cùng seed luôn cho cùng mê cung.
- Chạy BFS, DFS hoặc **so sánh cả hai** trên cùng mê cung, với hoạt ảnh từng bước (chạy / tạm dừng / từng bước / kết quả ngay, chỉnh tốc độ).
- Tô màu OPEN (chờ xét), CLOSED (đã xét), ô đang xét và đường đi tìm được.
- Thống kê: số ô đã xét, kích thước OPEN hiện tại và lớn nhất, độ dài đường đi, thời gian chạy thuật toán.
- Hiển thị nội dung đầu hàng đợi / đỉnh ngăn xếp và **nhật ký từng bước** theo dạng bảng OPEN/CLOSED.
- Vẽ / xóa tường bằng chuột, kéo thả điểm xuất phát **S** và đích **G**.
- Mê cung ví dụ 5 × 7 dùng trong báo cáo, hiện tọa độ trên từng ô để đối chiếu.

## Chạy ứng dụng

Không cần cài đặt hay build. Mở file `index.html` bằng trình duyệt (Chrome, Edge, Firefox, Safari).

Hoặc chạy một web server tĩnh:

```bash
python3 -m http.server 8000
# mở http://localhost:8000
```

Phím tắt: `Space` chạy/dừng, `→` từng bước, `Enter` kết quả ngay, `R` xóa kết quả.

Tham số URL để mở sẵn một cấu hình, ví dụ:
`index.html?type=loops&size=m&seed=2026&algo=compare&run=finish`

| Tham số | Giá trị |
| --- | --- |
| `type` | `perfect`, `loops`, `obstacles`, `empty`, `sample` |
| `size` | `s` (11×21), `m` (21×41), `l` (31×61), `xl` (51×101) |
| `seed` | số nguyên dương |
| `algo` | `bfs`, `dfs`, `compare` |
| `run` | `play` (chạy hoạt ảnh) hoặc `finish` (hiện kết quả ngay) |

## Kiểm thử và thực nghiệm

Cần Node.js 18 trở lên.

```bash
npm test                          # 8 kiểm thử tính đúng của BFS/DFS và bộ sinh mê cung
npm run bench                     # thực nghiệm so sánh, ghi ra experiments/results.md
node experiments/trace-example.js # bảng OPEN/CLOSED từng bước trên mê cung ví dụ
```

## Cấu trúc thư mục

```
maze-bfs-dfs/
├── index.html              Giao diện
├── css/style.css           Giao diện và bảng màu
├── js/
│   ├── maze.js             Lưới mê cung, sinh mê cung (recursive backtracker, đục vòng, chướng ngại)
│   ├── algorithms.js       BFS, DFS, lần ngược đường đi, đo thời gian
│   ├── renderer.js         Vẽ lưới, OPEN/CLOSED, đường đi lên canvas
│   └── app.js              Điều khiển, hoạt ảnh, chỉnh sửa bằng chuột
├── tests/                  Kiểm thử (node:test)
├── experiments/            Script thực nghiệm và kết quả
└── docs/                   Ảnh chụp màn hình
```

## Triển khai lên GitHub Pages

1. Tạo repository mới trên GitHub, ví dụ `maze-bfs-dfs`, rồi đẩy mã nguồn lên:
   ```bash
   git init
   git add .
   git commit -m "Ứng dụng tìm đường trong mê cung bằng BFS và DFS"
   git branch -M main
   git remote add origin https://github.com/<tên-tài-khoản>/maze-bfs-dfs.git
   git push -u origin main
   ```
2. Trên GitHub: **Settings → Pages → Build and deployment**, chọn *Deploy from a branch*, nhánh `main`, thư mục `/ (root)`, bấm **Save**.
3. Sau khoảng 1 phút, demo chạy tại `https://<tên-tài-khoản>.github.io/maze-bfs-dfs/`.

## Thành viên nhóm

| Họ và tên | Mã sinh viên |
| --- | --- |
| Nguyễn Hữu Tài | K24DTCN492 |
| (điền tên) | (điền MSV) |
