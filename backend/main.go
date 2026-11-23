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
