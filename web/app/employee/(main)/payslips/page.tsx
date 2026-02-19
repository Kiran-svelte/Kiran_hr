'use client';

import { useState, useEffect } from 'react';
import { getMyPayslips } from "@/app/actions/payroll";
import PageHeader from '@/components/ui/page-header';
import Badge from '@/components/ui/badge';
import EmptyState from '@/components/ui/empty-state';
import { Wallet, Download } from 'lucide-react';

export default function PayslipsPage() {
    const [payslips, setPayslips] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const currentYear = new Date().getFullYear();
    const [selectedYear, setSelectedYear] = useState(currentYear);

    // Generate year list dynamically (current year and 2 years back)
    const availableYears = Array.from({ length: 3 }, (_, i) => currentYear - i);

    useEffect(() => {
        loadPayslips();
    }, [selectedYear]);

    const loadPayslips = async () => {
        setLoading(true);
        try {
            const res = await getMyPayslips(selectedYear);
            if (res.success) setPayslips(res.payslips || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const formatMoney = (amount: string) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(parseFloat(amount));
    };

    const getMonthName = (month: number) => {
        return new Date(2024, month - 1).toLocaleString('default', { month: 'long' });
    };

    return (
        <div>
            <PageHeader
                title="My Payslips"
                description="View and download your salary slips"
            />

            <div className="mb-6">
                <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    className="px-4 py-2 bg-slate-800 border border-white/10 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                >
                    {availableYears.map(year => (
                        <option key={year} value={year}>{year}</option>
                    ))}
                </select>
            </div>

            {loading ? (
                <div className="flex justify-center p-12">
                    <div className="w-8 h-8 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin"></div>
                </div>
            ) : payslips.length === 0 ? (
                <EmptyState
                    icon={Wallet}
                    title="No payslips available"
                    description={`No payslips found for ${selectedYear}`}
                />
            ) : (
                <div className="grid md:grid-cols-2 gap-6">
                    {payslips.map((payslip) => (
                        <div key={payslip.id} className="glass-panel p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-xl font-bold text-white">
                                        {getMonthName(payslip.month)} {payslip.year}
                                    </h3>
                                    {payslip.processed_date && (
                                        <p className="text-slate-400 text-sm mt-1">
                                            Processed on {new Date(payslip.processed_date).toLocaleDateString()}
                                        </p>
                                    )}
                                </div>
                                <Badge variant={
                                    payslip.status === 'processed' ? 'approved' : 
                                    payslip.status === 'paid' ? 'completed' : 
                                    'pending'
                                }>
                                    {payslip.status}
                                </Badge>
                            </div>
                            
                            <div className="space-y-2 mb-4">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-400">Basic Salary</span>
                                    <span className="text-white font-mono">{formatMoney(payslip.basic_salary)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-400">Allowances</span>
                                    <span className="text-green-400 font-mono">+{formatMoney(payslip.allowances)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-400">Deductions</span>
                                    <span className="text-red-400 font-mono">-{formatMoney(payslip.deductions)}</span>
                                </div>
                                <div className="h-px bg-white/10 my-2"></div>
                                <div className="flex justify-between">
                                    <span className="text-white font-semibold">Net Pay</span>
                                    <span className="text-cyan-400 font-bold font-mono text-lg">
                                        {formatMoney(payslip.net_pay)}
                                    </span>
                                </div>
                            </div>
                            
                            <button className="w-full py-2 bg-slate-800 text-cyan-400 rounded-lg hover:bg-slate-700 transition-colors flex items-center justify-center gap-2">
                                <Download className="w-4 h-4" />
                                Download PDF
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
