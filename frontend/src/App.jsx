import { useState, useEffect, useRef } from "react";
import "./App.css";

const API_BASE = "http://127.0.0.1:8000";

const urgencyBadgeClasses = {
  emergency: "bg-rose-50 text-rose-700 border-rose-200",
  urgent: "bg-amber-50 text-amber-700 border-amber-200",
  normal: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

const urgencyLabels = {
  emergency: "Emergency care",
  urgent: "Priority review",
  normal: "Routine care",
};

export default function App() {
  const [symptoms, setSymptoms] = useState("");
  const [city, setCity] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [triageSession, setTriageSession] = useState(null);

  const [showBookModal, setShowBookModal] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [patientName, setPatientName] = useState("");
  const [patientAge, setPatientAge] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [patientAddress, setPatientAddress] = useState("");
  const [bookingStatus, setBookingStatus] = useState(null);
  const [assignedUid, setAssignedUid] = useState(null);

  const chatContainerRef = useRef(null);

  useEffect(() => {
    chatContainerRef.current?.scrollTo({
      top: chatContainerRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, loading]);

  const appendFinalMessage = (result) => {
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: {
          type: "final",
          urgency: result.triage.urgency,
          specialty: result.triage.specialty,
          reasoning: result.triage.reasoning,
          emergencyAdvice: result.triage.emergency_advice,
          doctors: result.doctors,
        },
      },
    ]);
  };

  const analyzeSymptoms = async (e) => {
    if (e) e.preventDefault();
    if (!symptoms) return;
    if (!triageSession && !city) return;

    const userMessage = { role: "user", content: symptoms };
    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    if (triageSession) {
      const currentQuestion =
        triageSession.questions[triageSession.currentQuestionIndex];
      const updatedAnswers = [
        ...triageSession.answers,
        { question: currentQuestion, answer: symptoms },
      ];

      const hasMoreQuestions =
        triageSession.currentQuestionIndex < triageSession.questions.length - 1;

      if (hasMoreQuestions) {
        const nextIndex = triageSession.currentQuestionIndex + 1;
        const nextQuestion = triageSession.questions[nextIndex];

        setTriageSession((prev) => ({
          ...prev,
          currentQuestionIndex: nextIndex,
          answers: updatedAnswers,
        }));

        const nextStep = nextIndex + 1;
        const questionLead =
          nextStep === triageSession.questions.length
            ? "Thank you. One last question to make the recommendation safer."
            : "Thank you. I need one more detail before I suggest the right care.";

        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: {
              type: "question",
              question: nextQuestion,
              step: nextStep,
              total: triageSession.questions.length,
              reasoning: questionLead,
            },
          },
        ]);

        setLoading(false);
        setSymptoms("");
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/triage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            symptoms: triageSession.initialSymptoms,
            city: triageSession.city,
            follow_up_answers: updatedAnswers,
          }),
        });
        const result = await res.json();
        appendFinalMessage(result);
        setTriageSession(null);
      } catch (err) {
        console.error("Final Triage Error:", err);
      }

      setLoading(false);
      setSymptoms("");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/triage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symptoms, city }),
      });
      const result = await res.json();

      if (result.status === "follow_up") {
        const questions = result.triage.follow_up_questions || [];
        if (questions.length > 0) {
          setTriageSession({
            initialSymptoms: symptoms,
            city,
            questions,
            currentQuestionIndex: 0,
            answers: [],
          });

          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: {
                type: "question",
                question: questions[0],
                step: 1,
                total: questions.length,
                reasoning: result.triage.reasoning,
              },
            },
          ]);
        }
      } else {
        appendFinalMessage(result);
      }
    } catch (err) {
      console.error("Analysis Error:", err);
    }

    setLoading(false);
    setSymptoms("");
  };

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
      const response = await fetch(`${API_BASE}/book`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_name: patientName,
          patient_age: parseInt(patientAge, 10),
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
    <div className="app-shell min-h-screen p-3 md:p-6 text-slate-800">
      <div className="mesh-bg" />

      <div className="relative z-10 max-w-7xl mx-auto">
        <header className="glass-panel px-5 py-4 md:px-7 md:py-5 mb-4 md:mb-5 rise-in">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-400 flex items-center justify-center text-white font-extrabold text-xl shadow-sm">
                +
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">
                  MedAgent AI
                </h1>
                <p className="text-xs md:text-sm text-slate-500">
                  Personal triage guidance and doctor recommendations
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs md:text-sm">
              <span className="px-3 py-1 rounded-full border border-teal-200 bg-teal-50 text-teal-700">
                {triageSession ? "Review in progress" : "Ready"}
              </span>
              <span className="px-3 py-1 rounded-full border border-slate-200 bg-white text-slate-500">
                City: {city || "Not set"}
              </span>
            </div>
          </div>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-5">
          <aside className="lg:col-span-3 space-y-4">
            <section className="glass-panel p-5 rise-in">
              <p className="text-[11px] uppercase tracking-widest text-teal-600 mb-2">
                How It Works
              </p>
              <h2 className="text-lg font-semibold text-slate-900 mb-3">
                {triageSession
                  ? "Reviewing a few important details"
                  : "Tell me what you are feeling"}
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                You describe the problem, answer a few short follow-up
                questions, and then receive a care recommendation with doctor
                options.
              </p>

              {triageSession && (
                <div className="mt-4 rounded-xl border border-teal-100 bg-teal-50 p-3 text-sm text-teal-700">
                  Question {triageSession.currentQuestionIndex + 1} of{" "}
                  {triageSession.questions.length}
                </div>
              )}
            </section>

            <section className="glass-panel p-5 rise-in-delay">
              <p className="text-[11px] uppercase tracking-widest text-teal-600 mb-2">
                Safety Note
              </p>
              <p className="text-sm text-slate-600 leading-relaxed">
                If symptoms become severe, especially chest pain, breathing
                difficulty, fainting, or confusion, seek emergency care right
                away.
              </p>
            </section>
          </aside>

          <section className="lg:col-span-9 glass-panel overflow-hidden flex flex-col min-h-[76vh]">
            {messages.length === 0 && (
              <div className="px-6 py-7 border-b border-slate-100 bg-teal-50/50">
                <h3 className="text-xl font-semibold text-slate-900 mb-2">
                  Start your symptom check
                </h3>
                <p className="text-sm text-slate-600 max-w-3xl">
                  Enter your city and symptoms. I will ask a few helpful
                  follow-up questions before recommending the most appropriate
                  care and doctors.
                </p>
              </div>
            )}

            <div
              ref={chatContainerRef}
              className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5"
            >
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.role === "user" ? (
                    <div className="max-w-xl bg-gradient-to-br from-teal-500 to-emerald-400 text-white px-5 py-3 rounded-2xl rounded-tr-sm shadow-sm font-medium">
                      {msg.content}
                    </div>
                  ) : (
                    <div className="w-full max-w-4xl space-y-4">
                      {msg.content.type === "question" && (
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                          <div className="flex items-center justify-between gap-2 mb-3">
                            <p className="text-[11px] uppercase tracking-widest text-amber-700">
                              Question {msg.content.step} of {msg.content.total}
                            </p>
                            <span className="px-2 py-1 rounded-full text-xs border border-amber-200 text-amber-700 bg-white">
                              Follow-up
                            </span>
                          </div>
                          <p className="text-sm text-slate-600 mb-3 leading-relaxed">
                            {msg.content.reasoning}
                          </p>
                          <p className="text-base md:text-lg text-slate-900 font-semibold leading-relaxed">
                            {msg.content.question}
                          </p>
                        </div>
                      )}

                      {msg.content.type !== "question" && (
                        <>
                          <div className="rounded-2xl border border-teal-100 bg-teal-50 p-5">
                            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                              <p className="text-[11px] uppercase tracking-widest text-teal-700">
                                Recommended Care
                              </p>
                              <span
                                className={`px-3 py-1 rounded-full border text-xs uppercase font-bold ${urgencyBadgeClasses[msg.content.urgency?.toLowerCase()] || urgencyBadgeClasses.normal}`}
                              >
                                {urgencyLabels[
                                  msg.content.urgency?.toLowerCase()
                                ] || "Routine care"}
                              </span>
                            </div>
                            <h3 className="text-lg md:text-xl font-bold text-slate-900">
                              {msg.content.specialty} Department
                            </h3>
                            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                              {msg.content.reasoning}
                            </p>

                            {msg.content.emergencyAdvice && (
                              <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700 text-sm font-semibold">
                                {msg.content.emergencyAdvice}
                              </div>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                            {msg.content.doctors?.map((doctor, i) => (
                              <article
                                key={i}
                                className="rounded-xl border border-slate-200 bg-white p-4 hover:border-teal-200 hover:shadow-sm transition-all"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <h4 className="font-semibold text-slate-900 leading-snug">
                                    {doctor.name}
                                  </h4>
                                  <span className="text-amber-600 text-xs font-bold">
                                    {doctor.rating} star
                                  </span>
                                </div>
                                <p className="mt-1 text-xs text-slate-500">
                                  {doctor.hospital}
                                </p>

                                <div className="mt-3 space-y-1 text-xs text-slate-600">
                                  <p>Fee: INR {doctor.fees_inr || "800"}</p>
                                  <p>
                                    Experience:{" "}
                                    {doctor.experience_years || "10"} years
                                  </p>
                                  <p className="font-mono text-teal-700">
                                    {doctor.phone}
                                  </p>
                                </div>

                                <button
                                  onClick={() => handleOpenBooking(doctor)}
                                  className="mt-4 w-full rounded-lg border border-teal-200 bg-teal-50 hover:bg-teal-100 text-teal-700 text-xs font-bold py-2 transition"
                                >
                                  BOOK APPOINTMENT
                                </button>
                              </article>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <span className="pulse-dot" />
                  <span className="pulse-dot" />
                  <span className="pulse-dot" />
                  <span>
                    {triageSession
                      ? "Reviewing your answer..."
                      : "Preparing your symptom review..."}
                  </span>
                </div>
              )}
            </div>

            <form
              onSubmit={analyzeSymptoms}
              className="border-t border-slate-100 bg-white p-4 md:p-5"
            >
              <div className="grid grid-cols-1 md:grid-cols-[150px_1fr_auto] gap-3">
                <input
                  required
                  type="text"
                  placeholder="City"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  disabled={Boolean(triageSession)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-300 disabled:opacity-60"
                />

                <input
                  required
                  type="text"
                  placeholder={
                    triageSession
                      ? "Type your answer to the follow-up question"
                      : "Describe symptoms in your own words"
                  }
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-300"
                />

                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-xl px-6 py-3 font-bold text-sm bg-teal-600 text-white hover:bg-teal-700 transition disabled:opacity-60"
                >
                  {triageSession ? "CONTINUE" : "START CHECK"}
                </button>
              </div>
            </form>
          </section>
        </main>
      </div>

      {showBookModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/35 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <h2 className="text-2xl font-bold text-slate-900 text-center">
              Book Appointment
            </h2>
            <p className="text-sm text-slate-500 text-center mt-1 mb-5">
              Doctor: {selectedDoctor?.name}
            </p>

            <form onSubmit={submitBooking} className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-slate-500 mb-1">
                  Full Name
                </label>
                <input
                  required
                  type="text"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-slate-500 mb-1">
                    Age
                  </label>
                  <input
                    required
                    type="number"
                    value={patientAge}
                    onChange={(e) => setPatientAge(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-300"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-slate-500 mb-1">
                    Phone
                  </label>
                  <input
                    required
                    type="tel"
                    value={patientPhone}
                    onChange={(e) => setPatientPhone(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-300"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-slate-500 mb-1">
                  Address
                </label>
                <textarea
                  required
                  rows="2"
                  value={patientAddress}
                  onChange={(e) => setPatientAddress(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-300"
                />
              </div>

              {bookingStatus === "success" && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700">
                  Appointment confirmed. Patient ID:{" "}
                  <span className="font-mono font-semibold">{assignedUid}</span>
                </div>
              )}

              {bookingStatus === "error" && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
                  Booking failed. Please try again.
                </div>
              )}

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowBookModal(false)}
                  className="flex-1 rounded-lg border border-slate-200 py-2.5 text-slate-600 hover:bg-slate-50 transition"
                >
                  CANCEL
                </button>
                {!assignedUid && (
                  <button
                    type="submit"
                    className="flex-1 rounded-lg py-2.5 bg-teal-600 text-white font-bold hover:bg-teal-700 transition"
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
