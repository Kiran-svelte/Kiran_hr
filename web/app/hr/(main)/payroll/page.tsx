'use client';

import { useState, useEffect } from 'react';
import { getCompanyEmployees } from "@/app/actions/hr";

export default function PayrollPage() {
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        async function load() {
            try {
                const res = await getCompanyEmployees();
                if (res.success && res.employees) {
                    setEmployees(res.employees);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    // Helper to format currency
    const formatMoney = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount);
    };

    const handleRunPayroll = () => {
        setProcessing(true);
        // Simulate processing
        setTimeout(() => {
            setProcessing(false);
            alert("✅ Payroll processed successfully for " + new Date().toLocaleString('default', { month: 'long' }));
        }, 2000);
    };

    return (
        <div>
            <header className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Payroll Management</h1>
                    <p className="text-slate-400">Process salaries and view payment history</p>
                </div>
                <button
                    onClick={handleRunPayroll}
                    disabled={processing}
                    className="px-6 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold rounded-lg hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all flex items-center gap-2 disabled:opacity-50"
                >
                    {processing ? (
                        <>
                            <span className="animate-spin">⚙️</span> Processing...
                        </>
                    ) : (
                        <>
                            <span>⚡</span> Run {new Date().toLocaleString('default', { month: 'long' })} Payroll
                        </>
                    )}
                </button>
            </header>

            {loading ? (
                <div className="flex justify-center p-12">
                    <div className="w-8 h-8 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin"></div>
                </div>
            ) : (
                <div className="glass-panel overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-700 bg-slate-800/50">
                                <th className="p-4 text-slate-400 font-medium text-sm">Employee</th>
                                <th className="p-4 text-slate-400 font-medium text-sm">Role</th>
                                <th className="p-4 text-slate-400 font-medium text-sm text-right">Basic Salary</th>
                                <th className="p-4 text-slate-400 font-medium text-sm text-right">Allowances</th>
                                <th className="p-4 text-slate-400 font-medium text-sm text-right">Deductions</th>
                                <th className="p-4 text-slate-400 font-medium text-sm text-right">Net Pay</th>
                                <th className="p-4 text-slate-400 font-medium text-sm text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/50">
                            {employees.map((emp) => {
                                // Logic: Generate hypothetical salary based on position/random
                                // In a real app, this would fetch from `payroll` table
                                const base = emp.position.includes('Manager') ? 120000 :
                                    emp.position.includes('Lead') ? 95000 :
                                        emp.position.includes('Senior') ? 75000 : 45000;

                                const allowances = Math.round(base * 0.2);
                                const deductions = Math.round(base * 0.05); // Tax/PF
                                const net = base + allowances - deductions;

                                return (
                                    <tr key={emp.emp_id} className="hover:bg-slate-800/30 transition-colors">
                                        <td className="p-4 py-5">
                                            <div className="flex gap-3 items-center">
                                                <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-cyan-400">
                                                    {emp.full_name?.charAt(0)}
                                                </div>
                                                <span className="font-medium text-white">{emp.full_name}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-slate-400 text-sm">{emp.position}</td>
                                        <td className="p-4 text-slate-300 font-mono text-right">{formatMoney(base)}</td>
                                        <td className="p-4 text-emerald-400/80 font-mono text-right">+{formatMoney(allowances)}</td>
                                        <td className="p-4 text-rose-400/80 font-mono text-right">-{formatMoney(deductions)}</td>
                                        <td className="p-4 text-white font-bold font-mono text-right">{formatMoney(net)}</td>
                                        <td className="p-4 text-center">
                                            <span className="px-2 py-1 rounded bg-slate-500/10 text-slate-400 border border-slate-500/20 text-xs font-medium uppercase">
                                                Draft
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
