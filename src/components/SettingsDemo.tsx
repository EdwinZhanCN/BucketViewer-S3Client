import { useState } from 'react';
import { useSettings } from '../services/settingsService';

export function SettingsDemo() {
  const {
    settings,
    isLoading,
    error,
    updateGeneralSettings,
    updateAppearanceSettings,
    addConnection,
    removeConnection,
    resetSettings
  } = useSettings();

  const [demoStatus, setDemoStatus] = useState<string>('');

  const handleQuickTest = async () => {
    try {
      setDemoStatus('Testing settings system...');
      
      // Test 1: Update general settings
      if (settings) {
        await updateGeneralSettings({
          ...settings.general,
          autoRefresh: !settings.general.autoRefresh
        });
        setDemoStatus('✅ General settings updated');
        
        // Test 2: Update appearance
        await updateAppearanceSettings({
          ...settings.appearance,
          theme: settings.appearance.theme === 'light' ? 'dark' : 'light'
        });
        setDemoStatus('✅ Appearance settings updated');
        
        // Test 3: Add a test connection
        await addConnection({
          name: 'Demo Connection',
          serviceType: 'MinIO',
          endpoint: 'http://demo.example.com:9000',
          accessKey: 'demo-key',
          secretKey: 'demo-secret',
          region: 'us-east-1',
          isDefault: false
        });
        setDemoStatus('✅ Test connection added');
        
        setTimeout(() => {
          setDemoStatus('All tests completed successfully! 🎉');
        }, 1000);
      }
    } catch (err) {
      setDemoStatus(`❌ Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleCleanup = async () => {
    try {
      if (settings) {
        // Remove demo connection
        const demoIndex = settings.connections.findIndex(c => c.name === 'Demo Connection');
        if (demoIndex >= 0) {
          await removeConnection(demoIndex);
          setDemoStatus('🧹 Demo connection removed');
        }
      }
    } catch (err) {
      setDemoStatus(`❌ Cleanup error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleResetDemo = async () => {
    try {
      await resetSettings();
      setDemoStatus('🔄 Settings reset to defaults');
    } catch (err) {
      setDemoStatus(`❌ Reset error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 bg-base-100 rounded-lg shadow-lg">
        <div className="flex items-center gap-2">
          <div className="loading loading-spinner loading-sm"></div>
          <span>Loading settings system...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-error/10 rounded-lg border border-error">
        <h3 className="text-lg font-semibold text-error mb-2">Settings System Error</h3>
        <p className="text-error">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-base-100 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4 text-primary">🎛️ Settings System Demo</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Current Settings Overview */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Current Settings</h3>
          
          {settings && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Auto Refresh:</span>
                <span className={settings.general.autoRefresh ? 'text-success' : 'text-warning'}>
                  {settings.general.autoRefresh ? 'ON' : 'OFF'}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span>Refresh Interval:</span>
                <span>{settings.general.refreshInterval}s</span>
              </div>
              
              <div className="flex justify-between">
                <span>Theme:</span>
                <span className="capitalize">{settings.appearance.theme}</span>
              </div>
              
              <div className="flex justify-between">
                <span>Font Size:</span>
                <span>{settings.appearance.fontSize}</span>
              </div>
              
              <div className="flex justify-between">
                <span>Connections:</span>
                <span>{settings.connections.length}</span>
              </div>
              
              <div className="flex justify-between">
                <span>Version:</span>
                <span>{settings.version}</span>
              </div>
            </div>
          )}
        </div>

        {/* Demo Actions */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Demo Actions</h3>
          
          <div className="space-y-2">
            <button
              className="btn btn-primary btn-sm w-full"
              onClick={handleQuickTest}
              disabled={isLoading}
            >
              🧪 Run Quick Test
            </button>
            
            <button
              className="btn btn-secondary btn-sm w-full"
              onClick={handleCleanup}
              disabled={isLoading}
            >
              🧹 Cleanup Demo Data
            </button>
            
            <button
              className="btn btn-warning btn-sm w-full"
              onClick={handleResetDemo}
              disabled={isLoading}
            >
              🔄 Reset to Defaults
            </button>
          </div>
          
          {demoStatus && (
            <div className="mt-4 p-3 bg-base-200 rounded text-sm">
              <strong>Status:</strong> {demoStatus}
            </div>
          )}
        </div>
      </div>

      {/* Features List */}
      <div className="mt-6 pt-4 border-t border-base-300">
        <h3 className="text-lg font-semibold mb-3">✨ New Features</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <ul className="space-y-1">
            <li>✅ Tauri backend integration</li>
            <li>✅ Real-time settings synchronization</li>
            <li>✅ Atomic file operations</li>
            <li>✅ Settings validation</li>
          </ul>
          <ul className="space-y-1">
            <li>✅ Native file dialogs</li>
            <li>✅ Error handling & recovery</li>
            <li>✅ Type-safe API</li>
            <li>✅ Backward compatibility</li>
          </ul>
        </div>
      </div>

      {/* Technical Info */}
      <div className="mt-4 p-3 bg-base-200 rounded text-xs">
        <strong>Technical:</strong> Settings are stored in the app data directory using Tauri's file system API. 
        All operations are performed atomically on the backend with proper error handling and type conversion 
        between Rust (snake_case) and TypeScript (camelCase).
      </div>
    </div>
  );
}