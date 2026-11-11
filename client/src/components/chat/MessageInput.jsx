import { useRef, useEffect } from "react";

function MessageInput({
    message,
    setMessage,
    onSend,
    recipientId,
    onTyping,
    onStopTyping
}) {
    const typingTimeoutRef = useRef(null);

    const callbacksRef = useRef({});

    useEffect(() => {
        callbacksRef.current = {
            onTyping,
            onStopTyping
        };
    }, [onTyping, onStopTyping]);

    useEffect(() => {
        return () => {
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }

            callbacksRef.current.onStopTyping?.(recipientId);
        };
    }, [recipientId]);

    const stopTyping = () => {
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = null;
        }

        if (recipientId) {
            callbacksRef.current.onStopTyping?.(recipientId);
        }
    };

    const handleChange = (e) => {
        const val = e.target.value;

        setMessage(val);

        if (!recipientId) return;

        if (val.trim()) {
            callbacksRef.current.onTyping?.(recipientId);

            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }

            typingTimeoutRef.current = setTimeout(() => {
                callbacksRef.current.onStopTyping?.(recipientId);
                typingTimeoutRef.current = null;
            }, 1000);
        } else {
            stopTyping();
        }
    };

    const handleSend = () => {
        if (!message.trim()) return;

        stopTyping();
        onSend();
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
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
                onChange={handleChange}
                onKeyDown={handleKeyDown}
            />

            <button
                type="button"
                className="send-button"
                onClick={handleSend}
                disabled={!message.trim()}
            >
                ➤
            </button>

        </div>
    );
}

export default MessageInput;