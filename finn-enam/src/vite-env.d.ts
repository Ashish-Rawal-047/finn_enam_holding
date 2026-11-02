/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Optional absolute API base when the frontend is hosted separately (default: same-origin /api). */
  readonly VITE_API_BASE_URL?: string;
  /** "true" pre-fills the public reviewer demo credentials on the login page. */
  readonly VITE_DEMO_LOGIN_ENABLED?: string;
  readonly VITE_DEMO_EMAIL?: string;
  readonly VITE_DEMO_PASSWORD?: string;
}
