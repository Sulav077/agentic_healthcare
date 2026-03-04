import { useState, useEffect, useRef } from "react";

export default function App() {
  // --- Chat & Triage States ---
  const [symptoms, setSymptoms] = useState("");
  const [city, setCity] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  // --- Booking Form States ---
  const [showBookModal, setShowBookModal] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [patientName, setPatientName] = useState("");
  const [patientAge, setPatientAge] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [patientAddress, setPatientAddress] = useState("");
  const [bookingStatus, setBookingStatus] = useState(null);
  const [assignedUid, setAssignedUid] = useState(null);

  const chatContainerRef = useRef(null);

  // Auto-scroll to bottom
  useEffect(() => {
    chatContainerRef.current?.scrollTo({
      top: chatContainerRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, loading]);

  // --- Core Logic: Analyze Symptoms ---
  const analyzeSymptoms = async (e) => {
    if (e) e.preventDefault();
    if (!symptoms || !city) return;

    const userMessage = { role: "user", content: symptoms };
    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    try {
      const res = await fetch("http://127.0.0.1:8000/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symptoms, city }),
      });
      const result = await res.json();

      const aiMessage = {
        role: "assistant",
        content: {
          urgency: result.triage.urgency,
          specialty: result.triage.specialty,
          reasoning: result.triage.reasoning,
          doctors: result.doctors,
        },
      };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (err) {
      console.error("Analysis Error:", err);
    }
    setLoading(false);
    setSymptoms("");
  };

  // --- Core Logic: Handle Booking Modal ---
  const handleOpenBooking = (doctor) => {
    setSelectedDoctor(doctor);
    setShowBookModal(true);
    setBookingStatus(null);
    setAssignedUid(null);
  };

  const submitBooking = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch("http://127.0.0.1:8000/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_name: patientName,
          patient_age: parseInt(patientAge),
          patient_phone: patientPhone,
          patient_address: patientAddress,
          doctor: selectedDoctor,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setAssignedUid(result.patient_uid);
        setBookingStatus("success");
      } else {
        setBookingStatus("error");
      }
    } catch (error) {
      setBookingStatus("error");
    }
    setLoading(false);
  };

  return (
    <div className="h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <div className="bg-teal-600 p-2 rounded-lg text-white font-bold text-xl">
            ✚
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800 leading-tight">
              MedAgent AI
            </h1>
            <p className="text-xs text-teal-600 font-medium">
              Agentic Indian Healthcare System
            </p>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-hidden flex flex-col max-w-5xl w-full mx-auto bg-white shadow-xl my-4 rounded-2xl border border-slate-200">
        {/* Help Banner */}
        {messages.length === 0 && (
          <div className="p-8 text-center bg-teal-50 border-b border-teal-100">
            <h2 className="text-xl font-semibold text-teal-800 mb-2">
              Welcome to your AI Health Assistant
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto text-sm">
              Please provide your symptoms and city. We will analyze the
              clinical urgency, recommend the right specialist, and provide
              verified contact details for immediate booking.
            </p>
          </div>
        )}

        {/* Chat Messages */}
        <div
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto p-6 space-y-8 scroll-smooth"
        >
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "user" ? (
                <div className="bg-slate-800 text-white px-5 py-3 rounded-2xl rounded-tr-none shadow-md max-w-md">
                  {msg.content}
                </div>
              ) : (
                <div className="max-w-3xl w-full space-y-4">
                  {/* Triage Report Card */}
                  <div className="bg-white border-l-4 border-teal-500 shadow-sm p-5 rounded-r-2xl border-y border-r border-slate-100">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">
                        Medical Analysis
                      </span>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${msg.content.urgency?.toLowerCase() === "emergency" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}
                      >
                        {msg.content.urgency}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-800">
                      {msg.content.specialty} Department
                    </h3>
                    <p className="text-slate-600 text-sm mt-1 italic">
                      "{msg.content.reasoning}"
                    </p>
                  </div>

                  {/* Doctor List */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {msg.content.doctors?.map((doctor, i) => (
                      <div
                        key={i}
                        className="bg-slate-50 border border-slate-200 rounded-xl p-4 hover:border-teal-300 transition-all"
                      >
                        <div className="flex justify-between">
                          <h4 className="font-bold text-slate-800">
                            {doctor.name}
                          </h4>
                          <span className="text-amber-500 font-bold text-sm">
                            ★ {doctor.rating}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          {doctor.hospital}
                        </p>

                        <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                          <div>
                            <strong>Fee:</strong> ₹{doctor.fees_inr || "800"}
                          </div>
                          <div>
                            <strong>Exp:</strong>{" "}
                            {doctor.experience_years || "10"} Yrs
                          </div>
                          <div className="col-span-2 font-mono text-teal-700">
                            ☏ {doctor.phone}
                          </div>
                        </div>

                        <button
                          onClick={() => handleOpenBooking(doctor)}
                          className="w-full mt-4 bg-white border border-slate-300 text-slate-700 py-2 rounded-lg text-xs font-bold hover:bg-teal-600 hover:text-white transition-all"
                        >
                          BOOK APPOINTMENT
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="text-teal-600 text-sm font-medium animate-pulse">
              AI is processing your clinical report...
            </div>
          )}
        </div>

        {/* Search Bar */}
        <form
          onSubmit={analyzeSymptoms}
          className="bg-slate-50 border-t border-slate-200 p-4"
        >
          <div className="flex gap-3 max-w-4xl mx-auto">
            <input
              required
              type="text"
              placeholder="City"
              className="border border-slate-300 rounded-xl px-4 py-3 w-32 focus:ring-2 focus:ring-teal-500 outline-none text-sm bg-white"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
            <input
              required
              type="text"
              placeholder="Describe symptoms..."
              className="flex-1 border border-slate-300 rounded-xl px-5 py-3 focus:ring-2 focus:ring-teal-500 outline-none text-sm bg-white"
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-teal-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-teal-700 transition-all disabled:opacity-50"
            >
              ANALYZE
            </button>
          </div>
        </form>
      </main>

      {/* Booking Form Modal */}
      {showBookModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
            <h2 className="text-2xl font-bold text-slate-800 mb-2 text-center">
              Patient Information
            </h2>
            <p className="text-slate-500 text-sm text-center mb-6 border-b pb-4">
              Booking with {selectedDoctor?.name}
            </p>

            <form onSubmit={submitBooking} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
                  Full Name
                </label>
                <input
                  required
                  type="text"
                  className="w-full border rounded-xl p-3 focus:ring-2 focus:ring-teal-500 outline-none"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
                    Age
                  </label>
                  <input
                    required
                    type="number"
                    className="w-full border rounded-xl p-3 focus:ring-2 focus:ring-teal-500 outline-none"
                    value={patientAge}
                    onChange={(e) => setPatientAge(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
                    Phone
                  </label>
                  <input
                    required
                    type="tel"
                    className="w-full border rounded-xl p-3 focus:ring-2 focus:ring-teal-500 outline-none"
                    value={patientPhone}
                    onChange={(e) => setPatientPhone(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
                  Full Address
                </label>
                <textarea
                  required
                  className="w-full border rounded-xl p-3 focus:ring-2 focus:ring-teal-500 outline-none text-sm"
                  rows="2"
                  value={patientAddress}
                  onChange={(e) => setPatientAddress(e.target.value)}
                />
              </div>

              {bookingStatus === "success" && (
                <div className="bg-teal-50 p-4 rounded-xl border border-teal-200">
                  <p className="text-teal-800 font-bold text-center">
                    ✓ Appointment Confirmed!
                  </p>
                  <p className="text-xs text-teal-600 text-center mt-1">
                    Patient ID:{" "}
                    <span className="font-mono text-slate-900 font-bold">
                      {assignedUid}
                    </span>
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowBookModal(false)}
                  className="flex-1 px-4 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition"
                >
                  CANCEL
                </button>
                {!assignedUid && (
                  <button
                    type="submit"
                    className="flex-1 bg-teal-600 text-white px-4 py-3 rounded-xl font-bold hover:bg-teal-700 shadow-lg shadow-teal-200"
                  >
                    CONFIRM
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
