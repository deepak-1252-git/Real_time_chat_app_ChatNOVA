import ChatHeader from "./ChatHeader";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import EmptyChat from "./EmptyChat";

function ChatWindow({
    headerUsername,
    selectedUser,
    messages,
    message,
    setMessage,
    onSend,
    currentUserId,
    isOnline,
    onAudioCall,
    onVideoCall,
    onBack,

    isTyping,
    onTyping,
    onStopTyping
}) {

    if (!selectedUser) {
        return (
            <main className="chat-window">
                <EmptyChat />
            </main>
        );
    }

    return (
        <main className="chat-window">

            <ChatHeader
                headerUsername={headerUsername}
                selectedUser={selectedUser}
                isOnline={isOnline}
                isTyping={isTyping}
                onBack={onBack}
                onAudioCall={onAudioCall}
                onVideoCall={onVideoCall}
            />

            <MessageList
                messages={messages}
                currentUserId={currentUserId}
            />

            <MessageInput
                message={message}
                setMessage={setMessage}
                onSend={onSend}
                recipientId={selectedUser?._id || selectedUser}
                onTyping={onTyping}
                onStopTyping={onStopTyping}
            />

        </main>
    );
}

export default ChatWindow;