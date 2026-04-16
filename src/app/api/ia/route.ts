import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

async function buscarContextoCampanha() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const [
    { data: lideres, count: totalLideres },
    { data: apoiadores, count: totalApoiadores },
    { data: pesquisas },
    { data: receitas },
    { data: despesas },
  ] = await Promise.all([
    supabase.from('lideres_regionais').select('nome, cidade, bairro, meta_votos, ativo', { count: 'exact' }),
    supabase.from('apoiadores').select('nome, bairro, cidade, engajamento, profissao', { count: 'exact' }),
    supabase.from('pesquisas').select('titulo, status, criado_em'),
    supabase.from('receitas').select('tipo, valor, data'),
    supabase.from('investimentos').select('categoria, valor, data'),
  ])

  const totalMeta = lideres?.reduce((s, l) => s + (l.meta_votos || 0), 0) || 0
  const totalReceitas = receitas?.reduce((s, r) => s + Number(r.valor), 0) || 0
  const totalDespesas = despesas?.reduce((s, d) => s + Number(d.valor), 0) || 0

  const bairrosComMaisApoiadores = apoiadores?.reduce((acc: Record<string, number>, a) => {
    const key = `${a.bairro}, ${a.cidade}`
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})

  const topBairros = Object.entries(bairrosComMaisApoiadores || {})
    .sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([bairro, count]) => `${bairro}: ${count} apoiadores`)

  const lideresAbaixoMeta = lideres?.filter(l => l.ativo && (l.meta_votos || 0) === 0) || []

  return `
CONTEXTO DA CAMPANHA — CandMaps

RESUMO GERAL:
- Total de líderes ativos: ${lideres?.filter(l => l.ativo).length || 0}
- Total de apoiadores cadastrados: ${totalApoiadores || 0}
- Meta total de votos (soma dos líderes): ${totalMeta.toLocaleString('pt-BR')}
- Pesquisas de campo criadas: ${pesquisas?.length || 0}
- Saldo financeiro: R$ ${(totalReceitas - totalDespesas).toLocaleString('pt-BR')}

TOP 5 BAIRROS COM MAIS APOIADORES:
${topBairros.join('\n')}

LÍDERES SEM META DEFINIDA: ${lideresAbaixoMeta.length}

LÍDERES CADASTRADOS:
${lideres?.slice(0, 20).map(l => `- ${l.nome} (${l.bairro}, ${l.cidade}) — Meta: ${l.meta_votos || 0} votos`).join('\n')}

PESQUISAS DE CAMPO:
${pesquisas?.map(p => `- ${p.titulo} [${p.status}]`).join('\n') || 'Nenhuma pesquisa criada'}

FINANCEIRO:
- Total receitas: R$ ${totalReceitas.toLocaleString('pt-BR')}
- Total despesas: R$ ${totalDespesas.toLocaleString('pt-BR')}
- Saldo: R$ ${(totalReceitas - totalDespesas).toLocaleString('pt-BR')}
`
}

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json()
    const contexto = await buscarContextoCampanha()

    const stream = await anthropic.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: `Você é o Assistente de Campanha do CandMaps, especialista em estratégia eleitoral brasileira.
Você tem acesso aos dados reais da campanha e deve analisar, sugerir estratégias e gerar conteúdo.

${contexto}

SUAS CAPACIDADES:
1. Analisar dados da campanha e identificar oportunidades
2. Sugerir estratégias baseadas nos dados reais
3. Gerar posts para redes sociais, mensagens de WhatsApp, roteiros de discurso
4. Alertar sobre riscos e pontos críticos
5. Responder perguntas sobre a campanha com base nos dados acima

REGRAS:
- Sempre baseie suas respostas nos dados reais da campanha
- Seja direto e prático — os usuários são políticos e coordenadores ocupados
- Use linguagem acessível, sem jargões técnicos
- Quando sugerir conteúdo, já entregue pronto para uso
- Considere sempre as regras eleitorais do TSE 2026`,
      messages: messages,
    })

    const response = await stream.finalMessage()
    const text = response.content[0].type === 'text' ? response.content[0].text : ''

    return NextResponse.json({ message: text })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}