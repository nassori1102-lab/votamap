'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type Evento = {
  id: string
  titulo: string
  descricao: string
  tipo: string
  data: string
  hora_inicio: string
  hora_fim: string
  local_nome: string
  local_endereco: string
  local_cidade: string
  local_estado: string
  publico: boolean
  confirmado: boolean
  observacoes: string
  criado_em: string
}

const tipoInfo: Record<string, { label: string; cor: string; icone: string }> = {
  comicio:        { label: 'Comício',         cor: '#C9A84C', icone: '🎤' },
  reuniao:        { label: 'Reunião',         cor: '#6ba3d6', icone: '🤝' },
  visita:         { label: 'Visita',          cor: '#5eead4', icone: '🚗' },
  debate:         { label: 'Debate',          cor: '#f9a8d4', icone: '⚖️' },
  entrevista:     { label: 'Entrevista',      cor: '#86efac', icone: '📺' },
  evento_interno: { label: 'Interno',         cor: '#8FA4C0', icone: '📋' },
  outro:          { label: 'Outro',           cor: '#8FA4C0', icone: '📌' },
}

export default function AgendaPage() {
  const [eventos, setEventos] = useState<Evento[]>([])
  const [loading, setLoading] = useState(true)
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<Evento | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')
  const [visualizacao, setVisualizacao] = useState<'lista' | 'calendario'>('lista')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [mesSelecionado, setMesSelecionado] = useState(new Date().getMonth())
  const [anoSelecionado, setAnoSelecionado] = useState(new Date().getFullYear())
  const router = useRouter()
  const supabase = createClient()

  const formInicial = {
    titulo: '', descricao: '', tipo: 'reuniao',
    data: new Date().toISOString().split('T')[0],
    hora_inicio: '09:00', hora_fim: '10:00',
    local_nome: '', local_endereco: '', local_cidade: '', local_estado: '',
    publico: true, confirmado: true, observacoes: '',
  }
  const [form, setForm] = useState(formInicial)

  useEffect(() => {
    async function carregar() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      await carregarEventos()
    }
    carregar()
  }, [])

  async function carregarEventos() {
    const { data } = await supabase.from('eventos').select('*').order('data', { ascending: true })
    if (data) setEventos(data)
    setLoading(false)
  }

  function abrirEditar(e: Evento) {
    setForm({
      titulo: e.titulo || '', descricao: e.descricao || '', tipo: e.tipo || 'reuniao',
      data: e.data || '', hora_inicio: e.hora_inicio || '09:00', hora_fim: e.hora_fim || '10:00',
      local_nome: e.local_nome || '', local_endereco: e.local_endereco || '',
      local_cidade: e.local_cidade || '', local_estado: e.local_estado || '',
      publico: e.publico ?? true, confirmado: e.confirmado ?? true,
      observacoes: e.observacoes || '',
    })
    setEditando(e); setModalAberto(true); setErro('')
  }

  async function handleSalvar() {
    if (!form.titulo) { setErro('Informe o título'); return }
    if (!form.data) { setErro('Informe a data'); return }
    setSalvando(true); setErro('')
    const dados = { ...form }
    const { error } = editando
      ? await supabase.from('eventos').update(dados).eq('id', editando.id)
      : await supabase.from('eventos').insert(dados)
    if (error) { setErro('Erro: ' + error.message); setSalvando(false); return }
    await carregarEventos()
    setModalAberto(false); setEditando(null); setForm(formInicial); setSalvando(false)
    setSucesso(editando ? 'Evento atualizado!' : 'Evento criado!')
    setTimeout(() => setSucesso(''), 3000)
  }

  async function handleDeletar(id: string) {
    if (!confirm('Remover este evento?')) return
    await supabase.from('eventos').delete().eq('id', id)
    setEventos(prev => prev.filter(e => e.id !== id))
  }

  function formatarData(data: string) {
    if (!data) return '—'
    return new Date(data + 'T00:00:00').toLocaleDateString('pt-BR', { weekday:'short', day:'2-digit', month:'short', year:'numeric' })
  }

  function formatarHora(hora: string) {
    if (!hora) return ''
    return hora.slice(0, 5)
  }

  const hoje = new Date().toISOString().split('T')[0]
  const eventosFiltrados = eventos.filter(e => filtroTipo ? e.tipo === filtroTipo : true)
  const eventosProximos = eventosFiltrados.filter(e => e.data >= hoje).slice(0, 3)
  const eventosMes = eventosFiltrados.filter(e => {
    const d = new Date(e.data + 'T00:00:00')
    return d.getMonth() === mesSelecionado && d.getFullYear() === anoSelecionado
  })

  // Dias do mês para calendário
  const diasNoMes = new Date(anoSelecionado, mesSelecionado + 1, 0).getDate()
  const primeiroDiaSemana = new Date(anoSelecionado, mesSelecionado, 1).getDay()
  const meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

  const inputStyle = { padding:'10px 14px', background:'#0B1F3A', border:'1px solid #1C3558', borderRadius:'8px', color:'#E8EDF5', fontSize:'14px', outline:'none', fontFamily:'Inter, sans-serif', width:'100%', boxSizing:'border-box' as const }
  const labelStyle = { fontSize:'11px', fontWeight:600 as const, letterSpacing:'1px', textTransform:'uppercase' as const, color:'#8FA4C0', marginBottom:'6px', display:'block' as const }

  return (
    <div style={{ minHeight:'100vh', background:'#0B1F3A', fontFamily:'Inter, system-ui, sans-serif' }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      <div style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:0, backgroundImage:`repeating-linear-gradient(0deg, transparent, transparent 80px, rgba(201,168,76,0.02) 80px, rgba(201,168,76,0.02) 81px), repeating-linear-gradient(90deg, transparent, transparent 80px, rgba(201,168,76,0.02) 80px, rgba(201,168,76,0.02) 81px)` }} />

      <nav style={{ position:'fixed', top:0, left:0, right:0, zIndex:100, height:'60px', background:'rgba(11,31,58,0.97)', backdropFilter:'blur(20px)', borderBottom:'1px solid rgba(201,168,76,0.15)', display:'flex', alignItems:'center', padding:'0 28px', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'16px' }}>
          <button onClick={() => router.push('/dashboard')} style={{ background:'transparent', border:'none', color:'#8FA4C0', cursor:'pointer', fontSize:'13px', fontFamily:'Inter, sans-serif' }}>← Voltar</button>
          <div style={{ width:'1px', height:'20px', background:'#1C3558' }} />
          <span style={{ fontSize:'17px', fontWeight:700, color:'#FFFFFF', letterSpacing:'-0.3px' }}>Vota<span style={{ color:'#C9A84C' }}>Map</span></span>
        </div>
        <div style={{ display:'flex', gap:'10px', alignItems:'center' }}>
          <div style={{ display:'flex', background:'#0F2040', borderRadius:'8px', padding:'3px', border:'1px solid #1C3558' }}>
            {[['lista','☰ Lista'],['calendario','📅 Calendário']].map(([key, label]) => (
              <button key={key} onClick={() => setVisualizacao(key as any)}
                style={{ padding:'6px 14px', borderRadius:'6px', border:'none', background: visualizacao === key ? 'linear-gradient(135deg, #E8C87A, #A07830)' : 'transparent', color: visualizacao === key ? '#0B1F3A' : '#8FA4C0', fontSize:'12px', fontWeight: visualizacao === key ? 600 : 400, cursor:'pointer', fontFamily:'Inter, sans-serif' }}>
                {label}
              </button>
            ))}
          </div>
          <button onClick={() => { setEditando(null); setForm(formInicial); setModalAberto(true); setErro('') }}
            style={{ background:'linear-gradient(135deg, #E8C87A, #A07830)', border:'none', borderRadius:'8px', color:'#0B1F3A', fontSize:'13px', fontWeight:600, padding:'9px 18px', cursor:'pointer', fontFamily:'Inter, sans-serif' }}>
            + Novo Evento
          </button>
        </div>
      </nav>

      <main style={{ paddingTop:'76px', padding:'76px 28px 40px', position:'relative', zIndex:1, maxWidth:'1100px', margin:'0 auto' }}>
        <div style={{ marginBottom:'24px' }}>
          <div style={{ fontSize:'11px', fontWeight:600, letterSpacing:'2px', textTransform:'uppercase', color:'#C9A84C', display:'flex', alignItems:'center', gap:'8px', marginBottom:'8px' }}>
            <span style={{ width:'20px', height:'1px', background:'#A07830', display:'inline-block' }} />
            Campanha
          </div>
          <h1 style={{ fontSize:'24px', fontWeight:700, color:'#FFFFFF', letterSpacing:'-0.5px', marginBottom:'4px' }}>Agenda de Eventos</h1>
          <p style={{ fontSize:'14px', color:'#8FA4C0' }}>{eventos.length} evento{eventos.length !== 1 ? 's' : ''} cadastrado{eventos.length !== 1 ? 's' : ''}</p>
        </div>

        {/* PRÓXIMOS EVENTOS */}
        {eventosProximos.length > 0 && (
          <div style={{ marginBottom:'24px' }}>
            <div style={{ fontSize:'12px', fontWeight:600, color:'#8FA4C0', textTransform:'uppercase', letterSpacing:'1.5px', marginBottom:'12px' }}>Próximos eventos</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))', gap:'12px' }}>
              {eventosProximos.map(e => {
                const tipo = tipoInfo[e.tipo]
                return (
                  <div key={e.id} style={{ background:'#0F2040', border:`1px solid ${tipo.cor}30`, borderRadius:'10px', padding:'18px', borderLeft:`3px solid ${tipo.cor}` }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'8px' }}>
                      <div style={{ fontSize:'18px' }}>{tipo.icone}</div>
                      <span style={{ fontSize:'10px', fontWeight:600, padding:'2px 8px', borderRadius:'100px', background: e.confirmado ? 'rgba(34,197,94,0.1)' : 'rgba(201,168,76,0.1)', color: e.confirmado ? '#22c55e' : '#C9A84C', border:`1px solid ${e.confirmado ? 'rgba(34,197,94,0.2)' : 'rgba(201,168,76,0.2)'}` }}>
                        {e.confirmado ? 'Confirmado' : 'Pendente'}
                      </span>
                    </div>
                    <div style={{ fontSize:'14px', fontWeight:600, color:'#E8EDF5', marginBottom:'4px' }}>{e.titulo}</div>
                    <div style={{ fontSize:'12px', color:'#8FA4C0' }}>📅 {formatarData(e.data)}</div>
                    {e.hora_inicio && <div style={{ fontSize:'12px', color:'#8FA4C0' }}>🕐 {formatarHora(e.hora_inicio)}{e.hora_fim ? ` — ${formatarHora(e.hora_fim)}` : ''}</div>}
                    {e.local_cidade && <div style={{ fontSize:'12px', color:'#8FA4C0' }}>📍 {e.local_nome ? `${e.local_nome}, ` : ''}{e.local_cidade}</div>}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {sucesso && <div style={{ background:'rgba(201,168,76,0.1)', border:'1px solid rgba(201,168,76,0.3)', borderRadius:'8px', padding:'12px 16px', fontSize:'13px', color:'#C9A84C', marginBottom:'16px' }}>✓ {sucesso}</div>}

        {/* FILTROS */}
        <div style={{ display:'flex', gap:'8px', marginBottom:'20px', flexWrap:'wrap' as const }}>
          <button onClick={() => setFiltroTipo('')} style={{ padding:'7px 14px', borderRadius:'100px', border:`1px solid ${filtroTipo === '' ? 'rgba(201,168,76,0.5)' : '#1C3558'}`, background: filtroTipo === '' ? 'rgba(201,168,76,0.12)' : 'transparent', color: filtroTipo === '' ? '#C9A84C' : '#8FA4C0', fontSize:'12px', cursor:'pointer', fontFamily:'Inter, sans-serif', fontWeight: filtroTipo === '' ? 600 : 400 }}>Todos</button>
          {Object.entries(tipoInfo).map(([key, info]) => (
            <button key={key} onClick={() => setFiltroTipo(key)}
              style={{ padding:'7px 14px', borderRadius:'100px', border:`1px solid ${filtroTipo === key ? `${info.cor}60` : '#1C3558'}`, background: filtroTipo === key ? `${info.cor}18` : 'transparent', color: filtroTipo === key ? info.cor : '#8FA4C0', fontSize:'12px', cursor:'pointer', fontFamily:'Inter, sans-serif', fontWeight: filtroTipo === key ? 600 : 400 }}>
              {info.icone} {info.label}
            </button>
          ))}
        </div>

        {/* VISUALIZAÇÃO LISTA */}
        {visualizacao === 'lista' && (
          loading ? <div style={{ color:'#C9A84C', fontSize:'14px' }}>Carregando...</div>
          : eventosFiltrados.length === 0 ? (
            <div style={{ background:'#0F2040', border:'1px solid #1C3558', borderRadius:'12px', padding:'60px', textAlign:'center' as const }}>
              <div style={{ fontSize:'48px', marginBottom:'16px' }}>📅</div>
              <div style={{ fontSize:'18px', fontWeight:600, color:'#E8EDF5', marginBottom:'8px' }}>Nenhum evento cadastrado</div>
              <div style={{ fontSize:'14px', color:'#8FA4C0', marginBottom:'24px' }}>Organize os compromissos da campanha</div>
              <button onClick={() => setModalAberto(true)} style={{ background:'linear-gradient(135deg, #E8C87A, #A07830)', border:'none', borderRadius:'8px', color:'#0B1F3A', fontSize:'14px', fontWeight:600, padding:'12px 28px', cursor:'pointer' }}>+ Criar primeiro evento</button>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
              {eventosFiltrados.map(e => {
                const tipo = tipoInfo[e.tipo]
                const passado = e.data < hoje
                return (
                  <div key={e.id} style={{ background:'#0F2040', border:'1px solid #1C3558', borderRadius:'10px', padding:'18px 20px', display:'flex', alignItems:'center', gap:'16px', opacity: passado ? 0.6 : 1, transition:'all .2s' }}
                    onMouseEnter={ev => (ev.currentTarget as HTMLDivElement).style.borderColor='rgba(201,168,76,0.3)'}
                    onMouseLeave={ev => (ev.currentTarget as HTMLDivElement).style.borderColor='#1C3558'}>
                    <div style={{ width:'48px', height:'48px', borderRadius:'10px', background:`${tipo.cor}18`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'20px', flexShrink:0 }}>{tipo.icone}</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'4px', flexWrap:'wrap' as const }}>
                        <div style={{ fontSize:'15px', fontWeight:600, color:'#E8EDF5' }}>{e.titulo}</div>
                        <span style={{ fontSize:'10px', fontWeight:600, padding:'2px 8px', borderRadius:'100px', background:`${tipo.cor}18`, color:tipo.cor, border:`1px solid ${tipo.cor}30` }}>{tipo.label}</span>
                        {!e.confirmado && <span style={{ fontSize:'10px', fontWeight:600, padding:'2px 8px', borderRadius:'100px', background:'rgba(201,168,76,0.1)', color:'#C9A84C', border:'1px solid rgba(201,168,76,0.2)' }}>Pendente</span>}
                        {!e.publico && <span style={{ fontSize:'10px', fontWeight:600, padding:'2px 8px', borderRadius:'100px', background:'rgba(143,164,192,0.1)', color:'#8FA4C0', border:'1px solid rgba(143,164,192,0.2)' }}>Privado</span>}
                      </div>
                      <div style={{ display:'flex', gap:'16px', flexWrap:'wrap' as const, fontSize:'12px', color:'#8FA4C0' }}>
                        <span>📅 {formatarData(e.data)}</span>
                        {e.hora_inicio && <span>🕐 {formatarHora(e.hora_inicio)}{e.hora_fim ? ` — ${formatarHora(e.hora_fim)}` : ''}</span>}
                        {e.local_cidade && <span>📍 {e.local_nome ? `${e.local_nome} · ` : ''}{e.local_cidade}/{e.local_estado}</span>}
                      </div>
                      {e.descricao && <div style={{ fontSize:'12px', color:'#3D5470', marginTop:'4px', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{e.descricao}</div>}
                    </div>
                    <div style={{ display:'flex', gap:'8px', flexShrink:0 }}>
                      <button onClick={() => abrirEditar(e)} style={{ background:'rgba(201,168,76,0.1)', border:'1px solid rgba(201,168,76,0.2)', borderRadius:'6px', color:'#C9A84C', fontSize:'12px', padding:'6px 12px', cursor:'pointer', fontFamily:'Inter, sans-serif' }}>✏️ Editar</button>
                      <button onClick={() => handleDeletar(e.id)} style={{ background:'rgba(192,57,43,0.1)', border:'1px solid rgba(192,57,43,0.2)', borderRadius:'6px', color:'#e74c3c', fontSize:'12px', padding:'6px 10px', cursor:'pointer', fontFamily:'Inter, sans-serif' }}>✕</button>
                    </div>
                  </div>
                )
              })}
            </div>
          )
        )}

        {/* VISUALIZAÇÃO CALENDÁRIO */}
        {visualizacao === 'calendario' && (
          <div style={{ background:'#0F2040', border:'1px solid #1C3558', borderRadius:'12px', overflow:'hidden' }}>
            {/* Header do calendário */}
            <div style={{ padding:'16px 20px', borderBottom:'1px solid #1C3558', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <button onClick={() => { if(mesSelecionado === 0) { setMesSelecionado(11); setAnoSelecionado(a=>a-1) } else setMesSelecionado(m=>m-1) }} style={{ background:'transparent', border:'1px solid #1C3558', borderRadius:'6px', color:'#8FA4C0', width:'32px', height:'32px', cursor:'pointer', fontSize:'14px' }}>‹</button>
              <div style={{ fontSize:'16px', fontWeight:600, color:'#E8EDF5' }}>{meses[mesSelecionado]} {anoSelecionado}</div>
              <button onClick={() => { if(mesSelecionado === 11) { setMesSelecionado(0); setAnoSelecionado(a=>a+1) } else setMesSelecionado(m=>m+1) }} style={{ background:'transparent', border:'1px solid #1C3558', borderRadius:'6px', color:'#8FA4C0', width:'32px', height:'32px', cursor:'pointer', fontSize:'14px' }}>›</button>
            </div>
            {/* Dias da semana */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', borderBottom:'1px solid #1C3558' }}>
              {['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map(d => (
                <div key={d} style={{ padding:'10px', textAlign:'center' as const, fontSize:'11px', fontWeight:600, color:'#8FA4C0', letterSpacing:'0.5px' }}>{d}</div>
              ))}
            </div>
            {/* Grid de dias */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)' }}>
              {Array.from({ length: primeiroDiaSemana }, (_, i) => (
                <div key={`empty-${i}`} style={{ minHeight:'80px', borderRight:'1px solid rgba(28,53,88,0.3)', borderBottom:'1px solid rgba(28,53,88,0.3)' }} />
              ))}
              {Array.from({ length: diasNoMes }, (_, i) => {
                const dia = i + 1
                const dataStr = `${anoSelecionado}-${String(mesSelecionado+1).padStart(2,'0')}-${String(dia).padStart(2,'0')}`
                const eventosNoDia = eventosFiltrados.filter(e => e.data === dataStr)
                const isHoje = dataStr === hoje
                return (
                  <div key={dia} style={{ minHeight:'80px', borderRight:'1px solid rgba(28,53,88,0.3)', borderBottom:'1px solid rgba(28,53,88,0.3)', padding:'6px', background: isHoje ? 'rgba(201,168,76,0.05)' : 'transparent' }}>
                    <div style={{ fontSize:'13px', fontWeight: isHoje ? 700 : 400, color: isHoje ? '#C9A84C' : '#8FA4C0', marginBottom:'4px', width:'24px', height:'24px', borderRadius:'50%', background: isHoje ? 'rgba(201,168,76,0.15)' : 'transparent', display:'flex', alignItems:'center', justifyContent:'center' }}>{dia}</div>
                    {eventosNoDia.map(e => {
                      const tipo = tipoInfo[e.tipo]
                      return (
                        <div key={e.id} onClick={() => abrirEditar(e)} style={{ fontSize:'10px', padding:'2px 6px', borderRadius:'4px', background:`${tipo.cor}20`, color:tipo.cor, marginBottom:'2px', cursor:'pointer', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                          {tipo.icone} {e.titulo}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
            {/* Eventos do mês */}
            {eventosMes.length > 0 && (
              <div style={{ padding:'16px 20px', borderTop:'1px solid #1C3558' }}>
                <div style={{ fontSize:'12px', fontWeight:600, color:'#8FA4C0', textTransform:'uppercase', letterSpacing:'1px', marginBottom:'12px' }}>{eventosMes.length} evento{eventosMes.length !== 1 ? 's' : ''} em {meses[mesSelecionado]}</div>
                <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                  {eventosMes.map(e => {
                    const tipo = tipoInfo[e.tipo]
                    return (
                      <div key={e.id} style={{ display:'flex', alignItems:'center', gap:'12px', padding:'10px 14px', background:'rgba(255,255,255,0.02)', borderRadius:'8px', border:'1px solid rgba(28,53,88,0.5)' }}>
                        <div style={{ fontSize:'16px' }}>{tipo.icone}</div>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:'13px', fontWeight:500, color:'#E8EDF5' }}>{e.titulo}</div>
                          <div style={{ fontSize:'11px', color:'#8FA4C0' }}>{formatarData(e.data)}{e.hora_inicio ? ` · ${formatarHora(e.hora_inicio)}` : ''}</div>
                        </div>
                        <button onClick={() => abrirEditar(e)} style={{ background:'rgba(201,168,76,0.1)', border:'1px solid rgba(201,168,76,0.2)', borderRadius:'6px', color:'#C9A84C', fontSize:'11px', padding:'4px 10px', cursor:'pointer', fontFamily:'Inter, sans-serif' }}>✏️</button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* MODAL */}
      {modalAberto && (
        <div style={{ position:'fixed', inset:0, zIndex:200, background:'rgba(0,0,0,0.75)', display:'flex', alignItems:'center', justifyContent:'center', padding:'24px', overflowY:'auto' }}>
          <div style={{ background:'#0F2040', border:'1px solid rgba(201,168,76,0.2)', borderRadius:'16px', padding:'32px', width:'100%', maxWidth:'580px', position:'relative', margin:'auto' }}>
            <div style={{ position:'absolute', top:0, left:'10%', right:'10%', height:'1px', background:'linear-gradient(90deg, transparent, #C9A84C, transparent)' }} />
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'24px' }}>
              <h2 style={{ fontSize:'18px', fontWeight:700, color:'#FFFFFF' }}>{editando ? 'Editar Evento' : 'Novo Evento'}</h2>
              <button onClick={() => { setModalAberto(false); setEditando(null) }} style={{ background:'transparent', border:'none', color:'#8FA4C0', cursor:'pointer', fontSize:'20px' }}>✕</button>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
              <div>
                <label style={labelStyle}>Título *</label>
                <input value={form.titulo} onChange={e => setForm(p=>({...p,titulo:e.target.value}))} placeholder="Nome do evento" style={inputStyle} onFocus={e=>e.target.style.borderColor='#C9A84C'} onBlur={e=>e.target.style.borderColor='#1C3558'} />
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
                <div>
                  <label style={labelStyle}>Tipo *</label>
                  <select value={form.tipo} onChange={e => setForm(p=>({...p,tipo:e.target.value}))} style={{ ...inputStyle, cursor:'pointer' }} onFocus={e=>e.target.style.borderColor='#C9A84C'} onBlur={e=>e.target.style.borderColor='#1C3558'}>
                    {Object.entries(tipoInfo).map(([k,v]) => <option key={k} value={k}>{v.icone} {v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Data *</label>
                  <input type="date" value={form.data} onChange={e => setForm(p=>({...p,data:e.target.value}))} style={{ ...inputStyle, colorScheme:'dark' }} onFocus={e=>e.target.style.borderColor='#C9A84C'} onBlur={e=>e.target.style.borderColor='#1C3558'} />
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
                <div>
                  <label style={labelStyle}>Hora início</label>
                  <input type="time" value={form.hora_inicio} onChange={e => setForm(p=>({...p,hora_inicio:e.target.value}))} style={{ ...inputStyle, colorScheme:'dark' }} onFocus={e=>e.target.style.borderColor='#C9A84C'} onBlur={e=>e.target.style.borderColor='#1C3558'} />
                </div>
                <div>
                  <label style={labelStyle}>Hora fim</label>
                  <input type="time" value={form.hora_fim} onChange={e => setForm(p=>({...p,hora_fim:e.target.value}))} style={{ ...inputStyle, colorScheme:'dark' }} onFocus={e=>e.target.style.borderColor='#C9A84C'} onBlur={e=>e.target.style.borderColor='#1C3558'} />
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
                <div>
                  <label style={labelStyle}>Local / Nome do espaço</label>
                  <input value={form.local_nome} onChange={e => setForm(p=>({...p,local_nome:e.target.value}))} placeholder="Ex: Ginásio Municipal" style={inputStyle} onFocus={e=>e.target.style.borderColor='#C9A84C'} onBlur={e=>e.target.style.borderColor='#1C3558'} />
                </div>
                <div>
                  <label style={labelStyle}>Endereço</label>
                  <input value={form.local_endereco} onChange={e => setForm(p=>({...p,local_endereco:e.target.value}))} placeholder="Rua, número" style={inputStyle} onFocus={e=>e.target.style.borderColor='#C9A84C'} onBlur={e=>e.target.style.borderColor='#1C3558'} />
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 80px', gap:'12px' }}>
                <div>
                  <label style={labelStyle}>Cidade</label>
                  <input value={form.local_cidade} onChange={e => setForm(p=>({...p,local_cidade:e.target.value}))} placeholder="Cidade" style={inputStyle} onFocus={e=>e.target.style.borderColor='#C9A84C'} onBlur={e=>e.target.style.borderColor='#1C3558'} />
                </div>
                <div>
                  <label style={labelStyle}>UF</label>
                  <input value={form.local_estado} onChange={e => setForm(p=>({...p,local_estado:e.target.value}))} placeholder="RS" maxLength={2} style={inputStyle} onFocus={e=>e.target.style.borderColor='#C9A84C'} onBlur={e=>e.target.style.borderColor='#1C3558'} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Descrição</label>
                <textarea value={form.descricao} onChange={e => setForm(p=>({...p,descricao:e.target.value}))} placeholder="Detalhes do evento..." rows={2} style={{ ...inputStyle, resize:'vertical' as const }} onFocus={e=>e.target.style.borderColor='#C9A84C'} onBlur={e=>e.target.style.borderColor='#1C3558'} />
              </div>
              <div style={{ display:'flex', gap:'20px' }}>
                <label style={{ display:'flex', alignItems:'center', gap:'8px', cursor:'pointer', fontSize:'13px', color:'#8FA4C0' }}>
                  <input type="checkbox" checked={form.confirmado} onChange={e => setForm(p=>({...p,confirmado:e.target.checked}))} style={{ accentColor:'#C9A84C', width:'16px', height:'16px' }} />
                  Confirmado
                </label>
                <label style={{ display:'flex', alignItems:'center', gap:'8px', cursor:'pointer', fontSize:'13px', color:'#8FA4C0' }}>
                  <input type="checkbox" checked={form.publico} onChange={e => setForm(p=>({...p,publico:e.target.checked}))} style={{ accentColor:'#C9A84C', width:'16px', height:'16px' }} />
                  Evento público
                </label>
              </div>
              {erro && <div style={{ background:'rgba(192,57,43,0.1)', border:'1px solid rgba(192,57,43,0.3)', borderRadius:'8px', padding:'10px 14px', fontSize:'13px', color:'#e74c3c' }}>{erro}</div>}
              <div style={{ display:'flex', gap:'10px', justifyContent:'flex-end' }}>
                <button onClick={() => { setModalAberto(false); setEditando(null) }} style={{ background:'transparent', border:'1px solid #1C3558', borderRadius:'8px', color:'#8FA4C0', fontSize:'13px', padding:'10px 20px', cursor:'pointer', fontFamily:'Inter, sans-serif' }}>Cancelar</button>
                <button onClick={handleSalvar} disabled={salvando} style={{ background: salvando ? 'rgba(201,168,76,0.4)' : 'linear-gradient(135deg, #E8C87A, #A07830)', border:'none', borderRadius:'8px', color:'#0B1F3A', fontSize:'13px', fontWeight:600, padding:'10px 24px', cursor: salvando ? 'not-allowed' : 'pointer', fontFamily:'Inter, sans-serif' }}>
                  {salvando ? 'Salvando...' : editando ? 'Atualizar →' : 'Criar evento →'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
