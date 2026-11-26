package main

import (
	"database/sql"
	"errors"
	"fmt"
	"net/mail"
	"regexp"
	"slices"
	"strings"
	"unicode"
	"unicode/utf8"
)

// Papéis permitidos para os usuários. Devem ser sempre iguais aos valores
// do CHECK da tabela usuarios (criada em criarTabelas).
const (
	PapelAdmin    = "admin"
	PapelVendedor = "vendedor"
)

// papeisValidos é a única lista de papéis aceitos pela validação em Go.
var papeisValidos = []string{PapelAdmin, PapelVendedor}

const (
	senhaMinimoCaracteres = 8
	// O bcrypt só considera os primeiros 72 BYTES da senha.
	senhaMaximoBytes = 72
)

// Teto de tamanho do e-mail inteiro, medido em BYTES.
const emailMaximoBytes = 254

// dominioEmailRegexp descreve um domínio bem formado:
// - trechos de 1 a 63 caracteres, sem hífen no início ou no fim;
// - último trecho com letras ou no formato xn--.
var dominioEmailRegexp = regexp.MustCompile(
	`^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+` +
		`([a-z]{2,63}|xn--[a-z0-9]([a-z0-9-]{0,57}[a-z0-9])?)$`,
)

// validarNome apenas valida. Não altera o nome.
// A futura rota deverá aplicar strings.TrimSpace(nome) antes de salvar.
func validarNome(nome string) error {
	if strings.TrimSpace(nome) == "" {
		return errors.New("o nome é obrigatório e não pode estar vazio")
	}
	return nil
}

// normalizarEmail remove espaços das pontas e converte para minúsculas.
// Use este resultado para validar, consultar e salvar o e-mail.
func normalizarEmail(email string) string {
	return strings.ToLower(strings.TrimSpace(email))
}

// validarEmail valida o formato do e-mail.
// Nenhum provedor específico é bloqueado.
func validarEmail(email string) error {
	email = normalizarEmail(email)

	if email == "" {
		return errors.New("o e-mail é obrigatório")
	}

	if len(email) > emailMaximoBytes {
		return fmt.Errorf(
			"e-mail inválido: o e-mail é longo demais (máximo de %d bytes)",
			emailMaximoBytes,
		)
	}

	endereco, err := mail.ParseAddress(email)
	if err != nil || endereco.Address != email {
		return errors.New("e-mail inválido: use o formato nome@dominio.com")
	}

	posicaoArroba := strings.LastIndex(email, "@")
	parteLocal := email[:posicaoArroba]
	dominio := email[posicaoArroba+1:]

	// A parte local aceita somente caracteres ASCII.
	if strings.IndexFunc(parteLocal, func(r rune) bool {
		return r > unicode.MaxASCII
	}) >= 0 {
		return errors.New(
			"e-mail inválido: a parte antes do @ deve usar apenas caracteres ASCII (sem acentos)",
		)
	}

	if !strings.Contains(dominio, ".") {
		return errors.New(
			"e-mail inválido: o domínio precisa conter um ponto, como em nome@empresa.com",
		)
	}

	if !dominioEmailRegexp.MatchString(dominio) {
		return errors.New(
			"e-mail inválido: o domínio deve usar apenas letras sem acento, números, hífen e ponto",
		)
	}

	return nil
}

// validarSenha aplica a política de senha.
// A senha nunca é alterada (não aplicar TrimSpace).
//
// Regras:
// - mínimo de 8 caracteres;
// - máximo de 72 bytes (limite do bcrypt);
// - ao menos uma letra;
// - ao menos um número;
// - ao menos um símbolo;
// - sem espaços;
// - sem caracteres não imprimíveis.
func validarSenha(senha string) error {
	if !utf8.ValidString(senha) {
		return errors.New("senha inválida: contém caracteres inválidos")
	}

	var problemas []string

	if utf8.RuneCountInString(senha) < senhaMinimoCaracteres {
		problemas = append(
			problemas,
			fmt.Sprintf("deve ter no mínimo %d caracteres", senhaMinimoCaracteres),
		)
	}

	if len(senha) > senhaMaximoBytes {
		problemas = append(
			problemas,
			fmt.Sprintf(
				"deve ter no máximo %d bytes (letras com acento e emojis ocupam mais de 1 byte)",
				senhaMaximoBytes,
			),
		)
	}

	var temLetra, temNumero, temSimbolo, temEspaco, temNaoImprimivel bool

	for _, r := range senha {
		switch {
		case unicode.IsSpace(r):
			temEspaco = true
		case !unicode.IsPrint(r):
			temNaoImprimivel = true
		case unicode.IsLetter(r):
			temLetra = true
		case unicode.IsDigit(r):
			temNumero = true
		default:
			temSimbolo = true
		}
	}

	if temEspaco {
		problemas = append(problemas, "não pode conter espaços")
	}
	if temNaoImprimivel {
		problemas = append(problemas, "não pode conter caracteres não imprimíveis")
	}
	if !temLetra {
		problemas = append(problemas, "deve conter ao menos uma letra")
	}
	if !temNumero {
		problemas = append(problemas, "deve conter ao menos um número")
	}
	if !temSimbolo {
		problemas = append(
			problemas,
			"deve conter ao menos um símbolo (por exemplo: ! @ # $ %)",
		)
	}

	if len(problemas) > 0 {
		return errors.New("senha inválida: " + strings.Join(problemas, "; "))
	}

	return nil
}

// validarPapel aceita somente os papéis definidos em papeisValidos.
func validarPapel(papel string) error {
	if papel == "" {
		return errors.New("o papel é obrigatório")
	}

	if !slices.Contains(papeisValidos, papel) {
		return fmt.Errorf(
			"papel inválido: use %s",
			strings.Join(papeisValidos, " ou "),
		)
	}

	return nil
}

// emailJaCadastrado informa se já existe outro usuário com esse e-mail.
//
// Use ignorarID = 0 no cadastro.
// Na edição, passe o ID do próprio usuário.
//
// A restrição UNIQUE do banco continua sendo a garantia definitiva
// contra duplicidade. Esta função serve para fornecer uma mensagem amigável.
func emailJaCadastrado(
	db *sql.DB,
	email string,
	ignorarID int,
) (bool, error) {
	var quantidade int

	err := db.QueryRow(
		`SELECT COUNT(*) FROM usuarios WHERE email = ? AND id <> ?`,
		normalizarEmail(email),
		ignorarID,
	).Scan(&quantidade)

	if err != nil {
		return false, fmt.Errorf(
			"erro ao verificar e-mail duplicado: %w",
			err,
		)
	}

	return quantidade > 0, nil
}
