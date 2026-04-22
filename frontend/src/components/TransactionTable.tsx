'use client';

import { Checkbox } from "@/components/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowDownCircle, ArrowUpCircle } from "lucide-react";

interface Transaction {
  id: string;
  amount: string;
  to: string;
  details: string;
  avatar: string;
  method: string;
  status: string;
  direction?: 'in' | 'out';
  user?: { name: string; email: string };
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className="text-[10px] px-2 py-1 rounded-full border font-bold bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
      ✓ {status}
    </span>
  );
}

export default function TransactionTable({ transactions, showUser = false }: { transactions: Transaction[]; showUser?: boolean }) {
  if (!transactions.length) {
    return (
      <div className="bg-card border border-border rounded-2xl p-8 text-center text-muted-foreground">
        No transactions found.
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-2xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="text-[10px] uppercase tracking-widest text-muted border-b border-border bg-white/[0.02]">
              <th className="p-4 font-medium w-10"><Checkbox className="border-muted/30" /></th>
              <th className="p-4 font-medium">Payment ID</th>
              <th className="p-4 font-medium">Amount</th>
              {showUser && <th className="p-4 font-medium">User</th>}
              <th className="p-4 font-medium">Counterparty</th>
              <th className="p-4 font-medium">Type</th>
              <th className="p-4 font-medium text-right">Status</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {transactions.map((tx) => (
              <tr key={tx.id} className="border-b border-border/50 hover:bg-white/[0.01] transition-colors group">
                <td className="p-4"><Checkbox className="border-muted/30" /></td>
                <td className="p-4 font-mono text-[11px] text-muted-foreground">{tx.id}</td>
                <td className="p-4">
                  <div className="flex items-center gap-1.5">
                    {tx.direction === 'in' ? (
                      <ArrowDownCircle className="h-4 w-4 text-emerald-500" />
                    ) : tx.direction === 'out' ? (
                      <ArrowUpCircle className="h-4 w-4 text-rose-500" />
                    ) : null}
                    <span className={`font-bold ${tx.amount.startsWith('+') ? 'text-emerald-500' : tx.amount.startsWith('-') ? 'text-rose-500' : 'text-foreground'}`}>
                      {tx.amount}
                    </span>
                  </div>
                </td>
                {showUser && tx.user && (
                  <td className="p-4">
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-foreground/80">{tx.user.name}</span>
                      <span className="text-[10px] text-muted-foreground">{tx.user.email}</span>
                    </div>
                  </td>
                )}
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-7 w-7 border border-border shadow-sm">
                      <AvatarImage src={tx.avatar} />
                      <AvatarFallback className="text-[10px]">{tx.to[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-foreground/80">{tx.to}</span>
                      <span className="text-[10px] text-muted-foreground opacity-60 truncate max-w-[180px]">
                        {tx.details}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <span className="text-[10px] bg-white/5 border border-border px-2 py-1 rounded-md text-muted-foreground uppercase font-bold tracking-tighter">
                    {tx.method}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <StatusBadge status={tx.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}