import Sidebar from "../components/chat/Sidebar";
import ChatWindow from "../components/chat/ChatWindow";
import CallingOverlay from "../components/chat/calls/CallingOverlay";
import IncomingCallOverlay from "../components/chat/calls/IncomingCallOverlay";
import ConnectedCallOverlay from "../components/chat/calls/ConnectedCallOverlay";
import VideoCall from "../components/chat/calls/VideoCall";
import "../styles/chat.css";


import { useEffect, useRef, useState } from "react";
import socket from "../socket";

function Chat() {
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [searchText, setSearchText] = useState("");

    const [message, setMessage] = useState("");
    const [messages, setMessages] = useState([]);
    const [lastMessages, setLastMessages] = useState({});
    const [unreadCounts, setUnreadCounts] = useState({});

    const [showChat, setShowChat] = useState(false);

    const [callType, setCallType] = useState(null);
    const [callStatus, setCallStatus] = useState("idle");
    const [caller, setCaller] = useState(null);
    const [isMuted, setIsMuted] = useState(false);
    const [isCameraOff, setIsCameraOff] = useState(false);

    const messagesEndRef = useRef(null);

    const peerConnectionRef = useRef(null);
    const localStreamRef = useRef(null);
    const remoteStreamRef = useRef(null);
    const remoteOfferRef = useRef(null);
    const remoteAudioRef = useRef(null);
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const pendingIceCandidatesRef = useRef([]);

    const rtcConfig = {
        iceServers: [
            {
                urls: "stun:stun.l.google.com:19302"
            }
        ]
    };

    const storedUser =
        localStorage.getItem("user");

    const user = storedUser
        ? JSON.parse(storedUser)
        : null;

    const selectedUserData = onlineUsers.find(
        (user) =>
            String(user.userId) ===
            String(selectedUser));
    const selectedUsername = selectedUserData?.username || selectedUser;

    const callerUserData = onlineUsers.find(
        (onlineUser) =>
            String(onlineUser.userId) ===
            String(caller)
    );
    const callerUsername = callerUserData?.username || caller;

    useEffect(() => {

        if (!user?.id) {
            return;
        }

        console.log("Socket connected:", socket.id);
        socket.emit("userConnected", user.id);

        socket.on("onlineUsers", (users) => {

            setOnlineUsers(users);

        });

        return () => {
            socket.off("onlineUsers");
        };

    }, []);

    useEffect(() => {

        messagesEndRef.current?.scrollIntoView({
            behavior: "smooth"
        });

    }, [messages]);

    useEffect(() => {

        const handleReceiveMessage = (newMessage) => {

            console.log("New message:", newMessage);

            const senderId = String(newMessage.senderId);

            setLastMessages((prev) => ({
                ...prev,
                [senderId]: newMessage
            }));

            if (senderId === String(selectedUser)) {

                setMessages((prevMessages) => [
                    ...prevMessages,
                    newMessage
                ]);

                return;
            }

            setUnreadCounts((prev) => ({
                ...prev,
                [senderId]: (prev[senderId] || 0) + 1
            }));

        };

        socket.on("receiveMessage", handleReceiveMessage);

        return () => {
            socket.off("receiveMessage", handleReceiveMessage);
        };

    }, [selectedUser]);

    const sendMessage = () => {

        if (!message.trim() || !selectedUser) {
            return;
        }

        const messageText = message.trim();

        socket.emit("sendMessage", {
            receiverId: selectedUser,
            message: messageText
        });

        setLastMessages((prev) => ({
            ...prev,
            [String(selectedUser)]: {
                message: messageText,
                createdAt: new Date().toISOString()
            }
        }));

        setMessage("");
    };
    const loadMessages = async (userId) => {

        try {

            const token = localStorage.getItem("token");

            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/api/messages/${userId}`,
                {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            const data = await response.json();

            if (data.success) {
                setMessages(data.messages);
            }

        } catch (error) {

            console.error(
                "Failed to load messages:",
                error
            );

        }

    };

    useEffect(() => {

        const handleIncomingCall = (callData) => {

            console.log(
                "Incoming call:",
                callData
            );

            remoteOfferRef.current = callData.offer;

            setCaller(callData.callerId);
            setCallType(callData.callType);
            setCallStatus("incoming");

        };

        socket.on(
            "incomingCall",
            handleIncomingCall
        );

        return () => {

            socket.off(
                "incomingCall",
                handleIncomingCall
            );

        };

    }, []);

    const startAudioCall = async () => {

        if (!selectedUser) {
            return;
        }

        const peerConnection =
            createPeerConnection(selectedUser);

        const stream =
            await getMicrophoneStream();

        if (!stream) {

            peerConnection.close();

            peerConnectionRef.current = null;

            return;
        }

        stream.getTracks().forEach((track) => {

            peerConnection.addTrack(
                track,
                stream
            );

        });

        console.log(
            "Microphone track added to WebRTC"
        );

        const offer =
            await createAudioOffer(
                peerConnection
            );

        if (!offer) {

            stream.getTracks().forEach(
                (track) => track.stop()
            );

            peerConnection.close();

            peerConnectionRef.current = null;
            localStreamRef.current = null;

            return;
        }

        setCallType("audio");
        setCallStatus("calling");

        socket.emit("callUser", {
            receiverId: selectedUser,
            callerId: user.id,
            callType: "audio",
            offer
        });

        console.log(
            "Starting audio call with:",
            selectedUser
        );
    };

    const startVideoCall = async () => {

        if (!selectedUser) {
            return;
        }

        const peerConnection =
            createPeerConnection(selectedUser);

        const stream =
            await getVideoStream();

        if (!stream) {

            peerConnection.close();

            peerConnectionRef.current = null;

            return;
        }

        stream.getTracks().forEach((track) => {

            peerConnection.addTrack(
                track,
                stream
            );

        });

        console.log(
            "Audio + video tracks added to WebRTC"
        );

        const offer =
            await peerConnection.createOffer();

        await peerConnection.setLocalDescription(
            offer
        );

        console.log(
            "Video call offer created:",
            offer
        );

        setCallType("video");
        setCallStatus("calling");

        socket.emit("callUser", {
            receiverId: selectedUser,
            callerId: user.id,
            callType: "video",
            offer
        });

        console.log(
            "Video call offer sent to:",
            selectedUser
        );
    };

    const createPeerConnection = (targetUserId) => {

        const peerConnection =
            new RTCPeerConnection(rtcConfig);

        peerConnectionRef.current =
            peerConnection;

        peerConnection.onicecandidate = (event) => {

            if (!event.candidate) {
                return;
            }

            console.log(
                "Local ICE candidate:",
                event.candidate
            );

            socket.emit("iceCandidate", {
                targetUserId,
                candidate: event.candidate
            });

        };
        // REMOTE AUDIO + VIDEO
        peerConnection.ontrack = (event) => {

            const remoteStream =
                event.streams[0];

            console.log(
                "🔥 REMOTE STREAM RECEIVED:",
                remoteStream
            );

            console.log(
                "Remote video tracks:",
                remoteStream.getVideoTracks()
            );

            console.log(
                "Remote audio tracks:",
                remoteStream.getAudioTracks()
            );

            remoteStreamRef.current = remoteStream;

            // Remote audio
            if (remoteAudioRef.current) {

                remoteAudioRef.current.srcObject =
                    remoteStream;

            }
            // Remote video
            if (remoteVideoRef.current) {

                remoteVideoRef.current.srcObject =
                    remoteStream;

            }
        };

        peerConnection.onconnectionstatechange = () => {

            console.log(
                "WebRTC connection state:",
                peerConnection.connectionState
            );

        };

        console.log(
            "WebRTC PeerConnection created"
        );


        return peerConnection;
    };

    const getMicrophoneStream = async () => {

        try {

            const stream =
                await navigator.mediaDevices.getUserMedia({
                    audio: true,
                    video: false
                });

            localStreamRef.current = stream;

            console.log(
                "Microphone access granted"
            );

            console.log(
                "Audio tracks:",
                stream.getAudioTracks()
            );

            return stream;

        } catch (error) {

            console.error(
                "Microphone access failed:",
                error
            );

            return null;
        }
    };

    useEffect(() => {

        const localStream =
            localStreamRef.current;

        if (
            localStream &&
            localVideoRef.current
        ) {

            localVideoRef.current.srcObject =
                localStream;

            console.log(
                "✅ Local video attached to video element"
            );
        }

        const remoteStream =
            remoteStreamRef.current;

        if (
            remoteStream &&
            remoteVideoRef.current
        ) {

            remoteVideoRef.current.srcObject =
                remoteStream;

            console.log(
                "✅ Remote video attached to video element"
            );
        }

        if (
            remoteStream &&
            remoteAudioRef.current
        ) {

            remoteAudioRef.current.srcObject =
                remoteStream;

            console.log(
                "✅ Remote audio attached to audio element"
            );
        }

    }, [callStatus, callType]);

    const getVideoStream = async () => {

        try {

            const stream =
                await navigator.mediaDevices.getUserMedia({
                    audio: true,
                    video: true
                });

            localStreamRef.current = stream;

            console.log("VIDEO STREAM:", stream);

            console.log(
                "VIDEO TRACKS:",
                stream.getVideoTracks()
            );

            if (localVideoRef.current) {

                localVideoRef.current.srcObject =
                    stream;

                console.log(
                    "Local video stream attached"
                );

            } else {

                console.log(
                    "❌ localVideoRef is NULL"
                );
            }

            return stream;

        } catch (error) {

            console.error(
                "Camera + microphone access failed:",
                error
            );

            return null;
        }
    };

    const toggleCamera = () => {

        const stream = localStreamRef.current;

        if (!stream) {
            return;
        }

        const videoTrack =
            stream.getVideoTracks()[0];

        if (!videoTrack) {
            return;
        }

        videoTrack.enabled =
            !videoTrack.enabled;

        setIsCameraOff(!videoTrack.enabled);

    };

    const createAudioOffer = async (peerConnection) => {

        try {

            const offer =
                await peerConnection.createOffer();

            await peerConnection.setLocalDescription(
                offer
            );

            console.log(
                "WebRTC offer created:",
                offer
            );

            return offer;

        } catch (error) {

            console.error(
                "Failed to create WebRTC offer:",
                error
            );

            return null;
        }
    };

    const createAudioAnswer = async (
        peerConnection,
        offer
    ) => {

        try {

            await peerConnection.setRemoteDescription(
                new RTCSessionDescription(offer)
            );

            console.log(
                "Remote offer set successfully"
            );

            const pendingCandidates =
                pendingIceCandidatesRef.current;

            for (
                const candidate of pendingCandidates
            ) {

                try {

                    await peerConnection.addIceCandidate(
                        new RTCIceCandidate(candidate)
                    );

                    console.log(
                        "Queued ICE candidate added"
                    );

                } catch (error) {

                    console.error(
                        "Failed to add queued ICE candidate:",
                        error
                    );

                }

            }

            pendingIceCandidatesRef.current = [];

            const answer =
                await peerConnection.createAnswer();

            await peerConnection.setLocalDescription(
                answer
            );

            console.log(
                "WebRTC answer created:",
                answer
            );

            return answer;

        } catch (error) {

            console.error(
                "Failed to create WebRTC answer:",
                error
            );

            return null;
        }
    };

    const acceptAudioCall = async () => {

        if (!caller || !remoteOfferRef.current) {
            console.error(
                "Missing caller or offer"
            );
            return;
        }

        const peerConnection =
            createPeerConnection(caller);

        const stream =
            await getMicrophoneStream();

        if (!stream) {

            peerConnection.close();

            peerConnectionRef.current = null;

            return;
        }

        stream.getTracks().forEach((track) => {

            peerConnection.addTrack(
                track,
                stream
            );

        });

        console.log(
            "Receiver microphone track added"
        );

        const answer =
            await createAudioAnswer(
                peerConnection,
                remoteOfferRef.current
            );

        if (!answer) {
            return;
        }

        socket.emit("callAccepted", {
            callerId: caller,
            answer
        });

        setCallStatus("connected");

        console.log(
            "Audio call accepted"
        );
    };

    const acceptVideoCall = async () => {

        if (!caller || !remoteOfferRef.current) {

            console.error(
                "Missing caller or offer"
            );

            return;
        }

        const peerConnection =
            createPeerConnection(caller);

        const stream =
            await getVideoStream();

        if (!stream) {

            peerConnection.close();

            peerConnectionRef.current = null;

            return;
        }

        stream.getTracks().forEach((track) => {

            peerConnection.addTrack(
                track,
                stream
            );

        });

        console.log(
            "Receiver audio + video tracks added"
        );

        try {

            await peerConnection.setRemoteDescription(
                new RTCSessionDescription(
                    remoteOfferRef.current
                )
            );

            const answer =
                await peerConnection.createAnswer();

            await peerConnection.setLocalDescription(
                answer
            );

            socket.emit("callAccepted", {
                callerId: caller,
                answer
            });

            setCallStatus("connected");

            console.log(
                "Video call accepted"
            );

        } catch (error) {

            console.error(
                "Video answer failed:",
                error
            );

        }
    };

    useEffect(() => {

        const handleCallAnswered = async ({
            answer
        }) => {

            console.log(
                "Received WebRTC answer:",
                answer
            );

            const peerConnection =
                peerConnectionRef.current;

            if (!peerConnection) {

                console.error(
                    "PeerConnection not found"
                );

                return;
            }

            try {

                await peerConnection.setRemoteDescription(
                    new RTCSessionDescription(answer)
                );

                console.log(
                    "Remote answer set successfully"
                );

                setCallStatus("connected");

            } catch (error) {

                console.error(
                    "Failed to set remote answer:",
                    error
                );

            }

        };

        socket.on(
            "callAnswered",
            handleCallAnswered
        );

        return () => {

            socket.off(
                "callAnswered",
                handleCallAnswered
            );

        };

    }, []);

    useEffect(() => {

        const handleRemoteIceCandidate = async ({
            candidate
        }) => {
            console.log(
                "Received remote ICE candidate:",
                candidate
            );
            const peerConnection =
                peerConnectionRef.current;

            if (!peerConnection) {
                console.log(
                    "PeerConnection not ready. Queueing ICE candidate."
                );
                pendingIceCandidatesRef.current.push(
                    candidate
                );
                return;
            }

            if (
                !peerConnection.remoteDescription
            ) {
                console.log(
                    "Remote description not ready. Queueing ICE candidate."
                );
                pendingIceCandidatesRef.current.push(
                    candidate
                );
                return;
            }

            try {
                await peerConnection.addIceCandidate(
                    new RTCIceCandidate(candidate)
                );
                console.log(
                    "Remote ICE candidate added"
                );
            } catch (error) {

                console.error(
                    "Failed to add remote ICE candidate:",
                    error
                );
            }
        };

        socket.on(
            "iceCandidate",
            handleRemoteIceCandidate
        );

        return () => {

            socket.off(
                "iceCandidate",
                handleRemoteIceCandidate
            );

        };

    }, []);

    const toggleMute = () => {

        const stream = localStreamRef.current;

        if (!stream) {
            return;
        }

        const audioTrack =
            stream.getAudioTracks()[0];

        if (!audioTrack) {
            return;
        }

        audioTrack.enabled =
            !audioTrack.enabled;

        setIsMuted(!audioTrack.enabled);

        console.log(
            audioTrack.enabled
                ? "Microphone unmuted"
                : "Microphone muted"
        );
    };

    const endCall = () => {

        console.log("Ending call");

        if (localStreamRef.current) {

            localStreamRef.current
                .getTracks()
                .forEach((track) => {
                    track.stop();
                });

            localStreamRef.current = null;
        }

        if (peerConnectionRef.current) {

            peerConnectionRef.current.close();

            peerConnectionRef.current = null;
        }

        if (remoteAudioRef.current) {

            remoteAudioRef.current.srcObject = null;
        }

        if (selectedUser) {

            socket.emit("endCall", {
                targetUserId: selectedUser
            });

        }

        setCallStatus("idle");
        setCallType(null);
        setCaller(null);
        setIsMuted(false);

        remoteOfferRef.current = null;
    };

    useEffect(() => {

        const handleCallEnded = () => {

            console.log(
                "Call ended by other user"
            );

            if (localStreamRef.current) {

                localStreamRef.current
                    .getTracks()
                    .forEach((track) => {
                        track.stop();
                    });

                localStreamRef.current = null;
            }

            if (peerConnectionRef.current) {

                peerConnectionRef.current.close();

                peerConnectionRef.current = null;
            }

            if (remoteAudioRef.current) {

                remoteAudioRef.current.srcObject = null;
            }

            setCallStatus("idle");
            setCallType(null);
            setCaller(null);
            setIsMuted(false);

            remoteOfferRef.current = null;
        };

        socket.on(
            "callEnded",
            handleCallEnded
        );

        return () => {

            socket.off(
                "callEnded",
                handleCallEnded
            );

        };

    }, []);

    const filteredUsers = onlineUsers.filter((userId) =>
        String(userId)
            .toLowerCase()
            .includes(searchText.toLowerCase())
    );

    const selectUser = (userId) => {
        setSelectedUser(userId);
        setMessages([]);
        loadMessages(userId);
        setUnreadCounts((prev) => ({
            ...prev,
            [userId]: 0
        }));
        setShowChat(true);
    };

    const handleBackToSidebar = () => {
        setShowChat(false);
    };

    return (
        <div className={`chat-page ${showChat ? "mobile-chat-open" : "mobile-sidebar-open"}`}>

            <Sidebar
                user={user}
                onlineUsers={onlineUsers}
                selectedUser={selectedUser}
                onSelectUser={selectUser}
                searchText={searchText}
                setSearchText={setSearchText}
                lastMessages={lastMessages}
                unreadCounts={unreadCounts}
            />

            <ChatWindow
                selectedUser={selectedUser}
                headerUsername={selectedUsername}
                messages={messages}
                message={message}
                setMessage={setMessage}
                onSend={sendMessage}
                currentUserId={user.id}
                isOnline={onlineUsers.some(
                    (onlineUser) =>
                        String(onlineUser.userId) ===
                        String(selectedUser)
                )}
                onBack={handleBackToSidebar}
                onAudioCall={startAudioCall}
                onVideoCall={startVideoCall}
            />

            {callStatus === "calling" && (
                <CallingOverlay
                    selectedUser={selectedUser}
                    displayName={selectedUsername}
                    callType={callType}
                    onEndCall={endCall}
                />
            )}

            {callStatus === "incoming" && (
                <IncomingCallOverlay
                    caller={caller}
                    displayName={callerUsername}
                    callType={callType}
                    onAccept={
                        callType === "video"
                            ? acceptVideoCall
                            : acceptAudioCall
                    }
                    onReject={endCall}
                />
            )}

            {callStatus === "connected" &&
                callType === "audio" && (
                    <ConnectedCallOverlay
                        caller={caller}
                        selectedUser={selectedUser}
                        displayName={selectedUsername}
                        callType={callType}
                        isMuted={isMuted}
                        onMute={toggleMute}
                        onEndCall={endCall}
                    />
                )}
            {callStatus === "connected" &&
                callType === "video" &&
                (
                    <VideoCall
                        localVideoRef={localVideoRef}
                        remoteVideoRef={remoteVideoRef}
                        remoteUserName={selectedUsername}
                        isMuted={isMuted}
                        isCameraOff={isCameraOff}
                        onMute={toggleMute}
                        onCamera={toggleCamera}
                        onEndCall={endCall}
                    />
                )
            }
            <audio
                ref={remoteAudioRef}
                autoPlay
            />
        </div >
    );
}

export default Chat;