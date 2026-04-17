'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type Normativa = {
  id: string
  titulo: string
  descricao: string
  link: string
  data_publicacao: string
  categoria: string
  lida: boolean
  criado_em: string
}

const categorias: Record<string, { label: string; cor: string; bg: string }> = {
  resolucao: { label: 'Resolução', cor: '#C9A84C', bg: 'rgba(201,168,76,0.1)' },
  portaria: { label: 'Portaria', cor: '#6ba3d6', bg: 'rgba(107,163,214,0.1)' },
  calendario: { label: 'Calendário', cor: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
  instrucao: { label: 'Instrução', cor: '#a78bfa', bg: 'rgba(167,139,250,0.1)' },
  noticia: { label: 'Notícia', cor: '#8FA4C0', bg: 'rgba(143,164,192,0.1)' },
}

export default function TSEPage() {
  const router = useRouter()
  const supabase = createClient()
  const [normativas, setNormativas] = useState<Normativa[]>([])
  const [loading, setLoading] = useState(true)
  const [atualizando, setAtualizando] = useState(false)
  const [filtro, setFiltro] = useState('todas')
  const [mensagem, setMensagem] = useState('')
  const [naoLidas, setNaoLidas] = useState(0)

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
    const { data } = await supabase
      .from('tse_normativas')
      .select('*')
      .order('data_publicacao', { ascending: false })
    if (data) {
      setNormativas(data)
      setNaoLidas(data.filter(n => !n.lida).length)
    }
    setLoading(false)
  }

  async function atualizar() {
    setAtualizando(true)
    setMensagem('')
    try {
      const res = await fetch('/api/tse')
      const data = await res.json()
      setMensagem(data.mensagem || data.error || 'Atualizado!')
      await carregar()
    } catch {
      setMensagem('Erro ao buscar normativas')
    }
    setAtualizando(false)
    setTimeout(() => setMensagem(''), 5000)
  }

  async function marcarLida(id: string) {
    await supabase.from('tse_normativas').update({ lida: true }).eq('id', id)
    setNormativas(prev => prev.map(n => n.id === id ? { ...n, lida: true } : n))
    setNaoLidas(prev => Math.max(0, prev - 1))
  }

  async function marcarTodasLidas() {
    await supabase.from('tse_normativas').update({ lida: true }).eq('lida', false)
    setNormativas(prev => prev.map(n => ({ ...n, lida: true })))
    setNaoLidas(0)
  }

  const normativasFiltradas = normativas.filter(n =>
    filtro === 'todas' ? true :
    filtro === 'nao_lidas' ? !n.lida :
    n.categoria === filtro
  )

  return (
    <div style={{ minHeight: '100vh', background: '#0B1F3A', fontFamily: "'IBM Plex Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap" rel="stylesheet" />
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 80px, rgba(201,168,76,0.02) 80px, rgba(201,168,76,0.02) 81px)` }} />

      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, height: '64px', background: 'rgba(11,31,58,0.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(201,168,76,0.15)', display: 'flex', alignItems: 'center', padding: '0 32px', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={() => router.push('/dashboard')} style={{ background: 'transparent', border: 'none', color: '#8FA4C0', cursor: 'pointer', fontSize: '13px' }}>← Voltar</button>
          <div style={{ width: '1px', height: '20px', background: '#1C3558' }} />
          <span style={{ fontFamily: "'Playfair Display', serif", fontSize: '20px', fontWeight: 800, color: '#FFFFFF' }}>Cand<span style={{ color: '#C9A84C' }}>Maps</span></span>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {naoLidas > 0 && (
            <button onClick={marcarTodasLidas} style={{ background: 'transparent', border: '1px solid #1C3558', borderRadius: '8px', color: '#8FA4C0', fontSize: '12px', padding: '7px 14px', cursor: 'pointer' }}>
              Marcar todas como lidas
            </button>
          )}
          <button onClick={atualizar} disabled={atualizando}
            style={{ background: atualizando ? 'rgba(201,168,76,0.3)' : 'linear-gradient(135deg, #E8C87A, #A07830)', border: 'none', borderRadius: '8px', color: '#0B1F3A', fontSize: '13px', fontWeight: 600, padding: '9px 18px', cursor: atualizando ? 'not-allowed' : 'pointer' }}>
            {atualizando ? '🔄 Buscando...' : '🔄 Atualizar TSE'}
          </button>
        </div>
      </nav>

      <main style={{ paddingTop: '88px', padding: '88px 32px 40px', position: 'relative', zIndex: 1, maxWidth: '960px', margin: '0 auto' }}>
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '2.5px', textTransform: 'uppercase', color: '#C9A84C', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <span style={{ width: '24px', height: '1px', background: '#A07830', display: 'inline-block' }} />
            Legislação Eleitoral
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '6px' }}>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '32px', fontWeight: 800, color: '#FFFFFF' }}>Normativas TSE</h1>
            {naoLidas > 0 && (
              <span style={{ fontSize: '12px', fontWeight: 600, padding: '4px 12px', borderRadius: '20px', background: 'rgba(192,57,43,0.15)', border: '1px solid rgba(192,57,43,0.3)', color: '#e74c3c' }}>
                {naoLidas} não lida{naoLidas !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <p style={{ fontSize: '14px', color: '#8FA4C0' }}>Resoluções, portarias e notícias do Tribunal Superior Eleitoral</p>
        </div>

        {mensagem && (
          <div style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '8px', padding: '12px 16px', fontSize: '13px', color: '#C9A84C', marginBottom: '20px' }}>
            ✓ {mensagem}
          </div>
        )}

        {/* FILTROS */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
          {[
            ['todas', 'Todas'],
            ['nao_lidas', `Não lidas ${naoLidas > 0 ? `(${naoLidas})` : ''}`],
            ['resolucao', 'Resoluções'],
            ['portaria', 'Portarias'],
            ['calendario', 'Calendário'],
            ['instrucao', 'Instruções'],
            ['noticia', 'Notícias'],
          ].map(([key, label]) => (
            <button key={key} onClick={() => setFiltro(key)}
              style={{ padding: '7px 14px', borderRadius: '20px', border: `1px solid ${filtro === key ? 'rgba(201,168,76,0.4)' : '#1C3558'}`, background: filtro === key ? 'rgba(201,168,76,0.1)' : 'transparent', color: filtro === key ? '#C9A84C' : '#8FA4C0', fontSize: '12px', cursor: 'pointer', fontFamily: "'IBM Plex Sans', sans-serif" }}>
              {label}
            </button>
          ))}
        </div>

        {/* LISTA */}
        {loading ? (
          <div style={{ color: '#C9A84C', fontSize: '14px' }}>Carregando...</div>
        ) : normativasFiltradas.length === 0 ? (
          <div style={{ background: '#0F2040', border: '1px solid #1C3558', borderRadius: '12px', padding: '60px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚖️</div>
            <div style={{ fontSize: '18px', fontWeight: 600, color: '#E8EDF5', marginBottom: '8px' }}>
              {normativas.length === 0 ? 'Nenhuma normativa carregada' : 'Nenhuma normativa encontrada'}
            </div>
            <div style={{ fontSize: '14px', color: '#8FA4C0', marginBottom: '24px' }}>
              {normativas.length === 0 ? 'Clique em "Atualizar TSE" para buscar as últimas normativas' : 'Tente outro filtro'}
            </div>
            {normativas.length === 0 && (
              <button onClick={atualizar} style={{ background: 'linear-gradient(135deg, #E8C87A, #A07830)', border: 'none', borderRadius: '8px', color: '#0B1F3A', fontSize: '14px', fontWeight: 600, padding: '12px 28px', cursor: 'pointer' }}>
                🔄 Buscar normativas do TSE
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {normativasFiltradas.map(n => {
              const cat = categorias[n.categoria] || categorias.noticia
              return (
                <div key={n.id} style={{ background: '#0F2040', border: `1px solid ${n.lida ? '#1C3558' : 'rgba(201,168,76,0.2)'}`, borderRadius: '12px', padding: '20px 24px', opacity: n.lida ? 0.7 : 1, transition: 'all .15s' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 10px', borderRadius: '20px', background: cat.bg, color: cat.cor, border: `1px solid ${cat.cor}33` }}>
                          {cat.label}
                        </span>
                        {!n.lida && (
                          <span style={{ fontSize: '10px', fontWeight: 600, padding: '2px 8px', borderRadius: '20px', background: 'rgba(192,57,43,0.1)', color: '#e74c3c', border: '1px solid rgba(192,57,43,0.2)' }}>
                            NOVA
                          </span>
                        )}
                        <span style={{ fontSize: '11px', color: '#8FA4C0' }}>
                          {new Date(n.data_publicacao).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                        </span>
                      </div>
                      <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#E8EDF5', marginBottom: '6px', lineHeight: 1.4 }}>{n.titulo}</h3>
                      {n.descricao && <p style={{ fontSize: '13px', color: '#8FA4C0', lineHeight: 1.6, marginBottom: '12px' }}>{n.descricao}</p>}
                      <div style={{ display: 'flex', gap: '10px' }}>
                        {n.link && (
                          <a href={n.link} target="_blank" rel="noopener noreferrer"
                            style={{ fontSize: '12px', color: '#6ba3d6', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            🔗 Ver no TSE
                          </a>
                        )}
                        {!n.lida && (
                          <button onClick={() => marcarLida(n.id)}
                            style={{ background: 'transparent', border: 'none', color: '#8FA4C0', fontSize: '12px', cursor: 'pointer', padding: 0, fontFamily: "'IBM Plex Sans', sans-serif" }}>
                            ✓ Marcar como lida
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
