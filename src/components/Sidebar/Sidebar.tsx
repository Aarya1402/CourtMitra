import React from "react";
import {
  LayoutGrid,
  MessageSquare,
  FileText,
  Database,
  Plus,
} from "lucide-react";

const Sidebar: React.FC = () => {
  const menuItems = [
    { icon: <LayoutGrid size={20} />, label: "Dashboard" },
    { icon: <MessageSquare size={20} />, label: "Chats", active: true },
    { icon: <FileText size={20} />, label: "Documents" },
    { icon: <Database size={20} />, label: "Archives" },
  ];

  return (
    <div className="nav-sidebar">
      <div className="logo-container">
        <div className="logo-box">
          <Database size={24} />
        </div>
        <span className="logo-text">CourtMitra</span>
      </div>

      <button className="new-chat-btn">
        <Plus size={18} />
        <span>New Chat</span>
      </button>

      <nav className="side-nav">
        {menuItems.map((item) => (
          <div
            key={item.label}
            className={`nav-item ${item.active ? "active" : ""}`}
          >
            {item.icon}
            <span>{item.label}</span>
          </div>
        ))}
      </nav>

      <style>{`
        .nav-sidebar {
          width: 240px;
          height: 100%;
          border-right: 1px solid var(--border);
          padding: 1.5rem 1rem;
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }
        .logo-container {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0 0.5rem;
        }
        .logo-box {
          background: var(--accent);
          color: white;
          padding: 0.5rem;
          border-radius: 8px;
          display: flex;
        }
        .logo-text {
          font-family: 'Outfit', sans-serif;
          font-weight: 700;
          font-size: 1.25rem;
          color: var(--text-primary);
        }
        .new-chat-btn {
          background: var(--bg-primary);
          border: 1px solid var(--border);
          padding: 0.75rem;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        .new-chat-btn:hover { background: var(--bg-tertiary); }
        .side-nav {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .nav-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          border-radius: var(--radius-md);
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.2s;
        }
        .nav-item:hover {
          background: var(--bg-tertiary);
          color: var(--text-primary);
        }
        .nav-item.active {
          background: var(--accent-soft);
          color: var(--accent);
          font-weight: 500;
        }
      `}</style>
    </div>
  );
};

export default Sidebar;
