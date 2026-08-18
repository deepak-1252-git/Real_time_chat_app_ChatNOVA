function ConnectedCallOverlay({
    caller,
    selectedUser,
    callType,
    isMuted,
    onMute,
    onEndCall
}) {
    return (
        <div className="call-test-overlay">

            <div className="call-test-box">

                <div className="call-avatar">
                    {callType === "video"
                        ? "📹"
                        : "🎙️"}
                </div>

                <h2>
                    {caller || selectedUser}
                </h2>

                <p>
                    {callType === "audio"
                        ? "Audio Call"
                        : "Video Call"}
                </p>

                <p>
                    Connected
                </p>

                <div className="incoming-call-actions">

                    <button
                        type="button"
                        className="mute-call-button"
                        onClick={onMute}
                    >
                        {isMuted
                            ? "🔊 Unmute"
                            : "🔇 Mute"}
                    </button>

                    <button
                        type="button"
                        className="reject-call-button"
                        onClick={onEndCall}
                    >
                        📞 End Call
                    </button>

                </div>

            </div>

        </div>
    );
}

export default ConnectedCallOverlay;