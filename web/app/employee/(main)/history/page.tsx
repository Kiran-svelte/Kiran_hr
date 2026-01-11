'use client';

import { useState, useEffect } from 'react';
import { getLeaveHistory } from "@/app/actions/employee";

export default function HistoryPage() {
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            const res = await getLeaveHistory();
            if (res.success && res.requests) {
                setRequests(res.requests);
            }
            setLoading(false);
        }
        load();
    }, []);

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'approved': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
            case 'rejected': return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
            case 'escalated': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
            default: return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
        }
    };

    return (
        <div className="max-w-6xl mx-auto">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">My Leave History</h1>
                <p className="text-slate-400">Track status and details of all your leave requests.</p>
            </header>

            {loading ? (
                <div className="glass-panel p-12 flex justify-center">
                    <div className="w-8 h-8 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin"></div>
                </div>
            ) : requests.length > 0 ? (
                <div className="glass-panel overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-700 bg-slate-800/50">
                                <th className="p-4 text-slate-400 font-medium text-sm">Leave Type</th>
                                <th className="p-4 text-slate-400 font-medium text-sm">Dates</th>
                                <th className="p-4 text-slate-400 font-medium text-sm">Duration</th>
                                <th className="p-4 text-slate-400 font-medium text-sm">Reason</th>
                                <th className="p-4 text-slate-400 font-medium text-sm text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/50">
                            {requests.map((req) => (
                                <tr key={req.id} className="hover:bg-slate-800/30 transition-colors">
                                    <td className="p-4 font-medium text-white">{req.type}</td>
                                    <td className="p-4 text-slate-300 text-sm">
                                        {new Date(req.start_date).toLocaleDateString()} - {new Date(req.end_date).toLocaleDateString()}
                                    </td>
                                    <td className="p-4 text-slate-300 text-sm">{req.total_days} days</td>
                                    <td className="p-4 text-slate-400 text-sm italic">"{req.reason}"</td>
                                    <td className="p-4 text-center">
                                        <span className={`px-2 py-1 rounded text-xs font-bold uppercase border ${getStatusColor(req.status)}`}>
                                            {req.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="glass-panel p-16 text-center border-dashed">
                    <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-2xl">📅</span>
                    </div>
                    <h3 className="text-lg font-bold text-white mb-1">No Leave History</h3>
                    <p className="text-slate-500">You haven't submitted any leave requests yet.</p>
                </div>
            )}
        </div>
    );
}
