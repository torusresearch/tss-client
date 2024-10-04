export interface Msg {
  session: string;
  sender: number;
  recipient: number;
  msg_type: string;
  msg_data: string;
}

export interface TssWorker {
  work: <T>(method: string, args: string[]) => Promise<T>;
}

export interface DB {
  get: (key: string) => Promise<string>;
  set: (key: string, value: string) => Promise<void>;
  delete: (key: string) => Promise<void>;
}

export type PointHex = {
  x: string;
  y: string;
};

export interface JRPCResponse<T> {
  id: number;
  jsonrpc: "2.0";
  result?: T;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}
export interface GetORSetKeyNodeResponse {
  keys: {
    pub_key_X: string;
    pub_key_Y: string;
    address: string;
    created_at?: number;
  }[];
  is_new_key: boolean;
  node_index: string;
  server_time_offset?: string;
}
