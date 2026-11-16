import Avatar from "../Avatar";

function CallingOverlay({
    selectedUser,
    displayName,
    profilePicture,
    callType,
    onEndCall
}) {
    return (
        <div className="call-test-overlay">

            <div className="call-test-box">

                <Avatar
                    src={profilePicture}
                    name={displayName || selectedUser}
                    className="call-avatar"
                    size={80}
                    fallback="👤"
                />

                <h2>
                    {displayName || selectedUser}
                </h2>

                <p>
                    {callType === "audio"
                        ? "Audio call"
                        : "Video call"}
                </p>

                <p>
                    Calling...
                </p>

                <button
                    type="button"
                    className="reject-call-button"
                    onClick={onEndCall}
                >
                    📞 End Call
                </button>

            </div>

        </div>
    );
}

export default CallingOverlay;