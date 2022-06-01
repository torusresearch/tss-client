var axios = require("axios");
var base_port = 8000;
var endpoint_prefix = "http://localhost:";

var parties = [1, 2, 3, 4, 5, 6];
var endpoints = parties.map(
  (party) => `${endpoint_prefix}${base_port + parseInt(party)}`
);

(async () => {
  try {
    let apiCalls = [];
    for (let i = 0; i < parties.length; i++) {
      let party = parties[i];
      let url = `${endpoints[i]}/generate_node_info/${party}`;
      apiCalls.push(axios.get(url));
    }
    await Promise.all(apiCalls);
    console.log("initialized node info for all servers");
  } catch (err) {
    console.error(err);
  }
})();
