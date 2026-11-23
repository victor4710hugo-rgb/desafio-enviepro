"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";

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

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

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
  }).format(valor || 0);
}

function numero(valor: number) {
  return new Intl.NumberFormat("pt-BR").format(valor || 0);
}

function Icone({
  tipo,
  className = "h-5 w-5",
}: {
  tipo: "funil" | "dinheiro" | "alvo" | "check" | "refresh" | "seta";
  className?: string;
}) {
  const paths = {
    funil: <path d="M3 4h18l-7 8v6l-4 2v-8L3 4Z" />,
    dinheiro: (
      <>
        <path d="M12 2v20" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </>
    ),
    alvo: (
      <>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="5" />
        <circle cx="12" cy="12" r="1" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
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
  icone: "funil" | "dinheiro" | "alvo" | "check";
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

export default function FunilPage() {
  const [etapas, setEtapas] = useState<EtapaFunil[]>([]);
  const [oportunidades, setOportunidades] = useState<Oportunidade[]>([]);
  const [etapaExpandida, setEtapaExpandida] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const carregarFunil = useCallback(async () => {
    try {
      setErro("");
      setCarregando(true);

      const [respostaFunil, respostaOportunidades] = await Promise.all([
        fetch(`${API_URL}/funil`, { cache: "no-store" }),
        fetch(`${API_URL}/oportunidades`, { cache: "no-store" }),
      ]);

      if (!respostaFunil.ok) {
        throw new Error("Não foi possível carregar os dados do funil.");
      }

      if (!respostaOportunidades.ok) {
        throw new Error(
          "Não foi possível carregar as oportunidades dos clientes."
        );
      }

      const dadosFunil = await respostaFunil.json();
      const dadosOportunidades = await respostaOportunidades.json();

      const listaEtapas: EtapaFunil[] = Array.isArray(dadosFunil)
        ? dadosFunil
        : Array.isArray(dadosFunil.etapas)
          ? dadosFunil.etapas
          : [];

      const listaOportunidades: Oportunidade[] = Array.isArray(
        dadosOportunidades
      )
        ? dadosOportunidades
        : Array.isArray(dadosOportunidades.oportunidades)
          ? dadosOportunidades.oportunidades
          : [];

      setEtapas(listaEtapas);
      setOportunidades(listaOportunidades);
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Ocorreu um erro ao carregar o funil."
      );
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    const temporizador = window.setTimeout(() => {
      void carregarFunil();
    }, 0);

    return () => window.clearTimeout(temporizador);
  }, [carregarFunil]);

  const etapasOrdenadas = useMemo(() => {
    return [...etapas].sort((a, b) => {
      const posicaoA = ORDEM_ETAPAS.indexOf(a.etapa);
      const posicaoB = ORDEM_ETAPAS.indexOf(b.etapa);

      return (
        (posicaoA === -1 ? 999 : posicaoA) -
        (posicaoB === -1 ? 999 : posicaoB)
      );
    });
  }, [etapas]);

  const totalOportunidades = etapas.reduce(
    (total, etapa) => total + Number(etapa.quantidade || 0),
    0
  );

  const valorPipeline = etapas.reduce(
    (total, etapa) => total + Number(etapa.valor_total || 0),
    0
  );

  const oportunidadesFechadas =
    etapas.find((etapa) => etapa.etapa === "Fechada")?.quantidade || 0;

  const valorFechado =
    etapas.find((etapa) => etapa.etapa === "Fechada")?.valor_total || 0;

  const maiorQuantidade = Math.max(
    ...etapas.map((etapa) => Number(etapa.quantidade || 0)),
    1
  );

  return (
    <main className="space-y-7 pb-10">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm text-violet-300">
            <Icone tipo="funil" className="h-4 w-4" />
            <span>Comercial</span>
            <Icone tipo="seta" className="h-3 w-3 text-white/30" />
            <span className="text-white/50">Funil de Vendas</span>
          </div>

          <h1 className="text-3xl font-semibold tracking-tight text-white">
            Funil de Vendas
          </h1>

          <p className="mt-2 text-sm text-white/50">
            Acompanhe suas oportunidades e o desempenho de cada etapa comercial.
          </p>
        </div>

        <button
          onClick={carregarFunil}
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
            onClick={carregarFunil}
            className="mt-2 font-medium underline underline-offset-4"
          >
            Tentar novamente
          </button>
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <CartaoIndicador
          titulo="Total de oportunidades"
          valor={carregando ? "—" : numero(totalOportunidades)}
          descricao="Oportunidades em todas as etapas"
          icone="alvo"
          cor="bg-violet-400/10 text-violet-300"
        />

        <CartaoIndicador
          titulo="Valor do pipeline"
          valor={carregando ? "—" : moeda(valorPipeline)}
          descricao="Valor total das oportunidades"
          icone="dinheiro"
          cor="bg-sky-400/10 text-sky-300"
        />

        <CartaoIndicador
          titulo="Oportunidades fechadas"
          valor={carregando ? "—" : numero(oportunidadesFechadas)}
          descricao="Registros na etapa Fechada"
          icone="check"
          cor="bg-emerald-400/10 text-emerald-300"
        />

        <CartaoIndicador
          titulo="Valor fechado"
          valor={carregando ? "—" : moeda(valorFechado)}
          descricao="Valor na etapa Fechada"
          icone="dinheiro"
          cor="bg-amber-400/10 text-amber-300"
        />
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 shadow-xl shadow-black/10 backdrop-blur-xl sm:p-6">
        <div className="mb-6 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-semibold text-white">
              Visão geral do funil
            </h2>
            <p className="mt-1 text-sm text-white/45">
              Distribuição das oportunidades por etapa.
            </p>
          </div>

          <span className="w-fit rounded-full border border-violet-300/15 bg-violet-300/10 px-3 py-1 text-xs text-violet-200">
            {etapas.length} etapas
          </span>
        </div>

        {carregando ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="h-48 animate-pulse rounded-xl bg-white/[0.05]"
              />
            ))}
          </div>
        ) : etapasOrdenadas.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/[0.025] p-8 text-center text-sm text-white/45">
            Nenhuma etapa foi encontrada na API.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {etapasOrdenadas.map((etapa) => {
              const estilo = CORES_ETAPAS[etapa.etapa] || {
                barra: "bg-violet-400",
                fundo: "bg-violet-400/10",
                texto: "text-violet-300",
              };

              const percentual =
                (Number(etapa.quantidade || 0) / maiorQuantidade) * 100;

              return (
                <article
                  key={etapa.etapa}
                  className="rounded-xl border border-white/10 bg-[#11111f]/70 p-4 transition hover:border-white/20 hover:bg-white/[0.045]"
                >
                  <div className="mb-5 flex items-center justify-between gap-2">
                    <span
                      className={`rounded-lg px-2.5 py-1 text-xs font-medium ${estilo.fundo} ${estilo.texto}`}
                    >
                      {etapa.etapa}
                    </span>

                    <span className="text-xs text-white/35">
                      {numero(etapa.quantidade)} oportunidades
                    </span>
                  </div>

                  <p className="text-xs text-white/45">Valor da etapa</p>

                  <p className="mt-1 text-xl font-semibold tracking-tight text-white">
                    {moeda(Number(etapa.valor_total))}
                  </p>

                  <div className="mt-6">
                    <div className="mb-2 flex items-center justify-between text-xs">
                      <span className="text-white/40">Volume relativo</span>
                      <span className="text-white/60">
                        {Math.round(percentual)}%
                      </span>
                    </div>

                    <div className="h-2 overflow-hidden rounded-full bg-white/10">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${estilo.barra}`}
                        style={{ width: `${percentual}%` }}
                      />
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 shadow-xl shadow-black/10 backdrop-blur-xl sm:p-6">
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-white">
            Resumo por etapa
          </h2>

          <p className="mt-1 text-sm text-white/45">
            Clique em uma etapa para visualizar os clientes e seus dados de
            contato.
          </p>
        </div>

        {carregando ? (
          <div className="h-40 animate-pulse rounded-xl bg-white/[0.05]" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-white/40">
                  <th className="px-3 py-3 font-medium">Etapa</th>
                  <th className="px-3 py-3 text-center font-medium">
                    Oportunidades
                  </th>
                  <th className="px-3 py-3 text-right font-medium">
                    Valor total
                  </th>
                </tr>
              </thead>

              <tbody>
                {etapasOrdenadas.map((etapa) => {
                  const estilo = CORES_ETAPAS[etapa.etapa];
                  const expandida = etapaExpandida === etapa.etapa;

                  const oportunidadesDaEtapa = oportunidades.filter(
                    (oportunidade) => oportunidade.etapa === etapa.etapa
                  );

                  const idDetalhes = `oportunidades-${ORDEM_ETAPAS.indexOf(
                    etapa.etapa
                  )}`;

                  return (
                    <Fragment key={etapa.etapa}>
                      <tr className="border-b border-white/[0.06]">
                        <td className="px-3 py-4">
                          <button
                            type="button"
                            onClick={() =>
                              setEtapaExpandida(
                                expandida ? null : etapa.etapa
                              )
                            }
                            aria-expanded={expandida}
                            aria-controls={idDetalhes}
                            className="flex items-center gap-2 text-left text-white/85 transition hover:text-violet-200"
                          >
                            <Icone
                              tipo="seta"
                              className={`h-4 w-4 transition-transform ${
                                expandida
                                  ? "rotate-90 text-violet-300"
                                  : "text-white/40"
                              }`}
                            />

                            <span
                              className={`h-2 w-2 rounded-full ${
                                estilo?.barra || "bg-violet-400"
                              }`}
                            />

                            <span>{etapa.etapa}</span>
                          </button>
                        </td>

                        <td className="px-3 py-4 text-center text-white/70">
                          {numero(etapa.quantidade)}
                        </td>

                        <td className="px-3 py-4 text-right font-medium text-white">
                          {moeda(Number(etapa.valor_total))}
                        </td>
                      </tr>

                      {expandida && (
                        <tr
                          id={idDetalhes}
                          className="border-b border-white/[0.06]"
                        >
                          <td colSpan={3} className="px-3 py-5">
                            <div className="rounded-xl border border-violet-300/10 bg-violet-300/[0.035] p-4">
                              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                                <div>
                                  <h3 className="text-sm font-semibold text-white">
                                    Clientes nesta etapa
                                  </h3>

                                  <p className="mt-1 text-xs text-white/45">
                                    Oportunidades vinculadas a esta etapa do
                                    funil.
                                  </p>
                                </div>

                                <span className="rounded-full bg-violet-300/10 px-3 py-1 text-xs text-violet-200">
                                  {numero(oportunidadesDaEtapa.length)} registros
                                </span>
                              </div>

                              {oportunidadesDaEtapa.length === 0 ? (
                                <p className="rounded-lg border border-white/10 bg-white/[0.025] p-4 text-sm text-white/45">
                                  Nenhuma oportunidade encontrada nesta etapa.
                                </p>
                              ) : (
                                <div className="grid gap-3 md:grid-cols-2">
                                  {oportunidadesDaEtapa.map((oportunidade) => (
                                    <article
                                      key={oportunidade.id}
                                      className="rounded-xl border border-white/10 bg-[#11111f]/70 p-4"
                                    >
                                      <div className="flex flex-wrap items-start justify-between gap-2">
                                        <div>
                                          <h4 className="font-medium text-white">
                                            {oportunidade.cliente_nome}
                                          </h4>

                                          <p className="mt-1 text-xs text-white/45">
                                            {oportunidade.cliente_empresa}
                                          </p>
                                        </div>

                                        <span className="rounded-lg bg-emerald-400/10 px-2.5 py-1 text-xs font-medium text-emerald-300">
                                          {moeda(Number(oportunidade.valor))}
                                        </span>
                                      </div>

                                      <div className="mt-4 border-t border-white/[0.07] pt-3">
                                        <p className="text-xs text-white/40">
                                          Oportunidade
                                        </p>

                                        <p className="mt-1 text-sm text-white/75">
                                          {oportunidade.titulo}
                                        </p>
                                      </div>

                                      <div className="mt-3 space-y-2">
                                        <div className="flex items-center gap-2 text-sm">
                                          <span className="w-16 shrink-0 text-xs text-white/40">
                                            E-mail
                                          </span>

                                          {oportunidade.cliente_email ? (
                                            <a
                                              href={`mailto:${oportunidade.cliente_email}`}
                                              className="break-all text-violet-300 transition hover:text-violet-200"
                                            >
                                              {oportunidade.cliente_email}
                                            </a>
                                          ) : (
                                            <span className="text-white/35">
                                              Não informado
                                            </span>
                                          )}
                                        </div>

                                        <div className="flex items-center gap-2 text-sm">
                                          <span className="w-16 shrink-0 text-xs text-white/40">
                                            Telefone
                                          </span>

                                          {oportunidade.cliente_telefone ? (
                                            <a
                                              href={`tel:${oportunidade.cliente_telefone}`}
                                              className="text-violet-300 transition hover:text-violet-200"
                                            >
                                              {oportunidade.cliente_telefone}
                                            </a>
                                          ) : (
                                            <span className="text-white/35">
                                              Não informado
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </article>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>

              <tfoot>
                <tr className="border-t border-white/10">
                  <td className="px-3 py-4 font-semibold text-white">
                    Total geral
                  </td>

                  <td className="px-3 py-4 text-center font-semibold text-white">
                    {numero(totalOportunidades)}
                  </td>

                  <td className="px-3 py-4 text-right font-semibold text-violet-200">
                    {moeda(valorPipeline)}
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