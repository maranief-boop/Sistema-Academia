// =====================================================================
// Gráficos reutilizáveis (barras de frequência, linha de PSE e seletor
// de período Semanal/Mensal/Anual).
// =====================================================================

// Barras verticais de frequência.
// itens: [{ rotulo, valor, cor? }] — cor opcional por barra (classe Tailwind)
export function GraficoBarras({ itens, altura = 130, corPadrao = 'bg-primary-500' }) {
  const maximo = Math.max(1, ...itens.map((i) => i.valor))
  return (
    <div>
      <div className="flex items-end gap-1.5">
        {itens.map((item, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-1">
            <span className="text-[10px] font-semibold text-zinc-600 dark:text-zinc-300">
              {item.valor || ''}
            </span>
            <div
              className={`w-full max-w-9 rounded-t transition-all ${item.cor || corPadrao}`}
              style={{
                height: item.valor ? Math.max(4, Math.round((item.valor / maximo) * altura)) : 2
              }}
              title={`${item.rotulo}: ${item.valor}`}
            />
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-1.5">
        {itens.map((item, i) => (
          <span
            key={i}
            className="flex-1 text-center text-[10px] text-zinc-400 dark:text-zinc-500"
          >
            {item.rotulo}
          </span>
        ))}
      </div>
    </div>
  )
}

// Gráfico de linha (SVG) — evolução do PSE, escala fixa de 0 a 10.
// pontos: [{ data, pse }] (ordem cronológica)
export function GraficoLinhaPse({ pontos }) {
  if (!pontos || pontos.length === 0) return null
  const LARGURA = 320
  const ALTURA = 130
  const PAD = 10
  const n = pontos.length
  const valores = pontos.map((p) => Number(p.pse) || 0)

  const aux = (i, v) => {
    const x = PAD + (i * (LARGURA - 2 * PAD)) / Math.max(1, n - 1)
    const y = ALTURA - PAD - (v / 10) * (ALTURA - 2 * PAD)
    return [x.toFixed(1), y.toFixed(1)]
  }
  const linha = valores
    .map((v, i) => `${i === 0 ? 'M' : 'L'}${aux(i, v).join(',')}`)
    .join(' ')
  const x0 = aux(0, 0)[0]
  const xUlt = aux(n - 1, 0)[0]
  const area = `${linha} L${xUlt},${ALTURA - PAD} L${x0},${ALTURA - PAD} Z`

  const dataRotulo = (d) =>
    new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })

  return (
    <svg viewBox={`0 0 ${LARGURA} ${ALTURA}`} className="w-full">
      {[0, 2.5, 5, 7.5, 10].map((v) => {
        const y = ALTURA - PAD - (v / 10) * (ALTURA - 2 * PAD)
        return (
          <line
            key={v}
            x1={PAD}
            x2={LARGURA - PAD}
            y1={y}
            y2={y}
            stroke="currentColor"
            strokeOpacity="0.08"
            strokeWidth="1"
          />
        )
      })}
      <path d={area} fill="#10b981" fillOpacity="0.15" stroke="none" />
      <path
        d={linha}
        fill="none"
        stroke="#10b981"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {valores.map((v, i) => {
        const [cx, cy] = aux(i, v)
        return (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r="3"
            fill="currentColor"
            className="text-zinc-50 dark:text-zinc-900"
            stroke="#10b981"
            strokeWidth="2"
          />
        )
      })}
      {[0, Math.floor((n - 1) / 2), n - 1].map((i) => (
        <text
          key={i}
          x={aux(i, valores[i])[0]}
          y={ALTURA - 3}
          textAnchor="middle"
          fontSize="8"
          fill="currentColor"
          fillOpacity="0.45"
        >
          {dataRotulo(pontos[i].data)}
        </text>
      ))}
    </svg>
  )
}

// Gráfico de linha (SVG) — evolução da FC média (BPM) com escala dinâmica.
// pontos: [{ data, bpm }] (ordem cronológica)
export function GraficoLinhaBpm({ pontos }) {
  if (!pontos || pontos.length === 0) return null
  const LARGURA = 320
  const ALTURA = 130
  const PAD = 10
  const n = pontos.length
  const valores = pontos.map((p) => Number(p.bpm) || 0)
  const minimo = Math.min(...valores)
  const maximo = Math.max(...valores)
  // Base/teto com folga de 15 bpm para a linha não encostar nas bordas
  const base = Math.max(0, minimo - 15)
  const teto = maximo + 15
  const escala = teto - base

  const aux = (i, v) => {
    const x = PAD + (i * (LARGURA - 2 * PAD)) / Math.max(1, n - 1)
    const y = ALTURA - PAD - ((v - base) / escala) * (ALTURA - 2 * PAD)
    return [x.toFixed(1), y.toFixed(1)]
  }
  const linha = valores
    .map((v, i) => `${i === 0 ? 'M' : 'L'}${aux(i, v).join(',')}`)
    .join(' ')
  const x0 = aux(0, valores[0])[0]
  const xUlt = aux(n - 1, valores[n - 1])[0]
  const area = `${linha} L${xUlt},${ALTURA - PAD} L${x0},${ALTURA - PAD} Z`

  const dataRotulo = (d) =>
    new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })

  return (
    <svg viewBox={`0 0 ${LARGURA} ${ALTURA}`} className="w-full">
      {[0, 0.25, 0.5, 0.75, 1].map((k) => {
        const y = ALTURA - PAD - k * (ALTURA - 2 * PAD)
        return (
          <line
            key={k}
            x1={PAD}
            x2={LARGURA - PAD}
            y1={y}
            y2={y}
            stroke="currentColor"
            strokeOpacity="0.08"
            strokeWidth="1"
          />
        )
      })}
      <path d={area} fill="#f43f5e" fillOpacity="0.15" stroke="none" />
      <path
        d={linha}
        fill="none"
        stroke="#f43f5e"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {valores.map((v, i) => {
        const [cx, cy] = aux(i, v)
        return (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r="3"
            fill="currentColor"
            className="text-zinc-50 dark:text-zinc-900"
            stroke="#f43f5e"
            strokeWidth="2"
          />
        )
      })}
      {[0, Math.floor((n - 1) / 2), n - 1].map((i) => (
        <text
          key={i}
          x={aux(i, valores[i])[0]}
          y={ALTURA - 3}
          textAnchor="middle"
          fontSize="8"
          fill="currentColor"
          fillOpacity="0.45"
        >
          {dataRotulo(pontos[i].data)}
        </text>
      ))}
    </svg>
  )
}

// Seletor de períodos Semanal / Mensal / Anual (pills)
export function SeletorPeriodo({ valor, onChange }) {
  return (
    <div className="flex rounded-full border border-zinc-200 bg-zinc-100 p-0.5 text-[11px] font-bold dark:border-zinc-700 dark:bg-zinc-800">
      {[
        ['semanal', 'Semanal'],
        ['mensal', 'Mensal'],
        ['anual', 'Anual']
      ].map(([chave, rotulo]) => (
        <button
          key={chave}
          onClick={() => onChange(chave)}
          className={`rounded-full px-3 py-1 transition ${
            valor === chave
              ? 'bg-primary-500 text-white shadow'
              : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100'
          }`}
        >
          {rotulo}
        </button>
      ))}
    </div>
  )
}