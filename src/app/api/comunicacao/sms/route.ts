import twilio from 'twilio'
import { NextRequest, NextResponse } from 'next/server'

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
)

export async function POST(req: NextRequest) {
  try {
    const { destinatarios, mensagem } = await req.json()

    if (!destinatarios || destinatarios.length === 0) {
      return NextResponse.json({ erro: 'Nenhum destinatário informado' }, { status: 400 })
    }

    if (!mensagem) {
      return NextResponse.json({ erro: 'Mensagem é obrigatória' }, { status: 400 })
    }

    const resultados = []
    const erros = []

    for (const dest of destinatarios) {
      try {
        // Formatar número para padrão internacional
        let numero = dest.telefone.replace(/\D/g, '')
        if (numero.startsWith('0')) numero = numero.slice(1)
        if (!numero.startsWith('55')) numero = '55' + numero
        numero = '+' + numero

        const message = await client.messages.create({
          body: mensagem,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: numero,
        })

resultados.push({ telefone: dest.telefone, sid: message.sid })
      } catch (e: any) {
        console.error('Erro SMS:', e.message, 'Número:', dest.telefone)
        erros.push({ telefone: dest.telefone, erro: e.message })
      }

      // Pequena pausa entre envios
      await new Promise(r => setTimeout(r, 200))
    }

    return NextResponse.json({
      enviados: resultados.length,
      erros: erros.length,
      detalhes_erros: erros,
    })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}