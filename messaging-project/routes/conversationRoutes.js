const router = require("express").Router();
const { verifyToken } = require("..");
const { getConversationSummaries, getUnreadConversationCount } = require("../services/conversationService");

/**
 * Returns a summarized view of the current user's conversations.
 */
router.get("/talks", verifyToken, async (req, res) => {
  try {
    const conversations = await getConversationSummaries(req.user.id);
    return res.status(200).json(conversations);
  } catch (error) {
    console.error("Failed to fetch conversation summaries", error);
    return res.status(500).json("Internal server error");
  }
});

/**
 * Returns the number of conversations with unread messages
 * for the current user.
 */
router.get("/talks/unread-count", verifyToken, async (req, res) => {
  try {
    const unreadCount = await getUnreadConversationCount(req.user.id);
    return res.status(200).json(unreadCount);
  } catch (error) {
    console.error("Failed to fetch unread conversation count", error);
    return res.status(500).json("Internal server error");
  }
});

module.exports = router;