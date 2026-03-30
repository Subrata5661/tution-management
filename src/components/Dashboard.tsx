import React, { useEffect, useState } from 'react';
import { collection, db, getDocs, query, where, orderBy, limit } from '../firebase';
import { Student, Payment } from '../types';
import { Users, IndianRupee, AlertCircle, TrendingUp, Calendar, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { cn } from '../lib/utils';

export default function Dashboard() {
  const [students, setStudents] = useState<Student[]>([]);
  const [currentMonthPayments, setCurrentMonthPayments] = useState<Payment[]>([]);
  const [lastSixMonthsData, setLastSixMonthsData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch all students
        const studentsSnapshot = await getDocs(collection(db, 'students'));
        const studentsData = studentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
        setStudents(studentsData);

        // Fetch current month payments
        const currentMonth = format(new Date(), 'yyyy-MM');
        const currentPaymentsQuery = query(collection(db, 'payments'), where('month', '==', currentMonth));
        const currentPaymentsSnapshot = await getDocs(currentPaymentsQuery);
        const currentPaymentsData = currentPaymentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment));
        setCurrentMonthPayments(currentPaymentsData);

        // Fetch last 6 months for trend chart
        const months = Array.from({ length: 6 }, (_, i) => format(subMonths(new Date(), i), 'yyyy-MM')).reverse();
        const trendData = await Promise.all(months.map(async (m) => {
          const q = query(collection(db, 'payments'), where('month', '==', m));
          const snap = await getDocs(q);
          const total = snap.docs.reduce((sum, doc) => sum + (doc.data().amount || 0), 0);
          return { name: format(new Date(m + '-01'), 'MMM'), amount: total };
        }));
        setLastSixMonthsData(trendData);

      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const totalStudents = students.length;
  const totalCollected = currentMonthPayments.reduce((sum, p) => sum + p.amount, 0);
  const paidStudentIds = new Set(currentMonthPayments.map(p => p.studentId));
  const pendingStudents = students.filter(s => !paidStudentIds.has(s.id));
  const totalPendingAmount = pendingStudents.reduce((sum, s) => sum + s.monthlyFee, 0);

  const pieData = [
    { name: 'Paid', value: currentMonthPayments.length, color: '#10b981' },
    { name: 'Unpaid', value: pendingStudents.length, color: '#f59e0b' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Analytics Overview</h2>
          <p className="text-gray-500 dark:text-slate-400 mt-1">Real-time performance metrics for {format(new Date(), 'MMMM yyyy')}</p>
        </div>
        <div className="flex items-center gap-2 bg-white dark:bg-slate-800 px-4 py-2 rounded-xl border dark:border-slate-700 shadow-sm">
          <Calendar size={18} className="text-indigo-600 dark:text-indigo-400" />
          <span className="text-sm font-semibold text-gray-700 dark:text-slate-200">{format(new Date(), 'dd MMM, yyyy')}</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Active Students"
          value={totalStudents}
          trend="+4.5%"
          isPositive={true}
          icon={Users}
          color="indigo"
        />
        <StatCard
          title="Monthly Revenue"
          value={`₹${totalCollected}`}
          trend="+12.2%"
          isPositive={true}
          icon={IndianRupee}
          color="emerald"
        />
        <StatCard
          title="Pending Fees"
          value={`₹${totalPendingAmount}`}
          trend="-2.4%"
          isPositive={false}
          icon={TrendingUp}
          color="amber"
        />
        <StatCard
          title="Unpaid Students"
          value={pendingStudents.length}
          trend="+1"
          isPositive={false}
          icon={AlertCircle}
          color="rose"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Trend Chart */}
        <div className="lg:col-span-2 bg-slate-900 rounded-3xl p-8 shadow-xl border border-slate-800">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-bold text-white">Revenue Trend</h3>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="w-3 h-3 rounded-full bg-indigo-500" />
              Monthly Collection
            </div>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={lastSixMonthsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  dx={-10}
                />
                <Tooltip 
                  cursor={{ fill: '#1e293b' }}
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', color: '#fff' }}
                  itemStyle={{ color: '#818cf8' }}
                />
                <Bar dataKey="amount" radius={[6, 6, 0, 0]} barSize={40}>
                  {lastSixMonthsData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === lastSixMonthsData.length - 1 ? '#818cf8' : '#334155'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payment Status Pie Chart */}
        <div className="bg-slate-900 rounded-3xl p-8 shadow-xl border border-slate-800 flex flex-col">
          <h3 className="text-lg font-bold text-white mb-8">Payment Status</h3>
          <div className="flex-1 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', color: '#fff' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-bold text-white">{Math.round((currentMonthPayments.length / (totalStudents || 1)) * 100)}%</span>
              <span className="text-xs text-slate-400">Paid</span>
            </div>
          </div>
          <div className="mt-6 space-y-3">
            {pieData.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-300">{item.name}</span>
                </div>
                <span className="font-semibold text-white">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Pending List */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="px-8 py-6 border-b dark:border-slate-800 flex items-center justify-between bg-gray-50/50 dark:bg-slate-800/50">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Immediate Attention</h3>
            <p className="text-sm text-gray-500 dark:text-slate-400">Students who haven't paid for this month</p>
          </div>
          <span className="px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-bold rounded-full uppercase tracking-wider">
            {pendingStudents.length} Pending
          </span>
        </div>
        <div className="divide-y dark:divide-slate-800">
          {pendingStudents.length > 0 ? (
            pendingStudents.slice(0, 5).map(student => (
              <div key={student.id} className="px-8 py-5 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-gray-600 dark:text-slate-400 font-bold group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/50 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {student.name[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white">{student.name}</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400">Class {student.class} • {student.phone}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-indigo-600 dark:text-indigo-400">₹{student.monthlyFee}</p>
                  <p className="text-[10px] text-gray-400 dark:text-slate-500 uppercase font-bold tracking-tighter">Due Amount</p>
                </div>
              </div>
            ))
          ) : (
            <div className="px-8 py-16 text-center">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={32} />
              </div>
              <h4 className="text-lg font-bold text-gray-900 dark:text-white">All caught up!</h4>
              <p className="text-gray-500 dark:text-slate-400">Every student has cleared their dues for this month.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CheckCircle({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function StatCard({ title, value, trend, isPositive, icon: Icon, color }: { 
  title: string, 
  value: string | number, 
  trend: string,
  isPositive: boolean,
  icon: any, 
  color: 'indigo' | 'emerald' | 'amber' | 'rose' 
}) {
  const colors = {
    indigo: 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/50',
    emerald: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/50',
    amber: 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/50',
    rose: 'bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/50',
  };

  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-300">
      <div className="flex items-start justify-between mb-4">
        <div className={cn("p-3 rounded-2xl border", colors[color])}>
          <Icon size={24} />
        </div>
        <div className={cn(
          "flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full",
          isPositive ? "bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400" : "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400"
        )}>
          {isPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          {trend}
        </div>
      </div>
      <div>
        <p className="text-sm font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">{title}</p>
        <p className="text-3xl font-black text-gray-900 dark:text-white mt-1">{value}</p>
      </div>
    </div>
  );
}
