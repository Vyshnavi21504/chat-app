import Message from "../models/Message.js";
import User from "../models/User.js";
import cloudinary from "../lib/cloudinary.js";
import { io, userSocketMap } from "../server.js";
import axios from "axios";

//get all users for the logged-in user's sidebar
export const getUsersForSidebar = async (req, res) => {
    try {
        const userId = req.user._id;

        // Use the 'User' model to find all users except the current one
        const filteredUsers = await User.find({ _id: { $ne: userId } }).select("-password");

        // Calculate unseen messages count for each user
        const unseenMessages = {};
        const promises = filteredUsers.map(async (user) => {
            const messages = await Message.find({ senderId: user._id, receiverId: userId, seen: false });
            if (messages.length > 0) {
                unseenMessages[user._id] = messages.length;
            }
        });
        await Promise.all(promises);

        res.json({ success: true, users: filteredUsers, unseenMessages });
    } catch (error) {
        console.log("Error in getUsersForSidebar: ", error.message);
        res.json({ success: false, message: error.message });
    }
};

// get all messages for a selected user
export const getMessages = async (req, res) => {
    try {
        const { id: selectedUserId } = req.params;
        const myId = req.user._id;
        const messages = await Message.find({
            $or: [
                { senderId: myId, receiverId: selectedUserId },
                { senderId: selectedUserId, receiverId: myId },
            ],
        });
        
        // Mark all incoming messages from the selected user as seen
        await Message.updateMany({ senderId: selectedUserId, receiverId: myId }, { seen: true });
        
        // Ensure you send a response:
        res.json({ success: true, messages });
    } catch (error) {
        console.error("Error in getMessages:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

// api to mark a message as seen using its message ID
export const markMessageAsSeen = async (req, res) => {
    try {
        const { id } = req.params;
        // Corrected typo: 'finsByAndUpdate' to 'findByIdAndUpdate'
        await Message.findByIdAndUpdate(id, { seen: true });
        res.json({ success: true });
    } catch (error) {
        console.log("Error in markMessageAsSeen: ", error.message);
        res.json({ success: false, message: error.message });
    }
};


// send message to selected user
export const sendMessage = async (req, res) => {
    try {
        console.log("Request body:", req.body);
        console.log("Request params:", req.params);
        console.log("User info:", req.user);

        const { message } = req.body;
        if (!message) {
            return res.status(400).json({ success: false, message: "Message text is required" });
        }
        if (!req.user || !req.user._id) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }
        // Make sure req.params.id is correctly passed (it should be the selected user's id)
        if (!req.params.id) {
            return res.status(400).json({ success: false, message: "Receiver id is missing" });
        }

        const newMessage = await Message.create({
            senderId: req.user._id,
            receiverId: req.params.id,
            text: message,
            createdAt: new Date(),
        });
        res.json({ success: true, message: newMessage });

        // Also send the message to the server via axios
        axios.post(`/api/messages/send/${req.params.id}`, { message });
    } catch (error) {
        console.error("Full error sending message:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};
