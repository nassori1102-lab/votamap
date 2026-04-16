'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'

type Message = {
  role: 'user' | 'assistant'
  content: string
}

const sugestoes = [
  'Quais bairros precisam de mais atenção?',
  'Crie um post para o Instagram sobre saúde',
  'Quais líderes estão abaixo da meta?',
  'Sugira uma estratégia para os próximos 30 dias',
  'Crie uma mensagem de WhatsApp para mobilizar apoiadores',
  'Qual o resumo financeiro da campanha?',
  'Quais regiões têm maior engajamento?',
  'Crie um roteiro de discurso para o bairro Centro',
]

export default function IAPage() {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function enviar(texto?: string) {
    const msg = texto || input.trim()
    if (!msg || loading) return
    setInput('')
    setErro('')

    const novasMensagens: Message[] = [...messages, { role: 'user', content: msg }]
    setMessages(novasMensagens)
    setLoading(true)

    try {
      const res = await fetch('/api/ia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: novasMensagens }),
      })
      const data = await res.json()
      if (data.error) { setErro(data.error); setLoading(false); return }
      setMessages(prev => [...prev, { role: 'assistant', content: data.message }])
    } catch (e) {
      setErro('Erro ao conectar com a IA. Tente novamente.')
    }
    setLoading(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar() }
  }

  function formatarTexto(texto: string) {
    return texto
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br/>')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0B1F3A', fontFamily: "'IBM Plex Sans', sans-serif", display: 'flex', flexDirection: 'column' }}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap" rel="stylesheet" />
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 80px, rgba(201,168,76,0.02) 80px, rgba(201,168,76,0.02) 81px)` }} />

      {/* NAV */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, height: '64px', background: 'rgba(11,31,58,0.97)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(201,168,76,0.15)', display: 'flex', alignItems: 'center', padding: '0 32px', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={() => router.push('/dashboard')} style={{ background: 'transparent', border: 'none', color: '#8FA4C0', cursor: 'pointer', fontSize: '13px' }}>← Voltar</button>
          <div style={{ width: '1px', height: '20px', background: '#1C3558' }} />
          <span style={{ fontFamily: "'Playfair Display', serif", fontSize: '20px', fontWeight: 800, color: '#FFFFFF' }}>Cand<span style={{ color: '#C9A84C' }}>Maps</span></span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e' }} />
          <span style={{ fontSize: '12px', color: '#8FA4C0' }}>IA Assistente ativa</span>
        </div>
      </nav>

      {/* ÁREA DO CHAT */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', maxWidth: '860px', margin: '0 auto', width: '100%', padding: '80px 24px 0', position: 'relative', zIndex: 1 }}>

        {messages.length === 0 ? (
          /* TELA INICIAL */
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 0' }}>
            <div style={{ width: '72px', height: '72px', borderRadius: '20px', background: 'linear-gradient(135deg, rgba(201,168,76,0.2), rgba(201,168,76,0.05))', border: '1px solid rgba(201,168,76,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', marginBottom: '20px' }}>✦</div>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '28px', fontWeight: 800, color: '#FFFFFF', marginBottom: '8px', textAlign: 'center' }}>Assistente de Campanha</h1>
            <p style={{ fontSize: '15px', color: '#8FA4C0', textAlign: 'center', maxWidth: '480px', lineHeight: 1.6, marginBottom: '40px' }}>
              Tenho acesso aos dados reais da sua campanha. Posso analisar, sugerir estratégias e criar conteúdo personalizado.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', width: '100%', maxWidth: '640px' }}>
              {sugestoes.map((s, i) => (
                <button key={i} onClick={() => enviar(s)}
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid #1C3558', borderRadius: '10px', padding: '12px 16px', color: '#8FA4C0', fontSize: '13px', cursor: 'pointer', textAlign: 'left', fontFamily: "'IBM Plex Sans', sans-serif", transition: 'all .15s', lineHeight: 1.4 }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(201,168,76,0.3)'; (e.currentTarget as HTMLButtonElement).style.color = '#E8EDF5' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#1C3558'; (e.currentTarget as HTMLButtonElement).style.color = '#8FA4C0' }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* MENSAGENS */
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 0', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ display: 'flex', gap: '12px', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', background: msg.role === 'user' ? 'rgba(201,168,76,0.15)' : 'rgba(107,163,214,0.15)', border: `1px solid ${msg.role === 'user' ? 'rgba(201,168,76,0.3)' : 'rgba(107,163,214,0.3)'}` }}>
                  {msg.role === 'user' ? '👤' : '✦'}
                </div>
                <div style={{ maxWidth: '75%', background: msg.role === 'user' ? 'rgba(201,168,76,0.08)' : 'rgba(255,255,255,0.03)', border: `1px solid ${msg.role === 'user' ? 'rgba(201,168,76,0.2)' : '#1C3558'}`, borderRadius: '12px', padding: '14px 16px', fontSize: '14px', color: '#E8EDF5', lineHeight: 1.7 }}
                  dangerouslySetInnerHTML={{ __html: formatarTexto(msg.content) }} />
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', background: 'rgba(107,163,214,0.15)', border: '1px solid rgba(107,163,214,0.3)' }}>✦</div>
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid #1C3558', borderRadius: '12px', padding: '14px 16px' }}>
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    {[0, 1, 2].map(i => (
                      <div key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#C9A84C', animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            {erro && <div style={{ background: 'rgba(192,57,43,0.1)', border: '1px solid rgba(192,57,43,0.3)', borderRadius: '8px', padding: '12px 16px', fontSize: '13px', color: '#e74c3c' }}>{erro}</div>}
            <div ref={bottomRef} />
          </div>
        )}

        {/* INPUT */}
        <div style={{ padding: '16px 0 24px', position: 'sticky', bottom: 0, background: 'linear-gradient(transparent, #0B1F3A 30%)' }}>
          {messages.length > 0 && (
            <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
              {sugestoes.slice(0, 3).map((s, i) => (
                <button key={i} onClick={() => enviar(s)} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid #1C3558', borderRadius: '20px', padding: '5px 12px', color: '#8FA4C0', fontSize: '12px', cursor: 'pointer', fontFamily: "'IBM Plex Sans', sans-serif" }}>
                  {s}
                </button>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: '10px', background: '#0F2040', border: '1px solid #1C3558', borderRadius: '12px', padding: '12px 16px', alignItems: 'flex-end' }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Pergunte sobre a campanha, peça estratégias ou conteúdo..."
              rows={1}
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#E8EDF5', fontSize: '14px', fontFamily: "'IBM Plex Sans', sans-serif", resize: 'none', maxHeight: '120px', lineHeight: 1.6 }}
              onInput={e => {
                const t = e.target as HTMLTextAreaElement
                t.style.height = 'auto'
                t.style.height = Math.min(t.scrollHeight, 120) + 'px'
              }}
            />
            <button onClick={() => enviar()} disabled={!input.trim() || loading}
              style={{ width: '36px', height: '36px', borderRadius: '8px', background: input.trim() && !loading ? 'linear-gradient(135deg, #E8C87A, #A07830)' : 'rgba(201,168,76,0.2)', border: 'none', cursor: input.trim() && !loading ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>
              →
            </button>
          </div>
          <div style={{ textAlign: 'center', fontSize: '11px', color: '#3D5470', marginTop: '8px' }}>
            Enter para enviar · Shift+Enter para nova linha · Dados da campanha atualizados em tempo real
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  )
}
