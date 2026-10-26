'use client';

import { FormEvent, useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api';
import type { Paginated, Product, StockMovement } from '@/lib/types';

const PAGE_SIZE = 20;
const MAX_STOCK = 2_147_483_647;

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}

const movementLabels: Record<StockMovement['tipo'], string> = {
  INICIAL: 'Estoque inicial',
  VENDA: 'Venda',
  CANCELAMENTO: 'Cancelamento',
  AJUSTE: 'Ajuste manual',
};

export default function AdminStockPage() {
  const [products, setProducts] = useState<Paginated<Product> | null>(null);
  const [productSearchInput, setProductSearchInput] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [productOffset, setProductOffset] = useState(0);
  const [productRetryKey, setProductRetryKey] = useState(0);
  const [productId, setProductId] = useState('');
  const [selected, setSelected] = useState<Product | null>(null);
  const [movements, setMovements] = useState<Paginated<StockMovement> | null>(null);
  const [direction, setDirection] = useState<'entrada' | 'saida'>('entrada');
  const [amount, setAmount] = useState('1');
  const [reason, setReason] = useState('');
  const [offset, setOffset] = useState(0);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingSelected, setLoadingSelected] = useState(false);
  const [loadingMovements, setLoadingMovements] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setProductSearch(productSearchInput.trim());
      setProductOffset(0);
      if (productSearchInput.trim() !== productSearch) {
        setProductId('');
        setSelected(null);
      }
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [productSearch, productSearchInput]);

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams({
      limit: String(PAGE_SIZE),
      offset: String(productOffset),
    });
    if (productSearch) params.set('search', productSearch);

    async function loadProducts() {
      setLoadingProducts(true);
      setError('');
      try {
        const result = await apiRequest<Paginated<Product>>(`/admin/products?${params}`);
        if (!active) return;
        setProducts(result);
        if (result.items[0]) {
          setProductId((current) => current || String(result.items[0].id));
          setSelected((current) => current || result.items[0]);
        }
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : 'Não foi possível carregar os produtos.');
      } finally {
        if (active) setLoadingProducts(false);
      }
    }
    void loadProducts();
    return () => {
      active = false;
    };
  }, [productOffset, productRetryKey, productSearch]);

  useEffect(() => {
    if (!productId) {
      setSelected(null);
      return;
    }
    let active = true;
    setLoadingSelected(true);
    apiRequest<Product>(`/admin/products/${productId}`)
      .then((product) => {
        if (active) setSelected(product);
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Não foi possível carregar o produto selecionado.');
      })
      .finally(() => {
        if (active) setLoadingSelected(false);
      });
    return () => {
      active = false;
    };
  }, [productId]);

  useEffect(() => {
    if (!productId) {
      setMovements(null);
      return;
    }
    let active = true;
    setLoadingMovements(true);
    setError('');
    apiRequest<Paginated<StockMovement>>(
      `/admin/products/${productId}/stock-movements?limit=${PAGE_SIZE}&offset=${offset}`,
    )
      .then((result) => {
        if (active) setMovements(result);
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Não foi possível carregar o histórico de estoque.');
      })
      .finally(() => {
        if (active) setLoadingMovements(false);
      });
    return () => {
      active = false;
    };
  }, [offset, productId]);

  async function adjustStock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const magnitude = Number(amount);
    const trimmedReason = reason.trim();
    if (!Number.isSafeInteger(magnitude) || magnitude < 1 || magnitude > MAX_STOCK) {
      setError(`Informe uma quantidade inteira entre 1 e ${MAX_STOCK}.`);
      return;
    }
    if (trimmedReason.length < 3) {
      setError('Descreva o motivo do ajuste com pelo menos 3 caracteres.');
      return;
    }
    if (direction === 'saida' && magnitude > selected.quantidade_estoque) {
      setError(`A saída não pode exceder o saldo atual de ${selected.quantidade_estoque}.`);
      return;
    }
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await apiRequest(`/admin/products/${selected.id}/stock-adjustments`, {
        method: 'POST',
        body: JSON.stringify({
          variacao: direction === 'entrada' ? magnitude : -magnitude,
          observacao: trimmedReason,
        }),
      });
      const updated = await apiRequest<Product>(`/admin/products/${selected.id}`);
      setSelected(updated);
      setReason('');
      setOffset(0);
      setProductOffset(0);
      setProductRetryKey((current) => current + 1);
      setSuccess('Ajuste de estoque registrado.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível ajustar o estoque.');
    } finally {
      setSaving(false);
    }
  }

  const pageProducts = products?.items ?? [];
  const selectedOnPage = pageProducts.some((product) => String(product.id) === productId);

  return (
    <section className="admin-content">
      <div className="admin-page-heading">
        <div><h2>Estoque</h2><p>Registre entradas e saídas com motivo e consulte o histórico auditável.</p></div>
      </div>
      {error && <p className="notice notice-error" role="alert">{error}</p>}
      {success && <p className="notice notice-success" role="status">{success}</p>}
      <form className="admin-toolbar" onSubmit={(event) => event.preventDefault()}>
        <label className="admin-search">Buscar produto
          <input value={productSearchInput} onChange={(event) => setProductSearchInput(event.target.value)} placeholder="Nome ou descrição" />
        </label>
      </form>
      {loadingProducts ? <p className="notice">Carregando produtos...</p> : products?.total === 0 ? (
        <div className="empty-state"><h3>Nenhum produto encontrado</h3><p>Altere a busca ou cadastre um produto no catálogo.</p></div>
      ) : (
        <>
          <div className="stock-overview-grid">
            {pageProducts.map((product) => (
              <button
                aria-pressed={String(product.id) === productId}
                className={String(product.id) === productId ? 'stock-product-card selected' : 'stock-product-card'}
                key={product.id}
                onClick={() => {
                  setProductId(String(product.id));
                  setSelected(product);
                  setOffset(0);
                  setSuccess('');
                }}
                type="button"
              >
                <span>{product.nome}</span>
                <strong>{product.quantidade_estoque}</strong>
                <small>{product.ativo ? 'Ativo' : 'Inativo'}</small>
              </button>
            ))}
          </div>
          {products && products.total > PAGE_SIZE && (
            <div className="admin-pagination">
              <span>{productOffset + 1}–{Math.min(productOffset + pageProducts.length, products.total)} de {products.total} produtos</span>
              <div>
                <button className="secondary-button" disabled={productOffset === 0 || loadingProducts} onClick={() => setProductOffset(Math.max(0, productOffset - PAGE_SIZE))} type="button">Anterior</button>
                <button className="secondary-button" disabled={productOffset + PAGE_SIZE >= products.total || loadingProducts} onClick={() => setProductOffset(productOffset + PAGE_SIZE)} type="button">Próxima</button>
              </div>
            </div>
          )}
          {selected && (
            <div className="stock-management-grid">
              <form className="admin-form-card form-stack" onSubmit={adjustStock}>
                <h3>Ajustar saldo</h3>
                <div className="stock-current"><span>Saldo atual</span><strong>{selected.quantidade_estoque} unidades</strong></div>
                <label>Produto
                  <select value={productId} onChange={(event) => {
                    const id = event.target.value;
                    setProductId(id);
                    const product = pageProducts.find((item) => String(item.id) === id);
                    if (product) setSelected(product);
                    setOffset(0);
                  }}>
                    {selectedOnPage ? null : <option value={selected.id}>{selected.nome}</option>}
                    {pageProducts.map((product) => <option key={product.id} value={product.id}>{product.nome}</option>)}
                  </select>
                </label>
                {loadingSelected && <p className="field-hint">Atualizando saldo...</p>}
                <label>Tipo de ajuste
                  <select value={direction} onChange={(event) => setDirection(event.target.value as 'entrada' | 'saida')}>
                    <option value="entrada">Entrada</option>
                    <option value="saida">Saída</option>
                  </select>
                </label>
                <label>Quantidade<input min="1" max={MAX_STOCK} step="1" type="number" required value={amount} onChange={(event) => setAmount(event.target.value)} /></label>
                <label>Motivo do ajuste<textarea maxLength={255} minLength={3} required rows={3} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Ex.: reposição de produção" /></label>
                <button className="primary-button" disabled={saving || loadingSelected} type="submit">{saving ? 'Registrando...' : 'Registrar ajuste'}</button>
              </form>
              <section className="admin-form-card">
                <div className="section-heading"><div><h3>Histórico de movimentações</h3><p>{selected.nome}</p></div></div>
                {loadingMovements ? <p className="notice">Carregando movimentações...</p> : !movements ? <p className="notice">Não foi possível carregar as movimentações.</p> : movements.items.length === 0 ? (
                  <p className="notice">Ainda não há movimentações para este produto.</p>
                ) : (
                  <div className="movement-list">
                    {movements.items.map((movement) => (
                      <article className="movement-row" key={movement.id}>
                        <div><strong>{movementLabels[movement.tipo]}</strong><small>{movement.observacao || 'Sem observação'}</small><time>{formatDate(movement.criado_em)}</time></div>
                        <strong className={movement.variacao > 0 ? 'stock-increase' : 'stock-decrease'}>
                          {movement.variacao > 0 ? '+' : ''}{movement.variacao}
                        </strong>
                      </article>
                    ))}
                  </div>
                )}
                {movements && movements.total > PAGE_SIZE && (
                  <div className="admin-pagination">
                    <span>{movements.total} movimento(s)</span>
                    <div>
                      <button className="secondary-button" disabled={offset === 0 || loadingMovements} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))} type="button">Anterior</button>
                      <button className="secondary-button" disabled={offset + PAGE_SIZE >= movements.total || loadingMovements} onClick={() => setOffset(offset + PAGE_SIZE)} type="button">Próxima</button>
                    </div>
                  </div>
                )}
              </section>
            </div>
          )}
        </>
      )}
    </section>
  );
}
