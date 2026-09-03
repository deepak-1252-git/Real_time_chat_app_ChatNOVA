import { useRef, useState } from "react";

function useWebRTC({
    sendCallUser,
    sendCallAccepted,
    sendIceCandidate,
    sendSocketEndCall
} = {}) {

    const peerConnectionRef = useRef(null);
    const localStreamRef = useRef(null);
    const remoteStreamRef = useRef(null);
    const remoteOfferRef = useRef(null);
    const pendingIceCandidatesRef = useRef([]);

    const [callType, setCallType] = useState(null);
    const [callStatus, setCallStatus] = useState("idle");
    const [caller, setCaller] = useState(null);
    const [isMuted, setIsMuted] = useState(false);
    const [isCameraOff, setIsCameraOff] = useState(false);

    const rtcConfig = {
        iceServers: [
            {
                urls: "stun:stun.l.google.com:19302"
            }
        ]
    };

    // --------------------------------
    // CREATE PEER CONNECTION
    // --------------------------------

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

            sendIceCandidate?.({
                targetUserId,
                candidate: event.candidate
            });
        };

        peerConnection.ontrack = (event) => {

            const remoteStream =
                event.streams[0];

            console.log(
                "🔥 REMOTE STREAM RECEIVED:",
                remoteStream
            );

            remoteStreamRef.current =
                remoteStream;
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


    // --------------------------------
    // MICROPHONE STREAM
    // --------------------------------

    const getMicrophoneStream = async () => {

        try {

            const stream =
                await navigator.mediaDevices.getUserMedia({
                    audio: true,
                    video: false
                });

            localStreamRef.current =
                stream;

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


    // --------------------------------
    // VIDEO STREAM
    // --------------------------------

    const getVideoStream = async () => {

        try {

            const stream =
                await navigator.mediaDevices.getUserMedia({
                    audio: true,
                    video: true
                });

            localStreamRef.current =
                stream;

            console.log(
                "VIDEO STREAM:",
                stream
            );

            console.log(
                "VIDEO TRACKS:",
                stream.getVideoTracks()
            );

            return stream;

        } catch (error) {

            console.error(
                "Camera + microphone access failed:",
                error
            );

            return null;
        }
    };


    // --------------------------------
    // AUDIO OFFER
    // --------------------------------

    const createAudioOffer = async (
        peerConnection
    ) => {

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


    // --------------------------------
    // AUDIO ANSWER
    // --------------------------------

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

    const handleCallAnswered = async ({ answer }) => {
        const peerConnection = peerConnectionRef.current;

        if (!peerConnection) {
            console.error("PeerConnection not found");
            return;
        }

        try {
            await peerConnection.setRemoteDescription(
                new RTCSessionDescription(answer)
            );

            console.log("Remote answer set successfully");
            setCallStatus("connected");
        } catch (error) {
            console.error(
                "Failed to set remote answer:",
                error
            );
        }
    };

    const handleRemoteIceCandidate = async ({ candidate }) => {
        const peerConnection = peerConnectionRef.current;

        if (!peerConnection) {
            pendingIceCandidatesRef.current.push(candidate);
            return;
        }

        if (!peerConnection.remoteDescription) {
            pendingIceCandidatesRef.current.push(candidate);
            return;
        }

        try {
            await peerConnection.addIceCandidate(
                new RTCIceCandidate(candidate)
            );

            console.log("Remote ICE candidate added");
        } catch (error) {
            console.error(
                "Failed to add remote ICE candidate:",
                error
            );
        }
    };

    const handleCallEnded = () => {
        console.log("Call ended by other user");

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

        remoteOfferRef.current = null;
        pendingIceCandidatesRef.current = [];

        setCallStatus("idle");
        setCallType(null);
        setCaller(null);
        setIsMuted(false);
        setIsCameraOff(false);
    };

    return {
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
        createAudioOffer,
        createAudioAnswer,

        handleCallAnswered,
        handleRemoteIceCandidate,
        handleCallEnded
    };
}

export default useWebRTC;