import React, {
  useRef,
  useEffect,
  useContext,
  useState,
  useCallback,
} from "react";
import toast from "react-hot-toast";
import { ChatContext } from "../../context/ChatContext";
import { AuthContext } from "../../context/AuthContext";
import { formatMessageTime } from "../lib/utils";
import assets from "../assets/assets";

const ChatContainer = () => {
  const {
    messages,
    selectedUser,
    setSelectedUser,
    sendMessage,
    getMessages,
    deleteMessage,
  } = useContext(ChatContext);
  const { authUser, onlineUsers } = useContext(AuthContext);

  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef();
  const [input, setInput] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState(null);
  const [showDropdown, setShowDropdown] = useState(null);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [mobileMenuMsg, setMobileMenuMsg] = useState(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);

  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "auto" });
    }
  }, []);

  const handleScroll = useCallback(() => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 100;
      setShowScrollButton(!isAtBottom);
    }
  }, []);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (input.trim() === "") return;

    const messageText = input.trim();
    setInput("");

    try {
      await sendMessage({ text: messageText });
      // Don't manually scroll here, let the useEffect handle it
    } catch (error) {
      toast.error("Failed to send message");
    }
  };

  const handleSendImage = async (e) => {
    const file = e.target.files[0];
    if (!file || !file.type.startsWith("image/")) {
      toast.error("Select an image file");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        await sendMessage({ image: reader.result });
        e.target.value = "";
        // Don't manually scroll here, let the useEffect handle it
      } catch (error) {
        toast.error("Failed to send image");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteClick = (msg) => {
    setMessageToDelete(msg);
    setShowDeleteModal(true);
    setShowDropdown(null);
  };

  const handleConfirmDelete = async () => {
    if (messageToDelete) {
      try {
        await deleteMessage(messageToDelete._id);
        setShowDeleteModal(false);
        setMessageToDelete(null);
      } catch (error) {
        toast.error("Failed to delete message");
      }
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setMessageToDelete(null);
  };

  let longPressTimer = null;
  const handleTouchStart = (msg) => {
    longPressTimer = setTimeout(() => {
      setMobileMenuMsg(msg);
      setShowMobileMenu(true);
    }, 500);
  };

  const handleTouchEnd = () => {
    clearTimeout(longPressTimer);
  };

  // Load messages when user is selected
  useEffect(() => {
    if (selectedUser && selectedUser._id) {
      setIsLoadingMessages(true);
      setHasInitialized(false);
      
      getMessages(selectedUser._id)
        .then(() => {
          setIsLoadingMessages(false);
          setHasInitialized(true);
          // Single scroll after everything is loaded
          setTimeout(() => {
            scrollToBottom();
          }, 50);
        })
        .catch(() => {
          setIsLoadingMessages(false);
          setHasInitialized(true);
        });
    }
  }, [selectedUser?._id, getMessages, scrollToBottom]);

  // Only scroll on new messages after initial load is complete
  useEffect(() => {
    if (hasInitialized && !isLoadingMessages && messages.length > 0) {
      const timer = setTimeout(() => {
        scrollToBottom();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [messages.length, hasInitialized, isLoadingMessages, scrollToBottom]);

  const isGroupChat = false;

  if (!selectedUser) {
    return (
      <div className="hidden md:flex flex-col items-center justify-center gap-2 h-full bg-gray-900/50">
        <img src={assets.logo_icon} alt="" className="w-16 h-16" />
        <p className="text-lg font-medium text-white">Chat anytime, anywhere</p>
      </div>
    );
  }

  // Show loading state while messages are being fetched
  if (isLoadingMessages || !hasInitialized) {
    return (
      <div className="flex flex-col h-full bg-slate-900">
        {/* Header - show immediately */}
        <div className="flex items-center gap-3 py-3 px-4 border-b border-stone-500 bg-gray-900/80">
          <img
            src={selectedUser.profilePic || assets.avatar_icon}
            alt=""
            className="w-8 rounded-full"
          />
          <p className="flex-1 text-lg text-white flex items-center gap-2">
            {selectedUser.fullName}
            {onlineUsers.includes(selectedUser._id) && (
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
            )}
          </p>
          <img
            onClick={() => setSelectedUser(null)}
            src={assets.arrow_icon}
            alt=""
            className="md:hidden max-w-7 cursor-pointer"
          />
          <img
            src={assets.help_icon}
            alt=""
            className="hidden md:block max-w-5"
          />
        </div>
        
        {/* Loading messages area */}
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse text-gray-400">Loading messages...</div>
        </div>
        
        {/* Input box - show immediately */}
        <div className="p-3 border-t border-gray-600 bg-gray-900/80">
          <form onSubmit={handleSendMessage} className="flex items-center gap-3">
            <div className="flex-1 flex items-center bg-gray-700 px-3 rounded-full">
              <input
                onChange={(e) => setInput(e.target.value)}
                value={input}
                type="text"
                placeholder="Send a message"
                className="flex-1 text-sm p-3 bg-transparent border-none rounded-lg outline-none text-white placeholder-gray-400"
              />
              <input
                onChange={handleSendImage}
                type="file"
                id="image"
                accept="image/png, image/jpeg"
                hidden
              />
              <label htmlFor="image" className="cursor-pointer">
                <img
                  src={assets.gallery_icon}
                  alt="Send image"
                  className="w-5 h-5"
                />
              </label>
            </div>
            <button
              type="submit"
              disabled={!input.trim()}
              className={`p-2 rounded-full transition-colors ${
                input.trim() ? "bg-violet-600 hover:bg-violet-700" : "bg-gray-600"
              }`}
            >
              <img src={assets.send_button} alt="Send" className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-900">
      {/* Header */}
      <div className="flex items-center gap-3 py-3 px-4 border-b border-stone-500 bg-gray-900/80">
        <img
          src={selectedUser.profilePic || assets.avatar_icon}
          alt=""
          className="w-8 rounded-full"
        />
        <p className="flex-1 text-lg text-white flex items-center gap-2">
          {selectedUser.fullName}
          {onlineUsers.includes(selectedUser._id) && (
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
          )}
        </p>
        <img
          onClick={() => setSelectedUser(null)}
          src={assets.arrow_icon}
          alt=""
          className="md:hidden max-w-7 cursor-pointer"
        />
        <img
          src={assets.help_icon}
          alt=""
          className="hidden md:block max-w-5"
        />
      </div>

      {/* Messages Container */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 p-4 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-800"
      >
        {messages.length > 0 ? (
          messages.map((msg, index) => {
            const isSender = msg.senderId === authUser._id || msg.sender === authUser._id;
            const isDeleted = msg.deleted;
            
            return (
              <div
                key={`${msg._id}-${index}`}
                className={`flex items-end gap-2 my-2 ${
                  isSender ? "justify-end" : "justify-start"
                } group relative`}
                onTouchStart={
                  isSender && !isDeleted ? () => handleTouchStart(msg) : undefined
                }
                onTouchEnd={isSender && !isDeleted ? handleTouchEnd : undefined}
              >
                {!isSender && (
                  <img
                    src={selectedUser?.profilePic || assets.avatar_icon}
                    alt=""
                    className="w-8 h-8 rounded-full"
                  />
                )}

                {/* Message Content */}
                {isDeleted ? (
                  <div className="italic text-xs text-gray-400 bg-gray-800/70 rounded px-3 py-2 select-none">
                    This message was deleted
                  </div>
                ) : (
                  <div className="flex flex-col relative group">
                    <div
                      className={`p-3 rounded-lg max-w-[70%] md:max-w-md break-words ${
                        isSender
                          ? "bg-indigo-600 text-white rounded-br-none"
                          : "bg-gray-700 text-gray-200 rounded-bl-none"
                      }`}
                    >
                      {/* Text Message */}
                      {(msg.message?.text || msg.text) && (
                        <p>{msg.message?.text || msg.text}</p>
                      )}
                      
                      {/* Image Message */}
                      {(msg.image || msg.message?.image) && (
                        <img
                          src={msg.image || msg.message?.image}
                          alt="Message"
                          className="max-w-full h-auto rounded-lg mt-2"
                        />
                      )}
                      
                      {/* Timestamp */}
                      <span className="block text-xs text-right mt-1 opacity-70">
                        {formatMessageTime(msg.createdAt)}
                      </span>
                    </div>

                    {/* Seen status for sender */}
                    {isSender && (
                      <span className="text-[10px] text-gray-400 mt-1 self-end">
                        {msg.seen ? "Seen" : ""}
                      </span>
                    )}

                    {/* Delete button for sender */}
                    {isSender && !isDeleted && (
                      <button
                        className="absolute top-1 right-1 p-1 text-gray-400 hover:text-violet-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() =>
                          setShowDropdown(
                            msg._id === showDropdown ? null : msg._id
                          )
                        }
                      >
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"/>
                        </svg>
                      </button>
                    )}

                    {/* Dropdown menu */}
                    {showDropdown === msg._id && (
                      <div className="absolute top-6 right-0 w-20 bg-gray-800 border border-gray-700 rounded shadow-lg z-10">
                        <button
                          className="block w-full text-left px-3 py-1.5 text-xs text-red-400 hover:bg-gray-700"
                          onClick={() => handleDeleteClick(msg)}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {isSender && (
                  <img
                    src={authUser?.profilePic || assets.avatar_icon}
                    alt=""
                    className="w-8 h-8 rounded-full"
                  />
                )}
              </div>
            );
          })
        ) : (
          <div className="flex justify-center items-center h-full">
            <p className="text-gray-500">
              Start the conversation with {selectedUser?.fullName}
            </p>
          </div>
        )}
        <div ref={messagesEndRef} />

        {/* Scroll to bottom button */}
        {showScrollButton && (
          <button
            onClick={scrollToBottom}
            className="fixed bottom-20 right-4 bg-violet-600 hover:bg-violet-700 text-white rounded-full p-2 shadow-lg transition-opacity duration-200"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 14l-7 7m0 0l-7-7m7 7V3"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Input Box */}
      <div className="p-3 border-t border-gray-600 bg-gray-900/80">
        <form onSubmit={handleSendMessage} className="flex items-center gap-3">
          <div className="flex-1 flex items-center bg-gray-700 px-3 rounded-full">
            <input
              onChange={(e) => setInput(e.target.value)}
              value={input}
              type="text"
              placeholder="Send a message"
              className="flex-1 text-sm p-3 bg-transparent border-none rounded-lg outline-none text-white placeholder-gray-400"
            />
            <input
              onChange={handleSendImage}
              type="file"
              id="image"
              accept="image/png, image/jpeg"
              hidden
            />
            <label htmlFor="image" className="cursor-pointer">
              <img
                src={assets.gallery_icon}
                alt="Send image"
                className="w-5 h-5"
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={!input.trim()}
            className={`p-2 rounded-full transition-colors ${
              input.trim() ? "bg-violet-600 hover:bg-violet-700" : "bg-gray-600"
            }`}
          >
            <img src={assets.send_button} alt="Send" className="w-5 h-5" />
          </button>
        </form>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg w-72 text-center">
            <div className="mb-4 text-white">Delete this message?</div>
            <div className="flex justify-center gap-4">
              <button
                onClick={handleConfirmDelete}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-1 rounded transition-colors"
              >
                Delete
              </button>
              <button
                onClick={handleCancelDelete}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-1 rounded transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile menu for long press */}
      {showMobileMenu && mobileMenuMsg && (
        <div
          className="fixed inset-0 z-50 flex items-end md:hidden bg-black/40"
          onClick={() => setShowMobileMenu(false)}
        >
          <div
            className="w-full bg-gray-800 rounded-t-lg p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="block w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-gray-700 transition-colors"
              onClick={() => {
                handleDeleteClick(mobileMenuMsg);
                setShowMobileMenu(false);
              }}
            >
              Delete
            </button>
            <button
              className="block w-full text-left px-4 py-3 text-sm text-gray-400 hover:bg-gray-700 transition-colors"
              onClick={() => setShowMobileMenu(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatContainer;