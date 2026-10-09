// src/types/index.ts
// Definiciones de tipos TypeScript para toda la aplicación

export type UserRole = 'admin' | 'supervisor' | 'reponedor' | 'vendedor' | 'cobrador' | 'repartidor';

export type VisitStatus = 'en_ruta' | 'visitado' | 'fallido';

export type EvidenceType = 'foto' | 'firma_digital';

export interface User {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  phone: string | null;
  is_active: boolean;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserPerformance {
  total_visited: number;
  total_failed: number;
  total_in_route: number;
  total_visits: number;
  success_rate: number | null;
  avg_visit_duration_minutes: number | null;
  worked_days?: number;
  avg_visited_per_day?: number;
  avg_failed_per_day?: number;
  avg_tasks_per_day?: number;
  avg_distance_per_day?: number;
  avg_downtime_minutes?: number;
}

export interface Client {
  id: string;
  business_name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  lat: number;
  lng: number;
  geofence_radius: number;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  // Agregados en getClientById
  total_visits?: number;
  total_visits_success?: number;
  total_visits_failed?: number;
  // Mobile enrichment
  last_visit_status?: VisitStatus;
  last_visit_at?: string;
}

export interface Visit {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  user_role: UserRole;
  client_id: string;
  client_name: string;
  client_contact?: string;
  client_address: string;
  client_lat: number | null;
  client_lng: number | null;
  client_geofence_radius: number;
  status: VisitStatus;
  visit_lat: number | null;
  visit_lng: number | null;
  distance_to_client: number | null;
  notes: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  evidences?: Evidence[];
}

export interface Evidence {
  id: string;
  visit_id: string;
  type: EvidenceType;
  file_url: string;
  file_name: string | null;
  file_size: number | null;
  mime_type: string | null;
  lat: number | null;
  lng: number | null;
  captured_at: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface DashboardStats {
  visits_today: number;
  visited_today: number;
  failed_today: number;
  currently_in_route: number;
  active_users_today: number;
}

export interface LiveMapUser {
  user_id: string;
  lat: number;
  lng: number;
  status: VisitStatus;
  last_activity: string;
  full_name: string;
  role: UserRole;
  client_name: string;
  client_lat: number | null;
  client_lng: number | null;
}

export interface CrossDataRow {
  client_id: string;
  client_name: string;
  address: string;
  sellers: string[] | null;
  replenishers: string[] | null;
  total_visits: number;
  total_failed: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  message: string;
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  timestamp: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: Omit<User, 'password_hash'>;
}
