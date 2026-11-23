
const indicators = [
  {
    label: "Clientes cadastrados",
    value: "—",
    detail: "Base de clientes",
    symbol: "01",
  },
  {
    label: "Oportunidades",
    value: "—",
    detail: "Negócios no funil",
    symbol: "02",
  },
  {
    label: "Vendas realizadas",
    value: "—",
    detail: "Vendas registradas",
    symbol: "03",
  },
  {
    label: "Faturamento do mês",
    value: "—",
    detail: "Total vendido no período",
    symbol: "04",
  },
];

export default function Home() {
  return (
    <div className="space-y-8">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-violet-300/65">
            Visão geral
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Dashboard
          </h1>
          <p className="mt-2 text-sm text-violet-100/50">
            Acompanhe os principais indicadores da sua operação comercial.
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs text-violet-100/65">
          EnviePro <span className="mx-1 text-violet-300/40">/</span> Visão geral
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
        {indicators.map((item) => (
          <article key={item.symbol} className="glass-card rounded-2xl p-5">
            <div className="flex items-start justify-between">
              <p className="text-[13px] font-medium text-violet-100/65">
                {item.label}
              </p>
              <span className="rounded-lg border border-violet-200/10 bg-violet-300/[0.07] px-2 py-1 text-[10px] text-violet-200/50">
                {item.symbol}
              </span>
            </div>
            <p className="mt-6 text-3xl font-semibold tracking-tight text-white">
              {item.value}
            </p>
            <p className="mt-2 text-xs text-violet-100/40">{item.detail}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <article className="glass-card min-h-[290px] rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-white">
                Desempenho de vendas
              </h2>
              <p className="mt-1 text-xs text-violet-100/45">
                Acompanhamento do faturamento ao longo do tempo
              </p>
            </div>
            <span className="rounded-lg border border-white/10 px-3 py-1.5 text-[11px] text-violet-100/55">
              Em breve
            </span>
          </div>
          <div className="mt-8 flex h-40 items-center justify-center rounded-xl border border-dashed border-violet-200/15 bg-violet-300/[0.025]">
            <p className="text-sm text-violet-100/35">
              Gráfico será conectado aos dados de vendas
            </p>
          </div>
        </article>

        <article className="glass-card min-h-[290px] rounded-2xl p-6">
          <h2 className="text-base font-semibold text-white">
            Funil de vendas
          </h2>
          <p className="mt-1 text-xs text-violet-100/45">
            Distribuição das oportunidades por etapa
          </p>
          <div className="mt-8 flex h-40 items-center justify-center rounded-xl border border-dashed border-violet-200/15 bg-violet-300/[0.025]">
            <p className="text-sm text-violet-100/35">
              Etapas serão carregadas pela API
            </p>
          </div>
        </article>
      </section>
    </div>
  );
}
