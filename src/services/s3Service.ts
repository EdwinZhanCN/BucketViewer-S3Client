import { invoke } from '@tauri-apps/api/core';
import { ConnectionConfig, convertToRust } from './settingsService';

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

export class S3Service {
  static async testConnection(connection: ConnectionConfig): Promise<boolean> {
    try {
      const result = await invoke<boolean>('test_s3_connection', {
        connectionConfig: convertToRust.connection(connection),
      });
      return result;
    } catch (error) {
      console.error('Failed to test S3 connection:', error);
      throw new Error(error as string);
    }
  }

  static async listBuckets(connection: ConnectionConfig): Promise<BucketInfo[]> {
    try {
      const buckets = await invoke<BucketInfo[]>('list_s3_buckets_with_config', {
        connectionConfig: convertToRust.connection(connection),
      });
      return buckets;
    } catch (error) {
      console.error('Failed to list S3 buckets:', error);
      throw new Error(error as string);
    }
  }

  static async listObjects(
    connection: ConnectionConfig,
    bucket: string,
    prefix?: string,
    delimiter?: string,
    maxKeys?: number,
    continuationToken?: string
  ): Promise<ListObjectsResponse> {
    try {
      // Normalize prefix for S3: 
      // - Remove leading slashes (S3 doesn't use them)
      // - Ensure folder prefixes end with a slash
      let normalizedPrefix = prefix;
      if (normalizedPrefix) {
        // Remove leading slash if present
        if (normalizedPrefix.startsWith('/')) {
          normalizedPrefix = normalizedPrefix.substring(1);
        }
        
        // Ensure folder prefixes end with slash for proper S3 listing
        if (normalizedPrefix && !normalizedPrefix.endsWith('/')) {
          normalizedPrefix += '/';
        }
      }
      
      console.log(`S3Service.listObjects - Bucket: ${bucket}, Normalized prefix: "${normalizedPrefix || ''}"`);
      
      const response = await invoke<ListObjectsResponse>('list_s3_objects', {
        connectionConfig: convertToRust.connection(connection),
        bucket,
        prefix: normalizedPrefix || null,
        delimiter: delimiter || null,
        maxKeys: maxKeys || null,
        continuationToken: continuationToken || null,
      });
      return response;
    } catch (error) {
      console.error('Failed to list S3 objects:', error);
      throw new Error(error as string);
    }
  }

  static async getObjectInfo(
    connection: ConnectionConfig,
    bucket: string,
    key: string
  ): Promise<ObjectInfo> {
    try {
      const info = await invoke<ObjectInfo>('get_s3_object_info', {
        connectionConfig: convertToRust.connection(connection),
        bucket,
        key,
      });
      return info;
    } catch (error) {
      console.error('Failed to get S3 object info:', error);
      throw new Error(error as string);
    }
  }

  static async deleteObject(
    connection: ConnectionConfig,
    bucket: string,
    key: string
  ): Promise<void> {
    try {
      await invoke('delete_s3_object', {
        connectionConfig: convertToRust.connection(connection),
        bucket,
        key,
      });
    } catch (error) {
      console.error('Failed to delete S3 object:', error);
      throw new Error(error as string);
    }
  }

  static async deleteObjects(
    connection: ConnectionConfig,
    bucket: string,
    keys: string[]
  ): Promise<string[]> {
    try {
      const failedKeys = await invoke<string[]>('delete_s3_objects', {
        connectionConfig: convertToRust.connection(connection),
        bucket,
        keys,
      });
      return failedKeys;
    } catch (error) {
      console.error('Failed to delete S3 objects:', error);
      throw new Error(error as string);
    }
  }

  static async createBucket(
    connection: ConnectionConfig,
    bucket: string,
    region?: string
  ): Promise<void> {
    try {
      await invoke('create_s3_bucket', {
        connectionConfig: convertToRust.connection(connection),
        bucket,
        region: region || null,
      });
    } catch (error) {
      console.error('Failed to create S3 bucket:', error);
      throw new Error(error as string);
    }
  }

  static async deleteBucket(
    connection: ConnectionConfig,
    bucket: string
  ): Promise<void> {
    try {
      await invoke('delete_s3_bucket', {
        connectionConfig: convertToRust.connection(connection),
        bucket,
      });
    } catch (error) {
      console.error('Failed to delete S3 bucket:', error);
      throw new Error(error as string);
    }
  }

  static async createFolder(
    connection: ConnectionConfig,
    bucket: string,
    folderPath: string
  ): Promise<void> {
    try {
      await invoke('create_s3_folder', {
        connectionConfig: convertToRust.connection(connection),
        bucket,
        folderPath,
      });
    } catch (error) {
      console.error('Failed to create S3 folder:', error);
      throw new Error(error as string);
    }
  }

  static async generateDownloadUrl(
    connection: ConnectionConfig,
    bucket: string,
    key: string,
    expiresInSecs: number = 3600
  ): Promise<PresignedUrlResponse> {
    try {
      const response = await invoke<PresignedUrlResponse>('generate_s3_download_url', {
        connectionConfig: convertToRust.connection(connection),
        bucket,
        key,
        expiresInSecs,
      });
      return response;
    } catch (error) {
      console.error('Failed to generate S3 download URL:', error);
      throw new Error(error as string);
    }
  }

  static async generateUploadUrl(
    connection: ConnectionConfig,
    bucket: string,
    key: string,
    expiresInSecs: number = 3600,
    contentType?: string
  ): Promise<PresignedUrlResponse> {
    try {
      const response = await invoke<PresignedUrlResponse>('generate_s3_upload_url', {
        connectionConfig: convertToRust.connection(connection),
        bucket,
        key,
        expiresInSecs,
        contentType: contentType || null,
      });
      return response;
    } catch (error) {
      console.error('Failed to generate S3 upload URL:', error);
      throw new Error(error as string);
    }
  }

  static async copyObject(
    connection: ConnectionConfig,
    sourceBucket: string,
    sourceKey: string,
    destBucket: string,
    destKey: string
  ): Promise<void> {
    try {
      await invoke('copy_s3_object', {
        connectionConfig: convertToRust.connection(connection),
        sourceBucket,
        sourceKey,
        destBucket,
        destKey,
      });
    } catch (error) {
      console.error('Failed to copy S3 object:', error);
      throw new Error(error as string);
    }
  }

  static async getBucketLocation(
    connection: ConnectionConfig,
    bucket: string
  ): Promise<string> {
    try {
      const location = await invoke<string>('get_s3_bucket_location', {
        connectionConfig: convertToRust.connection(connection),
        bucket,
      });
      return location;
    } catch (error) {
      console.error('Failed to get S3 bucket location:', error);
      throw new Error(error as string);
    }
  }

  static formatFileSize(bytes?: number): string {
    if (!bytes || bytes === 0) return '0 B';
    
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    
    return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
  }

  static formatDate(dateString?: string): string {
    if (!dateString) return '-';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    } catch {
      return dateString;
    }
  }

  static getFileIcon(objectInfo: ObjectInfo): string {
    if (objectInfo.is_folder) return '📁';
    
    const extension = objectInfo.key.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'bmp':
      case 'svg':
        return '🖼️';
      case 'pdf':
        return '📄';
      case 'doc':
      case 'docx':
        return '📝';
      case 'xls':
      case 'xlsx':
        return '📊';
      case 'zip':
      case 'rar':
      case '7z':
        return '🗜️';
      case 'mp4':
      case 'avi':
      case 'mov':
      case 'wmv':
        return '🎬';
      case 'mp3':
      case 'wav':
      case 'flac':
        return '🎵';
      case 'json':
      case 'xml':
      case 'yaml':
      case 'yml':
        return '⚙️';
      default:
        return '📄';
    }
  }

  static isImage(objectInfo: ObjectInfo): boolean {
    const extension = objectInfo.key.split('.').pop()?.toLowerCase();
    return ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'].includes(extension || '');
  }

  static isVideo(objectInfo: ObjectInfo): boolean {
    const extension = objectInfo.key.split('.').pop()?.toLowerCase();
    return ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm'].includes(extension || '');
  }

  static isAudio(objectInfo: ObjectInfo): boolean {
    const extension = objectInfo.key.split('.').pop()?.toLowerCase();
    return ['mp3', 'wav', 'flac', 'aac', 'ogg'].includes(extension || '');
  }

  static getContentType(filename: string): string {
    const extension = filename.split('.').pop()?.toLowerCase();
    
    const mimeTypes: { [key: string]: string } = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'pdf': 'application/pdf',
      'txt': 'text/plain',
      'html': 'text/html',
      'css': 'text/css',
      'js': 'application/javascript',
      'json': 'application/json',
      'xml': 'application/xml',
      'zip': 'application/zip',
      'mp4': 'video/mp4',
      'mp3': 'audio/mpeg',
    };
    
    return mimeTypes[extension || ''] || 'application/octet-stream';
  }
}