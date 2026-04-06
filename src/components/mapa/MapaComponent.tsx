'use client'

import { useEffect, useRef } from 'react'

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

type Props = {
  lideres: Lider[]
  onLiderClick: (lider: Lider) => void
}

export default function MapaComponent({ lideres, onLiderClick }: Props) {
  const mapaRef = useRef<HTMLDivElement>(null)
  const mapaInstanceRef = useRef<any>(null)

  useEffect(() => {
    if (!mapaRef.current || mapaInstanceRef.current) return

    async function iniciarMapa() {
      const L = (await import('leaflet')).default
      await import('leaflet/dist/leaflet.css')

      const mapa = L.map(mapaRef.current!, {
        center: [-15.7801, -47.9292],
        zoom: 5,
        zoomControl: true,
      })

      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap © CARTO',
        maxZoom: 19,
      }).addTo(mapa)

      mapaInstanceRef.current = mapa

      lideres.forEach(lider => {
        if (!lider.latitude || !lider.longitude) return

        const cor = lider.ativo ? '#C9A84C' : '#ef4444'

        const icone = L.divIcon({
          html: `
            <div style="
              width: 36px; height: 36px;
              background: ${cor};
              border: 3px solid white;
              border-radius: 50% 50% 50% 0;
              transform: rotate(-45deg);
              box-shadow: 0 2px 8px rgba(0,0,0,0.4);
              display: flex; align-items: center; justify-content: center;
            ">
              <div style="
                transform: rotate(45deg);
                color: #0B1F3A;
                font-weight: 700;
                font-size: 13px;
              ">${lider.nome.charAt(0)}</div>
            </div>
          `,
          className: '',
          iconSize: [36, 36],
          iconAnchor: [18, 36],
          popupAnchor: [0, -40],
        })

        const marker = L.marker([lider.latitude, lider.longitude], { icon: icone })

        marker.bindPopup(`
          <div style="
            font-family: 'IBM Plex Sans', sans-serif;
            background: #0F2040;
            border: 1px solid #1C3558;
            border-radius: 10px;
            padding: 16px;
            min-width: 200px;
            color: #E8EDF5;
          ">
            <div style="font-weight: 700; font-size: 15px; margin-bottom: 4px; color: #C9A84C;">
              ${lider.nome}
            </div>
            <div style="font-size: 12px; color: #8FA4C0; margin-bottom: 10px;">
              ${lider.bairro} · ${lider.cidade}/${lider.estado}
            </div>
            ${lider.zona_eleitoral ? `<div style="font-size: 12px; color: #8FA4C0;">🗳 Zona ${lider.zona_eleitoral}</div>` : ''}
            ${lider.telefone ? `<div style="font-size: 12px; color: #8FA4C0;">📞 ${lider.telefone}</div>` : ''}
            <div style="font-size: 12px; color: ${lider.ativo ? '#C9A84C' : '#ef4444'}; margin-top: 8px; font-weight: 600;">
              ${lider.ativo ? '● Ativo' : '● Inativo'}
            </div>
          </div>
        `, {
          className: 'votamap-popup',
          maxWidth: 280,
        })

        marker.on('click', () => onLiderClick(lider))
        marker.addTo(mapa)
      })

      // Ajustar zoom para cobrir todos os pinos
      const lideresComCoordenadas = lideres.filter(l => l.latitude && l.longitude)
      if (lideresComCoordenadas.length > 0) {
        const bounds = L.latLngBounds(
          lideresComCoordenadas.map(l => [l.latitude!, l.longitude!])
        )
        mapa.fitBounds(bounds, { padding: [50, 50] })
      }
    }

    iniciarMapa()

    return () => {
      if (mapaInstanceRef.current) {
        mapaInstanceRef.current.remove()
        mapaInstanceRef.current = null
      }
    }
  }, [lideres])

  return (
    <div ref={mapaRef} style={{ width: '100%', height: '100%', borderRadius: '12px' }} />
  )
}
