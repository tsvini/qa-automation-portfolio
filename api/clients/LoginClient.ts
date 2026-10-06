import { APIRequestContext } from '@playwright/test';
import { API_URL } from '../config';

export class LoginClient {
  constructor(private request: APIRequestContext) {}

  login(email: string, password: string) {
    return this.request.post(`${API_URL}/login`, { data: { email, password } });
  }
}