import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Buscar RSS do TSE
    const res = await fetch('https://www.tse.jus.br/rss/noticias.xml', {
      headers: { 'User-Agent': 'CandMaps/1.0' },
      next: { revalidate: 3600 }
    })

    if (!res.ok) {
      return NextResponse.json({ error: 'Erro ao buscar RSS do TSE' }, { status: 500 })
    }

    const xml = await res.text()

    // Parser simples de RSS
    const items = xml.match(/<item>([\s\S]*?)<\/item>/g) || []
    const normativas = items.slice(0, 20).map(item => {
      const titulo = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] ||
                     item.match(/<title>(.*?)<\/title>/)?.[1] || ''
      const descricao = item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/)?.[1] ||
                        item.match(/<description>(.*?)<\/description>/)?.[1] || ''
      const link = item.match(/<link>(.*?)<\/link>/)?.[1] || ''
      const pubDate = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || ''

      // Categorizar
      let categoria = 'noticia'
      const tituloLower = titulo.toLowerCase()
      if (tituloLower.includes('resolução') || tituloLower.includes('resolucao')) categoria = 'resolucao'
      else if (tituloLower.includes('portaria')) categoria = 'portaria'
      else if (tituloLower.includes('calendário') || tituloLower.includes('calendario')) categoria = 'calendario'
      else if (tituloLower.includes('instrução') || tituloLower.includes('instrucao')) categoria = 'instrucao'

      return {
        titulo: titulo.trim(),
        descricao: descricao.replace(/<[^>]*>/g, '').trim().slice(0, 500),
        link: link.trim(),
        data_publicacao: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
        categoria,
      }
    }).filter(n => n.titulo)

    // Salvar apenas as novas
    let novas = 0
    for (const normativa of normativas) {
      const { data: existente } = await supabase
        .from('tse_normativas')
        .select('id')
        .eq('link', normativa.link)
        .single()

      if (!existente) {
        await supabase.from('tse_normativas').insert(normativa)
        novas++
      }
    }

    return NextResponse.json({ 
      sucesso: true, 
      total: normativas.length,
      novas,
      mensagem: novas > 0 ? `${novas} nova(s) normativa(s) encontrada(s)` : 'Nenhuma novidade'
    })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}