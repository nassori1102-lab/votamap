'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type Disparo = {
  id: string; canal: string; assunto: string; mensagem: string
  total_destinatarios: number; total_enviados: number; total_erros: number
  status: string; criado_em: string; audiencia: string
}
type Lider = { id: string; nome: string; cidade: string; email: string; telefone: string; whatsapp: string }
type Evento = {
  id: string; titulo: string; tipo: string; data: string
  hora_inicio: string; local_nome: string; local_endereco: string
  local_cidade: string; local_estado: string; descricao: string
}
type Credito = { id: string; canal: string; total: number; usado: number }

export default function ComunicacaoPage() {
  const [disparos, setDisparos] = useState<Disparo[]>([])
  const [lideres, setLideres] = useState<Lider[]>([])
  const [eventos, setEventos] = useState<Evento[]>([])
  const [creditos, setCreditos] = useState<Record<string, Credito>>({})
  const [loading, setLoading] = useState(true)
  const [perfilUsuario, setPerfilUsuario] = useState<string | null>(null)
  const [acessoNegado, setAcessoNegado] = useState(false)
  const [modalAberto, setModalAberto] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [progresso, setProgresso] = useState('')
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')
  const [previewCount, setPreviewCount] = useState(0)
  const router = useRouter()
  const supabase = createClient()

  const [form, setForm] = useState({
    canal: 'email',
    assunto: '',
    mensagem: '',
    audiencia: 'apoiadores',
    filtro: 'todos',
    filtro_lider_id: '',
    evento_id: '',
    remetente_nome: '',
  })

  const canalInfo: Record<string, { label: string; cor: string; icone: string; status: string }> = {
    email:    { label: 'E-mail',   cor: '#6ba3d6', icone: '✉️', status: 'ativo' },
    sms:      { label: 'SMS',      cor: '#C9A84C', icone: '📱', status: 'ativo' },
    whatsapp: { label: 'WhatsApp', cor: '#5eead4', icone: '💬', status: 'em breve' },
  }

  const statusInfo: Record<string, { label: string; cor: string }> = {
    pendente:  { label: 'Pendente',  cor: '#8FA4C0' },
    enviando:  { label: 'Enviando',  cor: '#C9A84C' },
    concluido: { label: 'Concluído', cor: '#22c55e' },
    erro:      { label: 'Erro',      cor: '#e74c3c' },
  }

  const tipoEventoLabel: Record<string, string> = {
    comicio: 'Comício', reuniao: 'Reunião', visita: 'Visita',
    debate: 'Debate', entrevista: 'Entrevista', evento_interno: 'Interno', outro: 'Evento',
  }

  useEffect(() => {
    async function carregar() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const [{ data: perfil }, { data: disp }, { data: lid }, { data: evs }, { data: creds }] = await Promise.all([
        supabase.from('usuarios').select('perfil').eq('id', user.id).single(),
        supabase.from('disparos').select('*').order('criado_em', { ascending: false }),
        supabase.from('lideres_regionais').select('id, nome, cidade, email, telefone, whatsapp').eq('ativo', true).order('nome'),
        supabase.from('eventos').select('id, titulo, tipo, data, hora_inicio, local_nome, local_endereco, local_cidade, local_estado, descricao').gte('data', new Date().toISOString().split('T')[0]).order('data').limit(20),
        supabase.from('creditos_mensagens').select('*'),
      ])

      const p = perfil?.perfil || 'lider'
      setPerfilUsuario(p)
      if (!['coordenador', 'marketing'].includes(p)) {
        setAcessoNegado(true)
        setLoading(false)
        return
      }

      if (disp) setDisparos(disp)
      if (lid) setLideres(lid)
      if (evs) setEventos(evs)
      if (creds) {
        const map: Record<string, Credito> = {}
        for (const c of creds) map[c.canal] = c
        setCreditos(map)
      }
      setLoading(false)
    }
    carregar()
  }, [])

  useEffect(() => { contarDestinatarios() }, [form.filtro, form.filtro_lider_id, form.canal, form.audiencia])

  async function contarDestinatarios() {
    let total = 0
    if (form.audiencia === 'apoiadores' || form.audiencia === 'ambos') {
      let q = supabase.from('apoiadores').select('id', { count: 'exact', head: true })
      if (form.filtro === 'lider' && form.filtro_lider_id) q = q.eq('lider_id', form.filtro_lider_id)
      if (form.canal === 'email') q = q.not('email', 'is', null)
      if (form.canal === 'sms') q = q.not('telefone', 'is', null)
      const { count } = await q
      total += count || 0
    }
    if (form.audiencia === 'lideres' || form.audiencia === 'ambos') {
      let q = supabase.from('lideres_regionais').select('id', { count: 'exact', head: true }).eq('ativo', true)
      if (form.canal === 'email') q = q.not('email', 'is', null)
      if (form.canal === 'sms') q = q.not('telefone', 'is', null)
      const { count } = await q
      total += count || 0
    }
    setPreviewCount(total)
  }

  async function buscarDestinatariosApoiadores() {
    let q = supabase.from('apoiadores').select('id, nome, email, telefone, whatsapp, lider_id')
    if (form.filtro === 'lider' && form.filtro_lider_id) q = q.eq('lider_id', form.filtro_lider_id)
    if (form.canal === 'email') q = q.not('email', 'is', null)
    if (form.canal === 'sms') q = q.not('telefone', 'is', null)
    const { data } = await q
    return data || []
  }

  async function buscarDestinatariosLideres() {
    let q = supabase.from('lideres_regionais').select('id, nome, email, telefone, whatsapp').eq('ativo', true)
    if (form.canal === 'email') q = q.not('email', 'is', null)
    if (form.canal === 'sms') q = q.not('telefone', 'is', null)
    const { data } = await q
    return data || []
  }

  function gerarTemplateApoiador(evento: Evento): string {
    const data = new Date(evento.data + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })
    const tipo = tipoEventoLabel[evento.tipo] || 'Evento'
    return `Olá! 😊 Você está convidado para ${evento.titulo}!\n\n📅 ${data} às ${evento.hora_inicio.slice(0,5)}\n📍 ${evento.local_nome}${evento.local_endereco ? ', ' + evento.local_endereco : ''} — ${evento.local_cidade}/${evento.local_estado}\n\nSeria um prazer contar com a sua presença neste ${tipo.toLowerCase()}. Sua participação faz toda a diferença!${evento.descricao ? '\n\n' + evento.descricao : ''}`
  }

  function gerarTemplateLider(evento: Evento): string {
    const data = new Date(evento.data + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })
    const tipo = tipoEventoLabel[evento.tipo] || 'Evento'
    return `Caro Líder,\n\nContamos com você para ${evento.titulo}!\n\n📅 ${data} às ${evento.hora_inicio.slice(0,5)}\n📍 ${evento.local_nome}${evento.local_endereco ? ', ' + evento.local_endereco : ''} — ${evento.local_cidade}/${evento.local_estado}\n\nSua liderança é fundamental para mobilizarmos nossa rede de apoiadores. Por favor, convide o máximo de pessoas da sua região para este ${tipo.toLowerCase()} e ajude a fortalecer nossa campanha.${evento.descricao ? '\n\n' + evento.descricao : ''}\n\nContamos com você! Juntos somos mais fortes. 💪`
  }

  function handleGerarTemplate() {
    if (!form.evento_id) return
    const evento = eventos.find(e => e.id === form.evento_id)
    if (!evento) return
    const template = form.audiencia === 'lideres' ? gerarTemplateLider(evento) : gerarTemplateApoiador(evento)
    setForm(p => ({
      ...p,
      mensagem: template,
      assunto: `${evento.titulo} — ${new Date(evento.data + 'T12:00:00').toLocaleDateString('pt-BR')}`,
    }))
  }

  async function debitarCredito(canal: string, quantidade: number) {
    const c = creditos[canal]
    if (!c) return
    await supabase.from('creditos_mensagens')
      .update({ usado: c.usado + quantidade, atualizado_em: new Date().toISOString() })
      .eq('id', c.id)
    setCreditos(prev => ({
      ...prev,
      [canal]: { ...c, usado: c.usado + quantidade },
    }))
  }

  async function handleEnviar() {
    if (!form.mensagem) { setErro('Digite a mensagem'); return }
    if (form.canal === 'email' && !form.assunto) { setErro('Informe o assunto'); return }
    if (previewCount === 0) { setErro('Nenhum destinatário encontrado'); return }

    const cred = creditos[form.canal]
    if (cred && cred.usado >= cred.total) {
      setErro(`Créditos de ${canalInfo[form.canal].label} esgotados. Adquira mais créditos para continuar.`)
      return
    }

    if (!confirm(`Confirma o envio para ${previewCount} destinatário${previewCount !== 1 ? 's' : ''}?`)) return

    setEnviando(true); setErro(''); setSucesso('')
    setProgresso('Buscando destinatários...')

    const [apoiadores, lideresDest] = await Promise.all([
      form.audiencia === 'apoiadores' || form.audiencia === 'ambos' ? buscarDestinatariosApoiadores() : Promise.resolve([]),
      form.audiencia === 'lideres' || form.audiencia === 'ambos' ? buscarDestinatariosLideres() : Promise.resolve([]),
    ])

    const { data: disparo } = await supabase.from('disparos').insert({
      canal: form.canal, assunto: form.assunto, mensagem: form.mensagem,
      total_destinatarios: apoiadores.length + lideresDest.length,
      status: 'enviando',
      filtro_lider_id: form.filtro_lider_id || null,
      audiencia: form.audiencia,
    }).select().single()

    try {
      let enviados = 0; let erros = 0

      if (form.canal === 'email') {
        const todos = [
          ...apoiadores.map(d => ({ email: d.email, nome: d.nome })),
          ...lideresDest.map(d => ({ email: (d as Lider).email, nome: d.nome })),
        ].filter(d => d.email)

        setProgresso(`Enviando e-mails para ${todos.length} pessoas...`)
        const res = await fetch('/api/comunicacao/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            destinatarios: todos,
            assunto: form.assunto, mensagem: form.mensagem,
            remetente_nome: form.remetente_nome,
          }),
        })
        const resultado = await res.json()
        enviados = resultado.enviados || 0; erros = resultado.erros || 0
        setSucesso(`✓ ${enviados} e-mails enviados!${erros > 0 ? ` (${erros} erros)` : ''}`)

      } else if (form.canal === 'sms') {
        const todos = [
          ...apoiadores.map(d => ({ telefone: d.telefone, nome: d.nome })),
          ...lideresDest.map(d => ({ telefone: (d as Lider).telefone, nome: d.nome })),
        ].filter(d => d.telefone)

        setProgresso(`Enviando SMS para ${todos.length} pessoas...`)
        const res = await fetch('/api/comunicacao/sms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ destinatarios: todos, mensagem: form.mensagem }),
        })
        const resultado = await res.json()
        enviados = resultado.enviados || 0; erros = resultado.erros || 0
        setSucesso(`✓ ${enviados} SMS enviados!${erros > 0 ? ` (${erros} erros)` : ''}`)

      } else {
        setSucesso('Disparo registrado! WhatsApp em breve.')
      }

      if (disparo) {
        await supabase.from('disparos').update({
          total_enviados: enviados, total_erros: erros, status: 'concluido',
        }).eq('id', disparo.id)
      }

      if (enviados > 0) await debitarCredito(form.canal, enviados)

      setModalAberto(false)
      setForm({ canal: 'email', assunto: '', mensagem: '', audiencia: 'apoiadores', filtro: 'todos', filtro_lider_id: '', evento_id: '', remetente_nome: '' })
      const { data } = await supabase.from('disparos').select('*').order('criado_em', { ascending: false })
      if (data) setDisparos(data)

    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erro desconhecido'
      setErro('Erro: ' + msg)
      if (disparo) await supabase.from('disparos').update({ status: 'erro' }).eq('id', disparo.id)
    }
    setProgresso(''); setEnviando(false)
    setTimeout(() => setSucesso(''), 5000)
  }

  const inputStyle = { padding: '10px 14px', background: '#0B1F3A', border: '1px solid #1C3558', borderRadius: '8px', color: '#E8EDF5', fontSize: '14px', outline: 'none', fontFamily: 'Inter, sans-serif', width: '100%', boxSizing: 'border-box' as const }
  const labelStyle = { fontSize: '11px', fontWeight: 600 as const, letterSpacing: '1px', textTransform: 'uppercase' as const, color: '#8FA4C0', marginBottom: '6px', display: 'block' as const }

  function CreditBar({ canal }: { canal: string }) {
    const c = creditos[canal]
    if (!c || c.total === 0) return null
    const pct = Math.min(c.usado / c.total, 1)
    const alerta = pct >= 0.75
    const esgotado = c.usado >= c.total
    const cor = esgotado ? '#e74c3c' : alerta ? '#C9A84C' : '#22c55e'
    return (
      <div style={{ marginTop: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#8FA4C0', marginBottom: '4px' }}>
          <span>{c.usado.toLocaleString('pt-BR')} usados</span>
          <span style={{ color: cor, fontWeight: 600 }}>{c.total.toLocaleString('pt-BR')} total</span>
        </div>
        <div style={{ height: '4px', background: '#1C3558', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct * 100}%`, background: cor, borderRadius: '4px', transition: 'width 0.3s' }} />
        </div>
        {(alerta || esgotado) && (
          <div style={{ fontSize: '11px', color: cor, marginTop: '4px', fontWeight: 600 }}>
            {esgotado ? '⚠ Créditos esgotados — adquira mais para continuar' : `⚡ ${Math.round((1 - pct) * c.total)} créditos restantes — considere adquirir mais`}
          </div>
        )}
      </div>
    )
  }

  // Alerta 75% para canal atual do form
  const creditoAtual = creditos[form.canal]
  const pctAtual = creditoAtual && creditoAtual.total > 0 ? creditoAtual.usado / creditoAtual.total : 0
  const alertaCredito = pctAtual >= 0.75
  const creditoEsgotado = creditoAtual && creditoAtual.usado >= creditoAtual.total

  return (
    <div style={{ minHeight: '100vh', background: '#0B1F3A', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 80px, rgba(201,168,76,0.02) 80px, rgba(201,168,76,0.02) 81px), repeating-linear-gradient(90deg, transparent, transparent 80px, rgba(201,168,76,0.02) 80px, rgba(201,168,76,0.02) 81px)` }} />

      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, height: '60px', background: 'rgba(11,31,58,0.97)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(201,168,76,0.15)', display: 'flex', alignItems: 'center', padding: '0 28px', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={() => router.push('/dashboard')} style={{ background: 'transparent', border: 'none', color: '#8FA4C0', cursor: 'pointer', fontSize: '13px', fontFamily: 'Inter, sans-serif' }}>← Voltar</button>
          <div style={{ width: '1px', height: '20px', background: '#1C3558' }} />
          <span style={{ fontSize: '17px', fontWeight: 700, color: '#FFFFFF', letterSpacing: '-0.3px' }}>Cand<span style={{ color: '#C9A84C' }}>Maps</span></span>
        </div>
        {!acessoNegado && (
          <button onClick={() => { setModalAberto(true); setErro('') }} style={{ background: 'linear-gradient(135deg, #E8C87A, #A07830)', border: 'none', borderRadius: '8px', color: '#0B1F3A', fontSize: '13px', fontWeight: 600, padding: '9px 18px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
            + Novo Disparo
          </button>
        )}
      </nav>

      <main style={{ paddingTop: '76px', padding: '76px 28px 40px', position: 'relative', zIndex: 1, maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ marginBottom: '28px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', color: '#C9A84C', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ width: '20px', height: '1px', background: '#A07830', display: 'inline-block' }} />
            Campanha
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#FFFFFF', letterSpacing: '-0.5px', marginBottom: '4px' }}>Comunicação</h1>
          <p style={{ fontSize: '14px', color: '#8FA4C0' }}>Envie mensagens segmentadas para sua base eleitoral</p>
        </div>

        {/* ACESSO NEGADO */}
        {acessoNegado && (
          <div style={{ background: '#0F2040', border: '1px solid rgba(192,57,43,0.3)', borderRadius: '12px', padding: '60px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
            <div style={{ fontSize: '18px', fontWeight: 600, color: '#E8EDF5', marginBottom: '8px' }}>Acesso restrito</div>
            <div style={{ fontSize: '14px', color: '#8FA4C0' }}>
              Apenas <strong style={{ color: '#C9A84C' }}>Coordenadores de Campanha</strong> e membros de <strong style={{ color: '#6ba3d6' }}>Marketing</strong> podem acessar o módulo de comunicação.
            </div>
          </div>
        )}

        {!acessoNegado && !loading && (
          <>
            {/* CANAIS + CRÉDITOS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '14px', marginBottom: '24px' }}>
              {Object.entries(canalInfo).map(([key, info]) => {
                const c = creditos[key]
                return (
                  <div key={key} style={{ background: '#0F2040', border: `1px solid ${info.status === 'ativo' ? 'rgba(201,168,76,0.2)' : '#1C3558'}`, borderRadius: '10px', padding: '20px', opacity: info.status === 'ativo' ? 1 : 0.6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ fontSize: '28px' }}>{info.icone}</div>
                      <span style={{ fontSize: '10px', fontWeight: 600, padding: '2px 8px', borderRadius: '100px', background: info.status === 'ativo' ? 'rgba(34,197,94,0.1)' : 'rgba(201,168,76,0.1)', border: `1px solid ${info.status === 'ativo' ? 'rgba(34,197,94,0.2)' : 'rgba(201,168,76,0.2)'}`, color: info.status === 'ativo' ? '#22c55e' : '#C9A84C' }}>
                        {info.status === 'ativo' ? 'Ativo' : 'Em breve'}
                      </span>
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: 600, color: '#E8EDF5', marginTop: '12px' }}>{info.label}</div>
                    {c ? <CreditBar canal={key} /> : (
                      <div style={{ fontSize: '12px', color: '#8FA4C0', marginTop: '4px' }}>
                        {key === 'email' ? 'Via Resend' : key === 'sms' ? 'Via Twilio' : 'Via Z-API'}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {sucesso && <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '8px', padding: '12px 16px', fontSize: '13px', color: '#22c55e', marginBottom: '16px' }}>{sucesso}</div>}

            <div style={{ fontSize: '13px', fontWeight: 600, color: '#8FA4C0', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '14px' }}>Histórico de disparos</div>

            {loading ? (
              <div style={{ color: '#C9A84C', fontSize: '14px' }}>Carregando...</div>
            ) : disparos.length === 0 ? (
              <div style={{ background: '#0F2040', border: '1px solid #1C3558', borderRadius: '12px', padding: '60px', textAlign: 'center' as const }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>💬</div>
                <div style={{ fontSize: '18px', fontWeight: 600, color: '#E8EDF5', marginBottom: '8px' }}>Nenhum disparo realizado</div>
                <div style={{ fontSize: '14px', color: '#8FA4C0', marginBottom: '24px' }}>Envie sua primeira mensagem para a base eleitoral</div>
                <button onClick={() => setModalAberto(true)} style={{ background: 'linear-gradient(135deg, #E8C87A, #A07830)', border: 'none', borderRadius: '8px', color: '#0B1F3A', fontSize: '14px', fontWeight: 600, padding: '12px 28px', cursor: 'pointer' }}>+ Criar primeiro disparo</button>
              </div>
            ) : (
              <div style={{ background: '#0F2040', border: '1px solid #1C3558', borderRadius: '12px', overflow: 'hidden' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr 120px', padding: '12px 20px', borderBottom: '1px solid #1C3558', fontSize: '11px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' as const, color: '#8FA4C0' }}>
                  <span>Mensagem</span><span>Canal</span><span>Audiência</span><span>Enviados</span><span>Erros</span><span>Status</span><span>Data</span>
                </div>
                {disparos.map((d, i) => {
                  const canal = canalInfo[d.canal]
                  const status = statusInfo[d.status]
                  return (
                    <div key={d.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr 120px', padding: '14px 20px', borderBottom: i < disparos.length - 1 ? '1px solid rgba(28,53,88,0.5)' : 'none', alignItems: 'center' }}
                      onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = 'rgba(201,168,76,0.02)'}
                      onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 500, color: '#E8EDF5', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '280px' }}>
                          {d.assunto || d.mensagem.slice(0, 50) + '...'}
                        </div>
                        <div style={{ fontSize: '11px', color: '#8FA4C0', marginTop: '2px' }}>{d.total_destinatarios} destinatários</div>
                      </div>
                      <div style={{ fontSize: '13px', color: canal?.cor }}>{canal?.icone} {canal?.label}</div>
                      <div style={{ fontSize: '12px', color: '#8FA4C0', textTransform: 'capitalize' }}>{d.audiencia || 'apoiadores'}</div>
                      <div style={{ fontSize: '13px', color: '#22c55e', fontWeight: 500 }}>{d.total_enviados}</div>
                      <div style={{ fontSize: '13px', color: d.total_erros > 0 ? '#e74c3c' : '#8FA4C0' }}>{d.total_erros}</div>
                      <div>
                        <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '100px', background: `rgba(${status?.cor === '#22c55e' ? '34,197,94' : status?.cor === '#e74c3c' ? '192,57,43' : '201,168,76'},0.1)`, color: status?.cor }}>
                          {status?.label}
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#8FA4C0' }}>{new Date(d.criado_em).toLocaleDateString('pt-BR')}</div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </main>

      {modalAberto && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', overflowY: 'auto' }}>
          <div style={{ background: '#0F2040', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '600px', position: 'relative', margin: 'auto' }}>
            <div style={{ position: 'absolute', top: 0, left: '10%', right: '10%', height: '1px', background: 'linear-gradient(90deg, transparent, #C9A84C, transparent)' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#FFFFFF' }}>Novo Disparo</h2>
              <button onClick={() => setModalAberto(false)} style={{ background: 'transparent', border: 'none', color: '#8FA4C0', cursor: 'pointer', fontSize: '20px' }}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

              {/* CANAL */}
              <div>
                <label style={labelStyle}>Canal *</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {Object.entries(canalInfo).map(([key, info]) => (
                    <button key={key} onClick={() => setForm(p => ({ ...p, canal: key }))}
                      disabled={info.status !== 'ativo'}
                      style={{ flex: 1, padding: '10px', borderRadius: '8px', border: `1px solid ${form.canal === key ? 'rgba(201,168,76,0.5)' : '#1C3558'}`, background: form.canal === key ? 'rgba(201,168,76,0.1)' : 'transparent', color: info.status !== 'ativo' ? '#3D5470' : form.canal === key ? '#C9A84C' : '#8FA4C0', fontSize: '13px', cursor: info.status === 'ativo' ? 'pointer' : 'not-allowed', fontFamily: 'Inter, sans-serif', fontWeight: form.canal === key ? 600 : 400 }}>
                      {info.icone} {info.label}
                      {info.status !== 'ativo' && <div style={{ fontSize: '10px', color: '#3D5470' }}>em breve</div>}
                    </button>
                  ))}
                </div>
              </div>

              {/* ALERTA CRÉDITO */}
              {alertaCredito && (
                <div style={{ background: creditoEsgotado ? 'rgba(192,57,43,0.1)' : 'rgba(201,168,76,0.1)', border: `1px solid ${creditoEsgotado ? 'rgba(192,57,43,0.3)' : 'rgba(201,168,76,0.3)'}`, borderRadius: '8px', padding: '12px 14px', fontSize: '13px', color: creditoEsgotado ? '#e74c3c' : '#C9A84C', fontWeight: 500 }}>
                  {creditoEsgotado
                    ? `⛔ Créditos de ${canalInfo[form.canal].label} esgotados. Adquira mais para continuar enviando mensagens.`
                    : `⚡ Você usou ${Math.round(pctAtual * 100)}% dos seus créditos de ${canalInfo[form.canal].label}. Considere adquirir mais em breve.`}
                </div>
              )}

              {/* AUDIÊNCIA */}
              <div>
                <label style={labelStyle}>Enviar para</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {[['apoiadores', '👥 Apoiadores'], ['lideres', '⭐ Líderes'], ['ambos', '🌐 Todos']].map(([key, label]) => (
                    <button key={key} onClick={() => setForm(p => ({ ...p, audiencia: key, filtro: 'todos', filtro_lider_id: '' }))}
                      style={{ padding: '8px 14px', borderRadius: '100px', border: `1px solid ${form.audiencia === key ? 'rgba(201,168,76,0.5)' : '#1C3558'}`, background: form.audiencia === key ? 'rgba(201,168,76,0.1)' : 'transparent', color: form.audiencia === key ? '#C9A84C' : '#8FA4C0', fontSize: '13px', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontWeight: form.audiencia === key ? 600 : 400 }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* FILTRO POR LÍDER (só para apoiadores) */}
              {form.audiencia === 'apoiadores' && (
                <div>
                  <label style={labelStyle}>Filtrar apoiadores</label>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    {[['todos', 'Todos'], ['lider', 'Por líder']].map(([key, label]) => (
                      <button key={key} onClick={() => setForm(p => ({ ...p, filtro: key, filtro_lider_id: '' }))}
                        style={{ padding: '7px 14px', borderRadius: '100px', border: `1px solid ${form.filtro === key ? 'rgba(201,168,76,0.5)' : '#1C3558'}`, background: form.filtro === key ? 'rgba(201,168,76,0.1)' : 'transparent', color: form.filtro === key ? '#C9A84C' : '#8FA4C0', fontSize: '13px', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontWeight: form.filtro === key ? 600 : 400 }}>
                        {label}
                      </button>
                    ))}
                  </div>
                  {form.filtro === 'lider' && (
                    <select value={form.filtro_lider_id} onChange={e => setForm(p => ({ ...p, filtro_lider_id: e.target.value }))} style={{ ...inputStyle, cursor: 'pointer' }} onFocus={e => e.target.style.borderColor = '#C9A84C'} onBlur={e => e.target.style.borderColor = '#1C3558'}>
                      <option value="">Selecione o líder...</option>
                      {lideres.map(l => <option key={l.id} value={l.id}>{l.nome} — {l.cidade}</option>)}
                    </select>
                  )}
                </div>
              )}

              {/* CONTADOR DE DESTINATÁRIOS */}
              <div style={{ background: 'rgba(201,168,76,0.05)', border: '1px solid rgba(201,168,76,0.15)', borderRadius: '8px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ fontSize: '22px', fontWeight: 700, color: '#C9A84C' }}>{previewCount}</div>
                <div style={{ fontSize: '13px', color: '#8FA4C0' }}>destinatário{previewCount !== 1 ? 's' : ''} com contato cadastrado</div>
              </div>

              {/* EVENTO (template automático) */}
              <div>
                <label style={labelStyle}>Vincular a um evento (opcional)</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <select value={form.evento_id} onChange={e => setForm(p => ({ ...p, evento_id: e.target.value }))} style={{ ...inputStyle, cursor: 'pointer', flex: 1 }} onFocus={e => e.target.style.borderColor = '#C9A84C'} onBlur={e => e.target.style.borderColor = '#1C3558'}>
                    <option value="">Selecione um evento para gerar template...</option>
                    {eventos.map(e => (
                      <option key={e.id} value={e.id}>
                        {new Date(e.data + 'T12:00:00').toLocaleDateString('pt-BR')} — {e.titulo} ({e.local_cidade})
                      </option>
                    ))}
                  </select>
                  {form.evento_id && (
                    <button onClick={handleGerarTemplate} style={{ padding: '10px 14px', background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '8px', color: '#C9A84C', fontSize: '13px', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontWeight: 600, whiteSpace: 'nowrap' }}>
                      ✨ Gerar
                    </button>
                  )}
                </div>
                {form.evento_id && (
                  <div style={{ fontSize: '11px', color: '#8FA4C0', marginTop: '4px' }}>
                    Template gerado automaticamente para <strong style={{ color: form.audiencia === 'lideres' ? '#5eead4' : '#C9A84C' }}>{form.audiencia === 'lideres' ? 'líderes (mobilização)' : form.audiencia === 'ambos' ? 'apoiadores (convite amistoso)' : 'apoiadores (convite amistoso)'}</strong>. Você pode editar antes de enviar.
                  </div>
                )}
              </div>

              {/* REMETENTE */}
              <div>
                <label style={labelStyle}>Nome do remetente</label>
                <input value={form.remetente_nome} onChange={e => setForm(p => ({ ...p, remetente_nome: e.target.value }))} placeholder="Ex: Campanha João Silva" style={inputStyle} onFocus={e => e.target.style.borderColor = '#C9A84C'} onBlur={e => e.target.style.borderColor = '#1C3558'} />
              </div>

              {/* ASSUNTO (email only) */}
              {form.canal === 'email' && (
                <div>
                  <label style={labelStyle}>Assunto *</label>
                  <input value={form.assunto} onChange={e => setForm(p => ({ ...p, assunto: e.target.value }))} placeholder="Assunto do e-mail" style={inputStyle} onFocus={e => e.target.style.borderColor = '#C9A84C'} onBlur={e => e.target.style.borderColor = '#1C3558'} />
                </div>
              )}

              {/* MENSAGEM */}
              <div>
                <label style={labelStyle}>Mensagem *</label>
                <textarea value={form.mensagem} onChange={e => setForm(p => ({ ...p, mensagem: e.target.value }))} placeholder="Digite sua mensagem ou gere um template pelo evento acima..." rows={6} style={{ ...inputStyle, resize: 'vertical' as const }} onFocus={e => e.target.style.borderColor = '#C9A84C'} onBlur={e => e.target.style.borderColor = '#1C3558'} />
                <div style={{ fontSize: '11px', color: '#3D5470', marginTop: '4px' }}>
                  {form.mensagem.length} caracteres
                  {form.canal === 'sms' && form.mensagem.length > 160 && <span style={{ color: '#e74c3c' }}> · SMS será dividido em {Math.ceil(form.mensagem.length / 160)} partes</span>}
                </div>
              </div>

              {erro && <div style={{ background: 'rgba(192,57,43,0.1)', border: '1px solid rgba(192,57,43,0.3)', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#e74c3c' }}>{erro}</div>}

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button onClick={() => setModalAberto(false)} style={{ background: 'transparent', border: '1px solid #1C3558', borderRadius: '8px', color: '#8FA4C0', fontSize: '13px', padding: '10px 20px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>Cancelar</button>
                <button onClick={handleEnviar} disabled={enviando || previewCount === 0 || !!creditoEsgotado}
                  style={{ background: enviando || previewCount === 0 || creditoEsgotado ? 'rgba(201,168,76,0.3)' : 'linear-gradient(135deg, #E8C87A, #A07830)', border: 'none', borderRadius: '8px', color: '#0B1F3A', fontSize: '13px', fontWeight: 600, padding: '10px 24px', cursor: enviando || previewCount === 0 || creditoEsgotado ? 'not-allowed' : 'pointer', fontFamily: 'Inter, sans-serif' }}>
                  {enviando ? progresso || 'Enviando...' : creditoEsgotado ? 'Créditos esgotados' : `Enviar para ${previewCount} →`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
