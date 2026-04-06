'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Dashboard() {
  const [usuario, setUsuario] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function verificarSessao() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUsuario(user)
      setLoading(false)
    }
    verificarSessao()
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) return (
    <div style={{ minHeight:'100vh', background:'#0B1F3A', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'IBM Plex Sans', sans-serif", color:'#C9A84C', fontSize:'16px' }}>
      Carregando...
    </div>
  )

  const modulos = [
    { titulo:'Líderes Regionais', desc:'Cadastre e gerencie sua rede de líderes por região', icone:'👥', href:'/dashboard/lideres', ativo:true },
    { titulo:'Apoiadores', desc:'Visualize todos os apoiadores cadastrados pelos líderes', icone:'🗳', href:'/dashboard/apoiadores', ativo:true },
    { titulo:'Mapa de Cobertura', desc:'Visualize regiões com e sem líderes no mapa', icone:'🗺️', href:'/dashboard/mapa', ativo:false },
    { titulo:'Comunicação', desc:'Envie SMS, WhatsApp e e-mail para sua base', icone:'💬', href:'/dashboard/comunicacao', ativo:false },
    { titulo:'Materiais', desc:'Biblioteca de artes e materiais para divulgação', icone:'🎨', href:'/dashboard/materiais', ativo:false },
    { titulo:'Financeiro', desc:'Controle de investimentos por região', icone:'💰', href:'/dashboard/financeiro', ativo:false },
  ]

  const cards = [
    { label:'Líderes Ativos', valor:'0', cor:'#C9A84C', icone:'👥' },
    { label:'Apoiadores', valor:'0', cor:'#6ba3d6', icone:'🗳' },
    { label:'Regiões Cobertas', valor:'0', cor:'#5eead4', icone:'🗺️' },
    { label:'Meta de Votos', valor:'0%', cor:'#86efac', icone:'📊' },
  ]
  return (
    <div style={{ minHeight:'100vh', background:'#0B1F3A', fontFamily:"'IBM Plex Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap" rel="stylesheet" />
      <div style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:0, backgroundImage:`repeating-linear-gradient(0deg, transparent, transparent 80px, rgba(201,168,76,0.02) 80px, rgba(201,168,76,0.02) 81px), repeating-linear-gradient(90deg, transparent, transparent 80px, rgba(201,168,76,0.02) 80px, rgba(201,168,76,0.02) 81px)` }} />

      <nav style={{ position:'fixed', top:0, left:0, right:0, zIndex:100, height:'64px', background:'rgba(11,31,58,0.95)', backdropFilter:'blur(20px)', borderBottom:'1px solid rgba(201,168,76,0.15)', display:'flex', alignItems:'center', padding:'0 32px', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          <div style={{ width:'32px', height:'32px', background:'linear-gradient(135deg, #C9A84C, #A07830)', borderRadius:'6px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'16px' }}>🗳</div>
          <span style={{ fontFamily:"'Playfair Display', serif", fontSize:'20px', fontWeight:800, color:'#FFFFFF' }}>Vota<span style={{ color:'#C9A84C' }}>Map</span></span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'24px' }}>
          <span style={{ fontSize:'13px', color:'#8FA4C0' }}>{usuario?.email}</span>
          <button onClick={handleLogout} style={{ background:'transparent', border:'1px solid #1C3558', borderRadius:'8px', color:'#8FA4C0', fontSize:'13px', padding:'8px 16px', cursor:'pointer', fontFamily:"'IBM Plex Sans', sans-serif" }}>
            Sair
          </button>
        </div>
      </nav>

      <main style={{ paddingTop:'96px', padding:'96px 32px 40px', position:'relative', zIndex:1 }}>
        <div style={{ marginBottom:'40px' }}>
          <div style={{ fontSize:'11px', fontWeight:600, letterSpacing:'2.5px', textTransform:'uppercase', color:'#C9A84C', display:'flex', alignItems:'center', gap:'10px', marginBottom:'12px' }}>
            <span style={{ width:'24px', height:'1px', background:'#A07830', display:'inline-block' }}></span>
            Painel Estratégico
          </div>
          <h1 style={{ fontFamily:"'Playfair Display', serif", fontSize:'36px', fontWeight:800, color:'#FFFFFF', letterSpacing:'-0.5px', marginBottom:'8px' }}>Bem-vindo ao VotaMap</h1>
          <p style={{ fontSize:'15px', color:'#8FA4C0', fontWeight:300 }}>Sua campanha organizada em um só lugar. Eleições 2026.</p>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:'16px', marginBottom:'40px' }}>
          {cards.map(card => (
            <div key={card.label} style={{ background:'#0F2040', border:'1px solid #1C3558', borderRadius:'12px', padding:'24px' }}>
              <div style={{ fontSize:'24px', marginBottom:'12px' }}>{card.icone}</div>
              <div style={{ fontSize:'11px', textTransform:'uppercase', letterSpacing:'1px', color:'#8FA4C0', marginBottom:'8px' }}>{card.label}</div>
              <div style={{ fontFamily:"'Playfair Display', serif", fontSize:'36px', fontWeight:800, color:card.cor, lineHeight:1 }}>{card.valor}</div>
            </div>
          ))}
        </div>

        <h2 style={{ fontFamily:"'Playfair Display', serif", fontSize:'20px', fontWeight:700, color:'#E8EDF5', marginBottom:'16px' }}>Módulos da campanha</h2>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(260px, 1fr))', gap:'16px' }}>
          {modulos.map(modulo => (
            <div key={modulo.titulo} onClick={() => modulo.ativo && router.push(modulo.href)}
              style={{ background:'#0F2040', border:`1px solid ${modulo.ativo ? '#1C3558' : '#111D30'}`, borderRadius:'12px', padding:'28px', cursor:modulo.ativo ? 'pointer' : 'default', opacity:modulo.ativo ? 1 : 0.5, transition:'all .25s', position:'relative', overflow:'hidden' }}
              onMouseEnter={e => { if(modulo.ativo){ (e.currentTarget as HTMLDivElement).style.borderColor='rgba(201,168,76,0.4)'; (e.currentTarget as HTMLDivElement).style.transform='translateY(-2px)' }}}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor=modulo.ativo?'#1C3558':'#111D30'; (e.currentTarget as HTMLDivElement).style.transform='translateY(0)' }}
            >
              <div style={{ fontSize:'28px', marginBottom:'14px' }}>{modulo.icone}</div>
              <div style={{ fontSize:'16px', fontWeight:600, color:'#E8EDF5', marginBottom:'8px' }}>{modulo.titulo}</div>
              <div style={{ fontSize:'13px', color:'#8FA4C0', lineHeight:1.6 }}>{modulo.desc}</div>
              {!modulo.ativo && (
                <div style={{ position:'absolute', top:'16px', right:'16px', fontSize:'10px', fontWeight:600, letterSpacing:'1px', background:'rgba(201,168,76,0.1)', border:'1px solid rgba(201,168,76,0.2)', color:'#C9A84C', padding:'3px 10px', borderRadius:'100px' }}>
                  Em breve
                </div>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}