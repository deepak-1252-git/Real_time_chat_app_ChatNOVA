import UserItem from "./UserItem";

function UserList({
    displayUsers,
    selectedUser,
    onSelectUser,
    lastMessages,
    unreadCounts
}) {

    return (
        <div className="user-list">

            {displayUsers.length === 0 ? (

                <p className="no-users">
                    No users online
                </p>

            ) : (

                displayUsers.map((onlineUser) => (

                    <UserItem
                        key={onlineUser.userId}
                        userId={onlineUser.username}
                        isOnline={onlineUser.status === "online"}
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