export type Product = {
  id: number;
  slug: string;
  nome: string;
  descricao: string;
  preco: string;
  imagem_url: string;
  quantidade_estoque: number;
  ativo: boolean;
};

export type Address = {
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string | null;
  bairro: string;
  cidade: string;
  uf: string;
};

export type User = {
  id: number;
  nome_completo: string;
  telefone: string;
  email: string;
  perfil: 'CLIENTE' | 'ADMIN';
  ativo: boolean;
  endereco: Address;
};

export type Order = {
  id: number;
  usuario_id: number;
  nome_cliente: string | null;
  status: string;
  valor_total: string;
  forma_pagamento: 'PIX' | 'CARTAO' | 'DINHEIRO';
  endereco_entrega: Address;
  criado_em: string;
  entregue_em: string | null;
  cancelado_em: string | null;
  cancelado_por: number | null;
  motivo_cancelamento: string | null;
  items: Array<{
    produto_id: number;
    nome_produto: string;
    quantidade: number;
    preco_unitario: string;
  }>;
};

export type Paginated<T> = {
  items: T[];
  total: number;
  limit: number;
  offset: number;
};

export type StockMovement = {
  id: number;
  tipo: 'INICIAL' | 'VENDA' | 'CANCELAMENTO' | 'AJUSTE';
  variacao: number;
  observacao: string | null;
  pedido_id: number | null;
  usuario_id: number | null;
  criado_em: string;
};

export type ReportPeriod = {
  data_inicio: string;
  data_fim: string;
};

export type DashboardReport = {
  periodo: ReportPeriod;
  pedidos_criados: number;
  por_status: Record<string, number>;
  pedidos_entregues: number;
  valor_vendas_concluidas: string;
  unidades_vendidas: number;
  ticket_medio: string;
  estoque: { produtos_ativos: number; baixo: number; esgotados: number };
};

export type SalesReport = {
  group_by: 'day' | 'month';
  periodo: ReportPeriod;
  totais: {
    pedidos: number;
    unidades: number;
    valor: string;
    ticket_medio: string;
  };
  series: Array<{
    periodo: string;
    pedidos: number;
    unidades: number;
    valor: string;
  }>;
};

export type ProductReport = {
  periodo: ReportPeriod;
  items: Array<{
    produto_id: number;
    nome: string;
    quantidade: number;
    valor: string;
  }>;
};

export type PaymentReport = {
  periodo: ReportPeriod;
  total_registros: number;
  valor_total_demonstrativo: string;
  items: Array<{
    forma_pagamento: 'PIX' | 'CARTAO' | 'DINHEIRO';
    quantidade: number;
    valor: string;
  }>;
};
