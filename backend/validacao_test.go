package main

import (
	"database/sql"
	"fmt"
	"strings"
	"testing"

	_ "modernc.org/sqlite"
)

// ---------- Funções auxiliares dos testes ----------

func conferirResultado(
	t *testing.T,
	err error,
	trechosEsperados []string,
) {
	t.Helper()

	if len(trechosEsperados) == 0 {
		if err != nil {
			t.Fatalf("esperava entrada válida, mas houve erro: %v", err)
		}
		return
	}

	if err == nil {
		t.Fatalf(
			"esperava erro contendo %q, mas a validação passou",
			trechosEsperados,
		)
	}

	for _, trecho := range trechosEsperados {
		if !strings.Contains(err.Error(), trecho) {
			t.Errorf(
				"a mensagem %q deveria conter %q",
				err.Error(),
				trecho,
			)
		}
	}
}

// abrirBancoEmMemoria cria um SQLite temporário na memória.
// O arquivo crm.db não é usado nem modificado.
func abrirBancoEmMemoria(t *testing.T) *sql.DB {
	t.Helper()

	db, err := sql.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("erro ao abrir banco em memória: %v", err)
	}

	db.SetMaxOpenConns(1)

	t.Cleanup(func() {
		db.Close()
	})

	if err := criarTabelas(db); err != nil {
		t.Fatalf("erro ao criar tabelas: %v", err)
	}

	return db
}

// inserirUsuarioTeste insere uma linha diretamente para os testes.
// O valor de senha_hash é fictício.
func inserirUsuarioTeste(
	db *sql.DB,
	nome, email, papel string,
) (int64, error) {
	resultado, err := db.Exec(
		`INSERT INTO usuarios (nome, email, senha_hash, papel)
		 VALUES (?, ?, ?, ?)`,
		nome,
		normalizarEmail(email),
		"hash-ficticio-apenas-para-teste",
		papel,
	)

	if err != nil {
		return 0, err
	}

	return resultado.LastInsertId()
}

// ---------- Nome ----------

func TestValidarNome(t *testing.T) {
	casos := []struct {
		nome    string
		entrada string
		erros   []string
	}{
		{"nome comum", "Maria Silva", nil},
		{"espaços nas pontas", "  João  ", nil},
		{"texto vazio", "", []string{"obrigatório"}},
		{"só espaços", "    ", []string{"obrigatório"}},
		{"só tab e quebra de linha", "\t\n", []string{"obrigatório"}},
	}

	for _, tc := range casos {
		t.Run(tc.nome, func(t *testing.T) {
			conferirResultado(
				t,
				validarNome(tc.entrada),
				tc.erros,
			)
		})
	}
}

// ---------- E-mail ----------

func TestNormalizarEmail(t *testing.T) {
	casos := []struct {
		nome     string
		entrada  string
		esperado string
	}{
		{"já normalizado", "ana@x.com", "ana@x.com"},
		{"maiúsculas e espaços", " ANA@X.COM ", "ana@x.com"},
		{"tab e quebra de linha", "\tJoao@Empresa.com\n", "joao@empresa.com"},
	}

	for _, tc := range casos {
		t.Run(tc.nome, func(t *testing.T) {
			obtido := normalizarEmail(tc.entrada)

			if obtido != tc.esperado {
				t.Errorf(
					"normalizarEmail(%q) = %q; esperado %q",
					tc.entrada,
					obtido,
					tc.esperado,
				)
			}
		})
	}
}

func TestValidarEmail(t *testing.T) {
	const (
		msgFormato = "e-mail inválido"
		msgSemPto  = "precisa conter um ponto"
		msgDominio = "domínio deve usar apenas letras sem acento"
		msgLocal   = "parte antes do @ deve usar apenas caracteres ASCII"
		msgLongo   = "longo demais (máximo de 254 bytes)"
	)

	local64 := strings.Repeat("a", 64)
	dominioBase := strings.Repeat(
		strings.Repeat("a", 60)+".",
		3,
	)

	casos := []struct {
		nome    string
		entrada string
		erros   []string
	}{
		// Válidos: provedores diversos.
		{"gmail", "ana@gmail.com", nil},
		{"outlook", "ana@outlook.com", nil},
		{"provedor pequeno", "ana@provedor-pequeno.net.br", nil},
		{"empresa com .com.br", "joao.silva@empresa.com.br", nil},
		{"universidade", "x@universidade.edu", nil},
		{"subdomínio", "ana@mail.empresa.com.br", nil},
		{"hífen no meio do domínio", "ana@meu-site.com", nil},
		{"hífen duplo no meio do domínio", "ana@x--y.com", nil},
		{"números no domínio", "ana@empresa123.com", nil},
		{"domínio curto", "a@b.co", nil},
		{"com sinal de +", "ana+vendas@empresa.com", nil},
		{"maiúsculas e espaços normalizados", "  ANA@Gmail.COM  ", nil},

		// Limites do domínio.
		{
			"trecho do domínio com 63 caracteres",
			"ana@" + strings.Repeat("a", 63) + ".com",
			nil,
		},
		{
			"final do domínio com 63 letras",
			"ana@x." + strings.Repeat("a", 63),
			nil,
		},
		{"domínio internacional xn--p1ai", "ana@exemplo.xn--p1ai", nil},
		{
			"final xn-- com 63 caracteres",
			"ana@x.xn--" + strings.Repeat("a", 59),
			nil,
		},
		{
			"e-mail com exatamente 254 bytes",
			local64 + "@" + dominioBase + strings.Repeat("c", 6),
			nil,
		},

		// Limitação conhecida: o formato xn-- é conferido,
		// mas o punycode não é decodificado.
		{
			"xn-- com formato correto, mas punycode inválido",
			"ana@x.xn--a",
			nil,
		},

		// Formato geral.
		{"vazio", "", []string{"obrigatório"}},
		{"só espaços", "   ", []string{"obrigatório"}},
		{"sem arroba", "ana", []string{msgFormato}},
		{"sem domínio", "ana@", []string{msgFormato}},
		{"sem nome", "@gmail.com", []string{msgFormato}},
		{"espaço no meio", "ana @x.com", []string{msgFormato}},
		{"formato Nome <e-mail>", "João <j@x.com>", []string{msgFormato}},
		{"só entre < >", "<ana@x.com>", []string{msgFormato}},
		{"com comentário", "ana(comentario)@x.com", []string{msgFormato}},
		{"nome depois entre parênteses", "ana@x.com (Ana)", []string{msgFormato}},
		{"lista de e-mails", "a@x.com, b@x.com", []string{msgFormato}},
		{"duas arrobas", "ana@@x.com", []string{msgFormato}},
		{"parte local começando com ponto", ".ana@x.com", []string{msgFormato}},
		{"parte local com pontos repetidos", "ana..silva@x.com", []string{msgFormato}},
		{"IP entre colchetes", "ana@[1.2.3.4]", []string{msgFormato}},

		// Parte local entre aspas.
		{`parte local entre aspas`, `"ana"@x.com`, []string{msgFormato}},
		{`aspas com espaço`, `"a b"@x.com`, []string{msgFormato}},
		{`aspas com arroba dentro`, `"ana@evil.com"@x.com`, []string{msgFormato}},

		// Parte local fora do ASCII.
		{"parte local com acentos", "ánã@x.com", []string{msgFormato, msgLocal}},
		{"parte local com ideogramas", "日本@x.com", []string{msgFormato, msgLocal}},
		{
			"parte local com letra decomposta",
			"a\u0301na@x.com",
			[]string{msgFormato, msgLocal},
		},

		// Tamanho total.
		{
			"e-mail com 255 bytes",
			local64 + "@" + dominioBase + strings.Repeat("c", 7),
			[]string{msgLongo},
		},
		{
			"e-mail muito acima de 254 bytes",
			local64 + "@" + strings.Repeat(strings.Repeat("a", 60)+".", 5) + "com",
			[]string{msgLongo},
		},

		// Domínio sem ponto.
		{"domínio sem ponto", "ana@x", []string{msgSemPto}},
		{"localhost", "ana@localhost", []string{msgSemPto}},
		{"servidor interno", "ana@servidor-interno", []string{msgSemPto}},

		// Domínio malformado.
		{"domínio começando com ponto", "ana@.com", []string{msgFormato}},
		{"pontos repetidos no domínio", "ana@x..com", []string{msgFormato}},
		{"domínio terminando com ponto", "ana@x.com.", []string{msgFormato}},
		{"trecho começando com hífen", "ana@-x.com", []string{msgFormato, msgDominio}},
		{"trecho terminando com hífen", "ana@x-.com", []string{msgFormato, msgDominio}},
		{"final terminando com hífen", "ana@x.com-", []string{msgFormato, msgDominio}},
		{
			"trecho do domínio com 64 caracteres",
			"ana@" + strings.Repeat("a", 64) + ".com",
			[]string{msgFormato, msgDominio},
		},
		{
			"final do domínio com 64 letras",
			"ana@x." + strings.Repeat("a", 64),
			[]string{msgFormato, msgDominio},
		},

		// Caracteres inválidos no domínio.
		{"sublinhado no domínio", "ana@ex_emplo.com", []string{msgFormato, msgDominio}},
		{"exclamação no domínio", "ana@ex!mplo.com", []string{msgFormato, msgDominio}},
		{"cerquilha no domínio", "ana@ex#mplo.com", []string{msgFormato, msgDominio}},
		{"porcentagem no domínio", "ana@ex%mplo.com", []string{msgFormato, msgDominio}},
		{"letra acentuada no domínio", "ana@exémplo.com", []string{msgFormato, msgDominio}},
		{"emoji no domínio", "ana@exemplo😀.com", []string{msgFormato, msgDominio}},

		// Final do domínio.
		{"final com 1 letra", "ana@x.c", []string{msgFormato, msgDominio}},
		{"final numérico", "ana@x.123", []string{msgFormato, msgDominio}},
		{"final com letras e números", "ana@x.c0m", []string{msgFormato, msgDominio}},
		{"endereço IP no domínio", "ana@192.168.0.1", []string{msgFormato, msgDominio}},

		// Formato xn--.
		{"xn-- sozinho", "ana@x.xn--", []string{msgFormato, msgDominio}},
		{
			"final xn-- com 64 caracteres",
			"ana@x.xn--" + strings.Repeat("a", 60),
			[]string{msgFormato, msgDominio},
		},
	}

	for _, tc := range casos {
		t.Run(tc.nome, func(t *testing.T) {
			conferirResultado(
				t,
				validarEmail(tc.entrada),
				tc.erros,
			)
		})
	}
}

// ---------- Senha ----------

func TestValidarSenha(t *testing.T) {
	casos := []struct {
		nome     string
		entrada  string
		erros    []string
		naoTrazo []string
	}{
		// Válidas.
		{"senha comum", "Senha@123", nil, nil},
		{"com símbolo e números", "abc12345!", nil, nil},
		{"com letra acentuada", "Ã9#teste", nil, nil},
		{"exatamente 8 caracteres", "Abcdef1!", nil, nil},
		{"exatamente 72 bytes", "Aa1!" + strings.Repeat("x", 68), nil, nil},
		{"72 bytes com acentos", "Aa1!" + strings.Repeat("é", 34), nil, nil},

		// Inválidas: uma regra quebrada por vez.
		{"7 caracteres", "abc@123", []string{"no mínimo 8 caracteres"}, nil},
		{"sem símbolo", "senha1234", []string{"ao menos um símbolo"}, nil},
		{"sem número", "senha@abc", []string{"ao menos um número"}, nil},
		{"sem letra", "12345@67", []string{"ao menos uma letra"}, nil},
		{"com espaço", "Senha @123", []string{"não pode conter espaços"}, nil},
		{"com tab", "Senha\t@123", []string{"não pode conter espaços"}, nil},

		// Caracteres não imprimíveis e bytes inválidos.
		{"com caractere de controle", "Senha@12\x003", []string{"não imprimíveis"}, nil},
		{"com espaço de largura zero", "Senha@12\u200b3", []string{"não imprimíveis"}, nil},
		{"com bytes inválidos em UTF-8", "Senha@12\xff3", []string{"caracteres inválidos"}, nil},

		// Limite de 72 bytes do bcrypt.
		{"73 bytes", "Aa1!" + strings.Repeat("x", 69), []string{"no máximo 72 bytes"}, nil},
		{"74 bytes com acentos", "Aa1!" + strings.Repeat("é", 35), []string{"no máximo 72 bytes"}, nil},
		{"84 bytes com acentos", "Aa1!" + strings.Repeat("é", 40), []string{"no máximo 72 bytes"}, nil},

		// Vários problemas ao mesmo tempo.
		{
			"sem número e sem símbolo",
			"aaaaaaaa",
			[]string{"ao menos um número", "ao menos um símbolo"},
			[]string{"ao menos uma letra"},
		},
		{
			"vazia",
			"",
			[]string{
				"no mínimo 8 caracteres",
				"ao menos uma letra",
				"ao menos um número",
				"ao menos um símbolo",
			},
			nil,
		},
	}

	for _, tc := range casos {
		t.Run(tc.nome, func(t *testing.T) {
			err := validarSenha(tc.entrada)

			conferirResultado(t, err, tc.erros)

			for _, trecho := range tc.naoTrazo {
				if err != nil && strings.Contains(err.Error(), trecho) {
					t.Errorf(
						"a mensagem %q não deveria conter %q",
						err.Error(),
						trecho,
					)
				}
			}
		})
	}
}

// ---------- Papel ----------

func TestValidarPapel(t *testing.T) {
	casos := []struct {
		nome    string
		entrada string
		erros   []string
	}{
		{"admin", PapelAdmin, nil},
		{"vendedor", PapelVendedor, nil},
		{"vazio", "", []string{"obrigatório"}},
		{"gerente não existe", "gerente", []string{"papel inválido", "admin ou vendedor"}},
		{"supervisor", "supervisor", []string{"papel inválido"}},
		{"Admin com A maiúsculo", "Admin", []string{"papel inválido"}},
		{"ADMIN todo maiúsculo", "ADMIN", []string{"papel inválido"}},
		{"espaço antes", " admin", []string{"papel inválido"}},
		{"espaço depois", "admin ", []string{"papel inválido"}},
	}

	for _, tc := range casos {
		t.Run(tc.nome, func(t *testing.T) {
			conferirResultado(
				t,
				validarPapel(tc.entrada),
				tc.erros,
			)
		})
	}
}

func TestPapeisPermitidosSaoExatamenteAdminEVendedor(t *testing.T) {
	if PapelAdmin != "admin" {
		t.Errorf("PapelAdmin = %q; esperado %q", PapelAdmin, "admin")
	}

	if PapelVendedor != "vendedor" {
		t.Errorf("PapelVendedor = %q; esperado %q", PapelVendedor, "vendedor")
	}

	esperados := map[string]bool{
		"admin":    true,
		"vendedor": true,
	}

	if len(papeisValidos) != len(esperados) {
		t.Fatalf(
			"papeisValidos deve ter exatamente %d papéis, mas tem %d: %v",
			len(esperados),
			len(papeisValidos),
			papeisValidos,
		)
	}

	encontrados := map[string]bool{}

	for _, papel := range papeisValidos {
		if !esperados[papel] {
			t.Errorf("papel inesperado na lista: %q", papel)
		}

		if encontrados[papel] {
			t.Errorf("papel repetido na lista: %q", papel)
		}

		encontrados[papel] = true

		if err := validarPapel(papel); err != nil {
			t.Errorf("papel %q deveria ser aceito: %v", papel, err)
		}
	}

	for papel := range esperados {
		if !encontrados[papel] {
			t.Errorf("papel %q deveria estar na lista", papel)
		}
	}
}

// ---------- Banco de dados (SQLite em memória) ----------

func TestEmailJaCadastrado(t *testing.T) {
	db := abrirBancoEmMemoria(t)

	idAna, err := inserirUsuarioTeste(
		db,
		"Ana",
		"ana@empresa.com",
		PapelAdmin,
	)
	if err != nil {
		t.Fatalf("erro ao inserir Ana: %v", err)
	}

	idBia, err := inserirUsuarioTeste(
		db,
		"Bia",
		"bia@empresa.com",
		PapelVendedor,
	)
	if err != nil {
		t.Fatalf("erro ao inserir Bia: %v", err)
	}

	casos := []struct {
		nome      string
		email     string
		ignorarID int
		esperado  bool
	}{
		{"e-mail inexistente", "novo@empresa.com", 0, false},
		{"e-mail existente", "ana@empresa.com", 0, true},
		{
			"existente com maiúsculas e espaços",
			"  ANA@Empresa.COM ",
			0,
			true,
		},
		{"ignorando o próprio id", "ana@empresa.com", int(idAna), false},
		{"ignorando o id de outro usuário", "ana@empresa.com", int(idBia), true},
	}

	for _, tc := range casos {
		t.Run(tc.nome, func(t *testing.T) {
			obtido, err := emailJaCadastrado(
				db,
				tc.email,
				tc.ignorarID,
			)

			if err != nil {
				t.Fatalf("erro inesperado: %v", err)
			}

			if obtido != tc.esperado {
				t.Errorf(
					"emailJaCadastrado(%q, %d) = %v; esperado %v",
					tc.email,
					tc.ignorarID,
					obtido,
					tc.esperado,
				)
			}
		})
	}
}

// Garante que a lista de papéis do Go e o CHECK da tabela são consistentes.
func TestPapeisConsistentesComCheckDaTabela(t *testing.T) {
	db := abrirBancoEmMemoria(t)

	for _, papel := range papeisValidos {
		t.Run("banco aceita "+papel, func(t *testing.T) {
			if err := validarPapel(papel); err != nil {
				t.Fatalf("o Go deveria aceitar %q: %v", papel, err)
			}

			if _, err := inserirUsuarioTeste(
				db,
				"Teste",
				papel+"@teste.com",
				papel,
			); err != nil {
				t.Errorf(
					"o banco deveria aceitar o papel %q, mas houve erro: %v",
					papel,
					err,
				)
			}
		})
	}

	invalidos := []string{
		"gerente",
		"supervisor",
		"Admin",
		"",
	}

	for i, papel := range invalidos {
		t.Run("banco recusa '"+papel+"'", func(t *testing.T) {
			if err := validarPapel(papel); err == nil {
				t.Fatalf("o Go deveria recusar %q", papel)
			}

			email := fmt.Sprintf("invalido%d@teste.com", i)

			if _, err := inserirUsuarioTeste(
				db,
				"Teste",
				email,
				papel,
			); err == nil {
				t.Errorf(
					"o banco deveria recusar o papel %q (CHECK), mas aceitou",
					papel,
				)
			}
		})
	}
}
