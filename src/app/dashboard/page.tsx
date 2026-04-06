'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Dashboard() {
  const [usuario, setUsuario] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [metricas, setMetricas] = useState({ lideres: 0, apoiadores: 0, regioes: 0, lideres_ativos: 0 })
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
  async function carregar() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUsuario(user)

      // Verificar perfil — contador vai direto para o financeiro
      const { data: perfil } = await supabase
        .from('usuarios')
        .select('perfil')
        .eq('id', user.id)
        .single()

      if (perfil?.perfil === 'contador') {
        router.push('/dashboard/financeiro')
        return
      }

  const [{ count: lideres }, { count: apoiadores }, { data: regioes }, { count: lideres_ativos }] = await Promise.all([
        supabase.from('lideres_regionais').select('*', { count:'exact', head:true }),
        supabase.from('apoiadores').select('*', { count:'exact', head:true }),
        supabase.from('lideres_regionais').select('cidade').eq('ativo', true),
        supabase.from('lideres_regionais').select('*', { count:'exact', head:true }).eq('ativo', true),
      ])
      const cidadesUnicas = new Set(regioes?.map((l: any) => l.cidade) || []).size
      setLoading(false)
    }
    carregar()
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) return (
    <div style={{ minHeight:'100vh', background:'#0B1F3A', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Inter, system-ui, sans-serif', color:'#C9A84C', fontSize:'16px' }}>
      Carregando...
    </div>
  )

  const modulos = [
    { titulo:'Candidato', desc:'Perfil, cargo e dados da candidatura', icone:'🏛️', href:'/dashboard/candidato', ativo:true },
    { titulo:'Líderes Regionais', desc:'Cadastre e gerencie sua rede de líderes', icone:'👥', href:'/dashboard/lideres', ativo:true },
    { titulo:'Apoiadores', desc:'Base eleitoral cadastrada pelos líderes', icone:'🗳', href:'/dashboard/apoiadores', ativo:true },
    { titulo:'Mapa de Cobertura', desc:'Visualize regiões com e sem líderes', icone:'🗺️', href:'/dashboard/mapa', ativo:true },
    { titulo:'Equipe', desc:'Gerencie acessos da equipe de campanha', icone:'🔐', href:'/dashboard/equipe', ativo:true },
    { titulo:'Materiais', desc:'Biblioteca de artes para divulgação', icone:'🎨', href:'/dashboard/materiais', ativo:true },
    { titulo:'Financeiro', desc:'Controle de investimentos por região', icone:'💰', href:'/dashboard/financeiro', ativo:true },
    { titulo:'Comunicação', desc:'SMS, WhatsApp e e-mail em massa', icone:'💬', href:'/dashboard/comunicacao', ativo:false },
{ titulo:'Agenda', desc:'Eventos e compromissos da campanha', icone:'📅', href:'/dashboard/agenda', ativo:true },    { titulo:'Apuração TSE', desc:'Cruzamento de votos com base cadastrada', icone:'📊', href:'/dashboard/apuracao', ativo:false },
  ]

  const cards = [
    { label:'Líderes Cadastrados', valor: metricas.lideres, sub: `${metricas.lideres_ativos} ativos`, cor:'#C9A84C', icone:'👥' },
    { label:'Apoiadores', valor: metricas.apoiadores, sub:'na base eleitoral', cor:'#6ba3d6', icone:'🗳' },
    { label:'Cidades Cobertas', valor: metricas.regioes, sub:'com líderes ativos', cor:'#5eead4', icone:'🗺️' },
    { label:'Meta de Votos', valor:'—', sub:'configure sua meta', cor:'#86efac', icone:'📊' },
  ]

  return (
    <div style={{ minHeight:'100vh', background:'#0B1F3A', fontFamily:'Inter, system-ui, sans-serif' }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      <div style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:0, backgroundImage:`repeating-linear-gradient(0deg, transparent, transparent 80px, rgba(201,168,76,0.02) 80px, rgba(201,168,76,0.02) 81px), repeating-linear-gradient(90deg, transparent, transparent 80px, rgba(201,168,76,0.02) 80px, rgba(201,168,76,0.02) 81px)` }} />

      <nav style={{ position:'fixed', top:0, left:0, right:0, zIndex:100, height:'60px', background:'rgba(11,31,58,0.97)', backdropFilter:'blur(20px)', borderBottom:'1px solid rgba(201,168,76,0.15)', display:'flex', alignItems:'center', padding:'0 28px', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          <div style={{ width:'30px', height:'30px', background:'linear-gradient(135deg, #C9A84C, #A07830)', borderRadius:'6px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'15px' }}>🗳</div>
          <span style={{ fontSize:'17px', fontWeight:700, color:'#FFFFFF', letterSpacing:'-0.3px' }}>Vota<span style={{ color:'#C9A84C' }}>Map</span></span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'20px' }}>
          <span style={{ fontSize:'13px', color:'#8FA4C0' }}>{usuario?.email}</span>
          <button onClick={handleLogout} style={{ background:'transparent', border:'1px solid #1C3558', borderRadius:'7px', color:'#8FA4C0', fontSize:'13px', padding:'7px 14px', cursor:'pointer', fontFamily:'Inter, sans-serif' }}>Sair</button>
        </div>
      </nav>

      <main style={{ paddingTop:'84px', padding:'84px 28px 40px', position:'relative', zIndex:1, maxWidth:'1200px', margin:'0 auto' }}>

        <div style={{ marginBottom:'32px' }}>
          <div style={{ fontSize:'11px', fontWeight:600, letterSpacing:'2px', textTransform:'uppercase', color:'#C9A84C', display:'flex', alignItems:'center', gap:'8px', marginBottom:'8px' }}>
            <span style={{ width:'20px', height:'1px', background:'#A07830', display:'inline-block' }}></span>
            Painel Estratégico
          </div>
          <h1 style={{ fontSize:'26px', fontWeight:700, color:'#FFFFFF', letterSpacing:'-0.5px', marginBottom:'4px' }}>
            Bem-vindo ao VotaMap
          </h1>
          <p style={{ fontSize:'14px', color:'#8FA4C0', fontWeight:400 }}>
            Sua campanha organizada em um só lugar · Eleições 2026
          </p>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))', gap:'14px', marginBottom:'36px' }}>
          {cards.map(card => (
            <div key={card.label} style={{ background:'#0F2040', border:'1px solid #1C3558', borderRadius:'10px', padding:'20px' }}>
              <div style={{ fontSize:'22px', marginBottom:'10px' }}>{card.icone}</div>
              <div style={{ fontSize:'11px', textTransform:'uppercase', letterSpacing:'1px', color:'#8FA4C0', marginBottom:'6px', fontWeight:500 }}>{card.label}</div>
              <div style={{ fontSize:'32px', fontWeight:700, color:card.cor, lineHeight:1, letterSpacing:'-1px' }}>{card.valor}</div>
              <div style={{ fontSize:'12px', color:'#3D5470', marginTop:'4px' }}>{card.sub}</div>
            </div>
          ))}
        </div>

        <div style={{ fontSize:'13px', fontWeight:600, color:'#8FA4C0', textTransform:'uppercase', letterSpacing:'1.5px', marginBottom:'14px' }}>Módulos da campanha</div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(240px, 1fr))', gap:'12px' }}>
          {modulos.map(modulo => (
            <div key={modulo.titulo} onClick={() => modulo.ativo && router.push(modulo.href)}
              style={{ background:'#0F2040', border:`1px solid ${modulo.ativo ? '#1C3558' : '#0D1830'}`, borderRadius:'10px', padding:'22px', cursor: modulo.ativo ? 'pointer' : 'default', opacity: modulo.ativo ? 1 : 0.45, transition:'all .2s', position:'relative', overflow:'hidden' }}
              onMouseEnter={e => { if(modulo.ativo){ (e.currentTarget as HTMLDivElement).style.borderColor='rgba(201,168,76,0.35)'; (e.currentTarget as HTMLDivElement).style.transform='translateY(-2px)' }}}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor=modulo.ativo?'#1C3558':'#0D1830'; (e.currentTarget as HTMLDivElement).style.transform='translateY(0)' }}
            >
              <div style={{ fontSize:'24px', marginBottom:'12px' }}>{modulo.icone}</div>
              <div style={{ fontSize:'15px', fontWeight:600, color:'#E8EDF5', marginBottom:'5px', letterSpacing:'-0.2px' }}>{modulo.titulo}</div>
              <div style={{ fontSize:'13px', color:'#8FA4C0', lineHeight:1.5 }}>{modulo.desc}</div>
              {!modulo.ativo && (
                <div style={{ position:'absolute', top:'14px', right:'14px', fontSize:'10px', fontWeight:600, letterSpacing:'0.8px', background:'rgba(201,168,76,0.08)', border:'1px solid rgba(201,168,76,0.15)', color:'#C9A84C', padding:'2px 8px', borderRadius:'100px' }}>
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