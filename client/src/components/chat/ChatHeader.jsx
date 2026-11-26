import Avatar from "./Avatar";
import { ArrowLeftIcon } from "lucide-react"
import FormatLastSeen from "./LastSeen";

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

                <Avatar
                    src={profilePicture}
                    name={headerUsername}
                    className="chat-user-avatar"
                    size={44}
                    isOnline={isOnline}
                />

                <div className="chat-user-heading">
                    <h3>{headerUsername} {isTyping && <span className="typing-indicator">typing.....</span>}</h3>
                    <span className="chat-user-status">
                        {isOnline ? <span className="chat-user-bio" title={bio}>{bio}</span> : <span> {FormatLastSeen(lastSeen)} </span>}
                    </span>
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