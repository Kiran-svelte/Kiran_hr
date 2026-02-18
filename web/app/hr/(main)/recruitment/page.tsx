'use client';

import { useState, useEffect } from 'react';
import { getJobPostings, getCandidates } from "@/app/actions/recruitment";
import PageHeader from '@/components/ui/page-header';
import Badge from '@/components/ui/badge';
import EmptyState from '@/components/ui/empty-state';
import { Briefcase, Plus } from 'lucide-react';

export default function RecruitmentPage() {
    const [jobs, setJobs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const res = await getJobPostings();
            if (res.success) setJobs(res.jobs || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <PageHeader
                title="Recruitment Pipeline"
                description="Manage job postings and candidate applications"
                actions={
                    <button className="px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors flex items-center gap-2">
                        <Plus className="w-4 h-4" />
                        Post New Job
                    </button>
                }
            />

            {loading ? (
                <div className="flex justify-center p-12">
                    <div className="w-8 h-8 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin"></div>
                </div>
            ) : jobs.length === 0 ? (
                <EmptyState
                    icon={Briefcase}
                    title="No job postings yet"
                    description="Create your first job posting to start recruiting"
                    action={{
                        label: "Post a Job",
                        onClick: () => alert("Job posting modal would open here")
                    }}
                />
            ) : (
                <div className="grid md:grid-cols-2 gap-6">
                    {jobs.map((job) => (
                        <div key={job.id} className="glass-panel p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-xl font-bold text-white">{job.title}</h3>
                                    <p className="text-slate-400 text-sm mt-1">
                                        {job.department} • {job.location} • {job.employment_type}
                                    </p>
                                </div>
                                <Badge variant={job.status === 'active' ? 'active' : 'inactive'}>
                                    {job.status}
                                </Badge>
                            </div>
                            
                            <div className="flex items-center justify-between pt-4 border-t border-white/10">
                                <div className="text-sm text-slate-400">
                                    <span className="text-white font-semibold">{job.candidate_count}</span> candidates
                                </div>
                                <button className="text-cyan-400 hover:text-cyan-300 text-sm font-medium">
                                    View Details →
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
