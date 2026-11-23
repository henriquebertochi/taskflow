-- Sprint 2: grupos de trabalho, integrantes e tarefas (RF05 a RF08).

CREATE TABLE groups (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(60) NOT NULL,
  description TEXT,
  -- Código do link de convite (RF06). Gerar um novo invalida o anterior.
  invite_code TEXT NOT NULL UNIQUE,
  created_by  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE group_members (
  group_id  INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role      TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('creator', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);
CREATE INDEX group_members_user_id_idx ON group_members(user_id);

CREATE TABLE tasks (
  id          SERIAL PRIMARY KEY,
  group_id    INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  title       VARCHAR(120) NOT NULL,
  description TEXT,
  -- Sem responsável (NULL) até alguém assumir.
  assignee_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  due_date    DATE NOT NULL,
  status      TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done')),
  created_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX tasks_group_id_idx ON tasks(group_id);
