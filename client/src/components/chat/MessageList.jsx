import { useEffect, useRef } from "react";
import MessageBubble from "./MessageBubble";

function MessageList({ messages, currentUserId }) {

    const messagesEndRef = useRef(null);

    useEffect(() => {

        messagesEndRef.current?.scrollIntoView({
            behavior: "smooth"
        });

    }, [messages]);

    return (
        <div className="message-list">
            <div className="infotag">
                <p>
                    💡Chats vanish in 24h - snap it!
                </p>
            </div>

            {messages.length === 0 ? (

                <div className="no-messages">
                    <p>
                        No messages yet.
                    </p>

                    <span>
                        Start the conversation 👋
                    </span>
                </div>

            ) : (

                messages.map((message, index) => {

                    const isMine =
                        String(message.senderId) ===
                        String(currentUserId);

                    return (
                        <MessageBubble
                            key={message._id || index}
                            message={message}
                            isMine={isMine}
                        />
                    );

                })

            )}

            <div ref={messagesEndRef} />

        </div>
    );
}

export default MessageList;