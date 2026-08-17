function VideoCall({
    localVideoRef,
    remoteVideoRef,
    isMuted,
    isCameraOff,
    onMute,
    onCamera,
    onEndCall
}) {

    return (
        <div className="video-call">

            <div className="remote-video-container">

                <video
                    ref={remoteVideoRef}
                    className="remote-video"
                    autoPlay
                    playsInline
                />

                <div className="remote-user-name">
                    Remote User
                </div>

            </div>


            <div className="local-video-container">

                <video
                    ref={localVideoRef}
                    className="local-video"
                    autoPlay
                    muted
                    playsInline
                />

                {isCameraOff && (
                    <div className="camera-off">
                        📹
                    </div>
                )}

            </div>


            <div className="video-call-controls">

                <button
                    type="button"
                    onClick={onMute}
                    className="call-control-button"
                >
                    {isMuted ? "🔊" : "🔇"}
                </button>


                <button
                    type="button"
                    onClick={onCamera}
                    className="call-control-button"
                >
                    {isCameraOff ? "📹" : "📷"}
                </button>


                <button
                    type="button"
                    onClick={onEndCall}
                    className="end-call-button"
                >
                    📞
                </button>

            </div>

        </div>
    );
}

export default VideoCall;