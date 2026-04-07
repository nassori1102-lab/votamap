'use client'

import { useState } from 'react'
import { mascaraCpf, validarCpf } from '@/lib/validarCpf'

interface CpfInputProps {
  value: string
  onChange: (value: string) => void
  required?: boolean
}

export function CpfInput({ value, onChange, required }: CpfInputProps) {
  const [touched, setTouched] = useState(false)

  const cpfLimpo = value.replace(/\D/g, '')
  const isValido = validarCpf(cpfLimpo)
  const mostrarErro = touched && cpfLimpo.length === 11 && !isValido
  const mostrarOk   = touched && cpfLimpo.length === 11 && isValido

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    onChange(mascaraCpf(e.target.value))
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-gray-700">
        CPF {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        <input
          type="text"
          inputMode="numeric"
          placeholder="000.000.000-00"
          value={value}
          onChange={handleChange}
          onBlur={() => setTouched(true)}
          maxLength={14}
          className={`w-full rounded-lg border px-3 py-2 text-sm outline-none transition
            focus:ring-2 focus:ring-offset-1
            ${mostrarErro
              ? 'border-red-400 focus:ring-red-300'
              : mostrarOk
              ? 'border-green-400 focus:ring-green-300'
              : 'border-gray-300 focus:ring-blue-300'
            }`}
        />
        {/* Ícone de feedback */}
        {mostrarOk && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500 text-sm">✓</span>
        )}
        {mostrarErro && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500 text-sm">✕</span>
        )}
      </div>
      {mostrarErro && (
        <p className="text-xs text-red-500">CPF inválido. Verifique os números digitados.</p>
      )}
    </div>
  )
}