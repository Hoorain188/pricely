import { User } from '../context/AuthContext';

export interface AuthResponse {
  user: User;
  token: string;
}

export const login = async ({ email }: { email: string; password?: string }): Promise<AuthResponse> => {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 800));
  return {
    user: {
      id: '1',
      name: 'User',
      email,
      role: 'user',
    },
    token: 'mock-jwt-token',
  };
};

export const signup = async ({ name, email }: { name: string; email: string; password?: string }): Promise<AuthResponse> => {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 800));
  return {
    user: {
      id: '1',
      name,
      email,
      role: 'user',
    },
    token: 'mock-jwt-token',
  };
};

export const logout = async (): Promise<void> => {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 500));
};
