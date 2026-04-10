'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import { validarCpf } from '@/lib/validarCpf'
import { useIsMobile } from '@/lib/useIsMobile'

type Apoiador = {
  id: string
  nome: string
  cpf: string
  data_nascimento: string
  email: string
  telefone: string
  whatsapp: string
  cep: string
  endereco: string
  numero: string
  complemento: string
  bairro: string
  cidade: string
  estado: string
  zona_eleitoral: string
  secao_eleitoral: string
  local_votacao: string
  titulo_eleitor: string
  zona_titulo: string
  secao_titulo: string
  meta_votos: number
  profissao: string
  engajamento: number
  observacoes: string
  consentimento: boolean
  criado_em: string
  lider_id: string
  lideres_regionais?: { nome: string }
}

type Lider = { id: string; nome: string }

const inputStyle = { padding:'10px 14px', background:'#0B1F3A', border:'1px solid #1C3558', borderRadius:'8px', color:'#E8EDF5', fontSize:'14px', outline:'none', fontFamily:"'IBM Plex Sans', sans-serif", width:'100%', boxSizing:'border-box' as const }
const labelStyle = { fontSize:'11px', fontWeight:600 as const, letterSpacing:'1px', textTransform:'uppercase' as const, color:'#8FA4C0' }

function Campo({ label, campo, tipo, editando, form, apoiador, cpfInvalido, onChange, setCpfInvalido }: {
  label: string; campo: keyof Apoiador; tipo?: string; editando: boolean
  form: Partial<Apoiador>; apoiador: Apoiador; cpfInvalido: boolean
  onChange: (campo: string, valor: string) => void; setCpfInvalido: (v: boolean) => void
}) {
  const valor = form[campo] as string || ''
  const valorExibido = apoiador[campo] as string || '—'
  const isCpf = campo === 'cpf'
  return (
    <div>
      <div style={labelStyle}>{label}</div>
      {editando ? (
        <>
          <input type={tipo || 'text'} value={valor} onChange={e => onChange(campo, e.target.value)}
            style={{ ...inputStyle, marginTop:'4px', ...(tipo === 'date' ? { colorScheme:'dark' } : {}), ...(isCpf && cpfInvalido ? { borderColor:'#e74c3c' } : {}) }}
            onFocus={e => e.target.style.borderColor = '#C9A84C'}
            onBlur={e => {
              if (isCpf) {
                const limpo = valor.replace(/\D/g, '')
                if (limpo.length === 11 && !validarCpf(limpo)) { setCpfInvalido(true); e.target.style.borderColor = '#e74c3c' }
                else { setCpfInvalido(false); e.target.style.borderColor = '#1C3558' }
              } else { e.target.style.borderColor = '#1C3558' }
            }} />
          {isCpf && cpfInvalido && <span style={{ fontSize:'12px', color:'#e74c3c', marginTop:'4px', display:'block' }}>CPF inválido.</span>}
        </>
      ) : (
        <div style={{ fontSize:'14px', color:'#E8EDF5', marginTop:'4px' }}>{valorExibido}</div>
      )}
    </div>
  )
}

export default function ApoiadorDetalhePage() {
  const router = useRouter()
  const params = useParams()
  const supabase = createClient()
  const isMobile = useIsMobile()
  const [apoiador, setApoiador] = useState<Apoiador | null>(null)
  const [lideres, setLideres] = useState<Lider[]>([])
  const [editando, setEditando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [excluindo, setExcluindo] = useState(false)
  const [confirmarExclusao, setConfirmarExclusao] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState(false)
  const [cpfInvalido, setCpfInvalido] = useState(false)
  const [form, setForm] = useState<Partial<Apoiador>>({})

  function mascaraCPF(v: string) {
    return v.replace(/\D/g,'').slice(0,11).replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d{1,2})$/,'$1-$2')
  }
  function mascaraTelefone(v: string) {
    return v.replace(/\D/g,'').slice(0,11).replace(/^(\d{2})(\d)/,'($1) $2').replace(/(\d{5})(\d{1,4})$/,'$1-$2')
  }
  function mascaraCEP(v: string) {
    return v.replace(/\D/g,'').slice(0,8).replace(/(\d{5})(\d{1,3})$/,'$1-$2')
  }

  useEffect(() => {
    async function carregar() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data } = await supabase.from('apoiadores').select('*, lideres_regionais(nome)').eq('id', params.id).single()
      if (data) {
        if (data.cpf && data.cpf.length === 11) data.cpf = mascaraCPF(data.cpf)
        setApoiador(data); setForm(data)
      }
      const { data: lideresData } = await supabase.from('lideres_regionais').select('id, nome').eq('ativo', true).order('nome')
      if (lideresData) setLideres(lideresData)
    }
    carregar()
  }, [params.id])

  function handleChange(campo: string, valor: string) {
    if (campo === 'cpf') { setForm(prev => ({ ...prev, cpf: mascaraCPF(valor) })); return }
    if (campo === 'telefone' || campo === 'whatsapp') { setForm(prev => ({ ...prev, [campo]: mascaraTelefone(valor) })); return }
    if (campo === 'cep') {
      const mascarado = mascaraCEP(valor)
      setForm(prev => ({ ...prev, cep: mascarado }))
      if (mascarado.replace(/\D/g,'').length === 8) buscarCep(mascarado)
      return
    }
    setForm(prev => ({ ...prev, [campo]: valor }))
  }

  async function buscarCep(cep: string) {
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep.replace(/\D/g,'')}/json/`)
      const data = await res.json()
      if (!data.erro) setForm(prev => ({ ...prev, endereco:data.logradouro||'', bairro:data.bairro||'', cidade:data.localidade||'', estado:data.uf||'' }))
    } catch {}
  }

  async function handleSalvar() {
    setErro('')
    const cpfLimpo = (form.cpf || '').replace(/\D/g, '')
    if (cpfLimpo.length > 0 && !validarCpf(cpfLimpo)) { setErro('CPF inválido. Corrija antes de salvar.'); return }
    setSalvando(true)
    const { error } = await supabase.from('apoiadores').update({ ...form, cpf: cpfLimpo || null, lideres_regionais: undefined }).eq('id', params.id)
    if (error) { setErro('Erro ao salvar: ' + error.message); setSalvando(false); return }
    setApoiador({ ...apoiador, ...form } as Apoiador)
    setEditando(false); setSucesso(true); setSalvando(false)
    setTimeout(() => setSucesso(false), 3000)
  }

  async function handleExcluir() {
    setExcluindo(true); setErro('')
    const { error } = await supabase.from('apoiadores').delete().eq('id', params.id)
    if (error) {
      setErro('Erro ao excluir: ' + error.message)
      setExcluindo(false); setConfirmarExclusao(false); return
    }
    window.location.href = '/dashboard/apoiadores'
  }

  if (!apoiador) return (
    <div style={{ minHeight:'100vh', background:'#0B1F3A', display:'flex', alignItems:'center', justifyContent:'center', color:'#C9A84C', fontFamily:"'IBM Plex Sans', sans-serif" }}>Carregando...</div>
  )

  const campoProps = { editando, form, apoiador, cpfInvalido, onChange: handleChange, setCpfInvalido }

  return (
    <div style={{ minHeight:'100vh', background:'#0B1F3A', fontFamily:"'IBM Plex Sans', sans-serif" }}>
      <div style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:0, backgroundImage:`repeating-linear-gradient(0deg, transparent, transparent 80px, rgba(201,168,76,0.02) 80px, rgba(201,168,76,0.02) 81px), repeating-linear-gradient(90deg, transparent, transparent 80px, rgba(201,168,76,0.02) 80px, rgba(201,168,76,0.02) 81px)` }} />

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
      {confirmarExclusao && (
        <div style={{ position:'fixed', inset:0, zIndex:200, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', padding:'24px' }}>
          <div style={{ background:'#0F2040', border:'1px solid rgba(192,57,43,0.4)', borderRadius:'16px', padding:'32px', maxWidth:'440px', width:'100%' }}>
            <div style={{ fontSize:'32px', marginBottom:'16px', textAlign:'center' as const }}>⚠️</div>
            <h2 style={{ fontFamily:"'Playfair Display', serif", fontSize:'20px', fontWeight:700, color:'#FFFFFF', marginBottom:'12px', textAlign:'center' as const }}>
              Excluir apoiador?
            </h2>
            <p style={{ fontSize:'14px', color:'#8FA4C0', textAlign:'center' as const, marginBottom:'8px', lineHeight:1.6 }}>
              Você está prestes a excluir <strong style={{ color:'#E8EDF5' }}>{apoiador.nome}</strong>.
            </p>
            <p style={{ fontSize:'13px', color:'#e74c3c', textAlign:'center' as const, marginBottom:'28px' }}>
              Esta ação não pode ser desfeita.
            </p>
            <div style={{ display:'flex', gap:'12px' }}>
              <button onClick={() => setConfirmarExclusao(false)} disabled={excluindo}
                style={{ flex:1, background:'transparent', border:'1px solid #1C3558', borderRadius:'8px', color:'#8FA4C0', fontSize:'14px', padding:'12px', cursor:'pointer', fontFamily:"'IBM Plex Sans', sans-serif" }}>
                Cancelar
              </button>
              <button onClick={handleExcluir} disabled={excluindo}
                style={{ flex:1, background: excluindo ? 'rgba(192,57,43,0.5)' : 'rgba(192,57,43,0.8)', border:'1px solid rgba(192,57,43,0.4)', borderRadius:'8px', color:'#FFFFFF', fontSize:'14px', fontWeight:600, padding:'12px', cursor: excluindo ? 'not-allowed' : 'pointer', fontFamily:"'IBM Plex Sans', sans-serif" }}>
                {excluindo ? 'Excluindo...' : 'Sim, excluir'}
              </button>
            </div>
          </div>
        </div>
      )}

      <nav style={{ position:'fixed', top:0, left:0, right:0, zIndex:100, height:'64px', background:'rgba(11,31,58,0.95)', backdropFilter:'blur(20px)', borderBottom:'1px solid rgba(201,168,76,0.15)', display:'flex', alignItems:'center', padding: isMobile ? '0 16px' : '0 32px', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
          <button onClick={() => router.push('/dashboard/apoiadores')} style={{ background:'transparent', border:'none', color:'#8FA4C0', cursor:'pointer', fontSize:'13px' }}>← Voltar</button>
          {!isMobile && <>
            <div style={{ width:'1px', height:'20px', background:'#1C3558' }} />
            <span style={{ fontFamily:"'Playfair Display', serif", fontSize:'20px', fontWeight:800, color:'#FFFFFF' }}>Cand<span style={{ color:'#C9A84C' }}>Maps</span></span>
          </>}
        </div>
        <div style={{ display:'flex', gap:'8px' }}>
          {editando ? (
            <>
              <button onClick={() => { setEditando(false); setForm(apoiador); setCpfInvalido(false) }}
                style={{ background:'transparent', border:'1px solid #1C3558', borderRadius:'8px', color:'#8FA4C0', fontSize:'13px', padding:'8px 14px', cursor:'pointer', fontFamily:"'IBM Plex Sans', sans-serif" }}>
                Cancelar
              </button>
              <button onClick={handleSalvar} disabled={salvando}
                style={{ background: salvando ? 'rgba(201,168,76,0.5)' : 'linear-gradient(135deg, #E8C87A, #A07830)', border:'none', borderRadius:'8px', color:'#0B1F3A', fontSize:'13px', fontWeight:600, padding:'8px 18px', cursor:'pointer', fontFamily:"'IBM Plex Sans', sans-serif" }}>
                {salvando ? 'Salvando...' : 'Salvar →'}
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setConfirmarExclusao(true)}
                style={{ background:'rgba(192,57,43,0.1)', border:'1px solid rgba(192,57,43,0.3)', borderRadius:'8px', color:'#e74c3c', fontSize:'13px', padding:'8px 14px', cursor:'pointer', fontFamily:"'IBM Plex Sans', sans-serif" }}>
                🗑 {!isMobile && 'Excluir'}
              </button>
              <button onClick={() => setEditando(true)}
                style={{ background:'transparent', border:'1px solid rgba(201,168,76,0.3)', borderRadius:'8px', color:'#C9A84C', fontSize:'13px', padding:'8px 14px', cursor:'pointer', fontFamily:"'IBM Plex Sans', sans-serif" }}>
                ✏️ {!isMobile && 'Editar'}
              </button>
            </>
          )}
        </div>
      </nav>

      <main style={{ paddingTop:'88px', padding: isMobile ? '80px 16px 40px' : '88px 32px 60px', position:'relative', zIndex:1, maxWidth:'860px', margin:'0 auto' }}>
        <div style={{ display:'flex', alignItems:'flex-start', gap:'16px', marginBottom:'20px', background:'#0F2040', border:'1px solid #1C3558', borderRadius:'12px', padding: isMobile ? '20px' : '28px', flexDirection: isMobile ? 'column' : 'row' }}>
          <div style={{ width:'64px', height:'64px', borderRadius:'50%', background:'rgba(107,163,214,0.15)', border:'2px solid rgba(107,163,214,0.3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'24px', fontWeight:700, color:'#6ba3d6', flexShrink:0 }}>
            {apoiador.nome.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex:1 }}>
            <h1 style={{ fontFamily:"'Playfair Display', serif", fontSize: isMobile ? '22px' : '26px', fontWeight:800, color:'#FFFFFF', marginBottom:'4px' }}>{apoiador.nome}</h1>
            <p style={{ fontSize:'14px', color:'#8FA4C0', marginBottom:'12px' }}>
              {apoiador.lideres_regionais?.nome ? `Líder: ${apoiador.lideres_regionais.nome}` : 'Sem líder vinculado'}
              {apoiador.bairro ? ` · ${apoiador.bairro}, ${apoiador.cidade}/${apoiador.estado}` : ''}
            </p>
            <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
              <span style={labelStyle}>Engajamento</span>
              {editando ? (
                <div style={{ display:'flex', gap:'6px' }}>
                  {[1,2,3,4,5].map(n => (
                    <button key={n} type="button" onClick={() => setForm(prev => ({ ...prev, engajamento: n }))}
                      style={{ width:'36px', height:'36px', borderRadius:'6px', border:`1px solid ${(form.engajamento || 3) >= n ? 'rgba(201,168,76,0.4)' : '#1C3558'}`, background:(form.engajamento || 3) >= n ? 'rgba(201,168,76,0.15)' : 'transparent', color:(form.engajamento || 3) >= n ? '#C9A84C' : '#8FA4C0', fontSize:'16px', cursor:'pointer' }}>★</button>
                  ))}
                  <span style={{ fontSize:'12px', color:'#8FA4C0', alignSelf:'center', marginLeft:'4px' }}>{['','Baixo','Médio-baixo','Médio','Alto','Muito alto'][form.engajamento || 3]}</span>
                </div>
              ) : (
                <div style={{ display:'flex', gap:'2px' }}>
                  {Array.from({ length: 5 }, (_, i) => <span key={i} style={{ color: i < (apoiador.engajamento || 3) ? '#C9A84C' : '#1C3558', fontSize:'16px' }}>★</span>)}
                </div>
              )}
            </div>
          </div>
        </div>

        {sucesso && <div style={{ background:'rgba(201,168,76,0.1)', border:'1px solid rgba(201,168,76,0.3)', borderRadius:'8px', padding:'12px 16px', fontSize:'13px', color:'#C9A84C', marginBottom:'16px' }}>✓ Dados salvos com sucesso!</div>}
        {erro && <div style={{ background:'rgba(192,57,43,0.1)', border:'1px solid rgba(192,57,43,0.3)', borderRadius:'8px', padding:'12px 16px', fontSize:'13px', color:'#e74c3c', marginBottom:'16px' }}>{erro}</div>}

        <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap:'16px' }}>
          <div style={{ background:'#0F2040', border:'1px solid #1C3558', borderRadius:'12px', padding:'24px' }}>
            <h2 style={{ fontFamily:"'Playfair Display', serif", fontSize:'16px', fontWeight:700, color:'#C9A84C', marginBottom:'16px', paddingBottom:'10px', borderBottom:'1px solid #1C3558' }}>Dados Pessoais</h2>
            <div style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
              <Campo label="CPF" campo="cpf" {...campoProps} />
              <Campo label="Data de Nascimento" campo="data_nascimento" tipo="date" {...campoProps} />
              <Campo label="Profissão" campo="profissao" {...campoProps} />
            </div>
          </div>

          <div style={{ background:'#0F2040', border:'1px solid #1C3558', borderRadius:'12px', padding:'24px' }}>
            <h2 style={{ fontFamily:"'Playfair Display', serif", fontSize:'16px', fontWeight:700, color:'#C9A84C', marginBottom:'16px', paddingBottom:'10px', borderBottom:'1px solid #1C3558' }}>Contato</h2>
            <div style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
              <Campo label="Telefone" campo="telefone" {...campoProps} />
              <Campo label="WhatsApp" campo="whatsapp" {...campoProps} />
              <Campo label="E-mail" campo="email" {...campoProps} />
            </div>
          </div>

          <div style={{ background:'#0F2040', border:'1px solid #1C3558', borderRadius:'12px', padding:'24px' }}>
            <h2 style={{ fontFamily:"'Playfair Display', serif", fontSize:'16px', fontWeight:700, color:'#C9A84C', marginBottom:'16px', paddingBottom:'10px', borderBottom:'1px solid #1C3558' }}>Endereço</h2>
            <div style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
              <Campo label="CEP" campo="cep" {...campoProps} />
              <Campo label="Endereço" campo="endereco" {...campoProps} />
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px' }}>
                <Campo label="Número" campo="numero" {...campoProps} />
                <Campo label="Complemento" campo="complemento" {...campoProps} />
              </div>
              <Campo label="Bairro" campo="bairro" {...campoProps} />
              <Campo label="Cidade" campo="cidade" {...campoProps} />
              <Campo label="UF" campo="estado" {...campoProps} />
            </div>
          </div>

          <div style={{ background:'#0F2040', border:'1px solid #1C3558', borderRadius:'12px', padding:'24px' }}>
            <h2 style={{ fontFamily:"'Playfair Display', serif", fontSize:'16px', fontWeight:700, color:'#C9A84C', marginBottom:'16px', paddingBottom:'10px', borderBottom:'1px solid #1C3558' }}>Dados Eleitorais</h2>
            <div style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
              <Campo label="Zona Eleitoral" campo="zona_eleitoral" {...campoProps} />
              <Campo label="Seção Eleitoral" campo="secao_eleitoral" {...campoProps} />
              <Campo label="Local de Votação" campo="local_votacao" {...campoProps} />
              <div>
                <div style={labelStyle}>Meta de Votos</div>
                {editando ? (
                  <input type="number" min="0" value={form.meta_votos ?? 0}
                    onChange={e => setForm(prev => ({ ...prev, meta_votos: parseInt(e.target.value) || 0 }))}
                    style={{ ...inputStyle, marginTop:'4px' }}
                    onFocus={e => e.target.style.borderColor='#C9A84C'}
                    onBlur={e => e.target.style.borderColor='#1C3558'} />
                ) : (
                  <div style={{ fontSize:'14px', color: apoiador.meta_votos ? '#86efac' : '#E8EDF5', marginTop:'4px', fontWeight: apoiador.meta_votos ? 600 : 400 }}>
                    {apoiador.meta_votos ? `${apoiador.meta_votos.toLocaleString('pt-BR')} votos` : '—'}
                  </div>
                )}
              </div>
              <Campo label="Nº Título de Eleitor" campo="titulo_eleitor" {...campoProps} />
              <Campo label="Zona do Título" campo="zona_titulo" {...campoProps} />
              <Campo label="Seção do Título" campo="secao_titulo" {...campoProps} />
              <div>
                <div style={labelStyle}>Líder Responsável</div>
                {editando ? (
                  <select value={form.lider_id || ''} onChange={e => setForm(prev => ({ ...prev, lider_id: e.target.value }))}
                    style={{ ...inputStyle, marginTop:'4px', cursor:'pointer' }}
                    onFocus={e => e.target.style.borderColor='#C9A84C'} onBlur={e => e.target.style.borderColor='#1C3558'}>
                    {lideres.map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
                  </select>
                ) : (
                  <div style={{ fontSize:'14px', color:'#E8EDF5', marginTop:'4px' }}>{apoiador.lideres_regionais?.nome || '—'}</div>
                )}
              </div>
              <div>
                <div style={labelStyle}>Observações</div>
                {editando ? (
                  <textarea value={form.observacoes || ''} onChange={e => setForm(prev => ({ ...prev, observacoes: e.target.value }))} rows={3}
                    style={{ ...inputStyle, marginTop:'4px', resize:'vertical' as const }}
                    onFocus={e => e.target.style.borderColor='#C9A84C'} onBlur={e => e.target.style.borderColor='#1C3558'} />
                ) : (
                  <div style={{ fontSize:'14px', color:'#E8EDF5', marginTop:'4px', lineHeight:1.6 }}>{apoiador.observacoes || '—'}</div>
                )}
              </div>
              <div>
                <div style={labelStyle}>Cadastrado em</div>
                <div style={{ fontSize:'14px', color:'#8FA4C0', marginTop:'4px' }}>
                  {new Date(apoiador.criado_em).toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric' })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
