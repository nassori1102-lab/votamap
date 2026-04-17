'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type Candidato = {
  id: string
  nome: string
  cargo: string
  criado_em: string
}

type Licenca = {
  id: string
  candidato_id: string
  plano: string
  status: string
  valor_mensal: number
  data_inicio: string
  data_vencimento: string
  criado_em: string
  candidatos?: { nome: string; cargo: string }
}

type Stats = {
  totalCandidatos: number
  totalAtivos: number
  totalSuspensos: number
  receitaMensal: number
}

export default function AdminPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [autorizado, setAutorizado] = useState(false)
  const [aba, setAba] = useState<'dashboard' | 'licencas' | 'candidatos' | 'nova_licenca'>('dashboard')
  const [licencas, setLicencas] = useState<Licenca[]>([])
  const [candidatos, setCandidatos] = useState<Candidato[]>([])
  const [stats, setStats] = useState<Stats>({ totalCandidatos: 0, totalAtivos: 0, totalSuspensos: 0, receitaMensal: 0 })
  const [salvando, setSalvando] = useState(false)
  const [sucesso, setSucesso] = useState('')
  const [erro, setErro] = useState('')

  const [formLicenca, setFormLicenca] = useState({
    nome_candidato: '', email: '', cargo: 'Deputado Federal', senha: '',
    plano: 'basico', valor_mensal: '', data_vencimento: '', forma_pagamento: 'pix', observacoes: ''
  })

  const planos: Record<string, { label: string; cor: string; valor: number }> = {
    trial: { label: 'Trial', cor: '#8FA4C0', valor: 0 },
    basico: { label: 'Básico', cor: '#6ba3d6', valor: 497 },
    profissional: { label: 'Profissional', cor: '#C9A84C', valor: 997 },
    premium: { label: 'Premium', cor: '#22c55e', valor: 1997 },
  }

  const status: Record<string, { label: string; cor: string; bg: string }> = {
    ativa: { label: 'Ativa', cor: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
    trial: { label: 'Trial', cor: '#C9A84C', bg: 'rgba(201,168,76,0.1)' },
    suspensa: { label: 'Suspensa', cor: '#e74c3c', bg: 'rgba(192,57,43,0.1)' },
    cancelada: { label: 'Cancelada', cor: '#8FA4C0', bg: 'rgba(143,164,192,0.1)' },
  }

  useEffect(() => {
    async function verificar() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: admin } = await supabase.from('admins').select('*').eq('user_id', user.id).eq('ativo', true).single()
      if (!admin) { router.push('/dashboard'); return }
      setAutorizado(true)
      await carregar()
    }
    verificar()
  }, [])

  async function carregar() {
    const [{ data: lics }, { data: cands }] = await Promise.all([
      supabase.from('licencas').select('*, candidatos(nome, cargo)').order('criado_em', { ascending: false }),
      supabase.from('candidatos').select('*').order('nome'),
    ])
    if (lics) {
      setLicencas(lics)
      setStats({
        totalCandidatos: lics.length,
        totalAtivos: lics.filter(l => l.status === 'ativa').length,
        totalSuspensos: lics.filter(l => l.status === 'suspensa').length,
        receitaMensal: lics.filter(l => l.status === 'ativa').reduce((s, l) => s + Number(l.valor_mensal || 0), 0),
      })
    }
    if (cands) setCandidatos(cands)
    setLoading(false)
  }

  async function criarLicenca() {
    if (!formLicenca.nome_candidato || !formLicenca.email || !formLicenca.senha) {
      setErro('Preencha nome, email e senha'); return
    }
    setSalvando(true); setErro('')

    // 1. Criar usuário no Auth
    const { data: authData, error: authError } = await supabase.auth.admin?.createUser({
      email: formLicenca.email,
      password: formLicenca.senha,
      email_confirm: true,
    }) as any

    if (authError) { setErro('Erro ao criar usuário: ' + authError.message); setSalvando(false); return }

    // 2. Criar candidato
    const { data: candidato, error: candError } = await supabase.from('candidatos').insert({
      nome: formLicenca.nome_candidato,
      cargo: formLicenca.cargo,
    }).select().single()

    if (candError || !candidato) { setErro('Erro ao criar candidato: ' + candError?.message); setSalvando(false); return }

    // 3. Criar usuário na tabela usuarios
    await supabase.from('usuarios').insert({
      id: authData?.user?.id,
      nome: formLicenca.nome_candidato,
      email: formLicenca.email,
      perfil: 'admin',
      ativo: true,
      candidato_id: candidato.id,
    })

    // 4. Criar licença
    await supabase.from('licencas').insert({
      candidato_id: candidato.id,
      plano: formLicenca.plano,
      status: 'ativa',
      valor_mensal: parseFloat(formLicenca.valor_mensal) || planos[formLicenca.plano].valor,
      data_vencimento: formLicenca.data_vencimento || null,
      forma_pagamento: formLicenca.forma_pagamento,
      observacoes: formLicenca.observacoes,
    })

    await carregar()
    setAba('licencas')
    setSucesso(`Licença criada! Login: ${formLicenca.email} / Senha: ${formLicenca.senha}`)
    setSalvando(false)
    setFormLicenca({ nome_candidato: '', email: '', cargo: 'Deputado Federal', senha: '', plano: 'basico', valor_mensal: '', data_vencimento: '', forma_pagamento: 'pix', observacoes: '' })
    setTimeout(() => setSucesso(''), 10000)
  }

  async function alterarStatus(id: string, novoStatus: string) {
    await supabase.from('licencas').update({ status: novoStatus }).eq('id', id)
    await carregar()
  }

  const inputStyle = { padding: '10px 14px', background: '#111', border: '1px solid #222', borderRadius: '8px', color: '#E8EDF5', fontSize: '14px', outline: 'none', fontFamily: "'IBM Plex Sans', sans-serif", width: '100%', boxSizing: 'border-box' as const }
  const labelStyle = { fontSize: '11px', fontWeight: 600 as const, letterSpacing: '1px', textTransform: 'uppercase' as const, color: '#666', marginBottom: '6px', display: 'block' as const }

  if (loading) return <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#C9A84C' }}>Verificando acesso...</div>
  if (!autorizado) return null

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', fontFamily: "'IBM Plex Sans', sans-serif", color: '#E8EDF5' }}>
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600&display=swap" rel="stylesheet" />

      {/* NAV */}
      <nav style={{ background: '#111', borderBottom: '1px solid #222', padding: '0 32px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '32px', height: '32px', background: 'linear-gradient(135deg, #E8C87A, #A07830)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700, color: '#0a0a0a' }}>C</div>
          <span style={{ fontSize: '16px', fontWeight: 700 }}>CandMaps <span style={{ color: '#C9A84C' }}>Admin</span></span>
        </div>
        <button onClick={() => supabase.auth.signOut().then(() => router.push('/login'))}
          style={{ background: 'transparent', border: '1px solid #333', borderRadius: '8px', color: '#666', fontSize: '13px', padding: '6px 14px', cursor: 'pointer' }}>
          Sair
        </button>
      </nav>

      <div style={{ paddingTop: '60px', display: 'flex' }}>
        {/* SIDEBAR */}
        <aside style={{ width: '220px', background: '#111', borderRight: '1px solid #222', minHeight: 'calc(100vh - 60px)', padding: '24px 16px', position: 'fixed', top: '60px', left: 0 }}>
          {[
            ['dashboard', '📊 Dashboard'],
            ['licencas', '🔑 Licenças'],
            ['candidatos', '👤 Candidatos'],
            ['nova_licenca', '+ Nova Licença'],
          ].map(([key, label]) => (
            <button key={key} onClick={() => setAba(key as any)}
              style={{ width: '100%', textAlign: 'left', padding: '10px 14px', borderRadius: '8px', border: 'none', background: aba === key ? 'rgba(201,168,76,0.1)' : 'transparent', color: aba === key ? '#C9A84C' : '#666', fontSize: '14px', cursor: 'pointer', marginBottom: '4px', fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: aba === key ? 600 : 400 }}>
              {label}
            </button>
          ))}
        </aside>

        {/* CONTEÚDO */}
        <main style={{ marginLeft: '220px', flex: 1, padding: '32px' }}>

          {sucesso && <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '8px', padding: '14px 18px', fontSize: '13px', color: '#22c55e', marginBottom: '20px' }}>✓ {sucesso}</div>}
          {erro && <div style={{ background: 'rgba(192,57,43,0.1)', border: '1px solid rgba(192,57,43,0.3)', borderRadius: '8px', padding: '14px 18px', fontSize: '13px', color: '#e74c3c', marginBottom: '20px' }}>{erro}</div>}

          {/* DASHBOARD */}
          {aba === 'dashboard' && (
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '24px' }}>Dashboard</h1>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
                {[
                  { label: 'Total de licenças', valor: stats.totalCandidatos, cor: '#E8EDF5' },
                  { label: 'Licenças ativas', valor: stats.totalAtivos, cor: '#22c55e' },
                  { label: 'Suspensas', valor: stats.totalSuspensos, cor: '#e74c3c' },
                  { label: 'Receita mensal', valor: `R$ ${stats.receitaMensal.toLocaleString('pt-BR')}`, cor: '#C9A84C' },
                ].map((s, i) => (
                  <div key={i} style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '20px' }}>
                    <div style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>{s.label}</div>
                    <div style={{ fontSize: '28px', fontWeight: 700, color: s.cor }}>{s.valor}</div>
                  </div>
                ))}
              </div>

              <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: '#888' }}>Licenças recentes</h2>
              <div style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', overflow: 'hidden' }}>
                {licencas.slice(0, 5).map((l, i) => (
                  <div key={l.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', padding: '14px 20px', borderBottom: i < 4 ? '1px solid #222' : 'none', alignItems: 'center' }}>
                    <div style={{ fontSize: '14px', fontWeight: 500 }}>{l.candidatos?.nome || '—'}</div>
                    <div style={{ fontSize: '12px', color: planos[l.plano]?.cor }}>{planos[l.plano]?.label}</div>
                    <div style={{ fontSize: '12px', padding: '3px 10px', borderRadius: '20px', background: status[l.status]?.bg, color: status[l.status]?.cor, display: 'inline-block' }}>{status[l.status]?.label}</div>
                    <div style={{ fontSize: '12px', color: '#C9A84C', fontWeight: 600 }}>R$ {Number(l.valor_mensal).toLocaleString('pt-BR')}/mês</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* LICENÇAS */}
          {aba === 'licencas' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h1 style={{ fontSize: '24px', fontWeight: 700 }}>Licenças</h1>
                <button onClick={() => setAba('nova_licenca')} style={{ background: 'linear-gradient(135deg, #E8C87A, #A07830)', border: 'none', borderRadius: '8px', color: '#0a0a0a', fontSize: '13px', fontWeight: 600, padding: '10px 20px', cursor: 'pointer' }}>+ Nova Licença</button>
              </div>
              <div style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', overflow: 'hidden' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 120px', padding: '12px 20px', borderBottom: '1px solid #222', fontSize: '11px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', color: '#666' }}>
                  <span>Candidato</span><span>Plano</span><span>Status</span><span>Valor</span><span>Vencimento</span><span>Ações</span>
                </div>
                {licencas.length === 0 ? (
                  <div style={{ padding: '60px', textAlign: 'center', color: '#666' }}>Nenhuma licença cadastrada</div>
                ) : licencas.map((l, i) => (
                  <div key={l.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 120px', padding: '14px 20px', borderBottom: i < licencas.length - 1 ? '1px solid #1a1a1a' : 'none', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 500 }}>{l.candidatos?.nome || '—'}</div>
                      <div style={{ fontSize: '11px', color: '#666' }}>{l.candidatos?.cargo}</div>
                    </div>
                    <div style={{ fontSize: '12px', color: planos[l.plano]?.cor, fontWeight: 600 }}>{planos[l.plano]?.label}</div>
                    <div style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '20px', background: status[l.status]?.bg, color: status[l.status]?.cor, display: 'inline-block', width: 'fit-content' }}>{status[l.status]?.label}</div>
                    <div style={{ fontSize: '13px', color: '#C9A84C', fontWeight: 600 }}>R$ {Number(l.valor_mensal).toLocaleString('pt-BR')}</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>{l.data_vencimento ? new Date(l.data_vencimento).toLocaleDateString('pt-BR') : '—'}</div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {l.status === 'ativa' && (
                        <button onClick={() => alterarStatus(l.id, 'suspensa')} style={{ background: 'rgba(192,57,43,0.1)', border: '1px solid rgba(192,57,43,0.2)', borderRadius: '6px', color: '#e74c3c', fontSize: '11px', padding: '4px 8px', cursor: 'pointer' }}>Suspender</button>
                      )}
                      {l.status === 'suspensa' && (
                        <button onClick={() => alterarStatus(l.id, 'ativa')} style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '6px', color: '#22c55e', fontSize: '11px', padding: '4px 8px', cursor: 'pointer' }}>Ativar</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CANDIDATOS */}
          {aba === 'candidatos' && (
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '24px' }}>Candidatos</h1>
              <div style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', overflow: 'hidden' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', padding: '12px 20px', borderBottom: '1px solid #222', fontSize: '11px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', color: '#666' }}>
                  <span>Nome</span><span>Cargo</span><span>Cadastrado em</span>
                </div>
                {candidatos.length === 0 ? (
                  <div style={{ padding: '60px', textAlign: 'center', color: '#666' }}>Nenhum candidato cadastrado</div>
                ) : candidatos.map((c, i) => (
                  <div key={c.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', padding: '14px 20px', borderBottom: i < candidatos.length - 1 ? '1px solid #1a1a1a' : 'none', alignItems: 'center' }}>
                    <div style={{ fontSize: '14px', fontWeight: 500 }}>{c.nome}</div>
                    <div style={{ fontSize: '12px', color: '#8FA4C0' }}>{c.cargo}</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>{new Date(c.criado_em).toLocaleDateString('pt-BR')}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* NOVA LICENÇA */}
          {aba === 'nova_licenca' && (
            <div style={{ maxWidth: '600px' }}>
              <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '24px' }}>Nova Licença</h1>
              <div style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '28px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

                <div style={{ fontSize: '13px', fontWeight: 600, color: '#C9A84C', paddingBottom: '8px', borderBottom: '1px solid #222' }}>Dados do candidato</div>

                <div><label style={labelStyle}>Nome do candidato *</label>
                  <input value={formLicenca.nome_candidato} onChange={e => setFormLicenca(p => ({ ...p, nome_candidato: e.target.value }))} placeholder="Nome completo" style={inputStyle} onFocus={e => e.target.style.borderColor = '#C9A84C'} onBlur={e => e.target.style.borderColor = '#222'} /></div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div><label style={labelStyle}>Email *</label>
                    <input type="email" value={formLicenca.email} onChange={e => setFormLicenca(p => ({ ...p, email: e.target.value }))} placeholder="email@campanha.com" style={inputStyle} onFocus={e => e.target.style.borderColor = '#C9A84C'} onBlur={e => e.target.style.borderColor = '#222'} /></div>
                  <div><label style={labelStyle}>Senha *</label>
                    <input type="text" value={formLicenca.senha} onChange={e => setFormLicenca(p => ({ ...p, senha: e.target.value }))} placeholder="Senha inicial" style={inputStyle} onFocus={e => e.target.style.borderColor = '#C9A84C'} onBlur={e => e.target.style.borderColor = '#222'} /></div>
                </div>

                <div><label style={labelStyle}>Cargo</label>
                  <select value={formLicenca.cargo} onChange={e => setFormLicenca(p => ({ ...p, cargo: e.target.value }))} style={{ ...inputStyle, cursor: 'pointer' }}>
                    {['Deputado Federal', 'Deputado Estadual', 'Senador', 'Governador', 'Prefeito', 'Vereador'].map(c => <option key={c} value={c}>{c}</option>)}
                  </select></div>

                <div style={{ fontSize: '13px', fontWeight: 600, color: '#C9A84C', paddingBottom: '8px', borderBottom: '1px solid #222', marginTop: '8px' }}>Dados da licença</div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div><label style={labelStyle}>Plano</label>
                    <select value={formLicenca.plano} onChange={e => setFormLicenca(p => ({ ...p, plano: e.target.value, valor_mensal: String(planos[e.target.value].valor) }))} style={{ ...inputStyle, cursor: 'pointer' }}>
                      {Object.entries(planos).map(([k, v]) => <option key={k} value={k}>{v.label} — R$ {v.valor}/mês</option>)}
                    </select></div>
                  <div><label style={labelStyle}>Valor mensal (R$)</label>
                    <input type="number" value={formLicenca.valor_mensal} onChange={e => setFormLicenca(p => ({ ...p, valor_mensal: e.target.value }))} placeholder="497" style={inputStyle} onFocus={e => e.target.style.borderColor = '#C9A84C'} onBlur={e => e.target.style.borderColor = '#222'} /></div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div><label style={labelStyle}>Forma de pagamento</label>
                    <select value={formLicenca.forma_pagamento} onChange={e => setFormLicenca(p => ({ ...p, forma_pagamento: e.target.value }))} style={{ ...inputStyle, cursor: 'pointer' }}>
                      {['pix', 'cartao', 'boleto', 'transferencia'].map(f => <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>)}
                    </select></div>
                  <div><label style={labelStyle}>Data de vencimento</label>
                    <input type="date" value={formLicenca.data_vencimento} onChange={e => setFormLicenca(p => ({ ...p, data_vencimento: e.target.value }))} style={{ ...inputStyle, colorScheme: 'dark' }} onFocus={e => e.target.style.borderColor = '#C9A84C'} onBlur={e => e.target.style.borderColor = '#222'} /></div>
                </div>

                <div><label style={labelStyle}>Observações</label>
                  <textarea value={formLicenca.observacoes} onChange={e => setFormLicenca(p => ({ ...p, observacoes: e.target.value }))} rows={2} style={{ ...inputStyle, resize: 'vertical' }} onFocus={e => e.target.style.borderColor = '#C9A84C'} onBlur={e => e.target.style.borderColor = '#222'} /></div>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
                  <button onClick={() => setAba('licencas')} style={{ background: 'transparent', border: '1px solid #333', borderRadius: '8px', color: '#666', fontSize: '13px', padding: '10px 20px', cursor: 'pointer' }}>Cancelar</button>
                  <button onClick={criarLicenca} disabled={salvando} style={{ background: salvando ? 'rgba(201,168,76,0.4)' : 'linear-gradient(135deg, #E8C87A, #A07830)', border: 'none', borderRadius: '8px', color: '#0a0a0a', fontSize: '13px', fontWeight: 600, padding: '10px 24px', cursor: salvando ? 'not-allowed' : 'pointer' }}>
                    {salvando ? 'Criando...' : 'Criar licença →'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
