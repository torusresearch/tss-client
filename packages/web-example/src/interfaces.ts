import { TORUS_SAPPHIRE_NETWORK_TYPE } from "@toruslabs/constants";

export interface DB {
  get: (key: string) => Promise<string>;
  set: (key: string, value: string) => Promise<void>;
  delete: (key: string) => Promise<void>;
}

export type PointHex = {
  x: string;
  y: string;
};

export type UserType = "old" | "new";

export type TestConfigType = {
  label: string;
  userType: UserType;
  network: TORUS_SAPPHIRE_NETWORK_TYPE;
  verifier_id?: string;
};
