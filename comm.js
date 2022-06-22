const axios = require('axios')

module.exports = {
  serverBroadcast: async (self, tag, endpoints, key, value) => {
    return Promise.all(
      endpoints.map((endpoint) =>
        axios.post(`${endpoint}/broadcast`, {
          sender: self,
          tag,
          key,
          value,
        })
      )
    );
  },

  serverBroadcastOld: async (endpoints, key, value) => {
    return Promise.all(
      endpoints.map((endpoint) =>
        axios.post(`${endpoint}/broadcast`, {
          key,
          value,
        })
      )
    );
  },

  serverSend: async (self, tag, endpoint, key, value) => {
    return axios.post(`${endpoint}/send`, {
      sender: self,
      tag,
      key,
      value,
    });
  },

  serverSendOld: async (endpoint, key, value) => {
    return axios.post(`${endpoint}/send`, {
      key,
      value,
    });
  },
};
