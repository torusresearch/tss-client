import { DB } from "../interfaces";

class WebDb implements DB {
  get = (key: string): Promise<string> => {
    return new Promise((r) => {
      // r(memoryDB[key])
      const value = global.localStorage.getItem(key);
      r(value);
    });
  };

  set = (key: string, value: string): Promise<void> => {
    return new Promise((r) => {
      global.localStorage.setItem(key, value);
      // memoryDB[key] = value
      r();
    });
  };
}

export const localStorageDB = new WebDb();
