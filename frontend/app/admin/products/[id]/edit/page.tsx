'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams, useSearchParams } from 'next/navigation';
import { apiRequest } from '@/lib/api';
import type { Product } from '@/lib/types';

export default function EditAdminProductPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(searchParams.get('created') === '1' ? 'Produto cadastrado. Você já pode adicionar uma foto.' : '');

  useEffect(() => {
    apiRequest<Product>(`/admin/products/${params.id}`)
      .then((item) => {
        setProduct(item);
        setName(item.nome);
        setDescription(item.descricao);
        setPrice(item.preco);
      })
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Não foi possível carregar o produto.'))
      .finally(() => setLoading(false));
  }, [params.id]);

  async function saveDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const updated = await apiRequest<Product>(`/admin/products/${params.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          nome: name.trim(),
          descricao: description.trim(),
          preco: price.replace(',', '.'),
        }),
      });
      setProduct(updated);
      setSuccess('Dados do produto atualizados.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível salvar o produto.');
    } finally {
      setSaving(false);
    }
  }

  async function uploadImage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      setError('Selecione um arquivo de imagem.');
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setError('A imagem deve ter no máximo 3 MiB.');
      return;
    }
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const form = new FormData();
      form.append('file', file);
      const updated = await apiRequest<Product>(`/admin/products/${params.id}/image`, {
        method: 'PUT',
        body: form,
      });
      setProduct(updated);
      setFile(null);
      setSuccess('Imagem atualizada com sucesso.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível enviar a imagem.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <section className="admin-content"><p className="notice">Carregando produto...</p></section>;
  if (!product) return <section className="admin-content"><p className="notice notice-error" role="alert">{error || 'Produto não encontrado.'}</p><Link className="text-link" href="/admin/products">Voltar para produtos</Link></section>;

  return (
    <section className="admin-content">
      <div className="admin-page-heading">
        <div><h2>Editar produto</h2><p>Estoque é gerenciado separadamente para manter o histórico de movimentos.</p></div>
        <Link className="text-link" href="/admin/products">Voltar para produtos</Link>
      </div>
      {success && <p className="notice notice-success" role="status">{success}</p>}
      {error && <p className="notice notice-error" role="alert">{error}</p>}
      <div className="admin-edit-grid">
        <form className="admin-form-card form-stack" onSubmit={saveDetails}>
          <h3>Dados do produto</h3>
          <label>Nome<input maxLength={150} minLength={2} required value={name} onChange={(event) => setName(event.target.value)} /></label>
          <label>Descrição<textarea maxLength={2000} minLength={5} required rows={5} value={description} onChange={(event) => setDescription(event.target.value)} /></label>
          <label>Preço (R$)<input inputMode="decimal" pattern="[0-9]+([.,][0-9]{1,2})?" required value={price} onChange={(event) => setPrice(event.target.value)} /></label>
          <div className="product-edit-stock">
            <span>Estoque atual</span><strong>{product.quantidade_estoque} unidades</strong>
            <Link className="text-link" href="/admin/stock">Ajustar estoque</Link>
          </div>
          <button className="primary-button" disabled={saving} type="submit">{saving ? 'Salvando...' : 'Salvar alterações'}</button>
        </form>
        <form className="admin-form-card form-stack" onSubmit={uploadImage}>
          <h3>Imagem do produto</h3>
          <Image
            alt={`Imagem atual de ${product.nome}`}
            className="admin-image-preview"
            height={700}
            src={product.imagem_url}
            unoptimized
            width={1000}
          />
          <p className="field-hint">JPG, PNG ou WebP, até 3 MiB.</p>
          <label>Escolher nova imagem<input accept="image/jpeg,image/png,image/webp" onChange={(event) => setFile(event.target.files?.[0] ?? null)} type="file" /></label>
          <button className="primary-button" disabled={saving || !file} type="submit">{saving ? 'Enviando...' : 'Enviar imagem'}</button>
        </form>
      </div>
    </section>
  );
}
