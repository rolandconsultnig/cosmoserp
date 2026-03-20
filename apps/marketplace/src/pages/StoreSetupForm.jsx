import { useState } from 'react';

export default function StoreSetupForm() {
  const [form, setForm] = useState({
    storeName: '',
    ownerName: '',
    email: '',
    phone: '',
    address: '',
    description: '',
    nin: '',
    tin: '',
    cacCertificate: null,
  });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === 'cacCertificate') {
      setForm({ ...form, cacCertificate: files[0] });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // TODO: Send form data to backend API
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="max-w-md mx-auto py-12">
        <h2 className="text-xl font-bold mb-4">Store Setup Request Submitted</h2>
        <p>Thank you for your interest. We will review your application and contact you soon.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto py-12 space-y-6" encType="multipart/form-data">
      <h2 className="text-2xl font-bold mb-6">Virtual Store Setup Form</h2>
      <div>
        <label className="block mb-1 font-medium">Store Name</label>
        <input
          type="text"
          name="storeName"
          value={form.storeName}
          onChange={handleChange}
          required
          className="w-full border rounded px-3 py-2"
        />
      </div>
      <div>
        <label className="block mb-1 font-medium">Owner Name</label>
        <input
          type="text"
          name="ownerName"
          value={form.ownerName}
          onChange={handleChange}
          required
          className="w-full border rounded px-3 py-2"
        />
      </div>
      <div>
        <label className="block mb-1 font-medium">Email</label>
        <input
          type="email"
          name="email"
          value={form.email}
          onChange={handleChange}
          required
          className="w-full border rounded px-3 py-2"
        />
      </div>
      <div>
        <label className="block mb-1 font-medium">Phone</label>
        <input
          type="tel"
          name="phone"
          value={form.phone}
          onChange={handleChange}
          required
          className="w-full border rounded px-3 py-2"
        />
      </div>
      <div>
        <label className="block mb-1 font-medium">Address</label>
        <input
          type="text"
          name="address"
          value={form.address}
          onChange={handleChange}
          required
          className="w-full border rounded px-3 py-2"
        />
      </div>
      <div>
        <label className="block mb-1 font-medium">NIN (National Identification Number)</label>
        <input
          type="text"
          name="nin"
          value={form.nin}
          onChange={handleChange}
          required
          className="w-full border rounded px-3 py-2"
        />
      </div>
      <div>
        <label className="block mb-1 font-medium">TIN (Tax Identification Number)</label>
        <input
          type="text"
          name="tin"
          value={form.tin}
          onChange={handleChange}
          required
          className="w-full border rounded px-3 py-2"
        />
      </div>
      <div>
        <label className="block mb-1 font-medium">Corporate Affairs Commission Certificate (PDF or Image)</label>
        <input
          type="file"
          name="cacCertificate"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={handleChange}
          required
          className="w-full border rounded px-3 py-2"
        />
      </div>
      <div>
        <label className="block mb-1 font-medium">Store Description</label>
        <textarea
          name="description"
          value={form.description}
          onChange={handleChange}
          required
          className="w-full border rounded px-3 py-2"
        />
      </div>
      <button
        type="submit"
        className="bg-amber-500 text-white px-4 py-2 rounded font-semibold hover:bg-amber-600"
      >
        Submit Application
      </button>
    </form>
  );
}
