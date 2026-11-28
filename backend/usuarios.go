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

type criarUsuarioRequest struct {
	Nome  string `json:"nome"`
	Email string `json:"email"`
	Senha string `json:"senha"`
	Papel string `json:"papel"`
}

type atualizarUsuarioRequest struct {
	Nome  string  `json:"nome"`
	Email string  `json:"email"`
	Senha *string `json:"senha"`
	Papel string  `json:"papel"`
}

func gerarHashSenha(senha string) (string, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(senha), bcrypt.DefaultCost)
	if err != nil {
		return "", fmt.Errorf("erro ao gerar hash da senha: %w", err)
	}
	return string(hash), nil
}

func converterUsuarioResponse(usuario Usuario) UsuarioResponse {
	return UsuarioResponse{
		ID:       usuario.ID,
		Nome:     usuario.Nome,
		Email:    usuario.Email,
		Papel:    usuario.Papel,
		CriadoEm: usuario.CriadoEm,
	}
}

func obterIDUsuario(c *gin.Context) (int, bool) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil || id <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"erro": "ID de usuário inválido"})
		return 0, false
	}
	return id, true
}

func ehEmailDuplicado(err error) bool {
	return err != nil &&
		strings.Contains(strings.ToLower(err.Error()), "unique constraint failed: usuarios.email")
}

func registrarRotasUsuarios(router *gin.Engine, db *sql.DB) {
	grupo := router.Group("/usuarios")
	grupo.Use(RequireRole(PapelAdmin))

	grupo.GET("", func(c *gin.Context) {
		linhas, err := db.Query(`
			SELECT id, nome, email, papel, criado_em
			FROM usuarios
			ORDER BY nome
		`)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"erro": "Erro ao consultar usuários"})
			return
		}
		defer linhas.Close()

		usuarios := []UsuarioResponse{}
		for linhas.Next() {
			var usuario Usuario
			if err := linhas.Scan(&usuario.ID, &usuario.Nome, &usuario.Email, &usuario.Papel, &usuario.CriadoEm); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"erro": "Erro ao ler os dados dos usuários"})
				return
			}
			usuarios = append(usuarios, converterUsuarioResponse(usuario))
		}
		if err := linhas.Err(); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"erro": "Erro durante a leitura dos usuários"})
			return
		}
		c.JSON(http.StatusOK, usuarios)
	})

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
		`, id).Scan(&usuario.ID, &usuario.Nome, &usuario.Email, &usuario.Papel, &usuario.CriadoEm)
		if errors.Is(err, sql.ErrNoRows) {
			c.JSON(http.StatusNotFound, gin.H{"erro": "Usuário não encontrado"})
			return
		}
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"erro": "Erro ao consultar usuário"})
			return
		}
		c.JSON(http.StatusOK, converterUsuarioResponse(usuario))
	})

	grupo.POST("", func(c *gin.Context) {
		var entrada criarUsuarioRequest
		if err := c.ShouldBindJSON(&entrada); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"erro": "Dados inválidos ou JSON malformado"})
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
			c.JSON(http.StatusInternalServerError, gin.H{"erro": "Erro ao verificar e-mail"})
			return
		}
		if duplicado {
			c.JSON(http.StatusConflict, gin.H{"erro": "Este e-mail já está cadastrado"})
			return
		}

		hash, err := gerarHashSenha(entrada.Senha)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"erro": "Erro ao proteger a senha"})
			return
		}
		resultado, err := db.Exec(`
			INSERT INTO usuarios (nome, email, senha_hash, papel)
			VALUES (?, ?, ?, ?)
		`, entrada.Nome, entrada.Email, hash, entrada.Papel)
		if err != nil {
			if ehEmailDuplicado(err) {
				c.JSON(http.StatusConflict, gin.H{"erro": "Este e-mail já está cadastrado"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"erro": "Erro ao cadastrar usuário"})
			return
		}

		id, err := resultado.LastInsertId()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"erro": "Usuário cadastrado, mas não foi possível obter seu ID"})
			return
		}
		var usuario Usuario
		err = db.QueryRow(`
			SELECT id, nome, email, papel, criado_em
			FROM usuarios
			WHERE id = ?
		`, id).Scan(&usuario.ID, &usuario.Nome, &usuario.Email, &usuario.Papel, &usuario.CriadoEm)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"erro": "Usuário cadastrado, mas não foi possível consultá-lo"})
			return
		}
		c.JSON(http.StatusCreated, converterUsuarioResponse(usuario))
	})

	grupo.PUT("/:id", func(c *gin.Context) {
		id, ok := obterIDUsuario(c)
		if !ok {
			return
		}
		var entrada atualizarUsuarioRequest
		if err := c.ShouldBindJSON(&entrada); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"erro": "Dados inválidos ou JSON malformado"})
			return
		}

		tx, err := db.Begin()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"erro": "Erro ao iniciar atualização"})
			return
		}
		defer tx.Rollback()

		var usuarioAtual Usuario
		err = tx.QueryRow(`
			SELECT id, nome, email, senha_hash, papel, criado_em
			FROM usuarios
			WHERE id = ?
		`, id).Scan(&usuarioAtual.ID, &usuarioAtual.Nome, &usuarioAtual.Email, &usuarioAtual.SenhaHash, &usuarioAtual.Papel, &usuarioAtual.CriadoEm)
		if errors.Is(err, sql.ErrNoRows) {
			c.JSON(http.StatusNotFound, gin.H{"erro": "Usuário não encontrado"})
			return
		}
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"erro": "Erro ao consultar usuário"})
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

		autenticadoID, existe := c.Get("usuario_id")
		if existe && autenticadoID.(int) == id && entrada.Papel != usuarioAtual.Papel {
			c.JSON(http.StatusForbidden, gin.H{"erro": "Não é permitido alterar o próprio papel"})
			return
		}

		if usuarioAtual.Papel == PapelAdmin && entrada.Papel == PapelVendedor {
			var totalAdmins int
			if err := tx.QueryRow(
				"SELECT COUNT(*) FROM usuarios WHERE papel = ?",
				PapelAdmin,
			).Scan(&totalAdmins); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"erro": "Erro ao verificar administradores"})
				return
			}
			if totalAdmins <= 1 {
				c.JSON(http.StatusConflict, gin.H{"erro": "Não é permitido rebaixar o último administrador"})
				return
			}
		}

		var quantidadeDuplicados int
		err = tx.QueryRow(
			`SELECT COUNT(*) FROM usuarios WHERE email = ? AND id <> ?`,
			entrada.Email,
			id,
		).Scan(&quantidadeDuplicados)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"erro": "Erro ao verificar e-mail"})
			return
		}
		if quantidadeDuplicados > 0 {
			c.JSON(http.StatusConflict, gin.H{"erro": "Este e-mail já está cadastrado"})
			return
		}

		novoHash := usuarioAtual.SenhaHash
		if entrada.Senha != nil {
			if err := validarSenha(*entrada.Senha); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"erro": err.Error()})
				return
			}
			novoHash, err = gerarHashSenha(*entrada.Senha)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"erro": "Erro ao proteger a senha"})
				return
			}
		}

		_, err = tx.Exec(`
			UPDATE usuarios
			SET nome = ?, email = ?, senha_hash = ?, papel = ?
			WHERE id = ?
		`, entrada.Nome, entrada.Email, novoHash, entrada.Papel, id)
		if err != nil {
			if ehEmailDuplicado(err) {
				c.JSON(http.StatusConflict, gin.H{"erro": "Este e-mail já está cadastrado"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"erro": "Erro ao atualizar usuário"})
			return
		}
		if err := tx.Commit(); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"erro": "Erro ao confirmar atualização"})
			return
		}

		var usuarioAtualizado Usuario
		err = db.QueryRow(`
			SELECT id, nome, email, papel, criado_em
			FROM usuarios
			WHERE id = ?
		`, id).Scan(&usuarioAtualizado.ID, &usuarioAtualizado.Nome, &usuarioAtualizado.Email, &usuarioAtualizado.Papel, &usuarioAtualizado.CriadoEm)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"erro": "Usuário atualizado, mas não foi possível consultá-lo"})
			return
		}
		c.JSON(http.StatusOK, converterUsuarioResponse(usuarioAtualizado))
	})

	grupo.DELETE("/:id", func(c *gin.Context) {
		id, ok := obterIDUsuario(c)
		if !ok {
			return
		}

		autenticadoID, existe := c.Get("usuario_id")
		if existe && autenticadoID.(int) == id {
			c.JSON(http.StatusForbidden, gin.H{"erro": "Não é permitido excluir a própria conta"})
			return
		}

		tx, err := db.Begin()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"erro": "Erro ao iniciar exclusão"})
			return
		}
		defer tx.Rollback()

		var papel string
		err = tx.QueryRow("SELECT papel FROM usuarios WHERE id = ?", id).Scan(&papel)
		if errors.Is(err, sql.ErrNoRows) {
			c.JSON(http.StatusNotFound, gin.H{"erro": "Usuário não encontrado"})
			return
		}
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"erro": "Erro ao consultar usuário"})
			return
		}

		if papel == PapelAdmin {
			var totalAdmins int
			if err := tx.QueryRow(
				"SELECT COUNT(*) FROM usuarios WHERE papel = ?",
				PapelAdmin,
			).Scan(&totalAdmins); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"erro": "Erro ao verificar administradores"})
				return
			}
			if totalAdmins <= 1 {
				c.JSON(http.StatusConflict, gin.H{"erro": "Não é permitido excluir o último administrador"})
				return
			}
		}

		resultado, err := tx.Exec("DELETE FROM usuarios WHERE id = ?", id)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"erro": "Erro ao excluir usuário"})
			return
		}
		afetados, err := resultado.RowsAffected()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"erro": "Erro ao verificar exclusão"})
			return
		}
		if afetados == 0 {
			c.JSON(http.StatusNotFound, gin.H{"erro": "Usuário não encontrado"})
			return
		}
		if err := tx.Commit(); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"erro": "Erro ao confirmar exclusão"})
			return
		}
		c.Status(http.StatusNoContent)
	})
}
