
import BN from "bn.js";
import { generatePrivate } from "eccrypto";
import EC from "elliptic";

import { getAdditiveCoeff, getDenormaliseCoeff, getLagrangeCoeffs, getTSSPubKey } from "./utils";


export function generatePolynomial(degree: number, yIntercept: BN): BN[] {
    const res: BN[] = [];
    let i = 0;
    if (yIntercept !== undefined) {
      res.push(yIntercept);
      i++;
    }
    for (; i <= degree; i++) {
      res.push(new BN(generatePrivate()));
    }
    return res;
  }
  export function getShare(polynomial: BN[], index: BN | number) {
    const ec = getEcCrypto();
    let res = new BN(0);
    for (let i = 0; i < polynomial.length; i++) {
      const term = polynomial[i].mul(new BN(index).pow(new BN(i)));
      res = res.add(term.umod(ec.curve.n));
    }
    return res.umod(ec.curve.n);
  }
  
  export function dotProduct(arr1: BN[], arr2: BN[], modulus = new BN(0)) {
    if (arr1.length !== arr2.length) {
      throw new Error("arrays of different lengths");
    }
    let sum = new BN(0);
    for (let i = 0; i < arr1.length; i++) {
      sum = sum.add(arr1[i].mul(arr2[i]));
      if (modulus.cmp(new BN(0)) !== 0) {
        sum = sum.umod(modulus);
      }
    }
    return sum;
  }

export function getEcCrypto(): EC.ec {
  // eslint-disable-next-line new-cap
  return new EC.ec("secp256k1");
}

export function testShare() {
  const serverShares = [
    new BN("843810283de2ebdc60dee7addc7633ab76803bb5dc097b35bf7610cd8694587d", "hex"),
    new BN("5ecd8098fa43cf51c4aa8a7ade39e2a51c7c4f09fd61bd8b7478efc45d879f9e", "hex"),
    new BN("640ef14208d168f834cf828f2a108a8310db7778901fbda0679ae3b3733708da", "hex"),
  ];
  const serverLagrangeCoeffs = [
    getLagrangeCoeffs([1,2,3], 1),
    getLagrangeCoeffs([1,2,3], 2),
    getLagrangeCoeffs([1,2,3], 3)
  ];
  return dotProduct(serverShares, serverLagrangeCoeffs);
}

export function testDenormalise() {
  const ec = getEcCrypto();
  const additive = [new BN(10), new BN(20), new BN(30), new BN(40)]; // 100
  const denormalisedShares = additive.map((share, i) => {
    return getDenormaliseCoeff(i + 1, [1, 2, 3, 4]).mul(share).umod(ec.curve.n);
  });
  const lagnrageCoeffs = [1,2,3,4].map((party) => {
    return getLagrangeCoeffs([1,2,3,4], party);
  });
  console.log(dotProduct(lagnrageCoeffs, denormalisedShares).umod(ec.curve.n).toString(), "should be 100");
}

export function testCoeffs() {
  const ec = getEcCrypto();

  const userTSSindex = 3;
  const { userShare, serverShares, serverDKGPrivKey, privateKey } = generateHierarchicalSharing(userTSSindex);
  const pubkey = ec.g.mul(privateKey);
  const userAdditiveShare = getAdditiveCoeff(true, [1,2,3], 3).mul(userShare).umod(ec.curve.n);
  const participatingServerShares = [serverShares[0], serverShares[1], serverShares[2]];

  const serverAdditiveShares = participatingServerShares.map((serverShare, i) => {
    return getAdditiveCoeff(false, [1,2,3], 3, i+1).mul(serverShare).umod(ec.curve.n);
  });
  const additiveShares = serverAdditiveShares.concat(userAdditiveShare);
  const sum = additiveShares.reduce((summand, additiveShare) => summand.add(additiveShare).umod(ec.curve.n), new BN(0));
  if (sum.toString("hex") !== privateKey.toString("hex")) throw new Error("private key and additive sum dont match");
  console.log(sum.toString("hex"), "sum", privateKey.toString("hex"), "privatekey", "should be equal");
  const serverDKGPubKey = ec.g.mul(serverDKGPrivKey);
  const userSharePubKey = ec.g.mul(userShare);
  const tssPubKey = getTSSPubKey({ x: serverDKGPubKey.getX().toString("hex"), y: serverDKGPubKey.getY().toString("hex") }, { x: userSharePubKey.getX().toString("hex"), y: userSharePubKey.getY().toString("hex") }, userTSSindex);
  console.log(tssPubKey.getX().toString("hex"), pubkey.getX().toString("hex"), "should be equal");
}

export function generateHierarchicalSharing(userTSSindex: number): { privateKey: BN, userShare: BN, serverShares: BN[], serverDKGPrivKey: BN } {
  const ec = getEcCrypto();
  const serverCount = 5;
  const serverDKGPrivKey = new BN(generatePrivate());
  const serverPoly = generatePolynomial(2, serverDKGPrivKey);
  const serverShares = [];
  for (let i = 0; i < serverCount; i++) {
    serverShares.push(getShare(serverPoly, i+1));
  }
  const userShare = new BN(generatePrivate());
  const privateKey = getLagrangeCoeffs([1, userTSSindex], 1).mul(serverDKGPrivKey).add(getLagrangeCoeffs([1, userTSSindex], userTSSindex).mul(userShare)).umod(ec.curve.n);
  return { privateKey, serverDKGPrivKey, serverShares, userShare };
}