function MessageInput({
    message,
    setMessage,
    onSend
}) {

    const handleKeyDown = (e) => {

        if (
            e.key === "Enter" &&
            !e.shiftKey
        ) {
            e.preventDefault();
            onSend();
        }

    };

    return (
        <div className="message-input-area">

            <button
                type="button"
                className="input-action"
                title="Attach file"
            >
                📎
            </button>

            <input
                type="text"
                placeholder="Type a message..."
                value={message}
                onChange={(e) =>
                    setMessage(e.target.value)
                }
                onKeyDown={handleKeyDown}
            />

            <button
                type="button"
                className="send-button"
                onClick={onSend}
                disabled={!message.trim()}
            >
                ➤
            </button>

        </div>
    );
}

export default MessageInput;