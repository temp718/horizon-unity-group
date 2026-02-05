 import { useEffect, useState } from 'react';
 import { useNavigate } from 'react-router-dom';
 import { supabase } from '@/integrations/supabase/client';
 import { useAuth } from '@/lib/auth';
 import { Button } from '@/components/ui/button';
 import { 
   TrendingUp, 
   Calendar, 
   LogOut, 
   Plus,
   CheckCircle2,
   Clock,
   Wallet,
   EyeOff,
   Bell,
   AlertCircle,
   Info,
   Eye,
   History,
   Target,
   ChevronRight,
   Sparkles
 } from 'lucide-react';
 import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO, differenceInDays, startOfDay } from 'date-fns';
 import { useToast } from '@/hooks/use-toast';
 import logo from '@/assets/logo.png';
 
 interface Contribution {
   id: string;
   amount: number;
   contribution_date: string;
   status: string;
   notes: string | null;
   created_at: string;
 }
 
 interface Profile {
   full_name: string;
   phone_number: string | null;
   balance_visible: boolean;
   daily_contribution_amount: number;
   balance_adjustment: number;
   missed_contributions: number;
 }
 
 interface AdminMessage {
   id: string;
   message: string;
   message_type: string;
   is_read: boolean;
   created_at: string;
 }
 
 export default function UserDashboard() {
   const { user, signOut, isAdmin, isLoading: authLoading } = useAuth();
   const [contributions, setContributions] = useState<Contribution[]>([]);
   const [profile, setProfile] = useState<Profile | null>(null);
   const [messages, setMessages] = useState<AdminMessage[]>([]);
   const [isLoading, setIsLoading] = useState(true);
   const [currentMonth, setCurrentMonth] = useState(new Date());
   const [selectedDate, setSelectedDate] = useState<Date | null>(null);
   const [showBalance, setShowBalance] = useState(false);
   const navigate = useNavigate();
   const { toast } = useToast();
 
   useEffect(() => {
     if (!authLoading && !user) {
       navigate('/login');
     } else if (user && !authLoading) {
       if (isAdmin) {
         navigate('/admin/dashboard', { replace: true });
         return;
       }
       fetchData();
     }
   }, [user, isAdmin, authLoading, navigate]);
 
   const fetchData = async () => {
     try {
       const [contribRes, profileRes, messagesRes] = await Promise.all([
         supabase
           .from('contributions')
           .select('*')
           .eq('user_id', user!.id)
           .order('contribution_date', { ascending: false }),
         supabase
           .from('profiles')
           .select('full_name, phone_number, balance_visible, daily_contribution_amount, balance_adjustment, missed_contributions')
           .eq('user_id', user!.id)
           .single(),
         supabase
           .from('admin_messages')
           .select('*')
           .eq('user_id', user!.id)
           .order('created_at', { ascending: false })
           .limit(5)
       ]);
 
       if (contribRes.data) setContributions(contribRes.data);
       if (profileRes.data) setProfile(profileRes.data);
       if (messagesRes.data) setMessages(messagesRes.data);
     } catch (error) {
       console.error('Error fetching data:', error);
     } finally {
       setIsLoading(false);
     }
   };
 
   const calculateMissedDays = () => {
     if (contributions.length === 0) return 0;
     const today = startOfDay(new Date());
     const yesterday = startOfDay(new Date(today.getTime() - 24 * 60 * 60 * 1000));
     const contributionDates = contributions.map(c => startOfDay(parseISO(c.contribution_date)));
     const earliestContrib = contributionDates[contributionDates.length - 1];
     const totalDays = Math.max(0, differenceInDays(yesterday, earliestContrib) + 1);
     const contributedDays = contributions.length;
     return Math.max(0, totalDays - contributedDays);
   };
 
   const handleAddContribution = async () => {
     try {
       const today = format(new Date(), 'yyyy-MM-dd');
       const existingToday = contributions.find(c => c.contribution_date === today);
       
       if (existingToday) {
         toast({ title: 'Already contributed', description: 'You have already made a contribution today.', variant: 'destructive' });
         return;
       }
 
       const dailyAmount = profile?.daily_contribution_amount || 100;
 
       const { error } = await supabase
         .from('contributions')
         .insert({ user_id: user!.id, amount: dailyAmount, contribution_date: today, status: 'completed', notes: null });
 
       if (error) throw error;
 
       toast({ title: 'Contribution added!', description: `KES ${dailyAmount.toLocaleString()} has been recorded for today.` });
       fetchData();
     } catch (error) {
       const message = error instanceof Error ? error.message : 'Failed to add contribution';
       toast({ title: 'Error', description: message, variant: 'destructive' });
     }
   };
 
   const handleAddContributionForDate = async (date: Date) => {
     try {
       const dateStr = format(date, 'yyyy-MM-dd');
       const today = format(new Date(), 'yyyy-MM-dd');
       const existingContrib = contributions.find(c => c.contribution_date === dateStr);
       
       if (existingContrib) {
         toast({ title: 'Already contributed', description: `You have already made a contribution for ${format(date, 'MMM d, yyyy')}.`, variant: 'destructive' });
         return;
       }
 
       if (dateStr > today) {
         toast({ title: 'Invalid date', description: 'You cannot contribute for future dates.', variant: 'destructive' });
         return;
       }
 
       const dailyAmount = profile?.daily_contribution_amount || 100;
 
       const { error } = await supabase
         .from('contributions')
         .insert({ user_id: user!.id, amount: dailyAmount, contribution_date: dateStr, status: 'completed', notes: null });
 
       if (error) throw error;
 
       toast({ title: 'Contribution added!', description: `KES ${dailyAmount.toLocaleString()} recorded for ${format(date, 'MMM d, yyyy')}.` });
       setSelectedDate(null);
       fetchData();
     } catch (error) {
       const message = error instanceof Error ? error.message : 'Failed to add contribution';
       toast({ title: 'Error', description: message, variant: 'destructive' });
     }
   };
 
   const handleMarkMessageRead = async (messageId: string) => {
     try {
       await supabase.from('admin_messages').update({ is_read: true }).eq('id', messageId);
       setMessages(prev => prev.map(m => m.id === messageId ? { ...m, is_read: true } : m));
     } catch (error) {
       console.error('Error marking message as read:', error);
     }
   };
 
   const handleSignOut = async () => {
     await signOut();
     navigate('/login');
   };
 
   const totalContributions = contributions.reduce((sum, c) => sum + Number(c.amount), 0);
   const effectiveBalance = totalContributions + (profile?.balance_adjustment || 0);
   const thisMonthContributions = contributions.filter(c => {
     const date = parseISO(c.contribution_date);
     return date >= startOfMonth(currentMonth) && date <= endOfMonth(currentMonth);
   });
 
   const daysInMonth = eachDayOfInterval({
     start: startOfMonth(currentMonth),
     end: endOfMonth(currentMonth)
   });
 
   const hasContributedOnDay = (day: Date) => contributions.some(c => isSameDay(parseISO(c.contribution_date), day));
   const missedDays = calculateMissedDays();
   const dailyAmount = profile?.daily_contribution_amount || 100;
   const unreadMessages = messages.filter(m => !m.is_read);
 
   const getMessageIcon = (type: string) => {
     switch (type) {
       case 'warning': return <AlertCircle className="w-4 h-4 text-warning" />;
       case 'announcement': return <Bell className="w-4 h-4 text-primary" />;
       default: return <Info className="w-4 h-4 text-muted-foreground" />;
     }
   };
 
   if (authLoading || isLoading) {
     return (
       <div className="min-h-screen bg-background flex items-center justify-center">
         <div className="animate-pulse text-muted-foreground">Loading...</div>
       </div>
     );
   }
 
   return (
     <div className="min-h-screen bg-muted/30">
       {/* Header */}
       <header className="bg-card px-4 py-5 rounded-b-3xl shadow-sm">
         <div className="max-w-lg mx-auto">
           <div className="flex items-center justify-between mb-6">
             <div className="flex items-center gap-3">
               <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border-2 border-primary/20">
                 <span className="text-primary font-bold text-lg">
                   {profile?.full_name?.charAt(0) || 'M'}
                 </span>
               </div>
               <div>
                 <p className="text-muted-foreground text-sm">Hello,</p>
                 <p className="font-semibold text-foreground text-lg">{profile?.full_name || 'Member'}</p>
               </div>
             </div>
             <div className="flex items-center gap-2">
               {unreadMessages.length > 0 && (
                 <div className="relative">
                   <Bell className="w-5 h-5 text-muted-foreground" />
                   <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
                     {unreadMessages.length}
                   </span>
                 </div>
               )}
               <Button variant="ghost" size="icon" onClick={handleSignOut} className="rounded-full">
                 <LogOut className="w-5 h-5" />
               </Button>
             </div>
           </div>
 
           {/* Balance Card */}
           <div className="bg-gradient-to-br from-primary to-primary/80 rounded-2xl p-5 text-primary-foreground shadow-lg">
             <div className="flex items-center justify-between mb-4">
               <div className="flex items-center gap-2">
                 <img src={logo} alt="Horizon Unit" className="w-6 h-6 object-contain brightness-0 invert" />
                 <span className="font-medium text-sm opacity-90">Wallet Balance</span>
               </div>
               <button 
                 onClick={() => profile?.balance_visible && setShowBalance(!showBalance)}
                 className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
               >
                 {showBalance && profile?.balance_visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
               </button>
             </div>
             
             {profile?.balance_visible ? (
               <p className="text-4xl font-bold tracking-tight">
                 {showBalance ? `KES ${effectiveBalance.toLocaleString()}.00` : 'KES ******'}
               </p>
             ) : (
               <div>
                 <p className="text-2xl font-bold opacity-70">Balance Hidden</p>
                 <p className="text-xs opacity-60 mt-1">Visible at end of cycle</p>
               </div>
             )}
 
             <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/20">
               <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                 <Sparkles className="w-4 h-4" />
               </div>
               <div>
                 <p className="text-xs opacity-70">Horizon Unit</p>
                 <p className="text-sm font-medium">@{profile?.full_name?.toLowerCase().replace(/\s+/g, '') || 'member'}</p>
               </div>
             </div>
           </div>
         </div>
       </header>
 
       <main className="max-w-lg mx-auto px-4 py-6 space-y-5">
         {/* Action Buttons */}
         <div className="flex gap-3">
           <Button onClick={handleAddContribution} className="flex-1 h-14 rounded-xl text-base font-semibold shadow-md hover:shadow-lg transition-all">
             <Plus className="w-5 h-5 mr-2" />
             Deposit
           </Button>
           <Button variant="outline" className="flex-1 h-14 rounded-xl text-base font-semibold border-2">
             <History className="w-5 h-5 mr-2" />
             History
           </Button>
         </div>
 
         {/* Admin Messages */}
         {unreadMessages.length > 0 && (
           <div className="space-y-2">
             {unreadMessages.map(message => (
               <div 
                 key={message.id}
                 onClick={() => handleMarkMessageRead(message.id)}
                 className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-all hover:shadow-sm ${
                   message.message_type === 'warning' ? 'border-warning/50 bg-warning/5' : 'border-primary/30 bg-primary/5'
                 }`}
               >
                 <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                   message.message_type === 'warning' ? 'bg-warning/10' : 'bg-primary/10'
                 }`}>
                   {getMessageIcon(message.message_type)}
                 </div>
                 <div className="flex-1">
                   <p className="text-sm font-medium">{message.message}</p>
                   <p className="text-xs text-muted-foreground mt-1">{format(parseISO(message.created_at), 'MMM d, HH:mm')}</p>
                 </div>
               </div>
             ))}
           </div>
         )}
 
         {/* Quick Actions Grid */}
         <div className="bg-card rounded-2xl p-5 shadow-sm border border-border">
           <div className="flex items-center justify-between mb-4">
             <h3 className="font-semibold text-foreground">Quick Actions</h3>
             <span className="text-xs text-muted-foreground">View</span>
           </div>
           <div className="grid grid-cols-4 gap-4">
             <button onClick={handleAddContribution} className="flex flex-col items-center gap-2 group">
               <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                 <Plus className="w-6 h-6 text-primary" />
               </div>
               <span className="text-xs font-medium text-muted-foreground">Add Today</span>
             </button>
             <button className="flex flex-col items-center gap-2 group">
               <div className="w-14 h-14 rounded-2xl bg-accent flex items-center justify-center group-hover:bg-accent/80 transition-colors">
                 <Target className="w-6 h-6 text-accent-foreground" />
               </div>
               <span className="text-xs font-medium text-muted-foreground">Target</span>
             </button>
             <button className="flex flex-col items-center gap-2 group">
               <div className="w-14 h-14 rounded-2xl bg-info/10 flex items-center justify-center group-hover:bg-info/20 transition-colors">
                 <Calendar className="w-6 h-6 text-info" />
               </div>
               <span className="text-xs font-medium text-muted-foreground">Calendar</span>
             </button>
             <button className="flex flex-col items-center gap-2 group">
               <div className="w-14 h-14 rounded-2xl bg-warning/10 flex items-center justify-center group-hover:bg-warning/20 transition-colors">
                 <TrendingUp className="w-6 h-6 text-warning" />
               </div>
               <span className="text-xs font-medium text-muted-foreground">Progress</span>
             </button>
           </div>
         </div>
 
         {/* Missed Days Alert */}
         {missedDays > 0 && (
           <div className="bg-info/10 border border-info/30 rounded-2xl p-4 flex items-center gap-4">
             <div className="w-12 h-12 rounded-full bg-info/20 flex items-center justify-center flex-shrink-0">
               <Info className="w-6 h-6 text-info" />
             </div>
             <div className="flex-1">
               <p className="font-semibold text-foreground">Catch Up</p>
               <p className="text-sm text-muted-foreground">{missedDays} day{missedDays > 1 ? 's' : ''} pending</p>
             </div>
             <ChevronRight className="w-5 h-5 text-muted-foreground" />
           </div>
         )}
 
         {/* Monthly Stats */}
         <div className="grid grid-cols-2 gap-3">
           <div className="bg-card rounded-2xl p-4 shadow-sm border border-border">
             <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
               <CheckCircle2 className="w-5 h-5 text-primary" />
             </div>
             <p className="text-2xl font-bold text-foreground">{thisMonthContributions.length}</p>
             <p className="text-xs text-muted-foreground mt-1">This Month</p>
           </div>
           <div className="bg-card rounded-2xl p-4 shadow-sm border border-border">
             <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center mb-3">
               <Wallet className="w-5 h-5 text-accent-foreground" />
             </div>
             <p className="text-2xl font-bold text-foreground">KES {dailyAmount}</p>
             <p className="text-xs text-muted-foreground mt-1">Daily Target</p>
           </div>
         </div>
 
         {/* Calendar View */}
         <div className="bg-card rounded-2xl p-5 shadow-sm border border-border">
           <div className="flex items-center justify-between mb-4">
             <div className="flex items-center gap-2">
               <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                 <Calendar className="w-4 h-4 text-primary" />
               </div>
               <span className="font-semibold text-foreground">{format(currentMonth, 'MMMM yyyy')}</span>
             </div>
           </div>
           <div className="grid grid-cols-7 gap-1.5 text-center text-xs mb-2">
             {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
               <div key={i} className="text-muted-foreground font-medium py-1">{day}</div>
             ))}
           </div>
           <div className="grid grid-cols-7 gap-1.5">
             {Array.from({ length: startOfMonth(currentMonth).getDay() }).map((_, i) => (
               <div key={`empty-${i}`} className="aspect-square" />
             ))}
             {daysInMonth.map((day) => {
               const contributed = hasContributedOnDay(day);
               const isToday = isSameDay(day, new Date());
               const isFuture = day > startOfDay(new Date());
               return (
                 <button
                   key={day.toISOString()}
                   onClick={() => !contributed && !isFuture && setSelectedDate(day)}
                   disabled={isFuture}
                   className={`aspect-square rounded-xl flex items-center justify-center text-sm font-medium transition-all ${
                     contributed 
                       ? 'bg-primary text-primary-foreground shadow-sm' 
                       : isToday 
                         ? 'bg-accent text-accent-foreground ring-2 ring-primary ring-offset-1' 
                         : isFuture
                           ? 'bg-muted/50 text-muted-foreground/50 cursor-not-allowed'
                           : 'bg-muted/80 text-muted-foreground hover:bg-primary/10 hover:text-primary cursor-pointer'
                   }`}
                 >
                   {format(day, 'd')}
                 </button>
               );
             })}
           </div>
           <p className="text-xs text-muted-foreground mt-4 text-center">Tap any past date to add contribution</p>
         </div>
 
         {/* Recent Activity */}
         <div className="bg-card rounded-2xl p-5 shadow-sm border border-border">
           <div className="flex items-center justify-between mb-4">
             <h3 className="font-semibold text-foreground">Recent Activity</h3>
             <button className="text-xs text-primary font-medium">View All</button>
           </div>
           {contributions.length === 0 ? (
             <div className="text-center py-8">
               <div className="w-16 h-16 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
                 <Wallet className="w-8 h-8 text-muted-foreground" />
               </div>
               <p className="text-muted-foreground text-sm">No contributions yet</p>
               <p className="text-muted-foreground text-xs mt-1">Start saving today!</p>
             </div>
           ) : (
             <div className="space-y-3">
               {contributions.slice(0, 3).map((contribution) => (
                 <div key={contribution.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                   <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                     contribution.status === 'completed' ? 'bg-primary/10' : 'bg-warning/10'
                   }`}>
                     {contribution.status === 'completed' ? <CheckCircle2 className="w-5 h-5 text-primary" /> : <Clock className="w-5 h-5 text-warning" />}
                   </div>
                   <div className="flex-1 min-w-0">
                     <p className="font-medium text-sm text-foreground">{contribution.notes || 'Daily Contribution'}</p>
                     <p className="text-xs text-muted-foreground">{format(parseISO(contribution.contribution_date), 'MMM d, yyyy')}</p>
                   </div>
                   <span className="font-bold text-primary">+KES {Number(contribution.amount).toLocaleString()}</span>
                 </div>
               ))}
             </div>
           )}
         </div>
       </main>
 
       {/* Contribution Date Dialog */}
       {selectedDate && (
         <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4">
           <div className="bg-card rounded-3xl p-6 w-full max-w-sm shadow-2xl">
             <div className="w-12 h-1 bg-muted rounded-full mx-auto mb-6" />
             <div className="text-center mb-6">
               <div className="w-16 h-16 rounded-full bg-primary/10 mx-auto mb-4 flex items-center justify-center">
                 <Plus className="w-8 h-8 text-primary" />
               </div>
               <h3 className="font-bold text-xl text-foreground">Add Contribution</h3>
               <p className="text-muted-foreground text-sm mt-2">{format(selectedDate, 'EEEE, MMMM d, yyyy')}</p>
             </div>
             <div className="bg-muted/50 rounded-xl p-4 mb-6 text-center">
               <p className="text-3xl font-bold text-foreground">KES {dailyAmount.toLocaleString()}</p>
               <p className="text-xs text-muted-foreground mt-1">Daily contribution amount</p>
             </div>
             <div className="flex gap-3">
               <Button variant="outline" onClick={() => setSelectedDate(null)} className="flex-1 h-12 rounded-xl font-semibold">Cancel</Button>
               <Button onClick={() => handleAddContributionForDate(selectedDate)} className="flex-1 h-12 rounded-xl font-semibold">Confirm</Button>
             </div>
           </div>
         </div>
       )}
     </div>
   );
 }