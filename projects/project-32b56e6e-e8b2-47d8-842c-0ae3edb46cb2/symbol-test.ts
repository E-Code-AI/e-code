// E2E Symbol Navigation Test File
class UserManager {
  private users: string[] = [];
  
  addUser(name: string): void {
    this.users.push(name);
  }
  
  getUsers(): string[] {
    return this.users;
  }
  
  removeUser(name: string): void {
    this.users = this.users.filter(u => u !== name);
  }
}

interface AppConfig {
  apiUrl: string;
  timeout: number;
  retries: number;
}

function initializeApp(config: AppConfig): void {
  const manager = new UserManager();
  manager.addUser("Alice");
  manager.addUser("Bob");
  console.log("Users:", manager.getUsers());
}

function calculateTotal(items: number[]): number {
  return items.reduce((sum, item) => sum + item, 0);
}

const config: AppConfig = {
  apiUrl: "https://api.example.com",
  timeout: 5000,
  retries: 3
};

initializeApp(config);