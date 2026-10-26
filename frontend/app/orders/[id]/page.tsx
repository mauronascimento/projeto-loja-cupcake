'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { apiRequest } from '@/lib/api';
import type { Order } from '@/lib/types';
import { useStore } from '@/components/store-provider';

const statusLabels: Record<string, string> = {
  EM_PREPARACAO: 'Em preparação',
  SAIU_PARA_ENTREGA: 'Saiu para entrega',
  ENTREGUE: 'Entregue',
  CANCELADO: 'Cancelado',
};

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const { user, authLoading } = useStore();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [created, setCreated] = useState(false);
  const [mutating, setMutating] = useState(false);

  useEffect(() => {
    setCreated(new URLSearchParams(window.location.search).get('created') === '1');
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    apiRequest<Order>(`/orders/${params.id}`)
      .then(setOrder)
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Não foi possível carregar o pedido.'))
      .finally(() => setLoading(false));
  }, [authLoading, params.id, user]);

  async function cancelOrder() {
    if (!order || !window.confirm('Deseja cancelar este pedido?')) return;
    setError('');
    setMutating(true);
    try {
      const updated = await apiRequest<Order>(`/orders/${order.id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      setOrder(updated);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível cancelar o pedido.');
    } finally {
      setMutating(false);
    }
  }

  async function advanceOrder(status: 'SAIU_PARA_ENTREGA' | 'ENTREGUE') {
    if (!order) return;
    setError('');
    setMutating(true);
    try {
      const updated = await apiRequest<Order>(
        `/admin/orders/${order.id}/status`,
        { method: 'PATCH', body: JSON.stringify({ status }) },
      );
      setOrder(updated);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível atualizar o pedido.');
    } finally {
      setMutating(false);
    }
  }

  if (authLoading || loading) return <main className="page-shell"><p className="notice">Carregando pedido...</p></main>;
  if (!user) {
    return <main className="form-page"><section className="form-card"><h1>Entre para ver seu pedido</h1><Link className="primary-button button-link" href={`/login?next=/orders/${params.id}`}>Entrar</Link></section></main>;
  }

  return (
    <main className="page-shell">
      {created && <p className="notice notice-success" role="status">Pedido realizado. Esta compra é uma demonstração e nenhuma cobrança foi feita.</p>}
      {error && <p className="notice notice-error" role="alert">{error}</p>}
      {order && (
        <>
          <section className="content-heading">
            <p className="eyebrow">Acompanhe seu pedido</p>
            <h1>Pedido #{order.id}</h1>
            <p>Status: <strong>{statusLabels[order.status] ?? order.status}</strong></p>
          </section>
          <div className="cart-layout">
            <section className="cart-lines">
              {order.items.map((item) => (
                <article className="cart-line order-item-line" key={item.produto_id}>
                  <div className="cart-thumb" aria-hidden="true" />
                  <div className="cart-product"><h2>{item.nome_produto}</h2><p>{item.quantidade} × {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(item.preco_unitario))}</p></div>
                  <strong>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.round(Number(item.preco_unitario) * 100) * item.quantidade / 100)}</strong>
                </article>
              ))}
            </section>
            <aside className="summary-card">
              <h2>Resumo</h2>
              <div><span>Pagamento demonstrativo</span><strong>{order.forma_pagamento}</strong></div>
              <div className="summary-total"><span>Total</span><strong>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(order.valor_total))}</strong></div>
              {order.status !== 'ENTREGUE' && order.status !== 'CANCELADO' && (
                <>
                  {user.perfil === 'ADMIN' && order.status === 'EM_PREPARACAO' && (
                    <button
                      className="primary-button full-width"
                      disabled={mutating}
                      onClick={() => void advanceOrder('SAIU_PARA_ENTREGA')}
                      type="button"
                    >
                      Marcar como saiu para entrega
                    </button>
                  )}
                  {user.perfil === 'ADMIN' && order.status === 'SAIU_PARA_ENTREGA' && (
                    <button
                      className="primary-button full-width"
                      disabled={mutating}
                      onClick={() => void advanceOrder('ENTREGUE')}
                      type="button"
                    >
                      Marcar como entregue
                    </button>
                  )}
                  <button
                    className="text-link"
                    disabled={mutating}
                    onClick={() => void cancelOrder()}
                    type="button"
                  >
                    Cancelar pedido
                  </button>
                </>
              )}
              <Link className="text-link" href={user.perfil === 'ADMIN' ? '/admin' : '/orders'}>
                {user.perfil === 'ADMIN' ? 'Voltar ao painel' : 'Ver todos os pedidos'}
              </Link>
            </aside>
          </div>
        </>
      )}
    </main>
  );
}
