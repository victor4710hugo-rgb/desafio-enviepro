package main

import (
	"database/sql"
	"log"
	"net/http"
	"time"

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
			ORDER BY CASE etapa_funil
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

	// Lista as oportunidades com os dados de contato dos respectivos clientes.
	router.GET("/oportunidades", func(c *gin.Context) {
		linhas, err := db.Query(`
			SELECT
				o.id,
				o.cliente_id,
				o.titulo,
				o.etapa_funil,
				o.valor,
				o.data_criacao,
				c.nome,
				c.empresa,
				c.email,
				c.telefone
			FROM oportunidades o
			INNER JOIN clientes c ON c.id = o.cliente_id
			ORDER BY CASE o.etapa_funil
				WHEN 'Prospecção' THEN 1
				WHEN 'Qualificação' THEN 2
				WHEN 'Proposta' THEN 3
				WHEN 'Negociação' THEN 4
				WHEN 'Fechada' THEN 5
				ELSE 6
			END, c.nome
		`)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"erro": "Erro ao consultar as oportunidades",
			})
			return
		}
		defer linhas.Close()

		oportunidades := []gin.H{}

		for linhas.Next() {
			var id, clienteID int
			var titulo, etapa, dataCriacao string
			var valor float64
			var clienteNome, clienteEmpresa, clienteEmail string
			var clienteTelefone sql.NullString

			err := linhas.Scan(
				&id,
				&clienteID,
				&titulo,
				&etapa,
				&valor,
				&dataCriacao,
				&clienteNome,
				&clienteEmpresa,
				&clienteEmail,
				&clienteTelefone,
			)

			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{
					"erro": "Erro ao ler os dados das oportunidades",
				})
				return
			}

			oportunidades = append(oportunidades, gin.H{
				"id":               id,
				"cliente_id":       clienteID,
				"titulo":           titulo,
				"etapa":            etapa,
				"valor":            valor,
				"data_criacao":     dataCriacao,
				"cliente_nome":     clienteNome,
				"cliente_empresa":  clienteEmpresa,
				"cliente_email":    clienteEmail,
				"cliente_telefone": clienteTelefone.String,
			})
		}

		if err := linhas.Err(); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"erro": "Erro durante a leitura das oportunidades",
			})
			return
		}

		c.JSON(http.StatusOK, oportunidades)
	})

	// Retorna o resumo das vendas do mês atual.
	router.GET("/vendas/resumo", func(c *gin.Context) {
		agora := time.Now()

		inicioMes := time.Date(
			agora.Year(),
			agora.Month(),
			1,
			0, 0, 0, 0,
			agora.Location(),
		)

		inicioProximoMes := inicioMes.AddDate(0, 1, 0)

		var quantidade int
		var totalVendido float64
		var ticketMedio float64

		err := db.QueryRow(`
			SELECT
				COUNT(*),
				COALESCE(SUM(valor), 0),
				COALESCE(AVG(valor), 0)
			FROM vendas
			WHERE date(data) >= date(?)
			  AND date(data) < date(?)
		`,
			inicioMes.Format("2006-01-02"),
			inicioProximoMes.Format("2006-01-02"),
		).Scan(
			&quantidade,
			&totalVendido,
			&ticketMedio,
		)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"erro": "Erro ao consultar o resumo das vendas",
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"mes_referencia":    inicioMes.Format("2006-01"),
			"total_vendido":     totalVendido,
			"quantidade_vendas": quantidade,
			"ticket_medio":      ticketMedio,
		})
	})

	// Lista todas as vendas com os respectivos clientes.
	router.GET("/vendas", func(c *gin.Context) {
		linhas, err := db.Query(`
			SELECT
				v.id,
				v.cliente_id,
				c.nome,
				v.valor,
				v.data,
				v.produto
			FROM vendas v
			INNER JOIN clientes c ON c.id = v.cliente_id
			ORDER BY v.data DESC
		`)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"erro": "Erro ao consultar as vendas",
			})
			return
		}

		defer linhas.Close()

		vendas := []gin.H{}

		for linhas.Next() {
			var id int
			var clienteID int
			var cliente string
			var valor float64
			var data string
			var produto string

			err := linhas.Scan(
				&id,
				&clienteID,
				&cliente,
				&valor,
				&data,
				&produto,
			)

			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{
					"erro": "Erro ao ler os dados das vendas",
				})
				return
			}

			vendas = append(vendas, gin.H{
				"id":         id,
				"cliente_id": clienteID,
				"cliente":    cliente,
				"valor":      valor,
				"data":       data,
				"produto":    produto,
			})
		}

		if err := linhas.Err(); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"erro": "Erro durante a leitura das vendas",
			})
			return
		}

		c.JSON(http.StatusOK, vendas)
	})

	log.Println("Servidor iniciado em http://localhost:8080")

	if err := router.Run(":8080"); err != nil {
		log.Fatal("Erro ao iniciar servidor:", err)
	}
}
