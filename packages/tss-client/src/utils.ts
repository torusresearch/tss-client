import { generateJsonRPCObject, post } from "@toruslabs/http-helpers";
import BN from "bn.js";
import { curve, ec as EC } from "elliptic";
import JsonStringify from "json-stable-stringify";
import log from "loglevel";
import { io, Socket } from "socket.io-client";

import { GetORSetKeyNodeResponse, JRPCResponse, PointHex } from "./interfaces";
import { Some } from "./some";

export function getEc(): EC {
  return new EC("secp256k1");
}

export function getLagrangeCoeffs(_allIndexes: number[] | BN[], _myIndex: number | BN, _target: number | BN = 0): BN {
  const ec = getEc();
  const allIndexes: BN[] = _allIndexes.map((i) => new BN(i));
  const myIndex: BN = new BN(_myIndex);
  const target: BN = new BN(_target);
  let upper = new BN(1);
  let lower = new BN(1);
  for (let j = 0; j < allIndexes.length; j += 1) {
    if (myIndex.cmp(allIndexes[j]) !== 0) {
      let tempUpper = target.sub(allIndexes[j]);
      tempUpper = tempUpper.umod(ec.curve.n);
      upper = upper.mul(tempUpper);
      upper = upper.umod(ec.curve.n);
      let tempLower = myIndex.sub(allIndexes[j]);
      tempLower = tempLower.umod(ec.curve.n);
      lower = lower.mul(tempLower).umod(ec.curve.n);
    }
  }
  return upper.mul(lower.invm(ec.curve.n)).umod(ec.curve.n);
}

export function ecPoint(p: { x: string; y: string }): curve.base.BasePoint {
  const ec = getEc();
  return ec.keyFromPublic({ x: p.x.padStart(64, "0"), y: p.y.padStart(64, "0") }).getPublic();
}

export const getAdditiveCoeff = (isUser: boolean, participatingServerIndexes: number[], userTSSIndex: number, serverIndex?: number): BN => {
  const ec = getEc();
  if (isUser) {
    return getLagrangeCoeffs([1, userTSSIndex], userTSSIndex);
  }
  // generate the lagrange coeff that converts the current server DKG share into an additive sharing
  const serverLagrangeCoeff = getLagrangeCoeffs(participatingServerIndexes, serverIndex!);
  const masterLagrangeCoeff = getLagrangeCoeffs([1, userTSSIndex], 1);
  const additiveLagrangeCoeff = serverLagrangeCoeff.mul(masterLagrangeCoeff).umod(ec.curve.n);
  return additiveLagrangeCoeff;
};

// Note: this is only needed for DKLS and not for FROST
export const getDenormaliseCoeff = (party: number, parties: number[]): BN => {
  if (parties.indexOf(party) === -1) throw new Error(`party ${party} not found in parties ${parties}`);
  const ec = getEc();
  // generate the lagrange coeff that denormalises the additive sharing into the shamir sharing that TSS is expecting
  const denormaliseLagrangeCoeff = getLagrangeCoeffs(parties, party).invm(ec.curve.n).umod(ec.curve.n);
  return denormaliseLagrangeCoeff;
};

export const getDKLSCoeff = (isUser: boolean, participatingServerIndexes: number[], userTSSIndex: number, serverIndex?: number): BN => {
  const sortedServerIndexes = participatingServerIndexes.sort((a, b) => a - b);
  for (let i = 0; i < sortedServerIndexes.length; i++) {
    if (sortedServerIndexes[i] !== participatingServerIndexes[i]) throw new Error("server indexes must be sorted");
  }
  // generate denormalise coeff for DKLS
  const parties = [];

  // total number of parties for DKLS = total number of servers + 1 (user is the last party)
  // server party indexes
  let serverPartyIndex = 0;
  for (let i = 0; i < participatingServerIndexes.length; i++) {
    const currentPartyIndex = i + 1;
    parties.push(currentPartyIndex);
    if (participatingServerIndexes[i] === serverIndex) serverPartyIndex = currentPartyIndex;
  }
  const userPartyIndex = parties.length + 1;
  parties.push(userPartyIndex); // user party index
  if (isUser) {
    const additiveCoeff = getAdditiveCoeff(isUser, participatingServerIndexes, userTSSIndex, serverIndex);
    const denormaliseCoeff = getDenormaliseCoeff(userPartyIndex, parties);
    const ec = getEc();
    return denormaliseCoeff.mul(additiveCoeff).umod(ec.curve.n);
  }
  const additiveCoeff = getAdditiveCoeff(isUser, participatingServerIndexes, userTSSIndex, serverIndex);
  const denormaliseCoeff = getDenormaliseCoeff(serverPartyIndex, parties);
  const ec = getEc();
  const coeff = denormaliseCoeff.mul(additiveCoeff).umod(ec.curve.n);
  return coeff;
};

export const createSockets = async (wsEndpoints: string[], sessionId: string): Promise<Socket[]> => {
  return wsEndpoints.map((wsEndpoint) => {
    if (wsEndpoint === null || wsEndpoint === undefined) {
      return null;
    }
    return io(wsEndpoint, {
      path: "/tss/socket.io",
      query: { sessionId },
      transports: ["websocket", "polling"],
      withCredentials: true,
      reconnectionDelayMax: 10000,
      reconnectionAttempts: 5,
    });
  });
};

type key = { x: string; y: string };

export function getTSSPubKey(dkgPubKey: PointHex, userSharePubKey: key, userTSSIndex: number): curve.base.BasePoint {
  const serverLagrangeCoeff = getLagrangeCoeffs([1, userTSSIndex], 1);
  const userLagrangeCoeff = getLagrangeCoeffs([1, userTSSIndex], userTSSIndex);
  const serverTerm = ecPoint(dkgPubKey).mul(serverLagrangeCoeff);
  const userTerm = ecPoint(userSharePubKey).mul(userLagrangeCoeff);
  return serverTerm.add(userTerm);
}

export const generateEndpoints = (parties: number, clientIndex: number) => {
  const endpoints: (string | null)[] = [];
  const tssWSEndpoints: (string | null)[] = [];
  const partyIndexes: number[] = [];
  for (let i = 0; i < parties; i++) {
    partyIndexes.push(i);
    if (i === clientIndex) {
      endpoints.push(null);
      tssWSEndpoints.push(null);
    } else {
      endpoints.push(`https://sapphire-${i + 1}.auth.network/tss`);
      tssWSEndpoints.push(`https://sapphire-${i + 1}.auth.network`);
    }
  }
  return { endpoints, tssWSEndpoints, partyIndexes };
};

export const setupSockets = async (tssWSEndpoints: string[], sessionId: string) => {
  const sockets = await createSockets(tssWSEndpoints, sessionId);
  // wait for websockets to be connected
  await new Promise((resolve) => {
    const checkConnectionTimer = setInterval(() => {
      for (let i = 0; i < sockets.length; i++) {
        if (sockets[i] !== null && !sockets[i].connected) return;
      }
      clearInterval(checkConnectionTimer);
      resolve(true);
    }, 100);
  });

  return sockets;
};

// this function normalizes the result from nodes before passing the result to threshold check function
// For ex: some fields returns by nodes might be different from each other
// like created_at field might vary
const normalizeKeysResult = (result: GetORSetKeyNodeResponse) => {
  const finalResult: Pick<GetORSetKeyNodeResponse, "keys" | "is_new_key"> = {
    keys: [],
    is_new_key: result.is_new_key,
  };
  if (result && result.keys && result.keys.length > 0) {
    const finalKey = result.keys[0];
    finalResult.keys = [
      {
        pub_key_X: finalKey.pub_key_X,
        pub_key_Y: finalKey.pub_key_Y,
        address: finalKey.address,
      },
    ];
  }
  return finalResult;
};

export const thresholdSame = <T>(arr: T[], t: number): T | undefined => {
  const hashMap: Record<string, number> = {};
  for (let i = 0; i < arr.length; i += 1) {
    const str = JsonStringify(arr[i]);
    hashMap[str] = hashMap[str] ? hashMap[str] + 1 : 1;
    if (hashMap[str] === t) {
      return arr[i];
    }
  }
  return undefined;
};

// Note: Endpoints should be the sss node endpoints along with path
// for ex: [https://node-1.node.web3auth.io/sss/jrpc, https://node-2.node.web3auth.io/sss/jrpc ....]
export const GetOrSetTssDKGPubKey = async (params: {
  endpoints: string[];
  verifier: string;
  verifierId: string;
  tssVerifierId: string;
}): Promise<{
  key: {
    pubKeyX: string;
    pubKeyY: string;
    address: string;
    createdAt?: number;
  };
  isNewKey: boolean;
  nodeIndexes: number[];
}> => {
  const { endpoints, verifier, verifierId, tssVerifierId } = params;
  const minThreshold = ~~(endpoints.length / 2) + 1;
  const lookupPromises = endpoints.map((x) =>
    post<JRPCResponse<GetORSetKeyNodeResponse>>(
      x,
      generateJsonRPCObject("GetPubKeyOrKeyAssign", {
        distributed_metadata: true,
        verifier,
        verifier_id: verifierId,
        extended_verifier_id: tssVerifierId,
        one_key_flow: true,
        key_type: "secp256k1",
        fetch_node_index: true,
        client_time: Math.floor(Date.now() / 1000).toString(),
      }),
      {},
      {
        logTracingHeader: false,
      }
    ).catch((err) => log.error(`GetPubKeyOrKeyAssign request failed`, err))
  );

  const nodeIndexes: number[] = [];
  const result = await Some<
    void | JRPCResponse<GetORSetKeyNodeResponse>,
    {
      keyResult: Pick<GetORSetKeyNodeResponse, "keys" | "is_new_key">;
      nodeIndexes: number[];
      errorResult: JRPCResponse<GetORSetKeyNodeResponse>["error"];
    }
  >(lookupPromises, async (lookupResults) => {
    const lookupPubKeys = lookupResults.filter((x1) => {
      if (x1 && !x1.error) {
        return x1;
      }
      return false;
    });

    const errorResult = thresholdSame(
      lookupResults.map((x2) => x2 && x2.error),
      minThreshold
    );

    const keyResult = thresholdSame(
      lookupPubKeys.map((x3) => x3 && normalizeKeysResult(x3.result)),
      minThreshold
    );

    if (keyResult || errorResult) {
      if (keyResult) {
        lookupResults.forEach((x1) => {
          if (x1 && x1.result) {
            const currentNodePubKey = x1.result.keys[0].pub_key_X.toLowerCase();
            const thresholdPubKey = keyResult.keys[0].pub_key_X.toLowerCase();
            // push only those indexes for nodes who are returning pub key matching with threshold pub key.
            // this check is important when different nodes have different keys assigned to a user.
            if (currentNodePubKey === thresholdPubKey) {
              const nodeIndex = Number.parseInt(x1.result.node_index);
              if (nodeIndex) nodeIndexes.push(nodeIndex);
            }
          }
        });
      }

      return Promise.resolve({ keyResult, nodeIndexes, errorResult });
    }
    return Promise.reject(new Error(`invalid public key result: ${JSON.stringify(lookupResults)} for tssVerifierId: ${tssVerifierId} `));
  });

  if (result.errorResult) {
    throw new Error(`invalid public key result,errorResult: ${JSON.stringify(result.errorResult)}`);
  }

  const key = result.keyResult.keys[0];
  return {
    key: {
      pubKeyX: key.pub_key_X,
      pubKeyY: key.pub_key_Y,
      address: key.address,
      createdAt: key.created_at,
    },
    nodeIndexes: result.nodeIndexes,
    isNewKey: result.keyResult.is_new_key,
  };
};
