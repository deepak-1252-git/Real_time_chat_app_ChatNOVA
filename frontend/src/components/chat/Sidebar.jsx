import ProfileMenu from "./ProfileMenu";
import UserSearch from "./UserSearch";
import UserList from "./UserList";
// import { startSession } from "../../../../backend/models/userModel";

function Sidebar({
    user,
    onlineUsers,
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
                onlineUsers={onlineUsers}
                selectedUser={selectedUser}
                onSelectUser={onSelectUser}
                lastMessages={lastMessages}
                unreadCounts={unreadCounts}
            />
        </aside>
    );
}

export default Sidebar;