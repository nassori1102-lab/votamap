'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type Despesa = {
  id: string; descricao: string; categoria: string; valor: number; data: string
  regiao: string; observacoes: string; lider_id: string; nome_fornecedor: string
  cnpj_cpf_fornecedor: string; numero_documento: string; tipo_documento: string
  forma_pagamento: string; data_pagamento: string
  lideres_regionais?: { nome: string }
}

type Receita = {
  id: string; tipo: string; descricao: string; valor: number; data: string
  nome_doador: string; cpf_cnpj_doador: string; numero_recibo: string; observacoes: string
}

type Lider = { id: string; nome: string; cidade: string }

export default function FinanceiroPage() {
  const [despesas, setDespesas] = useState<Despesa[]>([])
  const [receitas, setReceitas] = useState<Receita[]>([])
  const [lideres, setLideres] = useState<Lider[]>([])
  const [loading, setLoading] = useState(true)
  const [aba, setAba] = useState<'despesas'|'receitas'|'relatorio'>('despesas')
  const [modalDespesa, setModalDespesa] = useState(false)
  const [modalReceita, setModalReceita] = useState(false)
  const [editandoDespesa, setEditandoDespesa] = useState<Despesa | null>(null)
  const [editandoReceita, setEditandoReceita] = useState<Receita | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const [formDespesa, setFormDespesa] = useState({
    descricao:'', categoria:'evento', valor:'', data: new Date().toISOString().split('T')[0],
    regiao:'', lider_id:'', nome_fornecedor:'', cnpj_cpf_fornecedor:'',
    numero_documento:'', tipo_documento:'nota_fiscal', forma_pagamento:'pix',
    data_pagamento: new Date().toISOString().split('T')[0], observacoes:'',
  })

  const [formReceita, setFormReceita] = useState({
    tipo:'recursos_proprios', descricao:'', valor:'',
    data: new Date().toISOString().split('T')[0],
    nome_doador:'', cpf_cnpj_doador:'', numero_recibo:'', observacoes:'',
  })

  useEffect(() => {
    async function carregar() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      await Promise.all([carregarDespesas(), carregarReceitas()])
      const { data: lid } = await supabase.from('lideres_regionais').select('id, nome, cidade').eq('ativo', true).order('nome')
      if (lid) setLideres(lid)
      setLoading(false)
    }
    carregar()
  }, [])

  async function carregarDespesas() {
    const { data } = await supabase.from('investimentos').select('*, lideres_regionais(nome)').order('data', { ascending: false })
    if (data) setDespesas(data)
  }

  async function carregarReceitas() {
    const { data } = await supabase.from('receitas').select('*').order('data', { ascending: false })
    if (data) setReceitas(data)
  }

  function formatarMoeda(valor: number) {
    return new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(valor || 0)
  }

  function formatarData(data: string) {
    if (!data) return '—'
    return new Date(data + 'T00:00:00').toLocaleDateString('pt-BR')
  }

  function mascaraMoeda(v: string) {
    const num = v.replace(/\D/g,'')
    if (!num) return ''
    const val = parseInt(num) / 100
    return val.toLocaleString('pt-BR', { minimumFractionDigits:2, maximumFractionDigits:2 })
  }

  function mascaraCNPJCPF(v: string) {
    const num = v.replace(/\D/g,'').slice(0,14)
    if (num.length <= 11) return num.replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d{1,2})$/,'$1-$2')
    return num.replace(/(\d{2})(\d)/,'$1.$2').replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d)/,'$1/$2').replace(/(\d{4})(\d{1,2})$/,'$1-$2')
  }

  function abrirEditarDespesa(d: Despesa) {
    setFormDespesa({
      descricao: d.descricao || '', categoria: d.categoria || 'evento',
      valor: d.valor ? d.valor.toLocaleString('pt-BR', { minimumFractionDigits:2 }) : '',
      data: d.data || '', regiao: d.regiao || '', lider_id: d.lider_id || '',
      nome_fornecedor: d.nome_fornecedor || '', cnpj_cpf_fornecedor: d.cnpj_cpf_fornecedor || '',
      numero_documento: d.numero_documento || '', tipo_documento: d.tipo_documento || 'nota_fiscal',
      forma_pagamento: d.forma_pagamento || 'pix', data_pagamento: d.data_pagamento || d.data || '',
      observacoes: d.observacoes || '',
    })
    setEditandoDespesa(d); setModalDespesa(true); setErro('')
  }

  function abrirEditarReceita(r: Receita) {
    setFormReceita({
      tipo: r.tipo || 'recursos_proprios', descricao: r.descricao || '',
      valor: r.valor ? r.valor.toLocaleString('pt-BR', { minimumFractionDigits:2 }) : '',
      data: r.data || '', nome_doador: r.nome_doador || '',
      cpf_cnpj_doador: r.cpf_cnpj_doador || '', numero_recibo: r.numero_recibo || '',
      observacoes: r.observacoes || '',
    })
    setEditandoReceita(r); setModalReceita(true); setErro('')
  }

  async function salvarDespesa() {
    if (!formDespesa.descricao) { setErro('Informe a descrição'); return }
    if (!formDespesa.valor) { setErro('Informe o valor'); return }
    setSalvando(true); setErro('')
    const dados = {
      descricao: formDespesa.descricao, categoria: formDespesa.categoria,
      valor: parseFloat(formDespesa.valor.replace(/\./g,'').replace(',','.')),
      data: formDespesa.data, regiao: formDespesa.regiao,
      lider_id: formDespesa.lider_id || null,
      nome_fornecedor: formDespesa.nome_fornecedor,
      cnpj_cpf_fornecedor: formDespesa.cnpj_cpf_fornecedor,
      numero_documento: formDespesa.numero_documento,
      tipo_documento: formDespesa.tipo_documento,
      forma_pagamento: formDespesa.forma_pagamento,
      data_pagamento: formDespesa.data_pagamento || null,
      observacoes: formDespesa.observacoes,
    }
    const { error } = editandoDespesa
      ? await supabase.from('investimentos').update(dados).eq('id', editandoDespesa.id)
      : await supabase.from('investimentos').insert(dados)
    if (error) { setErro('Erro: ' + error.message); setSalvando(false); return }
    await carregarDespesas()
    setModalDespesa(false); setEditandoDespesa(null); setSalvando(false)
    setSucesso(editandoDespesa ? 'Despesa atualizada!' : 'Despesa registrada!')
    setTimeout(() => setSucesso(''), 3000)
  }

  async function salvarReceita() {
    if (!formReceita.descricao) { setErro('Informe a descrição'); return }
    if (!formReceita.valor) { setErro('Informe o valor'); return }
    setSalvando(true); setErro('')
    const dados = {
      tipo: formReceita.tipo, descricao: formReceita.descricao,
      valor: parseFloat(formReceita.valor.replace(/\./g,'').replace(',','.')),
      data: formReceita.data, nome_doador: formReceita.nome_doador,
      cpf_cnpj_doador: formReceita.cpf_cnpj_doador,
      numero_recibo: formReceita.numero_recibo, observacoes: formReceita.observacoes,
    }
    const { error } = editandoReceita
      ? await supabase.from('receitas').update(dados).eq('id', editandoReceita.id)
      : await supabase.from('receitas').insert(dados)
    if (error) { setErro('Erro: ' + error.message); setSalvando(false); return }
    await carregarReceitas()
    setModalReceita(false); setEditandoReceita(null); setSalvando(false)
    setSucesso(editandoReceita ? 'Receita atualizada!' : 'Receita registrada!')
    setTimeout(() => setSucesso(''), 3000)
  }

  const totalDespesas = despesas.reduce((s,d) => s + Number(d.valor), 0)
  const totalReceitas = receitas.reduce((s,r) => s + Number(r.valor), 0)
  const saldo = totalReceitas - totalDespesas

  const categoriasDesp: Record<string,{label:string;cor:string;icone:string}> = {
    evento:{label:'Evento',cor:'#C9A84C',icone:'🎪'},
    material_grafico:{label:'Material Gráfico',cor:'#6ba3d6',icone:'🖨️'},
    midia:{label:'Mídia',cor:'#5eead4',icone:'📺'},
    transporte:{label:'Transporte',cor:'#86efac',icone:'🚗'},
    alimentacao:{label:'Alimentação',cor:'#f9a8d4',icone:'🍽️'},
    outros:{label:'Outros',cor:'#8FA4C0',icone:'📦'},
  }

  const tiposReceita: Record<string,{label:string;cor:string}> = {
    recursos_proprios:{label:'Recursos Próprios',cor:'#C9A84C'},
    fundo_eleitoral:{label:'Fundo Eleitoral',cor:'#6ba3d6'},
    doacao_pf:{label:'Doação PF',cor:'#5eead4'},
    doacao_pj:{label:'Doação PJ',cor:'#86efac'},
    financiamento_coletivo:{label:'Financiamento Coletivo',cor:'#f9a8d4'},
    outros:{label:'Outros',cor:'#8FA4C0'},
  }

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
        <div style={{ display:'flex', gap:'10px' }}>
          {aba === 'receitas' && <button onClick={() => { setEditandoReceita(null); setFormReceita({ tipo:'recursos_proprios', descricao:'', valor:'', data: new Date().toISOString().split('T')[0], nome_doador:'', cpf_cnpj_doador:'', numero_recibo:'', observacoes:'' }); setModalReceita(true); setErro('') }} style={{ background:'linear-gradient(135deg, #E8C87A, #A07830)', border:'none', borderRadius:'8px', color:'#0B1F3A', fontSize:'13px', fontWeight:600, padding:'9px 18px', cursor:'pointer', fontFamily:'Inter, sans-serif' }}>+ Nova Receita</button>}
          {aba === 'despesas' && <button onClick={() => { setEditandoDespesa(null); setFormDespesa({ descricao:'', categoria:'evento', valor:'', data: new Date().toISOString().split('T')[0], regiao:'', lider_id:'', nome_fornecedor:'', cnpj_cpf_fornecedor:'', numero_documento:'', tipo_documento:'nota_fiscal', forma_pagamento:'pix', data_pagamento: new Date().toISOString().split('T')[0], observacoes:'' }); setModalDespesa(true); setErro('') }} style={{ background:'linear-gradient(135deg, #E8C87A, #A07830)', border:'none', borderRadius:'8px', color:'#0B1F3A', fontSize:'13px', fontWeight:600, padding:'9px 18px', cursor:'pointer', fontFamily:'Inter, sans-serif' }}>+ Nova Despesa</button>}
        </div>
      </nav>

      <main style={{ paddingTop:'76px', padding:'76px 28px 40px', position:'relative', zIndex:1, maxWidth:'1200px', margin:'0 auto' }}>
        <div style={{ marginBottom:'24px' }}>
          <div style={{ fontSize:'11px', fontWeight:600, letterSpacing:'2px', textTransform:'uppercase', color:'#C9A84C', display:'flex', alignItems:'center', gap:'8px', marginBottom:'8px' }}><span style={{ width:'20px', height:'1px', background:'#A07830', display:'inline-block' }} />Financeiro</div>
          <h1 style={{ fontSize:'24px', fontWeight:700, color:'#FFFFFF', letterSpacing:'-0.5px' }}>Gestão Financeira da Campanha</h1>
        </div>

        {/* CARDS RESUMO */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'14px', marginBottom:'24px' }}>
          <div style={{ background:'rgba(201,168,76,0.08)', border:'1px solid rgba(201,168,76,0.2)', borderRadius:'10px', padding:'20px' }}>
            <div style={{ fontSize:'11px', textTransform:'uppercase', letterSpacing:'1px', color:'#8FA4C0', marginBottom:'6px', fontWeight:500 }}>Total Receitas</div>
            <div style={{ fontSize:'28px', fontWeight:700, color:'#C9A84C', letterSpacing:'-1px' }}>{formatarMoeda(totalReceitas)}</div>
          </div>
          <div style={{ background:'rgba(192,57,43,0.08)', border:'1px solid rgba(192,57,43,0.2)', borderRadius:'10px', padding:'20px' }}>
            <div style={{ fontSize:'11px', textTransform:'uppercase', letterSpacing:'1px', color:'#8FA4C0', marginBottom:'6px', fontWeight:500 }}>Total Despesas</div>
            <div style={{ fontSize:'28px', fontWeight:700, color:'#e74c3c', letterSpacing:'-1px' }}>{formatarMoeda(totalDespesas)}</div>
          </div>
          <div style={{ background: saldo >= 0 ? 'rgba(34,197,94,0.08)' : 'rgba(192,57,43,0.08)', border:`1px solid ${saldo >= 0 ? 'rgba(34,197,94,0.2)' : 'rgba(192,57,43,0.2)'}`, borderRadius:'10px', padding:'20px' }}>
            <div style={{ fontSize:'11px', textTransform:'uppercase', letterSpacing:'1px', color:'#8FA4C0', marginBottom:'6px', fontWeight:500 }}>Saldo</div>
            <div style={{ fontSize:'28px', fontWeight:700, color: saldo >= 0 ? '#22c55e' : '#e74c3c', letterSpacing:'-1px', lineHeight:1, whiteSpace:'nowrap' }}>{formatarMoeda(saldo)}</div>
          </div>
        </div>

        {/* ALERTA PRAZOS TSE */}
        <div style={{ background:'rgba(201,168,76,0.06)', border:'1px solid rgba(201,168,76,0.2)', borderRadius:'10px', padding:'16px 20px', marginBottom:'24px', display:'flex', alignItems:'flex-start', gap:'12px' }}>
          <div style={{ fontSize:'20px', flexShrink:0 }}>⚠️</div>
          <div>
            <div style={{ fontSize:'13px', fontWeight:600, color:'#C9A84C', marginBottom:'4px' }}>Prazos obrigatórios TSE — Eleições 2026</div>
            <div style={{ fontSize:'12px', color:'#8FA4C0', lineHeight:1.7 }}>
              📅 <strong style={{ color:'#E8EDF5' }}>Prestação parcial 1:</strong> 9 a 13 de setembro de 2026 &nbsp;|&nbsp;
              📅 <strong style={{ color:'#E8EDF5' }}>Prestação parcial 2:</strong> conforme resolução TSE &nbsp;|&nbsp;
              📅 <strong style={{ color:'#E8EDF5' }}>Prestação final:</strong> até 30 dias após a eleição &nbsp;|&nbsp;
              ⚡ <strong style={{ color:'#E8EDF5' }}>Doações:</strong> lançar no SPCE em até 72h
            </div>
          </div>
        </div>

        {sucesso && <div style={{ background:'rgba(201,168,76,0.1)', border:'1px solid rgba(201,168,76,0.3)', borderRadius:'8px', padding:'12px 16px', fontSize:'13px', color:'#C9A84C', marginBottom:'16px' }}>✓ {sucesso}</div>}

        {/* ABAS */}
        <div style={{ display:'flex', gap:'4px', marginBottom:'20px', background:'#0F2040', borderRadius:'10px', padding:'4px', width:'fit-content' }}>
          {[['despesas','💸 Despesas'],['receitas','💰 Receitas'],['relatorio','📋 Relatório TSE']].map(([key,label]) => (
            <button key={key} onClick={() => setAba(key as any)}
              style={{ padding:'9px 20px', borderRadius:'8px', border:'none', background: aba === key ? 'linear-gradient(135deg, #E8C87A, #A07830)' : 'transparent', color: aba === key ? '#0B1F3A' : '#8FA4C0', fontSize:'13px', fontWeight: aba === key ? 600 : 400, cursor:'pointer', fontFamily:'Inter, sans-serif', transition:'all .2s' }}>
              {label}
            </button>
          ))}
        </div>

        {/* ABA DESPESAS */}
        {aba === 'despesas' && (
          loading ? <div style={{ color:'#C9A84C', fontSize:'14px' }}>Carregando...</div>
          : despesas.length === 0 ? (
            <div style={{ background:'#0F2040', border:'1px solid #1C3558', borderRadius:'12px', padding:'60px', textAlign:'center' as const }}>
              <div style={{ fontSize:'48px', marginBottom:'16px' }}>💸</div>
              <div style={{ fontSize:'18px', fontWeight:600, color:'#E8EDF5', marginBottom:'8px' }}>Nenhuma despesa registrada</div>
              <button onClick={() => setModalDespesa(true)} style={{ background:'linear-gradient(135deg, #E8C87A, #A07830)', border:'none', borderRadius:'8px', color:'#0B1F3A', fontSize:'14px', fontWeight:600, padding:'12px 28px', cursor:'pointer', marginTop:'8px' }}>+ Registrar despesa</button>
            </div>
          ) : (
            <div style={{ background:'#0F2040', border:'1px solid #1C3558', borderRadius:'12px', overflow:'hidden' }}>
              <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr 100px 60px', padding:'12px 20px', borderBottom:'1px solid #1C3558', fontSize:'11px', fontWeight:600, letterSpacing:'1px', textTransform:'uppercase' as const, color:'#8FA4C0' }}>
                <span>Descrição / Fornecedor</span><span>Categoria</span><span>Forma Pgto</span><span>Data</span><span>Doc.</span><span style={{ textAlign:'right' as const }}>Valor</span><span></span>
              </div>
              {despesas.map((d,i) => {
                const cat = categoriasDesp[d.categoria]
                return (
                  <div key={d.id} style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr 100px 60px', padding:'13px 20px', borderBottom: i < despesas.length-1 ? '1px solid rgba(28,53,88,0.5)' : 'none', alignItems:'center' }}
                    onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background='rgba(201,168,76,0.02)'}
                    onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background='transparent'}>
                    <div>
                      <div style={{ fontSize:'14px', fontWeight:500, color:'#E8EDF5' }}>{d.descricao}</div>
                      {d.nome_fornecedor && <div style={{ fontSize:'11px', color:'#8FA4C0' }}>{d.nome_fornecedor} {d.cnpj_cpf_fornecedor ? `· ${d.cnpj_cpf_fornecedor}` : ''}</div>}
                    </div>
                    <div style={{ fontSize:'12px', color: cat?.cor || '#8FA4C0' }}>{cat?.icone} {cat?.label}</div>
                    <div style={{ fontSize:'12px', color:'#8FA4C0', textTransform:'capitalize' as const }}>{d.forma_pagamento || '—'}</div>
                    <div style={{ fontSize:'12px', color:'#8FA4C0' }}>{formatarData(d.data)}</div>
                    <div style={{ fontSize:'11px', color:'#8FA4C0' }}>{d.numero_documento || '—'}</div>
                    <div style={{ fontSize:'14px', fontWeight:600, color:'#e74c3c', textAlign:'right' as const }}>{formatarMoeda(Number(d.valor))}</div>
                    <div style={{ display:'flex', justifyContent:'center' }}>
                      <button onClick={() => abrirEditarDespesa(d)} style={{ background:'rgba(201,168,76,0.1)', border:'1px solid rgba(201,168,76,0.2)', borderRadius:'6px', color:'#C9A84C', fontSize:'11px', padding:'4px 8px', cursor:'pointer', fontFamily:'Inter, sans-serif' }}>✏️</button>
                    </div>
                  </div>
                )
              })}
              <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr 100px 60px', padding:'13px 20px', borderTop:'1px solid #1C3558', background:'rgba(192,57,43,0.03)' }}>
                <div style={{ fontSize:'13px', fontWeight:600, color:'#8FA4C0', gridColumn:'span 5' }}>Total despesas</div>
                <div style={{ fontSize:'16px', fontWeight:700, color:'#e74c3c', textAlign:'right' as const }}>{formatarMoeda(totalDespesas)}</div>
              </div>
            </div>
          )
        )}

        {/* ABA RECEITAS */}
        {aba === 'receitas' && (
          loading ? <div style={{ color:'#C9A84C', fontSize:'14px' }}>Carregando...</div>
          : receitas.length === 0 ? (
            <div style={{ background:'#0F2040', border:'1px solid #1C3558', borderRadius:'12px', padding:'60px', textAlign:'center' as const }}>
              <div style={{ fontSize:'48px', marginBottom:'16px' }}>💰</div>
              <div style={{ fontSize:'18px', fontWeight:600, color:'#E8EDF5', marginBottom:'8px' }}>Nenhuma receita registrada</div>
              <button onClick={() => setModalReceita(true)} style={{ background:'linear-gradient(135deg, #E8C87A, #A07830)', border:'none', borderRadius:'8px', color:'#0B1F3A', fontSize:'14px', fontWeight:600, padding:'12px 28px', cursor:'pointer', marginTop:'8px' }}>+ Registrar receita</button>
            </div>
          ) : (
            <div style={{ background:'#0F2040', border:'1px solid #1C3558', borderRadius:'12px', overflow:'hidden' }}>
              <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr 100px 60px', padding:'12px 20px', borderBottom:'1px solid #1C3558', fontSize:'11px', fontWeight:600, letterSpacing:'1px', textTransform:'uppercase' as const, color:'#8FA4C0' }}>
                <span>Descrição / Doador</span><span>Tipo</span><span>Recibo</span><span>Data</span><span style={{ textAlign:'right' as const }}>Valor</span><span></span>
              </div>
              {receitas.map((r,i) => {
                const tipo = tiposReceita[r.tipo]
                return (
                  <div key={r.id} style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr 100px 60px', padding:'13px 20px', borderBottom: i < receitas.length-1 ? '1px solid rgba(28,53,88,0.5)' : 'none', alignItems:'center' }}
                    onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background='rgba(201,168,76,0.02)'}
                    onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background='transparent'}>
                    <div>
                      <div style={{ fontSize:'14px', fontWeight:500, color:'#E8EDF5' }}>{r.descricao}</div>
                      {r.nome_doador && <div style={{ fontSize:'11px', color:'#8FA4C0' }}>{r.nome_doador} {r.cpf_cnpj_doador ? `· ${r.cpf_cnpj_doador}` : ''}</div>}
                    </div>
                    <div style={{ fontSize:'12px', color: tipo?.cor || '#8FA4C0' }}>{tipo?.label}</div>
                    <div style={{ fontSize:'12px', color:'#8FA4C0' }}>{r.numero_recibo || '—'}</div>
                    <div style={{ fontSize:'12px', color:'#8FA4C0' }}>{formatarData(r.data)}</div>
                    <div style={{ fontSize:'14px', fontWeight:600, color:'#22c55e', textAlign:'right' as const }}>{formatarMoeda(Number(r.valor))}</div>
                    <div style={{ display:'flex', justifyContent:'center' }}>
                      <button onClick={() => abrirEditarReceita(r)} style={{ background:'rgba(201,168,76,0.1)', border:'1px solid rgba(201,168,76,0.2)', borderRadius:'6px', color:'#C9A84C', fontSize:'11px', padding:'4px 8px', cursor:'pointer', fontFamily:'Inter, sans-serif' }}>✏️</button>
                    </div>
                  </div>
                )
              })}
              <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr 100px 60px', padding:'13px 20px', borderTop:'1px solid #1C3558', background:'rgba(34,197,94,0.03)' }}>
                <div style={{ fontSize:'13px', fontWeight:600, color:'#8FA4C0', gridColumn:'span 4' }}>Total receitas</div>
                <div style={{ fontSize:'16px', fontWeight:700, color:'#22c55e', textAlign:'right' as const }}>{formatarMoeda(totalReceitas)}</div>
              </div>
            </div>
          )
        )}

        {/* ABA RELATÓRIO TSE */}
        {aba === 'relatorio' && (
          <div style={{ background:'#0F2040', border:'1px solid #1C3558', borderRadius:'12px', padding:'32px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'28px', flexWrap:'wrap' as const, gap:'16px' }}>
              <div>
                <h2 style={{ fontSize:'18px', fontWeight:700, color:'#FFFFFF', marginBottom:'6px' }}>Relatório para Prestação de Contas</h2>
                <p style={{ fontSize:'13px', color:'#8FA4C0' }}>Resumo organizado nos padrões do SPCE/TSE para seu contador</p>
              </div>
              <button onClick={() => window.print()} style={{ background:'linear-gradient(135deg, #E8C87A, #A07830)', border:'none', borderRadius:'8px', color:'#0B1F3A', fontSize:'13px', fontWeight:600, padding:'10px 20px', cursor:'pointer', fontFamily:'Inter, sans-serif' }}>🖨️ Imprimir / PDF</button>
            </div>
            <div style={{ background:'rgba(201,168,76,0.05)', border:'1px solid rgba(201,168,76,0.15)', borderRadius:'8px', padding:'20px', marginBottom:'20px' }}>
              <div style={{ fontSize:'12px', fontWeight:600, color:'#C9A84C', marginBottom:'12px', textTransform:'uppercase', letterSpacing:'1px' }}>Resumo Geral</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'16px' }}>
                <div><div style={{ fontSize:'12px', color:'#8FA4C0' }}>Total de Receitas</div><div style={{ fontSize:'20px', fontWeight:700, color:'#22c55e' }}>{formatarMoeda(totalReceitas)}</div></div>
                <div><div style={{ fontSize:'12px', color:'#8FA4C0' }}>Total de Despesas</div><div style={{ fontSize:'20px', fontWeight:700, color:'#e74c3c' }}>{formatarMoeda(totalDespesas)}</div></div>
                <div><div style={{ fontSize:'12px', color:'#8FA4C0' }}>Saldo Final</div><div style={{ fontSize:'20px', fontWeight:700, color: saldo >= 0 ? '#22c55e' : '#e74c3c' }}>{formatarMoeda(saldo)}</div></div>
              </div>
            </div>
            <div style={{ marginBottom:'20px' }}>
              <div style={{ fontSize:'13px', fontWeight:600, color:'#E8EDF5', marginBottom:'12px', paddingBottom:'8px', borderBottom:'1px solid #1C3558' }}>RECEITAS ({receitas.length} lançamentos)</div>
              {Object.entries(tiposReceita).map(([key, info]) => {
                const itens = receitas.filter(r => r.tipo === key)
                if (itens.length === 0) return null
                return (
                  <div key={key} style={{ marginBottom:'8px', padding:'10px 14px', background:'rgba(255,255,255,0.02)', borderRadius:'6px' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <div style={{ fontSize:'13px', color: info.cor, fontWeight:500 }}>{info.label} ({itens.length})</div>
                      <div style={{ fontSize:'14px', fontWeight:600, color:'#22c55e' }}>{formatarMoeda(itens.reduce((s,r) => s + Number(r.valor), 0))}</div>
                    </div>
                  </div>
                )
              })}
            </div>
            <div>
                <div style={{ fontSize:'13px', fontWeight:600, color:'#E8EDF5', marginBottom:'12px', paddingBottom:'8px', borderBottom:'1px solid #1C3558' }}>DESPESAS ({despesas.length} lançamentos)</div>
              {Object.entries(categoriasDesp).map(([key, info]) => {
                const itens = despesas.filter(d => d.categoria === key)
                if (itens.length === 0) return null
                return (
                  <div key={key} style={{ marginBottom:'8px', padding:'10px 14px', background:'rgba(255,255,255,0.02)', borderRadius:'6px' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <div style={{ fontSize:'13px', color: info.cor, fontWeight:500 }}>{info.icone} {info.label} ({itens.length})</div>
                      <div style={{ fontSize:'14px', fontWeight:600, color:'#e74c3c' }}>{formatarMoeda(itens.reduce((s,d) => s + Number(d.valor), 0))}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </main>
      {/* MODAL DESPESA */}
      {modalDespesa && (
        <div style={{ position:'fixed', inset:0, zIndex:200, background:'rgba(0,0,0,0.75)', display:'flex', alignItems:'center', justifyContent:'center', padding:'24px', overflowY:'auto' }}>
          <div style={{ background:'#0F2040', border:'1px solid rgba(201,168,76,0.2)', borderRadius:'16px', padding:'32px', width:'100%', maxWidth:'600px', position:'relative', margin:'auto' }}>
            <div style={{ position:'absolute', top:0, left:'10%', right:'10%', height:'1px', background:'linear-gradient(90deg, transparent, #C9A84C, transparent)' }} />
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'24px' }}>
              <h2 style={{ fontSize:'18px', fontWeight:700, color:'#FFFFFF' }}>{editandoDespesa ? 'Editar Despesa' : 'Nova Despesa'}</h2>
              <button onClick={() => { setModalDespesa(false); setEditandoDespesa(null) }} style={{ background:'transparent', border:'none', color:'#8FA4C0', cursor:'pointer', fontSize:'20px' }}>✕</button>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
              <div><label style={labelStyle}>Descrição *</label><input value={formDespesa.descricao} onChange={e => setFormDespesa(p=>({...p,descricao:e.target.value}))} placeholder="Descrição da despesa" style={inputStyle} onFocus={e=>e.target.style.borderColor='#C9A84C'} onBlur={e=>e.target.style.borderColor='#1C3558'} /></div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
                <div><label style={labelStyle}>Categoria *</label>
                  <select value={formDespesa.categoria} onChange={e => setFormDespesa(p=>({...p,categoria:e.target.value}))} style={{ ...inputStyle, cursor:'pointer' }} onFocus={e=>e.target.style.borderColor='#C9A84C'} onBlur={e=>e.target.style.borderColor='#1C3558'}>
                    {Object.entries(categoriasDesp).map(([k,v]) => <option key={k} value={k}>{v.icone} {v.label}</option>)}
                  </select>
                </div>
                <div><label style={labelStyle}>Valor (R$) *</label><input value={formDespesa.valor} onChange={e => setFormDespesa(p=>({...p,valor:mascaraMoeda(e.target.value)}))} placeholder="0,00" style={inputStyle} onFocus={e=>e.target.style.borderColor='#C9A84C'} onBlur={e=>e.target.style.borderColor='#1C3558'} /></div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
                <div><label style={labelStyle}>Data da despesa *</label><input type="date" value={formDespesa.data} onChange={e => setFormDespesa(p=>({...p,data:e.target.value}))} style={{ ...inputStyle, colorScheme:'dark' }} onFocus={e=>e.target.style.borderColor='#C9A84C'} onBlur={e=>e.target.style.borderColor='#1C3558'} /></div>
                <div><label style={labelStyle}>Data do pagamento</label><input type="date" value={formDespesa.data_pagamento} onChange={e => setFormDespesa(p=>({...p,data_pagamento:e.target.value}))} style={{ ...inputStyle, colorScheme:'dark' }} onFocus={e=>e.target.style.borderColor='#C9A84C'} onBlur={e=>e.target.style.borderColor='#1C3558'} /></div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
                <div><label style={labelStyle}>Nome do fornecedor</label><input value={formDespesa.nome_fornecedor} onChange={e => setFormDespesa(p=>({...p,nome_fornecedor:e.target.value}))} placeholder="Razão social ou nome" style={inputStyle} onFocus={e=>e.target.style.borderColor='#C9A84C'} onBlur={e=>e.target.style.borderColor='#1C3558'} /></div>
                <div><label style={labelStyle}>CNPJ / CPF fornecedor</label><input value={formDespesa.cnpj_cpf_fornecedor} onChange={e => setFormDespesa(p=>({...p,cnpj_cpf_fornecedor:mascaraCNPJCPF(e.target.value)}))} placeholder="000.000.000-00" style={inputStyle} onFocus={e=>e.target.style.borderColor='#C9A84C'} onBlur={e=>e.target.style.borderColor='#1C3558'} /></div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'12px' }}>
                <div><label style={labelStyle}>Tipo documento</label>
                  <select value={formDespesa.tipo_documento} onChange={e => setFormDespesa(p=>({...p,tipo_documento:e.target.value}))} style={{ ...inputStyle, cursor:'pointer' }} onFocus={e=>e.target.style.borderColor='#C9A84C'} onBlur={e=>e.target.style.borderColor='#1C3558'}>
                    <option value="nota_fiscal">Nota Fiscal</option>
                    <option value="recibo">Recibo</option>
                    <option value="cupom">Cupom Fiscal</option>
                    <option value="contrato">Contrato</option>
                    <option value="outros">Outros</option>
                  </select>
                </div>
                <div><label style={labelStyle}>Nº documento</label><input value={formDespesa.numero_documento} onChange={e => setFormDespesa(p=>({...p,numero_documento:e.target.value}))} placeholder="Ex: NF-001234" style={inputStyle} onFocus={e=>e.target.style.borderColor='#C9A84C'} onBlur={e=>e.target.style.borderColor='#1C3558'} /></div>
                <div><label style={labelStyle}>Forma pagamento</label>
                  <select value={formDespesa.forma_pagamento} onChange={e => setFormDespesa(p=>({...p,forma_pagamento:e.target.value}))} style={{ ...inputStyle, cursor:'pointer' }} onFocus={e=>e.target.style.borderColor='#C9A84C'} onBlur={e=>e.target.style.borderColor='#1C3558'}>
                    <option value="pix">PIX</option>
                    <option value="transferencia">Transferência</option>
                    <option value="cartao">Cartão</option>
                    <option value="dinheiro">Dinheiro</option>
                    <option value="cheque">Cheque</option>
                    <option value="outros">Outros</option>
                  </select>
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
                <div><label style={labelStyle}>Líder Regional</label>
                  <select value={formDespesa.lider_id} onChange={e => setFormDespesa(p=>({...p,lider_id:e.target.value}))} style={{ ...inputStyle, cursor:'pointer', color: formDespesa.lider_id ? '#E8EDF5' : '#8FA4C0' }} onFocus={e=>e.target.style.borderColor='#C9A84C'} onBlur={e=>e.target.style.borderColor='#1C3558'}>
                    <option value="">Nenhum / Geral</option>
                    {lideres.map(l => <option key={l.id} value={l.id}>{l.nome} — {l.cidade}</option>)}
                  </select>
                </div>
                <div><label style={labelStyle}>Região</label><input value={formDespesa.regiao} onChange={e => setFormDespesa(p=>({...p,regiao:e.target.value}))} placeholder="Ex: Zona Norte" style={inputStyle} onFocus={e=>e.target.style.borderColor='#C9A84C'} onBlur={e=>e.target.style.borderColor='#1C3558'} /></div>
              </div>
              <div><label style={labelStyle}>Observações</label><textarea value={formDespesa.observacoes} onChange={e => setFormDespesa(p=>({...p,observacoes:e.target.value}))} rows={2} style={{ ...inputStyle, resize:'vertical' as const }} onFocus={e=>e.target.style.borderColor='#C9A84C'} onBlur={e=>e.target.style.borderColor='#1C3558'} /></div>
              {erro && <div style={{ background:'rgba(192,57,43,0.1)', border:'1px solid rgba(192,57,43,0.3)', borderRadius:'8px', padding:'10px 14px', fontSize:'13px', color:'#e74c3c' }}>{erro}</div>}
              <div style={{ display:'flex', gap:'10px', justifyContent:'flex-end' }}>
                <button onClick={() => { setModalDespesa(false); setEditandoDespesa(null) }} style={{ background:'transparent', border:'1px solid #1C3558', borderRadius:'8px', color:'#8FA4C0', fontSize:'13px', padding:'10px 20px', cursor:'pointer', fontFamily:'Inter, sans-serif' }}>Cancelar</button>
                <button onClick={salvarDespesa} disabled={salvando} style={{ background: salvando ? 'rgba(201,168,76,0.4)' : 'linear-gradient(135deg, #E8C87A, #A07830)', border:'none', borderRadius:'8px', color:'#0B1F3A', fontSize:'13px', fontWeight:600, padding:'10px 24px', cursor: salvando ? 'not-allowed' : 'pointer', fontFamily:'Inter, sans-serif' }}>
                  {salvando ? 'Salvando...' : editandoDespesa ? 'Atualizar →' : 'Registrar →'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL RECEITA */}
      {modalReceita && (
        <div style={{ position:'fixed', inset:0, zIndex:200, background:'rgba(0,0,0,0.75)', display:'flex', alignItems:'center', justifyContent:'center', padding:'24px', overflowY:'auto' }}>
          <div style={{ background:'#0F2040', border:'1px solid rgba(201,168,76,0.2)', borderRadius:'16px', padding:'32px', width:'100%', maxWidth:'520px', position:'relative', margin:'auto' }}>
            <div style={{ position:'absolute', top:0, left:'10%', right:'10%', height:'1px', background:'linear-gradient(90deg, transparent, #C9A84C, transparent)' }} />
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'24px' }}>
              <h2 style={{ fontSize:'18px', fontWeight:700, color:'#FFFFFF' }}>{editandoReceita ? 'Editar Receita' : 'Nova Receita'}</h2>
              <button onClick={() => { setModalReceita(false); setEditandoReceita(null) }} style={{ background:'transparent', border:'none', color:'#8FA4C0', cursor:'pointer', fontSize:'20px' }}>✕</button>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
              <div><label style={labelStyle}>Tipo de Receita *</label>
                <select value={formReceita.tipo} onChange={e => setFormReceita(p=>({...p,tipo:e.target.value}))} style={{ ...inputStyle, cursor:'pointer' }} onFocus={e=>e.target.style.borderColor='#C9A84C'} onBlur={e=>e.target.style.borderColor='#1C3558'}>
                  {Object.entries(tiposReceita).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <div><label style={labelStyle}>Descrição *</label><input value={formReceita.descricao} onChange={e => setFormReceita(p=>({...p,descricao:e.target.value}))} placeholder="Descrição da receita" style={inputStyle} onFocus={e=>e.target.style.borderColor='#C9A84C'} onBlur={e=>e.target.style.borderColor='#1C3558'} /></div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
                <div><label style={labelStyle}>Valor (R$) *</label><input value={formReceita.valor} onChange={e => setFormReceita(p=>({...p,valor:mascaraMoeda(e.target.value)}))} placeholder="0,00" style={inputStyle} onFocus={e=>e.target.style.borderColor='#C9A84C'} onBlur={e=>e.target.style.borderColor='#1C3558'} /></div>
                <div><label style={labelStyle}>Data *</label><input type="date" value={formReceita.data} onChange={e => setFormReceita(p=>({...p,data:e.target.value}))} style={{ ...inputStyle, colorScheme:'dark' }} onFocus={e=>e.target.style.borderColor='#C9A84C'} onBlur={e=>e.target.style.borderColor='#1C3558'} /></div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
                <div><label style={labelStyle}>Nome do doador</label><input value={formReceita.nome_doador} onChange={e => setFormReceita(p=>({...p,nome_doador:e.target.value}))} placeholder="Nome completo ou razão social" style={inputStyle} onFocus={e=>e.target.style.borderColor='#C9A84C'} onBlur={e=>e.target.style.borderColor='#1C3558'} /></div>
                <div><label style={labelStyle}>CPF / CNPJ doador</label><input value={formReceita.cpf_cnpj_doador} onChange={e => setFormReceita(p=>({...p,cpf_cnpj_doador:mascaraCNPJCPF(e.target.value)}))} placeholder="000.000.000-00" style={inputStyle} onFocus={e=>e.target.style.borderColor='#C9A84C'} onBlur={e=>e.target.style.borderColor='#1C3558'} /></div>
              </div>
              <div><label style={labelStyle}>Número do Recibo</label><input value={formReceita.numero_recibo} onChange={e => setFormReceita(p=>({...p,numero_recibo:e.target.value}))} placeholder="Ex: REC-2026-001" style={inputStyle} onFocus={e=>e.target.style.borderColor='#C9A84C'} onBlur={e=>e.target.style.borderColor='#1C3558'} /></div>
              <div><label style={labelStyle}>Observações</label><textarea value={formReceita.observacoes} onChange={e => setFormReceita(p=>({...p,observacoes:e.target.value}))} rows={2} style={{ ...inputStyle, resize:'vertical' as const }} onFocus={e=>e.target.style.borderColor='#C9A84C'} onBlur={e=>e.target.style.borderColor='#1C3558'} /></div>
              {erro && <div style={{ background:'rgba(192,57,43,0.1)', border:'1px solid rgba(192,57,43,0.3)', borderRadius:'8px', padding:'10px 14px', fontSize:'13px', color:'#e74c3c' }}>{erro}</div>}
              <div style={{ display:'flex', gap:'10px', justifyContent:'flex-end' }}>
                <button onClick={() => { setModalReceita(false); setEditandoReceita(null) }} style={{ background:'transparent', border:'1px solid #1C3558', borderRadius:'8px', color:'#8FA4C0', fontSize:'13px', padding:'10px 20px', cursor:'pointer', fontFamily:'Inter, sans-serif' }}>Cancelar</button>
                <button onClick={salvarReceita} disabled={salvando} style={{ background: salvando ? 'rgba(201,168,76,0.4)' : 'linear-gradient(135deg, #E8C87A, #A07830)', border:'none', borderRadius:'8px', color:'#0B1F3A', fontSize:'13px', fontWeight:600, padding:'10px 24px', cursor: salvando ? 'not-allowed' : 'pointer', fontFamily:'Inter, sans-serif' }}>
                  {salvando ? 'Salvando...' : editandoReceita ? 'Atualizar →' : 'Registrar →'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}