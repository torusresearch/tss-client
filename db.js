const fs = require('fs')

module.exports = (dbName) => {
    fs.open(`./${dbName}.json`, 'r', (err, fd) => {
        if (err) {
            fs.writeFileSync(`${__dirname}/${dbName}.json`, JSON.stringify({}))
        } else {
            fs.close(fd)
        }
    })
    return {
        get: async (key) => {
            return new Promise((resolve, reject) => {
                try {
                    const jsonString = fs.readFileSync(`${__dirname}/${dbName}.json`)
                    resolve(JSON.parse(jsonString)[key])
                } catch (err) {
                    reject(err)
                }
            })
        },
        set: async (key, value) => {
            return new Promise((resolve, reject) => {
                try {
                    const jsonString = fs.readFileSync(`${__dirname}/${dbName}.json`);
                    const obj = JSON.parse(jsonString)
                    obj[key] = value
                    fs.writeFileSync(`${__dirname}/${dbName}.json`, JSON.stringify(obj))
                    resolve()
                } catch (err) {
                    reject(err)
                }
            })
        }
    }
}