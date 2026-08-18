const completenessStyles = {
  complete: "bg-teal-tint text-teal border border-teal/30",
  partial: "bg-amber/10 text-amber border border-amber/30",
  very_limited: "bg-rose/10 text-rose border border-rose/30",
};

const ScreeningReport = ({ report, messages, onStartNew }) => {
  if (!report) {
    return (
      <div className="bg-white rounded-2xl border border-rose/20 shadow-sm p-6 sm:p-8 text-center">
        <p className="text-rose text-sm mb-4">Could not generate a report for this call.</p>
        <button
          onClick={onStartNew}
          className="bg-teal text-white font-medium px-6 py-2.5 rounded-full hover:bg-teal/90 transition-colors"
        >
          Start New Call
        </button>
      </div>
    );
  }

  const rows = [
    ["Patient Name", report.patientName],
    ["Main Concern", report.mainConcern],
    ["Duration", report.duration],
    ["Severity", report.severity],
    ["Related Symptoms", report.relatedSymptoms],
  ];

  return (
    <div className="bg-white rounded-2xl border border-ink/10 shadow-sm p-5 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-5 sm:mb-6">
        <h2 className="font-display text-xl sm:text-2xl font-medium">Screening Report</h2>
        <span
          className={`font-mono text-[11px] uppercase tracking-wide px-2.5 py-1 rounded-full ${
            completenessStyles[report.callCompleteness] || completenessStyles.very_limited
          }`}
        >
          {report.callCompleteness?.replace("_", " ") || "unknown"}
        </span>
      </div>

      {report.generatedVia === "fallback" && (
        <p className="text-amber text-sm mb-4 bg-amber/10 border border-amber/20 rounded-lg px-3 py-2">
          This report was generated from limited data due to a temporary issue.
        </p>
      )}

      <dl className="divide-y divide-ink/10">
        {rows.map(([label, value]) => (
          <div key={label} className="py-3 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4">
            <dt className="text-xs font-mono uppercase tracking-wide text-ink/50 sm:pt-0.5">{label}</dt>
            <dd className="text-sm sm:col-span-2">{value}</dd>
          </div>
        ))}
      </dl>

      {report.flaggedForFollowUp && (
        <div className="mt-5 bg-rose/5 border border-rose/20 rounded-lg px-4 py-3">
          <p className="text-xs font-mono uppercase tracking-wide text-rose mb-1">Flagged for Follow-up</p>
          <p className="text-sm text-ink">{report.flaggedForFollowUp}</p>
        </div>
      )}

      <div className="mt-5">
        <p className="text-xs font-mono uppercase tracking-wide text-ink/50 mb-2">Summary</p>
        <p className="text-sm leading-relaxed text-ink/90">{report.summary}</p>
      </div>

      <details className="mt-6 group">
        <summary className="cursor-pointer text-xs font-mono uppercase tracking-wide text-ink/50 hover:text-ink/80">
          View full conversation transcript
        </summary>
        <div className="mt-3 space-y-2 border-t border-ink/10 pt-3">
          {messages.map((message, index) => (
            <p key={index} className="text-sm">
              <span className="font-medium">{message.role === "user" ? "You: " : "AI: "}</span>
              <span className="text-ink/80">{message.text}</span>
            </p>
          ))}
        </div>
      </details>

      <button
        onClick={onStartNew}
        className="mt-7 w-full bg-teal text-white font-medium py-3 rounded-full hover:bg-teal/90 transition-colors"
      >
        Start New Call
      </button>
    </div>
  );
};

export default ScreeningReport;