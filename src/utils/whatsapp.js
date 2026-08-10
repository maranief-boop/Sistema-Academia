// =====================================================================
// Utilidades de WhatsApp — cobrança e comunicação com os alunos
// =====================================================================

// Normaliza o número: remove tudo que não é dígito e prefixa com 55 (Brasil)
export function numeroWhatsApp(telefone) {
  const digitos = String(telefone || '').replace(/\D/g, '')
  if (!digitos) return null
  return digitos.length <= 11 ? `55${digitos}` : digitos
}

// Monta o link wa.me com a mensagem pré-formatada
export function linkWhatsApp(telefone, mensagem) {
  const numero = numeroWhatsApp(telefone)
  if (!numero) return null
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`
}

// Mensagem amigável de cobrança personalizada
export function mensagemCobranca({ nome, academia, valor, vencimento }) {
  const data = vencimento ? vencimento : 'data de vencimento'
  const intro =
    `Olá, ${nome || 'tudo bem'}! 👋 Aqui é da *${academia || 'Academia'}*.`
  const corpo =
    `Passando para lembrar que sua mensalidade de *${valor || 'R$ 0,00'}* ` +
    `está com vencimento em *${data}*.`
  const fechamento =
    `Não queremos que você fique sem treinar! 💪 Qualquer dúvida ou para regularizar, é só responder.`
  return `${intro}\n\n${corpo}\n\n${fechamento}`
}

// Abre o WhatsApp em nova aba (se o número for válido)
export function abrirWhatsApp(telefone, mensagem) {
  const link = linkWhatsApp(telefone, mensagem)
  if (link) window.open(link, '_blank', 'noopener,noreferrer')
  return !!link
}