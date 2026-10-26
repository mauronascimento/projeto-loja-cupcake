'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { apiRequest } from '@/lib/api';
import { formatMoney } from '@/lib/money';
import type {
  DashboardReport,
  PaymentReport,
  ProductReport,
  SalesReport,
} from '@/lib/types';

type ReportTab = 'dashboard' | 'sales' | 'products' | 'payments';

const tabs: Array<{ id: ReportTab; label: string }> = [
  { id: 'dashboard', label: 'Visão geral' },
  { id: 'sales', label: 'Vendas' },
  { id: 'products', label: 'Produtos' },
  { id: 'payments', label: 'Pagamentos demonstrativos' },
];

function queryForPeriod(start: string, end: string) {
  const params = new URLSearchParams();
  if (start && end) {
    params.set('data_inicio', start);
    params.set('data_fim', end);
  }
  return params.toString();
}

export default function AdminReportsPage() {
  const [tab, setTab] = useState<ReportTab>('dashboard');
  const [startInput, setStartInput] = useState('');
  const [endInput, setEndInput] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [groupBy, setGroupBy] = useState<'day' | 'month'>('day');
  const [dashboard, setDashboard] = useState<DashboardReport | null>(null);
  const [sales, setSales] = useState<SalesReport | null>(null);
  const [products, setProducts] = useState<ProductReport | null>(null);
  const [payments, setPayments] = useState<PaymentReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError('');
    const period = queryForPeriod(start, end);
    const suffix = period ? `?${period}` : '';
    const salesParams = new URLSearchParams(period);
    salesParams.set('group_by', groupBy);
    try {
      const [dashboardResult, salesResult, productResult, paymentResult] =
        await Promise.all([
          apiRequest<DashboardReport>(`/admin/dashboard${suffix}`),
          apiRequest<SalesReport>(`/admin/reports/sales?${salesParams}`),
          apiRequest<ProductReport>(`/admin/reports/products${suffix ? `${suffix}&` : '?'}limit=10`),
          apiRequest<PaymentReport>(`/admin/reports/payments${suffix}`),
        ]);
      setDashboard(dashboardResult);
      setSales(salesResult);
      setProducts(productResult);
      setPayments(paymentResult);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível carregar os relatórios.');
    } finally {
      setLoading(false);
    }
  }, [end, groupBy, start]);

  useEffect(() => { void loadReports(); }, [loadReports]);

  function applyPeriod(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (Boolean(startInput) !== Boolean(endInput)) {
      setError('Informe as duas datas ou deixe ambas em branco para usar os últimos 30 dias.');
      return;
    }
    if (startInput && endInput && startInput > endInput) {
      setError('A data inicial deve ser anterior ou igual à data final.');
      return;
    }
    setStart(startInput);
    setEnd(endInput);
  }

  const rangeLabel =
    dashboard?.periodo
      ? `${dashboard.periodo.data_inicio} a ${dashboard.periodo.data_fim}`
      : 'Últimos 30 dias';

  return (
    <section className="admin-content">
      <div className="admin-page-heading">
        <div><h2>Relatórios</h2><p>Indicadores calculados a partir dos pedidos e pagamentos registrados.</p></div>
      </div>
      <form className="report-filter" onSubmit={applyPeriod}>
        <label>Data inicial<input type="date" value={startInput} onChange={(event) => setStartInput(event.target.value)} /></label>
        <label>Data final<input type="date" value={endInput} onChange={(event) => setEndInput(event.target.value)} /></label>
        <button className="primary-button" type="submit">Aplicar período</button>
        <button className="secondary-button" onClick={() => { setStartInput(''); setEndInput(''); setStart(''); setEnd(''); }} type="button">Últimos 30 dias</button>
      </form>
      {error && <p className="notice notice-error" role="alert">{error}</p>}
      <nav className="report-tabs" aria-label="Seções de relatórios">
        {tabs.map((item) => (
          <button
            aria-pressed={tab === item.id}
            className={tab === item.id ? 'report-tab active' : 'report-tab'}
            key={item.id}
            onClick={() => setTab(item.id)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </nav>
      <p className="report-period-note">Período: {rangeLabel}. As vendas consideram pedidos entregues; pagamentos são apenas registros demonstrativos.</p>
      {loading && <p className="notice">Atualizando relatórios...</p>}
      {!loading && !error && tab === 'dashboard' && dashboard && (
        <section className="report-panel">
          <h3>Resumo do período</h3>
          <div className="metrics-grid">
            <article className="metric-card"><span>Pedidos criados</span><strong>{dashboard.pedidos_criados}</strong></article>
            <article className="metric-card"><span>Pedidos entregues</span><strong>{dashboard.pedidos_entregues}</strong></article>
            <article className="metric-card"><span>Vendas concluídas</span><strong>{formatMoney(dashboard.valor_vendas_concluidas)}</strong></article>
            <article className="metric-card"><span>Unidades vendidas</span><strong>{dashboard.unidades_vendidas}</strong></article>
            <article className="metric-card"><span>Ticket médio</span><strong>{formatMoney(dashboard.ticket_medio)}</strong></article>
            <article className="metric-card"><span>Produtos ativos</span><strong>{dashboard.estoque.produtos_ativos}</strong></article>
            <article className="metric-card"><span>Estoque baixo</span><strong>{dashboard.estoque.baixo}</strong></article>
            <article className="metric-card"><span>Sem estoque</span><strong>{dashboard.estoque.esgotados}</strong></article>
          </div>
          <div className="status-summary">
            <h3>Pedidos por status atual</h3>
            <div>{Object.entries(dashboard.por_status).map(([status, count]) => (
              <span className="status-summary-item" key={status}>{status.replaceAll('_', ' ')} <strong>{count}</strong></span>
            ))}</div>
          </div>
        </section>
      )}
      {!loading && !error && tab === 'sales' && sales && (
        <section className="report-panel">
          <div className="section-heading">
            <div><h3>Vendas concluídas</h3><p>Apenas pedidos entregues, agrupados pela data de criação.</p></div>
            <label className="compact-select">Agrupar por
              <select value={groupBy} onChange={(event) => setGroupBy(event.target.value as 'day' | 'month')}>
                <option value="day">Dia</option><option value="month">Mês</option>
              </select>
            </label>
          </div>
          <div className="metrics-grid report-metrics">
            <article className="metric-card"><span>Pedidos</span><strong>{sales.totais.pedidos}</strong></article>
            <article className="metric-card"><span>Unidades</span><strong>{sales.totais.unidades}</strong></article>
            <article className="metric-card"><span>Valor vendido</span><strong>{formatMoney(sales.totais.valor)}</strong></article>
            <article className="metric-card"><span>Ticket médio</span><strong>{formatMoney(sales.totais.ticket_medio)}</strong></article>
          </div>
          {sales.series.length === 0 ? <p className="notice">Não há períodos para exibir.</p> : (
            <div className="report-chart" role="img" aria-label="Gráfico de valores de vendas por período">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sales.series} margin={{ top: 12, right: 12, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e6d9d2" />
                  <XAxis dataKey="periodo" tick={{ fill: '#796b64', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#796b64', fontSize: 12 }} />
                  <Tooltip formatter={(value) => formatMoney(String(value ?? '0.00'))} />
                  <Bar dataKey="valor" name="Vendas (R$)" fill="#9b6c6b" radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
      )}
      {!loading && !error && tab === 'products' && products && (
        <section className="report-panel">
          <h3>Produtos mais vendidos</h3>
          <p>Ranking baseado em pedidos entregues; valores e quantidades são históricos.</p>
          {products.items.length === 0 ? <p className="notice">Nenhuma venda concluída neste período.</p> : (
            <div className="report-table-wrap"><table className="report-table">
              <thead><tr><th>Produto</th><th>Unidades</th><th>Valor vendido</th></tr></thead>
              <tbody>{products.items.map((item) => (
                <tr key={item.produto_id}><td>{item.nome}</td><td>{item.quantidade}</td><td>{formatMoney(item.valor)}</td></tr>
              ))}</tbody>
            </table></div>
          )}
        </section>
      )}
      {!loading && !error && tab === 'payments' && payments && (
        <section className="report-panel">
          <h3>Pagamentos demonstrativos</h3>
          <p>Inclui todos os pedidos, inclusive pendentes e cancelados. Não representa dinheiro recebido.</p>
          <div className="report-highlight"><span>{payments.total_registros} registros</span><strong>{formatMoney(payments.valor_total_demonstrativo)}</strong></div>
          <div className="report-payment-grid">
            {payments.items.map((item) => (
              <article className="metric-card" key={item.forma_pagamento}>
                <span>{item.forma_pagamento}</span><strong>{formatMoney(item.valor)}</strong><small>{item.quantidade} pedido(s)</small>
              </article>
            ))}
          </div>
        </section>
      )}
      {!loading && error && <button className="secondary-button" onClick={() => void loadReports()} type="button">Tentar novamente</button>}
    </section>
  );
}
