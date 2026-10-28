-- =====================================================================
-- LUK SG · Tạo tài khoản quản lý đầu tiên
-- Bước 1: Supabase → Authentication → Users → Add user → Create new user
--         Email:    dat@nhanvien.luksg.vn   (tên đăng nhập "dat" + @nhanvien.luksg.vn)
--         Password: mật khẩu bạn muốn
--         Tick "Auto Confirm User"
-- Bước 2: Sửa 4 giá trị bên dưới cho đúng rồi Run.
-- Các tài khoản sau đó tạo ngay trong app: Bảng quản lý → Nhân viên.
-- =====================================================================

insert into public.nhan_vien (id, ten_dang_nhap, ho_ten, email, nhom, vai_tro)
select id,
       'dat',                                -- tên đăng nhập (phần trước @)
       'Vũ Tiến Đạt',                        -- họ tên
       'lukglobalvutiendat@gmail.com',       -- email nhận thông báo
       '{inn,media}',
       'quan_ly'
from auth.users
where email = 'dat@nhanvien.luksg.vn'       -- đúng email đã tạo ở Bước 1
on conflict (id) do update set vai_tro = 'quan_ly', dang_lam = true;

select ten_dang_nhap, ho_ten, vai_tro from public.nhan_vien;
