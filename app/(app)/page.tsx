import Link from 'next/link'
import { layNhanVien, coNhom } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase/server'
import { MUC, MUC_KEYS, type MucKey } from '@/lib/muc'
import { homNay, thuHomNay, ngayVN } from '@/lib/ngay'

export const dynamic = 'force-dynamic'

function loiChao() {
  const h = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Ho_Chi_Minh', hour: 'numeric', hour12: false }).format(new Date()))
  if (h < 11) return 'Chào buổi sáng'
  if (h < 14) return 'Chào buổi trưa'
  if (h < 18) return 'Chào buổi chiều'
  return 'Chào buổi tối'
}

export default async function TrangChu() {
  const nv = await layNhanVien()
  const sb = await supabaseServer()
  const inn = coNhom(nv, 'inn')
  const media = coNhom(nv, 'media')
  const ql = nv.vai_tro === 'quan_ly'

  let daDem = new Set<MucKey>()
  let lich: Record<string, string> = {}
  if (inn) {
    const [kk, ch] = await Promise.all([
      sb.from('kiem_kho').select('mat_hang!inner(muc)').gte('thoi_diem', `${homNay()}T00:00:00+07:00`),
      sb.from('cau_hinh').select('khoa, gia_tri').in('khoa', ['thu_kiem_nl', 'thu_kiem_vl']),
    ])
    daDem = new Set((kk.data ?? []).map((r) => (r.mat_hang as unknown as { muc: MucKey }).muc))
    lich = Object.fromEntries((ch.data ?? []).map((r) => [r.khoa, r.gia_tri ?? 'CN']))
  }

  let dangGiu: { han_tra: string }[] = []
  if (media) {
    const { data } = await sb.from('thiet_bi').select('han_tra').eq('trang_thai', 'Đang mượn').eq('nguoi_giu_id', nv.id)
    dangGiu = data ?? []
  }
  const quaHan = dangGiu.filter((d) => d.han_tra < homNay()).length
  const thu = thuHomNay()
  const tenGoi = nv.ho_ten.split(' ').slice(-1)[0]

  return (
    <main className="page">
      <div className="hello">
        <h1>{loiChao()}, {tenGoi}</h1>
        <p className="muted">{thu === 'CN' ? 'Chủ nhật' : `Thứ ${thu.slice(1)}`}, {ngayVN(homNay())}</p>
      </div>

      {nv.khoa_muon_den && nv.khoa_muon_den >= homNay() && (
        <div className="alert warn" style={{ marginTop: 16 }}>
          Bạn đang tạm mất quyền tự mượn thiết bị đến {ngayVN(nv.khoa_muon_den)}. Cần mượn thì nhờ quản lý mượn hộ.
        </div>
      )}

      {inn && (
        <>
          <div className="section-head"><h2>LUK Inn</h2><span className="tag">Kiểm kho</span></div>
          <div className="tiles">
            {MUC_KEYS.map((m) => {
              const k = MUC[m].khoaThu
              const denLich = !k || (lich[k] || 'CN') === thu
              const xong = daDem.has(m)
              return (
                <Link key={m} href={`/kiem-kho/${m}`} className="tile inn">
                  <span className="t">{MUC[m].ten}</span>
                  <span className="d">{MUC[m].lich}{k ? ` · ${lich[k] || 'CN'}` : ''}</span>
                  {xong ? <span className="k done">Đã đếm</span> : denLich ? <span className="k due">Cần đếm hôm nay</span> : null}
                </Link>
              )
            })}
            <Link href="/nhap-hang" className="tile inn">
              <span className="t">Nhập hàng</span>
              <span className="d">Ghi hàng vừa về kho</span>
            </Link>
          </div>
        </>
      )}

      {media && (
        <>
          <div className="section-head"><h2>Media SG</h2><span className="tag">Thiết bị</span></div>
          <div className="tiles">
            <Link href="/thiet-bi" className="tile media">
              <span className="t">Mượn · Trả · Chuyển</span>
              <span className="d">Quét mã QR hoặc gõ mã thiết bị</span>
            </Link>
            <Link href="/cua-toi" className="tile media">
              <span className="t">Đồ tôi đang giữ</span>
              <span className="d">{dangGiu.length ? `${dangGiu.length} thiết bị` : 'Không giữ món nào'}</span>
              {quaHan > 0 ? <span className="k bad">{quaHan} quá hạn</span> : dangGiu.length > 0 ? <span className="k info">{dangGiu.length}</span> : null}
            </Link>
          </div>
        </>
      )}

      {ql && (
        <>
          <div className="section-head"><h2>Quản lý</h2></div>
          <div className="tiles">
            <Link href="/quan-ly" className="tile ql">
              <span className="t">Bảng quản lý</span>
              <span className="d">Đặt hàng, danh mục, thiết bị, nhân viên, cấu hình</span>
            </Link>
          </div>
        </>
      )}

      {!inn && !media && !ql && (
        <div className="alert info" style={{ marginTop: 20 }}>Tài khoản của bạn chưa được gán nhóm Inn hay Media. Nhờ quản lý cấp quyền.</div>
      )}
    </main>
  )
}
