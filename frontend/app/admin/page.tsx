'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiRequest } from '@/lib/api';
import { formatMoney } from '@/lib/money';
import type { Order, Paginated } from '@/lib/types';
import { useStore } from '@/components/store-provider';

type Dashboard = {
  pedidos_criados: number;
  pedidos_entregues: number;
  valor_vendas_concluidas: string;
  unidades_vendidas: number;
  ticket_medio: string;
  estoque: { produtos_ativos: number; baixo: number; esgotados: number };
};

export default function AdminPage() {
  const { user, authLoading } = useStore();
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading || !user) return;
    if (user.perfil !== 'ADMIN') {
      setLoading(false);
      return;
    }
    Promise.all([
      apiRequest<Dashboard>('/admin/dashboard'),
      apiRequest<Paginated<Order>>('/admin/orders?limit=5'),
    ])
      .then(([summary, recentOrders]) => {
        setDashboard(summary);
        setOrders(recentOrders.items);
      })
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Não foi possível carregar o painel.'))
      .finally(() => setLoading(false));
  }, [authLoading, user]);

  if (authLoading || loading) return <main className="page-shell"><p className="notice">Carregando painel...</p></main>;
  if (!user) {
    return <main className="form-page"><section className="form-card"><h1>Acesso administrativo</h1><p>Entre com uma conta de administrador para acessar o painel.</p><Link className="primary-button button-link" href="/login?next=/admin">Entrar</Link></section></main>;
  }
  if (user.perfil !== 'ADMIN') {
    return <main className="form-page"><section className="form-card"><h1>Acesso restrito</h1><p>Esta área é exclusiva para administradores.</p><Link className="text-link" href="/">Voltar à loja</Link></section></main>;
  }

  return (
    <section className="admin-content">
      <div className="admin-page-heading">
        <div><h2>Visão geral</h2><p>Indicadores calculados a partir dos dados atuais da loja.</p></div>
      </div>
      {error && <p className="notice notice-error" role="alert">{error}</p>}
      {dashboard && (
        <>
          <section className="metrics-grid" aria-label="Indicadores da loja">
            <article className="metric-card"><span>Pedidos criados</span><strong>{dashboard.pedidos_criados}</strong></article>
            <article className="metric-card"><span>Pedidos entregues</span><strong>{dashboard.pedidos_entregues}</strong></article>
            <article className="metric-card"><span>Vendas concluídas</span><strong>{formatMoney(dashboard.valor_vendas_concluidas)}</strong></article>
            <article className="metric-card"><span>Ticket médio</span><strong>{formatMoney(dashboard.ticket_medio)}</strong></article>
            <article className="metric-card"><span>Unidades vendidas</span><strong>{dashboard.unidades_vendidas}</strong></article>
            <article className="metric-card"><span>Estoque baixo / esgotado</span><strong>{dashboard.estoque.baixo} / {dashboard.estoque.esgotados}</strong></article>
          </section>
          <section className="admin-section">
            <div className="section-heading"><div><p className="eyebrow">Operação</p><h3>Pedidos recentes</h3></div></div>
            {orders.length === 0 ? <p className="notice">Ainda não há pedidos registrados.</p> : (
              <div className="order-list">
                {orders.map((order) => (
                  <Link className="order-card" href={`/orders/${order.id}`} key={order.id}>
                    <div><span className="eyebrow">Pedido #{order.id}</span><strong>{order.status.replaceAll('_', ' ')}</strong></div>
                    <span>{order.items.reduce((sum, item) => sum + item.quantidade, 0)} itens</span>
                    <strong>{formatMoney(order.valor_total)}</strong>
                  </Link>
                ))}
              </div>
            )}
          </section>
          <section className="admin-shortcuts" aria-label="Atalhos administrativos">
            <Link className="admin-shortcut" href="/admin/products"><strong>Produtos</strong><span>Gerenciar catálogo, preços e imagens</span></Link>
            <Link className="admin-shortcut" href="/admin/stock"><strong>Estoque</strong><span>Registrar ajustes e consultar movimentos</span></Link>
            <Link className="admin-shortcut" href="/admin/reports"><strong>Relatórios</strong><span>Consultar vendas e pagamentos demonstrativos</span></Link>
          </section>
        </>
      )}
    </section>
  );
}
