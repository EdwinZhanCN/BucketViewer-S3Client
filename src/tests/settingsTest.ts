// Settings System Test Suite
// This file provides comprehensive testing for the BucketViewer settings system

import { SettingsService } from '../services/settingsService';
import type { ConnectionConfig, GeneralSettings, AppearanceSettings } from '../types/settings';

export class SettingsTestSuite {
  private settingsService: SettingsService;
  private testResults: Array<{ test: string; passed: boolean; error?: string }> = [];

  constructor() {
    this.settingsService = SettingsService.getInstance();
  }

  async runAllTests(): Promise<{ passed: number; failed: number; results: Array<{ test: string; passed: boolean; error?: string }> }> {
    console.log('🧪 Starting Settings System Test Suite...\n');
    
    this.testResults = [];
    
    await this.testInitialization();
    await this.testGeneralSettings();
    await this.testAppearanceSettings();
    await this.testConnectionManagement();
    await this.testSettingsValidation();
    await this.testErrorHandling();
    await this.testSettingsReset();
    
    const passed = this.testResults.filter(r => r.passed).length;
    const failed = this.testResults.filter(r => !r.passed).length;
    
    console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`);
    
    return {
      passed,
      failed,
      results: this.testResults
    };
  }

  private async runTest(testName: string, testFn: () => Promise<void>): Promise<void> {
    try {
      await testFn();
      this.testResults.push({ test: testName, passed: true });
      console.log(`✅ ${testName}`);
    } catch (error) {
      this.testResults.push({ 
        test: testName, 
        passed: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      console.log(`❌ ${testName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async testInitialization(): Promise<void> {
    await this.runTest('Settings Service Initialization', async () => {
      const settings = await this.settingsService.initialize();
      if (!settings) throw new Error('Settings initialization returned null');
      if (!settings.version) throw new Error('Settings missing version');
      if (!settings.general) throw new Error('Settings missing general section');
      if (!settings.appearance) throw new Error('Settings missing appearance section');
      if (!Array.isArray(settings.connections)) throw new Error('Settings connections is not an array');
    });

    await this.runTest('Get Current Settings', async () => {
      const settings = await this.settingsService.getSettings();
      if (!settings) throw new Error('getSettings returned null');
      if (typeof settings.general.autoRefresh !== 'boolean') {
        throw new Error('autoRefresh should be boolean');
      }
    });
  }

  private async testGeneralSettings(): Promise<void> {
    await this.runTest('Update General Settings - Auto Refresh', async () => {
      const currentSettings = await this.settingsService.getSettings();
      const originalValue = currentSettings.general.autoRefresh;
      
      const newGeneralSettings: GeneralSettings = {
        ...currentSettings.general,
        autoRefresh: !originalValue
      };
      
      const updatedSettings = await this.settingsService.updateGeneralSettings(newGeneralSettings);
      
      if (updatedSettings.general.autoRefresh === originalValue) {
        throw new Error('Auto refresh setting was not updated');
      }
      
      // Restore original value
      await this.settingsService.updateGeneralSettings({
        ...newGeneralSettings,
        autoRefresh: originalValue
      });
    });

    await this.runTest('Update General Settings - Refresh Interval', async () => {
      const currentSettings = await this.settingsService.getSettings();
      const originalInterval = currentSettings.general.refreshInterval;
      const newInterval = originalInterval === 30 ? 60 : 30;
      
      const newGeneralSettings: GeneralSettings = {
        ...currentSettings.general,
        refreshInterval: newInterval
      };
      
      const updatedSettings = await this.settingsService.updateGeneralSettings(newGeneralSettings);
      
      if (updatedSettings.general.refreshInterval !== newInterval) {
        throw new Error('Refresh interval was not updated correctly');
      }
      
      // Restore original value
      await this.settingsService.updateGeneralSettings({
        ...newGeneralSettings,
        refreshInterval: originalInterval
      });
    });
  }

  private async testAppearanceSettings(): Promise<void> {
    await this.runTest('Update Appearance Settings - Theme', async () => {
      const currentSettings = await this.settingsService.getSettings();
      const originalTheme = currentSettings.appearance.theme;
      const newTheme = originalTheme === 'light' ? 'dark' : 'light';
      
      const newAppearanceSettings: AppearanceSettings = {
        ...currentSettings.appearance,
        theme: newTheme
      };
      
      const updatedSettings = await this.settingsService.updateAppearanceSettings(newAppearanceSettings);
      
      if (updatedSettings.appearance.theme !== newTheme) {
        throw new Error('Theme was not updated correctly');
      }
      
      // Restore original value
      await this.settingsService.updateAppearanceSettings({
        ...newAppearanceSettings,
        theme: originalTheme
      });
    });

    await this.runTest('Update Appearance Settings - Font Size', async () => {
      const currentSettings = await this.settingsService.getSettings();
      const originalSize = currentSettings.appearance.fontSize;
      const newSize = originalSize === 1 ? 2 : 1;
      
      const newAppearanceSettings: AppearanceSettings = {
        ...currentSettings.appearance,
        fontSize: newSize
      };
      
      const updatedSettings = await this.settingsService.updateAppearanceSettings(newAppearanceSettings);
      
      if (updatedSettings.appearance.fontSize !== newSize) {
        throw new Error('Font size was not updated correctly');
      }
      
      // Restore original value
      await this.settingsService.updateAppearanceSettings({
        ...newAppearanceSettings,
        fontSize: originalSize
      });
    });
  }

  private async testConnectionManagement(): Promise<void> {
    const testConnection: ConnectionConfig = {
      name: 'Test Connection',
      serviceType: 'MinIO',
      endpoint: 'http://test.example.com:9000',
      accessKey: 'test-access-key',
      secretKey: 'test-secret-key',
      region: 'us-test-1',
      isDefault: false
    };

    let connectionIndex = -1;

    await this.runTest('Add New Connection', async () => {
      const beforeSettings = await this.settingsService.getSettings();
      const beforeCount = beforeSettings.connections.length;
      
      const afterSettings = await this.settingsService.addConnection(testConnection);
      
      if (afterSettings.connections.length !== beforeCount + 1) {
        throw new Error('Connection was not added');
      }
      
      connectionIndex = afterSettings.connections.findIndex(c => c.name === testConnection.name);
      if (connectionIndex === -1) {
        throw new Error('Added connection not found');
      }
    });

    await this.runTest('Update Existing Connection', async () => {
      if (connectionIndex === -1) throw new Error('No test connection to update');
      
      const updatedConnection: ConnectionConfig = {
        ...testConnection,
        endpoint: 'http://updated.example.com:9000'
      };
      
      const updatedSettings = await this.settingsService.updateConnection(connectionIndex, updatedConnection);
      
      const connection = updatedSettings.connections[connectionIndex];
      if (connection.endpoint !== updatedConnection.endpoint) {
        throw new Error('Connection was not updated correctly');
      }
    });

    await this.runTest('Remove Connection', async () => {
      if (connectionIndex === -1) throw new Error('No test connection to remove');
      
      const beforeSettings = await this.settingsService.getSettings();
      const beforeCount = beforeSettings.connections.length;
      
      const afterSettings = await this.settingsService.removeConnection(connectionIndex);
      
      if (afterSettings.connections.length !== beforeCount - 1) {
        throw new Error('Connection was not removed');
      }
      
      const stillExists = afterSettings.connections.some(c => c.name === testConnection.name);
      if (stillExists) {
        throw new Error('Connection still exists after removal');
      }
    });
  }

  private async testSettingsValidation(): Promise<void> {
    await this.runTest('Settings Structure Validation', async () => {
      const settings = await this.settingsService.getSettings();
      
      // Validate required fields
      const requiredFields = ['version', 'general', 'connections', 'appearance', 'layout', 'permissions'];
      for (const field of requiredFields) {
        if (!(field in settings)) {
          throw new Error(`Missing required field: ${field}`);
        }
      }
      
      // Validate types
      if (typeof settings.version !== 'string') throw new Error('version should be string');
      if (typeof settings.general !== 'object') throw new Error('general should be object');
      if (!Array.isArray(settings.connections)) throw new Error('connections should be array');
      if (typeof settings.appearance !== 'object') throw new Error('appearance should be object');
    });

    await this.runTest('Connection Validation', async () => {
      const settings = await this.settingsService.getSettings();
      
      for (const connection of settings.connections) {
        const requiredConnFields = ['name', 'serviceType', 'endpoint', 'accessKey', 'secretKey', 'region', 'isDefault'];
        for (const field of requiredConnFields) {
          if (!(field in connection)) {
            throw new Error(`Connection missing required field: ${field}`);
          }
        }
        
        if (typeof connection.isDefault !== 'boolean') {
          throw new Error('Connection isDefault should be boolean');
        }
      }
    });
  }

  private async testErrorHandling(): Promise<void> {
    await this.runTest('Invalid Connection Index Handling', async () => {
      try {
        await this.settingsService.removeConnection(999);
        throw new Error('Should have thrown error for invalid index');
      } catch (error) {
        if (error instanceof Error && error.message.includes('Should have thrown')) {
          throw error;
        }
        // Expected error - test passes
      }
    });

    await this.runTest('Update Non-existent Connection', async () => {
      const testConnection: ConnectionConfig = {
        name: 'Non-existent',
        serviceType: 'MinIO',
        endpoint: 'http://test.com',
        accessKey: 'test',
        secretKey: 'test',
        region: 'test',
        isDefault: false
      };
      
      try {
        await this.settingsService.updateConnection(999, testConnection);
        throw new Error('Should have thrown error for invalid index');
      } catch (error) {
        if (error instanceof Error && error.message.includes('Should have thrown')) {
          throw error;
        }
        // Expected error - test passes
      }
    });
  }

  private async testSettingsReset(): Promise<void> {
    await this.runTest('Settings Reset to Defaults', async () => {
      // First, modify some settings
      const currentSettings = await this.settingsService.getSettings();
      
      await this.settingsService.updateGeneralSettings({
        ...currentSettings.general,
        autoRefresh: false,
        refreshInterval: 999
      });
      
      // Reset settings
      const resetSettings = await this.settingsService.resetSettings();
      
      // Verify defaults are restored
      if (resetSettings.general.autoRefresh !== true) {
        throw new Error('Default autoRefresh not restored');
      }
      
      if (resetSettings.general.refreshInterval !== 30) {
        throw new Error('Default refreshInterval not restored');
      }
      
      if (resetSettings.appearance.theme !== 'system') {
        throw new Error('Default theme not restored');
      }
      
      if (resetSettings.connections.length !== 0) {
        throw new Error('Default connections not restored (should be empty)');
      }
    });
  }

  // Utility method to print detailed test results
  printDetailedResults(): void {
    console.log('\n📋 Detailed Test Results:');
    console.log('=' .repeat(50));
    
    this.testResults.forEach((result, index) => {
      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      console.log(`${index + 1}. ${status} - ${result.test}`);
      if (!result.passed && result.error) {
        console.log(`   Error: ${result.error}`);
      }
    });
    
    console.log('=' .repeat(50));
    
    const passRate = ((this.testResults.filter(r => r.passed).length / this.testResults.length) * 100).toFixed(1);
    console.log(`📈 Pass Rate: ${passRate}%`);
  }
}

// Export convenience function for running tests
export async function runSettingsTests(): Promise<void> {
  const testSuite = new SettingsTestSuite();
  const results = await testSuite.runAllTests();
  testSuite.printDetailedResults();
  
  if (results.failed > 0) {
    throw new Error(`Settings tests failed: ${results.failed} test(s) failed`);
  }
}

// Export for use in components or debugging