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

## Cấu trúc màn chơi

1. Phá đội hình trái tim gồm 14 yêu tinh xanh, mỗi con có 3 HP. Đội hình đứng 1,4 giây rồi dịch một vị trí trong 0,6 giây.
2. Nhặt hai vật phẩm tăng hỏa lực rơi sau mạng hạ thứ 1 và thứ 7.
3. Theo dõi hội thoại Kaga gặp lại Tama.
4. Đánh bốn phase boss: **Dark Water**, **Frozen Flower**, **Ice Fox** và **Nine Tails**.
5. Xem animation biến hình 10 frame và đoạn kết **RESCUE HER!**.

Vòng render giới hạn tối đa 54 đạn người chơi, 220 đạn boss và 100 particle. Background được cache khi đổi kích thước màn hình và DPR được giới hạn ở 1,5 để giữ tốc độ ổn định trên thiết bị có màn hình mật độ cao.

## Cấu trúc

- `index.html`: giao diện và HUD.
- `styles.css`: art direction, responsive và trạng thái tương tác.
- `game.js`: state machine của level, vòng lặp Canvas, bốn phase boss, hội thoại, va chạm, điểm và âm thanh.
- `assets/`: hình ảnh lấy từ gói playable HTML mà bạn đã nhận.
- `output/playwright/`: ảnh chụp dùng để kiểm tra giao diện điện thoại và máy tính.
- `orca_share_media1793958269441_7524406345354481001.html`: bản gốc giữ nguyên để đối chiếu.
- `.github/workflows/deploy-pages.yml`: tự động triển khai GitHub Pages.

Để cân chỉnh độ khó, sửa bảng `PHASES` và các hàm `runBossPattern`, `playerShoot`, `damagePlayer` trong `game.js`.
