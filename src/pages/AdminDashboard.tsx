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
     <div className="min-h-screen bg-muted/30">
       {/* Header */}
       <header className="bg-card px-4 py-5 rounded-b-3xl shadow-sm">
         <div className="max-w-4xl mx-auto">
           <div className="flex items-center justify-between mb-6">
             <div className="flex items-center gap-3">
               <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border-2 border-primary/20">
                 <img src={logo} alt="Horizon Unit" className="w-7 h-7 object-contain" />
               </div>
               <div>
                 <p className="text-muted-foreground text-sm">Admin Panel</p>
                 <p className="font-semibold text-foreground text-lg">Horizon Unit</p>
               </div>
             </div>
             <div className="flex items-center gap-2">
               <Button variant="ghost" size="icon" className="rounded-full">
                 <Bell className="w-5 h-5" />
               </Button>
               <Button variant="ghost" size="icon" onClick={handleSignOut} className="rounded-full">
                 <LogOut className="w-5 h-5" />
               </Button>
             </div>
           </div>
 
           {/* Balance Overview Card */}
           <div className="bg-gradient-to-br from-primary to-primary/80 rounded-2xl p-5 text-primary-foreground shadow-lg">
             <div className="flex items-center justify-between mb-4">
               <div className="flex items-center gap-2">
                 <Sparkles className="w-5 h-5" />
                 <span className="font-medium text-sm opacity-90">Total Group Savings</span>
               </div>
               <div className="px-3 py-1 bg-white/10 rounded-full text-xs font-medium">
                 {members.length} Members
               </div>
             </div>
             
             <p className="text-4xl font-bold tracking-tight">KES {totalGroupSavings.toLocaleString()}.00</p>
 
             <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/20">
               <div className="flex-1">
                 <p className="text-xs opacity-70">This Month</p>
                 <p className="text-lg font-semibold">KES {thisMonthTotal.toLocaleString()}</p>
               </div>
               <div className="flex-1">
                 <p className="text-xs opacity-70">Contributions</p>
                 <p className="text-lg font-semibold">{thisMonthContribs.length}</p>
               </div>
             </div>
           </div>
         </div>
       </header>
 
       <main className="max-w-4xl mx-auto px-4 py-6 space-y-5">
         {/* Quick Actions Grid */}
         <div className="bg-card rounded-2xl p-5 shadow-sm border border-border">
           <div className="flex items-center justify-between mb-4">
             <h3 className="font-semibold text-foreground">Admin Actions</h3>
           </div>
           <div className="grid grid-cols-4 gap-4">
             <button onClick={() => setActiveTab('members')} className="flex flex-col items-center gap-2 group">
               <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                 <Users className="w-6 h-6 text-primary" />
               </div>
               <span className="text-xs font-medium text-muted-foreground">Members</span>
             </button>
             <button onClick={() => setActiveTab('messages')} className="flex flex-col items-center gap-2 group">
               <div className="w-14 h-14 rounded-2xl bg-accent flex items-center justify-center group-hover:bg-accent/80 transition-colors">
                 <MessageSquare className="w-6 h-6 text-accent-foreground" />
               </div>
               <span className="text-xs font-medium text-muted-foreground">Messages</span>
             </button>
             <button onClick={() => setActiveTab('overview')} className="flex flex-col items-center gap-2 group">
               <div className="w-14 h-14 rounded-2xl bg-info/10 flex items-center justify-center group-hover:bg-info/20 transition-colors">
                 <BarChart3 className="w-6 h-6 text-info" />
               </div>
               <span className="text-xs font-medium text-muted-foreground">Reports</span>
             </button>
             <button className="flex flex-col items-center gap-2 group">
               <div className="w-14 h-14 rounded-2xl bg-warning/10 flex items-center justify-center group-hover:bg-warning/20 transition-colors">
                 <Settings className="w-6 h-6 text-warning" />
               </div>
               <span className="text-xs font-medium text-muted-foreground">Settings</span>
             </button>
           </div>
         </div>
 
         {/* Stats Cards */}
         <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
           <div className="bg-card rounded-2xl p-4 shadow-sm border border-border">
             <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
               <Users className="w-5 h-5 text-primary" />
             </div>
             <p className="text-2xl font-bold text-foreground">{members.length}</p>
             <p className="text-xs text-muted-foreground mt-1">Active Members</p>
           </div>
           <div className="bg-card rounded-2xl p-4 shadow-sm border border-border">
             <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center mb-3">
               <TrendingUp className="w-5 h-5 text-accent-foreground" />
             </div>
             <p className="text-2xl font-bold text-foreground">KES {(thisMonthTotal / 1000).toFixed(0)}K</p>
             <p className="text-xs text-muted-foreground mt-1">This Month</p>
           </div>
           <div className="bg-card rounded-2xl p-4 shadow-sm border border-border">
             <div className="w-10 h-10 rounded-xl bg-info/10 flex items-center justify-center mb-3">
               <Calendar className="w-5 h-5 text-info" />
             </div>
             <p className="text-2xl font-bold text-foreground">{thisMonthContribs.length}</p>
             <p className="text-xs text-muted-foreground mt-1">Contributions</p>
           </div>
           <div className="bg-card rounded-2xl p-4 shadow-sm border border-border">
             <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center mb-3">
               <Sparkles className="w-5 h-5 text-warning" />
             </div>
             <p className="text-2xl font-bold text-foreground">{format(new Date(), 'MMM')}</p>
             <p className="text-xs text-muted-foreground mt-1">Current Period</p>
           </div>
         </div>
 
         {/* Tab Navigation */}
         <div className="flex gap-2 p-1 bg-muted rounded-xl">
           <button
             onClick={() => setActiveTab('overview')}
             className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all ${
               activeTab === 'overview' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
             }`}
           >
             Overview
           </button>
           <button
             onClick={() => setActiveTab('members')}
             className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all ${
               activeTab === 'members' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
             }`}
           >
             Members
           </button>
           <button
             onClick={() => setActiveTab('messages')}
             className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all ${
               activeTab === 'messages' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
             }`}
           >
             Messages
           </button>
         </div>
 
         {/* Tab Content */}
         {activeTab === 'overview' && (
           <div className="space-y-5">
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