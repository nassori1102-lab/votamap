'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function NovoLiderPage() {
  const router = useRouter()
  const supabase = createClient()
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [buscandoCep, setBuscandoCep] = useState(false)

  const [form, setForm] = useState({
    nome: '', cpf: '', email: '', telefone: '', whatsapp: '',
    cep: '', endereco: '', bairro: '', cidade: '', estado: '',
    zona_eleitoral: '', secao_eleitoral: '', observacoes: '',
  })

  function mascaraCPF(v: string) {
    return v.replace(/\D/g,'').slice(0,11)
      .replace(/(\d{3})(\d)/,'$1.$2')
      .replace(/(\d{3})(\d)/,'$1.$2')
      .replace(/(\d{3})(\d{1,2})$/,'$1-$2')
  }

  function mascaraTelefone(v: string) {
    return v.replace(/\D/g,'').slice(0,11)
      .replace(/^(\d{2})(\d)/,'($1) $2')
      .replace(/(\d{5})(\d{1,4})$/,'$1-$2')
  }

  function mascaraCEP(v: string) {
    return v.replace(/\D/g,'').slice(0,8)
      .replace(/(\d{5})(\d{1,3})$/,'$1-$2')
  }

  function atualizar(campo: string, valor: string) {
    setForm(prev => ({ ...prev, [campo]: valor }))
  }

  function handleChange(campo: string, valor: string) {
    if (campo === 'cpf') { atualizar(campo, mascaraCPF(valor)); return }
    if (campo === 'telefone') { atualizar(campo, mascaraTelefone(valor)); return }
    if (campo === 'whatsapp') { atualizar(campo, mascaraTelefone(valor)); return }
    if (campo === 'cep') {
      const mascarado = mascaraCEP(valor)
      atualizar(campo, mascarado)
      if (mascarado.replace(/\D/g,'').length === 8) buscarCep(mascarado)
      return
    }
    atualizar(campo, valor)
  }

  async function buscarCep(cep: string) {
    const cepLimpo = cep.replace(/\D/g,'')
    if (cepLimpo.length !== 8) return
    setBuscandoCep(true)
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`)
      const data = await res.json()
      if (!data.erro) {
        setForm(prev => ({
          ...prev,
          endereco: data.logradouro || '',
          bairro: data.bairro || '',
          cidade: data.localidade || '',
          estado: data.uf || '',
        }))
      }
    } catch {}
    setBuscandoCep(false)
  }

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault()
    setSalvando(true)
    setErro('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { error } = await supabase.from('lideres_regionais').insert({
      nome: form.nome,
      cpf: form.cpf,
      email: form.email,
      telefone: form.telefone,
      whatsapp: form.whatsapp,
      cep: form.cep,
      endereco: form.endereco,
      bairro: form.bairro,
      cidade: form.cidade,
      estado: form.estado,
      zona_eleitoral: form.zona_eleitoral,
      secao_eleitoral: form.secao_eleitoral,
      observacoes: form.observacoes,
      ativo: true,
    })

    if (error) {
      setErro('Erro ao salvar: ' + error.message)
      setSalvando(false)
      return
    }

    router.push('/dashboard/lideres')
  }

  const inputStyle = {
    padding:'11px 14px', background:'#0B1F3A',
    border:'1px solid #1C3558', borderRadius:'8px',
    color:'#E8EDF5', fontSize:'14px', outline:'none',
    fontFamily:"'IBM Plex Sans', sans-serif",
    transition:'border-color .2s', width:'100%',
    boxSizing:'border-box' as const,
  }

  const labelStyle = {
    fontSize:'11px', fontWeight:600 as const,
    letterSpacing:'1px', textTransform:'uppercase' as const,
    color:'#8FA4C0',
  }
  return (
    <div style={{ minHeight:'100vh', background:'#0B1F3A', fontFamily:"'IBM Plex Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap" rel="stylesheet" />
      <div style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:0, backgroundImage:`repeating-linear-gradient(0deg, transparent, transparent 80px, rgba(201,168,76,0.02) 80px, rgba(201,168,76,0.02) 81px), repeating-linear-gradient(90deg, transparent, transparent 80px, rgba(201,168,76,0.02) 80px, rgba(201,168,76,0.02) 81px)` }} />

      <nav style={{ position:'fixed', top:0, left:0, right:0, zIndex:100, height:'64px', background:'rgba(11,31,58,0.95)', backdropFilter:'blur(20px)', borderBottom:'1px solid rgba(201,168,76,0.15)', display:'flex', alignItems:'center', padding:'0 32px', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'16px' }}>
          <button onClick={() => router.push('/dashboard/lideres')} style={{ background:'transparent', border:'none', color:'#8FA4C0', cursor:'pointer', fontSize:'13px' }}>← Voltar</button>
          <div style={{ width:'1px', height:'20px', background:'#1C3558' }} />
          <span style={{ fontFamily:"'Playfair Display', serif", fontSize:'20px', fontWeight:800, color:'#FFFFFF' }}>Vota<span style={{ color:'#C9A84C' }}>Map</span></span>
        </div>
      </nav>

      <main style={{ paddingTop:'88px', padding:'88px 32px 60px', position:'relative', zIndex:1, maxWidth:'760px', margin:'0 auto' }}>
        <div style={{ marginBottom:'32px' }}>
          <div style={{ fontSize:'11px', fontWeight:600, letterSpacing:'2.5px', textTransform:'uppercase', color:'#C9A84C', display:'flex', alignItems:'center', gap:'10px', marginBottom:'10px' }}>
            <span style={{ width:'24px', height:'1px', background:'#A07830', display:'inline-block' }} />
            Novo Cadastro
          </div>
          <h1 style={{ fontFamily:"'Playfair Display', serif", fontSize:'32px', fontWeight:800, color:'#FFFFFF' }}>Cadastrar Líder Regional</h1>
        </div>

        <form onSubmit={handleSalvar} style={{ display:'flex', flexDirection:'column', gap:'16px' }}>

          {/* DADOS PESSOAIS */}
          <div style={{ background:'#0F2040', border:'1px solid #1C3558', borderRadius:'12px', padding:'28px' }}>
            <h2 style={{ fontFamily:"'Playfair Display', serif", fontSize:'17px', fontWeight:700, color:'#C9A84C', marginBottom:'20px', paddingBottom:'12px', borderBottom:'1px solid #1C3558' }}>Dados Pessoais</h2>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px' }}>
              <div style={{ display:'flex', flexDirection:'column', gap:'6px', gridColumn:'span 2' }}>
                <label style={labelStyle}>Nome completo *</label>
                <input value={form.nome} onChange={e => handleChange('nome', e.target.value)} placeholder="Nome completo do líder" required style={inputStyle} onFocus={e => e.target.style.borderColor='#C9A84C'} onBlur={e => e.target.style.borderColor='#1C3558'} />
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
                <label style={labelStyle}>CPF</label>
                <input value={form.cpf} onChange={e => handleChange('cpf', e.target.value)} placeholder="000.000.000-00" style={inputStyle} onFocus={e => e.target.style.borderColor='#C9A84C'} onBlur={e => e.target.style.borderColor='#1C3558'} />
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
                <label style={labelStyle}>E-mail</label>
                <input type="email" value={form.email} onChange={e => handleChange('email', e.target.value)} placeholder="email@exemplo.com" style={inputStyle} onFocus={e => e.target.style.borderColor='#C9A84C'} onBlur={e => e.target.style.borderColor='#1C3558'} />
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
                <label style={labelStyle}>Telefone *</label>
                <input value={form.telefone} onChange={e => handleChange('telefone', e.target.value)} placeholder="(51) 99999-9999" required style={inputStyle} onFocus={e => e.target.style.borderColor='#C9A84C'} onBlur={e => e.target.style.borderColor='#1C3558'} />
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
                <label style={labelStyle}>WhatsApp</label>
                <input value={form.whatsapp} onChange={e => handleChange('whatsapp', e.target.value)} placeholder="(51) 99999-9999" style={inputStyle} onFocus={e => e.target.style.borderColor='#C9A84C'} onBlur={e => e.target.style.borderColor='#1C3558'} />
              </div>
            </div>
          </div>

          {/* ENDEREÇO */}
          <div style={{ background:'#0F2040', border:'1px solid #1C3558', borderRadius:'12px', padding:'28px' }}>
            <h2 style={{ fontFamily:"'Playfair Display', serif", fontSize:'17px', fontWeight:700, color:'#C9A84C', marginBottom:'20px', paddingBottom:'12px', borderBottom:'1px solid #1C3558' }}>
              Endereço {buscandoCep && <span style={{ fontSize:'12px', color:'#8FA4C0', fontWeight:400 }}>🔍 Buscando CEP...</span>}
            </h2>
            <div style={{ display:'grid', gridTemplateColumns:'180px 1fr', gap:'16px', marginBottom:'16px' }}>
              <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
                <label style={labelStyle}>CEP *</label>
                <input value={form.cep} onChange={e => handleChange('cep', e.target.value)} placeholder="00000-000" required style={inputStyle} onFocus={e => e.target.style.borderColor='#C9A84C'} onBlur={e => e.target.style.borderColor='#1C3558'} />
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
                <label style={labelStyle}>Endereço</label>
                <input value={form.endereco} onChange={e => handleChange('endereco', e.target.value)} placeholder="Preenchido automaticamente pelo CEP" style={inputStyle} onFocus={e => e.target.style.borderColor='#C9A84C'} onBlur={e => e.target.style.borderColor='#1C3558'} />
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 80px', gap:'16px' }}>
              <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
                <label style={labelStyle}>Bairro *</label>
                <input value={form.bairro} onChange={e => handleChange('bairro', e.target.value)} placeholder="Bairro" required style={inputStyle} onFocus={e => e.target.style.borderColor='#C9A84C'} onBlur={e => e.target.style.borderColor='#1C3558'} />
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
                <label style={labelStyle}>Cidade *</label>
                <input value={form.cidade} onChange={e => handleChange('cidade', e.target.value)} placeholder="Cidade" required style={inputStyle} onFocus={e => e.target.style.borderColor='#C9A84C'} onBlur={e => e.target.style.borderColor='#1C3558'} />
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
                <label style={labelStyle}>UF *</label>
                <input value={form.estado} onChange={e => handleChange('estado', e.target.value)} placeholder="RS" required maxLength={2} style={inputStyle} onFocus={e => e.target.style.borderColor='#C9A84C'} onBlur={e => e.target.style.borderColor='#1C3558'} />
              </div>
            </div>
          </div>

          {/* DADOS ELEITORAIS */}
          <div style={{ background:'#0F2040', border:'1px solid #1C3558', borderRadius:'12px', padding:'28px' }}>
            <h2 style={{ fontFamily:"'Playfair Display', serif", fontSize:'17px', fontWeight:700, color:'#C9A84C', marginBottom:'20px', paddingBottom:'12px', borderBottom:'1px solid #1C3558' }}>Dados Eleitorais</h2>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px', marginBottom:'16px' }}>
              <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
                <label style={labelStyle}>Zona Eleitoral</label>
                <input value={form.zona_eleitoral} onChange={e => handleChange('zona_eleitoral', e.target.value)} placeholder="Ex: 001" style={inputStyle} onFocus={e => e.target.style.borderColor='#C9A84C'} onBlur={e => e.target.style.borderColor='#1C3558'} />
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
                <label style={labelStyle}>Seção Eleitoral</label>
                <input value={form.secao_eleitoral} onChange={e => handleChange('secao_eleitoral', e.target.value)} placeholder="Ex: 0042" style={inputStyle} onFocus={e => e.target.style.borderColor='#C9A84C'} onBlur={e => e.target.style.borderColor='#1C3558'} />
              </div>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
              <label style={labelStyle}>Observações</label>
              <textarea value={form.observacoes} onChange={e => handleChange('observacoes', e.target.value)} placeholder="Anotações sobre este líder..." rows={3}
                style={{ ...inputStyle, resize:'vertical' as const }}
                onFocus={e => e.target.style.borderColor='#C9A84C'} onBlur={e => e.target.style.borderColor='#1C3558'} />
            </div>
          </div>

          {erro && (
            <div style={{ background:'rgba(192,57,43,0.1)', border:'1px solid rgba(192,57,43,0.3)', borderRadius:'8px', padding:'12px 16px', fontSize:'13px', color:'#e74c3c' }}>
              {erro}
            </div>
          )}

          <div style={{ display:'flex', gap:'12px', justifyContent:'flex-end' }}>
            <button type="button" onClick={() => router.push('/dashboard/lideres')} style={{ background:'transparent', border:'1px solid #1C3558', borderRadius:'8px', color:'#8FA4C0', fontSize:'14px', padding:'12px 24px', cursor:'pointer', fontFamily:"'IBM Plex Sans', sans-serif" }}>
              Cancelar
            </button>
            <button type="submit" disabled={salvando} style={{ background: salvando ? 'rgba(201,168,76,0.5)' : 'linear-gradient(135deg, #E8C87A, #A07830)', border:'none', borderRadius:'8px', color:'#0B1F3A', fontSize:'14px', fontWeight:600, padding:'12px 32px', cursor: salvando ? 'not-allowed' : 'pointer', fontFamily:"'IBM Plex Sans', sans-serif" }}>
              {salvando ? 'Salvando...' : 'Salvar líder →'}
            </button>
          </div>

        </form>
      </main>
    </div>
  )
}