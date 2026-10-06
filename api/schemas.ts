import { z } from 'zod';

export const usuarioSchema = z.object({
  nome: z.string(),
  email: z.string().email(),
  password: z.string(),
  administrador: z.enum(['true', 'false']),
  _id: z.string(),
});

export const listaUsuariosSchema = z.object({
  quantidade: z.number().int().nonnegative(),
  usuarios: z.array(usuarioSchema),
});

export const cadastroSchema = z.object({
  message: z.literal('Cadastro realizado com sucesso'),
  _id: z.string().min(1),
});

export const loginSchema = z.object({
  message: z.literal('Login realizado com sucesso'),
  authorization: z.string().startsWith('Bearer '),
});

export const contratos: Record<string, z.ZodTypeAny> = {
  'cadastro': cadastroSchema,
  'usuário': usuarioSchema,
  'lista de usuários': listaUsuariosSchema,
  'login': loginSchema,
};