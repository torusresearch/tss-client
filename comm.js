const axios = require("axios");
const getWebSocketID = (websocketEndpoint) => {
  return websocketEndpoint.split(":")[1];
};

module.exports = function (wsSend, wsBroadcast, selfReceiveBroadcast) {
  return {
    serverBroadcast: async (self, parties, tag, endpoints, key, value) => {
      return Promise.all(
        endpoints.map((endpoint, i) => {
          if (endpoint.indexOf("websocket") !== -1) {
            if (self !== parties[i]) {
              return wsBroadcast(self, tag, getWebSocketID(endpoint), key, value);
            } else {
              return selfReceiveBroadcast(sender, tag, key, value)
            }
          } else {
            return axios.post(`${endpoint}/broadcast`, {
              sender: self,
              tag,
              key,
              value,
            });
          }
        })
      );
    },
    serverSend: async (self, tag, endpoint, key, value) => {
      if (endpoint.indexOf("websocket") !== -1) {
        return wsSend(self, tag, getWebSocketID(endpoint), key, value);
      } else {
        return axios.post(`${endpoint}/send`, {
          sender: self,
          tag,
          key,
          value,
        });
      }
    },
  };
};
