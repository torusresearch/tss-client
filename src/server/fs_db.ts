import * as fs from "fs";

const fsDB = (dbName) => {
  fs.open(`./${dbName}.json`, "r", (err, fd) => {
    if (err) {
      fs.writeFileSync(`./${dbName}.json`, JSON.stringify({}));
    } else {
      fs.close(fd);
    }
  });

  return {
    get: async (key) => {
      return new Promise((resolve, reject) => {
        try {
          const jsonString = fs.readFileSync(`./${dbName}.json`);
          resolve(JSON.parse(jsonString.toString())[key]);
        } catch (err) {
          console.log("error", err);
          reject(err);
        }
      });
    },
    set: async (key, value) => {
      return new Promise<void>((resolve, reject) => {
        try {
          const jsonString = fs.readFileSync(`./${dbName}.json`);
          const obj = JSON.parse(jsonString.toString());
          obj[key] = value;
          fs.writeFileSync(`./${dbName}.json`, JSON.stringify(obj));
          resolve();
        } catch (err) {
          console.log("error", err);
          reject(err);
        }
      });
    },
  };
};

export default fsDB;
