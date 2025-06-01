import { useState, useEffect } from "react";
import { useSettings, ConnectionConfig } from "../services/settingsService";
import { FileDialogService } from "../services/fileDialogService";
import { S3Service } from "../services/s3Service";
import { S3Demo } from "./S3Demo";
import { invoke } from '@tauri-apps/api/core';

export function Settings() {
  const [activeTab, setActiveTab] = useState<
    "general" | "connections" | "appearance" | "s3demo"
  >("general");
  const [refreshing, setRefreshing] = useState(false);

  // Use our settings hook
  const { 
    settings, 
    isLoading, 
    error, 
    updateGeneralSettings,
    updateAppearanceSettings,
    addConnection,
    updateConnection,
    removeConnection,
    exportSettings: handleExportSettings, 
    importSettings: handleImportSettings,
    refreshSettings,
    downloadSettingsFile
  } = useSettings();

  // Show refresh indicator temporarily when settings are refreshed
  useEffect(() => {
    // When loading starts, set refreshing to true
    if (isLoading) {
      setRefreshing(true);
    } else {
      // When loading ends, set a timeout to clear the refreshing state
      const timer = setTimeout(() => {
        setRefreshing(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  const [currentConnection, setCurrentConnection] =
    useState<ConnectionConfig | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [testingConnection, setTestingConnection] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<{[key: string]: boolean | string}>({});
  const [pingResults, setPingResults] = useState<{[key: string]: string}>({});
  const [pingingEndpoint, setPingingEndpoint] = useState<string | null>(null);



  const handleEditConnection = (connection: ConnectionConfig) => {
    setCurrentConnection({ ...connection });
    setIsEditing(true);
  };

  const handleTestConnection = async (connection: ConnectionConfig) => {
    setTestingConnection(connection.name);
    setTestResults(prev => ({ ...prev, [connection.name]: 'testing' }));
    
    try {
      const isConnected = await S3Service.testConnection(connection);
      setTestResults(prev => ({ ...prev, [connection.name]: isConnected }));
    } catch (err) {
      setTestResults(prev => ({ 
        ...prev, 
        [connection.name]: err instanceof Error ? err.message : 'Connection failed' 
      }));
    } finally {
      setTestingConnection(null);
    }
  };

  const handlePingEndpoint = async (endpoint: string, connectionName: string) => {
    setPingingEndpoint(connectionName);
    setPingResults(prev => ({ ...prev, [connectionName]: 'pinging...' }));
    
    try {
      const result = await invoke<string>('ping_endpoint', { endpoint });
      setPingResults(prev => ({ ...prev, [connectionName]: result }));
    } catch (err) {
      setPingResults(prev => ({ 
        ...prev, 
        [connectionName]: err instanceof Error ? err.message : 'Ping failed' 
      }));
    } finally {
      setPingingEndpoint(null);
    }
  };

  const handleSaveConnection = async () => {
    if (!currentConnection) return;

    try {
      if (isEditing) {
        const connectionIndex = settings?.connections.findIndex((conn) =>
          conn.name === currentConnection.name
        ) ?? -1;
        if (connectionIndex >= 0) {
          await updateConnection(connectionIndex, currentConnection);
        }
      } else {
        await addConnection(currentConnection);
      }

      setCurrentConnection(null);
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to save connection:', err);
    }
  };

  const handleDeleteConnection = async (name: string) => {
    if (!settings?.connections) return;
    
    try {
      const connectionIndex = settings.connections.findIndex((conn) => conn.name === name);
      if (connectionIndex >= 0) {
        await removeConnection(connectionIndex);
      }
    } catch (err) {
      console.error('Failed to delete connection:', err);
    }
  };

  const handleImportClick = async () => {
    try {
      const filePath = await FileDialogService.openJsonFile();
      if (filePath) {
        await handleImportSettings(filePath);
        alert("Settings imported successfully");
      }
    } catch (err) {
      alert(
        "Failed to import settings: " +
          (err instanceof Error ? err.message : "Unknown error"),
      );
    }
  };

  const handleExportClick = async () => {
    try {
      const filePath = await FileDialogService.saveJsonFile("settings-backup.json");
      if (filePath) {
        await handleExportSettings(filePath);
        alert("Settings exported successfully");
      }
    } catch (err) {
      alert(
        "Failed to export settings: " +
          (err instanceof Error ? err.message : "Unknown error"),
      );
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="loading loading-spinner loading-lg"></div>
        <span className="ml-2">Loading settings...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-error mb-4">Failed to load settings: {error}</p>
          <button className="btn btn-primary" onClick={refreshSettings}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="h-full flex items-center justify-center">
        <p>No settings available</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-base-300">
        <h2 className="text-xl font-bold">Settings</h2>
        <p className="text-sm text-gray-500">
          Configure your BucketViewer experience
        </p>
        {refreshing && (
          <div className="text-xs text-success animate-pulse mt-1 flex items-center gap-1">
            <div className="loading loading-spinner loading-xs"></div>
            <span>Settings refreshed from file</span>
          </div>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-48 border-r border-base-300 p-4">
          <ul className="space-y-2">
            <li>
              <button
                className={`w-full text-left px-3 py-2 rounded-lg ${activeTab === "general" ? "bg-primary/10 text-primary font-medium" : "hover:bg-base-200"}`}
                onClick={() => setActiveTab("general")}
              >
                General
              </button>
            </li>
            <li>
              <button
                className={`w-full text-left px-3 py-2 rounded-lg ${activeTab === "connections" ? "bg-primary/10 text-primary font-medium" : "hover:bg-base-200"}`}
                onClick={() => setActiveTab("connections")}
              >
                Connections
              </button>
            </li>
            <li>
              <button
                className={`w-full text-left px-3 py-2 rounded-lg ${activeTab === "appearance" ? "bg-primary/10 text-primary font-medium" : "hover:bg-base-200"}`}
                onClick={() => setActiveTab("appearance")}
              >
                Appearance
              </button>
            </li>
            <li>
              <button
                className={`w-full text-left px-3 py-2 rounded-lg ${activeTab === "s3demo" ? "bg-primary/10 text-primary font-medium" : "hover:bg-base-200"}`}
                onClick={() => setActiveTab("s3demo")}
              >
                S3 Demo
              </button>
            </li>
          </ul>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === "general" && (
            <div>
              <h3 className="text-lg font-medium mb-4">General Settings</h3>

              <div className="form-control w-full max-w-xs mb-4">
                <label className="label">
                  <span className="label-text">Auto-refresh</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="toggle toggle-primary"
                    checked={settings.general.autoRefresh}
                    onChange={(e) =>
                      updateGeneralSettings({
                        ...settings.general,
                        autoRefresh: e.target.checked,
                      })
                    }
                  />
                  <span className="text-sm text-gray-500">
                    Automatically refresh bucket contents
                  </span>
                </div>
              </div>

              {settings.general.autoRefresh && (
                <div className="form-control w-full max-w-xs mb-4">
                  <label className="label">
                    <span className="label-text">
                      Refresh interval (seconds)
                    </span>
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={300}
                    className="input input-bordered w-full"
                    value={settings.general.refreshInterval}
                    onChange={(e) =>
                      updateGeneralSettings({
                        ...settings.general,
                        refreshInterval: parseInt(e.target.value) || 30
                      })
                    }
                  />
                </div>
              )}

              <div className="form-control w-full max-w-xs mb-4">
                <label className="label">
                  <span className="label-text">Default download location</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="input input-bordered w-full"
                    placeholder="/path/to/downloads"
                    readOnly
                  />
                  <button className="btn btn-outline">Browse...</button>
                </div>
              </div>

              <div className="mt-8 flex gap-2">
                <button className="btn btn-outline" onClick={refreshSettings}>
                  <span>Refresh from File</span>
                </button>
                <button 
                  className="btn btn-primary" 
                  onClick={downloadSettingsFile}
                >
                  Download Current Settings
                </button>
                <button
                  className="btn btn-outline"
                  onClick={handleExportClick}
                >
                  Export Backup
                </button>
                <button className="btn btn-outline" onClick={handleImportClick}>
                  Import Settings
                </button>
              </div>
              <div className="mt-2 text-xs text-gray-500">
                <p>• Settings automatically download when changed</p>
                <p>• Replace your settings.json file with downloaded version</p>
                <p>• Changes will be detected and applied automatically</p>
              </div>
              {isLoading && !refreshing && (
                <p className="mt-2 text-sm">Loading settings...</p>
              )}
              {error && (
                <p className="mt-2 text-sm text-error">
                  Error: {error}
                </p>
              )}
            </div>
          )}

          {activeTab === "connections" && (
            <>
              {!currentConnection ? (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium">Connection Profiles</h3>
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => {
                        setCurrentConnection({
                          name: "",
                          serviceType: "Amazon S3",
                          endpoint: "",
                          accessKey: "",
                          secretKey: "",
                          region: "",
                          isDefault: false,
                        });
                        setIsEditing(false);
                      }}
                    >
                      Add Connection
                    </button>
                  </div>

                  <table className="table w-full">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Endpoint</th>
                        <th>Region</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {settings.connections.map((conn) => {
                        const testResult = testResults[conn.name];
                        return (
                          <tr key={conn.name}>
                            <td>
                              <div className="flex items-center gap-2">
                                {conn.name}
                                {conn.isDefault && (
                                  <span className="badge badge-primary badge-xs">default</span>
                                )}
                              </div>
                            </td>
                            <td className="text-sm">{conn.endpoint}</td>
                            <td>{conn.region || "Default"}</td>
                            <td>
                              {testResult === 'testing' ? (
                                <div className="flex items-center gap-1">
                                  <span className="loading loading-spinner loading-xs"></span>
                                  <span className="text-xs">Testing...</span>
                                </div>
                              ) : testResult === true ? (
                                <span className="text-success text-xs">✓ Connected</span>
                              ) : testResult === false ? (
                                <span className="text-error text-xs">✗ Failed</span>
                              ) : typeof testResult === 'string' && testResult !== 'testing' ? (
                                <div className="tooltip tooltip-left" data-tip={testResult}>
                                  <span className="text-error text-xs">✗ Error</span>
                                </div>
                              ) : (
                                <span className="text-gray-400 text-xs">Not tested</span>
                              )}
                            </td>
                            <td>
                              <div className="flex gap-1">
                                <button
                                  className="btn btn-xs btn-ghost"
                                  onClick={() => handlePingEndpoint(conn.endpoint, conn.name)}
                                  disabled={pingingEndpoint === conn.name}
                                  title="Test basic connectivity"
                                >
                                  {pingingEndpoint === conn.name ? '...' : 'Ping'}
                                </button>
                                <button
                                  className="btn btn-xs btn-ghost"
                                  onClick={() => handleTestConnection(conn)}
                                  disabled={testingConnection === conn.name}
                                  title="Test S3 connection"
                                >
                                  {testingConnection === conn.name ? '...' : 'Test'}
                                </button>
                                <button
                                  className="btn btn-xs btn-ghost"
                                  onClick={() => handleEditConnection(conn)}
                                >
                                  Edit
                                </button>
                                <button
                                  className="btn btn-xs btn-ghost btn-error"
                                  onClick={() =>
                                    handleDeleteConnection(conn.name)
                                  }
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-medium">
                      {isEditing
                        ? `Edit Connection: ${currentConnection.name}`
                        : "New Connection"}
                    </h3>
                    <button
                      className="btn btn-sm btn-ghost"
                      onClick={() => setCurrentConnection(null)}
                    >
                      Cancel
                    </button>
                  </div>

                  <div className="space-y-4 max-w-md">
                    <div className="form-control w-full">
                      <label className="label">
                        <span className="label-text">Connection Name</span>
                      </label>
                      <input
                        type="text"
                        className="input input-bordered w-full"
                        value={currentConnection.name}
                        onChange={(e) =>
                          setCurrentConnection({
                            ...currentConnection,
                            name: e.target.value,
                          })
                        }
                        disabled={isEditing}
                      />
                    </div>

                    <div className="form-control w-full">
                      <label className="label">
                        <span className="label-text">Service Type</span>
                      </label>
                      <select
                        className="select select-bordered w-full"
                        value={currentConnection.serviceType}
                        onChange={(e) =>
                          setCurrentConnection({
                            ...currentConnection,
                            serviceType: e.target.value,
                          })
                        }
                      >
                        <option>Amazon S3</option>
                        <option>MinIO</option>
                        <option>DigitalOcean Spaces</option>
                        <option>Google Cloud Storage</option>
                        <option>Custom S3 Compatible</option>
                      </select>
                    </div>

                    <div className="form-control w-full">
                      <label className="label">
                        <span className="label-text">Endpoint URL</span>
                      </label>
                      <input
                        type="text"
                        className="input input-bordered w-full"
                        placeholder="https://s3.amazonaws.com or http://localhost:9000"
                        value={currentConnection.endpoint}
                        onChange={(e) =>
                          setCurrentConnection({
                            ...currentConnection,
                            endpoint: e.target.value,
                          })
                        }
                      />
                      <div className="text-xs text-gray-500 mt-1">
                        Examples: https://s3.amazonaws.com, http://localhost:9000, https://nyc3.digitaloceanspaces.com
                      </div>
                    </div>

                    <div className="form-control w-full">
                      <label className="label">
                        <span className="label-text">Access Key</span>
                      </label>
                      <input
                        type="text"
                        className="input input-bordered w-full"
                        value={currentConnection.accessKey}
                        onChange={(e) =>
                          setCurrentConnection({
                            ...currentConnection,
                            accessKey: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div className="form-control w-full">
                      <label className="label">
                        <span className="label-text">Secret Key</span>
                      </label>
                      <input
                        type="password"
                        className="input input-bordered w-full"
                        value={currentConnection.secretKey}
                        onChange={(e) =>
                          setCurrentConnection({
                            ...currentConnection,
                            secretKey: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div className="form-control w-full">
                      <label className="label">
                        <span className="label-text">Region (Optional)</span>
                      </label>
                      <input
                        type="text"
                        className="input input-bordered w-full"
                        placeholder="us-east-1"
                        value={currentConnection.region}
                        onChange={(e) =>
                          setCurrentConnection({
                            ...currentConnection,
                            region: e.target.value,
                          })
                        }
                      />
                      <div className="text-xs text-gray-500 mt-1">
                        Leave empty for default region. Examples: us-east-1, eu-west-1, ap-southeast-1
                      </div>
                    </div>

                    <div className="form-control mb-4">
                      <label className="label cursor-pointer justify-start gap-2">
                        <input
                          type="checkbox"
                          className="checkbox checkbox-primary"
                          checked={currentConnection.isDefault}
                          onChange={(e) =>
                            setCurrentConnection({
                              ...currentConnection,
                              isDefault: e.target.checked,
                            })
                          }
                        />
                        <span className="label-text">
                          Set as default connection
                        </span>
                      </label>
                    </div>

                    <div className="pt-4 space-y-2">
                      <button
                        className="btn btn-outline btn-sm w-full"
                        onClick={() => currentConnection && handlePingEndpoint(currentConnection.endpoint, currentConnection.name || 'temp')}
                        disabled={!currentConnection?.endpoint || pingingEndpoint === (currentConnection?.name || 'temp')}
                      >
                        {pingingEndpoint === (currentConnection?.name || 'temp') ? (
                          <>
                            <span className="loading loading-spinner loading-xs"></span>
                            Pinging...
                          </>
                        ) : (
                          'Ping Endpoint'
                        )}
                      </button>
                      
                      {currentConnection?.name && pingResults[currentConnection.name] && (
                        <div className={`alert text-xs ${pingResults[currentConnection.name].includes('reachable') ? 'alert-success' : 'alert-warning'}`}>
                          <span>{pingResults[currentConnection.name]}</span>
                        </div>
                      )}
                      
                      <button
                        className="btn btn-outline w-full"
                        onClick={() => currentConnection && handleTestConnection(currentConnection)}
                        disabled={!currentConnection?.endpoint || !currentConnection?.accessKey || testingConnection === currentConnection?.name}
                      >
                        {testingConnection === currentConnection?.name ? (
                          <>
                            <span className="loading loading-spinner loading-xs"></span>
                            Testing S3...
                          </>
                        ) : (
                          'Test S3 Connection'
                        )}
                      </button>
                      
                      {currentConnection?.name && testResults[currentConnection.name] && typeof testResults[currentConnection.name] === 'string' && testResults[currentConnection.name] !== 'testing' && (
                        <div className="alert alert-error text-xs">
                          <span>{testResults[currentConnection.name]}</span>
                        </div>
                      )}
                      
                      <button
                        className="btn btn-primary w-full"
                        onClick={handleSaveConnection}
                        disabled={!currentConnection?.name || !currentConnection?.endpoint || !currentConnection?.accessKey || !currentConnection?.secretKey}
                      >
                        Save Connection
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === "appearance" && (
            <div>
              <h3 className="text-lg font-medium mb-4">Appearance Settings</h3>
              <div className="form-control w-full max-w-xs mb-4">
                <label className="label">
                  <span className="label-text">Theme</span>
                </label>
                <select
                  className="select select-bordered w-full"
                  value={settings.appearance.theme}
                  onChange={(e) =>
                    updateAppearanceSettings({
                      ...settings.appearance,
                      theme: e.target.value,
                    })
                  }
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="system">System</option>
                </select>
              </div>

              <div className="form-control w-full max-w-xs mb-4">
                <label className="label">
                  <span className="label-text">Font Size</span>
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-sm">Small</span>
                  <input
                    type="range"
                    min={0}
                    max={2}
                    className="range range-primary"
                    step={1}
                    value={settings.appearance.fontSize}
                    onChange={(e) =>
                      updateAppearanceSettings({
                        ...settings.appearance,
                        fontSize: parseInt(e.target.value),
                      })
                    }
                  />
                  <span className="text-sm">Large</span>
                </div>
              </div>

              <div className="form-control mb-4">
                <label className="label cursor-pointer justify-start gap-2">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-primary"
                    checked={settings.appearance.showHiddenFiles}
                    onChange={(e) =>
                      updateAppearanceSettings({
                        ...settings.appearance,
                        showHiddenFiles: e.target.checked,
                      })
                    }
                  />
                  <span className="label-text">Show hidden files</span>
                </label>
              </div>

              <div className="form-control mb-4">
                <label className="label cursor-pointer justify-start gap-2">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-primary"
                    checked={settings.appearance.showFileExtensions}
                    onChange={(e) =>
                      updateAppearanceSettings({
                        ...settings.appearance,
                        showFileExtensions: e.target.checked,
                      })
                    }
                  />
                  <span className="label-text">Show file extensions</span>
                </label>
              </div>

              <div className="mt-8">
                <button 
                  className="btn btn-primary" 
                  onClick={downloadSettingsFile}
                >
                  Download Current Settings
                </button>
              </div>
            </div>
          )}

          {activeTab === "s3demo" && (
            <div>
              <h3 className="text-lg font-medium mb-4">S3 Service Demo</h3>
              <S3Demo />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Settings;
