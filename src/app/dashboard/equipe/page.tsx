'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type MembroEquipe = {
  id: string
  email: string
  nome: string
  perfil: string
  cargo: string
  ativo: boolean
  criado_em: string
}

export default function EquipePage() {
  const [membros, setMembros] = useState<MembroEquipe[]>([])
  const [loading, setLoading] = useState(true)
  const [modalAberto, setModalAberto] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')
  const [form, setForm] = useState({
    nome: '', email: '', senha: '', perfil: 'lider_regional', cargo: '',
  })
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function carregar() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      await carregarMembros()
    }
    carregar()
  }, [])

  async function carregarMembros() {
    const { data } = await supabase
      .from('usuarios')
      .select('*')
      .order('criado_em', { ascending: false })
    if (data) setMembros(data)
    setLoading(false)
  }

  async function handleCriarUsuario() {
    if (!form.nome) { setErro('Informe o nome'); return }
    if (!form.email) { setErro('Informe o e-mail'); return }
    if (!form.senha || form.senha.length < 6) { setErro('Senha deve ter no mínimo 6 caracteres'); return }
    setSalvando(true); setErro('')

    const { data, error: authError } = await supabase.auth.admin.createUser({
      email: form.email,
      password: form.senha,
      email_confirm: true,
    })

    if (authError) {
      setErro('Erro ao criar usuário: ' + authError.message)
      setSalvando(false)
      return
    }

    if (data.user) {
      await supabase.from('usuarios').insert({
        id: data.user.id,
        nome: form.nome,
        email: form.email,
        perfil: form.perfil,
        cargo: form.cargo,
        ativo: true,
      })
    }

    await carregarMembros()
    setForm({ nome:'', email:'', senha:'', perfil:'lider_regional', cargo:'' })
    setModalAberto(false); setSalvando(false)
    setSucesso('Usuário criado com sucesso!')
    setTimeout(() => setSucesso(''), 3000)
  }

  const perfis: Record<string, { label: string; cor: string; desc: string }> = {
    admin:           { label:'Administrador',    cor:'#C9A84C', desc:'Acesso total ao sistema' },
    chefe_campanha:  { label:'Chefe de Campanha', cor:'#6ba3d6', desc:'Acesso total exceto licenças' },
    lider_regional:  { label:'Líder Regional',   cor:'#5eead4', desc:'Acesso aos próprios cadastros' },
    contador:        { label:'Contador',          cor:'#86efac', desc:'Acesso exclusivo ao financeiro' },
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
        <button onClick={() => { setModalAberto(true); setErro('') }}
          style={{ background:'linear-gradient(135deg, #E8C87A, #A07830)', border:'none', borderRadius:'8px', color:'#0B1F3A', fontSize:'13px', fontWeight:600, padding:'9px 18px', cursor:'pointer', fontFamily:'Inter, sans-serif' }}>
          + Novo Membro
        </button>
      </nav>

      <main style={{ paddingTop:'76px', padding:'76px 28px 40px', position:'relative', zIndex:1, maxWidth:'1000px', margin:'0 auto' }}>
        <div style={{ marginBottom:'28px' }}>
          <div style={{ fontSize:'11px', fontWeight:600, letterSpacing:'2px', textTransform:'uppercase', color:'#C9A84C', display:'flex', alignItems:'center', gap:'8px', marginBottom:'8px' }}>
            <span style={{ width:'20px', height:'1px', background:'#A07830', display:'inline-block' }} />
            Configurações
          </div>
          <h1 style={{ fontSize:'24px', fontWeight:700, color:'#FFFFFF', letterSpacing:'-0.5px', marginBottom:'4px' }}>Equipe da Campanha</h1>
          <p style={{ fontSize:'14px', color:'#8FA4C0' }}>Gerencie os acessos de cada membro da equipe</p>
        </div>

        {/* CARDS DE PERFIS */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:'12px', marginBottom:'28px' }}>
          {Object.entries(perfis).map(([key, info]) => (
            <div key={key} style={{ background:'#0F2040', border:'1px solid #1C3558', borderRadius:'10px', padding:'16px' }}>
              <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:info.cor, marginBottom:'10px' }} />
              <div style={{ fontSize:'13px', fontWeight:600, color:'#E8EDF5', marginBottom:'4px' }}>{info.label}</div>
              <div style={{ fontSize:'12px', color:'#8FA4C0' }}>{info.desc}</div>
            </div>
          ))}
        </div>

        {sucesso && <div style={{ background:'rgba(201,168,76,0.1)', border:'1px solid rgba(201,168,76,0.3)', borderRadius:'8px', padding:'12px 16px', fontSize:'13px', color:'#C9A84C', marginBottom:'16px' }}>✓ {sucesso}</div>}

        {/* LISTA DE MEMBROS */}
        {loading ? (
          <div style={{ color:'#C9A84C', fontSize:'14px' }}>Carregando equipe...</div>
        ) : membros.length === 0 ? (
          <div style={{ background:'#0F2040', border:'1px solid #1C3558', borderRadius:'12px', padding:'60px', textAlign:'center' as const }}>
            <div style={{ fontSize:'48px', marginBottom:'16px' }}>👥</div>
            <div style={{ fontSize:'18px', fontWeight:600, color:'#E8EDF5', marginBottom:'8px' }}>Nenhum membro cadastrado</div>
            <div style={{ fontSize:'14px', color:'#8FA4C0', marginBottom:'24px' }}>Adicione sua equipe para que cada um acesse o sistema com seu perfil</div>
            <button onClick={() => setModalAberto(true)} style={{ background:'linear-gradient(135deg, #E8C87A, #A07830)', border:'none', borderRadius:'8px', color:'#0B1F3A', fontSize:'14px', fontWeight:600, padding:'12px 28px', cursor:'pointer' }}>
              + Adicionar primeiro membro
            </button>
          </div>
        ) : (
          <div style={{ background:'#0F2040', border:'1px solid #1C3558', borderRadius:'12px', overflow:'hidden' }}>
            <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr 80px', padding:'12px 20px', borderBottom:'1px solid #1C3558', fontSize:'11px', fontWeight:600, letterSpacing:'1px', textTransform:'uppercase' as const, color:'#8FA4C0' }}>
              <span>Membro</span><span>Perfil</span><span>Cargo</span><span>Status</span><span>Desde</span>
            </div>
            {membros.map((m, i) => {
              const perfil = perfis[m.perfil]
              return (
                <div key={m.id} style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr 80px', padding:'14px 20px', borderBottom: i < membros.length-1 ? '1px solid rgba(28,53,88,0.5)' : 'none', alignItems:'center' }}
                  onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background='rgba(201,168,76,0.02)'}
                  onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background='transparent'}>
                  <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                    <div style={{ width:'36px', height:'36px', borderRadius:'50%', background:`rgba(201,168,76,0.12)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'13px', fontWeight:700, color:'#C9A84C', flexShrink:0 }}>
                      {m.nome?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div>
                      <div style={{ fontSize:'14px', fontWeight:500, color:'#E8EDF5' }}>{m.nome}</div>
                      <div style={{ fontSize:'12px', color:'#8FA4C0' }}>{m.email}</div>
                    </div>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                    <div style={{ width:'6px', height:'6px', borderRadius:'50%', background: perfil?.cor || '#8FA4C0', flexShrink:0 }} />
                    <span style={{ fontSize:'12px', color: perfil?.cor || '#8FA4C0' }}>{perfil?.label || m.perfil}</span>
                  </div>
                  <div style={{ fontSize:'13px', color:'#8FA4C0' }}>{m.cargo || '—'}</div>
                  <div>
                    <span style={{ fontSize:'11px', fontWeight:600, padding:'3px 10px', borderRadius:'100px', background: m.ativo ? 'rgba(34,197,94,0.1)' : 'rgba(192,57,43,0.1)', border:`1px solid ${m.ativo ? 'rgba(34,197,94,0.2)' : 'rgba(192,57,43,0.2)'}`, color: m.ativo ? '#22c55e' : '#e74c3c' }}>
                      {m.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                  <div style={{ fontSize:'12px', color:'#8FA4C0' }}>
                    {new Date(m.criado_em).toLocaleDateString('pt-BR')}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* AVISO CONTADOR */}
        <div style={{ background:'rgba(134,239,172,0.05)', border:'1px solid rgba(134,239,172,0.15)', borderRadius:'10px', padding:'16px 20px', marginTop:'20px', display:'flex', gap:'12px', alignItems:'flex-start' }}>
          <div style={{ fontSize:'20px', flexShrink:0 }}>💡</div>
          <div>
            <div style={{ fontSize:'13px', fontWeight:600, color:'#86efac', marginBottom:'4px' }}>Acesso do Contador</div>
            <div style={{ fontSize:'12px', color:'#8FA4C0', lineHeight:1.7 }}>
              Ao cadastrar um membro com perfil <strong style={{ color:'#86efac' }}>Contador</strong>, ele terá acesso exclusivo ao módulo financeiro — despesas, receitas e relatório TSE. Nenhum dado de líderes ou apoiadores será visível para ele.
            </div>
          </div>
        </div>
      </main>

      {/* MODAL */}
      {modalAberto && (
        <div style={{ position:'fixed', inset:0, zIndex:200, background:'rgba(0,0,0,0.75)', display:'flex', alignItems:'center', justifyContent:'center', padding:'24px' }}>
          <div style={{ background:'#0F2040', border:'1px solid rgba(201,168,76,0.2)', borderRadius:'16px', padding:'32px', width:'100%', maxWidth:'480px', position:'relative' }}>
            <div style={{ position:'absolute', top:0, left:'10%', right:'10%', height:'1px', background:'linear-gradient(90deg, transparent, #C9A84C, transparent)' }} />
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'24px' }}>
              <h2 style={{ fontSize:'18px', fontWeight:700, color:'#FFFFFF' }}>Novo Membro da Equipe</h2>
              <button onClick={() => setModalAberto(false)} style={{ background:'transparent', border:'none', color:'#8FA4C0', cursor:'pointer', fontSize:'20px' }}>✕</button>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
              <div><label style={labelStyle}>Nome completo *</label>
                <input value={form.nome} onChange={e => setForm(p=>({...p,nome:e.target.value}))} placeholder="Nome do membro" style={inputStyle} onFocus={e=>e.target.style.borderColor='#C9A84C'} onBlur={e=>e.target.style.borderColor='#1C3558'} />
              </div>
              <div><label style={labelStyle}>E-mail *</label>
                <input type="email" value={form.email} onChange={e => setForm(p=>({...p,email:e.target.value}))} placeholder="email@campanha.com" style={inputStyle} onFocus={e=>e.target.style.borderColor='#C9A84C'} onBlur={e=>e.target.style.borderColor='#1C3558'} />
              </div>
              <div><label style={labelStyle}>Senha inicial *</label>
                <input type="password" value={form.senha} onChange={e => setForm(p=>({...p,senha:e.target.value}))} placeholder="Mínimo 6 caracteres" style={inputStyle} onFocus={e=>e.target.style.borderColor='#C9A84C'} onBlur={e=>e.target.style.borderColor='#1C3558'} />
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
                <div><label style={labelStyle}>Perfil *</label>
                  <select value={form.perfil} onChange={e => setForm(p=>({...p,perfil:e.target.value}))} style={{ ...inputStyle, cursor:'pointer' }} onFocus={e=>e.target.style.borderColor='#C9A84C'} onBlur={e=>e.target.style.borderColor='#1C3558'}>
                    {Object.entries(perfis).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div><label style={labelStyle}>Cargo / Função</label>
                  <input value={form.cargo} onChange={e => setForm(p=>({...p,cargo:e.target.value}))} placeholder="Ex: Tesoureiro" style={inputStyle} onFocus={e=>e.target.style.borderColor='#C9A84C'} onBlur={e=>e.target.style.borderColor='#1C3558'} />
                </div>
              </div>

              {/* Preview do perfil selecionado */}
              <div style={{ background:'rgba(255,255,255,0.02)', border:'1px solid #1C3558', borderRadius:'8px', padding:'12px 14px' }}>
                <div style={{ fontSize:'11px', color:'#8FA4C0', marginBottom:'4px' }}>PERMISSÕES DO PERFIL</div>
                <div style={{ fontSize:'13px', color: perfis[form.perfil]?.cor || '#8FA4C0', fontWeight:500 }}>{perfis[form.perfil]?.desc}</div>
              </div>

              {erro && <div style={{ background:'rgba(192,57,43,0.1)', border:'1px solid rgba(192,57,43,0.3)', borderRadius:'8px', padding:'10px 14px', fontSize:'13px', color:'#e74c3c' }}>{erro}</div>}

              <div style={{ display:'flex', gap:'10px', justifyContent:'flex-end', marginTop:'4px' }}>
                <button onClick={() => setModalAberto(false)} style={{ background:'transparent', border:'1px solid #1C3558', borderRadius:'8px', color:'#8FA4C0', fontSize:'13px', padding:'10px 20px', cursor:'pointer', fontFamily:'Inter, sans-serif' }}>Cancelar</button>
                <button onClick={handleCriarUsuario} disabled={salvando} style={{ background: salvando ? 'rgba(201,168,76,0.4)' : 'linear-gradient(135deg, #E8C87A, #A07830)', border:'none', borderRadius:'8px', color:'#0B1F3A', fontSize:'13px', fontWeight:600, padding:'10px 24px', cursor: salvando ? 'not-allowed' : 'pointer', fontFamily:'Inter, sans-serif' }}>
                  {salvando ? 'Criando...' : 'Criar acesso →'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}