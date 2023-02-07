import { DB } from "./types";

class WebDb implements DB {
  get = (key: string): Promise<string> => {
    return new Promise((r) => {
      chrome.storage.local.get(key).then((result) => {
        r(result[key] as string);
        return result;
      });
    });
  };

  set = (key: string, value: string): Promise<void> => {
    return chrome.storage.local.set({ key: value });
    // return new Promise((r) => {
    //   chrome.storage.local.set({ key: value });
    //   // memoryDB[key] = value
    //   r();
    // });
  };
}

export const localStorageDB = new WebDb();
