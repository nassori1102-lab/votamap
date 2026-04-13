'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import { useIsMobile } from '@/lib/useIsMobile'

type Opcao = { id: string; texto: string }
type Pergunta = { id: string; texto: string; tipo: string; opcoes: Opcao[] }
type Pesquisa = { id: string; titulo: string; slug: string }

type RespostaPesquisa = {
  id: string
  nome: string
  idade: number
  genero: string
  bairro: string
  cidade: string
  criado_em: string
}

type ResultadoPergunta = {
  pergunta: Pergunta
  contagens: Record<string, number>
  total: number
  textosLivres: string[]
}

function grupoIdade(idade: number | null): string {
  if (!idade) return 'Não informado'
  if (idade < 18) return 'Menor de 18'
  if (idade <= 24) return '18–24'
  if (idade <= 34) return '25–34'
  if (idade <= 44) return '35–44'
  if (idade <= 54) return '45–54'
  if (idade <= 64) return '55–64'
  return '65+'
}

export default function ResultadosPesquisaPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const supabase = createClient()
  const isMobile = useIsMobile()

  const [pesquisa, setPesquisa] = useState<Pesquisa | null>(null)
  const [respostas, setRespostas] = useState<RespostaPesquisa[]>([])
  const [resultados, setResultados] = useState<ResultadoPergunta[]>([])
  const [loading, setLoading] = useState(true)
  const [abaAtiva, setAbaAtiva] = useState<'perguntas' | 'demografico'>('perguntas')

  useEffect(() => {
    async function carregar() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const [{ data: p }, { data: pergs }, { data: resps }] = await Promise.all([
        supabase.from('pesquisas').select('id, titulo, slug').eq('id', id).single(),
        supabase.from('perguntas').select('*, opcoes_resposta(*)').eq('pesquisa_id', id).order('ordem'),
        supabase.from('respostas_pesquisa').select('*').eq('pesquisa_id', id).order('criado_em', { ascending: false }),
      ])

      if (!p) { router.push('/dashboard/pesquisas'); return }
      setPesquisa(p)

      const respsData = (resps || []) as RespostaPesquisa[]
      setRespostas(respsData)

      if (pergs && respsData.length > 0) {
        const respIds = respsData.map(r => r.id)
        const { data: rPergs } = await supabase
          .from('respostas_perguntas')
          .select('pergunta_id, opcao_id, texto_livre, resposta_pesquisa_id')
          .in('resposta_pesquisa_id', respIds)

        const ress = rPergs || []

        const res: ResultadoPergunta[] = pergs.map((perg: any) => {
          const opcoes = (perg.opcoes_resposta || []).sort((a: Opcao, b: Opcao) => (a as any).ordem - (b as any).ordem)
          const pergResps = ress.filter(r => r.pergunta_id === perg.id)
          const contagens: Record<string, number> = {}
          const textosLivres: string[] = []

          for (const r of pergResps) {
            if (r.opcao_id) {
              contagens[r.opcao_id] = (contagens[r.opcao_id] || 0) + 1
            } else if (r.texto_livre) {
              textosLivres.push(r.texto_livre)
            }
          }

          return {
            pergunta: { id: perg.id, texto: perg.texto, tipo: perg.tipo, opcoes },
            contagens,
            total: pergResps.length,
            textosLivres,
          }
        })
        setResultados(res)
      }

      setLoading(false)
    }
    carregar()
  }, [id])

  function contarPor(campo: keyof RespostaPesquisa): Record<string, number> {
    const mapa: Record<string, number> = {}
    for (const r of respostas) {
      const val = campo === 'idade' ? grupoIdade(r.idade as any) : ((r[campo] as string) || 'Não informado')
      mapa[val] = (mapa[val] || 0) + 1
    }
    return mapa
  }

  function BarraHorizontal({ label, count, total, cor }: { label: string; count: number; total: number; cor: string }) {
    const pct = total > 0 ? Math.round(count / total * 100) : 0
    return (
      <div style={{ marginBottom: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
          <span style={{ color: '#E8EDF5' }}>{label}</span>
          <span style={{ color: '#8FA4C0' }}>{count} <span style={{ color: cor, fontWeight: 600 }}>{pct}%</span></span>
        </div>
        <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: cor, borderRadius: '4px', transition: 'width 0.5s ease' }} />
        </div>
      </div>
    )
  }

  const CORES = ['#C9A84C', '#6ba3d6', '#86efac', '#a78bfa', '#f97316', '#e74c3c', '#22d3ee', '#f59e0b']

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0B1F3A', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#C9A84C', fontFamily: "'IBM Plex Sans', sans-serif" }}>Carregando...</div>
  )

  const totalRespostas = respostas.length
  const porCidade = contarPor('cidade')
  const porGenero = contarPor('genero')
  const porIdade = contarPor('idade')
  const porBairro = contarPor('bairro')

  return (
    <div style={{ minHeight: '100vh', background: '#0B1F3A', fontFamily: "'IBM Plex Sans', sans-serif" }}>
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 80px, rgba(201,168,76,0.02) 80px, rgba(201,168,76,0.02) 81px), repeating-linear-gradient(90deg, transparent, transparent 80px, rgba(201,168,76,0.02) 80px, rgba(201,168,76,0.02) 81px)` }} />

      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, height: '64px', background: 'rgba(11,31,58,0.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(201,168,76,0.15)', display: 'flex', alignItems: 'center', padding: isMobile ? '0 16px' : '0 32px', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={() => router.push(`/dashboard/pesquisas/${id}`)} style={{ background: 'transparent', border: 'none', color: '#8FA4C0', cursor: 'pointer', fontSize: '13px' }}>← Editar</button>
          {!isMobile && <>
            <div style={{ width: '1px', height: '20px', background: '#1C3558' }} />
            <span style={{ fontFamily: "'Playfair Display', serif", fontSize: '18px', fontWeight: 800, color: '#FFFFFF' }}>Cand<span style={{ color: '#C9A84C' }}>Maps</span></span>
          </>}
        </div>
        <div style={{ fontSize: '13px', color: '#8FA4C0' }}>
          <span style={{ color: '#C9A84C', fontWeight: 600 }}>{totalRespostas}</span> resposta{totalRespostas !== 1 ? 's' : ''}
        </div>
      </nav>

      <main style={{ paddingTop: '88px', padding: isMobile ? '80px 16px 60px' : '88px 32px 60px', position: 'relative', zIndex: 1, maxWidth: '1000px', margin: '0 auto' }}>

        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '2.5px', textTransform: 'uppercase' as const, color: '#C9A84C', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <span style={{ width: '24px', height: '1px', background: '#A07830', display: 'inline-block' }} />
            Resultados
          </div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: isMobile ? '22px' : '28px', fontWeight: 800, color: '#FFFFFF', marginBottom: '4px' }}>{pesquisa?.titulo}</h1>
        </div>

        {/* CARDS RESUMO */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
          {[
            { label: 'Total respostas', valor: totalRespostas.toString(), cor: '#C9A84C', icone: '📊' },
            { label: 'Cidades', valor: Object.keys(porCidade).filter(k => k !== 'Não informado').length.toString(), cor: '#6ba3d6', icone: '📍' },
            { label: 'Bairros', valor: Object.keys(porBairro).filter(k => k !== 'Não informado').length.toString(), cor: '#86efac', icone: '🏘' },
            { label: 'Com nome', valor: respostas.filter(r => r.nome).length.toString(), cor: '#a78bfa', icone: '👤' },
          ].map(c => (
            <div key={c.label} style={{ background: '#0F2040', border: '1px solid #1C3558', borderRadius: '10px', padding: '16px' }}>
              <div style={{ fontSize: '20px', marginBottom: '8px' }}>{c.icone}</div>
              <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' as const, color: '#8FA4C0' }}>{c.label}</div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '26px', fontWeight: 800, color: c.cor, margin: '4px 0' }}>{c.valor}</div>
            </div>
          ))}
        </div>

        {totalRespostas === 0 ? (
          <div style={{ background: '#0F2040', border: '1px solid #1C3558', borderRadius: '12px', padding: '60px', textAlign: 'center' as const }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
            <div style={{ fontSize: '18px', fontWeight: 600, color: '#E8EDF5', marginBottom: '8px' }}>Nenhuma resposta ainda</div>
            <div style={{ fontSize: '14px', color: '#8FA4C0' }}>Envie o link da pesquisa para seus apoiadores.</div>
          </div>
        ) : (
          <>
            {/* ABAS */}
            <div style={{ display: 'flex', gap: '4px', background: '#0F2040', border: '1px solid #1C3558', borderRadius: '10px', padding: '4px', marginBottom: '20px', width: 'fit-content' }}>
              {([['perguntas', '📋 Por pergunta'], ['demografico', '👥 Perfil demográfico']] as const).map(([key, label]) => (
                <button key={key} onClick={() => setAbaAtiva(key)}
                  style={{ padding: '8px 16px', borderRadius: '7px', border: 'none', background: abaAtiva === key ? 'rgba(201,168,76,0.15)' : 'transparent', color: abaAtiva === key ? '#C9A84C' : '#8FA4C0', fontSize: '13px', cursor: 'pointer', fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: abaAtiva === key ? 600 : 400, whiteSpace: 'nowrap' as const }}>
                  {label}
                </button>
              ))}
            </div>

            {/* ABA: PERGUNTAS */}
            {abaAtiva === 'perguntas' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {resultados.map((res, idx) => (
                  <div key={res.pergunta.id} style={{ background: '#0F2040', border: '1px solid #1C3558', borderRadius: '12px', padding: '20px 24px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: '#8FA4C0', textTransform: 'uppercase' as const, letterSpacing: '1px', marginBottom: '6px' }}>Pergunta {idx + 1}</div>
                    <div style={{ fontSize: '15px', fontWeight: 600, color: '#E8EDF5', marginBottom: '16px' }}>{res.pergunta.texto}</div>

                    {res.pergunta.tipo === 'multipla_escolha' ? (
                      res.pergunta.opcoes.map((opc, oi) => (
                        <BarraHorizontal key={opc.id} label={opc.texto} count={res.contagens[opc.id] || 0} total={res.total} cor={CORES[oi % CORES.length]} />
                      ))
                    ) : (
                      <div>
                        <div style={{ fontSize: '11px', color: '#8FA4C0', marginBottom: '10px' }}>{res.textosLivres.length} resposta{res.textosLivres.length !== 1 ? 's' : ''} de texto</div>
                        {res.textosLivres.slice(0, 8).map((t, i) => (
                          <div key={i} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid #1C3558', borderRadius: '6px', padding: '10px 14px', marginBottom: '6px', fontSize: '13px', color: '#E8EDF5' }}>
                            "{t}"
                          </div>
                        ))}
                        {res.textosLivres.length > 8 && (
                          <div style={{ fontSize: '12px', color: '#8FA4C0', textAlign: 'center' as const, padding: '8px' }}>...e mais {res.textosLivres.length - 8}</div>
                        )}
                      </div>
                    )}
                    {res.total > 0 && <div style={{ fontSize: '11px', color: '#3D5470', marginTop: '10px', textAlign: 'right' as const }}>{res.total} resposta{res.total !== 1 ? 's' : ''}</div>}
                  </div>
                ))}
              </div>
            )}

            {/* ABA: DEMOGRÁFICO */}
            {abaAtiva === 'demografico' && (
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px' }}>
                {[
                  { titulo: 'Por gênero', dados: porGenero, cor: '#C9A84C' },
                  { titulo: 'Por faixa etária', dados: porIdade, cor: '#6ba3d6' },
                  { titulo: 'Por cidade', dados: porCidade, cor: '#86efac' },
                  { titulo: 'Por bairro', dados: porBairro, cor: '#a78bfa' },
                ].map(secao => {
                  const entries = Object.entries(secao.dados).sort((a, b) => b[1] - a[1])
                  return (
                    <div key={secao.titulo} style={{ background: '#0F2040', border: '1px solid #1C3558', borderRadius: '12px', padding: '20px 24px' }}>
                      <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '15px', fontWeight: 700, color: secao.cor, marginBottom: '16px' }}>{secao.titulo}</h3>
                      {entries.length === 0 ? (
                        <div style={{ fontSize: '13px', color: '#3D5470' }}>Sem dados</div>
                      ) : entries.slice(0, 10).map(([label, count]) => (
                        <BarraHorizontal key={label} label={label} count={count} total={totalRespostas} cor={secao.cor} />
                      ))}
                      {entries.length > 10 && <div style={{ fontSize: '11px', color: '#3D5470', marginTop: '6px' }}>...e mais {entries.length - 10}</div>}
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
