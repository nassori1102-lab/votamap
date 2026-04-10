'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import { useIsMobile } from '@/lib/useIsMobile'

type Lider = {
  id: string
  nome: string
  cpf: string
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
  titulo_eleitor: string
  zona_titulo: string
  secao_titulo: string
  observacoes: string
  meta_votos: number
  foto_url: string
  ativo: boolean
  criado_em: string
}

export default function LiderDetalhePage() {
  const router = useRouter()
  const params = useParams()
  const supabase = createClient()
  const isMobile = useIsMobile()
  const [lider, setLider] = useState<Lider | null>(null)
  const [editando, setEditando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState(false)
  const [totalApoiadores, setTotalApoiadores] = useState(0)
  const [form, setForm] = useState<Partial<Lider>>({})
  const [uploadandoFoto, setUploadandoFoto] = useState(false)

  function mascaraTelefone(v: string) {
    return v.replace(/\D/g,'').slice(0,11)
      .replace(/^(\d{2})(\d)/,'($1) $2')
      .replace(/(\d{5})(\d{1,4})$/,'$1-$2')
  }
  function mascaraCPF(v: string) {
    return v.replace(/\D/g,'').slice(0,11)
      .replace(/(\d{3})(\d)/,'$1.$2')
      .replace(/(\d{3})(\d)/,'$1.$2')
      .replace(/(\d{3})(\d{1,2})$/,'$1-$2')
  }
  function mascaraCEP(v: string) {
    return v.replace(/\D/g,'').slice(0,8)
      .replace(/(\d{5})(\d{1,3})$/,'$1-$2')
  }

  useEffect(() => {
    async function carregar() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data } = await supabase
        .from('lideres_regionais')
        .select('*')
        .eq('id', params.id)
        .single()
      if (data) { setLider(data); setForm(data) }
      const { count } = await supabase
        .from('apoiadores')
        .select('*', { count:'exact', head:true })
        .eq('lider_id', params.id)
      setTotalApoiadores(count || 0)
    }
    carregar()
  }, [params.id])

  function handleChange(campo: string, valor: string) {
    if (campo === 'telefone' || campo === 'whatsapp') { setForm(prev => ({ ...prev, [campo]: mascaraTelefone(valor) })); return }
    if (campo === 'cpf') { setForm(prev => ({ ...prev, [campo]: mascaraCPF(valor) })); return }
    if (campo === 'cep') {
      const mascarado = mascaraCEP(valor)
      setForm(prev => ({ ...prev, [campo]: mascarado }))
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
    setSalvando(true); setErro(''); setSucesso(false)
    const { error } = await supabase.from('lideres_regionais').update(form).eq('id', params.id)
    if (error) { setErro('Erro ao salvar: ' + error.message); setSalvando(false); return }
    setLider({ ...lider, ...form } as Lider)
    setEditando(false); setSucesso(true); setSalvando(false)
    setTimeout(() => setSucesso(false), 3000)
  }

  async function handleFotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !lider) return
    setUploadandoFoto(true)
    const ext = file.name.split('.').pop()
    const path = `${lider.id}.${ext}`
    const { error } = await supabase.storage.from('fotos-lideres').upload(path, file, { upsert: true })
    if (error) { setErro('Erro no upload: ' + error.message); setUploadandoFoto(false); return }
    const { data: urlData } = supabase.storage.from('fotos-lideres').getPublicUrl(path)
    const url = urlData.publicUrl + '?t=' + Date.now()
    await supabase.from('lideres_regionais').update({ foto_url: url }).eq('id', lider.id)
    setLider(prev => prev ? { ...prev, foto_url: url } : prev)
    setForm(prev => ({ ...prev, foto_url: url }))
    setUploadandoFoto(false)
  }

  async function toggleAtivo() {
    const novoStatus = !lider?.ativo
    await supabase.from('lideres_regionais').update({ ativo: novoStatus }).eq('id', params.id)
    setLider(prev => prev ? { ...prev, ativo: novoStatus } : prev)
  }

  const inputStyle = { padding:'10px 14px', background:'#0B1F3A', border:'1px solid #1C3558', borderRadius:'8px', color:'#E8EDF5', fontSize:'14px', outline:'none', fontFamily:"'IBM Plex Sans', sans-serif", width:'100%', boxSizing:'border-box' as const }
  const labelStyle = { fontSize:'11px', fontWeight:600 as const, letterSpacing:'1px', textTransform:'uppercase' as const, color:'#8FA4C0' }

  if (!lider) return (
    <div style={{ minHeight:'100vh', background:'#0B1F3A', display:'flex', alignItems:'center', justifyContent:'center', color:'#C9A84C', fontFamily:"'IBM Plex Sans', sans-serif" }}>
      Carregando...
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background:'#0B1F3A', fontFamily:"'IBM Plex Sans', sans-serif" }}>
      <div style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:0, backgroundImage:`repeating-linear-gradient(0deg, transparent, transparent 80px, rgba(201,168,76,0.02) 80px, rgba(201,168,76,0.02) 81px), repeating-linear-gradient(90deg, transparent, transparent 80px, rgba(201,168,76,0.02) 80px, rgba(201,168,76,0.02) 81px)` }} />

      <nav style={{ position:'fixed', top:0, left:0, right:0, zIndex:100, height:'64px', background:'rgba(11,31,58,0.95)', backdropFilter:'blur(20px)', borderBottom:'1px solid rgba(201,168,76,0.15)', display:'flex', alignItems:'center', padding: isMobile ? '0 16px' : '0 32px', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
          <button onClick={() => router.push('/dashboard/lideres')} style={{ background:'transparent', border:'none', color:'#8FA4C0', cursor:'pointer', fontSize:'13px' }}>← Voltar</button>
          {!isMobile && <>
            <div style={{ width:'1px', height:'20px', background:'#1C3558' }} />
            <span style={{ fontFamily:"'Playfair Display', serif", fontSize:'20px', fontWeight:800, color:'#FFFFFF' }}>Cand<span style={{ color:'#C9A84C' }}>Maps</span></span>
          </>}
        </div>
        <div style={{ display:'flex', gap:'8px' }}>
          {editando ? (
            <>
              <button onClick={() => { setEditando(false); setForm(lider) }} style={{ background:'transparent', border:'1px solid #1C3558', borderRadius:'8px', color:'#8FA4C0', fontSize:'13px', padding:'8px 14px', cursor:'pointer', fontFamily:"'IBM Plex Sans', sans-serif" }}>Cancelar</button>
              <button onClick={handleSalvar} disabled={salvando} style={{ background: salvando ? 'rgba(201,168,76,0.5)' : 'linear-gradient(135deg, #E8C87A, #A07830)', border:'none', borderRadius:'8px', color:'#0B1F3A', fontSize:'13px', fontWeight:600, padding:'8px 18px', cursor:'pointer', fontFamily:"'IBM Plex Sans', sans-serif" }}>
                {salvando ? 'Salvando...' : 'Salvar →'}
              </button>
            </>
          ) : (
            <button onClick={() => setEditando(true)} style={{ background:'transparent', border:'1px solid rgba(201,168,76,0.3)', borderRadius:'8px', color:'#C9A84C', fontSize:'13px', padding:'8px 18px', cursor:'pointer', fontFamily:"'IBM Plex Sans', sans-serif" }}>✏️ Editar</button>
          )}
        </div>
      </nav>

      <main style={{ paddingTop:'88px', padding: isMobile ? '80px 16px 40px' : '88px 32px 60px', position:'relative', zIndex:1, maxWidth:'860px', margin:'0 auto' }}>

        {/* HEADER DO LÍDER */}
        <div style={{ display:'flex', alignItems:'flex-start', gap:'16px', marginBottom:'24px', background:'#0F2040', border:'1px solid #1C3558', borderRadius:'12px', padding: isMobile ? '20px' : '28px', flexWrap:'wrap' as const }}>
          <div style={{ position:'relative', flexShrink:0 }}>
            <div style={{ width:'72px', height:'72px', borderRadius:'50%', background:'rgba(201,168,76,0.15)', border:'2px solid rgba(201,168,76,0.3)', overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'26px', fontWeight:700, color:'#C9A84C' }}>
              {lider.foto_url
                ? <img src={lider.foto_url} alt={lider.nome} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                : lider.nome.charAt(0).toUpperCase()
              }
            </div>
            <label style={{ position:'absolute', bottom:0, right:0, width:'24px', height:'24px', borderRadius:'50%', background: uploadandoFoto ? '#1C3558' : '#C9A84C', border:'2px solid #0F2040', display:'flex', alignItems:'center', justifyContent:'center', cursor: uploadandoFoto ? 'wait' : 'pointer', fontSize:'12px' }}
              title="Trocar foto">
              {uploadandoFoto ? '⏳' : '📷'}
              <input type="file" accept="image/*" onChange={handleFotoUpload} style={{ display:'none' }} />
            </label>
          </div>
          <div style={{ flex:1, minWidth:'200px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'6px', flexWrap:'wrap' as const }}>
              <h1 style={{ fontFamily:"'Playfair Display', serif", fontSize: isMobile ? '20px' : '26px', fontWeight:800, color:'#FFFFFF' }}>{lider.nome}</h1>
              <div style={{ fontSize:'11px', fontWeight:600, padding:'3px 12px', borderRadius:'100px', background: lider.ativo ? 'rgba(201,168,76,0.1)' : 'rgba(192,57,43,0.1)', border:`1px solid ${lider.ativo ? 'rgba(201,168,76,0.2)' : 'rgba(192,57,43,0.2)'}`, color: lider.ativo ? '#C9A84C' : '#e74c3c' }}>
                {lider.ativo ? 'Ativo' : 'Inativo'}
              </div>
            </div>
            <p style={{ fontSize:'14px', color:'#8FA4C0', marginBottom:'16px' }}>{lider.bairro} · {lider.cidade}/{lider.estado}</p>
            <div style={{ display:'flex', gap:'20px', flexWrap:'wrap' as const }}>
              <div style={{ textAlign:'center' as const }}>
                <div style={{ fontFamily:"'Playfair Display', serif", fontSize:'26px', fontWeight:800, color:'#C9A84C' }}>{totalApoiadores}</div>
                <div style={{ fontSize:'11px', color:'#8FA4C0', textTransform:'uppercase' as const, letterSpacing:'1px' }}>Apoiadores</div>
              </div>
              {lider.meta_votos > 0 && <div style={{ textAlign:'center' as const }}>
                <div style={{ fontFamily:"'Playfair Display', serif", fontSize:'26px', fontWeight:800, color:'#86efac' }}>{lider.meta_votos.toLocaleString('pt-BR')}</div>
                <div style={{ fontSize:'11px', color:'#8FA4C0', textTransform:'uppercase' as const, letterSpacing:'1px' }}>Meta de votos</div>
              </div>}
              {lider.zona_eleitoral && <div style={{ textAlign:'center' as const }}>
                <div style={{ fontFamily:"'Playfair Display', serif", fontSize:'26px', fontWeight:800, color:'#6ba3d6' }}>{lider.zona_eleitoral}</div>
                <div style={{ fontSize:'11px', color:'#8FA4C0', textTransform:'uppercase' as const, letterSpacing:'1px' }}>Zona</div>
              </div>}
              {lider.secao_eleitoral && <div style={{ textAlign:'center' as const }}>
                <div style={{ fontFamily:"'Playfair Display', serif", fontSize:'26px', fontWeight:800, color:'#5eead4' }}>{lider.secao_eleitoral}</div>
                <div style={{ fontSize:'11px', color:'#8FA4C0', textTransform:'uppercase' as const, letterSpacing:'1px' }}>Seção</div>
              </div>}
            </div>
          </div>
          <div style={{ display:'flex', flexDirection: isMobile ? 'row' : 'column' as const, gap:'8px', width: isMobile ? '100%' : 'auto' }}>
            <button onClick={() => router.push(`/dashboard/apoiadores?lider=${lider.id}`)} style={{ flex: isMobile ? 1 : undefined, background:'rgba(201,168,76,0.1)', border:'1px solid rgba(201,168,76,0.2)', borderRadius:'8px', color:'#C9A84C', fontSize:'13px', padding:'10px 16px', cursor:'pointer', fontFamily:"'IBM Plex Sans', sans-serif", whiteSpace:'nowrap' as const }}>
              👥 Ver apoiadores
            </button>
            <button onClick={toggleAtivo} style={{ flex: isMobile ? 1 : undefined, background: lider.ativo ? 'rgba(192,57,43,0.1)' : 'rgba(34,197,94,0.1)', border:`1px solid ${lider.ativo ? 'rgba(192,57,43,0.2)' : 'rgba(34,197,94,0.2)'}`, borderRadius:'8px', color: lider.ativo ? '#e74c3c' : '#22c55e', fontSize:'13px', padding:'10px 16px', cursor:'pointer', fontFamily:"'IBM Plex Sans', sans-serif", whiteSpace:'nowrap' as const }}>
              {lider.ativo ? '⛔ Desativar' : '✅ Ativar'}
            </button>
          </div>
        </div>

        {sucesso && <div style={{ background:'rgba(201,168,76,0.1)', border:'1px solid rgba(201,168,76,0.3)', borderRadius:'8px', padding:'12px 16px', fontSize:'13px', color:'#C9A84C', marginBottom:'16px' }}>✓ Dados salvos com sucesso!</div>}
        {erro && <div style={{ background:'rgba(192,57,43,0.1)', border:'1px solid rgba(192,57,43,0.3)', borderRadius:'8px', padding:'12px 16px', fontSize:'13px', color:'#e74c3c', marginBottom:'16px' }}>{erro}</div>}

        <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap:'16px' }}>

          {/* DADOS PESSOAIS */}
          <div style={{ background:'#0F2040', border:'1px solid #1C3558', borderRadius:'12px', padding:'24px' }}>
            <h2 style={{ fontFamily:"'Playfair Display', serif", fontSize:'16px', fontWeight:700, color:'#C9A84C', marginBottom:'16px', paddingBottom:'10px', borderBottom:'1px solid #1C3558' }}>Dados Pessoais</h2>
            <div style={{ display:'flex', flexDirection:'column' as const, gap:'14px' }}>
              {[['Nome', 'nome'],['CPF','cpf'],['E-mail','email']].map(([label, campo]) => (
                <div key={campo}>
                  <div style={labelStyle}>{label}</div>
                  {editando
                    ? <input value={form[campo as keyof typeof form] as string || ''} onChange={e => handleChange(campo, e.target.value)} style={{ ...inputStyle, marginTop:'4px' }} onFocus={e => e.target.style.borderColor='#C9A84C'} onBlur={e => e.target.style.borderColor='#1C3558'} />
                    : <div style={{ fontSize:'14px', color:'#E8EDF5', marginTop:'4px' }}>{lider[campo as keyof Lider] as string || '—'}</div>
                  }
                </div>
              ))}
            </div>
          </div>

          {/* CONTATO */}
          <div style={{ background:'#0F2040', border:'1px solid #1C3558', borderRadius:'12px', padding:'24px' }}>
            <h2 style={{ fontFamily:"'Playfair Display', serif", fontSize:'16px', fontWeight:700, color:'#C9A84C', marginBottom:'16px', paddingBottom:'10px', borderBottom:'1px solid #1C3558' }}>Contato</h2>
            <div style={{ display:'flex', flexDirection:'column' as const, gap:'14px' }}>
              {[['Telefone','telefone'],['WhatsApp','whatsapp']].map(([label, campo]) => (
                <div key={campo}>
                  <div style={labelStyle}>{label}</div>
                  {editando
                    ? <input value={form[campo as keyof typeof form] as string || ''} onChange={e => handleChange(campo, e.target.value)} style={{ ...inputStyle, marginTop:'4px' }} onFocus={e => e.target.style.borderColor='#C9A84C'} onBlur={e => e.target.style.borderColor='#1C3558'} />
                    : <div style={{ fontSize:'14px', color:'#E8EDF5', marginTop:'4px' }}>{lider[campo as keyof Lider] as string || '—'}</div>
                  }
                </div>
              ))}
            </div>
          </div>

          {/* ENDEREÇO */}
          <div style={{ background:'#0F2040', border:'1px solid #1C3558', borderRadius:'12px', padding:'24px' }}>
            <h2 style={{ fontFamily:"'Playfair Display', serif", fontSize:'16px', fontWeight:700, color:'#C9A84C', marginBottom:'16px', paddingBottom:'10px', borderBottom:'1px solid #1C3558' }}>Endereço</h2>
            <div style={{ display:'flex', flexDirection:'column' as const, gap:'14px' }}>
              {[['CEP','cep'],['Endereço','endereco'],['Número','numero'],['Complemento','complemento'],['Bairro','bairro'],['Cidade','cidade'],['Estado','estado']].map(([label, campo]) => (
                <div key={campo}>
                  <div style={labelStyle}>{label}</div>
                  {editando
                    ? <input value={form[campo as keyof typeof form] as string || ''} onChange={e => handleChange(campo, e.target.value)} style={{ ...inputStyle, marginTop:'4px' }} onFocus={e => e.target.style.borderColor='#C9A84C'} onBlur={e => e.target.style.borderColor='#1C3558'} />
                    : <div style={{ fontSize:'14px', color:'#E8EDF5', marginTop:'4px' }}>{lider[campo as keyof Lider] as string || '—'}</div>
                  }
                </div>
              ))}
            </div>
          </div>

          {/* DADOS ELEITORAIS E OBSERVAÇÕES */}
          <div style={{ background:'#0F2040', border:'1px solid #1C3558', borderRadius:'12px', padding:'24px' }}>
            <h2 style={{ fontFamily:"'Playfair Display', serif", fontSize:'16px', fontWeight:700, color:'#C9A84C', marginBottom:'16px', paddingBottom:'10px', borderBottom:'1px solid #1C3558' }}>Dados Eleitorais</h2>
            <div style={{ display:'flex', flexDirection:'column' as const, gap:'14px' }}>
              {/* META DE VOTOS */}
              <div>
                <div style={{ ...labelStyle, marginBottom:'4px' }}>Meta de votos comprometida</div>
                {editando
                  ? <input type="number" min="0" value={form.meta_votos || ''} onChange={e => setForm(prev => ({ ...prev, meta_votos: parseInt(e.target.value) || 0 }))} placeholder="Ex: 150" style={{ ...inputStyle, marginTop:'4px' }} onFocus={e => e.target.style.borderColor='#C9A84C'} onBlur={e => e.target.style.borderColor='#1C3558'} />
                  : <div style={{ fontSize:'14px', color: lider.meta_votos > 0 ? '#86efac' : '#3D5470', marginTop:'4px', fontWeight: lider.meta_votos > 0 ? 600 : 400 }}>
                      {lider.meta_votos > 0 ? `${lider.meta_votos.toLocaleString('pt-BR')} votos` : 'Não definida'}
                    </div>
                }
              </div>
              {[['Zona Eleitoral','zona_eleitoral'],['Seção Eleitoral','secao_eleitoral'],['Nº Título de Eleitor','titulo_eleitor'],['Zona do Título','zona_titulo'],['Seção do Título','secao_titulo']].map(([label, campo]) => (
                <div key={campo}>
                  <div style={labelStyle}>{label}</div>
                  {editando
                    ? <input value={form[campo as keyof typeof form] as string || ''} onChange={e => handleChange(campo, e.target.value)} style={{ ...inputStyle, marginTop:'4px' }} onFocus={e => e.target.style.borderColor='#C9A84C'} onBlur={e => e.target.style.borderColor='#1C3558'} />
                    : <div style={{ fontSize:'14px', color:'#E8EDF5', marginTop:'4px' }}>{lider[campo as keyof Lider] as string || '—'}</div>
                  }
                </div>
              ))}
              <div>
                <div style={labelStyle}>Observações</div>
                {editando
                  ? <textarea value={form.observacoes || ''} onChange={e => handleChange('observacoes', e.target.value)} rows={4} style={{ ...inputStyle, marginTop:'4px', resize:'vertical' as const }} onFocus={e => e.target.style.borderColor='#C9A84C'} onBlur={e => e.target.style.borderColor='#1C3558'} />
                  : <div style={{ fontSize:'14px', color:'#E8EDF5', marginTop:'4px', lineHeight:1.6 }}>{lider.observacoes || '—'}</div>
                }
              </div>
              <div>
                <div style={labelStyle}>Cadastrado em</div>
                <div style={{ fontSize:'14px', color:'#8FA4C0', marginTop:'4px' }}>
                  {new Date(lider.criado_em).toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric' })}
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  )
}
