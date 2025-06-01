import { useState, useEffect } from "react";
import { SearchIcon } from "./ui/search";
import { DatabaseIcon } from "lucide-react";
import { S3Service, BucketInfo } from "../services/s3Service";
import { useSettings } from "../services/settingsService";

interface BucketListProps {
  onBucketSelect: (bucketName: string) => void;
  selectedBucket?: string;
}

export function BucketList({
  onBucketSelect,
  selectedBucket,
}: BucketListProps) {
  const [filterText, setFilterText] = useState("");
  const [buckets, setBuckets] = useState<BucketInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { settings } = useSettings();

  // Load buckets from active connection
  useEffect(() => {
    const loadBuckets = async () => {
      if (!settings?.connections.length) return;
      
      // Find the default connection or use the first one
      const activeConnection = settings.connections.find(conn => conn.isDefault) || settings.connections[0];
      
      if (!activeConnection) return;

      setLoading(true);
      setError(null);
      
      try {
        const bucketList = await S3Service.listBuckets(activeConnection);
        setBuckets(bucketList);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load buckets';
        
        // Provide more helpful error messages based on error type
        if (errorMessage.includes('Access denied') || errorMessage.includes('AccessDenied')) {
          setError('Access denied - Please check your S3 credentials and permissions in Settings');
        } else if (errorMessage.includes('Invalid credentials') || errorMessage.includes('InvalidAccessKeyId')) {
          setError('Invalid S3 credentials - Please verify your access key and secret key in Settings');
        } else if (errorMessage.includes('Network error') || errorMessage.includes('timeout')) {
          setError('Network connectivity issue - Please check your internet connection and endpoint URL');
        } else if (errorMessage.includes('DNS resolution failed')) {
          setError('Cannot resolve S3 endpoint - Please verify the endpoint URL is correct in Settings');
        } else {
          setError(`Failed to load buckets: ${errorMessage}`);
        }
        
        console.error('Failed to load buckets:', err);
      } finally {
        setLoading(false);
      }
    };

    loadBuckets();
  }, [settings?.connections]);

  const filteredBuckets = buckets.filter((bucket) =>
    bucket.name.toLowerCase().includes(filterText.toLowerCase()),
  );

  const handleRefresh = async () => {
    if (!settings?.connections.length) return;
    
    const activeConnection = settings.connections.find(conn => conn.isDefault) || settings.connections[0];
    if (!activeConnection) return;

    setLoading(true);
    setError(null);
    
    try {
      const bucketList = await S3Service.listBuckets(activeConnection);
      setBuckets(bucketList);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh buckets';
      
      if (errorMessage.includes('Access denied') || errorMessage.includes('AccessDenied')) {
        setError('Access denied - Please check your S3 credentials in Settings');
      } else if (errorMessage.includes('Invalid credentials')) {
        setError('Invalid S3 credentials - Please verify your access key and secret key in Settings');
      } else {
        setError(`Failed to refresh buckets: ${errorMessage}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-base-300">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium">Buckets</h2>
          <button 
            className="btn btn-sm btn-ghost"
            onClick={handleRefresh}
            disabled={loading}
          >
            {loading ? (
              <span className="loading loading-spinner loading-xs"></span>
            ) : (
              "Refresh"
            )}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search buckets..."
            className="input input-sm input-bordered w-full"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
          />
          <SearchIcon size={20} />
        </div>
        {error && (
          <div className="alert alert-error mt-2 text-sm">
            <div>
              <span>{error}</span>
              {error.includes('Settings') && (
                <div className="mt-2">
                  <button 
                    className="btn btn-xs btn-outline"
                    onClick={() => window.location.hash = '#settings'}
                  >
                    Go to Settings
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="overflow-y-auto flex-1">
        <div className="p-2">
          {loading && buckets.length === 0 ? (
            <div className="text-center py-6">
              <div className="loading loading-spinner loading-md"></div>
              <p className="text-sm text-gray-500 mt-2">Loading buckets...</p>
            </div>
          ) : filteredBuckets.length > 0 ? (
            filteredBuckets.map((bucket) => (
              <div
                key={bucket.name}
                onClick={() => onBucketSelect(bucket.name)}
                className={`p-3 mb-2 rounded-lg cursor-pointer transition-colors ${
                  selectedBucket === bucket.name
                    ? "bg-primary/10 border border-primary/30"
                    : "hover:bg-base-300"
                }`}
              >
                <div className="flex items-center gap-2">
                  <DatabaseIcon size={20} />
                  <div className="flex-1">
                    <h3 className="font-medium">{bucket.name}</h3>
                    <div className="text-xs text-gray-500 mt-1">
                      {bucket.creation_date && (
                        <span>Created: {S3Service.formatDate(bucket.creation_date)}</span>
                      )}
                      {bucket.region && (
                        <span className="ml-2">Region: {bucket.region}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : !loading && !error ? (
            <div className="text-center py-6 text-gray-500">
              {settings?.connections.length ? (
                filterText ? "No buckets match your search" : 
                error ? "Unable to load buckets due to connection issues" : "No buckets found"
              ) : (
                <div>
                  <p>No S3 connections configured</p>
                  <p className="text-xs mt-1">Add a connection in Settings to get started</p>
                  <button 
                    className="btn btn-xs btn-primary mt-2"
                    onClick={() => window.location.hash = '#settings'}
                  >
                    Go to Settings
                  </button>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>

      <div className="p-4 border-t border-base-300">
        <button 
          className="btn btn-sm btn-primary w-full"
          disabled={!settings?.connections.length}
        >
          Create New Bucket
        </button>
      </div>
    </div>
  );
}

export default BucketList;
