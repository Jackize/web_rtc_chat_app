const app = require("express")()
const server = require("http").createServer(app)
const cors = require("cors")

const io = require("socket.io")(server, {
    cors: {
        origin: '*',
        methods: ["GET", "POST"]
    }
})

app.use(cors())

const port = process.env.PORT || 5000

app.get("/", (req, res) => {
    res.send("Server is running.")
})

io.on('connection', (socket) => {
    socket.join(1)
    socket.emit("me", socket.id)

    socket.on("offer", ({ userToCall, signal, from, name }) => {
        socket.join(userToCall)
        socket.to(userToCall).emit("offer", { signal, from, name })
    })

    socket.on("answer", ({ roomId, signal, name }) => {
        socket.to(roomId).emit("answer", signal, name)
    })

    socket.on('candidate', ({ roomId, candidate }) => {
        socket.to(roomId).emit('candidate', candidate)
    })

    socket.on('hangUp', ({ roomId }) => {
        socket.to(roomId).emit(true)
    })
})

server.listen(port, () => {
    `Server listening on port ${port}`
})