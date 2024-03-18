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
    socket.emit("me", socket.id)
    console.log("connected", socket.id);

    socket.on("offer", ({ userToCall, signal, from, name }) => {
        console.log(from, "offer-userToCall", userToCall)
        // socket.join(userToCall)
        socket.to(userToCall).emit("offer", { signal, from, name })
    })

    socket.on("answer", ({ roomId, signal, name, from }) => {
        console.log(from, "answer-roomId", roomId)
        // socket.join(roomId)
        socket.to(roomId).emit("answer", {  signal, name, from  })
    })

    socket.on('candidate', ({ roomId, candidate }) => {
        // console.log("candidate-roomId", roomId)
        socket.to(roomId).emit('candidate', candidate)
    })

    socket.on('hangUp', ({ userToCall, from }) => {
        console.log(from, "from-hangUp-userToCall", userToCall)
        socket.to(userToCall).emit("hangUp", { isStopCall: true, from })
    })
})

server.listen(port, () => {
    `Server listening on port ${port}`
})