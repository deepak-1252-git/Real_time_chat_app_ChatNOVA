import Avatar from "../Avatar";

function ConnectedCallOverlay({
    caller,
    selectedUser,
    displayName,
    profilePicture,
    callType,
    isMuted,
    onMute,
    onEndCall
}) {
    return (
        <div className="call-test-overlay">

            <div className="call-test-box">

                <Avatar
                    src={profilePicture}
                    name={displayName || caller || selectedUser}
                    className="call-avatar"
                    size={80}
                    fallback={callType === "video" ? "📹" : "🎙️"}
                />

                <h2>
                    {displayName || caller || selectedUser}
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