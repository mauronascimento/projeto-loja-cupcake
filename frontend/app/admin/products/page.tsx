'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { apiRequest } from '@/lib/api';
import { formatMoney } from '@/lib/money';
import type { Paginated, Product } from '@/lib/types';

const PAGE_SIZE = 20;

export default function AdminProductsPage() {
  const [result, setResult] = useState<Paginated<Product> | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError('');
    const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) });
    if (search.trim()) params.set('search', search.trim());
    if (activeFilter) params.set('ativo', activeFilter);
    try {
      setResult(await apiRequest<Paginated<Product>>(`/admin/products?${params}`));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível carregar os produtos.');
    } finally {
      setLoading(false);
    }
  }, [activeFilter, offset, search]);

  useEffect(() => { void loadProducts(); }, [loadProducts]);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setOffset(0);
    setSearch(searchInput);
  }

  async function toggleActive(product: Product) {
    setError('');
    try {
      await apiRequest<Product>(`/admin/products/${product.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ ativo: !product.ativo }),
      });
      await loadProducts();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível atualizar o produto.');
    }
  }

  return (
    <section className="admin-content">
      <div className="admin-page-heading">
        <div><h2>Produtos</h2><p>Cadastre, edite e controle a disponibilidade do catálogo.</p></div>
        <Link className="primary-button button-link" href="/admin/products/new">Novo produto</Link>
      </div>

      <form className="admin-toolbar" onSubmit={submitSearch}>
        <label className="admin-search">Buscar produto
          <input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Nome ou descrição" />
        </label>
        <label>Disponibilidade
          <select value={activeFilter} onChange={(event) => { setActiveFilter(event.target.value); setOffset(0); }}>
            <option value="">Todos</option>
            <option value="true">Ativos</option>
            <option value="false">Inativos</option>
          </select>
        </label>
        <button className="secondary-button" type="submit">Buscar</button>
      </form>

      {error && <p className="notice notice-error" role="alert">{error}</p>}
      {loading && <p className="notice">Carregando produtos...</p>}
      {!loading && result?.items.length === 0 && (
        <div className="empty-state"><h3>Nenhum produto encontrado</h3><p>Tente outra busca ou cadastre um sabor.</p></div>
      )}
      {!loading && result && result.items.length > 0 && (
        <>
          <div className="admin-product-list">
            {result.items.map((product) => (
              <article className="admin-product-card" key={product.id}>
                <Image
                  alt=""
                  className="admin-product-image"
                  height={88}
                  src={product.imagem_url}
                  unoptimized
                  width={88}
                />
                <div className="admin-product-info">
                  <div className="admin-product-title">
                    <h3>{product.nome}</h3>
                    <span className={product.ativo ? 'status-pill status-active' : 'status-pill status-inactive'}>
                      {product.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                  <p>{product.descricao}</p>
                  <div className="admin-product-meta">
                    <strong>{formatMoney(product.preco)}</strong>
                    <span>{product.quantidade_estoque} em estoque</span>
                  </div>
                </div>
                <div className="admin-card-actions">
                  <Link className="secondary-button button-link" href={`/admin/products/${product.id}/edit`}>Editar</Link>
                  <button className="text-button" type="button" onClick={() => void toggleActive(product)}>
                    {product.ativo ? 'Desativar' : 'Reativar'}
                  </button>
                </div>
              </article>
            ))}
          </div>
          <div className="admin-pagination">
            <span>{result.total} produto(s)</span>
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
