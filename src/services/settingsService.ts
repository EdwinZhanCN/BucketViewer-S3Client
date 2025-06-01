import { invoke } from '@tauri-apps/api/core';
import { useState, useEffect, useCallback, useMemo } from 'react';
import type {
  AppSettings,
  GeneralSettings,
  ConnectionConfig,
  AppearanceSettings,
  LayoutSettings,
  PermissionsSettings,
  RustAppSettings,
  RustGeneralSettings,
  RustConnectionConfig,
  RustAppearanceSettings,
  RustLayoutSettings,
  RustPermissionsSettings,
} from '../types/settings';

// Conversion utilities between camelCase (Frontend) and snake_case (Rust)
export const convertFromRust = {
  general: (rust: RustGeneralSettings): GeneralSettings => ({
    autoRefresh: rust.auto_refresh,
    refreshInterval: rust.refresh_interval,
    defaultDownloadLocation: rust.default_download_location,
    confirmBeforeDelete: rust.confirm_before_delete,
    showFilePreview: rust.show_file_preview,
  }),

  connection: (rust: RustConnectionConfig): ConnectionConfig => ({
    name: rust.name,
    serviceType: rust.service_type,
    endpoint: rust.endpoint,
    accessKey: rust.access_key,
    secretKey: rust.secret_key,
    region: rust.region,
    isDefault: rust.is_default,
  }),

  appearance: (rust: RustAppearanceSettings): AppearanceSettings => ({
    theme: rust.theme,
    fontSize: rust.font_size,
    showHiddenFiles: rust.show_hidden_files,
    showFileExtensions: rust.show_file_extensions,
  }),

  layout: (rust: RustLayoutSettings): LayoutSettings => ({
    defaultView: rust.default_view,
    sortBy: rust.sort_by,
    sortDirection: rust.sort_direction,
  }),

  permissions: (rust: RustPermissionsSettings): PermissionsSettings => ({
    allowAnonymousUsageStats: rust.allow_anonymous_usage_stats,
    enableCaching: rust.enable_caching,
  }),

  settings: (rust: RustAppSettings): AppSettings => ({
    version: rust.version,
    general: convertFromRust.general(rust.general),
    connections: rust.connections.map(convertFromRust.connection),
    appearance: convertFromRust.appearance(rust.appearance),
    layout: convertFromRust.layout(rust.layout),
    permissions: convertFromRust.permissions(rust.permissions),
  }),
};

export const convertToRust = {
  general: (frontend: GeneralSettings): RustGeneralSettings => ({
    auto_refresh: frontend.autoRefresh,
    refresh_interval: frontend.refreshInterval,
    default_download_location: frontend.defaultDownloadLocation,
    confirm_before_delete: frontend.confirmBeforeDelete,
    show_file_preview: frontend.showFilePreview,
  }),

  connection: (frontend: ConnectionConfig): RustConnectionConfig => ({
    name: frontend.name,
    service_type: frontend.serviceType,
    endpoint: frontend.endpoint,
    access_key: frontend.accessKey,
    secret_key: frontend.secretKey,
    region: frontend.region,
    is_default: frontend.isDefault,
  }),

  appearance: (frontend: AppearanceSettings): RustAppearanceSettings => ({
    theme: frontend.theme,
    font_size: frontend.fontSize,
    show_hidden_files: frontend.showHiddenFiles,
    show_file_extensions: frontend.showFileExtensions,
  }),

  layout: (frontend: LayoutSettings): RustLayoutSettings => ({
    default_view: frontend.defaultView,
    sort_by: frontend.sortBy,
    sort_direction: frontend.sortDirection,
  }),

  permissions: (frontend: PermissionsSettings): RustPermissionsSettings => ({
    allow_anonymous_usage_stats: frontend.allowAnonymousUsageStats,
    enable_caching: frontend.enableCaching,
  }),

  settings: (frontend: AppSettings): RustAppSettings => ({
    version: frontend.version,
    general: convertToRust.general(frontend.general),
    connections: frontend.connections.map(convertToRust.connection),
    appearance: convertToRust.appearance(frontend.appearance),
    layout: convertToRust.layout(frontend.layout),
    permissions: convertToRust.permissions(frontend.permissions),
  }),
};

// Settings Service Class
export class SettingsService {
  private static instance: SettingsService;
  private initialized = false;
  private settings: AppSettings | null = null;
  private listeners: Set<(settings: AppSettings) => void> = new Set();

  static getInstance(): SettingsService {
    if (!SettingsService.instance) {
      SettingsService.instance = new SettingsService();
    }
    return SettingsService.instance;
  }

  async initialize(): Promise<AppSettings> {
    if (this.initialized && this.settings) {
      return this.settings;
    }

    try {
      const rustSettings = await invoke<RustAppSettings>('init_settings');
      this.settings = convertFromRust.settings(rustSettings);
      this.initialized = true;
      this.notifyListeners();
      return this.settings;
    } catch (error) {
      console.error('Failed to initialize settings:', error);
      throw error;
    }
  }

  async getSettings(): Promise<AppSettings> {
    if (!this.initialized) {
      return this.initialize();
    }

    try {
      const rustSettings = await invoke<RustAppSettings>('get_settings');
      this.settings = convertFromRust.settings(rustSettings);
      this.notifyListeners();
      return this.settings;
    } catch (error) {
      console.error('Failed to get settings:', error);
      throw error;
    }
  }

  async saveSettings(settings: AppSettings): Promise<AppSettings> {
    try {
      const rustSettings = convertToRust.settings(settings);
      const savedRustSettings = await invoke<RustAppSettings>('save_settings', {
        settings: rustSettings,
      });
      this.settings = convertFromRust.settings(savedRustSettings);
      this.notifyListeners();
      return this.settings;
    } catch (error) {
      console.error('Failed to save settings:', error);
      throw error;
    }
  }

  async updateGeneralSettings(general: GeneralSettings): Promise<AppSettings> {
    try {
      const rustGeneral = convertToRust.general(general);
      const rustSettings = await invoke<RustAppSettings>('update_general_settings', {
        general: rustGeneral,
      });
      this.settings = convertFromRust.settings(rustSettings);
      this.notifyListeners();
      return this.settings;
    } catch (error) {
      console.error('Failed to update general settings:', error);
      throw error;
    }
  }

  async updateAppearanceSettings(appearance: AppearanceSettings): Promise<AppSettings> {
    try {
      const rustAppearance = convertToRust.appearance(appearance);
      const rustSettings = await invoke<RustAppSettings>('update_appearance_settings', {
        appearance: rustAppearance,
      });
      this.settings = convertFromRust.settings(rustSettings);
      this.notifyListeners();
      return this.settings;
    } catch (error) {
      console.error('Failed to update appearance settings:', error);
      throw error;
    }
  }

  async updateLayoutSettings(layout: LayoutSettings): Promise<AppSettings> {
    try {
      const rustLayout = convertToRust.layout(layout);
      const rustSettings = await invoke<RustAppSettings>('update_layout_settings', {
        layout: rustLayout,
      });
      this.settings = convertFromRust.settings(rustSettings);
      this.notifyListeners();
      return this.settings;
    } catch (error) {
      console.error('Failed to update layout settings:', error);
      throw error;
    }
  }

  async updatePermissionsSettings(permissions: PermissionsSettings): Promise<AppSettings> {
    try {
      const rustPermissions = convertToRust.permissions(permissions);
      const rustSettings = await invoke<RustAppSettings>('update_permissions_settings', {
        permissions: rustPermissions,
      });
      this.settings = convertFromRust.settings(rustSettings);
      this.notifyListeners();
      return this.settings;
    } catch (error) {
      console.error('Failed to update permissions settings:', error);
      throw error;
    }
  }

  async addConnection(connection: ConnectionConfig): Promise<AppSettings> {
    try {
      const rustConnection = convertToRust.connection(connection);
      const rustSettings = await invoke<RustAppSettings>('add_connection', {
        connection: rustConnection,
      });
      this.settings = convertFromRust.settings(rustSettings);
      this.notifyListeners();
      return this.settings;
    } catch (error) {
      console.error('Failed to add connection:', error);
      throw error;
    }
  }

  async updateConnection(index: number, connection: ConnectionConfig): Promise<AppSettings> {
    try {
      const rustConnection = convertToRust.connection(connection);
      const rustSettings = await invoke<RustAppSettings>('update_connection', {
        index,
        connection: rustConnection,
      });
      this.settings = convertFromRust.settings(rustSettings);
      this.notifyListeners();
      return this.settings;
    } catch (error) {
      console.error('Failed to update connection:', error);
      throw error;
    }
  }

  async removeConnection(index: number): Promise<AppSettings> {
    try {
      const rustSettings = await invoke<RustAppSettings>('remove_connection', {
        index,
      });
      this.settings = convertFromRust.settings(rustSettings);
      this.notifyListeners();
      return this.settings;
    } catch (error) {
      console.error('Failed to remove connection:', error);
      throw error;
    }
  }

  async exportSettings(filePath: string): Promise<void> {
    try {
      await invoke('export_settings', { exportPath: filePath });
    } catch (error) {
      console.error('Failed to export settings:', error);
      throw error;
    }
  }

  async importSettings(filePath: string): Promise<AppSettings> {
    try {
      const rustSettings = await invoke<RustAppSettings>('import_settings', {
        importPath: filePath,
      });
      this.settings = convertFromRust.settings(rustSettings);
      this.notifyListeners();
      return this.settings;
    } catch (error) {
      console.error('Failed to import settings:', error);
      throw error;
    }
  }

  async resetSettings(): Promise<AppSettings> {
    try {
      const rustSettings = await invoke<RustAppSettings>('reset_settings');
      this.settings = convertFromRust.settings(rustSettings);
      this.notifyListeners();
      return this.settings;
    } catch (error) {
      console.error('Failed to reset settings:', error);
      throw error;
    }
  }

  async reloadSettings(): Promise<AppSettings> {
    try {
      const rustSettings = await invoke<RustAppSettings>('reload_settings');
      this.settings = convertFromRust.settings(rustSettings);
      this.notifyListeners();
      return this.settings;
    } catch (error) {
      console.error('Failed to reload settings:', error);
      throw error;
    }
  }

  subscribe(listener: (settings: AppSettings) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    if (this.settings) {
      this.listeners.forEach(listener => listener(this.settings!));
    }
  }

  getCurrentSettings(): AppSettings | null {
    return this.settings;
  }
}

// React Hook for Settings
export function useSettings() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const settingsService = useMemo(() => SettingsService.getInstance(), []);

  useEffect(() => {
    let mounted = true;

    const initializeSettings = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const initialSettings = await settingsService.initialize();
        if (mounted) {
          setSettings(initialSettings);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to load settings');
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initializeSettings();

    // Subscribe to settings changes
    const unsubscribe = settingsService.subscribe((updatedSettings) => {
      if (mounted) {
        setSettings(updatedSettings);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [settingsService]);

  const updateSettings = useCallback(async (newSettings: AppSettings) => {
    try {
      setError(null);
      await settingsService.saveSettings(newSettings);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
      throw err;
    }
  }, [settingsService]);

  const updateGeneralSettings = useCallback(async (general: GeneralSettings) => {
    try {
      setError(null);
      await settingsService.updateGeneralSettings(general);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update general settings');
      throw err;
    }
  }, [settingsService]);

  const updateAppearanceSettings = useCallback(async (appearance: AppearanceSettings) => {
    try {
      setError(null);
      await settingsService.updateAppearanceSettings(appearance);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update appearance settings');
      throw err;
    }
  }, [settingsService]);

  const updateLayoutSettings = useCallback(async (layout: LayoutSettings) => {
    try {
      setError(null);
      await settingsService.updateLayoutSettings(layout);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update layout settings');
      throw err;
    }
  }, [settingsService]);

  const updatePermissionsSettings = useCallback(async (permissions: PermissionsSettings) => {
    try {
      setError(null);
      await settingsService.updatePermissionsSettings(permissions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update permissions settings');
      throw err;
    }
  }, [settingsService]);

  const addConnection = useCallback(async (connection: ConnectionConfig) => {
    try {
      setError(null);
      await settingsService.addConnection(connection);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add connection');
      throw err;
    }
  }, [settingsService]);

  const updateConnection = useCallback(async (index: number, connection: ConnectionConfig) => {
    try {
      setError(null);
      await settingsService.updateConnection(index, connection);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update connection');
      throw err;
    }
  }, [settingsService]);

  const removeConnection = useCallback(async (index: number) => {
    try {
      setError(null);
      await settingsService.removeConnection(index);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove connection');
      throw err;
    }
  }, [settingsService]);

  const exportSettings = useCallback(async (filePath: string) => {
    try {
      setError(null);
      await settingsService.exportSettings(filePath);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export settings');
      throw err;
    }
  }, [settingsService]);

  const importSettings = useCallback(async (filePath: string) => {
    try {
      setError(null);
      await settingsService.importSettings(filePath);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import settings');
      throw err;
    }
  }, [settingsService]);

  const resetSettings = useCallback(async () => {
    try {
      setError(null);
      await settingsService.resetSettings();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset settings');
      throw err;
    }
  }, [settingsService]);

  const refreshSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      await settingsService.reloadSettings();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh settings');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [settingsService]);

  // Legacy method for backward compatibility
  const downloadSettingsFile = useCallback(async () => {
    console.warn('downloadSettingsFile is deprecated. Settings are now managed by Tauri backend.');
  }, []);

  return {
    settings,
    isLoading,
    error,
    updateSettings,
    updateGeneralSettings,
    updateAppearanceSettings,
    updateLayoutSettings,
    updatePermissionsSettings,
    addConnection,
    updateConnection,
    removeConnection,
    exportSettings,
    importSettings,
    resetSettings,
    refreshSettings,
    downloadSettingsFile, // Deprecated but kept for compatibility
  };
}

// Export types for backward compatibility
export type { ConnectionConfig, AppSettings, GeneralSettings, AppearanceSettings, LayoutSettings, PermissionsSettings };