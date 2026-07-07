import React, { useState } from "react";
import Toastify from 'toastify-js';
import "toastify-js/src/toastify.css";

function toast(text, bg = "#00b09b") {
    Toastify({ text, style: { background: bg }, duration: 4000 }).showToast();
}

export default function FormPage({ apiUrl }) {
    const [form, setForm] = useState({ name: "", email: "", phone_number: "", message: "" });
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const url = `${apiUrl}/items/client_contact`;
            const res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: form.name,
                    email: form.email,
                    phone_number: form.phone_number,
                    message: form.message,
                }),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err?.error?.message ?? `Server error ${res.status}`);
            }

            toast("Message sent successfully! We'll get back to you soon.");
            setForm({ name: "", email: "", phone_number: "", message: "" });
        } catch (err) {
            console.error("[FormPage] submit error:", err);
            toast(err.message || "Failed to send message. Please try again.", "#e74c3c");
        } finally {
            setLoading(false);
        }
    };

    return (
        <section id="contact" className="p-8 h-auto md:h-full flex justify-center">
            <div className="container mx-auto text-left">
                <h2 className="text-3xl font-semibold mb-6 text-center">
                    Connect with Us for Business Inquiries
                </h2>
                <form
                    onSubmit={handleSubmit}
                    className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl mx-auto"
                >
                    <div className="col-span-1 md:col-span-2">
                        <label htmlFor="name" className="block mb-3">Your Name</label>
                        <input
                            type="text"
                            id="name"
                            name="name"
                            className="w-full p-3 border border-gray-400 rounded-lg"
                            placeholder="Enter your full name"
                            value={form.name}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="email" className="block mb-3">Your Email</label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            className="w-full p-3 border border-gray-400 rounded-lg"
                            placeholder="Enter your email address"
                            value={form.email}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="phone_number" className="block mb-3">Your Phone Number</label>
                        <input
                            type="tel"
                            id="phone_number"
                            name="phone_number"
                            className="w-full p-3 border border-gray-400 rounded-lg"
                            placeholder="Enter your phone number"
                            value={form.phone_number}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <div className="col-span-1 md:col-span-2">
                        <label htmlFor="message" className="block mb-3">Your Message</label>
                        <textarea
                            id="message"
                            name="message"
                            rows="5"
                            className="w-full p-3 border border-gray-400 rounded-lg"
                            placeholder="Write your message here"
                            value={form.message}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <div className="col-span-1 md:col-span-2 text-center">
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-6 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-60 transition-colors"
                        >
                            {loading ? "Sending…" : "Send Your Message"}
                        </button>
                    </div>
                </form>
            </div>
        </section>
    );
}
