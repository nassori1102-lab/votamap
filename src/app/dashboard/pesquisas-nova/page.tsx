'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type Pergunta = {
  texto: string
  tipo: 'multipla_escolha' | 'texto_livre' | 'escala'
  opcoes: string[]
}

type Lider = { id: string; nome: string }

export default function NovaPesquisaPage() {
  const router = useRouter()
  const supabase = createClient()
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [lideres, setLideres] = useState<Lider[]>([])
  const [cidades, setCidades] = useState<string[]>([])
  const [bairros, setBairros] = useState<string[]>([])
  const [todosLocais, setTodosLocais] = useState<{cidade: string; bairro: string}[]>([])
  const [copiado, setCopiado] = useState<string | null>(null)

  const [form, setForm] = useState({
    titulo: '',
    descricao: '',
    segmentacao: 'todos',
    regiao: '',
    cidade: '',
    lider_ids: [] as string[],
  })

  const [perguntas, setPerguntas] = useState<Pergunta[]>([
    { texto: '', tipo: 'multipla_escolha', opcoes: ['', ''] }
  ])

  useEffect(() => {
    async function carregar() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data } = await supabase.from('lideres_regionais').select('id, nome').eq('ativo', true).order('nome')
      if (data) setLideres(data)
        const { data: bairrosLid } = await supabase.from('lideres_regionais').select('cidade, bairro').eq('ativo', true)
const { data: bairrosAp } = await supabase.from('apoiadores').select('cidade, bairro')
const todos = [...(bairrosLid || []), ...(bairrosAp || [])]
  .filter(b => b.cidade && b.bairro)
setTodosLocais(todos)
const cidadesUnicas = [...new Set(todos.map(b => b.cidade))].sort()
setCidades(cidadesUnicas)
    }
    carregar()
  }, [])

  function addPergunta() {
    setPerguntas(prev => [...prev, { texto: '', tipo: 'multipla_escolha', opcoes: ['', ''] }])
  }

  function removePergunta(i: number) {
    setPerguntas(prev => prev.filter((_, idx) => idx !== i))
  }

  function updatePergunta(i: number, campo: keyof Pergunta, valor: any) {
    setPerguntas(prev => prev.map((p, idx) => idx === i ? { ...p, [campo]: valor } : p))
  }

  function addOpcao(i: number) {
    setPerguntas(prev => prev.map((p, idx) => idx === i ? { ...p, opcoes: [...p.opcoes, ''] } : p))
  }

  function updateOpcao(pi: number, oi: number, valor: string) {
    setPerguntas(prev => prev.map((p, idx) => idx === pi ? { ...p, opcoes: p.opcoes.map((o, oidx) => oidx === oi ? valor : o) } : p))
  }

  function removeOpcao(pi: number, oi: number) {
    setPerguntas(prev => prev.map((p, idx) => idx === pi ? { ...p, opcoes: p.opcoes.filter((_, oidx) => oidx !== oi) } : p))
  }

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault()
    if (!form.titulo) { setErro('Informe o título da pesquisa'); return }
    if (perguntas.some(p => !p.texto)) { setErro('Preencha o texto de todas as perguntas'); return }
    setSalvando(true); setErro('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: pesquisa, error: erroPesquisa } = await supabase.from('pesquisas').insert({
      titulo: form.titulo,
      descricao: form.descricao,
      segmentacao: form.segmentacao,
      regiao: form.regiao || null,
      lider_id: form.lider_ids?.[0] || null,
      status: 'ativa',
    }).select().single()

    if (erroPesquisa || !pesquisa) { setErro('Erro ao criar pesquisa: ' + erroPesquisa?.message); setSalvando(false); return }

    const perguntasParaSalvar = perguntas.map((p, i) => ({
      pesquisa_id: pesquisa.id,
      ordem: i + 1,
      texto: p.texto,
      tipo: p.tipo,
      opcoes: p.tipo === 'multipla_escolha' ? p.opcoes.filter(o => o.trim()) : null,
    }))

    const { error: erroPerguntas } = await supabase.from('pesquisa_perguntas').insert(perguntasParaSalvar)
    if (erroPerguntas) { setErro('Erro ao salvar perguntas: ' + erroPerguntas.message); setSalvando(false); return }

    // Gerar tokens para destinatários
    let destinatarios: any[] = []

    if (form.segmentacao === 'lider' && form.lider_ids.length > 0) {
  const { data } = await supabase.from('lideres_regionais').select('id, nome').in('id', form.lider_ids)
  if (data) destinatarios = data.map((l: {id: string; nome: string}) => ({ respondente_tipo: 'lider', respondente_id: l.id, respondente_nome: l.nome }))
    } else if (form.segmentacao === 'regiao' && form.regiao) {
      let queryLids = supabase.from('lideres_regionais').select('id, nome').eq('cidade', form.cidade)
if (form.regiao) queryLids = queryLids.eq('bairro', form.regiao)
const { data: lids } = await queryLids

let queryAps = supabase.from('apoiadores').select('id, nome').eq('cidade', form.cidade)
if (form.regiao) queryAps = queryAps.eq('bairro', form.regiao)
const { data: aps } = await queryAps
      if (lids) destinatarios.push(...lids.map((l: {id: string; nome: string}) => ({ respondente_tipo: 'lider', respondente_id: l.id, respondente_nome: l.nome })))
      if (aps) destinatarios.push(...aps.map((a: {id: string; nome: string}) => ({ respondente_tipo: 'apoiador', respondente_id: a.id, respondente_nome: a.nome })))
    } else {
      const { data: lids } = await supabase.from('lideres_regionais').select('id, nome').eq('ativo', true)
      const { data: aps } = await supabase.from('apoiadores').select('id, nome')
      if (lids) destinatarios.push(...lids.map(l => ({ respondente_tipo: 'lider', respondente_id: l.id, respondente_nome: l.nome })))
      if (aps) destinatarios.push(...aps.map(a => ({ respondente_tipo: 'apoiador', respondente_id: a.id, respondente_nome: a.nome })))
    }

    if (destinatarios.length > 0) {
      const tokens = destinatarios.map(d => ({ pesquisa_id: pesquisa.id, ...d }))
      await supabase.from('pesquisa_tokens').insert(tokens)
    }

    router.push(`/dashboard/pesquisas/${pesquisa.id}`)
  }

  const inputStyle = { padding: '10px 14px', background: '#0B1F3A', border: '1px solid #1C3558', borderRadius: '8px', color: '#E8EDF5', fontSize: '14px', outline: 'none', fontFamily: "'IBM Plex Sans', sans-serif", width: '100%', boxSizing: 'border-box' as const }
  const labelStyle = { fontSize: '11px', fontWeight: 600 as const, letterSpacing: '1px', textTransform: 'uppercase' as const, color: '#8FA4C0', marginBottom: '6px', display: 'block' as const }

  return (
    <div style={{ minHeight: '100vh', background: '#0B1F3A', fontFamily: "'IBM Plex Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap" rel="stylesheet" />
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 80px, rgba(201,168,76,0.02) 80px, rgba(201,168,76,0.02) 81px)` }} />

      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, height: '64px', background: 'rgba(11,31,58,0.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(201,168,76,0.15)', display: 'flex', alignItems: 'center', padding: '0 32px' }}>
        <button onClick={() => router.push('/dashboard/pesquisas')} style={{ background: 'transparent', border: 'none', color: '#8FA4C0', cursor: 'pointer', fontSize: '13px' }}>← Voltar</button>
        <div style={{ width: '1px', height: '20px', background: '#1C3558', margin: '0 16px' }} />
        <span style={{ fontFamily: "'Playfair Display', serif", fontSize: '20px', fontWeight: 800, color: '#FFFFFF' }}>Cand<span style={{ color: '#C9A84C' }}>Maps</span></span>
      </nav>

      <main style={{ paddingTop: '88px', padding: '88px 32px 60px', position: 'relative', zIndex: 1, maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ marginBottom: '32px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '2.5px', textTransform: 'uppercase', color: '#C9A84C', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <span style={{ width: '24px', height: '1px', background: '#A07830', display: 'inline-block' }} />
            Nova Pesquisa
          </div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '28px', fontWeight: 800, color: '#FFFFFF' }}>Criar Pesquisa de Campo</h1>
        </div>

        <form onSubmit={handleSalvar} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* INFORMAÇÕES GERAIS */}
          <div style={{ background: '#0F2040', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '12px', padding: '28px' }}>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '17px', fontWeight: 700, color: '#C9A84C', marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid #1C3558' }}>Informações da Pesquisa</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={labelStyle}>Título *</label>
                <input value={form.titulo} onChange={e => setForm(p => ({ ...p, titulo: e.target.value }))} placeholder="Ex: Pesquisa de Demandas — Zona Norte" style={inputStyle} onFocus={e => e.target.style.borderColor = '#C9A84C'} onBlur={e => e.target.style.borderColor = '#1C3558'} />
              </div>
              <div>
                <label style={labelStyle}>Descrição</label>
                <textarea value={form.descricao} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))} placeholder="Objetivo desta pesquisa..." rows={2} style={{ ...inputStyle, resize: 'vertical' }} onFocus={e => e.target.style.borderColor = '#C9A84C'} onBlur={e => e.target.style.borderColor = '#1C3558'} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Segmentação *</label>
                  <select value={form.segmentacao} onChange={e => setForm(p => ({ ...p, segmentacao: e.target.value }))} style={{ ...inputStyle, cursor: 'pointer' }} onFocus={e => e.target.style.borderColor = '#C9A84C'} onBlur={e => e.target.style.borderColor = '#1C3558'}>
                    <option value="todos">Todos (líderes e apoiadores)</option>
                    <option value="regiao">Por região/bairro</option>
                    <option value="lider">Por líder específico</option>
                  </select>
                </div>
                {form.segmentacao === 'regiao' && (
  <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
    <div>
      <label style={labelStyle}>Cidade</label>
      <select
        value={form.cidade}
        onChange={e => {
          const cidade = e.target.value
          setForm(p => ({ ...p, cidade, regiao: '' }))
          const bairrosDaCidade = [...new Set(
            todosLocais.filter(l => l.cidade === cidade).map(l => l.bairro)
          )].sort()
          setBairros(bairrosDaCidade)
        }}
        style={{ ...inputStyle, cursor:'pointer', color: form.cidade ? '#E8EDF5' : '#8FA4C0' }}
        onFocus={e => e.target.style.borderColor = '#C9A84C'}
        onBlur={e => e.target.style.borderColor = '#1C3558'}>
        <option value="">Selecione a cidade</option>
        {cidades.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
    </div>
    {form.cidade && (
      <div>
        <label style={labelStyle}>Bairro</label>
        <select
          value={form.regiao}
          onChange={e => setForm(p => ({ ...p, regiao: e.target.value }))}
          style={{ ...inputStyle, cursor:'pointer', color: form.regiao ? '#E8EDF5' : '#8FA4C0' }}
          onFocus={e => e.target.style.borderColor = '#C9A84C'}
          onBlur={e => e.target.style.borderColor = '#1C3558'}>
          <option value="">Todos os bairros de {form.cidade}</option>
          {bairros.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
      </div>
    )}
  </div>
)}
                {form.segmentacao === 'lider' && (
                  <div>
  <label style={labelStyle}>Líderes</label>
  <div style={{ display:'flex', flexDirection:'column', gap:'6px', maxHeight:'200px', overflowY:'auto', padding:'4px' }}>
    {lideres.map(l => (
      <label key={l.id} style={{ display:'flex', alignItems:'center', gap:'10px', cursor:'pointer', padding:'8px 12px', borderRadius:'8px', border:`1px solid ${form.lider_ids.includes(l.id) ? 'rgba(201,168,76,0.4)' : '#1C3558'}`, background: form.lider_ids.includes(l.id) ? 'rgba(201,168,76,0.08)' : 'transparent' }}>
        <input type="checkbox" checked={form.lider_ids.includes(l.id)}
          onChange={e => setForm(p => ({ ...p, lider_ids: e.target.checked ? [...p.lider_ids, l.id] : p.lider_ids.filter(id => id !== l.id) }))}
          style={{ accentColor:'#C9A84C' }} />
        <span style={{ fontSize:'14px', color:'#E8EDF5' }}>{l.nome}</span>
      </label>
    ))}
  </div>
</div>
                )}
              </div>
            </div>
          </div>

          {/* PERGUNTAS */}
          <div style={{ background: '#0F2040', border: '1px solid #1C3558', borderRadius: '12px', padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid #1C3558' }}>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '17px', fontWeight: 700, color: '#C9A84C' }}>Perguntas ({perguntas.length})</h2>
              <button type="button" onClick={addPergunta} style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '8px', color: '#C9A84C', fontSize: '13px', padding: '8px 16px', cursor: 'pointer' }}>
                + Adicionar pergunta
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {perguntas.map((p, i) => (
                <div key={i} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid #1C3558', borderRadius: '10px', padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#C9A84C', letterSpacing: '1px' }}>PERGUNTA {i + 1}</span>
                    {perguntas.length > 1 && (
                      <button type="button" onClick={() => removePergunta(i)} style={{ background: 'transparent', border: 'none', color: '#e74c3c', cursor: 'pointer', fontSize: '13px' }}>✕ Remover</button>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <label style={labelStyle}>Texto da pergunta *</label>
                      <input value={p.texto} onChange={e => updatePergunta(i, 'texto', e.target.value)} placeholder="Ex: Qual o maior problema do seu bairro?" style={inputStyle} onFocus={e => e.target.style.borderColor = '#C9A84C'} onBlur={e => e.target.style.borderColor = '#1C3558'} />
                    </div>
                    <div>
                      <label style={labelStyle}>Tipo de resposta</label>
                      <select value={p.tipo} onChange={e => updatePergunta(i, 'tipo', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }} onFocus={e => e.target.style.borderColor = '#C9A84C'} onBlur={e => e.target.style.borderColor = '#1C3558'}>
                        <option value="multipla_escolha">Múltipla escolha</option>
                        <option value="texto_livre">Texto livre</option>
                        <option value="escala">Escala 1 a 5</option>
                      </select>
                    </div>
                    {p.tipo === 'multipla_escolha' && (
                      <div>
                        <label style={labelStyle}>Opções de resposta</label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {p.opcoes.map((o, oi) => (
                            <div key={oi} style={{ display: 'flex', gap: '8px' }}>
                              <input value={o} onChange={e => updateOpcao(i, oi, e.target.value)} placeholder={`Opção ${oi + 1}`} style={{ ...inputStyle, flex: 1 }} onFocus={e => e.target.style.borderColor = '#C9A84C'} onBlur={e => e.target.style.borderColor = '#1C3558'} />
                              {p.opcoes.length > 2 && (
                                <button type="button" onClick={() => removeOpcao(i, oi)} style={{ background: 'transparent', border: '1px solid #1C3558', borderRadius: '8px', color: '#e74c3c', cursor: 'pointer', padding: '0 12px' }}>✕</button>
                              )}
                            </div>
                          ))}
                          <button type="button" onClick={() => addOpcao(i)} style={{ background: 'transparent', border: '1px dashed #1C3558', borderRadius: '8px', color: '#8FA4C0', cursor: 'pointer', padding: '8px', fontSize: '13px' }}>
                            + Adicionar opção
                          </button>
                        </div>
                      </div>
                    )}
                    {p.tipo === 'escala' && (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {[1, 2, 3, 4, 5].map(n => (
                          <div key={n} style={{ width: '40px', height: '40px', borderRadius: '8px', border: '1px solid #1C3558', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8FA4C0', fontSize: '14px', fontWeight: 600 }}>{n}</div>
                        ))}
                        <span style={{ fontSize: '12px', color: '#8FA4C0', alignSelf: 'center', marginLeft: '8px' }}>1 = Péssimo · 5 = Ótimo</span>
                      </div>
                    )}
                    {p.tipo === 'texto_livre' && (
                      <div style={{ background: '#0B1F3A', border: '1px dashed #1C3558', borderRadius: '8px', padding: '12px', fontSize: '13px', color: '#8FA4C0' }}>
                        Campo de texto aberto — o respondente escreve livremente
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {erro && <div style={{ background: 'rgba(192,57,43,0.1)', border: '1px solid rgba(192,57,43,0.3)', borderRadius: '8px', padding: '12px 16px', fontSize: '13px', color: '#e74c3c' }}>{erro}</div>}

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => router.push('/dashboard/pesquisas')} style={{ background: 'transparent', border: '1px solid #1C3558', borderRadius: '8px', color: '#8FA4C0', fontSize: '14px', padding: '12px 24px', cursor: 'pointer' }}>Cancelar</button>
            <button type="submit" disabled={salvando} style={{ background: salvando ? 'rgba(201,168,76,0.5)' : 'linear-gradient(135deg, #E8C87A, #A07830)', border: 'none', borderRadius: '8px', color: '#0B1F3A', fontSize: '14px', fontWeight: 600, padding: '12px 32px', cursor: salvando ? 'not-allowed' : 'pointer' }}>
              {salvando ? 'Criando...' : 'Criar pesquisa e gerar links →'}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}
