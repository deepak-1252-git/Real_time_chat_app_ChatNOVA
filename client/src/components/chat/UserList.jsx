import { useCallback } from "react";
import UserItem from "./UserItem";

function UserList({
    users = [],
    tab,
    selectedUser,
    onSelectUser,
    lastMessages = {},
    unreadCounts = {},
    typingUsers = {},
    onAction,
    onScrollEnd,
    loading,
    error
}) {
    const handleScroll = useCallback((event) => {
        const el = event.currentTarget;
        if (el.scrollHeight - el.scrollTop - el.clientHeight < 80) onScrollEnd?.();
    }, [onScrollEnd]);

    const emptyText = tab === "online" ? "No users online" : tab === "meet" ? "No connections yet" : tab === "discover" ? "No users found" : "No pending requests";
    const renderUser = (item, actionButtons = []) => {
        const canOpenChat = tab === "online" || tab === "meet" || (tab === "discover" && item.relation === "connected");
        return <UserItem
            key={item.userId}
            user={item}
            isOnline={item.status === "online"}
            isSelected={String(selectedUser) === String(item.userId)}
            lastMessage={lastMessages[item.userId]}
            unreadCount={unreadCounts[item.userId] || 0}
            isTyping={typingUsers[String(item.userId)] === true}
            onClick={canOpenChat ? () => onSelectUser(item.userId) : undefined}
            actions={actionButtons}
        />;
    };

    return (
        <div className="user-list" onScroll={handleScroll}>
            {tab === "requests" ? <>
                {users.incoming?.length > 0 && <div className="connection-section-title">Incoming</div>}
                {users.incoming?.map((item) => renderUser(item, [
                    { label: "Accept", kind: "primary", onClick: () => onAction("accept", item) },
                    { label: "Reject", kind: "subtle", onClick: () => onAction("reject", item) }
                ]))}
                {users.outgoing?.length > 0 && <div className="connection-section-title">Sent</div>}
                {users.outgoing?.map((item) => renderUser(item, [
                    { label: "Cancel", kind: "subtle", onClick: () => onAction("remove", item) }
                ]))}
                {!users.incoming?.length && !users.outgoing?.length && <p className="no-users">{emptyText}</p>}
            </> : users.length === 0 && !loading ? <p className="no-users">{emptyText}</p> : users.map((item) => {
                let actions = [];
                if (tab === "meet") {
                    actions = [{ label: "Remove", kind: "subtle", onClick: () => onAction("remove", item) }];
                }
                if (tab === "discover") {
                    if (item.relation === "none") actions = [{ label: "+", kind: "primary", title: "Send connection request", onClick: () => onAction("request", item) }];
                    if (item.relation === "request_sent") actions = [{ label: "Pending", kind: "subtle", disabled: true }];
                    if (item.relation === "request_received") actions = [
                        { label: "Accept", kind: "primary", onClick: () => onAction("accept", item) },
                        { label: "Reject", kind: "subtle", onClick: () => onAction("reject", item) }
                    ];
                    if (item.relation === "connected") actions = [{ label: "Connected", kind: "subtle", disabled: true }];
                }
                return renderUser(item, actions);
            })}
            {loading && <p className="connection-loading">Loading…</p>}
            {error && <p className="connection-error">{error}</p>}
        </div>
    );
}

export default UserList;
