'use client'
import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Scanner, maTuQR } from '@/components/Scanner'
import { thucHien, type KetQuaHD } from './actions'

export type TB = {
  ma: string
  ten: string
  trang_thai: string
  nguoi_giu_id: string | null
  nguoi_giu_ten: string | null
  han_tra: string | null
}
export type HanhDong = 'muon' | 'tra' | 'chuyen'

const TEN_HD: Record<HanhDong, string> = { muon: 'Mượn', tra: 'Trả', chuyen: 'Chuyển chi nhánh' }
const CHO_MUON = ['Trong kho', 'Đang mượn', 'Cần kiểm tra']

function vanDe(t: TB | undefined, hd: HanhDong, toi: string): { loi?: string; nhac?: string } {
  if (!t) return { loi: 'Không có mã này' }
  if (hd === 'muon') {
    if (!CHO_MUON.includes(t.trang_thai)) return { loi: t.trang_thai }
    if (t.trang_thai === 'Đang mượn') return { nhac: t.nguoi_giu_id === toi ? 'Bạn đang giữ, sẽ gia hạn' : `${t.nguoi_giu_ten ?? 'Người khác'} đang giữ` }
    if (t.trang_thai === 'Cần kiểm tra') return { nhac: 'Đang chờ kiểm tra' }
  }
  if (hd === 'tra') {
    if (['Cần sửa chữa', 'Đã chuyển HN', 'Đã chuyển ĐN'].includes(t.trang_thai)) return { loi: t.trang_thai }
    if (t.trang_thai !== 'Đang mượn') return { nhac: 'Không có lượt mượn' }
    if (t.nguoi_giu_id !== toi) return { nhac: `Trả hộ ${t.nguoi_giu_ten ?? ''}`.trim() }
  }
  if (hd === 'chuyen') {
    if (t.trang_thai.startsWith('Đã chuyển')) return { loi: t.trang_thai }
    if (t.trang_thai === 'Đang mượn') return { nhac: `${t.nguoi_giu_ten ?? 'Người khác'} đang giữ` }
  }
  return {}
}

export function DeviceAction(props: {
  thietBi: TB[]
  toi: { id: string; ho_ten: string }
  hanMacDinh: string
  homNay: string
  hdBanDau: HanhDong
  maBanDau: string[]
  nguoiMuonHo: { id: string; ho_ten: string }[] | null
}) {
  const map = useMemo(() => new Map(props.thietBi.map((t) => [t.ma.toUpperCase(), t])), [props.thietBi])
  const [hd, setHd] = useState<HanhDong>(props.hdBanDau)
  const [ma, setMa] = useState<string[]>(() => [...new Set(props.maBanDau.map(maTuQR))])
  const [go, setGo] = useState('')
  const [quet, setQuet] = useState(false)
  const [han, setHan] = useState(props.hanMacDinh)
  const [nguoiMuon, setNguoiMuon] = useState(props.toi.id)
  const [tinhTrang, setTinhTrang] = useState('Bình thường')
  const [chiNhanh, setChiNhanh] = useState<'HN' | 'ĐN'>('HN')
  const [nguoiNhan, setNguoiNhan] = useState('')
  const [ghiChu, setGhiChu] = useState('')
  const [kq, setKq] = useState<KetQuaHD | null>(null)
  const [pending, start] = useTransition()
  const router = useRouter()

  function them(raw: string) {
    const list = raw.split(/[,\s;]+/).map(maTuQR).filter(Boolean)
    setMa((cu) => [...new Set([...cu, ...list])])
    setKq(null)
  }
  const coLoi = ma.some((m) => vanDe(map.get(m), hd, props.toi.id).loi)

  function gui() {
    start(async () => {
      const r = await thucHien(hd, ma, {
        han_tra: han,
        nguoi_muon: nguoiMuon !== props.toi.id ? nguoiMuon : undefined,
        tinh_trang: tinhTrang,
        chi_nhanh: chiNhanh,
        nguoi_nhan: nguoiNhan,
        ghi_chu: ghiChu,
      })
      setKq(r)
      if (r.ok) {
        setMa([])
        setGhiChu('')
        setNguoiNhan('')
        setQuet(false)
        router.refresh()
      }
    })
  }

  if (kq?.ok) {
    return (
      <div className="stack" style={{ marginTop: 16 }}>
        <div className="alert ok" role="status">
          Đã {kq.hanh_dong.toLowerCase()} {kq.thiet_bi.length} thiết bị. Email xác nhận đã gửi.
        </div>
        <ul className="list">
          {kq.thiet_bi.map((t) => (
            <li key={t.ma}>
              <b>{t.ma}</b> · {t.ten}
              {t.canh_bao && <div className="small" style={{ color: 'var(--dat)' }}>{t.canh_bao}</div>}
            </li>
          ))}
        </ul>
        <div className="row">
          <button className="btn" onClick={() => setKq(null)}>Làm lượt khác</button>
          <Link href="/cua-toi" className="btn media">Đồ tôi đang giữ</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="stack-lg" style={{ marginTop: 16 }}>
      <div className="seg" role="tablist">
        {(['muon', 'tra', 'chuyen'] as HanhDong[]).map((h) => (
          <button key={h} type="button" role="tab" aria-selected={hd === h} className={hd === h ? 'on' : ''} onClick={() => { setHd(h); setKq(null) }}>
            {h === 'chuyen' ? 'Chuyển' : TEN_HD[h]}
          </button>
        ))}
      </div>

      <section className="stack">
        <div className="label">Thiết bị</div>
        {ma.length > 0 && (
          <div className="chips">
            {ma.map((m) => {
              const t = map.get(m)
              const v = vanDe(t, hd, props.toi.id)
              return (
                <span key={m} className={`chip${v.loi ? ' bad' : ''}`}>
                  <span>
                    {m}
                    <span className="sub"> · {v.loi ?? t?.ten}{v.nhac ? ` · ${v.nhac}` : ''}</span>
                  </span>
                  <button type="button" aria-label={`Bỏ ${m}`} onClick={() => setMa(ma.filter((x) => x !== m))}>×</button>
                </span>
              )
            })}
          </div>
        )}
        {quet ? (
          <Scanner onCode={them} onClose={() => setQuet(false)} />
        ) : (
          <button type="button" className="btn media block" onClick={() => setQuet(true)}>Quét mã QR</button>
        )}
        <form
          className="row"
          onSubmit={(e) => {
            e.preventDefault()
            if (go.trim()) them(go)
            setGo('')
          }}
        >
          <input
            className="input"
            style={{ flex: 1, minWidth: 0 }}
            list="ds-ma"
            placeholder="Hoặc gõ mã, vd EQ013-02"
            value={go}
            onChange={(e) => setGo(e.target.value)}
            autoCapitalize="characters"
            aria-label="Gõ mã thiết bị"
          />
          <button className="btn" type="submit">Thêm</button>
          <datalist id="ds-ma">
            {props.thietBi.map((t) => <option key={t.ma} value={t.ma}>{t.ten}</option>)}
          </datalist>
        </form>
      </section>

      <section className="stack">
        {hd === 'muon' && (
          <>
            <div className="field">
              <label htmlFor="han">Hạn trả</label>
              <input id="han" type="date" className="input" min={props.homNay} value={han} onChange={(e) => setHan(e.target.value)} />
            </div>
            {props.nguoiMuonHo && (
              <div className="field">
                <label htmlFor="nm">Người mượn</label>
                <select id="nm" className="input" value={nguoiMuon} onChange={(e) => setNguoiMuon(e.target.value)}>
                  {props.nguoiMuonHo.map((n) => <option key={n.id} value={n.id}>{n.id === props.toi.id ? `${n.ho_ten} (tôi)` : n.ho_ten}</option>)}
                </select>
              </div>
            )}
          </>
        )}
        {hd === 'tra' && (
          <div className="field">
            <span className="label">Tình trạng khi trả</span>
            <div className="seg">
              {['Bình thường', 'Thiếu phụ kiện', 'Hỏng'].map((t) => (
                <button key={t} type="button" className={tinhTrang === t ? 'on' : ''} onClick={() => setTinhTrang(t)}>{t}</button>
              ))}
            </div>
            {tinhTrang !== 'Bình thường' && <span className="hint">Thiết bị sẽ chuyển sang “Cần kiểm tra”. Ghi rõ thiếu gì hoặc hỏng gì ở ghi chú.</span>}
          </div>
        )}
        {hd === 'chuyen' && (
          <>
            <div className="field">
              <span className="label">Chuyển ra</span>
              <div className="seg">
                <button type="button" className={chiNhanh === 'HN' ? 'on' : ''} onClick={() => setChiNhanh('HN')}>Hà Nội</button>
                <button type="button" className={chiNhanh === 'ĐN' ? 'on' : ''} onClick={() => setChiNhanh('ĐN')}>Đà Nẵng</button>
              </div>
            </div>
            <div className="field">
              <label htmlFor="nn">Người nhận</label>
              <input id="nn" className="input" value={nguoiNhan} onChange={(e) => setNguoiNhan(e.target.value)} required />
            </div>
          </>
        )}
        <div className="field">
          <label htmlFor="gc">Ghi chú{hd === 'tra' && tinhTrang !== 'Bình thường' ? '' : ' (không bắt buộc)'}</label>
          <input id="gc" className="input" value={ghiChu} onChange={(e) => setGhiChu(e.target.value)} />
        </div>
      </section>

      {kq && !kq.ok && <div className="alert err" role="alert">{kq.loi}</div>}
      <div className="sticky-submit">
        <button
          className="btn media block"
          disabled={pending || ma.length === 0 || coLoi || (hd === 'chuyen' && !nguoiNhan.trim())}
          onClick={gui}
        >
          {pending ? 'Đang lưu…' : ma.length === 0 ? 'Thêm thiết bị để tiếp tục' : coLoi ? 'Bỏ các mã đang báo đỏ' : `${TEN_HD[hd]} ${ma.length} thiết bị`}
        </button>
      </div>
    </div>
  )
}
