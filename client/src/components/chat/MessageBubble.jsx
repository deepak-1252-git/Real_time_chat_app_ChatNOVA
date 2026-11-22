const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🔥"];

function MessageBubble({ message, isMine, currentUserId, onReact }) {
    const reactions = Array.isArray(message.reactions) ? message.reactions : [];
    const groupedReactions = QUICK_REACTIONS.map((emoji) => ({
        emoji,
        users: reactions.filter((reaction) => reaction.emoji === emoji)
    })).filter((group) => group.users.length > 0);

    return (
        <div className={`message-row ${isMine ? "mine" : "theirs"}`} >
            <div className={`message-bubble ${isMine ? "mine" : "theirs"}`}>
                <div className="message-text"> {message.message} </div>

                <div className="message-time">
                    {new Date(
                        message.createdAt
                    ).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit"
                    })}

                    {isMine && (
                        <span className="message-status" style={{ color: message.isRead ? "#f52e13" : "#010101" }}>
                            {message.isRead ? "✓✓" : "✓"}
                        </span>
                    )}
                </div>

                <div className="message-reactions">
                    {groupedReactions.map(({ emoji, users }) => {
                        const reactedByMe = users.some(
                            (reaction) => String(reaction.userId || reaction.user) === String(currentUserId)
                        );

                        return (
                            <button
                                type="button"
                                key={emoji}
                                className={`reaction-chip ${reactedByMe ? "reacted-by-me" : ""}`}
                                onClick={() => onReact?.(message._id, emoji)}
                                aria-label={`${emoji}, ${users.length} reactions`}
                                title={users.map((reaction) => reaction.username || "User").join(", ")}
                            >
                                {emoji} <span>{users.length}</span>
                            </button>
                        );
                    })}

                    <div className="reaction-picker">
                        <button
                            type="button"
                            className="reaction-add-button"
                            aria-label="Add reaction"
                            title="Add reaction"
                        >
                            ☺
                        </button>
                        <div className="reaction-options">
                            {QUICK_REACTIONS.map((emoji) => (
                                <button
                                    type="button"
                                    key={emoji}
                                    onClick={() => onReact?.(message._id, emoji)}
                                    aria-label={`React ${emoji}`}
                                >
                                    {emoji}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

            </div>

        </div>
    );
}

export default MessageBubble;