import { Resend } from 'resend'
import { NextRequest, NextResponse } from 'next/server'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  try {
    const { destinatarios, assunto, mensagem, remetente_nome } = await req.json()

    if (!destinatarios || destinatarios.length === 0) {
      return NextResponse.json({ erro: 'Nenhum destinatário informado' }, { status: 400 })
    }

    if (!assunto || !mensagem) {
      return NextResponse.json({ erro: 'Assunto e mensagem são obrigatórios' }, { status: 400 })
    }

    const resultados = []
    const erros = []

    // Enviar em lotes de 50
    const lotes = []
    for (let i = 0; i < destinatarios.length; i += 50) {
      lotes.push(destinatarios.slice(i, i + 50))
    }

    for (const lote of lotes) {
      for (const dest of lote) {
        try {
          const { data, error } = await resend.emails.send({
            from: `${remetente_nome || 'VotaMap Campanha'} <onboarding@resend.dev>`,
            to: dest.email,
            subject: assunto,
            html: `
              <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; background: #f8f9fa;">
                <div style="background: #0B1F3A; padding: 24px; border-radius: 12px; margin-bottom: 24px;">
                  <h1 style="color: #C9A84C; font-size: 20px; margin: 0;">${remetente_nome || 'Campanha Eleitoral'}</h1>
                </div>
                <div style="background: white; padding: 28px; border-radius: 12px; color: #333; line-height: 1.7;">
                  <p>Olá, <strong>${dest.nome || 'apoiador'}</strong>!</p>
                  ${mensagem.replace(/\n/g, '<br/>')}
                </div>
                <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #999;">
                  Você recebeu este e-mail por fazer parte da campanha. <br/>
                  Para não receber mais e-mails, entre em contato com a campanha.
                </div>
              </div>
            `,
          })
          if (error) erros.push({ email: dest.email, erro: error.message })
          else resultados.push({ email: dest.email, id: data?.id })
        } catch (e: any) {
          erros.push({ email: dest.email, erro: e.message })
        }
      }
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