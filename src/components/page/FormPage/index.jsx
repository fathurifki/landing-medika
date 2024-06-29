import React, { useState } from "react";
import Toastify from 'toastify-js';
import "toastify-js/src/toastify.css";

export default function FormPage({ apiUrl }) {
    const [form, setForm] = useState({
        name: "",
        email: "",
        phone_number: "",
        message: "",
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm({
            ...form,
            [name]: value
        });
    };

    async function postData(data) {
        const response = await fetch(`${apiUrl}/items/client_contact`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const responseData = await response.json();
        return responseData;
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await postData(form);
            Toastify({
                text: "Form submitted successfully!",
                className: "success",
                style: {
                    background: "#00b09b",
                }
            }).showToast();
        } catch (error) {
            console.error("Error submitting form:", error);
            Toastify({
                text: "Form submitted successfully!",
                className: "success",
                style: {
                    background: "#00b09b",
                }
            }).showToast();
        }
    };

    return (
        <section id="news" className="p-8 h-auto md:h-full flex justify-center">
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
                        <label htmlFor="phone" className="block mb-3">Your Phone Number</label>
                        <input
                            type="tel"
                            id="phone_number"
                            name="phone_number"
                            className="w-full p-3 border border-gray-400 rounded-lg"
                            placeholder="Enter your phone number"
                            value={form.phone}
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
                        ></textarea>
                    </div>
                    <div className="honeypot" style={{ display: "none" }}>
                        <label htmlFor="honeypot">Leave this field empty</label>
                        <input
                            type="text"
                            id="honeypot"
                            name="honeypot"
                            value={form.honeypot}
                            onChange={handleChange}
                        />
                    </div>
                    <div className="col-span-1 md:col-span-2 text-center">
                        <button type="submit" className="p-2 border border-gray-300 rounded">
                            Send Your Message
                        </button>
                    </div>
                </form>
            </div>
        </section>
    );
}
