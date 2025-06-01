use crate::settings::{SettingsManager, AppSettings, GeneralSettings, AppearanceSettings, LayoutSettings, PermissionsSettings, ConnectionConfig};
use std::path::PathBuf;
use tokio::sync::Mutex;
use tauri::{AppHandle, State};

pub type SettingsState = Mutex<Option<SettingsManager>>;

#[tauri::command]
pub async fn init_settings(
    app_handle: AppHandle,
    settings_state: State<'_, SettingsState>,
) -> Result<AppSettings, String> {
    let mut settings_manager = SettingsManager::new(&app_handle)
        .map_err(|e| format!("Failed to initialize settings manager: {}", e))?;
    
    let settings = settings_manager.load_settings().await
        .map_err(|e| format!("Failed to load settings: {}", e))?;
    
    *settings_state.lock().await = Some(settings_manager);
    
    Ok(settings)
}

#[tauri::command]
pub async fn get_settings(
    settings_state: State<'_, SettingsState>,
) -> Result<AppSettings, String> {
    let settings_guard = settings_state.lock().await;
    match settings_guard.as_ref() {
        Some(manager) => Ok(manager.get_current_settings()),
        None => Err("Settings manager not initialized".to_string()),
    }
}

#[tauri::command]
pub async fn save_settings(
    settings: AppSettings,
    settings_state: State<'_, SettingsState>,
) -> Result<AppSettings, String> {
    let mut settings_guard = settings_state.lock().await;
    match settings_guard.as_mut() {
        Some(manager) => {
            manager.update_settings(settings).await
                .map_err(|e| format!("Failed to save settings: {}", e))
        }
        None => Err("Settings manager not initialized".to_string()),
    }
}

#[tauri::command]
pub async fn update_general_settings(
    general: GeneralSettings,
    settings_state: State<'_, SettingsState>,
) -> Result<AppSettings, String> {
    let mut settings_guard = settings_state.lock().await;
    match settings_guard.as_mut() {
        Some(manager) => {
            manager.update_general_settings(general).await
                .map_err(|e| format!("Failed to update general settings: {}", e))
        }
        None => Err("Settings manager not initialized".to_string()),
    }
}

#[tauri::command]
pub async fn update_appearance_settings(
    appearance: AppearanceSettings,
    settings_state: State<'_, SettingsState>,
) -> Result<AppSettings, String> {
    let mut settings_guard = settings_state.lock().await;
    match settings_guard.as_mut() {
        Some(manager) => {
            manager.update_appearance_settings(appearance).await
                .map_err(|e| format!("Failed to update appearance settings: {}", e))
        }
        None => Err("Settings manager not initialized".to_string()),
    }
}

#[tauri::command]
pub async fn update_layout_settings(
    layout: LayoutSettings,
    settings_state: State<'_, SettingsState>,
) -> Result<AppSettings, String> {
    let mut settings_guard = settings_state.lock().await;
    match settings_guard.as_mut() {
        Some(manager) => {
            manager.update_layout_settings(layout).await
                .map_err(|e| format!("Failed to update layout settings: {}", e))
        }
        None => Err("Settings manager not initialized".to_string()),
    }
}

#[tauri::command]
pub async fn update_permissions_settings(
    permissions: PermissionsSettings,
    settings_state: State<'_, SettingsState>,
) -> Result<AppSettings, String> {
    let mut settings_guard = settings_state.lock().await;
    match settings_guard.as_mut() {
        Some(manager) => {
            manager.update_permissions_settings(permissions).await
                .map_err(|e| format!("Failed to update permissions settings: {}", e))
        }
        None => Err("Settings manager not initialized".to_string()),
    }
}

#[tauri::command]
pub async fn add_connection(
    connection: ConnectionConfig,
    settings_state: State<'_, SettingsState>,
) -> Result<AppSettings, String> {
    let mut settings_guard = settings_state.lock().await;
    match settings_guard.as_mut() {
        Some(manager) => {
            manager.add_connection(connection).await
                .map_err(|e| format!("Failed to add connection: {}", e))
        }
        None => Err("Settings manager not initialized".to_string()),
    }
}

#[tauri::command]
pub async fn update_connection(
    index: usize,
    connection: ConnectionConfig,
    settings_state: State<'_, SettingsState>,
) -> Result<AppSettings, String> {
    let mut settings_guard = settings_state.lock().await;
    match settings_guard.as_mut() {
        Some(manager) => {
            manager.update_connection(index, connection).await
                .map_err(|e| format!("Failed to update connection: {}", e))
        }
        None => Err("Settings manager not initialized".to_string()),
    }
}

#[tauri::command]
pub async fn remove_connection(
    index: usize,
    settings_state: State<'_, SettingsState>,
) -> Result<AppSettings, String> {
    let mut settings_guard = settings_state.lock().await;
    match settings_guard.as_mut() {
        Some(manager) => {
            manager.remove_connection(index).await
                .map_err(|e| format!("Failed to remove connection: {}", e))
        }
        None => Err("Settings manager not initialized".to_string()),
    }
}

#[tauri::command]
pub async fn export_settings(
    export_path: String,
    settings_state: State<'_, SettingsState>,
) -> Result<(), String> {
    let settings_guard = settings_state.lock().await;
    match settings_guard.as_ref() {
        Some(manager) => {
            let path = PathBuf::from(export_path);
            manager.export_settings(path).await
                .map_err(|e| format!("Failed to export settings: {}", e))
        }
        None => Err("Settings manager not initialized".to_string()),
    }
}

#[tauri::command]
pub async fn import_settings(
    import_path: String,
    settings_state: State<'_, SettingsState>,
) -> Result<AppSettings, String> {
    let mut settings_guard = settings_state.lock().await;
    match settings_guard.as_mut() {
        Some(manager) => {
            let path = PathBuf::from(import_path);
            manager.import_settings(path).await
                .map_err(|e| format!("Failed to import settings: {}", e))
        }
        None => Err("Settings manager not initialized".to_string()),
    }
}

#[tauri::command]
pub async fn reset_settings(
    settings_state: State<'_, SettingsState>,
) -> Result<AppSettings, String> {
    let mut settings_guard = settings_state.lock().await;
    match settings_guard.as_mut() {
        Some(manager) => {
            manager.reset_to_defaults().await
                .map_err(|e| format!("Failed to reset settings: {}", e))
        }
        None => Err("Settings manager not initialized".to_string()),
    }
}

#[tauri::command]
pub async fn reload_settings(
    settings_state: State<'_, SettingsState>,
) -> Result<AppSettings, String> {
    let mut settings_guard = settings_state.lock().await;
    match settings_guard.as_mut() {
        Some(manager) => {
            manager.load_settings().await
                .map_err(|e| format!("Failed to reload settings: {}", e))
        }
        None => Err("Settings manager not initialized".to_string()),
    }
}