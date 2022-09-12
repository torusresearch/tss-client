import { addressBook } from "./mem_db";
import { getEmitterInstance } from "./sockets";

export const wsNotify = async (websocketId: string, player_index: number, session: string) => {
  const io = getEmitterInstance();
  let resolve;
  const p = new Promise((r) => (resolve = r));
  io.to(websocketId).emit(
    "precompute_complete",
    {
      party: player_index,
      session,
    },
    resolve
  );
  return p;
};

export const wsSend = async (websocketId: string, session: string, self_index: number, party: number, msg_type: string, msg_data: string) => {
  const io = getEmitterInstance();
  let resolve;
  const p = new Promise((r) => (resolve = r));
  // const socket = connections[websocketId];
  // console.log(`socket sending message ${msg_type}`);
  io.to(websocketId).emit(
    "send",
    {
      session,
      sender: self_index,
      recipient: party,
      msg_type,
      msg_data,
    },
    resolve
  );
  return p;
};

export const lookupEndpoint = (session: string, index: number) => {
  const address = addressBook[`${session}@${index}`];
  if (address === undefined) {
    throw new Error(`could not find address in address book, did you add it? Session: ${session}, index: ${index}`);
  }
  return address;
};

export const getWebSocketID = (websocketEndpoint: string) => {
  return websocketEndpoint.split(":")[1];
};
