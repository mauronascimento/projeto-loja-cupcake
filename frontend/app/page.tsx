'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiRequest } from '@/lib/api';
import { formatMoney } from '@/lib/money';
import type { Paginated, Product } from '@/lib/types';
import { useStore } from '@/components/store-provider';

export default function HomePage() {
  const [result, setResult] = useState<Paginated<Product> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [offset, setOffset] = useState(0);
  const [retryKey, setRetryKey] = useState(0);
  const [addedProduct, setAddedProduct] = useState('');
  const { addToCart } = useStore();

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams({
      limit: String(PAGE_SIZE),
      offset: String(offset),
    });
    if (search) params.set('search', search);
    setLoading(true);
    setError('');
    apiRequest<Paginated<Product>>(`/products?${params}`)
      .then((result) => {
        if (active) setResult(result);
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Não foi possível carregar o cardápio. Tente novamente em instantes.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [offset, retryKey, search]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const nextSearch = searchInput.trim();
      setOffset(0);
      setSearch(nextSearch);
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  const products = result?.items ?? [];
  const total = result?.total ?? 0;

  return (
    <main className="page-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Cupcakes artesanais, feitos com carinho</p>
          <h1>Pequenos momentos, grandes sabores.</h1>
        </div>
      </header>

      <section className="hero-card">
        <div>
          <span className="badge">Feitos artesanalmente</span>
          <h2>Um sabor para cada momento</h2>
          <p>
            Escolha seu cupcake favorito e transforme o dia com um doce feito com carinho.
          </p>
          <a href="#sabores" className="primary-button">Ver sabores</a>
        </div>
        <div className="hero-visual" role="img" aria-label="Cupcake artesanal com cobertura delicada" />
      </section>

      <section className="catalog-section" id="sabores">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Catálogo</p>
            <h3>Nossos sabores</h3>
          </div>
          <span>{loading ? 'Carregando...' : `${total} opções`}</span>
        </div>

        <label className="catalog-search">
          Buscar sabor
          <input
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Nome ou descrição"
          />
        </label>
        {error && (
          <div className="notice notice-error" role="alert">
            <p>{error}</p>
            <button className="secondary-button" onClick={() => setRetryKey((current) => current + 1)} type="button">Tentar novamente</button>
          </div>
        )}
        {loading && <p className="notice">Carregando o cardápio...</p>}
        {!loading && !error && total === 0 && (
          <p className="notice">{search ? 'Nenhum sabor corresponde à sua busca.' : 'Nenhum produto disponível no momento.'}</p>
        )}
        <div className="product-grid">
          {products.map((product) => (
            <article key={product.id} className="product-card">
              <div
                className="product-image"
                style={{ backgroundImage: `url(${product.imagem_url})` }}
                role="img"
                aria-label={product.nome}
              >
                <Link className="product-image-link" href={`/products/${product.slug}`} aria-label={`Ver detalhes de ${product.nome}`} />
              </div>
              <div className="product-body">
                <div className="product-meta">
                  <h4><Link href={`/products/${product.slug}`}>{product.nome}</Link></h4>
                  <span>{formatMoney(product.preco)}</span>
                </div>
                <p>{product.descricao}</p>
                <div className="product-footer">
                  <small>{product.quantidade_estoque > 0 ? 'Disponível' : 'Esgotado'}</small>
                  <button type="button" disabled={product.quantidade_estoque <= 0} onClick={() => {
                    addToCart(product);
                    setAddedProduct(product.nome);
                    window.setTimeout(() => setAddedProduct(''), 1800);
                  }}>
                    {product.quantidade_estoque > 0 ? 'Adicionar' : 'Indisponível'}
                  </button>
                </div>
                {addedProduct === product.nome && <p className="cart-feedback" role="status">Adicionado ao carrinho.</p>}
              </div>
            </article>
          ))}
        </div>
        {!loading && result && result.total > PAGE_SIZE && (
          <div className="admin-pagination catalog-pagination" aria-label="Paginação do catálogo">
            <span>{offset + 1}–{Math.min(offset + products.length, total)} de {total} sabores</span>
            <div>
              <button className="secondary-button" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))} type="button">Anterior</button>
              <button className="secondary-button" disabled={offset + PAGE_SIZE >= total} onClick={() => setOffset(offset + PAGE_SIZE)} type="button">Próxima</button>
            </div>
          </div>
        )}
      </section>
      <footer className="store-footer">
        <span>Uma experiência doce, do pedido à última mordida.</span>
        <Link href="/cart">Ir para o carrinho</Link>
      </footer>
    </main>
  );
}

const PAGE_SIZE = 12;
