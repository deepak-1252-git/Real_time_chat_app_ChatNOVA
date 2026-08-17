import UserItem from "./UserItem";

function UserList({
    onlineUsers,
    selectedUser,
    onSelectUser,
    lastMessages,
    unreadCounts
}) {

    return (
        <div className="user-list">

            {onlineUsers.length === 0 ? (

                <p className="no-users">
                    No users online
                </p>

            ) : (

                onlineUsers.map((onlineUser) => (

                    <UserItem
                        key={onlineUser.userId}
                        userId={onlineUser.username}
                        isOnline={true}
                        isSelected={
                            selectedUser === onlineUser.userId
                        }
                        lastMessage={
                            lastMessages[onlineUser.userId]
                        }
                        unreadCount={
                            unreadCounts[onlineUser.userId] || 0
                        }
                        onClick={() =>
                            onSelectUser(onlineUser.userId)
                        }
                    />

                ))

            )}

        </div>
    );
}

export default UserList;