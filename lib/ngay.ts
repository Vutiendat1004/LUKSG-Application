const TZ = 'Asia/Ho_Chi_Minh'

/** 'YYYY-MM-DD' theo giờ Việt Nam */
export function homNay(cong = 0): string {
  const d = new Date(Date.now() + cong * 86400000)
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
}

/** Thứ trong tuần theo giờ Việt Nam: 'T2'…'T7', 'CN' */
export function thuHomNay(): string {
  const wd = new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'short' }).format(new Date())
  return ({ Mon: 'T2', Tue: 'T3', Wed: 'T4', Thu: 'T5', Fri: 'T6', Sat: 'T7', Sun: 'CN' } as Record<string, string>)[wd]
}

export function ngayVN(v: string | Date | null | undefined): string {
  if (!v) return ''
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const [y, m, d] = v.split('-')
    return `${d}/${m}/${y}`
  }
  return new Intl.DateTimeFormat('vi-VN', { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(v))
}

export function gioVN(v: string | Date | null | undefined): string {
  if (!v) return ''
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: TZ, hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit',
  }).format(new Date(v))
}

/** "hôm nay", "hôm qua", "3 ngày trước" */
export function truoc(v: string | null | undefined): string {
  if (!v) return ''
  const ngayDo = new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date(v))
  const ngay = Math.round((Date.parse(homNay()) - Date.parse(ngayDo)) / 86400000)
  if (ngay <= 0) return 'hôm nay'
  if (ngay === 1) return 'hôm qua'
  return `${ngay} ngày trước`
}

export function so(n: number | string | null | undefined, toiDa = 2): string {
  if (n === null || n === undefined || n === '') return ''
  const x = typeof n === 'string' ? Number(n) : n
  if (!Number.isFinite(x)) return ''
  return x.toLocaleString('vi-VN', { maximumFractionDigits: toiDa })
}

export function tien(n: number | string | null | undefined): string {
  const s = so(n, 0)
  return s ? `${s} đ` : ''
}
