-- =====================================================================
-- LUK SG · Lịch chạy tự động (thay cho trigger theo giờ của Apps Script)
-- Chạy file này SAU KHI app đã lên Vercel và đã có CRON_SECRET.
-- Sửa 2 giá trị ở bước 2 rồi Run. Chạy lại để đổi link / mã bí mật.
-- =====================================================================

-- 1. Bật 2 tiện ích của Supabase: pg_cron (hẹn giờ) và pg_net (gọi web)
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- 2. Nơi cất link app và mã bí mật (schema riêng, app và nhân viên không đọc được)
create schema if not exists rieng;
revoke all on schema rieng from public;
create table if not exists rieng.bi_mat (khoa text primary key, gia_tri text not null);

insert into rieng.bi_mat (khoa, gia_tri) values
  ('app_url',     'https://app.luk.vn'),          -- ← link app trên Vercel, không có dấu / ở cuối
  ('cron_secret', 'DAN_CRON_SECRET_VAO_DAY')      -- ← đúng giá trị CRON_SECRET đã khai báo trên Vercel
on conflict (khoa) do update set gia_tri = excluded.gia_tri;

-- 3. Hàm gọi sang app
create or replace function rieng.goi_app(p_viec text) returns bigint
language plpgsql security definer set search_path = rieng, public as $$
declare v_url text; v_secret text;
begin
  select gia_tri into v_url    from rieng.bi_mat where khoa = 'app_url';
  select gia_tri into v_secret from rieng.bi_mat where khoa = 'cron_secret';
  return net.http_post(
    url                  := rtrim(v_url, '/') || '/api/cron/' || p_viec,
    body                 := '{}'::jsonb,
    headers              := jsonb_build_object('Authorization', 'Bearer ' || v_secret,
                                               'Content-Type',  'application/json'),
    timeout_milliseconds := 60000);
end $$;
revoke all on function rieng.goi_app(text) from public;

-- 4. Lịch (giờ trong pg_cron là giờ UTC = giờ Việt Nam trừ 7)
do $$
declare j text;
begin
  for j in select jobname from cron.job where jobname like 'luk_%' loop
    perform cron.unschedule(j);
  end loop;
end $$;

select cron.schedule('luk_bao_cao_dat_hang', '0 0 * * *',  $$select rieng.goi_app('bao-cao-dat-hang')$$); -- 07:00 hằng ngày
select cron.schedule('luk_kiem_tra_qua_han', '0 2 * * *',  $$select rieng.goi_app('kiem-tra-qua-han')$$); -- 09:00 hằng ngày
select cron.schedule('luk_nhac_sap_den_han', '0 10 * * *', $$select rieng.goi_app('nhac-sap-den-han')$$); -- 17:00 hằng ngày
select cron.schedule('luk_nhac_kiem_kho',    '0 16 * * *', $$select rieng.goi_app('nhac-kiem-kho')$$);    -- 23:00 hằng ngày
select cron.schedule('luk_bao_cao_tuan',     '0 1 * * 1',  $$select rieng.goi_app('bao-cao-tuan')$$);     -- 08:00 thứ Hai
select cron.schedule('luk_ban_dang_giu',     '0 9 * * 5',  $$select rieng.goi_app('ban-dang-giu')$$);     -- 16:00 thứ Sáu

-- Xem lịch đã cài:            select jobname, schedule from cron.job;
-- Xem lần chạy gần nhất:      select * from cron.job_run_details order by start_time desc limit 20;
-- Xem kết quả gọi sang app:   select id, status_code, content from net._http_response order by created desc limit 20;
