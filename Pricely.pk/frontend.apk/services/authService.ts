import { API_BASE_URL } from '../config/api';
import { User } from '../context/AuthContext';

// ── Shapes returned by the API ──────────────────────────────────────────

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

/** Returned when there's no token yet — signup sent a code, or approval is pending. */
export interface AuthStatusResponse {
  status:
    | 'verification_sent'
    | 'pending_approval'
    | 'reset_code_sent'
    | 'code_valid'
    | 'password_reset';
  message: string;
}

export interface SessionInfo {
  id: number;
  deviceName: string | null;
  ipAddress: string | null;
  lastActiveAt: string;
  createdAt: string;
  isCurrentDevice: boolean;
}

export type Portal = 'user' | 'admin';

/**
 * An error the server deliberately returned. `code` is the stable value to
 * branch on (e.g. 'pending_approval' → show the waiting screen); `message`
 * is already written for a person and can be displayed as-is.
 */
export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ── Transport ───────────────────────────────────────────────────────────

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers ?? {}),
      },
    });
  } catch {
    // fetch only rejects when the request never reached the server at all —
    // usually the API isn't running, or the phone is on a different network.
    throw new ApiError(
      'network_error',
      "Can't reach the server. Check it's running and that you're on the same WiFi.",
      0,
    );
  }

  if (response.status === 204) return undefined as T;

  const raw = await response.text();
  const body = raw ? safeParse(raw) : null;

  if (!response.ok) {
    throw new ApiError(
      body?.code ?? 'server_error',
      body?.message ?? 'Something went wrong. Please try again.',
      response.status,
    );
  }

  return body as T;
}

function safeParse(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function authed(token: string): RequestInit {
  return { headers: { Authorization: `Bearer ${token}` } };
}

// ── Signup / verification ───────────────────────────────────────────────

export const signup = (params: {
  name: string;
  email: string;
  password: string;
  portal: Portal;
}) =>
  request<AuthStatusResponse>('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify(params),
  });

/**
 * Shoppers come back with tokens and are logged in. Back-office signups come
 * back with status 'pending_approval' and no tokens — check for accessToken
 * rather than assuming.
 */
export const verifySignup = (params: { email: string; code: string; deviceName?: string }) =>
  request<AuthResponse | AuthStatusResponse>('/api/auth/verify-signup', {
    method: 'POST',
    body: JSON.stringify(params),
  });

// ── Login / logout ──────────────────────────────────────────────────────

export const login = (params: {
  email: string;
  password: string;
  portal: Portal;
  deviceName?: string;
}) =>
  request<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(params),
  });

export const logout = (refreshToken: string) =>
  request<void>('/api/auth/logout', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  });

export const refresh = (refreshToken: string) =>
  request<AuthResponse>('/api/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  });

// ── Password reset ──────────────────────────────────────────────────────

export const forgotPassword = (email: string) =>
  request<AuthStatusResponse>('/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });

/** Reissues a code for the verify screen's "Resend" button. */
export const resendCode = (params: { email: string; purpose: 'Signup' | 'PasswordReset' }) =>
  request<AuthStatusResponse>('/api/auth/resend-code', {
    method: 'POST',
    body: JSON.stringify(params),
  });

/** Checks the code without spending it, so the app can move to the new-password screen. */
export const verifyResetCode = (params: { email: string; code: string }) =>
  request<AuthStatusResponse>('/api/auth/verify-reset-code', {
    method: 'POST',
    body: JSON.stringify(params),
  });

export const resetPassword = (params: { email: string; code: string; newPassword: string }) =>
  request<AuthStatusResponse>('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify(params),
  });

// ── Invites ─────────────────────────────────────────────────────────────

export const acceptInvite = (params: { token: string; name: string; password: string }) =>
  request<AuthResponse>('/api/auth/accept-invite', {
    method: 'POST',
    body: JSON.stringify(params),
  });

// ── Session management (needs a token) ──────────────────────────────────

export const getSessions = (token: string, currentRefreshToken?: string) => {
  const query = currentRefreshToken
    ? `?currentRefreshToken=${encodeURIComponent(currentRefreshToken)}`
    : '';
  return request<SessionInfo[]>(`/api/auth/sessions${query}`, authed(token));
};

export const revokeSession = (token: string, sessionId: number) =>
  request<void>(`/api/auth/sessions/${sessionId}`, { method: 'DELETE', ...authed(token) });

export const me = (token: string) => request<User>('/api/auth/me', authed(token));

/** Narrows the verify-signup result, which is one shape or the other. */
export function isAuthResponse(r: AuthResponse | AuthStatusResponse): r is AuthResponse {
  return (r as AuthResponse).accessToken !== undefined;
}
