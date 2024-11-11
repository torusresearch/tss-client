export interface Msg {
  session: string;
  sender: number;
  recipient: number;
  msg_type: string;
  msg_data: string;
}

export interface BatchSignParams {
  msg: string;
  hash_only: boolean;
  original_message: string;
  hash_algo: string;
}

export type PointHex = {
  x: string;
  y: string;
};
