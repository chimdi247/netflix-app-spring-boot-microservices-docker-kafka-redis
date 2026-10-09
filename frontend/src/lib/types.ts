export type Role = "ADMIN" | "USER";

export interface SessionUser {
  id: number;
  email: string;
  fullName: string;
  role: Role;
}

export interface AuthResponse {
  token: string;
  tokenType: string;
  /** seconds */
  expiresIn: number;
  user: SessionUser;
}

export type Genre =
  | "ACTION"
  | "COMEDY"
  | "DRAMA"
  | "HORROR"
  | "THRILLER"
  | "ROMANCE"
  | "DOCUMENTARY"
  | "ANIMATION"
  | "SCI_FI";

export const GENRES: { value: Genre; label: string }[] = [
  { value: "ACTION", label: "Action" },
  { value: "COMEDY", label: "Comedy" },
  { value: "DRAMA", label: "Drama" },
  { value: "HORROR", label: "Horror" },
  { value: "THRILLER", label: "Thriller" },
  { value: "ROMANCE", label: "Romance" },
  { value: "DOCUMENTARY", label: "Documentary" },
  { value: "ANIMATION", label: "Animation" },
  { value: "SCI_FI", label: "Sci-Fi" },
];

export const genreLabel = (g: Genre | null | undefined) => GENRES.find((x) => x.value === g)?.label ?? "Other";

export type VideoStatus = "PENDING" | "UPLOADED" | "ENCODING" | "ENCODED" | "READY" | "FAILED";

export interface Movie {
  id: string;
  title: string;
  description: string | null;
  genre: Genre | null;
  director: string | null;
  cast: string | null;
  releaseYear: number;
  rating: number;
  thumbnailUrl: string | null;
  durationMinutes: number;
  videoKey: string | null;
  videoStatus: VideoStatus | null;
  hlsUrl: string | null;
  createdAt: string | null;
}

export interface MovieInput {
  title: string;
  description?: string;
  genre: Genre;
  director?: string;
  cast?: string;
  releaseYear: number;
  rating: number;
  durationMinutes: number;
  thumbnailUrl?: string;
}

export interface StreamInfo {
  movieId: string;
  /** pre-signed URL of the HLS master playlist */
  streamingUrl: string;
  quality: string;
  expiresInMinutes: number;
}

export interface UploadResponse {
  movieId: string;
  videoKey: string;
  fileName: string;
  sizeBytes: number;
  message: string;
}

export const isProcessing = (s: VideoStatus | null | undefined) => s === "UPLOADED" || s === "ENCODING" || s === "ENCODED";
export const isReady = (m: Movie) => m.videoStatus === "READY";
