'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { apiRequest } from '@/lib/api';
import type { Order, Paginated } from '@/lib/types';

const PAGE_SIZE = 20;
const statuses = [
  ['', 'Todos os status'],
  ['EM_PREPARACAO', 'Em preparação'],
  ['SAIU_PARA_ENTREGA', 'Saiu para entrega'],
  ['ENTREGUE', 'Entregues'],
  ['CANCELADO', 'Cancelados'],
] as const;

const statusLabels: Record<string, string> = {
  EM_PREPARACAO: 'Em preparação',
  SAIU_PARA_ENTREGA: 'Saiu para entrega',
  ENTREGUE: 'Entregue',
  CANCELADO: 'Cancelado',
};

const money = (value: string) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value));

const localDate = (value: string) =>
  new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));

export default function AdminOrdersPage() {
  const [result, setResult] = useState<Paginated<Order> | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [startInput, setStartInput] = useState('');
  const [endInput, setEndInput] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError('');
    const params = new URLSearchParams({
      limit: String(PAGE_SIZE),
      offset: String(offset),
    });
    if (statusFilter) params.set('status', statusFilter);
    if (start && end) {
      params.set('data_inicio', start);
      params.set('data_fim', end);
    }
    try {
      setResult(await apiRequest<Paginated<Order>>(`/admin/orders?${params}`));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível carregar os pedidos.');
    } finally {
      setLoading(false);
    }
  }, [end, offset, start, statusFilter]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (Boolean(startInput) !== Boolean(endInput)) {
      setError('Informe as duas datas ou deixe ambas em branco.');
      return;
    }
    if (startInput && endInput && startInput > endInput) {
      setError('A data inicial deve ser anterior ou igual à data final.');
      return;
    }
    setError('');
    setOffset(0);
    setStart(startInput);
    setEnd(endInput);
  }

  return (
    <section className="admin-content">
      <div className="admin-page-heading">
        <div><h2>Pedidos</h2><p>Consulte compras e atualize os estados da operação.</p></div>
        <button className="secondary-button" disabled={loading} onClick={() => void loadOrders()} type="button">Atualizar pedidos</button>
      </div>
      <form className="report-filter" onSubmit={applyFilters}>
        <label>Status
          <select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setOffset(0); }}>
            {statuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label>Data inicial<input type="date" value={startInput} onChange={(event) => setStartInput(event.target.value)} /></label>
        <label>Data final<input type="date" value={endInput} onChange={(event) => setEndInput(event.target.value)} /></label>
        <button className="primary-button" type="submit">Aplicar filtros</button>
        <button className="secondary-button" type="button" onClick={() => {
          setStartInput('');
          setEndInput('');
          setStart('');
          setEnd('');
          setOffset(0);
        }}>Limpar datas</button>
      </form>
      {error && <p className="notice notice-error" role="alert">{error}</p>}
      {loading && <p className="notice">Carregando pedidos...</p>}
      {!loading && result?.items.length === 0 && (
        <div className="empty-state"><h3>Nenhum pedido encontrado</h3><p>Altere os filtros ou atualize os pedidos.</p></div>
      )}
      {!loading && result && result.items.length > 0 && (
        <>
          <div className="order-list admin-order-list">
            {result.items.map((order) => (
              <article className="admin-order-card" key={order.id}>
                <div className="admin-order-summary">
                  <span className="eyebrow">Pedido #{order.id}</span>
                  <strong>{statusLabels[order.status] ?? order.status}</strong>
                </div>
                <div className="admin-order-summary">
                  <strong>{order.nome_cliente || `Cliente #${order.usuario_id}`}</strong>
                  <span>{localDate(order.criado_em)}</span>
                </div>
                <div className="admin-order-summary">
                  <span>{order.items.reduce((sum, item) => sum + item.quantidade, 0)} unidade(s)</span>
                  <span>Pagamento demonstrativo: {order.forma_pagamento}</span>
                </div>
                <strong>{money(order.valor_total)}</strong>
                <Link className="secondary-button button-link" href={`/admin/orders/${order.id}`}>Ver detalhes</Link>
              </article>
            ))}
          </div>
          <div className="admin-pagination">
            <span>{result.total} pedido(s)</span>
            <div>
              <button className="secondary-button" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))} type="button">Anterior</button>
              <button className="secondary-button" disabled={offset + PAGE_SIZE >= result.total} onClick={() => setOffset(offset + PAGE_SIZE)} type="button">Próxima</button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
