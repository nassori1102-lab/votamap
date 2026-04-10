'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useIsMobile } from '@/lib/useIsMobile'

type Lider = { id: string; nome: string; cidade: string; estado: string }

type MetaLider = {
  id: string
  lider_id: string
  semana_inicio: string
  meta_apoiadores: number
  cidade_foco: string
  observacoes: string
  status: string
  criado_em: string
  lideres_regionais?: { nome: string; cidade: string; estado: string }
}

type MetaComProgresso = MetaLider & {
  realizado: number
  percentual: number
  liderNome: string
  liderCidade: string
}

function inicioSemana(data: Date): Date {
  const d = new Date(data)
  const dia = d.getDay()
  const diff = d.getDate() - dia + (dia === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function formatarSemana(iso: string): string {
  const d = new Date(iso + 'T12:00:00')
  const fim = new Date(d)
  fim.setDate(fim.getDate() + 6)
  return `${d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} – ${fim.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}`
}

export default function AcompanhamentoPage() {
  const router = useRouter()
  const supabase = createClient()
  const isMobile = useIsMobile()

  const [metas, setMetas] = useState<MetaComProgresso[]>([])
  const [lideres, setLideres] = useState<Lider[]>([])
  const [loading, setLoading] = useState(true)
  const [perfilUsuario, setPerfilUsuario] = useState('')
  const [semanaAtual, setSemanaAtual] = useState(() => inicioSemana(new Date()).toISOString().split('T')[0])
  const [modalAberto, setModalAberto] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')

  const [form, setForm] = useState({
    lider_id: '', meta_apoiadores: '', cidade_foco: '', observacoes: '', semana_inicio: semanaAtual,
  })

  const inputStyle = { padding: '10px 14px', background: '#0B1F3A', border: '1px solid #1C3558', borderRadius: '8px', color: '#E8EDF5', fontSize: '14px', outline: 'none', fontFamily: 'Inter, sans-serif', width: '100%', boxSizing: 'border-box' as const }
  const labelStyle = { fontSize: '11px', fontWeight: 600 as const, letterSpacing: '1px', textTransform: 'uppercase' as const, color: '#8FA4C0', marginBottom: '6px', display: 'block' as const }

  useEffect(() => {
    async function carregar() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const [{ data: perfil }, { data: lids }] = await Promise.all([
        supabase.from('usuarios').select('perfil').eq('id', user.id).single(),
        supabase.from('lideres_regionais').select('id, nome, cidade, estado').eq('ativo', true).order('nome'),
      ])

      setPerfilUsuario(perfil?.perfil || '')
      if (lids) setLideres(lids)
      await carregarMetas(semanaAtual)
      setLoading(false)
    }
    carregar()
  }, [])

  async function carregarMetas(semana: string) {
    setLoading(true)
    const fimSemana = new Date(semana + 'T00:00:00')
    fimSemana.setDate(fimSemana.getDate() + 7)
    const fimIso = fimSemana.toISOString().split('T')[0]

    const { data: metasData } = await supabase
      .from('metas_lider')
      .select('*, lideres_regionais(nome, cidade, estado)')
      .eq('semana_inicio', semana)
      .order('criado_em', { ascending: false })

    if (!metasData) { setMetas([]); setLoading(false); return }

    // Para cada meta, contar apoiadores reais no período
    const metasComProgresso: MetaComProgresso[] = await Promise.all(
      metasData.map(async (m) => {
        let q = supabase
          .from('apoiadores')
          .select('id', { count: 'exact', head: true })
          .eq('lider_id', m.lider_id)
          .gte('criado_em', semana + 'T00:00:00')
          .lt('criado_em', fimIso + 'T00:00:00')

        if (m.cidade_foco) {
          q = q.ilike('cidade', `%${m.cidade_foco}%`)
        }

        const { count } = await q
        const realizado = count || 0
        const percentual = m.meta_apoiadores > 0 ? Math.min(Math.round(realizado / m.meta_apoiadores * 100), 100) : 0
        const lr = m.lideres_regionais as { nome: string; cidade: string; estado: string } | null

        return {
          ...m,
          realizado,
          percentual,
          liderNome: lr?.nome || '—',
          liderCidade: lr?.cidade || '',
        }
      })
    )

    setMetas(metasComProgresso)
    setLoading(false)
  }

  function mudarSemana(direcao: number) {
    const d = new Date(semanaAtual + 'T12:00:00')
    d.setDate(d.getDate() + direcao * 7)
    const nova = d.toISOString().split('T')[0]
    setSemanaAtual(nova)
    setForm(p => ({ ...p, semana_inicio: nova }))
    carregarMetas(nova)
  }

  async function handleSalvar() {
    if (!form.lider_id) { setErro('Selecione o líder'); return }
    if (!form.meta_apoiadores || parseInt(form.meta_apoiadores) <= 0) { setErro('Informe a meta de apoiadores'); return }
    setSalvando(true); setErro('')

    const { error } = await supabase.from('metas_lider').insert({
      lider_id: form.lider_id,
      semana_inicio: form.semana_inicio,
      meta_apoiadores: parseInt(form.meta_apoiadores),
      cidade_foco: form.cidade_foco || null,
      observacoes: form.observacoes || null,
      status: 'ativa',
    })

    if (error) { setErro('Erro ao salvar: ' + error.message); setSalvando(false); return }

    await carregarMetas(semanaAtual)
    setModalAberto(false)
    setForm({ lider_id: '', meta_apoiadores: '', cidade_foco: '', observacoes: '', semana_inicio: semanaAtual })
    setSalvando(false)
    setSucesso('Meta criada com sucesso!')
    setTimeout(() => setSucesso(''), 3000)
  }

  async function handleExcluir(id: string) {
    if (!confirm('Remover esta meta?')) return
    await supabase.from('metas_lider').delete().eq('id', id)
    await carregarMetas(semanaAtual)
  }

  const podeCriar = ['coordenador'].includes(perfilUsuario)

  const totalMetas = metas.length
  const concluidas = metas.filter(m => m.percentual >= 100).length
  const mediaProgresso = totalMetas > 0 ? Math.round(metas.reduce((acc, m) => acc + m.percentual, 0) / totalMetas) : 0
  const totalMetaApoiadores = metas.reduce((acc, m) => acc + m.meta_apoiadores, 0)
  const totalRealizado = metas.reduce((acc, m) => acc + m.realizado, 0)

  const semanaAtualInicio = inicioSemana(new Date()).toISOString().split('T')[0]
  const isSemanaAtual = semanaAtual === semanaAtualInicio

  return (
    <div style={{ minHeight: '100vh', background: '#0B1F3A', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 80px, rgba(201,168,76,0.02) 80px, rgba(201,168,76,0.02) 81px), repeating-linear-gradient(90deg, transparent, transparent 80px, rgba(201,168,76,0.02) 80px, rgba(201,168,76,0.02) 81px)` }} />

      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, height: '60px', background: 'rgba(11,31,58,0.97)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(201,168,76,0.15)', display: 'flex', alignItems: 'center', padding: isMobile ? '0 16px' : '0 28px', justifyContent: 'space-between', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={() => router.push('/dashboard')} style={{ background: 'transparent', border: 'none', color: '#8FA4C0', cursor: 'pointer', fontSize: '13px', fontFamily: 'Inter, sans-serif' }}>← Voltar</button>
          <div style={{ width: '1px', height: '20px', background: '#1C3558' }} />
          <span style={{ fontSize: '17px', fontWeight: 700, color: '#FFFFFF', letterSpacing: '-0.3px' }}>Cand<span style={{ color: '#C9A84C' }}>Maps</span></span>
        </div>
        {podeCriar && (
          <button onClick={() => { setModalAberto(true); setErro('') }} style={{ background: 'linear-gradient(135deg, #E8C87A, #A07830)', border: 'none', borderRadius: '8px', color: '#0B1F3A', fontSize: '13px', fontWeight: 600, padding: '9px 18px', cursor: 'pointer', fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap' }}>
            + Nova Meta
          </button>
        )}
      </nav>

      <main style={{ paddingTop: '76px', padding: isMobile ? '76px 16px 40px' : '76px 28px 40px', position: 'relative', zIndex: 1, maxWidth: '1100px', margin: '0 auto' }}>

        {/* TÍTULO */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', color: '#C9A84C', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ width: '20px', height: '1px', background: '#A07830', display: 'inline-block' }} />
            Gestão de Líderes
          </div>
          <h1 style={{ fontSize: isMobile ? '22px' : '26px', fontWeight: 700, color: '#FFFFFF', letterSpacing: '-0.5px', marginBottom: '4px' }}>Acompanhamento Semanal</h1>
          <p style={{ fontSize: '14px', color: '#8FA4C0' }}>Metas de captação definidas por líder — acompanhe o progresso em tempo real</p>
        </div>

        {/* NAVEGAÇÃO DE SEMANA */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', background: '#0F2040', border: '1px solid #1C3558', borderRadius: '10px', padding: '12px 16px', width: 'fit-content' }}>
          <button onClick={() => mudarSemana(-1)} style={{ background: 'transparent', border: '1px solid #1C3558', borderRadius: '6px', color: '#8FA4C0', fontSize: '16px', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#E8EDF5' }}>{formatarSemana(semanaAtual)}</div>
            {isSemanaAtual && <div style={{ fontSize: '10px', color: '#C9A84C', fontWeight: 600, letterSpacing: '0.5px' }}>SEMANA ATUAL</div>}
          </div>
          <button onClick={() => mudarSemana(1)} disabled={isSemanaAtual} style={{ background: 'transparent', border: '1px solid #1C3558', borderRadius: '6px', color: isSemanaAtual ? '#1C3558' : '#8FA4C0', fontSize: '16px', width: '32px', height: '32px', cursor: isSemanaAtual ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
        </div>

        {sucesso && <div style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '8px', padding: '12px 16px', fontSize: '13px', color: '#C9A84C', marginBottom: '16px' }}>✓ {sucesso}</div>}

        {/* CARDS RESUMO */}
        {totalMetas > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
            {[
              { label: 'Metas ativas', valor: totalMetas.toString(), sub: 'líderes com meta esta semana', cor: '#C9A84C', icone: '📋' },
              { label: 'Meta total', valor: totalMetaApoiadores.toLocaleString('pt-BR'), sub: 'novos apoiadores esperados', cor: '#6ba3d6', icone: '🎯' },
              { label: 'Captados', valor: totalRealizado.toLocaleString('pt-BR'), sub: 'apoiadores já registrados', cor: '#86efac', icone: '✅' },
              { label: 'Progresso médio', valor: `${mediaProgresso}%`, sub: `${concluidas} de ${totalMetas} metas concluídas`, cor: concluidas === totalMetas ? '#86efac' : '#C9A84C', icone: '📊' },
            ].map(c => (
              <div key={c.label} style={{ background: '#0F2040', border: '1px solid #1C3558', borderRadius: '10px', padding: '16px' }}>
                <div style={{ fontSize: '20px', marginBottom: '8px' }}>{c.icone}</div>
                <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', color: '#8FA4C0' }}>{c.label}</div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: c.cor, margin: '4px 0' }}>{c.valor}</div>
                <div style={{ fontSize: '11px', color: '#8FA4C0' }}>{c.sub}</div>
              </div>
            ))}
          </div>
        )}

        {/* LISTA DE METAS */}
        {loading ? (
          <div style={{ color: '#C9A84C', fontSize: '14px' }}>Carregando...</div>
        ) : metas.length === 0 ? (
          <div style={{ background: '#0F2040', border: '1px solid #1C3558', borderRadius: '12px', padding: '60px', textAlign: 'center' as const }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
            <div style={{ fontSize: '18px', fontWeight: 600, color: '#E8EDF5', marginBottom: '8px' }}>Nenhuma meta para esta semana</div>
            <div style={{ fontSize: '14px', color: '#8FA4C0', marginBottom: '24px' }}>
              {podeCriar ? 'Defina metas de captação para cada líder regional.' : 'O coordenador ainda não definiu metas para esta semana.'}
            </div>
            {podeCriar && (
              <button onClick={() => setModalAberto(true)} style={{ background: 'linear-gradient(135deg, #E8C87A, #A07830)', border: 'none', borderRadius: '8px', color: '#0B1F3A', fontSize: '14px', fontWeight: 600, padding: '12px 28px', cursor: 'pointer' }}>
                + Criar primeira meta
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {metas
              .sort((a, b) => b.percentual - a.percentual)
              .map(m => {
                const cor = m.percentual >= 100 ? '#86efac' : m.percentual >= 75 ? '#C9A84C' : m.percentual >= 40 ? '#6ba3d6' : '#e74c3c'
                const corBg = m.percentual >= 100 ? 'rgba(34,197,94,0.08)' : m.percentual >= 75 ? 'rgba(201,168,76,0.06)' : m.percentual >= 40 ? 'rgba(107,163,214,0.06)' : 'rgba(192,57,43,0.06)'
                return (
                  <div key={m.id} style={{ background: '#0F2040', border: `1px solid ${m.percentual >= 100 ? 'rgba(34,197,94,0.2)' : '#1C3558'}`, borderRadius: '12px', padding: isMobile ? '16px' : '20px 24px', position: 'relative' }}>
                    {m.percentual >= 100 && (
                      <div style={{ position: 'absolute', top: '12px', right: '12px', fontSize: '10px', fontWeight: 600, padding: '3px 10px', borderRadius: '100px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', color: '#86efac' }}>
                        ✓ CONCLUÍDA
                      </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '16px' }}>
                      <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 700, color: '#C9A84C', flexShrink: 0 }}>
                        {m.liderNome.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '15px', fontWeight: 600, color: '#E8EDF5', marginBottom: '2px' }}>{m.liderNome}</div>
                        <div style={{ fontSize: '12px', color: '#8FA4C0' }}>
                          {m.liderCidade}
                          {m.cidade_foco && m.cidade_foco !== m.liderCidade && (
                            <span style={{ marginLeft: '6px', color: '#6ba3d6' }}>· foco: {m.cidade_foco}</span>
                          )}
                        </div>
                        {m.observacoes && <div style={{ fontSize: '12px', color: '#8FA4C0', marginTop: '4px', fontStyle: 'italic' }}>{m.observacoes}</div>}
                      </div>
                    </div>

                    {/* PROGRESSO */}
                    <div style={{ background: corBg, borderRadius: '8px', padding: '12px 16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                          <span style={{ fontSize: '22px', fontWeight: 700, color: cor }}>{m.realizado}</span>
                          <span style={{ fontSize: '13px', color: '#8FA4C0' }}>de {m.meta_apoiadores} apoiadores</span>
                        </div>
                        <span style={{ fontSize: '16px', fontWeight: 700, color: cor }}>{m.percentual}%</span>
                      </div>
                      <div style={{ height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${m.percentual}%`, background: cor, borderRadius: '4px', transition: 'width 0.5s ease' }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#8FA4C0', marginTop: '6px' }}>
                        <span>{m.meta_apoiadores - m.realizado > 0 ? `Faltam ${(m.meta_apoiadores - m.realizado).toLocaleString('pt-BR')} apoiadores` : 'Meta atingida!'}</span>
                        <button onClick={() => router.push(`/dashboard/apoiadores?lider=${m.lider_id}`)} style={{ background: 'none', border: 'none', color: '#6ba3d6', fontSize: '11px', cursor: 'pointer', fontFamily: 'Inter, sans-serif', padding: 0 }}>
                          Ver apoiadores →
                        </button>
                      </div>
                    </div>

                    {podeCriar && (
                      <button onClick={() => handleExcluir(m.id)} style={{ position: 'absolute', bottom: '16px', right: '16px', background: 'transparent', border: 'none', color: '#3D5470', fontSize: '12px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
                        onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = '#e74c3c'}
                        onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = '#3D5470'}>
                        remover
                      </button>
                    )}
                  </div>
                )
              })}
          </div>
        )}
      </main>

      {/* MODAL */}
      {modalAberto && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ background: '#0F2040', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '480px', position: 'relative' }}>
            <div style={{ position: 'absolute', top: 0, left: '10%', right: '10%', height: '1px', background: 'linear-gradient(90deg, transparent, #C9A84C, transparent)' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#FFFFFF' }}>Nova Meta Semanal</h2>
              <button onClick={() => setModalAberto(false)} style={{ background: 'transparent', border: 'none', color: '#8FA4C0', cursor: 'pointer', fontSize: '20px' }}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

              <div>
                <label style={labelStyle}>Semana *</label>
                <input type="date" value={form.semana_inicio} onChange={e => setForm(p => ({ ...p, semana_inicio: e.target.value }))} style={inputStyle} onFocus={e => e.target.style.borderColor = '#C9A84C'} onBlur={e => e.target.style.borderColor = '#1C3558'} />
                <div style={{ fontSize: '11px', color: '#3D5470', marginTop: '4px' }}>Início da semana (segunda-feira recomendado)</div>
              </div>

              <div>
                <label style={labelStyle}>Líder Regional *</label>
                <select value={form.lider_id} onChange={e => setForm(p => ({ ...p, lider_id: e.target.value }))} style={{ ...inputStyle, cursor: 'pointer' }} onFocus={e => e.target.style.borderColor = '#C9A84C'} onBlur={e => e.target.style.borderColor = '#1C3558'}>
                  <option value="">Selecione o líder...</option>
                  {lideres.map(l => <option key={l.id} value={l.id}>{l.nome} — {l.cidade}/{l.estado}</option>)}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Meta (apoiadores) *</label>
                  <input type="number" min="1" value={form.meta_apoiadores} onChange={e => setForm(p => ({ ...p, meta_apoiadores: e.target.value }))} placeholder="Ex: 100" style={inputStyle} onFocus={e => e.target.style.borderColor = '#C9A84C'} onBlur={e => e.target.style.borderColor = '#1C3558'} />
                </div>
                <div>
                  <label style={labelStyle}>Cidade foco</label>
                  <input value={form.cidade_foco} onChange={e => setForm(p => ({ ...p, cidade_foco: e.target.value }))} placeholder="Ex: Diadema" style={inputStyle} onFocus={e => e.target.style.borderColor = '#C9A84C'} onBlur={e => e.target.style.borderColor = '#1C3558'} />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Observações</label>
                <textarea value={form.observacoes} onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))} placeholder="Instruções ou contexto para o líder..." rows={3} style={{ ...inputStyle, resize: 'vertical' as const }} onFocus={e => e.target.style.borderColor = '#C9A84C'} onBlur={e => e.target.style.borderColor = '#1C3558'} />
              </div>

              <div style={{ background: 'rgba(107,163,214,0.06)', border: '1px solid rgba(107,163,214,0.15)', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', color: '#8FA4C0', lineHeight: 1.6 }}>
                💡 O progresso é calculado automaticamente com base nos apoiadores cadastrados pelo líder no período.
                {form.cidade_foco && <strong style={{ color: '#6ba3d6' }}> Contando apenas apoiadores de {form.cidade_foco}.</strong>}
              </div>

              {erro && <div style={{ background: 'rgba(192,57,43,0.1)', border: '1px solid rgba(192,57,43,0.3)', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#e74c3c' }}>{erro}</div>}

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
                <button onClick={() => setModalAberto(false)} style={{ background: 'transparent', border: '1px solid #1C3558', borderRadius: '8px', color: '#8FA4C0', fontSize: '13px', padding: '10px 20px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>Cancelar</button>
                <button onClick={handleSalvar} disabled={salvando} style={{ background: salvando ? 'rgba(201,168,76,0.4)' : 'linear-gradient(135deg, #E8C87A, #A07830)', border: 'none', borderRadius: '8px', color: '#0B1F3A', fontSize: '13px', fontWeight: 600, padding: '10px 24px', cursor: salvando ? 'not-allowed' : 'pointer', fontFamily: 'Inter, sans-serif' }}>
                  {salvando ? 'Salvando...' : 'Criar meta →'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
