'use client'

import { useEffect, useRef, useState } from 'react'

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
  foto_url?: string
}

type Apoiador = {
  id: string
  nome: string
  lider_id: string
  engajamento: number
  bairro: string
  cidade: string
}

type Props = {
  lideres: Lider[]
  apoiadores: Apoiador[]
  onLiderClick: (lider: Lider) => void
}

// Posiciona apoiadores em anel determinístico ao redor do líder
function posicaoApoiador(
  liderLat: number, liderLng: number,
  index: number, total: number
): [number, number] {
  const RAIO = 0.004 // graus (~440m)
  const angulo = (index / Math.max(total, 1)) * 2 * Math.PI
  return [
    liderLat + RAIO * Math.cos(angulo),
    liderLng + RAIO * Math.sin(angulo),
  ]
}

// Cor do heatmap baseada em razão 0-1
function corCalor(ratio: number): string {
  const hue = Math.round(220 - ratio * 220) // azul(220) → amarelo(60) → vermelho(0)
  const sat = 75 + ratio * 15
  const light = 55 - ratio * 10
  return `hsl(${hue}, ${sat}%, ${light}%)`
}

export default function MapaComponent({ lideres, apoiadores, onLiderClick }: Props) {
  const mapaRef = useRef<HTMLDivElement>(null)
  const mapaInstanceRef = useRef<any>(null)
  const layersRef = useRef<{ lideres: any; apoiadores: any; calor: any }>({
    lideres: null, apoiadores: null, calor: null,
  })

  const [showLideres, setShowLideres] = useState(true)
  const [showApoiadores, setShowApoiadores] = useState(true)
  const [showCalor, setShowCalor] = useState(false)

  // Inicializa o mapa uma única vez
  useEffect(() => {
    if (!mapaRef.current || mapaInstanceRef.current) return

    async function iniciarMapa() {
      const L = (await import('leaflet')).default
      await import('leaflet/dist/leaflet.css')

      const mapa = L.map(mapaRef.current!, { center: [-15.78, -47.93], zoom: 5, zoomControl: true })
      mapaInstanceRef.current = mapa

      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap © CARTO', maxZoom: 19,
      }).addTo(mapa)

      // ── CAMADA: MAPA DE CALOR ────────────────────────────────────────
      const calorLayer = L.layerGroup()
      const apoiadoresPorLider = new Map<string, number>()
      for (const a of apoiadores) {
        apoiadoresPorLider.set(a.lider_id, (apoiadoresPorLider.get(a.lider_id) || 0) + 1)
      }
      const maxCount = Math.max(...Array.from(apoiadoresPorLider.values()), 1)

      for (const lider of lideres) {
        if (!lider.latitude || !lider.longitude) continue
        const count = apoiadoresPorLider.get(lider.id) || 0
        if (count === 0) continue
        const ratio = count / maxCount
        const raioMetros = Math.min(900 + count * 90, 6000)
        L.circle([lider.latitude, lider.longitude], {
          radius: raioMetros,
          fillColor: corCalor(ratio),
          fillOpacity: 0.18 + ratio * 0.22,
          stroke: false,
        }).addTo(calorLayer)
      }

      // ── CAMADA: APOIADORES ───────────────────────────────────────────
      const apoiadoresLayer = L.layerGroup()
      const apoiadoresPorLiderLista = new Map<string, Apoiador[]>()
      for (const a of apoiadores) {
        if (!apoiadoresPorLiderLista.has(a.lider_id)) apoiadoresPorLiderLista.set(a.lider_id, [])
        apoiadoresPorLiderLista.get(a.lider_id)!.push(a)
      }

      for (const lider of lideres) {
        if (!lider.latitude || !lider.longitude) continue
        const lista = apoiadoresPorLiderLista.get(lider.id) || []
        lista.forEach((apoiador, idx) => {
          const [lat, lng] = posicaoApoiador(lider.latitude!, lider.longitude!, idx, lista.length)
          const engStr = '★'.repeat(apoiador.engajamento || 1) + '☆'.repeat(5 - (apoiador.engajamento || 1))
          const icone = L.divIcon({
            html: `<div style="
              width:12px; height:12px;
              background:#6ba3d6;
              border:2px solid white;
              border-radius:50%;
              box-shadow:0 1px 4px rgba(0,0,0,0.4);
            "></div>`,
            className: '',
            iconSize: [12, 12],
            iconAnchor: [6, 6],
            popupAnchor: [0, -10],
          })
          const marker = L.marker([lat, lng], { icon: icone })
          marker.bindPopup(`
            <div style="font-family:'IBM Plex Sans',sans-serif;background:#0F2040;border:1px solid #1C3558;border-radius:10px;padding:14px;min-width:180px;color:#E8EDF5;">
              <div style="font-weight:700;font-size:14px;margin-bottom:2px;color:#6ba3d6;">${apoiador.nome}</div>
              <div style="font-size:11px;color:#8FA4C0;margin-bottom:8px;">${apoiador.bairro ? apoiador.bairro + ' · ' : ''}${apoiador.cidade || ''}</div>
              <div style="font-size:13px;color:#C9A84C;letter-spacing:1px;">${engStr}</div>
              <div style="font-size:11px;color:#8FA4C0;margin-top:6px;">👥 Líder: ${lider.nome}</div>
            </div>
          `, { className: 'candmaps-popup', maxWidth: 240 })
          marker.addTo(apoiadoresLayer)
        })
      }

      // ── CAMADA: LÍDERES ──────────────────────────────────────────────
      const lideresLayer = L.layerGroup()
      for (const lider of lideres) {
        if (!lider.latitude || !lider.longitude) continue
        const cor = lider.ativo ? '#C9A84C' : '#ef4444'
        const totalApoiadores = apoiadoresPorLider.get(lider.id) || 0
        const avatarInner = lider.foto_url
          ? `<img src="${lider.foto_url}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />`
          : `<span style="color:#0B1F3A;font-weight:700;font-size:14px;">${lider.nome.charAt(0)}</span>`
        const icone = L.divIcon({
          html: `
            <div style="position:relative;width:44px;height:52px;">
              <div style="width:44px;height:44px;background:${lider.foto_url ? 'transparent' : cor};border:3px solid ${cor};border-radius:50%;box-shadow:0 3px 10px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;overflow:hidden;">
                ${avatarInner}
              </div>
              <div style="position:absolute;bottom:0;left:50%;transform:translateX(-50%);width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:8px solid ${cor};"></div>
              ${totalApoiadores > 0 ? `<div style="position:absolute;top:-4px;right:-4px;background:#6ba3d6;color:white;border-radius:10px;font-size:9px;font-weight:700;padding:1px 5px;min-width:17px;text-align:center;border:1.5px solid white;">${totalApoiadores}</div>` : ''}
            </div>
          `,
          className: '',
          iconSize: [44, 52],
          iconAnchor: [22, 52],
          popupAnchor: [0, -56],
        })
        const marker = L.marker([lider.latitude, lider.longitude], { icon: icone })
        marker.bindPopup(`
          <div style="font-family:'IBM Plex Sans',sans-serif;background:#0F2040;border:1px solid #1C3558;border-radius:10px;padding:16px;min-width:220px;color:#E8EDF5;">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
              <div style="width:44px;height:44px;border-radius:50%;overflow:hidden;border:2px solid ${cor};flex-shrink:0;background:rgba(201,168,76,0.15);display:flex;align-items:center;justify-content:center;">
                ${lider.foto_url
                  ? `<img src="${lider.foto_url}" style="width:100%;height:100%;object-fit:cover;">`
                  : `<span style="font-weight:700;font-size:16px;color:${cor};">${lider.nome.charAt(0)}</span>`}
              </div>
              <div>
                <div style="font-weight:700;font-size:14px;color:${cor};">${lider.nome}</div>
                <div style="font-size:11px;color:#8FA4C0;">${lider.bairro ? lider.bairro + ' · ' : ''}${lider.cidade}/${lider.estado}</div>
              </div>
            </div>
            ${lider.zona_eleitoral ? `<div style="font-size:12px;color:#8FA4C0;margin-bottom:4px;">🗳 Zona ${lider.zona_eleitoral}</div>` : ''}
            ${lider.telefone ? `<div style="font-size:12px;color:#8FA4C0;margin-bottom:4px;">📞 ${lider.telefone}</div>` : ''}
            <div style="font-size:12px;color:#6ba3d6;font-weight:600;">👥 ${totalApoiadores} apoiador${totalApoiadores !== 1 ? 'es' : ''}</div>
            <div style="font-size:12px;color:${lider.ativo ? '#C9A84C' : '#ef4444'};margin-top:4px;font-weight:600;">${lider.ativo ? '● Ativo' : '● Inativo'}</div>
          </div>
        `, { className: 'candmaps-popup', maxWidth: 280 })
        marker.on('click', () => onLiderClick(lider))
        marker.addTo(lideresLayer)
      }

      // Adiciona camadas ao mapa
      calorLayer.addTo(mapa) // calor fica embaixo
      if (showApoiadores) apoiadoresLayer.addTo(mapa)
      lideresLayer.addTo(mapa)

      layersRef.current = { lideres: lideresLayer, apoiadores: apoiadoresLayer, calor: calorLayer }

      // Ajusta zoom
      const comCoordenadas = lideres.filter(l => l.latitude && l.longitude)
      if (comCoordenadas.length > 0) {
        const bounds = L.latLngBounds(comCoordenadas.map(l => [l.latitude!, l.longitude!]))
        mapa.fitBounds(bounds, { padding: [60, 60] })
      }
    }

    iniciarMapa()
    return () => {
      if (mapaInstanceRef.current) { mapaInstanceRef.current.remove(); mapaInstanceRef.current = null }
    }
  }, [lideres, apoiadores])

  // Toggles das camadas
  useEffect(() => {
    const { lideres: layer } = layersRef.current
    if (!layer || !mapaInstanceRef.current) return
    if (showLideres) layer.addTo(mapaInstanceRef.current)
    else layer.remove()
  }, [showLideres])

  useEffect(() => {
    const { apoiadores: layer } = layersRef.current
    if (!layer || !mapaInstanceRef.current) return
    if (showApoiadores) layer.addTo(mapaInstanceRef.current)
    else layer.remove()
  }, [showApoiadores])

  useEffect(() => {
    const { calor: layer } = layersRef.current
    if (!layer || !mapaInstanceRef.current) return
    if (showCalor) layer.addTo(mapaInstanceRef.current)
    else layer.remove()
  }, [showCalor])

  const btnStyle = (ativo: boolean, cor: string) => ({
    padding: '8px 16px',
    borderRadius: '8px',
    border: `1px solid ${ativo ? cor : 'rgba(255,255,255,0.12)'}`,
    background: ativo ? `${cor}22` : 'rgba(11,31,58,0.85)',
    color: ativo ? cor : '#8FA4C0',
    fontSize: '12px',
    fontWeight: 600 as const,
    cursor: 'pointer' as const,
    fontFamily: "'IBM Plex Sans', sans-serif",
    backdropFilter: 'blur(8px)',
    transition: 'all .15s',
  })

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={mapaRef} style={{ width: '100%', height: '100%', borderRadius: '12px' }} />

      {/* CONTROLES DE CAMADA */}
      <div style={{ position: 'absolute', bottom: '24px', left: '50%', transform: 'translateX(-50%)', zIndex: 1000, display: 'flex', gap: '8px', padding: '10px 14px', background: 'rgba(11,31,58,0.9)', borderRadius: '12px', border: '1px solid rgba(201,168,76,0.15)', backdropFilter: 'blur(12px)', boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>
        <button onClick={() => setShowLideres(v => !v)} style={btnStyle(showLideres, '#C9A84C')}>
          👥 Líderes
        </button>
        <button onClick={() => setShowApoiadores(v => !v)} style={btnStyle(showApoiadores, '#6ba3d6')}>
          🗳 Apoiadores
        </button>
        <button onClick={() => setShowCalor(v => !v)} style={btnStyle(showCalor, '#ef8c4a')}>
          🔥 Mapa de Calor
        </button>
      </div>

      {/* LEGENDA */}
      <div style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 1000, background: 'rgba(11,31,58,0.88)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)', padding: '12px 16px', backdropFilter: 'blur(10px)', display: 'flex', flexDirection: 'column', gap: '7px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '14px', height: '14px', background: '#C9A84C', borderRadius: '50% 50% 50% 0', transform: 'rotate(-45deg)', border: '2px solid white', flexShrink: 0 }} />
          <span style={{ fontSize: '11px', color: '#8FA4C0' }}>Líder ativo</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '14px', height: '14px', background: '#ef4444', borderRadius: '50% 50% 50% 0', transform: 'rotate(-45deg)', border: '2px solid white', flexShrink: 0 }} />
          <span style={{ fontSize: '11px', color: '#8FA4C0' }}>Líder inativo</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '12px', height: '12px', background: '#6ba3d6', borderRadius: '50%', border: '2px solid white', flexShrink: 0 }} />
          <span style={{ fontSize: '11px', color: '#8FA4C0' }}>Apoiador</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '18px', height: '8px', borderRadius: '4px', background: 'linear-gradient(90deg, hsl(220,75%,55%), hsl(60,85%,55%), hsl(0,75%,50%))', flexShrink: 0 }} />
          <span style={{ fontSize: '11px', color: '#8FA4C0' }}>Calor</span>
        </div>
      </div>
    </div>
  )
}
