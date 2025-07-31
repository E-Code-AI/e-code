import fs from 'fs-extra';
import path from 'path';
import os from 'os';

export class Config {
  private configPath: string;
  private config: Record<string, any> = {};

  constructor() {
    this.configPath = path.join(os.homedir(), '.e-code', 'config.json');
    this.load();
  }

  private load() {
    try {
      if (fs.existsSync(this.configPath)) {
        this.config = fs.readJsonSync(this.configPath);
      }
    } catch (error) {
      // If config is corrupted, start fresh
      this.config = {};
    }
  }

  private save() {
    try {
      fs.ensureDirSync(path.dirname(this.configPath));
      fs.writeJsonSync(this.configPath, this.config, { spaces: 2 });
    } catch (error) {
      console.error('Failed to save configuration:', error);
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

  list(): Record<string, any> {
    return { ...this.config };
  }

  clear() {
    this.config = {};
    this.save();
  }
}