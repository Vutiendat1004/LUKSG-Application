import Link from 'next/link'
import { notFound } from 'next/navigation'
import { canQuanLy } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase/server'
import { ThongBao, type SP } from '@/components/ThongBao'
import { luuMatHang } from '../../actions'

export const dynamic = 'force-dynamic'

const LOAI = [
  { v: 'Fruit', t: 'Trái cây (đếm mỗi ngày)' },
  { v: 'Ingredient', t: 'NVL khô (đếm mỗi tuần)' },
  { v: 'Hygiene', t: 'Vệ sinh (đếm mỗi tuần)' },
  { v: 'Logistic', t: 'Logistic (đếm mỗi tuần)' },
]

export default async function SuaMatHang({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: SP }) {
  await canQuanLy()
  const { id } = await params
  const sp = await searchParams
  const sb = await supabaseServer()
  const moi = id === 'moi'
  const [{ data: x }, { data: ncc }] = await Promise.all([
    moi ? Promise.resolve({ data: null }) : sb.from('mat_hang').select('*').eq('id', Number(id)).maybeSingle(),
    sb.from('nha_cung_cap').select('id, ten').order('ten'),
  ])
  if (!moi && !x) notFound()
  const v = (k: string) => (x && x[k] !== null && x[k] !== undefined ? String(x[k]) : '')

  return (
    <main className="page">
      <Link href="/quan-ly/danh-muc" className="back">‹ Danh mục</Link>
      <h1>{moi ? 'Thêm mặt hàng' : v('ten')}</h1>
      <ThongBao ok={sp.ok} loi={sp.loi} />
      <form action={luuMatHang} className="stack" style={{ marginTop: 16 }}>
        {!moi && <input type="hidden" name="id" value={id} />}
        <div className="grid2">
          <div className="field"><label htmlFor="ma">Mã</label><input id="ma" name="ma" className="input" defaultValue={v('ma')} required /></div>
          <div className="field"><label htmlFor="don_vi">Đơn vị kho</label><input id="don_vi" name="don_vi" className="input" defaultValue={v('don_vi')} placeholder="kg, hộp, bịch (100 cái)…" /></div>
        </div>
        <div className="field"><label htmlFor="ten">Tên</label><input id="ten" name="ten" className="input" defaultValue={v('ten')} required /></div>
        <div className="grid2">
          <div className="field">
            <label htmlFor="loai">Loại</label>
            <select id="loai" name="loai" className="input" defaultValue={v('loai') || 'Ingredient'}>
              {LOAI.map((l) => <option key={l.v} value={l.v}>{l.t}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="ncc_id">Nhà cung cấp</label>
            <select id="ncc_id" name="ncc_id" className="input" defaultValue={v('ncc_id')}>
              <option value="">Chưa có</option>
              {(ncc ?? []).map((n) => <option key={n.id} value={n.id}>{n.ten}</option>)}
            </select>
          </div>
        </div>
        <div className="grid2">
          <div className="field">
            <label htmlFor="sl_dung_thang">Dùng mỗi tháng (ước tính)</label>
            <input id="sl_dung_thang" name="sl_dung_thang" className="input" inputMode="decimal" defaultValue={v('sl_dung_thang')} />
            <span className="hint">Dùng khi chưa đủ số kiểm kho để tự tính.</span>
          </div>
          <div className="field">
            <label htmlFor="sl_dung_ngay">Dùng mỗi ngày</label>
            <input id="sl_dung_ngay" name="sl_dung_ngay" className="input" inputMode="decimal" defaultValue={v('sl_dung_ngay')} />
            <span className="hint">Thường dùng cho trái cây.</span>
          </div>
        </div>
        <div className="grid2">
          <div className="field"><label htmlFor="ngay_giao">Số ngày giao hàng</label><input id="ngay_giao" name="ngay_giao" className="input" inputMode="decimal" defaultValue={v('ngay_giao') || '1'} /></div>
          <div className="field"><label htmlFor="chu_ky_dat">Chu kỳ đặt (ngày)</label><input id="chu_ky_dat" name="chu_ky_dat" className="input" inputMode="decimal" defaultValue={v('chu_ky_dat') || '7'} /></div>
          <div className="field"><label htmlFor="ton_an_toan">Tồn an toàn (ngày)</label><input id="ton_an_toan" name="ton_an_toan" className="input" inputMode="decimal" defaultValue={v('ton_an_toan') || '2'} /></div>
          <div className="field"><label htmlFor="boi_so">Làm tròn theo bội số</label><input id="boi_so" name="boi_so" className="input" inputMode="decimal" defaultValue={v('boi_so') || '1'} /></div>
          <div className="field"><label htmlFor="don_gia">Đơn giá (đ)</label><input id="don_gia" name="don_gia" className="input" inputMode="decimal" defaultValue={v('don_gia')} /></div>
          <div className="field"><label htmlFor="thu_tu">Thứ tự trên form đếm</label><input id="thu_tu" name="thu_tu" className="input" inputMode="numeric" defaultValue={v('thu_tu') || '0'} /></div>
        </div>
        <div className="field"><label htmlFor="ghi_chu">Ghi chú</label><input id="ghi_chu" name="ghi_chu" className="input" defaultValue={v('ghi_chu')} /></div>
        <label className="row"><input type="checkbox" name="dang_dung" defaultChecked={moi || x?.dang_dung} style={{ width: 22, height: 22 }} /> Đang dùng (bỏ tick để ẩn khỏi form đếm và báo cáo)</label>
        <button className="btn inn block">Lưu</button>
      </form>
    </main>
  )
}
