 import { format, parseISO } from 'date-fns';
 import { CheckCircle2, Clock, History } from 'lucide-react';
 
 interface Contribution {
   id: string;
   amount: number;
   contribution_date: string;
   status: string;
   created_at: string;
   profiles: { full_name: string } | null;
 }
 
 interface RecentContributionsProps {
   contributions: Contribution[];
 }
 
 export default function RecentContributions({ contributions }: RecentContributionsProps) {
   return (
     <div className="bg-card rounded-2xl p-5 shadow-sm border border-border">
       <div className="flex items-center justify-between mb-4">
         <div className="flex items-center gap-2">
           <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
             <History className="w-4 h-4 text-primary" />
           </div>
           <h3 className="font-semibold text-foreground">Recent Contributions</h3>
         </div>
         <button className="text-xs text-primary font-medium">View All</button>
       </div>
       
       {contributions.length === 0 ? (
         <div className="text-center py-8">
           <div className="w-16 h-16 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
             <History className="w-8 h-8 text-muted-foreground" />
           </div>
           <p className="text-muted-foreground text-sm">No contributions yet</p>
         </div>
       ) : (
         <div className="space-y-2">
           {contributions.slice(0, 10).map((contribution) => (
             <div key={contribution.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
               <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                 contribution.status === 'completed' ? 'bg-primary/10' : 'bg-warning/10'
               }`}>
                 {contribution.status === 'completed' ? (
                   <CheckCircle2 className="w-5 h-5 text-primary" />
                 ) : (
                   <Clock className="w-5 h-5 text-warning" />
                 )}
               </div>
               <div className="flex-1 min-w-0">
                 <p className="font-medium text-sm text-foreground truncate">
                   {contribution.profiles?.full_name || 'Unknown Member'}
                 </p>
                 <p className="text-xs text-muted-foreground">
                   {format(parseISO(contribution.contribution_date), 'MMM d, yyyy')}
                 </p>
               </div>
               <span className="font-bold text-primary whitespace-nowrap">
                 +KES {Number(contribution.amount).toLocaleString()}
               </span>
             </div>
           ))}
         </div>
       )}
     </div>
   );
 }
