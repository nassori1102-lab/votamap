'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import { useIsMobile } from '@/lib/useIsMobile'

type Opcao = { id: string; texto: string; ordem: number }
type Pergunta = {
  id: string
  texto: string
  tipo: 'multipla_escolha' | 'texto_livre'
  obrigatoria: boolean
  ordem: number
  opcoes: Opcao[]
}
type Pesquisa = {
  id: string
  titulo: string
  descricao: string
  slug: string
  ativa: boolean
}

const inputStyle = {
  padding: '10px 14px', background: '#0B1F3A', border: '1px solid #1C3558',
  borderRadius: '8px', color: '#E8EDF5', fontSize: '14px', outline: 'none',
  fontFamily: "'IBM Plex Sans', sans-serif", width: '100%', boxSizing: 'border-box' as const,
}

export default function EditarPesquisaPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const supabase = createClient()
  const isMobile = useIsMobile()

  const [pesquisa, setPesquisa] = useState<Pesquisa | null>(null)
  const [perguntas, setPerguntas] = useState<Pergunta[]>([])
  const [loading, setLoading] = useState(true)
  const [salvandoMeta, setSalvandoMeta] = useState(false)
  const [linkCopiado, setLinkCopiado] = useState(false)
  const [perguntaAberta, setPerguntaAberta] = useState<string | null>(null)
  const [adicionandoPergunta, setAdicionandoPergunta] = useState(false)
  const [novaPerguntaTexto, setNovaPerguntaTexto] = useState('')
  const [novaPerguntaTipo, setNovaPerguntaTipo] = useState<'multipla_escolha' | 'texto_livre'>('multipla_escolha')
  const [novaOpcaoTexto, setNovaOpcaoTexto] = useState<Record<string, string>>({})

  useEffect(() => {
    async function carregar() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const [{ data: p }, { data: pergs }] = await Promise.all([
        supabase.from('pesquisas').select('*').eq('id', id).single(),
        supabase.from('perguntas').select('*, opcoes_resposta(*)').eq('pesquisa_id', id).order('ordem'),
      ])

      if (!p) { router.push('/dashboard/pesquisas'); return }
      setPesquisa(p)

      if (pergs) {
        const lista = pergs.map((perg: any) => ({
          ...perg,
          opcoes: (perg.opcoes_resposta || []).sort((a: Opcao, b: Opcao) => a.ordem - b.ordem),
        }))
        setPerguntas(lista)
      }
      setLoading(false)
    }
    carregar()
  }, [id])

  async function salvarMeta() {
    if (!pesquisa) return
    setSalvandoMeta(true)
    await supabase.from('pesquisas').update({
      titulo: pesquisa.titulo, descricao: pesquisa.descricao, ativa: pesquisa.ativa,
    }).eq('id', id)
    setSalvandoMeta(false)
  }

  async function adicionarPergunta() {
    if (!novaPerguntaTexto.trim()) return
    const ordem = perguntas.length
    const { data, error } = await supabase.from('perguntas').insert({
      pesquisa_id: id,
      texto: novaPerguntaTexto.trim(),
      tipo: novaPerguntaTipo,
      obrigatoria: true,
      ordem,
    }).select().single()

    if (!error && data) {
      const nova: Pergunta = { ...data, opcoes: [] }
      setPerguntas(prev => [...prev, nova])
      setPerguntaAberta(nova.id)
      setNovaPerguntaTexto('')
      setNovaPerguntaTipo('multipla_escolha')
      setAdicionandoPergunta(false)
    }
  }

  async function atualizarPergunta(pergId: string, campo: string, valor: any) {
    setPerguntas(prev => prev.map(p => p.id === pergId ? { ...p, [campo]: valor } : p))
    await supabase.from('perguntas').update({ [campo]: valor }).eq('id', pergId)
  }

  async function excluirPergunta(pergId: string) {
    if (!confirm('Excluir esta pergunta?')) return
    await supabase.from('perguntas').delete().eq('id', pergId)
    setPerguntas(prev => prev.filter(p => p.id !== pergId))
    if (perguntaAberta === pergId) setPerguntaAberta(null)
  }

  async function adicionarOpcao(pergId: string) {
    const texto = (novaOpcaoTexto[pergId] || '').trim()
    if (!texto) return
    const perg = perguntas.find(p => p.id === pergId)
    const ordem = perg?.opcoes.length || 0
    const { data, error } = await supabase.from('opcoes_resposta').insert({
      pergunta_id: pergId, texto, ordem,
    }).select().single()
    if (!error && data) {
      setPerguntas(prev => prev.map(p => p.id === pergId ? { ...p, opcoes: [...p.opcoes, data] } : p))
      setNovaOpcaoTexto(prev => ({ ...prev, [pergId]: '' }))
    }
  }

  async function excluirOpcao(pergId: string, opcaoId: string) {
    await supabase.from('opcoes_resposta').delete().eq('id', opcaoId)
    setPerguntas(prev => prev.map(p => p.id === pergId ? { ...p, opcoes: p.opcoes.filter(o => o.id !== opcaoId) } : p))
  }

  function copiarLink() {
    if (!pesquisa) return
    const url = `${window.location.origin}/pesquisa/${pesquisa.slug}`
    navigator.clipboard.writeText(url)
    setLinkCopiado(true)
    setTimeout(() => setLinkCopiado(false), 2500)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0B1F3A', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#C9A84C', fontFamily: "'IBM Plex Sans', sans-serif" }}>Carregando...</div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#0B1F3A', fontFamily: "'IBM Plex Sans', sans-serif" }}>
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 80px, rgba(201,168,76,0.02) 80px, rgba(201,168,76,0.02) 81px), repeating-linear-gradient(90deg, transparent, transparent 80px, rgba(201,168,76,0.02) 80px, rgba(201,168,76,0.02) 81px)` }} />

      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, height: '64px', background: 'rgba(11,31,58,0.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(201,168,76,0.15)', display: 'flex', alignItems: 'center', padding: isMobile ? '0 16px' : '0 32px', justifyContent: 'space-between', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={() => router.push('/dashboard/pesquisas')} style={{ background: 'transparent', border: 'none', color: '#8FA4C0', cursor: 'pointer', fontSize: '13px' }}>← Pesquisas</button>
          {!isMobile && <>
            <div style={{ width: '1px', height: '20px', background: '#1C3558' }} />
            <span style={{ fontFamily: "'Playfair Display', serif", fontSize: '18px', fontWeight: 800, color: '#FFFFFF' }}>Cand<span style={{ color: '#C9A84C' }}>Maps</span></span>
          </>}
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button onClick={copiarLink}
            style={{ background: linkCopiado ? 'rgba(134,239,172,0.15)' : 'rgba(107,163,214,0.1)', border: `1px solid ${linkCopiado ? 'rgba(134,239,172,0.3)' : 'rgba(107,163,214,0.2)'}`, borderRadius: '7px', color: linkCopiado ? '#86efac' : '#6ba3d6', fontSize: '12px', padding: '8px 14px', cursor: 'pointer', fontFamily: "'IBM Plex Sans', sans-serif", transition: 'all .2s' }}>
            {linkCopiado ? '✓ Copiado!' : '🔗 Copiar link'}
          </button>
          <button onClick={() => router.push(`/dashboard/pesquisas/${id}/resultados`)}
            style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '7px', color: '#C9A84C', fontSize: '12px', padding: '8px 14px', cursor: 'pointer', fontFamily: "'IBM Plex Sans', sans-serif" }}>
            📊 Resultados
          </button>
        </div>
      </nav>

      <main style={{ paddingTop: '88px', padding: isMobile ? '80px 16px 60px' : '88px 32px 60px', position: 'relative', zIndex: 1, maxWidth: '760px', margin: '0 auto' }}>

        {/* CONFIGURAÇÕES DA PESQUISA */}
        {pesquisa && (
          <div style={{ background: '#0F2040', border: '1px solid #1C3558', borderRadius: '12px', padding: '24px', marginBottom: '20px' }}>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '16px', fontWeight: 700, color: '#C9A84C', marginBottom: '16px', paddingBottom: '10px', borderBottom: '1px solid #1C3558' }}>
              Configurações da Pesquisa
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' as const, color: '#8FA4C0', display: 'block', marginBottom: '6px' }}>Título *</label>
                <input value={pesquisa.titulo} onChange={e => setPesquisa(p => p ? { ...p, titulo: e.target.value } : p)}
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#C9A84C'}
                  onBlur={e => e.target.style.borderColor = '#1C3558'} />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' as const, color: '#8FA4C0', display: 'block', marginBottom: '6px' }}>Descrição / introdução</label>
                <textarea value={pesquisa.descricao || ''} onChange={e => setPesquisa(p => p ? { ...p, descricao: e.target.value } : p)}
                  rows={3} placeholder="Texto que aparece no início do formulário para o apoiador..."
                  style={{ ...inputStyle, resize: 'vertical' as const }}
                  onFocus={e => e.target.style.borderColor = '#C9A84C'}
                  onBlur={e => e.target.style.borderColor = '#1C3558'} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <label style={{ fontSize: '12px', color: '#8FA4C0' }}>Link público:</label>
                  <code style={{ fontSize: '12px', color: '#6ba3d6', background: 'rgba(107,163,214,0.08)', padding: '3px 8px', borderRadius: '4px' }}>
                    /pesquisa/{pesquisa.slug}
                  </code>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: '#8FA4C0' }}>
                    <input type="checkbox" checked={pesquisa.ativa} onChange={e => setPesquisa(p => p ? { ...p, ativa: e.target.checked } : p)}
                      style={{ accentColor: '#C9A84C', width: '14px', height: '14px' }} />
                    Pesquisa ativa
                  </label>
                  <button onClick={salvarMeta} disabled={salvandoMeta}
                    style={{ background: 'linear-gradient(135deg, #E8C87A, #A07830)', border: 'none', borderRadius: '7px', color: '#0B1F3A', fontSize: '12px', fontWeight: 600, padding: '8px 16px', cursor: 'pointer', fontFamily: "'IBM Plex Sans', sans-serif" }}>
                    {salvandoMeta ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PERGUNTAS */}
        <div style={{ background: '#0F2040', border: '1px solid #1C3558', borderRadius: '12px', overflow: 'hidden', marginBottom: '16px' }}>
          <div style={{ padding: '18px 24px', borderBottom: '1px solid #1C3558', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '16px', fontWeight: 700, color: '#FFFFFF' }}>Perguntas ({perguntas.length})</h2>
            <button onClick={() => setAdicionandoPergunta(true)}
              style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '7px', color: '#C9A84C', fontSize: '12px', padding: '7px 14px', cursor: 'pointer', fontFamily: "'IBM Plex Sans', sans-serif" }}>
              + Pergunta
            </button>
          </div>

          {perguntas.length === 0 && !adicionandoPergunta ? (
            <div style={{ padding: '40px', textAlign: 'center' as const }}>
              <div style={{ fontSize: '36px', marginBottom: '12px' }}>❓</div>
              <div style={{ fontSize: '14px', color: '#8FA4C0', marginBottom: '16px' }}>Nenhuma pergunta ainda. Adicione a primeira!</div>
              <button onClick={() => setAdicionandoPergunta(true)} style={{ background: 'linear-gradient(135deg, #E8C87A, #A07830)', border: 'none', borderRadius: '8px', color: '#0B1F3A', fontSize: '13px', fontWeight: 600, padding: '10px 20px', cursor: 'pointer' }}>
                + Adicionar pergunta
              </button>
            </div>
          ) : (
            <div>
              {perguntas.map((perg, idx) => {
                const aberta = perguntaAberta === perg.id
                return (
                  <div key={perg.id} style={{ borderBottom: idx < perguntas.length - 1 || adicionandoPergunta ? '1px solid #1C3558' : 'none' }}>
                    {/* Cabeçalho da pergunta */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '16px 20px', cursor: 'pointer' }}
                      onClick={() => setPerguntaAberta(aberta ? null : perg.id)}>
                      <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: '#C9A84C', flexShrink: 0, marginTop: '2px' }}>
                        {idx + 1}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '14px', color: '#E8EDF5', fontWeight: 500 }}>{perg.texto || '(sem texto)'}</div>
                        <div style={{ fontSize: '11px', color: '#8FA4C0', marginTop: '2px' }}>
                          {perg.tipo === 'multipla_escolha' ? `Múltipla escolha · ${perg.opcoes.length} opção${perg.opcoes.length !== 1 ? 'ões' : ''}` : 'Texto livre'}
                          {perg.obrigatoria && <span style={{ marginLeft: '6px', color: '#e74c3c' }}>· obrigatória</span>}
                        </div>
                      </div>
                      <span style={{ fontSize: '11px', color: '#3D5470', flexShrink: 0 }}>{aberta ? '▲' : '▼'}</span>
                    </div>

                    {/* Editor da pergunta */}
                    {aberta && (
                      <div style={{ padding: '0 20px 20px 20px', borderTop: '1px solid rgba(28,53,88,0.5)', paddingTop: '16px' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          <div>
                            <label style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' as const, color: '#8FA4C0', display: 'block', marginBottom: '5px' }}>Texto da pergunta</label>
                            <textarea value={perg.texto} rows={2}
                              onChange={e => setPerguntas(prev => prev.map(p => p.id === perg.id ? { ...p, texto: e.target.value } : p))}
                              onBlur={e => atualizarPergunta(perg.id, 'texto', e.target.value)}
                              style={{ ...inputStyle, resize: 'vertical' as const }}
                              onFocus={e => e.target.style.borderColor = '#C9A84C'} />
                          </div>
                          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' as const }}>
                            <div style={{ flex: 1, minWidth: '160px' }}>
                              <label style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' as const, color: '#8FA4C0', display: 'block', marginBottom: '5px' }}>Tipo</label>
                              <select value={perg.tipo} onChange={e => atualizarPergunta(perg.id, 'tipo', e.target.value)}
                                style={{ ...inputStyle, cursor: 'pointer' }}
                                onFocus={e => e.target.style.borderColor = '#C9A84C'}
                                onBlur={e => e.target.style.borderColor = '#1C3558'}>
                                <option value="multipla_escolha">Múltipla escolha</option>
                                <option value="texto_livre">Texto livre</option>
                              </select>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '1px' }}>
                              <label style={{ display: 'flex', alignItems: 'center', gap: '7px', cursor: 'pointer', fontSize: '13px', color: '#8FA4C0' }}>
                                <input type="checkbox" checked={perg.obrigatoria}
                                  onChange={e => atualizarPergunta(perg.id, 'obrigatoria', e.target.checked)}
                                  style={{ accentColor: '#C9A84C', width: '14px', height: '14px' }} />
                                Obrigatória
                              </label>
                            </div>
                          </div>

                          {/* OPÇÕES (só para múltipla escolha) */}
                          {perg.tipo === 'multipla_escolha' && (
                            <div>
                              <label style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' as const, color: '#8FA4C0', display: 'block', marginBottom: '8px' }}>
                                Opções de resposta ({perg.opcoes.length})
                              </label>
                              {perg.opcoes.map((opc, oi) => (
                                <div key={opc.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#C9A84C', flexShrink: 0 }} />
                                  <span style={{ flex: 1, fontSize: '13px', color: '#E8EDF5', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', padding: '6px 10px', border: '1px solid #1C3558' }}>{opc.texto}</span>
                                  <button onClick={() => excluirOpcao(perg.id, opc.id)}
                                    style={{ background: 'none', border: 'none', color: '#3D5470', cursor: 'pointer', fontSize: '14px', padding: '0 4px', flexShrink: 0 }}
                                    onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = '#e74c3c'}
                                    onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = '#3D5470'}>
                                    ✕
                                  </button>
                                </div>
                              ))}
                              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                                <input value={novaOpcaoTexto[perg.id] || ''} placeholder="Nova opção..."
                                  onChange={e => setNovaOpcaoTexto(prev => ({ ...prev, [perg.id]: e.target.value }))}
                                  onKeyDown={e => e.key === 'Enter' && adicionarOpcao(perg.id)}
                                  style={{ ...inputStyle, width: 'auto', flex: 1 }}
                                  onFocus={e => e.target.style.borderColor = '#C9A84C'}
                                  onBlur={e => e.target.style.borderColor = '#1C3558'} />
                                <button onClick={() => adicionarOpcao(perg.id)}
                                  style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '7px', color: '#C9A84C', fontSize: '12px', padding: '8px 14px', cursor: 'pointer', fontFamily: "'IBM Plex Sans', sans-serif", whiteSpace: 'nowrap' as const }}>
                                  + Adicionar
                                </button>
                              </div>
                            </div>
                          )}

                          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <button onClick={() => excluirPergunta(perg.id)}
                              style={{ background: 'transparent', border: '1px solid rgba(192,57,43,0.25)', borderRadius: '6px', color: '#e74c3c', fontSize: '12px', padding: '6px 14px', cursor: 'pointer', fontFamily: "'IBM Plex Sans', sans-serif" }}>
                              🗑 Excluir pergunta
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Nova pergunta */}
              {adicionandoPergunta && (
                <div style={{ padding: '20px', borderTop: perguntas.length > 0 ? '1px solid #1C3558' : 'none', background: 'rgba(201,168,76,0.03)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <label style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' as const, color: '#C9A84C', display: 'block' }}>Nova pergunta</label>
                    <input autoFocus value={novaPerguntaTexto} onChange={e => setNovaPerguntaTexto(e.target.value)}
                      placeholder="Digite a pergunta..."
                      style={inputStyle}
                      onFocus={e => e.target.style.borderColor = '#C9A84C'}
                      onBlur={e => e.target.style.borderColor = '#1C3558'} />
                    <select value={novaPerguntaTipo} onChange={e => setNovaPerguntaTipo(e.target.value as any)}
                      style={{ ...inputStyle, cursor: 'pointer', width: 'auto', maxWidth: '220px' }}
                      onFocus={e => e.target.style.borderColor = '#C9A84C'}
                      onBlur={e => e.target.style.borderColor = '#1C3558'}>
                      <option value="multipla_escolha">Múltipla escolha</option>
                      <option value="texto_livre">Texto livre</option>
                    </select>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => { setAdicionandoPergunta(false); setNovaPerguntaTexto('') }}
                        style={{ background: 'transparent', border: '1px solid #1C3558', borderRadius: '7px', color: '#8FA4C0', fontSize: '12px', padding: '8px 14px', cursor: 'pointer', fontFamily: "'IBM Plex Sans', sans-serif" }}>
                        Cancelar
                      </button>
                      <button onClick={adicionarPergunta} disabled={!novaPerguntaTexto.trim()}
                        style={{ background: !novaPerguntaTexto.trim() ? 'rgba(201,168,76,0.3)' : 'linear-gradient(135deg, #E8C87A, #A07830)', border: 'none', borderRadius: '7px', color: '#0B1F3A', fontSize: '12px', fontWeight: 600, padding: '8px 18px', cursor: 'pointer', fontFamily: "'IBM Plex Sans', sans-serif" }}>
                        Adicionar
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* INFO */}
        <div style={{ background: 'rgba(107,163,214,0.06)', border: '1px solid rgba(107,163,214,0.12)', borderRadius: '10px', padding: '14px 18px', fontSize: '13px', color: '#8FA4C0', lineHeight: 1.6 }}>
          💡 As alterações nas perguntas são salvas automaticamente. Copie o link e envie para seus apoiadores preencherem.
          {pesquisa?.ativa === false && <span style={{ color: '#e74c3c', marginLeft: '6px' }}>⚠️ A pesquisa está inativa — o formulário não estará acessível.</span>}
        </div>
      </main>
    </div>
  )
}
