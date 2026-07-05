
import React from 'react';
import { Link } from 'react-router-dom';
import { Users, CreditCard, Activity, CheckCircle2, Trash2, Calendar } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Visit, Transaction, Patient, Appointment } from '../types';

interface DashboardProps {
  visits: Visit[];
  transactions: Transaction[];
  patients: Patient[];
  appointments: Appointment[];
  deleteVisit: (id: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ visits, transactions, patients, appointments, deleteVisit }) => {
  const now = new Date();
  
  const today = now.toISOString().split('T')[0];

  const todayVisits = visits.filter(v => v.date.startsWith(today));
  const todayRevenueTransactions = transactions.filter(t => t.date.startsWith(today) && t.type === 'Income');
  const todayRevenue = todayRevenueTransactions
    .filter(t => ['Cash', 'Transfer', 'CreditCard'].includes(t.paymentMethod || ''))
    .reduce((sum, t) => sum + t.amount, 0);

  const stats = [
    { label: 'ผู้ป่วยวันนี้', value: todayVisits.length, icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-100' },
    { label: 'รายได้วันนี้', value: `฿${todayRevenue.toLocaleString()}`, icon: CreditCard, color: 'text-orange-600', bg: 'bg-orange-100' },
    { label: 'กำลังรอตรวจ', value: visits.filter(v => v.status === 'Waiting' || v.status === 'Triage' || v.status === 'Examination').length, icon: Activity, color: 'text-orange-500', bg: 'bg-orange-50' },
    { label: 'ตรวจเสร็จสิ้น', value: visits.filter(v => v.status === 'Completed').length, icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  ];

  const chartData = [
    { name: '09:00', visits: todayVisits.filter(v => new Date(v.date).getHours() < 10).length },
    { name: '11:00', visits: todayVisits.filter(v => new Date(v.date).getHours() >= 10 && new Date(v.date).getHours() < 12).length },
    { name: '13:00', visits: todayVisits.filter(v => new Date(v.date).getHours() >= 12 && new Date(v.date).getHours() < 14).length },
    { name: '15:00', visits: todayVisits.filter(v => new Date(v.date).getHours() >= 14 && new Date(v.date).getHours() < 16).length },
    { name: '17:00', visits: todayVisits.filter(v => new Date(v.date).getHours() >= 16 && new Date(v.date).getHours() < 18).length },
    { name: '19:00', visits: todayVisits.filter(v => new Date(v.date).getHours() >= 18).length },
  ];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-800">แผงควบคุมระบบ (Dashboard)</h1>
        <p className="text-slate-500">ภาพรวมการทำงานของคลินิกประจำวันที่ {new Date().toLocaleDateString('th-TH')}</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className={`${stat.bg} ${stat.color} p-3 rounded-lg`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">{stat.label}</p>
              <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-800 mb-6">ความหนาแน่นของผู้ป่วยวันนี้</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                <Bar dataKey="visits" fill="#059669" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">คิวปัจจุบัน</h3>
          <div className="space-y-4">
            {todayVisits.length > 0 ? (
              todayVisits.slice(0, 5).map(visit => {
                const p = patients.find(pt => pt.id === visit.patientId);
                return (
                  <div key={visit.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg group">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                        {p?.firstName.charAt(0)}
                      </div>
                      <div className="overflow-hidden max-w-[120px]">
                        <p className="text-sm font-semibold text-slate-800 truncate">{p?.firstName} {p?.lastName}</p>
                        <p className="text-[10px] text-slate-500">HN: {p?.hn}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] px-2 py-1 rounded-full font-medium ${
                        visit.status === 'Waiting' ? 'bg-orange-100 text-orange-700' :
                        visit.status === 'Examination' ? 'bg-emerald-100 text-emerald-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {visit.status}
                      </span>
                      <button 
                        onClick={() => deleteVisit(visit.id)}
                        className="p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-10 text-slate-400 text-sm italic">ไม่มีคิวในขณะนี้</div>
            )}
          </div>
          
          <h3 className="text-lg font-semibold text-slate-800 mt-8 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-600" />
            นัดหมายเร็วๆ นี้
          </h3>
          <div className="space-y-3">
            {appointments
              .filter(a => a.date >= today)
              .sort((a, b) => a.date.localeCompare(b.date))
              .slice(0, 5)
              .map(app => (
                <div key={app.id} className="p-3 border border-slate-100 rounded-lg bg-emerald-50/30">
                  <div className="flex justify-between items-start">
                    <p className="text-sm font-bold text-slate-800">{app.patientName}</p>
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded">
                      {new Date(app.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">{app.time} น. | {app.purpose}</p>
                </div>
              ))}
            {appointments.filter(a => a.date >= today).length === 0 && (
              <div className="text-center py-6 text-slate-400 text-sm italic">ไม่มีนัดหมายเร็วๆ นี้</div>
            )}
            <Link to="/appointments" className="block text-center text-xs font-bold text-emerald-600 hover:underline mt-2">
              ดูตารางนัดหมายทั้งหมด
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
