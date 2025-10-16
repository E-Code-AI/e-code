declare module "tough-cookie/dist/cookie/index" {
  import { Cookie, CookieJar } from "tough-cookie";
  export { Cookie, CookieJar };
  export * from "tough-cookie";
}

declare module "mysql2" {
  const anything: any;
  export = anything;
}

declare module "mysql2/promise" {
  export type Connection = any;
  export type Pool = any;
  export function createConnection(...args: any[]): Promise<Connection>;
  export function createPool(...args: any[]): Pool;
  const promiseModule: any;
  export default promiseModule;
}
