import axios from "axios";

import { Serializable } from "../interfaces";

class Comm {
  constructor(private _wsSend, private _wsBroadcast, private _selfReceiveBroadcast) {}

  serverBroadcast = async (self: number, parties: number[], tag: string, endpoints: string[], key: string, value: Serializable) => {
    return Promise.all(
      endpoints.map((endpoint: string, i: number) => {
        if (endpoint.indexOf("websocket") !== -1) {
          if (self.toString() !== parties[i].toString()) {
            return this._wsBroadcast(self, tag, this._getWebSocketID(endpoint), key, value);
          }
          return this._selfReceiveBroadcast[tag](self, tag, key, value);
        }
        return axios.post(`${endpoint}/broadcast`, {
          sender: self,
          tag,
          key,
          value,
        });
      })
    );
  };

  serverSend = async (self: number, tag: string, endpoint: string, key: string, value: Serializable) => {
    if (endpoint.indexOf("websocket") !== -1) {
      return this._wsSend(self, tag, this._getWebSocketID(endpoint), key, value);
    }
    return axios.post(`${endpoint}/send`, {
      sender: self,
      tag,
      key,
      value,
    });
  };

  private _getWebSocketID = (websocketEndpoint: string): string => {
    return websocketEndpoint.split(":")[1];
  };
}

export default Comm;
