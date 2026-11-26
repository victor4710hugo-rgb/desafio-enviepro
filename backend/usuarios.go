package main

import (
	"database/sql"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

// Dados recebidos no cadastro.
type criarUsuarioRequest struct {
	Nome  string `json:"nome"`
	Email string `json:"email"`
	Senha string `json:"senha"`
	Papel string `json:"papel"`
}

// Dados recebidos na atualização.
// O ponteiro permite distinguir senha ausente de senha vazia.
type atualizarUsuarioRequest struct {
	Nome  string  `json:"nome"`
	Email string  `json:"email"`
	Senha *string `json:"senha"`
	Papel string  `json:"papel"`
}

// Gera o hash bcrypt de uma senha já validada.
func gerarHashSenha(senha string) (string, error) {
	hash, err := bcrypt.GenerateFromPassword(
		[]byte(senha),
		bcrypt.DefaultCost,
	)
	if err != nil {
		return "", fmt.Errorf("erro ao gerar hash da senha: %w", err)
	}

	return string(hash), nil
}

// Converte o modelo interno para o formato público da API.
func converterUsuarioResponse(usuario Usuario) UsuarioResponse {
	return UsuarioResponse{
		ID:       usuario.ID,
		Nome:     usuario.Nome,
		Email:    usuario.Email,
		Papel:    usuario.Papel,
		CriadoEm: usuario.CriadoEm,
	}
}

// Lê e valida um ID recebido pela URL.
func obterIDUsuario(c *gin.Context) (int, bool) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil || id <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"erro": "ID de usuário inválido",
		})
		return 0, false
	}

	return id, true
}

// Verifica se o erro do SQLite representa violação da unicidade do e-mail.
func ehEmailDuplicado(err error) bool {
	return err != nil &&
		strings.Contains(
			strings.ToLower(err.Error()),
			"unique constraint failed: usuarios.email",
		)
}

// Registra os endpoints do CRUD de usuários.
func registrarRotasUsuarios(router *gin.Engine, db *sql.DB) {
	grupo := router.Group("/usuarios")

	// Lista todos os usuários.
	grupo.GET("", func(c *gin.Context) {
		linhas, err := db.Query(`
			SELECT id, nome, email, papel, criado_em
			FROM usuarios
			ORDER BY nome
		`)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"erro": "Erro ao consultar usuários",
			})
			return
		}
		defer linhas.Close()

		usuarios := []UsuarioResponse{}

		for linhas.Next() {
			var usuario Usuario

			if err := linhas.Scan(
				&usuario.ID,
				&usuario.Nome,
				&usuario.Email,
				&usuario.Papel,
				&usuario.CriadoEm,
			); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{
					"erro": "Erro ao ler os dados dos usuários",
				})
				return
			}

			usuarios = append(
				usuarios,
				converterUsuarioResponse(usuario),
			)
		}

		if err := linhas.Err(); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"erro": "Erro durante a leitura dos usuários",
			})
			return
		}

		c.JSON(http.StatusOK, usuarios)
	})

	// Consulta um usuário pelo ID.
	grupo.GET("/:id", func(c *gin.Context) {
		id, ok := obterIDUsuario(c)
		if !ok {
			return
		}

		var usuario Usuario

		err := db.QueryRow(`
			SELECT id, nome, email, papel, criado_em
			FROM usuarios
			WHERE id = ?
		`, id).Scan(
			&usuario.ID,
			&usuario.Nome,
			&usuario.Email,
			&usuario.Papel,
			&usuario.CriadoEm,
		)

		if errors.Is(err, sql.ErrNoRows) {
			c.JSON(http.StatusNotFound, gin.H{
				"erro": "Usuário não encontrado",
			})
			return
		}

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"erro": "Erro ao consultar usuário",
			})
			return
		}

		c.JSON(
			http.StatusOK,
			converterUsuarioResponse(usuario),
		)
	})

	// Cadastra um novo usuário.
	grupo.POST("", func(c *gin.Context) {
		var entrada criarUsuarioRequest

		if err := c.ShouldBindJSON(&entrada); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"erro": "Dados inválidos ou JSON malformado",
			})
			return
		}

		entrada.Nome = strings.TrimSpace(entrada.Nome)
		entrada.Email = normalizarEmail(entrada.Email)

		if err := validarNome(entrada.Nome); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"erro": err.Error()})
			return
		}

		if err := validarEmail(entrada.Email); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"erro": err.Error()})
			return
		}

		if err := validarSenha(entrada.Senha); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"erro": err.Error()})
			return
		}

		if err := validarPapel(entrada.Papel); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"erro": err.Error()})
			return
		}

		duplicado, err := emailJaCadastrado(db, entrada.Email, 0)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"erro": "Erro ao verificar e-mail",
			})
			return
		}

		if duplicado {
			c.JSON(http.StatusConflict, gin.H{
				"erro": "Este e-mail já está cadastrado",
			})
			return
		}

		hash, err := gerarHashSenha(entrada.Senha)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"erro": "Erro ao proteger a senha",
			})
			return
		}

		resultado, err := db.Exec(`
			INSERT INTO usuarios (nome, email, senha_hash, papel)
			VALUES (?, ?, ?, ?)
		`,
			entrada.Nome,
			entrada.Email,
			hash,
			entrada.Papel,
		)

		if err != nil {
			if ehEmailDuplicado(err) {
				c.JSON(http.StatusConflict, gin.H{
					"erro": "Este e-mail já está cadastrado",
				})
				return
			}

			c.JSON(http.StatusInternalServerError, gin.H{
				"erro": "Erro ao cadastrar usuário",
			})
			return
		}

		id, err := resultado.LastInsertId()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"erro": "Usuário cadastrado, mas não foi possível obter seu ID",
			})
			return
		}

		var usuario Usuario

		err = db.QueryRow(`
			SELECT id, nome, email, papel, criado_em
			FROM usuarios
			WHERE id = ?
		`, id).Scan(
			&usuario.ID,
			&usuario.Nome,
			&usuario.Email,
			&usuario.Papel,
			&usuario.CriadoEm,
		)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"erro": "Usuário cadastrado, mas não foi possível consultá-lo",
			})
			return
		}

		c.JSON(
			http.StatusCreated,
			converterUsuarioResponse(usuario),
		)
	})

	// Atualiza os dados de um usuário.
	grupo.PUT("/:id", func(c *gin.Context) {
		id, ok := obterIDUsuario(c)
		if !ok {
			return
		}

		var entrada atualizarUsuarioRequest

		if err := c.ShouldBindJSON(&entrada); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"erro": "Dados inválidos ou JSON malformado",
			})
			return
		}

		var usuarioAtual Usuario

		err := db.QueryRow(`
			SELECT id, nome, email, senha_hash, papel, criado_em
			FROM usuarios
			WHERE id = ?
		`, id).Scan(
			&usuarioAtual.ID,
			&usuarioAtual.Nome,
			&usuarioAtual.Email,
			&usuarioAtual.SenhaHash,
			&usuarioAtual.Papel,
			&usuarioAtual.CriadoEm,
		)

		if errors.Is(err, sql.ErrNoRows) {
			c.JSON(http.StatusNotFound, gin.H{
				"erro": "Usuário não encontrado",
			})
			return
		}

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"erro": "Erro ao consultar usuário",
			})
			return
		}

		entrada.Nome = strings.TrimSpace(entrada.Nome)
		entrada.Email = normalizarEmail(entrada.Email)

		if err := validarNome(entrada.Nome); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"erro": err.Error()})
			return
		}

		if err := validarEmail(entrada.Email); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"erro": err.Error()})
			return
		}

		if err := validarPapel(entrada.Papel); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"erro": err.Error()})
			return
		}

		duplicado, err := emailJaCadastrado(db, entrada.Email, id)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"erro": "Erro ao verificar e-mail",
			})
			return
		}

		if duplicado {
			c.JSON(http.StatusConflict, gin.H{
				"erro": "Este e-mail já está cadastrado",
			})
			return
		}

		novoHash := usuarioAtual.SenhaHash

		if entrada.Senha != nil {
			if err := validarSenha(*entrada.Senha); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{
					"erro": err.Error(),
				})
				return
			}

			novoHash, err = gerarHashSenha(*entrada.Senha)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{
					"erro": "Erro ao proteger a senha",
				})
				return
			}
		}

		resultado, err := db.Exec(`
			UPDATE usuarios
			SET nome = ?, email = ?, senha_hash = ?, papel = ?
			WHERE id = ?
		`,
			entrada.Nome,
			entrada.Email,
			novoHash,
			entrada.Papel,
			id,
		)

		if err != nil {
			if ehEmailDuplicado(err) {
				c.JSON(http.StatusConflict, gin.H{
					"erro": "Este e-mail já está cadastrado",
				})
				return
			}

			c.JSON(http.StatusInternalServerError, gin.H{
				"erro": "Erro ao atualizar usuário",
			})
			return
		}

		afetados, err := resultado.RowsAffected()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"erro": "Erro ao verificar atualização do usuário",
			})
			return
		}

		if afetados == 0 {
			c.JSON(http.StatusNotFound, gin.H{
				"erro": "Usuário não encontrado",
			})
			return
		}

		var usuarioAtualizado Usuario

		err = db.QueryRow(`
			SELECT id, nome, email, papel, criado_em
			FROM usuarios
			WHERE id = ?
		`, id).Scan(
			&usuarioAtualizado.ID,
			&usuarioAtualizado.Nome,
			&usuarioAtualizado.Email,
			&usuarioAtualizado.Papel,
			&usuarioAtualizado.CriadoEm,
		)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"erro": "Usuário atualizado, mas não foi possível consultá-lo",
			})
			return
		}

		c.JSON(
			http.StatusOK,
			converterUsuarioResponse(usuarioAtualizado),
		)
	})

	// Exclui um usuário.
	grupo.DELETE("/:id", func(c *gin.Context) {
		id, ok := obterIDUsuario(c)
		if !ok {
			return
		}

		resultado, err := db.Exec(
			"DELETE FROM usuarios WHERE id = ?",
			id,
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"erro": "Erro ao excluir usuário",
			})
			return
		}

		afetados, err := resultado.RowsAffected()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"erro": "Erro ao verificar exclusão do usuário",
			})
			return
		}

		if afetados == 0 {
			c.JSON(http.StatusNotFound, gin.H{
				"erro": "Usuário não encontrado",
			})
			return
		}

		c.Status(http.StatusNoContent)
	})
}
