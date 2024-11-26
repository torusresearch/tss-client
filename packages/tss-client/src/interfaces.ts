export interface Msg {
  session: string;
  sender: number;
  recipient: number;
  msg_type: string;
  msg_data: string;
}

export type PointHex = {
  x: string;
  y: string;
};
