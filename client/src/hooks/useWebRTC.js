import { useCallback, useRef, useState } from "react";

const rtcConfig = {
    iceServers: [
        {
            urls: "stun:stun.l.google.com:19302"
        }
    ]
};

function useWebRTC({
    sendIceCandidate,
    sendIceRestartOffer,
    sendIceRestartAnswer,
    onRemoteStream,
    onCallCleanup
} = {}) {

    const peerConnectionRef = useRef(null);
    const localStreamRef = useRef(null);
    const remoteStreamRef = useRef(null);
    const remoteOfferRef = useRef(null);
    const pendingIceCandidatesRef = useRef([]);

    const restartInProgressRef = useRef(false);
    const restartAttemptsRef = useRef(0);
    const restartTimeoutRef = useRef(null);
    const restartTargetUserIdRef = useRef(null);
    const canInitiateRestartRef = useRef(false);
    const initiateIceRestartHandlerRef = useRef(null);

    const [callType, setCallType] = useState(null);
    const [callStatus, setCallStatus] = useState("idle");
    const [caller, setCaller] = useState(null);
    const [isMuted, setIsMuted] = useState(false);
    const [isCameraOff, setIsCameraOff] = useState(false);

    // --------------------------------
    // CREATE PEER CONNECTION
    // --------------------------------

    const createPeerConnection = useCallback(
        (targetUserId, canInitiateRestart = false) => {

            const peerConnection = new RTCPeerConnection(rtcConfig);

            canInitiateRestartRef.current = canInitiateRestart;
            restartTargetUserIdRef.current = targetUserId;

            peerConnectionRef.current = peerConnection;

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

            // peerConnection.ontrack = (event) => {
            //     const remoteStream = event.streams[0];

            //     if (!remoteStream) return;

            //     console.log(
            //         "🔥 REMOTE STREAM RECEIVED:",
            //         remoteStream
            //     );

            //     remoteStreamRef.current = remoteStream;

            //     onRemoteStream?.(remoteStream);
            // };
            peerConnection.ontrack = (event) => {
                console.log("📡 REMOTE TRACK RECEIVED:", {
                    kind: event.track.kind,
                    id: event.track.id,
                    enabled: event.track.enabled,
                    muted: event.track.muted,
                    readyState: event.track.readyState,
                    streams: event.streams.length
                });

                let remoteStream = event.streams[0];

                if (!remoteStream) {
                    remoteStream = remoteStreamRef.current || new MediaStream();
                    remoteStream.addTrack(event.track);
                }

                remoteStreamRef.current = remoteStream;

                console.log("📹 REMOTE VIDEO TRACKS:", remoteStream.getVideoTracks());
                console.log("🔊 REMOTE AUDIO TRACKS:", remoteStream.getAudioTracks());

                onRemoteStream?.(remoteStream);
            };


            peerConnection.onconnectionstatechange = () => {
                console.log(
                    "WebRTC connection state:",
                    peerConnection.connectionState
                );
            };

            peerConnection.oniceconnectionstatechange = () => {
                const iceState = peerConnection.iceConnectionState;

                console.log("ICE connection state:", iceState);

                if (iceState === "failed") {
                    console.error(
                        "❌ ICE connection failed. Check network connectivity."
                    );

                    initiateIceRestartHandlerRef.current?.();
                }

                if (iceState === "disconnected") {
                    console.warn(
                        "⚠️ ICE connection temporarily disconnected. Waiting for recovery..."
                    );
                }

                if (iceState === "connected" || iceState === "completed") {
                    console.log("✅ ICE connection established successfully");

                    restartInProgressRef.current = false;
                    restartAttemptsRef.current = 0;

                    if (restartTimeoutRef.current) {
                        clearTimeout(restartTimeoutRef.current);
                        restartTimeoutRef.current = null;
                    }
                }
            };

            peerConnection.onicegatheringstatechange = () => {
                console.log(
                    "ICE gathering state:",
                    peerConnection.iceGatheringState
                );
            };

            console.log(
                "WebRTC PeerConnection created"
            );

            return peerConnection;

        }, [sendIceCandidate, onRemoteStream]);

    // --------------------------------
    // MICROPHONE STREAM
    // --------------------------------

    const getMicrophoneStream = useCallback(async () => {

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
    }, []);

    // --------------------------------
    // VIDEO STREAM
    // --------------------------------

    const getVideoStream = useCallback(async () => {

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
    }, []);

    // --------------------------------
    // AUDIO OFFER
    // --------------------------------

    const createOffer = useCallback(async (peerConnection) => {
        try {
            const offer = await peerConnection.createOffer();

            await peerConnection.setLocalDescription(offer);

            console.log("WebRTC offer created:", offer);

            return offer;
        } catch (error) {
            console.error("Failed to create WebRTC offer:", error);
            return null;
        }
    }, []);

    // --------------------------------
    // ICE RESTART OFFER
    // --------------------------------

    const initiateIceRestart = useCallback(async () => {
        const peerConnection = peerConnectionRef.current;

        if (!canInitiateRestartRef.current) return;
        if (!peerConnection) return;
        if (restartInProgressRef.current) return;
        if (restartAttemptsRef.current >= 2) {
            console.error("Maximum ICE restart attempts reached");
            return;
        }

        if (peerConnection.signalingState !== "stable") {
            console.warn("Cannot restart ICE: signaling state is not stable");
            return;
        }

        restartInProgressRef.current = true;
        restartAttemptsRef.current += 1;

        try {
            console.log("🔄 Starting ICE restart...");

            const offer = await peerConnection.createOffer({
                iceRestart: true
            });

            await peerConnection.setLocalDescription(offer);

            sendIceRestartOffer?.({
                targetUserId: restartTargetUserIdRef.current,
                offer
            });

            console.log("✅ ICE restart offer sent");

            restartTimeoutRef.current = setTimeout(async () => {
                if (!restartInProgressRef.current) return;

                console.error("⏰ ICE restart timed out");

                try {
                    if (peerConnection.signalingState === "have-local-offer") {
                        await peerConnection.setLocalDescription({
                            type: "rollback"
                        });
                    }
                } catch (error) {
                    console.error("ICE restart rollback failed:", error);
                }

                restartInProgressRef.current = false;
                restartAttemptsRef.current = 2;
                restartTimeoutRef.current = null;

            }, 15000);

        } catch (error) {
            console.error("ICE restart offer failed:", error);
            restartInProgressRef.current = false;
        }
    }, [sendIceRestartOffer]);

    initiateIceRestartHandlerRef.current = initiateIceRestart;

    //----------------------------------
    // processPendingIceCandidates
    //---------------------------------- 

    const processPendingIceCandidates = useCallback(async (peerConnection) => {
        const pendingCandidates =
            pendingIceCandidatesRef.current;

        if (!pendingCandidates.length) {
            return;
        }

        for (const candidate of pendingCandidates) {
            try {
                await peerConnection.addIceCandidate(
                    new RTCIceCandidate(candidate)
                );

                console.log("Queued ICE candidate added");
            } catch (error) {
                console.error(
                    "Failed to add queued ICE candidate:",
                    error
                );
            }
        }

        pendingIceCandidatesRef.current = [];
    }, []);

    // --------------------------------
    // AUDIO ANSWER
    // --------------------------------

    const createAnswer = useCallback(async (peerConnection, offer) => {
        try {
            await peerConnection.setRemoteDescription(
                new RTCSessionDescription(offer)
            );

            console.log("Remote offer set successfully");

            await processPendingIceCandidates(peerConnection);

            const answer = await peerConnection.createAnswer();

            await peerConnection.setLocalDescription(answer);

            console.log("WebRTC answer created:", answer);

            return answer;

        } catch (error) {
            console.error(
                "Failed to create WebRTC answer:",
                error
            );

            return null;
        }
    }, [processPendingIceCandidates]);

    // --------------------------------
    //  handelers
    // --------------------------------

    const handleCallAnswered = useCallback(async ({ answer }) => {
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
            await processPendingIceCandidates(peerConnection);

            setCallStatus("connected");
        } catch (error) {
            console.error(
                "Failed to set remote answer:",
                error
            );
        }
    }, [processPendingIceCandidates]);

    // --------------------------------
    // HANDLE ICE RESTART OFFER
    // --------------------------------

    const handleIceRestartOffer = useCallback(async ({ callerId, offer }) => {
        const peerConnection = peerConnectionRef.current;

        if (!peerConnection) {
            console.error("Cannot restart ICE: PeerConnection not found");
            return;
        }

        if (peerConnection.signalingState !== "stable") {
            console.warn("Cannot process ICE restart offer: signaling state is not stable");
            return;
        }

        try {
            console.log("🔄 Received ICE restart offer");

            await peerConnection.setRemoteDescription(
                new RTCSessionDescription(offer)
            );

            await processPendingIceCandidates(peerConnection);

            const answer = await peerConnection.createAnswer();

            await peerConnection.setLocalDescription(answer);

            sendIceRestartAnswer?.({
                targetUserId: callerId,
                answer
            });

            console.log("✅ ICE restart answer sent");

        } catch (error) {
            console.error("Failed to handle ICE restart offer:", error);
        }
    }, [processPendingIceCandidates, sendIceRestartAnswer]);

    // --------------------------------
    // HANDLE ICE RESTART ANSWER
    // --------------------------------

    const handleIceRestartAnswer = useCallback(async ({ answer }) => {
        const peerConnection = peerConnectionRef.current;

        if (!peerConnection) {
            console.error("Cannot process restart answer: PeerConnection not found");
            return;
        }

        if (peerConnection.signalingState !== "have-local-offer") {
            console.warn("Ignoring stale or unexpected ICE restart answer");
            return;
        }

        try {
            console.log("🔄 Received ICE restart answer");

            await peerConnection.setRemoteDescription(
                new RTCSessionDescription(answer)
            );

            if (restartTimeoutRef.current) {
                clearTimeout(restartTimeoutRef.current);
                restartTimeoutRef.current = null;
            }

            await processPendingIceCandidates(peerConnection);

            restartInProgressRef.current = false;
            restartAttemptsRef.current = 0;

            console.log("✅ ICE restart answer applied successfully");

        } catch (error) {
            restartInProgressRef.current = false;

            console.error(
                "Failed to handle ICE restart answer:",
                error
            );
        }
    }, [processPendingIceCandidates]);

    const handleRemoteIceCandidate = useCallback(async ({ candidate }) => {
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
    }, []);

    const cleanupCall = useCallback(() => {
        console.log("🧹 Cleaning up WebRTC call");

        if (restartTimeoutRef.current) {
            clearTimeout(restartTimeoutRef.current);
            restartTimeoutRef.current = null;
        }

        restartInProgressRef.current = false;
        restartAttemptsRef.current = 0;
        restartTargetUserIdRef.current = null;
        canInitiateRestartRef.current = false;
        initiateIceRestartHandlerRef.current = null;

        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((track) => {
                track.stop();
            });
            localStreamRef.current = null;
        }

        if (peerConnectionRef.current) {
            peerConnectionRef.current.close();
            peerConnectionRef.current = null;
        }

        remoteStreamRef.current = null;
        remoteOfferRef.current = null;
        pendingIceCandidatesRef.current = [];

        setCallStatus("idle");
        setCallType(null);
        setCaller(null);
        setIsMuted(false);
        setIsCameraOff(false);

        onCallCleanup?.();

        console.log("✅ WebRTC cleanup completed");
    }, [onCallCleanup]);

    const handleCallEnded = useCallback(() => {
        console.log("📴 Call ended by other user");
        cleanupCall();
    }, [cleanupCall]);

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
        createOffer,
        createAnswer,

        handleCallAnswered,
        handleRemoteIceCandidate,
        handleIceRestartOffer,
        handleIceRestartAnswer,
        cleanupCall,
        handleCallEnded
    };
}

export default useWebRTC;