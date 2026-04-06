'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'

const MapaComponent = dynamic(() => import('@/components/mapa/MapaComponent'), {
  ssr: false,
  loading: () => (
    <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', background:'#0F2040', borderRadius:'12px', color:'#C9A84C', fontSize:'14px' }}>
      Carregando mapa...
    </div>
  )
})

type Lider = {
  id: string
  nome: string
  bairro: string
  cidade: string
  estado: string
  latitude: number | null
  longitude: number | null
  ativo: boolean
  telefone: string
  zona_eleitoral: string
  total_apoiadores?: number
}

export default function MapaPage() {
  const [lideres, setLideres] = useState<Lider[]>([])
  const [loading, setLoading] = useState(true)
  const [liderSelecionado, setLiderSelecionado] = useState<Lider | null>(null)
  const [geocodificando, setGeocodificando] = useState(false)
  const [progresso, setProgresso] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function carregar() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      await carregarLideres()
    }
    carregar()
  }, [])

  async function carregarLideres() {
    const { data } = await supabase
      .from('lideres_regionais')
      .select('id, nome, bairro, cidade, estado, latitude, longitude, ativo, telefone, zona_eleitoral')
      .order('nome')
    if (data) setLideres(data)
    setLoading(false)
  }

  async function geocodificarLideres() {
    setGeocodificando(true)
    const semCoordenadas = lideres.filter(l => !l.latitude || !l.longitude)
    if (semCoordenadas.length === 0) { setGeocodificando(false); return }

    for (let i = 0; i < semCoordenadas.length; i++) {
      const lider = semCoordenadas[i]
      setProgresso(`Localizando ${i + 1} de ${semCoordenadas.length}: ${lider.nome}...`)
      try {
        const endereco = `${lider.bairro}, ${lider.cidade}, ${lider.estado}, Brasil`
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(endereco)}&limit=1`)
        const data = await res.json()
        if (data.length > 0) {
          const lat = parseFloat(data[0].lat)
          const lng = parseFloat(data[0].lon)
          await supabase.from('lideres_regionais').update({ latitude: lat, longitude: lng }).eq('id', lider.id)
          setLideres(prev => prev.map(l => l.id === lider.id ? { ...l, latitude: lat, longitude: lng } : l))
        }
        await new Promise(r => setTimeout(r, 1100))
      } catch {}
    }

    setProgresso('')
    setGeocodificando(false)
    await carregarLideres()
  }

  const lideresAtivos = lideres.filter(l => l.ativo).length
  const lideresInativos = lideres.filter(l => !l.ativo).length
  const lideresNoMapa = lideres.filter(l => l.latitude && l.longitude).length
  const semCoordenadas = lideres.filter(l => !l.latitude || !l.longitude).length
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
        {semCoordenadas > 0 && (
          <button onClick={geocodificarLideres} disabled={geocodificando}
            style={{ background: geocodificando ? 'rgba(201,168,76,0.3)' : 'linear-gradient(135deg, #E8C87A, #A07830)', border:'none', borderRadius:'8px', color:'#0B1F3A', fontSize:'13px', fontWeight:600, padding:'9px 20px', cursor: geocodificando ? 'not-allowed' : 'pointer', fontFamily:"'IBM Plex Sans', sans-serif" }}>
            {geocodificando ? progresso || 'Localizando...' : `📍 Localizar ${semCoordenadas} líder${semCoordenadas > 1 ? 'es' : ''} no mapa`}
          </button>
        )}
      </nav>

      <main style={{ paddingTop:'64px', height:'100vh', display:'flex', flexDirection:'column', position:'relative', zIndex:1 }}>

        {/* STATS BAR */}
        <div style={{ padding:'16px 32px', display:'flex', alignItems:'center', gap:'24px', borderBottom:'1px solid #1C3558', flexWrap:'wrap' as const }}>
          <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
            <div style={{ fontFamily:"'Playfair Display', serif", fontSize:'22px', fontWeight:800, color:'#C9A84C' }}>{lideres.length}</div>
            <div style={{ fontSize:'12px', color:'#8FA4C0' }}>Total de líderes</div>
          </div>
          <div style={{ width:'1px', height:'24px', background:'#1C3558' }} />
          <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
            <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:'#C9A84C' }} />
            <span style={{ fontSize:'13px', color:'#8FA4C0' }}>{lideresAtivos} ativos</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
            <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:'#ef4444' }} />
            <span style={{ fontSize:'13px', color:'#8FA4C0' }}>{lideresInativos} inativos</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
            <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:'#6ba3d6' }} />
            <span style={{ fontSize:'13px', color:'#8FA4C0' }}>{lideresNoMapa} no mapa</span>
          </div>
          {semCoordenadas > 0 && (
            <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
              <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:'#8FA4C0' }} />
              <span style={{ fontSize:'13px', color:'#8FA4C0' }}>{semCoordenadas} sem localização</span>
            </div>
          )}
        </div>

        {/* MAPA + PAINEL LATERAL */}
        <div style={{ flex:1, display:'flex', overflow:'hidden' }}>

          {/* MAPA */}
          <div style={{ flex:1, padding:'16px', position:'relative' }}>
            {loading ? (
              <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', background:'#0F2040', borderRadius:'12px', color:'#C9A84C' }}>
                Carregando líderes...
              </div>
            ) : lideres.length === 0 ? (
              <div style={{ width:'100%', height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'#0F2040', borderRadius:'12px' }}>
                <div style={{ fontSize:'48px', marginBottom:'16px' }}>🗺️</div>
                <div style={{ fontFamily:"'Playfair Display', serif", fontSize:'20px', fontWeight:700, color:'#E8EDF5', marginBottom:'8px' }}>Nenhum líder cadastrado</div>
                <div style={{ fontSize:'14px', color:'#8FA4C0', marginBottom:'24px' }}>Cadastre líderes regionais para visualizá-los no mapa</div>
                <button onClick={() => router.push('/dashboard/lideres/novo')}
                  style={{ background:'linear-gradient(135deg, #E8C87A, #A07830)', border:'none', borderRadius:'8px', color:'#0B1F3A', fontSize:'14px', fontWeight:600, padding:'12px 28px', cursor:'pointer' }}>
                  + Cadastrar líder
                </button>
              </div>
            ) : lideresNoMapa === 0 ? (
              <div style={{ width:'100%', height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'#0F2040', borderRadius:'12px' }}>
                <div style={{ fontSize:'48px', marginBottom:'16px' }}>📍</div>
                <div style={{ fontFamily:"'Playfair Display', serif", fontSize:'20px', fontWeight:700, color:'#E8EDF5', marginBottom:'8px' }}>Líderes sem localização</div>
                <div style={{ fontSize:'14px', color:'#8FA4C0', marginBottom:'24px' }}>Clique em "Localizar líderes no mapa" para geocodificar automaticamente</div>
                <button onClick={geocodificarLideres} disabled={geocodificando}
                  style={{ background:'linear-gradient(135deg, #E8C87A, #A07830)', border:'none', borderRadius:'8px', color:'#0B1F3A', fontSize:'14px', fontWeight:600, padding:'12px 28px', cursor:'pointer' }}>
                  📍 Localizar agora
                </button>
              </div>
            ) : (
              <MapaComponent lideres={lideres} onLiderClick={setLiderSelecionado} />
            )}
          </div>

          {/* PAINEL LATERAL */}
          <div style={{ width:'300px', borderLeft:'1px solid #1C3558', overflow:'auto', background:'rgba(15,32,64,0.5)' }}>
            <div style={{ padding:'16px', borderBottom:'1px solid #1C3558' }}>
              <div style={{ fontSize:'11px', fontWeight:600, letterSpacing:'1.5px', textTransform:'uppercase' as const, color:'#C9A84C', marginBottom:'4px' }}>Líderes</div>
              <div style={{ fontSize:'12px', color:'#8FA4C0' }}>Clique para ver no mapa</div>
            </div>
            <div style={{ padding:'8px' }}>
              {lideres.map(lider => (
                <div key={lider.id}
                  onClick={() => { setLiderSelecionado(lider); router.push(`/dashboard/lideres/${lider.id}`) }}
                  style={{ padding:'12px', borderRadius:'8px', cursor:'pointer', marginBottom:'4px', border:`1px solid ${liderSelecionado?.id === lider.id ? 'rgba(201,168,76,0.4)' : 'transparent'}`, background: liderSelecionado?.id === lider.id ? 'rgba(201,168,76,0.08)' : 'transparent', transition:'all .15s' }}
                  onMouseEnter={e => { if (liderSelecionado?.id !== lider.id) (e.currentTarget as HTMLDivElement).style.background='rgba(255,255,255,0.03)' }}
                  onMouseLeave={e => { if (liderSelecionado?.id !== lider.id) (e.currentTarget as HTMLDivElement).style.background='transparent' }}
                >
                  <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                    <div style={{ width:'32px', height:'32px', borderRadius:'50%', background: lider.ativo ? 'rgba(201,168,76,0.15)' : 'rgba(239,68,68,0.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px', fontWeight:700, color: lider.ativo ? '#C9A84C' : '#ef4444', flexShrink:0 }}>
                      {lider.nome.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:'13px', fontWeight:500, color:'#E8EDF5', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{lider.nome}</div>
                      <div style={{ fontSize:'11px', color:'#8FA4C0', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{lider.bairro} · {lider.cidade}</div>
                    </div>
                    <div style={{ width:'6px', height:'6px', borderRadius:'50%', background: lider.latitude ? '#C9A84C' : '#3D5470', flexShrink:0 }} title={lider.latitude ? 'No mapa' : 'Sem localização'} />
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </main>

      <style>{`
        .votamap-popup .leaflet-popup-content-wrapper {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          padding: 0 !important;
        }
        .votamap-popup .leaflet-popup-tip { display: none !important; }
        .votamap-popup .leaflet-popup-content { margin: 0 !important; }
      `}</style>
    </div>
  )
}