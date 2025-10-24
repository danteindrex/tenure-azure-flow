'use client'
import React from 'react'
import Link from 'next/link'

const AdminNavigation: React.FC = () => {
  return (
    <div className="admin-navigation">
      <style jsx>{`
        .admin-navigation {
          position: fixed;
          top: 20px;
          left: 20px;
          z-index: 1000;
        }
        .home-button {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: #007bff;
          color: white;
          text-decoration: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          transition: all 0.2s ease;
        }
        .home-button:hover {
          background: #0056b3;
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(0,0,0,0.15);
        }
        .home-icon {
          font-size: 16px;
        }
      `}</style>
      
      <Link href="/admin" className="home-button">
        <span className="home-icon">🏠</span>
        <span>Dashboard Home</span>
      </Link>
    </div>
  )
}

export default AdminNavigation