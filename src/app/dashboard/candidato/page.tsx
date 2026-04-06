'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type Candidato = {
  id: string
  nome: string
  partido: string
  cargo: string
  estado: string
  numero_urna: string
  email: string
  telefone: string
  bio: string
}

export default function CandidatoPage() {
  const router = useRouter()
  const supabase = createClient()
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState(false)
  const [candidatoExistente, setCandidatoExistente] = useState<Candidato | null>(null)

  const [form, setForm] = useState({
    nome: '', partido: '', cargo: 'Deputado Federal',
    estado: '', numero_urna: '', email: '', telefone: '', bio: '',
  })

  function mascaraTelefone(v: string) {
    return v.replace(/\D/g,'').slice(0,11)
      .replace(/^(\d{2})(\d)/,'($1) $2')
      .replace(/(\d{5})(\d{1,4})$/,'$1-$2')
  }

  useEffect(() => {
    async function carregar() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data } = await supabase.from('candidatos').select('*').limit(1).single()
      if (data) {
        setCandidatoExistente(data)
        setForm({
          nome: data.nome || '',
          partido: data.partido || '',
          cargo: data.cargo || 'Deputado Federal',
          estado: data.estado || '',
          numero_urna: data.numero_urna || '',
          email: data.email || '',
          telefone: data.telefone || '',
          bio: data.bio || '',
        })
      }
    }
    carregar()
  }, [])

  function handleChange(campo: string, valor: string) {
    if (campo === 'telefone') { setForm(prev => ({ ...prev, [campo]: mascaraTelefone(valor) })); return }
    setForm(prev => ({ ...prev, [campo]: valor }))
  }

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault()
    setSalvando(true)
    setErro('')
    setSucesso(false)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    let error
    if (candidatoExistente) {
      const res = await supabase.from('candidatos').update(form).eq('id', candidatoExistente.id)
      error = res.error
    } else {
      const res = await supabase.from('candidatos').insert({ ...form, ativo: true })
      error = res.error
    }

    if (error) {
      setErro('Erro ao salvar: ' + error.message)
      setSalvando(false)
      return
    }

    setSucesso(true)
    setSalvando(false)
    setTimeout(() => setSucesso(false), 3000)
  }

  const inputStyle = {
    padding:'11px 14px', background:'#0B1F3A',
    border:'1px solid #1C3558', borderRadius:'8px',
    color:'#E8EDF5', fontSize:'14px', outline:'none',
    fontFamily:"'IBM Plex Sans', sans-serif",
    width:'100%', boxSizing:'border-box' as const,
  }
  const labelStyle = {
    fontSize:'11px', fontWeight:600 as const,
    letterSpacing:'1px', textTransform:'uppercase' as const,
    color:'#8FA4C0',
  }
  const campo = (label: string, c: string, tipo = 'text', placeholder = '', span = false) => (
    <div style={{ display:'flex', flexDirection:'column' as const, gap:'6px', ...(span ? { gridColumn:'span 2' } : {}) }}>
      <label style={labelStyle}>{label}</label>
      <input type={tipo} value={form[c as keyof typeof form]} onChange={e => handleChange(c, e.target.value)}
        placeholder={placeholder} style={inputStyle}
        onFocus={e => e.target.style.borderColor='#C9A84C'}
        onBlur={e => e.target.style.borderColor='#1C3558'} />
    </div>
  )
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
      </nav>

      <main style={{ paddingTop:'88px', padding:'88px 32px 60px', position:'relative', zIndex:1, maxWidth:'760px', margin:'0 auto' }}>
        <div style={{ marginBottom:'32px' }}>
          <div style={{ fontSize:'11px', fontWeight:600, letterSpacing:'2.5px', textTransform:'uppercase', color:'#C9A84C', display:'flex', alignItems:'center', gap:'10px', marginBottom:'10px' }}>
            <span style={{ width:'24px', height:'1px', background:'#A07830', display:'inline-block' }} />
            {candidatoExistente ? 'Editar Perfil' : 'Configuração Inicial'}
          </div>
          <h1 style={{ fontFamily:"'Playfair Display', serif", fontSize:'32px', fontWeight:800, color:'#FFFFFF', marginBottom:'8px' }}>
            {candidatoExistente ? 'Perfil do Candidato' : 'Cadastrar Candidato'}
          </h1>
          <p style={{ fontSize:'14px', color:'#8FA4C0', fontWeight:300 }}>
            {candidatoExistente ? 'Atualize as informações da sua campanha' : 'Configure o perfil do candidato para vincular líderes e apoiadores'}
          </p>
        </div>

        <form onSubmit={handleSalvar} style={{ display:'flex', flexDirection:'column', gap:'16px' }}>

          {/* DADOS DA CANDIDATURA */}
          <div style={{ background:'#0F2040', border:'1px solid #1C3558', borderRadius:'12px', padding:'28px' }}>
            <h2 style={{ fontFamily:"'Playfair Display', serif", fontSize:'17px', fontWeight:700, color:'#C9A84C', marginBottom:'20px', paddingBottom:'12px', borderBottom:'1px solid #1C3558' }}>
              Dados da Candidatura
            </h2>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px' }}>
              {campo('Nome completo *', 'nome', 'text', 'Nome do candidato', true)}
              <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
                <label style={labelStyle}>Cargo *</label>
                <select value={form.cargo} onChange={e => handleChange('cargo', e.target.value)}
                  style={{ ...inputStyle, cursor:'pointer' }}
                  onFocus={e => e.target.style.borderColor='#C9A84C'}
                  onBlur={e => e.target.style.borderColor='#1C3558'}>
                  <optgroup label="Eleições 2026">
                    <option value="Deputado Federal">Deputado Federal</option>
                    <option value="Deputado Estadual">Deputado Estadual</option>
                    <option value="Senador">Senador</option>
                    <option value="Governador">Governador</option>
                    <option value="Presidente">Presidente</option>
                  </optgroup>
                  <optgroup label="Eleições 2028">
                    <option value="Prefeito">Prefeito</option>
                    <option value="Vereador">Vereador</option>
                  </optgroup>
                </select>
              </div>
              {campo('Partido *', 'partido', 'text', 'Ex: PT, PL, PSDB...')}
              <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
                <label style={labelStyle}>Estado *</label>
                <select value={form.estado} onChange={e => handleChange('estado', e.target.value)}
                  style={{ ...inputStyle, cursor:'pointer' }}
                  onFocus={e => e.target.style.borderColor='#C9A84C'}
                  onBlur={e => e.target.style.borderColor='#1C3558'}>
                  <option value="">Selecione o estado</option>
                  {['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map(uf => (
                    <option key={uf} value={uf}>{uf}</option>
                  ))}
                </select>
              </div>
              {campo('Número na urna *', 'numero_urna', 'text', 'Ex: 12345')}
            </div>
          </div>

          {/* CONTATO */}
          <div style={{ background:'#0F2040', border:'1px solid #1C3558', borderRadius:'12px', padding:'28px' }}>
            <h2 style={{ fontFamily:"'Playfair Display', serif", fontSize:'17px', fontWeight:700, color:'#C9A84C', marginBottom:'20px', paddingBottom:'12px', borderBottom:'1px solid #1C3558' }}>
              Contato
            </h2>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px' }}>
              {campo('E-mail *', 'email', 'email', 'email@campanha.com.br')}
              {campo('Telefone', 'telefone', 'tel', '(51) 99999-9999')}
            </div>
          </div>

          {/* BIO */}
          <div style={{ background:'#0F2040', border:'1px solid #1C3558', borderRadius:'12px', padding:'28px' }}>
            <h2 style={{ fontFamily:"'Playfair Display', serif", fontSize:'17px', fontWeight:700, color:'#C9A84C', marginBottom:'20px', paddingBottom:'12px', borderBottom:'1px solid #1C3558' }}>
              Apresentação
            </h2>
            <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
              <label style={labelStyle}>Biografia / Apresentação da campanha</label>
              <textarea value={form.bio} onChange={e => handleChange('bio', e.target.value)}
                placeholder="Apresentação do candidato, propostas principais, histórico político..."
                rows={5}
                style={{ ...inputStyle, resize:'vertical' as const }}
                onFocus={e => e.target.style.borderColor='#C9A84C'}
                onBlur={e => e.target.style.borderColor='#1C3558'} />
            </div>
          </div>

          {erro && (
            <div style={{ background:'rgba(192,57,43,0.1)', border:'1px solid rgba(192,57,43,0.3)', borderRadius:'8px', padding:'12px 16px', fontSize:'13px', color:'#e74c3c' }}>
              {erro}
            </div>
          )}

          {sucesso && (
            <div style={{ background:'rgba(201,168,76,0.1)', border:'1px solid rgba(201,168,76,0.3)', borderRadius:'8px', padding:'12px 16px', fontSize:'13px', color:'#C9A84C' }}>
              ✓ Dados salvos com sucesso!
            </div>
          )}

          <div style={{ display:'flex', gap:'12px', justifyContent:'flex-end' }}>
            <button type="button" onClick={() => router.push('/dashboard')}
              style={{ background:'transparent', border:'1px solid #1C3558', borderRadius:'8px', color:'#8FA4C0', fontSize:'14px', padding:'12px 24px', cursor:'pointer', fontFamily:"'IBM Plex Sans', sans-serif" }}>
              Cancelar
            </button>
            <button type="submit" disabled={salvando}
              style={{ background: salvando ? 'rgba(201,168,76,0.5)' : 'linear-gradient(135deg, #E8C87A, #A07830)', border:'none', borderRadius:'8px', color:'#0B1F3A', fontSize:'14px', fontWeight:600, padding:'12px 32px', cursor: salvando ? 'not-allowed' : 'pointer', fontFamily:"'IBM Plex Sans', sans-serif" }}>
              {salvando ? 'Salvando...' : candidatoExistente ? 'Atualizar perfil →' : 'Salvar candidato →'}
            </button>
          </div>

        </form>
      </main>
    </div>
  )
}