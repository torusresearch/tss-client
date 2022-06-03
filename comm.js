const axios = require('axios')

module.exports = {
  serverBroadcast: async (endpoints, key, value) => {
    return Promise.all(
      endpoints.map((endpoint) =>
        axios.post(`${endpoint}/broadcast`, {
          key,
          value,
        })
      )
    );
  },

  serverSend: async (endpoint, key, value) => {
    return axios.post(`${endpoint}/send`, {
      key,
      value,
    });
  },
};
