import Avatar from "./Avatar";
import { ArrowLeftIcon } from "lucide-react"
function ChatHeader({
    headerUsername,
    profilePicture,
    selectedUser,
    isOnline,
    lastSeen,
    bio,
    isTyping,
    onBack,
    onAudioCall,
    onVideoCall
}) {

    const formatLastSeen = (value) => {
        if (!value) return "Offline";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return "Offline";

        const diffMs = Math.max(0, Date.now() - date.getTime());
        const minutes = Math.floor(diffMs / 60000);
        if (minutes < 1) return "Last seen just now";
        if (minutes < 60) return `Last seen ${minutes} min${minutes === 1 ? "" : "s"} ago`;

        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `Last seen ${hours} hour${hours === 1 ? "" : "s"} ago`;

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        if (date.toDateString() === yesterday.toDateString()) {
            return `Last seen yesterday, ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
        }

        return `Last seen ${date.toLocaleDateString([], { day: "numeric", month: "short" })}`;
    };

    return (
        <header className="chat-header">

            <button
                type="button"
                className="back-button"
                onClick={onBack}
                title="Back"
            >
                <ArrowLeftIcon />
            </button>

            <div className="chat-user-info">

                <div className="chat-header-avatar-wrap" style={{ position: "relative", flexShrink: 0 }}>

                    <Avatar
                        src={profilePicture}
                        name={headerUsername}
                        className="chat-user-avatar"
                        size={44}
                    />
                    <span
                        className={`status-dot ${isOnline ? "online" : "offline"}`}
                        aria-label={isOnline ? "Online" : "Offline"}
                        title={isOnline ? "Online" : "Offline"}
                        style={{
                            position: "absolute",
                            right: 0,
                            bottom: 1,
                            width: 11,
                            height: 11,
                            border: "2px solid var(--chat-panel, #fff)",
                            borderRadius: "50%",
                            margin: 0
                        }}
                    />
                </div>

                <div className="chat-user-heading">
                    <h3>{headerUsername}</h3>
                    <span className="chat-user-status">
                        {isTyping ? (
                            <span className="typing-indicator">typing...</span>
                        ) : isOnline ? "Online" : formatLastSeen(lastSeen)}
                    </span>
                    {!isTyping && bio && (
                        <span className="chat-user-bio" title={bio}>{bio}</span>
                    )}
                </div>

            </div>

            <div className="chat-actions">

                <button
                    type="button"
                    title={isOnline ? "Audio Call" : "User is offline"}
                    onClick={onAudioCall}
                    disabled={!isOnline}
                >
                    📞
                </button>

                <button
                    type="button"
                    title={isOnline ? "Video Call" : "User is offline"}
                    onClick={onVideoCall}
                    disabled={!isOnline}
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