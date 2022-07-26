import { Comm } from "../shared";

export type Serializable = string | string[];

export type PubKey = {
  X: string;
  Y: string;
};

export type PublicParams = { h1h2Ntilde: string; ek: string };

export type TssSignResponse = { s_i: string; local_sig: string };

export interface DB {
  get: (key: string) => Promise<string>;
  set: (key: string, value: string) => Promise<void>;
}

export interface RoundRunner {
  nodeKey: string;
  db: DB;
  tag: string;
  roundName: string;
  party: number;
  serverSend: Comm["serverSend"];
  serverBroadcast: Comm["serverBroadcast"];
  wsNotify?: () => Promise<unknown> | void;
  clientReadyResolve?: Promise<unknown>;
  tss?: unknown;
}

export interface TssWorker {
  work: (method: string, args: string[]) => Promise<any>;
}
