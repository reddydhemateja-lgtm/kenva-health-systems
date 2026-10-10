import React, { useState } from 'react';
import { CheckCircle2, Clock, Truck, FlaskConical, FileText, AlertCircle, ChevronDown, ChevronUp, MapPin, User, Thermometer } from 'lucide-react';

export default function SampleTimeline({ sample, timeline = [] }) {
  const [expanded, setExpanded] = useState(false);

  const STAGES = [
    { num: 1, title: 'Test Order Created', icon: FileText, desc: 'Physician issues diagnostic order' },
    { num: 2, title: 'Patient Registration Verified', icon: User, desc: 'Identity & intake check at facility' },
    { num: 3, title: 'Sample Collection', icon: FlaskConical, desc: 'Venous blood/specimen drawn into container' },
    { num: 4, title: 'Sample Registered in LIMS', icon: CheckCircle2, desc: 'Barcoded and logged into Kenva Network' },
    { num: 5, title: 'Logistics Pickup', icon: Truck, desc: 'Secure cold-chain courier dispatch' },
    { num: 6, title: 'In Transit', icon: Truck, desc: 'Monitored temperature transit to central lab' },
    { num: 7, title: 'Laboratory Received', icon: FlaskConical, desc: 'Intake inspection & centrifugation at lab' },
    { num: 8, title: 'Testing in Progress', icon: FlaskConical, desc: 'High-throughput biomarker analysis' },
    { num: 9, title: 'Testing Completed', icon: CheckCircle2, desc: 'Pathologist verification & quality check' },
    { num: 10, title: 'Report Generated & Available', icon: FileText, desc: 'Final signed PDF published to patient portal' }
  ];

  const currentStageNum = sample ? sample.current_workflow_stage : 1;

  // Build lookup map of timeline events by stage number
  const timelineMap = {};
  if (Array.isArray(timeline)) {
    timeline.forEach(t => {
      timelineMap[t.stage_number] = t;
    });
  }

  return (
    <div className="glass-card p-5 sm:p-6 rounded-2xl border border-slate-700/80">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="badge badge-info font-mono">
              {sample ? sample.sample_id : 'SMP-PENDING'}
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-teal-500/10 text-teal-400 border border-teal-500/20">
              Stage {currentStageNum} of 10
            </span>
          </div>
          <h4 className="font-heading font-bold text-lg text-white mt-1">
            Sample Diagnostic Journey
          </h4>
          {sample && (
            <p className="text-xs text-slate-400">
              Container ID: <span className="font-mono text-slate-300">{sample.container_id}</span> • Type: <span className="text-slate-300">{sample.sample_type}</span>
            </p>
          )}
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className="btn-secondary text-xs py-1.5 px-3 self-start sm:self-auto"
        >
          {expanded ? (
            <>Collapse Details <ChevronUp className="w-4 h-4" /></>
          ) : (
            <>View All 10 Workflow Steps <ChevronDown className="w-4 h-4" /></>
          )}
        </button>
      </div>

      {/* Progress Bar Overview */}
      <div className="py-6">
        <div className="relative flex items-center justify-between">
          
          {/* Background Bar */}
          <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 bg-slate-800 z-0" />
          
          {/* Active Filled Bar */}
          <div 
            className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-gradient-to-r from-teal-500 via-teal-400 to-cyan-400 z-0 transition-all duration-500" 
            style={{ width: `${((currentStageNum - 1) / 9) * 100}%` }}
          />

          {STAGES.map((st) => {
            const isCompleted = st.num < currentStageNum;
            const isCurrent = st.num === currentStageNum;
            const eventData = timelineMap[st.num];

            return (
              <div 
                key={st.num} 
                className="relative z-10 flex flex-col items-center group cursor-pointer"
                onClick={() => setExpanded(true)}
              >
                <div 
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                    isCompleted 
                      ? 'bg-teal-500 text-slate-950 ring-4 ring-slate-900 shadow-lg shadow-teal-500/20' 
                      : isCurrent 
                        ? 'bg-cyan-400 text-slate-950 ring-4 ring-cyan-400/30 scale-125 animate-pulse shadow-lg shadow-cyan-400/40' 
                        : 'bg-slate-800 text-slate-500 ring-4 ring-slate-900'
                  }`}
                >
                  {isCompleted ? <CheckCircle2 className="w-5 h-5 stroke-[2.5]" /> : st.num}
                </div>

                {/* Tooltip on hover */}
                <div className="absolute bottom-10 hidden group-hover:flex flex-col items-center whitespace-nowrap z-30">
                  <div className="bg-slate-950 border border-slate-700 text-white text-[11px] px-2.5 py-1 rounded-md shadow-xl">
                    <span className="font-semibold text-teal-400">Stage {st.num}:</span> {st.title}
                    {eventData && <span className="block text-[10px] text-slate-400">{new Date(eventData.timestamp).toLocaleTimeString()}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Current Stage Highlight Box */}
        <div className="mt-6 p-4 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-start gap-3">
          <div className="p-2 rounded-lg bg-teal-500/20 text-teal-400 mt-0.5">
            <Clock className="w-5 h-5 animate-spin" style={{ animationDuration: '6s' }} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-400">Current Workflow Stage:</span>
              <span className="text-sm font-bold text-white">{STAGES[currentStageNum - 1]?.title}</span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              {STAGES[currentStageNum - 1]?.desc}
            </p>

            {timelineMap[currentStageNum] && (
              <div className="mt-2 text-xs text-slate-400 flex flex-wrap gap-x-4 gap-y-1 pt-2 border-t border-teal-500/20">
                <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-teal-400" /> {timelineMap[currentStageNum].location}</span>
                <span className="flex items-center gap-1"><User className="w-3.5 h-3.5 text-teal-400" /> {timelineMap[currentStageNum].actor_name} ({timelineMap[currentStageNum].actor_role})</span>
                <span>Timestamp: {new Date(timelineMap[currentStageNum].timestamp).toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Expanded Timeline Steps Detailed View */}
      {expanded && (
        <div className="mt-4 pt-6 border-t border-slate-800 space-y-4 animate-fadeIn">
          <h5 className="font-semibold text-sm text-slate-200 uppercase tracking-wider">Detailed Audit Trail (10-Stage Journey)</h5>
          
          <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
            {STAGES.map((st) => {
              const eventData = timelineMap[st.num];
              const isDone = st.num <= currentStageNum;

              return (
                <div key={st.num} className="relative group">
                  <div 
                    className={`absolute -left-6 top-1 w-3.5 h-3.5 rounded-full border-2 ${
                      isDone ? 'bg-teal-400 border-teal-500 shadow-md shadow-teal-500/30' : 'bg-slate-900 border-slate-700'
                    }`} 
                  />

                  <div className={`p-3.5 rounded-xl border ${isDone ? 'bg-slate-900/60 border-slate-700/80' : 'bg-slate-950/40 border-slate-800/40 opacity-60'}`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-teal-400">Stage {st.num}</span>
                        <h6 className="font-semibold text-sm text-white">{st.title}</h6>
                      </div>

                      {eventData ? (
                        <span className="text-xs text-slate-400 font-mono">
                          {new Date(eventData.timestamp).toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-600 italic">Pending execution</span>
                      )}
                    </div>

                    <p className="text-xs text-slate-300 mt-1">{st.desc}</p>

                    {eventData && (
                      <div className="mt-2.5 pt-2 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-400">
                        <div>
                          <strong className="text-slate-300">Actioned By:</strong> {eventData.actor_name} ({eventData.actor_role})
                        </div>
                        <div>
                          <strong className="text-slate-300">Facility Location:</strong> {eventData.location}
                        </div>
                        {eventData.notes && (
                          <div className="sm:col-span-2 text-slate-300 italic bg-slate-950/60 p-2 rounded border border-slate-800/60 mt-1">
                            "{eventData.notes}"
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}
