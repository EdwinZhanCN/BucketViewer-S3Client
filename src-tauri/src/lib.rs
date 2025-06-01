mod settings;
mod commands;
mod s3_service;
mod s3_commands;

use commands::*;
use s3_commands::*;
use std::sync::Arc;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(SettingsState::new(None))
        .manage(Arc::new(tokio::sync::Mutex::new(s3_service::S3ConnectionManager::new())))
        .invoke_handler(tauri::generate_handler![
            greet,
            init_settings,
            get_settings,
            save_settings,
            update_general_settings,
            update_appearance_settings,
            update_layout_settings,
            update_permissions_settings,
            add_connection,
            update_connection,
            remove_connection,
            export_settings,
            import_settings,
            reset_settings,
            reload_settings,
            ping_endpoint,
            test_s3_connection,
            connect_to_s3,
            disconnect_from_s3,
            list_s3_buckets,
            list_s3_buckets_with_config,
            list_s3_objects,
            get_s3_object_info,
            delete_s3_object,
            delete_s3_objects,
            create_s3_bucket,
            delete_s3_bucket,
            create_s3_folder,
            generate_s3_download_url,
            generate_s3_upload_url,
            copy_s3_object,
            get_s3_bucket_location
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}