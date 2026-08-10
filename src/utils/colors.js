// =====================================================================
// Utilidades de cor — geram a paleta completa a partir da cor primária
// escolhida no painel White-Label, injetando CSS variables (--p-50..950).
// =====================================================================

export function hexToRgb(hex) {
  const limpo = String(hex || '#16a34a').replace('#', '')
  const completo =
    limpo.length === 3
      ? limpo.split('').map((c) => c + c).join('')
      : limpo.padEnd(6, '0')
  const n = parseInt(completo.slice(0, 6), 16)
  if (Number.isNaN(n)) return [22, 163, 74]
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

// Mistura duas cores: w = 1 mantém c1, w = 0 mantém c2
function mixRGB(c1, c2, w) {
  return [
    Math.round(c1[0] * w + c2[0] * (1 - w)),
    Math.round(c1[1] * w + c2[1] * (1 - w)),
    Math.round(c1[2] * w + c2[2] * (1 - w))
  ]
}

// Gera a paleta 50..950 baseada em uma cor
export function generatePalette(hex) {
  const base = hexToRgb(hex)
  const branco = [255, 255, 255]
  const preto = [0, 0, 0]
  return {
    50: mixRGB(base, branco, 0.08),
    100: mixRGB(base, branco, 0.18),
    200: mixRGB(base, branco, 0.38),
    300: mixRGB(base, branco, 0.58),
    400: mixRGB(base, branco, 0.78),
    500: base,
    600: mixRGB(base, preto, 0.88),
    700: mixRGB(base, preto, 0.76),
    800: mixRGB(base, preto, 0.6),
    900: mixRGB(base, preto, 0.44),
    950: mixRGB(base, preto, 0.3)
  }
}

// Aplica a paleta como CSS variables no <html>
export function aplicarPaleta(hex) {
  const palette = generatePalette(hex)
  const root = document.documentElement
  Object.entries(palette).forEach(([step, rgb]) => {
    root.style.setProperty(`--p-${step}`, rgb.join(' '))
  })
}