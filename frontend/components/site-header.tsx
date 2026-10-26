'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useStore } from '@/components/store-provider';

export function SiteHeader() {
  const { cartCount, cartError, user, authError, logout } = useStore();
  const [logoutError, setLogoutError] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleLogout() {
    setLogoutError('');
    try {
      await logout();
    } catch {
      setLogoutError('Não foi possível encerrar a sessão. Tente novamente.');
    }
  }

  return (
    <header className="site-header">
      <Link className="brand" href="/">
        <span className="brand-mark" aria-hidden="true">C</span>
        <span>Cupcake Store</span>
      </Link>
      <button
        className="mobile-menu-toggle"
        type="button"
        aria-controls="primary-navigation"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((open) => !open)}
      >
        <span aria-hidden="true">{menuOpen ? '×' : '☰'}</span>
        <span className="sr-only">{menuOpen ? 'Fechar menu' : 'Abrir menu'}</span>
      </button>
      <nav id="primary-navigation" className={`site-nav${menuOpen ? ' is-open' : ''}`} aria-label="Navegação principal">
        <Link href="/" onClick={() => setMenuOpen(false)}>Cardápio</Link>
        {user?.perfil === 'CLIENTE' && <Link href="/orders" onClick={() => setMenuOpen(false)}>Meus pedidos</Link>}
        {user?.perfil === 'CLIENTE' && <Link href="/account" onClick={() => setMenuOpen(false)}>Minha conta</Link>}
        {user?.perfil === 'ADMIN' && <Link href="/admin" onClick={() => setMenuOpen(false)}>Painel</Link>}
        <Link className="nav-cart" href="/cart" onClick={() => setMenuOpen(false)}>Carrinho <span>{cartCount}</span></Link>
        {user ? (
          <button
            className="nav-action"
            type="button"
            onClick={() => { setMenuOpen(false); void handleLogout(); }}
          >
            Sair
          </button>
        ) : (
          <Link className="nav-action" href="/login" onClick={() => setMenuOpen(false)}>Entrar</Link>
        )}
      </nav>
      {(logoutError || authError || cartError) && <span className="header-error" role="alert">{logoutError || authError || cartError}</span>}
    </header>
  );
}
