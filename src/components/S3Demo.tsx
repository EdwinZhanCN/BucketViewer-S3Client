import { useState, useEffect } from 'react';
import { S3Service, BucketInfo, ObjectInfo } from '../services/s3Service';
import { useSettings } from '../services/settingsService';

export function S3Demo() {
  const [buckets, setBuckets] = useState<BucketInfo[]>([]);
  const [selectedBucket, setSelectedBucket] = useState<string>('');
  const [objects, setObjects] = useState<ObjectInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [connectionTest, setConnectionTest] = useState<boolean | null>(null);
  const { settings } = useSettings();

  const activeConnection = settings?.connections.find(conn => conn.isDefault) || settings?.connections[0];

  const testConnection = async () => {
    if (!activeConnection) {
      setStatus('No connection configured');
      return;
    }

    setLoading(true);
    setStatus('Testing connection...');

    try {
      const result = await S3Service.testConnection(activeConnection);
      setConnectionTest(result);
      setStatus(result ? 'Connection successful!' : 'Connection failed');
    } catch (error) {
      setConnectionTest(false);
      setStatus(`Connection error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const loadBuckets = async () => {
    if (!activeConnection) {
      setStatus('No connection configured');
      return;
    }

    setLoading(true);
    setStatus('Loading buckets...');

    try {
      const bucketList = await S3Service.listBuckets(activeConnection);
      setBuckets(bucketList);
      setStatus(`Found ${bucketList.length} buckets`);
    } catch (error) {
      setStatus(`Failed to load buckets: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const loadObjects = async (bucketName: string) => {
    if (!activeConnection) {
      setStatus('No connection configured');
      return;
    }

    setLoading(true);
    setStatus(`Loading objects from ${bucketName}...`);

    try {
      const response = await S3Service.listObjects(activeConnection, bucketName, undefined, '/', 100);
      setObjects(response.objects);
      setStatus(`Found ${response.objects.length} objects in ${bucketName}`);
    } catch (error) {
      setStatus(`Failed to load objects: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const createTestBucket = async () => {
    if (!activeConnection) {
      setStatus('No connection configured');
      return;
    }

    const bucketName = `bucketviewer-test-${Date.now()}`;
    setLoading(true);
    setStatus(`Creating bucket ${bucketName}...`);

    try {
      await S3Service.createBucket(activeConnection, bucketName);
      setStatus(`Bucket ${bucketName} created successfully!`);
      await loadBuckets(); // Refresh bucket list
    } catch (error) {
      setStatus(`Failed to create bucket: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const createTestFolder = async () => {
    if (!activeConnection || !selectedBucket) {
      setStatus('No connection or bucket selected');
      return;
    }

    const folderName = `test-folder-${Date.now()}`;
    setLoading(true);
    setStatus(`Creating folder ${folderName}...`);

    try {
      await S3Service.createFolder(activeConnection, selectedBucket, folderName);
      setStatus(`Folder ${folderName} created successfully!`);
      await loadObjects(selectedBucket); // Refresh object list
    } catch (error) {
      setStatus(`Failed to create folder: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const generateDownloadUrl = async (objectKey: string) => {
    if (!activeConnection || !selectedBucket) {
      setStatus('No connection or bucket selected');
      return;
    }

    setLoading(true);
    setStatus(`Generating download URL for ${objectKey}...`);

    try {
      const response = await S3Service.generateDownloadUrl(activeConnection, selectedBucket, objectKey, 3600);
      setStatus(`Download URL generated (expires in ${response.expires_in}s)`);
      window.open(response.url, '_blank');
    } catch (error) {
      setStatus(`Failed to generate download URL: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeConnection && connectionTest === true) {
      loadBuckets();
    }
  }, [activeConnection, connectionTest]);

  if (!activeConnection) {
    return (
      <div className="p-6 bg-warning/10 rounded-lg border border-warning">
        <h2 className="text-2xl font-bold mb-4 text-warning">⚠️ No S3 Connection</h2>
        <p>Please configure an S3 connection in Settings before using the demo.</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-base-100 rounded-lg shadow-lg space-y-6">
      <h2 className="text-2xl font-bold text-primary">🔗 S3 Service Demo</h2>
      
      {/* Connection Info */}
      <div className="bg-base-200 p-4 rounded">
        <h3 className="font-semibold mb-2">Active Connection</h3>
        <div className="text-sm space-y-1">
          <div><strong>Name:</strong> {activeConnection.name}</div>
          <div><strong>Endpoint:</strong> {activeConnection.endpoint}</div>
          <div><strong>Region:</strong> {activeConnection.region || 'default'}</div>
          <div><strong>Service:</strong> {activeConnection.serviceType}</div>
        </div>
      </div>

      {/* Connection Test */}
      <div className="space-y-2">
        <button
          className="btn btn-primary"
          onClick={testConnection}
          disabled={loading}
        >
          {loading ? <span className="loading loading-spinner loading-sm"></span> : '🧪'} Test Connection
        </button>
        
        {connectionTest !== null && (
          <div className={`alert ${connectionTest ? 'alert-success' : 'alert-error'}`}>
            {connectionTest ? '✅ Connection successful!' : '❌ Connection failed'}
          </div>
        )}
      </div>

      {/* Bucket Operations */}
      {connectionTest && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <button
              className="btn btn-secondary"
              onClick={loadBuckets}
              disabled={loading}
            >
              {loading ? <span className="loading loading-spinner loading-sm"></span> : '📦'} Load Buckets
            </button>
            
            <button
              className="btn btn-outline"
              onClick={createTestBucket}
              disabled={loading}
            >
              ➕ Create Test Bucket
            </button>
          </div>

          {/* Bucket List */}
          {buckets.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-semibold">Buckets ({buckets.length})</h4>
              <select
                className="select select-bordered w-full max-w-xs"
                value={selectedBucket}
                onChange={(e) => {
                  setSelectedBucket(e.target.value);
                  if (e.target.value) {
                    loadObjects(e.target.value);
                  }
                }}
              >
                <option value="">Select a bucket...</option>
                {buckets.map((bucket) => (
                  <option key={bucket.name} value={bucket.name}>
                    {bucket.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Object Operations */}
          {selectedBucket && (
            <div className="space-y-2">
              <button
                className="btn btn-outline btn-sm"
                onClick={createTestFolder}
                disabled={loading}
              >
                📁 Create Test Folder
              </button>
            </div>
          )}

          {/* Object List */}
          {objects.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-semibold">Objects in {selectedBucket} ({objects.length})</h4>
              <div className="overflow-x-auto">
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>Key</th>
                      <th>Size</th>
                      <th>Modified</th>
                      <th>Type</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {objects.slice(0, 10).map((obj, index) => (
                      <tr key={index}>
                        <td className="font-mono text-xs">{obj.key}</td>
                        <td>{obj.size ? S3Service.formatFileSize(obj.size) : '-'}</td>
                        <td className="text-xs">{obj.last_modified ? S3Service.formatDate(obj.last_modified) : '-'}</td>
                        <td>{obj.is_folder ? '📁 Folder' : '📄 File'}</td>
                        <td>
                          {!obj.is_folder && (
                            <button
                              className="btn btn-xs btn-ghost"
                              onClick={() => generateDownloadUrl(obj.key)}
                              disabled={loading}
                            >
                              🔗 URL
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {objects.length > 10 && (
                      <tr>
                        <td colSpan={5} className="text-center text-gray-500">
                          ... and {objects.length - 10} more objects
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Status */}
      {status && (
        <div className="bg-base-200 p-3 rounded text-sm">
          <strong>Status:</strong> {status}
        </div>
      )}

      {/* Features List */}
      <div className="border-t border-base-300 pt-4">
        <h3 className="font-semibold mb-3">🚀 Available Features</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <ul className="space-y-1">
            <li>✅ Connection testing</li>
            <li>✅ List buckets</li>
            <li>✅ Create buckets</li>
            <li>✅ List objects with pagination</li>
            <li>✅ Create folders</li>
          </ul>
          <ul className="space-y-1">
            <li>✅ Generate presigned URLs</li>
            <li>✅ File type detection</li>
            <li>✅ Size formatting</li>
            <li>✅ Date formatting</li>
            <li>✅ Error handling</li>
          </ul>
        </div>
      </div>

      {/* Technical Info */}
      <div className="bg-base-200 p-3 rounded text-xs">
        <strong>Technical:</strong> This demo uses the Tauri-based S3 service with AWS SDK for Rust. 
        All operations are performed through the backend for security and performance. 
        Supports AWS S3, MinIO, DigitalOcean Spaces, and other S3-compatible services.
      </div>
    </div>
  );
}