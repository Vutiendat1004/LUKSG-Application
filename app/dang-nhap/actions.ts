'use server'
import { redirect } from 'next/navigation'
import { supabaseServer, supabaseAdmin } from '@/lib/supabase/server'
import { emailDangNhap } from '@/lib/auth'

/** "dat" → email của tài khoản có tên đăng nhập "dat"; gõ email thì dùng luôn email đó */
async function timEmail(ten: string): Promise<string> {
  if (ten.includes('@')) return ten
  try {
    const admin = supabaseAdmin()
    const { data: nv } = await admin.from('nhan_vien').select('id').eq('ten_dang_nhap', ten).maybeSingle()
    if (nv) {
      const { data } = await admin.auth.admin.getUserById(nv.id)
      if (data.user?.email) return data.user.email
    }
  } catch (e) {
    console.error('[dang-nhap] không tra được email', e)
  }
  return emailDangNhap(ten)
}

export async function dangNhap(_prev: { loi: string }, form: FormData): Promise<{ loi: string }> {
  const ten = String(form.get('ten') ?? '').trim().toLowerCase()
  const mk = String(form.get('mk') ?? '')
  const tiep = String(form.get('tiep') ?? '/')
  if (!ten || !mk) return { loi: 'Nhập tên đăng nhập và mật khẩu.' }
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { loi: 'App chưa được nối với Supabase (thiếu khoá trên Vercel).' }
  }
  const supabase = await supabaseServer()
  const { error } = await supabase.auth.signInWithPassword({ email: await timEmail(ten), password: mk })
  if (error) {
    console.error('[dang-nhap]', error.status, error.message)
    if (error.status === 400 || /invalid/i.test(error.message)) return { loi: 'Sai tên đăng nhập hoặc mật khẩu.' }
    return { loi: `Không kết nối được máy chủ đăng nhập (${error.message}).` }
  }
  redirect(tiep.startsWith('/') ? tiep : '/')
}

export async function dangXuat() {
  const supabase = await supabaseServer()
  await supabase.auth.signOut()
  redirect('/dang-nhap')
}
