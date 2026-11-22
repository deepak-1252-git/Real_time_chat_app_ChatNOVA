import { useEffect, useRef, useState, useCallback } from "react";
import socket from "../socket";

function useChatSocket(
    userId,
    {
        onReceiveMessage,
        onMessageSent,
        onIncomingCall,
        onCallAnswered,
        onIceCandidate,
        onCallEnded,

        onIceRestartOffer,
        onIceRestartAnswer,

        onTyping,
        onStopTyping,
        onMessagesRead,
        onMessageReactionUpdated,
        onConnectionRequestReceived,
        onConnectionAccepted,
        onConnectionRemoved,
        onActionRejected
    } = {}
) {

    const [onlineUsers, setOnlineUsers] = useState([]);
    const activeChatRef = useRef(null);

    const callbacksRef = useRef({
        onReceiveMessage,
        onMessageSent,
        onIncomingCall,
        onCallAnswered,
        onIceCandidate,
        onCallEnded,

        onIceRestartOffer,
        onIceRestartAnswer,

        onTyping,
        onStopTyping,
        onMessagesRead,
        onMessageReactionUpdated,
        onConnectionRequestReceived,
        onConnectionAccepted,
        onConnectionRemoved,
        onActionRejected
    });

    useEffect(() => {
        callbacksRef.current = {
            ...callbacksRef.current,

            onReceiveMessage,
            onMessageSent,
            onTyping,
            onStopTyping,
            onMessagesRead,
            onMessageReactionUpdated,
            onConnectionRequestReceived,
            onConnectionAccepted,
            onConnectionRemoved,
            onActionRejected
        };
    }, [
        onReceiveMessage,
        onMessageSent,
        onTyping,
        onStopTyping,
        onMessagesRead,
        onMessageReactionUpdated,
        onConnectionRequestReceived,
        onConnectionAccepted,
        onConnectionRemoved,
        onActionRejected
    ]);

    useEffect(() => {

        if (!userId) {
            return;
        }

        const handleConnect = () => {

            console.log(
                "Socket connected:",
                socket.id
            );

            socket.emit("activeChat", {
                userId: activeChatRef.current
            });
        };

        const handleDisconnect = (reason) => {

            console.log(
                "Socket disconnected:",
                reason
            );
        };

        const handleOnlineUsers = (users) => {

            console.log(
                "Online users updated:",
                users
            );

            setOnlineUsers(users);
        };

        const handleReceiveMessage = (newMessage) => {

            console.log("New message:", newMessage);

            callbacksRef.current.onReceiveMessage?.(newMessage);
        };

        const handleMessageSent = (savedMessage) => {

            console.log("Message saved successfully:", savedMessage);

            callbacksRef.current.onMessageSent?.(savedMessage);

        };

        const handleIncomingCall = (callData) => {

            console.log("📲 INCOMING CALL RECEIVED:", callData);

            callbacksRef.current.onIncomingCall?.(callData);
        };

        const handleCallAnswered = (callData) => {

            console.log("Received WebRTC answer:", callData);

            callbacksRef.current.onCallAnswered?.(callData);
        };

        const handleIceCandidate = (candidateData) => {

            console.log("Remote ICE candidate received:", candidateData);

            callbacksRef.current.onIceCandidate?.(candidateData);
        };

        const handleCallEnded = () => {
            console.log("Call ended by other user");

            callbacksRef.current.onCallEnded?.();
        };

        const handleIceRestartOffer = (data) => {
            console.log("Received ICE restart offer:", data);
            callbacksRef.current.onIceRestartOffer?.(data);
        };

        const handleIceRestartAnswer = (data) => {
            console.log("Received ICE restart answer:", data);
            callbacksRef.current.onIceRestartAnswer?.(data);
        };

        const handleUserTyping = ({ senderId }) => {
            callbacksRef.current.onTyping?.({ senderId });
        };

        const handleUserStopTyping = ({ senderId }) => {
            callbacksRef.current.onStopTyping?.({ senderId });
        };

        const handleMessagesRead = ({ readerId }) => {
            callbacksRef.current.onMessagesRead?.({ readerId });
        };

        const handleMessageReactionUpdated = (data) => {
            callbacksRef.current.onMessageReactionUpdated?.(data);
        };

        const handleConnectionRequestReceived = (data) => callbacksRef.current.onConnectionRequestReceived?.(data);
        const handleConnectionAccepted = (data) => callbacksRef.current.onConnectionAccepted?.(data);
        const handleConnectionRemoved = (data) => callbacksRef.current.onConnectionRemoved?.(data);
        const handleActionRejected = (data) => callbacksRef.current.onActionRejected?.(data);

        // Refresh the JWT on each authenticated session (including reconnects).
        socket.auth = { token: localStorage.getItem("token") };
        socket.on("connect", handleConnect);

        socket.on("disconnect", handleDisconnect);

        socket.on("onlineUsers", handleOnlineUsers);

        socket.on("receiveMessage", handleReceiveMessage);

        socket.on("messageSent", handleMessageSent);

        socket.on("incomingCall", handleIncomingCall);

        console.log("📲 incomingCall listener registered");

        socket.on("callAnswered", handleCallAnswered);

        socket.on("iceCandidate", handleIceCandidate);

        socket.on("callEnded", handleCallEnded);

        socket.on("iceRestartOffer", handleIceRestartOffer);
        socket.on("iceRestartAnswer", handleIceRestartAnswer);

        socket.on("user-typing", handleUserTyping);
        socket.on("user-stop-typing", handleUserStopTyping);
        socket.on("messages-read", handleMessagesRead);
        socket.on("messageReactionUpdated", handleMessageReactionUpdated);
        socket.on("connectionRequestReceived", handleConnectionRequestReceived);
        socket.on("connectionAccepted", handleConnectionAccepted);
        socket.on("connectionRemoved", handleConnectionRemoved);
        socket.on("actionRejected", handleActionRejected);

        // Connect only after the current login token has been attached.
        if (!socket.connected) socket.connect();
        else handleConnect();

        return () => {

            socket.off("connect", handleConnect);

            socket.off("disconnect", handleDisconnect);

            socket.off("onlineUsers", handleOnlineUsers);

            socket.off("receiveMessage", handleReceiveMessage);

            socket.off("messageSent", handleMessageSent);

            socket.off("incomingCall", handleIncomingCall);

            socket.off("callAnswered", handleCallAnswered);

            socket.off("iceCandidate", handleIceCandidate);

            socket.off("callEnded", handleCallEnded);

            socket.off("iceRestartOffer", handleIceRestartOffer);
            socket.off("iceRestartAnswer", handleIceRestartAnswer);

            socket.off("user-typing", handleUserTyping);
            socket.off("user-stop-typing", handleUserStopTyping);
            socket.off("messages-read", handleMessagesRead);
            socket.off("messageReactionUpdated", handleMessageReactionUpdated);
            socket.off("connectionRequestReceived", handleConnectionRequestReceived);
            socket.off("connectionAccepted", handleConnectionAccepted);
            socket.off("connectionRemoved", handleConnectionRemoved);
            socket.off("actionRejected", handleActionRejected);
            // This hook owns the authenticated socket lifecycle.
            socket.disconnect();

        };

    }, [userId]);

    const sendMessage = (receiverId, message) => {
        if (!receiverId || !message?.trim()) {
            return;
        }
        socket.emit("sendMessage", {
            receiverId,
            message: message.trim()
        });
    };

    const callUser = ({ receiverId, callerId, callType, offer }) => {
        console.log("📞 Sending callUser:", {
            receiverId,
            callerId,
            callType
        });
        if (!receiverId || !callerId || !callType || !offer) {
            console.log("❌ Invalid callUser data");
            return;
        }
        socket.emit("callUser", {
            receiverId,
            callerId,
            callType,
            offer
        });
    };

    const acceptCall = ({ callerId, answer }) => {
        if (!callerId || !answer) {
            return;
        }
        socket.emit("callAccepted", {
            callerId,
            answer
        });
    };

    const sendIceCandidate = useCallback(

        ({ targetUserId, candidate }) => {

            if (!targetUserId || !candidate) {
                return;
            }
            socket.emit("iceCandidate", {
                targetUserId,
                candidate
            });

        }, []);

    const sendIceRestartOffer = useCallback(

        ({ targetUserId, offer }) => {
            if (!targetUserId || !offer) return;

            socket.emit("iceRestartOffer", {
                targetUserId,
                offer
            });

        }, []);

    const sendIceRestartAnswer = useCallback(

        ({ targetUserId, answer }) => {
            if (!targetUserId || !answer) return;

            socket.emit("iceRestartAnswer", {
                targetUserId,
                answer
            });

        }, []);

    const endCall = (targetUserId) => {
        if (!targetUserId) {
            return;
        }
        socket.emit("endCall", {
            targetUserId
        });
    };

    const emitMessageReaction = (messageId, emoji) => {
        return new Promise((resolve) => {
            if (!socket.connected) {
                resolve({ success: false, message: "Not connected to server" });
                return;
            }

            socket.emit("toggleMessageReaction", { messageId, emoji }, resolve);
        });
    };

    const setActiveChat = (userId) => {
        activeChatRef.current = userId
            ? String(userId)
            : null;

        socket.emit("activeChat", {
            userId: activeChatRef.current
        });
    };
    const setCallHandlers = useCallback(
        ({
            onIncomingCall,
            onCallAnswered,
            onIceCandidate,
            onCallEnded,
            onIceRestartOffer,
            onIceRestartAnswer
        }) => {
            callbacksRef.current = {
                ...callbacksRef.current,
                onIncomingCall,
                onCallAnswered,
                onIceCandidate,
                onCallEnded,
                onIceRestartOffer,
                onIceRestartAnswer
            };
        },
        []
    );

    const emitTyping = (recipientId) => {
        socket.emit("typing", { recipientId });
    };

    const emitStopTyping = (recipientId) => {
        socket.emit("stop-typing", { recipientId });
    };

    const markMessagesRead = (senderId) => {
        socket.emit("mark-messages-read", { senderId });
    };

    return {
        onlineUsers,
        sendMessage,
        callUser,
        acceptCall,
        sendIceCandidate,

        sendIceRestartOffer,
        sendIceRestartAnswer,

        endCall,
        setActiveChat,
        setCallHandlers,

        emitTyping,
        emitStopTyping,
        markMessagesRead,
        emitMessageReaction

    };
}

export default useChatSocket;