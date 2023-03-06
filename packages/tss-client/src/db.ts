import { DB } from "./types";

class WebDb implements DB {
  get = (key: string): Promise<string> => {
    return new Promise((r) => {
      if (global?.localStorage) {
        // r(memoryDB[key])
        const value = global.localStorage.getItem(key);
        r(value);
      } else {
        chrome.storage.local.get(key, (result) => {
          r(result[key] as string);
          return result;
        });
      }
    });
  };

  set = (key: string, value: string): Promise<void> => {
    return new Promise((r) => {
      if (global?.localStorage) {
        global.localStorage.setItem(key, value);
        // memoryDB[key] = value
        r();
      } else {
        chrome.storage.local.set({ [key]: value }, () => {
          r();
        });
      }
    });
  };
}

export const localStorageDB = new WebDb();
