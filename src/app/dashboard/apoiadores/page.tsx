'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

type Apoiador = {
  id: string
  nome: string
  telefone: string
  bairro: string
  cidade: string
  estado: string
  zona_eleitoral: string
  engajamento: number
  criado_em: string
  lider_id: string
  lideres_regionais?: { nome: string }
}

type Lider = {
  id: string
  nome: string
}

function ApoiadoresConteudo() {
  const [apoiadores, setApoiadores] = useState<Apoiador[]>([])
  const [lideres, setLideres] = useState<Lider[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtroLider, setFiltroLider] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    const liderParam = searchParams.get('lider')
    if (liderParam) setFiltroLider(liderParam)
    async function carregar() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: apoiadoresData } = await supabase
        .from('apoiadores')
        .select('*, lideres_regionais(nome)')
        .order('criado_em', { ascending: false })
      if (apoiadoresData) setApoiadores(apoiadoresData)
      const { data: lideresData } = await supabase
        .from('lideres_regionais')
        .select('id, nome')
        .order('nome')
      if (lideresData) setLideres(lideresData)
      setLoading(false)
    }
    carregar()
  }, [])

  const apoiadoresFiltrados = apoiadores.filter(a => {
    const matchBusca = a.nome.toLowerCase().includes(busca.toLowerCase()) ||
      a.bairro?.toLowerCase().includes(busca.toLowerCase()) ||
      a.cidade?.toLowerCase().includes(busca.toLowerCase())
    const matchLider = filtroLider ? a.lider_id === filtroLider : true
    return matchBusca && matchLider
  })

  function estrelas(n: number) {
    return Array.from({ length: 5 }, (_, i) => (
      <span key={i} style={{ color: i < n ? '#C9A84C' : '#1C3558', fontSize:'12px' }}>★</span>
    ))
  }
  return (
    <div style={{ minHeight:'100vh', background:'#0B1F3A', fontFamily:"'IBM Plex Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap" rel="stylesheet" />
      <div style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:0, backgroundImage:`repeating-linear-gradient(0deg, transparent, transparent 80px, rgba(201,168,76,0.02) 80px, rgba(201,168,76,0.02) 81px), repeating-linear-gradient(90deg, transparent, transparent 80px, rgba(201,168,76,0.02) 80px, rgba(201,168,76,0.02) 81px)` }} />

      <nav style={{ position:'fixed', top:0, left:0, right:0, zIndex:100, height:'64px', background:'rgba(11,31,58,0.95)', backdropFilter:'blur(20px)', borderBottom:'1px solid rgba(201,168,76,0.15)', display:'flex', alignItems:'center', padding:'0 32px', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'16px' }}>
          <button onClick={() => router.push('/dashboard')} style={{ background:'transparent', border:'none', color:'#8FA4C0', cursor:'pointer', fontSize:'13px' }}>← Voltar</button>
          <div style={{ width:'1px', height:'20px', background:'#1C3558' }} />
          <span style={{ fontFamily:"'Playfair Display', serif", fontSize:'20px', fontWeight:800, color:'#FFFFFF' }}>Vota<span style={{ color:'#C9A84C' }}>Map</span></span>
        </div>
        <button onClick={() => router.push('/dashboard/apoiadores/novo')}
          style={{ background:'linear-gradient(135deg, #E8C87A, #A07830)', border:'none', borderRadius:'8px', color:'#0B1F3A', fontSize:'14px', fontWeight:600, padding:'10px 22px', cursor:'pointer', fontFamily:"'IBM Plex Sans', sans-serif" }}>
          + Novo Apoiador
        </button>
      </nav>

      <main style={{ paddingTop:'88px', padding:'88px 32px 40px', position:'relative', zIndex:1 }}>
        <div style={{ marginBottom:'32px' }}>
          <div style={{ fontSize:'11px', fontWeight:600, letterSpacing:'2.5px', textTransform:'uppercase' as const, color:'#C9A84C', display:'flex', alignItems:'center', gap:'10px', marginBottom:'10px' }}>
            <span style={{ width:'24px', height:'1px', background:'#A07830', display:'inline-block' }} />
            Base Eleitoral
          </div>
          <h1 style={{ fontFamily:"'Playfair Display', serif", fontSize:'32px', fontWeight:800, color:'#FFFFFF', marginBottom:'6px' }}>Apoiadores</h1>
          <p style={{ fontSize:'14px', color:'#8FA4C0', fontWeight:300 }}>{apoiadores.length} apoiador{apoiadores.length !== 1 ? 'es' : ''} cadastrado{apoiadores.length !== 1 ? 's' : ''}</p>
        </div>

        {/* FILTROS */}
        <div style={{ display:'flex', gap:'12px', marginBottom:'24px', flexWrap:'wrap' as const }}>
          <input type="text" placeholder="Buscar por nome, bairro ou cidade..." value={busca} onChange={e => setBusca(e.target.value)}
            style={{ flex:1, minWidth:'240px', padding:'11px 16px', background:'#0F2040', border:'1px solid #1C3558', borderRadius:'8px', color:'#E8EDF5', fontSize:'14px', outline:'none', fontFamily:"'IBM Plex Sans', sans-serif" }}
            onFocus={e => e.target.style.borderColor='#C9A84C'} onBlur={e => e.target.style.borderColor='#1C3558'} />
          <select value={filtroLider} onChange={e => setFiltroLider(e.target.value)}
            style={{ padding:'11px 16px', background:'#0F2040', border:'1px solid #1C3558', borderRadius:'8px', color: filtroLider ? '#E8EDF5' : '#8FA4C0', fontSize:'14px', outline:'none', fontFamily:"'IBM Plex Sans', sans-serif", cursor:'pointer', minWidth:'200px' }}
            onFocus={e => e.target.style.borderColor='#C9A84C'} onBlur={e => e.target.style.borderColor='#1C3558'}>
            <option value="">Todos os líderes</option>
            {lideres.map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
          </select>
          {filtroLider && (
            <button onClick={() => setFiltroLider('')} style={{ background:'rgba(201,168,76,0.1)', border:'1px solid rgba(201,168,76,0.2)', borderRadius:'8px', color:'#C9A84C', fontSize:'13px', padding:'11px 16px', cursor:'pointer', fontFamily:"'IBM Plex Sans', sans-serif" }}>
              ✕ Limpar filtro
            </button>
          )}
        </div>

        {/* LISTA */}
        {loading ? (
          <div style={{ color:'#C9A84C', fontSize:'14px' }}>Carregando apoiadores...</div>
        ) : apoiadoresFiltrados.length === 0 ? (
          <div style={{ background:'#0F2040', border:'1px solid #1C3558', borderRadius:'12px', padding:'60px', textAlign:'center' as const }}>
            <div style={{ fontSize:'40px', marginBottom:'16px' }}>🗳</div>
            <div style={{ fontSize:'18px', fontWeight:600, color:'#E8EDF5', marginBottom:'8px' }}>
              {busca || filtroLider ? 'Nenhum apoiador encontrado' : 'Nenhum apoiador cadastrado ainda'}
            </div>
            <div style={{ fontSize:'14px', color:'#8FA4C0', marginBottom:'24px' }}>
              {busca || filtroLider ? 'Tente outros filtros' : 'Os líderes regionais cadastram apoiadores em campo'}
            </div>
            {!busca && !filtroLider && (
              <button onClick={() => router.push('/dashboard/apoiadores/novo')}
                style={{ background:'linear-gradient(135deg, #E8C87A, #A07830)', border:'none', borderRadius:'8px', color:'#0B1F3A', fontSize:'14px', fontWeight:600, padding:'12px 28px', cursor:'pointer' }}>
                + Cadastrar primeiro apoiador
              </button>
            )}
          </div>
        ) : (
          <div style={{ background:'#0F2040', border:'1px solid #1C3558', borderRadius:'12px', overflow:'hidden' }}>
            {/* Header da tabela */}
            <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr 80px', padding:'12px 20px', borderBottom:'1px solid #1C3558', fontSize:'11px', fontWeight:600, letterSpacing:'1px', textTransform:'uppercase' as const, color:'#8FA4C0' }}>
              <span>Apoiador</span>
              <span>Líder</span>
              <span>Localização</span>
              <span>Engajamento</span>
              <span>Data</span>
            </div>
            {apoiadoresFiltrados.map((a, i) => (
              <div key={a.id}
                style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr 80px', padding:'14px 20px', borderBottom: i < apoiadoresFiltrados.length-1 ? '1px solid rgba(28,53,88,0.5)' : 'none', alignItems:'center', transition:'background .15s', cursor:'default' }}
                onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background='rgba(201,168,76,0.03)'}
                onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background='transparent'}
              >
                <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                  <div style={{ width:'34px', height:'34px', borderRadius:'50%', background:'rgba(107,163,214,0.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'13px', fontWeight:700, color:'#6ba3d6', flexShrink:0 }}>
                    {a.nome.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize:'14px', fontWeight:500, color:'#E8EDF5' }}>{a.nome}</div>
                    {a.telefone && <div style={{ fontSize:'11px', color:'#8FA4C0' }}>{a.telefone}</div>}
                  </div>
                </div>
                <div style={{ fontSize:'13px', color:'#8FA4C0' }}>{a.lideres_regionais?.nome || '—'}</div>
                <div style={{ fontSize:'13px', color:'#8FA4C0' }}>{a.bairro ? `${a.bairro}, ${a.cidade}` : '—'}</div>
                <div style={{ display:'flex', gap:'1px' }}>{estrelas(a.engajamento || 3)}</div>
                <div style={{ fontSize:'11px', color:'#8FA4C0' }}>{new Date(a.criado_em).toLocaleDateString('pt-BR')}</div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

export default function ApoiadoresPage() {
  return (
    <Suspense fallback={<div style={{ minHeight:'100vh', background:'#0B1F3A', display:'flex', alignItems:'center', justifyContent:'center', color:'#C9A84C' }}>Carregando...</div>}>
      <ApoiadoresConteudo />
    </Suspense>
  )
}