import fs from 'fs';
import path from 'path';
import os from 'os';

export class ConfigManager {
  private configPath: string;
  private config: Record<string, any>;

  constructor() {
    // Store config in user's home directory
    const configDir = path.join(os.homedir(), '.ecode');
    this.configPath = path.join(configDir, 'config.json');
    
    // Ensure config directory exists
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    
    // Load existing config or create new one
    this.load();
  }

  private load() {
    try {
      if (fs.existsSync(this.configPath)) {
        const data = fs.readFileSync(this.configPath, 'utf-8');
        this.config = JSON.parse(data);
      } else {
        this.config = {};
        this.save();
      }
    } catch (error) {
      console.error('Failed to load config:', error);
      this.config = {};
    }
  }

  private save() {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
    } catch (error) {
      console.error('Failed to save config:', error);
    }
  }

  get(key: string): any {
    return this.config[key];
  }

  set(key: string, value: any) {
    this.config[key] = value;
    this.save();
  }

  delete(key: string) {
    delete this.config[key];
    this.save();
  }

  clear() {
    this.config = {};
    this.save();
  }

  getAll(): Record<string, any> {
    return { ...this.config };
  }

  // Project-specific config stored in .ecode/config.json in project root
  getProjectConfig(): Record<string, any> {
    try {
      const projectConfigPath = path.join(process.cwd(), '.ecode', 'config.json');
      if (fs.existsSync(projectConfigPath)) {
        const data = fs.readFileSync(projectConfigPath, 'utf-8');
        return JSON.parse(data);
      }
    } catch (error) {
      // Ignore errors
    }
    return {};
  }

  setProjectConfig(config: Record<string, any>) {
    try {
      const ecodeDir = path.join(process.cwd(), '.ecode');
      if (!fs.existsSync(ecodeDir)) {
        fs.mkdirSync(ecodeDir, { recursive: true });
      }
      
      const projectConfigPath = path.join(ecodeDir, 'config.json');
      fs.writeFileSync(projectConfigPath, JSON.stringify(config, null, 2));
    } catch (error) {
      console.error('Failed to save project config:', error);
    }
  }
}