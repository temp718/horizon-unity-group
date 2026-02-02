import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { ArrowLeft, Plus, Minus, MessageSquare, Edit2, Eye, EyeOff, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface Member {
  id: string;
  user_id: string;
  full_name: string;
  phone_number: string | null;
  balance_visible: boolean;
  daily_contribution_amount: number;
  balance_adjustment: number;
  missed_contributions: number;
}

interface Contribution {
  id: string;
  amount: number;
  contribution_date: string;
  status: string;
}

interface BalanceAdjustment {
  id: string;
  amount: number;
  adjustment_type: string;
  reason: string | null;
  created_at: string;
}

export default function AdminMemberDetail() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const [member, setMember] = useState<Member | null>(null);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [adjustments, setAdjustments] = useState<BalanceAdjustment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Dialog states
  const [addAmountOpen, setAddAmountOpen] = useState(false);
  const [adjustContributionOpen, setAdjustContributionOpen] = useState(false);
  const [messageOpen, setMessageOpen] = useState(false);
  const [balanceVisibilityOpen, setBalanceVisibilityOpen] = useState(false);

  // Form states
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjustType, setAdjustType] = useState<'add' | 'deduct'>('add');
  const [newContributionAmount, setNewContributionAmount] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      navigate('/dashboard');
      return;
    }
    if (userId) {
      fetchMemberData();
    }
  }, [userId, isAdmin, authLoading, navigate]);

  const fetchMemberData = async () => {
    try {
      const [memberRes, contribRes, adjustRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .eq('user_id', userId)
          .single(),
        supabase
          .from('contributions')
          .select('*')
          .eq('user_id', userId)
          .order('contribution_date', { ascending: false }),
        supabase
          .from('balance_adjustments')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
      ]);

      if (memberRes.data) {
        setMember(memberRes.data);
        setNewContributionAmount(memberRes.data.daily_contribution_amount.toString());
      }
      if (contribRes.data) setContributions(contribRes.data);
      if (adjustRes.data) setAdjustments(adjustRes.data);
    } catch (error) {
      console.error('Error fetching member data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load member details',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddBalance = async () => {
    if (!adjustAmount || !userId) {
      toast({
        title: 'Error',
        description: 'Please enter an amount',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('balance_adjustments')
        .insert({
          user_id: userId,
          admin_id: user!.id,
          amount: parseFloat(adjustAmount),
          adjustment_type: adjustType,
          reason: adjustReason || null
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Balance ${adjustType === 'add' ? 'added' : 'deducted'} successfully`,
      });

      setAdjustAmount('');
      setAdjustReason('');
      setAddAmountOpen(false);
      fetchMemberData();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to adjust balance';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    }
  };

  const handleUpdateContribution = async () => {
    if (!newContributionAmount || !member) {
      toast({
        title: 'Error',
        description: 'Please enter a valid amount',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ daily_contribution_amount: parseFloat(newContributionAmount) })
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Default contribution amount updated',
      });

      setMember({ ...member, daily_contribution_amount: parseFloat(newContributionAmount) });
      setAdjustContributionOpen(false);
      fetchMemberData();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update contribution amount';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    }
  };

  const handleToggleBalanceVisibility = async () => {
    if (!member) return;

    try {
      const newVisibility = !member.balance_visible;
      const { error } = await supabase
        .from('profiles')
        .update({ balance_visible: newVisibility })
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Balance is now ${newVisibility ? 'visible' : 'hidden'} to user`,
      });

      setMember({ ...member, balance_visible: newVisibility });
      setBalanceVisibilityOpen(false);
      fetchMemberData();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update balance visibility';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    }
  };

  const handleSendMessage = async () => {
    if (!message || !userId) {
      toast({
        title: 'Error',
        description: 'Please enter a message',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('admin_messages')
        .insert({
          user_id: userId,
          admin_id: user!.id,
          message
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Message sent to member',
      });

      setMessage('');
      setMessageOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to send message';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    }
  };

  const handleDeleteContribution = async (contributionId: string) => {
    if (!confirm('Are you sure you want to delete this contribution?')) return;

    try {
      const { error } = await supabase
        .from('contributions')
        .delete()
        .eq('id', contributionId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Contribution deleted',
      });

      fetchMemberData();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete contribution';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    }
  };

  const totalBalance = contributions.reduce((sum, c) => sum + Number(c.amount), 0) +
    adjustments.reduce((sum, a) => sum + (a.adjustment_type === 'add' ? Number(a.amount) : -Number(a.amount)), 0);

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Member not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/admin/dashboard')}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-primary font-semibold text-sm">
                {member.full_name?.charAt(0) || 'M'}
              </span>
            </div>
            <div>
              <p className="font-semibold text-foreground">{member.full_name}</p>
              <p className="text-xs text-muted-foreground">{member.phone_number}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Balance Overview */}
        <div className="finance-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg">Account Balance</h3>
            <Dialog open={balanceVisibilityOpen} onOpenChange={setBalanceVisibilityOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  {!member.balance_visible ? (
                    <>
                      <EyeOff className="w-4 h-4 mr-2" />
                      Show to User
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4 mr-2" />
                      Hide from User
                    </>
                  )}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Control Balance Visibility</DialogTitle>
                  <DialogDescription>
                    {!member.balance_visible 
                      ? 'This member cannot see their balance. Reveal it to create excitement!' 
                      : 'This member can see their balance.'}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <p className="text-sm text-muted-foreground">
                    {!member.balance_visible 
                      ? 'Click below to reveal this member\'s balance.' 
                      : 'Click below to hide this member\'s balance.'}
                  </p>
                  <Button onClick={handleToggleBalanceVisibility} className="w-full">
                    {!member.balance_visible ? 'Reveal Balance' : 'Hide Balance'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          
          <div className="space-y-4">
            <div>
              <p className="stat-label mb-1">Total Balance</p>
              <p className="text-4xl font-bold amount-positive">KES {totalBalance.toLocaleString()}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted p-3 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Contributions</p>
                <p className="text-xl font-bold">KES {contributions.reduce((sum, c) => sum + Number(c.amount), 0).toLocaleString()}</p>
              </div>
              <div className="bg-muted p-3 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Adjustments</p>
                <p className="text-xl font-bold">KES {Math.abs(member.balance_adjustment).toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Control Actions */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Dialog open={addAmountOpen} onOpenChange={setAddAmountOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Add Balance</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add/Deduct Balance</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={adjustType} onValueChange={(value: any) => setAdjustType(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="add">Add</SelectItem>
                      <SelectItem value="deduct">Deduct</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount</Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="1000"
                    value={adjustAmount}
                    onChange={(e) => setAdjustAmount(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reason">Reason (optional)</Label>
                  <Input
                    id="reason"
                    type="text"
                    placeholder="e.g., Bonus, Penalty, etc."
                    value={adjustReason}
                    onChange={(e) => setAdjustReason(e.target.value)}
                  />
                </div>
                <Button onClick={handleAddBalance} className="w-full">
                  Submit
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={adjustContributionOpen} onOpenChange={setAdjustContributionOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <Edit2 className="w-4 h-4" />
                <span className="hidden sm:inline">Contribution</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adjust Default Contribution</DialogTitle>
                <DialogDescription>
                  Current: KES {member.daily_contribution_amount}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="contribution">Daily Amount</Label>
                  <Input
                    id="contribution"
                    type="number"
                    placeholder="100"
                    value={newContributionAmount}
                    onChange={(e) => setNewContributionAmount(e.target.value)}
                  />
                </div>
                <Button onClick={handleUpdateContribution} className="w-full">
                  Update
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={messageOpen} onOpenChange={setMessageOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                <span className="hidden sm:inline">Message</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Send Message to Member</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <textarea
                    id="message"
                    placeholder="Enter your message..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full p-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    rows={4}
                  />
                </div>
                <Button onClick={handleSendMessage} className="w-full">
                  Send
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Balance Adjustments History */}
        {adjustments.length > 0 && (
          <div className="finance-card">
            <h3 className="font-semibold mb-4">Balance Adjustments</h3>
            <div className="space-y-3">
              {adjustments.map((adj) => (
                <div key={adj.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="text-sm font-medium">
                      {adj.adjustment_type === 'add' ? 'Added' : 'Deducted'}: KES {Number(adj.amount).toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {adj.reason || 'No reason provided'} • {format(parseISO(adj.created_at), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <span className={`font-semibold ${adj.adjustment_type === 'add' ? 'amount-positive' : 'text-red-600'}`}>
                    {adj.adjustment_type === 'add' ? '+' : '-'}KES {Number(adj.amount).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Contributions */}
        <div className="finance-card">
          <h3 className="font-semibold mb-4">Contribution History</h3>
          {contributions.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No contributions yet.</p>
          ) : (
            <div className="space-y-3">
              {contributions.map((contrib) => (
                <div key={contrib.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="text-sm font-medium">
                      KES {Number(contrib.amount).toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(parseISO(contrib.contribution_date), 'MMM d, yyyy')} • {contrib.status}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteContribution(contrib.id)}
                    className="p-1.5 rounded hover:bg-muted text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
