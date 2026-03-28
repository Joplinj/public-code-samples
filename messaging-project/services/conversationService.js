const Message = require("../models/Message");
const User = require("../models/User");

const ALLOWED_MESSAGE_STATUSES = ["read", "new", "trash"];

function normalizeTargetId(targetId) {
  return Array.isArray(targetId) ? targetId[0] : targetId;
}

function buildConversationKey(userAId, userBId) {
  return [String(userAId), String(userBId)].sort().join(":");
}

/**
 * Builds a summarized list of conversations for a given user.
 *
 * Each conversation is deduplicated by participant pair, then enriched
 * with target user information such as nickname, blacklist status, and
 * friendship status.
 */
async function getConversationSummaries(userId) {
  if (!userId) throw new Error("Missing user id");

  const messages = await Message.find({
    $or: [{ sender_ID: userId }, { target_ID: userId }],
    status: { $in: ALLOWED_MESSAGE_STATUSES },
  })
    .select("sender_ID target_ID status createdAt")
    .sort({ createdAt: -1 })
    .lean();

  const conversationsByPair = new Map();

  for (const message of messages) {
    const senderId = String(message.sender_ID);
    const targetId = String(normalizeTargetId(message.target_ID));

    if (!targetId) continue;

    const conversationKey = buildConversationKey(senderId, targetId);
    const partnerId = senderId === String(userId) ? targetId : senderId;
    const messageDate = new Date(message.createdAt);

    const existingConversation = conversationsByPair.get(conversationKey);

    if (!existingConversation) {
      conversationsByPair.set(conversationKey, {
        partnerId,
        status: message.status,
        lastAction: messageDate,
      });
      continue;
    }

    if (message.status === "new") {
      existingConversation.status = "new";
    }
  }

  const partnerIds = [...new Set(Array.from(conversationsByPair.values()).map((conversation) => conversation.partnerId))];

  const users = await User.find({
    _id: { $in: partnerIds },
  })
    .select("nickname black_list friends")
    .lean();

  const usersById = new Map(users.map((user) => [String(user._id), user]));

  const conversations = Array.from(conversationsByPair.values())
    .map((conversation) => {
      const partner = usersById.get(String(conversation.partnerId));
      if (!partner) return null;

      const blacklist = partner.black_list ?? [];
      const friends = partner.friends ?? [];

      const isBlacklisted = blacklist.some((item) => String(item) === String(userId));
      const friendEntry = friends.find((item) => String(item.id) === String(userId));

      return {
        id: partner._id,
        targetNickname: partner.nickname,
        status: conversation.status,
        lastAction: conversation.lastAction,
        blacklisted: isBlacklisted,
        isFriend: friendEntry?.status === "accepted",
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.lastAction - a.lastAction);

  return conversations;
}

/**
 * Returns the number of distinct conversations containing unread messages
 * for the given user.
 */
async function getUnreadConversationCount(userId) {
  if (!userId) {
    throw new Error("Missing user id");
  }

  const messages = await Message.find({
    target_ID: userId,
    status: "new",
  })
    .select("sender_ID")
    .lean();

  const uniqueSenderIds = new Set(messages.map((message) => String(message.sender_ID)));

  return uniqueSenderIds.size;
}

module.exports = {
  getConversationSummaries,
  getUnreadConversationCount,
};
