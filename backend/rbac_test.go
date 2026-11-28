package main

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func executarRequireRoleTeste(
	papel interface{},
	incluirPapel bool,
	papeisPermitidos []string,
) (*httptest.ResponseRecorder, bool) {
	gin.SetMode(gin.TestMode)

	router := gin.New()
	handlerExecutado := false

	router.GET(
		"/protegido",
		func(c *gin.Context) {
			if incluirPapel {
				c.Set("usuario_papel", papel)
			}
			c.Next()
		},
		RequireRole(papeisPermitidos...),
		func(c *gin.Context) {
			handlerExecutado = true
			c.Status(http.StatusNoContent)
		},
	)

	req := httptest.NewRequest(http.MethodGet, "/protegido", nil)
	resposta := httptest.NewRecorder()
	router.ServeHTTP(resposta, req)

	return resposta, handlerExecutado
}

func TestRequireRolePermiteAdmin(t *testing.T) {
	resposta, executou := executarRequireRoleTeste(
		PapelAdmin, true, []string{PapelAdmin},
	)

	if resposta.Code != http.StatusNoContent || !executou {
		t.Fatalf("admin deveria acessar: status=%d, handler=%v", resposta.Code, executou)
	}
}

func TestRequireRoleBloqueiaVendedorEmRotaAdmin(t *testing.T) {
	resposta, executou := executarRequireRoleTeste(
		PapelVendedor, true, []string{PapelAdmin},
	)

	if resposta.Code != http.StatusForbidden || executou {
		t.Fatalf("vendedor deveria receber 403: status=%d, handler=%v", resposta.Code, executou)
	}
}

func TestRequireRolePermiteVendedorQuandoConfigurado(t *testing.T) {
	resposta, executou := executarRequireRoleTeste(
		PapelVendedor, true, []string{PapelAdmin, PapelVendedor},
	)

	if resposta.Code != http.StatusNoContent || !executou {
		t.Fatalf("vendedor deveria acessar: status=%d, handler=%v", resposta.Code, executou)
	}
}

func TestRequireRoleRejeitaPapelAusente(t *testing.T) {
	resposta, executou := executarRequireRoleTeste(
		nil, false, []string{PapelAdmin},
	)

	if resposta.Code != http.StatusUnauthorized || executou {
		t.Fatalf("papel ausente deveria receber 401: status=%d, handler=%v", resposta.Code, executou)
	}
}

func TestRequireRoleRejeitaTipoDePapelInvalido(t *testing.T) {
	resposta, executou := executarRequireRoleTeste(
		123, true, []string{PapelAdmin},
	)

	if resposta.Code != http.StatusUnauthorized || executou {
		t.Fatalf("papel com tipo inválido deveria receber 401: status=%d, handler=%v", resposta.Code, executou)
	}
}

func TestRequireRoleRejeitaPapelDesconhecidoNoContexto(t *testing.T) {
	resposta, executou := executarRequireRoleTeste(
		"gerente", true, []string{PapelAdmin},
	)

	if resposta.Code != http.StatusUnauthorized || executou {
		t.Fatalf("papel desconhecido deveria receber 401: status=%d, handler=%v", resposta.Code, executou)
	}
}

func TestRequireRoleFalhaFechadoComConfiguracaoVazia(t *testing.T) {
	resposta, executou := executarRequireRoleTeste(
		PapelAdmin, true, nil,
	)

	if resposta.Code != http.StatusInternalServerError || executou {
		t.Fatalf("configuração vazia deveria falhar fechada: status=%d, handler=%v", resposta.Code, executou)
	}
}

func TestRequireRoleFalhaFechadoComPapelConfiguradoInvalido(t *testing.T) {
	resposta, executou := executarRequireRoleTeste(
		PapelAdmin, true, []string{"gerente"},
	)

	if resposta.Code != http.StatusInternalServerError || executou {
		t.Fatalf("papel configurado inválido deveria falhar fechada: status=%d, handler=%v", resposta.Code, executou)
	}
}
