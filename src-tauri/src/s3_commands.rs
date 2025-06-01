use crate::s3_service::{S3Service, S3Config, S3ConnectionManager, BucketInfo, ObjectInfo, ListObjectsResponse, PresignedUrlResponse};
use crate::settings::ConnectionConfig;
use std::sync::Arc;
use tauri::State;
use tokio::sync::Mutex as TokioMutex;
use std::time::Duration;

pub type S3ConnectionState = Arc<TokioMutex<S3ConnectionManager>>;

#[tauri::command]
pub async fn ping_endpoint(
    endpoint: String,
) -> Result<String, String> {
    println!("Pinging endpoint: {}", endpoint);
    
    // Basic URL validation
    if !endpoint.starts_with("http://") && !endpoint.starts_with("https://") {
        return Err("Endpoint must start with http:// or https://".to_string());
    }
    
    // Extract host from endpoint
    let url = match url::Url::parse(&endpoint) {
        Ok(u) => u,
        Err(e) => return Err(format!("Invalid URL format: {}", e)),
    };
    
    let host = match url.host_str() {
        Some(h) => h,
        None => return Err("Could not extract host from URL".to_string()),
    };
    
    // Try basic HTTP request with timeout
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(10))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;
    
    match client.get(&endpoint).send().await {
        Ok(response) => {
            let status = response.status();
            Ok(format!("Endpoint reachable - HTTP {}: {}", status.as_u16(), status.canonical_reason().unwrap_or("Unknown")))
        },
        Err(e) => {
            if e.is_timeout() {
                Err(format!("Connection timeout to {}", host))
            } else if e.is_connect() {
                Err(format!("Connection refused by {}", host))
            } else if e.to_string().contains("dns") {
                Err(format!("DNS resolution failed for {}", host))
            } else {
                Err(format!("Network error: {}", e))
            }
        }
    }
}

#[tauri::command]
pub async fn test_s3_connection(
    connection_config: ConnectionConfig,
) -> Result<bool, String> {
    // Validate configuration before attempting connection
    if connection_config.access_key.trim().is_empty() {
        return Err("Access Key cannot be empty".to_string());
    }
    
    if connection_config.secret_key.trim().is_empty() {
        return Err("Secret Key cannot be empty".to_string());
    }
    
    if connection_config.endpoint.trim().is_empty() {
        return Err("Endpoint URL cannot be empty".to_string());
    }
    
    // Validate endpoint URL format
    if !connection_config.endpoint.starts_with("http://") && !connection_config.endpoint.starts_with("https://") {
        return Err("Endpoint URL must start with http:// or https://".to_string());
    }
    
    // Check for common endpoint mistakes
    if connection_config.endpoint.contains("amazonaws.com") && connection_config.region.trim().is_empty() {
        return Err("AWS S3 requires a region to be specified".to_string());
    }

    let s3_config = S3Config {
        endpoint: connection_config.endpoint,
        access_key: connection_config.access_key,
        secret_key: connection_config.secret_key,
        region: connection_config.region,
        bucket: None,
    };

    match S3Service::new(s3_config).await {
        Ok(service) => {
            match service.test_connection().await {
                Ok(result) => Ok(result),
                Err(err) => {
                    println!("S3 connection test error: {:?}", err);
                    Err(format!("Connection test failed: {}", err))
                }
            }
        }
        Err(err) => {
            println!("Failed to create S3 service: {:?}", err);
            Err(format!("Failed to create S3 service: {}", err))
        }
    }
}

#[tauri::command]
pub async fn connect_to_s3(
    connection_name: String,
    connection_config: ConnectionConfig,
    s3_state: State<'_, S3ConnectionState>,
) -> Result<bool, String> {
    let s3_config = S3Config {
        endpoint: connection_config.endpoint,
        access_key: connection_config.access_key,
        secret_key: connection_config.secret_key,
        region: connection_config.region,
        bucket: None,
    };

    let manager = s3_state.lock().await;
    match manager.get_or_create_connection(&connection_name, s3_config).await {
        Ok(_) => Ok(true),
        Err(err) => Err(format!("Failed to connect to S3: {}", err)),
    }
}

#[tauri::command]
pub async fn disconnect_from_s3(
    connection_name: String,
    s3_state: State<'_, S3ConnectionState>,
) -> Result<(), String> {
    let manager = s3_state.lock().await;
    manager.remove_connection(&connection_name);
    Ok(())
}

#[tauri::command]
pub async fn list_s3_buckets(
    _connection_name: String,
    _s3_state: State<'_, S3ConnectionState>,
) -> Result<Vec<BucketInfo>, String> {
    // We need the connection config to create the service
    // For now, we'll return an error asking for reconnection
    Err("Please reconnect to S3 to list buckets".to_string())
}

#[tauri::command]
pub async fn list_s3_buckets_with_config(
    connection_config: ConnectionConfig,
) -> Result<Vec<BucketInfo>, String> {
    // Validate configuration
    if connection_config.access_key.trim().is_empty() || connection_config.secret_key.trim().is_empty() {
        return Err("Invalid credentials: Access Key and Secret Key are required".to_string());
    }
    
    if connection_config.endpoint.trim().is_empty() {
        return Err("Endpoint URL is required".to_string());
    }

    let s3_config = S3Config {
        endpoint: connection_config.endpoint.clone(),
        access_key: connection_config.access_key.clone(),
        secret_key: connection_config.secret_key.clone(),
        region: connection_config.region.clone(),
        bucket: None,
    };

    println!("Attempting to list buckets for endpoint: {}", connection_config.endpoint);

    match S3Service::new(s3_config).await {
        Ok(service) => {
            match service.list_buckets().await {
                Ok(buckets) => {
                    println!("Successfully listed {} buckets", buckets.len());
                    Ok(buckets)
                },
                Err(err) => {
                    println!("Failed to list buckets: {:?}", err);
                    
                    // Provide helpful error messages based on error type
                    let error_message = match err.to_string().as_str() {
                        s if s.contains("InvalidAccessKeyId") => "Invalid Access Key ID - please check your credentials".to_string(),
                        s if s.contains("SignatureDoesNotMatch") => "Invalid Secret Key - signature mismatch".to_string(),
                        s if s.contains("AccessDenied") => "Access denied - check your permissions".to_string(),
                        s if s.contains("dns") || s.contains("resolve") => format!("Cannot resolve endpoint '{}' - check your endpoint URL", connection_config.endpoint),
                        s if s.contains("connection") || s.contains("timeout") => format!("Connection failed to '{}' - check network connectivity", connection_config.endpoint),
                        _ => format!("Failed to list buckets: {}", err)
                    };
                    
                    Err(error_message)
                }
            }
        }
        Err(err) => {
            println!("Failed to create S3 service for list_buckets: {:?}", err);
            
            let error_message = if err.to_string().contains("Invalid URI") {
                format!("Invalid endpoint URL format: '{}'. Please use format like 'https://s3.amazonaws.com' or 'http://localhost:9000'", connection_config.endpoint)
            } else {
                format!("Failed to create S3 service: {}", err)
            };
            
            Err(error_message)
        }
    }
}

#[tauri::command]
pub async fn list_s3_objects(
    connection_config: ConnectionConfig,
    bucket: String,
    prefix: Option<String>,
    delimiter: Option<String>,
    max_keys: Option<i32>,
    continuation_token: Option<String>,
) -> Result<ListObjectsResponse, String> {
    let s3_config = S3Config {
        endpoint: connection_config.endpoint,
        access_key: connection_config.access_key,
        secret_key: connection_config.secret_key,
        region: connection_config.region,
        bucket: Some(bucket.clone()),
    };

    match S3Service::new(s3_config).await {
        Ok(service) => {
            match service.list_objects(
                &bucket,
                prefix.as_deref(),
                delimiter.as_deref(),
                max_keys,
                continuation_token.as_deref(),
            ).await {
                Ok(response) => Ok(response),
                Err(err) => {
                    println!("Failed to list objects in bucket '{}': {:?}", bucket, err);
                    Err(format!("Failed to list objects: {}", err))
                }
            }
        }
        Err(err) => {
            println!("Failed to create S3 service for list_objects: {:?}", err);
            Err(format!("Failed to create S3 service: {}", err))
        }
    }
}

#[tauri::command]
pub async fn get_s3_object_info(
    connection_config: ConnectionConfig,
    bucket: String,
    key: String,
) -> Result<ObjectInfo, String> {
    let s3_config = S3Config {
        endpoint: connection_config.endpoint,
        access_key: connection_config.access_key,
        secret_key: connection_config.secret_key,
        region: connection_config.region,
        bucket: Some(bucket.clone()),
    };

    match S3Service::new(s3_config).await {
        Ok(service) => {
            match service.get_object_info(&bucket, &key).await {
                Ok(info) => Ok(info),
                Err(err) => Err(format!("Failed to get object info: {}", err)),
            }
        }
        Err(err) => Err(format!("Failed to create S3 service: {}", err)),
    }
}

#[tauri::command]
pub async fn delete_s3_object(
    connection_config: ConnectionConfig,
    bucket: String,
    key: String,
) -> Result<(), String> {
    let s3_config = S3Config {
        endpoint: connection_config.endpoint,
        access_key: connection_config.access_key,
        secret_key: connection_config.secret_key,
        region: connection_config.region,
        bucket: Some(bucket.clone()),
    };

    match S3Service::new(s3_config).await {
        Ok(service) => {
            match service.delete_object(&bucket, &key).await {
                Ok(_) => Ok(()),
                Err(err) => Err(format!("Failed to delete object: {}", err)),
            }
        }
        Err(err) => Err(format!("Failed to create S3 service: {}", err)),
    }
}

#[tauri::command]
pub async fn delete_s3_objects(
    connection_config: ConnectionConfig,
    bucket: String,
    keys: Vec<String>,
) -> Result<Vec<String>, String> {
    let s3_config = S3Config {
        endpoint: connection_config.endpoint,
        access_key: connection_config.access_key,
        secret_key: connection_config.secret_key,
        region: connection_config.region,
        bucket: Some(bucket.clone()),
    };

    match S3Service::new(s3_config).await {
        Ok(service) => {
            match service.delete_objects(&bucket, keys).await {
                Ok(failed_keys) => Ok(failed_keys),
                Err(err) => Err(format!("Failed to delete objects: {}", err)),
            }
        }
        Err(err) => Err(format!("Failed to create S3 service: {}", err)),
    }
}

#[tauri::command]
pub async fn create_s3_bucket(
    connection_config: ConnectionConfig,
    bucket: String,
    region: Option<String>,
) -> Result<(), String> {
    let s3_config = S3Config {
        endpoint: connection_config.endpoint,
        access_key: connection_config.access_key,
        secret_key: connection_config.secret_key,
        region: connection_config.region.clone(),
        bucket: None,
    };

    match S3Service::new(s3_config).await {
        Ok(service) => {
            match service.create_bucket(&bucket, region.as_deref()).await {
                Ok(_) => Ok(()),
                Err(err) => Err(format!("Failed to create bucket: {}", err)),
            }
        }
        Err(err) => Err(format!("Failed to create S3 service: {}", err)),
    }
}

#[tauri::command]
pub async fn delete_s3_bucket(
    connection_config: ConnectionConfig,
    bucket: String,
) -> Result<(), String> {
    let s3_config = S3Config {
        endpoint: connection_config.endpoint,
        access_key: connection_config.access_key,
        secret_key: connection_config.secret_key,
        region: connection_config.region,
        bucket: None,
    };

    match S3Service::new(s3_config).await {
        Ok(service) => {
            match service.delete_bucket(&bucket).await {
                Ok(_) => Ok(()),
                Err(err) => Err(format!("Failed to delete bucket: {}", err)),
            }
        }
        Err(err) => Err(format!("Failed to create S3 service: {}", err)),
    }
}

#[tauri::command]
pub async fn create_s3_folder(
    connection_config: ConnectionConfig,
    bucket: String,
    folder_path: String,
) -> Result<(), String> {
    let s3_config = S3Config {
        endpoint: connection_config.endpoint,
        access_key: connection_config.access_key,
        secret_key: connection_config.secret_key,
        region: connection_config.region,
        bucket: Some(bucket.clone()),
    };

    match S3Service::new(s3_config).await {
        Ok(service) => {
            match service.create_folder(&bucket, &folder_path).await {
                Ok(_) => Ok(()),
                Err(err) => Err(format!("Failed to create folder: {}", err)),
            }
        }
        Err(err) => Err(format!("Failed to create S3 service: {}", err)),
    }
}

#[tauri::command]
pub async fn generate_s3_download_url(
    connection_config: ConnectionConfig,
    bucket: String,
    key: String,
    expires_in_secs: u64,
) -> Result<PresignedUrlResponse, String> {
    let s3_config = S3Config {
        endpoint: connection_config.endpoint,
        access_key: connection_config.access_key,
        secret_key: connection_config.secret_key,
        region: connection_config.region,
        bucket: Some(bucket.clone()),
    };

    match S3Service::new(s3_config).await {
        Ok(service) => {
            match service.generate_presigned_download_url(&bucket, &key, expires_in_secs).await {
                Ok(response) => Ok(response),
                Err(err) => Err(format!("Failed to generate download URL: {}", err)),
            }
        }
        Err(err) => Err(format!("Failed to create S3 service: {}", err)),
    }
}

#[tauri::command]
pub async fn generate_s3_upload_url(
    connection_config: ConnectionConfig,
    bucket: String,
    key: String,
    expires_in_secs: u64,
    content_type: Option<String>,
) -> Result<PresignedUrlResponse, String> {
    let s3_config = S3Config {
        endpoint: connection_config.endpoint,
        access_key: connection_config.access_key,
        secret_key: connection_config.secret_key,
        region: connection_config.region,
        bucket: Some(bucket.clone()),
    };

    match S3Service::new(s3_config).await {
        Ok(service) => {
            match service.generate_presigned_upload_url(&bucket, &key, expires_in_secs, content_type.as_deref()).await {
                Ok(response) => Ok(response),
                Err(err) => Err(format!("Failed to generate upload URL: {}", err)),
            }
        }
        Err(err) => Err(format!("Failed to create S3 service: {}", err)),
    }
}

#[tauri::command]
pub async fn copy_s3_object(
    connection_config: ConnectionConfig,
    source_bucket: String,
    source_key: String,
    dest_bucket: String,
    dest_key: String,
) -> Result<(), String> {
    let s3_config = S3Config {
        endpoint: connection_config.endpoint,
        access_key: connection_config.access_key,
        secret_key: connection_config.secret_key,
        region: connection_config.region,
        bucket: None,
    };

    match S3Service::new(s3_config).await {
        Ok(service) => {
            match service.copy_object(&source_bucket, &source_key, &dest_bucket, &dest_key).await {
                Ok(_) => Ok(()),
                Err(err) => Err(format!("Failed to copy object: {}", err)),
            }
        }
        Err(err) => Err(format!("Failed to create S3 service: {}", err)),
    }
}

#[tauri::command]
pub async fn get_s3_bucket_location(
    connection_config: ConnectionConfig,
    bucket: String,
) -> Result<String, String> {
    let s3_config = S3Config {
        endpoint: connection_config.endpoint,
        access_key: connection_config.access_key,
        secret_key: connection_config.secret_key,
        region: connection_config.region,
        bucket: Some(bucket.clone()),
    };

    match S3Service::new(s3_config).await {
        Ok(service) => {
            match service.get_bucket_location(&bucket).await {
                Ok(location) => Ok(location),
                Err(err) => Err(format!("Failed to get bucket location: {}", err)),
            }
        }
        Err(err) => Err(format!("Failed to create S3 service: {}", err)),
    }
}