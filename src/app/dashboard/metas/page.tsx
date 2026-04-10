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
}

type CidadeResumo = {
  cidade: string
  estado: string
  lideres: number
  comMeta: number
  metaTotal: number
}

const labelStyle = { fontSize: '11px', fontWeight: 600 as const, letterSpacing: '1px', textTransform: 'uppercase' as const, color: '#8FA4C0' }

export default function MetasPage() {
  const router = useRouter()
  const supabase = createClient()
  const isMobile = useIsMobile()
  const [lideres, setLideres] = useState<LiderMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [cidades, setCidades] = useState<CidadeResumo[]>([])
  const [semMeta, setSemMeta] = useState<LiderMeta[]>([])
  const [verSemMeta, setVerSemMeta] = useState(false)

  useEffect(() => {
    async function carregar() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data } = await supabase
        .from('lideres_regionais')
        .select('id, nome, cidade, estado, zona_eleitoral, meta_votos, ativo')
        .eq('ativo', true)
        .order('cidade', { ascending: true })

      if (data) {
        setLideres(data)

        const mapa = new Map<string, CidadeResumo>()
        const semMetaLista: LiderMeta[] = []

        for (const l of data) {
          if (!l.meta_votos || l.meta_votos === 0) { semMetaLista.push(l) }
          const chave = `${l.cidade}/${l.estado}`
          const atual = mapa.get(chave) || { cidade: l.cidade || '—', estado: l.estado || '', lideres: 0, comMeta: 0, metaTotal: 0 }
          atual.lideres++
          if (l.meta_votos > 0) { atual.comMeta++; atual.metaTotal += l.meta_votos }
          mapa.set(chave, atual)
        }

        const cidadesOrdenadas = Array.from(mapa.values()).sort((a, b) =>
          `${a.cidade}/${a.estado}`.localeCompare(`${b.cidade}/${b.estado}`)
        )
        setCidades(cidadesOrdenadas)
        setSemMeta(semMetaLista)
      }
      setLoading(false)
    }
    carregar()
  }, [])

  const metaTotal = lideres.reduce((acc, l) => acc + (l.meta_votos || 0), 0)
  const totalLideres = lideres.length
  const totalComMeta = lideres.filter(l => l.meta_votos > 0).length
  const totalCidades = cidades.length

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
        <button onClick={() => router.push('/dashboard/lideres')} style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '8px', color: '#C9A84C', fontSize: '13px', padding: '8px 12px', cursor: 'pointer', fontFamily: "'IBM Plex Sans', sans-serif", whiteSpace: 'nowrap' as const }}>
          ✏️ {isMobile ? 'Definir metas' : 'Definir metas nos líderes'}
        </button>
      </nav>

      <main style={{ paddingTop: '88px', padding: isMobile ? '80px 16px 40px' : '88px 32px 60px', position: 'relative', zIndex: 1, maxWidth: '1100px', margin: '0 auto' }}>

        {/* TÍTULO */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '2.5px', textTransform: 'uppercase' as const, color: '#C9A84C', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <span style={{ width: '24px', height: '1px', background: '#A07830', display: 'inline-block' }} />
            Planejamento Eleitoral
          </div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: isMobile ? '24px' : '32px', fontWeight: 800, color: '#FFFFFF', marginBottom: '6px' }}>Metas de Votos</h1>
          <p style={{ fontSize: '14px', color: '#8FA4C0' }}>Compromissos assumidos pelos líderes regionais com a campanha, consolidados por cidade</p>
        </div>

        {/* CARDS RESUMO */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: '12px', marginBottom: '28px' }}>
          {[
            { label: 'Meta Total', valor: metaTotal > 0 ? metaTotal.toLocaleString('pt-BR') : '—', sub: 'votos comprometidos', cor: '#86efac', icone: '🎯' },
            { label: 'Líderes', valor: totalLideres.toLocaleString('pt-BR'), sub: `${totalComMeta} com meta definida`, cor: '#6ba3d6', icone: '⭐' },
            { label: 'Cidades', valor: totalCidades.toString(), sub: 'municípios com líderes', cor: '#C9A84C', icone: '📍' },
            { label: 'Cobertura', valor: totalLideres > 0 ? `${Math.round(totalComMeta / totalLideres * 100)}%` : '0%', sub: 'líderes com meta', cor: '#a78bfa', icone: '📊' },
          ].map(c => (
            <div key={c.label} style={{ background: '#0F2040', border: '1px solid #1C3558', borderRadius: '12px', padding: '20px' }}>
              <div style={{ fontSize: '22px', marginBottom: '10px' }}>{c.icone}</div>
              <div style={labelStyle}>{c.label}</div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '28px', fontWeight: 800, color: c.cor, margin: '4px 0' }}>{c.valor}</div>
              <div style={{ fontSize: '12px', color: '#8FA4C0' }}>{c.sub}</div>
            </div>
          ))}
        </div>

        {/* TABELA POR CIDADE */}
        {cidades.length === 0 ? (
          <div style={{ background: '#0F2040', border: '1px solid #1C3558', borderRadius: '12px', padding: '48px', textAlign: 'center' as const }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎯</div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '20px', fontWeight: 700, color: '#FFFFFF', marginBottom: '8px' }}>Nenhuma meta definida ainda</h2>
            <p style={{ fontSize: '14px', color: '#8FA4C0', marginBottom: '24px' }}>
              Abra o cadastro de cada líder e defina quantos votos ele se compromete a trazer.
            </p>
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

            {/* HEADER */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 80px 80px 120px 120px 200px', gap: '0', padding: '10px 24px', borderBottom: '1px solid #1C3558', background: 'rgba(0,0,0,0.2)', minWidth: '700px' }}>
              {['Cidade', 'Líderes', 'Com Meta', 'Meta Total', 'Média/Líder', '% da Meta Geral'].map(h => (
                <div key={h} style={{ ...labelStyle, fontSize: '10px' }}>{h}</div>
              ))}
            </div>

            {/* LINHAS */}
            <div style={{ minWidth: '700px' }}>
              {cidades.map((c, i) => {
                const pct = metaTotal > 0 ? (c.metaTotal / metaTotal * 100) : 0
                const media = c.comMeta > 0 ? Math.round(c.metaTotal / c.comMeta) : 0
                const cobertura = c.lideres > 0 ? Math.round(c.comMeta / c.lideres * 100) : 0
                return (
                  <div key={`${c.cidade}/${c.estado}`} style={{ display: 'grid', gridTemplateColumns: '2fr 80px 80px 120px 120px 200px', gap: '0', padding: '14px 24px', borderBottom: i < cidades.length - 1 ? '1px solid rgba(28,53,88,0.5)' : 'none', alignItems: 'center', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                    <div>
                      <div style={{ fontSize: '14px', color: '#E8EDF5', fontWeight: 500 }}>{c.cidade}</div>
                      {cobertura < 100 && <div style={{ fontSize: '11px', color: '#8FA4C0' }}>{c.estado} · {cobertura}% com meta</div>}
                      {cobertura === 100 && <div style={{ fontSize: '11px', color: '#86efac' }}>{c.estado} · todos com meta ✓</div>}
                    </div>
                    <div style={{ fontSize: '14px', color: '#E8EDF5', fontWeight: 500 }}>{c.lideres}</div>
                    <div style={{ fontSize: '14px', color: c.comMeta === c.lideres ? '#86efac' : '#8FA4C0', fontWeight: 500 }}>
                      {c.comMeta}/{c.lideres}
                    </div>
                    <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '18px', fontWeight: 700, color: c.metaTotal > 0 ? '#86efac' : '#3D5470' }}>
                      {c.metaTotal > 0 ? c.metaTotal.toLocaleString('pt-BR') : '—'}
                    </div>
                    <div style={{ fontSize: '14px', color: '#8FA4C0' }}>
                      {media > 0 ? `${media.toLocaleString('pt-BR')} votos` : '—'}
                    </div>
                    <div>
                      {c.metaTotal > 0 ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: 'linear-gradient(90deg, #C9A84C, #86efac)', borderRadius: '3px', transition: 'width .3s' }} />
                          </div>
                          <span style={{ fontSize: '12px', color: '#8FA4C0', minWidth: '36px', textAlign: 'right' as const }}>{pct.toFixed(1)}%</span>
                        </div>
                      ) : (
                        <span style={{ fontSize: '12px', color: '#3D5470' }}>sem meta</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* TOTAIS */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 80px 80px 120px 120px 200px', gap: '0', padding: '16px 24px', borderTop: '2px solid rgba(201,168,76,0.2)', background: 'rgba(201,168,76,0.03)', minWidth: '700px' }}>
              <div style={{ ...labelStyle, fontSize: '10px' }}>Total</div>
              <div style={{ fontSize: '14px', color: '#E8EDF5', fontWeight: 600 }}>{totalLideres}</div>
              <div style={{ fontSize: '14px', color: '#E8EDF5', fontWeight: 600 }}>{totalComMeta}/{totalLideres}</div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '20px', fontWeight: 800, color: '#C9A84C' }}>
                {metaTotal > 0 ? metaTotal.toLocaleString('pt-BR') : '—'}
              </div>
              <div style={{ fontSize: '14px', color: '#8FA4C0' }}>
                {totalComMeta > 0 ? `${Math.round(metaTotal / totalComMeta).toLocaleString('pt-BR')} votos` : '—'}
              </div>
              <div />
            </div>
          </div>
        )}

        {/* LÍDERES SEM META */}
        {semMeta.length > 0 && (
          <div style={{ marginTop: '16px', background: 'rgba(192,57,43,0.05)', border: '1px solid rgba(192,57,43,0.2)', borderRadius: '12px', overflow: 'hidden' }}>
            <button onClick={() => setVerSemMeta(v => !v)} style={{ width: '100%', padding: '16px 24px', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: "'IBM Plex Sans', sans-serif" }}>
              <span style={{ fontSize: '14px', color: '#e74c3c', fontWeight: 500 }}>
                ⚠️ {semMeta.length} líder{semMeta.length !== 1 ? 'es' : ''} sem meta definida
              </span>
              <span style={{ fontSize: '12px', color: '#8FA4C0' }}>{verSemMeta ? '▲ ocultar' : '▼ ver lista'}</span>
            </button>
            {verSemMeta && (
              <div style={{ borderTop: '1px solid rgba(192,57,43,0.2)', padding: '8px 24px 16px' }}>
                {semMeta.map(l => (
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

      </main>
    </div>
  )
}
