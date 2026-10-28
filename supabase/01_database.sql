-- =====================================================================
-- LUK SG · Database cho app Tồn kho LUK Inn + Thiết bị Media SG
-- Dán toàn bộ file này vào Supabase → SQL Editor → Run (chạy 1 lần).
-- Chạy lại cũng an toàn: file tự bỏ qua những gì đã có.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- 0. HÀM CHUNG
-- ---------------------------------------------------------------------

-- Ngày hôm nay theo giờ Việt Nam
create or replace function public.hom_nay() returns date
language sql stable as $$
  select (now() at time zone 'Asia/Ho_Chi_Minh')::date
$$;

-- ---------------------------------------------------------------------
-- 1. NHÂN VIÊN & CẤU HÌNH
-- ---------------------------------------------------------------------

create table if not exists public.nhan_vien (
  id              uuid primary key references auth.users(id) on delete cascade,
  ten_dang_nhap   text not null unique,
  ho_ten          text not null,
  email           text,                                   -- email nhận thông báo
  nhom            text[] not null default '{}'
                  check (nhom <@ array['inn','media']::text[]),
  vai_tro         text not null default 'nhan_vien'
                  check (vai_tro in ('nhan_vien','quan_ly')),
  dang_lam        boolean not null default true,
  khoa_muon_den   date,                                   -- tạm mất quyền tự mượn đến ngày
  tao_luc         timestamptz not null default now()
);

create table if not exists public.cau_hinh (
  khoa     text primary key,
  gia_tri  text,
  mo_ta    text
);

create or replace function public.cau_hinh_lay(p_khoa text, p_mac_dinh text default null)
returns text language sql stable security definer set search_path = public as $$
  select coalesce(nullif((select gia_tri from cau_hinh where khoa = p_khoa), ''), p_mac_dinh)
$$;

create or replace function public.la_quan_ly() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from nhan_vien
                 where id = auth.uid() and vai_tro = 'quan_ly' and dang_lam)
$$;

create or replace function public.thuoc_nhom(p_nhom text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from nhan_vien
                 where id = auth.uid() and dang_lam
                   and (vai_tro = 'quan_ly' or p_nhom = any(nhom)))
$$;

insert into public.cau_hinh (khoa, gia_tri, mo_ta) values
  ('ten_quan',               'LUK Inn SG', 'Tên hiển thị trong email đặt hàng'),
  ('email_quan_ly_inn',      '',  'Email nhận báo cáo đặt hàng 7h, cảnh báo sau kiểm kho, nhắc 23h. Nhiều email cách nhau bằng dấu phẩy'),
  ('nhac_23h_gui_nhan_vien', 'co','co / khong: email nhắc 23h có gửi cho nhân viên nhóm Inn không'),
  ('thu_kiem_nl',            'CN','Ngày kiểm NVL khô hằng tuần: T2 T3 T4 T5 T6 T7 CN'),
  ('thu_kiem_vl',            'CN','Ngày kiểm Vệ sinh & Logistic hằng tuần: T2 … CN'),
  ('he_so_mua_vu',           '1', 'Nhân lượng dùng/ngày (vd 1.2 mùa cao điểm)'),
  ('so_ngay_hoc',            '35','Số ngày gần nhất dùng để tính lượng dùng thực tế'),
  ('ngay_hoc_toi_thieu',     '5', 'Cần ít nhất ngần này ngày có số kiểm kho thì mới dùng số thực tế'),
  ('email_team_media',       'lukglobalhuynhminhmai@gmail.com', 'Email team Media (nhận bản sao mọi lượt mượn/trả)'),
  ('email_quan_ly_media',    'lukglobalvutiendat@gmail.com',    'Email quản lý thiết bị (cc chuyển chi nhánh, báo cáo tuần)'),
  ('email_cap_tren',         '',  'Email cấp trên nhận báo cáo vi phạm bậc 3. Để trống = gửi quản lý thiết bị'),
  ('han_muon_mac_dinh_ngay', '3', 'Hạn trả mặc định khi mượn (số ngày)'),
  ('tu_dong_khoa_muon',      'co','co / khong: vi phạm bậc 2 tự tạm khoá quyền tự mượn'),
  ('so_ngay_khoa_muon',      '14','Số ngày tạm khoá quyền tự mượn'),
  ('so_ngay_tinh_vi_pham',   '90','Đếm số lần vi phạm trong bao nhiêu ngày gần nhất')
on conflict (khoa) do nothing;

-- ---------------------------------------------------------------------
-- 2. LUK INN · TỒN KHO & ĐẶT HÀNG
-- ---------------------------------------------------------------------

create table if not exists public.nha_cung_cap (
  id       bigint generated always as identity primary key,
  ten      text not null unique,
  sdt      text,
  zalo     text,
  ghi_chu  text
);

create table if not exists public.mat_hang (
  id             bigint generated always as identity primary key,
  ma             text not null unique,
  ten            text not null,
  loai           text not null check (loai in ('Fruit','Ingredient','Hygiene','Logistic')),
  muc            text generated always as (
                   case loai when 'Fruit' then 'trai_cay'
                             when 'Ingredient' then 'nvl_kho'
                             else 've_sinh' end) stored,
  don_vi         text not null default '',
  ncc_id         bigint references public.nha_cung_cap(id) on delete set null,
  don_gia        numeric,
  sl_dung_thang  numeric,          -- ước tính ban đầu (đơn vị kho / tháng)
  sl_dung_ngay   numeric,          -- dùng cho trái cây
  ngay_giao      numeric not null default 1,   -- số ngày từ lúc đặt tới lúc hàng về
  chu_ky_dat     numeric not null default 7,   -- bao lâu đặt một lần (ngày)
  ton_an_toan    numeric not null default 2,   -- tồn dự phòng (ngày)
  boi_so         numeric not null default 1,   -- làm tròn số đặt lên theo bội số
  dang_dung      boolean not null default true,
  thu_tu         int not null default 0,
  ghi_chu        text
);
create index if not exists mat_hang_muc_idx on public.mat_hang (muc, thu_tu);

create table if not exists public.kiem_kho (
  id           bigint generated always as identity primary key,
  mat_hang_id  bigint not null references public.mat_hang(id) on delete cascade,
  so_luong     numeric not null check (so_luong >= 0),
  thoi_diem    timestamptz not null default now(),
  nguoi_id     uuid references public.nhan_vien(id) default auth.uid(),
  nguoi_ten    text,
  luot_id      uuid,
  ghi_chu      text
);
create index if not exists kiem_kho_mh_idx on public.kiem_kho (mat_hang_id, thoi_diem desc);

create table if not exists public.nhap_hang (
  id           bigint generated always as identity primary key,
  mat_hang_id  bigint not null references public.mat_hang(id) on delete cascade,
  so_luong     numeric not null check (so_luong > 0),
  thoi_diem    timestamptz not null default now(),
  nguoi_id     uuid references public.nhan_vien(id) default auth.uid(),
  nguoi_ten    text,
  don_gia      numeric,
  ghi_chu      text
);
create index if not exists nhap_hang_mh_idx on public.nhap_hang (mat_hang_id, thoi_diem desc);

-- Lịch sử đặt hàng. trang_thai = 'dang_ve' được tính là "đang về".
create table if not exists public.dat_hang (
  id            bigint generated always as identity primary key,
  mat_hang_id   bigint not null references public.mat_hang(id) on delete cascade,
  so_luong      numeric not null check (so_luong > 0),
  ngay_dat      date not null default public.hom_nay(),
  ngay_du_kien  date,
  ncc_id        bigint references public.nha_cung_cap(id) on delete set null,
  trang_thai    text not null default 'dang_ve' check (trang_thai in ('dang_ve','da_nhan','huy')),
  nguoi_id      uuid references public.nhan_vien(id) default auth.uid(),
  ghi_chu       text
);
create index if not exists dat_hang_mh_idx on public.dat_hang (mat_hang_id, trang_thai);

-- Có nhập hàng thì các đơn "đang về" của món đó coi như đã nhận
create or replace function public.tg_nhap_hang_dong_don() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update dat_hang set trang_thai = 'da_nhan'
   where mat_hang_id = new.mat_hang_id and trang_thai = 'dang_ve'
     and ngay_dat <= (new.thoi_diem at time zone 'Asia/Ho_Chi_Minh')::date;
  return new;
end $$;
drop trigger if exists nhap_hang_dong_don on public.nhap_hang;
create trigger nhap_hang_dong_don after insert on public.nhap_hang
  for each row execute function public.tg_nhap_hang_dong_don();

-- Định mức theo công thức
create table if not exists public.cong_thuc (
  id           bigint generated always as identity primary key,
  mon          text not null,        -- tên món bán (khớp với Bán hàng)
  nguyen_lieu  text not null,        -- tên nguyên liệu trong công thức (khớp với Quy đổi)
  so_luong     numeric not null,     -- lượng cho 1 ly/phần
  don_vi       text
);
create table if not exists public.quy_doi (
  nguyen_lieu  text primary key,
  mat_hang_id  bigint references public.mat_hang(id) on delete set null,
  he_so        numeric,              -- 1 đơn vị công thức = bao nhiêu đơn vị kho (vd 1/2000)
  ghi_chu      text
);
create table if not exists public.ban_hang (
  id        bigint generated always as identity primary key,
  mon       text not null,
  so_luong  numeric not null,
  tu_ngay   date not null,
  den_ngay  date not null
);

-- Lượng dùng thực tế học từ các lần kiểm kho
create or replace view public.v_dung_thuc_te with (security_invoker = true) as
with k as (
  select mat_hang_id, so_luong, thoi_diem,
         lead(so_luong)  over w as sl_sau,
         lead(thoi_diem) over w as td_sau
  from public.kiem_kho
  where thoi_diem >= now() - make_interval(days => public.cau_hinh_lay('so_ngay_hoc','35')::int)
  window w as (partition by mat_hang_id order by thoi_diem)
), doan as (
  select k.mat_hang_id,
         extract(epoch from (k.td_sau - k.thoi_diem)) / 86400.0 as so_ngay,
         k.so_luong
           + coalesce((select sum(n.so_luong) from public.nhap_hang n
                        where n.mat_hang_id = k.mat_hang_id
                          and n.thoi_diem > k.thoi_diem and n.thoi_diem <= k.td_sau), 0)
           - k.sl_sau as da_dung
  from k where k.td_sau is not null
)
select mat_hang_id,
       round(sum(so_ngay)::numeric, 1) as so_ngay,
       sum(da_dung)                    as da_dung,
       case when sum(so_ngay) >= public.cau_hinh_lay('ngay_hoc_toi_thieu','5')::numeric
            then greatest(sum(da_dung), 0) / nullif(sum(so_ngay), 0) end as dung_ngay
from doan
group by mat_hang_id;

-- Bảng đề xuất đặt hàng (thay cho 3 tab "Đặt hàng - …")
create or replace view public.v_de_xuat_dat_hang with (security_invoker = true) as
with base as (
  select m.id, m.ma, m.ten, m.loai, m.muc, m.don_vi, m.ncc_id, m.don_gia,
         m.sl_dung_thang, m.sl_dung_ngay, m.ngay_giao, m.chu_ky_dat, m.ton_an_toan,
         coalesce(nullif(m.boi_so, 0), 1) as boi_so, m.thu_tu, m.ghi_chu,
         n.ten as ten_ncc, n.zalo as zalo_ncc, n.sdt as sdt_ncc,
         kk.so_luong  as ton_dem,
         kk.thoi_diem as lan_dem,
         tt.dung_ngay as dung_ngay_thuc_te,
         case when tt.dung_ngay is not null then 'Thực tế'
              when coalesce(m.sl_dung_thang,0) > 0 then 'Danh mục (tháng)'
              when coalesce(m.sl_dung_ngay,0)  > 0 then 'Danh mục (ngày)' end as nguon_dung,
         coalesce(tt.dung_ngay, nullif(m.sl_dung_thang,0) / 30.0, nullif(m.sl_dung_ngay,0))
           * public.cau_hinh_lay('he_so_mua_vu','1')::numeric as dung_ngay,
         coalesce((select sum(nh.so_luong) from public.nhap_hang nh
                    where nh.mat_hang_id = m.id and nh.thoi_diem > kk.thoi_diem), 0) as nhap_sau_dem,
         coalesce((select sum(d.so_luong) from public.dat_hang d
                    where d.mat_hang_id = m.id and d.trang_thai = 'dang_ve'), 0) as dang_ve,
         extract(epoch from (now() - kk.thoi_diem)) / 86400.0 as ngay_tu_dem,
         case m.muc when 'trai_cay' then 1 else 7 end as chu_ky_kiem
  from public.mat_hang m
  left join public.nha_cung_cap n on n.id = m.ncc_id
  left join lateral (select k.so_luong, k.thoi_diem from public.kiem_kho k
                      where k.mat_hang_id = m.id order by k.thoi_diem desc limit 1) kk on true
  left join public.v_dung_thuc_te tt on tt.mat_hang_id = m.id
  where m.dang_dung
), tinh as (
  select b.*,
         case when b.ton_dem is null then null
              else greatest(0, b.ton_dem + b.nhap_sau_dem - coalesce(b.dung_ngay,0) * b.ngay_tu_dem) end as ton_uoc_tinh,
         b.dung_ngay * (b.ngay_giao + b.ton_an_toan)                as diem_dat,
         b.dung_ngay * (b.ngay_giao + b.chu_ky_dat + b.ton_an_toan) as ton_toi_da
  from base b
), tt as (
  select t.*,
         t.ton_uoc_tinh + t.dang_ve as co_san,
         case when t.ton_dem is null                    then 'Chưa kiểm kho'
              when coalesce(t.dung_ngay,0) = 0          then 'Chưa có lượng dùng'
              when t.ton_uoc_tinh + t.dang_ve < t.dung_ngay * t.ngay_giao then 'KHẨN'
              when t.ton_uoc_tinh + t.dang_ve <= t.diem_dat              then 'ĐẶT NGAY'
              when t.ton_uoc_tinh + t.dang_ve - t.dung_ngay * t.chu_ky_kiem <= t.diem_dat then 'Sắp tới ngưỡng'
              else 'Đủ hàng' end as trang_thai
  from tinh t
)
select tt.*,
       case tt.trang_thai when 'KHẨN' then 1 when 'ĐẶT NGAY' then 2 when 'Sắp tới ngưỡng' then 3
                          when 'Chưa kiểm kho' then 4 when 'Chưa có lượng dùng' then 5 else 6 end as muc_do,
       case when tt.dung_ngay > 0 and tt.ton_dem is not null
            then ceil(greatest(0, tt.ton_toi_da - tt.co_san) / tt.boi_so) * tt.boi_so end as goi_y_dat,
       case when tt.dung_ngay > 0 and tt.ton_dem is not null
            then public.hom_nay() + greatest(0, floor((tt.co_san - tt.diem_dat) / tt.dung_ngay))::int end as ngay_dat_cham_nhat,
       case when tt.dung_ngay > 0 and tt.ton_dem is not null
            then round(tt.co_san / tt.dung_ngay, 1) end as du_dung_ngay
from tt;

-- Định mức: lượng dùng/tháng theo công thức so với Danh mục và thực tế
create or replace view public.v_dinh_muc with (security_invoker = true) as
with ky as (
  select b.mon, sum(b.so_luong) as so_ly,
         sum(b.so_luong) / greatest(1, max(b.den_ngay) - min(b.tu_ngay) + 1) * 30 as ly_thang
  from public.ban_hang b group by b.mon
), dung as (
  select q.mat_hang_id, sum(ky.ly_thang * c.so_luong * q.he_so) as dung_thang_cong_thuc
  from ky
  join public.cong_thuc c on c.mon = ky.mon
  join public.quy_doi q on q.nguyen_lieu = c.nguyen_lieu
  where q.mat_hang_id is not null and q.he_so is not null
  group by q.mat_hang_id
)
select m.id, m.ma, m.ten, m.don_vi, m.muc,
       round(d.dung_thang_cong_thuc, 2)      as dung_thang_cong_thuc,
       m.sl_dung_thang                        as dung_thang_danh_muc,
       round(t.dung_ngay * 30, 2)             as dung_thang_thuc_te
from public.mat_hang m
left join dung d on d.mat_hang_id = m.id
left join public.v_dung_thuc_te t on t.mat_hang_id = m.id
where m.dang_dung;

create or replace view public.v_dinh_muc_thieu with (security_invoker = true) as
select distinct 'Món chưa có công thức' as van_de, b.mon as ten
  from public.ban_hang b
 where not exists (select 1 from public.cong_thuc c where c.mon = b.mon)
union
select distinct 'Nguyên liệu chưa có quy đổi', c.nguyen_lieu
  from public.cong_thuc c
  left join public.quy_doi q on q.nguyen_lieu = c.nguyen_lieu
 where q.nguyen_lieu is null or q.he_so is null or q.mat_hang_id is null;

-- ---------------------------------------------------------------------
-- 3. MEDIA SG · THIẾT BỊ
-- ---------------------------------------------------------------------

create table if not exists public.loai_thiet_bi (
  ma_goc            text primary key,          -- EQ001 … EQ051
  ten               text not null,
  nhom_loai         text,                      -- Máy ảnh, Lens, Đèn, Mic…
  sl_chuan          int not null default 0,
  chuyen_hn_truoc   int not null default 0,    -- đã chuyển HN trước khi có hệ thống
  ghi_chu           text
);

create table if not exists public.thiet_bi (
  ma               text primary key,           -- EQ013-02
  ma_goc           text references public.loai_thiet_bi(ma_goc) on update cascade,
  ten              text not null,
  serial           text,
  gia_tri          numeric,
  trang_thai       text not null default 'Trong kho' check (trang_thai in
                   ('Trong kho','Đang mượn','Cần kiểm tra','Cần sửa chữa','Đã chuyển HN','Đã chuyển ĐN')),
  nguoi_giu_id     uuid references public.nhan_vien(id) on delete set null,
  nguoi_giu_ten    text,
  email_nguoi_giu  text,
  ngay_muon        timestamptz,
  han_tra          date,
  muon_gd_id       bigint,                     -- lượt mượn hiện tại (giao_dich.id)
  ghi_chu          text,
  cap_nhat_luc     timestamptz not null default now()
);
create index if not exists thiet_bi_giu_idx on public.thiet_bi (nguoi_giu_id) where trang_thai = 'Đang mượn';

create table if not exists public.giao_dich (                 -- thay tab "Lịch sử"
  id                  bigint generated always as identity primary key,
  luot_id             uuid not null,
  thoi_diem           timestamptz not null default now(),
  ma_thiet_bi         text not null references public.thiet_bi(ma) on update cascade,
  hanh_dong           text not null check (hanh_dong in ('Mượn','Trả','Chuyển chi nhánh')),
  nguoi_id            uuid references public.nhan_vien(id) on delete set null,   -- người mượn / người đang giữ
  nguoi_ten           text,
  nguoi_email         text,
  thuc_hien_id        uuid references public.nhan_vien(id) on delete set null,   -- người bấm
  han_tra             date,
  tinh_trang          text,                     -- khi trả: Bình thường / Thiếu phụ kiện / Hỏng
  chi_nhanh           text check (chi_nhanh in ('HN','ĐN')),
  nguoi_nhan          text,
  ghi_chu             text,
  canh_bao            text
);
create index if not exists giao_dich_tb_idx on public.giao_dich (ma_thiet_bi, thoi_diem desc);
create index if not exists giao_dich_luot_idx on public.giao_dich (luot_id);

create table if not exists public.vi_pham (
  id            bigint generated always as identity primary key,
  ngay          date not null default public.hom_nay(),
  giao_dich_id  bigint unique references public.giao_dich(id) on delete set null, -- lượt mượn liên quan
  nguoi_id      uuid references public.nhan_vien(id) on delete set null,
  nguoi_ten     text,
  nguoi_email   text,
  ma_thiet_bi   text,
  loai          text not null check (loai in ('Quá hạn','Trả trễ','Trả không có lượt mượn')),
  so_ngay       int,
  lan_thu       int,
  bac           int,
  xu_ly         text,
  ghi_chu       text
);

create table if not exists public.sua_chua (
  id            bigint generated always as identity primary key,
  ma_thiet_bi   text not null references public.thiet_bi(ma) on update cascade,
  ngay_bao      date not null default public.hom_nay(),
  loi           text,
  noi_sua       text,
  chi_phi       numeric,
  tinh_trang    text not null default 'Chờ sửa'
                check (tinh_trang in ('Chờ sửa','Đang sửa','Đã xong','Không sửa được')),
  ngay_xong     date,
  ghi_chu       text
);

-- Tồn kho theo loại (thay tab "Tồn kho")
create or replace view public.v_ton_kho_thiet_bi with (security_invoker = true) as
select l.ma_goc, l.ten, l.nhom_loai, l.sl_chuan,
       l.chuyen_hn_truoc + count(t.ma) filter (where t.trang_thai = 'Đã chuyển HN') as da_chuyen_hn,
       count(t.ma) filter (where t.trang_thai = 'Đã chuyển ĐN')                     as da_chuyen_dn,
       count(t.ma) filter (where t.trang_thai not in ('Đã chuyển HN','Đã chuyển ĐN')) as hien_co_sg,
       count(t.ma) filter (where t.trang_thai = 'Đang mượn')                         as dang_muon,
       count(t.ma) filter (where t.trang_thai in ('Cần kiểm tra','Cần sửa chữa'))    as can_kiem_sua,
       count(t.ma) filter (where t.trang_thai = 'Trong kho')                         as con_muon_duoc,
       greatest(0, l.sl_chuan
                 - (l.chuyen_hn_truoc + count(t.ma) filter (where t.trang_thai = 'Đã chuyển HN'))
                 - count(t.ma) filter (where t.trang_thai = 'Đã chuyển ĐN')
                 - count(t.ma) filter (where t.trang_thai not in ('Đã chuyển HN','Đã chuyển ĐN'))) as chua_ro,
       l.ghi_chu,
       l.chuyen_hn_truoc
from public.loai_thiet_bi l
left join public.thiet_bi t on t.ma_goc = l.ma_goc
group by l.ma_goc;

-- Khi đổi trạng thái thiết bị: dọn người giữ, mở / đóng phiếu sửa chữa
create or replace function public.tg_thiet_bi_truoc() returns trigger
language plpgsql as $$
begin
  new.ma := upper(trim(new.ma));
  new.cap_nhat_luc := now();
  if new.trang_thai not in ('Đang mượn') then
    new.nguoi_giu_id := null; new.nguoi_giu_ten := null; new.email_nguoi_giu := null;
    new.ngay_muon := null; new.han_tra := null; new.muon_gd_id := null;
  end if;
  return new;
end $$;
drop trigger if exists thiet_bi_truoc on public.thiet_bi;
create trigger thiet_bi_truoc before insert or update on public.thiet_bi
  for each row execute function public.tg_thiet_bi_truoc();

create or replace function public.tg_thiet_bi_sau() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.trang_thai = 'Cần sửa chữa'
     and (tg_op = 'INSERT' or old.trang_thai is distinct from 'Cần sửa chữa')
     and not exists (select 1 from sua_chua where ma_thiet_bi = new.ma and tinh_trang in ('Chờ sửa','Đang sửa')) then
    insert into sua_chua (ma_thiet_bi, loi) values (new.ma, new.ghi_chu);
  end if;
  if tg_op = 'UPDATE' and old.trang_thai = 'Cần sửa chữa' and new.trang_thai = 'Trong kho' then
    update sua_chua set tinh_trang = 'Đã xong', ngay_xong = coalesce(ngay_xong, hom_nay())
     where ma_thiet_bi = new.ma and tinh_trang in ('Chờ sửa','Đang sửa');
  end if;
  return null;
end $$;
drop trigger if exists thiet_bi_sau on public.thiet_bi;
create trigger thiet_bi_sau after insert or update of trang_thai on public.thiet_bi
  for each row execute function public.tg_thiet_bi_sau();

-- Phiếu sửa chữa "Đã xong" thì ghi ngày xong và đưa thiết bị về kho
create or replace function public.tg_sua_chua_ngay_xong() returns trigger
language plpgsql as $$
begin
  if new.tinh_trang = 'Đã xong' and old.tinh_trang is distinct from 'Đã xong' then
    new.ngay_xong := coalesce(new.ngay_xong, hom_nay());
  end if;
  return new;
end $$;
drop trigger if exists sua_chua_ngay_xong on public.sua_chua;
create trigger sua_chua_ngay_xong before update on public.sua_chua
  for each row execute function public.tg_sua_chua_ngay_xong();

create or replace function public.tg_sua_chua_xong() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.tinh_trang = 'Đã xong' and old.tinh_trang is distinct from 'Đã xong' then
    update thiet_bi set trang_thai = 'Trong kho'
     where ma = new.ma_thiet_bi and trang_thai = 'Cần sửa chữa';
  end if;
  return null;
end $$;
drop trigger if exists sua_chua_xong on public.sua_chua;
create trigger sua_chua_xong after update on public.sua_chua
  for each row execute function public.tg_sua_chua_xong();

-- Bậc xử lý vi phạm (thay LEVELS trong NangCap.gs — không phạt tiền)
create or replace function public.xu_ly_theo_bac(p_bac int) returns text
language sql immutable as $$
  select case
    when p_bac is null then null
    when p_bac <= 1 then 'Bậc 1 · Nhắc nhở'
    when p_bac = 2  then 'Bậc 2 · Tạm mất quyền tự mượn'
    else                 'Bậc 3 · Báo cáo cấp trên, xử lý theo nội quy' end
$$;

-- Tính lần thứ / bậc cho một vi phạm vừa ghi, áp dụng tạm khoá nếu bậc 2+
create or replace function public.ap_dung_bac(p_vi_pham_id bigint) returns void
language plpgsql security definer set search_path = public as $$
declare v vi_pham; v_lan int; v_bac int;
begin
  select * into v from vi_pham where id = p_vi_pham_id;
  if v.loai = 'Trả không có lượt mượn' then
    update vi_pham set xu_ly = 'Ghi nhận, không tính bậc' where id = v.id;
    return;
  end if;
  select count(*) into v_lan from vi_pham x
   where x.loai in ('Quá hạn','Trả trễ')
     and x.ngay >= hom_nay() - cau_hinh_lay('so_ngay_tinh_vi_pham','90')::int
     and ((v.nguoi_id is not null and x.nguoi_id = v.nguoi_id)
          or (v.nguoi_id is null and lower(x.nguoi_email) = lower(v.nguoi_email)));
  v_bac := least(greatest(v_lan, 1), 3);
  update vi_pham set lan_thu = v_lan, bac = v_bac, xu_ly = xu_ly_theo_bac(v_bac) where id = v.id;
  if v_bac >= 2 and v.nguoi_id is not null and cau_hinh_lay('tu_dong_khoa_muon','co') = 'co' then
    update nhan_vien
       set khoa_muon_den = greatest(coalesce(khoa_muon_den, hom_nay()),
                                    hom_nay() + cau_hinh_lay('so_ngay_khoa_muon','14')::int)
     where id = v.nguoi_id;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 4. THAO TÁC MƯỢN / TRẢ / CHUYỂN (app gọi các hàm này)
-- ---------------------------------------------------------------------

create or replace function public.chuan_hoa_ma(p_ma text[]) returns text[]
language sql immutable as $$
  select coalesce(array_agg(distinct m order by m), '{}')
    from (select upper(trim(x)) as m from unnest(p_ma) x) s where m <> ''
$$;

create or replace function public.muon_thiet_bi(
  p_ma text[], p_han_tra date, p_ghi_chu text default null, p_nguoi_muon uuid default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_ma      text[] := chuan_hoa_ma(p_ma);
  v_nguoi   uuid   := coalesce(p_nguoi_muon, auth.uid());
  v_nv      nhan_vien;
  v_tb      thiet_bi;
  v_luot    uuid   := gen_random_uuid();
  v_cb      text;
  v_gd      bigint;
  v_ket     jsonb  := '[]'::jsonb;
  m         text;
begin
  if not thuoc_nhom('media') then raise exception 'Bạn chưa được cấp quyền dùng phần thiết bị'; end if;
  if v_nguoi is distinct from auth.uid() and not la_quan_ly() then
    raise exception 'Chỉ quản lý mới mượn hộ người khác được';
  end if;
  select * into v_nv from nhan_vien where id = v_nguoi and dang_lam;
  if not found then raise exception 'Không tìm thấy nhân viên mượn'; end if;
  if v_nv.khoa_muon_den >= hom_nay() and not la_quan_ly() then
    raise exception 'Bạn đang tạm mất quyền tự mượn đến %. Nhờ quản lý mượn hộ.', to_char(v_nv.khoa_muon_den, 'DD/MM/YYYY');
  end if;
  if p_han_tra is null or p_han_tra < hom_nay() then raise exception 'Hạn trả phải từ hôm nay trở đi'; end if;
  if cardinality(v_ma) = 0 then raise exception 'Chưa có mã thiết bị nào'; end if;

  foreach m in array v_ma loop
    select * into v_tb from thiet_bi where ma = m for update;
    if not found then raise exception 'Không có thiết bị mã %', m; end if;
    if v_tb.trang_thai not in ('Trong kho','Đang mượn','Cần kiểm tra') then
      raise exception '% đang ở trạng thái "%", không mượn được', m, v_tb.trang_thai;
    end if;
  end loop;

  foreach m in array v_ma loop
    select * into v_tb from thiet_bi where ma = m;
    v_cb := case
      when v_tb.trang_thai = 'Đang mượn' and v_tb.nguoi_giu_id = v_nguoi then 'Bạn đang giữ món này, đã gia hạn'
      when v_tb.trang_thai = 'Đang mượn' then 'Trước đó ' || coalesce(v_tb.nguoi_giu_ten, 'người khác') || ' đang giữ, đã chuyển sang người mới'
      when v_tb.trang_thai = 'Cần kiểm tra' then 'Món này đang chờ kiểm tra, kiểm lại trước khi dùng'
    end;
    insert into giao_dich (luot_id, ma_thiet_bi, hanh_dong, nguoi_id, nguoi_ten, nguoi_email,
                           thuc_hien_id, han_tra, ghi_chu, canh_bao)
    values (v_luot, m, 'Mượn', v_nguoi, v_nv.ho_ten, v_nv.email, auth.uid(), p_han_tra, p_ghi_chu, v_cb)
    returning id into v_gd;
    update thiet_bi set trang_thai = 'Đang mượn', nguoi_giu_id = v_nguoi, nguoi_giu_ten = v_nv.ho_ten,
                        email_nguoi_giu = v_nv.email, ngay_muon = now(), han_tra = p_han_tra, muon_gd_id = v_gd
     where ma = m;
    v_ket := v_ket || jsonb_build_object('ma', m, 'ten', v_tb.ten, 'canh_bao', v_cb);
  end loop;

  return jsonb_build_object('luot_id', v_luot, 'hanh_dong', 'Mượn', 'nguoi', v_nv.ho_ten,
                            'email', v_nv.email, 'han_tra', p_han_tra, 'thiet_bi', v_ket);
end $$;

create or replace function public.tra_thiet_bi(
  p_ma text[], p_tinh_trang text default 'Bình thường', p_ghi_chu text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_ma    text[] := chuan_hoa_ma(p_ma);
  v_tt    text   := coalesce(nullif(p_tinh_trang,''), 'Bình thường');
  v_me    nhan_vien;
  v_tb    thiet_bi;
  v_luot  uuid   := gen_random_uuid();
  v_cb    text;
  v_tre   int;
  v_vp    bigint;
  v_gd    bigint;
  v_ket   jsonb  := '[]'::jsonb;
  v_nguoi_ten text; v_nguoi_email text; v_nguoi_id uuid;
  m       text;
begin
  if not thuoc_nhom('media') then raise exception 'Bạn chưa được cấp quyền dùng phần thiết bị'; end if;
  if v_tt not in ('Bình thường','Thiếu phụ kiện','Hỏng') then raise exception 'Tình trạng không hợp lệ'; end if;
  if cardinality(v_ma) = 0 then raise exception 'Chưa có mã thiết bị nào'; end if;
  select * into v_me from nhan_vien where id = auth.uid();

  foreach m in array v_ma loop
    select * into v_tb from thiet_bi where ma = m for update;
    if not found then raise exception 'Không có thiết bị mã %', m; end if;
    if v_tb.trang_thai in ('Cần sửa chữa','Đã chuyển HN','Đã chuyển ĐN') then
      raise exception '% đang ở trạng thái "%". Nhờ quản lý cập nhật trạng thái trước.', m, v_tb.trang_thai;
    end if;
  end loop;

  foreach m in array v_ma loop
    select * into v_tb from thiet_bi where ma = m;
    v_cb := null; v_tre := null;
    if v_tb.trang_thai = 'Đang mượn' then
      v_nguoi_id := v_tb.nguoi_giu_id; v_nguoi_ten := v_tb.nguoi_giu_ten; v_nguoi_email := v_tb.email_nguoi_giu;
      if v_tb.han_tra < hom_nay() then
        v_tre := hom_nay() - v_tb.han_tra;
        v_cb := 'Trả trễ ' || v_tre || ' ngày';
      end if;
      if v_tb.nguoi_giu_id is distinct from auth.uid() then
        v_cb := concat_ws(' · ', v_cb, 'Trả hộ ' || coalesce(v_tb.nguoi_giu_ten, 'người mượn'));
      end if;
    else
      v_nguoi_id := auth.uid(); v_nguoi_ten := v_me.ho_ten; v_nguoi_email := v_me.email;
      v_cb := 'Không có lượt mượn trước đó';
    end if;
    if v_tt <> 'Bình thường' then v_cb := concat_ws(' · ', v_cb, 'Báo ' || lower(v_tt)); end if;

    insert into giao_dich (luot_id, ma_thiet_bi, hanh_dong, nguoi_id, nguoi_ten, nguoi_email,
                           thuc_hien_id, tinh_trang, ghi_chu, canh_bao)
    values (v_luot, m, 'Trả', v_nguoi_id, v_nguoi_ten, v_nguoi_email, auth.uid(), v_tt, p_ghi_chu, v_cb)
    returning id into v_gd;

    -- Vi phạm
    if v_tre is not null then
      if v_tb.muon_gd_id is not null and exists (select 1 from vi_pham where giao_dich_id = v_tb.muon_gd_id) then
        update vi_pham set so_ngay = v_tre,
               ghi_chu = concat_ws(' · ', ghi_chu, 'Đã trả ' || to_char(hom_nay(), 'DD/MM'))
         where giao_dich_id = v_tb.muon_gd_id;
      else
        insert into vi_pham (giao_dich_id, nguoi_id, nguoi_ten, nguoi_email, ma_thiet_bi, loai, so_ngay)
        values (v_tb.muon_gd_id, v_nguoi_id, v_nguoi_ten, v_nguoi_email, m, 'Trả trễ', v_tre)
        returning id into v_vp;
        perform ap_dung_bac(v_vp);
      end if;
    elsif v_tb.trang_thai <> 'Đang mượn' then
      insert into vi_pham (nguoi_id, nguoi_ten, nguoi_email, ma_thiet_bi, loai)
      values (v_nguoi_id, v_nguoi_ten, v_nguoi_email, m, 'Trả không có lượt mượn')
      returning id into v_vp;
      perform ap_dung_bac(v_vp);
    end if;

    update thiet_bi
       set trang_thai = case when v_tt = 'Bình thường' then 'Trong kho' else 'Cần kiểm tra' end,
           ghi_chu = case when v_tt = 'Bình thường' then ghi_chu
                          else concat_ws(' | ', ghi_chu, to_char(hom_nay(),'DD/MM') || ' trả báo ' || lower(v_tt)
                                         || coalesce(': ' || nullif(p_ghi_chu,''), '')) end
     where ma = m;
    v_ket := v_ket || jsonb_build_object('ma', m, 'ten', v_tb.ten, 'canh_bao', v_cb,
                                         'nguoi_giu', v_nguoi_ten, 'email_nguoi_giu', v_nguoi_email);
  end loop;

  return jsonb_build_object('luot_id', v_luot, 'hanh_dong', 'Trả', 'nguoi', v_me.ho_ten,
                            'email', v_me.email, 'tinh_trang', v_tt, 'thiet_bi', v_ket);
end $$;

create or replace function public.chuyen_chi_nhanh(
  p_ma text[], p_chi_nhanh text, p_nguoi_nhan text, p_ghi_chu text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_ma    text[] := chuan_hoa_ma(p_ma);
  v_me    nhan_vien;
  v_tb    thiet_bi;
  v_luot  uuid   := gen_random_uuid();
  v_cb    text;
  v_ket   jsonb  := '[]'::jsonb;
  v_tt    text;
  m       text;
begin
  if not thuoc_nhom('media') then raise exception 'Bạn chưa được cấp quyền dùng phần thiết bị'; end if;
  if p_chi_nhanh not in ('HN','ĐN') then raise exception 'Chọn chi nhánh Hà Nội hoặc Đà Nẵng'; end if;
  if coalesce(trim(p_nguoi_nhan),'') = '' then raise exception 'Cần ghi tên người nhận'; end if;
  if cardinality(v_ma) = 0 then raise exception 'Chưa có mã thiết bị nào'; end if;
  select * into v_me from nhan_vien where id = auth.uid();
  v_tt := case p_chi_nhanh when 'HN' then 'Đã chuyển HN' else 'Đã chuyển ĐN' end;

  foreach m in array v_ma loop
    select * into v_tb from thiet_bi where ma = m for update;
    if not found then raise exception 'Không có thiết bị mã %', m; end if;
    if v_tb.trang_thai in ('Đã chuyển HN','Đã chuyển ĐN') then
      raise exception '% đã ở trạng thái "%"', m, v_tb.trang_thai;
    end if;
  end loop;

  foreach m in array v_ma loop
    select * into v_tb from thiet_bi where ma = m;
    v_cb := case when v_tb.trang_thai = 'Đang mượn' then 'Đang được ' || coalesce(v_tb.nguoi_giu_ten,'người khác') || ' giữ'
                 when v_tb.trang_thai in ('Cần kiểm tra','Cần sửa chữa') then 'Trạng thái trước đó: ' || v_tb.trang_thai end;
    insert into giao_dich (luot_id, ma_thiet_bi, hanh_dong, nguoi_id, nguoi_ten, nguoi_email,
                           thuc_hien_id, chi_nhanh, nguoi_nhan, ghi_chu, canh_bao)
    values (v_luot, m, 'Chuyển chi nhánh', auth.uid(), v_me.ho_ten, v_me.email, auth.uid(),
            p_chi_nhanh, trim(p_nguoi_nhan), p_ghi_chu, v_cb);
    update thiet_bi
       set trang_thai = v_tt,
           ghi_chu = concat_ws(' | ', ghi_chu, 'Chuyển ' || p_chi_nhanh || ' ' || to_char(hom_nay(),'DD/MM/YYYY')
                               || ', người nhận ' || trim(p_nguoi_nhan))
     where ma = m;
    v_ket := v_ket || jsonb_build_object('ma', m, 'ten', v_tb.ten, 'canh_bao', v_cb);
  end loop;

  return jsonb_build_object('luot_id', v_luot, 'hanh_dong', 'Chuyển chi nhánh', 'nguoi', v_me.ho_ten,
                            'email', v_me.email, 'chi_nhanh', p_chi_nhanh, 'nguoi_nhan', trim(p_nguoi_nhan),
                            'thiet_bi', v_ket);
end $$;

-- Chạy mỗi sáng (lịch tự động gọi). Ghi / cập nhật vi phạm quá hạn, trả về danh sách để gửi email.
create or replace function public.kiem_tra_qua_han()
returns table (ma text, ten text, nguoi_giu_ten text, email_nguoi_giu text, han_tra date,
               so_ngay int, bac int, xu_ly text, moi boolean)
language plpgsql security definer set search_path = public as $$
declare r record; v_id bigint; v_moi boolean;
begin
  for r in select t.* from thiet_bi t
            where t.trang_thai = 'Đang mượn' and t.han_tra < hom_nay() order by t.han_tra loop
    v_moi := false;
    select id into v_id from vi_pham where giao_dich_id = r.muon_gd_id and r.muon_gd_id is not null;
    if v_id is null then
      insert into vi_pham (giao_dich_id, nguoi_id, nguoi_ten, nguoi_email, ma_thiet_bi, loai, so_ngay)
      values (r.muon_gd_id, r.nguoi_giu_id, r.nguoi_giu_ten, r.email_nguoi_giu, r.ma, 'Quá hạn', hom_nay() - r.han_tra)
      returning id into v_id;
      perform ap_dung_bac(v_id);
      v_moi := true;
    else
      update vi_pham set so_ngay = hom_nay() - r.han_tra where id = v_id;
    end if;
    return query select r.ma, r.ten, r.nguoi_giu_ten, r.email_nguoi_giu, r.han_tra,
                        (hom_nay() - r.han_tra)::int, v.bac, v.xu_ly, v_moi
                   from vi_pham v where v.id = v_id;
    v_id := null;
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 5. PHÂN QUYỀN (Row Level Security)
-- ---------------------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array['nhan_vien','cau_hinh','nha_cung_cap','mat_hang','kiem_kho','nhap_hang','dat_hang',
                           'cong_thuc','quy_doi','ban_hang','loai_thiet_bi','thiet_bi','giao_dich','vi_pham','sua_chua'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('drop policy if exists "doc" on public.%I', t);
    execute format('drop policy if exists "them" on public.%I', t);
    execute format('drop policy if exists "sua" on public.%I', t);
    execute format('drop policy if exists "xoa" on public.%I', t);
  end loop;
end $$;

-- Nhân viên: tự xem mình; quản lý xem và sửa tất cả
create policy "doc"  on public.nhan_vien for select to authenticated using (id = auth.uid() or la_quan_ly());
create policy "them" on public.nhan_vien for insert to authenticated with check (la_quan_ly());
create policy "sua"  on public.nhan_vien for update to authenticated using (la_quan_ly()) with check (la_quan_ly());
create policy "xoa"  on public.nhan_vien for delete to authenticated using (la_quan_ly());

-- Cấu hình: ai đăng nhập cũng đọc được; quản lý sửa
create policy "doc"  on public.cau_hinh for select to authenticated using (true);
create policy "them" on public.cau_hinh for insert to authenticated with check (la_quan_ly());
create policy "sua"  on public.cau_hinh for update to authenticated using (la_quan_ly()) with check (la_quan_ly());
create policy "xoa"  on public.cau_hinh for delete to authenticated using (la_quan_ly());

-- Danh mục Inn: nhóm Inn đọc; quản lý sửa
do $$
declare t text;
begin
  foreach t in array array['nha_cung_cap','mat_hang','dat_hang','cong_thuc','quy_doi','ban_hang'] loop
    execute format($p$create policy "doc"  on public.%I for select to authenticated using (thuoc_nhom('inn'))$p$, t);
    execute format($p$create policy "them" on public.%I for insert to authenticated with check (la_quan_ly())$p$, t);
    execute format($p$create policy "sua"  on public.%I for update to authenticated using (la_quan_ly()) with check (la_quan_ly())$p$, t);
    execute format($p$create policy "xoa"  on public.%I for delete to authenticated using (la_quan_ly())$p$, t);
  end loop;
  -- Kiểm kho, nhập hàng: nhân viên nhóm Inn tự ghi dưới tên mình
  foreach t in array array['kiem_kho','nhap_hang'] loop
    execute format($p$create policy "doc"  on public.%I for select to authenticated using (thuoc_nhom('inn'))$p$, t);
    execute format($p$create policy "them" on public.%I for insert to authenticated with check (thuoc_nhom('inn') and nguoi_id = auth.uid())$p$, t);
    execute format($p$create policy "sua"  on public.%I for update to authenticated using (la_quan_ly()) with check (la_quan_ly())$p$, t);
    execute format($p$create policy "xoa"  on public.%I for delete to authenticated using (la_quan_ly())$p$, t);
  end loop;
  -- Thiết bị: nhóm Media đọc; quản lý sửa trực tiếp (nhân viên thao tác qua hàm mượn/trả/chuyển)
  foreach t in array array['loai_thiet_bi','thiet_bi','sua_chua','giao_dich'] loop
    execute format($p$create policy "doc"  on public.%I for select to authenticated using (thuoc_nhom('media'))$p$, t);
    execute format($p$create policy "them" on public.%I for insert to authenticated with check (la_quan_ly())$p$, t);
    execute format($p$create policy "sua"  on public.%I for update to authenticated using (la_quan_ly()) with check (la_quan_ly())$p$, t);
    execute format($p$create policy "xoa"  on public.%I for delete to authenticated using (la_quan_ly())$p$, t);
  end loop;
end $$;

-- Vi phạm: người vi phạm xem của mình; quản lý xem và sửa tất cả
create policy "doc"  on public.vi_pham for select to authenticated using (nguoi_id = auth.uid() or la_quan_ly());
create policy "them" on public.vi_pham for insert to authenticated with check (la_quan_ly());
create policy "sua"  on public.vi_pham for update to authenticated using (la_quan_ly()) with check (la_quan_ly());
create policy "xoa"  on public.vi_pham for delete to authenticated using (la_quan_ly());

-- Views
revoke all on public.v_dung_thuc_te, public.v_de_xuat_dat_hang, public.v_dinh_muc,
              public.v_dinh_muc_thieu, public.v_ton_kho_thiet_bi from anon;
grant select on public.v_dung_thuc_te, public.v_de_xuat_dat_hang, public.v_dinh_muc,
               public.v_dinh_muc_thieu, public.v_ton_kho_thiet_bi to authenticated;

-- Hàm: chỉ người đăng nhập gọi được các thao tác; hàm chạy theo lịch chỉ server gọi
revoke execute on all functions in schema public from public, anon;
grant execute on function public.hom_nay(), public.cau_hinh_lay(text,text), public.la_quan_ly(),
                          public.thuoc_nhom(text), public.chuan_hoa_ma(text[]), public.xu_ly_theo_bac(int),
                          public.muon_thiet_bi(text[],date,text,uuid), public.tra_thiet_bi(text[],text,text),
                          public.chuyen_chi_nhanh(text[],text,text,text)
      to authenticated;
grant execute on all functions in schema public to service_role;
