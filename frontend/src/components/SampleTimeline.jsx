import React, { useState } from 'react';
import { 
  CheckCircle2, Clock, Truck, FlaskConical, FileText, AlertCircle, 
  ChevronDown, ChevronUp, MapPin, User, Thermometer, Phone, ShieldCheck, Download
} from 'lucide-react';

export default function SampleTimeline({ appointment, sample, timeline = [], onOpenReport }) {
  const [expanded, setExpanded] = useState(true);

  const STAGES = [
    { num: 1, title: 'Appointment Requested', icon: FileText, desc: 'Patient submitted appointment request' },
    { num: 2, title: 'Appointment Confirmed', icon: CheckCircle2, desc: 'Hospital confirmed diagnostic booking' },
    { num: 3, title: 'Sample Collection Scheduled', icon: Clock, desc: 'Collection window & instructions prepared' },
    { num: 4, title: 'Sample Collector Assigned', icon: User, desc: 'Authorized phlebotomist assigned to patient' },
    { num: 5, title: 'Sample Collected', icon: FlaskConical, desc: 'Specimen collected in barcoded container' },
    { num: 6, title: 'Sample Picked Up for Transport', icon: Truck, desc: 'Cold-chain courier intake & dispatch' },
    { num: 7, title: 'Sample in Transit', icon: Truck, desc: 'Monitored temperature transit to central lab' },
    { num: 8, title: 'Sample Received by Laboratory', icon: FlaskConical, desc: 'Intake inspection & centrifugation at lab' },
    { num: 9, title: 'Testing in Progress', icon: FlaskConical, desc: 'Biomarker assay & automated analyzer processing' },
    { num: 10, title: 'Report Ready', icon: ShieldCheck, desc: 'Pathologist verification & clinical sign-off' },
    { num: 11, title: 'Report Available to Patient', icon: FileText, desc: 'Final signed PDF report published to portal' }
  ];

  // Calculate current stage number based on appointment or sample status
  let currentStageNum = 1;
  if (sample && sample.current_workflow_stage) {
    currentStageNum = sample.current_workflow_stage;
  } else if (appointment) {
    if (appointment.status === 'CONFIRMED') currentStageNum = 2;
    else if (appointment.status === 'COLLECTION_SCHEDULED') currentStageNum = 3;
    else if (appointment.status === 'COLLECTOR_ASSIGNED') currentStageNum = 4;
    else if (appointment.status === 'SAMPLE_COLLECTED') currentStageNum = 5;
    else if (appointment.status === 'COMPLETED') currentStageNum = 11;
  }

  // Lookup map of timeline records
  const timelineMap = {};
  if (Array.isArray(timeline)) {
    timeline.forEach(t => {
      timelineMap[t.stage_number] = t;
    });
  }

  const collectorInfo = appointment?.collector_info;

  return (
    <div className="glass-card p-5 sm:p-6 rounded-2xl border border-slate-700/80 bg-slate-900/90 shadow-xl space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="badge badge-info font-mono">
              {sample ? sample.sample_id : appointment?.appointment_id || 'KEN-LIVE'}
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-teal-500/10 text-teal-400 border border-teal-500/20">
              Stage {currentStageNum} of 11: {STAGES.find(s => s.num === currentStageNum)?.title}
            </span>
          </div>
          <h4 className="font-heading font-bold text-lg text-white mt-1">
            Live Specimen Tracking Timeline
          </h4>
          <p className="text-xs text-slate-400">
            Real-time telemetry and workflow status synchronized with clinical hospital staff.
          </p>
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className="btn-secondary text-xs py-1.5 px-3 self-start sm:self-auto cursor-pointer"
        >
          {expanded ? (
            <>Collapse Details <ChevronUp className="w-4 h-4 ml-1 inline" /></>
          ) : (
            <>View All 11 Stages <ChevronDown className="w-4 h-4 ml-1 inline" /></>
          )}
        </button>
      </div>

      {/* Collector Details Callout (Stage 4+) */}
      {collectorInfo && (
        <div className="p-4 rounded-xl bg-teal-500/10 border border-teal-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-teal-500/20 border border-teal-500/40 text-teal-300 flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-mono uppercase text-teal-400 font-bold">Assigned Sample Collector</div>
              <div className="text-sm font-bold text-white">{collectorInfo.name}</div>
              <div className="text-xs text-slate-300">{collectorInfo.role || 'Certified Phlebotomist'}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-teal-300 bg-slate-900/80 px-3 py-1.5 rounded-lg border border-teal-500/20">
            <Phone className="w-3.5 h-3.5 text-teal-400" />
            <span className="font-mono">{collectorInfo.phone}</span>
          </div>
        </div>
      )}

      {/* Progress Bar Overview */}
      <div className="py-2">
        <div className="relative flex items-center justify-between">
          <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 bg-slate-800 z-0" />
          <div 
            className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-teal-500 z-0 transition-all duration-500" 
            style={{ width: `${Math.min(100, Math.max(0, ((currentStageNum - 1) / 10) * 100))}%` }}
          />

          {STAGES.map((st) => {
            const isCompleted = st.num < currentStageNum;
            const isCurrent = st.num === currentStageNum;
            const eventData = timelineMap[st.num];
            const isSkipped = eventData?.is_skipped;

            return (
              <div 
                key={st.num} 
                className="relative z-10 flex flex-col items-center group cursor-pointer"
                title={`${st.num}. ${st.title}`}
                onClick={() => setExpanded(true)}
              >
                <div 
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                    isSkipped
                      ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-400/50'
                      : isCompleted 
                        ? 'bg-teal-500 text-slate-950 ring-2 ring-slate-900' 
                        : isCurrent 
                          ? 'bg-cyan-400 text-slate-950 ring-4 ring-cyan-400/30 scale-110 shadow-lg shadow-cyan-400/40' 
                          : 'bg-slate-800 text-slate-500 ring-2 ring-slate-900'
                  }`}
                >
                  {isSkipped ? 'S' : isCompleted ? <CheckCircle2 className="w-4 h-4 stroke-[2.5]" /> : st.num}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detailed Stage Steps List */}
      {expanded && (
        <div className="space-y-3 pt-2">
          {STAGES.map((st) => {
            const isCompleted = st.num < currentStageNum;
            const isCurrent = st.num === currentStageNum;
            const eventData = timelineMap[st.num];
            const isSkipped = eventData?.is_skipped;

            return (
              <div
                key={st.num}
                className={`p-3.5 rounded-xl border transition-all ${
                  isSkipped
                    ? 'border-amber-500/30 bg-amber-500/5'
                    : isCurrent
                      ? 'border-cyan-400/50 bg-cyan-500/10 shadow-md'
                      : isCompleted
                        ? 'border-teal-500/30 bg-teal-500/5'
                        : 'border-slate-800 bg-slate-950/40 opacity-50'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg mt-0.5 ${
                      isSkipped
                        ? 'bg-amber-500/20 text-amber-300'
                        : isCurrent
                          ? 'bg-cyan-400/20 text-cyan-300'
                          : isCompleted
                            ? 'bg-teal-500/20 text-teal-300'
                            : 'bg-slate-800 text-slate-500'
                    }`}>
                      <st.icon className="w-4 h-4" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">
                          Stage {st.num}: {st.title}
                        </span>
                        {isSkipped && (
                          <span className="badge badge-pending text-[10px] py-0.5 px-1.5">
                            Skipped
                          </span>
                        )}
                        {isCurrent && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-400 text-slate-950 uppercase tracking-wider animate-pulse">
                            Active
                          </span>
                        )}
                        {isCompleted && !isSkipped && (
                          <span className="badge badge-approved text-[10px] py-0.5 px-1.5">
                            Completed
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-300 mt-1">
                        {eventData?.notes || st.desc}
                      </p>

                      {/* Display recorded reason if skipped */}
                      {isSkipped && eventData?.skip_reason && (
                        <p className="text-xs text-amber-300 mt-1 font-medium">
                          Recorded Reason: {eventData.skip_reason}
                        </p>
                      )}

                      {/* Action for Stage 11 */}
                      {st.num === 11 && currentStageNum === 11 && onOpenReport && (
                        <button
                          onClick={onOpenReport}
                          className="mt-2 btn-teal text-xs py-1.5 px-3 flex items-center gap-1.5 cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" /> View & Download Diagnostic Report
                        </button>
                      )}
                    </div>
                  </div>

                  {eventData?.timestamp && (
                    <div className="text-right text-[11px] text-slate-400 shrink-0">
                      <div>{new Date(eventData.timestamp).toLocaleDateString()}</div>
                      <div>{new Date(eventData.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
