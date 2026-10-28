import { appUrl } from './supabase/config'

/** Gửi email qua Resend. Thiếu RESEND_API_KEY thì bỏ qua (ghi log) để app vẫn chạy khi thử. */
export async function guiEmail(opts: {
  to: (string | null | undefined)[]
  cc?: (string | null | undefined)[]
  subject: string
  html: string
}): Promise<{ ok: boolean; loi?: string }> {
  const sach = (a?: (string | null | undefined)[]) =>
    [...new Set((a ?? []).flatMap((x) => (x ?? '').split(',')).map((x) => x.trim().toLowerCase()).filter((x) => x.includes('@')))]
  let to = sach(opts.to)
  let cc = sach(opts.cc).filter((x) => !to.includes(x))
  if (to.length === 0 && cc.length > 0) {
    to = cc
    cc = []
  }
  if (to.length === 0) return { ok: false, loi: 'Không có người nhận' }

  const key = process.env.RESEND_API_KEY
  if (!key) {
    console.warn('[email] Chưa có RESEND_API_KEY, bỏ qua:', opts.subject, to)
    return { ok: false, loi: 'Chưa cấu hình RESEND_API_KEY' }
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || 'LUK SG <onboarding@resend.dev>',
      to,
      cc: cc.length ? cc : undefined,
      subject: opts.subject,
      html: opts.html,
    }),
  })
  if (!res.ok) {
    const loi = await res.text()
    console.error('[email] Resend lỗi', res.status, loi)
    return { ok: false, loi }
  }
  return { ok: true }
}

export function esc(s: unknown): string {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}

export function bang(cot: string[], dong: (string | number | null | undefined)[][]): string {
  const th = cot.map((c) => `<th style="text-align:left;padding:6px 10px;border-bottom:2px solid #1f6b57;font-size:13px;color:#46524f">${esc(c)}</th>`).join('')
  const tr = dong
    .map((d) => `<tr>${d.map((x) => `<td style="padding:6px 10px;border-bottom:1px solid #e1e7e4;font-size:14px">${esc(x)}</td>`).join('')}</tr>`)
    .join('')
  return `<table style="border-collapse:collapse;width:100%;margin:8px 0 16px">${`<tr>${th}</tr>`}${tr}</table>`
}

export function khung(tieuDe: string, noiDung: string): string {
  const app = appUrl()
  return `<div style="font-family:Afacad,Segoe UI,Helvetica,Arial,sans-serif;max-width:640px;margin:0 auto;color:#18211f;line-height:1.5">
<h2 style="font-size:20px;margin:0 0 12px">${esc(tieuDe)}</h2>
${noiDung}
${app ? `<p style="margin-top:20px;font-size:13px;color:#5e6b68">Mở app: <a href="${esc(app)}">${esc(app)}</a></p>` : ''}
</div>`
}

export function doanVan(s: string) {
  return `<p style="margin:0 0 10px">${esc(s)}</p>`
}

export function khoiTinNhan(s: string) {
  return `<pre style="white-space:pre-wrap;font-family:inherit;background:#f1f5f3;border-radius:8px;padding:10px 12px;margin:6px 0 14px;font-size:14px">${esc(s)}</pre>`
}
