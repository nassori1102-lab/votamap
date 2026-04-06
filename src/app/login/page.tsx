'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErro('')

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    })

    if (error) {
      setErro('E-mail ou senha incorretos. Tente novamente.')
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0B1F3A 0%, #061224 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'IBM Plex Sans', sans-serif",
      padding: '24px',
    }}>
      {/* Grade de fundo */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none',
        backgroundImage: `
          repeating-linear-gradient(0deg, transparent, transparent 80px, rgba(201,168,76,0.03) 80px, rgba(201,168,76,0.03) 81px),
          repeating-linear-gradient(90deg, transparent, transparent 80px, rgba(201,168,76,0.03) 80px, rgba(201,168,76,0.03) 81px)
        `,
      }} />

      <div style={{
        width: '100%', maxWidth: '420px',
        background: '#0F2040',
        border: '1px solid #1C3558',
        borderRadius: '16px',
        padding: '48px 40px',
        position: 'relative',
        boxShadow: '0 40px 80px rgba(0,0,0,0.5)',
      }}>
        {/* Linha dourada no topo */}
        <div style={{
          position: 'absolute', top: 0, left: '10%', right: '10%', height: '1px',
          background: 'linear-gradient(90deg, transparent, #C9A84C, transparent)',
        }} />

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{
            width: '52px', height: '52px',
            background: 'linear-gradient(135deg, #C9A84C, #A07830)',
            borderRadius: '12px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '24px', margin: '0 auto 16px',
          }}>🗳</div>
          <div style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: '26px', fontWeight: 800,
            color: '#FFFFFF', letterSpacing: '0.5px',
          }}>
            Vota<span style={{ color: '#C9A84C' }}>Map</span>
          </div>
          <div style={{ fontSize: '13px', color: '#8FA4C0', marginTop: '6px' }}>
            Plataforma de Gestão de Campanha
          </div>
        </div>

        {/* Título */}
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: '22px', fontWeight: 700,
            color: '#E8EDF5', marginBottom: '6px',
          }}>Acesso ao sistema</h1>
          <p style={{ fontSize: '13px', color: '#8FA4C0' }}>
            Entre com suas credenciais para continuar
          </p>
        </div>

        {/* Formulário */}
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '18px' }}>
            <label style={{
              display: 'block', fontSize: '12px', fontWeight: 500,
              color: '#8FA4C0', marginBottom: '8px',
              textTransform: 'uppercase', letterSpacing: '0.8px',
            }}>E-mail</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
              style={{
                width: '100%', padding: '12px 16px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid #1C3558',
                borderRadius: '8px',
                color: '#E8EDF5', fontSize: '15px',
                outline: 'none', transition: 'border-color .2s',
                fontFamily: "'IBM Plex Sans', sans-serif",
              }}
              onFocus={e => e.target.style.borderColor = '#C9A84C'}
              onBlur={e => e.target.style.borderColor = '#1C3558'}
            />
          </div>

          <div style={{ marginBottom: '28px' }}>
            <label style={{
              display: 'block', fontSize: '12px', fontWeight: 500,
              color: '#8FA4C0', marginBottom: '8px',
              textTransform: 'uppercase', letterSpacing: '0.8px',
            }}>Senha</label>
            <input
              type="password"
              value={senha}
              onChange={e => setSenha(e.target.value)}
              placeholder="••••••••"
              required
              style={{
                width: '100%', padding: '12px 16px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid #1C3558',
                borderRadius: '8px',
                color: '#E8EDF5', fontSize: '15px',
                outline: 'none', transition: 'border-color .2s',
                fontFamily: "'IBM Plex Sans', sans-serif",
              }}
              onFocus={e => e.target.style.borderColor = '#C9A84C'}
              onBlur={e => e.target.style.borderColor = '#1C3558'}
            />
          </div>

          {erro && (
            <div style={{
              background: 'rgba(192,57,43,0.1)',
              border: '1px solid rgba(192,57,43,0.3)',
              borderRadius: '8px', padding: '12px 16px',
              fontSize: '13px', color: '#e74c3c',
              marginBottom: '20px',
            }}>
              {erro}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '14px',
              background: loading
                ? 'rgba(201,168,76,0.5)'
                : 'linear-gradient(135deg, #E8C87A, #A07830)',
              border: 'none', borderRadius: '8px',
              color: '#0B1F3A', fontSize: '15px', fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all .2s',
              fontFamily: "'IBM Plex Sans', sans-serif",
              letterSpacing: '0.3px',
            }}
          >
            {loading ? 'Entrando...' : 'Entrar na plataforma →'}
          </button>
        </form>

        {/* Footer */}
        <div style={{
          marginTop: '32px', paddingTop: '24px',
          borderTop: '1px solid #1C3558',
          textAlign: 'center',
          fontSize: '11px', color: '#3D5470',
        }}>
          Acesso restrito · Dados protegidos com criptografia AES-256
        </div>
      </div>

      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap" rel="stylesheet" />
    </div>
  )
}