/* eslint-disable @typescript-eslint/no-var-requires */
const axios = require("axios");
const base_port = 8000;
const endpoint_prefix = "http://localhost:";

const parties = [1, 2, 3, 4, 5];
const endpoints = parties.map((party) => `${endpoint_prefix}${base_port + parseInt(party)}`);

(async () => {
  try {
    const apiCalls = [];
    for (let i = 0; i < parties.length; i++) {
      const party = parties[i];
      const url = `${endpoints[i]}/generate_node_info/${party}`;
      apiCalls.push(axios.get(url));
    }
    await Promise.all(apiCalls);
    console.log("initialized node info for all servers");
  } catch (err) {
    console.error(err);
  }
})();
