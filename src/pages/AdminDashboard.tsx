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
     <div className="min-h-screen bg-white">
       {/* Header */}
       <header className="sticky top-0 z-10 bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md">
         <div className="max-w-6xl mx-auto px-6 py-6">
           <div className="flex items-center justify-between">
             <div className="flex items-center gap-4">
               <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center border-2 border-white/30 overflow-hidden">
                 <img src={logo} alt="Horizon Unit" className="w-8 h-8 object-contain" />
               </div>
               <div>
                 <p className="text-sm font-medium text-blue-100">Admin Panel</p>
                 <p className="font-bold text-lg">Horizon Unit</p>
               </div>
             </div>
             <div className="flex items-center gap-3">
               <button className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-all duration-200">
                 <Bell className="w-5 h-5" />
               </button>
               <button onClick={handleSignOut} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-all duration-200">
                 <LogOut className="w-5 h-5" />
               </button>
             </div>
           </div>
         </div>
       </header>

       <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
         {/* Key Metrics Row */}
         <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
           <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
             <div className="flex items-center justify-between mb-3">
               <p className="text-sm text-gray-600 font-medium">Total Members</p>
               <Users className="w-5 h-5 text-blue-600" />
             </div>
             <p className="text-3xl font-bold text-gray-900">{members.length}</p>
             <p className="text-xs text-gray-500 mt-2">Active contributors</p>
           </div>

           <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
             <div className="flex items-center justify-between mb-3">
               <p className="text-sm text-gray-600 font-medium">Total Balance</p>
               <TrendingUp className="w-5 h-5 text-teal-600" />
             </div>
             <p className="text-3xl font-bold text-gray-900">KES {(totalGroupSavings / 1000).toFixed(1)}K</p>
             <p className="text-xs text-gray-500 mt-2">Group savings</p>
           </div>

           <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
             <div className="flex items-center justify-between mb-3">
               <p className="text-sm text-gray-600 font-medium">This Month</p>
               <Calendar className="w-5 h-5 text-cyan-600" />
             </div>
             <p className="text-3xl font-bold text-gray-900">KES {(thisMonthTotal / 1000).toFixed(1)}K</p>
             <p className="text-xs text-gray-500 mt-2">{thisMonthContribs.length} contributions</p>
           </div>

           <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
             <div className="flex items-center justify-between mb-3">
               <p className="text-sm text-gray-600 font-medium">Per Member</p>
               <Sparkles className="w-5 h-5 text-amber-600" />
             </div>
             <p className="text-3xl font-bold text-gray-900">KES {(members.length > 0 ? Math.round(totalGroupSavings / members.length) : 0).toLocaleString()}</p>
             <p className="text-xs text-gray-500 mt-2">Average savings</p>
           </div>
         </div>

         {/* Quick Actions */}
         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
           <button 
             onClick={() => setActiveTab('members')}
             className="bg-white border border-gray-200 hover:border-blue-300 rounded-lg p-6 text-left transition-all hover:shadow-md group"
           >
             <div className="flex items-center justify-between mb-3">
               <h3 className="font-bold text-gray-900">Manage Members</h3>
               <Users className="w-5 h-5 text-blue-600 group-hover:translate-x-1 transition-transform" />
             </div>
             <p className="text-sm text-gray-600">{members.length} members in group</p>
             <p className="text-xs text-gray-500 mt-2">Add, edit, or view member information</p>
           </button>

           <button 
             onClick={() => setActiveTab('messages')}
             className="bg-white border border-gray-200 hover:border-teal-300 rounded-lg p-6 text-left transition-all hover:shadow-md group"
           >
             <div className="flex items-center justify-between mb-3">
               <h3 className="font-bold text-gray-900">Send Messages</h3>
               <MessageSquare className="w-5 h-5 text-teal-600 group-hover:translate-x-1 transition-transform" />
             </div>
             <p className="text-sm text-gray-600">Broadcast to all members</p>
             <p className="text-xs text-gray-500 mt-2">Send important updates and announcements</p>
           </button>

           <button 
             onClick={() => setActiveTab('overview')}
             className="bg-white border border-gray-200 hover:border-cyan-300 rounded-lg p-6 text-left transition-all hover:shadow-md group"
           >
             <div className="flex items-center justify-between mb-3">
               <h3 className="font-bold text-gray-900">View Reports</h3>
               <BarChart3 className="w-5 h-5 text-cyan-600 group-hover:translate-x-1 transition-transform" />
             </div>
             <p className="text-sm text-gray-600">Detailed analytics</p>
             <p className="text-xs text-gray-500 mt-2">Track contributions and group performance</p>
           </button>
         </div>

         {/* Tab Navigation */}
         <div className="bg-white border border-gray-200 rounded-lg p-2 flex gap-1">
           <button
             onClick={() => setActiveTab('overview')}
             className={`flex-1 py-3 px-4 rounded-md text-sm font-semibold transition-all ${
               activeTab === 'overview' 
                 ? 'bg-blue-50 text-blue-900 border border-blue-200' 
                 : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
             }`}
           >
             Overview
           </button>
           <button
             onClick={() => setActiveTab('members')}
             className={`flex-1 py-3 px-4 rounded-md text-sm font-semibold transition-all ${
               activeTab === 'members' 
                 ? 'bg-blue-50 text-blue-900 border border-blue-200' 
                 : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
             }`}
           >
             Members
           </button>
           <button
             onClick={() => setActiveTab('messages')}
             className={`flex-1 py-3 px-4 rounded-md text-sm font-semibold transition-all ${
               activeTab === 'messages' 
                 ? 'bg-blue-50 text-blue-900 border border-blue-200' 
                 : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
             }`}
           >
             Messages
           </button>
         </div>

         {/* Tab Content */}
         {activeTab === 'overview' && (
           <div className="bg-white border border-gray-200 rounded-lg">
             <RecentContributions contributions={recentContributions} />
           </div>
         )}

         {activeTab === 'members' && (
           <div className="bg-white border border-gray-200 rounded-lg">
             <MemberManagement members={members} onRefresh={fetchData} adminId={user!.id} />
           </div>
         )}

         {activeTab === 'messages' && (
           <div className="bg-white border border-gray-200 rounded-lg">
             <MessageCenter adminId={user!.id} members={members.map(m => ({ user_id: m.user_id, full_name: m.full_name }))} />
           </div>
         )}
       </main>
     </div>
   );
 }