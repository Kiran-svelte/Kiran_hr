'use client';

import { useState, useEffect } from 'react';
import { getPerformanceOverview, getGoals, createGoal, updateGoalProgress } from "@/app/actions/performance";
import PageHeader from '@/components/ui/page-header';
import StatCard from '@/components/ui/stat-card';
import Modal from '@/components/ui/modal';
import Badge from '@/components/ui/badge';
import { Target, TrendingUp, Award, Plus } from 'lucide-react';

export default function PerformancePage() {
    const [overview, setOverview] = useState<any>(null);
    const [goals, setGoals] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [newGoal, setNewGoal] = useState({ title: '', description: '', target: '' });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [overviewRes, goalsRes] = await Promise.all([
                getPerformanceOverview(),
                getGoals()
            ]);
            
            if (overviewRes.success) setOverview(overviewRes.data);
            if (goalsRes.success) setGoals(goalsRes.goals || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateGoal = async () => {
        if (!newGoal.title) return;
        
        const res = await createGoal(newGoal);
        if (res.success) {
            setShowModal(false);
            setNewGoal({ title: '', description: '', target: '' });
            loadData();
        }
    };

    const handleUpdateProgress = async (goalId: string, progress: number) => {
        const res = await updateGoalProgress(goalId, progress);
        if (res.success) {
            loadData();
        }
    };

    return (
        <div>
            <PageHeader
                title="Performance Management"
                description="Track goals, reviews, and team performance"
                actions={
                    <button
                        onClick={() => setShowModal(true)}
                        className="px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        New Goal
                    </button>
                }
            />

            {overview && (
                <div className="grid md:grid-cols-3 gap-6 mb-8">
                    <StatCard
                        title="Total Reviews"
                        value={overview.reviewCount}
                        icon={Award}
                    />
                    <StatCard
                        title="Active Goals"
                        value={overview.goalCount}
                        icon={Target}
                    />
                    <StatCard
                        title="Pending Reviews"
                        value={overview.activeReviews}
                        icon={TrendingUp}
                        highlight={overview.activeReviews > 0}
                    />
                </div>
            )}

            {loading ? (
                <div className="flex justify-center p-12">
                    <div className="w-8 h-8 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin"></div>
                </div>
            ) : (
                <div className="glass-panel p-6">
                    <h2 className="text-xl font-bold text-white mb-4">My Goals</h2>
                    
                    {goals.length === 0 ? (
                        <div className="text-center py-12 text-slate-400">
                            No goals yet. Create your first goal to get started!
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {goals.map((goal) => (
                                <div key={goal.id} className="p-4 bg-slate-800/50 rounded-lg border border-white/5">
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <h3 className="text-white font-semibold">{goal.title}</h3>
                                            {goal.description && (
                                                <p className="text-slate-400 text-sm mt-1">{goal.description}</p>
                                            )}
                                        </div>
                                        <Badge variant={
                                            goal.status === 'achieved' ? 'approved' : 
                                            goal.status === 'on_track' ? 'in_progress' : 
                                            'pending'
                                        }>
                                            {goal.status.replace('_', ' ')}
                                        </Badge>
                                    </div>
                                    
                                    <div className="mb-2">
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="text-slate-400">Progress</span>
                                            <span className="text-white font-mono">{goal.progress}%</span>
                                        </div>
                                        <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300"
                                                style={{ width: `${goal.progress}%` }}
                                            />
                                        </div>
                                    </div>
                                    
                                    {goal.target && (
                                        <div className="text-sm text-slate-400 mt-2">
                                            Target: {goal.target}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title="Create New Goal"
                footer={
                    <div className="flex gap-3 justify-end">
                        <button
                            onClick={() => setShowModal(false)}
                            className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleCreateGoal}
                            className="px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600"
                        >
                            Create Goal
                        </button>
                    </div>
                }
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Goal Title *
                        </label>
                        <input
                            type="text"
                            value={newGoal.title}
                            onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
                            className="w-full px-4 py-2 bg-slate-800 border border-white/10 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                            placeholder="e.g., Complete project by Q2"
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Description
                        </label>
                        <textarea
                            value={newGoal.description}
                            onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })}
                            className="w-full px-4 py-2 bg-slate-800 border border-white/10 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                            rows={3}
                            placeholder="Describe your goal..."
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Target / Metric
                        </label>
                        <input
                            type="text"
                            value={newGoal.target}
                            onChange={(e) => setNewGoal({ ...newGoal, target: e.target.value })}
                            className="w-full px-4 py-2 bg-slate-800 border border-white/10 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                            placeholder="e.g., 100% completion"
                        />
                    </div>
                </div>
            </Modal>
        </div>
    );
}
