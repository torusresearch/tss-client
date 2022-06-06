const fs = require('fs');

let db = {};

module.exports = (dbName) => {
    fs.open(`./${dbName}.json`, 'r', (err, fd) => {
        if (err) {
            fs.writeFileSync(`${__dirname}/${dbName}.json`, JSON.stringify({}))
        } else {
            db = JSON.parse(fs.readFileSync(`${__dirname}/${dbName}.json`));
            fs.close(fd)
        }
    })
    return {
        get: async (key) => {
            return new Promise((resolve, reject) => {
                try {
                    resolve(db[key])
                } catch (err) {
                    reject(err)
                }
            })
        },
        set: async (key, value) => {
            return new Promise((resolve, reject) => {
                try {
                    db[key] = value
                    resolve()
                } catch (err) {
                    reject(err)
                }
            })
        }
    }
}