# Kaga × Tama — Đêm Hồ Ly

Bản dựng lại từ playable HTML trong thư mục này. Game mới dùng HTML, CSS và Canvas JavaScript thuần, không cần cài package.

## Chơi trực tuyến

**https://minhnhatdepzai.github.io/kaga-tama-game/**

Mỗi lần source được push lên nhánh `main`, GitHub Actions sẽ tự triển khai bản mới lên đường link này.

## Chạy game

Tại thư mục `game`, chạy:

```bash
python3 -m http.server 4173
```

Sau đó mở `http://127.0.0.1:4173/`.

## Điều khiển

- Điện thoại: giữ và kéo trên màn hình.
- Máy tính: kéo chuột hoặc dùng WASD / phím mũi tên.
- Nhân vật tự động bắn.
- Góc trên bên phải có nút âm thanh và toàn màn hình.

## Cấu trúc

- `index.html`: giao diện và HUD.
- `styles.css`: art direction, responsive và trạng thái tương tác.
- `game.js`: vòng lặp Canvas, địch, boss, va chạm, điểm và âm thanh.
- `assets/`: hình ảnh lấy từ gói playable HTML mà bạn đã nhận.
- `output/playwright/`: ảnh chụp dùng để kiểm tra giao diện điện thoại và máy tính.
- `orca_share_media1793958269441_7524406345354481001.html`: bản gốc giữ nguyên để đối chiếu.
- `.github/workflows/deploy-pages.yml`: tự động triển khai GitHub Pages.

Để cân chỉnh độ khó, tìm các hàm `spawnWave`, `bossPattern`, `playerShoot` và `damagePlayer` trong `game.js`.
