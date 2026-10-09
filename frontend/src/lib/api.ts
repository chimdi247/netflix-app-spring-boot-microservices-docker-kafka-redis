import type { AuthResponse, Movie, MovieInput, StreamInfo, UploadResponse } from "./types";

const BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? "/api/v1";
const SESSION_KEY = "netflix.session";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

// ---- session storage -------------------------------------------------------------
export interface StoredSession extends AuthResponse {
  /** epoch ms */
  expiresAt: number;
}

export const sessionStore = {
  get(): StoredSession | null {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const s = JSON.parse(raw) as StoredSession;
      return s.expiresAt > Date.now() ? s : null;
    } catch {
      return null;
    }
  },
  set(auth: AuthResponse) {
    const s: StoredSession = { ...auth, expiresAt: Date.now() + auth.expiresIn * 1000 };
    localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    return s;
  },
  clear() {
    localStorage.removeItem(SESSION_KEY);
  },
  token: () => sessionStore.get()?.token ?? null,
};

let unauthorizedHandler: (() => void) | null = null;
export const onUnauthorized = (fn: () => void) => {
  unauthorizedHandler = fn;
};

interface RequestOptions {
  method?: "GET" | "POST" | "DELETE";
  body?: unknown;
  auth?: boolean;
}

async function request<T>(path: string, { method = "GET", body, auth = true }: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const token = sessionStore.token();
  if (auth && token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
  } catch {
    throw new ApiError("Can't reach the server. Check your connection and try again.", 0);
  }

  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!res.ok) {
    if (auth && res.status === 401) unauthorizedHandler?.();
    const fallback =
      res.status === 403 ? "You don't have permission to do that." : res.status === 401 ? "Please sign in again." : `Request failed (${res.status})`;
    throw new ApiError(String(data?.message ?? fallback), res.status);
  }
  return data as T;
}

// ---- auth --------------------------------------------------------------------------
export const login = (email: string, password: string) =>
  request<AuthResponse>("/auth/login", { method: "POST", body: { email, password }, auth: false });

export const register = (input: { fullName: string; email: string; password: string }) =>
  request<AuthResponse>("/auth/register", { method: "POST", body: input, auth: false });

// ---- catalog -------------------------------------------------------------------------
export const listMovies = () => request<Movie[]>("/movies");
export const getMovie = (id: string) => request<Movie>(`/movies/${id}`);
export const createMovie = (input: MovieInput) => request<Movie>("/movies", { method: "POST", body: input });
export const deleteMovie = (id: string) => request<void>(`/movies/${id}`, { method: "DELETE" });

// ---- streaming -------------------------------------------------------------------------
export const getStream = (movieId: string) => request<StreamInfo>(`/stream/${movieId}`);

// ---- upload (XMLHttpRequest: fetch cannot report upload progress) ------------------------
export function uploadVideo(movieId: string, file: File, onProgress: (fraction: number) => void): Promise<UploadResponse> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${BASE}/videos/upload/${movieId}`);
    const token = sessionStore.token();
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded / e.total);
    };
    xhr.onerror = () => reject(new ApiError("The upload was interrupted. Check your connection and try again.", 0));
    xhr.onload = () => {
      let data: any = null;
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        /* not JSON */
      }
      if (xhr.status >= 200 && xhr.status < 300) return resolve(data as UploadResponse);
      if (xhr.status === 401) unauthorizedHandler?.();
      const fallback = xhr.status === 413 ? "The file is too large (limit 2 GB)." : xhr.status === 403 ? "Only admins can upload videos." : `Upload failed (${xhr.status})`;
      reject(new ApiError(String(data?.message ?? fallback), xhr.status));
    };

    const form = new FormData();
    form.append("file", file);
    xhr.send(form);
  });
}
