import { localStorageDB } from "./mockDB";
import { ecsign } from "ethereumjs-util";
import axios from "axios";
import BN from "bn.js";
import eccrypto from "eccrypto";
import { io, Socket } from "socket.io-client";
import base64Url from "base64url";
import keccak256 from "keccak256";
import { getEcCrypto } from "./utils";

export const getSignatures = () => {
  // using same keys in local for testing only
    const privKeys = [
      'da4841d60f47652584aea0ab578660b353dbcd6907940ed0a295c9d95aabadd0',
      'e7ef4a9dcc9c0305ec9e56c79128f5c12413b976309368c35c11f3297459994b',
      '31534072a75a1d8b7f07c1f29930533ae44166f44ce08a4a23126b6dcb8b6efe',
      'f2588097a5df3911e4826e13dce2b6f4afb798bb8756675b17d4195db900af20',
      '5513438cd00c901ff362e25ae08aa723495bea89ab5a53ce165730bc1d9a0280'
    ];
  
    const tokenData = {
      exp: Date.now() + 3000,
      temp_key_x: "test_key_x",
      temp_key_y: "test_key_y",
      verifier_name: "test_verifier_name",
      verifier_id: "test_verifier_id",
    };
  
    const token = base64Url.encode(JSON.stringify(tokenData));
  
    const sigs = privKeys.map(i => {
      const msgHash = keccak256(token);
      const nodeSig = ecsign(msgHash, Buffer.from(i, "hex"));
      const sig = `${nodeSig.r.toString("hex")}${nodeSig.s.toString("hex")}${nodeSig.v.toString(16)}`;
      return JSON.stringify({
        data: token,
        sig
      });
    });
  
    return sigs;
  };

  export const createSockets = async (wsEndpoints: string[]): Promise<Socket[]> => {
    return wsEndpoints.map((wsEndpoint) => {
      if (wsEndpoint === null || wsEndpoint === undefined) {
        return null;
      }
      return io(wsEndpoint, { transports: ["websocket", "polling"], withCredentials: true, reconnectionDelayMax: 10000, reconnectionAttempts: 10 });
    });
  };

  export const getLagrangeCoeff = (parties: number[], party: number): BN => {
    const ec = getEcCrypto();
    const partyIndex = new BN(party + 1);
    let upper = new BN(1);
    let lower = new BN(1);
    for (let i = 0; i < parties.length; i += 1) {
      const otherParty = parties[i];
      const otherPartyIndex = new BN(parties[i] + 1);
      if (party !== otherParty) {
        upper = upper.mul(otherPartyIndex.neg());
        upper = upper.umod(ec.curve.n);
        let temp = partyIndex.sub(otherPartyIndex);
        temp = temp.umod(ec.curve.n);
        lower = lower.mul(temp).umod(ec.curve.n);
      }
    }
  
    const delta = upper.mul(lower.invm(ec.curve.n)).umod(ec.curve.n);
    return delta;
  };
  export const distributeShares = async (privKey: BN, parties: number[], endpoints: string[], localClientIndex: number, session: string) => {
    const additiveShares = [];
    const ec = getEcCrypto();
    let shareSum = new BN(0);
    for (let i = 0; i < parties.length - 1; i++) {
      const share = new BN(eccrypto.generatePrivate());
      additiveShares.push(share);
      shareSum = shareSum.add(share);
    }
  
    const finalShare = privKey.sub(shareSum.umod(ec.curve.n)).umod(ec.curve.n);
    additiveShares.push(finalShare);
    const reduced = additiveShares.reduce((acc, share) => acc.add(share).umod(ec.curve.n), new BN(0));
  
    if (reduced.toString(16) !== privKey.toString(16)) {
      throw new Error("additive shares dont sum up to private key");
    }
  
    // denormalise shares
    const shares = additiveShares.map((additiveShare, party) => {
      return additiveShare.mul(getLagrangeCoeff(parties, party).invm(ec.curve.n)).umod(ec.curve.n);
    });
  
    console.log(
      "shares",
      shares.map((s) => s.toString(16, 64))
    );
  
    const waiting = [];
    for (let i = 0; i < parties.length; i++) {
      const share = shares[i];
      if (i === localClientIndex) {

        waiting.push(localStorageDB.set(`session-${session}:share`, Buffer.from(share.toString(16, 64), "hex").toString("base64")));
        continue;
      }
      waiting.push(
        axios
          .post(`${endpoints[i]}/share`, {
            session,
            share: Buffer.from(share.toString(16, 64), "hex").toString("base64"),
          })
          .then((res) => res.data)
      );
    }
    await Promise.all(waiting);
  };