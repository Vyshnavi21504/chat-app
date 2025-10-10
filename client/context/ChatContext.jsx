import { createContext, useState, useEffect, useContext } from "react";
import toast from "react-hot-toast";
import axios from "axios";
import { AuthContext } from './AuthContext';

export const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
    const [messages, setMessages] = useState([]);
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [unseenMessages, setUnseenMessages] = useState({});

    //check if user is autheticated 
    const { socket , authUser} = useContext(AuthContext);

    const getUsers = async () => {
        try {
            const { data } = await axios.get("/api/messages/users");
            if (data.success) {
                setUsers(data.users);
                setUnseenMessages(data.unseenMessages);
            }
        } catch (error) {
            toast.error(error.message);
        }
    };
    
    const getMessages = async (userId) => {
        if (!userId) {
            console.error("User ID is required to fetch messages.");
            return Promise.reject("User ID not provided.");
        }
        try {
            const { data } = await axios.get(`/api/messages/${userId}`);
            if (data.success) {
                setMessages(data.messages);
                return data.messages;
            } else {
                toast.error(data.message || "Failed to fetch messages");
                return Promise.reject(data.message);
            }
        } catch (error) {
            console.error("Error fetching messages:", error);
            toast.error(error.message);
            return Promise.reject(error);
        }
    };

    const sendMessage = async (message) => {
        if (!selectedUser) {
            toast.error("Please select a user to send a message.");
            return;
        }
        try {
            const { data } = await axios.post(`/api/messages/send/${selectedUser._id}`, { message });
            
            if (data.success) {
                // This line now correctly adds the complete newMessage object to the state
                setMessages((prevMessages) => [...prevMessages, data.newMessage]);
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            console.error("Error sending message:", error);
            toast.error(error.message);
        }
    };

    const subscribeToMessages = () => {
        if (!socket) return;

        socket.on("newMessage", (newMessage) => {
            if (selectedUser && newMessage.senderId === selectedUser._id) {
                newMessage.seen = true;
                setMessages((prevMessages) => [...prevMessages, newMessage]);
                axios.put(`/api/messages/mark/${newMessage._id}`);
            } else {
                setUnseenMessages((prevUnseenMessages) => ({
                    ...prevUnseenMessages,
                    [newMessage.senderId]: (prevUnseenMessages[newMessage.senderId] || 0) + 1,
                }));
            }
        });
    };

    const unsubscribeFromMessages = () => {
        if (!socket) return;
        socket.off("newMessage");
    };

    useEffect(() => {
        subscribeToMessages();
        return () => unsubscribeFromMessages();
    }, [socket, selectedUser]);
    
    const value = {
        messages,
        users,
        selectedUser,
        getUsers,
        getMessages,
        sendMessage,
        setSelectedUser,
        unseenMessages,
        setUnseenMessages,
    };
    
    return (
        <ChatContext.Provider value={value}>
            {children}
        </ChatContext.Provider>
    );
};

export default ChatContext;