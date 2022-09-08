export type Serializable = string | string[];

export type TssSignResponse = { s_i: string; local_sig: string };

export interface DB {
  get: (key: string) => Promise<string>;
  set: (key: string, value: string) => Promise<void>;
}

export interface TssWorker {
  work: (method: string, args: string[]) => Promise<any>;
}
export interface Msg {
  session: string;
  sender: number;
  recipient: number;
  msg_type: string;
  msg_data: string;
}
