declare module 'smb2' {
  export interface ClientConfig {
    share: string;
    domain: string;
    host: string;
    port: number;
    username: string;
    password: string;
  }

  export interface Client {
    readdir(path: string, callback: (err: any, files: string[]) => void): void;
    stat(path: string, callback: (err: any, stats: any) => void): void;
    createReadStream(path: string): any;
    destroy(): void;
  }

  interface SMB2Static {
    createClient(config: ClientConfig): Client;
  }

  const SMB2: SMB2Static;
  export default SMB2;
}
