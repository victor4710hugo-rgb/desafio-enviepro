package main

import (
	"database/sql"
	"log"
	"net/http"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	_ "modernc.org/sqlite"
)

func main() {
	// Abre o banco SQLite. Se não existir, será criado.
	db, err := sql.Open("sqlite", "./crm.db")
	if err != nil {
		log.Fatal("Erro ao abrir banco:", err)
	}
	defer db.Close()

	db.SetMaxOpenConns(1)

	if err := db.Ping(); err != nil {
		log.Fatal("Erro ao conectar ao banco:", err)
	}

	log.Println("Banco SQLite conectado!")

	// Cria as tabelas do CRM.
	if err := criarTabelas(db); err != nil {
		log.Fatal("Erro ao criar tabelas:", err)
	}

	if err := popularBanco(db); err != nil {
		log.Fatal("Erro ao popular banco:", err)
	}

	// Configura o servidor Gin.
	router := gin.Default()

	if err := router.SetTrustedProxies(nil); err != nil {
		log.Fatal("Erro ao configurar proxies:", err)
	}

	config := cors.DefaultConfig()
	config.AllowOrigins = []string{"http://localhost:3000"}
	config.AllowMethods = []string{
		"GET", "POST", "PUT", "DELETE", "OPTIONS",
	}
	config.AllowHeaders = []string{
		"Origin", "Content-Type", "Accept", "Authorization",
	}
	router.Use(cors.New(config))

	// Rota inicial para verificar se a API está funcionando.
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":  "online",
			"message": "API EnviePro funcionando!",
		})
	})

	// Lista todos os clientes cadastrados.
	router.GET("/clientes", func(c *gin.Context) {
		linhas, err := db.Query(`
			SELECT
				id,
				nome,
				empresa,
				email,
				telefone,
				status,
				responsavel,
				ultimo_contato
			FROM clientes
			ORDER BY nome
		`)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"erro": "Erro ao consultar clientes",
			})
			return
		}
		defer linhas.Close()

		clientes := []gin.H{}

		for linhas.Next() {
			var id int
			var nome, empresa, email string
			var telefone, status, responsavel, ultimoContato sql.NullString

			err := linhas.Scan(
				&id,
				&nome,
				&empresa,
				&email,
				&telefone,
				&status,
				&responsavel,
				&ultimoContato,
			)

			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{
					"erro": "Erro ao ler os dados dos clientes",
				})
				return
			}

			clientes = append(clientes, gin.H{
				"id":             id,
				"nome":           nome,
				"empresa":        empresa,
				"email":          email,
				"telefone":       telefone.String,
				"status":         status.String,
				"responsavel":    responsavel.String,
				"ultimo_contato": ultimoContato.String,
			})
		}

		if err := linhas.Err(); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"erro": "Erro durante a leitura dos clientes",
			})
			return
		}

		c.JSON(http.StatusOK, clientes)
	})

	// Apresenta o resumo das oportunidades por etapa do funil.
	router.GET("/funil", func(c *gin.Context) {
		linhas, err := db.Query(`
			SELECT
				etapa_funil,
				COUNT(*) AS quantidade,
				SUM(valor) AS valor_total
			FROM oportunidades
			GROUP BY etapa_funil
			ORDER BY
				CASE etapa_funil
					WHEN 'Prospecção' THEN 1
					WHEN 'Qualificação' THEN 2
					WHEN 'Proposta' THEN 3
					WHEN 'Negociação' THEN 4
					WHEN 'Fechada' THEN 5
					ELSE 6
				END
		`)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"erro": "Erro ao consultar o funil de oportunidades",
			})
			return
		}
		defer linhas.Close()

		etapas := []gin.H{}

		for linhas.Next() {
			var etapa string
			var quantidade int
			var valorTotal float64

			if err := linhas.Scan(&etapa, &quantidade, &valorTotal); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{
					"erro": "Erro ao ler os dados do funil",
				})
				return
			}

			etapas = append(etapas, gin.H{
				"etapa":       etapa,
				"quantidade":  quantidade,
				"valor_total": valorTotal,
			})
		}

		if err := linhas.Err(); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"erro": "Erro durante a leitura do funil",
			})
			return
		}

		c.JSON(http.StatusOK, etapas)
	})

	log.Println("Servidor iniciado em http://localhost:8080")

	if err := router.Run(":8080"); err != nil {
		log.Fatal("Erro ao iniciar servidor:", err)
	}
}

func criarTabelas(db *sql.DB) error {
	schemas := []string{
		`CREATE TABLE IF NOT EXISTS clientes (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			nome TEXT NOT NULL,
			empresa TEXT NOT NULL,
			email TEXT NOT NULL,
			telefone TEXT,
			status TEXT NOT NULL,
			responsavel TEXT NOT NULL,
			ultimo_contato DATE
		);`,

		`CREATE TABLE IF NOT EXISTS oportunidades (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			cliente_id INTEGER NOT NULL,
			titulo TEXT NOT NULL,
			etapa_funil TEXT NOT NULL,
			valor REAL NOT NULL,
			data_criacao DATE NOT NULL,
			FOREIGN KEY (cliente_id) REFERENCES clientes(id)
		);`,

		`CREATE TABLE IF NOT EXISTS vendas (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			cliente_id INTEGER NOT NULL,
			valor REAL NOT NULL,
			data DATE NOT NULL,
			produto TEXT NOT NULL,
			FOREIGN KEY (cliente_id) REFERENCES clientes(id)
		);`,
	}

	for _, schema := range schemas {
		if _, err := db.Exec(schema); err != nil {
			return err
		}
	}

	return nil
}
