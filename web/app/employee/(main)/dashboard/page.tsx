"use client";

import React, { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { Clock, Calendar, FileText, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getEmployeeDashboardStats, analyzeLeaveRequest } from '@/app/actions/employee';

export default function EmployeeDashboard() {
    const { user } = useUser();
    const [data, setData] = useState({
        leaveBalance: 0,
        annualBalance: 0,
        annualTotal: 20,
        sickBalance: 0,
        sickTotal: 10,
        attendance: "0%",
        pendingRequests: 0,
        performance: "N/A",
        allBalances: [] as any[], // Added for Holiday Bank
        history: [] as any[]      // Added for context
    });
    const [loading, setLoading] = useState(true);

    // AI State
    const [query, setQuery] = useState("");
    const [aiLoading, setAiLoading] = useState(false);
    const [aiResult, setAiResult] = useState<any>(null);

    useEffect(() => {
        const fetchData = async () => {
            const res = await getEmployeeDashboardStats();
            if (res.success && res.stats) {
                setData({
                    leaveBalance: res.stats.leaveBalance,
                    annualBalance: res.stats.annualBalance,
                    annualTotal: res.stats.annualTotal || 20,
                    sickBalance: res.stats.sickBalance,
                    sickTotal: res.stats.sickTotal || 10,
                    attendance: res.stats.attendance,
                    pendingRequests: res.stats.pendingRequests,
                    performance: res.stats.performance,
                    allBalances: res.allBalances || [], // Store full list
                    history: res.history || []
                });
            }
            setLoading(false);
        };
        fetchData();
    }, []);

    const handleAskAI = async () => {
        if (!query.trim()) return;
        setAiLoading(true);
        setAiResult(null);

        const res = await analyzeLeaveRequest(query);
        if (res.success) {
            setAiResult(res.data);
        } else {
            console.error(res.error);
        }
        setAiLoading(false);
    };

    const stats = [
        { label: 'Leave Balance', value: `${Math.round(data.annualBalance)} Days`, icon: <Calendar />, color: 'from-blue-500 to-blue-600' },
        { label: 'Attendance', value: data.attendance, icon: <Clock />, color: 'from-emerald-500 to-emerald-600' },
        { label: 'Pending Requests', value: data.pendingRequests.toString(), icon: <FileText />, color: 'from-amber-500 to-amber-600' },
        { label: 'Performance', value: data.performance, icon: <Activity />, color: 'from-purple-500 to-purple-600' },
    ];

    return (
        <div className="max-w-6xl mx-auto">
            <header className="mb-12">
                <motion.h1
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-4xl font-bold text-white mb-2"
                >
                    Welcome back, {user?.firstName}
                </motion.h1>
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-slate-400"
                >
                    Here's your daily overview and performance metrics.
                </motion.p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                {stats.map((stat, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.1 }}
                        className="glass-panel p-6 group hover:border-white/20 transition-all cursor-default"
                    >
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.color} text-white shadow-lg`}>
                                {React.cloneElement(stat.icon as any, { size: 24 })}
                            </div>
                            <div>
                                <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">{stat.label}</div>
                                <div className="text-2xl font-bold text-white">
                                    {loading ? <span className="animate-pulse">...</span> : stat.value}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            <div className="grid md:grid-cols-3 gap-8">
                {/* AI Assistant Quick Access */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                    className="glass-panel p-8 md:col-span-2 relative overflow-hidden group min-h-[300px]"
                >
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Activity size={120} className="text-white" />
                    </div>
                    <div className="relative z-10">
                        <h2 className="text-xl font-bold text-white mb-4">AI Leave Assistant</h2>
                        <p className="text-slate-400 mb-8 max-w-md">
                            Ask our AI about your leave eligibility, company policies, or apply for leave using natural language.
                        </p>

                        <div className="flex bg-slate-900/50 rounded-2xl p-2 border border-white/5 focus-within:border-pink-500/30 transition-colors mb-6">
                            <input
                                type="text"
                                placeholder="I need sick leave tomorrow..."
                                className="flex-1 bg-transparent px-4 py-3 text-white outline-none"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAskAI()}
                            />
                            <button
                                onClick={handleAskAI}
                                disabled={aiLoading || !query}
                                className="bg-gradient-to-r from-pink-500 to-violet-600 text-white font-bold px-8 rounded-xl hover:opacity-90 transition-opacity whitespace-nowrap disabled:opacity-50"
                            >
                                {aiLoading ? 'Thinking...' : 'Ask AI'}
                            </button>
                        </div>

                        <AnimatePresence>
                            {aiResult && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className={`p-4 rounded-xl border ${aiResult.approved ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-amber-500/10 border-amber-500/30'}`}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className={`p-2 rounded-full ${aiResult.approved ? 'bg-emerald-500' : 'bg-amber-500'} text-white`}>
                                            {aiResult.approved ? <Clock size={16} /> : <FileText size={16} />}
                                        </div>
                                        <div>
                                            <h3 className={`font-bold ${aiResult.approved ? 'text-emerald-400' : 'text-amber-400'}`}>
                                                {aiResult.status === 'APPROVED' ? 'AI Approved - Conditions Met' : 'Escalated to HR'}
                                            </h3>
                                            <p className="text-slate-300 text-sm mt-1">
                                                {aiResult.decision_reason || aiResult.message}
                                            </p>

                                            {!aiResult.approved && aiResult.violations && (
                                                <ul className="mt-2 space-y-1">
                                                    {aiResult.violations.map((v: any, i: number) => (
                                                        <li key={i} className="text-amber-200 text-sm list-disc list-inside">
                                                            {v.message.replace("❌ ", "")}
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </motion.div>

                {/* Holiday Bank Mini */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                    className="glass-panel p-8 md:col-span-1"
                >
                    <h2 className="text-xl font-bold text-white mb-6">Holiday Bank</h2>
                    <div className="space-y-6 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {data.allBalances && data.allBalances.length > 0 ? (
                            data.allBalances.map((bal: any, idx: number) => (
                                <div key={idx} className="p-4 bg-slate-900/50 rounded-2xl border border-white/5 opacity-80 hover:opacity-100 transition-opacity">
                                    <div className="flex justify-between items-end mb-3">
                                        <span className="text-sm font-medium text-slate-400">{bal.type}</span>
                                        <span className="text-lg font-bold text-white">
                                            {Math.round(bal.available)}
                                            <span className="text-xs text-slate-500 font-normal ml-1">/ {Math.round(bal.total)}</span>
                                        </span>
                                    </div>
                                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-1000 ${bal.type.includes('Annual') ? 'bg-pink-500 shadow-[0_0_10px_rgba(236,72,153,0.5)]' :
                                                    bal.type.includes('Sick') ? 'bg-blue-500' :
                                                        'bg-cyan-500'
                                                }`}
                                            style={{ width: `${Math.min(100, Math.max(0, (bal.available / bal.total) * 100))}%` }}
                                        ></div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-slate-500 text-center py-4">Loading balances...</div>
                        )}
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
