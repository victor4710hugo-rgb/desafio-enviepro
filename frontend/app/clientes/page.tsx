
"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const API_URL = "http://localhost:8080";
const SEM_VALOR = "(Sem informação)";

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

type FormularioCliente = Omit<Cliente, "id">;

type Ordenacao =
  | "nome-az"
  | "nome-za"
  | "recente-antigo"
  | "antigo-recente";

type ChaveFiltro =
  | "cliente"
  | "contato"
  | "responsavel"
  | "status"
  | "data";

type Filtros = Record<ChaveFiltro, string[]>;

const filtrosVazios: Filtros = {
  cliente: [],
  contato: [],
  responsavel: [],
  status: [],
  data: [],
};

const formularioVazio: FormularioCliente = {
  nome: "",
  empresa: "",
  email: "",
  telefone: "",
  status: "Ativo",
  responsavel: "",
  ultimo_contato: new Date().toISOString().slice(0, 10),
};

function normalizarValor(valor: string | null | undefined) {
  return valor?.trim() || SEM_VALOR;
}

function formatarData(data: string) {
  if (!data || data === SEM_VALOR) return "—";

  const dataLocal = new Date(`${data.slice(0, 10)}T00:00:00`);

  if (Number.isNaN(dataLocal.getTime())) return data;

  return dataLocal.toLocaleDateString("pt-BR");
}

// COMPONENTE DE FILTRO NO ESTILO EXCEL
type FiltroDropdownProps = {
  titulo: string;
  valores: string[];
  selecionados: string[];
  onChange: (valores: string[]) => void;
  formatarOpcao?: (valor: string) => string;
  aberto: boolean;
  onToggle: () => void;
  onFechar: () => void;
};

function FiltroDropdown({
  titulo,
  valores,
  selecionados,
  onChange,
  formatarOpcao,
  aberto,
  onToggle,
  onFechar,
}: FiltroDropdownProps) {
  const [pesquisa, setPesquisa] = useState("");
  const referencia = useRef<HTMLDivElement>(null);

  // Fecha o filtro quando o usuário clica fora dele.
  useEffect(() => {
    if (!aberto) return;

    function verificarCliqueFora(event: MouseEvent) {
      if (
        referencia.current &&
        !referencia.current.contains(event.target as Node)
      ) {
        onFechar();
      }
    }

    document.addEventListener("mousedown", verificarCliqueFora);

    return () => {
      document.removeEventListener("mousedown", verificarCliqueFora);
    };
  }, [aberto, onFechar]);

  const opcoesVisiveis = valores.filter((valor) =>
    valor.toLowerCase().includes(pesquisa.toLowerCase().trim())
  );

  function alternarOpcao(valor: string) {
    if (selecionados.includes(valor)) {
      onChange(selecionados.filter((item) => item !== valor));
    } else {
      onChange([...selecionados, valor]);
    }
  }

  return (
    <div ref={referencia} className="relative inline-block">
      <button
        type="button"
        onClick={onToggle}
        title={`Filtrar ${titulo}`}
        aria-label={`Filtrar ${titulo}`}
        aria-expanded={aberto}
        className={`inline-flex items-center justify-center rounded-md p-1 transition ${
          selecionados.length > 0
            ? "bg-violet-500/20 text-violet-300"
            : "text-gray-500 hover:bg-white/10 hover:text-violet-300"
        }`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 5h16l-6.5 7.5v5l-3 1.5v-6.5L4 5z" />
        </svg>

        {selecionados.length > 0 && (
          <span className="ml-1 text-[10px] font-bold">
            {selecionados.length}
          </span>
        )}
      </button>

      {aberto && (
        <div className="absolute left-0 top-full z-50 mt-2 w-64 rounded-xl border border-violet-400/20 bg-[#211a37] p-3 shadow-2xl">
          <div className="mb-3">
            <p className="text-sm font-semibold text-white">
              Filtrar: {titulo}
            </p>

            <p className="mt-1 text-xs text-gray-400">
              Selecione os valores que deseja visualizar.
            </p>
          </div>

          <input
            type="text"
            value={pesquisa}
            onChange={(e) => setPesquisa(e.target.value)}
            placeholder="Pesquisar valores..."
            className="mb-3 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white outline-none placeholder:text-gray-500 focus:border-violet-400/60"
          />

          <div className="mb-2 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => onChange(valores)}
              className="text-xs text-violet-300 hover:text-violet-200"
            >
              Selecionar todos
            </button>

            <button
              type="button"
              onClick={() => onChange([])}
              className="text-xs text-gray-400 hover:text-white"
            >
              Limpar filtro
            </button>
          </div>

          <div className="max-h-52 space-y-1 overflow-y-auto border-t border-white/10 pt-2">
            {opcoesVisiveis.length === 0 && (
              <p className="py-3 text-center text-xs text-gray-500">
                Nenhum valor encontrado.
              </p>
            )}

            {opcoesVisiveis.map((valor) => (
              <label
                key={valor}
                className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-xs text-gray-300 transition hover:bg-white/5"
              >
                <input
                  type="checkbox"
                  checked={selecionados.includes(valor)}
                  onChange={() => alternarOpcao(valor)}
                  className="h-3.5 w-3.5 accent-violet-500"
                />

                <span className="break-all">
                  {formatarOpcao
                    ? formatarOpcao(valor)
                    : valor}
                </span>
              </label>
            ))}
          </div>

          <div className="mt-3 border-t border-white/10 pt-3">
            <p className="text-[11px] text-gray-500">
              {selecionados.length === 0
                ? "Todos os valores estão sendo exibidos."
                : `${selecionados.length} valor(es) selecionado(s).`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [busca, setBusca] = useState("");

  const [ordenacao, setOrdenacao] =
    useState<Ordenacao>("nome-az");

  const [filtros, setFiltros] =
    useState<Filtros>(filtrosVazios);

  // Controla qual filtro está aberto.
  // Apenas um pode ficar aberto por vez.
  const [filtroAberto, setFiltroAberto] =
    useState<ChaveFiltro | null>(null);

  const [modalAberto, setModalAberto] = useState(false);
  const [clienteEditando, setClienteEditando] =
    useState<number | null>(null);

  const [formulario, setFormulario] =
    useState<FormularioCliente>(formularioVazio);

  const [clienteExcluindo, setClienteExcluindo] =
    useState<Cliente | null>(null);

  const [mensagem, setMensagem] = useState("");

  useEffect(() => {
    async function carregarClientes() {
      try {
        const resposta = await fetch(`${API_URL}/clientes`, {
          cache: "no-store",
        });

        if (!resposta.ok) {
          throw new Error("Não foi possível carregar os clientes.");
        }

        const dados: Cliente[] = await resposta.json();
        setClientes(dados);
      } catch (error) {
        setErro(
          error instanceof Error
            ? error.message
            : "Erro ao carregar os clientes."
        );
      } finally {
        setCarregando(false);
      }
    }

    carregarClientes();
  }, []);

  function atualizarFiltro(
    chave: ChaveFiltro,
    valores: string[]
  ) {
    setFiltros((atuais) => ({
      ...atuais,
      [chave]: valores,
    }));
  }

  function limparTodosFiltros() {
    setFiltros(filtrosVazios);
    setBusca("");
    setFiltroAberto(null);
  }

  const valoresFiltro = useMemo(() => {
    const unicos = (valores: string[]) =>
      [...new Set(valores.map(normalizarValor))].sort(
        (a, b) => a.localeCompare(b, "pt-BR")
      );

    return {
      cliente: unicos(
        clientes.flatMap((c) => [c.nome, c.empresa])
      ),
      contato: unicos(
        clientes.flatMap((c) => [c.email, c.telefone])
      ),
      responsavel: unicos(clientes.map((c) => c.responsavel)),
      status: unicos(clientes.map((c) => c.status)),
      data: unicos(clientes.map((c) => c.ultimo_contato)),
    };
  }, [clientes]);

  const clientesFiltrados = useMemo(() => {
    const termo = busca.toLowerCase().trim();

    let resultado = clientes.filter((cliente) => {
      // PESQUISA GERAL
      const correspondeBusca = [
        cliente.nome,
        cliente.empresa,
        cliente.email,
        cliente.telefone,
        cliente.status,
        cliente.responsavel,
      ]
        .filter(Boolean)
        .some((campo) => campo.toLowerCase().includes(termo));

      if (!correspondeBusca) return false;

      // FILTRO CLIENTE
      if (filtros.cliente.length > 0) {
        const valoresCliente = [
          normalizarValor(cliente.nome),
          normalizarValor(cliente.empresa),
        ];

        if (
          !filtros.cliente.some((valor) =>
            valoresCliente.includes(valor)
          )
        ) {
          return false;
        }
      }

      // FILTRO CONTATO
      if (filtros.contato.length > 0) {
        const valoresContato = [
          normalizarValor(cliente.email),
          normalizarValor(cliente.telefone),
        ];

        if (
          !filtros.contato.some((valor) =>
            valoresContato.includes(valor)
          )
        ) {
          return false;
        }
      }

      // FILTRO RESPONSÁVEL
      if (
        filtros.responsavel.length > 0 &&
        !filtros.responsavel.includes(
          normalizarValor(cliente.responsavel)
        )
      ) {
        return false;
      }

      // FILTRO STATUS
      if (
        filtros.status.length > 0 &&
        !filtros.status.includes(normalizarValor(cliente.status))
      ) {
        return false;
      }

      // FILTRO DATA
      if (
        filtros.data.length > 0 &&
        !filtros.data.includes(
          normalizarValor(cliente.ultimo_contato)
        )
      ) {
        return false;
      }

      return true;
    });

    // ORDENAÇÃO
    resultado = [...resultado].sort((a, b) => {
      if (ordenacao === "nome-az") {
        return a.nome.localeCompare(b.nome, "pt-BR");
      }

      if (ordenacao === "nome-za") {
        return b.nome.localeCompare(a.nome, "pt-BR");
      }

      const dataA = a.ultimo_contato || "";
      const dataB = b.ultimo_contato || "";

      if (ordenacao === "recente-antigo") {
        return dataB.localeCompare(dataA);
      }

      return dataA.localeCompare(dataB);
    });

    return resultado;
  }, [clientes, busca, ordenacao, filtros]);

  function statusEstilo(status: string) {
    const valor = status?.toLowerCase() || "";

    if (valor.includes("inativo")) {
      return "bg-red-500/15 text-red-300 border-red-500/20";
    }

    if (valor.includes("ativo")) {
      return "bg-emerald-500/15 text-emerald-300 border-emerald-500/20";
    }

    return "bg-violet-500/15 text-violet-300 border-violet-500/20";
  }

  function abrirNovoCliente() {
    setClienteEditando(null);
    setFormulario({
      ...formularioVazio,
      ultimo_contato: new Date().toISOString().slice(0, 10),
    });
    setModalAberto(true);
  }

  function abrirEdicao(cliente: Cliente) {
    setClienteEditando(cliente.id);

    setFormulario({
      nome: cliente.nome,
      empresa: cliente.empresa,
      email: cliente.email,
      telefone: cliente.telefone,
      status: cliente.status,
      responsavel: cliente.responsavel,
      ultimo_contato: cliente.ultimo_contato,
    });

    setModalAberto(true);
  }

  function atualizarCampo(
    campo: keyof FormularioCliente,
    valor: string
  ) {
    setFormulario((atual) => ({
      ...atual,
      [campo]: valor,
    }));
  }

  function salvarCliente(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (clienteEditando !== null) {
      setClientes((atuais) =>
        atuais.map((cliente) =>
          cliente.id === clienteEditando
            ? { ...formulario, id: clienteEditando }
            : cliente
        )
      );

      setMensagem("Cliente atualizado com sucesso!");
    } else {
      const novoCliente: Cliente = {
        ...formulario,
        id: Math.max(0, ...clientes.map((c) => c.id)) + 1,
      };

      setClientes((atuais) => [...atuais, novoCliente]);
      setMensagem("Cliente cadastrado com sucesso!");
    }

    setModalAberto(false);
    setClienteEditando(null);
    setFormulario(formularioVazio);
    setFiltroAberto(null);

    window.setTimeout(() => setMensagem(""), 3500);
  }

  function excluirCliente() {
    if (!clienteExcluindo) return;

    setClientes((atuais) =>
      atuais.filter((cliente) => cliente.id !== clienteExcluindo.id)
    );

    setClienteExcluindo(null);
    setMensagem("Cliente excluído com sucesso!");

    window.setTimeout(() => setMensagem(""), 3500);
  }

  const quantidadeFiltrosAtivos =
    Object.values(filtros).filter((valores) => valores.length > 0)
      .length;

  return (
    <main className="space-y-8">
      {/* CABEÇALHO */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="mb-2 text-sm text-violet-300">
            EnviePro / Clientes
          </p>

          <h1 className="text-3xl font-semibold text-white">
            Clientes
          </h1>

          <p className="mt-2 text-sm text-gray-400">
            Consulte, cadastre e acompanhe sua base de clientes.
          </p>
        </div>

        <button
          onClick={abrirNovoCliente}
          className="flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-900/20 transition hover:bg-violet-500"
        >
          <span className="text-lg">+</span>
          Novo cliente
        </button>
      </div>

      {/* INDICADORES */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="glass-card rounded-2xl border border-white/10 p-5">
          <p className="text-sm text-gray-400">Total de clientes</p>
          <p className="mt-2 text-3xl font-semibold text-white">
            {clientes.length.toString().padStart(2, "0")}
          </p>
        </div>

        <div className="glass-card rounded-2xl border border-white/10 p-5">
          <p className="text-sm text-gray-400">Clientes ativos</p>
          <p className="mt-2 text-3xl font-semibold text-emerald-300">
            {
              clientes.filter((c) =>
                c.status.toLowerCase().includes("ativo") &&
                !c.status.toLowerCase().includes("inativo")
              ).length
            }
          </p>
        </div>

        <div className="glass-card rounded-2xl border border-white/10 p-5">
          <p className="text-sm text-gray-400">Clientes inativos</p>
          <p className="mt-2 text-3xl font-semibold text-red-300">
            {
              clientes.filter((c) =>
                c.status.toLowerCase().includes("inativo")
              ).length
            }
          </p>
        </div>
      </div>

      {/* MENSAGEM DE SUCESSO */}
      {mensagem && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-5 py-3 text-sm text-emerald-300">
          {mensagem}
        </div>
      )}

      {/* TABELA */}
      <section className="glass-card rounded-2xl border border-white/10 p-5">
        <div className="mb-5 flex flex-col gap-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">
                Base de clientes
              </h2>

              <p className="mt-1 text-sm text-gray-400">
                {clientesFiltrados.length} de {clientes.length} cliente(s)
                exibido(s)
              </p>
            </div>

            {(quantidadeFiltrosAtivos > 0 || busca) && (
              <button
                type="button"
                onClick={limparTodosFiltros}
                className="self-start rounded-lg border border-violet-400/20 bg-violet-500/10 px-3 py-2 text-xs text-violet-300 transition hover:bg-violet-500/20 sm:self-auto"
              >
                Limpar todos os filtros
              </button>
            )}
          </div>

          <div className="flex flex-col gap-3 lg:flex-row">
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Pesquisar por nome, empresa ou e-mail..."
              className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-500 focus:border-violet-400/60"
            />

            <select
              value={ordenacao}
              onChange={(e) =>
                setOrdenacao(e.target.value as Ordenacao)
              }
              className="rounded-xl border border-white/10 bg-[#211a37] px-4 py-3 text-sm text-white outline-none focus:border-violet-400/60"
            >
              <option value="nome-az">Nome: A–Z</option>
              <option value="nome-za">Nome: Z–A</option>
              <option value="recente-antigo">
                Mais recente – mais antigo
              </option>
              <option value="antigo-recente">
                Mais antigo – mais recente
              </option>
            </select>
          </div>
        </div>

        {carregando && (
          <div className="py-12 text-center text-gray-400">
            Carregando clientes...
          </div>
        )}

        {!carregando && erro && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-5 text-sm text-red-300">
            {erro}
            <button
              onClick={() => window.location.reload()}
              className="ml-2 underline"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {!carregando && !erro && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1150px] text-left">
              <thead>
                <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-gray-400">
                  <th className="px-4 py-3 font-medium">
                    <div className="flex items-center gap-2">
                      <span>Cliente</span>
                      <FiltroDropdown
                        titulo="Cliente"
                        valores={valoresFiltro.cliente}
                        selecionados={filtros.cliente}
                        onChange={(v) => atualizarFiltro("cliente", v)}
                        aberto={filtroAberto === "cliente"}
                        onToggle={() =>
                          setFiltroAberto((atual) =>
                            atual === "cliente" ? null : "cliente"
                          )
                        }
                        onFechar={() => setFiltroAberto(null)}
                      />
                    </div>
                  </th>

                  <th className="px-4 py-3 font-medium">
                    <div className="flex items-center gap-2">
                      <span>Contato</span>
                      <FiltroDropdown
                        titulo="Contato"
                        valores={valoresFiltro.contato}
                        selecionados={filtros.contato}
                        onChange={(v) => atualizarFiltro("contato", v)}
                        aberto={filtroAberto === "contato"}
                        onToggle={() =>
                          setFiltroAberto((atual) =>
                            atual === "contato" ? null : "contato"
                          )
                        }
                        onFechar={() => setFiltroAberto(null)}
                      />
                    </div>
                  </th>

                  <th className="px-4 py-3 font-medium">
                    <div className="flex items-center gap-2">
                      <span>Responsável</span>
                      <FiltroDropdown
                        titulo="Responsável"
                        valores={valoresFiltro.responsavel}
                        selecionados={filtros.responsavel}
                        onChange={(v) => atualizarFiltro("responsavel", v)}
                        aberto={filtroAberto === "responsavel"}
                        onToggle={() =>
                          setFiltroAberto((atual) =>
                            atual === "responsavel" ? null : "responsavel"
                          )
                        }
                        onFechar={() => setFiltroAberto(null)}
                      />
                    </div>
                  </th>

                  <th className="px-4 py-3 font-medium">
                    <div className="flex items-center gap-2">
                      <span>Status</span>
                      <FiltroDropdown
                        titulo="Status"
                        valores={valoresFiltro.status}
                        selecionados={filtros.status}
                        onChange={(v) => atualizarFiltro("status", v)}
                        aberto={filtroAberto === "status"}
                        onToggle={() =>
                          setFiltroAberto((atual) =>
                            atual === "status" ? null : "status"
                          )
                        }
                        onFechar={() => setFiltroAberto(null)}
                      />
                    </div>
                  </th>

                  <th className="px-4 py-3 font-medium">
                    <div className="flex items-center gap-2">
                      <span>Último contato</span>
                      <FiltroDropdown
                        titulo="Último contato"
                        valores={valoresFiltro.data}
                        selecionados={filtros.data}
                        onChange={(v) => atualizarFiltro("data", v)}
                        formatarOpcao={formatarData}
                        aberto={filtroAberto === "data"}
                        onToggle={() =>
                          setFiltroAberto((atual) =>
                            atual === "data" ? null : "data"
                          )
                        }
                        onFechar={() => setFiltroAberto(null)}
                      />
                    </div>
                  </th>

                  <th className="px-4 py-4 text-right font-medium">
                    Ações
                  </th>
                </tr>
              </thead>

              <tbody>
                {clientesFiltrados.map((cliente) => (
                  <tr
                    key={cliente.id}
                    className="border-b border-white/5 transition hover:bg-white/[0.03]"
                  >
                    <td className="px-4 py-4">
                      <p className="font-medium text-white">
                        {cliente.nome}
                      </p>

                      <p className="mt-1 text-xs text-gray-500">
                        {cliente.empresa || "Empresa não informada"}
                      </p>
                    </td>

                    <td className="px-4 py-4">
                      <p className="text-sm text-gray-300">
                        {cliente.email || "—"}
                      </p>

                      <p className="mt-1 text-xs text-gray-500">
                        {cliente.telefone || "—"}
                      </p>
                    </td>

                    <td className="px-4 py-4 text-sm text-gray-300">
                      {cliente.responsavel || "—"}
                    </td>

                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${statusEstilo(cliente.status)}`}
                      >
                        {cliente.status || "Não informado"}
                      </span>
                    </td>

                    <td className="px-4 py-4 text-sm text-gray-400">
                      {formatarData(cliente.ultimo_contato)}
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => abrirEdicao(cliente)}
                          title="Editar cliente"
                          className="rounded-lg border border-violet-400/20 bg-violet-500/10 px-3 py-2 text-xs text-violet-300 transition hover:bg-violet-500/20"
                        >
                          Editar
                        </button>

                        <button
                          onClick={() => setClienteExcluindo(cliente)}
                          title="Excluir cliente"
                          className="rounded-lg border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs text-red-300 transition hover:bg-red-500/20"
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {clientesFiltrados.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-12 text-center text-sm text-gray-400"
                    >
                      Nenhum cliente encontrado com os filtros selecionados.

                      <div className="mt-3">
                        <button
                          type="button"
                          onClick={limparTodosFiltros}
                          className="text-violet-300 underline hover:text-violet-200"
                        >
                          Limpar filtros
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* MODAL DE CADASTRO E EDIÇÃO */}
      {modalAberto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setModalAberto(false);
          }}
        >
          <div className="my-auto w-full max-w-2xl rounded-2xl border border-violet-400/20 bg-[#19142b] p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white">
                  {clienteEditando !== null
                    ? "Editar cliente"
                    : "Novo cliente"}
                </h2>

                <p className="mt-1 text-sm text-gray-400">
                  Preencha as informações do cliente.
                </p>
              </div>

              <button
                onClick={() => setModalAberto(false)}
                className="rounded-lg px-3 py-2 text-gray-400 transition hover:bg-white/10 hover:text-white"
                aria-label="Fechar formulário"
              >
                ✕
              </button>
            </div>

            <form onSubmit={salvarCliente} className="space-y-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-2 block text-sm text-gray-300">
                    Nome completo *
                  </label>

                  <input
                    required
                    value={formulario.nome}
                    onChange={(e) =>
                      atualizarCampo("nome", e.target.value)
                    }
                    placeholder="Nome do cliente"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-500 focus:border-violet-400/60"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-gray-300">
                    Empresa
                  </label>

                  <input
                    value={formulario.empresa}
                    onChange={(e) =>
                      atualizarCampo("empresa", e.target.value)
                    }
                    placeholder="Nome da empresa"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-500 focus:border-violet-400/60"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-gray-300">
                    E-mail
                  </label>

                  <input
                    type="email"
                    value={formulario.email}
                    onChange={(e) =>
                      atualizarCampo("email", e.target.value)
                    }
                    placeholder="email@empresa.com"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-500 focus:border-violet-400/60"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-gray-300">
                    Telefone
                  </label>

                  <input
                    value={formulario.telefone}
                    onChange={(e) =>
                      atualizarCampo("telefone", e.target.value)
                    }
                    placeholder="(00) 00000-0000"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-500 focus:border-violet-400/60"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-gray-300">
                    Responsável
                  </label>

                  <input
                    value={formulario.responsavel}
                    onChange={(e) =>
                      atualizarCampo("responsavel", e.target.value)
                    }
                    placeholder="Responsável pelo cliente"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-500 focus:border-violet-400/60"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-gray-300">
                    Status
                  </label>

                  <select
                    value={formulario.status}
                    onChange={(e) =>
                      atualizarCampo("status", e.target.value)
                    }
                    className="w-full rounded-xl border border-white/10 bg-[#211a37] px-4 py-3 text-sm text-white outline-none focus:border-violet-400/60"
                  >
                    <option value="Ativo">Ativo</option>
                    <option value="Inativo">Inativo</option>
                    <option value="Prospecto">Prospecto</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm text-gray-300">
                    Último contato
                  </label>

                  <input
                    type="date"
                    value={formulario.ultimo_contato}
                    onChange={(e) =>
                      atualizarCampo("ultimo_contato", e.target.value)
                    }
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-violet-400/60"
                  />
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-white/10 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setModalAberto(false)}
                  className="rounded-xl border border-white/10 px-5 py-3 text-sm text-gray-300 transition hover:bg-white/5"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-500"
                >
                  {clienteEditando !== null
                    ? "Salvar alterações"
                    : "Cadastrar cliente"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
      {clienteExcluindo && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-red-400/20 bg-[#19142b] p-6 shadow-2xl">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/10 text-xl text-red-300">
              !
            </div>

            <h2 className="text-xl font-semibold text-white">
              Excluir cliente?
            </h2>

            <p className="mt-3 text-sm leading-relaxed text-gray-400">
              Tem certeza de que deseja excluir{" "}
              <strong className="text-white">
                {clienteExcluindo.nome}
              </strong>
              ? Esta ação removerá o cliente da lista nesta demonstração.
            </p>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                onClick={() => setClienteExcluindo(null)}
                className="rounded-xl border border-white/10 px-5 py-3 text-sm text-gray-300 transition hover:bg-white/5"
              >
                Cancelar
              </button>

              <button
                onClick={excluirCliente}
                className="rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-500"
              >
                Sim, excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
