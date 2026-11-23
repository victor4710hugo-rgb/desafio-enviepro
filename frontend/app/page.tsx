
"use client";

import { useEffect, useState } from "react";

const API_URL = "http://localhost:8080";

type Cliente = {
  id: number;
  nome: string;
};

type EtapaFunil = {
  etapa: string;
  quantidade: number;
  valor_total: number;
};

type ResumoVendas = {
  mes_referencia: string;
  quantidade_vendas: number;
  ticket_medio: number;
  total_vendido: number;
};

type DashboardData = {
  clientes: Cliente[];
  funil: EtapaFunil[];
  resumo: ResumoVendas;
};

const moeda = (valor: number) =>
  valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

export default function Home() {
  const [dados, setDados] = useState<DashboardData | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    async function carregarDashboard() {
      try {
        setCarregando(true);
        setErro("");

        const [clientesResponse, funilResponse, vendasResponse] =
          await Promise.all([
            fetch(`${API_URL}/clientes`, { cache: "no-store" }),
            fetch(`${API_URL}/funil`, { cache: "no-store" }),
            fetch(`${API_URL}/vendas/resumo`, { cache: "no-store" }),
          ]);

        if (!clientesResponse.ok || !funilResponse.ok || !vendasResponse.ok) {
          throw new Error("Não foi possível consultar todos os dados da API.");
        }

        const [clientes, funil, resumo] = await Promise.all([
          clientesResponse.json(),
          funilResponse.json(),
          vendasResponse.json(),
        ]);

        setDados({ clientes, funil, resumo });
      } catch (error) {
        console.error("Erro ao carregar Dashboard:", error);
        setErro(
          "Não foi possível carregar os dados. Verifique se o backend está em execução na porta 8080."
        );
      } finally {
        setCarregando(false);
      }
    }

    carregarDashboard();
  }, []);

  const totalOportunidades =
    dados?.funil.reduce((total, etapa) => total + etapa.quantidade, 0) ?? 0;

  const indicadores = [
    {
      label: "Clientes cadastrados",
      valor: dados ? dados.clientes.length.toString() : "—",
      detalhe: "Base de clientes",
      simbolo: "01",
    },
    {
      label: "Oportunidades",
      valor: dados ? totalOportunidades.toString() : "—",
      detalhe: "Negócios no funil",
      simbolo: "02",
    },
    {
      label: "Vendas realizadas",
      valor: dados
        ? dados.resumo.quantidade_vendas.toString()
        : "—",
      detalhe: "Vendas no mês",
      simbolo: "03",
    },
    {
      label: "Faturamento do mês",
      valor: dados ? moeda(dados.resumo.total_vendido) : "—",
      detalhe: dados
        ? `Referência: ${dados.resumo.mes_referencia}`
        : "Total vendido no período",
      simbolo: "04",
    },
    {
      label: "Ticket médio",
      valor: dados ? moeda(dados.resumo.ticket_medio) : "—",
      detalhe: "Valor médio por venda",
      simbolo: "05",
    },
  ];

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

      {erro && (
        <div className="rounded-xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-200">
          {erro}
          <button
            onClick={() => window.location.reload()}
            className="ml-2 underline"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {carregando && (
        <p className="text-sm text-violet-200/60">
          Carregando indicadores da API...
        </p>
      )}

      <section className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-5">
        {indicadores.map((item) => (
          <article key={item.simbolo} className="glass-card rounded-2xl p-5">
            <div className="flex items-start justify-between gap-2">
              <p className="text-[13px] font-medium text-violet-100/65">
                {item.label}
              </p>
              <span className="rounded-lg border border-violet-200/10 bg-violet-300/[0.07] px-2 py-1 text-[10px] text-violet-200/50">
                {item.simbolo}
              </span>
            </div>

            <p className="mt-6 break-words text-2xl font-semibold tracking-tight text-white">
              {item.valor}
            </p>

            <p className="mt-2 text-xs text-violet-100/40">
              {item.detalhe}
            </p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <article className="glass-card min-h-[290px] rounded-2xl p-6">
          <h2 className="text-base font-semibold text-white">
            Desempenho de vendas
          </h2>
          <p className="mt-1 text-xs text-violet-100/45">
            Resumo financeiro do mês atual
          </p>

          <div className="mt-8 rounded-xl border border-violet-200/10 bg-violet-300/[0.025] p-5">
            <p className="text-xs text-violet-100/50">
              Faturamento registrado
            </p>
            <p className="mt-2 text-3xl font-semibold text-white">
              {dados ? moeda(dados.resumo.total_vendido) : "—"}
            </p>
            <p className="mt-3 text-xs text-violet-100/40">
              {dados
                ? `${dados.resumo.quantidade_vendas} vendas em ${dados.resumo.mes_referencia}`
                : "Aguardando dados da API"}
            </p>
          </div>

          <p className="mt-4 text-xs text-violet-100/35">
            O gráfico histórico será adicionado quando tivermos uma consulta
            de vendas agrupadas por período.
          </p>
        </article>

        <article className="glass-card min-h-[290px] rounded-2xl p-6">
          <h2 className="text-base font-semibold text-white">
            Funil de vendas
          </h2>
          <p className="mt-1 text-xs text-violet-100/45">
            Oportunidades por etapa
          </p>

          <div className="mt-6 space-y-5">
            {dados?.funil.map((etapa) => {
              const percentual =
                totalOportunidades > 0
                  ? (etapa.quantidade / totalOportunidades) * 100
                  : 0;

              return (
                <div key={etapa.etapa}>
                  <div className="mb-2 flex items-center justify-between text-xs">
                    <span className="text-violet-100/75">
                      {etapa.etapa}
                    </span>
                    <span className="text-white">
                      {etapa.quantidade}
                    </span>
                  </div>

                  <div className="h-2 overflow-hidden rounded-full bg-white/[0.07]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-violet-700 to-violet-300 transition-all"
                      style={{ width: `${percentual}%` }}
                    />
                  </div>

                  <p className="mt-1 text-[10px] text-violet-100/35">
                    {moeda(etapa.valor_total)}
                  </p>
                </div>
              );
            })}

            {!dados && (
              <p className="text-sm text-violet-100/35">
                Aguardando dados do funil...
              </p>
            )}
          </div>
        </article>
      </section>
    </div>
  );
}
