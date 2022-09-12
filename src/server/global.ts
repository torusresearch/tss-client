import axios from "axios";

import msgQueue from "./queue";
import * as utils from "./utils";

global.pendingReads = {};

global.js_send_msg = async function (session: string, self_index: number, party: number, msg_type: string, msg_data: string) {
  try {
    const endpoint = utils.lookupEndpoint(session, party);
    if (endpoint.indexOf("websocket") !== -1) {
      await utils.wsSend(utils.getWebSocketID(endpoint), session, self_index, party, msg_type, msg_data);
      return true;
    }
    await axios.post(`${endpoint}/send`, {
      session,
      sender: self_index,
      recipient: party,
      msg_type,
      msg_data,
    });
    return true;
  } catch (e) {
    console.error(e);
    throw new Error(e.toString());
  }
};

global.js_read_msg = async function (session: string, self_index: number, party: number, msg_type: string) {
  // console.log("reading message", party, msg_type);
  if (msg_type === "ga1_worker_support") return "not supported";
  try {
    const mm = msgQueue.messages.find((m) => m.session === session && m.sender === party && m.recipient === self_index && m.msg_type === msg_type);
    if (!mm) {
      return await new Promise((resolve) => {
        globalThis.pendingReads[`session-${session}:sender-${party}:recipient-${self_index}:msg_type-${msg_type}`] = resolve;
      });
    }
    return mm.msg_data;
  } catch (e) {
    console.error(e);
    throw new Error(e.toString());
  }
};
