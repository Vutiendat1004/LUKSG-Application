import Link from 'next/link'
import { canQuanLy } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase/server'
import { ThongBao, type SP } from '@/components/ThongBao'
import { luuLoai } from '../actions'

export const dynamic = 'force-dynamic'

export default async function TonKhoTB({ searchParams }: { searchParams: SP }) {
  await canQuanLy()
  const sp = await searchParams
  const sb = await supabaseServer()
  const { data } = await sb.from('v_ton_kho_thiet_bi').select('*').order('ma_goc')
  const ds = data ?? []
  const tong = (k: string) => ds.reduce((s, r) => s + (Number(r[k]) || 0), 0)

  return (
    <main className="page wide">
      <Link href="/quan-ly" className="back">‹ Bảng quản lý</Link>
      <h1>Tồn kho thiết bị</h1>
      <p className="muted" style={{ margin: '6px 0 0' }}>
        Chưa rõ = số chuẩn − đã chuyển HN − đã chuyển ĐN − hiện có ở SG. Sửa số chuẩn, số đã chuyển HN trước khi có hệ thống và ghi chú rồi bấm Lưu ở từng dòng.
      </p>
      <ThongBao ok={sp.ok} loi={sp.loi} />
      <div className="row" style={{ gap: 18, margin: '14px 0' }}>
        <span>Chuẩn <b>{tong('sl_chuan')}</b></span>
        <span>Hiện có SG <b>{tong('hien_co_sg')}</b></span>
        <span>Đã chuyển HN <b>{tong('da_chuyen_hn')}</b></span>
        <span>Đã chuyển ĐN <b>{tong('da_chuyen_dn')}</b></span>
        <span style={{ color: 'var(--khan)' }}>Chưa rõ <b>{tong('chua_ro')}</b></span>
      </div>
      <div className="table-wrap">
        <table className="t">
          <thead>
            <tr>
              <th>Mã gốc</th><th>Loại</th><th className="num">Chuẩn</th><th className="num">HN trước HT</th><th className="num">Đã chuyển HN</th><th className="num">ĐN</th>
              <th className="num">Hiện có SG</th><th className="num">Đang mượn</th><th className="num">Kiểm/sửa</th><th className="num">Còn mượn được</th><th className="num">Chưa rõ</th><th>Ghi chú</th>
            </tr>
          </thead>
          <tbody>
            {ds.map((r) => {
              const f = `f-${r.ma_goc}`
              return (
                <tr key={r.ma_goc} style={r.hien_co_sg > 0 && r.con_muon_duoc === 0 ? { background: 'var(--khan-soft)' } : undefined}>
                  <td className="nowrap">
                    <form id={f} action={luuLoai}>
                      <input type="hidden" name="ma_goc" value={r.ma_goc} />
                      <input type="hidden" name="ten" value={r.ten} />
                      <input type="hidden" name="nhom_loai" value={r.nhom_loai ?? ''} />
                    </form>
                    <Link href={`/quan-ly/thiet-bi?q=${encodeURIComponent(r.ma_goc)}`}>{r.ma_goc}</Link>
                  </td>
                  <td>{r.ten}</td>
                  <td className="num"><input form={f} name="sl_chuan" defaultValue={r.sl_chuan} className="input sm tabnum" style={{ width: 64, textAlign: 'right', background: '#fffbe6' }} aria-label="Số chuẩn" /></td>
                  <td className="num"><input form={f} name="chuyen_hn_truoc" defaultValue={r.chuyen_hn_truoc} className="input sm tabnum" style={{ width: 64, textAlign: 'right', background: '#fffbe6' }} aria-label="Đã chuyển HN trước khi có hệ thống" /></td>
                  <td className="num">{r.da_chuyen_hn}</td>
                  <td className="num">{r.da_chuyen_dn}</td>
                  <td className="num">{r.hien_co_sg}</td>
                  <td className="num">{r.dang_muon}</td>
                  <td className="num">{r.can_kiem_sua}</td>
                  <td className="num"><b>{r.con_muon_duoc}</b></td>
                  <td className="num" style={r.chua_ro ? { color: 'var(--khan)', fontWeight: 600 } : undefined}>{r.chua_ro}</td>
                  <td>
                    <div className="row" style={{ flexWrap: 'nowrap' }}>
                      <input form={f} name="ghi_chu" defaultValue={r.ghi_chu ?? ''} className="input sm" style={{ minWidth: 140 }} aria-label="Ghi chú" />
                      <button form={f} className="btn sm">Lưu</button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </main>
  )
}
