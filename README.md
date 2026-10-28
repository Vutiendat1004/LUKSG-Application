# LUK SG · App kiểm kho LUK Inn & thiết bị Media SG

Next.js 16 (giao diện) + Supabase (database, đăng nhập) + Resend (email) · đưa lên Vercel.

## Trong thư mục này

| Thư mục / file | Là gì |
| --- | --- |
| `supabase/01_database.sql` | Toàn bộ database: bảng, công thức đặt hàng, mượn/trả, phân quyền. Chạy 1 lần. |
| `supabase/02_lich_tu_dong.sql` | Lịch tự động (7h, 9h, 17h, 23h, thứ Hai, thứ Sáu). Chạy sau khi app đã lên Vercel. |
| `supabase/03_tao_quan_ly.sql` | Tạo tài khoản quản lý đầu tiên. |
| `app/` | Các màn hình. `app/(app)/quan-ly/` là phần quản lý. |
| `lib/lich.ts` | Nội dung các email tự động. |
| `.env.example` | Danh sách khoá cần khai báo trên Vercel. |

## Cài đặt từng bước

### 1. Supabase (database)
1. Vào supabase.com → **New project**. Region chọn **Southeast Asia (Singapore)**. Lưu lại mật khẩu database.
2. **SQL Editor → New query** → dán toàn bộ `supabase/01_database.sql` → **Run**. Thấy "Success" là xong.
3. **Authentication → Sign In / Providers → Email**: tắt **Allow new users to sign up** (chỉ quản lý được tạo tài khoản). Tắt luôn **Confirm email**.
4. Tạo quản lý đầu tiên: làm theo hướng dẫn ở đầu file `supabase/03_tao_quan_ly.sql`.
5. **Project Settings → API**: chép 3 giá trị `Project URL`, `anon public`, `service_role` để dùng ở bước 3.

### 2. Đưa code lên GitHub
1. Tạo repo **Private** tên `luk-sg-app` trên github.com.
2. Cách dễ nhất: cài GitHub Desktop → **Add existing repository** → chọn thư mục này → **Publish**.
   (Hoặc trên web: **Add file → Upload files**, kéo cả thư mục vào, trừ `node_modules`.)

### 3. Vercel (đưa app lên mạng)
1. vercel.com → **Add New → Project** → chọn repo `luk-sg-app` → **Import**.
2. Mở **Environment Variables**, thêm từng dòng trong `.env.example`:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (bước 1.5)
   - `RESEND_API_KEY`, `EMAIL_FROM` (bước 4)
   - `CRON_SECRET`: một chuỗi ngẫu nhiên dài, tự đặt
   - `NEXT_PUBLIC_APP_URL`: link app, vd `https://app.luk.vn`
3. **Deploy**. Khoảng 1–2 phút là xong.
4. Gắn tên miền: **Settings → Domains → Add** `app.luk.vn`, rồi tạo bản ghi DNS theo hướng dẫn Vercel ở nơi mua tên miền.
5. Dùng cho công ty thì chuyển project sang gói **Pro** (gói Hobby không cho mục đích kinh doanh).

Đổi khoá trên Vercel xong phải **Deployments → … → Redeploy** thì mới có hiệu lực.

### 4. Resend (gửi email)
1. resend.com → **Domains → Add Domain** → nhập tên miền công ty → thêm các bản ghi DNS Resend đưa → chờ "Verified".
2. **API Keys → Create** → chép vào `RESEND_API_KEY` trên Vercel.
3. `EMAIL_FROM` đặt dạng `LUK SG <thongbao@luk.vn>` (đuôi phải đúng tên miền đã xác minh).

Chưa có tên miền thì app vẫn chạy, chỉ là chưa gửi được email.

### 5. Bật lịch tự động
1. Mở `supabase/02_lich_tu_dong.sql`, sửa 2 dòng: link app và `CRON_SECRET` (đúng chuỗi đã đặt trên Vercel).
2. Supabase → SQL Editor → dán → **Run**.
3. Thử ngay một việc: mở trình duyệt vào `https://app.luk.vn/api/cron/bao-cao-dat-hang?key=CRON_SECRET_CUA_BAN`. Thấy `"ok": true` và có email về là chạy.

| Giờ VN | Việc |
| --- | --- |
| 07:00 hằng ngày | Báo cáo đặt hàng LUK Inn + tin nhắn soạn sẵn cho NCC |
| 09:00 hằng ngày | Kiểm tra quá hạn trả thiết bị, ghi vi phạm, báo cấp trên khi bậc 3 |
| 17:00 hằng ngày | Nhắc "ngày mai đến hạn trả" |
| 23:00 hằng ngày | Nhắc kiểm kho nếu hôm nay đến lịch mà chưa đếm |
| 08:00 thứ Hai | Báo cáo tuần thiết bị |
| 16:00 thứ Sáu | Email "Bạn đang giữ" cho từng người |

### 6. Dữ liệu cũ từ Google Sheet
Tải 2 file Google Sheet về dạng Excel (**Tệp → Tải xuống → Microsoft Excel**) và gửi cho Claude. Claude chuyển thành một file SQL để bạn dán vào SQL Editor, gồm: Danh mục, Nhà cung cấp, kiểm kho và nhập hàng 35 ngày gần nhất, công thức/quy đổi/bán hàng, 134 thiết bị, số chuẩn từng loại, lịch sử mượn trả.

### 7. Cho nhân viên dùng
1. Đăng nhập bằng tài khoản quản lý → **Bảng quản lý → Nhân viên** → tạo tài khoản cho từng người, tick nhóm Inn / Media, điền email để họ nhận thông báo.
2. **Bảng quản lý → In mã QR**: in QR dán thiết bị và QR dán kho/office.
3. Nhân viên lưu app ra màn hình chính:
   - iPhone: mở link bằng **Safari** → nút Chia sẻ → **Thêm vào MH chính**
   - Android: mở bằng **Chrome** → ⋮ → **Thêm vào màn hình chính**

### 8. Chạy song song rồi chuyển hẳn
Cho 2–3 người dùng app 1–2 tuần trong khi Google Sheet vẫn chạy. Số khớp rồi thì:
- Mở 2 dự án Apps Script → **Trình kích hoạt** → xoá hết trigger (để không gửi email đôi).
- Google Form Media: **Câu trả lời → tắt Chấp nhận câu trả lời**.
- Để 2 Google Sheet ở chế độ chỉ xem để lưu trữ.

## Phân quyền

| Vai trò | Thấy gì |
| --- | --- |
| Nhân viên nhóm Inn | Kiểm kho 3 mục, nhập hàng |
| Nhân viên nhóm Media | Mượn / trả / chuyển, đồ mình đang giữ, vi phạm của mình |
| Quản lý | Tất cả, cộng Bảng quản lý |

Phân quyền nằm trong database (Row Level Security), nên dù có lỗi giao diện thì nhân viên cũng không đọc/sửa được phần không phải của mình.

## Xử lý vi phạm (thay mức phạt tiền cũ)
Đếm số lần quá hạn hoặc trả trễ trong 90 ngày: **lần 1** nhắc nhở · **lần 2** tạm mất quyền tự mượn 14 ngày (quản lý vẫn mượn hộ được, mở khoá ở trang Vi phạm) · **lần 3+** email báo cấp trên, xử lý theo nội quy. Số ngày và bật/tắt tự khoá sửa ở **Cấu hình**.

## Chạy thử trên máy (cho người làm IT)
```bash
npm install
cp .env.example .env.local   # điền khoá thật
npm run dev                  # mở http://localhost:3000
```
