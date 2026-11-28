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

const (
	PapelAdmin    = "admin"
	PapelVendedor = "vendedor"
)

var papeisValidos = []string{PapelAdmin, PapelVendedor}

const (
	senhaMinimoCaracteres = 8
	senhaMaximoBytes      = 72
	emailMaximoBytes      = 254
)

var dominioEmailRegexp = regexp.MustCompile(
	`^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+` +
		`([a-z]{2,63}|xn--[a-z0-9]([a-z0-9-]{0,57}[a-z0-9])?)$`,
)

func validarNome(nome string) error {
	if strings.TrimSpace(nome) == "" {
		return errors.New("o nome é obrigatório e não pode estar vazio")
	}
	return nil
}

func normalizarEmail(email string) string {
	return strings.ToLower(strings.TrimSpace(email))
}

func validarEmail(email string) error {
	email = normalizarEmail(email)
	if email == "" {
		return errors.New("o e-mail é obrigatório")
	}
	if len(email) > emailMaximoBytes {
		return fmt.Errorf("e-mail inválido: o e-mail é longo demais (máximo de %d bytes)", emailMaximoBytes)
	}

	endereco, err := mail.ParseAddress(email)
	if err != nil || endereco.Address != email {
		return errors.New("e-mail inválido: use o formato nome@dominio.com")
	}

	posicaoArroba := strings.LastIndex(email, "@")
	parteLocal := email[:posicaoArroba]
	dominio := email[posicaoArroba+1:]

	if strings.IndexFunc(parteLocal, func(r rune) bool { return r > unicode.MaxASCII }) >= 0 {
		return errors.New("e-mail inválido: a parte antes do @ deve usar apenas caracteres ASCII")
	}
	if !strings.Contains(dominio, ".") {
		return errors.New("e-mail inválido: o domínio precisa conter um ponto")
	}
	if !dominioEmailRegexp.MatchString(dominio) {
		return errors.New("e-mail inválido: o domínio deve usar apenas letras sem acento, números, hífen e ponto")
	}
	return nil
}

func validarSenha(senha string) error {
	if !utf8.ValidString(senha) {
		return errors.New("senha inválida: contém caracteres inválidos")
	}

	var problemas []string
	if utf8.RuneCountInString(senha) < senhaMinimoCaracteres {
		problemas = append(problemas, "deve ter no mínimo 8 caracteres")
	}
	if len(senha) > senhaMaximoBytes {
		problemas = append(problemas, "deve ter no máximo 72 bytes")
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
		problemas = append(problemas, "deve conter ao menos um símbolo")
	}
	if len(problemas) > 0 {
		return errors.New("senha inválida: " + strings.Join(problemas, "; "))
	}
	return nil
}

func validarPapel(papel string) error {
	if papel == "" {
		return errors.New("o papel é obrigatório")
	}
	if !slices.Contains(papeisValidos, papel) {
		return fmt.Errorf("papel inválido: use %s", strings.Join(papeisValidos, " ou "))
	}
	return nil
}

func emailJaCadastrado(db *sql.DB, email string, ignorarID int) (bool, error) {
	var quantidade int
	err := db.QueryRow(
		`SELECT COUNT(*) FROM usuarios WHERE email = ? AND id <> ?`,
		normalizarEmail(email),
		ignorarID,
	).Scan(&quantidade)
	if err != nil {
		return false, fmt.Errorf("erro ao verificar e-mail duplicado: %w", err)
	}
	return quantidade > 0, nil
}
