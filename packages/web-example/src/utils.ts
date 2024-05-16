import BN from "bn.js";
import EC, { curve } from "elliptic";
import { io, Socket } from "socket.io-client";
import TorusUtils from "@toruslabs/torus.js";
import { KJUR } from "jsrsasign";
import { TORUS_SAPPHIRE_NETWORK_TYPE } from "@toruslabs/constants";
import { fetchLocalConfig } from "@toruslabs/fnd-base";

export function getEcCrypto(): EC.ec {
  // eslint-disable-next-line new-cap
  return new EC.ec("secp256k1");
}

export interface HexPoint {
  x: string,
  y: string,
}

export function ecPoint(p: HexPoint): curve.base.BasePoint {
  const ec = getEcCrypto();
  return ec.keyFromPublic({ x: p.x.padStart(64, "0"), y: p.y.padStart(64, "0") }).getPublic();
}

export function getLagrangeCoeffs(_allIndexes: number[] | BN[], _myIndex: number | BN, _target: number | BN = 0): BN {
  const ec = getEcCrypto();
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

const jwtPrivateKey = `-----BEGIN PRIVATE KEY-----\nMEECAQAwEwYHKoZIzj0CAQYIKoZIzj0DAQcEJzAlAgEBBCCD7oLrcKae+jVZPGx52Cb/lKhdKxpXjl9eGNa1MlY57A==\n-----END PRIVATE KEY-----`;
export const generateIdToken = (email: string) => {
  const alg = "ES256";
  const iat = Math.floor(Date.now() / 1000);
  const payload = {
    iss: "torus-key-test",
    aud: "torus-key-test",
    name: email,
    email,
    scope: "email",
    iat,
    eat: iat + 120,
  };

  const options = {
    "expiresIn": "120",
    "algorithm": alg,
  };

  const header = { alg, typ: "JWT" };

  const token = KJUR.jws.JWS.sign(alg, header, payload, jwtPrivateKey, options);

  return token;
};


export async function fetchPostboxKeyAndSigs(opts: {
  verifierName: string,
  verifierId: string,
}, network: TORUS_SAPPHIRE_NETWORK_TYPE) {
  const networkDetails = fetchLocalConfig(network, "secp256k1");
  console.log("networkDetails", networkDetails);
  const torus = new TorusUtils({
    clientId: "torus-default",
    network,
    enableOneKey: true,
  });

  const { verifierName, verifierId } = opts;
  const token = generateIdToken(verifierId);

  const torusKeyData = await torus.retrieveShares(networkDetails.torusNodeSSSEndpoints, networkDetails.torusIndexes, verifierName, { verifier_id: verifierId }, token);
  const {  nodesData, sessionData } = torusKeyData;
  const signatures: string[] = [];
  sessionData.sessionTokenData.filter((session) => {
    if (session) {
      signatures.push(
        JSON.stringify({
          data: session.token,
          sig: session.signature,
        })
      );
    }
    return null;
  });

  const postboxKey = TorusUtils.getPostboxKey(torusKeyData);
  return {
    signatures,
    postboxkey: postboxKey,
    nodeIndexes: nodesData.nodeIndexes.slice(0, 3)
  };
}

export function getTSSPubKey(dkgPubKey: HexPoint, userSharePubKey: HexPoint, userTSSIndex: number): curve.base.BasePoint {
  const serverLagrangeCoeff = getLagrangeCoeffs([1, userTSSIndex], 1);
  const userLagrangeCoeff = getLagrangeCoeffs([1, userTSSIndex], userTSSIndex);
  const serverTerm = ecPoint(dkgPubKey).mul(serverLagrangeCoeff);
  const userTerm = ecPoint(userSharePubKey).mul(userLagrangeCoeff);
  return serverTerm.add(userTerm);
}

export function serializeScalar_Secp256k1(s: BN): Buffer {
  return s.toArrayLike(Buffer, "be", 32);
}

export function deserializeScalar_Secp256k1(b: Buffer): BN {
  return new BN(b);
}

export function serializePoint_Secp256k1_ConcatXY(p: curve.base.BasePoint): Buffer {
  const pubKeyX = p.getX().toString(16, 64);
  const pubKeyY = p.getY().toString(16, 64);
  const pubKeyHex = `${pubKeyX}${pubKeyY}`;
  return Buffer.from(pubKeyHex, "hex");
}

export function deserializePoint_Secp256k1_ConcatXY(ec: EC.ec, b: Buffer): curve.base.BasePoint {
  const x = b.subarray(0, 32).toString("hex");
  const y = b.subarray(32, 64).toString("hex");
  return ec.keyFromPublic({ x, y }).getPublic();
}

export function generateRandomEmail() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let email = '';
  for (let i = 0; i < 10; i++) {
    email += chars[Math.floor(Math.random() * chars.length)];
  }
  email += '@example.com';
  return email;
}

export function generateEndpoints(parties: number, clientIndex: number, network: TORUS_SAPPHIRE_NETWORK_TYPE, nodeIndexes: number[] = []) {
  console.log("generateEndpoints node indexes", nodeIndexes);
  const networkConfig = fetchLocalConfig(network, "secp256k1");
  const endpoints = [];
  const tssWSEndpoints = [];
  const partyIndexes = [];

  for (let i = 0; i < parties; i++) {
    partyIndexes.push(i);

    if (i === clientIndex) {
      endpoints.push(null);
      tssWSEndpoints.push(null);
    } else {
      endpoints.push(networkConfig.torusNodeTSSEndpoints[nodeIndexes[i] ?  nodeIndexes[i] - 1 : i]);
      let wsEndpoint = networkConfig.torusNodeEndpoints[nodeIndexes[i] ? nodeIndexes[i] - 1 : i];
      if (wsEndpoint) {
        const urlObject = new URL(wsEndpoint);
        wsEndpoint = urlObject.origin;
      }
      tssWSEndpoints.push(wsEndpoint);
    }
  }

  return {
    endpoints: endpoints,
    tssWSEndpoints: tssWSEndpoints,
    partyIndexes: partyIndexes
  };
}

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
