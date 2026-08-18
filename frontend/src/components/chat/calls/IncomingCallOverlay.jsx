function IncomingCallOverlay({
    caller,
    callType,
    onAccept,
    onReject
}) {
    return (
        <div className="call-test-overlay">

            <div className="call-test-box">

                <div className="call-avatar">
                    👤
                </div>

                <h2>
                    {caller}
                </h2>

                <p>
                    Incoming{" "}
                    {callType === "audio"
                        ? "Audio"
                        : "Video"}{" "}
                    Call
                </p>

                <div className="incoming-call-actions">

                    <button
                        type="button"
                        className="accept-call-button"
                        onClick={onAccept}
                    >
                        {callType === "video"
                            ? "📹 Accept"
                            : "📞 Accept"}
                    </button>

                    <button
                        type="button"
                        className="reject-call-button"
                        onClick={onReject}
                    >
                        ❌ Reject
                    </button>

                </div>

            </div>

        </div>
    );
}

export default IncomingCallOverlay;