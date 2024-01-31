import React, { createContext, useState, useRef, useEffect } from 'react'
import { io } from 'socket.io-client'

const configuration = {
    iceServers: [
        {
            urls: [
                'stun:stun1.l.google.com:19302',
                'stun:stun2.l.google.com:19302',
            ],
        },
    ],
    iceCandidatePoolSize: 10,
}
const SocketContext = createContext()
const socket = io(import.meta.env.VITE_URL_BE || 'http://localhost:5000', { transports: ['websocket'] })

const ContextProvider = ({ children }) => {
    const [me, setMe] = useState('')
    const [call, setCall] = useState({})
    const [callAccepted, setCallAccepted] = useState(false)
    const [callEnded, setCallEnded] = useState(false)
    const [name, setName] = useState('')
    const [pc, setPc] = useState(new RTCPeerConnection(configuration));
    const [offer, setOffer] = useState(null)
    const myVideo = useRef(null)
    const userVideo = useRef(null)
    const localStream = useRef(null)
    useEffect(() => {

        socket.on('me', (id) => setMe(id))

        socket.on('offer', async ({ from, name: callerName, signal }) => {
            setCall({ isReceivingCall: true, from, name: callerName, signal })
            setOffer(signal)
        })

        socket.on('answer', async (signal, name) => {
            try {
                setCall({ name })
                setCallAccepted(true)
                await pc.setRemoteDescription(signal);
            }
            catch (e) {
                console.log(e)
            }
        })

        socket.on('candidate', async (candidate) => {
            try {
                if (!candidate) {
                    await pc.addIceCandidate(null)
                } else {
                    if (pc.remoteDescription) {
                        await pc.addIceCandidate(candidate);
                    } else {
                        console.warn('Remote description is not set yet, skipping ICE candidate.');
                    }
                }
            } catch (error) {
                console.log("🚀 ~ socket.on candidate error:", error)
            }
        })

        socket.on("hangUp", (isStop) => {
            setCallEnded(isStop)
            pc.close()
        })

        pc.ontrack = (ev) => {
            if (ev.streams) {
                userVideo.current.srcObject = ev.streams[0]
            }
        }

        return () => {
            socket.off('me')
            socket.off('offer')
            socket.off('answer')
            socket.off('candidate')
        }
    }, [])

    const getUserMedia = async () => {
        try {
            localStream.current = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
            myVideo.current.srcObject = localStream.current
        } catch (e) {
            console.log("🚀 ~ getUserMedia ~ e:", e)
        }
    }

    const callUser = async (id) => {
        try {
            await getUserMedia()
            localStream.current.getTracks().forEach(track => pc.addTrack(track, localStream.current));
            let offer = await pc.createOffer()
            await pc.setLocalDescription(offer)
            socket.emit('offer', { userToCall: 1, signal: offer, from: me, name })
            pc.onicecandidate = e => {
                if (e.candidate) {
                    socket.emit("candidate", { roomId: 1, candidate: e.candidate })
                }
            }
        } catch (error) {
            console.log("🚀 ~ callUser ~ error:", error)
        }
    }

    const answerCall = async () => {
        try {
            await getUserMedia()
            setCallAccepted(true)
            pc.onicecandidate = e => {
                if (e.candidate) {
                    socket.emit("candidate", { roomId: 1, candidate: e.candidate })
                }
            }
            localStream.current.getTracks().forEach(track => pc.addTrack(track, localStream.current));

            const rtc_session_description = new RTCSessionDescription(offer)
            await pc.setRemoteDescription(rtc_session_description)
            let answer = await pc.createAnswer()
            await pc.setLocalDescription(answer)
            socket.emit('answer', { roomId: 1, signal: answer, name })
        } catch (error) {
            console.log("🚀 ~ answerCall ~ error:", error)
        }
    }
    const leaveCall = () => {
        setCallEnded(true)
        socket.emit("hangUp", { roomId: 1 })
        pc.close()
        localStream.current.getTracks().forEach(track => track.stop())

    }

    return (
        <SocketContext.Provider value={{ call, callAccepted, myVideo, userVideo, name, setName, callEnded, me, callUser, leaveCall, answerCall }}>
            {children}
        </SocketContext.Provider>
    )
}

export { ContextProvider, SocketContext }