function CallingOverlay({
    selectedUser,
    callType,
    onEndCall
}) {
    return (
        <div className="call-test-overlay">

            <div className="call-test-box">

                <div className="call-avatar">
                    👤
                </div>

                <h2>
                    {selectedUser}
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