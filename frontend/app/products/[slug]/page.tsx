'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { MAX_ORDER_QUANTITY } from '@/lib/cart';
import { formatMoney } from '@/lib/money';
import { useStore } from '@/components/store-provider';
import { apiRequest } from '@/lib/api';
import type { Product } from '@/lib/types';

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { addToCart } = useStore();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [added, setAdded] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    apiRequest<Product>(`/products/${encodeURIComponent(slug)}`)
      .then((result) => {
        if (!active) return;
        setProduct(result);
        setQuantity((current) => Math.min(
          current,
          MAX_ORDER_QUANTITY,
          Math.max(1, result.quantidade_estoque),
        ));
      })
      .catch(() => {
        if (active) setError('Não foi possível carregar os detalhes do produto.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [retryKey, slug]);

  if (loading) return <main className="page-shell"><p className="notice">Carregando sabor...</p></main>;
  if (error || !product) {
    return (
      <main className="page-shell">
        <p className="notice notice-error" role="alert">{error || 'Produto não encontrado.'}</p>
        <button className="secondary-button" type="button" onClick={() => setRetryKey((current) => current + 1)}>Tentar novamente</button>
        <Link className="text-link" href="/">Voltar ao cardápio</Link>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <p className="breadcrumb"><Link href="/">Cardápio</Link><span>/</span>{product.nome}</p>
      <section className="product-detail">
        <div className="detail-image" style={{ backgroundImage: `url(${product.imagem_url})` }} role="img" aria-label={product.nome} />
        <div className="detail-copy">
          <p className="eyebrow">Feito artesanalmente</p>
          <h1>{product.nome}</h1>
          <p className="detail-description">{product.descricao}</p>
          <strong className="detail-price">{formatMoney(product.preco)}</strong>
          <p className={product.quantidade_estoque > 0 ? 'availability' : 'availability unavailable'}>
            {product.quantidade_estoque > 0 ? 'Disponível para pedido' : 'Esgotado no momento'}
          </p>
          {product.quantidade_estoque > 0 && (
            <div className="quantity-control product-quantity" aria-label={`Quantidade de ${product.nome}`}>
              <button type="button" aria-label="Diminuir quantidade" disabled={quantity <= 1} onClick={() => setQuantity((current) => Math.max(1, current - 1))}>−</button>
              <span aria-live="polite">{quantity}</span>
              <button type="button" aria-label="Aumentar quantidade" disabled={quantity >= Math.min(product.quantidade_estoque, MAX_ORDER_QUANTITY)} onClick={() => setQuantity((current) => Math.min(product.quantidade_estoque, MAX_ORDER_QUANTITY, current + 1))}>+</button>
            </div>
          )}
          <button
            className="primary-button"
            disabled={product.quantidade_estoque <= 0}
            onClick={() => {
              addToCart(product, quantity);
              setAdded(true);
            }}
            type="button"
          >
            {added ? 'Adicionar mais um' : 'Adicionar ao carrinho'}
          </button>
          {added && <p className="notice notice-success" role="status">Sabor adicionado ao carrinho.</p>}
          <Link className="text-link detail-back" href="/cart">Ver carrinho</Link>
        </div>
      </section>
    </main>
  );
}
