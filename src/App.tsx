import { useState, useEffect, useCallback, useRef } from "react";
import SideBar from "@/components/SideBar";
import BucketList from "@/components/BucketList";
import FileExplorer from "@/components/FileExplorer";
import Settings from "@/components/Settings";
import { Header } from "@/components/Header";
import { StatusBar } from "@/components/StatusBar";
import { useSettings } from "@/services/settingsService";
import { Toast, useToast } from "@/components/Toast";
import { S3Service } from "@/services/s3Service";

// Define the file item interface for file operations
interface FileItem {
  id: string;
  name: string;
  type: "file" | "folder";
  size?: string;
  lastModified?: string;
  contentType?: string;
}

function App() {
  const [activePage, setActivePage] = useState<
    "buckets" | "files" | "settings"
  >("buckets");
  const [selectedBucket, setSelectedBucket] = useState<string | undefined>();
  const [currentPath, setCurrentPath] = useState("/");
  // We'll use selectedFile state to track the currently selected file
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "disconnected" | "connecting">("disconnected");
  const [settingsRefreshed, setSettingsRefreshed] = useState(false);
  const [activeConnection, setActiveConnection] = useState<string | null>(null);
  
  // Get settings from our settings service
  const { settings, isLoading } = useSettings();
  const prevLoadingRef = useRef(isLoading);
  
  // Toast notifications
  const { toasts, removeToast } = useToast();
  
  // Toast functions are now handled internally by the settings service

  // Apply theme from settings
  const applyTheme = useCallback(() => {
    if (!settings) return;
    
    let theme: string;
    
    if (settings.appearance.theme === 'system') {
      // Check system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      theme = prefersDark ? 'dark' : 'light';
    } else {
      theme = settings.appearance.theme;
    }
    
    document.documentElement.setAttribute('data-theme', theme);
  }, [settings]);
  
  // Apply theme when settings change or component loads
  useEffect(() => {
    // Track settings refresh events
    if (prevLoadingRef.current && !isLoading) {
      // Loading completed
      setSettingsRefreshed(true);
      const timer = setTimeout(() => {
        setSettingsRefreshed(false);
      }, 1500);
      return () => clearTimeout(timer);
    }
    prevLoadingRef.current = isLoading;
    
    if (!isLoading) {
      applyTheme();
    }
  }, [settings, isLoading, applyTheme]);
  
  // Listen for system theme changes if using system theme
  useEffect(() => {
    if (settings?.appearance.theme !== 'system') return;
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => applyTheme();
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [settings?.appearance.theme, applyTheme]);

  // Test S3 connection when settings change
  useEffect(() => {
    const testConnection = async () => {
      if (!settings?.connections.length) {
        setConnectionStatus("disconnected");
        setActiveConnection(null);
        return;
      }

      const defaultConnection = settings.connections.find(conn => conn.isDefault) || settings.connections[0];
      
      if (!defaultConnection) {
        setConnectionStatus("disconnected");
        setActiveConnection(null);
        return;
      }

      if (activeConnection === defaultConnection.name && connectionStatus === "connected") {
        return; // Already connected to this connection
      }

      setConnectionStatus("connecting");
      setActiveConnection(defaultConnection.name);
      
      try {
        const isConnected = await S3Service.testConnection(defaultConnection);
        setConnectionStatus(isConnected ? "connected" : "disconnected");
      } catch (error) {
        setConnectionStatus("disconnected");
        console.error('S3 connection test failed:', error);
      }
    };

    testConnection();
  }, [settings?.connections, activeConnection]);

  // Handle navigation between main sections
  const handleNavigation = (page: "buckets" | "files" | "settings") => {
    setActivePage(page);
  };

  // Handle bucket selection
  const handleBucketSelect = (bucketName: string) => {
    // Check if we have a valid connection configuration
    if (!settings?.connections.length) {
      alert("No S3 connections configured. Please add a connection in Settings.");
      return;
    }

    const defaultConnection = settings.connections.find(conn => conn.isDefault) || settings.connections[0];
    if (!defaultConnection) {
      alert("No valid S3 connection found. Please configure a connection in Settings.");
      return;
    }

    // If connection status is connecting, wait a moment
    if (connectionStatus === "connecting") {
      alert("Connection test in progress. Please wait a moment and try again.");
      return;
    }

    // Allow bucket access even if connection test failed, since the demo works
    setSelectedBucket(bucketName);
    setActivePage("files");
    setCurrentPath("/");
    setSelectedFile(null); // Reset selected file when changing buckets
  };

  // Handle file selection
  const handleFileSelect = (file: FileItem) => {
    setSelectedFile(file);
  };

  // Handle path navigation within a bucket
  const handlePathChange = (newPath: string) => {
    setCurrentPath(newPath);
    // Reset selected file when changing paths
    setSelectedFile(null);
  };

  // Render the appropriate content based on active page
  const renderContent = () => {
    switch (activePage) {
      case "buckets":
        return (
          <BucketList
            onBucketSelect={handleBucketSelect}
            selectedBucket={selectedBucket}
          />
        );
      case "files":
        return (
          <FileExplorer
            bucketName={selectedBucket}
            currentPath={currentPath}
            onPathChange={handlePathChange}
            onFileSelect={handleFileSelect}
          />
        );
      case "settings":
        return <Settings />;
      default:
        return (
          <div className="h-full flex items-center justify-center text-xl text-gray-500">
            Select an option from the sidebar
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Header currentBucket={selectedBucket} />
      {/* Only show loading screen on initial load, not on refreshes */}
      {isLoading && !settings && (
        <div className="absolute inset-0 bg-base-100/80 flex items-center justify-center z-50">
          <div className="loading loading-spinner loading-lg"></div>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-col justify-between bg-base-200 w-56">
          <SideBar activePage={activePage} onNavigate={handleNavigation} />
          <div className="p-4 text-center text-sm border-t border-base-300">
            <p>BucketViewer v0.1.0</p>
            <p className="text-xs text-gray-500 mt-1">
              © 2024 All rights reserved
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-hidden">{renderContent()}</div>
      </div>

      {/* Status bar */}
      <StatusBar 
        selectedBucket={selectedBucket}
        selectedFile={selectedFile}
        connectionStatus={connectionStatus}
        settingsLoading={settingsRefreshed}
      />
      
      {/* Toast notifications */}
      <Toast toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

export default App;
