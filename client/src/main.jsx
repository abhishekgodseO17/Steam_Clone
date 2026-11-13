import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, NavLink, Link, Route, Routes, useNavigate, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './AppContext.jsx';
import { money } from './api.js';
import './styles.css';

import Store from './pages/Store.jsx';
import GameDetail from './pages/GameDetail.jsx';
import Cart from './pages/Cart.jsx';
import Library from './pages/Library.jsx';
import Wishlist from './pages/Wishlist.jsx';
import Orders from './pages/Orders.jsx';
import Profile from './pages/Profile.jsx';
import Account from './pages/Account.jsx';
import { Login, Register } from './pages/Auth.jsx';
import Admin from './pages/Admin.jsx';
import Company from './pages/Company.jsx';

function Header() {
  const { user, cartCount, logout } = useApp();
  const nav = useNavigate();
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <Link to="/" className="logo">
          <svg viewBox="0 0 32 32" width="30" height="30" aria-hidden>
            <circle cx="16" cy="16" r="14" fill="#66c0f4" />
            <path d="M10 11l6 12 6-12" stroke="#171a21" strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>VAPOR</span>
        </Link>
        <nav className="mainnav">
          <NavLink to="/" end>Store</NavLink>
          {user && <NavLink to="/library">Library</NavLink>}
          {user && <NavLink to={`/profile/${user.user_id}`}>Community</NavLink>}
          {user?.is_admin && <NavLink to="/admin">Admin</NavLink>}
        </nav>
        <div className="userbox">
          {user ? (
            <>
              <Link to="/account" className="wallet" title="Wallet balance">{money(user.wallet_balance)}</Link>
              <Link to="/account" className="username">{user.display_name}</Link>
              <button className="linkbtn" onClick={() => { logout(); nav('/'); }}>Log out</button>
            </>
          ) : (
            <>
              <Link to="/login">Log in</Link>
              <span className="muted">|</span>
              <Link to="/register">Join Vapor</Link>
            </>
          )}
        </div>
      </div>
      <div className="subnav">
        <div className="subnav-inner">
          <NavLink to="/" end>Featured</NavLink>
          <Link to="/?on_sale=true">Specials</Link>
          {user && <NavLink to="/wishlist">Wishlist</NavLink>}
          {user && <NavLink to="/orders">Purchases</NavLink>}
          <div className="spacer" />
          {user && <NavLink to="/cart" className="cartlink">Cart ({cartCount})</NavLink>}
        </div>
      </div>
    </header>
  );
}

function RequireUser({ children, admin }) {
  const { user, ready } = useApp();
  if (!ready) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (admin && !user.is_admin) return <Navigate to="/" replace />;
  return children;
}

function App() {
  return (
    <>
      <Header />
      <main className="page">
        <Routes>
          <Route path="/" element={<Store />} />
          <Route path="/game/:id" element={<GameDetail />} />
          <Route path="/developer/:id" element={<Company kind="developers" />} />
          <Route path="/publisher/:id" element={<Company kind="publishers" />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/profile/:id" element={<Profile />} />
          <Route path="/cart" element={<RequireUser><Cart /></RequireUser>} />
          <Route path="/library" element={<RequireUser><Library /></RequireUser>} />
          <Route path="/wishlist" element={<RequireUser><Wishlist /></RequireUser>} />
          <Route path="/orders" element={<RequireUser><Orders /></RequireUser>} />
          <Route path="/account" element={<RequireUser><Account /></RequireUser>} />
          <Route path="/admin" element={<RequireUser admin><Admin /></RequireUser>} />
          <Route path="*" element={<div className="empty">Page not found.</div>} />
        </Routes>
      </main>
      <footer className="footer">Vapor — a database course project inspired by Steam. Not affiliated with Valve.</footer>
    </>
  );
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppProvider>
        <App />
      </AppProvider>
    </BrowserRouter>
  </React.StrictMode>
);
