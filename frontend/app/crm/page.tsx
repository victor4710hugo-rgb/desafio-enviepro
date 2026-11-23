
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

const LIMITE_DIAS_SEM_CONTATO = 15;

type Cliente = {
  id: number;
  nome: string;
  empresa: string;
  email: string;
  telefone: string;
  status: string;
  responsavel: string;
  ultimo_contato: string;
};

type EtapaFunil = {
  etapa: string;
  quantidade: number;
  valor_total: number;
};

type Oportunidade = {
  id: number;
  cliente_id: number;
  titulo: string;
  etapa: string;
  valor: number;
  data_criacao: string;
  cliente_nome: string;
  cliente_empresa: string;
  cliente_email: string;
  cliente_telefone: string;
};

type ResumoVendas = {
  mes_referencia: string;
  quantidade_vendas: number;
  ticket_medio: number;
  total_vendido: number;
};

type DadosCRM = {
  clientes: Cliente[];
  etapas: EtapaFunil[];
  oportunidades: Oportunidade[];
  resumo: ResumoVendas;
};

const ORDEM_ETAPAS = [
  "Prospecção",
  "Qualificação",
  "Proposta",
  "Negociação",
  "Fechada",
];

const CORES_ETAPAS: Record<
  string,
  { barra: string; fundo: string; texto: string }
> = {
  Prospecção: {
    barra: "bg-sky-400",
    fundo: "bg-sky-400/10",
    texto: "text-sky-300",
  },
  Qualificação: {
    barra: "bg-violet-400",
    fundo: "bg-violet-400/10",
    texto: "text-violet-300",
  },
  Proposta: {
    barra: "bg-amber-400",
    fundo: "bg-amber-400/10",
    texto: "text-amber-300",
  },
  Negociação: {
    barra: "bg-orange-400",
    fundo: "bg-orange-400/10",
    texto: "text-orange-300",
  },
  Fechada: {
    barra: "bg-emerald-400",
    fundo: "bg-emerald-400/10",
    texto: "text-emerald-300",
  },
};

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
  if (!data) return "Não informado";

  const dataLocal = new Date(`${data.slice(0, 10)}T00:00:00`);

  if (Number.isNaN(dataLocal.getTime())) {
    return "Data inválida";
  }

  return dataLocal.toLocaleDateString("pt-BR");
}

function diasSemContato(data: string) {
  if (!data) return null;

  const dataContato = new Date(`${data.slice(0, 10)}T00:00:00`);

  if (Number.isNaN(dataContato.getTime())) {
    return null;
  }

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const diferenca = hoje.getTime() - dataContato.getTime();

  return Math.floor(diferenca / (1000 * 60 * 60 * 24));
}

function CartaoIndicador({
  titulo,
  valor,
  descricao,
  simbolo,
}: {
  titulo: string;
  valor: string;
  descricao: string;
  simbolo: string;
}) {
  return (
    <article className="glass-card rounded-2xl border border-white/10 p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-violet-100/65">
          {titulo}
        </p>

        <span className="rounded-lg border border-violet-200/10 bg-violet-300/[0.07] px-2 py-1 text-[10px] text-violet-200/60">
          {simbolo}
        </span>
      </div>

      <p className="mt-5 break-words text-2xl font-semibold tracking-tight text-white">
        {valor}
      </p>

      <p className="mt-2 text-xs text-violet-100/40">
        {descricao}
      </p>
    </article>
  );
}

export default function CRMPage() {
  const [dados, setDados] = useState<DadosCRM | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("Todos");

  const carregarCRM = useCallback(async () => {
    try {
      setCarregando(true);
      setErro("");

      const [
        respostaClientes,
        respostaFunil,
        respostaOportunidades,
        respostaVendas,
      ] = await Promise.all([
        fetch(`${API_URL}/clientes`, { cache: "no-store" }),
        fetch(`${API_URL}/funil`, { cache: "no-store" }),
        fetch(`${API_URL}/oportunidades`, { cache: "no-store" }),
        fetch(`${API_URL}/vendas/resumo`, { cache: "no-store" }),
      ]);

      if (
        !respostaClientes.ok ||
        !respostaFunil.ok ||
        !respostaOportunidades.ok ||
        !respostaVendas.ok
      ) {
        throw new Error(
          "Não foi possível carregar todos os dados do CRM."
        );
      }

      const [clientes, etapas, oportunidades, resumo] =
        await Promise.all([
          respostaClientes.json(),
          respostaFunil.json(),
          respostaOportunidades.json(),
          respostaVendas.json(),
        ]);

      setDados({
        clientes,
        etapas,
        oportunidades,
        resumo,
      });
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Ocorreu um erro ao carregar o CRM."
      );
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    const temporizador = window.setTimeout(() => {
      void carregarCRM();
    }, 0);

    return () => window.clearTimeout(temporizador);
  }, [carregarCRM]);

  const clientesFiltrados = useMemo(() => {
    if (!dados) return [];

    const termo = busca.toLowerCase().trim();

    return dados.clientes.filter((cliente) => {
      const correspondeBusca = [
        cliente.nome,
        cliente.empresa,
        cliente.email,
        cliente.telefone,
        cliente.responsavel,
      ].some((campo) =>
        (campo || "").toLowerCase().includes(termo)
      );

      const correspondeStatus =
        filtroStatus === "Todos" ||
        cliente.status === filtroStatus;

      return correspondeBusca && correspondeStatus;
    });
  }, [dados, busca, filtroStatus]);

  const totalOportunidades =
    dados?.etapas.reduce(
      (total, etapa) => total + Number(etapa.quantidade || 0),
      0
    ) || 0;

  const valorPipeline =
    dados?.etapas.reduce(
      (total, etapa) => total + Number(etapa.valor_total || 0),
      0
    ) || 0;

  const clientesSemContato = useMemo(() => {
    if (!dados) return [];

    return dados.clientes.filter((cliente) => {
      const dias = diasSemContato(cliente.ultimo_contato);

      return dias !== null && dias > LIMITE_DIAS_SEM_CONTATO;
    });
  }, [dados]);

  const statusDisponiveis = useMemo(() => {
    if (!dados) return [];

    return [...new Set(dados.clientes.map((cliente) => cliente.status))]
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [dados]);

  const etapasOrdenadas = useMemo(() => {
    if (!dados) return [];

    return [...dados.etapas].sort((a, b) => {
      const posicaoA = ORDEM_ETAPAS.indexOf(a.etapa);
      const posicaoB = ORDEM_ETAPAS.indexOf(b.etapa);

      return (
        (posicaoA === -1 ? 999 : posicaoA) -
        (posicaoB === -1 ? 999 : posicaoB)
      );
    });
  }, [dados]);

  const indicadores = [
    {
      titulo: "Clientes cadastrados",
      valor: dados ? numero(dados.clientes.length) : "—",
      descricao: "Total da base de clientes",
      simbolo: "01",
    },
    {
      titulo: "Oportunidades",
      valor: dados ? numero(totalOportunidades) : "—",
      descricao: "Negócios em todas as etapas",
      simbolo: "02",
    },
    {
      titulo: "Vendas realizadas",
      valor: dados
        ? numero(dados.resumo.quantidade_vendas)
        : "—",
      descricao: "Vendas no mês atual",
      simbolo: "03",
    },
    {
      titulo: "Faturamento do mês",
      valor: dados
        ? moeda(dados.resumo.total_vendido)
        : "—",
      descricao: dados
        ? `Referência: ${dados.resumo.mes_referencia}`
        : "Total vendido no período",
      simbolo: "04",
    },
    {
      titulo: "Ticket médio",
      valor: dados
        ? moeda(dados.resumo.ticket_medio)
        : "—",
      descricao: "Valor médio por venda",
      simbolo: "05",
    },
  ];

  return (
    <main className="space-y-8 pb-10">
      {/* CABEÇALHO */}
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-violet-300/65">
            Gestão comercial
          </p>

          <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            CRM
          </h1>

          <p className="mt-2 text-sm text-violet-100/50">
            Acompanhe seus clientes, oportunidades e resultados comerciais.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void carregarCRM()}
          disabled={carregando}
          className="rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2.5 text-sm font-medium text-white/80 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {carregando ? "Atualizando..." : "Atualizar dados"}
        </button>
      </section>

      {/* ERRO */}
      {erro && (
        <div className="rounded-xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-200">
          <p>{erro}</p>

          <button
            type="button"
            onClick={() => void carregarCRM()}
            className="mt-2 font-medium underline underline-offset-4"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* INDICADORES */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {indicadores.map((indicador) => (
          <CartaoIndicador
            key={indicador.simbolo}
            titulo={indicador.titulo}
            valor={carregando ? "—" : indicador.valor}
            descricao={indicador.descricao}
            simbolo={indicador.simbolo}
          />
        ))}
      </section>

      {/* ALERTA DE CLIENTES */}
      {!carregando && dados && (
        <section
          className={`rounded-2xl border p-5 ${
            clientesSemContato.length > 0
              ? "border-red-400/25 bg-red-500/[0.07]"
              : "border-emerald-400/20 bg-emerald-500/[0.05]"
          }`}
        >
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
            <div>
              <h2
                className={`font-semibold ${
                  clientesSemContato.length > 0
                    ? "text-red-200"
                    : "text-emerald-200"
                }`}
              >
                Acompanhamento de contatos
              </h2>

              <p className="mt-1 text-sm text-white/50">
                Clientes sem contato há mais de 15 dias.
              </p>
            </div>

            <span
              className={`w-fit rounded-full px-3 py-1.5 text-xs font-semibold ${
                clientesSemContato.length > 0
                  ? "bg-red-400/15 text-red-200"
                  : "bg-emerald-400/10 text-emerald-200"
              }`}
            >
              {clientesSemContato.length} cliente(s) em alerta
            </span>
          </div>

          {clientesSemContato.length > 0 ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {clientesSemContato.map((cliente) => (
                <div
                  key={cliente.id}
                  className="rounded-xl border border-red-400/20 bg-red-950/20 p-4"
                >
                  <p className="font-medium text-white">
                    {cliente.nome}
                  </p>

                  <p className="mt-1 text-xs text-red-100/60">
                    {cliente.empresa || "Empresa não informada"}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="text-red-100/60">
                      Último contato: {formatarData(cliente.ultimo_contato)}
                    </span>

                    <span className="font-semibold text-red-200">
                      {diasSemContato(cliente.ultimo_contato)} dias
                    </span>
                  </div>

                  <p className="mt-2 text-xs text-white/45">
                    Responsável: {cliente.responsavel || "Não informado"}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-emerald-100/70">
              Nenhum cliente ultrapassou o limite de 15 dias sem contato.
            </p>
          )}
        </section>
      )}

      {/* FUNIL DE VENDAS */}
      <section className="glass-card rounded-2xl border border-white/10 p-5 sm:p-6">
        <div className="mb-6">
          <p className="text-xs font-medium uppercase tracking-[0.15em] text-violet-300/60">
            Oportunidades comerciais
          </p>

          <h2 className="mt-2 text-lg font-semibold text-white">
            Funil de vendas
          </h2>

          <p className="mt-1 text-sm text-violet-100/45">
            Distribuição das oportunidades por etapa.
          </p>
        </div>

        {carregando ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="h-40 animate-pulse rounded-xl bg-white/[0.05]"
              />
            ))}
          </div>
        ) : etapasOrdenadas.length === 0 ? (
          <p className="rounded-xl border border-white/10 p-6 text-center text-sm text-white/45">
            Nenhuma etapa encontrada.
          </p>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              {etapasOrdenadas.map((etapa) => {
                const estilo = CORES_ETAPAS[etapa.etapa] || {
                  barra: "bg-violet-400",
                  fundo: "bg-violet-400/10",
                  texto: "text-violet-300",
                };

                const percentual =
                  totalOportunidades > 0
                    ? (Number(etapa.quantidade) / totalOportunidades) * 100
                    : 0;

                return (
                  <article
                    key={etapa.etapa}
                    className="rounded-xl border border-white/10 bg-[#11111f]/70 p-4"
                  >
                    <span
                      className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-medium ${estilo.fundo} ${estilo.texto}`}
                    >
                      {etapa.etapa}
                    </span>

                    <p className="mt-5 text-xs text-white/45">
                      Oportunidades
                    </p>

                    <p className="mt-1 text-2xl font-semibold text-white">
                      {numero(etapa.quantidade)}
                    </p>

                    <p className="mt-3 text-xs text-white/45">
                      Valor da etapa
                    </p>

                    <p className="mt-1 text-base font-semibold text-white">
                      {moeda(etapa.valor_total)}
                    </p>

                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                      <div
                        className={`h-full rounded-full ${estilo.barra}`}
                        style={{ width: `${percentual}%` }}
                      />
                    </div>

                    <p className="mt-2 text-right text-[10px] text-white/40">
                      {percentual.toFixed(1)}% do total
                    </p>
                  </article>
                );
              })}
            </div>

            <div className="mt-5 flex flex-col justify-between gap-2 border-t border-white/10 pt-4 sm:flex-row">
              <span className="text-sm text-white/55">
                Total de oportunidades:{" "}
                <strong className="text-white">
                  {numero(totalOportunidades)}
                </strong>
              </span>

              <span className="text-sm text-white/55">
                Valor total do pipeline:{" "}
                <strong className="text-violet-200">
                  {moeda(valorPipeline)}
                </strong>
              </span>
            </div>
          </>
        )}
      </section>

      {/* TABELA DE CLIENTES */}
      <section className="glass-card rounded-2xl border border-white/10 p-5 sm:p-6">
        <div className="mb-5">
          <p className="text-xs font-medium uppercase tracking-[0.15em] text-violet-300/60">
            Relacionamento
          </p>

          <h2 className="mt-2 text-lg font-semibold text-white">
            Base de clientes
          </h2>

          <p className="mt-1 text-sm text-violet-100/45">
            Consulte os clientes e identifique os contatos que precisam de atenção.
          </p>
        </div>

        <div className="mb-5 flex flex-col gap-3 md:flex-row">
          <input
            type="search"
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Pesquisar por nome, empresa, e-mail ou responsável..."
            className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-violet-400/50"
          />

          <select
            value={filtroStatus}
            onChange={(event) => setFiltroStatus(event.target.value)}
            className="rounded-xl border border-white/10 bg-[#211a37] px-4 py-3 text-sm text-white outline-none focus:border-violet-400/50"
          >
            <option value="Todos">Todos os status</option>

            {statusDisponiveis.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>

        {carregando ? (
          <div className="py-12 text-center text-sm text-white/45">
            Carregando clientes...
          </div>
        ) : clientesFiltrados.length === 0 ? (
          <div className="rounded-xl border border-white/10 p-8 text-center text-sm text-white/45">
            Nenhum cliente encontrado com os filtros informados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-white/40">
                  <th className="px-3 py-3 font-medium">Cliente</th>
                  <th className="px-3 py-3 font-medium">Contato</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-3 py-3 font-medium">Responsável</th>
                  <th className="px-3 py-3 font-medium">Último contato</th>
                </tr>
              </thead>

              <tbody>
                {clientesFiltrados.map((cliente) => {
                  const dias = diasSemContato(cliente.ultimo_contato);
                  const emAlerta =
                    dias !== null && dias > LIMITE_DIAS_SEM_CONTATO;

                  return (
                    <tr
                      key={cliente.id}
                      className={`border-b border-white/[0.06] transition ${
                        emAlerta
                          ? "bg-red-500/[0.07] hover:bg-red-500/[0.11]"
                          : "hover:bg-white/[0.025]"
                      }`}
                    >
                      <td className="px-3 py-4">
                        <p className="font-medium text-white">
                          {cliente.nome}
                        </p>

                        <p className="mt-1 text-xs text-white/40">
                          {cliente.empresa || "Empresa não informada"}
                        </p>
                      </td>

                      <td className="px-3 py-4">
                        {cliente.email ? (
                          <a
                            href={`mailto:${cliente.email}`}
                            className="text-violet-300 hover:text-violet-200"
                          >
                            {cliente.email}
                          </a>
                        ) : (
                          <span className="text-white/35">
                            Não informado
                          </span>
                        )}

                        <p className="mt-1 text-xs text-white/40">
                          {cliente.telefone || "Telefone não informado"}
                        </p>
                      </td>

                      <td className="px-3 py-4">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs ${
                            cliente.status.toLowerCase().includes("inativo")
                              ? "border-red-400/20 bg-red-400/10 text-red-300"
                              : "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
                          }`}
                        >
                          {cliente.status}
                        </span>
                      </td>

                      <td className="px-3 py-4 text-white/65">
                        {cliente.responsavel || "Não informado"}
                      </td>

                      <td className="px-3 py-4">
                        <p
                          className={
                            emAlerta
                              ? "font-semibold text-red-300"
                              : "text-white/65"
                          }
                        >
                          {formatarData(cliente.ultimo_contato)}
                        </p>

                        {emAlerta && (
                          <p className="mt-1 text-xs font-medium text-red-300">
                            {dias} dias sem contato
                          </p>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 border-t border-white/10 pt-4 text-xs text-white/40">
          Exibindo {clientesFiltrados.length} de {dados?.clientes.length || 0} clientes.
          Clientes com mais de 15 dias sem contato são destacados em vermelho.
        </div>
      </section>
    </main>
  );
}
