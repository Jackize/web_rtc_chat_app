import { createContext, useState, useRef, useEffect } from 'react'
import { io } from 'socket.io-client'

const configuration = {
    iceServers: [
        {
            urls: [
                'stun:stun1.l.google.com:19302',
                'stun:stun2.l.google.com:19302',
            ],
        },
        {
            url: 'turn:numb.viagenie.ca',
            credential: 'muazkh',
            username: 'webrtc@live.com'
        },
        {
            url: 'turn:192.158.29.39:3478?transport=udp',
            credential: 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
            username: '28224511:1379330808'
        },
        {
            url: 'turn:192.158.29.39:3478?transport=tcp',
            credential: 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
            username: '28224511:1379330808'
        },
        {
            url: 'turn:turn.bistri.com:80',
            credential: 'homeo',
            username: 'homeo'
        },
        {
            url: 'turn:turn.anyfirewall.com:443?transport=tcp',
            credential: 'webrtc',
            username: 'webrtc'
        }
    ],
    iceCandidatePoolSize: 10,
    // iceTransportPolicy: 'relay',
    // sdpSemantics: 'uinified-plan'
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

    // useEffect hook to manage socket events and peer connection handling
    useEffect(() => {
        // Set up socket event listeners for various signaling messages
        socket.on('me', (id) => setMe(id))
    
        socket.on('offer', async ({ from, name: callerName, signal }) => {
            setCall({ isReceivingCall: true, from, name: callerName, signal })
            setOffer(signal)
        })
    
        socket.on('answer', async ({  signal, name, from  }) => {
            try {
                setCall({ name, me, from })
                setCallAccepted(true)
                setCallEnded(false)
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
                    }
                }
            } catch (error) {
                console.log("🚀 ~ socket.on candidate error:", error)
            }
        })
    
        socket.on("hangUp", ({ isStopCall }) => {
            // close local media connection
            if (localStream.current) {
                localStream.current.getTracks().forEach(track => track.stop());
                localStream.current.srcObject = null
            }
            if (myVideo.current && myVideo.current.srcObject) {
                myVideo.current.srcObject.getTracks().forEach(track => track.stop());
            }
            // close remote media connection
            if (userVideo.current && userVideo.current.srcObject) {
                userVideo.current.srcObject.getTracks().forEach(track => track.stop());
            }
            setCallEnded(isStopCall)
            setCallAccepted(false);
            setCall({});
        })
    
        // Set up ontrack listener to handle incoming tracks for video streaming
        pc.ontrack = (ev) => {
            if (ev.streams) {
                userVideo.current.srcObject = ev.streams[0]
            }
        }
        // const [videoStream] = localStream.current.getTracks();
        // console.log(videoStream);
        // Clean up by removing socket event listeners
        return () => {
            socket.off('me')
            socket.off('offer')
            socket.off('answer')
            socket.off('candidate')
            socket.off('hangUp')
        }
    }, [])

    // Function to get the user media (video and audio) using navigator.mediaDevices.getUserMedia
    const getUserMedia = async () => {
        try {
            // Get the user media stream and set it to localStream
            localStream.current = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
            
            // Set the user media stream as the source object for myVideo element
            myVideo.current.srcObject = localStream.current
            
        } catch (e) {
            // Log any errors that occur during the getUserMedia process
            console.log("🚀 ~ getUserMedia ~ e:", e)
        }
    }

    const getDisplayMedia = async () => {
        try {
            localStream.current = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: true
            })
            myVideo.current.srcObject = localStream.current
            // If the video stream is available, add it to the peer connection
            if (localStream.current) {
                await pc.addStream(localStream.current)
            }

            // Set up a listener for ICE candidates and emit any candidates to the socket
            pc.onicecandidate = e => {
                if (e.candidate) {
                    socket.emit("candidate", { roomId: call.from, candidate: e.candidate })
                }
            }
            const [videoTrack,] = localStream.current.getTracks()
            console.log(localStream.current.getTracks());
            localStream.current.getTracks()[0].addEventListener("ended",async ()=>{
                await getUserMedia()
                // const [videoTrack,] = localStream.current.getTracks()
                // const sender = pc.getSenders().find(s => s.track.kind === videoTrack.kind)
                // sender.replaceTrack(videoTrack)
            })
            const sender = pc.getSenders().find(s => s.track.kind === videoTrack.kind)
            sender.replaceTrack(videoTrack)
            // pc.getSenders().forEach( sender => sender.replaceTrack(localStream.current.getVideoTracks().find(track => track.kind === "video")) )
        } catch (error) {
            console.log("🚀 ~ getDisplayMedia ~ error:", error)
        }
    }
    // Function to initiate a call to a user with the specified ID
    const callUser = async (id) => {
        try {
            // Get the user media stream
            await getUserMedia()
            // await getDisplayMedia()
            setCallEnded(false)
            // Add tracks from the local media stream to the peer connection
            localStream.current.getTracks().forEach(track => pc.addTrack(track, localStream.current));
            
            // Create an offer for the peer connection
            let offer = await pc.createOffer()
    
            // Set the local description of the peer connection to the offer
            await pc.setLocalDescription(offer)
    
            // Emit the offer to the specified user via the socket
            socket.emit('offer', { userToCall: id, signal: offer, from: me, name })

            // Set up a listener for ICE candidates and emit any candidates to the socket
            pc.onicecandidate = e => {
                if (e.candidate) {
                    socket.emit("candidate", { roomId: id, candidate: e.candidate })
                }
            }
        } catch (error) {
            // Log any errors that occur during the call process
            console.log("🚀 ~ callUser ~ error:", error)
        }
    }

    // Function to answer an incoming call
    const answerCall = async () => {
        try {
            // Get the user media stream
            await getUserMedia()
            setCallEnded(false)
            // Set the call as accepted
            setCallAccepted(true)
            
            // Add tracks from the local media stream to the peer connection
            localStream.current.getTracks().forEach(track => pc.addTrack(track, localStream.current));
    
            // Set the remote description of the peer connection to the offer
            const rtc_session_description = new RTCSessionDescription(offer)
            await pc.setRemoteDescription(rtc_session_description)
            
            // Create an answer for the peer connection
            let answer = await pc.createAnswer()
            
            // Set the local description of the peer connection to the answer
            await pc.setLocalDescription(answer)
            
            // Emit the answer to the socket
            socket.emit('answer', { roomId: call.from, signal: answer, name, from: me })
            
            // Set up a listener for ICE candidates and emit any candidates to the socket
            pc.onicecandidate = e => {
                if (e.candidate) {
                    socket.emit("candidate", { roomId: call.from, candidate: e.candidate })
                }
            }
        } catch (error) {
            // Log any errors that occur during the answer call process
            console.log("🚀 ~ answerCall ~ error:", error)
        }
    }

    // Function to end a call
    const leaveCall = () => {
        // Emit the hang up event to the socket
        socket.emit("hangUp", { userToCall: call.from, from: me })
        // Stop all tracks from the local media stream
        localStream.current.getTracks().forEach(track => track.stop())
        userVideo.current.srcObject.getTracks().forEach(track => track.stop())
        // Set the call as ended
        setCall({})
        setCallEnded(true)
        setCallAccepted(false)
    }

    return (
        <SocketContext.Provider value={{ call, callAccepted, myVideo, userVideo, name, setName, callEnded, me, callUser, leaveCall, answerCall, getDisplayMedia }}>
            {children}
        </SocketContext.Provider>
    )
}

export { ContextProvider, SocketContext }