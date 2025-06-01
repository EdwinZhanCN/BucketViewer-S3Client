# S3 API Implementation for BucketViewer

This document provides comprehensive information about the S3 API functionality implemented in BucketViewer, a cross-platform desktop application built with Tauri, React, and TypeScript.

## Overview

BucketViewer now includes full S3 API integration with support for:
- AWS S3
- MinIO
- DigitalOcean Spaces
- Google Cloud Storage (S3-compatible API)
- Any S3-compatible storage service

## Architecture

### Backend (Rust/Tauri)

The S3 functionality is implemented in Rust using the official AWS SDK for Rust, providing:
- **Security**: All credentials and operations handled server-side
- **Performance**: Native Rust performance for file operations
- **Reliability**: Robust error handling and connection management

#### Key Components

1. **S3 Service** (`src-tauri/src/s3_service.rs`)
   - Core S3 operations using AWS SDK
   - Connection management and authentication
   - Error handling and type conversion

2. **S3 Commands** (`src-tauri/src/s3_commands.rs`)
   - Tauri command handlers for frontend integration
   - Parameter validation and serialization
   - Response formatting

3. **Connection Manager**
   - Thread-safe connection pooling
   - Automatic credential management
   - Connection lifecycle handling

### Frontend (React/TypeScript)

The frontend provides a clean interface for S3 operations through:

1. **S3 Service** (`src/services/s3Service.ts`)
   - TypeScript wrapper for Tauri commands
   - Type-safe API with proper error handling
   - Utility functions for formatting and validation

2. **UI Components**
   - Enhanced BucketList with real S3 data
   - FileExplorer with S3 object management
   - Connection testing and status display

## Features

### Connection Management

- **Multiple Connections**: Support for multiple S3 endpoints
- **Connection Testing**: Real-time connection validation
- **Credential Security**: Secure storage using Tauri's secure storage
- **Auto-reconnection**: Automatic connection retry logic

### Bucket Operations

```typescript
// List all buckets
const buckets = await S3Service.listBuckets(connection);

// Create a new bucket
await S3Service.createBucket(connection, 'my-bucket', 'us-east-1');

// Delete a bucket
await S3Service.deleteBucket(connection, 'my-bucket');

// Get bucket location
const location = await S3Service.getBucketLocation(connection, 'my-bucket');
```

### Object Operations

```typescript
// List objects with pagination
const response = await S3Service.listObjects(
  connection, 
  'my-bucket', 
  'folder/',  // prefix
  '/',        // delimiter
  100,        // max keys
  token       // continuation token
);

// Get object metadata
const info = await S3Service.getObjectInfo(connection, 'my-bucket', 'file.txt');

// Delete single object
await S3Service.deleteObject(connection, 'my-bucket', 'file.txt');

// Delete multiple objects
const failedKeys = await S3Service.deleteObjects(connection, 'my-bucket', ['file1.txt', 'file2.txt']);
```

### Folder Management

```typescript
// Create a folder (empty object ending with '/')
await S3Service.createFolder(connection, 'my-bucket', 'my-folder');
```

### URL Generation

```typescript
// Generate download URL
const downloadUrl = await S3Service.generateDownloadUrl(
  connection, 
  'my-bucket', 
  'file.txt', 
  3600 // expires in seconds
);

// Generate upload URL
const uploadUrl = await S3Service.generateUploadUrl(
  connection, 
  'my-bucket', 
  'file.txt', 
  3600,
  'image/jpeg' // content type
);
```

### Advanced Operations

```typescript
// Copy object between buckets
await S3Service.copyObject(
  connection,
  'source-bucket',
  'source-key',
  'dest-bucket',
  'dest-key'
);
```

## Configuration

### Connection Setup

Connections are configured through the Settings interface:

```typescript
interface ConnectionConfig {
  name: string;           // Display name
  serviceType: string;    // "Amazon S3", "MinIO", etc.
  endpoint: string;       // Service endpoint URL
  accessKey: string;      // Access key ID
  secretKey: string;      // Secret access key
  region: string;         // AWS region or equivalent
  isDefault: boolean;     // Default connection flag
}
```

### Service Types

- **Amazon S3**: Standard AWS S3 service
- **MinIO**: Self-hosted S3-compatible storage
- **DigitalOcean Spaces**: DigitalOcean's S3-compatible service
- **Google Cloud Storage**: Using S3-compatible API
- **Custom S3 Compatible**: Any other S3-compatible service

## Error Handling

The implementation includes comprehensive error handling:

```rust
pub enum S3Error {
    InvalidCredentials,
    BucketNotFound,
    ObjectNotFound,
    PermissionDenied,
    NetworkError(String),
    ConfigurationError(String),
    UnknownError(String),
}
```

Errors are properly mapped and propagated to the frontend with user-friendly messages.

## Security Features

- **Credential Protection**: All credentials stored securely using Tauri's secure storage
- **Server-side Operations**: All S3 operations performed on the backend
- **Presigned URLs**: Secure temporary access to objects
- **Connection Validation**: Real-time connection testing before operations

## Performance Optimizations

- **Connection Pooling**: Reuse connections for better performance
- **Async Operations**: Non-blocking operations with proper loading states
- **Pagination**: Efficient handling of large object lists
- **Lazy Loading**: Objects loaded on-demand

## UI Features

### BucketList Component

- Real-time bucket loading from S3
- Connection status indicators
- Refresh functionality
- Search and filtering
- Error state handling

### FileExplorer Component

- Hierarchical folder navigation
- File type detection and icons
- Size and date formatting
- Bulk operations support
- Download and link generation

### Settings Integration

- Connection management interface
- Real-time connection testing
- S3 demo playground
- Import/export connection settings

## API Reference

### Core Methods

| Method | Description | Parameters | Returns |
|--------|-------------|------------|---------|
| `testConnection` | Test S3 connection | `ConnectionConfig` | `boolean` |
| `listBuckets` | List all buckets | `ConnectionConfig` | `BucketInfo[]` |
| `listObjects` | List objects in bucket | `ConnectionConfig`, `bucket`, `prefix?`, `delimiter?`, `maxKeys?`, `continuationToken?` | `ListObjectsResponse` |
| `createBucket` | Create new bucket | `ConnectionConfig`, `bucket`, `region?` | `void` |
| `deleteObject` | Delete single object | `ConnectionConfig`, `bucket`, `key` | `void` |
| `generateDownloadUrl` | Generate presigned download URL | `ConnectionConfig`, `bucket`, `key`, `expiresInSecs` | `PresignedUrlResponse` |

### Utility Functions

| Function | Description | Returns |
|----------|-------------|---------|
| `formatFileSize` | Format bytes to human-readable size | `string` |
| `formatDate` | Format ISO date to local format | `string` |
| `getFileIcon` | Get emoji icon for file type | `string` |
| `getContentType` | Get MIME type for file extension | `string` |

## Testing

### S3 Demo Component

The application includes a comprehensive S3 demo that allows testing all features:

- Connection testing
- Bucket creation and listing
- Object operations
- URL generation
- Error handling demonstration

### Manual Testing

1. Configure an S3 connection in Settings
2. Test connection using the "Test" button
3. Navigate to S3 Demo tab for comprehensive testing
4. Use BucketList and FileExplorer for real-world usage

## Development

### Adding New Features

1. Add Rust implementation in `s3_service.rs`
2. Create Tauri command in `s3_commands.rs`
3. Add to command registration in `lib.rs`
4. Implement TypeScript wrapper in `s3Service.ts`
5. Update UI components as needed

### Debugging

- Enable Rust logging: `RUST_LOG=debug cargo tauri dev`
- Use browser dev tools for frontend debugging
- Check Tauri console for backend errors

## Limitations

- File uploads require presigned URL approach (no direct upload yet)
- Large file operations may have timeout limitations
- Some advanced S3 features not yet implemented (versioning, lifecycle, etc.)

## Future Enhancements

- Direct file upload/download with progress tracking
- Bucket policy and CORS management
- Object versioning support
- Multipart upload for large files
- Advanced search and filtering
- Bulk operations UI improvements

## Dependencies

### Rust Dependencies

```toml
aws-config = "1.1"
aws-sdk-s3 = "1.14"
aws-credential-types = "1.1"
aws-types = "1.1"
aws-smithy-types = "1.1"
tokio = { version = "1", features = ["full"] }
serde = { version = "1", features = ["derive"] }
```

### TypeScript Dependencies

All S3 functionality uses existing dependencies through Tauri's invoke system.

## License

This S3 implementation is part of BucketViewer and follows the same license terms.