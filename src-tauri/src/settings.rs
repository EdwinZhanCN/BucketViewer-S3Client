use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::Manager;
use tokio::fs;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GeneralSettings {
    pub auto_refresh: bool,
    pub refresh_interval: u32,
    pub default_download_location: String,
    pub confirm_before_delete: bool,
    pub show_file_preview: bool,
}

impl Default for GeneralSettings {
    fn default() -> Self {
        Self {
            auto_refresh: true,
            refresh_interval: 30,
            default_download_location: String::new(),
            confirm_before_delete: true,
            show_file_preview: true,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectionConfig {
    pub name: String,
    pub service_type: String,
    pub endpoint: String,
    pub access_key: String,
    pub secret_key: String,
    pub region: String,
    pub is_default: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppearanceSettings {
    pub theme: String,
    pub font_size: f32,
    pub show_hidden_files: bool,
    pub show_file_extensions: bool,
}

impl Default for AppearanceSettings {
    fn default() -> Self {
        Self {
            theme: "system".to_string(),
            font_size: 1.0,
            show_hidden_files: false,
            show_file_extensions: true,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LayoutSettings {
    pub default_view: String,
    pub sort_by: String,
    pub sort_direction: String,
}

impl Default for LayoutSettings {
    fn default() -> Self {
        Self {
            default_view: "list".to_string(),
            sort_by: "name".to_string(),
            sort_direction: "asc".to_string(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PermissionsSettings {
    pub allow_anonymous_usage_stats: bool,
    pub enable_caching: bool,
}

impl Default for PermissionsSettings {
    fn default() -> Self {
        Self {
            allow_anonymous_usage_stats: false,
            enable_caching: true,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSettings {
    pub version: String,
    pub general: GeneralSettings,
    pub connections: Vec<ConnectionConfig>,
    pub appearance: AppearanceSettings,
    pub layout: LayoutSettings,
    pub permissions: PermissionsSettings,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            version: "1.0.0".to_string(),
            general: GeneralSettings::default(),
            connections: vec![],
            appearance: AppearanceSettings::default(),
            layout: LayoutSettings::default(),
            permissions: PermissionsSettings::default(),
        }
    }
}

pub struct SettingsManager {
    settings_path: PathBuf,
    current_settings: AppSettings,
}

impl SettingsManager {
    pub fn new(app_handle: &tauri::AppHandle) -> Result<Self, Box<dyn std::error::Error>> {
        let app_data_dir = app_handle
            .path()
            .app_data_dir()
            .map_err(|e| format!("Failed to get app data directory: {}", e))?;
        
        let settings_path = app_data_dir.join("settings.json");
        
        // Ensure the directory exists
        if let Some(parent) = settings_path.parent() {
            std::fs::create_dir_all(parent)?;
        }

        Ok(Self {
            settings_path,
            current_settings: AppSettings::default(),
        })
    }

    pub async fn load_settings(&mut self) -> Result<AppSettings, Box<dyn std::error::Error>> {
        if self.settings_path.exists() {
            let content = fs::read_to_string(&self.settings_path).await?;
            match serde_json::from_str::<AppSettings>(&content) {
                Ok(settings) => {
                    self.current_settings = settings.clone();
                    Ok(settings)
                }
                Err(e) => {
                    eprintln!("Failed to parse settings file: {}", e);
                    // Return default settings if parsing fails
                    self.current_settings = AppSettings::default();
                    self.save_settings().await?;
                    Ok(self.current_settings.clone())
                }
            }
        } else {
            // Create default settings file
            self.current_settings = AppSettings::default();
            self.save_settings().await?;
            Ok(self.current_settings.clone())
        }
    }

    pub async fn save_settings(&self) -> Result<(), Box<dyn std::error::Error>> {
        let content = serde_json::to_string_pretty(&self.current_settings)?;
        fs::write(&self.settings_path, content).await?;
        Ok(())
    }

    pub async fn update_settings(&mut self, settings: AppSettings) -> Result<AppSettings, Box<dyn std::error::Error>> {
        self.current_settings = settings;
        self.save_settings().await?;
        Ok(self.current_settings.clone())
    }

    pub fn get_current_settings(&self) -> AppSettings {
        self.current_settings.clone()
    }

    pub async fn export_settings(&self, export_path: PathBuf) -> Result<(), Box<dyn std::error::Error>> {
        let content = serde_json::to_string_pretty(&self.current_settings)?;
        fs::write(export_path, content).await?;
        Ok(())
    }

    pub async fn import_settings(&mut self, import_path: PathBuf) -> Result<AppSettings, Box<dyn std::error::Error>> {
        let content = fs::read_to_string(import_path).await?;
        let imported_settings: AppSettings = serde_json::from_str(&content)?;
        self.current_settings = imported_settings;
        self.save_settings().await?;
        Ok(self.current_settings.clone())
    }

    pub async fn reset_to_defaults(&mut self) -> Result<AppSettings, Box<dyn std::error::Error>> {
        self.current_settings = AppSettings::default();
        self.save_settings().await?;
        Ok(self.current_settings.clone())
    }

    pub async fn update_general_settings(&mut self, general: GeneralSettings) -> Result<AppSettings, Box<dyn std::error::Error>> {
        self.current_settings.general = general;
        self.save_settings().await?;
        Ok(self.current_settings.clone())
    }

    pub async fn update_appearance_settings(&mut self, appearance: AppearanceSettings) -> Result<AppSettings, Box<dyn std::error::Error>> {
        self.current_settings.appearance = appearance;
        self.save_settings().await?;
        Ok(self.current_settings.clone())
    }

    pub async fn update_layout_settings(&mut self, layout: LayoutSettings) -> Result<AppSettings, Box<dyn std::error::Error>> {
        self.current_settings.layout = layout;
        self.save_settings().await?;
        Ok(self.current_settings.clone())
    }

    pub async fn update_permissions_settings(&mut self, permissions: PermissionsSettings) -> Result<AppSettings, Box<dyn std::error::Error>> {
        self.current_settings.permissions = permissions;
        self.save_settings().await?;
        Ok(self.current_settings.clone())
    }

    pub async fn add_connection(&mut self, connection: ConnectionConfig) -> Result<AppSettings, Box<dyn std::error::Error>> {
        // If this is set as default, unset other defaults
        if connection.is_default {
            for conn in &mut self.current_settings.connections {
                conn.is_default = false;
            }
        }
        
        self.current_settings.connections.push(connection);
        self.save_settings().await?;
        Ok(self.current_settings.clone())
    }

    pub async fn update_connection(&mut self, index: usize, connection: ConnectionConfig) -> Result<AppSettings, Box<dyn std::error::Error>> {
        if index >= self.current_settings.connections.len() {
            return Err("Connection index out of bounds".into());
        }

        // If this is set as default, unset other defaults
        if connection.is_default {
            for (i, conn) in self.current_settings.connections.iter_mut().enumerate() {
                if i != index {
                    conn.is_default = false;
                }
            }
        }

        self.current_settings.connections[index] = connection;
        self.save_settings().await?;
        Ok(self.current_settings.clone())
    }

    pub async fn remove_connection(&mut self, index: usize) -> Result<AppSettings, Box<dyn std::error::Error>> {
        if index >= self.current_settings.connections.len() {
            return Err("Connection index out of bounds".into());
        }

        self.current_settings.connections.remove(index);
        self.save_settings().await?;
        Ok(self.current_settings.clone())
    }
}