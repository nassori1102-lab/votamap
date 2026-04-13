'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useIsMobile } from '@/lib/useIsMobile'

type Pesquisa = {
  id: string
  titulo: string
  slug: string
  ativa: boolean
  criado_em: string
  totalRespostas: number
}

function gerarSlug(titulo: string): string {
  const base = titulo.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '').trim()
    .replace(/\s+/g, '-').replace(/-+/g, '-').slice(0, 40)
  return base + '-' + Math.random().toString(36).substr(2, 5)
}

export default function PesquisasPage() {
  const router = useRouter()
  const supabase = createClient()
  const isMobile = useIsMobile()
  const [pesquisas, setPesquisas] = useState<Pesquisa[]>([])
  const [loading, setLoading] = useState(true)
  const [criando, setCriando] = useState(false)
  const [novaTitulo, setNovaTitulo] = useState('')
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      await carregar()
    }
    init()
  }, [])

  async function carregar() {
    setLoading(true)
    const { data } = await supabase.from('pesquisas').select('*').order('criado_em', { ascending: false })
    if (!data) { setLoading(false); return }

    const comContagem = await Promise.all(data.map(async p => {
      const { count } = await supabase.from('respostas_pesquisa')
        .select('*', { count: 'exact', head: true }).eq('pesquisa_id', p.id)
      return { ...p, totalRespostas: count || 0 }
    }))

    setPesquisas(comContagem)
    setLoading(false)
  }

  async function handleCriar() {
    if (!novaTitulo.trim()) return
    setSalvando(true)
    const slug = gerarSlug(novaTitulo)
    const { data, error } = await supabase.from('pesquisas')
      .insert({ titulo: novaTitulo.trim(), slug })
      .select().single()
    if (!error && data) {
      router.push(`/dashboard/pesquisas/${data.id}`)
    } else {
      setSalvando(false)
    }
  }

  async function toggleAtiva(id: string, atual: boolean) {
    await supabase.from('pesquisas').update({ ativa: !atual }).eq('id', id)
    setPesquisas(prev => prev.map(p => p.id === id ? { ...p, ativa: !atual } : p))
  }

  async function handleExcluir(id: string, titulo: string) {
    if (!confirm(`Excluir a pesquisa "${titulo}" e todas as respostas? Isso não pode ser desfeito.`)) return
    await supabase.from('pesquisas').delete().eq('id', id)
    setPesquisas(prev => prev.filter(p => p.id !== id))
  }

  function copiarLink(slug: string) {
    const url = `${window.location.origin}/pesquisa/${slug}`
    navigator.clipboard.writeText(url)
    alert('Link copiado!')
  }

  const inputStyle = { padding: '10px 14px', background: '#0B1F3A', border: '1px solid #1C3558', borderRadius: '8px', color: '#E8EDF5', fontSize: '14px', outline: 'none', fontFamily: "'IBM Plex Sans', sans-serif", width: '100%', boxSizing: 'border-box' as const }

  return (
    <div style={{ minHeight: '100vh', background: '#0B1F3A', fontFamily: "'IBM Plex Sans', sans-serif" }}>
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 80px, rgba(201,168,76,0.02) 80px, rgba(201,168,76,0.02) 81px), repeating-linear-gradient(90deg, transparent, transparent 80px, rgba(201,168,76,0.02) 80px, rgba(201,168,76,0.02) 81px)` }} />

      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, height: '64px', background: 'rgba(11,31,58,0.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(201,168,76,0.15)', display: 'flex', alignItems: 'center', padding: isMobile ? '0 16px' : '0 32px', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={() => router.push('/dashboard')} style={{ background: 'transparent', border: 'none', color: '#8FA4C0', cursor: 'pointer', fontSize: '13px' }}>← Voltar</button>
          {!isMobile && <>
            <div style={{ width: '1px', height: '20px', background: '#1C3558' }} />
            <span style={{ fontFamily: "'Playfair Display', serif", fontSize: '20px', fontWeight: 800, color: '#FFFFFF' }}>Cand<span style={{ color: '#C9A84C' }}>Maps</span></span>
          </>}
        </div>
        <button onClick={() => setCriando(true)} style={{ background: 'linear-gradient(135deg, #E8C87A, #A07830)', border: 'none', borderRadius: '8px', color: '#0B1F3A', fontSize: '13px', fontWeight: 600, padding: '9px 18px', cursor: 'pointer', fontFamily: "'IBM Plex Sans', sans-serif" }}>
          + Nova Pesquisa
        </button>
      </nav>

      <main style={{ paddingTop: '88px', padding: isMobile ? '80px 16px 40px' : '88px 32px 60px', position: 'relative', zIndex: 1, maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ marginBottom: '28px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '2.5px', textTransform: 'uppercase' as const, color: '#C9A84C', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <span style={{ width: '24px', height: '1px', background: '#A07830', display: 'inline-block' }} />
            Inteligência Eleitoral
          </div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: isMobile ? '24px' : '32px', fontWeight: 800, color: '#FFFFFF', marginBottom: '6px' }}>Pesquisas & Enquetes</h1>
          <p style={{ fontSize: '14px', color: '#8FA4C0' }}>Crie pesquisas e envie o link para seus apoiadores entenderem as prioridades de cada região</p>
        </div>

        {loading ? (
          <div style={{ color: '#C9A84C', fontSize: '14px' }}>Carregando...</div>
        ) : pesquisas.length === 0 ? (
          <div style={{ background: '#0F2040', border: '1px solid #1C3558', borderRadius: '12px', padding: '60px', textAlign: 'center' as const }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '20px', fontWeight: 700, color: '#FFFFFF', marginBottom: '8px' }}>Nenhuma pesquisa criada ainda</h2>
            <p style={{ fontSize: '14px', color: '#8FA4C0', marginBottom: '24px' }}>Crie sua primeira pesquisa e descubra as prioridades dos eleitores da sua base.</p>
            <button onClick={() => setCriando(true)} style={{ background: 'linear-gradient(135deg, #E8C87A, #A07830)', border: 'none', borderRadius: '8px', color: '#0B1F3A', fontSize: '14px', fontWeight: 600, padding: '12px 28px', cursor: 'pointer' }}>
              + Criar pesquisa
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {pesquisas.map(p => (
              <div key={p.id} style={{ background: '#0F2040', border: '1px solid #1C3558', borderRadius: '12px', padding: isMobile ? '16px' : '20px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px', flexWrap: 'wrap' as const }}>
                      <span style={{ fontSize: '15px', fontWeight: 600, color: '#E8EDF5' }}>{p.titulo}</span>
                      <span style={{ fontSize: '10px', fontWeight: 600, padding: '2px 8px', borderRadius: '100px', background: p.ativa ? 'rgba(34,197,94,0.1)' : 'rgba(100,100,100,0.1)', border: `1px solid ${p.ativa ? 'rgba(34,197,94,0.25)' : '#1C3558'}`, color: p.ativa ? '#86efac' : '#3D5470' }}>
                        {p.ativa ? '● ATIVA' : '○ INATIVA'}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#8FA4C0', marginBottom: '12px' }}>
                      /pesquisa/<span style={{ color: '#6ba3d6' }}>{p.slug}</span>
                      {' · '}
                      <span style={{ color: '#C9A84C', fontWeight: 600 }}>{p.totalRespostas} resposta{p.totalRespostas !== 1 ? 's' : ''}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' as const }}>
                      <button onClick={() => router.push(`/dashboard/pesquisas/${p.id}`)}
                        style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '6px', color: '#C9A84C', fontSize: '12px', padding: '5px 12px', cursor: 'pointer', fontFamily: "'IBM Plex Sans', sans-serif" }}>
                        ✏️ Editar
                      </button>
                      <button onClick={() => router.push(`/dashboard/pesquisas/${p.id}/resultados`)}
                        style={{ background: 'rgba(107,163,214,0.1)', border: '1px solid rgba(107,163,214,0.2)', borderRadius: '6px', color: '#6ba3d6', fontSize: '12px', padding: '5px 12px', cursor: 'pointer', fontFamily: "'IBM Plex Sans', sans-serif" }}>
                        📊 {p.totalRespostas > 0 ? 'Ver resultados' : 'Resultados'}
                      </button>
                      <button onClick={() => copiarLink(p.slug)}
                        style={{ background: 'rgba(134,239,172,0.08)', border: '1px solid rgba(134,239,172,0.15)', borderRadius: '6px', color: '#86efac', fontSize: '12px', padding: '5px 12px', cursor: 'pointer', fontFamily: "'IBM Plex Sans', sans-serif" }}>
                        🔗 Copiar link
                      </button>
                      <button onClick={() => toggleAtiva(p.id, p.ativa)}
                        style={{ background: 'transparent', border: '1px solid #1C3558', borderRadius: '6px', color: '#8FA4C0', fontSize: '12px', padding: '5px 12px', cursor: 'pointer', fontFamily: "'IBM Plex Sans', sans-serif" }}>
                        {p.ativa ? 'Desativar' : 'Ativar'}
                      </button>
                      <button onClick={() => handleExcluir(p.id, p.titulo)}
                        style={{ background: 'transparent', border: 'none', color: '#3D5470', fontSize: '12px', padding: '5px 8px', cursor: 'pointer', fontFamily: "'IBM Plex Sans', sans-serif" }}
                        onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = '#e74c3c'}
                        onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = '#3D5470'}>
                        Excluir
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* MODAL NOVA PESQUISA */}
      {criando && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ background: '#0F2040', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '440px' }}>
            <div style={{ position: 'absolute', top: 0, left: '10%', right: '10%', height: '1px', background: 'linear-gradient(90deg, transparent, #C9A84C, transparent)' }} />
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '20px', fontWeight: 700, color: '#FFFFFF', marginBottom: '20px' }}>Nova Pesquisa</h2>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' as const, color: '#8FA4C0', display: 'block', marginBottom: '6px' }}>Título da pesquisa *</label>
              <input autoFocus value={novaTitulo} onChange={e => setNovaTitulo(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCriar()}
                placeholder="Ex: Prioridades do bairro X"
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#C9A84C'}
                onBlur={e => e.target.style.borderColor = '#1C3558'} />
              <div style={{ fontSize: '11px', color: '#3D5470', marginTop: '6px' }}>Um link único será gerado automaticamente.</div>
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => { setCriando(false); setNovaTitulo('') }} style={{ background: 'transparent', border: '1px solid #1C3558', borderRadius: '8px', color: '#8FA4C0', fontSize: '13px', padding: '10px 20px', cursor: 'pointer', fontFamily: "'IBM Plex Sans', sans-serif" }}>Cancelar</button>
              <button onClick={handleCriar} disabled={salvando || !novaTitulo.trim()} style={{ background: salvando || !novaTitulo.trim() ? 'rgba(201,168,76,0.4)' : 'linear-gradient(135deg, #E8C87A, #A07830)', border: 'none', borderRadius: '8px', color: '#0B1F3A', fontSize: '13px', fontWeight: 600, padding: '10px 24px', cursor: salvando ? 'not-allowed' : 'pointer', fontFamily: "'IBM Plex Sans', sans-serif" }}>
                {salvando ? 'Criando...' : 'Criar e editar →'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
