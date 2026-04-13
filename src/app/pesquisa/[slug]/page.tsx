'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams } from 'next/navigation'

type Opcao = { id: string; texto: string; ordem: number }
type Pergunta = { id: string; texto: string; tipo: string; obrigatoria: boolean; opcoes: Opcao[] }
type Pesquisa = { id: string; titulo: string; descricao: string }

export default function FormularioPesquisaPage() {
  const params = useParams()
  const slug = params.slug as string
  const supabase = createClient()

  const [pesquisa, setPesquisa] = useState<Pesquisa | null>(null)
  const [perguntas, setPerguntas] = useState<Pergunta[]>([])
  const [loading, setLoading] = useState(true)
  const [naoEncontrada, setNaoEncontrada] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [erro, setErro] = useState('')

  // Dados do respondente
  const [perfil, setPerfil] = useState({ nome: '', idade: '', genero: '', bairro: '', cidade: '' })

  // Respostas: { [perguntaId]: opcaoId | '' (para texto_livre usa chave diferente) }
  const [respostas, setRespostas] = useState<Record<string, string>>({})
  const [textosLivres, setTextosLivres] = useState<Record<string, string>>({})

  useEffect(() => {
    async function carregar() {
      const { data: p } = await supabase
        .from('pesquisas').select('id, titulo, descricao').eq('slug', slug).eq('ativa', true).single()

      if (!p) { setNaoEncontrada(true); setLoading(false); return }
      setPesquisa(p)

      const { data: pergs } = await supabase
        .from('perguntas').select('*, opcoes_resposta(*)').eq('pesquisa_id', p.id).order('ordem')

      if (pergs) {
        setPerguntas(pergs.map((pg: any) => ({
          ...pg,
          opcoes: (pg.opcoes_resposta || []).sort((a: Opcao, b: Opcao) => a.ordem - b.ordem),
        })))
      }
      setLoading(false)
    }
    carregar()
  }, [slug])

  async function handleEnviar(e: React.FormEvent) {
    e.preventDefault()
    setErro('')

    // Validar obrigatórias
    for (const p of perguntas) {
      if (!p.obrigatoria) continue
      if (p.tipo === 'multipla_escolha' && !respostas[p.id]) {
        setErro(`Por favor, responda a pergunta: "${p.texto}"`)
        return
      }
      if (p.tipo === 'texto_livre' && !textosLivres[p.id]?.trim()) {
        setErro(`Por favor, responda a pergunta: "${p.texto}"`)
        return
      }
    }

    setEnviando(true)

    const respostasArray = perguntas.map(p => ({
      pergunta_id: p.id,
      opcao_id: p.tipo === 'multipla_escolha' ? (respostas[p.id] || null) : null,
      texto_livre: p.tipo === 'texto_livre' ? (textosLivres[p.id] || null) : null,
    })).filter(r => r.opcao_id || r.texto_livre)

    const res = await fetch('/api/pesquisa/responder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pesquisa_id: pesquisa!.id,
        nome: perfil.nome || null,
        idade: perfil.idade || null,
        genero: perfil.genero || null,
        bairro: perfil.bairro || null,
        cidade: perfil.cidade || null,
        respostas: respostasArray,
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      setErro('Erro ao enviar: ' + (data.error || 'Tente novamente.'))
      setEnviando(false)
      return
    }

    setEnviado(true)
    setEnviando(false)
  }

  const inputStyle: React.CSSProperties = {
    padding: '11px 14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px', color: '#E8EDF5', fontSize: '14px', outline: 'none',
    fontFamily: "'IBM Plex Sans', sans-serif", width: '100%', boxSizing: 'border-box',
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0B1F3A', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#C9A84C', fontFamily: "'IBM Plex Sans', sans-serif", fontSize: '16px' }}>
      Carregando...
    </div>
  )

  if (naoEncontrada) return (
    <div style={{ minHeight: '100vh', background: '#0B1F3A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'IBM Plex Sans', sans-serif", padding: '24px' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>🔍</div>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '24px', fontWeight: 800, color: '#FFFFFF', marginBottom: '8px' }}>Pesquisa não encontrada</h1>
        <p style={{ fontSize: '14px', color: '#8FA4C0' }}>Esta pesquisa não existe ou não está mais disponível.</p>
      </div>
    </div>
  )

  if (enviado) return (
    <div style={{ minHeight: '100vh', background: '#0B1F3A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'IBM Plex Sans', sans-serif", padding: '24px' }}>
      <div style={{ textAlign: 'center', maxWidth: '480px' }}>
        <div style={{ fontSize: '64px', marginBottom: '20px' }}>🎉</div>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '28px', fontWeight: 800, color: '#FFFFFF', marginBottom: '12px' }}>Obrigado pela sua participação!</h1>
        <p style={{ fontSize: '15px', color: '#8FA4C0', lineHeight: 1.6, marginBottom: '24px' }}>
          Sua resposta foi registrada com sucesso. As suas opiniões são muito importantes para a nossa campanha.
        </p>
        <div style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '10px', padding: '16px', fontSize: '13px', color: '#C9A84C' }}>
          Juntos construímos uma candidatura mais próxima da realidade do nosso povo.
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#0B1F3A', fontFamily: "'IBM Plex Sans', sans-serif" }}>
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 80px, rgba(201,168,76,0.02) 80px, rgba(201,168,76,0.02) 81px)` }} />

      {/* HEADER */}
      <div style={{ background: 'rgba(11,31,58,0.97)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(201,168,76,0.15)', padding: '20px 24px', position: 'relative', zIndex: 10 }}>
        <div style={{ maxWidth: '680px', margin: '0 auto' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase' as const, color: '#C9A84C', marginBottom: '6px' }}>
            Pesquisa de Campanha
          </div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '22px', fontWeight: 800, color: '#FFFFFF', marginBottom: pesquisa?.descricao ? '8px' : '0' }}>
            {pesquisa?.titulo}
          </h1>
          {pesquisa?.descricao && (
            <p style={{ fontSize: '14px', color: '#8FA4C0', lineHeight: 1.6 }}>{pesquisa.descricao}</p>
          )}
        </div>
      </div>

      <main style={{ padding: '32px 24px 60px', position: 'relative', zIndex: 1, maxWidth: '680px', margin: '0 auto' }}>
        <form onSubmit={handleEnviar}>

          {/* DADOS PESSOAIS (opcionais, exceto o que for marcado) */}
          <div style={{ background: '#0F2040', border: '1px solid #1C3558', borderRadius: '12px', padding: '20px 24px', marginBottom: '16px' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase' as const, color: '#8FA4C0', marginBottom: '14px' }}>
              Seus dados (opcional)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: '11px', color: '#8FA4C0', display: 'block', marginBottom: '5px' }}>Seu nome</label>
                <input value={perfil.nome} onChange={e => setPerfil(p => ({ ...p, nome: e.target.value }))}
                  placeholder="Nome completo"
                  style={inputStyle}
                  onFocus={e => (e.target as HTMLInputElement).style.borderColor = '#C9A84C'}
                  onBlur={e => (e.target as HTMLInputElement).style.borderColor = 'rgba(255,255,255,0.1)'} />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#8FA4C0', display: 'block', marginBottom: '5px' }}>Idade</label>
                <input type="number" min="1" max="120" value={perfil.idade}
                  onChange={e => setPerfil(p => ({ ...p, idade: e.target.value }))}
                  placeholder="Ex: 35"
                  style={inputStyle}
                  onFocus={e => (e.target as HTMLInputElement).style.borderColor = '#C9A84C'}
                  onBlur={e => (e.target as HTMLInputElement).style.borderColor = 'rgba(255,255,255,0.1)'} />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#8FA4C0', display: 'block', marginBottom: '5px' }}>Gênero</label>
                <select value={perfil.genero} onChange={e => setPerfil(p => ({ ...p, genero: e.target.value }))}
                  style={{ ...inputStyle, cursor: 'pointer' }}
                  onFocus={e => (e.target as HTMLSelectElement).style.borderColor = '#C9A84C'}
                  onBlur={e => (e.target as HTMLSelectElement).style.borderColor = 'rgba(255,255,255,0.1)'}>
                  <option value="">Prefiro não dizer</option>
                  <option value="Feminino">Feminino</option>
                  <option value="Masculino">Masculino</option>
                  <option value="Não binário">Não binário</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#8FA4C0', display: 'block', marginBottom: '5px' }}>Bairro</label>
                <input value={perfil.bairro} onChange={e => setPerfil(p => ({ ...p, bairro: e.target.value }))}
                  placeholder="Seu bairro"
                  style={inputStyle}
                  onFocus={e => (e.target as HTMLInputElement).style.borderColor = '#C9A84C'}
                  onBlur={e => (e.target as HTMLInputElement).style.borderColor = 'rgba(255,255,255,0.1)'} />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#8FA4C0', display: 'block', marginBottom: '5px' }}>Cidade</label>
                <input value={perfil.cidade} onChange={e => setPerfil(p => ({ ...p, cidade: e.target.value }))}
                  placeholder="Sua cidade"
                  style={inputStyle}
                  onFocus={e => (e.target as HTMLInputElement).style.borderColor = '#C9A84C'}
                  onBlur={e => (e.target as HTMLInputElement).style.borderColor = 'rgba(255,255,255,0.1)'} />
              </div>
            </div>
          </div>

          {/* PERGUNTAS */}
          {perguntas.map((perg, idx) => (
            <div key={perg.id} style={{ background: '#0F2040', border: '1px solid #1C3558', borderRadius: '12px', padding: '20px 24px', marginBottom: '12px' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#E8EDF5', marginBottom: '14px', lineHeight: 1.5 }}>
                <span style={{ color: '#C9A84C', marginRight: '8px' }}>{idx + 1}.</span>
                {perg.texto}
                {perg.obrigatoria && <span style={{ color: '#e74c3c', marginLeft: '4px' }}>*</span>}
              </div>

              {perg.tipo === 'multipla_escolha' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {perg.opcoes.map(opc => {
                    const selecionada = respostas[perg.id] === opc.id
                    return (
                      <label key={opc.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', padding: '10px 14px', borderRadius: '8px', border: `1px solid ${selecionada ? 'rgba(201,168,76,0.4)' : 'rgba(255,255,255,0.06)'}`, background: selecionada ? 'rgba(201,168,76,0.08)' : 'rgba(255,255,255,0.01)', transition: 'all .15s' }}>
                        <input type="radio" name={`perg-${perg.id}`} value={opc.id}
                          checked={selecionada}
                          onChange={() => setRespostas(prev => ({ ...prev, [perg.id]: opc.id }))}
                          style={{ accentColor: '#C9A84C', width: '16px', height: '16px', flexShrink: 0 }} />
                        <span style={{ fontSize: '14px', color: selecionada ? '#E8EDF5' : '#8FA4C0' }}>{opc.texto}</span>
                      </label>
                    )
                  })}
                </div>
              ) : (
                <textarea value={textosLivres[perg.id] || ''} rows={3}
                  placeholder="Digite sua resposta aqui..."
                  onChange={e => setTextosLivres(prev => ({ ...prev, [perg.id]: e.target.value }))}
                  style={{ ...inputStyle, resize: 'vertical' as const }}
                  onFocus={e => (e.target as HTMLTextAreaElement).style.borderColor = '#C9A84C'}
                  onBlur={e => (e.target as HTMLTextAreaElement).style.borderColor = 'rgba(255,255,255,0.1)'} />
              )}
            </div>
          ))}

          {erro && (
            <div style={{ background: 'rgba(192,57,43,0.1)', border: '1px solid rgba(192,57,43,0.3)', borderRadius: '8px', padding: '12px 16px', fontSize: '13px', color: '#e74c3c', marginBottom: '16px' }}>
              {erro}
            </div>
          )}

          <button type="submit" disabled={enviando}
            style={{ width: '100%', background: enviando ? 'rgba(201,168,76,0.5)' : 'linear-gradient(135deg, #E8C87A, #A07830)', border: 'none', borderRadius: '10px', color: '#0B1F3A', fontSize: '15px', fontWeight: 700, padding: '16px', cursor: enviando ? 'not-allowed' : 'pointer', fontFamily: "'IBM Plex Sans', sans-serif", letterSpacing: '0.3px' }}>
            {enviando ? 'Enviando...' : 'Enviar resposta →'}
          </button>

          <div style={{ fontSize: '11px', color: '#3D5470', textAlign: 'center' as const, marginTop: '12px' }}>
            Suas respostas são anônimas e serão usadas apenas para fins eleitorais.
          </div>
        </form>
      </main>
    </div>
  )
}
