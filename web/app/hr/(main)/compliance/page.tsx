'use client';

import { useState, useEffect } from 'react';
import { getComplianceDashboard, getPolicies } from "@/app/actions/compliance";
import PageHeader from '@/components/ui/page-header';
import StatCard from '@/components/ui/stat-card';
import Badge from '@/components/ui/badge';
import { Shield, AlertTriangle, CheckCircle, FileText } from 'lucide-react';

export default function CompliancePage() {
    const [dashboard, setDashboard] = useState<any>(null);
    const [policies, setPolicies] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [dashRes, policyRes] = await Promise.all([
                getComplianceDashboard(),
                getPolicies()
            ]);
            
            if (dashRes.success) setDashboard(dashRes.data);
            if (policyRes.success) setPolicies(policyRes.policies || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const getRiskLevel = (score: number) => {
        if (score < 25) return { label: 'Low', color: 'text-green-400' };
        if (score < 50) return { label: 'Medium', color: 'text-yellow-400' };
        if (score < 75) return { label: 'High', color: 'text-orange-400' };
        return { label: 'Critical', color: 'text-red-400' };
    };

    return (
        <div>
            <PageHeader
                title="Compliance Dashboard"
                description="Monitor policy compliance and regulatory requirements"
            />

            {dashboard && (
                <>
                    <div className="glass-panel p-8 mb-8 text-center">
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-r from-cyan-500/20 to-blue-500/20 mb-4">
                            <Shield className="w-10 h-10 text-cyan-400" />
                        </div>
                        <div className={`text-6xl font-bold mb-2 ${getRiskLevel(dashboard.riskScore).color}`}>
                            {dashboard.riskScore}
                        </div>
                        <div className="text-xl text-slate-300 mb-1">Compliance Risk Score</div>
                        <div className={`text-sm font-semibold ${getRiskLevel(dashboard.riskScore).color}`}>
                            {getRiskLevel(dashboard.riskScore).label} Risk
                        </div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6 mb-8">
                        <StatCard
                            title="Active Policies"
                            value={dashboard.activePolicies}
                            icon={FileText}
                        />
                        <StatCard
                            title="Total Employees"
                            value={dashboard.totalEmployees}
                            icon={CheckCircle}
                        />
                        <StatCard
                            title="Attestation Rate"
                            value={`${dashboard.attestationRate}%`}
                            icon={AlertTriangle}
                            highlight={dashboard.attestationRate < 80}
                        />
                    </div>
                </>
            )}

            {loading ? (
                <div className="flex justify-center p-12">
                    <div className="w-8 h-8 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin"></div>
                </div>
            ) : (
                <div className="glass-panel p-6">
                    <h2 className="text-xl font-bold text-white mb-4">Active Policies</h2>
                    
                    {policies.length === 0 ? (
                        <div className="text-center py-12 text-slate-400">
                            No policies configured yet
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {policies.map((policy) => (
                                <div key={policy.id} className="p-4 bg-slate-800/50 rounded-lg border border-white/5">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="text-white font-semibold">{policy.title}</h3>
                                            <p className="text-slate-400 text-sm mt-1">{policy.description}</p>
                                        </div>
                                        <Badge variant={policy.has_acknowledged ? 'approved' : 'pending'}>
                                            {policy.has_acknowledged ? 'Acknowledged' : 'Pending'}
                                        </Badge>
                                    </div>
                                    
                                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                                        <span className="text-sm text-slate-400">
                                            Version {policy.version}
                                        </span>
                                        <span className="text-sm text-slate-400">
                                            {policy.total_attestations} employees acknowledged
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
