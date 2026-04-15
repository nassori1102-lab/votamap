'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type Pesquisa = {
  id: string
  titulo: string
  descricao: string
  segmentacao: string
  status: string
  criado_em: string
  regiao?: string
}

export default function PesquisasPage() {
  const [pesquisas, setPesquisas] = useState<Pesquisa[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function carregar() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data } = await supabase.from('pesquisas').select('*').order('criado_em', { ascending: false })
      if (data) setPesquisas(data)
      setLoading(false)
    }
    carregar()
  }, [])

  async function encerrar(id: string) {
    await supabase.from('pesquisas').update({ status: 'encerrada' }).eq('id', id)
    setPesquisas(prev => prev.map(p => p.id === id ? { ...p, status: 'encerrada' } : p))
  }

  async function excluir(id: string) {
    if (!confirm('Excluir esta pesquisa? Esta ação não pode ser desfeita.')) return
    await supabase.from('pesquisas').delete().eq('id', id)
    setPesquisas(prev => prev.filter(p => p.id !== id))
  }

  const segLabel: Record<string, string> = {
    todos: 'Todos', regiao: 'Por região', lider: 'Por líder'
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0B1F3A', fontFamily: "'IBM Plex Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap" rel="stylesheet" />
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 80px, rgba(201,168,76,0.02) 80px, rgba(201,168,76,0.02) 81px), repeating-linear-gradient(90deg, transparent, transparent 80px, rgba(201,168,76,0.02) 80px, rgba(201,168,76,0.02) 81px)` }} />

      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, height: '64px', background: 'rgba(11,31,58,0.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(201,168,76,0.15)', display: 'flex', alignItems: 'center', padding: '0 32px', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={() => router.push('/dashboard')} style={{ background: 'transparent', border: 'none', color: '#8FA4C0', cursor: 'pointer', fontSize: '13px' }}>← Voltar</button>
          <div style={{ width: '1px', height: '20px', background: '#1C3558' }} />
          <span style={{ fontFamily: "'Playfair Display', serif", fontSize: '20px', fontWeight: 800, color: '#FFFFFF' }}>Cand<span style={{ color: '#C9A84C' }}>Maps</span></span>
        </div>
        <button onClick={() => router.push('/dashboard/pesquisas/nova')}
          style={{ background: 'linear-gradient(135deg, #E8C87A, #A07830)', border: 'none', borderRadius: '8px', color: '#0B1F3A', fontSize: '14px', fontWeight: 600, padding: '10px 22px', cursor: 'pointer' }}>
          + Nova Pesquisa
        </button>
      </nav>

      <main style={{ paddingTop: '88px', padding: '88px 32px 40px', position: 'relative', zIndex: 1, maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ marginBottom: '32px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '2.5px', textTransform: 'uppercase', color: '#C9A84C', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <span style={{ width: '24px', height: '1px', background: '#A07830', display: 'inline-block' }} />
            Inteligência de Campo
          </div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '32px', fontWeight: 800, color: '#FFFFFF', marginBottom: '6px' }}>Pesquisas de Campo</h1>
          <p style={{ fontSize: '14px', color: '#8FA4C0' }}>{pesquisas.length} pesquisa{pesquisas.length !== 1 ? 's' : ''} criada{pesquisas.length !== 1 ? 's' : ''}</p>
        </div>

        {loading ? (
          <div style={{ color: '#C9A84C', fontSize: '14px' }}>Carregando...</div>
        ) : pesquisas.length === 0 ? (
          <div style={{ background: '#0F2040', border: '1px solid #1C3558', borderRadius: '12px', padding: '60px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
            <div style={{ fontSize: '18px', fontWeight: 600, color: '#E8EDF5', marginBottom: '8px' }}>Nenhuma pesquisa criada</div>
            <div style={{ fontSize: '14px', color: '#8FA4C0', marginBottom: '24px' }}>Crie pesquisas de campo para mapear desafios por região</div>
            <button onClick={() => router.push('/dashboard/pesquisas/criar')}
              style={{ background: 'linear-gradient(135deg, #E8C87A, #A07830)', border: 'none', borderRadius: '8px', color: '#0B1F3A', fontSize: '14px', fontWeight: 600, padding: '12px 28px', cursor: 'pointer' }}>
              + Criar primeira pesquisa
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {pesquisas.map(p => (
              <div key={p.id} style={{ background: '#0F2040', border: '1px solid #1C3558', borderRadius: '12px', padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                      <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#E8EDF5' }}>{p.titulo}</h2>
                      <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 10px', borderRadius: '20px', background: p.status === 'ativa' ? 'rgba(34,197,94,0.1)' : 'rgba(192,57,43,0.1)', color: p.status === 'ativa' ? '#22c55e' : '#e74c3c', border: `1px solid ${p.status === 'ativa' ? 'rgba(34,197,94,0.2)' : 'rgba(192,57,43,0.2)'}` }}>
                        {p.status === 'ativa' ? 'Ativa' : 'Encerrada'}
                      </span>
                    </div>
                    {p.descricao && <p style={{ fontSize: '13px', color: '#8FA4C0', marginBottom: '8px' }}>{p.descricao}</p>}
                    <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#8FA4C0' }}>
                      <span>📍 {segLabel[p.segmentacao] || p.segmentacao}</span>
                      {p.regiao && <span>🗺 {p.regiao}</span>}
                      <span>📅 {new Date(p.criado_em).toLocaleDateString('pt-BR')}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                    <button onClick={() => router.push(`/dashboard/pesquisas/${p.id}`)}
                      style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '8px', color: '#C9A84C', fontSize: '12px', padding: '8px 14px', cursor: 'pointer' }}>
                      Ver resultados
                    </button>
                    {p.status === 'ativa' && (
                      <button onClick={() => encerrar(p.id)}
                        style={{ background: 'rgba(192,57,43,0.1)', border: '1px solid rgba(192,57,43,0.2)', borderRadius: '8px', color: '#e74c3c', fontSize: '12px', padding: '8px 14px', cursor: 'pointer' }}>
                        Encerrar
                      </button>
                    )}
                    <button onClick={() => excluir(p.id)}
                      style={{ background: 'transparent', border: '1px solid #1C3558', borderRadius: '8px', color: '#8FA4C0', fontSize: '12px', padding: '8px 14px', cursor: 'pointer' }}>
                      🗑
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
