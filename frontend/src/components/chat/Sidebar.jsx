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
    unreadCounts
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
            />
        </aside>
    );
}

export default Sidebar;