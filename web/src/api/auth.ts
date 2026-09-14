import { apiGet, apiSend, clearAccessToken, setAccessToken } from './client';

export interface CurrentUser {
  id: number;
  username: string;
  displayName: string;
}

interface LoginResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  user: CurrentUser;
}

export async function login(username: string, password: string): Promise<CurrentUser> {
  const response = await apiSend<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  setAccessToken(response.accessToken);
  return response.user;
}

export function getCurrentUser(): Promise<CurrentUser> {
  return apiGet<CurrentUser>('/auth/me');
}

export function logout(): void {
  clearAccessToken();
  location.assign('/login');
}
