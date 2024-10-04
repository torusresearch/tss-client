import { expect } from "chai";
import faker from "faker";

import { GetOrSetTssDKGPubKey } from "../src";

describe("setTssKey", function () {
  const TORUS_EXTENDED_VERIFIER_EMAIL = "testextenderverifierid@example.com";
  const TORUS_TEST_VERIFIER = "torus-test-health";

  it("should assign key to tss verifier id", async function () {
    const email = faker.internet.email();
    const nonce = 0;
    const tssTag = "default";
    const tssVerifierId = `${email}\u0015${tssTag}\u0016${nonce}`;
    const torusNodeEndpoints = [
      "https://node-1.dev-node.web3auth.io/sss/jrpc",
      "https://node-2.dev-node.web3auth.io/sss/jrpc",
      "https://node-3.dev-node.web3auth.io/sss/jrpc",
      "https://node-4.dev-node.web3auth.io/sss/jrpc",
      "https://node-5.dev-node.web3auth.io/sss/jrpc",
    ];
    const result = await GetOrSetTssDKGPubKey({
      endpoints: torusNodeEndpoints,
      verifier: TORUS_TEST_VERIFIER,
      verifierId: email,
      tssVerifierId,
    });
    expect(result.key.pubKeyX).to.not.equal(null);
  });

  it("should fetch pub address of tss verifier id", async function () {
    const email = TORUS_EXTENDED_VERIFIER_EMAIL;
    const nonce = 0;
    const tssTag = "default";
    const tssVerifierId = `${email}\u0015${tssTag}\u0016${nonce}`;
    const torusNodeEndpoints = [
      "https://node-1.dev-node.web3auth.io/sss/jrpc",
      "https://node-2.dev-node.web3auth.io/sss/jrpc",
      "https://node-3.dev-node.web3auth.io/sss/jrpc",
      "https://node-4.dev-node.web3auth.io/sss/jrpc",
      "https://node-5.dev-node.web3auth.io/sss/jrpc",
    ];
    const result = await GetOrSetTssDKGPubKey({
      endpoints: torusNodeEndpoints,
      verifier: TORUS_TEST_VERIFIER,
      verifierId: email,
      tssVerifierId,
    });
    delete result.key.createdAt;
    expect(result).eql({
      key: {
        pubKeyX: "d45d4ad45ec643f9eccd9090c0a2c753b1c991e361388e769c0dfa90c210348c",
        pubKeyY: "fdc151b136aa7df94e97cc7d7007e2b45873c4b0656147ec70aad46e178bce1e",
        address: "0xBd6Bc8aDC5f2A0526078Fd2016C4335f64eD3a30",
      },
      isNewKey: false,
      nodeIndexes: result.nodeIndexes,
    });
  });

  it("should fail if more than one endpoints are invalid", async function () {
    const email = TORUS_EXTENDED_VERIFIER_EMAIL;
    const nonce = 0;
    const tssTag = "default";
    const tssVerifierId = `${email}\u0015${tssTag}\u0016${nonce}`;
    const torusNodeEndpoints = [
      "https://node-1.dev-node.web3auth.io/sss/jrpc",
      "https://node-2.dev-node.web3auth.io/sss/jrpc",
      "https://node-3.dev-node.web3auth.io",
      "https://node-4.dev-node.web3auth.io",
      "https://node-5.dev-node.web3auth.io",
    ];
    try {
      await GetOrSetTssDKGPubKey({
        endpoints: torusNodeEndpoints,
        verifier: TORUS_TEST_VERIFIER,
        verifierId: email,
        tssVerifierId,
      });
      // If the function doesn't throw an error, fail the test
      expect.fail("Expected an error to be thrown");
    } catch (error) {
      // Test passes if an error is thrown
      expect(error).to.be.instanceOf(Error);
    }
  });
});
