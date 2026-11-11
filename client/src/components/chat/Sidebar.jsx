import ProfileMenu from "./ProfileMenu";
import UserSearch from "./UserSearch";
import UserList from "./UserList";

function Sidebar({
    user,
    displayUsers,
    selectedUser,
    onSelectUser,
    searchText,
    setSearchText,
    lastMessages,
    unreadCounts,
    typingUsers
}) {
    return (
        <aside className="chat-sidebar">

            <ProfileMenu 
                user={user}
            />

            <UserSearch 
                searchText={searchText}
                setSearchText={setSearchText}
            />

            <UserList
                displayUsers={displayUsers}
                selectedUser={selectedUser}
                onSelectUser={onSelectUser}
                lastMessages={lastMessages}
                unreadCounts={unreadCounts}
                // currentUserId={user?.id}
                typingUsers={typingUsers}
            />
        </aside>
    );
}

export default Sidebar;