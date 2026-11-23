
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Venda = {
  id: number;
  cliente_id: number;
  cliente: string;
  valor: number;
  data: string;
  produto: string;
};

type ResumoVendas = {
  mes_referencia: string;
  quantidade_vendas: number;
  total_vendido: number;
  ticket_medio: number;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

function moeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(valor) || 0);
}

function numero(valor: number) {
  return new Intl.NumberFormat("pt-BR").format(Number(valor) || 0);
}

function formatarData(data: string) {
  if (!data) return "—";

  const parteData = data.substring(0, 10);
  const partes = parteData.split("-");

  if (partes.length !== 3) return "—";

  const [ano, mes, dia] = partes;
  const dataLocal = new Date(
    Number(ano),
    Number(mes) - 1,
    Number(dia)
  );

  if (Number.isNaN(dataLocal.getTime())) return "—";

  return dataLocal.toLocaleDateString("pt-BR");
}

function formatarMes(referencia: string) {
  if (!referencia) return "Período não informado";

  const partes = referencia.split("-");

  if (partes.length !== 2) return referencia;

  const data = new Date(
    Number(partes[0]),
    Number(partes[1]) - 1,
    1
  );

  if (Number.isNaN(data.getTime())) return referencia;

  return data.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
}

function Icone({
  tipo,
  className = "h-5 w-5",
}: {
  tipo: "vendas" | "dinheiro" | "ticket" | "calendario" | "busca" | "refresh" | "seta";
  className?: string;
}) {
  const paths = {
    vendas: (
      <>
        <path d="M3 3h2l2.4 12.2a2 2 0 0 0 2 1.6h8.8a2 2 0 0 0 2-1.6L22 8H6" />
        <circle cx="10" cy="21" r="1" />
        <circle cx="19" cy="21" r="1" />
      </>
    ),
    dinheiro: (
      <>
        <path d="M12 2v20" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </>
    ),
    ticket: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M7 9h.01M7 15h.01M11 9h6M11 15h6" />
      </>
    ),
    calendario: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 11h18" />
      </>
    ),
    busca: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),
    refresh: (
      <>
        <path d="M20 7v5h-5" />
        <path d="M4 17v-5h5" />
        <path d="M5.6 9A7 7 0 0 1 18 6l2 6" />
        <path d="M18.4 15A7 7 0 0 1 6 18l-2-6" />
      </>
    ),
    seta: <path d="m9 18 6-6-6-6" />,
  };

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {paths[tipo]}
    </svg>
  );
}

function CartaoIndicador({
  titulo,
  valor,
  descricao,
  icone,
  cor,
}: {
  titulo: string;
  valor: string;
  descricao: string;
  icone: "vendas" | "dinheiro" | "ticket" | "calendario";
  cor: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-5 shadow-lg shadow-black/10 backdrop-blur-xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-white/55">{titulo}</p>
          <p className="mt-3 text-2xl font-semibold tracking-tight text-white">
            {valor}
          </p>
          <p className="mt-2 text-xs text-white/40">{descricao}</p>
        </div>
        <div className={`rounded-xl p-3 ${cor}`}>
          <Icone tipo={icone} className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

export default function VendasPage() {
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [resumo, setResumo] = useState<ResumoVendas | null>(null);
  const [busca, setBusca] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const carregarVendas = useCallback(async () => {
    try {
      setErro("");
      setCarregando(true);

      const [respostaVendas, respostaResumo] = await Promise.all([
        fetch(`${API_URL}/vendas`, { cache: "no-store" }),
        fetch(`${API_URL}/vendas/resumo`, { cache: "no-store" }),
      ]);

      if (!respostaVendas.ok) {
        throw new Error("Não foi possível carregar a lista de vendas.");
      }

      if (!respostaResumo.ok) {
        throw new Error("Não foi possível carregar o resumo das vendas.");
      }

      const dadosVendas = await respostaVendas.json();
      const dadosResumo = await respostaResumo.json();

      const lista: Venda[] = Array.isArray(dadosVendas)
        ? dadosVendas
        : Array.isArray(dadosVendas.vendas)
          ? dadosVendas.vendas
          : [];

      setVendas(lista);
      setResumo(dadosResumo);
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Ocorreu um erro ao carregar as vendas."
      );
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    const temporizador = window.setTimeout(() => {
      void carregarVendas();
    }, 0);
    return () => window.clearTimeout(temporizador);
  }, [carregarVendas]);

  const vendasFiltradas = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase("pt-BR");

    if (!termo) return vendas;

    return vendas.filter((venda) => {
      return [
        String(venda.id),
        String(venda.cliente_id),
        venda.cliente,
        venda.produto,
        formatarData(venda.data),
        moeda(Number(venda.valor)),
      ].some((campo) =>
        String(campo || "").toLocaleLowerCase("pt-BR").includes(termo)
      );
    });
  }, [vendas, busca]);

  const totalExibido = vendasFiltradas.reduce(
    (total, venda) => total + Number(venda.valor || 0),
    0
  );

  return (
    <main className="space-y-7 pb-10">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm text-violet-300">
            <Icone tipo="vendas" className="h-4 w-4" />
            <span>Comercial</span>
            <Icone tipo="seta" className="h-3 w-3 text-white/30" />
            <span className="text-white/50">Vendas</span>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-white">
            Vendas
          </h1>
          <p className="mt-2 text-sm text-white/50">
            Acompanhe o faturamento, o ticket médio e o histórico de vendas.
          </p>
        </div>

        <button
          onClick={carregarVendas}
          disabled={carregando}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2.5 text-sm text-white/80 transition hover:bg-white/10 disabled:opacity-50"
        >
          <Icone
            tipo="refresh"
            className={`h-4 w-4 ${carregando ? "animate-spin" : ""}`}
          />
          Atualizar dados
        </button>
      </section>

      {erro && (
        <div className="rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-200">
          <p>{erro}</p>
          <button
            onClick={carregarVendas}
            className="mt-2 font-medium underline underline-offset-4"
          >
            Tentar novamente
          </button>
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <CartaoIndicador
          titulo="Vendas realizadas"
          valor={
            carregando
              ? "—"
              : numero(resumo?.quantidade_vendas ?? vendas.length)
          }
          descricao="Quantidade registrada no período"
          icone="vendas"
          cor="bg-violet-400/10 text-violet-300"
        />
        <CartaoIndicador
          titulo="Faturamento total"
          valor={carregando ? "—" : moeda(resumo?.total_vendido ?? 0)}
          descricao="Total vendido no período"
          icone="dinheiro"
          cor="bg-emerald-400/10 text-emerald-300"
        />
        <CartaoIndicador
          titulo="Ticket médio"
          valor={carregando ? "—" : moeda(resumo?.ticket_medio ?? 0)}
          descricao="Valor médio por venda"
          icone="ticket"
          cor="bg-sky-400/10 text-sky-300"
        />
        <CartaoIndicador
          titulo="Período de referência"
          valor={
            carregando
              ? "—"
              : formatarMes(resumo?.mes_referencia || "")
          }
          descricao="Referência informada pela API"
          icone="calendario"
          cor="bg-amber-400/10 text-amber-300"
        />
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 shadow-xl shadow-black/10 backdrop-blur-xl sm:p-6">
        <div className="mb-5 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <h2 className="text-lg font-semibold text-white">
              Histórico de vendas
            </h2>
            <p className="mt-1 text-sm text-white/45">
              Consulte as vendas registradas no sistema.
            </p>
          </div>

          <div className="relative w-full lg:max-w-sm">
            <Icone
              tipo="busca"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35"
            />
            <input
              type="text"
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Buscar por cliente, produto, data..."
              className="w-full rounded-xl border border-white/10 bg-[#11111f]/70 py-2.5 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-violet-400/50 focus:ring-2 focus:ring-violet-400/10"
            />
          </div>
        </div>

        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-xs text-white/40">
          <span>
            {carregando
              ? "Carregando registros..."
              : `${numero(vendasFiltradas.length)} de ${numero(vendas.length)} vendas`}
          </span>
          {!carregando && busca && (
            <button
              onClick={() => setBusca("")}
              className="text-violet-300 transition hover:text-violet-200"
            >
              Limpar pesquisa
            </button>
          )}
        </div>

        {carregando ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="h-14 animate-pulse rounded-lg bg-white/[0.05]"
              />
            ))}
          </div>
        ) : vendasFiltradas.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/[0.025] p-10 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-white/[0.05] text-white/35">
              <Icone tipo="busca" className="h-5 w-5" />
            </div>
            <p className="font-medium text-white/75">
              Nenhuma venda encontrada
            </p>
            <p className="mt-1 text-sm text-white/40">
              Tente alterar o termo pesquisado.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-white/40">
                  <th className="px-3 py-3 font-medium">Código</th>
                  <th className="px-3 py-3 font-medium">Cliente</th>
                  <th className="px-3 py-3 font-medium">Produto</th>
                  <th className="px-3 py-3 font-medium">Data</th>
                  <th className="px-3 py-3 text-right font-medium">Valor</th>
                </tr>
              </thead>
              <tbody>
                {vendasFiltradas.map((venda) => (
                  <tr
                    key={venda.id}
                    className="border-b border-white/[0.06] transition hover:bg-white/[0.025] last:border-0"
                  >
                    <td className="px-3 py-4">
                      <span className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-xs text-white/65">
                        #{venda.id}
                      </span>
                    </td>
                    <td className="px-3 py-4">
                      <div className="font-medium text-white/85">
                        {venda.cliente || "Cliente não informado"}
                      </div>
                      <div className="mt-1 text-xs text-white/35">
                        ID cliente: {venda.cliente_id}
                      </div>
                    </td>
                    <td className="px-3 py-4 text-white/65">
                      {venda.produto || "—"}
                    </td>
                    <td className="px-3 py-4 text-white/60">
                      {formatarData(venda.data)}
                    </td>
                    <td className="px-3 py-4 text-right font-semibold text-emerald-300">
                      {moeda(Number(venda.valor))}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-white/10">
                  <td
                    colSpan={4}
                    className="px-3 py-4 font-semibold text-white"
                  >
                    Total dos registros exibidos
                  </td>
                  <td className="px-3 py-4 text-right font-semibold text-emerald-300">
                    {moeda(totalExibido)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
