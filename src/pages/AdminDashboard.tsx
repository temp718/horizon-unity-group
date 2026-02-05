 import { useEffect, useState } from 'react';
 import { useNavigate } from 'react-router-dom';
 import { supabase } from '@/integrations/supabase/client';
 import { useAuth } from '@/lib/auth';
 import { Button } from '@/components/ui/button';
 import { LogOut, Users, TrendingUp, Calendar, MessageSquare, Settings, ChevronRight, Sparkles, BarChart3, Bell, Plus } from 'lucide-react';
 import { startOfMonth, endOfMonth, parseISO, format } from 'date-fns';
 import logo from '@/assets/logo.png';
 import StatsOverview from '@/components/admin/StatsOverview';
 import MemberManagement from '@/components/admin/MemberManagement';
 import MessageCenter from '@/components/admin/MessageCenter';
 import RecentContributions from '@/components/admin/RecentContributions';
 
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
 
 interface Contribution {
   id: string;
   amount: number;
   contribution_date: string;
   status: string;
   created_at: string;
   profiles: { full_name: string } | null;
 }
 
 export default function AdminDashboard() {
   const { user, isAdmin, signOut, isLoading: authLoading } = useAuth();
   const [members, setMembers] = useState<Member[]>([]);
   const [recentContributions, setRecentContributions] = useState<Contribution[]>([]);
   const [isLoading, setIsLoading] = useState(true);
   const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'messages'>('overview');
   const navigate = useNavigate();
 
   useEffect(() => {
     if (authLoading) return;
     if (!user) { navigate('/login'); return; }
     if (!isAdmin) { navigate('/dashboard'); }
   }, [user, isAdmin, authLoading, navigate]);
 
   useEffect(() => {
     if (user && isAdmin) fetchData();
   }, [user, isAdmin]);
 
   const fetchData = async () => {
     try {
       const { data: profilesData } = await supabase.from('profiles').select('*');
       const { data: contributionsData } = await supabase.from('contributions').select('*').order('contribution_date', { ascending: false });
 
       if (profilesData && contributionsData) {
         const nonAdminProfiles = profilesData.filter(profile => profile.user_id !== user?.id);
         const membersWithStats = nonAdminProfiles.map(profile => {
           const memberContribs = contributionsData.filter(c => c.user_id === profile.user_id);
           return {
             ...profile,
             total_contributions: memberContribs.reduce((sum, c) => sum + Number(c.amount), 0),
             contribution_count: memberContribs.length
           };
         });
         setMembers(membersWithStats);
 
         const recentWithNames = contributionsData.slice(0, 20).map(c => {
           const profile = profilesData.find(p => p.user_id === c.user_id);
           return { ...c, profiles: profile ? { full_name: profile.full_name } : null };
         });
         setRecentContributions(recentWithNames);
       }
     } catch (error) {
       console.error('Error fetching data:', error);
     } finally {
       setIsLoading(false);
     }
   };
 
   const handleSignOut = async () => {
     await signOut();
     navigate('/login');
   };
 
   const currentMonth = new Date();
   const thisMonthContribs = recentContributions.filter(c => {
     const date = parseISO(c.contribution_date);
     return date >= startOfMonth(currentMonth) && date <= endOfMonth(currentMonth);
   });
 
   const totalGroupSavings = members.reduce((sum, m) => sum + m.total_contributions + (m.balance_adjustment || 0), 0);
   const thisMonthTotal = thisMonthContribs.reduce((sum, c) => sum + Number(c.amount), 0);
 
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
         <div className="max-w-4xl mx-auto px-4 py-5">
           <div className="flex items-center justify-between mb-6">
             <div className="flex items-center gap-3">
               <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border border-primary/30 flex items-center justify-center shadow-sm overflow-hidden">
                 <img src={logo} alt="Horizon Unit" className="w-8 h-8 object-contain" />
               </div>
               <div>
                 <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Admin Panel</p>
                 <p className="font-bold text-foreground text-base mt-0.5">Horizon Unit</p>
               </div>
             </div>
             <div className="flex items-center gap-2">
               <button className="p-2.5 rounded-full bg-primary/10 hover:bg-primary/20 transition-all duration-200 text-primary">
                 <Bell className="w-5 h-5" />
               </button>
               <Button variant="ghost" size="icon" onClick={handleSignOut} className="rounded-full hover:bg-destructive/10 hover:text-destructive transition-all duration-200">
                 <LogOut className="w-5 h-5" />
               </Button>
             </div>
           </div>

           {/* Premium Balance Card */}
           <div className="bg-gradient-to-br from-primary via-primary/90 to-primary/70 rounded-3xl p-6 text-primary-foreground shadow-2xl border border-primary/30 backdrop-blur-sm overflow-hidden relative">
             {/* Decorative elements */}
             <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl" />
             <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full -ml-16 -mb-16 blur-3xl" />
             
             <div className="relative z-10">
               <div className="flex items-center justify-between mb-6">
                 <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center backdrop-blur">
                     <Sparkles className="w-5 h-5" />
                   </div>
                   <span className="font-semibold text-sm opacity-95">Group Savings Pool</span>
                 </div>
                 <div className="px-3 py-1.5 bg-white/15 rounded-full text-xs font-semibold text-white/90">{members.length} Members</div>
               </div>
               
               <div>
                 <p className="text-xs font-medium text-white/70 mb-1">Total Balance</p>
                 <p className="text-5xl font-black tracking-tight mb-2">KES {totalGroupSavings.toLocaleString()}</p>
               </div>

               <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-white/20">
                 <div>
                   <p className="text-xs font-medium text-white/70 mb-1">This Month</p>
                   <p className="text-lg font-bold">KES {thisMonthTotal.toLocaleString()}</p>
                 </div>
                 <div>
                   <p className="text-xs font-medium text-white/70 mb-1">Contributions</p>
                   <p className="text-lg font-bold">{thisMonthContribs.length}</p>
                 </div>
                 <div>
                   <p className="text-xs font-medium text-white/70 mb-1">Avg Per Member</p>
                   <p className="text-lg font-bold">KES {(members.length > 0 ? Math.round(totalGroupSavings / members.length) : 0).toLocaleString()}</p>
                 </div>
               </div>
             </div>
           </div>
         </div>
       </header>

       <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
         {/* Admin Action Buttons Grid */}
         <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
           <button 
             onClick={() => setActiveTab('members')}
             className="group relative h-24 bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary/30 rounded-2xl p-4 hover:from-primary/20 hover:to-primary/10 hover:border-primary/50 transition-all duration-300 overflow-hidden"
           >
             <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/10 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
             <div className="relative flex flex-col items-center gap-2 justify-center h-full">
               <div className="w-11 h-11 rounded-xl bg-primary/20 group-hover:bg-primary/30 transition-all duration-300 flex items-center justify-center">
                 <Users className="w-6 h-6 text-primary" />
               </div>
               <p className="font-bold text-foreground text-sm">Members</p>
               <p className="text-xs text-muted-foreground">{members.length} Total</p>
             </div>
           </button>

           <button 
             onClick={() => setActiveTab('messages')}
             className="group relative h-24 bg-gradient-to-br from-accent/10 to-accent/5 border-2 border-accent/30 rounded-2xl p-4 hover:from-accent/20 hover:to-accent/10 hover:border-accent/50 transition-all duration-300 overflow-hidden"
           >
             <div className="absolute inset-0 bg-gradient-to-r from-accent/0 via-accent/10 to-accent/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
             <div className="relative flex flex-col items-center gap-2 justify-center h-full">
               <div className="w-11 h-11 rounded-xl bg-accent/20 group-hover:bg-accent/30 transition-all duration-300 flex items-center justify-center">
                 <MessageSquare className="w-6 h-6 text-accent" />
               </div>
               <p className="font-bold text-foreground text-sm">Messages</p>
               <p className="text-xs text-muted-foreground">Broadcast</p>
             </div>
           </button>

           <button 
             onClick={() => setActiveTab('overview')}
             className="group relative h-24 bg-gradient-to-br from-info/10 to-info/5 border-2 border-info/30 rounded-2xl p-4 hover:from-info/20 hover:to-info/10 hover:border-info/50 transition-all duration-300 overflow-hidden"
           >
             <div className="absolute inset-0 bg-gradient-to-r from-info/0 via-info/10 to-info/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
             <div className="relative flex flex-col items-center gap-2 justify-center h-full">
               <div className="w-11 h-11 rounded-xl bg-info/20 group-hover:bg-info/30 transition-all duration-300 flex items-center justify-center">
                 <BarChart3 className="w-6 h-6 text-info" />
               </div>
               <p className="font-bold text-foreground text-sm">Reports</p>
               <p className="text-xs text-muted-foreground">Analytics</p>
             </div>
           </button>

           <button 
             className="group relative h-24 bg-gradient-to-br from-warning/10 to-warning/5 border-2 border-warning/30 rounded-2xl p-4 hover:from-warning/20 hover:to-warning/10 hover:border-warning/50 transition-all duration-300 overflow-hidden"
           >
             <div className="absolute inset-0 bg-gradient-to-r from-warning/0 via-warning/10 to-warning/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
             <div className="relative flex flex-col items-center gap-2 justify-center h-full">
               <div className="w-11 h-11 rounded-xl bg-warning/20 group-hover:bg-warning/30 transition-all duration-300 flex items-center justify-center">
                 <Settings className="w-6 h-6 text-warning" />
               </div>
               <p className="font-bold text-foreground text-sm">Settings</p>
               <p className="text-xs text-muted-foreground">Configure</p>
             </div>
           </button>
         </div>

         {/* Stats Grid - 4 Column Layout */}
         <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
           <div className="bg-card border border-border/50 rounded-2xl p-5 hover:border-primary/50 transition-all duration-300 group shadow-sm">
             <div className="w-11 h-11 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors duration-300 flex items-center justify-center mb-4">
               <Users className="w-6 h-6 text-primary" />
             </div>
             <p className="text-3xl font-bold text-foreground">{members.length}</p>
             <p className="text-xs font-medium text-muted-foreground mt-2 uppercase tracking-wide">Active Members</p>
           </div>

           <div className="bg-card border border-border/50 rounded-2xl p-5 hover:border-accent/50 transition-all duration-300 group shadow-sm">
             <div className="w-11 h-11 rounded-lg bg-accent/10 group-hover:bg-accent/20 transition-colors duration-300 flex items-center justify-center mb-4">
               <TrendingUp className="w-6 h-6 text-accent" />
             </div>
             <p className="text-3xl font-bold text-foreground">KES {(thisMonthTotal / 1000).toFixed(1)}K</p>
             <p className="text-xs font-medium text-muted-foreground mt-2 uppercase tracking-wide">This Month</p>
           </div>

           <div className="bg-card border border-border/50 rounded-2xl p-5 hover:border-info/50 transition-all duration-300 group shadow-sm">
             <div className="w-11 h-11 rounded-lg bg-info/10 group-hover:bg-info/20 transition-colors duration-300 flex items-center justify-center mb-4">
               <Calendar className="w-6 h-6 text-info" />
             </div>
             <p className="text-3xl font-bold text-foreground">{thisMonthContribs.length}</p>
             <p className="text-xs font-medium text-muted-foreground mt-2 uppercase tracking-wide">Contributions</p>
           </div>

           <div className="bg-card border border-border/50 rounded-2xl p-5 hover:border-warning/50 transition-all duration-300 group shadow-sm">
             <div className="w-11 h-11 rounded-lg bg-warning/10 group-hover:bg-warning/20 transition-colors duration-300 flex items-center justify-center mb-4">
               <Sparkles className="w-6 h-6 text-warning" />
             </div>
             <p className="text-3xl font-bold text-foreground">{(members.length > 0 ? (totalGroupSavings / members.length).toFixed(0) : 0)}</p>
             <p className="text-xs font-medium text-muted-foreground mt-2 uppercase tracking-wide">Avg Per Member</p>
           </div>
         </div>

         {/* Tab Navigation - Modern Styled */}
         <div className="bg-card rounded-2xl p-1.5 border border-border/50 shadow-sm flex gap-1">
           <button
             onClick={() => setActiveTab('overview')}
             className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-300 ${
               activeTab === 'overview' 
                 ? 'bg-gradient-to-br from-primary/10 to-primary/5 text-foreground border border-primary/30 shadow-sm' 
                 : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
             }`}
           >
             Overview
           </button>
           <button
             onClick={() => setActiveTab('members')}
             className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-300 ${
               activeTab === 'members' 
                 ? 'bg-gradient-to-br from-primary/10 to-primary/5 text-foreground border border-primary/30 shadow-sm' 
                 : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
             }`}
           >
             Members
           </button>
           <button
             onClick={() => setActiveTab('messages')}
             className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-300 ${
               activeTab === 'messages' 
                 ? 'bg-gradient-to-br from-primary/10 to-primary/5 text-foreground border border-primary/30 shadow-sm' 
                 : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
             }`}
           >
             Messages
           </button>
         </div>

         {/* Tab Content */}
         {activeTab === 'overview' && (
           <div className="space-y-6">
             <RecentContributions contributions={recentContributions} />
           </div>
         )}

         {activeTab === 'members' && (
           <MemberManagement members={members} onRefresh={fetchData} adminId={user!.id} />
         )}

         {activeTab === 'messages' && (
           <MessageCenter adminId={user!.id} members={members.map(m => ({ user_id: m.user_id, full_name: m.full_name }))} />
         )}
       </main>
     </div>
   );
 }