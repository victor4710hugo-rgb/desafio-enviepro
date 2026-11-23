
"use client";

import { useCallback, useEffect, useState } from "react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

type Aba =
  | "empresa"
  | "preferencias"
  | "usuarios"
  | "integracoes";

type DadosEmpresa = {
  nome: string;
  cnpj: string;
  email: string;
  telefone: string;
  endereco: string;
  cidade: string;
};

type Preferencias = {
  idioma: string;
  moeda: string;
  formatoData: string;
  notificacoes: boolean;
  alertasVendas: boolean;
  alertasClientes: boolean;
};

function Icone({
  tipo,
  className = "h-5 w-5",
}: {
  tipo: string;
  className?: string;
}) {
  const paths: Record<string, React.ReactNode> = {
    empresa: (
      <>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M9 20V8h6v12M7 8h.01M17 8h.01M7 12h.01M17 12h.01M7 16h.01M17 16h.01" />
      </>
    ),
    preferencias: (
      <>
        <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3" />
        <path d="M2 14h4M10 8h4M18 16h4" />
      </>
    ),
    usuarios: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="10" cy="7" r="4" />
        <path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
    integracoes: (
      <>
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </>
    ),
    salvar: (
      <>
        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" />
        <path d="M17 21v-8H7v8M7 3v5h8" />
      </>
    ),
    refresh: (
      <>
        <path d="M20 7v5h-5M4 17v-5h5" />
        <path d="M5.6 9A7 7 0 0 1 18 6l2 6M18.4 15A7 7 0 0 1 6 18l-2-6" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    escudo: (
      <>
        <path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
    alerta: (
      <>
        <path d="m10.3 3.9-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3.1l-8-14a2 2 0 0 0-3.4 0Z" />
        <path d="M12 9v4M12 17h.01" />
      </>
    ),
    servidor: (
      <>
        <rect x="3" y="3" width="18" height="8" rx="2" />
        <rect x="3" y="13" width="18" height="8" rx="2" />
        <path d="M7 7h.01M7 17h.01M11 7h6M11 17h6" />
      </>
    ),
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
      {paths[tipo] || paths.empresa}
    </svg>
  );
}

function Campo({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  description,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  description?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-white/75">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-white/10 bg-[#11111f]/80 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-violet-400/50 focus:ring-2 focus:ring-violet-400/10"
      />
      {description && (
        <span className="mt-1.5 block text-xs text-white/35">
          {description}
        </span>
      )}
    </label>
  );
}

function Seletor({
  label,
  value,
  onChange,
  options,
  description,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
  description?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-white/75">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-white/10 bg-[#11111f]/80 px-4 py-3 text-sm text-white outline-none transition focus:border-violet-400/50 focus:ring-2 focus:ring-violet-400/10"
      >
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            className="bg-[#171729]"
          >
            {option.label}
          </option>
        ))}
      </select>
      {description && (
        <span className="mt-1.5 block text-xs text-white/35">
          {description}
        </span>
      )}
    </label>
  );
}

function Interruptor({
  titulo,
  descricao,
  ativo,
  onChange,
}: {
  titulo: string;
  descricao: string;
  ativo: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/[0.07] py-4 last:border-0">
      <div>
        <p className="text-sm font-medium text-white/85">{titulo}</p>
        <p className="mt-1 text-xs text-white/40">{descricao}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={ativo}
        onClick={() => onChange(!ativo)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${
          ativo ? "bg-violet-500" : "bg-white/15"
        }`}
      >
        <span
          className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition ${
            ativo ? "left-6" : "left-1"
          }`}
        />
      </button>
    </div>
  );
}

function Cartao({
  titulo,
  descricao,
  children,
}: {
  titulo: string;
  descricao?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 shadow-xl shadow-black/10 backdrop-blur-xl sm:p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-white">{titulo}</h2>
        {descricao && (
          <p className="mt-1 text-sm text-white/45">{descricao}</p>
        )}
      </div>
      {children}
    </section>
  );
}

export default function ConfiguracoesPage() {
  const [aba, setAba] = useState<Aba>("empresa");
  const [mensagem, setMensagem] = useState("");
  const [carregandoAPI, setCarregandoAPI] = useState(false);
  const [statusAPI, setStatusAPI] = useState<
    "desconhecido" | "online" | "offline"
  >("desconhecido");

  const [empresa, setEmpresa] = useState<DadosEmpresa>({
    nome: "",
    cnpj: "",
    email: "",
    telefone: "",
    endereco: "",
    cidade: "",
  });

  const [preferencias, setPreferencias] = useState<Preferencias>({
    idioma: "pt-BR",
    moeda: "BRL",
    formatoData: "dd/MM/yyyy",
    notificacoes: true,
    alertasVendas: true,
    alertasClientes: false,
  });

  const atualizarEmpresa = (campo: keyof DadosEmpresa, valor: string) => {
    setEmpresa((anterior) => ({
      ...anterior,
      [campo]: valor,
    }));
  };

  const atualizarPreferencia = (
    campo: keyof Preferencias,
    valor: string | boolean
  ) => {
    setPreferencias((anterior) => ({
      ...anterior,
      [campo]: valor,
    }));
  };

  const verificarAPI = useCallback(async () => {
    try {
      setCarregandoAPI(true);

      const resposta = await fetch(`${API_URL}/health`, {
        cache: "no-store",
      });

      if (!resposta.ok) {
        throw new Error("API indisponível");
      }

      setStatusAPI("online");
    } catch {
      setStatusAPI("offline");
    } finally {
      setCarregandoAPI(false);
    }
  }, []);

  useEffect(() => {
    const temporizador = window.setTimeout(() => {
      void verificarAPI();
    }, 0);

    return () => window.clearTimeout(temporizador);
  }, [verificarAPI]);

  const salvarConfiguracoes = () => {
    setMensagem(
      "Alterações aplicadas nesta sessão. A gravação permanente será habilitada na etapa de persistência."
    );

    window.setTimeout(() => {
      setMensagem("");
    }, 5000);
  };

  const abas: {
    id: Aba;
    titulo: string;
    descricao: string;
    icone: string;
  }[] = [
    {
      id: "empresa",
      titulo: "Empresa",
      descricao: "Dados cadastrais",
      icone: "empresa",
    },
    {
      id: "preferencias",
      titulo: "Preferências",
      descricao: "Personalização do sistema",
      icone: "preferencias",
    },
    {
      id: "usuarios",
      titulo: "Usuários e permissões",
      descricao: "Controle de acessos",
      icone: "usuarios",
    },
    {
      id: "integracoes",
      titulo: "Integrações",
      descricao: "Conexões e serviços",
      icone: "integracoes",
    },
  ];

  return (
    <main className="space-y-7 pb-10">
      <section>
        <div className="mb-2 flex items-center gap-2 text-sm text-violet-300">
          <Icone tipo="preferencias" className="h-4 w-4" />
          <span>Administração</span>
          <span className="text-white/30">/</span>
          <span className="text-white/50">Configurações</span>
        </div>

        <h1 className="text-3xl font-semibold tracking-tight text-white">
          Configurações
        </h1>

        <p className="mt-2 text-sm text-white/50">
          Gerencie as informações da empresa e as preferências do EnviePro.
        </p>
      </section>

      {mensagem && (
        <div className="flex items-start gap-3 rounded-xl border border-violet-400/20 bg-violet-400/10 p-4 text-sm text-violet-100">
          <Icone tipo="check" className="mt-0.5 h-5 w-5 shrink-0" />
          <p>{mensagem}</p>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[250px_minmax(0,1fr)]">
        <aside className="h-fit rounded-2xl border border-white/10 bg-white/[0.035] p-3 shadow-lg shadow-black/10 backdrop-blur-xl">
          <p className="px-3 pb-3 pt-2 text-xs font-semibold uppercase tracking-wider text-white/35">
            Menu de configurações
          </p>

          <nav className="space-y-1">
            {abas.map((item) => {
              const selecionada = aba === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => setAba(item.id)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ${
                    selecionada
                      ? "border border-violet-400/20 bg-violet-400/10 text-violet-200"
                      : "border border-transparent text-white/60 hover:bg-white/[0.05] hover:text-white"
                  }`}
                >
                  <Icone
                    tipo={item.icone}
                    className="h-5 w-5 shrink-0"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">
                      {item.titulo}
                    </span>
                    <span className="mt-0.5 block text-xs text-white/35">
                      {item.descricao}
                    </span>
                  </span>
                </button>
              );
            })}
          </nav>
        </aside>

        <div className="min-w-0 space-y-5">
          {aba === "empresa" && (
            <>
              <Cartao
                titulo="Dados da empresa"
                descricao="Informações institucionais e de contato."
              >
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Campo
                      label="Razão social / Nome da empresa"
                      value={empresa.nome}
                      onChange={(valor) => atualizarEmpresa("nome", valor)}
                      placeholder="Digite o nome da empresa"
                    />
                  </div>

                  <Campo
                    label="CNPJ"
                    value={empresa.cnpj}
                    onChange={(valor) => atualizarEmpresa("cnpj", valor)}
                    placeholder="00.000.000/0000-00"
                  />

                  <Campo
                    label="Telefone"
                    value={empresa.telefone}
                    onChange={(valor) =>
                      atualizarEmpresa("telefone", valor)
                    }
                    placeholder="(00) 00000-0000"
                  />

                  <div className="sm:col-span-2">
                    <Campo
                      label="E-mail corporativo"
                      type="email"
                      value={empresa.email}
                      onChange={(valor) => atualizarEmpresa("email", valor)}
                      placeholder="contato@empresa.com.br"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <Campo
                      label="Endereço"
                      value={empresa.endereco}
                      onChange={(valor) =>
                        atualizarEmpresa("endereco", valor)
                      }
                      placeholder="Rua, número e complemento"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <Campo
                      label="Cidade / Estado"
                      value={empresa.cidade}
                      onChange={(valor) => atualizarEmpresa("cidade", valor)}
                      placeholder="Cidade - UF"
                    />
                  </div>
                </div>
              </Cartao>

              <Cartao
                titulo="Identidade do sistema"
                descricao="Informações gerais sobre esta instalação."
              >
                <div className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/[0.025] p-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-400/10 text-violet-300">
                    <Icone tipo="empresa" className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-semibold text-white">EnviePro CRM</p>
                    <p className="mt-1 text-xs text-white/40">
                      Sistema de gestão comercial
                    </p>
                  </div>
                  <span className="ml-auto rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-300">
                    Versão 2.0
                  </span>
                </div>
              </Cartao>
            </>
          )}

          {aba === "preferencias" && (
            <>
              <Cartao
                titulo="Preferências regionais"
                descricao="Defina os padrões de apresentação de informações."
              >
                <div className="grid gap-5 sm:grid-cols-2">
                  <Seletor
                    label="Idioma"
                    value={preferencias.idioma}
                    onChange={(valor) =>
                      atualizarPreferencia("idioma", valor)
                    }
                    options={[
                      { label: "Português (Brasil)", value: "pt-BR" },
                      { label: "English", value: "en-US" },
                      { label: "Español", value: "es-ES" },
                    ]}
                  />

                  <Seletor
                    label="Moeda"
                    value={preferencias.moeda}
                    onChange={(valor) =>
                      atualizarPreferencia("moeda", valor)
                    }
                    options={[
                      { label: "Real brasileiro (R$)", value: "BRL" },
                      { label: "Dólar americano (US$)", value: "USD" },
                      { label: "Euro (€)", value: "EUR" },
                    ]}
                  />

                  <div className="sm:col-span-2">
                    <Seletor
                      label="Formato de data"
                      value={preferencias.formatoData}
                      onChange={(valor) =>
                        atualizarPreferencia("formatoData", valor)
                      }
                      options={[
                        { label: "DD/MM/AAAA", value: "dd/MM/yyyy" },
                        { label: "AAAA-MM-DD", value: "yyyy-MM-dd" },
                        { label: "MM/DD/AAAA", value: "MM/dd/yyyy" },
                      ]}
                    />
                  </div>
                </div>
              </Cartao>

              <Cartao
                titulo="Notificações"
                descricao="Preferências visuais de alertas do sistema."
              >
                <Interruptor
                  titulo="Notificações do sistema"
                  descricao="Habilitar avisos e notificações gerais."
                  ativo={preferencias.notificacoes}
                  onChange={(valor) =>
                    atualizarPreferencia("notificacoes", valor)
                  }
                />

                <Interruptor
                  titulo="Alertas de vendas"
                  descricao="Receber avisos relacionados às atividades comerciais."
                  ativo={preferencias.alertasVendas}
                  onChange={(valor) =>
                    atualizarPreferencia("alertasVendas", valor)
                  }
                />

                <Interruptor
                  titulo="Alertas de clientes"
                  descricao="Receber avisos relacionados ao cadastro de clientes."
                  ativo={preferencias.alertasClientes}
                  onChange={(valor) =>
                    atualizarPreferencia("alertasClientes", valor)
                  }
                />
              </Cartao>
            </>
          )}

          {aba === "usuarios" && (
            <>
              <Cartao
                titulo="Usuários e permissões"
                descricao="Área reservada para administração dos acessos ao CRM."
              >
                <div className="flex flex-col items-center rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-5 py-10 text-center">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-400/10 text-violet-300">
                    <Icone tipo="usuarios" className="h-7 w-7" />
                  </div>

                  <h3 className="text-base font-semibold text-white">
                    Gestão de usuários
                  </h3>

                  <p className="mt-2 max-w-md text-sm leading-6 text-white/45">
                    A estrutura da área está preparada. O cadastro de usuários,
                    autenticação e controle de permissões serão habilitados
                    quando o módulo de acesso estiver integrado ao backend.
                  </p>

                  <span className="mt-5 rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1.5 text-xs text-amber-200">
                    Aguardando integração
                  </span>
                </div>
              </Cartao>

              <Cartao
                titulo="Perfis de acesso previstos"
                descricao="Estrutura planejada para o controle de permissões."
              >
                <div className="space-y-3">
                  {[
                    {
                      nome: "Administrador",
                      descricao:
                        "Acesso completo às configurações e módulos do CRM.",
                      nivel: "Acesso total",
                    },
                    {
                      nome: "Comercial",
                      descricao:
                        "Acesso às áreas de clientes, funil e vendas.",
                      nivel: "Acesso operacional",
                    },
                    {
                      nome: "Consulta",
                      descricao:
                        "Visualização de informações e indicadores.",
                      nivel: "Somente leitura",
                    },
                  ].map((perfil) => (
                    <div
                      key={perfil.nome}
                      className="flex flex-col justify-between gap-3 rounded-xl border border-white/[0.08] bg-white/[0.025] p-4 sm:flex-row sm:items-center"
                    >
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-white/[0.06] p-2 text-white/55">
                          <Icone tipo="escudo" className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white/85">
                            {perfil.nome}
                          </p>
                          <p className="mt-1 text-xs text-white/40">
                            {perfil.descricao}
                          </p>
                        </div>
                      </div>

                      <span className="w-fit rounded-full border border-white/10 px-3 py-1 text-xs text-white/45">
                        {perfil.nivel}
                      </span>
                    </div>
                  ))}
                </div>
              </Cartao>
            </>
          )}

          {aba === "integracoes" && (
            <>
              <Cartao
                titulo="Conexão com o backend"
                descricao="Status da comunicação entre o frontend e a API."
              >
                <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl bg-violet-400/10 p-3 text-violet-300">
                        <Icone tipo="servidor" className="h-6 w-6" />
                      </div>

                      <div>
                        <p className="font-medium text-white">
                          API EnviePro
                        </p>
                        <p className="mt-1 text-xs text-white/40">
                          {API_URL}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {carregandoAPI ? (
                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/60">
                          Verificando...
                        </span>
                      ) : statusAPI === "online" ? (
                        <span className="flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs text-emerald-300">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                          Conectada
                        </span>
                      ) : statusAPI === "offline" ? (
                        <span className="flex items-center gap-2 rounded-full border border-red-400/20 bg-red-400/10 px-3 py-1.5 text-xs text-red-300">
                          <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                          Desconectada
                        </span>
                      ) : (
                        <span className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/50">
                          Não verificada
                        </span>
                      )}

                      <button
                        onClick={verificarAPI}
                        disabled={carregandoAPI}
                        title="Testar conexão"
                        className="rounded-lg border border-white/10 bg-white/[0.05] p-2 text-white/65 transition hover:bg-white/10 disabled:opacity-50"
                      >
                        <Icone
                          tipo="refresh"
                          className={`h-4 w-4 ${
                            carregandoAPI ? "animate-spin" : ""
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              </Cartao>

              <Cartao
                titulo="Serviços do sistema"
                descricao="Visão geral dos componentes utilizados pelo CRM."
              >
                <div className="space-y-3">
                  {[
                    {
                      nome: "Frontend",
                      descricao: "Next.js e React",
                      status: "Ativo",
                    },
                    {
                      nome: "Backend",
                      descricao: "API desenvolvida em Go com Gin",
                      status: "Verificado pela API",
                    },
                    {
                      nome: "Banco de dados",
                      descricao: "SQLite",
                      status: "Acesso via backend",
                    },
                  ].map((servico) => (
                    <div
                      key={servico.nome}
                      className="flex flex-col justify-between gap-2 rounded-xl border border-white/[0.08] bg-white/[0.025] p-4 sm:flex-row sm:items-center"
                    >
                      <div>
                        <p className="text-sm font-medium text-white/85">
                          {servico.nome}
                        </p>
                        <p className="mt-1 text-xs text-white/40">
                          {servico.descricao}
                        </p>
                      </div>

                      <span className="w-fit rounded-full border border-white/10 px-3 py-1 text-xs text-white/50">
                        {servico.status}
                      </span>
                    </div>
                  ))}
                </div>

                <p className="mt-4 text-xs leading-5 text-white/35">
                  O status do banco de dados representa a arquitetura da
                  aplicação. Esta tela não realiza uma conexão direta com o
                  SQLite.
                </p>
              </Cartao>

              <Cartao
                titulo="Informações técnicas"
                descricao="Configuração da comunicação com a aplicação."
              >
                <div className="space-y-3 text-sm">
                  <div className="flex flex-col justify-between gap-1 border-b border-white/[0.07] pb-3 sm:flex-row">
                    <span className="text-white/45">Endereço da API</span>
                    <span className="break-all text-white/75">{API_URL}</span>
                  </div>
                  <div className="flex flex-col justify-between gap-1 border-b border-white/[0.07] pb-3 sm:flex-row">
                    <span className="text-white/45">Verificação</span>
                    <span className="text-white/75">GET /health</span>
                  </div>
                  <div className="flex flex-col justify-between gap-1 sm:flex-row">
                    <span className="text-white/45">Banco de dados</span>
                    <span className="text-white/75">SQLite</span>
                  </div>
                </div>
              </Cartao>
            </>
          )}

          {(aba === "empresa" || aba === "preferencias") && (
            <div className="flex flex-col justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.025] p-4 sm:flex-row sm:items-center">
              <p className="max-w-lg text-xs leading-5 text-white/40">
                As alterações desta tela são demonstrativas e ainda não são
                persistidas no banco de dados.
              </p>

              <button
                onClick={salvarConfiguracoes}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-violet-500 px-5 py-3 text-sm font-medium text-white shadow-lg shadow-violet-950/30 transition hover:bg-violet-400"
              >
                <Icone tipo="salvar" className="h-4 w-4" />
                Aplicar alterações
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
