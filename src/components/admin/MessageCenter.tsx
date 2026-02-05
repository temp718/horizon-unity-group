 import { useState, useEffect } from 'react';
 import { supabase } from '@/integrations/supabase/client';
 import { Button } from '@/components/ui/button';
 import { Label } from '@/components/ui/label';
 import { Textarea } from '@/components/ui/textarea';
 import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogHeader,
   DialogTitle,
   DialogTrigger,
 } from "@/components/ui/dialog";
 import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
 } from "@/components/ui/select";
 import { useToast } from '@/hooks/use-toast';
 import { sendAdminNotificationSMS } from '@/lib/sms-reminders';
 import { MessageSquare, Send, Trash2, Edit2, Plus, AlertCircle, Info, Bell } from 'lucide-react';
 import { format, parseISO } from 'date-fns';

interface Message {
  id: string;
  message: string;
  message_type: string;
  user_id: string;
  admin_id: string;
  is_read: boolean;
  created_at: string;
  recipient_name?: string;
}

interface Member {
  user_id: string;
  full_name: string;
}

interface MessageCenterProps {
  adminId: string;
  members: Member[];
}

export default function MessageCenter({ adminId, members }: MessageCenterProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [messageType, setMessageType] = useState<'info' | 'warning' | 'announcement'>('info');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_messages')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Add recipient names
      const messagesWithNames = data?.map(msg => {
        const member = members.find(m => m.user_id === msg.user_id);
        return {
          ...msg,
          recipient_name: member?.full_name || 'Unknown'
        };
      }) || [];

      setMessages(messagesWithNames);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedUserId) return;
    
    setIsSending(true);
    try {
      if (editingMessage) {
        // Update existing message
        const { error } = await supabase
          .from('admin_messages')
          .update({
            message: newMessage,
            message_type: messageType,
          })
          .eq('id', editingMessage.id);

        if (error) throw error;

        toast({
          title: 'Message updated',
          description: 'Your message has been updated successfully.',
        });
      } else {
        // Create new message
        const { error } = await supabase
          .from('admin_messages')
          .insert({
            message: newMessage,
            message_type: messageType,
            user_id: selectedUserId,
            admin_id: adminId,
          });

        if (error) throw error;

        // Fetch user's phone number for optional SMS notification
        const { data: profileData } = await supabase
          .from('profiles')
          .select('phone_number, full_name')
          .eq('user_id', selectedUserId)
          .maybeSingle();

        if (profileData?.phone_number) {
          await sendAdminNotificationSMS(
            profileData.phone_number,
            newMessage,
            profileData.full_name
          ).catch(err => console.error('SMS notification sending failed:', err));
        }

        toast({
          title: 'Message sent',
          description: 'Your message has been sent successfully.',
        });
      }

      setIsDialogOpen(false);
      setNewMessage('');
      setMessageType('info');
      setSelectedUserId('');
      setEditingMessage(null);
      fetchMessages();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to send message';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('admin_messages')
        .delete()
        .eq('id', messageId);

      if (error) throw error;

      toast({
        title: 'Message deleted',
        description: 'The message has been deleted.',
      });
      fetchMessages();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete message';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    }
  };

  const handleEditMessage = (message: Message) => {
    setEditingMessage(message);
    setNewMessage(message.message);
    setMessageType(message.message_type as 'info' | 'warning' | 'announcement');
    setSelectedUserId(message.user_id);
    setIsDialogOpen(true);
  };

  const handleBroadcast = async () => {
    if (!newMessage.trim()) return;
    
    setIsSending(true);
    try {
      const messagesToInsert = members.map(member => ({
        message: newMessage,
        message_type: messageType,
        user_id: member.user_id,
        admin_id: adminId,
      }));

      const { error } = await supabase
        .from('admin_messages')
        .insert(messagesToInsert);

      if (error) throw error;

      toast({
        title: 'Broadcast sent',
        description: `Message sent to ${members.length} members.`,
      });

      setIsDialogOpen(false);
      setNewMessage('');
      setMessageType('info');
      setSelectedUserId('');
      fetchMessages();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to broadcast message';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  const getMessageIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-warning" />;
      case 'announcement':
        return <Bell className="w-4 h-4 text-primary" />;
      default:
        return <Info className="w-4 h-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="bg-card rounded-2xl p-5 shadow-sm border border-border">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <MessageSquare className="w-4 h-4 text-primary" />
          </div>
          <h3 className="font-semibold text-foreground">Message Center</h3>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setEditingMessage(null);
            setNewMessage('');
            setSelectedUserId('');
          }
        }}>
          <DialogTrigger asChild>
            <Button size="sm" className="rounded-xl">
              <Plus className="w-4 h-4 mr-1" />
              New
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle>{editingMessage ? 'Edit Message' : 'Send Message'}</DialogTitle>
              <DialogDescription>
                {editingMessage ? 'Update your message' : 'Send a message to a member or broadcast to all'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="recipient">Recipient</Label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select member" />
                  </SelectTrigger>
                  <SelectContent>
                    {members.map(member => (
                      <SelectItem key={member.user_id} value={member.user_id}>
                        {member.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Message Type</Label>
                <Select value={messageType} onValueChange={(v) => setMessageType(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Information</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="announcement">Announcement</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  placeholder="Type your message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  rows={4}
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={handleSendMessage} 
                  disabled={isSending || !newMessage.trim() || !selectedUserId} 
                  className="flex-1"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {isSending ? 'Sending...' : (editingMessage ? 'Update' : 'Send')}
                </Button>
                {!editingMessage && (
                  <Button 
                    variant="outline"
                    onClick={handleBroadcast} 
                    disabled={isSending || !newMessage.trim()} 
                  >
                    Broadcast All
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">Loading messages...</p>
        </div>
      ) : messages.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-16 h-16 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
            <MessageSquare className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground text-sm">No messages yet</p>
          <p className="text-muted-foreground text-xs mt-1">Send your first message to members</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {messages.slice(0, 8).map((message) => (
            <div 
              key={message.id} 
              className={`flex items-start gap-3 p-4 rounded-xl transition-colors ${
                message.is_read ? 'bg-muted/30' : 'bg-primary/5 border border-primary/20'
              }`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                message.message_type === 'warning' ? 'bg-warning/10' : 'bg-primary/10'
              }`}>
                {getMessageIcon(message.message_type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm text-foreground">{message.recipient_name}</span>
                  {!message.is_read && (
                    <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">New</span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground break-words line-clamp-2">{message.message}</p>
                <p className="text-xs text-muted-foreground mt-1">{format(parseISO(message.created_at), 'MMM d, HH:mm')}</p>
              </div>
              <div className="flex flex-col gap-1">
                <Button variant="ghost" size="icon" onClick={() => handleEditMessage(message)} className="h-7 w-7 rounded-full">
                  <Edit2 className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleDeleteMessage(message.id)} className="h-7 w-7 rounded-full text-destructive">
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
