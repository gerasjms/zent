// src/components/AppNotification.jsx
export default function AppNotification({ message, type, onClose }) {
    if (!message) return null;
    const bg = type === "error" ? "bg-red-500" : "bg-green-600";

    return (
        <div className={`fixed top-5 right-5 ${bg} text-white py-2 px-4 rounded-lg shadow-lg z-50`}>
            <span>{message}</span>
            <button onClick={onClose} className="ml-4 font-bold">X</button>
        </div>
    );
}
