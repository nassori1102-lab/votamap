'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type Lider = {
  id: string
  nome: string
  telefone: string
  whatsapp: string
  bairro: string
  cidade: string
  estado: string
  zona_eleitoral: string
  ativo: boolean
  criado_em: string
}

export default function LideresPage() {
  const [lideres, setLideres] = useState<Lider[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function verificarECarregar() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      await carregarLideres()
    }
    verificarECarregar()
  }, [])

  async function carregarLideres() {
    const { data, error } = await supabase
      .from('lideres_regionais')
      .select('*')
      .order('criado_em', { ascending: false })
    if (!error && data) setLideres(data)
    setLoading(false)
  }

  const lideresFiltrados = lideres.filter(l =>
    l.nome.toLowerCase().includes(busca.toLowerCase()) ||
    l.bairro.toLowerCase().includes(busca.toLowerCase()) ||
    l.cidade.toLowerCase().includes(busca.toLowerCase())
  )

  const estilos = {
    page: { minHeight:'100vh', background:'#0B1F3A', fontFamily:"'IBM Plex Sans', sans-serif" } as React.CSSProperties,
    grade: { position:'fixed' as const, inset:0, pointerEvents:'none' as const, zIndex:0, backgroundImage:`repeating-linear-gradient(0deg, transparent, transparent 80px, rgba(201,168,76,0.02) 80px, rgba(201,168,76,0.02) 81px), repeating-linear-gradient(90deg, transparent, transparent 80px, rgba(201,168,76,0.02) 80px, rgba(201,168,76,0.02) 81px)` },
    nav: { position:'fixed' as const, top:0, left:0, right:0, zIndex:100, height:'64px', background:'rgba(11,31,58,0.95)', backdropFilter:'blur(20px)', borderBottom:'1px solid rgba(201,168,76,0.15)', display:'flex', alignItems:'center', padding:'0 32px', justifyContent:'space-between' },
    main: { paddingTop:'88px', padding:'88px 32px 40px', position:'relative' as const, zIndex:1 },
  }
  return (
    <div style={estilos.page}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap" rel="stylesheet" />
      <div style={estilos.grade} />

      {/* NAV */}
      <nav style={estilos.nav}>
        <div style={{ display:'flex', alignItems:'center', gap:'16px' }}>
          <button onClick={() => router.push('/dashboard')} style={{ background:'transparent', border:'none', color:'#8FA4C0', cursor:'pointer', fontSize:'13px', display:'flex', alignItems:'center', gap:'6px' }}>
            ← Voltar
          </button>
          <div style={{ width:'1px', height:'20px', background:'#1C3558' }} />
          <span style={{ fontFamily:"'Playfair Display', serif", fontSize:'20px', fontWeight:800, color:'#FFFFFF' }}>
            Vota<span style={{ color:'#C9A84C' }}>Map</span>
          </span>
        </div>
        <button onClick={() => router.push('/dashboard/lideres/novo')}
          style={{ background:'linear-gradient(135deg, #E8C87A, #A07830)', border:'none', borderRadius:'8px', color:'#0B1F3A', fontSize:'14px', fontWeight:600, padding:'10px 22px', cursor:'pointer', fontFamily:"'IBM Plex Sans', sans-serif" }}>
          + Novo Líder
        </button>
      </nav>

      <main style={estilos.main}>
        {/* Cabeçalho */}
        <div style={{ marginBottom:'32px' }}>
          <div style={{ fontSize:'11px', fontWeight:600, letterSpacing:'2.5px', textTransform:'uppercase' as const, color:'#C9A84C', display:'flex', alignItems:'center', gap:'10px', marginBottom:'10px' }}>
            <span style={{ width:'24px', height:'1px', background:'#A07830', display:'inline-block' }} />
            Gestão de Lideranças
          </div>
          <h1 style={{ fontFamily:"'Playfair Display', serif", fontSize:'32px', fontWeight:800, color:'#FFFFFF', marginBottom:'6px' }}>
            Líderes Regionais
          </h1>
          <p style={{ fontSize:'14px', color:'#8FA4C0', fontWeight:300 }}>
            {lideres.length} líder{lideres.length !== 1 ? 'es' : ''} cadastrado{lideres.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Busca */}
        <div style={{ marginBottom:'24px' }}>
          <input
            type="text"
            placeholder="Buscar por nome, bairro ou cidade..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            style={{ width:'100%', maxWidth:'480px', padding:'12px 16px', background:'#0F2040', border:'1px solid #1C3558', borderRadius:'8px', color:'#E8EDF5', fontSize:'14px', outline:'none', fontFamily:"'IBM Plex Sans', sans-serif" }}
            onFocus={e => e.target.style.borderColor='#C9A84C'}
            onBlur={e => e.target.style.borderColor='#1C3558'}
          />
        </div>

        {/* Lista */}
        {loading ? (
          <div style={{ color:'#C9A84C', fontSize:'14px' }}>Carregando líderes...</div>
        ) : lideresFiltrados.length === 0 ? (
          <div style={{ background:'#0F2040', border:'1px solid #1C3558', borderRadius:'12px', padding:'60px', textAlign:'center' as const }}>
            <div style={{ fontSize:'40px', marginBottom:'16px' }}>👥</div>
            <div style={{ fontSize:'18px', fontWeight:600, color:'#E8EDF5', marginBottom:'8px' }}>
              {busca ? 'Nenhum líder encontrado' : 'Nenhum líder cadastrado ainda'}
            </div>
            <div style={{ fontSize:'14px', color:'#8FA4C0', marginBottom:'24px' }}>
              {busca ? 'Tente buscar com outros termos' : 'Comece cadastrando o primeiro líder regional da sua campanha'}
            </div>
            {!busca && (
              <button onClick={() => router.push('/dashboard/lideres/novo')}
                style={{ background:'linear-gradient(135deg, #E8C87A, #A07830)', border:'none', borderRadius:'8px', color:'#0B1F3A', fontSize:'14px', fontWeight:600, padding:'12px 28px', cursor:'pointer' }}>
                + Cadastrar primeiro líder
              </button>
            )}
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(320px, 1fr))', gap:'16px' }}>
            {lideresFiltrados.map(lider => (
              <div key={lider.id}
                onClick={() => router.push(`/dashboard/lideres/${lider.id}`)}
                style={{ background:'#0F2040', border:'1px solid #1C3558', borderRadius:'12px', padding:'24px', cursor:'pointer', transition:'all .2s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor='rgba(201,168,76,0.4)'; (e.currentTarget as HTMLDivElement).style.transform='translateY(-2px)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor='#1C3558'; (e.currentTarget as HTMLDivElement).style.transform='translateY(0)' }}
              >
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'16px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                    <div style={{ width:'44px', height:'44px', borderRadius:'50%', background:'rgba(201,168,76,0.15)', border:'1px solid rgba(201,168,76,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'16px', fontWeight:700, color:'#C9A84C' }}>
                      {lider.nome.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize:'15px', fontWeight:600, color:'#E8EDF5' }}>{lider.nome}</div>
                      <div style={{ fontSize:'12px', color:'#8FA4C0' }}>{lider.bairro} · {lider.cidade}/{lider.estado}</div>
                    </div>
                  </div>
                  <div style={{ fontSize:'10px', fontWeight:600, padding:'3px 10px', borderRadius:'100px', background: lider.ativo ? 'rgba(201,168,76,0.1)' : 'rgba(192,57,43,0.1)', border:`1px solid ${lider.ativo ? 'rgba(201,168,76,0.2)' : 'rgba(192,57,43,0.2)'}`, color: lider.ativo ? '#C9A84C' : '#e74c3c' }}>
                    {lider.ativo ? 'Ativo' : 'Inativo'}
                  </div>
                </div>
                <div style={{ display:'flex', gap:'16px', fontSize:'12px', color:'#8FA4C0' }}>
                  {lider.telefone && <span>📞 {lider.telefone}</span>}
                  {lider.zona_eleitoral && <span>🗳 Zona {lider.zona_eleitoral}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}