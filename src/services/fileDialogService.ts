import { open, save } from '@tauri-apps/plugin-dialog';

export class FileDialogService {
  static async openJsonFile(): Promise<string | null> {
    try {
      const selected = await open({
        filters: [
          {
            name: 'JSON',
            extensions: ['json']
          }
        ]
      });

      if (selected && typeof selected === 'string') {
        return selected;
      }
      return null;
    } catch (error) {
      console.error('Failed to open file dialog:', error);
      throw new Error('Failed to open file dialog');
    }
  }

  static async saveJsonFile(defaultPath?: string): Promise<string | null> {
    try {
      const selected = await save({
        filters: [
          {
            name: 'JSON',
            extensions: ['json']
          }
        ],
        defaultPath: defaultPath || 'settings.json'
      });

      return selected;
    } catch (error) {
      console.error('Failed to save file dialog:', error);
      throw new Error('Failed to save file dialog');
    }
  }
}