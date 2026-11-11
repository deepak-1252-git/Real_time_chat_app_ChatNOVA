function MessageBubble({ message, isMine }) {

    return (
        <div
            className={`message-row ${isMine ? "mine" : "theirs"
                }`}
        >

            <div
                className={`message-bubble ${isMine ? "mine" : "theirs"
                    }`}
            >

                <div className="message-text">
                    {message.message}
                </div>

                <div className="message-time">
                    {new Date(
                        message.createdAt
                    ).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit"
                    })}

                    {isMine && (
                        <span className="message-status" style={{color: message.isRead ? "#f52e13" : "#010101" }}>
                            {message.isRead ? "✓✓" : "✓"}
                        </span>
                    )}
                </div>

            </div>

        </div>
    );
}

export default MessageBubble;