import { fakerPT_BR as faker } from '@faker-js/faker';

export type Usuario = {
  nome: string;
  email: string;
  password: string;
  administrador: 'true' | 'false';
};

export function criarUsuario(sobrescrever: Record<string, string> = {}): Usuario {
  return {
    nome: faker.person.fullName(),
    email: `qa.${faker.string.alphanumeric(12).toLowerCase()}@qaportfolio.com`,
    password: faker.internet.password({ length: 12 }),
    administrador: 'true',
    ...sobrescrever,
  } as Usuario;
}