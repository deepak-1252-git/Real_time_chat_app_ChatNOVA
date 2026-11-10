function UserItem({
    username,
    isOnline,
    isSelected,
    lastMessage,
    unreadCount,
    onClick
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
        <div
            className={`user-item ${
                isSelected ? "selected" : ""
            }`}
            onClick={onClick}
        >

            <div className="user-avatar">
                👤
            </div>

            <div className="user-info">

                <div className="user-top-row">

                    <h4>
                        {username}
                    </h4>

                    <span className="last-time">
                        {formatTime(
                            lastMessage?.createdAt
                        )}
                    </span>

                </div>

                <div className="user-bottom-row">

                    <span className="last-message">

                        {/* {lastMessage?.message || (isOnline ? "Online" : "Offline")} */}
                        {lastMessage?.message || (isOnline ? "Offline" : "Online")}

                    </span>

                    {unreadCount > 0 && (
                        <span className="unread-badge">
                            {unreadCount > 99
                                ? "99+"
                                : unreadCount}
                        </span>
                    )}

                </div>

            </div>

        </div>
    );
}

export default UserItem;