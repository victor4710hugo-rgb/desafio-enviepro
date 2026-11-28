package main

import "time"

type Usuario struct {
	ID        int       `json:"id"`
	Nome      string    `json:"nome"`
	Email     string    `json:"email"`
	SenhaHash string    `json:"-"`
	Papel     string    `json:"papel"`
	CriadoEm  time.Time `json:"criado_em"`
}

type UsuarioResponse struct {
	ID       int       `json:"id"`
	Nome     string    `json:"nome"`
	Email    string    `json:"email"`
	Papel    string    `json:"papel"`
	CriadoEm time.Time `json:"criado_em"`
}
