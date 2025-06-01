export interface S3Config {
  endpoint: string;
  access_key: string;
  secret_key: string;
  region: string;
  bucket?: string;
}

export interface BucketInfo {
  name: string;
  creation_date?: string;
  region?: string;
}

export interface ObjectInfo {
  key: string;
  size?: number;
  last_modified?: string;
  etag?: string;
  storage_class?: string;
  content_type?: string;
  is_folder: boolean;
}

export interface ListObjectsResponse {
  objects: ObjectInfo[];
  common_prefixes: string[];
  is_truncated: boolean;
  next_continuation_token?: string;
  prefix?: string;
}

export interface PresignedUrlResponse {
  url: string;
  expires_in: number;
}

export interface S3Error {
  type: 'InvalidCredentials' | 'BucketNotFound' | 'ObjectNotFound' | 'PermissionDenied' | 'NetworkError' | 'ConfigurationError' | 'UnknownError';
  message: string;
}

export interface S3ConnectionStatus {
  name: string;
  connected: boolean;
  error?: string;
  last_tested?: string;
}

export interface S3UploadProgress {
  key: string;
  bucket: string;
  progress: number;
  total_size: number;
  uploaded_size: number;
  status: 'uploading' | 'completed' | 'failed' | 'paused';
  error?: string;
}

export interface S3DownloadProgress {
  key: string;
  bucket: string;
  progress: number;
  total_size: number;
  downloaded_size: number;
  status: 'downloading' | 'completed' | 'failed' | 'paused';
  error?: string;
}

export interface S3BucketPolicy {
  bucket: string;
  policy: string;
}

export interface S3BucketCors {
  bucket: string;
  cors_rules: CorsRule[];
}

export interface CorsRule {
  allowed_methods: string[];
  allowed_origins: string[];
  allowed_headers?: string[];
  exposed_headers?: string[];
  max_age_seconds?: number;
}

export interface S3ObjectMetadata {
  [key: string]: string;
}

export interface S3MultipartUpload {
  upload_id: string;
  key: string;
  bucket: string;
  parts: S3UploadPart[];
}

export interface S3UploadPart {
  part_number: number;
  etag: string;
  size: number;
}

export type S3StorageClass = 
  | 'STANDARD'
  | 'STANDARD_IA'
  | 'ONEZONE_IA'
  | 'GLACIER'
  | 'GLACIER_IR'
  | 'DEEP_ARCHIVE'
  | 'INTELLIGENT_TIERING';

export interface S3ObjectVersion {
  key: string;
  version_id: string;
  is_latest: boolean;
  last_modified?: string;
  size?: number;
  etag?: string;
  storage_class?: S3StorageClass;
}

export interface S3DeleteMarker {
  key: string;
  version_id: string;
  is_latest: boolean;
  last_modified?: string;
}