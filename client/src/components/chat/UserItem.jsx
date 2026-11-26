import Avatar from "./Avatar";
import FormatLastSeen from "./LastSeen"

function UserItem({
    user,
    isOnline,
    isSelected,
    lastMessage,
    unreadCount,
    onClick,
    isTyping,
    actions = []
}) {

    const formatTime = (date) => {

        if (!date) {
            return "";
        }

        return new Date(date).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit"
        });
    };

    return (
        <div className={`user-item ${isSelected ? "selected" : ""} ${onClick ? "user-item-clickable" : ""}`}
            onClick={onClick}>
            <Avatar
                src={user.profilePicture}
                name={user.username}
                className="user-avatar"
                size={45}
                isOnline={isOnline}
            />
            <div className="user-info">
                {/* {actions.map((item) => {
                    item.label === "connected" && */}

                <div className="user-top-row">
                    <h4>{user.username}</h4>
                    <span className="last-time">
                        {formatTime(lastMessage?.createdAt)}
                    </span>
                </div>

                <div className="user-bottom-row">
                    <span className="last-message">
                        {isTyping ?
                            <span className="typing-indicator">typing...</span>
                            : lastMessage?.message || "Start a conversation"}
                    </span>
                    {unreadCount > 0 && (
                        <span className="unread-badge">
                            {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                    )}
                </div>

                <div className="user-presence-meta">
                    {isOnline ?
                        <span className="user-bio-preview" title={user.bio}>{user.bio}</span>
                        :
                        <span className="user-presence-label">
                            {FormatLastSeen(user.lastSeen)}
                        </span>
                    }

                </div>



                {
                    actions.length > 0 && <div className="connection-actions">
                        {actions.map((action, index) =>
                            <button
                                key={`${action.label}-${index}`}
                                type="button" title={action.title}
                                disabled={action.disabled}
                                className={`connection-action ${action.kind || "subtle"}`}
                                onClick={(event) => { event.stopPropagation(); action.onClick?.(); }}>
                                {action.label}
                            </button>)}
                    </div>
                }
            </div>
        </div>
    );
}

export default UserItem;