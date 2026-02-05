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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
       {/* Header */}
       <header className="sticky top-0 z-10 bg-card/80 backdrop-blur-xl border-b border-border/50 shadow-sm">
         <div className="max-w-2xl mx-auto px-4 py-5">
           <div className="flex items-center justify-between">
             <div className="flex items-center gap-3">
               <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border border-primary/30 flex items-center justify-center shadow-sm">
                 <span className="text-primary font-bold text-xl">
                   {profile?.full_name?.charAt(0) || 'M'}
                 </span>
               </div>
               <div>
                 <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Welcome Back</p>
                 <p className="font-bold text-foreground text-base mt-0.5">{profile?.full_name || 'Member'}</p>
               </div>
             </div>
             <div className="flex items-center gap-2">
               {unreadMessages.length > 0 && (
                 <div className="relative">
                   <button className="p-2.5 rounded-full bg-primary/10 hover:bg-primary/20 transition-all duration-200 text-primary">
                     <Bell className="w-5 h-5" />
                   </button>
                   <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center font-bold shadow-md">
                     {unreadMessages.length}
                   </span>
                 </div>
               )}
               <Button variant="ghost" size="icon" onClick={handleSignOut} className="rounded-full hover:bg-destructive/10 hover:text-destructive transition-all duration-200">
                 <LogOut className="w-5 h-5" />
               </Button>
             </div>
           </div>

           {/* Premium Balance Card */}
           <div className="mt-6 bg-gradient-to-br from-primary via-primary/90 to-primary/70 rounded-3xl p-6 text-primary-foreground shadow-2xl border border-primary/30 backdrop-blur-sm overflow-hidden relative">
             {/* Decorative elements */}
             <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl" />
             <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full -ml-16 -mb-16 blur-3xl" />
             
             <div className="relative z-10">
               <div className="flex items-center justify-between mb-6">
                 <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center backdrop-blur">
                     <Wallet className="w-5 h-5" />
                   </div>
                   <span className="font-semibold text-sm opacity-95">Your Wallet</span>
                 </div>
                 <button 
                   onClick={() => profile?.balance_visible && setShowBalance(!showBalance)}
                   className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 transition-all duration-200 backdrop-blur"
                 >
                   {showBalance && profile?.balance_visible ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                 </button>
               </div>
               
               {profile?.balance_visible ? (
                 <div>
                   <p className="text-xs font-medium text-white/70 mb-1">Available Balance</p>
                   <p className="text-5xl font-black tracking-tight mb-2">
                     {showBalance ? `KES ${effectiveBalance.toLocaleString()}` : '• • • • •'}
                   </p>
                 </div>
               ) : (
                 <div>
                   <p className="text-sm font-semibold opacity-80">Balance Hidden</p>
                   <p className="text-sm text-white/70 mt-1">Visible at end of cycle</p>
                 </div>
               )}

               <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-white/20">
                 <div>
                   <p className="text-xs font-medium text-white/70 mb-1">This Month</p>
                   <p className="text-lg font-bold">KES {thisMonthContributions.reduce((sum, c) => sum + Number(c.amount), 0).toLocaleString()}</p>
                 </div>
                 <div>
                   <p className="text-xs font-medium text-white/70 mb-1">Daily Target</p>
                   <p className="text-lg font-bold">KES {dailyAmount.toLocaleString()}</p>
                 </div>
               </div>
             </div>
           </div>
         </div>
       </header>
 
<main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
         {/* Primary Action Buttons */}
         <div className="grid grid-cols-2 gap-4">
           <button 
             onClick={handleAddContribution}
             className="group relative h-20 bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary/30 rounded-2xl p-4 hover:from-primary/20 hover:to-primary/10 hover:border-primary/50 transition-all duration-300 overflow-hidden"
           >
             <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/10 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
             <div className="relative flex items-center gap-3">
               <div className="w-10 h-10 rounded-xl bg-primary/20 group-hover:bg-primary/30 transition-all duration-300 flex items-center justify-center">
                 <Plus className="w-5 h-5 text-primary" />
               </div>
               <div className="text-left">
                 <p className="font-bold text-foreground text-sm">Add Today</p>
                 <p className="text-xs text-muted-foreground">KES {dailyAmount.toLocaleString()}</p>
               </div>
             </div>
           </button>
           <button 
             className="group relative h-20 bg-gradient-to-br from-accent/10 to-accent/5 border-2 border-accent/30 rounded-2xl p-4 hover:from-accent/20 hover:to-accent/10 hover:border-accent/50 transition-all duration-300 overflow-hidden"
           >
             <div className="absolute inset-0 bg-gradient-to-r from-accent/0 via-accent/10 to-accent/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
             <div className="relative flex items-center gap-3">
               <div className="w-10 h-10 rounded-xl bg-accent/20 group-hover:bg-accent/30 transition-all duration-300 flex items-center justify-center">
                 <History className="w-5 h-5 text-accent" />
               </div>
               <div className="text-left">
                 <p className="font-bold text-foreground text-sm">History</p>
                 <p className="text-xs text-muted-foreground">{contributions.length} entries</p>
               </div>
             </div>
           </button>
         </div>

         {/* Alert Messages */}
         {unreadMessages.length > 0 && (
           <div className="space-y-3">
             {unreadMessages.map(message => (
               <div 
                 key={message.id}
                 onClick={() => handleMarkMessageRead(message.id)}
                 className={`group flex items-start gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all duration-300 ${
                   message.message_type === 'warning' 
                     ? 'border-warning/30 bg-gradient-to-r from-warning/10 to-warning/5 hover:from-warning/15 hover:to-warning/10 hover:border-warning/50' 
                     : 'border-primary/30 bg-gradient-to-r from-primary/10 to-primary/5 hover:from-primary/15 hover:to-primary/10 hover:border-primary/50'
                 }`}
               >
                 <div className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 ${
                   message.message_type === 'warning' ? 'bg-warning/20' : 'bg-primary/20'
                 }`}>
                   {getMessageIcon(message.message_type)}
                 </div>
                 <div className="flex-1 min-w-0">
                   <p className="font-semibold text-foreground text-sm mb-1">{message.message}</p>
                   <p className="text-xs text-muted-foreground">{format(parseISO(message.created_at), 'MMM d, HH:mm')}</p>
                 </div>
                 <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:translate-x-1 transition-transform duration-300" />
               </div>
             ))}
           </div>
         )}

         {/* Stats Grid */}
         <div className="grid grid-cols-3 gap-4">
           <div className="bg-card border border-border/50 rounded-2xl p-4 hover:border-primary/50 transition-all duration-300 group">
             <div className="w-9 h-9 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors duration-300 flex items-center justify-center mb-3">
               <CheckCircle2 className="w-5 h-5 text-primary" />
             </div>
             <p className="text-3xl font-bold text-foreground">{thisMonthContributions.length}</p>
             <p className="text-xs font-medium text-muted-foreground mt-1.5 uppercase tracking-wide">This Month</p>
           </div>
           <div className="bg-card border border-border/50 rounded-2xl p-4 hover:border-accent/50 transition-all duration-300 group">
             <div className="w-9 h-9 rounded-lg bg-accent/20 group-hover:bg-accent/30 transition-colors duration-300 flex items-center justify-center mb-3">
               <Wallet className="w-5 h-5 text-accent" />
             </div>
             <p className="text-3xl font-bold text-foreground">KES {dailyAmount}</p>
             <p className="text-xs font-medium text-muted-foreground mt-1.5 uppercase tracking-wide">Daily</p>
           </div>
           <div className="bg-card border border-border/50 rounded-2xl p-4 hover:border-warning/50 transition-all duration-300 group">
             <div className="w-9 h-9 rounded-lg bg-warning/10 group-hover:bg-warning/20 transition-colors duration-300 flex items-center justify-center mb-3">
               <Clock className="w-5 h-5 text-warning" />
             </div>
             <p className="text-3xl font-bold text-foreground">{missedDays}</p>
             <p className="text-xs font-medium text-muted-foreground mt-1.5 uppercase tracking-wide">Pending</p>
           </div>
         </div>

         {/* Missed Days Alert */}
         {missedDays > 0 && (
           <div className="bg-gradient-to-r from-warning/20 via-warning/10 to-warning/5 border-2 border-warning/30 rounded-2xl p-5 flex items-start gap-4 hover:border-warning/50 transition-all duration-300">
             <div className="w-12 h-12 rounded-full bg-warning/20 flex items-center justify-center flex-shrink-0">
               <AlertCircle className="w-6 h-6 text-warning" />
             </div>
             <div className="flex-1">
               <p className="font-bold text-foreground mb-1">Catch Up Missing Contributions</p>
               <p className="text-sm text-muted-foreground">You have <span className="font-semibold text-warning">{missedDays}</span> day{missedDays > 1 ? 's' : ''} to catch up on. Click past dates in the calendar below.</p>
             </div>
           </div>
         )}

         {/* Calendar View */}
         <div className="bg-card border border-border/50 rounded-3xl p-6 hover:border-primary/50 transition-all duration-300 shadow-sm">
           <div className="flex items-center justify-between mb-6">
             <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                 <Calendar className="w-5 h-5 text-primary" />
               </div>
               <div>
                 <p className="font-bold text-foreground text-lg">{format(currentMonth, 'MMMM')}</p>
                 <p className="text-xs text-muted-foreground">{format(currentMonth, 'yyyy')}</p>
               </div>
             </div>
           </div>
           <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-muted-foreground mb-3">
             {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => (
               <div key={i} className="py-2">{day}</div>
             ))}
           </div>
           <div className="grid grid-cols-7 gap-2">
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
                   className={`aspect-square rounded-xl flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                     contributed 
                       ? 'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-md hover:shadow-lg' 
                       : isToday 
                         ? 'bg-gradient-to-br from-accent to-accent/80 text-accent-foreground ring-2 ring-accent/50 font-bold' 
                         : isFuture
                           ? 'bg-muted/40 text-muted-foreground/40 cursor-not-allowed'
                           : 'bg-gradient-to-br from-muted/80 to-muted/60 text-muted-foreground hover:from-primary/10 hover:to-primary/5 hover:text-primary cursor-pointer border border-transparent hover:border-primary/30'
                   }`}
                 >
                   {format(day, 'd')}
                 </button>
               );
             })}
           </div>
           <p className="text-xs text-muted-foreground mt-5 text-center font-medium">Click any past date to add contribution</p>
         </div>

         {/* Recent Activity */}
         <div className="bg-card border border-border/50 rounded-3xl p-6 hover:border-primary/50 transition-all duration-300 shadow-sm">
           <div className="flex items-center justify-between mb-6">
             <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                 <TrendingUp className="w-5 h-5 text-accent" />
               </div>
               <h3 className="font-bold text-foreground text-lg">Recent Activity</h3>
             </div>
             {contributions.length > 0 && <button className="text-xs font-bold text-primary hover:opacity-80 transition-opacity">View All</button>}
           </div>
           {contributions.length === 0 ? (
             <div className="text-center py-12">
               <div className="w-16 h-16 rounded-full bg-gradient-to-br from-muted/50 to-muted/30 mx-auto mb-4 flex items-center justify-center">
                 <Wallet className="w-8 h-8 text-muted-foreground/50" />
               </div>
               <p className="font-semibold text-foreground">No contributions yet</p>
               <p className="text-sm text-muted-foreground mt-2">Start your savings journey by making your first contribution</p>
             </div>
           ) : (
             <div className="space-y-3">
               {contributions.slice(0, 5).map((contribution) => (
                 <div key={contribution.id} className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-card via-card to-muted/20 border border-border/50 hover:border-primary/30 transition-all duration-300 group">
                   <div className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 ${
                     contribution.status === 'completed' ? 'bg-primary/20' : 'bg-warning/20'
                   }`}>
                     {contribution.status === 'completed' ? <CheckCircle2 className="w-5 h-5 text-primary" /> : <Clock className="w-5 h-5 text-warning" />}
                   </div>
                   <div className="flex-1 min-w-0">
                     <p className="font-semibold text-foreground text-sm">{contribution.notes || 'Daily Contribution'}</p>
                     <p className="text-xs text-muted-foreground mt-1">{format(parseISO(contribution.contribution_date), 'MMM d, yyyy')}</p>
                   </div>
                   <div className="text-right">
                     <span className="font-bold text-primary text-base">+KES {Number(contribution.amount).toLocaleString()}</span>
                   </div>
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