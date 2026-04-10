'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type Disparo = {
  id: string; canal: string; assunto: string; mensagem: string
  total_destinatarios: number; total_enviados: number; total_erros: number
  status: string; criado_em: string
}
type Lider = { id: string; nome: string; cidade: string }
type Apoiador = { id: string; nome: string; email: string; telefone: string; whatsapp: string; lider_id: string }

export default function ComunicacaoPage() {
  const [disparos, setDisparos] = useState<Disparo[]>([])
  const [lideres, setLideres] = useState<Lider[]>([])
  const [loading, setLoading] = useState(true)
  const [modalAberto, setModalAberto] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [progresso, setProgresso] = useState('')
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')
  const [previewCount, setPreviewCount] = useState(0)
  const router = useRouter()
  const supabase = createClient()

  const [form, setForm] = useState({
    canal: 'email', assunto: '', mensagem: '',
    filtro: 'todos', filtro_lider_id: '', remetente_nome: '',
  })

  const canalInfo: Record<string,{label:string;cor:string;icone:string;status:string}> = {
    email:    { label:'E-mail',   cor:'#6ba3d6', icone:'✉️', status:'ativo' },
    sms:      { label:'SMS',      cor:'#C9A84C', icone:'📱', status:'ativo' },
    whatsapp: { label:'WhatsApp', cor:'#5eead4', icone:'💬', status:'em breve' },
  }

  const statusInfo: Record<string,{label:string;cor:string}> = {
    pendente:  { label:'Pendente',  cor:'#8FA4C0' },
    enviando:  { label:'Enviando',  cor:'#C9A84C' },
    concluido: { label:'Concluído', cor:'#22c55e' },
    erro:      { label:'Erro',      cor:'#e74c3c' },
  }

  useEffect(() => {
    async function carregar() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const [{ data: disp }, { data: lid }] = await Promise.all([
        supabase.from('disparos').select('*').order('criado_em', { ascending: false }),
        supabase.from('lideres_regionais').select('id, nome, cidade').eq('ativo', true).order('nome'),
      ])
      if (disp) setDisparos(disp)
      if (lid) setLideres(lid)
      setLoading(false)
    }
    carregar()
  }, [])

  useEffect(() => { contarDestinatarios() }, [form.filtro, form.filtro_lider_id, form.canal])

  async function contarDestinatarios() {
    let query = supabase.from('apoiadores').select('id', { count: 'exact', head: true })
    if (form.filtro === 'lider' && form.filtro_lider_id) query = query.eq('lider_id', form.filtro_lider_id)
    if (form.canal === 'email') query = query.not('email', 'is', null)
    if (form.canal === 'sms') query = query.not('telefone', 'is', null)
    const { count } = await query
    setPreviewCount(count || 0)
  }

  async function buscarDestinatarios(): Promise<Apoiador[]> {
    let query = supabase.from('apoiadores').select('id, nome, email, telefone, whatsapp, lider_id')
    if (form.filtro === 'lider' && form.filtro_lider_id) query = query.eq('lider_id', form.filtro_lider_id)
    if (form.canal === 'email') query = query.not('email', 'is', null)
    if (form.canal === 'sms') query = query.not('telefone', 'is', null)
    const { data } = await query
    return data || []
  }

  async function handleEnviar() {
    if (!form.mensagem) { setErro('Digite a mensagem'); return }
    if (form.canal === 'email' && !form.assunto) { setErro('Informe o assunto'); return }
    if (previewCount === 0) { setErro('Nenhum destinatário encontrado'); return }
    if (!confirm(`Confirma o envio para ${previewCount} destinatários?`)) return

    setEnviando(true); setErro(''); setSucesso('')
    setProgresso('Buscando destinatários...')
    const destinatarios = await buscarDestinatarios()

    const { data: disparo } = await supabase.from('disparos').insert({
      canal: form.canal, assunto: form.assunto, mensagem: form.mensagem,
      total_destinatarios: destinatarios.length, status: 'enviando',
      filtro_lider_id: form.filtro_lider_id || null,
    }).select().single()

    try {
      if (form.canal === 'email') {
        setProgresso(`Enviando e-mails para ${destinatarios.length} pessoas...`)
        const res = await fetch('/api/comunicacao/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            destinatarios: destinatarios.map(d => ({ email: d.email, nome: d.nome })),
            assunto: form.assunto, mensagem: form.mensagem,
            remetente_nome: form.remetente_nome,
          }),
        })
        const resultado = await res.json()
        if (disparo) await supabase.from('disparos').update({ total_enviados: resultado.enviados || 0, total_erros: resultado.erros || 0, status: 'concluido' }).eq('id', disparo.id)
        setSucesso(`✓ ${resultado.enviados} e-mails enviados!${resultado.erros > 0 ? ` (${resultado.erros} erros)` : ''}`)

      } else if (form.canal === 'sms') {
        setProgresso(`Enviando SMS para ${destinatarios.length} pessoas...`)
        const res = await fetch('/api/comunicacao/sms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            destinatarios: destinatarios.map(d => ({ telefone: d.telefone, nome: d.nome })),
            mensagem: form.mensagem,
          }),
        })
        const resultado = await res.json()
        if (disparo) await supabase.from('disparos').update({ total_enviados: resultado.enviados || 0, total_erros: resultado.erros || 0, status: 'concluido' }).eq('id', disparo.id)
        setSucesso(`✓ ${resultado.enviados} SMS enviados!${resultado.erros > 0 ? ` (${resultado.erros} erros)` : ''}`)

      } else {
        if (disparo) await supabase.from('disparos').update({ status: 'concluido' }).eq('id', disparo.id)
        setSucesso('Disparo registrado! WhatsApp em breve.')
      }

      setModalAberto(false)
      setForm({ canal:'email', assunto:'', mensagem:'', filtro:'todos', filtro_lider_id:'', remetente_nome:'' })
      const { data } = await supabase.from('disparos').select('*').order('criado_em', { ascending: false })
      if (data) setDisparos(data)
    } catch (e: any) {
      setErro('Erro: ' + e.message)
      if (disparo) await supabase.from('disparos').update({ status: 'erro' }).eq('id', disparo.id)
    }
    setProgresso(''); setEnviando(false)
    setTimeout(() => setSucesso(''), 5000)
  }

  const inputStyle = { padding:'10px 14px', background:'#0B1F3A', border:'1px solid #1C3558', borderRadius:'8px', color:'#E8EDF5', fontSize:'14px', outline:'none', fontFamily:'Inter, sans-serif', width:'100%', boxSizing:'border-box' as const }
  const labelStyle = { fontSize:'11px', fontWeight:600 as const, letterSpacing:'1px', textTransform:'uppercase' as const, color:'#8FA4C0', marginBottom:'6px', display:'block' as const }

  return (
    <div style={{ minHeight:'100vh', background:'#0B1F3A', fontFamily:'Inter, system-ui, sans-serif' }}>
      <div style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:0, backgroundImage:`repeating-linear-gradient(0deg, transparent, transparent 80px, rgba(201,168,76,0.02) 80px, rgba(201,168,76,0.02) 81px), repeating-linear-gradient(90deg, transparent, transparent 80px, rgba(201,168,76,0.02) 80px, rgba(201,168,76,0.02) 81px)` }} />

      <nav style={{ position:'fixed', top:0, left:0, right:0, zIndex:100, height:'60px', background:'rgba(11,31,58,0.97)', backdropFilter:'blur(20px)', borderBottom:'1px solid rgba(201,168,76,0.15)', display:'flex', alignItems:'center', padding:'0 28px', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'16px' }}>
          <button onClick={() => router.push('/dashboard')} style={{ background:'transparent', border:'none', color:'#8FA4C0', cursor:'pointer', fontSize:'13px', fontFamily:'Inter, sans-serif' }}>← Voltar</button>
          <div style={{ width:'1px', height:'20px', background:'#1C3558' }} />
          <span style={{ fontSize:'17px', fontWeight:700, color:'#FFFFFF', letterSpacing:'-0.3px' }}>Cand<span style={{ color:'#C9A84C' }}>Maps</span></span>
        </div>
        <button onClick={() => { setModalAberto(true); setErro('') }} style={{ background:'linear-gradient(135deg, #E8C87A, #A07830)', border:'none', borderRadius:'8px', color:'#0B1F3A', fontSize:'13px', fontWeight:600, padding:'9px 18px', cursor:'pointer', fontFamily:'Inter, sans-serif' }}>
          + Novo Disparo
        </button>
      </nav>

      <main style={{ paddingTop:'76px', padding:'76px 28px 40px', position:'relative', zIndex:1, maxWidth:'1100px', margin:'0 auto' }}>
        <div style={{ marginBottom:'28px' }}>
          <div style={{ fontSize:'11px', fontWeight:600, letterSpacing:'2px', textTransform:'uppercase', color:'#C9A84C', display:'flex', alignItems:'center', gap:'8px', marginBottom:'8px' }}>
            <span style={{ width:'20px', height:'1px', background:'#A07830', display:'inline-block' }} />
            Campanha
          </div>
          <h1 style={{ fontSize:'24px', fontWeight:700, color:'#FFFFFF', letterSpacing:'-0.5px', marginBottom:'4px' }}>Comunicação</h1>
          <p style={{ fontSize:'14px', color:'#8FA4C0' }}>Envie mensagens segmentadas para sua base eleitoral</p>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'14px', marginBottom:'28px' }}>
          {Object.entries(canalInfo).map(([key, info]) => (
            <div key={key} style={{ background:'#0F2040', border:`1px solid ${info.status === 'ativo' ? 'rgba(201,168,76,0.2)' : '#1C3558'}`, borderRadius:'10px', padding:'20px', opacity: info.status === 'ativo' ? 1 : 0.6 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                <div style={{ fontSize:'28px' }}>{info.icone}</div>
                <span style={{ fontSize:'10px', fontWeight:600, padding:'2px 8px', borderRadius:'100px', background: info.status === 'ativo' ? 'rgba(34,197,94,0.1)' : 'rgba(201,168,76,0.1)', border:`1px solid ${info.status === 'ativo' ? 'rgba(34,197,94,0.2)' : 'rgba(201,168,76,0.2)'}`, color: info.status === 'ativo' ? '#22c55e' : '#C9A84C' }}>
                  {info.status === 'ativo' ? 'Ativo' : 'Em breve'}
                </span>
              </div>
              <div style={{ fontSize:'15px', fontWeight:600, color:'#E8EDF5', marginTop:'12px' }}>{info.label}</div>
              <div style={{ fontSize:'12px', color:'#8FA4C0', marginTop:'4px' }}>
                {key === 'email' ? 'Via Resend · 3.000/mês grátis' : key === 'sms' ? 'Via Twilio · ativo' : 'Via Evolution API · em breve'}
              </div>
            </div>
          ))}
        </div>

        {sucesso && <div style={{ background:'rgba(34,197,94,0.1)', border:'1px solid rgba(34,197,94,0.3)', borderRadius:'8px', padding:'12px 16px', fontSize:'13px', color:'#22c55e', marginBottom:'16px' }}>{sucesso}</div>}

        <div style={{ fontSize:'13px', fontWeight:600, color:'#8FA4C0', textTransform:'uppercase', letterSpacing:'1.5px', marginBottom:'14px' }}>Histórico de disparos</div>

        {loading ? (
          <div style={{ color:'#C9A84C', fontSize:'14px' }}>Carregando...</div>
        ) : disparos.length === 0 ? (
          <div style={{ background:'#0F2040', border:'1px solid #1C3558', borderRadius:'12px', padding:'60px', textAlign:'center' as const }}>
            <div style={{ fontSize:'48px', marginBottom:'16px' }}>💬</div>
            <div style={{ fontSize:'18px', fontWeight:600, color:'#E8EDF5', marginBottom:'8px' }}>Nenhum disparo realizado</div>
            <div style={{ fontSize:'14px', color:'#8FA4C0', marginBottom:'24px' }}>Envie sua primeira mensagem para a base eleitoral</div>
            <button onClick={() => setModalAberto(true)} style={{ background:'linear-gradient(135deg, #E8C87A, #A07830)', border:'none', borderRadius:'8px', color:'#0B1F3A', fontSize:'14px', fontWeight:600, padding:'12px 28px', cursor:'pointer' }}>+ Criar primeiro disparo</button>
          </div>
        ) : (
          <div style={{ background:'#0F2040', border:'1px solid #1C3558', borderRadius:'12px', overflow:'hidden' }}>
            <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr 120px', padding:'12px 20px', borderBottom:'1px solid #1C3558', fontSize:'11px', fontWeight:600, letterSpacing:'1px', textTransform:'uppercase' as const, color:'#8FA4C0' }}>
              <span>Mensagem</span><span>Canal</span><span>Enviados</span><span>Erros</span><span>Status</span><span>Data</span>
            </div>
            {disparos.map((d, i) => {
              const canal = canalInfo[d.canal]
              const status = statusInfo[d.status]
              return (
                <div key={d.id} style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr 120px', padding:'14px 20px', borderBottom: i < disparos.length-1 ? '1px solid rgba(28,53,88,0.5)' : 'none', alignItems:'center' }}
                  onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background='rgba(201,168,76,0.02)'}
                  onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background='transparent'}>
                  <div>
                    <div style={{ fontSize:'14px', fontWeight:500, color:'#E8EDF5', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:'300px' }}>
                      {d.assunto || d.mensagem.slice(0, 50) + '...'}
                    </div>
                    <div style={{ fontSize:'11px', color:'#8FA4C0', marginTop:'2px' }}>{d.total_destinatarios} destinatários</div>
                  </div>
                  <div style={{ fontSize:'13px', color: canal?.cor }}>{canal?.icone} {canal?.label}</div>
                  <div style={{ fontSize:'13px', color:'#22c55e', fontWeight:500 }}>{d.total_enviados}</div>
                  <div style={{ fontSize:'13px', color: d.total_erros > 0 ? '#e74c3c' : '#8FA4C0' }}>{d.total_erros}</div>
                  <div>
                    <span style={{ fontSize:'11px', fontWeight:600, padding:'3px 10px', borderRadius:'100px', background:`rgba(${status?.cor === '#22c55e' ? '34,197,94' : status?.cor === '#e74c3c' ? '192,57,43' : '201,168,76'},0.1)`, color: status?.cor }}>
                      {status?.label}
                    </span>
                  </div>
                  <div style={{ fontSize:'12px', color:'#8FA4C0' }}>{new Date(d.criado_em).toLocaleDateString('pt-BR')}</div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {modalAberto && (
        <div style={{ position:'fixed', inset:0, zIndex:200, background:'rgba(0,0,0,0.75)', display:'flex', alignItems:'center', justifyContent:'center', padding:'24px', overflowY:'auto' }}>
          <div style={{ background:'#0F2040', border:'1px solid rgba(201,168,76,0.2)', borderRadius:'16px', padding:'32px', width:'100%', maxWidth:'560px', position:'relative', margin:'auto' }}>
            <div style={{ position:'absolute', top:0, left:'10%', right:'10%', height:'1px', background:'linear-gradient(90deg, transparent, #C9A84C, transparent)' }} />
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'24px' }}>
              <h2 style={{ fontSize:'18px', fontWeight:700, color:'#FFFFFF' }}>Novo Disparo</h2>
              <button onClick={() => setModalAberto(false)} style={{ background:'transparent', border:'none', color:'#8FA4C0', cursor:'pointer', fontSize:'20px' }}>✕</button>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
              <div>
                <label style={labelStyle}>Canal *</label>
                <div style={{ display:'flex', gap:'8px' }}>
                  {Object.entries(canalInfo).map(([key, info]) => (
                    <button key={key} onClick={() => setForm(p=>({...p,canal:key}))}
                      disabled={info.status !== 'ativo'}
                      style={{ flex:1, padding:'10px', borderRadius:'8px', border:`1px solid ${form.canal === key ? 'rgba(201,168,76,0.5)' : '#1C3558'}`, background: form.canal === key ? 'rgba(201,168,76,0.1)' : 'transparent', color: info.status !== 'ativo' ? '#3D5470' : form.canal === key ? '#C9A84C' : '#8FA4C0', fontSize:'13px', cursor: info.status === 'ativo' ? 'pointer' : 'not-allowed', fontFamily:'Inter, sans-serif', fontWeight: form.canal === key ? 600 : 400 }}>
                      {info.icone} {info.label}
                      {info.status !== 'ativo' && <div style={{ fontSize:'10px', color:'#3D5470' }}>em breve</div>}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={labelStyle}>Enviar para</label>
                <div style={{ display:'flex', gap:'8px' }}>
                  {[['todos','Todos'],['lider','Por líder']].map(([key, label]) => (
                    <button key={key} onClick={() => setForm(p=>({...p,filtro:key,filtro_lider_id:''}))}
                      style={{ padding:'8px 16px', borderRadius:'100px', border:`1px solid ${form.filtro === key ? 'rgba(201,168,76,0.5)' : '#1C3558'}`, background: form.filtro === key ? 'rgba(201,168,76,0.1)' : 'transparent', color: form.filtro === key ? '#C9A84C' : '#8FA4C0', fontSize:'13px', cursor:'pointer', fontFamily:'Inter, sans-serif', fontWeight: form.filtro === key ? 600 : 400 }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {form.filtro === 'lider' && (
                <div>
                  <label style={labelStyle}>Líder</label>
                  <select value={form.filtro_lider_id} onChange={e => setForm(p=>({...p,filtro_lider_id:e.target.value}))} style={{ ...inputStyle, cursor:'pointer' }} onFocus={e=>e.target.style.borderColor='#C9A84C'} onBlur={e=>e.target.style.borderColor='#1C3558'}>
                    <option value="">Selecione...</option>
                    {lideres.map(l => <option key={l.id} value={l.id}>{l.nome} — {l.cidade}</option>)}
                  </select>
                </div>
              )}

              <div style={{ background:'rgba(201,168,76,0.05)', border:'1px solid rgba(201,168,76,0.15)', borderRadius:'8px', padding:'12px 16px', display:'flex', alignItems:'center', gap:'10px' }}>
                <div style={{ fontSize:'22px', fontWeight:700, color:'#C9A84C' }}>{previewCount}</div>
                <div style={{ fontSize:'13px', color:'#8FA4C0' }}>destinatário{previewCount !== 1 ? 's' : ''} com contato cadastrado</div>
              </div>

              <div>
                <label style={labelStyle}>Nome do remetente</label>
                <input value={form.remetente_nome} onChange={e => setForm(p=>({...p,remetente_nome:e.target.value}))} placeholder="Ex: Campanha João Silva" style={inputStyle} onFocus={e=>e.target.style.borderColor='#C9A84C'} onBlur={e=>e.target.style.borderColor='#1C3558'} />
              </div>

              {form.canal === 'email' && (
                <div>
                  <label style={labelStyle}>Assunto *</label>
                  <input value={form.assunto} onChange={e => setForm(p=>({...p,assunto:e.target.value}))} placeholder="Assunto do e-mail" style={inputStyle} onFocus={e=>e.target.style.borderColor='#C9A84C'} onBlur={e=>e.target.style.borderColor='#1C3558'} />
                </div>
              )}

              <div>
                <label style={labelStyle}>Mensagem *</label>
                <textarea value={form.mensagem} onChange={e => setForm(p=>({...p,mensagem:e.target.value}))} placeholder="Digite sua mensagem..." rows={5} style={{ ...inputStyle, resize:'vertical' as const }} onFocus={e=>e.target.style.borderColor='#C9A84C'} onBlur={e=>e.target.style.borderColor='#1C3558'} />
                <div style={{ fontSize:'11px', color:'#3D5470', marginTop:'4px' }}>{form.mensagem.length} caracteres {form.canal === 'sms' && form.mensagem.length > 160 && <span style={{ color:'#e74c3c' }}>· SMS será dividido em {Math.ceil(form.mensagem.length/160)} partes</span>}</div>
              </div>

              {erro && <div style={{ background:'rgba(192,57,43,0.1)', border:'1px solid rgba(192,57,43,0.3)', borderRadius:'8px', padding:'10px 14px', fontSize:'13px', color:'#e74c3c' }}>{erro}</div>}

              <div style={{ display:'flex', gap:'10px', justifyContent:'flex-end' }}>
                <button onClick={() => setModalAberto(false)} style={{ background:'transparent', border:'1px solid #1C3558', borderRadius:'8px', color:'#8FA4C0', fontSize:'13px', padding:'10px 20px', cursor:'pointer', fontFamily:'Inter, sans-serif' }}>Cancelar</button>
                <button onClick={handleEnviar} disabled={enviando || previewCount === 0}
                  style={{ background: enviando || previewCount === 0 ? 'rgba(201,168,76,0.3)' : 'linear-gradient(135deg, #E8C87A, #A07830)', border:'none', borderRadius:'8px', color:'#0B1F3A', fontSize:'13px', fontWeight:600, padding:'10px 24px', cursor: enviando || previewCount === 0 ? 'not-allowed' : 'pointer', fontFamily:'Inter, sans-serif' }}>
                  {enviando ? progresso || 'Enviando...' : `Enviar para ${previewCount} →`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
