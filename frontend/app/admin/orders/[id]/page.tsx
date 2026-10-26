'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { apiRequest } from '@/lib/api';
import { formatCents, formatMoney, toCents } from '@/lib/money';
import type { Order } from '@/lib/types';

const statusLabels: Record<string, string> = {
  EM_PREPARACAO: 'Em preparação',
  SAIU_PARA_ENTREGA: 'Saiu para entrega',
  ENTREGUE: 'Entregue',
  CANCELADO: 'Cancelado',
};

const localDate = (value: string) =>
  new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));

export default function AdminOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [mutating, setMutating] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadOrder = useCallback(async () => {
    setError('');
    try {
      setOrder(await apiRequest<Order>(`/admin/orders/${id}`));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível carregar o pedido.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadOrder();
  }, [loadOrder]);

  async function transition(target: 'SAIU_PARA_ENTREGA' | 'ENTREGUE') {
    if (!order) return;
    const message = target === 'ENTREGUE'
      ? 'Confirmar que este pedido foi entregue? Esta ação é definitiva.'
      : 'Confirmar que este pedido saiu para entrega?';
    if (!window.confirm(message)) return;
    setMutating(true);
    setError('');
    setNotice('');
    try {
      setOrder(await apiRequest<Order>(`/admin/orders/${order.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: target }),
      }));
      setNotice('Status do pedido atualizado.');
    } catch (cause) {
      const messageText = cause instanceof Error ? cause.message : 'Não foi possível atualizar o pedido.';
      await loadOrder();
      setError(`${messageText} O pedido foi consultado novamente; confira o status antes de tentar outra ação.`);
    } finally {
      setMutating(false);
    }
  }

  async function cancelOrder() {
    if (!order || !window.confirm('Cancelar este pedido e devolver os itens ao estoque?')) return;
    setMutating(true);
    setError('');
    setNotice('');
    try {
      setOrder(await apiRequest<Order>(`/orders/${order.id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({}),
      }));
      setNotice('Pedido cancelado; o estoque foi atualizado pelo servidor.');
    } catch (cause) {
      const messageText = cause instanceof Error ? cause.message : 'Não foi possível cancelar o pedido.';
      await loadOrder();
      setError(`${messageText} O pedido foi consultado novamente; confira o status antes de tentar outra ação.`);
    } finally {
      setMutating(false);
    }
  }

  if (loading) return <section className="admin-content"><p className="notice">Carregando pedido...</p></section>;
  if (!order) {
    return (
      <section className="admin-content">
        <p className="notice notice-error" role="alert">{error || 'Pedido não encontrado.'}</p>
        <Link className="text-link" href="/admin/orders">Voltar para pedidos</Link>
      </section>
    );
  }

  const address = order.endereco_entrega;
  const totalUnits = order.items.reduce((sum, item) => sum + item.quantidade, 0);
  return (
    <section className="admin-content">
      <div className="admin-page-heading">
        <div>
          <p className="eyebrow">Detalhes da compra</p>
          <h2>Pedido #{order.id}</h2>
          <p>{localDate(order.criado_em)} · {statusLabels[order.status] ?? order.status}</p>
        </div>
        <Link className="secondary-button button-link" href="/admin/orders">Voltar para pedidos</Link>
      </div>
      {error && <p className="notice notice-error" role="alert">{error}</p>}
      {notice && <p className="notice notice-success" role="status">{notice}</p>}
      <div className="admin-order-detail-grid">
        <section className="admin-form-card">
          <h3>Itens do pedido</h3>
          <div className="movement-list">
            {order.items.map((item) => (
              <article className="movement-row" key={item.produto_id}>
                <div>
                  <strong>{item.nome_produto}</strong>
                  <small>{item.quantidade} × {formatMoney(item.preco_unitario)}</small>
                </div>
                <strong>{formatCents(toCents(item.preco_unitario) * item.quantidade)}</strong>
              </article>
            ))}
          </div>
          <div className="summary-total"><span>{totalUnits} unidade(s) · Total</span><strong>{formatMoney(order.valor_total)}</strong></div>
        </section>
        <section className="admin-form-card">
          <h3>Cliente e entrega</h3>
          <dl className="order-facts">
            <div><dt>Cliente</dt><dd>{order.nome_cliente || `Cliente #${order.usuario_id}`}</dd></div>
            <div><dt>Endereço do pedido</dt><dd>{[address.logradouro, address.numero, address.complemento, address.bairro, address.cidade, address.uf, address.cep].filter(Boolean).join(', ')}</dd></div>
            <div><dt>Pagamento demonstrativo</dt><dd>{order.forma_pagamento} · {formatMoney(order.valor_total)}</dd></div>
            {order.entregue_em && <div><dt>Entregue em</dt><dd>{localDate(order.entregue_em)}</dd></div>}
            {order.cancelado_em && <div><dt>Cancelado em</dt><dd>{localDate(order.cancelado_em)}</dd></div>}
            {order.motivo_cancelamento && <div><dt>Motivo do cancelamento</dt><dd>{order.motivo_cancelamento}</dd></div>}
            {order.cancelado_por && <div><dt>Cancelado pelo usuário</dt><dd>#{order.cancelado_por}</dd></div>}
          </dl>
        </section>
      </div>
      <section className="admin-form-card admin-order-actions">
        <h3>Ações do pedido</h3>
        {order.status === 'EM_PREPARACAO' && (
          <button className="primary-button" disabled={mutating} onClick={() => void transition('SAIU_PARA_ENTREGA')} type="button">Marcar como saiu para entrega</button>
        )}
        {order.status === 'SAIU_PARA_ENTREGA' && (
          <button className="primary-button" disabled={mutating} onClick={() => void transition('ENTREGUE')} type="button">Marcar como entregue</button>
        )}
        {(order.status === 'EM_PREPARACAO' || order.status === 'SAIU_PARA_ENTREGA') && (
          <button className="secondary-button" disabled={mutating} onClick={() => void cancelOrder()} type="button">Cancelar pedido</button>
        )}
        {(order.status === 'ENTREGUE' || order.status === 'CANCELADO') && <p className="notice">Este pedido está em um estado terminal e não pode ser alterado.</p>}
        <Link className="text-link" href={`/admin/stock`}>Consultar estoque e movimentações</Link>
      </section>
    </section>
  );
}
