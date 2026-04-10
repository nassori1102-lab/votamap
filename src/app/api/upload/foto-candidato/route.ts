import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const BUCKET = 'fotos-candidatos'

export async function POST(req: NextRequest) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    const candidatoId = formData.get('candidato_id') as string
    const campo = (formData.get('campo') as string) || 'foto_url'

    if (!file || !candidatoId) {
      return NextResponse.json({ error: 'Arquivo e candidato_id são obrigatórios' }, { status: 400 })
    }

    const { data: buckets } = await supabaseAdmin.storage.listBuckets()
    const existe = buckets?.some(b => b.name === BUCKET)
    if (!existe) {
      const { error: bucketErr } = await supabaseAdmin.storage.createBucket(BUCKET, { public: true })
      if (bucketErr) return NextResponse.json({ error: 'Erro ao criar bucket: ' + bucketErr.message }, { status: 500 })
    }

    const ext = file.name.split('.').pop() || 'jpg'
    const path = `${candidatoId}_${campo}.${ext}`
    const buffer = Buffer.from(await file.arrayBuffer())

    const { error: uploadErr } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(path, buffer, { contentType: file.type, upsert: true })

    if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 500 })

    const { data: urlData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path)
    const url = urlData.publicUrl + '?t=' + Date.now()

    await supabaseAdmin.from('candidatos').update({ [campo]: url }).eq('id', candidatoId)

    return NextResponse.json({ url })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erro desconhecido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
