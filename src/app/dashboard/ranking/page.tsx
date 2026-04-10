'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useIsMobile } from '@/lib/useIsMobile'

type LiderRanking = {
  id: string
  nome: string
  cidade: string
  estado: string
  bairro: string
  ativo: boolean
  totalApoiadores: number
  altaEngajamento: number  // eng >= 4
  score: number            // Σ(engajamento × 10)
  posicao: number
  medalha: '🥇' | '🥈' | '🥉' | null
  foto_url?: string
}

const MEDALHAS: Array<'🥇' | '🥈' | '🥉' | null> = ['🥇', '🥈', '🥉']
const CORES_MEDALHA = { '🥇': '#F5C842', '🥈': '#B0BEC5', '🥉': '#CD7F32' }

export default function RankingPage() {
  const router = useRouter()
  const supabase = createClient()
  const isMobile = useIsMobile()
  const [ranking, setRanking] = useState<LiderRanking[]>([])
  const [loading, setLoading] = useState(true)
  const [apenasAtivos, setApenasAtivos] = useState(true)

  useEffect(() => {
    async function carregar() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const [{ data: lideres }, { data: apoiadores }] = await Promise.all([
        supabase.from('lideres_regionais').select('id, nome, cidade, estado, bairro, ativo, foto_url'),
        supabase.from('apoiadores').select('lider_id, engajamento'),
      ])

      if (!lideres) { setLoading(false); return }

      // Agregar apoiadores por lider_id
      const mapa = new Map<string, { total: number; scoreSum: number; alta: number }>()
      for (const a of (apoiadores || [])) {
        if (!a.lider_id) continue
        const atual = mapa.get(a.lider_id) || { total: 0, scoreSum: 0, alta: 0 }
        atual.total++
        atual.scoreSum += (a.engajamento || 3) * 10
        if ((a.engajamento || 0) >= 4) atual.alta++
        mapa.set(a.lider_id, atual)
      }

      // Montar ranking
      const lista: LiderRanking[] = lideres.map(l => {
        const stats = mapa.get(l.id) || { total: 0, scoreSum: 0, alta: 0 }
        return {
          id: l.id,
          nome: l.nome,
          cidade: l.cidade || '',
          estado: l.estado || '',
          bairro: l.bairro || '',
          ativo: l.ativo,
          totalApoiadores: stats.total,
          altaEngajamento: stats.alta,
          score: stats.scoreSum,
          posicao: 0,
          medalha: null,
          foto_url: l.foto_url || undefined,
        }
      })

      // Ordenar por score desc
      lista.sort((a, b) => b.score - a.score || b.totalApoiadores - a.totalApoiadores)

      // Atribuir posição e medalha
      lista.forEach((l, i) => {
        l.posicao = i + 1
        l.medalha = MEDALHAS[i] ?? null
      })

      setRanking(lista)
      setLoading(false)
    }
    carregar()
  }, [])

  const lista = apenasAtivos ? ranking.filter(l => l.ativo) : ranking
  // Re-numerar posições após filtro
  const listaComPosicao = lista.map((l, i) => ({ ...l, posicao: i + 1, medalha: (MEDALHAS[i] ?? null) as LiderRanking['medalha'] }))

  const top3 = listaComPosicao.slice(0, 3)
  const restante = listaComPosicao.slice(3)
  const scoreMax = listaComPosicao[0]?.score || 1
  const totalApoiadores = listaComPosicao.reduce((acc, l) => acc + l.totalApoiadores, 0)

  if (loading) return (
    <div style={{ minHeight:'100vh', background:'#0B1F3A', display:'flex', alignItems:'center', justifyContent:'center', color:'#C9A84C', fontFamily:"'IBM Plex Sans', sans-serif" }}>
      Carregando...
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background:'#0B1F3A', fontFamily:"'IBM Plex Sans', sans-serif" }}>
      <div style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:0, backgroundImage:`repeating-linear-gradient(0deg, transparent, transparent 80px, rgba(201,168,76,0.02) 80px, rgba(201,168,76,0.02) 81px), repeating-linear-gradient(90deg, transparent, transparent 80px, rgba(201,168,76,0.02) 80px, rgba(201,168,76,0.02) 81px)` }} />

      {/* NAV */}
      <nav style={{ position:'fixed', top:0, left:0, right:0, zIndex:100, height:'64px', background:'rgba(11,31,58,0.95)', backdropFilter:'blur(20px)', borderBottom:'1px solid rgba(201,168,76,0.15)', display:'flex', alignItems:'center', padding: isMobile ? '0 16px' : '0 32px', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
          <button onClick={() => router.push('/dashboard/lideres')} style={{ background:'transparent', border:'none', color:'#8FA4C0', cursor:'pointer', fontSize:'13px' }}>← {isMobile ? 'Voltar' : 'Líderes'}</button>
          {!isMobile && <>
            <div style={{ width:'1px', height:'20px', background:'#1C3558' }} />
            <span style={{ fontFamily:"'Playfair Display', serif", fontSize:'20px', fontWeight:800, color:'#FFFFFF' }}>Cand<span style={{ color:'#C9A84C' }}>Maps</span></span>
          </>}
        </div>
        <label style={{ display:'flex', alignItems:'center', gap:'8px', cursor:'pointer', fontSize:'13px', color:'#8FA4C0' }}>
          <input type="checkbox" checked={apenasAtivos} onChange={e => setApenasAtivos(e.target.checked)}
            style={{ accentColor:'#C9A84C', width:'15px', height:'15px' }} />
          {isMobile ? 'Só ativos' : 'Apenas ativos'}
        </label>
      </nav>

      <main style={{ paddingTop:'88px', padding: isMobile ? '80px 16px 40px' : '88px 32px 60px', position:'relative', zIndex:1, maxWidth:'1000px', margin:'0 auto' }}>

        {/* TÍTULO */}
        <div style={{ marginBottom:'32px' }}>
          <div style={{ fontSize:'11px', fontWeight:600, letterSpacing:'2.5px', textTransform:'uppercase' as const, color:'#C9A84C', display:'flex', alignItems:'center', gap:'10px', marginBottom:'10px' }}>
            <span style={{ width:'24px', height:'1px', background:'#A07830', display:'inline-block' }} />
            Gamificação da Campanha
          </div>
          <h1 style={{ fontFamily:"'Playfair Display', serif", fontSize: isMobile ? '24px' : '32px', fontWeight:800, color:'#FFFFFF', marginBottom:'6px' }}>Ranking de Líderes</h1>
          <p style={{ fontSize:'14px', color:'#8FA4C0' }}>Pontuação baseada na quantidade e engajamento dos apoiadores cadastrados</p>
        </div>

        {/* CARDS RESUMO */}
        <div style={{ display:'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap:'12px', marginBottom:'32px' }}>
          {[
            { label:'Líderes', valor: listaComPosicao.length.toString(), sub: apenasAtivos ? 'ativos' : 'no total', cor:'#C9A84C', icone:'👥' },
            { label:'Apoiadores', valor: totalApoiadores.toLocaleString('pt-BR'), sub:'cadastrados no total', cor:'#6ba3d6', icone:'🗳' },
            { label:'Campeão Atual', valor: listaComPosicao[0]?.nome.split(' ')[0] || '—', sub: listaComPosicao[0] ? `${listaComPosicao[0].score.toLocaleString('pt-BR')} pts` : 'nenhum dado', cor:'#F5C842', icone:'🥇' },
            { label:'Maior Score', valor: listaComPosicao[0]?.score ? listaComPosicao[0].score.toLocaleString('pt-BR') : '—', sub:'pontos', cor:'#86efac', icone:'🏆' },
          ].map(c => (
            <div key={c.label} style={{ background:'#0F2040', border:'1px solid #1C3558', borderRadius:'12px', padding:'20px' }}>
              <div style={{ fontSize:'22px', marginBottom:'10px' }}>{c.icone}</div>
              <div style={{ fontSize:'10px', fontWeight:600, letterSpacing:'1px', textTransform:'uppercase' as const, color:'#8FA4C0' }}>{c.label}</div>
              <div style={{ fontFamily:"'Playfair Display', serif", fontSize:'24px', fontWeight:800, color:c.cor, margin:'4px 0', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' as const }}>{c.valor}</div>
              <div style={{ fontSize:'12px', color:'#8FA4C0' }}>{c.sub}</div>
            </div>
          ))}
        </div>

        {listaComPosicao.length === 0 ? (
          <div style={{ background:'#0F2040', border:'1px solid #1C3558', borderRadius:'12px', padding:'60px', textAlign:'center' as const }}>
            <div style={{ fontSize:'48px', marginBottom:'16px' }}>🏆</div>
            <h2 style={{ fontFamily:"'Playfair Display', serif", fontSize:'20px', fontWeight:700, color:'#FFFFFF', marginBottom:'8px' }}>Nenhum líder para rankear</h2>
            <p style={{ fontSize:'14px', color:'#8FA4C0' }}>Cadastre líderes e associe apoiadores para ver o ranking.</p>
          </div>
        ) : (
          <>
            {/* PÓDIO TOP 3 */}
            {top3.length >= 2 && (
              <div style={{ marginBottom:'32px' }}>
                <h2 style={{ fontFamily:"'Playfair Display', serif", fontSize:'18px', fontWeight:700, color:'#C9A84C', marginBottom:'20px', display:'flex', alignItems:'center', gap:'10px' }}>
                  🏆 Pódio
                </h2>
                <div style={{ display:'flex', gap:'16px', alignItems:'flex-end', justifyContent:'center' }}>
                  {/* Ordem do pódio: 2º, 1º, 3º */}
                  {[top3[1], top3[0], top3[2]].filter(Boolean).map((lider, idx) => {
                    const alturas = [180, 220, 160]
                    const altura = alturas[idx]
                    const isCampeao = lider.posicao === 1
                    const corMedalha = CORES_MEDALHA[lider.medalha as keyof typeof CORES_MEDALHA] || '#8FA4C0'
                    return (
                      <div key={lider.id}
                        onClick={() => router.push(`/dashboard/lideres/${lider.id}`)}
                        style={{ flex:1, cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:'0' }}>
                        {/* Badge */}
                        <div style={{ fontSize: isCampeao ? '48px' : '36px', marginBottom:'8px', filter: isCampeao ? 'drop-shadow(0 0 12px rgba(245,200,66,0.6))' : 'none' }}>
                          {lider.medalha}
                        </div>
                        {/* Card */}
                        <div style={{
                          width:'100%', height:`${altura}px`, background: isCampeao ? 'linear-gradient(180deg, rgba(201,168,76,0.15) 0%, rgba(15,32,64,1) 60%)' : '#0F2040',
                          border:`2px solid ${corMedalha}40`,
                          borderRadius:'12px 12px 0 0', padding:'20px 16px',
                          display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'6px',
                          boxShadow: isCampeao ? `0 0 30px ${corMedalha}20` : 'none',
                        }}>
                          <div style={{ width:'48px', height:'48px', borderRadius:'50%', background: lider.foto_url ? 'transparent' : `${corMedalha}20`, border:`2px solid ${corMedalha}60`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'20px', fontWeight:700, color:corMedalha, flexShrink:0, overflow:'hidden' }}>
                            {lider.foto_url
                              ? <img src={lider.foto_url} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                              : lider.nome.charAt(0).toUpperCase()}
                          </div>
                          <div style={{ fontFamily:"'Playfair Display', serif", fontSize: isCampeao ? '16px' : '14px', fontWeight:700, color:'#FFFFFF', textAlign:'center' as const, lineHeight:1.2 }}>{lider.nome}</div>
                          <div style={{ fontSize:'11px', color:'#8FA4C0', textAlign:'center' as const }}>{lider.cidade}{lider.estado ? `/${lider.estado}` : ''}</div>
                          <div style={{ fontFamily:"'Playfair Display', serif", fontSize: isCampeao ? '22px' : '18px', fontWeight:800, color:corMedalha, marginTop:'4px' }}>
                            {lider.score.toLocaleString('pt-BR')} pts
                          </div>
                          <div style={{ fontSize:'11px', color:'#8FA4C0' }}>{lider.totalApoiadores} apoiador{lider.totalApoiadores !== 1 ? 'es' : ''}</div>
                        </div>
                        {/* Base do pódio */}
                        <div style={{ width:'100%', height:'32px', background:corMedalha, borderRadius:'0 0 8px 8px', display:'flex', alignItems:'center', justifyContent:'center' }}>
                          <span style={{ fontFamily:"'Playfair Display', serif", fontSize:'16px', fontWeight:800, color:'#0B1F3A' }}>{lider.posicao}º</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* TABELA COMPLETA */}
            <div style={{ background:'#0F2040', border:'1px solid #1C3558', borderRadius:'12px', overflow:'hidden' }}>
              <div style={{ padding:'18px 24px', borderBottom:'1px solid #1C3558', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <h2 style={{ fontFamily:"'Playfair Display', serif", fontSize:'18px', fontWeight:700, color:'#FFFFFF' }}>Classificação Completa</h2>
                <div style={{ fontSize:'11px', color:'#8FA4C0', background:'rgba(201,168,76,0.05)', border:'1px solid rgba(201,168,76,0.1)', borderRadius:'6px', padding:'4px 10px' }}>
                  Pontos = Σ (engajamento × 10) por apoiador
                </div>
              </div>

              {listaComPosicao.map((lider, i) => {
                const pct = scoreMax > 0 ? (lider.score / scoreMax * 100) : 0
                const corPos = lider.medalha ? CORES_MEDALHA[lider.medalha] : '#3D5470'
                const isMedalha = lider.posicao <= 3
                return (
                  <div key={lider.id}
                    onClick={() => router.push(`/dashboard/lideres/${lider.id}`)}
                    style={{ display: isMobile ? 'flex' : 'grid', gridTemplateColumns: isMobile ? undefined : '56px 1fr 120px 100px 240px', flexDirection: isMobile ? 'row' : undefined, alignItems:'center', gap: isMobile ? '12px' : '0', padding: isMobile ? '12px 16px' : '14px 24px', borderBottom: i < listaComPosicao.length - 1 ? '1px solid rgba(28,53,88,0.5)' : 'none', cursor:'pointer', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)', transition:'background .15s' }}
                    onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = 'rgba(201,168,76,0.04)'}
                    onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)'}
                  >
                    {/* Posição */}
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', width: isMobile ? '32px' : undefined, flexShrink:0 }}>
                      {isMedalha ? (
                        <span style={{ fontSize: isMobile ? '20px' : '24px' }}>{lider.medalha}</span>
                      ) : (
                        <span style={{ fontFamily:"'Playfair Display', serif", fontSize: isMobile ? '15px' : '18px', fontWeight:700, color:corPos }}>{lider.posicao}º</span>
                      )}
                    </div>

                    {/* Nome + localização */}
                    <div style={{ display:'flex', alignItems:'center', gap:'10px', flex: isMobile ? 1 : undefined, minWidth:0 }}>
                      <div style={{ width:'34px', height:'34px', borderRadius:'50%', background: lider.foto_url ? 'transparent' : `${isMedalha ? corPos : '#1C3558'}30`, border:`1px solid ${isMedalha ? corPos : '#1C3558'}60`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'13px', fontWeight:700, color: isMedalha ? corPos : '#8FA4C0', flexShrink:0, overflow:'hidden' }}>
                        {lider.foto_url
                          ? <img src={lider.foto_url} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                          : lider.nome.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ minWidth:0 }}>
                        <div style={{ fontSize:'13px', fontWeight:600, color:'#E8EDF5', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{lider.nome}</div>
                        <div style={{ fontSize:'11px', color:'#8FA4C0' }}>
                          {lider.cidade}{lider.estado ? `/${lider.estado}` : ''}
                          {!lider.ativo && <span style={{ marginLeft:'6px', color:'#e74c3c', fontSize:'10px' }}>inativo</span>}
                        </div>
                      </div>
                    </div>

                    {/* Apoiadores */}
                    {!isMobile && <div style={{ textAlign:'center' as const }}>
                      <div style={{ fontSize:'16px', fontWeight:700, color:'#6ba3d6' }}>{lider.totalApoiadores}</div>
                      <div style={{ fontSize:'10px', color:'#8FA4C0' }}>apoiadores</div>
                      {lider.altaEngajamento > 0 && (
                        <div style={{ fontSize:'10px', color:'#C9A84C' }}>⭐ {lider.altaEngajamento} alta eng.</div>
                      )}
                    </div>}

                    {/* Score */}
                    <div style={{ textAlign: isMobile ? 'right' as const : 'center' as const, flexShrink:0 }}>
                      <div style={{ fontFamily:"'Playfair Display', serif", fontSize: isMobile ? '16px' : '18px', fontWeight:800, color: isMedalha ? corPos : '#E8EDF5' }}>
                        {lider.score.toLocaleString('pt-BR')}
                      </div>
                      <div style={{ fontSize:'10px', color:'#8FA4C0' }}>{isMobile ? `${lider.totalApoiadores} ap.` : 'pontos'}</div>
                    </div>

                    {/* Barra de progresso */}
                    {!isMobile && <div style={{ paddingLeft:'8px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                        <div style={{ flex:1, height:'8px', background:'rgba(255,255,255,0.04)', borderRadius:'4px', overflow:'hidden' }}>
                          <div style={{ height:'100%', width:`${pct}%`, background: isMedalha ? `linear-gradient(90deg, ${corPos}, ${corPos}99)` : 'linear-gradient(90deg, #1C3558, #2A4A70)', borderRadius:'4px', transition:'width .4s ease' }} />
                        </div>
                        <span style={{ fontSize:'11px', color:'#8FA4C0', minWidth:'36px', textAlign:'right' as const }}>{pct.toFixed(0)}%</span>
                      </div>
                    </div>}
                  </div>
                )
              })}
            </div>

            {/* LEGENDA */}
            <div style={{ marginTop:'16px', padding:'14px 20px', background:'rgba(201,168,76,0.03)', border:'1px solid rgba(201,168,76,0.1)', borderRadius:'8px', display:'flex', gap:'24px', flexWrap:'wrap' as const }}>
              <div style={{ fontSize:'12px', color:'#8FA4C0' }}>
                <span style={{ color:'#C9A84C', fontWeight:600 }}>Como funciona:</span> cada apoiador contribui com <strong style={{ color:'#E8EDF5' }}>engajamento × 10 pontos</strong> para o score do seu líder
              </div>
              <div style={{ fontSize:'12px', color:'#8FA4C0' }}>
                ★ Eng. 1 = 10 pts · ★★ 2 = 20 pts · ★★★ 3 = 30 pts · ★★★★ 4 = 40 pts · ★★★★★ 5 = 50 pts
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
