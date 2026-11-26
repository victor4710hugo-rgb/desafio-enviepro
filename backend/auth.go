package main

import (
	"database/sql"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

type loginRequest struct {
	Email string `json:"email"`
	Senha string `json:"senha"`
}

type jwtClaims struct {
	Papel string `json:"papel"`
	jwt.RegisteredClaims
}

// Gera um token JWT assinado com HS256 e validade de 8 horas.
func gerarToken(usuario Usuario) (string, error) {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		return "", jwt.ErrTokenUnverifiable
	}

	agora := time.Now()

	claims := jwtClaims{
		Papel: usuario.Papel,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   strconv.Itoa(usuario.ID),
			IssuedAt:  jwt.NewNumericDate(agora),
			ExpiresAt: jwt.NewNumericDate(agora.Add(8 * time.Hour)),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

	return token.SignedString([]byte(secret))
}

// Realiza o login e devolve o token e os dados públicos do usuário.
func loginHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var entrada loginRequest

		if err := c.ShouldBindJSON(&entrada); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"erro": "Dados inválidos",
			})
			return
		}

		email := normalizarEmail(entrada.Email)

		var usuario Usuario

		err := db.QueryRow(`
			SELECT id, nome, email, senha_hash, papel, criado_em
			FROM usuarios
			WHERE email = ?
		`, email).Scan(
			&usuario.ID,
			&usuario.Nome,
			&usuario.Email,
			&usuario.SenhaHash,
			&usuario.Papel,
			&usuario.CriadoEm,
		)

		if err != nil {
			if err != sql.ErrNoRows {
				c.JSON(http.StatusInternalServerError, gin.H{
					"erro": "Erro ao realizar login",
				})
				return
			}

			c.JSON(http.StatusUnauthorized, gin.H{
				"erro": "e-mail ou senha inválidos",
			})
			return
		}

		if err := bcrypt.CompareHashAndPassword(
			[]byte(usuario.SenhaHash),
			[]byte(entrada.Senha),
		); err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"erro": "e-mail ou senha inválidos",
			})
			return
		}

		token, err := gerarToken(usuario)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"erro": "Não foi possível gerar o token",
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"token": token,
			"usuario": gin.H{
				"id":    usuario.ID,
				"nome":  usuario.Nome,
				"email": usuario.Email,
				"papel": usuario.Papel,
			},
		})
	}
}

// Auth valida o Bearer Token antes de permitir o acesso às rotas.
func Auth() gin.HandlerFunc {
	return func(c *gin.Context) {
		// O login é a única rota pública.
		if c.Request.Method == http.MethodPost &&
			c.Request.URL.Path == "/auth/login" {
			c.Next()
			return
		}

		secret := os.Getenv("JWT_SECRET")
		if secret == "" {
			c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{
				"erro": "Configuração de autenticação indisponível",
			})
			return
		}

		cabecalho := c.GetHeader("Authorization")
		partes := strings.SplitN(cabecalho, " ", 2)

		if len(partes) != 2 ||
			!strings.EqualFold(partes[0], "Bearer") ||
			strings.TrimSpace(partes[1]) == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"erro": "Token de autenticação ausente ou inválido",
			})
			return
		}

		claims := &jwtClaims{}

		token, err := jwt.ParseWithClaims(
			partes[1],
			claims,
			func(token *jwt.Token) (interface{}, error) {
				if token.Method != jwt.SigningMethodHS256 {
					return nil, jwt.ErrSignatureInvalid
				}
				return []byte(secret), nil
			},
			jwt.WithValidMethods([]string{"HS256"}),
			jwt.WithExpirationRequired(),
		)

		if err != nil || !token.Valid {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"erro": "Token de autenticação inválido ou expirado",
			})
			return
		}

		id, err := strconv.Atoi(claims.Subject)
		if err != nil || id <= 0 ||
			(claims.Papel != PapelAdmin && claims.Papel != PapelVendedor) {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"erro": "Token de autenticação inválido",
			})
			return
		}

		c.Set("usuario_id", id)
		c.Set("usuario_papel", claims.Papel)

		c.Next()
	}
}

// Retorna os dados do usuário autenticado a partir das informações do token.
func authMeHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		id, existe := c.Get("usuario_id")
		if !existe {
			c.JSON(http.StatusUnauthorized, gin.H{
				"erro": "Usuário não autenticado",
			})
			return
		}

		papel, existe := c.Get("usuario_papel")
		if !existe {
			c.JSON(http.StatusUnauthorized, gin.H{
				"erro": "Usuário não autenticado",
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"id":    id,
			"papel": papel,
		})
	}
}
