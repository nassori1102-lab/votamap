import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const BUCKET = 'fotos-lideres'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    const liderId = formData.get('lider_id') as string

    if (!file || !liderId) {
      return NextResponse.json({ error: 'Arquivo e lider_id são obrigatórios' }, { status: 400 })
    }

    // Garante que o bucket existe
    const { data: buckets } = await supabaseAdmin.storage.listBuckets()
    const existe = buckets?.some(b => b.name === BUCKET)
    if (!existe) {
      const { error: bucketErr } = await supabaseAdmin.storage.createBucket(BUCKET, { public: true })
      if (bucketErr) return NextResponse.json({ error: 'Erro ao criar bucket: ' + bucketErr.message }, { status: 500 })
    }

    const ext = file.name.split('.').pop() || 'jpg'
    const path = `${liderId}.${ext}`
    const buffer = Buffer.from(await file.arrayBuffer())

    const { error: uploadErr } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(path, buffer, { contentType: file.type, upsert: true })

    if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 500 })

    const { data: urlData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path)
    const url = urlData.publicUrl + '?t=' + Date.now()

    // Atualiza foto_url no banco
    await supabaseAdmin.from('lideres_regionais').update({ foto_url: url }).eq('id', liderId)

    return NextResponse.json({ url })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erro desconhecido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
