
export default function HomePage() {
  return (
    <main className="min-h-full space-y-8">
      <section className="relative overflow-hidden rounded-2xl border border-violet-500/20 bg-gradient-to-br from-[#171329] via-[#19152e] to-[#10101d] p-8 shadow-2xl shadow-black/20 sm:p-12">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-violet-600/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-purple-500/10 blur-3xl" />

        <div className="relative z-10 max-w-2xl">
          <span className="mb-5 inline-flex items-center rounded-full border border-violet-400/20 bg-violet-400/10 px-3 py-1 text-xs font-medium tracking-wide text-violet-300">
            ENVIEPRO CRM
          </span>

          <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Bem-vindo ao EnviePro CRM
          </h1>

          <p className="mt-5 max-w-xl text-base leading-7 text-gray-300 sm:text-lg">
            Sua plataforma de gestão comercial e relacionamento com clientes.
            Organize suas oportunidades, acompanhe negociações e tenha mais
            controle sobre seus resultados.
          </p>

          <p className="mt-6 text-sm text-gray-400">
            Utilize o menu lateral para acessar as funcionalidades do sistema.
          </p>
        </div>
      </section>
    </main>
  );
}
