import useChatSocket from "../hooks/useChatSocket";
import useWebRTC from "../hooks/useWebRTC";
import useConnections from "../hooks/useConnections";
import useDiscoverUsers from "../hooks/useDiscoverUsers";

import Sidebar from "../components/chat/Sidebar";
import ChatWindow from "../components/chat/ChatWindow";
import CallingOverlay from "../components/chat/calls/CallingOverlay";
import IncomingCallOverlay from "../components/chat/calls/IncomingCallOverlay";
import ConnectedCallOverlay from "../components/chat/calls/ConnectedCallOverlay";
import VideoCall from "../components/chat/calls/VideoCall";
import "../styles/chat.css";
import { playNotificationSound } from "../utils/notificationSounds";


import { useCallback, useEffect, useRef, useState } from "react";

function Chat() {
    const [selectedUser, setSelectedUser] = useState(null);
    const [activeTab, setActiveTab] = useState("online");
    const [actionError, setActionError] = useState("");
    const [message, setMessage] = useState("");
    const [messages, setMessages] = useState([]);
    const [lastMessages, setLastMessages] = useState({});
    const [unreadCounts, setUnreadCounts] = useState({});
    const [showChat, setShowChat] = useState(false);
    const [typingUsers, setTypingUsers] = useState({});
    const [presenceByUser, setPresenceByUser] = useState({});
    const [discoverQuery, setDiscoverQuery] = useState("");

    const messagesEndRef = useRef(null);
    const remoteAudioRef = useRef(null);
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);

    // ---------------------------------------------------------
    const storedUser = localStorage.getItem("user");
    const user = storedUser ? JSON.parse(storedUser) : null;

    const handleConnectionRequestNotification = useCallback(() => {
        const enabled = localStorage.getItem("chatnova_notification_sound") !== "false";
        const selectedSound = localStorage.getItem("chatnova_notification_sound_type") || "default";
        if (enabled) playNotificationSound(selectedSound);
    }, []);

    useEffect(() => {
        const savedTheme = localStorage.getItem("chatnova_theme") || "light";
        document.body.setAttribute("data-chatnova-theme", savedTheme);
    }, []);

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

            const isOutsideActiveChat = senderId !== String(selectedUser);
            const soundEnabled = localStorage.getItem("chatnova_notification_sound") !== "false";
            const selectedSound = localStorage.getItem("chatnova_notification_sound_type") || "default";
            if (soundEnabled && (isOutsideActiveChat || document.hidden)) {
                playNotificationSound(selectedSound);
            }

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

    const handleTyping = useCallback(({ senderId }) => {
        setTypingUsers((prev) => ({
            ...prev,
            [String(senderId)]: true
        }));
    }, []);

    const handleStopTyping = useCallback(({ senderId }) => {
        setTypingUsers((prev) => ({
            ...prev,
            [String(senderId)]: false
        }));
    }, []);

    const handleMessagesRead = useCallback(({ readerId }) => {
        if (selectedUser && String(readerId) === String(selectedUser)) {
            setMessages((prevMessages) =>
                prevMessages.map((msg) => ({
                    ...msg,
                    isRead: true
                }))
            );
        }
    }, [selectedUser]);

    const handleMessageDelivered = useCallback(({ messageId, receiverId }) => {
        if (selectedUser && String(receiverId) === String(selectedUser)) {
            setMessages((prev) => prev.map((msg) =>
                String(msg._id) === String(messageId)
                    ? { ...msg, isDelivered: true }
                    : msg
            ));
        }
    }, [selectedUser]);

    const handleMessagesDelivered = useCallback(({ messageIds = [], receiverId }) => {
        if (selectedUser && String(receiverId) === String(selectedUser)) {
            const deliveredIds = new Set(messageIds.map(String));
            setMessages((prev) => prev.map((msg) =>
                deliveredIds.has(String(msg._id))
                    ? { ...msg, isDelivered: true }
                    : msg
            ));
        }
    }, [selectedUser]);

    const handleMessageReactionUpdated = useCallback(({ messageId, reactions }) => {
        setMessages((prevMessages) => prevMessages.map((msg) =>
            String(msg._id) === String(messageId)
                ? { ...msg, reactions }
                : msg
        ));
    }, []);

    const handlePresenceUpdated = useCallback((presence) => {
        if (!presence?.userId) return;
        setPresenceByUser((prev) => ({
            ...prev,
            [String(presence.userId)]: {
                ...(prev[String(presence.userId)] || {}),
                ...presence
            }
        }));
    }, []);

    const {
        onlineUsers,
        sendMessage: sendSocketMessage,
        emitTyping,
        emitStopTyping,
        markMessagesRead,
        emitMessageReaction,
        callUser: sendCallUser,
        acceptCall: sendCallAccepted,
        sendIceCandidate,
        sendIceRestartOffer,
        sendIceRestartAnswer,
        endCall: sendSocketEndCall,
        setActiveChat,
        setCallHandlers
    } = useChatSocket(
        user?.id,
        {
            onReceiveMessage: handleReceiveMessage,
            onMessageSent: handleMessageSent,

            onTyping: handleTyping,
            onStopTyping: handleStopTyping,
            onMessagesRead: handleMessagesRead,
            onMessageDelivered: handleMessageDelivered,
            onMessagesDelivered: handleMessagesDelivered,
            onMessageReactionUpdated: handleMessageReactionUpdated,
            onPresenceUpdated: handlePresenceUpdated

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

    const handleMediaCleanup = useCallback(() => {
        if (remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = null;
        }

        if (localVideoRef.current) {
            localVideoRef.current.srcObject = null;
        }

        if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = null;
        }

        console.log("🧹 Media elements cleaned");
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
        handleIceRestartOffer,
        handleIceRestartAnswer,
        cleanupCall,
        handleCallEnded
    } = useWebRTC({
        sendIceCandidate,
        sendIceRestartOffer,
        sendIceRestartAnswer,
        onRemoteStream: handleRemoteStream,
        onCallCleanup: handleMediaCleanup
    });

    const handleConnectionRemoved = useCallback((payload) => {
        if (selectedUser && String(payload?.userId) === String(selectedUser)) {
            if (callStatus !== "idle") endCall(payload.userId);
            setActiveChat(null);
            setSelectedUser(null);
            setMessages([]);
            setMessage("");
            setShowChat(false);
        }
    }, [selectedUser, callStatus]);
    const { connections, incoming, outgoing, pendingCount, loading: connectionsLoading, error: connectionsError, request: sendConnectionRequest, accept: acceptConnection, reject: rejectConnection, remove: removeConnection } = useConnections({
        onRequestReceived: handleConnectionRequestNotification,
        onConnectionRemoved: handleConnectionRemoved
    });
    const { users: discoverUsers, loading: discoverLoading, hasMore: discoverHasMore, error: discoverError, loadMore: loadMoreDiscover, refresh: refreshDiscover, updateRelation } = useDiscoverUsers(discoverQuery);
    useEffect(() => {
        if (activeTab === "discover") refreshDiscover();
    }, [connections, incoming, outgoing]);

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
            onCallEnded: handleCallEnded,

            onIceRestartOffer: handleIceRestartOffer,
            onIceRestartAnswer: handleIceRestartAnswer,
        });
    }, [
        setCallHandlers,
        handleCallAnswered,
        handleRemoteIceCandidate,
        handleCallEnded,

        handleIceRestartOffer,
        handleIceRestartAnswer
    ]);

    // --------------------------------------------------------------------
    // 
    // --------------------------------------------------------------------

    const selectedUserBase = connections.find(
        (connection) => String(connection.userId) === String(selectedUser)
    ) || onlineUsers.find((onlineUser) => String(onlineUser.userId) === String(selectedUser));
    const selectedUserData = {
        ...(selectedUserBase || {}),
        ...(presenceByUser[String(selectedUser)] || {})
    };

    const selectedUsername = selectedUserData?.username || selectedUser;
    const selectedUserPicture = selectedUserData?.profilePicture || "";
    const selectedUserIsOnline = selectedUserData?.status === "online" || onlineUsers.some(
        (onlineUser) => String(onlineUser.userId) === String(selectedUser)
    );

    const callerUserData = connections.find((connection) => String(connection.userId) === String(caller)) || onlineUsers.find((onlineUser) => String(onlineUser.userId) === String(caller));

    const callerUsername = callerUserData?.username || caller;
    const callerUserPicture = callerUserData?.profilePicture || "";


    const sendMessage = () => {

        if (!message.trim() || !selectedUser) {
            return;
        }

        const messageText = message.trim();

        if (emitStopTyping) {
            emitStopTyping(selectedUser);
        }


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
            createPeerConnection(selectedUser, true);

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
            createPeerConnection(selectedUser, true);

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
            targetUserId !== null && targetUserId !== undefined
                ? String(targetUserId)
                : null;

        cleanupCall();

        if (targetId) {
            console.log("📴 Sending endCall to:", targetId);
            sendSocketEndCall(targetId);
        }
    };

    const onlineIds = new Set(onlineUsers.map((item) => String(item.userId)));
    const onlineConnections = connections.filter((item) => onlineIds.has(String(item.userId)));
    const sidebarUsers = activeTab === "online" ? onlineConnections
        : activeTab === "meet" ? connections
            : activeTab === "discover" ? discoverUsers
                : { incoming, outgoing };

    const handleConnectionAction = async (action, item) => {
        setActionError("");
        const userId = String(item.userId);
        const connectionId = item.connectionId || incoming.find((entry) => String(entry.userId) === userId)?.connectionId;
        const previousRelation = item.relation;
        try {
            if (action === "request") {
                updateRelation(userId, "request_sent");
                try { await sendConnectionRequest(userId); }
                catch (error) { updateRelation(userId, previousRelation || "none"); throw error; }
                refreshDiscover();
            } else if (action === "accept") {
                await acceptConnection(connectionId);
                refreshDiscover();
            } else if (action === "reject") {
                await rejectConnection(connectionId);
                refreshDiscover();
            } else if (action === "remove") {
                await removeConnection(connectionId);
                if (selectedUser && String(selectedUser) === userId) {
                    if (callStatus !== "idle") endCall(selectedUser);
                    setActiveChat(null);
                    setSelectedUser(null);
                    setMessages([]);
                    setMessage("");
                    setShowChat(false);
                }
                refreshDiscover();
            }
        } catch (error) {
            setActionError(error.message || "Something went wrong");
        }
    };

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
        if (markMessagesRead) {
            markMessagesRead(userId);
        }
        setUnreadCounts((prev) => ({
            ...prev,
            [userId]: 0
        }));

        await loadMessages(userId);

        setShowChat(true);
    };

    const handleBackToSidebar = () => {
        if (selectedUser && emitStopTyping) {
            emitStopTyping(selectedUser);
        }
        setActiveChat(null);
        setSelectedUser(null);
        setShowChat(false);
    };

    return (
        <div className={`chat-page ${showChat ? "mobile-chat-open" : "mobile-sidebar-open"}`}>

            <Sidebar
                user={user}
                activeTab={activeTab}
                setActiveTab={(tab) => { setActiveTab(tab); setActionError(""); }}
                users={sidebarUsers}
                selectedUser={selectedUser}
                onSelectUser={selectUser}
                searchText={discoverQuery}
                setSearchText={setDiscoverQuery}
                lastMessages={lastMessages}
                unreadCounts={unreadCounts}
                typingUsers={typingUsers}
                onAction={handleConnectionAction}
                onScrollEnd={() => { if (activeTab === "discover" && discoverHasMore) loadMoreDiscover(); }}
                loading={activeTab === "discover" ? discoverLoading : connectionsLoading}
                error={actionError || (activeTab === "discover" ? discoverError : connectionsError)}
                pendingCount={pendingCount}
            />

            <ChatWindow
                selectedUser={selectedUser}
                headerUsername={selectedUsername}
                profilePicture={selectedUserPicture}
                messages={messages}
                message={message}
                setMessage={setMessage}
                onSend={sendMessage}
                currentUserId={user.id}
                isOnline={selectedUserIsOnline}
                lastSeen={selectedUserData?.lastSeen || null}
                bio={selectedUserData?.bio || ""}
                onBack={handleBackToSidebar}
                onAudioCall={startAudioCall}
                onVideoCall={startVideoCall}
                isTyping={typingUsers[String(selectedUser)] === true}
                onTyping={emitTyping}
                onStopTyping={emitStopTyping}
                onReact={emitMessageReaction}
            />

            {callStatus === "calling" && (
                <CallingOverlay
                    selectedUser={selectedUser}
                    displayName={selectedUsername}
                    profilePicture={selectedUserPicture}
                    callType={callType}
                    onEndCall={() => endCall(selectedUser)}
                />
            )}

            {callStatus === "incoming" && (
                <IncomingCallOverlay
                    caller={caller}
                    displayName={callerUsername}
                    profilePicture={callerUserPicture}
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
                        profilePicture={selectedUserPicture}
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