import { APIRequestContext } from '@playwright/test';
import { API_URL } from '../config';
import { Usuario } from '../factories';

export class UsuariosClient {
  private idsCriados: string[] = [];

  constructor(private request: APIRequestContext) {}

  async cadastrar(usuario: Usuario) {
    const response = await this.request.post(`${API_URL}/usuarios`, { data: usuario });
    if (response.status() === 201) {
      this.idsCriados.push((await response.json())._id);
    }
    return response;
  }

  listar(filtros: Record<string, string> = {}) {
    return this.request.get(`${API_URL}/usuarios`, { params: filtros });
  }

  buscar(id: string) {
    return this.request.get(`${API_URL}/usuarios/${id}`);
  }

  editar(id: string, usuario: Usuario) {
    return this.request.put(`${API_URL}/usuarios/${id}`, { data: usuario });
  }

  excluir(id: string) {
    return this.request.delete(`${API_URL}/usuarios/${id}`);
  }

  async limparCriados() {
    for (const id of this.idsCriados) {
      await this.excluir(id);
    }
    this.idsCriados = [];
  }
}