export interface GeneralSettings {
  autoRefresh: boolean;
  refreshInterval: number;
  defaultDownloadLocation: string;
  confirmBeforeDelete: boolean;
  showFilePreview: boolean;
}

export interface ConnectionConfig {
  name: string;
  serviceType: string;
  endpoint: string;
  accessKey: string;
  secretKey: string;
  region: string;
  isDefault: boolean;
}

export interface AppearanceSettings {
  theme: string;
  fontSize: number;
  showHiddenFiles: boolean;
  showFileExtensions: boolean;
}

export interface LayoutSettings {
  defaultView: string;
  sortBy: string;
  sortDirection: string;
}

export interface PermissionsSettings {
  allowAnonymousUsageStats: boolean;
  enableCaching: boolean;
}

export interface AppSettings {
  version: string;
  general: GeneralSettings;
  connections: ConnectionConfig[];
  appearance: AppearanceSettings;
  layout: LayoutSettings;
  permissions: PermissionsSettings;
}

// Rust backend types (with snake_case matching Rust serialization)
export interface RustGeneralSettings {
  auto_refresh: boolean;
  refresh_interval: number;
  default_download_location: string;
  confirm_before_delete: boolean;
  show_file_preview: boolean;
}

export interface RustConnectionConfig {
  name: string;
  service_type: string;
  endpoint: string;
  access_key: string;
  secret_key: string;
  region: string;
  is_default: boolean;
}

export interface RustAppearanceSettings {
  theme: string;
  font_size: number;
  show_hidden_files: boolean;
  show_file_extensions: boolean;
}

export interface RustLayoutSettings {
  default_view: string;
  sort_by: string;
  sort_direction: string;
}

export interface RustPermissionsSettings {
  allow_anonymous_usage_stats: boolean;
  enable_caching: boolean;
}

export interface RustAppSettings {
  version: string;
  general: RustGeneralSettings;
  connections: RustConnectionConfig[];
  appearance: RustAppearanceSettings;
  layout: RustLayoutSettings;
  permissions: RustPermissionsSettings;
}