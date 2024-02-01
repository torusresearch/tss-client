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
