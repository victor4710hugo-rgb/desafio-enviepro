package main

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

func novoRouterUsuariosTeste(t *testing.T, db *sql.DB) *gin.Engine {
	t.Helper()

	gin.SetMode(gin.TestMode)

	router := gin.New()
	registrarRotasUsuarios(router, db)

	return router
}

func executarRequisicaoUsuariosTeste(
	t *testing.T,
	router *gin.Engine,
	metodo string,
	caminho string,
	corpo string,
) *httptest.ResponseRecorder {
	t.Helper()

	var requisicao *http.Request

	if corpo == "" {
		requisicao = httptest.NewRequest(metodo, caminho, nil)
	} else {
		requisicao = httptest.NewRequest(
			metodo,
			caminho,
			strings.NewReader(corpo),
		)
		requisicao.Header.Set("Content-Type", "application/json")
	}

	resposta := httptest.NewRecorder()
	router.ServeHTTP(resposta, requisicao)

	return resposta
}

func criarUsuarioTestePelaAPI(
	t *testing.T,
	router *gin.Engine,
	nome string,
	email string,
	senha string,
	papel string,
) *httptest.ResponseRecorder {
	t.Helper()

	dados := map[string]string{
		"nome":  nome,
		"email": email,
		"senha": senha,
		"papel": papel,
	}

	corpo, err := json.Marshal(dados)
	if err != nil {
		t.Fatalf("erro ao preparar dados do usuário: %v", err)
	}

	return executarRequisicaoUsuariosTeste(
		t,
		router,
		http.MethodPost,
		"/usuarios",
		string(corpo),
	)
}

func obterHashUsuarioTeste(
	t *testing.T,
	db *sql.DB,
	id int64,
) string {
	t.Helper()

	var hash string

	err := db.QueryRow(
		"SELECT senha_hash FROM usuarios WHERE id = ?",
		id,
	).Scan(&hash)

	if err != nil {
		t.Fatalf("erro ao consultar hash do usuário: %v", err)
	}

	return hash
}

func TestListarUsuariosVazio(t *testing.T) {
	db := abrirBancoEmMemoria(t)
	router := novoRouterUsuariosTeste(t, db)

	resposta := executarRequisicaoUsuariosTeste(
		t,
		router,
		http.MethodGet,
		"/usuarios",
		"",
	)

	if resposta.Code != http.StatusOK {
		t.Fatalf(
			"esperado status 200, recebido %d",
			resposta.Code,
		)
	}

	var usuarios []map[string]interface{}

	if err := json.Unmarshal(resposta.Body.Bytes(), &usuarios); err != nil {
		t.Fatalf("erro ao interpretar resposta: %v", err)
	}

	if usuarios == nil {
		t.Fatal("esperada lista vazia, mas a resposta foi null")
	}

	if len(usuarios) != 0 {
		t.Fatalf(
			"esperada lista com zero usuários, recebidos %d",
			len(usuarios),
		)
	}
}

func TestCriarUsuarioComSucesso(t *testing.T) {
	db := abrirBancoEmMemoria(t)
	router := novoRouterUsuariosTeste(t, db)

	resposta := criarUsuarioTestePelaAPI(
		t,
		router,
		"Usuário de Teste",
		"teste@example.com",
		"Senha@123",
		PapelVendedor,
	)

	if resposta.Code != http.StatusCreated {
		t.Fatalf(
			"esperado status 201, recebido %d. Resposta: %s",
			resposta.Code,
			resposta.Body.String(),
		)
	}

	var usuario map[string]interface{}

	if err := json.Unmarshal(resposta.Body.Bytes(), &usuario); err != nil {
		t.Fatalf("erro ao interpretar usuário criado: %v", err)
	}

	if usuario["nome"] != "Usuário de Teste" {
		t.Errorf("nome inesperado: %v", usuario["nome"])
	}

	if usuario["email"] != "teste@example.com" {
		t.Errorf("e-mail inesperado: %v", usuario["email"])
	}

	if usuario["papel"] != PapelVendedor {
		t.Errorf("papel inesperado: %v", usuario["papel"])
	}

	if _, existe := usuario["senha_hash"]; existe {
		t.Error("a resposta não deve expor senha_hash")
	}

	if _, existe := usuario["SenhaHash"]; existe {
		t.Error("a resposta não deve expor SenhaHash")
	}

	idFloat, existe := usuario["id"].(float64)
	if !existe || idFloat <= 0 {
		t.Fatal("ID do usuário não foi retornado corretamente")
	}

	hash := obterHashUsuarioTeste(t, db, int64(idFloat))

	if hash == "Senha@123" {
		t.Fatal("a senha foi armazenada sem hash")
	}

	if err := bcrypt.CompareHashAndPassword(
		[]byte(hash),
		[]byte("Senha@123"),
	); err != nil {
		t.Fatal("o hash armazenado não corresponde à senha original")
	}
}

func TestCriarUsuarioComEmailDuplicado(t *testing.T) {
	db := abrirBancoEmMemoria(t)
	router := novoRouterUsuariosTeste(t, db)

	primeiraResposta := criarUsuarioTestePelaAPI(
		t,
		router,
		"Primeiro Usuário",
		"duplicado@example.com",
		"Senha@123",
		PapelVendedor,
	)

	if primeiraResposta.Code != http.StatusCreated {
		t.Fatalf(
			"falha ao criar primeiro usuário: %d - %s",
			primeiraResposta.Code,
			primeiraResposta.Body.String(),
		)
	}

	segundaResposta := criarUsuarioTestePelaAPI(
		t,
		router,
		"Segundo Usuário",
		"DUPLICADO@example.com",
		"Senha@123",
		PapelAdmin,
	)

	if segundaResposta.Code != http.StatusConflict {
		t.Fatalf(
			"esperado status 409, recebido %d",
			segundaResposta.Code,
		)
	}
}

func TestCriarUsuarioComDadosInvalidos(t *testing.T) {
	testes := []struct {
		nome  string
		corpo string
	}{
		{
			nome:  "nome vazio",
			corpo: `{"nome":"","email":"teste@example.com","senha":"Senha@123","papel":"vendedor"}`,
		},
		{
			nome:  "email inválido",
			corpo: `{"nome":"Teste","email":"email-invalido","senha":"Senha@123","papel":"vendedor"}`,
		},
		{
			nome:  "senha inválida",
			corpo: `{"nome":"Teste","email":"teste@example.com","senha":"123","papel":"vendedor"}`,
		},
		{
			nome:  "papel inválido",
			corpo: `{"nome":"Teste","email":"teste@example.com","senha":"Senha@123","papel":"gerente"}`,
		},
	}

	for _, teste := range testes {
		t.Run(teste.nome, func(t *testing.T) {
			db := abrirBancoEmMemoria(t)
			router := novoRouterUsuariosTeste(t, db)

			resposta := executarRequisicaoUsuariosTeste(
				t,
				router,
				http.MethodPost,
				"/usuarios",
				teste.corpo,
			)

			if resposta.Code != http.StatusBadRequest {
				t.Errorf(
					"esperado status 400, recebido %d. Resposta: %s",
					resposta.Code,
					resposta.Body.String(),
				)
			}
		})
	}
}

func TestCriarUsuarioComJSONInvalido(t *testing.T) {
	db := abrirBancoEmMemoria(t)
	router := novoRouterUsuariosTeste(t, db)

	resposta := executarRequisicaoUsuariosTeste(
		t,
		router,
		http.MethodPost,
		"/usuarios",
		`{"nome":`,
	)

	if resposta.Code != http.StatusBadRequest {
		t.Fatalf(
			"esperado status 400, recebido %d",
			resposta.Code,
		)
	}
}

func TestListarUsuariosComDados(t *testing.T) {
	db := abrirBancoEmMemoria(t)

	_, err := inserirUsuarioTeste(
		db,
		"Usuário de Teste",
		"teste@example.com",
		PapelVendedor,
	)
	if err != nil {
		t.Fatalf("erro ao inserir usuário de teste: %v", err)
	}

	router := novoRouterUsuariosTeste(t, db)

	resposta := executarRequisicaoUsuariosTeste(
		t,
		router,
		http.MethodGet,
		"/usuarios",
		"",
	)

	if resposta.Code != http.StatusOK {
		t.Fatalf(
			"esperado status 200, recebido %d",
			resposta.Code,
		)
	}

	var usuarios []map[string]interface{}

	if err := json.Unmarshal(resposta.Body.Bytes(), &usuarios); err != nil {
		t.Fatalf("erro ao interpretar lista: %v", err)
	}

	if len(usuarios) != 1 {
		t.Fatalf(
			"esperado 1 usuário, recebidos %d",
			len(usuarios),
		)
	}

	if _, existe := usuarios[0]["senha_hash"]; existe {
		t.Error("a listagem não deve expor senha_hash")
	}
}

func TestObterUsuarioPorID(t *testing.T) {
	db := abrirBancoEmMemoria(t)

	id, err := inserirUsuarioTeste(
		db,
		"Usuário Individual",
		"individual@example.com",
		PapelAdmin,
	)
	if err != nil {
		t.Fatalf("erro ao inserir usuário: %v", err)
	}

	router := novoRouterUsuariosTeste(t, db)

	resposta := executarRequisicaoUsuariosTeste(
		t,
		router,
		http.MethodGet,
		"/usuarios/"+strconv.FormatInt(id, 10),
		"",
	)

	if resposta.Code != http.StatusOK {
		t.Fatalf(
			"esperado status 200, recebido %d",
			resposta.Code,
		)
	}

	var usuario map[string]interface{}

	if err := json.Unmarshal(resposta.Body.Bytes(), &usuario); err != nil {
		t.Fatalf("erro ao interpretar usuário: %v", err)
	}

	if usuario["email"] != "individual@example.com" {
		t.Errorf("e-mail inesperado: %v", usuario["email"])
	}

	if _, existe := usuario["senha_hash"]; existe {
		t.Error("a consulta individual não deve expor senha_hash")
	}
}

func TestObterUsuarioComIDInvalido(t *testing.T) {
	db := abrirBancoEmMemoria(t)
	router := novoRouterUsuariosTeste(t, db)

	resposta := executarRequisicaoUsuariosTeste(
		t,
		router,
		http.MethodGet,
		"/usuarios/abc",
		"",
	)

	if resposta.Code != http.StatusBadRequest {
		t.Fatalf(
			"esperado status 400, recebido %d",
			resposta.Code,
		)
	}
}

func TestObterUsuarioInexistente(t *testing.T) {
	db := abrirBancoEmMemoria(t)
	router := novoRouterUsuariosTeste(t, db)

	resposta := executarRequisicaoUsuariosTeste(
		t,
		router,
		http.MethodGet,
		"/usuarios/999",
		"",
	)

	if resposta.Code != http.StatusNotFound {
		t.Fatalf(
			"esperado status 404, recebido %d",
			resposta.Code,
		)
	}
}

func TestAtualizarUsuarioSemAlterarSenha(t *testing.T) {
	db := abrirBancoEmMemoria(t)

	id, err := inserirUsuarioTeste(
		db,
		"Nome Antigo",
		"antigo@example.com",
		PapelVendedor,
	)
	if err != nil {
		t.Fatalf("erro ao inserir usuário: %v", err)
	}

	hashOriginal := obterHashUsuarioTeste(t, db, id)

	router := novoRouterUsuariosTeste(t, db)

	corpo := `{
		"nome": "Nome Atualizado",
		"email": "atualizado@example.com",
		"papel": "admin"
	}`

	resposta := executarRequisicaoUsuariosTeste(
		t,
		router,
		http.MethodPut,
		"/usuarios/"+strconv.FormatInt(id, 10),
		corpo,
	)

	if resposta.Code != http.StatusOK {
		t.Fatalf(
			"esperado status 200, recebido %d. Resposta: %s",
			resposta.Code,
			resposta.Body.String(),
		)
	}

	hashAtual := obterHashUsuarioTeste(t, db, id)

	if hashAtual != hashOriginal {
		t.Error("a senha foi alterada mesmo não tendo sido enviada")
	}

	var usuario map[string]interface{}

	if err := json.Unmarshal(resposta.Body.Bytes(), &usuario); err != nil {
		t.Fatalf("erro ao interpretar resposta: %v", err)
	}

	if usuario["nome"] != "Nome Atualizado" {
		t.Errorf("nome não foi atualizado: %v", usuario["nome"])
	}

	if usuario["email"] != "atualizado@example.com" {
		t.Errorf("e-mail não foi atualizado: %v", usuario["email"])
	}

	if usuario["papel"] != PapelAdmin {
		t.Errorf("papel não foi atualizado: %v", usuario["papel"])
	}

	if _, existe := usuario["senha_hash"]; existe {
		t.Error("a resposta não deve expor senha_hash")
	}
}

func TestAtualizarUsuarioAlterandoSenha(t *testing.T) {
	db := abrirBancoEmMemoria(t)

	id, err := inserirUsuarioTeste(
		db,
		"Usuário",
		"usuario@example.com",
		PapelVendedor,
	)
	if err != nil {
		t.Fatalf("erro ao inserir usuário: %v", err)
	}

	hashOriginal := obterHashUsuarioTeste(t, db, id)

	router := novoRouterUsuariosTeste(t, db)

	corpo := `{
		"nome": "Usuário",
		"email": "usuario@example.com",
		"senha": "NovaSenha@123",
		"papel": "vendedor"
	}`

	resposta := executarRequisicaoUsuariosTeste(
		t,
		router,
		http.MethodPut,
		"/usuarios/"+strconv.FormatInt(id, 10),
		corpo,
	)

	if resposta.Code != http.StatusOK {
		t.Fatalf(
			"esperado status 200, recebido %d. Resposta: %s",
			resposta.Code,
			resposta.Body.String(),
		)
	}

	hashAtual := obterHashUsuarioTeste(t, db, id)

	if hashAtual == hashOriginal {
		t.Error("o hash não foi atualizado")
	}

	if err := bcrypt.CompareHashAndPassword(
		[]byte(hashAtual),
		[]byte("NovaSenha@123"),
	); err != nil {
		t.Error("o novo hash não corresponde à nova senha")
	}
}

func TestAtualizarUsuarioComSenhaVazia(t *testing.T) {
	db := abrirBancoEmMemoria(t)

	id, err := inserirUsuarioTeste(
		db,
		"Usuário",
		"usuario@example.com",
		PapelVendedor,
	)
	if err != nil {
		t.Fatalf("erro ao inserir usuário: %v", err)
	}

	router := novoRouterUsuariosTeste(t, db)

	corpo := `{
		"nome": "Usuário",
		"email": "usuario@example.com",
		"senha": "",
		"papel": "vendedor"
	}`

	resposta := executarRequisicaoUsuariosTeste(
		t,
		router,
		http.MethodPut,
		"/usuarios/"+strconv.FormatInt(id, 10),
		corpo,
	)

	if resposta.Code != http.StatusBadRequest {
		t.Fatalf(
			"esperado status 400, recebido %d",
			resposta.Code,
		)
	}
}

func TestAtualizarUsuarioComEmailDeOutroUsuario(t *testing.T) {
	db := abrirBancoEmMemoria(t)

	id, err := inserirUsuarioTeste(
		db,
		"Primeiro",
		"primeiro@example.com",
		PapelVendedor,
	)
	if err != nil {
		t.Fatalf("erro ao inserir primeiro usuário: %v", err)
	}

	_, err = inserirUsuarioTeste(
		db,
		"Segundo",
		"segundo@example.com",
		PapelVendedor,
	)
	if err != nil {
		t.Fatalf("erro ao inserir segundo usuário: %v", err)
	}

	router := novoRouterUsuariosTeste(t, db)

	corpo := `{
		"nome": "Primeiro",
		"email": "segundo@example.com",
		"papel": "vendedor"
	}`

	resposta := executarRequisicaoUsuariosTeste(
		t,
		router,
		http.MethodPut,
		"/usuarios/"+strconv.FormatInt(id, 10),
		corpo,
	)

	if resposta.Code != http.StatusConflict {
		t.Fatalf(
			"esperado status 409, recebido %d",
			resposta.Code,
		)
	}
}

func TestAtualizarUsuarioInexistente(t *testing.T) {
	db := abrirBancoEmMemoria(t)
	router := novoRouterUsuariosTeste(t, db)

	corpo := `{
		"nome": "Usuário",
		"email": "usuario@example.com",
		"papel": "vendedor"
	}`

	resposta := executarRequisicaoUsuariosTeste(
		t,
		router,
		http.MethodPut,
		"/usuarios/999",
		corpo,
	)

	if resposta.Code != http.StatusNotFound {
		t.Fatalf(
			"esperado status 404, recebido %d",
			resposta.Code,
		)
	}
}

func TestAtualizarUsuarioComIDInvalido(t *testing.T) {
	db := abrirBancoEmMemoria(t)
	router := novoRouterUsuariosTeste(t, db)

	resposta := executarRequisicaoUsuariosTeste(
		t,
		router,
		http.MethodPut,
		"/usuarios/abc",
		`{}`,
	)

	if resposta.Code != http.StatusBadRequest {
		t.Fatalf(
			"esperado status 400, recebido %d",
			resposta.Code,
		)
	}
}

func TestExcluirUsuario(t *testing.T) {
	db := abrirBancoEmMemoria(t)

	id, err := inserirUsuarioTeste(
		db,
		"Usuário para Excluir",
		"excluir@example.com",
		PapelVendedor,
	)
	if err != nil {
		t.Fatalf("erro ao inserir usuário: %v", err)
	}

	router := novoRouterUsuariosTeste(t, db)

	resposta := executarRequisicaoUsuariosTeste(
		t,
		router,
		http.MethodDelete,
		"/usuarios/"+strconv.FormatInt(id, 10),
		"",
	)

	if resposta.Code != http.StatusNoContent {
		t.Fatalf(
			"esperado status 204, recebido %d",
			resposta.Code,
		)
	}

	var quantidade int

	err = db.QueryRow(
		"SELECT COUNT(*) FROM usuarios WHERE id = ?",
		id,
	).Scan(&quantidade)

	if err != nil {
		t.Fatalf("erro ao verificar exclusão: %v", err)
	}

	if quantidade != 0 {
		t.Error("o usuário não foi excluído do banco")
	}
}

func TestExcluirUsuarioInexistente(t *testing.T) {
	db := abrirBancoEmMemoria(t)
	router := novoRouterUsuariosTeste(t, db)

	resposta := executarRequisicaoUsuariosTeste(
		t,
		router,
		http.MethodDelete,
		"/usuarios/999",
		"",
	)

	if resposta.Code != http.StatusNotFound {
		t.Fatalf(
			"esperado status 404, recebido %d",
			resposta.Code,
		)
	}
}

func TestExcluirUsuarioComIDInvalido(t *testing.T) {
	db := abrirBancoEmMemoria(t)
	router := novoRouterUsuariosTeste(t, db)

	resposta := executarRequisicaoUsuariosTeste(
		t,
		router,
		http.MethodDelete,
		"/usuarios/abc",
		"",
	)

	if resposta.Code != http.StatusBadRequest {
		t.Fatalf(
			"esperado status 400, recebido %d",
			resposta.Code,
		)
	}
}

func TestEhEmailDuplicadoComErroRealDoSQLite(t *testing.T) {
	db := abrirBancoEmMemoria(t)

	_, err := inserirUsuarioTeste(
		db,
		"Primeiro",
		"duplicado@example.com",
		PapelVendedor,
	)
	if err != nil {
		t.Fatalf("erro ao inserir primeiro usuário: %v", err)
	}

	_, err = inserirUsuarioTeste(
		db,
		"Segundo",
		"duplicado@example.com",
		PapelAdmin,
	)

	if err == nil {
		t.Fatal("era esperado erro de e-mail duplicado")
	}

	if !ehEmailDuplicado(err) {
		t.Errorf(
			"ehEmailDuplicado não identificou o erro do SQLite: %v",
			err,
		)
	}
}

func TestRespostaDeErroEmFormatoJSON(t *testing.T) {
	db := abrirBancoEmMemoria(t)
	router := novoRouterUsuariosTeste(t, db)

	resposta := executarRequisicaoUsuariosTeste(
		t,
		router,
		http.MethodGet,
		"/usuarios/abc",
		"",
	)

	if resposta.Code != http.StatusBadRequest {
		t.Fatalf(
			"esperado status 400, recebido %d",
			resposta.Code,
		)
	}

	if !json.Valid(bytes.TrimSpace(resposta.Body.Bytes())) {
		t.Fatal("a resposta de erro não contém JSON válido")
	}

	var corpo map[string]interface{}

	if err := json.Unmarshal(resposta.Body.Bytes(), &corpo); err != nil {
		t.Fatalf("erro ao interpretar JSON de erro: %v", err)
	}

	if _, existe := corpo["erro"]; !existe {
		t.Error("a resposta de erro deve conter a propriedade erro")
	}
}
