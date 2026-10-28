import { NextResponse, type NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { VIEC } from '@/lib/lich'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

async function chay(req: NextRequest, viec: string) {
  const secret = process.env.CRON_SECRET
  const auth = req.headers.get('authorization')
  const key = req.nextUrl.searchParams.get('key')
  if (!secret || (auth !== `Bearer ${secret}` && key !== secret)) {
    return NextResponse.json({ loi: 'Không có quyền' }, { status: 401 })
  }
  const fn = VIEC[viec]
  if (!fn) return NextResponse.json({ loi: `Không có việc "${viec}"` }, { status: 404 })
  try {
    const kq = await fn(supabaseAdmin())
    return NextResponse.json({ ok: true, ...kq })
  } catch (e) {
    console.error('[cron]', viec, e)
    return NextResponse.json({ ok: false, loi: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ viec: string }> }) {
  return chay(req, (await params).viec)
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ viec: string }> }) {
  return chay(req, (await params).viec)
}
