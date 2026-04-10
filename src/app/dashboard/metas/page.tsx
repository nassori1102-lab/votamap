'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useIsMobile } from '@/lib/useIsMobile'

type LiderMeta = {
  id: string
  nome: string
  cidade: string
  estado: string
  zona_eleitoral: string
  meta_votos: number
  ativo: boolean
  foto_url?: string
}

type ApoiadorEstimativa = {
  id: string
  nome: string
  meta_votos: number
  lider_id: string
  cidade: string
  zona_eleitoral: string
}

type CidadeResumo = {
  cidade: string
  estado: string
  lideres: number
  comMeta: number
  metaTotal: number
}

type LiderGrupo = {
  id: string
  nome: string
  foto_url?: string
  apoiadores: ApoiadorEstimativa[]
  totalEstimativa: number
  comEstimativa: number
}

const labelStyle = { fontSize: '11px', fontWeight: 600 as const, letterSpacing: '1px', textTransform: 'uppercase' as const, color: '#8FA4C0' }

export default function MetasPage() {
  const router = useRouter()
  const supabase = createClient()
  const isMobile = useIsMobile()
  const [lideres, setLideres] = useState<LiderMeta[]>([])
  const [apoiadores, setApoiadores] = useState<ApoiadorEstimativa[]>([])
  const [loading, setLoading] = useState(true)
  const [cidades, setCidades] = useState<CidadeResumo[]>([])
  const [lideresSemMeta, setLideresSemMeta] = useState<LiderMeta[]>([])
  const [verLideresSemMeta, setVerLideresSemMeta] = useState(false)
  const [gruposLider, setGruposLider] = useState<LiderGrupo[]>([])
  const [grupoAberto, setGrupoAberto] = useState<string | null>(null)
  const [secaoAtiva, setSecaoAtiva] = useState<'lideres' | 'apoiadores'>('lideres')

  useEffect(() => {
    async function carregar() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const [{ data: lids }, { data: apois }] = await Promise.all([
        supabase.from('lideres_regionais').select('id, nome, cidade, estado, zona_eleitoral, meta_votos, ativo, foto_url').eq('ativo', true).order('cidade'),
        supabase.from('apoiadores').select('id, nome, meta_votos, lider_id, cidade, zona_eleitoral').order('nome'),
      ])

      if (lids) {
        setLideres(lids)

        const mapa = new Map<string, CidadeResumo>()
        const semMetaLista: LiderMeta[] = []

        for (const l of lids) {
          if (!l.meta_votos || l.meta_votos === 0) semMetaLista.push(l)
          const chave = `${l.cidade}/${l.estado}`
          const atual = mapa.get(chave) || { cidade: l.cidade || '—', estado: l.estado || '', lideres: 0, comMeta: 0, metaTotal: 0 }
          atual.lideres++
          if (l.meta_votos > 0) { atual.comMeta++; atual.metaTotal += l.meta_votos }
          mapa.set(chave, atual)
        }
        setCidades(Array.from(mapa.values()).sort((a, b) => `${a.cidade}/${a.estado}`.localeCompare(`${b.cidade}/${b.estado}`)))
        setLideresSemMeta(semMetaLista)

        // Agrupar apoiadores por líder
        if (apois) {
          setApoiadores(apois)
          const mapaLider = new Map<string, LiderGrupo>()
          // Inicializar com todos os líderes (mesmo sem apoiadores)
          for (const l of lids) {
            mapaLider.set(l.id, { id: l.id, nome: l.nome, foto_url: l.foto_url || undefined, apoiadores: [], totalEstimativa: 0, comEstimativa: 0 })
          }
          // Apoiadores sem líder
          mapaLider.set('sem_lider', { id: 'sem_lider', nome: 'Sem líder definido', apoiadores: [], totalEstimativa: 0, comEstimativa: 0 })

          for (const a of apois) {
            const chave = a.lider_id || 'sem_lider'
            const grupo = mapaLider.get(chave)
            if (grupo) {
              grupo.apoiadores.push(a)
              if (a.meta_votos > 0) { grupo.totalEstimativa += a.meta_votos; grupo.comEstimativa++ }
            }
          }
          // Ordenar grupos: primeiro com estimativa, depois pelo nome do líder
          const grupos = Array.from(mapaLider.values())
            .filter(g => g.apoiadores.length > 0)
            .sort((a, b) => b.totalEstimativa - a.totalEstimativa)
          setGruposLider(grupos)
        }
      }
      setLoading(false)
    }
    carregar()
  }, [])

  const metaTotalLideres = lideres.reduce((acc, l) => acc + (l.meta_votos || 0), 0)
  const estimativaTotalApoiadores = apoiadores.reduce((acc, a) => acc + (a.meta_votos || 0), 0)
  const totalLideres = lideres.length
  const totalComMeta = lideres.filter(l => l.meta_votos > 0).length
  const totalCidades = cidades.length
  const totalApoiadores = apoiadores.length
  const totalComEstimativa = apoiadores.filter(a => a.meta_votos > 0).length

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0B1F3A', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#C9A84C', fontFamily: "'IBM Plex Sans', sans-serif" }}>
      Carregando...
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#0B1F3A', fontFamily: "'IBM Plex Sans', sans-serif" }}>
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 80px, rgba(201,168,76,0.02) 80px, rgba(201,168,76,0.02) 81px), repeating-linear-gradient(90deg, transparent, transparent 80px, rgba(201,168,76,0.02) 80px, rgba(201,168,76,0.02) 81px)` }} />

      {/* NAV */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, height: '64px', background: 'rgba(11,31,58,0.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(201,168,76,0.15)', display: 'flex', alignItems: 'center', padding: isMobile ? '0 16px' : '0 32px', justifyContent: 'space-between', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => router.push('/dashboard')} style={{ background: 'transparent', border: 'none', color: '#8FA4C0', cursor: 'pointer', fontSize: '13px' }}>← Voltar</button>
          {!isMobile && <>
            <div style={{ width: '1px', height: '20px', background: '#1C3558' }} />
            <span style={{ fontFamily: "'Playfair Display', serif", fontSize: '20px', fontWeight: 800, color: '#FFFFFF' }}>Cand<span style={{ color: '#C9A84C' }}>Maps</span></span>
          </>}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => router.push('/dashboard/lideres')} style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '8px', color: '#C9A84C', fontSize: '12px', padding: '7px 12px', cursor: 'pointer', fontFamily: "'IBM Plex Sans', sans-serif", whiteSpace: 'nowrap' as const }}>
            ⭐ {isMobile ? 'Líderes' : 'Metas dos líderes'}
          </button>
          <button onClick={() => router.push('/dashboard/apoiadores')} style={{ background: 'rgba(107,163,214,0.1)', border: '1px solid rgba(107,163,214,0.2)', borderRadius: '8px', color: '#6ba3d6', fontSize: '12px', padding: '7px 12px', cursor: 'pointer', fontFamily: "'IBM Plex Sans', sans-serif", whiteSpace: 'nowrap' as const }}>
            👥 {isMobile ? 'Apoiadores' : 'Estimativas dos apoiadores'}
          </button>
        </div>
      </nav>

      <main style={{ paddingTop: '88px', padding: isMobile ? '80px 16px 40px' : '88px 32px 60px', position: 'relative', zIndex: 1, maxWidth: '1100px', margin: '0 auto' }}>

        {/* TÍTULO */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '2.5px', textTransform: 'uppercase' as const, color: '#C9A84C', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <span style={{ width: '24px', height: '1px', background: '#A07830', display: 'inline-block' }} />
            Planejamento Eleitoral
          </div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: isMobile ? '24px' : '32px', fontWeight: 800, color: '#FFFFFF', marginBottom: '6px' }}>Previsão de Votos</h1>
          <p style={{ fontSize: '14px', color: '#8FA4C0' }}>Metas comprometidas pelos líderes + estimativas configuradas por apoiador</p>
        </div>

        {/* CARDS RESUMO GERAL */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
          {[
            { label: 'Meta dos Líderes', valor: metaTotalLideres > 0 ? metaTotalLideres.toLocaleString('pt-BR') : '—', sub: `${totalComMeta} de ${totalLideres} líderes`, cor: '#C9A84C', icone: '⭐' },
            { label: 'Estimativa Apoiadores', valor: estimativaTotalApoiadores > 0 ? estimativaTotalApoiadores.toLocaleString('pt-BR') : '—', sub: `${totalComEstimativa} de ${totalApoiadores} apoiadores`, cor: '#6ba3d6', icone: '👥' },
            { label: 'Projeção Total', valor: (metaTotalLideres + estimativaTotalApoiadores) > 0 ? (metaTotalLideres + estimativaTotalApoiadores).toLocaleString('pt-BR') : '—', sub: 'votos somados', cor: '#86efac', icone: '🎯' },
            { label: 'Municípios', valor: totalCidades.toString(), sub: 'com líderes ativos', cor: '#a78bfa', icone: '📍' },
          ].map(c => (
            <div key={c.label} style={{ background: '#0F2040', border: '1px solid #1C3558', borderRadius: '12px', padding: '20px' }}>
              <div style={{ fontSize: '22px', marginBottom: '10px' }}>{c.icone}</div>
              <div style={labelStyle}>{c.label}</div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '26px', fontWeight: 800, color: c.cor, margin: '4px 0' }}>{c.valor}</div>
              <div style={{ fontSize: '12px', color: '#8FA4C0' }}>{c.sub}</div>
            </div>
          ))}
        </div>

        {/* ABAS */}
        <div style={{ display: 'flex', gap: '4px', background: '#0F2040', border: '1px solid #1C3558', borderRadius: '10px', padding: '4px', marginBottom: '20px', width: 'fit-content' }}>
          {([['lideres', '⭐ Metas por Líder'], ['apoiadores', '👥 Estimativas por Apoiador']] as const).map(([key, label]) => (
            <button key={key} onClick={() => setSecaoAtiva(key)}
              style={{ padding: '8px 16px', borderRadius: '7px', border: 'none', background: secaoAtiva === key ? 'rgba(201,168,76,0.15)' : 'transparent', color: secaoAtiva === key ? '#C9A84C' : '#8FA4C0', fontSize: '13px', cursor: 'pointer', fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: secaoAtiva === key ? 600 : 400, whiteSpace: 'nowrap' as const }}>
              {label}
            </button>
          ))}
        </div>

        {/* SEÇÃO: LÍDERES */}
        {secaoAtiva === 'lideres' && (
          <>
            {cidades.length === 0 ? (
              <div style={{ background: '#0F2040', border: '1px solid #1C3558', borderRadius: '12px', padding: '48px', textAlign: 'center' as const }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>⭐</div>
                <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '20px', fontWeight: 700, color: '#FFFFFF', marginBottom: '8px' }}>Nenhuma meta de líder definida</h2>
                <p style={{ fontSize: '14px', color: '#8FA4C0', marginBottom: '24px' }}>Acesse o perfil de cada líder e defina quantos votos ele se compromete a trazer.</p>
                <button onClick={() => router.push('/dashboard/lideres')} style={{ background: 'linear-gradient(135deg, #E8C87A, #A07830)', border: 'none', borderRadius: '8px', color: '#0B1F3A', fontSize: '14px', fontWeight: 600, padding: '12px 28px', cursor: 'pointer', fontFamily: "'IBM Plex Sans', sans-serif" }}>
                  Ir para Líderes →
                </button>
              </div>
            ) : (
              <div style={{ background: '#0F2040', border: '1px solid #1C3558', borderRadius: '12px', overflow: isMobile ? 'auto' : 'hidden' }}>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid #1C3558', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '18px', fontWeight: 700, color: '#FFFFFF' }}>Panorama por Cidade</h2>
                  <span style={{ fontSize: '12px', color: '#8FA4C0' }}>{cidades.length} cidade{cidades.length !== 1 ? 's' : ''}</span>
                </div>
                <div style={{ minWidth: '700px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 80px 80px 120px 120px 200px', padding: '10px 24px', borderBottom: '1px solid #1C3558', background: 'rgba(0,0,0,0.2)' }}>
                    {['Cidade', 'Líderes', 'Com Meta', 'Meta Total', 'Média/Líder', '% da Meta Geral'].map(h => (
                      <div key={h} style={{ ...labelStyle, fontSize: '10px' }}>{h}</div>
                    ))}
                  </div>
                  {cidades.map((c, i) => {
                    const pct = metaTotalLideres > 0 ? (c.metaTotal / metaTotalLideres * 100) : 0
                    const media = c.comMeta > 0 ? Math.round(c.metaTotal / c.comMeta) : 0
                    const cobertura = c.lideres > 0 ? Math.round(c.comMeta / c.lideres * 100) : 0
                    return (
                      <div key={`${c.cidade}/${c.estado}`} style={{ display: 'grid', gridTemplateColumns: '2fr 80px 80px 120px 120px 200px', padding: '14px 24px', borderBottom: i < cidades.length - 1 ? '1px solid rgba(28,53,88,0.5)' : 'none', alignItems: 'center', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                        <div>
                          <div style={{ fontSize: '14px', color: '#E8EDF5', fontWeight: 500 }}>{c.cidade}</div>
                          <div style={{ fontSize: '11px', color: cobertura === 100 ? '#86efac' : '#8FA4C0' }}>
                            {c.estado}{cobertura === 100 ? ' · todos com meta ✓' : ` · ${cobertura}% com meta`}
                          </div>
                        </div>
                        <div style={{ fontSize: '14px', color: '#E8EDF5', fontWeight: 500 }}>{c.lideres}</div>
                        <div style={{ fontSize: '14px', color: c.comMeta === c.lideres ? '#86efac' : '#8FA4C0', fontWeight: 500 }}>{c.comMeta}/{c.lideres}</div>
                        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '18px', fontWeight: 700, color: c.metaTotal > 0 ? '#86efac' : '#3D5470' }}>
                          {c.metaTotal > 0 ? c.metaTotal.toLocaleString('pt-BR') : '—'}
                        </div>
                        <div style={{ fontSize: '14px', color: '#8FA4C0' }}>{media > 0 ? `${media.toLocaleString('pt-BR')} votos` : '—'}</div>
                        <div>
                          {c.metaTotal > 0 ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: 'linear-gradient(90deg, #C9A84C, #86efac)', borderRadius: '3px' }} />
                              </div>
                              <span style={{ fontSize: '12px', color: '#8FA4C0', minWidth: '36px', textAlign: 'right' as const }}>{pct.toFixed(1)}%</span>
                            </div>
                          ) : <span style={{ fontSize: '12px', color: '#3D5470' }}>sem meta</span>}
                        </div>
                      </div>
                    )
                  })}
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 80px 80px 120px 120px 200px', padding: '16px 24px', borderTop: '2px solid rgba(201,168,76,0.2)', background: 'rgba(201,168,76,0.03)' }}>
                    <div style={{ ...labelStyle, fontSize: '10px' }}>Total</div>
                    <div style={{ fontSize: '14px', color: '#E8EDF5', fontWeight: 600 }}>{totalLideres}</div>
                    <div style={{ fontSize: '14px', color: '#E8EDF5', fontWeight: 600 }}>{totalComMeta}/{totalLideres}</div>
                    <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '20px', fontWeight: 800, color: '#C9A84C' }}>
                      {metaTotalLideres > 0 ? metaTotalLideres.toLocaleString('pt-BR') : '—'}
                    </div>
                    <div style={{ fontSize: '14px', color: '#8FA4C0' }}>
                      {totalComMeta > 0 ? `${Math.round(metaTotalLideres / totalComMeta).toLocaleString('pt-BR')} votos` : '—'}
                    </div>
                    <div />
                  </div>
                </div>
              </div>
            )}

            {/* LÍDERES SEM META */}
            {lideresSemMeta.length > 0 && (
              <div style={{ marginTop: '16px', background: 'rgba(192,57,43,0.05)', border: '1px solid rgba(192,57,43,0.2)', borderRadius: '12px', overflow: 'hidden' }}>
                <button onClick={() => setVerLideresSemMeta(v => !v)} style={{ width: '100%', padding: '16px 24px', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: "'IBM Plex Sans', sans-serif" }}>
                  <span style={{ fontSize: '14px', color: '#e74c3c', fontWeight: 500 }}>⚠️ {lideresSemMeta.length} líder{lideresSemMeta.length !== 1 ? 'es' : ''} sem meta definida</span>
                  <span style={{ fontSize: '12px', color: '#8FA4C0' }}>{verLideresSemMeta ? '▲ ocultar' : '▼ ver lista'}</span>
                </button>
                {verLideresSemMeta && (
                  <div style={{ borderTop: '1px solid rgba(192,57,43,0.2)', padding: '8px 24px 16px' }}>
                    {lideresSemMeta.map(l => (
                      <div key={l.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                        <div>
                          <span style={{ fontSize: '14px', color: '#E8EDF5' }}>{l.nome}</span>
                          <span style={{ fontSize: '12px', color: '#8FA4C0', marginLeft: '8px' }}>· {l.cidade}/{l.estado}</span>
                        </div>
                        <button onClick={() => router.push(`/dashboard/lideres/${l.id}`)} style={{ background: 'transparent', border: '1px solid rgba(192,57,43,0.3)', borderRadius: '6px', color: '#e74c3c', fontSize: '12px', padding: '4px 12px', cursor: 'pointer', fontFamily: "'IBM Plex Sans', sans-serif" }}>
                          Definir meta →
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* SEÇÃO: APOIADORES */}
        {secaoAtiva === 'apoiadores' && (
          <>
            {gruposLider.length === 0 ? (
              <div style={{ background: '#0F2040', border: '1px solid #1C3558', borderRadius: '12px', padding: '48px', textAlign: 'center' as const }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>👥</div>
                <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '20px', fontWeight: 700, color: '#FFFFFF', marginBottom: '8px' }}>Nenhum apoiador cadastrado</h2>
                <p style={{ fontSize: '14px', color: '#8FA4C0', marginBottom: '24px' }}>Cadastre apoiadores e defina a estimativa de votos de cada um.</p>
                <button onClick={() => router.push('/dashboard/apoiadores')} style={{ background: 'linear-gradient(135deg, #E8C87A, #A07830)', border: 'none', borderRadius: '8px', color: '#0B1F3A', fontSize: '14px', fontWeight: 600, padding: '12px 28px', cursor: 'pointer', fontFamily: "'IBM Plex Sans', sans-serif" }}>
                  Ir para Apoiadores →
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {/* Cabeçalho resumo */}
                <div style={{ background: '#0F2040', border: '1px solid #1C3558', borderRadius: '10px', padding: '14px 20px', display: 'flex', gap: isMobile ? '16px' : '40px', flexWrap: 'wrap' as const }}>
                  <div>
                    <div style={{ ...labelStyle, fontSize: '10px', marginBottom: '2px' }}>Total apoiadores</div>
                    <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '20px', fontWeight: 700, color: '#6ba3d6' }}>{totalApoiadores}</div>
                  </div>
                  <div>
                    <div style={{ ...labelStyle, fontSize: '10px', marginBottom: '2px' }}>Com estimativa</div>
                    <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '20px', fontWeight: 700, color: '#C9A84C' }}>{totalComEstimativa} <span style={{ fontSize: '12px', color: '#8FA4C0', fontFamily: "'IBM Plex Sans'" }}>{totalApoiadores > 0 ? `(${Math.round(totalComEstimativa / totalApoiadores * 100)}%)` : ''}</span></div>
                  </div>
                  <div>
                    <div style={{ ...labelStyle, fontSize: '10px', marginBottom: '2px' }}>Total estimado</div>
                    <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '20px', fontWeight: 700, color: '#86efac' }}>{estimativaTotalApoiadores.toLocaleString('pt-BR')} votos</div>
                  </div>
                </div>

                {/* Grupos por líder — colapsáveis */}
                {gruposLider.map(grupo => {
                  const aberto = grupoAberto === grupo.id
                  const pctCom = grupo.apoiadores.length > 0 ? Math.round(grupo.comEstimativa / grupo.apoiadores.length * 100) : 0
                  return (
                    <div key={grupo.id} style={{ background: '#0F2040', border: '1px solid #1C3558', borderRadius: '10px', overflow: 'hidden' }}>
                      <button onClick={() => setGrupoAberto(aberto ? null : grupo.id)}
                        style={{ width: '100%', padding: '16px 20px', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: "'IBM Plex Sans', sans-serif", gap: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                          <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: grupo.foto_url ? 'transparent' : 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, color: '#C9A84C', flexShrink: 0, overflow: 'hidden' }}>
                            {grupo.foto_url
                              ? <img src={grupo.foto_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              : grupo.nome.charAt(0).toUpperCase()}
                          </div>
                          <div style={{ textAlign: 'left' as const, minWidth: 0 }}>
                            <div style={{ fontSize: '14px', fontWeight: 600, color: '#E8EDF5', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{grupo.nome}</div>
                            <div style={{ fontSize: '11px', color: '#8FA4C0' }}>{grupo.apoiadores.length} apoiador{grupo.apoiadores.length !== 1 ? 'es' : ''} · {grupo.comEstimativa} com estimativa ({pctCom}%)</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexShrink: 0 }}>
                          {grupo.totalEstimativa > 0 && (
                            <div style={{ textAlign: 'right' as const }}>
                              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '18px', fontWeight: 700, color: '#86efac' }}>{grupo.totalEstimativa.toLocaleString('pt-BR')}</div>
                              <div style={{ fontSize: '10px', color: '#8FA4C0' }}>votos estimados</div>
                            </div>
                          )}
                          <span style={{ fontSize: '12px', color: '#8FA4C0' }}>{aberto ? '▲' : '▼'}</span>
                        </div>
                      </button>

                      {aberto && (
                        <div style={{ borderTop: '1px solid #1C3558' }}>
                          {/* Sub-header */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 140px', padding: '8px 20px', background: 'rgba(0,0,0,0.15)', fontSize: '10px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' as const, color: '#8FA4C0' }}>
                            <span>Apoiador</span><span>Zona</span><span>Estimativa</span>
                          </div>
                          {grupo.apoiadores
                            .sort((a, b) => (b.meta_votos || 0) - (a.meta_votos || 0))
                            .map((a, i) => (
                              <div key={a.id} style={{ display: 'grid', gridTemplateColumns: '1fr 100px 140px', padding: '11px 20px', borderTop: i > 0 ? '1px solid rgba(28,53,88,0.4)' : 'none', alignItems: 'center' }}
                                onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = 'rgba(201,168,76,0.02)'}
                                onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}>
                                <button onClick={() => router.push(`/dashboard/apoiadores/${a.id}`)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' as const, color: '#E8EDF5', fontSize: '13px', fontFamily: "'IBM Plex Sans', sans-serif" }}>
                                  {a.nome}
                                  {a.cidade && <span style={{ fontSize: '11px', color: '#8FA4C0', marginLeft: '6px' }}>· {a.cidade}</span>}
                                </button>
                                <div style={{ fontSize: '12px', color: '#8FA4C0' }}>{a.zona_eleitoral || '—'}</div>
                                <div>
                                  {a.meta_votos > 0 ? (
                                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#86efac' }}>~{a.meta_votos.toLocaleString('pt-BR')} votos</span>
                                  ) : (
                                    <button onClick={e => { e.stopPropagation(); router.push(`/dashboard/apoiadores/${a.id}`) }} style={{ background: 'rgba(192,57,43,0.08)', border: '1px solid rgba(192,57,43,0.2)', borderRadius: '5px', color: '#e74c3c', fontSize: '11px', padding: '3px 10px', cursor: 'pointer', fontFamily: "'IBM Plex Sans', sans-serif" }}>
                                      Definir →
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          {/* Total do grupo */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 140px', padding: '10px 20px', borderTop: '1px solid rgba(201,168,76,0.15)', background: 'rgba(201,168,76,0.02)' }}>
                            <div style={{ fontSize: '12px', color: '#8FA4C0', fontWeight: 600 }}>Total do grupo</div>
                            <div />
                            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '15px', fontWeight: 700, color: '#C9A84C' }}>
                              {grupo.totalEstimativa > 0 ? `~${grupo.totalEstimativa.toLocaleString('pt-BR')} votos` : '—'}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

      </main>
    </div>
  )
}
