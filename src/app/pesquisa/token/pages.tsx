'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams } from 'next/navigation'

type Pesquisa = { id: string; titulo: string; descricao: string; status: string }
type Pergunta = { id: string; texto: string; tipo: string; opcoes: string[] | null; ordem: number }
type TokenInfo = { id: string; pesquisa_id: string; respondente_nome: string; respondente_tipo: string; respondido: boolean }

export default function PesquisaPublicaPage() {
  const params = useParams()
  const supabase = createClient()
  const [pesquisa, setPesquisa] = useState<Pesquisa | null>(null)
  const [perguntas, setPerguntas] = useState<Pergunta[]>([])
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null)
  const [respostas, setRespostas] = useState<Record<string, string>>({})
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function carregar() {
      const token = params.token as string

      const { data: tok } = await supabase.from('pesquisa_tokens').select('*').eq('token', token).single()
      if (!tok) { setErro('Link inválido ou expirado.'); setLoading(false); return }
      if (tok.respondido) { setEnviado(true); setLoading(false); setTokenInfo(tok); return }
      setTokenInfo(tok)

      const { data: p } = await supabase.from('pesquisas').select('*').eq('id', tok.pesquisa_id).single()
      if (p) setPesquisa(p)

      const { data: perg } = await supabase.from('pesquisa_perguntas').select('*').eq('pesquisa_id', tok.pesquisa_id).order('ordem')
      if (perg) setPerguntas(perg)

      setLoading(false)
    }
    carregar()
  }, [params.token])

  async function handleEnviar(e: React.FormEvent) {
    e.preventDefault()
    if (perguntas.some(p => !respostas[p.id])) { setErro('Responda todas as perguntas antes de enviar.'); return }
    setEnviando(true); setErro('')

    const token = params.token as string

    const respostasParaSalvar = perguntas.map(p => ({
      pesquisa_id: tokenInfo!.pesquisa_id,
      pergunta_id: p.id,
      token,
      respondente_tipo: tokenInfo!.respondente_tipo,
      respondente_id: tokenInfo!.id,
      respondente_nome: tokenInfo!.respondente_nome,
      resposta: respostas[p.id],
    }))

    const { error } = await supabase.from('pesquisa_respostas').insert(respostasParaSalvar)
    if (error) { setErro('Erro ao enviar: ' + error.message); setEnviando(false); return }

    await supabase.from('pesquisa_tokens').update({ respondido: true, respondido_em: new Date().toISOString() }).eq('token', token)

    setEnviado(true)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0B1F3A', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#C9A84C', fontFamily: 'sans-serif' }}>
      Carregando pesquisa...
    </div>
  )

  if (erro && !tokenInfo) return (
    <div style={{ minHeight: '100vh', background: '#0B1F3A', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ background: '#0F2040', border: '1px solid rgba(192,57,43,0.3)', borderRadius: '16px', padding: '40px', maxWidth: '480px', textAlign: 'center', fontFamily: 'sans-serif' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>❌</div>
        <div style={{ fontSize: '18px', fontWeight: 600, color: '#E8EDF5', marginBottom: '8px' }}>Link inválido</div>
        <div style={{ fontSize: '14px', color: '#8FA4C0' }}>{erro}</div>
      </div>
    </div>
  )

  if (enviado) return (
    <div style={{ minHeight: '100vh', background: '#0B1F3A', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ background: '#0F2040', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '16px', padding: '48px', maxWidth: '480px', textAlign: 'center', fontFamily: 'sans-serif' }}>
        <div style={{ fontSize: '64px', marginBottom: '20px' }}>✅</div>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#FFFFFF', marginBottom: '12px' }}>Obrigado, {tokenInfo?.respondente_nome?.split(' ')[0]}!</h1>
        <p style={{ fontSize: '15px', color: '#8FA4C0', lineHeight: 1.6, marginBottom: '24px' }}>
          Suas respostas foram registradas com sucesso. Sua participação é fundamental para entendermos os desafios da sua região.
        </p>
        <div style={{ fontSize: '13px', color: '#C9A84C', fontWeight: 600 }}>CandMaps — Tecnologia que vence eleições</div>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#0B1F3A', fontFamily: "'IBM Plex Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600&display=swap" rel="stylesheet" />

      {/* HEADER */}
      <div style={{ background: 'rgba(11,31,58,0.97)', borderBottom: '1px solid rgba(201,168,76,0.15)', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ width: '32px', height: '32px', background: 'linear-gradient(135deg, #E8C87A, #A07830)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700, color: '#0B1F3A' }}>C</div>
        <span style={{ fontSize: '16px', fontWeight: 700, color: '#FFFFFF' }}>Cand<span style={{ color: '#C9A84C' }}>Maps</span></span>
      </div>

      <main style={{ maxWidth: '640px', margin: '0 auto', padding: '32px 24px 60px' }}>
        {/* INTRO */}
        <div style={{ background: 'rgba(201,168,76,0.05)', border: '1px solid rgba(201,168,76,0.15)', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '2px', color: '#C9A84C', textTransform: 'uppercase', marginBottom: '8px' }}>Pesquisa de Campo</div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#FFFFFF', marginBottom: '8px' }}>{pesquisa?.titulo}</h1>
          {pesquisa?.descricao && <p style={{ fontSize: '14px', color: '#8FA4C0', lineHeight: 1.6 }}>{pesquisa.descricao}</p>}
          <div style={{ marginTop: '12px', fontSize: '13px', color: '#8FA4C0' }}>
            Olá, <strong style={{ color: '#E8EDF5' }}>{tokenInfo?.respondente_nome}</strong>! Por favor, responda todas as perguntas abaixo.
          </div>
        </div>

        <form onSubmit={handleEnviar} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {perguntas.map((p, i) => (
            <div key={p.id} style={{ background: '#0F2040', border: '1px solid #1C3558', borderRadius: '12px', padding: '24px' }}>
              <div style={{ fontSize: '11px', color: '#C9A84C', fontWeight: 600, letterSpacing: '1px', marginBottom: '8px' }}>PERGUNTA {i + 1}</div>
              <p style={{ fontSize: '16px', fontWeight: 500, color: '#E8EDF5', marginBottom: '16px', lineHeight: 1.5 }}>{p.texto}</p>

              {p.tipo === 'multipla_escolha' && p.opcoes && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {p.opcoes.map(opcao => (
                    <label key={opcao} style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', padding: '12px 16px', borderRadius: '8px', border: `1px solid ${respostas[p.id] === opcao ? 'rgba(201,168,76,0.4)' : '#1C3558'}`, background: respostas[p.id] === opcao ? 'rgba(201,168,76,0.08)' : 'transparent', transition: 'all .15s' }}>
                      <input type="radio" name={p.id} value={opcao} checked={respostas[p.id] === opcao} onChange={() => setRespostas(prev => ({ ...prev, [p.id]: opcao }))} style={{ accentColor: '#C9A84C' }} />
                      <span style={{ fontSize: '14px', color: '#E8EDF5' }}>{opcao}</span>
                    </label>
                  ))}
                </div>
              )}

              {p.tipo === 'escala' && (
                <div>
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
                    {[1, 2, 3, 4, 5].map(n => (
                      <button key={n} type="button" onClick={() => setRespostas(prev => ({ ...prev, [p.id]: String(n) }))}
                        style={{ flex: 1, height: '52px', borderRadius: '8px', border: `1px solid ${respostas[p.id] === String(n) ? 'rgba(201,168,76,0.5)' : '#1C3558'}`, background: respostas[p.id] === String(n) ? 'rgba(201,168,76,0.15)' : 'transparent', color: respostas[p.id] === String(n) ? '#C9A84C' : '#8FA4C0', fontSize: '18px', fontWeight: 700, cursor: 'pointer', transition: 'all .15s' }}>
                        {n}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#8FA4C0' }}>
                    <span>Péssimo</span><span>Ótimo</span>
                  </div>
                </div>
              )}

              {p.tipo === 'texto_livre' && (
                <textarea value={respostas[p.id] || ''} onChange={e => setRespostas(prev => ({ ...prev, [p.id]: e.target.value }))}
                  placeholder="Escreva sua resposta aqui..." rows={4}
                  style={{ width: '100%', padding: '12px 14px', background: '#0B1F3A', border: '1px solid #1C3558', borderRadius: '8px', color: '#E8EDF5', fontSize: '14px', outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: "'IBM Plex Sans', sans-serif" }}
                  onFocus={e => e.target.style.borderColor = '#C9A84C'} onBlur={e => e.target.style.borderColor = '#1C3558'} />
              )}
            </div>
          ))}

          {erro && <div style={{ background: 'rgba(192,57,43,0.1)', border: '1px solid rgba(192,57,43,0.3)', borderRadius: '8px', padding: '12px 16px', fontSize: '13px', color: '#e74c3c' }}>{erro}</div>}

          <button type="submit" disabled={enviando}
            style={{ background: enviando ? 'rgba(201,168,76,0.5)' : 'linear-gradient(135deg, #E8C87A, #A07830)', border: 'none', borderRadius: '10px', color: '#0B1F3A', fontSize: '16px', fontWeight: 700, padding: '16px', cursor: enviando ? 'not-allowed' : 'pointer', width: '100%' }}>
            {enviando ? 'Enviando...' : 'Enviar respostas →'}
          </button>

          <div style={{ textAlign: 'center', fontSize: '12px', color: '#8FA4C0' }}>
            Suas respostas são confidenciais e usadas apenas para melhorar a campanha.
          </div>
        </form>
      </main>
    </div>
  )
}
