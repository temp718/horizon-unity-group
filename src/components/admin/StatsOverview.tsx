 import { Users, TrendingUp, Calendar, CheckCircle2 } from 'lucide-react';
 
 interface StatsOverviewProps {
   membersCount: number;
   totalGroupSavings: number;
   thisMonthTotal: number;
   thisMonthContribsCount: number;
 }
 
 export default function StatsOverview({ 
   membersCount, 
   totalGroupSavings, 
   thisMonthTotal, 
   thisMonthContribsCount 
 }: StatsOverviewProps) {
   return (
     <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
       <div className="bg-card rounded-2xl p-4 shadow-sm border border-border">
         <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
           <Users className="w-5 h-5 text-primary" />
         </div>
         <p className="text-2xl font-bold text-foreground">{membersCount}</p>
         <p className="text-xs text-muted-foreground mt-1">Members</p>
       </div>
       <div className="bg-card rounded-2xl p-4 shadow-sm border border-border">
         <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center mb-3">
           <TrendingUp className="w-5 h-5 text-accent-foreground" />
         </div>
         <p className="text-xl font-bold text-foreground">KES {(totalGroupSavings / 1000).toFixed(0)}K</p>
         <p className="text-xs text-muted-foreground mt-1">Total Savings</p>
       </div>
       <div className="bg-card rounded-2xl p-4 shadow-sm border border-border">
         <div className="w-10 h-10 rounded-xl bg-info/10 flex items-center justify-center mb-3">
           <Calendar className="w-5 h-5 text-info" />
         </div>
         <p className="text-xl font-bold text-foreground">KES {(thisMonthTotal / 1000).toFixed(0)}K</p>
         <p className="text-xs text-muted-foreground mt-1">This Month</p>
       </div>
       <div className="bg-card rounded-2xl p-4 shadow-sm border border-border">
         <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center mb-3">
           <CheckCircle2 className="w-5 h-5 text-warning" />
         </div>
         <p className="text-2xl font-bold text-foreground">{thisMonthContribsCount}</p>
         <p className="text-xs text-muted-foreground mt-1">Contributions</p>
       </div>
     </div>
   );
 }
