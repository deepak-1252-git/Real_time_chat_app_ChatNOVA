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
        onCallEnded
    } = {}
) {

    const [onlineUsers, setOnlineUsers] = useState([]);

    const callbacksRef = useRef({
        onReceiveMessage,
        onMessageSent,
        onIncomingCall,
        onCallAnswered,
        onIceCandidate,
        onCallEnded
    });

    useEffect(() => {
        callbacksRef.current = {
            onReceiveMessage,
            onMessageSent,
            onIncomingCall,
            onCallAnswered,
            onIceCandidate,
            onCallEnded
        };
    }, [
        onReceiveMessage,
        onMessageSent,
        onIncomingCall,
        onCallAnswered,
        onIceCandidate,
        onCallEnded
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

        socket.on(
            "connect",
            handleConnect
        );

        socket.on(
            "disconnect",
            handleDisconnect
        );

        socket.on(
            "onlineUsers",
            handleOnlineUsers
        );

        socket.on(
            "receiveMessage",
            handleReceiveMessage
        );

        socket.on(
            "messageSent",
            handleMessageSent
        );

        socket.on(
            "incomingCall",
            handleIncomingCall
        );

        console.log(
            "📲 incomingCall listener registered"
        );

        socket.on(
            "callAnswered",
            handleCallAnswered
        );

        socket.on(
            "iceCandidate",
            handleIceCandidate
        );

        socket.on(
            "callEnded",
            handleCallEnded
        );

        // Socket already connected hai
        if (socket.connected) {
            handleConnect();
        }

        return () => {

            socket.off(
                "connect",
                handleConnect
            );

            socket.off(
                "disconnect",
                handleDisconnect
            );

            socket.off(
                "onlineUsers",
                handleOnlineUsers
            );

            socket.off(
                "receiveMessage",
                handleReceiveMessage
            );

            socket.off(
                "messageSent",
                handleMessageSent
            );

            socket.off(
                "incomingCall",
                handleIncomingCall
            );

            socket.off(
                "callAnswered",
                handleCallAnswered
            );

            socket.off(
                "iceCandidate",
                handleIceCandidate
            );

            socket.off(
                "callEnded",
                handleCallEnded
            );

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
        socket.emit("activeChat", {
            userId: userId || null
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

    return {
        onlineUsers,
        sendMessage,
        callUser,
        acceptCall,
        sendIceCandidate,
        endCall,
        setActiveChat,
        setCallHandlers
    };
}

export default useChatSocket;