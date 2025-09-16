const specialMessages = {
  ga1_array: { chunkSize: 64 },
  com_msg: { chunkSize: 32 },
  chal_msg: { chunkSize: 32 },
  msg_0_com: { chunkSize: 32 },
  msg_1_com: { chunkSize: 32 },
};

function byteLenToBase64Len(byteLen: number): number {
  return Math.ceil(byteLen / 3) * 4;
}

function encodeChunks(dataBase64: string, chunkSize: number): Buffer {
  const chunks: Buffer[] = [];
  for (let i = 0; i < dataBase64.length; i += chunkSize) {
    const chunkBase64 = dataBase64.substring(i, i + chunkSize);
    const chunk = Buffer.from(chunkBase64, "base64");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export function encodeMsgData(msg_type: string, msg_data: string) {
  for (const [key, value] of Object.entries(specialMessages)) {
    if (msg_type.includes(key)) {
      const base64Len = byteLenToBase64Len(value.chunkSize);
      return encodeChunks(msg_data, base64Len);
    }
  }

  return Buffer.from(msg_data, "base64");
}

function decodeChunks(data: Buffer, chunkSize: number): string {
  let result = "";
  for (let i = 0; i < data.length; i += chunkSize) {
    const chunk = data.subarray(i, i + chunkSize);
    result += chunk.toString("base64");
  }
  return result;
}

export function decodeMsgData(msg_type: string, encoded_msg_data: Buffer) {
  for (const [key, value] of Object.entries(specialMessages)) {
    if (msg_type.includes(key)) {
      return decodeChunks(encoded_msg_data, value.chunkSize);
    }
  }
  return encoded_msg_data.toString("base64");
}
