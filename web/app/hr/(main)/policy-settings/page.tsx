"use client";

import { motion } from "framer-motion";

export default function LeavePolicyPage() {
    // Static Rules Configuration (The "Constraint Engine" View)
    const policies = [
        { name: "Max Consecutive Leaves", val: "10 Days", desc: "Hard cap on single request duration." },
        { name: "Notice Period", val: "14 Days", desc: "Minimum lead time for non-emergency leaves." },
        { name: "Probation Block", val: "90 Days", desc: "No paid leaves during probation period." },
        { name: "SLA Escalation", val: "48 Hours", desc: "Auto-escalate pending requests to Admin." },
        { name: "Min Team Staffing", val: "30%", desc: "Prevent depletion of department resources." },
        { name: "Carry Forward Cap", val: "12 Days", desc: "Max unused leaves transfer to next year." },
        { name: "Sick Leave Proof", val: ">3 Days", desc: "Medical certificate required for extended sick leave." },
        { name: "Maternity Leave", val: "26 Weeks", desc: "Standard paid maternity entitlement." },
        { name: "Paternity Leave", val: "2 Weeks", desc: "Standard paid paternity entitlement." },
        { name: "Approval Chain", val: "Manager -> HR", desc: "Two-step verification for >5 day requests." },
        { name: "Leave Types", val: "5 Types", desc: "Sick, Casual, Earned, Unpaid, Remote." },
        { name: "Blackout Dates", val: "Q4 Peak", desc: "Restricted leave during critical business periods." },
        { name: "Sandwich Rule", val: "Active", desc: "Weekends between leaves count as leave." },
        { name: "Emergency Bypass", val: "Enabled", desc: "Allow bypass of notice period for emergencies." },
    ];

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <header className="mb-8 flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Leave Policy</h1>
                    <p className="text-slate-400">Active operational constraints for your workspace.</p>
                </div>
                <div className="px-3 py-1 bg-[#00f2ff]/10 text-[#00f2ff] text-xs font-mono rounded border border-[#00f2ff]/20">
                    STATIC ENGINE v1.0
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {policies.map((policy, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="glass-panel p-6 border border-white/5 hover:border-pink-500/50 transition-all group"
                    >
                        <h4 className="text-pink-400 font-mono text-xs mb-3 uppercase tracking-wider">{policy.name}</h4>
                        <div className="text-2xl font-bold text-white mb-2 group-hover:text-pink-200 transition-colors">{policy.val}</div>
                        <p className="text-slate-500 text-sm leading-relaxed">{policy.desc}</p>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
