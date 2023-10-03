import { Client } from "./client";

export declare global {
  declare module globalThis {
    var tss_clients: Map<string, Client>;
    var js_read_msg: ((session: string, self_index: number, party: number, msg_type: string) => void) | undefined;
    var js_send_msg: ((session: string, self_index: number, party: number, msg_type: string, msg_data: string) => void) | undefined;
    var process_ga1: (tssImportUrl: string, msg_data: string) => Promise<string>;
  }
}
