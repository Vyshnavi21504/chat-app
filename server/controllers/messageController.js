import Message from "../models/Message.js";
import User from "../models/User.js";
import cloudinary from "../lib/cloudinary.js";
import { io, userSocketMap } from "../server.js";

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
        
        res.json({ success: true, messages });
    } catch (error) {
        console.log("Error in getMessages: ", error.message);
        res.json({ success: false, message: error.message });
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
        // Corrected typo: 'req.boody' to 'req.body'
        const { message } = req.body;
        const receiverId = req.params.id;
        const senderId = req.user._id;

        let imageUrl;
        if (message.image) {
            const uploadResponse = await cloudinary.uploader.upload(message.image);
            imageUrl = uploadResponse.secure_url;
        }

        const newMessage = await Message.create({
            senderId,
            receiverId,
            message: {
                text: message.text,
                image: imageUrl,
            },
        });

        // emit the new message to the receiver
        const receiverSocketId = userSocketMap[receiverId];
        if (receiverSocketId) {
            io.to(receiverSocketId).emit("newMessage", newMessage);
        }

        res.json({ success: true, newMessage });
    } catch (error) {
        console.log("Error in sendMessage: ", error.message);
        res.json({ success: false, message: error.message });
    }
};
