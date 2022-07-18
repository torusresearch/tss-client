import axios, { AxiosResponse } from "axios";
import { io, Socket } from "socket.io-client";

export default class Network {
  private _wsConnecting: Promise<string>[] = [];

  private _sockets: Socket[] = [];

  private _onlinePhaseCompletionForServer = null;

  private _wsIds: string[] = [];

  constructor(private _endpoints: string[], private _wsEndpoints: string[]) {
    this._init();
  }

  get onlinePhaseCompletionForServer() {
    return this._onlinePhaseCompletionForServer;
  }

  get sockets() {
    return this._sockets;
  }

  get wsConnecting() {
    return this._wsConnecting;
  }

  /**
   * Getter for connected socket IDs.
   */
  get websocketIds() {
    return this._wsIds;
  }

  /**
   * Update websocket Ids after a successful connect.
   */
  set websocketIds(socketIds: string[]) {
    this._wsIds = socketIds;
  }

  public setTimer = (baseUrl: string) => {
    return axios.post(`${baseUrl}/reset_timer`, {});
  };

  public getPublicParamsFromNodes = (): Promise<AxiosResponse>[] => {
    return this._endpoints.map((endpoint) => {
      return axios.get(`${endpoint}/get_public_params`).then((res) => res.data);
    });
  };

  public getGWIS = (tag: string): Promise<AxiosResponse>[] => {
    return this._endpoints.map((endpoint) => {
      return axios
        .get(`${endpoint}/gwi/${tag}`)
        .then((res) => res.data)
        .then((obj) => obj.commitment);
    });
  };

  public setTagInfoOnNodes = ({ nodes, parties, pubkey, publicParams, gwis, tag }): Promise<AxiosResponse>[] => {
    const awaiting = [];
    for (let i = 0; i < nodes; i++) {
      const endpoint = this._endpoints[i];
      const customEndpoints = this._endpoints.slice();
      const partiesAndClient = parties.slice();

      customEndpoints.push(`websocket:${this._wsIds[i]}`);
      partiesAndClient.push(parties[parties.length - 1] + 1);

      awaiting.push(
        axios.post(`${endpoint}/set_tag_info/${tag}`, {
          pubkey: {
            X: pubkey.x.toString("hex"),
            Y: pubkey.y.toString("hex"),
          },
          endpoints: customEndpoints,
          parties: partiesAndClient,
          gwis,
          eks: publicParams.map((publicParam) => publicParam.ek),
          h1h2Ntildes: publicParams.map((publicParam) => publicParam.h1h2Ntilde),
        })
      );
    }
    return awaiting;
  };

  public subscribe = (tag: string) => {
    return this._endpoints.map((endpoint, index) => {
      axios.post(`${endpoint}/subscribeReady`, {
        tag,
        websocketId: this._wsIds[index],
      });
    });
  };

  public start = (tag: string) => {
    return this._endpoints.map((endpoint) =>
      axios.post(`${endpoint}/start`, {
        tag,
      })
    );
  };

  public signOnNodes = (data, tag: string) => {
    return this._endpoints.map((endpoint) =>
      axios
        .post(`${endpoint}/sign`, {
          tag,
          msg_hash: data,
        })
        .then((res) => res.data)
        .then((obj) => obj.s_i)
    );
  };

  public getSignature = (s_is, tag, data) => {
    return axios.post(`${this._endpoints[0]}/get_signature`, {
      s_is,
      tag,
      msg_hash: data,
    });
  };

  private _init = () => {
    this._onlinePhaseCompletionForServer = this._initializeWebsocketConnections(this._wsEndpoints);
  };

  /**
   * Initialize websocket connections with all the nodes.
   */
  private _initializeWebsocketConnections = (endpoints: string[]): Promise<unknown> => {
    return Promise.all(
      endpoints.map((wsEndpoint) => {
        const socket = io(wsEndpoint);
        this._sockets.push(socket);
        this._wsConnecting.push(
          new Promise((resolve) => {
            socket.on("connect", () => {
              resolve(socket.id);
            });
          })
        );

        return new Promise((resolve) => {
          socket.on("notify", resolve);
        });
      })
    );
  };
}
