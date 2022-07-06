
const { WebSocketServer } = require("ws")
const fs = require("fs")
const { v4: uuidv4 } = require("uuid")

const server = new WebSocketServer({
    port: 3000
})

if (!fs.existsSync("./database.json")) {
    fs.writeFileSync("database.json", JSON.stringify([]))
}

const Database = (function() {
    return {
        continue(info) {
            let data = JSON.parse(fs.readFileSync("database.json"))
            data.push({
                username: info.username,
                uuid: uuidv4()
            })
            fs.writeFileSync("database.json", JSON.stringify(data))
            return data[data.length-1]
        },
        verify(info) {
            let data = JSON.parse(fs.readFileSync("database.json"))
            for (var user in data) {
                user = data[user]
                if (user.uuid === info.uuid) {
                    return true
                }
            }
        },
        requestToken(info) {
            if (this.verify(info)) {
                return uuidv4().split("-")[0]
            }
        }
    }
})()

const online = []

server.on("connection", (socket) => {
    socket.on("message", (data) => {
        packet = JSON.parse(data)
        if (packet.type.includes("request-continue")) {
            socket.send(JSON.stringify({
                type: "response-continue",
                content: Database.continue(packet.headers)
            }))
        } else if (packet.type.includes("request-token")) {
            token = Database.requestToken(packet.headers)
            online.push([socket, token, packet.headers.uuid])
            socket.send(JSON.stringify({
                type: "response-token",
                content: token
            }))
        } else if (packet.type.includes("request-send")) {
            for (var user in online) {
                user = online[user]
                if (user[2] === packet.headers.recepient_uuid) {
                    console.log("Sent.")
                    user[0].send(JSON.stringify({
                        type: "request-receive",
                        headers: packet.headers
                    }))
                }
            }
        }
    })
})