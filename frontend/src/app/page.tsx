'use client';

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useEffect, useState } from 'react';
import { type ChartConfig } from "@/components/ui/chart"
import { SidebarHeader, SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/ui/app-sidebar";
<<<<<<< HEAD
// import { UI } from "./styles";
=======
>>>>>>> 416fa305886404213895ff4e6fc5213426a7729d
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar, Clock, Download, FileText, Search, Upload } from "lucide-react";
import { Checkbox } from "@/components/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { useQuery } from '@tanstack/react-query'


function MyButton({ title, onClick }: { title: string; onClick: () => void }) {
  return (

    <button
      onClick={onClick}
      className="
    px-13
    py-2
    bg-gradient-to-r from-purple-500 to-pink-500
    text-black
    font-bold rounded-xl
    shadow-lg hover:shadow-purple-500/50
    transform transition hover:-translate-y-1 active:scale-95
    "> {title}

    </button>

  );
}

export default function MyApp({ children }: { children: React.ReactNode }) {

  const [debit, setDebit] = useState(0);
  const [credit, setCredit] = useState(0);
  const [isBalanced, setIsBalanced] = useState(false);

  const [data, setData] = useState<string>("Натисніть кнопку, щоб отримати дані");
  const [currentId, setCurrentId] = useState<number>(1);

  useEffect(() => {
    setIsBalanced(debit !== 0 && debit === credit);
  }, [debit, credit]);

  const fetchData = async () => {
    try {
      const response = await fetch(`http://localhost:3001/users/${currentId}`);
      if (response.ok) {
        const user = await response.json();
        setData(`ID: ${user.id} | Email: ${user.email}`);
        setCurrentId(prevId => prevId + 1);
      } else {
        setData(`Користувача з ID ${currentId} не знайдено`);
        setCurrentId(prevId => prevId + 1);
      }
    } catch (error) {
      setData("Помилка при отриманні даних");
    }
  };


  const { data: serverTransactions, isLoading } = useQuery({
    queryKey: ['transactions'],
    queryFn: async () => {
      // Accout ID wich we want to fetch the history for (hardcoded for now)
      const response = await fetch('http://localhost:3001/transactions/history/9');
      if (!response.ok) throw new Error('Backend is down');
      return response.json();
    }
  });

const transactions = serverTransactions?.map((tx: any) => ({
  id: `PAY-${tx.transactionId.split('-')[0].toUpperCase()}`,
  amount: `${tx.amount > 0 ? '+' : ''}${tx.amount.toLocaleString()} USD`,
  to: tx.counterparty, 
  details: tx.description, 
  avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${tx.counterparty}`, // Random avatar 
  method: "Internal Wire",
  status: "Processed"
})) || [];


  const dtransactions = [
    {
      id: "PAY-12345XYZ",
      amount: "$1,164.99 USD",
      to: "Bobby Bob",
      avatar: "https://github.com/shadcn.png", // тимчасово
      period: "Mar 10 - Mar 15",
      method: "Wire Transfer",
      date: "Mar 13",
      status: "Received"
    },
    {
      id: "TXN-98765A9",
      amount: "$1,072.98 USD",
      to: "Jefrey Epstain",
      avatar: "https://github.com/shadcn.png",
      period: "Mar 11 - Mar 12",
      method: "Bank Transfer",
      date: "Mar 11",
      status: "Failed"
    },
    {
      id: "INV-56789LMN",
      amount: "$977.98 USD",
      to: "Jane Doh",
      avatar: "https://github.com/shadcn.png",
      period: "Mar 4 - Mar 8",
      method: "Wire Transfer",
      date: "Mar 7",
      status: "Processed"
    }
  ];



  function StatusBadge({ status }: { status: string }) {
    const styles: Record<string, string> = {
      Received: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
      Failed: "bg-destructive/10 text-destructive border-destructive/20",
      Processed: "bg-primary/10 text-primary border-primary/20",
    };

    return (
      <span className={`text-[10px] px-2 py-1 rounded-full border font-bold ${styles[status] || styles.Processed}`}>
        {status === 'Received' && '✓ '}
        {status === 'Failed' && '✕ '}
        {status}
      </span>
    );
  }



  const chartData = [
    { month: 'Jan', amount: 120 },
    { month: 'Feb', amount: 210 },
    { month: 'Mar', amount: 180 },
    { month: 'Apr', amount: 450 },
    { month: 'May', amount: 230 },
    { month: 'Jun', amount: 190 },
    { month: 'Jul', amount: 250 },
    { month: 'Aug', amount: 210 },
    { month: 'Sep', amount: 40 },
  ];




  return (
    <SidebarProvider>
      <AppSidebar />

      <SidebarInset className="bg-background flex flex-col text-muted-foreground">
        {/* HEADER */}
        <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border px-6 sticky top-0 bg-background/80 backdrop-blur-md z-10">
          <SidebarTrigger className="-ml-1 text-muted" />
          <div className="h-4 w-[1px] bg-border mx-2" />
          <h1 className="text-sm font-medium text-accent tracking-tight">Dashboard</h1>
        </header>

        {/* MAIN CONTENT AREA */}
        <main className="p-6 flex flex-col gap-8 w-full max-w-[1400px] mx-auto">

          {/* ROW 0: ACTION BUTTONS */}
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <Button variant="outline" className="bg-card border-border text-muted text-xs h-9">
                <FileText className="mr-2 h-4 w-4" /> Generate Report
              </Button>
              <Button variant="outline" className="bg-card border-border text-muted text-xs h-9">
                <Download className="mr-2 h-4 w-4" /> Export
              </Button>
            </div>
          </div>

          {/* ROW 1: STATS CARDS (3 COLUMNS) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { title: "Total Revenue this month", value: "$27,482.48", color: "text-foreground" },
              { title: "Total Saving", value: "$19,788.98", color: "text-primary" },
              { title: "Taxes to be paid", value: "$43,122.01", color: "text-accent" }
            ].map((item, index) => (
              <Card key={index} className="bg-card border-border pb-0 rounded-xl shadow-sm overflow-hidden flex flex-col justify-between hover:border-primary/50 transition-colors">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-muted text-[10px] font-bold tracking-widest uppercase opacity-60">
                    {item.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <h2 className={`text-2xl font-bold tracking-tighter ${item.color}`}>
                    {item.value}
                  </h2>
                </CardContent>
                <CardFooter className="bg-black/20 px-4 py-3 border-t border-border/50">
                  <div className="flex items-center gap-2 text-[10px] text-muted font-medium uppercase tracking-wider">
                    <Clock className="h-3 w-3 opacity-80" />
                    Vs Last month
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>

          {/* ROW 2: SPLIT VIEW (LEFT CONTENT + ANALYTICS) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* LEFT SIDE: Spending Limits Placeholder (5 of 12 columns) */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              <Card className="bg-card border-border p-6 rounded-2xl flex-1 flex flex-col justify-center min-h-[300px] relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10">
                  <p className="text-muted text-[10px] font-bold uppercase tracking-widest mb-1">AI-Generated Spending Limits</p>
                  <h3 className="text-3xl font-bold tracking-tighter mb-6">$4,815.23</h3>

                  <div className="space-y-4">
                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-primary w-[65%]" />
                    </div>
                    <p className="text-[10px] text-muted uppercase font-bold tracking-tighter">Smart Spending Limits</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* RIGHT SIDE: Bar Chart (7 of 12 columns) */}
            <div className="lg:col-span-7">
              <Card className="bg-card border-border p-6 rounded-2xl h-full shadow-lg">
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <p className="text-muted text-[10px] uppercase tracking-wider font-bold opacity-60">Available Balance</p>
                    <h2 className="text-3xl font-bold tracking-tighter mt-1">$102,175.96</h2>
                  </div>
                  <div className="flex gap-1 bg-black/40 p-1 rounded-lg border border-white/5">
                    <Button variant="ghost" className="h-7 px-3 text-[10px] bg-background shadow-sm hover:bg-background">Line view</Button>
                    <Button variant="ghost" className="h-7 px-3 text-[10px] opacity-50 hover:opacity-100 transition-opacity">Bar view</Button>
                  </div>
                </div>

                <div className="h-[220px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} dy={10} />
                      <YAxis hide={true} />
                      <Bar dataKey="amount" radius={[4, 4, 4, 4]} barSize={32}>
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.month === 'Apr' ? '#d9ff00' : '#27272a'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-6 pt-4 border-t border-border/50 flex items-center gap-2 text-[10px] text-muted uppercase font-bold tracking-widest opacity-60">
                  <Clock className="h-3 w-3" /> Vs Last month
                </div>
              </Card>
            </div>
          </div>

          {/* ROW 3: TRANSACTIONS TABLE */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-2xl">
            {/* TABLE TOOLBAR */}
            <div className="p-4 border-b border-border flex flex-wrap items-center justify-between gap-4 bg-black/20">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted opacity-50" />
                  <Input placeholder="Search Transaction..." className="pl-9 bg-background/50 border-border text-xs w-[240px] h-9" />
                </div>
                <Button variant="outline" className="h-9 text-xs border-border gap-2 bg-background/50">
                  <Calendar className="h-3.5 w-3.5" /> Processed Date
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" className="h-9 text-xs border-border gap-2 bg-background/50">
                  <Upload className="h-3.5 w-3.5" /> Import
                </Button>
                <Button variant="outline" className="h-9 text-xs border-border gap-2 bg-background/50">
                  <Download className="h-3.5 w-3.5" /> Export
                </Button>
              </div>
            </div>

            {/* ACTUAL TABLE */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-[10px] uppercase tracking-widest text-muted border-b border-border bg-white/[0.02]">
                    <th className="p-4 font-medium w-10"><Checkbox className="border-muted/30" /></th>
                    <th className="p-4 font-medium">Payment ID</th>
                    <th className="p-4 font-medium">Total Amount</th>
                    <th className="p-4 font-medium">To</th>
                    <th className="p-4 font-medium">Method</th>
                    <th className="p-4 font-medium text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="border-b border-border/50 hover:bg-white/[0.01] transition-colors group">
                      <td className="p-4"><Checkbox className="border-muted/30" /></td>
                      <td className="p-4 font-mono text-[11px] text-muted-foreground">{tx.id}</td>
                      <td className="p-4 font-semibold text-foreground">{tx.amount}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-7 w-7 border border-border shadow-sm">
                            <AvatarImage src={tx.avatar} />
                            <AvatarFallback className="text-[10px]">{tx.to[0]}</AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="text-xs font-medium text-foreground/80">{tx.to}</span>
                            <span className="text-[10px] text-muted-foreground opacity-60 truncate max-w-[120px]">
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

<<<<<<< HEAD
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
=======
      </main>
    </SidebarInset>
  </SidebarProvider>
);
}
>>>>>>> 416fa305886404213895ff4e6fc5213426a7729d
