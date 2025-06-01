use aws_config::{BehaviorVersion, Region};
use aws_credential_types::Credentials;
use aws_sdk_s3::Client;
use serde::{Deserialize, Serialize};
use std::error::Error;
use std::fmt;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct S3Config {
    pub endpoint: String,
    pub access_key: String,
    pub secret_key: String,
    pub region: String,
    pub bucket: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BucketInfo {
    pub name: String,
    pub creation_date: Option<String>,
    pub region: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ObjectInfo {
    pub key: String,
    pub size: Option<i64>,
    pub last_modified: Option<String>,
    pub etag: Option<String>,
    pub storage_class: Option<String>,
    pub content_type: Option<String>,
    pub is_folder: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ListObjectsResponse {
    pub objects: Vec<ObjectInfo>,
    pub common_prefixes: Vec<String>,
    pub is_truncated: bool,
    pub next_continuation_token: Option<String>,
    pub prefix: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PresignedUrlResponse {
    pub url: String,
    pub expires_in: u64,
}

#[derive(Debug)]
pub enum S3Error {
    InvalidCredentials,
    BucketNotFound,
    ObjectNotFound,
    PermissionDenied,
    NetworkError(String),
    ConfigurationError(String),
    UnknownError(String),
}

impl fmt::Display for S3Error {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            S3Error::InvalidCredentials => write!(f, "Invalid AWS credentials"),
            S3Error::BucketNotFound => write!(f, "Bucket not found"),
            S3Error::ObjectNotFound => write!(f, "Object not found"),
            S3Error::PermissionDenied => write!(f, "Permission denied"),
            S3Error::NetworkError(msg) => write!(f, "Network error: {}", msg),
            S3Error::ConfigurationError(msg) => write!(f, "Configuration error: {}", msg),
            S3Error::UnknownError(msg) => write!(f, "Unknown error: {}", msg),
        }
    }
}

impl Error for S3Error {}

pub struct S3Service {
    client: Client,
    config: S3Config,
}

impl S3Service {
    pub async fn new(config: S3Config) -> Result<Self, S3Error> {
        println!("Creating S3 service with config:");
        println!("  Endpoint: {}", config.endpoint);
        println!("  Region: {}", config.region);
        println!("  Access Key: {}...", &config.access_key[..std::cmp::min(8, config.access_key.len())]);
        
        if config.access_key.is_empty() || config.secret_key.is_empty() {
            return Err(S3Error::ConfigurationError("Access key and secret key cannot be empty".to_string()));
        }
        
        if config.endpoint.is_empty() {
            return Err(S3Error::ConfigurationError("Endpoint cannot be empty".to_string()));
        }

        let credentials = Credentials::new(
            &config.access_key,
            &config.secret_key,
            None,
            None,
            "bucketviewer",
        );

        let region = if config.region.is_empty() {
            Region::new("us-east-1")
        } else {
            Region::new(config.region.clone())
        };

        let aws_config_builder = aws_config::defaults(BehaviorVersion::latest())
            .credentials_provider(credentials)
            .region(region);

        let mut s3_config_builder = aws_sdk_s3::config::Builder::from(&aws_config_builder.load().await);

        // Handle custom endpoints (like MinIO, DigitalOcean Spaces, etc.)
        if !config.endpoint.is_empty() && !config.endpoint.contains("amazonaws.com") {
            println!("Using custom endpoint with path-style addressing");
            s3_config_builder = s3_config_builder
                .endpoint_url(&config.endpoint)
                .force_path_style(true);
        }

        let s3_config = s3_config_builder.build();
        let client = Client::from_conf(s3_config);

        println!("S3 service created successfully");
        Ok(S3Service { client, config })
    }

    pub async fn test_connection(&self) -> Result<bool, S3Error> {
        println!("Testing S3 connection to: {}", self.config.endpoint);
        match self.client.list_buckets().send().await {
            Ok(_) => {
                println!("S3 connection test successful");
                Ok(true)
            },
            Err(err) => {
                let error_msg = err.to_string();
                println!("S3 connection test failed: {}", error_msg);
                println!("Error source: {:?}", err.source());
                println!("Error kind: {:?}", std::error::Error::source(&err));
                
                // Check for specific error patterns in both error message and debug format
                let debug_msg = format!("{:?}", err);
                println!("Full error details: {:?}", err);
                
                if debug_msg.contains("AccessDenied") {
                    Err(S3Error::PermissionDenied)
                } else if debug_msg.contains("InvalidAccessKeyId") || debug_msg.contains("SignatureDoesNotMatch") {
                    Err(S3Error::InvalidCredentials)
                } else if debug_msg.contains("NoSuchBucket") {
                    Err(S3Error::BucketNotFound)
                } else if error_msg.contains("NetworkError") || error_msg.contains("timeout") {
                    Err(S3Error::NetworkError(error_msg))
                } else if error_msg.contains("connection") || error_msg.contains("Connection") {
                    Err(S3Error::NetworkError(format!("Connection failed: {}", error_msg)))
                } else if error_msg.contains("dns") || error_msg.contains("resolve") {
                    Err(S3Error::NetworkError(format!("DNS resolution failed - check endpoint URL: {}", error_msg)))
                } else {
                    Err(S3Error::UnknownError(format!("Connection test failed: {}", error_msg)))
                }
            }
        }
    }

    pub async fn list_buckets(&self) -> Result<Vec<BucketInfo>, S3Error> {
        println!("Listing buckets for endpoint: {}", self.config.endpoint);
        match self.client.list_buckets().send().await {
            Ok(response) => {
                let buckets: Vec<BucketInfo> = response.buckets()
                    .iter()
                    .map(|bucket| BucketInfo {
                        name: bucket.name().unwrap_or_default().to_string(),
                        creation_date: bucket
                            .creation_date()
                            .map(|date| date.fmt(aws_smithy_types::date_time::Format::DateTime).unwrap_or_default()),
                        region: None, // Will be populated separately if needed
                    })
                    .collect();
                println!("Found {} buckets", buckets.len());
                Ok(buckets)
            }
            Err(err) => {
                println!("Failed to list buckets: {}", err);
                println!("List buckets error source: {:?}", err.source());
                
                // Check for specific error patterns
                println!("Full list buckets error details: {:?}", err);
                
                Err(self.map_aws_error(err))
            }
        }
    }

    pub async fn list_objects(
        &self,
        bucket: &str,
        prefix: Option<&str>,
        delimiter: Option<&str>,
        max_keys: Option<i32>,
        continuation_token: Option<&str>,
    ) -> Result<ListObjectsResponse, S3Error> {
        let mut request = self.client.list_objects_v2().bucket(bucket);

        if let Some(p) = prefix {
            request = request.prefix(p);
        }

        if let Some(d) = delimiter {
            request = request.delimiter(d);
        }

        if let Some(mk) = max_keys {
            request = request.max_keys(mk);
        }

        if let Some(token) = continuation_token {
            request = request.continuation_token(token);
        }

        match request.send().await {
            Ok(response) => {
                let objects: Vec<ObjectInfo> = response.contents()
                    .iter()
                    .map(|obj| ObjectInfo {
                        key: obj.key().unwrap_or_default().to_string(),
                        size: obj.size(),
                        last_modified: obj
                            .last_modified()
                            .map(|date| date.fmt(aws_smithy_types::date_time::Format::DateTime).unwrap_or_default()),
                        etag: obj.e_tag().map(|s| s.to_string()),
                        storage_class: obj.storage_class().map(|s| s.as_str().to_string()),
                        content_type: None, // Will be populated in head_object if needed
                        is_folder: obj.key().unwrap_or_default().ends_with('/'),
                    })
                    .collect();

                let common_prefixes: Vec<String> = response.common_prefixes()
                    .iter()
                    .filter_map(|cp| cp.prefix().map(|s| s.to_string()))
                    .collect();

                Ok(ListObjectsResponse {
                    objects,
                    common_prefixes,
                    is_truncated: response.is_truncated().unwrap_or(false),
                    next_continuation_token: response.next_continuation_token().map(|s| s.to_string()),
                    prefix: response.prefix().map(|s| s.to_string()),
                })
            }
            Err(err) => Err(self.map_aws_error(err)),
        }
    }

    pub async fn get_object_info(&self, bucket: &str, key: &str) -> Result<ObjectInfo, S3Error> {
        match self.client.head_object().bucket(bucket).key(key).send().await {
            Ok(response) => Ok(ObjectInfo {
                key: key.to_string(),
                size: response.content_length(),
                last_modified: response
                    .last_modified()
                    .map(|date| date.fmt(aws_smithy_types::date_time::Format::DateTime).unwrap_or_default()),
                etag: response.e_tag().map(|s| s.to_string()),
                storage_class: response.storage_class().map(|s| s.as_str().to_string()),
                content_type: response.content_type().map(|s| s.to_string()),
                is_folder: key.ends_with('/'),
            }),
            Err(err) => Err(self.map_aws_error(err)),
        }
    }

    pub async fn delete_object(&self, bucket: &str, key: &str) -> Result<(), S3Error> {
        match self.client.delete_object().bucket(bucket).key(key).send().await {
            Ok(_) => Ok(()),
            Err(err) => Err(self.map_aws_error(err)),
        }
    }

    pub async fn delete_objects(&self, bucket: &str, keys: Vec<String>) -> Result<Vec<String>, S3Error> {
        let delete_objects: Vec<_> = keys
            .iter()
            .map(|key| {
                aws_sdk_s3::types::ObjectIdentifier::builder()
                    .key(key)
                    .build()
                    .unwrap()
            })
            .collect();

        let delete_request = aws_sdk_s3::types::Delete::builder()
            .set_objects(Some(delete_objects))
            .build()
            .unwrap();

        match self
            .client
            .delete_objects()
            .bucket(bucket)
            .delete(delete_request)
            .send()
            .await
        {
            Ok(response) => {
                let mut failed_keys = Vec::new();
                
                let errors = response.errors();
                if !errors.is_empty() {
                    for error in errors {
                        if let Some(key) = error.key() {
                            failed_keys.push(key.to_string());
                        }
                    }
                }
                
                Ok(failed_keys)
            }
            Err(err) => Err(self.map_aws_error(err)),
        }
    }

    pub async fn create_bucket(&self, bucket: &str, region: Option<&str>) -> Result<(), S3Error> {
        let mut request = self.client.create_bucket().bucket(bucket);

        if let Some(r) = region {
            if r != "us-east-1" {
                let bucket_config = aws_sdk_s3::types::CreateBucketConfiguration::builder()
                    .location_constraint(aws_sdk_s3::types::BucketLocationConstraint::from(r))
                    .build();
                request = request.create_bucket_configuration(bucket_config);
            }
        }

        match request.send().await {
            Ok(_) => Ok(()),
            Err(err) => Err(self.map_aws_error(err)),
        }
    }

    pub async fn delete_bucket(&self, bucket: &str) -> Result<(), S3Error> {
        match self.client.delete_bucket().bucket(bucket).send().await {
            Ok(_) => Ok(()),
            Err(err) => Err(self.map_aws_error(err)),
        }
    }

    pub async fn create_folder(&self, bucket: &str, folder_path: &str) -> Result<(), S3Error> {
        let key = if folder_path.ends_with('/') {
            folder_path.to_string()
        } else {
            format!("{}/", folder_path)
        };

        match self
            .client
            .put_object()
            .bucket(bucket)
            .key(&key)
            .body(aws_sdk_s3::primitives::ByteStream::from_static(b""))
            .send()
            .await
        {
            Ok(_) => Ok(()),
            Err(err) => Err(self.map_aws_error(err)),
        }
    }

    pub async fn generate_presigned_download_url(
        &self,
        bucket: &str,
        key: &str,
        expires_in_secs: u64,
    ) -> Result<PresignedUrlResponse, S3Error> {
        let request = self.client.get_object().bucket(bucket).key(key);
        
        match request
            .presigned(
                aws_sdk_s3::presigning::PresigningConfig::expires_in(
                    std::time::Duration::from_secs(expires_in_secs)
                ).unwrap()
            )
            .await
        {
            Ok(presigned) => Ok(PresignedUrlResponse {
                url: presigned.uri().to_string(),
                expires_in: expires_in_secs,
            }),
            Err(err) => Err(S3Error::UnknownError(err.to_string())),
        }
    }

    pub async fn generate_presigned_upload_url(
        &self,
        bucket: &str,
        key: &str,
        expires_in_secs: u64,
        content_type: Option<&str>,
    ) -> Result<PresignedUrlResponse, S3Error> {
        let mut request = self.client.put_object().bucket(bucket).key(key);
        
        if let Some(ct) = content_type {
            request = request.content_type(ct);
        }
        
        match request
            .presigned(
                aws_sdk_s3::presigning::PresigningConfig::expires_in(
                    std::time::Duration::from_secs(expires_in_secs)
                ).unwrap()
            )
            .await
        {
            Ok(presigned) => Ok(PresignedUrlResponse {
                url: presigned.uri().to_string(),
                expires_in: expires_in_secs,
            }),
            Err(err) => Err(S3Error::UnknownError(err.to_string())),
        }
    }

    pub async fn copy_object(
        &self,
        source_bucket: &str,
        source_key: &str,
        dest_bucket: &str,
        dest_key: &str,
    ) -> Result<(), S3Error> {
        let copy_source = format!("{}/{}", source_bucket, source_key);
        
        match self
            .client
            .copy_object()
            .copy_source(&copy_source)
            .bucket(dest_bucket)
            .key(dest_key)
            .send()
            .await
        {
            Ok(_) => Ok(()),
            Err(err) => Err(self.map_aws_error(err)),
        }
    }

    pub async fn get_bucket_location(&self, bucket: &str) -> Result<String, S3Error> {
        match self.client.get_bucket_location().bucket(bucket).send().await {
            Ok(response) => {
                let location = response
                    .location_constraint()
                    .map(|lc| lc.as_str().to_string())
                    .unwrap_or_else(|| "us-east-1".to_string());
                Ok(location)
            }
            Err(err) => Err(self.map_aws_error(err)),
        }
    }

    fn map_aws_error<E>(&self, err: aws_sdk_s3::error::SdkError<E>) -> S3Error 
    where 
        E: Error + 'static,
    {
        let error_msg = err.to_string();
        let debug_msg = format!("{:?}", err);
        println!("Mapping AWS error: {}", error_msg);
        println!("Debug format: {}", debug_msg);
        
        // Check debug format for error codes since toString() only returns "service error"
        if debug_msg.contains("AccessDenied") {
            S3Error::PermissionDenied
        } else if debug_msg.contains("InvalidAccessKeyId") || debug_msg.contains("SignatureDoesNotMatch") {
            S3Error::InvalidCredentials
        } else if debug_msg.contains("NoSuchBucket") {
            S3Error::BucketNotFound
        } else if debug_msg.contains("NoSuchKey") {
            S3Error::ObjectNotFound
        } else if error_msg.contains("NetworkError") || error_msg.contains("timeout") || error_msg.contains("connection") {
            S3Error::NetworkError(format!("Network error: {}", error_msg))
        } else if error_msg.contains("dns") || error_msg.contains("DNS") || error_msg.contains("resolve") {
            S3Error::NetworkError(format!("DNS resolution failed - check endpoint URL: {}", error_msg))
        } else if error_msg.contains("tls") || error_msg.contains("TLS") || error_msg.contains("ssl") || error_msg.contains("SSL") {
            S3Error::NetworkError(format!("TLS/SSL error: {}", error_msg))
        } else if error_msg.contains("hyper") {
            S3Error::NetworkError(format!("HTTP client error: {}", error_msg))
        } else if error_msg.contains("Invalid URI") {
            S3Error::ConfigurationError(format!("Invalid endpoint URL: {}", error_msg))
        } else {
            S3Error::UnknownError(format!("AWS SDK error details: {}", error_msg))
        }
    }
}

// Thread-safe singleton for managing S3 connections
use std::sync::{Arc, Mutex};
use std::collections::HashMap as StdHashMap;

pub struct S3ConnectionManager {
    connections: Arc<Mutex<StdHashMap<String, Arc<S3Service>>>>,
}

impl S3ConnectionManager {
    pub fn new() -> Self {
        Self {
            connections: Arc::new(Mutex::new(StdHashMap::new())),
        }
    }

    pub async fn get_or_create_connection(
        &self,
        name: &str,
        config: S3Config,
    ) -> Result<Arc<S3Service>, S3Error> {
        {
            let connections = self.connections.lock().unwrap();
            if let Some(service) = connections.get(name) {
                return Ok(Arc::clone(service));
            }
        }

        let service = Arc::new(S3Service::new(config).await?);
        
        {
            let mut connections = self.connections.lock().unwrap();
            connections.insert(name.to_string(), Arc::clone(&service));
        }

        Ok(service)
    }

    pub fn remove_connection(&self, name: &str) {
        let mut connections = self.connections.lock().unwrap();
        connections.remove(name);
    }

    pub fn clear_connections(&self) {
        let mut connections = self.connections.lock().unwrap();
        connections.clear();
    }
}

impl Default for S3ConnectionManager {
    fn default() -> Self {
        Self::new()
    }
}