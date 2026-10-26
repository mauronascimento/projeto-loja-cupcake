'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiRequest } from '@/lib/api';
import type { Order } from '@/lib/types';
import { useStore } from '@/components/store-provider';

const statusLabels: Record<string, string> = {
  EM_PREPARACAO: 'Em preparação',
  SAIU_PARA_ENTREGA: 'Saiu para entrega',
  ENTREGUE: 'Entregue',
  CANCELADO: 'Cancelado',
};

export default function OrdersPage() {
  const { user, authLoading } = useStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    apiRequest<{ items: Order[] }>('/orders?limit=100')
      .then((result) => setOrders(result.items))
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Não foi possível carregar os pedidos.'))
      .finally(() => setLoading(false));
  }, [user]);

  if (authLoading) return <main className="page-shell"><p className="notice">Verificando sua sessão...</p></main>;
  if (!user) {
    return <main className="form-page"><section className="form-card"><h1>Entre para ver seus pedidos</h1><Link className="primary-button button-link" href="/login?next=/orders">Entrar</Link></section></main>;
  }

  return (
    <main className="page-shell">
      <section className="content-heading">
        <p className="eyebrow">Acompanhe seus momentos doces</p>
        <h1>Meus pedidos</h1>
      </section>
      {loading && <p className="notice">Carregando pedidos...</p>}
      {error && <p className="notice notice-error" role="alert">{error}</p>}
      {!loading && !error && orders.length === 0 && (
        <section className="empty-state">
          <h2>Você ainda não fez pedidos</h2>
          <p>Escolha seus sabores favoritos no cardápio.</p>
          <Link className="primary-button button-link" href="/">Explorar cardápio</Link>
        </section>
      )}
      <div className="order-list">
        {orders.map((order) => (
          <Link className="order-card" href={`/orders/${order.id}`} key={order.id}>
            <div><span className="eyebrow">Pedido #{order.id}</span><strong>{statusLabels[order.status] ?? order.status}</strong></div>
            <span>{order.items.reduce((sum, item) => sum + item.quantidade, 0)} itens</span>
            <strong>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(order.valor_total))}</strong>
          </Link>
        ))}
      </div>
    </main>
  );
}
