'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'

type Pesquisa = { id: string; titulo: string; descricao: string; status: string; segmentacao: string }
type Pergunta = { id: string; texto: string; tipo: string; opcoes: string[] | null; ordem: number }
type Token = { id: string; respondente_nome: string; respondente_tipo: string; respondido: boolean; respondido_em: string; token: string }
type Resposta = { pergunta_id: string; resposta: string; token: string }

export default function PesquisaResultadosPage() {
  const router = useRouter()
  const params = useParams()
  const supabase = createClient()
  const [pesquisa, setPesquisa] = useState<Pesquisa | null>(null)
  const [perguntas, setPerguntas] = useState<Pergunta[]>([])
  const [tokens, setTokens] = useState<Token[]>([])
  const [respostas, setRespostas] = useState<Resposta[]>([])
  const [loading, setLoading] = useState(true)
  const [copiado, setCopiado] = useState<string | null>(null)
  const [abaAtiva, setAbaAtiva] = useState<'links' | 'resultados'>('links')

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''

  useEffect(() => {
    async function carregar() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const [{ data: p }, { data: perg }, { data: tok }, { data: resp }] = await Promise.all([
        supabase.from('pesquisas').select('*').eq('id', params.id).single(),
        supabase.from('pesquisa_perguntas').select('*').eq('pesquisa_id', params.id).order('ordem'),
        supabase.from('pesquisa_tokens').select('*').eq('pesquisa_id', params.id).order('respondente_nome'),
        supabase.from('pesquisa_respostas').select('*').eq('pesquisa_id', params.id),
      ])

      if (p) setPesquisa(p)
      if (perg) setPerguntas(perg)
      if (tok) setTokens(tok)
      if (resp) setRespostas(resp)
      setLoading(false)
    }
    carregar()
  }, [params.id])

  function copiarLink(token: string, nome: string) {
    const link = `${baseUrl}/pesquisa/${token}`
    navigator.clipboard.writeText(link)
    setCopiado(token)
    setTimeout(() => setCopiado(null), 2000)
  }

  function copiarTodosLinks() {
    const naoRespondidos = tokens.filter(t => !t.respondido)
    const texto = naoRespondidos.map(t => `${t.respondente_nome}: ${baseUrl}/pesquisa/${t.token}`).join('\n')
    navigator.clipboard.writeText(texto)
    setCopiado('todos')
    setTimeout(() => setCopiado(null), 2000)
  }

  function gerarMensagemWhatsApp(token: Token) {
    const link = `${baseUrl}/pesquisa/${token.token}`
    const msg = `Olá ${token.respondente_nome}! 👋\n\nPrecisamos da sua opinião para melhorar nossa campanha na sua região.\n\nResponda nossa pesquisa rápida (5 minutos):\n${link}\n\nSua resposta é muito importante! 🗳️`
    return `https://wa.me/?text=${encodeURIComponent(msg)}`
  }

  // Calcular resultados por pergunta
  function calcularResultados(pergunta: Pergunta) {
    const respostasDaPergunta = respostas.filter(r => r.pergunta_id === pergunta.id)
    if (respostasDaPergunta.length === 0) return null

    if (pergunta.tipo === 'multipla_escolha' && pergunta.opcoes) {
      const contagem: Record<string, number> = {}
      pergunta.opcoes.forEach(o => { contagem[o] = 0 })
      respostasDaPergunta.forEach(r => { if (contagem[r.resposta] !== undefined) contagem[r.resposta]++ })
      const total = respostasDaPergunta.length
      return { tipo: 'multipla_escolha', contagem, total }
    }

    if (pergunta.tipo === 'escala') {
      const valores = respostasDaPergunta.map(r => parseInt(r.resposta)).filter(n => !isNaN(n))
      const media = valores.reduce((a, b) => a + b, 0) / valores.length
      const contagem: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 }
      valores.forEach(v => { contagem[String(v)]++ })
      return { tipo: 'escala', media: media.toFixed(1), contagem, total: valores.length }
    }

    if (pergunta.tipo === 'texto_livre') {
      return { tipo: 'texto_livre', respostas: respostasDaPergunta.map(r => r.resposta), total: respostasDaPergunta.length }
    }

    return null
  }

  const totalRespondidos = tokens.filter(t => t.respondido).length
  const percentual = tokens.length > 0 ? Math.round((totalRespondidos / tokens.length) * 100) : 0

  if (loading) return <div style={{ minHeight: '100vh', background: '#0B1F3A', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#C9A84C' }}>Carregando...</div>
  if (!pesquisa) return null

  return (
    <div style={{ minHeight: '100vh', background: '#0B1F3A', fontFamily: "'IBM Plex Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap" rel="stylesheet" />
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 80px, rgba(201,168,76,0.02) 80px, rgba(201,168,76,0.02) 81px)` }} />

      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, height: '64px', background: 'rgba(11,31,58,0.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(201,168,76,0.15)', display: 'flex', alignItems: 'center', padding: '0 32px', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={() => router.push('/dashboard/pesquisas')} style={{ background: 'transparent', border: 'none', color: '#8FA4C0', cursor: 'pointer', fontSize: '13px' }}>← Voltar</button>
          <div style={{ width: '1px', height: '20px', background: '#1C3558' }} />
          <span style={{ fontFamily: "'Playfair Display', serif", fontSize: '20px', fontWeight: 800, color: '#FFFFFF' }}>Cand<span style={{ color: '#C9A84C' }}>Maps</span></span>
        </div>
        <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 12px', borderRadius: '20px', background: pesquisa.status === 'ativa' ? 'rgba(34,197,94,0.1)' : 'rgba(192,57,43,0.1)', color: pesquisa.status === 'ativa' ? '#22c55e' : '#e74c3c', border: `1px solid ${pesquisa.status === 'ativa' ? 'rgba(34,197,94,0.2)' : 'rgba(192,57,43,0.2)'}` }}>
          {pesquisa.status === 'ativa' ? 'Ativa' : 'Encerrada'}
        </span>
      </nav>

      <main style={{ paddingTop: '88px', padding: '88px 32px 60px', position: 'relative', zIndex: 1, maxWidth: '960px', margin: '0 auto' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '28px', fontWeight: 800, color: '#FFFFFF', marginBottom: '6px' }}>{pesquisa.titulo}</h1>
          {pesquisa.descricao && <p style={{ fontSize: '14px', color: '#8FA4C0' }}>{pesquisa.descricao}</p>}
        </div>

        {/* MÉTRICAS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '24px' }}>
          <div style={{ background: '#0F2040', border: '1px solid #1C3558', borderRadius: '10px', padding: '20px' }}>
            <div style={{ fontSize: '11px', color: '#8FA4C0', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>Destinatários</div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#E8EDF5' }}>{tokens.length}</div>
          </div>
          <div style={{ background: '#0F2040', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '10px', padding: '20px' }}>
            <div style={{ fontSize: '11px', color: '#8FA4C0', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>Responderam</div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#22c55e' }}>{totalRespondidos}</div>
          </div>
          <div style={{ background: '#0F2040', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '10px', padding: '20px' }}>
            <div style={{ fontSize: '11px', color: '#8FA4C0', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>Taxa de resposta</div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#C9A84C' }}>{percentual}%</div>
          </div>
        </div>

        {/* BARRA DE PROGRESSO */}
        <div style={{ background: '#0F2040', border: '1px solid #1C3558', borderRadius: '10px', padding: '16px 20px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px', color: '#8FA4C0' }}>
            <span>Progresso de respostas</span>
            <span>{totalRespondidos} de {tokens.length}</span>
          </div>
          <div style={{ height: '8px', background: '#1C3558', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${percentual}%`, background: 'linear-gradient(90deg, #C9A84C, #E8C87A)', borderRadius: '4px', transition: 'width .5s' }} />
          </div>
        </div>

        {/* ABAS */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', background: '#0F2040', borderRadius: '10px', padding: '4px', width: 'fit-content' }}>
          {[['links', '🔗 Links e envios'], ['resultados', '📊 Resultados']].map(([key, label]) => (
            <button key={key} onClick={() => setAbaAtiva(key as any)}
              style={{ padding: '9px 20px', borderRadius: '8px', border: 'none', background: abaAtiva === key ? 'linear-gradient(135deg, #E8C87A, #A07830)' : 'transparent', color: abaAtiva === key ? '#0B1F3A' : '#8FA4C0', fontSize: '13px', fontWeight: abaAtiva === key ? 600 : 400, cursor: 'pointer', transition: 'all .2s' }}>
              {label}
            </button>
          ))}
        </div>

        {/* ABA LINKS */}
        {abaAtiva === 'links' && (
          <div style={{ background: '#0F2040', border: '1px solid #1C3558', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #1C3558', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: '#8FA4C0' }}>{tokens.filter(t => !t.respondido).length} pendentes de resposta</span>
              <button onClick={copiarTodosLinks} style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '8px', color: '#C9A84C', fontSize: '12px', padding: '8px 14px', cursor: 'pointer' }}>
                {copiado === 'todos' ? '✓ Copiados!' : '📋 Copiar todos os links pendentes'}
              </button>
            </div>
            {tokens.map((t, i) => (
              <div key={t.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '12px', padding: '14px 20px', borderBottom: i < tokens.length - 1 ? '1px solid rgba(28,53,88,0.5)' : 'none', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 500, color: '#E8EDF5' }}>{t.respondente_nome}</div>
                  <div style={{ fontSize: '11px', color: '#8FA4C0' }}>{t.respondente_tipo === 'lider' ? '👤 Líder' : '🗳 Apoiador'} · {t.respondido ? `✓ Respondeu em ${new Date(t.respondido_em).toLocaleDateString('pt-BR')}` : '⏳ Pendente'}</div>
                </div>
                <a href={gerarMensagemWhatsApp(t)} target="_blank" rel="noopener noreferrer"
                  style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '8px', color: '#22c55e', fontSize: '12px', padding: '8px 12px', cursor: 'pointer', textDecoration: 'none', whiteSpace: 'nowrap' }}>
                  WhatsApp
                </a>
                <button onClick={() => copiarLink(t.token, t.respondente_nome)}
                  style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '8px', color: '#C9A84C', fontSize: '12px', padding: '8px 12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  {copiado === t.token ? '✓ Copiado!' : '📋 Copiar link'}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ABA RESULTADOS */}
        {abaAtiva === 'resultados' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {totalRespondidos === 0 ? (
              <div style={{ background: '#0F2040', border: '1px solid #1C3558', borderRadius: '12px', padding: '60px', textAlign: 'center' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
                <div style={{ fontSize: '18px', fontWeight: 600, color: '#E8EDF5', marginBottom: '8px' }}>Nenhuma resposta ainda</div>
                <div style={{ fontSize: '14px', color: '#8FA4C0' }}>Envie os links pelo WhatsApp e aguarde as respostas</div>
              </div>
            ) : perguntas.map(pergunta => {
              const resultado = calcularResultados(pergunta)
              return (
                <div key={pergunta.id} style={{ background: '#0F2040', border: '1px solid #1C3558', borderRadius: '12px', padding: '24px' }}>
                  <div style={{ fontSize: '11px', color: '#C9A84C', fontWeight: 600, letterSpacing: '1px', marginBottom: '8px' }}>PERGUNTA {pergunta.ordem}</div>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#E8EDF5', marginBottom: '16px' }}>{pergunta.texto}</h3>

                  {!resultado ? (
                    <div style={{ fontSize: '13px', color: '#8FA4C0' }}>Sem respostas ainda</div>
                  ) : resultado.tipo === 'multipla_escolha' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {Object.entries(resultado.contagem ?? {}).map(([opcao, count]) => {
                        const pct = resultado.total > 0 ? Math.round((count / resultado.total) * 100) : 0
                        return (
                          <div key={opcao}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '13px' }}>
                              <span style={{ color: '#E8EDF5' }}>{opcao}</span>
                              <span style={{ color: '#C9A84C', fontWeight: 600 }}>{count} ({pct}%)</span>
                            </div>
                            <div style={{ height: '6px', background: '#1C3558', borderRadius: '3px', overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, #C9A84C, #E8C87A)', borderRadius: '3px' }} />
                            </div>
                          </div>
                        )
                      })}
                      <div style={{ fontSize: '12px', color: '#8FA4C0', marginTop: '4px' }}>{resultado.total} respostas</div>
                    </div>
                  ) : resultado.tipo === 'escala' ? (
                    <div>
                      <div style={{ fontSize: '32px', fontWeight: 700, color: '#C9A84C', marginBottom: '12px' }}>{resultado.media} <span style={{ fontSize: '14px', color: '#8FA4C0', fontWeight: 400 }}>/ 5.0</span></div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {Object.entries(resultado.contagem ?? {}).map(([val, count]) => (
                          <div key={val} style={{ flex: 1, textAlign: 'center' }}>
                            <div style={{ fontSize: '18px', fontWeight: 600, color: '#E8EDF5' }}>{count}</div>
                            <div style={{ fontSize: '11px', color: '#8FA4C0' }}>nota {val}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{ fontSize: '12px', color: '#8FA4C0', marginTop: '8px' }}>{resultado.total} respostas</div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {(resultado.respostas ?? []).map((r, i) => (
                        <div key={i} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid #1C3558', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#E8EDF5' }}>
                          "{r}"
                        </div>
                      ))}
                      <div style={{ fontSize: '12px', color: '#8FA4C0' }}>{resultado.total} respostas</div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
