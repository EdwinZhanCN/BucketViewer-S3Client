import { useRef, useEffect, useState } from "react";
import { ConnectIcon, ConnectIconHandle } from "./ui/connect";

interface FileItem {
  id: string;
  name: string;
  type: "file" | "folder";
  size?: string;
  lastModified?: string;
  contentType?: string;
}

interface StatusBarProps {
  selectedBucket?: string;
  selectedFile: FileItem | null;
  connectionStatus?: "connected" | "disconnected" | "connecting";
  settingsLoading?: boolean;
}

export function StatusBar({
  selectedBucket,
  selectedFile,
  connectionStatus = "connected",
  settingsLoading = false,
}: StatusBarProps) {
  const connectIconRef = useRef<ConnectIconHandle>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  // Handle connection status animation
  useEffect(() => {
    if (connectionStatus === "connecting" && !isAnimating) {
      // Start the animation
      connectIconRef.current?.stopAnimation();
      setIsAnimating(true);
    } else if (connectionStatus === "connected" && isAnimating) {
      // Stop the animation after a delay to show completion
      const timeout = setTimeout(() => {
        connectIconRef.current?.stopAnimation();
        setIsAnimating(false);
      }, 500);

      return () => clearTimeout(timeout);
    } else if (connectionStatus === "disconnected") {
      // Stop animation immediately for disconnection
      connectIconRef.current?.stopAnimation();
      setIsAnimating(false);
    }
  }, [connectionStatus, isAnimating]);

  // Handle settings refresh animation
  const [showSettingsUpdated, setShowSettingsUpdated] = useState(false);

  useEffect(() => {
    if (settingsLoading) {
      // Brief animation when settings are refreshed
      connectIconRef.current?.startAnimation();
      setShowSettingsUpdated(true);

      const timeout = setTimeout(() => {
        connectIconRef.current?.stopAnimation();
        setShowSettingsUpdated(false);
      }, 1500);

      return () => clearTimeout(timeout);
    }
  }, [settingsLoading]);

  const getStatusColor = () => {
    switch (connectionStatus) {
      case "connected":
        return "text-success";
      case "connecting":
        return "text-warning";
      case "disconnected":
        return "text-error";
      default:
        return "text-gray-500";
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case "connected":
        return selectedBucket ? `Connected to S3 - Viewing ${selectedBucket}` : "Connected to S3";
      case "connecting":
        return "Testing S3 connection...";
      case "disconnected":
        return "S3 connection not established";
      default:
        return "Connection status unknown";
    }
  };

  return (
    <div className="h-6 bg-base-300 border-t border-base-400 px-4 flex items-center justify-between text-xs">
      <div className="flex items-center gap-2">
        <div className={getStatusColor()}>
          <ConnectIcon ref={connectIconRef} size={15} />
        </div>
        <span className={getStatusColor()}>{getStatusText()}</span>
        {showSettingsUpdated && (
          <span className="text-xs text-success animate-pulse">
            Settings updated
          </span>
        )}
      </div>

      <div className="flex items-center gap-4">
        {selectedBucket && (
          <div className="flex items-center gap-1">
            <span className="text-gray-500">Bucket:</span>
            <span className="font-medium">{selectedBucket}</span>
          </div>
        )}

        {selectedFile && (
          <div className="flex items-center gap-1">
            <span className="text-gray-500">Selected:</span>
            <span className="font-medium">{selectedFile.name}</span>
            {selectedFile.size && (
              <span className="text-gray-400">({selectedFile.size})</span>
            )}
          </div>
        )}

        {!selectedBucket && !selectedFile && (
          <div className="text-gray-500 text-xs">
            Ready to browse S3 storage
          </div>
        )}
      </div>
    </div>
  );
}

export default StatusBar;
