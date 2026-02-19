"use client";

import { useState, useEffect } from "react";
import { getCompanyPolicy, updateLeaveQuotas, updateWorkingHours, updateHolidays, updateBlackoutDates } from "@/app/actions/policy";
import { Settings, Calendar, Clock, Shield, Plus, Trash2, Save, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

export default function PolicySettingsPage() {
  const [policy, setPolicy] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'quotas' | 'hours' | 'holidays' | 'blackout'>('quotas');
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const [leaveQuotas, setLeaveQuotas] = useState<Record<string, number>>({});
  const [workingHours, setWorkingHours] = useState<any>({});
  const [holidays, setHolidays] = useState<Array<{ date: string; name: string }>>([]);
  const [blackoutDates, setBlackoutDates] = useState<Array<{ start: string; end: string; reason: string }>>([]);

  useEffect(() => {
    loadPolicy();
  }, []);

  const loadPolicy = async () => {
    setLoading(true);
    const result = await getCompanyPolicy();
    if (result.success && result.policy) {
      setPolicy(result.policy);
      setCompany(result.company);
      const rules = result.policy.rules as any;
      setLeaveQuotas(rules.leave_quotas || {});
      setWorkingHours(rules.working_hours || {});
      setHolidays(rules.holidays || []);
      setBlackoutDates(rules.blackout_dates || []);
    }
    setLoading(false);
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleSaveQuotas = async () => {
    if (!policy) return;
    setSaving(true);
    const result = await updateLeaveQuotas(policy.id, leaveQuotas);
    setSaving(false);
    if (result.success) {
      showMessage('success', 'Leave quotas updated');
      loadPolicy();
    }
  };

  const handleSaveHours = async () => {
    if (!policy) return;
    setSaving(true);
    const result = await updateWorkingHours(policy.id, workingHours);
    setSaving(false);
    if (result.success) showMessage('success', 'Working hours updated');
  };

  const handleSaveHolidays = async () => {
    if (!policy) return;
    setSaving(true);
    const result = await updateHolidays(policy.id, holidays);
    setSaving(false);
    if (result.success) showMessage('success', 'Holidays updated');
  };

  const handleSaveBlackout = async () => {
    if (!policy) return;
    setSaving(true);
    const result = await updateBlackoutDates(policy.id, blackoutDates);
    setSaving(false);
    if (result.success) showMessage('success', 'Blackout dates updated');
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div></div>;
  }

  return (
    <div className="min-h-screen">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <Settings className="w-8 h-8 text-cyan-500" />
          Policy Settings
        </h1>
        <p className="text-slate-400">Configure leave policies for {company?.name}</p>
      </header>

      {message && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg ${message.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
          <p className="text-white">{message.text}</p>
        </motion.div>
      )}

      <div className="flex gap-2 mb-6 border-b border-white/10 pb-4">
        {[
          { id: 'quotas', label: 'Leave Quotas', icon: Shield },
          { id: 'hours', label: 'Working Hours', icon: Clock },
          { id: 'holidays', label: 'Holidays', icon: Calendar },
          { id: 'blackout', label: 'Blackout', icon: AlertCircle }
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 ${activeTab === tab.id ? 'bg-cyan-500 text-white' : 'text-slate-400'}`}>
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="glass-panel p-8">
        {activeTab === 'quotas' && (
          <div>
            <h2 className="text-xl font-bold text-white mb-6">Annual Leave Quotas</h2>
            <div className="space-y-4">
              {Object.entries(leaveQuotas).map(([type, days]) => (
                <div key={type} className="flex items-center gap-4 bg-black/20 p-4 rounded-lg">
                  <div className="flex-1">
                    <label className="text-slate-400 text-sm">{type}</label>
                    <input type="number" value={days}
                      onChange={(e) => setLeaveQuotas({ ...leaveQuotas, [type]: parseInt(e.target.value) || 0 })}
                      className="w-full bg-black/40 border border-white/10 rounded px-4 py-2 text-white" />
                  </div>
                  <div className="text-slate-500 text-sm">days/year</div>
                </div>
              ))}
            </div>
            <button onClick={handleSaveQuotas} disabled={saving}
              className="mt-6 px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg flex items-center gap-2">
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        )}

        {activeTab === 'hours' && (
          <div>
            <h2 className="text-xl font-bold text-white mb-6">Working Hours</h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-slate-400 text-sm">Check-In</label>
                <input type="time" value={workingHours.check_in || '09:00'}
                  onChange={(e) => setWorkingHours({ ...workingHours, check_in: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded px-4 py-2 text-white" />
              </div>
              <div>
                <label className="text-slate-400 text-sm">Check-Out</label>
                <input type="time" value={workingHours.check_out || '18:00'}
                  onChange={(e) => setWorkingHours({ ...workingHours, check_out: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded px-4 py-2 text-white" />
              </div>
            </div>
            <button onClick={handleSaveHours} disabled={saving}
              className="mt-6 px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg flex items-center gap-2">
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        )}

        {activeTab === 'holidays' && (
          <div>
            <h2 className="text-xl font-bold text-white mb-6">Public Holidays</h2>
            <div className="space-y-4">
              {holidays.map((h, i) => (
                <div key={i} className="grid grid-cols-2 gap-4 bg-black/20 p-4 rounded-lg">
                  <input type="date" value={h.date}
                    onChange={(e) => { const u = [...holidays]; u[i].date = e.target.value; setHolidays(u); }}
                    className="bg-black/40 border border-white/10 rounded px-4 py-2 text-white" />
                  <input type="text" value={h.name} placeholder="Holiday Name"
                    onChange={(e) => { const u = [...holidays]; u[i].name = e.target.value; setHolidays(u); }}
                    className="bg-black/40 border border-white/10 rounded px-4 py-2 text-white" />
                </div>
              ))}
            </div>
            <button onClick={() => setHolidays([...holidays, { date: '', name: '' }])}
              className="mt-4 px-4 py-2 bg-purple-500 text-white rounded-lg flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add Holiday
            </button>
            <button onClick={handleSaveHolidays} disabled={saving}
              className="mt-6 px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg flex items-center gap-2">
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        )}

        {activeTab === 'blackout' && (
          <div>
            <h2 className="text-xl font-bold text-white mb-6">Blackout Periods</h2>
            <p className="text-slate-400 text-sm mb-4">Periods when leaves are not allowed</p>
            <div className="space-y-4">
              {blackoutDates.map((p, i) => (
                <div key={i} className="grid grid-cols-3 gap-4 bg-black/20 p-4 rounded-lg">
                  <input type="date" value={p.start}
                    onChange={(e) => { const u = [...blackoutDates]; u[i].start = e.target.value; setBlackoutDates(u); }}
                    className="bg-black/40 border border-white/10 rounded px-4 py-2 text-white" />
                  <input type="date" value={p.end}
                    onChange={(e) => { const u = [...blackoutDates]; u[i].end = e.target.value; setBlackoutDates(u); }}
                    className="bg-black/40 border border-white/10 rounded px-4 py-2 text-white" />
                  <input type="text" value={p.reason} placeholder="Reason"
                    onChange={(e) => { const u = [...blackoutDates]; u[i].reason = e.target.value; setBlackoutDates(u); }}
                    className="bg-black/40 border border-white/10 rounded px-4 py-2 text-white" />
                </div>
              ))}
            </div>
            <button onClick={() => setBlackoutDates([...blackoutDates, { start: '', end: '', reason: '' }])}
              className="mt-4 px-4 py-2 bg-purple-500 text-white rounded-lg flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add Blackout
            </button>
            <button onClick={handleSaveBlackout} disabled={saving}
              className="mt-6 px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg flex items-center gap-2">
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
