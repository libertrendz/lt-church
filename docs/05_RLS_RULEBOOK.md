# LTZ-CHURCH — RLS RULEBOOK

Este documento define as regras obrigatórias de Row Level Security.

---

# PRINCÍPIO BASE

Toda tabela de negócio deve conter:

igreja_id UUID NOT NULL

O utilizador possui:

usuarios.igreja_id

RLS deve sempre comparar:

table.igreja_id = current_user_igreja_id

---

# TABELAS COM RLS

- congregacoes
- membros
- departamentos
- atividades
- escalas
- escala_itens
- agenda_eventos
- permanecer_documentos
- permanecer_aceites

---

# REGRA SELECT BASE

Permitir SELECT quando:

table.igreja_id = (
  select igreja_id
  from usuarios
  where id = auth.uid()
)

---

# REGRA INSERT BASE

Permitir INSERT quando:

novo_registro.igreja_id = igreja do utilizador

---

# REGRA UPDATE BASE

Permitir UPDATE quando:

table.igreja_id = igreja do utilizador

---

# ADMIN OVERRIDE

Admin pode:

- Ver todos os dados da igreja
- Criar departamentos
- Criar escalas
- Gerir membros

Nunca pode aceder dados de outra igreja.

---

# PROIBIDO

- Policies recursivas
- Políticas globais sem igreja_id
- Dados sem igreja_id
- Papéis por departamento
