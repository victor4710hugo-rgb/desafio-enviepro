package main

import (
	"database/sql"
	"fmt"
	"os"
	"time"

	"golang.org/x/crypto/bcrypt"
)

func popularBanco(db *sql.DB) error {
	var total int

	err := db.QueryRow("SELECT COUNT(*) FROM clientes").Scan(&total)
	if err != nil {
		return err
	}

	if total > 0 {
		fmt.Println("Banco já possui dados. Seed não executado novamente.")
		return nil
	}

	tx, err := db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	nomes := []string{
		"Mariana Costa", "Pedro Almeida", "Ana Martins",
		"Lucas Ferreira", "Juliana Rocha", "Rafael Souza",
		"Camila Oliveira", "Bruno Santos", "Fernanda Lima",
		"Gabriel Ribeiro", "Patricia Gomes", "Felipe Carvalho",
		"Beatriz Mendes", "Thiago Nunes", "Larissa Barros",
		"Eduardo Freitas", "Isabela Moreira", "Ricardo Dias",
		"Carolina Azevedo", "André Monteiro",
	}

	empresas := []string{
		"Alpha Serviços", "Beta Tecnologia", "Gamma Consultoria",
		"Delta Engenharia", "Epsilon Logística", "Zeta Comercial",
		"Eta Soluções", "Theta Gestão", "Iota Sistemas",
		"Kappa Facilities", "Lambda Projetos", "Omega Serviços",
		"Prime Consultoria", "Nexus Tecnologia", "Vértice Gestão",
		"Atlas Engenharia", "Horizonte Soluções", "Ponto Certo",
		"Nova Era Serviços", "Conecta Brasil",
	}

	responsaveis := []string{
		"Carla Mendes", "Roberto Lima", "Fernanda Alves",
		"Carla Mendes", "Roberto Lima",
	}

	agora := time.Now()

	for i := 0; i < 20; i++ {
		status := "Ativo"
		if i%5 == 0 {
			status = "Inativo"
		}

		diasSemContato := (i % 4) + 1
		if i%4 == 0 {
			diasSemContato = 25
		}

		ultimoContato := agora.AddDate(0, 0, -diasSemContato).
			Format("2006-01-02")

		email := fmt.Sprintf("cliente%d@exemplo.com", i+1)
		telefone := fmt.Sprintf("(31) 3333-%04d", 1000+i)

		_, err := tx.Exec(`
			INSERT INTO clientes
			(nome, empresa, email, telefone, status, responsavel, ultimo_contato)
			VALUES (?, ?, ?, ?, ?, ?, ?)
		`,
			nomes[i],
			empresas[i],
			email,
			telefone,
			status,
			responsaveis[i%len(responsaveis)],
			ultimoContato,
		)

		if err != nil {
			return fmt.Errorf("erro ao inserir cliente %d: %w", i+1, err)
		}
	}

	etapas := []string{
		"Prospecção",
		"Qualificação",
		"Proposta",
		"Negociação",
		"Fechada",
	}

	for i := 0; i < 30; i++ {
		clienteID := (i % 20) + 1
		titulo := fmt.Sprintf("Oportunidade comercial %02d", i+1)
		etapa := etapas[i%len(etapas)]
		valor := 2500.0 + float64(i*725)
		dataCriacao := agora.AddDate(0, 0, -i*2).
			Format("2006-01-02")

		_, err := tx.Exec(`
			INSERT INTO oportunidades
			(cliente_id, titulo, etapa_funil, valor, data_criacao)
			VALUES (?, ?, ?, ?, ?)
		`,
			clienteID,
			titulo,
			etapa,
			valor,
			dataCriacao,
		)

		if err != nil {
			return fmt.Errorf("erro ao inserir oportunidade %d: %w", i+1, err)
		}
	}

	produtos := []string{
		"Consultoria", "Gestão de Serviços", "Suporte Técnico",
		"Projeto Especial", "Manutenção",
	}

	for i := 0; i < 25; i++ {
		clienteID := (i % 20) + 1
		valor := 1500.0 + float64(i*450)
		dia := 1 + (i % agora.Day())

		dataVenda := time.Date(
			agora.Year(),
			agora.Month(),
			dia,
			12, 0, 0, 0,
			agora.Location(),
		).Format("2006-01-02")

		produto := produtos[i%len(produtos)]

		_, err := tx.Exec(`
			INSERT INTO vendas
			(cliente_id, valor, data, produto)
			VALUES (?, ?, ?, ?)
		`,
			clienteID,
			valor,
			dataVenda,
			produto,
		)

		if err != nil {
			return fmt.Errorf("erro ao inserir venda %d: %w", i+1, err)
		}
	}

	if err := tx.Commit(); err != nil {
		return err
	}

	fmt.Println("Seed executado com sucesso!")
	fmt.Println("20 clientes, 30 oportunidades e 25 vendas inseridos.")

	return nil
}

// criarAdminInicial cria o primeiro administrador do sistema.
func criarAdminInicial(db *sql.DB) error {
	var totalAdmins int
	err := db.QueryRow(
		"SELECT COUNT(*) FROM usuarios WHERE papel = ?",
		PapelAdmin,
	).Scan(&totalAdmins)
	if err != nil {
		return fmt.Errorf("erro ao verificar administrador inicial: %w", err)
	}
	if totalAdmins > 0 {
		fmt.Println("Administrador inicial já existe. Criação ignorada.")
		return nil
	}

	email := normalizarEmail(os.Getenv("ADMIN_EMAIL"))
	senha := os.Getenv("ADMIN_PASSWORD")
	if err := validarEmail(email); err != nil {
		return fmt.Errorf("ADMIN_EMAIL inválido: %w", err)
	}
	if err := validarSenha(senha); err != nil {
		return fmt.Errorf("ADMIN_PASSWORD inválida: %w", err)
	}

	duplicado, err := emailJaCadastrado(db, email, 0)
	if err != nil {
		return err
	}
	if duplicado {
		return fmt.Errorf("não foi possível criar o administrador: o e-mail informado já pertence a outro usuário")
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(senha), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("erro ao gerar hash da senha do administrador: %w", err)
	}

	_, err = db.Exec(
		`INSERT INTO usuarios (nome, email, senha_hash, papel)
		 VALUES (?, ?, ?, ?)`,
		"Administrador",
		email,
		string(hash),
		PapelAdmin,
	)
	if err != nil {
		return fmt.Errorf("erro ao criar administrador inicial: %w", err)
	}

	fmt.Println("Administrador inicial criado com sucesso.")
	return nil
}
