'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type Material = {
  id: string
  titulo: string
  descricao: string
  tipo: string
  url: string
  thumbnail_url: string
  formato: string
  tamanho_bytes: number
  categoria: string
  ativo: boolean
  criado_em: string
}

export default function MateriaisPage() {
  const [materiais, setMateriais] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [progresso, setProgresso] = useState('')
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('')
  const [modalAberto, setModalAberto] = useState(false)
  const [form, setForm] = useState({ titulo:'', descricao:'', categoria:'', tipo:'imagem' })
  const [arquivoSelecionado, setArquivoSelecionado] = useState<File | null>(null)
  const inputFileRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function carregar() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      await carregarMateriais()
    }
    carregar()
  }, [])

  async function carregarMateriais() {
    const { data } = await supabase
      .from('materiais')
      .select('*')
      .eq('ativo', true)
      .order('criado_em', { ascending: false })
    if (data) setMateriais(data)
    setLoading(false)
  }

  function formatarTamanho(bytes: number) {
    if (!bytes) return '—'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  function iconeCategoria(tipo: string) {
    const map: Record<string, string> = { imagem:'🖼️', video:'🎬', texto:'📝', documento:'📄' }
    return map[tipo] || '📁'
  }

  async function handleUpload() {
    if (!arquivoSelecionado) { setErro('Selecione um arquivo'); return }
    if (!form.titulo) { setErro('Informe um título'); return }
    setUploading(true); setErro(''); setSucesso('')
    try {
      setProgresso('Enviando arquivo...')
      const ext = arquivoSelecionado.name.split('.').pop()
      const nomeArquivo = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('materiais')
        .upload(nomeArquivo, arquivoSelecionado)
      if (uploadError) throw uploadError
      setProgresso('Salvando informações...')
      const { data: urlData } = supabase.storage.from('materiais').getPublicUrl(nomeArquivo)
      const { error: dbError } = await supabase.from('materiais').insert({
        titulo: form.titulo,
        descricao: form.descricao,
        categoria: form.categoria,
        tipo: form.tipo,
        url: urlData.publicUrl,
        formato: ext?.toUpperCase(),
        tamanho_bytes: arquivoSelecionado.size,
        ativo: true,
      })
      if (dbError) throw dbError
      setSucesso('Material enviado com sucesso!')
      setForm({ titulo:'', descricao:'', categoria:'', tipo:'imagem' })
      setArquivoSelecionado(null)
      if (inputFileRef.current) inputFileRef.current.value = ''
      setModalAberto(false)
      await carregarMateriais()
    } catch (e: any) {
      setErro('Erro ao enviar: ' + e.message)
    }
    setProgresso(''); setUploading(false)
  }

  async function handleDeletar(material: Material) {
    if (!confirm(`Remover "${material.titulo}"?`)) return
    await supabase.from('materiais').update({ ativo: false }).eq('id', material.id)
    setMateriais(prev => prev.filter(m => m.id !== material.id))
  }

  const categorias = [...new Set(materiais.map(m => m.categoria).filter(Boolean))]
  const materiaisFiltrados = materiais.filter(m => {
    const matchTipo = filtroTipo ? m.tipo === filtroTipo : true
    const matchCat = filtroCategoria ? m.categoria === filtroCategoria : true
    return matchTipo && matchCat
  })

  const inputStyle = { padding:'10px 14px', background:'#0B1F3A', border:'1px solid #1C3558', borderRadius:'8px', color:'#E8EDF5', fontSize:'14px', outline:'none', fontFamily:'Inter, sans-serif', width:'100%', boxSizing:'border-box' as const }
  const labelStyle = { fontSize:'11px', fontWeight:600 as const, letterSpacing:'1px', textTransform:'uppercase' as const, color:'#8FA4C0', marginBottom:'6px', display:'block' as const }
  return (
    <div style={{ minHeight:'100vh', background:'#0B1F3A', fontFamily:'Inter, system-ui, sans-serif' }}>
      <div style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:0, backgroundImage:`repeating-linear-gradient(0deg, transparent, transparent 80px, rgba(201,168,76,0.02) 80px, rgba(201,168,76,0.02) 81px), repeating-linear-gradient(90deg, transparent, transparent 80px, rgba(201,168,76,0.02) 80px, rgba(201,168,76,0.02) 81px)` }} />

      {/* NAV */}
      <nav style={{ position:'fixed', top:0, left:0, right:0, zIndex:100, height:'60px', background:'rgba(11,31,58,0.97)', backdropFilter:'blur(20px)', borderBottom:'1px solid rgba(201,168,76,0.15)', display:'flex', alignItems:'center', padding:'0 28px', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'16px' }}>
          <button onClick={() => router.push('/dashboard')} style={{ background:'transparent', border:'none', color:'#8FA4C0', cursor:'pointer', fontSize:'13px', fontFamily:'Inter, sans-serif' }}>← Voltar</button>
          <div style={{ width:'1px', height:'20px', background:'#1C3558' }} />
          <span style={{ fontSize:'17px', fontWeight:700, color:'#FFFFFF', letterSpacing:'-0.3px' }}>Cand<span style={{ color:'#C9A84C' }}>Maps</span></span>
        </div>
        <button onClick={() => { setModalAberto(true); setErro(''); setSucesso('') }}
          style={{ background:'linear-gradient(135deg, #E8C87A, #A07830)', border:'none', borderRadius:'8px', color:'#0B1F3A', fontSize:'13px', fontWeight:600, padding:'9px 20px', cursor:'pointer', fontFamily:'Inter, sans-serif' }}>
          + Novo Material
        </button>
      </nav>

      <main style={{ paddingTop:'76px', padding:'76px 28px 40px', position:'relative', zIndex:1, maxWidth:'1200px', margin:'0 auto' }}>

        {/* HEADER */}
        <div style={{ marginBottom:'28px' }}>
          <div style={{ fontSize:'11px', fontWeight:600, letterSpacing:'2px', textTransform:'uppercase', color:'#C9A84C', display:'flex', alignItems:'center', gap:'8px', marginBottom:'8px' }}>
            <span style={{ width:'20px', height:'1px', background:'#A07830', display:'inline-block' }} />
            Campanha
          </div>
          <h1 style={{ fontSize:'24px', fontWeight:700, color:'#FFFFFF', letterSpacing:'-0.5px', marginBottom:'4px' }}>Biblioteca de Materiais</h1>
          <p style={{ fontSize:'14px', color:'#8FA4C0' }}>{materiais.length} material{materiais.length !== 1 ? 'is' : ''} disponíve{materiais.length !== 1 ? 'is' : 'l'} para os líderes</p>
        </div>

        {/* STATS */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(140px, 1fr))', gap:'12px', marginBottom:'24px' }}>
          {[
            { label:'Total', valor: materiais.length, cor:'#C9A84C' },
            { label:'Imagens', valor: materiais.filter(m=>m.tipo==='imagem').length, cor:'#6ba3d6' },
            { label:'Vídeos', valor: materiais.filter(m=>m.tipo==='video').length, cor:'#5eead4' },
            { label:'Documentos', valor: materiais.filter(m=>m.tipo==='documento' || m.tipo==='texto').length, cor:'#86efac' },
          ].map(s => (
            <div key={s.label} style={{ background:'#0F2040', border:'1px solid #1C3558', borderRadius:'10px', padding:'16px' }}>
              <div style={{ fontSize:'11px', textTransform:'uppercase', letterSpacing:'1px', color:'#8FA4C0', marginBottom:'6px', fontWeight:500 }}>{s.label}</div>
              <div style={{ fontSize:'28px', fontWeight:700, color:s.cor, letterSpacing:'-1px', lineHeight:1 }}>{s.valor}</div>
            </div>
          ))}
        </div>

        {/* FILTROS */}
        <div style={{ display:'flex', gap:'10px', marginBottom:'20px', flexWrap:'wrap' as const }}>
          {['', 'imagem', 'video', 'documento', 'texto'].map(tipo => (
            <button key={tipo} onClick={() => setFiltroTipo(tipo)}
              style={{ padding:'7px 16px', borderRadius:'100px', border:`1px solid ${filtroTipo === tipo ? 'rgba(201,168,76,0.5)' : '#1C3558'}`, background: filtroTipo === tipo ? 'rgba(201,168,76,0.12)' : 'transparent', color: filtroTipo === tipo ? '#C9A84C' : '#8FA4C0', fontSize:'13px', cursor:'pointer', fontFamily:'Inter, sans-serif', fontWeight: filtroTipo === tipo ? 600 : 400 }}>
              {tipo === '' ? 'Todos' : tipo.charAt(0).toUpperCase() + tipo.slice(1) + 's'}
            </button>
          ))}
          {categorias.length > 0 && (
            <select value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)}
              style={{ padding:'7px 14px', borderRadius:'100px', border:'1px solid #1C3558', background:'transparent', color:'#8FA4C0', fontSize:'13px', cursor:'pointer', fontFamily:'Inter, sans-serif', outline:'none' }}>
              <option value="">Todas as categorias</option>
              {categorias.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
        </div>

        {sucesso && <div style={{ background:'rgba(201,168,76,0.1)', border:'1px solid rgba(201,168,76,0.3)', borderRadius:'8px', padding:'12px 16px', fontSize:'13px', color:'#C9A84C', marginBottom:'16px' }}>✓ {sucesso}</div>}

        {/* GRID DE MATERIAIS */}
        {loading ? (
          <div style={{ color:'#C9A84C', fontSize:'14px' }}>Carregando materiais...</div>
        ) : materiaisFiltrados.length === 0 ? (
          <div style={{ background:'#0F2040', border:'1px solid #1C3558', borderRadius:'12px', padding:'60px', textAlign:'center' as const }}>
            <div style={{ fontSize:'48px', marginBottom:'16px' }}>🎨</div>
            <div style={{ fontSize:'18px', fontWeight:600, color:'#E8EDF5', marginBottom:'8px' }}>Nenhum material ainda</div>
            <div style={{ fontSize:'14px', color:'#8FA4C0', marginBottom:'24px' }}>Faça o upload de artes, vídeos e textos para sua equipe</div>
            <button onClick={() => setModalAberto(true)} style={{ background:'linear-gradient(135deg, #E8C87A, #A07830)', border:'none', borderRadius:'8px', color:'#0B1F3A', fontSize:'14px', fontWeight:600, padding:'12px 28px', cursor:'pointer' }}>
              + Enviar primeiro material
            </button>
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))', gap:'14px' }}>
            {materiaisFiltrados.map(material => (
              <div key={material.id} style={{ background:'#0F2040', border:'1px solid #1C3558', borderRadius:'12px', overflow:'hidden', transition:'all .2s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor='rgba(201,168,76,0.35)'; (e.currentTarget as HTMLDivElement).style.transform='translateY(-2px)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor='#1C3558'; (e.currentTarget as HTMLDivElement).style.transform='translateY(0)' }}>
                {/* Preview */}
                <div style={{ height:'160px', background:'#0B1F3A', display:'flex', alignItems:'center', justifyContent:'center', position:'relative', overflow:'hidden' }}>
                  {material.tipo === 'imagem' ? (
                    <img src={material.url} alt={material.titulo} style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={e => { (e.target as HTMLImageElement).style.display='none' }} />
                  ) : (
                    <div style={{ fontSize:'52px' }}>{iconeCategoria(material.tipo)}</div>
                  )}
                  <div style={{ position:'absolute', top:'10px', right:'10px', background:'rgba(11,31,58,0.85)', borderRadius:'6px', padding:'3px 8px', fontSize:'10px', fontWeight:600, color:'#C9A84C', letterSpacing:'0.5px' }}>
                    {material.formato || material.tipo.toUpperCase()}
                  </div>
                </div>
                {/* Info */}
                <div style={{ padding:'16px' }}>
                  <div style={{ fontSize:'14px', fontWeight:600, color:'#E8EDF5', marginBottom:'4px', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{material.titulo}</div>
                  {material.descricao && <div style={{ fontSize:'12px', color:'#8FA4C0', marginBottom:'8px', lineHeight:1.5, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{material.descricao}</div>}
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:'12px' }}>
                    <div style={{ fontSize:'11px', color:'#3D5470' }}>{formatarTamanho(material.tamanho_bytes)}</div>
                    <div style={{ display:'flex', gap:'8px' }}>
                      <a href={material.url} target="_blank" rel="noopener noreferrer"
                        style={{ padding:'5px 12px', borderRadius:'6px', background:'rgba(201,168,76,0.1)', border:'1px solid rgba(201,168,76,0.2)', color:'#C9A84C', fontSize:'12px', fontWeight:500, textDecoration:'none', cursor:'pointer' }}>
                        Baixar
                      </a>
                      <button onClick={() => handleDeletar(material)}
                        style={{ padding:'5px 10px', borderRadius:'6px', background:'rgba(192,57,43,0.1)', border:'1px solid rgba(192,57,43,0.2)', color:'#e74c3c', fontSize:'12px', cursor:'pointer', fontFamily:'Inter, sans-serif' }}>
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* MODAL DE UPLOAD */}
      {modalAberto && (
        <div style={{ position:'fixed', inset:0, zIndex:200, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', padding:'24px' }}>
          <div style={{ background:'#0F2040', border:'1px solid rgba(201,168,76,0.2)', borderRadius:'16px', padding:'32px', width:'100%', maxWidth:'500px', position:'relative' }}>
            <div style={{ position:'absolute', top:0, left:'10%', right:'10%', height:'1px', background:'linear-gradient(90deg, transparent, #C9A84C, transparent)' }} />
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'24px' }}>
              <h2 style={{ fontSize:'18px', fontWeight:700, color:'#FFFFFF', letterSpacing:'-0.3px' }}>Novo Material</h2>
              <button onClick={() => setModalAberto(false)} style={{ background:'transparent', border:'none', color:'#8FA4C0', cursor:'pointer', fontSize:'20px', lineHeight:1 }}>✕</button>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
              <div>
                <label style={labelStyle}>Título *</label>
                <input value={form.titulo} onChange={e => setForm(p=>({...p,titulo:e.target.value}))} placeholder="Nome do material" style={inputStyle} onFocus={e=>e.target.style.borderColor='#C9A84C'} onBlur={e=>e.target.style.borderColor='#1C3558'} />
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
                <div>
                  <label style={labelStyle}>Tipo *</label>
                  <select value={form.tipo} onChange={e => setForm(p=>({...p,tipo:e.target.value}))} style={{ ...inputStyle, cursor:'pointer' }} onFocus={e=>e.target.style.borderColor='#C9A84C'} onBlur={e=>e.target.style.borderColor='#1C3558'}>
                    <option value="imagem">🖼️ Imagem</option>
                    <option value="video">🎬 Vídeo</option>
                    <option value="documento">📄 Documento</option>
                    <option value="texto">📝 Texto</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Categoria</label>
                  <input value={form.categoria} onChange={e => setForm(p=>({...p,categoria:e.target.value}))} placeholder="Ex: Stories, Posts..." style={inputStyle} onFocus={e=>e.target.style.borderColor='#C9A84C'} onBlur={e=>e.target.style.borderColor='#1C3558'} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Descrição</label>
                <textarea value={form.descricao} onChange={e => setForm(p=>({...p,descricao:e.target.value}))} placeholder="Descrição ou instruções de uso..." rows={2} style={{ ...inputStyle, resize:'vertical' as const }} onFocus={e=>e.target.style.borderColor='#C9A84C'} onBlur={e=>e.target.style.borderColor='#1C3558'} />
              </div>
              <div>
                <label style={labelStyle}>Arquivo *</label>
                <div onClick={() => inputFileRef.current?.click()}
                  style={{ border:'2px dashed #1C3558', borderRadius:'8px', padding:'24px', textAlign:'center', cursor:'pointer', transition:'border-color .2s' }}
                  onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor='rgba(201,168,76,0.4)'}
                  onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor='#1C3558'}>
                  <div style={{ fontSize:'28px', marginBottom:'8px' }}>📁</div>
                  <div style={{ fontSize:'13px', color: arquivoSelecionado ? '#C9A84C' : '#8FA4C0', fontWeight: arquivoSelecionado ? 600 : 400 }}>
                    {arquivoSelecionado ? arquivoSelecionado.name : 'Clique para selecionar o arquivo'}
                  </div>
                  {arquivoSelecionado && <div style={{ fontSize:'11px', color:'#3D5470', marginTop:'4px' }}>{formatarTamanho(arquivoSelecionado.size)}</div>}
                </div>
                <input ref={inputFileRef} type="file" style={{ display:'none' }} onChange={e => setArquivoSelecionado(e.target.files?.[0] || null)} />
              </div>
              {erro && <div style={{ background:'rgba(192,57,43,0.1)', border:'1px solid rgba(192,57,43,0.3)', borderRadius:'8px', padding:'10px 14px', fontSize:'13px', color:'#e74c3c' }}>{erro}</div>}
              <div style={{ display:'flex', gap:'10px', justifyContent:'flex-end', marginTop:'4px' }}>
                <button onClick={() => setModalAberto(false)} style={{ background:'transparent', border:'1px solid #1C3558', borderRadius:'8px', color:'#8FA4C0', fontSize:'13px', padding:'10px 20px', cursor:'pointer', fontFamily:'Inter, sans-serif' }}>Cancelar</button>
                <button onClick={handleUpload} disabled={uploading} style={{ background: uploading ? 'rgba(201,168,76,0.4)' : 'linear-gradient(135deg, #E8C87A, #A07830)', border:'none', borderRadius:'8px', color:'#0B1F3A', fontSize:'13px', fontWeight:600, padding:'10px 24px', cursor: uploading ? 'not-allowed' : 'pointer', fontFamily:'Inter, sans-serif' }}>
                  {uploading ? progresso || 'Enviando...' : 'Enviar material →'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}