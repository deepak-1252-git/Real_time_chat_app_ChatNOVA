import useChatSocket from "../hooks/useChatSocket";
import useWebRTC from "../hooks/useWebRTC";

import Sidebar from "../components/chat/Sidebar";
import ChatWindow from "../components/chat/ChatWindow";
import CallingOverlay from "../components/chat/calls/CallingOverlay";
import IncomingCallOverlay from "../components/chat/calls/IncomingCallOverlay";
import ConnectedCallOverlay from "../components/chat/calls/ConnectedCallOverlay";
import VideoCall from "../components/chat/calls/VideoCall";
import "../styles/chat.css";


import { useCallback, useEffect, useRef, useState } from "react";

function Chat() {
    const [selectedUser, setSelectedUser] = useState(null);
    const [searchText, setSearchText] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [message, setMessage] = useState("");
    const [messages, setMessages] = useState([]);
    const [lastMessages, setLastMessages] = useState({});
    const [unreadCounts, setUnreadCounts] = useState({});
    const [showChat, setShowChat] = useState(false);

    const messagesEndRef = useRef(null);
    const remoteAudioRef = useRef(null);
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);

    // ---------------------------------------------------------
    const storedUser = localStorage.getItem("user");
    const user = storedUser ? JSON.parse(storedUser) : null;

    useEffect(() => {

        messagesEndRef.current?.scrollIntoView({
            behavior: "smooth"
        });

    }, [messages]);

    // -----------------------------------------------------
    //      useChatsocket
    // -----------------------------------------------------
    const handleReceiveMessage = useCallback(
        (newMessage) => {

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

        },
        [selectedUser]
    );

    const handleMessageSent = useCallback(
        (savedMessage) => {

            console.log(
                "Message saved successfully:",
                savedMessage
            );

            // Agar isi user ke saath current chat open hai
            if (
                String(savedMessage.receiverId) ===
                String(selectedUser)
            ) {

                setMessages((prevMessages) => {
                    const alreadyExists = prevMessages.some(
                        (msg) =>
                            String(msg._id) ===
                            String(savedMessage._id)
                    );

                    if (alreadyExists) {
                        return prevMessages;
                    }

                    return [
                        ...prevMessages,
                        savedMessage
                    ];

                });

            }

            // Last message update
            setLastMessages((prev) => ({
                ...prev,
                [String(savedMessage.receiverId)]: savedMessage
            }));

        },
        [selectedUser]
    );

    const {
        onlineUsers,
        sendMessage: sendSocketMessage,
        callUser: sendCallUser,
        acceptCall: sendCallAccepted,
        sendIceCandidate,
        endCall: sendSocketEndCall,
        setActiveChat,
        setCallHandlers
    } = useChatSocket(
        user?.id,
        {
            onReceiveMessage: handleReceiveMessage,
            onMessageSent: handleMessageSent,

        }
    );

    // --------------------------------------------------------------------
    //          useWebRTC
    // --------------------------------------------------------------------

    const handleRemoteStream = useCallback((remoteStream) => {

        remoteStreamRef.current = remoteStream;

        if (remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = remoteStream;

            console.log(
                "✅ Remote audio attached to audio element"
            );
        }

        if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream;

            console.log(
                "✅ Remote video attached to video element"
            );
        }

        console.log(
            "✅ Remote stream received in Chat.jsx"
        );

    }, []);

    const {
        peerConnectionRef,
        localStreamRef,
        remoteStreamRef,
        remoteOfferRef,
        pendingIceCandidatesRef,

        callType,
        setCallType,

        callStatus,
        setCallStatus,

        caller,
        setCaller,

        isMuted,
        setIsMuted,

        isCameraOff,
        setIsCameraOff,

        createPeerConnection,
        getMicrophoneStream,
        getVideoStream,
        createOffer,
        createAnswer,

        handleCallAnswered,
        handleRemoteIceCandidate,
        handleCallEnded
    } = useWebRTC({
        sendIceCandidate,
        onRemoteStream: handleRemoteStream
    });

    // --------------------------------------------------------------------
    // 
    // --------------------------------------------------------------------

    useEffect(() => {
        setCallHandlers({
            onIncomingCall: (callData) => {
                remoteOfferRef.current = callData.offer;

                setCaller(callData.callerId);
                setCallType(callData.callType);
                setCallStatus("incoming");
            },

            onCallAnswered: handleCallAnswered,

            onIceCandidate: handleRemoteIceCandidate,

            onCallEnded: handleCallEnded
        });
    }, [
        setCallHandlers,
        handleCallAnswered,
        handleRemoteIceCandidate,
        handleCallEnded
    ]);

    // --------------------------------------------------------------------
    // 
    // --------------------------------------------------------------------

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

        const searchUsers = async () => {

            const query = searchText.trim();

            // Search empty hai → backend call ki zarurat nahi
            if (!query) {
                setSearchResults([]);
                return;
            }

            try {

                const token = localStorage.getItem("token");

                const response = await fetch(
                    `${import.meta.env.VITE_API_URL}/api/users/search?q=${encodeURIComponent(query)}`,
                    {
                        method: "GET",
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    }
                );

                const data = await response.json();

                if (response.ok && data.success) {

                    setSearchResults(data.users);

                } else {

                    setSearchResults([]);

                }

            } catch (error) {

                console.error(
                    "User search failed:",
                    error
                );

                setSearchResults([]);

            }

        };

        const timer = setTimeout(
            searchUsers,
            300
        );

        return () => {
            clearTimeout(timer);
        };

    }, [searchText]);

    const sendMessage = () => {

        if (!message.trim() || !selectedUser) {
            return;
        }

        const messageText = message.trim();

        sendSocketMessage(
            selectedUser,
            messageText
        );

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

    const loadUnreadCounts = async () => {

        try {

            const token = localStorage.getItem("token");

            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/api/messages/unread`,
                {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            const data = await response.json();

            if (response.ok && data.success) {

                setUnreadCounts(data.unreadCounts);

            }

        } catch (error) {

            console.error(
                "Failed to load unread counts:",
                error
            );

        }

    };

    useEffect(() => {

        const loadUnreadCounts = async () => {

            try {

                const token = localStorage.getItem("token");

                if (!token) {
                    return;
                }

                const response = await fetch(
                    `${import.meta.env.VITE_API_URL}/api/messages/unread`,
                    {
                        method: "GET",
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    }
                );

                const data = await response.json();

                if (response.ok && data.success) {

                    setUnreadCounts(data.unreadCounts || {});

                }

            } catch (error) {

                console.error(
                    "Failed to load unread counts:",
                    error
                );

            }

        };

        loadUnreadCounts();

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
            await createOffer(
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

        sendCallUser({
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

        const offer = await createOffer(peerConnection);

        if (!offer) {
            stream.getTracks().forEach((track) => track.stop());
            peerConnection.close();
            peerConnectionRef.current = null;
            localStreamRef.current = null;
            return;
        }

        console.log(
            "Video call offer created:",
            offer
        );

        setCallType("video");
        setCallStatus("calling");

        sendCallUser({
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

    useEffect(() => {

        const localStream = localStreamRef.current;

        if (localStream && localVideoRef.current) {
            localVideoRef.current.srcObject = localStream;
            console.log("✅ Local video attached to video element");
        }

        const remoteStream = remoteStreamRef.current;

        if (remoteStream && remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream;

            console.log("✅ Remote video attached to video element");
        }

    }, [callStatus, callType]);

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
            await createAnswer(
                peerConnection,
                remoteOfferRef.current
            );

        if (!answer) {
            return;
        }

        sendCallAccepted({
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

        const answer = await createAnswer(
            peerConnection,
            remoteOfferRef.current
        );

        if (!answer) {
            return;
        }

        sendCallAccepted({
            callerId: caller,
            answer
        });

        setCallStatus("connected");

        console.log("Video call accepted");

    };

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

    const endCall = (targetUserId) => {

        console.log("Ending call:", targetUserId);

        const targetId =
            targetUserId !== null &&
                targetUserId !== undefined
                ? String(targetUserId)
                : null;

        if (localStreamRef.current) {
            localStreamRef.current
                .getTracks()
                .forEach((track) => track.stop());

            localStreamRef.current = null;
        }

        if (peerConnectionRef.current) {
            peerConnectionRef.current.close();
            peerConnectionRef.current = null;
        }

        remoteStreamRef.current = null;

        if (remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = null;
        }

        if (localVideoRef.current) {
            localVideoRef.current.srcObject = null;
        }

        if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = null;
        }

        remoteOfferRef.current = null;
        pendingIceCandidatesRef.current = [];

        setCallStatus("idle");
        setCallType(null);
        setCaller(null);
        setIsMuted(false);
        setIsCameraOff(false);

        if (targetId) {
            console.log("📴 Sending endCall to:", targetId);
            sendSocketEndCall(targetId);
        }
    };

    const displayUsers = (
        searchText.trim()
            ? searchResults
            : onlineUsers
    ).filter(
        (onlineUser) =>
            String(onlineUser.userId) !== String(user?.id)
    );

    const selectUser = async (userId) => {

        setSelectedUser(userId);

        setActiveChat(userId);

        setMessages([]);

        try {

            const token = localStorage.getItem("token");

            await fetch(
                `${import.meta.env.VITE_API_URL}/api/messages/read/${userId}`,
                {
                    method: "PUT",
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

        } catch (error) {

            console.error(
                "Failed to mark messages as read:",
                error
            );

        }

        setUnreadCounts((prev) => ({
            ...prev,
            [userId]: 0
        }));

        await loadMessages(userId);

        setShowChat(true);
    };

    const handleBackToSidebar = () => {

        setActiveChat(null);

        setShowChat(false);
    };

    return (
        <div className={`chat-page ${showChat ? "mobile-chat-open" : "mobile-sidebar-open"}`}>

            <Sidebar
                user={user}
                displayUsers={displayUsers}
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
                    onEndCall={() => endCall(selectedUser)}
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
                    onReject={() => endCall(caller)}
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
                        onEndCall={() => endCall(selectedUser || caller)}
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
                        onEndCall={() => endCall(selectedUser || caller)}
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