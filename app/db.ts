import { DatabaseSync } from 'node:sqlite';

export const db = new DatabaseSync(process.env.DB_FILE || ':memory:');

db.exec(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS clientes (
    id INTEGER PRIMARY KEY,
    nome TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    cpf TEXT NOT NULL UNIQUE,
    senha_hash TEXT NOT NULL,
    saldo INTEGER NOT NULL CHECK (saldo >= 0)
  );
  CREATE TABLE IF NOT EXISTS pix (
    id TEXT PRIMARY KEY,
    origem INTEGER NOT NULL REFERENCES clientes(id),
    destino INTEGER NOT NULL REFERENCES clientes(id),
    valor INTEGER NOT NULL,
    descricao TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL,
    criado_em TEXT NOT NULL,
    idem_chave TEXT,
    idem_hash TEXT,
    saldo_apos INTEGER
  );
  CREATE UNIQUE INDEX IF NOT EXISTS pix_idem ON pix(origem, idem_chave);
`);
