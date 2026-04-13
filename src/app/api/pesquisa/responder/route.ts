import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  try {
    const body = await req.json()
    const { pesquisa_id, nome, idade, genero, bairro, cidade, respostas } = body

    if (!pesquisa_id) {
      return NextResponse.json({ error: 'pesquisa_id obrigatório' }, { status: 400 })
    }

    // Verificar se a pesquisa está ativa
    const { data: pesquisa } = await supabaseAdmin
      .from('pesquisas').select('id, ativa').eq('id', pesquisa_id).single()

    if (!pesquisa || !pesquisa.ativa) {
      return NextResponse.json({ error: 'Pesquisa não encontrada ou inativa' }, { status: 404 })
    }

    // Inserir cabeçalho da resposta
    const { data: respCab, error: errCab } = await supabaseAdmin
      .from('respostas_pesquisa')
      .insert({
        pesquisa_id,
        nome: nome || null,
        idade: idade ? parseInt(idade) : null,
        genero: genero || null,
        bairro: bairro || null,
        cidade: cidade || null,
      })
      .select().single()

    if (errCab) return NextResponse.json({ error: errCab.message }, { status: 500 })

    // Inserir respostas das perguntas
    if (respostas && respostas.length > 0) {
      const linhas = respostas.map((r: any) => ({
        resposta_pesquisa_id: respCab.id,
        pergunta_id: r.pergunta_id,
        opcao_id: r.opcao_id || null,
        texto_livre: r.texto_livre || null,
      }))

      const { error: errResps } = await supabaseAdmin
        .from('respostas_perguntas').insert(linhas)

      if (errResps) return NextResponse.json({ error: errResps.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, id: respCab.id })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erro desconhecido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
