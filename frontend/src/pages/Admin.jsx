import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function Admin() {
    const navigate = useNavigate();

    return (
        <div className="admin-page">
            <section className="admin-hero">
                <h1>Admin Dashboard</h1>
               

                
            </section>

            <section className="admin-grid">
                <div className="admin-cards">
                    <div className="admin-action-card">
                        <h3>Manage Products</h3>
                        <p>
                            Review product listings, check stock visibility, and keep catalog data organized.
                        </p>
                        <button
                            className="btn btn-primary"
                            type="button"
                            onClick={() => navigate('/products')}
                        >
                            Open Products
                        </button>
                    </div>

                    <div className="admin-action-card">
                        <h3>Monitor Orders</h3>
                        <p>
                            Track payment flow, order activity, and customer purchase progress from the dashboard.
                        </p>
                        <button
                            className="btn btn-ghost"
                            type="button"
                            onClick={() => navigate('/payment')}
                        >
                            View Payments
                        </button>
                    </div>

                    <div className="admin-action-card">
                        <h3>Security Overview</h3>
                        <p>
                            Show secure frontend practices like protected routes, controlled views, and safe actions.
                        </p>
                        <button
                            className="btn btn-ghost"
                            type="button"
                            onClick={() => alert('Security overview panel can be connected after we build the backend-supported admin features.')}
                        >
                            Review Security
                        </button>
                    </div>

                    <div className="admin-action-card">
                        <h3>User Access</h3>
                        <p>
                            Separate normal user experience from admin-only functionality using role-aware UI.
                        </p>
                        <button
                            className="btn btn-ghost"
                            type="button"
                            onClick={() => alert('User access management UI is ready to be connected once admin endpoints are available.')}
                        >
                            Manage Access
                        </button>
                    </div>
                </div>

                <aside className="admin-summary-card">
                    <h2>Admin Notes</h2>

                    <div className="admin-list">
                        <div className="admin-list-item">
                            <strong>Protected Route</strong>
                            <span>Only authenticated admin users should access this page.</span>
                        </div>

                        <div className="admin-list-item">
                            <strong>Safe Rendering</strong>
                            <span>No unsafe HTML rendering should be used in admin components.</span>
                        </div>

                        <div className="admin-list-item">
                            <strong>Role-Aware Navigation</strong>
                            <span>Admin links should only appear when the logged-in user has admin privileges.</span>
                        </div>

                        <div className="admin-list-item">
                            <strong>Backend Enforcement</strong>
                            <span>Frontend hiding improves UX, but real authorization must still be enforced by backend APIs.</span>
                        </div>
                    </div>
                </aside>
            </section>
        </div>
    );
}