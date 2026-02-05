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
    <div className="min-h-screen bg-white">
       {/* Header */}
       <header className="sticky top-0 z-10 bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md">
         <div className="max-w-6xl mx-auto px-6 py-6">
           <div className="flex items-center justify-between">
             <div className="flex items-center gap-4">
               <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center border-2 border-white/30">
                 <span className="font-bold text-lg">
                   {profile?.full_name?.charAt(0) || 'H'}
                 </span>
               </div>
               <div>
                 <p className="text-sm font-medium text-blue-100">Welcome back,</p>
                 <p className="font-bold text-lg">{profile?.full_name || 'Member'}</p>
               </div>
             </div>
             <div className="flex items-center gap-3">
               {unreadMessages.length > 0 && (
                 <div className="relative">
                   <button className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-all duration-200">
                     <Bell className="w-5 h-5" />
                   </button>
                   <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-xs rounded-full flex items-center justify-center font-bold">
                     {unreadMessages.length}
                   </span>
                 </div>
               )}
               <button onClick={handleSignOut} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-all duration-200">
                 <LogOut className="w-5 h-5" />
               </button>
             </div>
           </div>
         </div>
       </header>
 
<main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
         {/* Quick Stats Row */}
         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
           <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
             <div className="flex items-center justify-between mb-3">
               <p className="text-sm text-gray-600 font-medium">Contributions This Month</p>
               <CheckCircle2 className="w-5 h-5 text-blue-600" />
             </div>
             <p className="text-3xl font-bold text-gray-900">{thisMonthContributions.length}</p>
             <p className="text-xs text-gray-500 mt-2">KES {thisMonthContributions.reduce((sum, c) => sum + Number(c.amount), 0).toLocaleString()}</p>
           </div>

           <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
             <div className="flex items-center justify-between mb-3">
               <p className="text-sm text-gray-600 font-medium">Daily Target</p>
               <Wallet className="w-5 h-5 text-teal-600" />
             </div>
             <p className="text-3xl font-bold text-gray-900">KES {dailyAmount.toLocaleString()}</p>
             <p className="text-xs text-gray-500 mt-2">Next contribution</p>
           </div>

           <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
             <div className="flex items-center justify-between mb-3">
               <p className="text-sm text-gray-600 font-medium">Pending</p>
               <Clock className="w-5 h-5 text-amber-600" />
             </div>
             <p className="text-3xl font-bold text-gray-900">{missedDays}</p>
             <p className="text-xs text-gray-500 mt-2">Days to catch up</p>
           </div>
         </div>

         {/* Action Buttons */}
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           <button 
             onClick={handleAddContribution}
             className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg p-6 font-semibold flex items-center justify-center gap-2 transition-colors duration-200 shadow-sm hover:shadow-md"
           >
             <Plus className="w-5 h-5" />
             Add Today's Contribution
           </button>
           <button 
             className="bg-teal-100 hover:bg-teal-200 text-teal-900 rounded-lg p-6 font-semibold flex items-center justify-center gap-2 transition-colors duration-200"
           >
             <History className="w-5 h-5" />
             View History ({contributions.length})
           </button>
         </div>

         {/* Admin Messages */}
         {unreadMessages.length > 0 && (
           <div className="space-y-3">
             <h3 className="font-bold text-gray-900 text-lg">Messages from Admin</h3>
             {unreadMessages.map(message => (
               <div 
                 key={message.id}
                 onClick={() => handleMarkMessageRead(message.id)}
                 className={`bg-white border-l-4 rounded-lg p-5 cursor-pointer hover:shadow-md transition-all ${
                   message.message_type === 'warning' 
                     ? 'border-l-amber-500 bg-amber-50' 
                     : 'border-l-blue-500 bg-blue-50'
                 }`}
               >
                 <div className="flex items-start justify-between">
                   <div className="flex items-start gap-3 flex-1">
                     <div className={`p-2 rounded-lg ${
                       message.message_type === 'warning' ? 'bg-amber-200' : 'bg-blue-200'
                     }`}>
                       {getMessageIcon(message.message_type)}
                     </div>
                     <div>
                       <p className="font-semibold text-gray-900">{message.message}</p>
                       <p className="text-xs text-gray-500 mt-1">{format(parseISO(message.created_at), 'MMM d, HH:mm')}</p>
                     </div>
                   </div>
                   <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                 </div>
               </div>
             ))}
           </div>
         )}

         {/* Missed Days Alert */}
         {missedDays > 0 && (
           <div className="bg-amber-50 border border-amber-200 rounded-lg p-5 flex items-start gap-4">
             <div className="p-2 rounded-lg bg-amber-200">
               <AlertCircle className="w-5 h-5 text-amber-800" />
             </div>
             <div>
               <p className="font-semibold text-amber-900">Catch Up on Your Contributions</p>
               <p className="text-sm text-amber-800 mt-1">You have <span className="font-bold">{missedDays}</span> day{missedDays > 1 ? 's' : ''} to catch up. Click past dates in the calendar to add them.</p>
             </div>
           </div>
         )}

         {/* Calendar Section */}
         <div className="bg-white border border-gray-200 rounded-lg p-6">
           <div className="flex items-center justify-between mb-6">
             <h3 className="font-bold text-lg text-gray-900">Contribution Calendar</h3>
             <p className="text-sm text-gray-500">{format(currentMonth, 'MMMM yyyy')}</p>
           </div>
           
           <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-gray-600 mb-4">
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
                   className={`aspect-square rounded-lg flex items-center justify-center text-sm font-bold transition-all ${
                     contributed 
                       ? 'bg-blue-600 text-white shadow-sm' 
                       : isToday 
                         ? 'bg-teal-200 text-teal-900 border-2 border-teal-600 font-bold' 
                         : isFuture
                           ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                           : 'bg-gray-50 text-gray-600 hover:bg-blue-100 hover:text-blue-900 cursor-pointer border border-gray-200'
                   }`}
                 >
                   {format(day, 'd')}
                 </button>
               );
             })}
           </div>
           <p className="text-xs text-gray-500 mt-5 text-center font-medium">Click any past date to add contribution</p>
         </div>

         {/* Recent Activity */}
         <div className="bg-white border border-gray-200 rounded-lg p-6">
           <h3 className="font-bold text-lg text-gray-900 mb-5">Recent Activity</h3>
           {contributions.length === 0 ? (
             <div className="text-center py-10">
               <div className="w-14 h-14 rounded-full bg-gray-100 mx-auto mb-3 flex items-center justify-center">
                 <Wallet className="w-6 h-6 text-gray-400" />
               </div>
               <p className="font-semibold text-gray-700">No contributions yet</p>
               <p className="text-sm text-gray-500 mt-1">Start your savings journey today</p>
             </div>
           ) : (
             <div className="space-y-3">
               {contributions.slice(0, 8).map((contribution) => (
                 <div key={contribution.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                   <div className="flex items-center gap-3">
                     <div className={`p-2 rounded-lg ${
                       contribution.status === 'completed' ? 'bg-blue-100' : 'bg-amber-100'
                     }`}>
                       {contribution.status === 'completed' ? <CheckCircle2 className="w-4 h-4 text-blue-600" /> : <Clock className="w-4 h-4 text-amber-600" />}
                     </div>
                     <div>
                       <p className="font-semibold text-gray-900 text-sm">{contribution.notes || 'Daily Contribution'}</p>
                       <p className="text-xs text-gray-500">{format(parseISO(contribution.contribution_date), 'MMM d, yyyy')}</p>
                     </div>
                   </div>
                   <span className="font-bold text-blue-600">+KES {Number(contribution.amount).toLocaleString()}</span>
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