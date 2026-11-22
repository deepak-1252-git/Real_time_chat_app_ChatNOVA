import { useRef, useEffect, useState } from "react";
import EmojiPicker from "emoji-picker-react";

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
    const inputRef = useRef(null);
    const emojiPickerRef = useRef(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);

    useEffect(() => {
        callbacksRef.current = {
            onTyping,
            onStopTyping
        };
    }, [onTyping, onStopTyping]);

    useEffect(() => {
        if (!showEmojiPicker) return;

        const handleOutsideClick = (event) => {
            if (!emojiPickerRef.current?.contains(event.target)) {
                setShowEmojiPicker(false);
            }
        };

        document.addEventListener("pointerdown", handleOutsideClick);

        return () => {
            document.removeEventListener("pointerdown", handleOutsideClick);
        };
    }, [showEmojiPicker]);

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

        setShowEmojiPicker(false);
        stopTyping();
        onSend();
    };

    const handleEmojiClick = (emojiData) => {
        const emoji = emojiData.emoji;
        const input = inputRef.current;

        const start = input?.selectionStart ?? message.length;
        const end = input?.selectionEnd ?? message.length;

        const updatedMessage =
            message.slice(0, start) +
            emoji +
            message.slice(end);

        setMessage(updatedMessage);

        requestAnimationFrame(() => {
            input?.focus();

            const cursorPosition = start + emoji.length;

            input?.setSelectionRange(
                cursorPosition,
                cursorPosition
            );
        });
    };

    const handleKeyDown = (e) => {
        if (e.key === "Escape") {
            setShowEmojiPicker(false);
        }

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
                aria-label="Attach file"
            >
                📎
            </button>

            <div className="emoji-picker-wrapper" ref={emojiPickerRef}>

                <button
                    type="button"
                    className="input-action emoji-toggle"
                    title="Choose emoji"
                    aria-label="Choose emoji"
                    aria-expanded={showEmojiPicker}
                    onClick={() =>
                        setShowEmojiPicker(prev => !prev)
                    }
                >
                    😊
                </button>

                {showEmojiPicker && (
                    <div className="emoji-picker-popup">
                        <EmojiPicker
                            onEmojiClick={handleEmojiClick}
                            height={350}
                            width="100%"
                            searchPlaceHolder="    Search emoji..."
                            previewConfig={{
                                showPreview: false
                            }}
                        />
                    </div>
                )}

            </div>

            <input
                ref={inputRef}
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
                aria-label="Send message"
            >
                ➤
            </button>

        </div>
    );
}

export default MessageInput;