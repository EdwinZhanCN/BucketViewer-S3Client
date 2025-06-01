# BucketViewer S3 Integration - Usage Guide

## Quick Start

### 1. Setup S3 Connection

First, configure your S3 connection in the Settings page:

1. Open BucketViewer
2. Navigate to **Settings** → **Connections**
3. Click **Add Connection**
4. Fill in your S3 details:
   - **Name**: My S3 Connection
   - **Service Type**: Amazon S3 (or MinIO, DigitalOcean Spaces, etc.)
   - **Endpoint**: `https://s3.amazonaws.com` (or your custom endpoint)
   - **Access Key**: Your access key ID
   - **Secret Key**: Your secret access key
   - **Region**: `us-east-1` (or your preferred region)
   - **Set as default**: ✓ (check this)

5. Click **Test Connection** to verify
6. Click **Save Connection**

### 2. Browse Buckets

1. Navigate to **Buckets** in the sidebar
2. Your buckets will automatically load
3. Click on any bucket to view its contents

### 3. Manage Files

1. Select a bucket to enter **Files** view
2. Navigate folders by clicking on folder names
3. Use the toolbar to:
   - Switch between list and grid view
   - Upload files (coming soon)
   - Create new folders
   - Refresh content

### 4. File Operations

For each file, you can:
- **Download**: Click the download icon to get a presigned URL
- **Copy Link**: Click the link icon to copy a shareable URL
- **Delete**: Click the delete icon (with confirmation)

## Advanced Usage

### Multiple Connections

You can configure multiple S3 connections for different providers:

```typescript
// Example connections
const connections = [
  {
    name: "AWS Production",
    serviceType: "Amazon S3",
    endpoint: "https://s3.amazonaws.com",
    region: "us-east-1"
  },
  {
    name: "MinIO Development",
    serviceType: "MinIO",
    endpoint: "http://localhost:9000",
    region: "us-east-1"
  },
  {
    name: "DigitalOcean Spaces",
    serviceType: "DigitalOcean Spaces",
    endpoint: "https://nyc3.digitaloceanspaces.com",
    region: "nyc3"
  }
];
```

### Programmatic Usage

The S3 service can be used programmatically in your own components:

```typescript
import { S3Service } from '@/services/s3Service';
import { useSettings } from '@/services/settingsService';

function MyComponent() {
  const { settings } = useSettings();
  const connection = settings?.connections.find(c => c.isDefault);

  const handleListBuckets = async () => {
    if (!connection) return;
    
    try {
      const buckets = await S3Service.listBuckets(connection);
      console.log('Buckets:', buckets);
    } catch (error) {
      console.error('Failed to list buckets:', error);
    }
  };

  const handleListObjects = async (bucketName: string) => {
    if (!connection) return;
    
    try {
      const response = await S3Service.listObjects(
        connection,
        bucketName,
        'folder/', // prefix
        '/',       // delimiter
        100        // max keys
      );
      console.log('Objects:', response.objects);
      console.log('Folders:', response.common_prefixes);
    } catch (error) {
      console.error('Failed to list objects:', error);
    }
  };

  return (
    <div>
      <button onClick={handleListBuckets}>List Buckets</button>
      <button onClick={() => handleListObjects('my-bucket')}>List Objects</button>
    </div>
  );
}
```

### Error Handling

The S3 service provides comprehensive error handling:

```typescript
try {
  await S3Service.deleteObject(connection, 'my-bucket', 'file.txt');
} catch (error) {
  if (error.message.includes('NoSuchKey')) {
    console.log('File not found');
  } else if (error.message.includes('AccessDenied')) {
    console.log('Permission denied');
  } else if (error.message.includes('InvalidCredentials')) {
    console.log('Invalid credentials');
  } else {
    console.log('Unknown error:', error.message);
  }
}
```

## API Reference

### Connection Testing

```typescript
const isConnected = await S3Service.testConnection(connection);
```

### Bucket Operations

```typescript
// List all buckets
const buckets = await S3Service.listBuckets(connection);

// Create bucket
await S3Service.createBucket(connection, 'new-bucket', 'us-west-2');

// Delete bucket
await S3Service.deleteBucket(connection, 'old-bucket');

// Get bucket location
const location = await S3Service.getBucketLocation(connection, 'my-bucket');
```

### Object Operations

```typescript
// List objects with pagination
const response = await S3Service.listObjects(
  connection,
  'my-bucket',
  'prefix/',        // optional prefix
  '/',             // optional delimiter
  1000,            // optional max keys
  'token'          // optional continuation token
);

// Get object info
const info = await S3Service.getObjectInfo(connection, 'my-bucket', 'file.txt');

// Delete single object
await S3Service.deleteObject(connection, 'my-bucket', 'file.txt');

// Delete multiple objects
const failedKeys = await S3Service.deleteObjects(
  connection, 
  'my-bucket', 
  ['file1.txt', 'file2.txt']
);
```

### URL Generation

```typescript
// Generate download URL (1 hour expiry)
const downloadUrl = await S3Service.generateDownloadUrl(
  connection,
  'my-bucket',
  'file.txt',
  3600
);

// Generate upload URL
const uploadUrl = await S3Service.generateUploadUrl(
  connection,
  'my-bucket',
  'new-file.txt',
  3600,
  'image/jpeg'
);
```

### Folder Management

```typescript
// Create folder
await S3Service.createFolder(connection, 'my-bucket', 'new-folder');
```

### Advanced Operations

```typescript
// Copy object
await S3Service.copyObject(
  connection,
  'source-bucket',
  'source-file.txt',
  'dest-bucket',
  'dest-file.txt'
);
```

## Utility Functions

### File Size Formatting

```typescript
const size = S3Service.formatFileSize(1024000); // "1.0 MB"
```

### Date Formatting

```typescript
const date = S3Service.formatDate('2024-01-15T10:30:00Z'); // "1/15/2024 10:30:00 AM"
```

### File Type Detection

```typescript
const icon = S3Service.getFileIcon(objectInfo); // 🖼️ for images, 📄 for documents
const isImage = S3Service.isImage(objectInfo);
const isVideo = S3Service.isVideo(objectInfo);
const contentType = S3Service.getContentType('photo.jpg'); // "image/jpeg"
```

## Configuration Examples

### AWS S3

```json
{
  "name": "AWS Production",
  "serviceType": "Amazon S3",
  "endpoint": "https://s3.amazonaws.com",
  "accessKey": "AKIA...",
  "secretKey": "...",
  "region": "us-east-1",
  "isDefault": true
}
```

### MinIO

```json
{
  "name": "MinIO Local",
  "serviceType": "MinIO", 
  "endpoint": "http://localhost:9000",
  "accessKey": "minioadmin",
  "secretKey": "minioadmin",
  "region": "us-east-1",
  "isDefault": false
}
```

### DigitalOcean Spaces

```json
{
  "name": "DO Spaces",
  "serviceType": "DigitalOcean Spaces",
  "endpoint": "https://nyc3.digitaloceanspaces.com",
  "accessKey": "...",
  "secretKey": "...",
  "region": "nyc3",
  "isDefault": false
}
```

### Google Cloud Storage (S3 Compatible)

```json
{
  "name": "GCS S3",
  "serviceType": "Google Cloud Storage",
  "endpoint": "https://storage.googleapis.com",
  "accessKey": "...",
  "secretKey": "...",
  "region": "us-central1",
  "isDefault": false
}
```

## Best Practices

### Security

1. **Never hardcode credentials** - always use the settings interface
2. **Use IAM roles** when possible instead of access keys
3. **Limit permissions** to only what's needed for your use case
4. **Rotate credentials** regularly

### Performance

1. **Use pagination** for large object lists
2. **Cache bucket lists** when possible
3. **Use presigned URLs** for file sharing instead of proxying through the app
4. **Set appropriate timeouts** for slow connections

### Error Handling

1. **Always wrap S3 calls** in try-catch blocks
2. **Provide user-friendly error messages**
3. **Implement retry logic** for transient failures
4. **Log errors** for debugging

## Troubleshooting

### Connection Issues

**Problem**: "InvalidCredentials" error
**Solution**: Verify your access key and secret key are correct

**Problem**: "NetworkError" or timeout
**Solution**: Check your endpoint URL and network connectivity

**Problem**: "BucketNotFound" error
**Solution**: Verify the bucket name and your permissions

### Permission Issues

**Problem**: "AccessDenied" errors
**Solution**: Ensure your IAM user/role has the necessary S3 permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket",
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": [
        "arn:aws:s3:::your-bucket",
        "arn:aws:s3:::your-bucket/*"
      ]
    }
  ]
}
```

### Debug Mode

Enable debug logging in development:

```bash
# For Rust backend
RUST_LOG=debug npm run tauri dev

# Check browser console for frontend errors
```

## Support

For issues or questions:

1. Check the browser console for JavaScript errors
2. Check the Tauri console for Rust backend errors
3. Verify your S3 credentials and permissions
4. Test your connection using the built-in connection tester
5. Try the S3 Demo tab in Settings for comprehensive testing

## Contributing

To add new S3 features:

1. Add Rust implementation in `src-tauri/src/s3_service.rs`
2. Create Tauri command in `src-tauri/src/s3_commands.rs`
3. Update command registration in `src-tauri/src/lib.rs`
4. Add TypeScript wrapper in `src/services/s3Service.ts`
5. Update UI components as needed
6. Add tests and documentation