import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Layout } from "@/components/layout/Layout";
import { useAuth } from "@/hooks/useAuth";
import { useConversations, useMessages } from "@/hooks/useMessaging";
import { cn } from "@/lib/utils";
import { Send, ArrowLeft, MessageSquare, User } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";

export default function Messages() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { conversations, isLoading: conversationsLoading } = useConversations(user?.id || null);
  const { messages, sendMessage } = useMessages(selectedConversationId, user?.id || null);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    await sendMessage.mutateAsync({ content: newMessage.trim() });
    setNewMessage("");
  };

  const getOtherParticipant = (conversation: any) => {
    if (!user) return null;
    const other = conversation.participants?.find((p: any) => p.user_id !== user.id);
    return other?.profile || null;
  };

  const selectedConversation = conversations.find(c => c.id === selectedConversationId);
  const otherUser = selectedConversation ? getOtherParticipant(selectedConversation) : null;

  if (loading) {
    return (
      <Layout>
        <div className="container-app py-12 flex items-center justify-center min-h-[60vh]">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout showFooter={false}>
      <div className="container-app py-4">
        <div className="flex gap-4 h-[calc(100vh-120px)]">
          {/* Conversations List */}
          <Card className={cn(
            "w-full md:w-80 flex-shrink-0",
            selectedConversationId && "hidden md:flex md:flex-col"
          )}>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Messages
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-hidden">
              {conversationsLoading ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex items-center gap-3 animate-pulse">
                      <div className="w-10 h-10 rounded-full bg-muted" />
                      <div className="flex-1">
                        <div className="h-4 bg-muted rounded w-24 mb-1" />
                        <div className="h-3 bg-muted rounded w-32" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : conversations.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No messages yet</p>
                  <p className="text-xs mt-1">Start a conversation from a player's profile</p>
                </div>
              ) : (
                <ScrollArea className="h-full">
                  <div className="p-2">
                    {conversations.map((conversation) => {
                      const other = getOtherParticipant(conversation);
                      return (
                        <button
                          key={conversation.id}
                          onClick={() => setSelectedConversationId(conversation.id)}
                          className={cn(
                            "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors",
                            selectedConversationId === conversation.id
                              ? "bg-primary/10"
                              : "hover:bg-muted"
                          )}
                        >
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={other?.profile_photo_url || undefined} />
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {other?.name?.charAt(0) || <User className="h-4 w-4" />}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="font-medium truncate">{other?.name || "User"}</p>
                              {conversation.unread_count > 0 && (
                                <span className="w-5 h-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
                                  {conversation.unread_count}
                                </span>
                              )}
                            </div>
                            {conversation.last_message && (
                              <p className="text-sm text-muted-foreground truncate">
                                {conversation.last_message.content}
                              </p>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* Chat Area */}
          <Card className={cn(
            "flex-1 flex flex-col",
            !selectedConversationId && "hidden md:flex"
          )}>
            {selectedConversationId ? (
              <>
                {/* Chat Header */}
                <CardHeader className="pb-3 border-b flex-row items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden"
                    onClick={() => setSelectedConversationId(null)}
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={otherUser?.profile_photo_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {otherUser?.name?.charAt(0) || <User className="h-4 w-4" />}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-base">{otherUser?.name || "User"}</CardTitle>
                  </div>
                </CardHeader>

                {/* Messages */}
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {messages.map((message) => {
                      const isOwn = message.sender_id === user?.id;
                      const isMatchInvite = message.message_type === 'match_invite';

                      return (
                        <div
                          key={message.id}
                          className={cn(
                            "flex",
                            isOwn ? "justify-end" : "justify-start"
                          )}
                        >
                          <div
                            className={cn(
                              "max-w-[75%] rounded-2xl px-4 py-2",
                              isOwn
                                ? "bg-primary text-primary-foreground rounded-br-md"
                                : "bg-muted rounded-bl-md",
                              isMatchInvite && "border-2 border-primary/20"
                            )}
                          >
                            {isMatchInvite && message.match_id ? (
                              <div className="space-y-2">
                                <p className="whitespace-pre-line text-sm">{message.content}</p>
                                <Link to={`/matches/${message.match_id}`}>
                                  <Button size="sm" variant={isOwn ? "secondary" : "default"} className="w-full">
                                    View Match
                                  </Button>
                                </Link>
                              </div>
                            ) : (
                              <p className="text-sm whitespace-pre-line">{message.content}</p>
                            )}
                            <p className={cn(
                              "text-[10px] mt-1",
                              isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
                            )}>
                              {format(new Date(message.created_at), "h:mm a")}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {/* Message Input */}
                <form onSubmit={handleSendMessage} className="p-4 border-t flex gap-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1"
                  />
                  <Button type="submit" size="icon" disabled={!newMessage.trim() || sendMessage.isPending}>
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Select a conversation to start messaging</p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </Layout>
  );
}
