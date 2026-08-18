const IdleCall = ({ onStart }) => (
  <div className="bg-white rounded-2xl border border-ink/10 shadow-sm p-6 sm:p-10 flex flex-col items-center text-center gap-4">
    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-teal-tint flex items-center justify-center text-teal text-2xl">
      ●
    </div>
    <p className="text-ink/70 max-w-sm text-sm sm:text-base">
      A short voice call to gather your basic health details before your visit. Takes about two minutes.
    </p>
    <button
      onClick={onStart}
      className="mt-2 bg-teal text-white font-medium px-8 py-3 rounded-full hover:bg-teal/90 transition-colors"
    >
      Start Call
    </button>
  </div>
);

export default IdleCall;