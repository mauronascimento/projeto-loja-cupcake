'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiRequest } from '@/lib/api';
import { useStore } from '@/components/store-provider';

export default function LoginPage() {
  const router = useRouter();
  const { refreshUser } = useStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, senha: password }),
      });
      const authenticatedUser = await refreshUser();
      if (!authenticatedUser) {
        throw new Error('Sua sessão não pôde ser verificada. Tente entrar novamente.');
      }
      const destination = new URLSearchParams(window.location.search).get('next');
      if (authenticatedUser.perfil === 'ADMIN') {
        router.replace('/admin');
        return;
      }
      const allowedClientDestination =
        destination === '/' ||
        destination === '/checkout' ||
        destination === '/orders' ||
        destination === '/account' ||
        /^\/orders\/\d+$/.test(destination ?? '');
      router.replace(allowedClientDestination && destination ? destination : '/');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível entrar.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="form-page">
      <section className="form-card">
        <p className="eyebrow">Que bom ter você de volta</p>
        <h1>Entrar na sua conta</h1>
        <p className="form-intro">Acompanhe seus pedidos e continue escolhendo seus sabores favoritos.</p>
        <form className="form-stack" onSubmit={handleSubmit}>
          <label>
            E-mail
            <input autoComplete="email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          <label>
            Senha
            <input autoComplete="current-password" type="password" required value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>
          {error && <p className="notice notice-error" role="alert">{error}</p>}
          <button className="primary-button" disabled={submitting} type="submit">
            {submitting ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
        <p className="form-switch">Ainda não tem conta? <Link href="/register">Cadastre-se</Link></p>
      </section>
    </main>
  );
}
