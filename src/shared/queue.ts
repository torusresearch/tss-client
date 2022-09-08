import { Msg } from "../interfaces";

class Queue {
  constructor(private _messages: Msg[] = []) {}

  get messages(): Msg[] {
    return this._messages;
  }

  publish({ session, sender, recipient, msg_type, msg_data }: Msg): void {
    this._messages.push({ session, sender, recipient, msg_type, msg_data });
  }
}

export default Queue;
