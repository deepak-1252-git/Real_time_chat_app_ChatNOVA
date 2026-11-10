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
                </div>

            </div>

        </div>
    );
}

export default MessageBubble;