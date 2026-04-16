import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

async function buscarContextoCampanha() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const [
    { data: lideres },
    { data: apoiadores },
    { data: pesquisas },
    { data: receitas },
    { data: despesas },
  ] = await Promise.all([
    supabase.from('lideres_regionais').select('nome, cidade, bairro, meta_votos, ativo'),
    supabase.from('apoiadores').select('nome, bairro, cidade, engajamento'),
    supabase.from('pesquisas').select('titulo, status'),
    supabase.from('receitas').select('tipo, valor'),
    supabase.from('investimentos').select('categoria, valor'),
  ])

  const totalMeta = lideres?.reduce((s, l) => s + (l.meta_votos || 0), 0) || 0
  const totalReceitas = receitas?.reduce((s, r) => s + Number(r.valor), 0) || 0
  const totalDespesas = despesas?.reduce((s, d) => s + Number(d.valor), 0) || 0

  const bairrosMap = apoiadores?.reduce((acc: Record<string, number>, a) => {
    const key = `${a.bairro}, ${a.cidade}`
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})

  const topBairros = Object.entries(bairrosMap || {})
    .sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([b, c]) => `${b}: ${c} apoiadores`)

  return `
CONTEXTO DA CAMPANHA — CandMaps

RESUMO:
- Líderes ativos: ${lideres?.filter(l => l.ativo).length || 0}
- Apoiadores cadastrados: ${apoiadores?.length || 0}
- Meta total de votos: ${totalMeta.toLocaleString('pt-BR')}
- Pesquisas criadas: ${pesquisas?.length || 0}
- Receitas: R$ ${totalReceitas.toLocaleString('pt-BR')}
- Despesas: R$ ${totalDespesas.toLocaleString('pt-BR')}
- Saldo: R$ ${(totalReceitas - totalDespesas).toLocaleString('pt-BR')}

TOP BAIRROS:
${topBairros.join('\n')}

LÍDERES:
${lideres?.slice(0, 20).map(l => `- ${l.nome} (${l.bairro}, ${l.cidade}) — Meta: ${l.meta_votos || 0} votos`).join('\n')}

PESQUISAS:
${pesquisas?.map(p => `- ${p.titulo} [${p.status}]`).join('\n') || 'Nenhuma'}
`
}

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json()
    const contexto = await buscarContextoCampanha()

    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!)
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash-latest',
      systemInstruction: `Você é o Assistente de Campanha do CandMaps, especialista em estratégia eleitoral brasileira.
Você tem acesso aos dados reais da campanha e deve analisar, sugerir estratégias e gerar conteúdo.

${contexto}

SUAS CAPACIDADES:
1. Analisar dados da campanha e identificar oportunidades
2. Sugerir estratégias baseadas nos dados reais
3. Gerar posts para redes sociais, mensagens de WhatsApp, roteiros de discurso
4. Alertar sobre riscos e pontos críticos
5. Responder perguntas sobre a campanha

REGRAS:
- Sempre baseie suas respostas nos dados reais da campanha
- Seja direto e prático
- Use linguagem acessível
- Quando sugerir conteúdo, já entregue pronto para uso
- Considere sempre as regras eleitorais do TSE 2026`,
    })

    const chat = model.startChat({
      history: messages.slice(0, -1).map((m: any) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
    })

    const lastMessage = messages[messages.length - 1].content
    const result = await chat.sendMessage(lastMessage)
    const text = result.response.text()

    return NextResponse.json({ message: text })
  } catch (error: any) {
    console.error('Erro IA:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}