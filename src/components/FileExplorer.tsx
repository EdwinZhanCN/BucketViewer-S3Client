import { FolderIcon, ListIcon, AlertCircleIcon, CheckCircleIcon } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { FileTextIcon } from "./ui/file-text";
import { GripIcon } from "./ui/grip";
import { DownloadIcon } from "./ui/download";
import { DeleteIcon } from "./ui/delete";
import { LinkIcon } from "./ui/link";
import { S3Service, ObjectInfo } from "../services/s3Service";
import { useSettings } from "../services/settingsService";

interface FileItem {
  id: string;
  name: string;
  type: "file" | "folder";
  size?: string;
  lastModified?: string;
  contentType?: string;
}

interface FileExplorerProps {
  bucketName?: string;
  currentPath?: string;
  onPathChange?: (path: string) => void;
  onFileSelect?: (file: FileItem) => void;
}

export function FileExplorer({
  bucketName,
  currentPath = "/",
  onPathChange,
  onFileSelect,
}: FileExplorerProps) {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [sortBy, setSortBy] = useState<"name" | "modified" | "size" | "type">(
    "name",
  );
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [objects, setObjects] = useState<ObjectInfo[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<{[key: string]: string}>({});
  const [activeModal, setActiveModal] = useState<{type: string; file?: FileItem | null; message: string} | null>(null);
  const downloadRef = useRef<HTMLAnchorElement>(null);
  const { settings } = useSettings();

  // Load objects from S3
  useEffect(() => {
    const loadObjects = async () => {
      if (!bucketName || !settings?.connections.length) return;
      
      const activeConnection = settings.connections.find(conn => conn.isDefault) || settings.connections[0];
      if (!activeConnection) return;

      setLoading(true);
      setError(null);
      
      try {
        // For S3, we need to remove the leading slash and ensure trailing slash for directories
        let prefix;
        if (currentPath === "/") {
          prefix = ""; // Root level, no prefix
        } else {
          // Remove leading slash and ensure trailing slash
          prefix = currentPath.substring(1);
          if (!prefix.endsWith('/')) prefix += '/';
        }
        
        console.log(`=== S3 REQUEST ===`);
        console.log(`Current UI Path: "${currentPath}"`);
        console.log(`S3 Prefix: "${prefix}"`);
        
        const response = await S3Service.listObjects(
          activeConnection,
          bucketName,
          prefix,
          "/", // Use delimiter to get folder-like structure
          1000 // Max keys
        );
        
        console.log(`=== S3 RESPONSE ===`);
        console.log(`Found ${response.objects.length} objects and ${response.common_prefixes.length} folders`);
        console.log('Common prefixes (folders):', JSON.stringify(response.common_prefixes, null, 2));
        console.log('Objects:', JSON.stringify(response.objects.map(obj => ({
          key: obj.key,
          size: obj.size,
          is_folder: obj.is_folder
        })), null, 2));
        
        setObjects(response.objects);
        setFolders(response.common_prefixes);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load objects';
        
        // Provide more helpful error messages based on error type
        if (errorMessage.includes('Access denied') || errorMessage.includes('AccessDenied')) {
          setError('Access denied - Please check your S3 credentials and permissions');
        } else if (errorMessage.includes('Invalid credentials') || errorMessage.includes('InvalidAccessKeyId')) {
          setError('Invalid S3 credentials - Please verify your access key and secret key');
        } else if (errorMessage.includes('Network error') || errorMessage.includes('timeout')) {
          setError('Network connectivity issue - Please check your internet connection and endpoint URL');
        } else if (errorMessage.includes('DNS resolution failed')) {
          setError('Cannot resolve S3 endpoint - Please verify the endpoint URL is correct');
        } else {
          setError(errorMessage);
        }
        
        console.error('Failed to load objects:', err);
      } finally {
        setLoading(false);
      }
    };

    loadObjects();
  }, [bucketName, currentPath, settings?.connections]);

  // Convert S3 objects to FileItems
  const convertToFileItems = (): FileItem[] => {
    const items: FileItem[] = [];
    
    console.log(`=== FOLDER EXTRACTION ===`);
    console.log(`Current path: "${currentPath}"`);
    
    // Add folders from common prefixes
    folders.forEach((folderPrefix, index) => {
      console.log(`Processing folder prefix: "${folderPrefix}"`);
      
      // S3 returns full prefixes like "folder1/folder2/"
      // We need to extract just the folder name at the current level
      let folderName;
      
      // Calculate the current prefix we're in (empty for root)
      const currentPrefix = currentPath === "/" ? "" : currentPath.substring(1);
      
      // Remove the current prefix from the beginning of the folderPrefix
      let relativePath = folderPrefix;
      if (currentPrefix && relativePath.startsWith(currentPrefix)) {
        relativePath = relativePath.substring(currentPrefix.length);
      }
      
      // Extract just the next folder name (first segment before any remaining slashes)
      folderName = relativePath.split('/')[0];
      
      console.log(`Extracted folder name: "${folderName || ''}"`);
      
      if (folderName) {
        items.push({
          id: `folder-${index}`,
          name: folderName,
          type: "folder",
        });
      }
    });

    // Add files from objects
    objects.forEach((obj, index) => {
      console.log(`Processing object: "${obj.key}"`);
      
      // S3 returns objects with full keys like "folder1/file.txt" or "folder1/folder2/file.txt"
      // We need to filter and extract just files at the current level
      let fileName;
      
      // Calculate the current prefix we're in (empty for root)
      const currentPrefix = currentPath === "/" ? "" : currentPath.substring(1);
      
      // Skip folder objects (those ending with /)
      if (obj.key.endsWith("/")) {
        return;
      }
      
      // For root level
      if (currentPath === "/") {
        // Include only files without slashes (not in subfolders)
        if (!obj.key.includes("/")) {
          fileName = obj.key;
        }
      } else {
        // For non-root folders:
        // 1. Object must start with current prefix
        // 2. After removing prefix, there should be no more slashes (not in subfolder)
        if (obj.key.startsWith(currentPrefix)) {
          const relativePath = obj.key.substring(currentPrefix.length);
          
          // If we're in folder1/ and find folder1/file.txt, relativePath will be /file.txt
          // Remove leading slash if present
          const cleanPath = relativePath.startsWith("/") ? relativePath.substring(1) : relativePath;
          
          // Only include if there are no more slashes (not in a subfolder)
          if (!cleanPath.includes("/")) {
            fileName = cleanPath;
          }
        }
      }
      
      console.log(`Extracted file name: "${fileName || ''}" for key: "${obj.key}"`);
      
      if (fileName) {
        items.push({
          id: `file-${index}`,
          name: fileName,
          type: obj.is_folder ? "folder" : "file",
          size: obj.size ? S3Service.formatFileSize(obj.size) : undefined,
          lastModified: obj.last_modified ? S3Service.formatDate(obj.last_modified) : undefined,
          contentType: obj.content_type,
        });
      }
    });

    return items;
  };

  const fileItems = convertToFileItems();

  // Breadcrumb paths
  const pathParts = currentPath.split("/").filter(Boolean);
  const breadcrumbs = [
    { name: bucketName || "Root", path: "/" },
  ];
  
  // Build breadcrumb hierarchy with proper paths
  let currentBreadcrumbPath = "/";
  
  pathParts.forEach((part, idx) => {
    // For each segment, build the path up to that point
    currentBreadcrumbPath += part + "/";
    breadcrumbs.push({
      name: part,
      path: currentBreadcrumbPath,
    });
  });

  const handleRefresh = async () => {
    if (!bucketName || !settings?.connections.length) return;
    
    const activeConnection = settings.connections.find(conn => conn.isDefault) || settings.connections[0];
    if (!activeConnection) return;

    setLoading(true);
    setError(null);
    
    try {
      console.log(`=== REFRESH REQUEST ===`);
      console.log(`Path: "${currentPath}"`);
      
      // For S3, we need to remove the leading slash and ensure trailing slash for directories
      let prefix;
      if (currentPath === "/") {
        prefix = ""; // Root level, no prefix
      } else {
        // Remove leading slash and ensure trailing slash
        prefix = currentPath.substring(1);
        if (!prefix.endsWith('/')) prefix += '/';
      }
      console.log(`S3 Prefix: "${prefix}"`);
      
      const response = await S3Service.listObjects(
        activeConnection,
        bucketName,
        prefix,
        "/",
        1000
      );
      
      console.log(`Refresh found ${response.objects.length} objects and ${response.common_prefixes.length} prefixes`);
      
      setObjects(response.objects);
      setFolders(response.common_prefixes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh objects');
    } finally {
      setLoading(false);
    }
  };

  // Handle navigation
  const handlePathClick = (path: string) => {
    console.log(`Breadcrumb navigation to path: "${path}"`);
    if (onPathChange) onPathChange(path);
  };

  // Handle file selection
  const handleFileClick = (file: FileItem) => {
    setSelectedFile(file.id);
    if (onFileSelect) onFileSelect(file);

    if (file.type === "folder") {
      // Build a correct path for the subfolder
      // Always ensure paths end with trailing slash for directories
      const newPath = currentPath === "/" 
        ? `/${file.name}/` 
        : `${currentPath}${currentPath.endsWith("/") ? "" : "/"}${file.name}/`;
      
      console.log(`=== FOLDER NAVIGATION ===`);
      console.log(`From path: "${currentPath}"`);
      console.log(`Folder clicked: "${file.name}"`);
      console.log(`New path: "${newPath}"`);
      
      if (onPathChange) onPathChange(newPath);
    }
  };

  // Generate and cache download URLs for files
  useEffect(() => {
    const generateDownloadUrls = async () => {
      if (!bucketName || !settings?.connections.length) return;
      
      const activeConnection = settings.connections.find(conn => conn.isDefault) || settings.connections[0];
      if (!activeConnection) return;
      
      const fileItems = convertToFileItems().filter(item => item.type === "file");
      const urlMap: {[key: string]: string} = {};
      
      for (const file of fileItems) {
        try {
          let fileKey;
          if (currentPath === "/") {
            fileKey = file.name;
          } else {
            let prefix = currentPath.substring(1);
            if (!prefix.endsWith('/')) prefix += '/';
            fileKey = prefix + file.name;
          }
          
          const response = await S3Service.generateDownloadUrl(activeConnection, bucketName, fileKey, 3600);
          urlMap[file.id] = response.url;
        } catch (err) {
          console.error(`Failed to generate URL for ${file.name}:`, err);
        }
      }
      
      setDownloadUrl(urlMap);
    };
    
    generateDownloadUrls();
  }, [bucketName, currentPath, objects, settings?.connections]);
  
  // Handle file operations
  const handleDownload = async (file: FileItem, event: React.MouseEvent) => {
    event.stopPropagation();
    
    if (!bucketName || !settings?.connections.length || file.type === "folder") return;
    
    if (downloadUrl[file.id]) {
      // We have a cached URL - use it for download
      if (downloadRef.current) {
        downloadRef.current.href = downloadUrl[file.id];
        downloadRef.current.download = file.name;
        downloadRef.current.click();
      } else {
        // Fallback to window.open
        window.open(downloadUrl[file.id], '_blank');
      }
    } else {
      // No cached URL - generate one
      setActiveModal({
        type: 'loading',
        file: file,
        message: `Generating download link for ${file.name}...`
      });
      
      try {
        const activeConnection = settings.connections.find(conn => conn.isDefault) || settings.connections[0];
        if (!activeConnection) throw new Error("No active connection");
        
        // Construct the full S3 key for this file
        let fileKey;
        if (currentPath === "/") {
          fileKey = file.name;
        } else {
          let prefix = currentPath.substring(1);
          if (!prefix.endsWith('/')) prefix += '/';
          fileKey = prefix + file.name;
        }
        
        const response = await S3Service.generateDownloadUrl(activeConnection, bucketName, fileKey, 3600);
        
        // Store URL for future use
        setDownloadUrl(prev => ({...prev, [file.id]: response.url}));
        
        if (downloadRef.current) {
          downloadRef.current.href = response.url;
          downloadRef.current.download = file.name;
          downloadRef.current.click();
        } else {
          // Fallback to window.open
          window.open(response.url, '_blank');
        }
        
        setActiveModal(null);
      } catch (err) {
        console.error('Failed to generate download URL:', err);
        setActiveModal({
          type: 'error',
          file: file,
          message: `Failed to generate download link for ${file.name}. ${err instanceof Error ? err.message : ''}`
        });
      }
    }
  };

  const handleDelete = async (file: FileItem, event: React.MouseEvent) => {
    event.stopPropagation();
    
    if (!bucketName || !settings?.connections.length) return;
    
    const activeConnection = settings.connections.find(conn => conn.isDefault) || settings.connections[0];
    if (!activeConnection) return;

    // Show confirmation modal
    setActiveModal({
      type: 'confirm',
      file: file,
      message: `Are you sure you want to delete "${file.name}"?`
    });
  };
  
  const confirmDelete = async (file: FileItem) => {
    setActiveModal({
      type: 'loading',
      file: file,
      message: `Deleting ${file.name}...`
    });
    
    try {
      if (!settings || !settings.connections.length) throw new Error("No settings available");
      const activeConnection = settings.connections.find(conn => conn.isDefault) || settings.connections[0];
      if (!activeConnection) throw new Error("No active connection");
      if (!bucketName) throw new Error("No bucket selected");
      
      // Construct the full S3 key for this file
      const fileName = file.name;  // Get the name which we know is a string from FileItem interface
      const fileKey = currentPath === "/" 
        ? fileName 
        : `${currentPath.substring(1)}${!currentPath.substring(1).endsWith('/') ? '/' : ''}${fileName}`;
      
      console.log(`=== DELETE OPERATION ===`);
      console.log(`File: "${fileName}"`);
      console.log(`Current path: "${currentPath}"`);
      console.log(`S3 Key for delete: "${fileKey}"`);
      
      await S3Service.deleteObject(activeConnection, bucketName, fileKey);
      
      // Close modal
      setActiveModal(null);
      
      // Refresh the list
      handleRefresh();
    } catch (err) {
      console.error('Failed to delete object:', err);
      setActiveModal({
        type: 'error',
        file: file,
        message: `Failed to delete "${file.name}". ${err instanceof Error ? err.message : ''}`
      });
    }
  };

  const handleCopyLink = async (file: FileItem, event: React.MouseEvent) => {
    event.stopPropagation();
    
    if (!bucketName || !settings?.connections.length || file.type === "folder") return;
    
    // If we already have the URL cached, copy it immediately
    if (downloadUrl[file.id]) {
      try {
        await navigator.clipboard.writeText(downloadUrl[file.id]);
        setActiveModal({
          type: 'success',
          message: `Download link for "${file.name}" copied to clipboard!`
        });
        setTimeout(() => setActiveModal(null), 2000);
      } catch (err) {
        setActiveModal({
          type: 'error',
          message: `Failed to copy link to clipboard.`
        });
      }
      return;
    }
    
    // Otherwise, generate the URL
    setActiveModal({
      type: 'loading',
      file: file,
      message: `Generating link for ${file.name}...`
    });
    
    try {
      const activeConnection = settings.connections.find(conn => conn.isDefault) || settings.connections[0];
      if (!activeConnection) throw new Error("No active connection");
      
      // Construct the full S3 key for this file
      let fileKey;
      if (currentPath === "/") {
        fileKey = file.name;
      } else {
        // Get current prefix without leading slash but with trailing slash
        let prefix = currentPath.substring(1);
        if (!prefix.endsWith('/')) prefix += '/';
        fileKey = prefix + file.name;
      }
      
      console.log(`=== COPY LINK OPERATION ===`);
      console.log(`File: "${file.name}"`);
      console.log(`Current path: "${currentPath}"`);
      console.log(`S3 Key for link: "${fileKey}"`);
      
      const response = await S3Service.generateDownloadUrl(activeConnection, bucketName, fileKey, 3600);
      
      // Cache the URL
      setDownloadUrl(prev => ({...prev, [file.id]: response.url}));
      
      // Copy to clipboard
      await navigator.clipboard.writeText(response.url);
      
      // Show success message
      setActiveModal({
        type: 'success',
        message: `Download link for "${file.name}" copied to clipboard!`
      });
      setTimeout(() => setActiveModal(null), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
      setActiveModal({
        type: 'error',
        file: file,
        message: `Failed to generate link for ${file.name}. ${err instanceof Error ? err.message : ''}`
      });
    }
  };

  // Toggle sort direction or change sort field
  const handleSort = (field: "name" | "modified" | "size" | "type") => {
    if (sortBy === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortDirection("asc");
    }
  };

  // Sort files
  const sortedFiles = [...fileItems].sort((a, b) => {
    // Folders always come first
    if (a.type !== b.type) {
      return a.type === "folder" ? -1 : 1;
    }

    switch (sortBy) {
      case "name":
        return sortDirection === "asc"
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      case "modified":
        if (!a.lastModified || !b.lastModified) return 0;
        return sortDirection === "asc"
          ? a.lastModified.localeCompare(b.lastModified)
          : b.lastModified.localeCompare(a.lastModified);
      case "size":
        if (!a.size || !b.size) return 0;
        // Simple string comparison as this is mock data
        return sortDirection === "asc"
          ? a.size.localeCompare(b.size)
          : b.size.localeCompare(a.size);
      case "type":
        if (!a.contentType || !b.contentType) return 0;
        return sortDirection === "asc"
          ? a.contentType.localeCompare(b.contentType)
          : b.contentType.localeCompare(a.contentType);
      default:
        return 0;
    }
  });

  const getSortIcon = (field: "name" | "modified" | "size" | "type") => {
    if (sortBy !== field) return null;
    return sortDirection === "asc" ? "↑" : "↓";
  };

  return (
    <div className="h-full flex flex-col select-none">
      {/* Toolbar */}
      <div className="p-4 border-b border-base-300 flex items-center justify-between">
        <div className="breadcrumbs text-sm">
          <ul>
            {breadcrumbs.map((crumb, idx) => (
              <li key={idx}>
                <button
                  onClick={() => handlePathClick(crumb.path)}
                  className="hover:underline"
                >
                  {crumb.name}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex items-center gap-2">
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
          <div className="btn-group">
            <button
              className={`btn btn-ghost btn-sm ${viewMode === "list" ? "btn-active" : ""}`}
              onClick={() => setViewMode("list")}
            >
              <ListIcon size={20} />
            </button>
            <button
              className={`btn btn-ghost btn-sm ${viewMode === "grid" ? "btn-active" : ""}`}
              onClick={() => setViewMode("grid")}
            >
              <GripIcon size={20} />
            </button>
          </div>
          <button className="btn btn-sm btn-primary" disabled={!bucketName}>Upload</button>
          <button className="btn btn-sm btn-outline" disabled={!bucketName}>New Folder</button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-error/10 text-error text-sm border-b border-error/20">
          {error}
        </div>
      )}

      {/* File list */}
      <div className="overflow-auto flex-1">
        {loading && sortedFiles.length === 0 ? (
          <div className="text-center py-6">
            <div className="loading loading-spinner loading-md"></div>
            <p className="text-sm text-gray-500 mt-2">Loading files...</p>
          </div>
        ) : viewMode === "list" ? (
          <table className="table">
            <thead>
              <tr>
                <th
                  onClick={() => handleSort("name")}
                  className="cursor-pointer"
                >
                  Name {getSortIcon("name")}
                </th>
                <th
                  onClick={() => handleSort("modified")}
                  className="cursor-pointer"
                >
                  Last Modified {getSortIcon("modified")}
                </th>
                <th
                  onClick={() => handleSort("size")}
                  className="cursor-pointer"
                >
                  Size {getSortIcon("size")}
                </th>
                <th
                  onClick={() => handleSort("type")}
                  className="cursor-pointer"
                >
                  Type {getSortIcon("type")}
                </th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedFiles.length > 0 ? (
                sortedFiles.map((file) => (
                  <tr
                    key={file.id}
                    className={`cursor-pointer ${selectedFile === file.id ? "bg-primary/10" : "hover:bg-base-200"}`}
                    onClick={() => handleFileClick(file)}
                  >
                    <td className="flex items-center gap-2">
                      {file.type === "folder" ? (
                        <FolderIcon size={20} />
                      ) : (
                        <FileTextIcon size={20} />
                      )}
                      <span>{file.name}</span>
                    </td>
                    <td>{file.lastModified || "-"}</td>
                    <td>{file.size || "-"}</td>
                    <td>
                      {file.contentType ||
                        (file.type === "folder" ? "Folder" : "Unknown")}
                    </td>
                    <td>
                      <div className="flex gap-1">
                        {file.type !== "folder" && (
                          <button
                            className="btn btn-xs btn-ghost"
                            onClick={(e) => handleDownload(file, e)}
                            title="Download"
                          >
                            <DownloadIcon size={15} />
                          </button>
                        )}
                        {file.type !== "folder" && (
                          <button
                            className={`btn btn-xs ${downloadUrl[file.id] ? 'btn-success text-white' : 'btn-ghost'}`}
                            onClick={(e) => handleCopyLink(file, e)}
                            title={downloadUrl[file.id] ? "Copy Direct Link" : "Generate Link"}
                          >
                            <LinkIcon size={15} />
                          </button>
                        )}
                        <button
                          className="btn btn-xs btn-ghost btn-error"
                          onClick={(e) => handleDelete(file, e)}
                          title="Delete"
                        >
                          <DeleteIcon size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="text-center py-6 text-gray-500">
                    {!bucketName ? "Select a bucket to view files" : "No files found"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        ) : (
          <div className="p-4">
            {sortedFiles.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                {sortedFiles.map((file) => (
                  <div
                    key={file.id}
                    className={`p-3 border rounded-lg cursor-pointer ${
                      selectedFile === file.id
                        ? "border-primary bg-primary/5"
                        : "border-base-300 hover:border-primary/30"
                    }`}
                    onClick={() => handleFileClick(file)}
                  >
                    <div className="flex flex-col items-center">
                      {file.type === "folder" ? (
                        <FolderIcon size={20} />
                      ) : (
                        <FileTextIcon size={20} />
                      )}
                      <div className="mt-2 text-center">
                        <div
                          className="text-sm font-medium truncate w-full"
                          title={file.name}
                        >
                          {file.name}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {file.size || (file.type === "folder" ? "Folder" : "-")}
                        </div>
                        {file.type !== "folder" && (
                          <div className="flex justify-center gap-1 mt-2">
                            <button
                              className="btn btn-xs btn-ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownload(file, e);
                              }}
                              title="Download"
                            >
                              <DownloadIcon size={15} />
                            </button>
                            <button
                              className={`btn btn-xs ${downloadUrl[file.id] ? 'btn-success text-white' : 'btn-ghost'}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyLink(file, e);
                              }}
                              title={downloadUrl[file.id] ? "Copy Direct Link" : "Generate Link"}
                            >
                              <LinkIcon size={15} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500">
                {!bucketName ? "Select a bucket to view files" : "No files found"}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Status bar */}
      <div className="p-2 border-t border-base-300 bg-base-200 text-sm text-gray-500 flex justify-between">
        <div>{sortedFiles.length} items</div>
        <div>
          Selected:{" "}
          {selectedFile
            ? sortedFiles.find((f) => f.id === selectedFile)?.name || "None"
            : "None"}
        </div>
      </div>
      
      {/* Hidden download link */}
      <a 
        ref={downloadRef} 
        style={{ display: 'none' }} 
        target="_blank" 
        rel="noopener noreferrer"
      ></a>
      
      {/* Modals */}
      {activeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-base-100 p-6 rounded-lg shadow-xl max-w-md w-full">
            {activeModal.type === 'loading' && (
              <div className="text-center">
                <div className="loading loading-spinner loading-lg mb-4"></div>
                <p>{activeModal.message}</p>
              </div>
            )}
            
            {activeModal.type === 'error' && (
              <div className="text-center">
                <div className="bg-error/20 p-3 rounded-full inline-block mb-4">
                  <AlertCircleIcon size={40} className="text-error" />
                </div>
                <p className="mb-6">{activeModal.message}</p>
                <button 
                  className="btn btn-primary"
                  onClick={() => setActiveModal(null)}
                >
                  Close
                </button>
              </div>
            )}
            
            {activeModal.type === 'success' && (
              <div className="text-center">
                <div className="bg-success/20 p-3 rounded-full inline-block mb-4">
                  <CheckCircleIcon size={40} className="text-success" />
                </div>
                <p className="mb-6">{activeModal.message}</p>
                <button 
                  className="btn btn-primary"
                  onClick={() => setActiveModal(null)}
                >
                  Close
                </button>
              </div>
            )}
            
            {activeModal.type === 'confirm' && activeModal.file && (
              <div className="text-center">
                <div className="bg-warning/20 p-3 rounded-full inline-block mb-4">
                  <AlertCircleIcon size={40} className="text-warning" />
                </div>
                <p className="mb-6">{activeModal.message}</p>
                <div className="flex justify-center gap-4">
                  <button 
                    className="btn btn-outline"
                    onClick={() => setActiveModal(null)}
                  >
                    Cancel
                  </button>
                  <button 
                    className="btn btn-error"
                    onClick={() => confirmDelete(activeModal.file!)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default FileExplorer;
