import Link from 'next/link'
import QRCode from 'qrcode'
import { canQuanLy } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase/server'
import { MUC, MUC_KEYS } from '@/lib/muc'
import { InNut } from './InNut'

export const dynamic = 'force-dynamic'

async function svg(text: string) {
  return QRCode.toString(text, { type: 'svg', margin: 1, errorCorrectionLevel: 'M' })
}

export default async function InQR({ searchParams }: { searchParams: Promise<{ loai?: string; goc?: string }> }) {
  await canQuanLy()
  const sp = await searchParams
  const app = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '')
  const kho = sp.loai === 'kho'
  const sb = await supabaseServer()

  let nhan: { code: string; name: string; svg: string }[] = []
  let loai: { ma_goc: string; ten: string }[] = []
  if (kho) {
    const ds = [
      { code: 'LUK SG', name: 'Trang chủ app', url: `${app}/` },
      ...MUC_KEYS.map((m) => ({ code: `Kiểm kho ${MUC[m].ten}`, name: MUC[m].lich, url: `${app}/kiem-kho/${m}` })),
      { code: 'Nhập hàng', name: 'Ghi hàng vừa về', url: `${app}/nhap-hang` },
      { code: 'Thiết bị', name: 'Mượn · Trả · Chuyển', url: `${app}/thiet-bi` },
    ]
    nhan = await Promise.all(ds.map(async (d) => ({ code: d.code, name: d.name, svg: await svg(d.url) })))
  } else {
    const [{ data: tb }, { data: l }] = await Promise.all([
      (sp.goc
        ? sb.from('thiet_bi').select('ma, ten, trang_thai').eq('ma_goc', sp.goc)
        : sb.from('thiet_bi').select('ma, ten, trang_thai')
      ).not('trang_thai', 'in', '("Đã chuyển HN","Đã chuyển ĐN")').order('ma'),
      sb.from('loai_thiet_bi').select('ma_goc, ten').order('ma_goc'),
    ])
    loai = l ?? []
    nhan = await Promise.all((tb ?? []).map(async (t) => ({ code: t.ma, name: t.ten, svg: await svg(`${app}/tb/${encodeURIComponent(t.ma)}`) })))
  }

  return (
    <main className="page wide">
      <div className="no-print">
        <Link href="/quan-ly" className="back">‹ Bảng quản lý</Link>
        <h1>In mã QR</h1>
        {!app && <div className="alert warn" style={{ marginTop: 12 }}>Chưa khai báo NEXT_PUBLIC_APP_URL trên Vercel nên mã QR chưa có link đúng.</div>}
        <div className="filters" style={{ margin: '16px 0' }}>
          <Link href="/quan-ly/in-qr" className={!kho ? 'on' : ''}>QR dán thiết bị</Link>
          <Link href="/quan-ly/in-qr?loai=kho" className={kho ? 'on' : ''}>QR dán kho & office</Link>
        </div>
        {!kho && (
          <form className="row" style={{ marginBottom: 12 }}>
            <select name="goc" defaultValue={sp.goc ?? ''} className="input" style={{ flex: 1, minWidth: 0 }} aria-label="Chọn loại">
              <option value="">Tất cả thiết bị đang ở SG ({nhan.length})</option>
              {loai.map((l) => <option key={l.ma_goc} value={l.ma_goc}>{l.ma_goc} · {l.ten}</option>)}
            </select>
            <button className="btn">Lọc</button>
          </form>
        )}
        <div className="row" style={{ marginBottom: 16 }}>
          <span className="small muted">
            {kho ? 'In ra, dán ở kho, quầy và office. Quét bằng camera điện thoại là mở đúng trang.' : 'Mỗi nhãn mở trang của thiết bị đó. Cắt theo đường nét đứt và dán lên thân máy hoặc túi đựng.'}
          </span>
          <span className="spacer" />
          <InNut />
        </div>
      </div>
      <div className={`qr-sheet${kho ? ' qr-big' : ''}`}>
        {nhan.map((n) => (
          <div key={n.code} className="qr-label">
            <div dangerouslySetInnerHTML={{ __html: n.svg }} />
            <div className="c">{n.code}</div>
            <div className="n">{n.name}</div>
          </div>
        ))}
      </div>
    </main>
  )
}
