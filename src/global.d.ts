/**
 * Global functions which are used by mpecdsa rust library.
 */
declare var pendingReads: Record<string, (value: unknown) => void>;
declare function js_send_msg(session: string, self_index: number, party: number, msg_type: string, msg_data: string): Promise<boolean>;
declare function js_read_msg(session: string, self_index: number, party: number, msg_type: string): Promise<string>;
