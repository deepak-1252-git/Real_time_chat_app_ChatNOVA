 function ChatHeader({
    selectedUsername,
    selectedUser,
    isOnline,
    onBack,
    onAudioCall,
    onVideoCall
}) {

    return (
        <header className="chat-header">

            <button
                type="button"
                className="back-button"
                onClick={onBack}
                title="Back"
            >
                ←
            </button>

            <div className="chat-user-info">

                <div className="chat-user-avatar">
                    👤
                </div>

                <div>
                    <h3>
                        {selectedUsername || selectedUser}
                    </h3>

                    <span className="chat-user-status">

                        <span
                            className={`status-dot ${isOnline
                                ? "online"
                                : "offline"
                                }`}
                        ></span>

                        {isOnline ? "Online" : "Offline"}

                    </span>
                </div>

            </div>

            <div className="chat-actions">

                <button
                    type="button"
                    title="Audio Call"
                    onClick={onAudioCall}
                >
                    📞
                </button>

                <button
                    type="button"
                    title="Video Call"
                    onClick={onVideoCall}
                >
                    📹
                </button>

                <button
                    title="More"
                    type="button"
                >
                    ⋮
                </button>

            </div>

        </header>
    );
}

export default ChatHeader;