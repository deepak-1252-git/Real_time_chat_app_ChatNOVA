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

        onTyping,
        onStopTyping,
        onMessagesRead
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

        onTyping,
        onStopTyping,
        onMessagesRead
    });

    useEffect(() => {
        callbacksRef.current = {
            onReceiveMessage,
            onMessageSent,
            onIncomingCall,
            onCallAnswered,
            onIceCandidate,
            onCallEnded,

            onTyping,
            onStopTyping,
            onMessagesRead
        };
    }, [
        onReceiveMessage,
        onMessageSent,
        onIncomingCall,
        onCallAnswered,
        onIceCandidate,
        onCallEnded,

        onTyping,
        onStopTyping,
        onMessagesRead
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

            socket.emit(
                "userConnected",
                userId
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

        const handleUserTyping = ({ senderId }) => {
            callbacksRef.current.onTyping?.({ senderId });
        };

        const handleUserStopTyping = ({ senderId }) => {
            callbacksRef.current.onStopTyping?.({ senderId });
        };

        const handleMessagesRead = ({ readerId }) => {
            callbacksRef.current.onMessagesRead?.({ readerId });
        };

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

        socket.on("user-typing", handleUserTyping);

        socket.on("user-stop-typing", handleUserStopTyping);

        socket.on("messages-read", handleMessagesRead);

        // Socket already connected hai
        if (socket.connected) { handleConnect(); }

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

            socket.off("user-typing", handleUserTyping);

            socket.off("user-stop-typing", handleUserStopTyping);

            socket.off("messages-read", handleMessagesRead);

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

    const sendIceCandidate = ({ targetUserId, candidate }) => {
        if (!targetUserId || !candidate) {
            return;
        }
        socket.emit("iceCandidate", {
            targetUserId,
            candidate
        });
    };

    const endCall = (targetUserId) => {
        if (!targetUserId) {
            return;
        }
        socket.emit("endCall", {
            targetUserId
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
            onCallEnded
        }) => {
            callbacksRef.current = {
                ...callbacksRef.current,
                onIncomingCall,
                onCallAnswered,
                onIceCandidate,
                onCallEnded
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
        endCall,
        setActiveChat,
        setCallHandlers,

        emitTyping,
        emitStopTyping,
        markMessagesRead

    };
}

export default useChatSocket;