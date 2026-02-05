 import { useState } from 'react';
 import { supabase } from '@/integrations/supabase/client';
 import { Button } from '@/components/ui/button';
 import { Input } from '@/components/ui/input';
 import { Label } from '@/components/ui/label';
 import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogHeader,
   DialogTitle,
 } from "@/components/ui/dialog";
 import { useToast } from '@/hooks/use-toast';
 import { Eye, EyeOff, Plus, Minus, Settings, Users, ChevronRight } from 'lucide-react';

interface Member {
  id: string;
  user_id: string;
  full_name: string;
  phone_number: string | null;
  total_contributions: number;
  contribution_count: number;
  balance_visible: boolean;
  daily_contribution_amount: number;
  balance_adjustment: number;
  missed_contributions: number;
}

interface MemberManagementProps {
  members: Member[];
  onRefresh: () => void;
  adminId: string;
}

 
 export default function MemberManagement({ members, onRefresh, adminId }: MemberManagementProps) {
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'deduct'>('add');
  const [adjustmentAmount, setAdjustmentAmount] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [newDailyAmount, setNewDailyAmount] = useState('');
  const [isAdjustDialogOpen, setIsAdjustDialogOpen] = useState(false);
  const [isContribDialogOpen, setIsContribDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleToggleVisibility = async (member: Member) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ balance_visible: !member.balance_visible })
        .eq('user_id', member.user_id);

      if (error) throw error;

      toast({
        title: 'Visibility updated',
        description: `Balance is now ${!member.balance_visible ? 'visible' : 'hidden'} for ${member.full_name}`,
      });
      onRefresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update visibility';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    }
  };

  const handleToggleAllVisibility = async (visible: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ balance_visible: visible })
        .neq('user_id', adminId);

      if (error) throw error;

      toast({
        title: 'All balances updated',
        description: `All member balances are now ${visible ? 'visible' : 'hidden'}`,
      });
      onRefresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update visibility';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    }
  };

  const handleBalanceAdjustment = async () => {
    if (!selectedMember || !adjustmentAmount) return;
    
    setIsLoading(true);
    try {
      const amount = parseFloat(adjustmentAmount);
      if (isNaN(amount) || amount <= 0) {
        throw new Error('Please enter a valid amount');
      }

      // Record the adjustment
      const { error: adjustError } = await supabase
        .from('balance_adjustments')
        .insert({
          user_id: selectedMember.user_id,
          admin_id: adminId,
          amount: adjustmentType === 'add' ? amount : -amount,
          adjustment_type: adjustmentType,
          reason: adjustmentReason || null,
        });

      if (adjustError) throw adjustError;

      // Update profile balance_adjustment
      const currentAdjustment = selectedMember.balance_adjustment || 0;
      const newAdjustment = adjustmentType === 'add' 
        ? currentAdjustment + amount 
        : currentAdjustment - amount;

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ balance_adjustment: newAdjustment })
        .eq('user_id', selectedMember.user_id);

      if (profileError) throw profileError;

      toast({
        title: 'Balance adjusted',
        description: `${adjustmentType === 'add' ? 'Added' : 'Deducted'} KES ${amount.toLocaleString()} ${adjustmentType === 'add' ? 'to' : 'from'} ${selectedMember.full_name}'s balance`,
      });
      
      setIsAdjustDialogOpen(false);
      setAdjustmentAmount('');
      setAdjustmentReason('');
      setSelectedMember(null);
      onRefresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to adjust balance';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleContributionAmountChange = async () => {
    if (!selectedMember || !newDailyAmount) return;
    
    setIsLoading(true);
    try {
      const amount = parseFloat(newDailyAmount);
      if (isNaN(amount) || amount <= 0) {
        throw new Error('Please enter a valid amount');
      }

      const { error } = await supabase
        .from('profiles')
        .update({ daily_contribution_amount: amount })
        .eq('user_id', selectedMember.user_id);

      if (error) throw error;

      toast({
        title: 'Contribution amount updated',
        description: `${selectedMember.full_name}'s daily contribution is now KES ${amount.toLocaleString()}`,
      });
      
      setIsContribDialogOpen(false);
      setNewDailyAmount('');
      setSelectedMember(null);
      onRefresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update contribution amount';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const openAdjustDialog = (member: Member, type: 'add' | 'deduct') => {
    setSelectedMember(member);
    setAdjustmentType(type);
    setIsAdjustDialogOpen(true);
  };

  const openContribDialog = (member: Member) => {
    setSelectedMember(member);
    setNewDailyAmount(member.daily_contribution_amount.toString());
    setIsContribDialogOpen(true);
  };

  return (
    <div className="bg-card rounded-2xl p-5 shadow-sm border border-border">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Users className="w-4 h-4 text-primary" />
          </div>
          <h3 className="font-semibold text-foreground">Member Management</h3>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => handleToggleAllVisibility(true)} className="rounded-lg">
            <Eye className="w-4 h-4 mr-1" />
            Show
          </Button>
          <Button size="sm" variant="outline" onClick={() => handleToggleAllVisibility(false)} className="rounded-lg">
            <EyeOff className="w-4 h-4 mr-1" />
            Hide
          </Button>
        </div>
      </div>
      
      {members.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-16 h-16 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
            <Users className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground text-sm">No members yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {members.map((member) => {
            const effectiveBalance = member.total_contributions + (member.balance_adjustment || 0);
            return (
              <div key={member.id} className="flex items-center gap-3 p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border-2 border-primary/20 flex-shrink-0">
                  <span className="text-primary font-bold">
                    {member.full_name?.charAt(0) || 'M'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-foreground truncate">{member.full_name}</p>
                    <button onClick={() => handleToggleVisibility(member)} className="p-1 rounded hover:bg-muted">
                      {member.balance_visible ? <Eye className="w-3 h-3 text-primary" /> : <EyeOff className="w-3 h-3 text-muted-foreground" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">{member.phone_number || 'No phone'}</p>
                  <p className="text-sm font-bold text-primary mt-1">KES {effectiveBalance.toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openAdjustDialog(member, 'add')} className="rounded-full h-8 w-8">
                    <Plus className="w-4 h-4 text-primary" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => openAdjustDialog(member, 'deduct')} className="rounded-full h-8 w-8">
                    <Minus className="w-4 h-4 text-destructive" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => openContribDialog(member)} className="rounded-full h-8 w-8">
                    <Settings className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Balance Adjustment Dialog */}
      <Dialog open={isAdjustDialogOpen} onOpenChange={setIsAdjustDialogOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>
              {adjustmentType === 'add' ? 'Add to' : 'Deduct from'} Balance
            </DialogTitle>
            <DialogDescription>
              {adjustmentType === 'add' ? 'Add funds to' : 'Deduct funds from'} {selectedMember?.full_name}'s account
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="adjustAmount">Amount (KES)</Label>
              <Input
                id="adjustAmount"
                type="number"
                placeholder="Enter amount"
                value={adjustmentAmount}
                onChange={(e) => setAdjustmentAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="adjustReason">Reason (optional)</Label>
              <Input
                id="adjustReason"
                placeholder="Enter reason for adjustment"
                value={adjustmentReason}
                onChange={(e) => setAdjustmentReason(e.target.value)}
              />
            </div>
            <Button 
              onClick={handleBalanceAdjustment} 
              disabled={isLoading || !adjustmentAmount} 
              className="w-full"
            >
              {isLoading ? 'Processing...' : `${adjustmentType === 'add' ? 'Add' : 'Deduct'} Amount`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Contribution Amount Dialog */}
      <Dialog open={isContribDialogOpen} onOpenChange={setIsContribDialogOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Adjust Daily Contribution</DialogTitle>
            <DialogDescription>
              Set the daily contribution target for {selectedMember?.full_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="dailyAmount">Daily Amount (KES)</Label>
              <Input
                id="dailyAmount"
                type="number"
                placeholder="Enter daily amount"
                value={newDailyAmount}
                onChange={(e) => setNewDailyAmount(e.target.value)}
              />
            </div>
            <Button 
              onClick={handleContributionAmountChange} 
              disabled={isLoading || !newDailyAmount} 
              className="w-full"
            >
              {isLoading ? 'Updating...' : 'Update Daily Amount'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
