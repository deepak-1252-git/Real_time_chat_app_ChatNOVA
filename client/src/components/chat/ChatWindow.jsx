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
    onBack
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
            />

        </main>
    );
}

export default ChatWindow;