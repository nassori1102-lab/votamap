'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'

type Message = { role: 'user' | 'assistant'; content: string }

export default function IAChatFlutuante() {
  const router = useRouter()
  const [aberto, setAberto] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function enviar() {
    const msg = input.trim()
    if (!msg || loading) return
    setInput('')
    const novas: Message[] = [...messages, { role: 'user', content: msg }]
    setMessages(novas)
    setLoading(true)
    try {
      const res = await fetch('/api/ia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: novas }),
      })
      const data = await res.json()
      if (!data.error) setMessages(prev => [...prev, { role: 'assistant', content: data.message }])
    } catch {}
    setLoading(false)
  }

  function formatarTexto(texto: string) {
    return texto.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>')
  }

  return (
    <>
      {/* BOTÃO FLUTUANTE */}
      <button
        onClick={() => setAberto(!aberto)}
        style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 999, width: '56px', height: '56px', borderRadius: '16px', background: aberto ? '#1C3558' : 'linear-gradient(135deg, #E8C87A, #A07830)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', boxShadow: '0 4px 24px rgba(0,0,0,0.3)', transition: 'all .2s' }}>
        {aberto ? '✕' : '✦'}
      </button>

      {/* CHAT */}
      {aberto && (
        <div style={{ position: 'fixed', bottom: '90px', right: '24px', zIndex: 998, width: '360px', height: '500px', background: '#0F2040', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '16px', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 8px 40px rgba(0,0,0,0.4)' }}>
          {/* HEADER */}
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #1C3558', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(11,31,58,0.8)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>✦</div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#E8EDF5' }}>Assistente IA</div>
                <div style={{ fontSize: '10px', color: '#22c55e' }}>● online</div>
              </div>
            </div>
            <button onClick={() => router.push('/dashboard/ia')} style={{ background: 'transparent', border: '1px solid #1C3558', borderRadius: '6px', color: '#8FA4C0', fontSize: '11px', padding: '4px 8px', cursor: 'pointer', fontFamily: 'sans-serif' }}>
              Expandir
            </button>
          </div>

          {/* MENSAGENS */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: '28px', marginBottom: '8px' }}>✦</div>
                <div style={{ fontSize: '13px', color: '#8FA4C0', lineHeight: 1.5 }}>Olá! Sou o assistente da sua campanha. Como posso ajudar?</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '12px' }}>
                  {['Resumo da campanha', 'Quais líderes precisam de atenção?', 'Crie um post para Instagram'].map((s, i) => (
                    <button key={i} onClick={() => { setInput(s); }}
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid #1C3558', borderRadius: '8px', padding: '7px 10px', color: '#8FA4C0', fontSize: '12px', cursor: 'pointer', textAlign: 'left', fontFamily: 'sans-serif' }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row', gap: '8px' }}>
                <div style={{ maxWidth: '85%', background: msg.role === 'user' ? 'rgba(201,168,76,0.1)' : 'rgba(255,255,255,0.03)', border: `1px solid ${msg.role === 'user' ? 'rgba(201,168,76,0.2)' : '#1C3558'}`, borderRadius: '10px', padding: '8px 12px', fontSize: '13px', color: '#E8EDF5', lineHeight: 1.6 }}
                  dangerouslySetInnerHTML={{ __html: formatarTexto(msg.content) }} />
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', gap: '4px', padding: '8px 12px' }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#C9A84C', animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite` }} />
                ))}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* INPUT */}
          <div style={{ padding: '10px 12px', borderTop: '1px solid #1C3558', display: 'flex', gap: '8px' }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && enviar()}
              placeholder="Pergunte algo..."
              style={{ flex: 1, background: '#0B1F3A', border: '1px solid #1C3558', borderRadius: '8px', padding: '8px 12px', color: '#E8EDF5', fontSize: '13px', outline: 'none', fontFamily: 'sans-serif' }}
              onFocus={e => e.target.style.borderColor = '#C9A84C'}
              onBlur={e => e.target.style.borderColor = '#1C3558'}
            />
            <button onClick={enviar} disabled={!input.trim() || loading}
              style={{ width: '34px', height: '34px', borderRadius: '8px', background: input.trim() && !loading ? 'linear-gradient(135deg, #E8C87A, #A07830)' : 'rgba(201,168,76,0.2)', border: 'none', cursor: 'pointer', fontSize: '14px', flexShrink: 0 }}>
              →
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </>
  )
}
