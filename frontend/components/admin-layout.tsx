'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useStore } from '@/components/store-provider';

const links = [
  { href: '/admin', label: 'Visão geral' },
  { href: '/admin/products', label: 'Produtos' },
  { href: '/admin/stock', label: 'Estoque' },
  { href: '/admin/orders', label: 'Pedidos' },
  { href: '/admin/reports', label: 'Relatórios' },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, authLoading } = useStore();

  if (authLoading) {
    return <main className="page-shell"><p className="notice">Verificando acesso administrativo...</p></main>;
  }

  if (!user) {
    return (
      <main className="form-page">
        <section className="form-card">
          <h1>Acesso administrativo</h1>
          <p>Entre com uma conta de administrador para continuar.</p>
          <Link className="primary-button button-link" href="/login?next=/admin">Entrar</Link>
        </section>
      </main>
    );
  }

  if (user.perfil !== 'ADMIN') {
    return (
      <main className="form-page">
        <section className="form-card">
          <h1>Acesso restrito</h1>
          <p>Esta área é exclusiva para administradores.</p>
          <Link className="text-link" href="/">Voltar à loja</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell admin-shell">
      <header className="content-heading">
        <p className="eyebrow">Gestão da loja</p>
        <h1>Painel administrativo</h1>
        <p>Operação e indicadores da Cupcake Store.</p>
      </header>
      <nav className="admin-nav" aria-label="Navegação administrativa">
        {links.map((link) => {
          const active =
            link.href === '/admin'
              ? pathname === link.href
              : pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <Link
              aria-current={active ? 'page' : undefined}
              className={active ? 'admin-nav-link active' : 'admin-nav-link'}
              href={link.href}
              key={link.href}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
      {children}
    </main>
  );
}
