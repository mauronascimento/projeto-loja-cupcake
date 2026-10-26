'use client';

import Link from 'next/link';
import { useStore } from '@/components/store-provider';
import { MAX_ORDER_QUANTITY } from '@/lib/cart';
import { formatCents, formatMoney, toCents } from '@/lib/money';
import { useCartReconciliation } from '@/lib/use-cart-reconciliation';

export default function CartPage() {
  const { cart, cartError, setQuantity } = useStore();
  const {
    currentProducts,
    issues,
    loading,
    retry,
    acceptCurrentProduct,
  } = useCartReconciliation();
  const totalCents = cart.reduce(
    (sum, line) => sum + toCents(line.product.preco) * line.quantity,
    0,
  );
  const needsReview = loading || cart.some(({ product, quantity }) => {
    const current = currentProducts[product.id];
    return Boolean(
      issues[product.id] ||
      !current ||
      current.preco !== product.preco ||
      quantity > current.quantidade_estoque,
    );
  });

  return (
    <main className="page-shell">
      <section className="content-heading">
        <p className="eyebrow">Sua seleção</p>
        <h1>Meu carrinho</h1>
        <p>Confira os sabores e as quantidades antes de continuar.</p>
      </section>
      {cartError && <p className="notice notice-error" role="alert">{cartError}</p>}
      {cart.length === 0 ? (
        <section className="empty-state">
          <span className="empty-icon" aria-hidden="true">♡</span>
          <h2>Seu carrinho está esperando por algo doce</h2>
          <p>Explore o cardápio e escolha seus cupcakes favoritos.</p>
          <Link className="primary-button button-link" href="/">Explorar cupcakes</Link>
        </section>
      ) : (
        <div className="cart-layout">
          <section className="cart-lines" aria-label="Itens do carrinho">
            {cart.map(({ product, quantity }) => {
              const current = currentProducts[product.id];
              const issue = issues[product.id];
              const available = current?.quantidade_estoque ?? product.quantidade_estoque;
              return (
                <article className="cart-line" key={product.id}>
                  <div className="cart-thumb" style={{ backgroundImage: `url(${product.imagem_url})` }} />
                  <div className="cart-product">
                    <h2><Link href={`/products/${product.slug}`}>{product.nome}</Link></h2>
                    <p>{formatMoney(product.preco)} por unidade</p>
                    <small>{available > 0 ? `${available} disponíveis` : 'Esgotado'}</small>
                  </div>
                  <div className="quantity-control" aria-label={`Quantidade de ${product.nome}`}>
                    <button type="button" aria-label="Diminuir quantidade" onClick={() => setQuantity(product.id, quantity - 1)}>−</button>
                    <span aria-live="polite">{quantity}</span>
                    <button type="button" aria-label="Aumentar quantidade" disabled={quantity >= Math.min(available, MAX_ORDER_QUANTITY)} onClick={() => setQuantity(product.id, quantity + 1)}>+</button>
                  </div>
                  <strong>{formatCents(toCents(product.preco) * quantity)}</strong>
                  <button className="text-button cart-remove" type="button" onClick={() => setQuantity(product.id, 0)}>Remover</button>
                  {loading && <p className="cart-reconciliation-notice">Conferindo disponibilidade...</p>}
                  {issue && (
                    <div className="cart-reconciliation-notice notice-error" role="alert">
                      <p>{issue.message}</p>
                      {issue.kind === 'unavailable' && (
                        <button className="text-button" type="button" onClick={() => setQuantity(product.id, 0)}>Remover item</button>
                      )}
                      {issue.kind === 'request' && (
                        <button className="text-button" type="button" onClick={retry}>Tentar novamente</button>
                      )}
                    </div>
                  )}
                  {current && current.preco !== product.preco && (
                    <div className="cart-reconciliation-notice" role="alert">
                      <p>O preço mudou: {formatMoney(product.preco)} → {formatMoney(current.preco)}. Aceite o novo preço para continuar.</p>
                      <button className="secondary-button" type="button" onClick={() => acceptCurrentProduct(product.id)}>Aceitar preço atualizado</button>
                    </div>
                  )}
                  {current && quantity > current.quantidade_estoque && (
                    <div className="cart-reconciliation-notice notice-error" role="alert">
                      <p>Há apenas {current.quantidade_estoque} unidade(s) disponíveis. Ajuste a quantidade antes do checkout.</p>
                      {current.quantidade_estoque > 0 && (
                        <button className="secondary-button" type="button" onClick={() => setQuantity(product.id, current.quantidade_estoque)}>Ajustar quantidade</button>
                      )}
                      {quantity > MAX_ORDER_QUANTITY && (
                        <div className="cart-reconciliation-notice notice-error" role="alert">
                          <p>O limite por produto em um pedido é de {MAX_ORDER_QUANTITY} unidades.</p>
                          <button className="secondary-button" type="button" onClick={() => setQuantity(product.id, MAX_ORDER_QUANTITY)}>Ajustar para o limite</button>
                        </div>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </section>
          <aside className="summary-card">
            <h2>Resumo do pedido</h2>
            <div><span>Itens</span><span>{cart.reduce((sum, line) => sum + line.quantity, 0)}</span></div>
            <div className="summary-total"><span>Total</span><strong>{formatCents(totalCents)}</strong></div>
            {loading && <p className="field-hint">Validando preços e estoque...</p>}
            <Link
              aria-disabled={needsReview}
              className={`primary-button button-link full-width${needsReview ? ' disabled-link' : ''}`}
              href={needsReview ? '/cart' : '/checkout'}
              onClick={(event) => { if (needsReview) event.preventDefault(); }}
            >
              Continuar para pagamento
            </Link>
            <Link className="text-link" href="/">Continuar escolhendo</Link>
          </aside>
        </div>
      )}
    </main>
  );
}
