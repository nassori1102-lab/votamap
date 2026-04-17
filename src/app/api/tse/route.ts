import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const res = await fetch(
  'https://news.google.com/rss/search?q=TSE+resolução+eleitoral+site:tse.jus.br&hl=pt-BR&gl=BR&ceid=BR:pt-419',
  { headers: { 'User-Agent': 'Mozilla/5.0 CandMaps/1.0' } }
)

    if (!res.ok) {
      return NextResponse.json({ error: `TSE retornou ${res.status}` }, { status: 500 })
    }

    const xml = await res.text()

    // Extrair itens com regex mais flexível
    const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi
    const tituloRegex = /<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i
    const descRegex = /<description[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i
    const linkRegex = /<link[^>]*>([\s\S]*?)<\/link>/i
    const dateRegex = /<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i

    const normativas: any[] = []
    let match

    while ((match = itemRegex.exec(xml)) !== null) {
      const item = match[1]
      const tituloRaw = item.match(tituloRegex)?.[1] || ''
const titulo = tituloRaw
  .replace(/<[^>]*>/g, '')
  .replace(/&lt;.*$/g, '')
  .replace(' - Tribunal Superior Eleitoral', '')
  .replace(/&amp;/g, '&')
  .trim()

const descricaoRaw = item.match(descRegex)?.[1] || ''
const descricao = descricaoRaw
  .replace(/<a\s[^>]*>.*?<\/a>/gi, '')
  .replace(/<[^>]*>/g, '')
  .replace(/&lt;/gi, '')
  .replace(/&gt;/gi, '')
  .replace(/&amp;/gi, '&')
  .replace(/&nbsp;/gi, ' ')
  .replace(/\s+/g, ' ')
  .trim()
  .slice(0, 300)
      const link = (item.match(linkRegex)?.[1] || '').trim()
      const pubDate = (item.match(dateRegex)?.[1] || '').trim()

      if (!titulo) continue

      let categoria = 'noticia'
      const t = titulo.toLowerCase()
      if (t.includes('resolução') || t.includes('resolucao')) categoria = 'resolucao'
      else if (t.includes('portaria')) categoria = 'portaria'
      else if (t.includes('calendário') || t.includes('calendario')) categoria = 'calendario'
      else if (t.includes('instrução') || t.includes('instrucao')) categoria = 'instrucao'

      normativas.push({
        titulo,
        descricao,
        link,
        data_publicacao: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
        categoria,
      })
    }

    if (normativas.length === 0) {
      return NextResponse.json({ error: 'Nenhum item encontrado no RSS', xml: xml.slice(0, 500) }, { status: 500 })
    }

    let novas = 0
    for (const normativa of normativas.slice(0, 20)) {
      const { data: existente } = await supabase
        .from('tse_normativas')
        .select('id')
        .eq('link', normativa.link)
        .single()

      if (!existente && normativa.link) {
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
    console.error('Erro TSE:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}