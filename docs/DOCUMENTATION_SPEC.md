# DOCUMENTATION_SPEC.md
## Especificação para elaboração da documentação acadêmica — PIT Cupcake Store

**Versão:** 1.0  
**Projeto:** Sistema de Loja Virtual de Cupcakes  
**Curso:** Engenharia de Software — Universidade Cruzeiro do Sul  
**Tipo de documento:** Contrato de produção da documentação acadêmica  
**Idioma:** Português brasileiro  
**Status:** Especificação documental consolidada; documentação acadêmica final ainda não produzida.

---

# 0. OBJETIVO DESTE DOCUMENTO

Este documento estabelece as instruções, a estrutura, os critérios de qualidade e as fontes que deverão orientar a elaboração da documentação acadêmica definitiva do projeto **Cupcake Store**.

O objetivo não é implementar, refatorar ou modificar o sistema.

O objetivo é **reconstruir e atualizar a documentação do Projeto Integrador (PIT)**, preservando a apresentação acadêmica utilizada anteriormente, mas descrevendo a aplicação efetivamente desenvolvida.

A documentação deverá ser compreensível por professores, avaliadores e estudantes de Engenharia de Software.

Deverá demonstrar a aplicação prática dos conceitos de:

- Levantamento e especificação de requisitos.
- Metodologias ágeis.
- Histórias de usuário.
- Priorização de backlog.
- Modelagem de casos de uso.
- Modelagem orientada a objetos.
- Modelagem de banco de dados relacional.
- Diagramas UML e de processos.
- Arquitetura de software.
- Desenvolvimento de aplicações web.
- Testes e validação de software.

**Regra principal:** não confundir requisitos planejados com funcionalidades implementadas.

---

# 1. FONTES E HIERARQUIA DE CONFIABILIDADE

A documentação deverá utilizar quatro referências.

## 1.1. Documentação acadêmica anterior

Arquivo: `Documentacao - PIT- Mauro Matias.pdf`

Função:

- Preservar a identidade visual do trabalho anterior.
- Preservar a organização acadêmica e a sequência geral dos capítulos.
- Manter o modelo dos cartões de histórias de usuário.
- Manter a apresentação de backlog, tarefas técnicas, diagramas e mapas.
- Servir como referência de formatação, e não como autoridade sobre o funcionamento atual do software.

A documentação possui 37 páginas e 16 seções principais.

O material contém funcionalidades planejadas anteriormente que foram posteriormente retiradas do escopo. Portanto, seu conteúdo técnico deverá ser revisado.

## 1.2. Enunciado acadêmico original

Arquivo: `prompt1.txt`

Função:

- Identificar os artefatos exigidos pela atividade universitária.
- Preservar os campos obrigatórios dos cartões de histórias.
- Preservar o backlog priorizado.
- Garantir a produção dos casos de uso, diagramas e tarefas técnicas solicitados.
- Utilizar o contexto comercial de uma loja de cupcakes.

O texto sobre o negócio de cupcakes é material de contexto e não deve ser reproduzido literalmente como texto autoral.

O enunciado também menciona um documento-exemplo externo e exige originalidade. Nenhum texto ou exemplo desse material externo deverá ser copiado.

## 1.3. Especificação de implementação

Arquivo: `PROJECT_SPEC.md`

Função:

- Descrever a arquitetura planejada e declarada como implementada.
- Identificar módulos, funcionalidades e regras de negócio.
- Definir tecnologias, endpoints, estruturas de dados e regras de segurança.
- Orientar a reconstrução dos diagramas técnicos.
- Delimitar as funcionalidades excluídas do MVP.


## 1.4. Código-fonte da aplicação

Projeto: `projeto-loja-cupcake`

Função:

- Confirmar a estrutura real dos diretórios.
- Confirmar os modelos ORM e o esquema do banco.
- Identificar os controllers e endpoints efetivos.
- Confirmar os fluxos do frontend.
- Confirmar as dependências e suas versões.
- Identificar e classificar os testes existentes.


## 1.5. Critério para conflitos

Em caso de divergência, utilizar a seguinte hierarquia:

1. Código-fonte efetivamente inspecionado.
2. Comportamento demonstrado ou evidências verificáveis de execução.
3. `PROJECT_SPEC.md`, como referência técnica declarada.
4. Documentação acadêmica anterior, para apresentação visual e organização.
5. Contexto do enunciado original.

O enunciado acadêmico permanece obrigatório quanto aos artefatos solicitados.

Quando houver divergência entre artefatos, registrar a resolução adotada.

Não criar informações fictícias para preencher lacunas.

---

# 2. IDENTIDADE VISUAL E FORMATAÇÃO

## 2.1. Referência principal

O layout da documentação anterior deverá ser preservado em sua identidade geral.

Características:

- Apresentação institucional.
- Cabeçalho acadêmico.
- Títulos numerados.
- Hierarquia consistente de seções.
- Separadores visuais entre capítulos.
- Tabelas bem delimitadas.
- Diagramas centralizados.
- Uso equilibrado de espaços.
- Identificação do projeto e do aluno.

A referência apresenta predominantemente azul-escuro e detalhes em verde-água.

Essas cores deverão orientar a documentação acadêmica, independentemente das cores utilizadas na interface da aplicação.

**Não confundir a identidade visual do documento com a identidade Clean Boutique do software.**

## 2.2. Preservação dos dados acadêmicos

A identificação institucional e pessoal deverá ser recuperada do PDF anterior.

Não inventar:

- Nome de orientador.
- Disciplina.
- Semestre.
- Campus.
- Data de entrega.
- Nomes de integrantes adicionais.
- Assinaturas ou aprovações.

Quando alguma informação atualizada for necessária e não estiver disponível, indicar um campo pendente para preenchimento.

## 2.3. Formatação editorial

Utilizar:

- Títulos e subtítulos numerados.
- Parágrafos com linguagem técnica e acadêmica.
- Tabelas padronizadas.
- Figuras numeradas e legendadas.
- Diagramas acompanhados de explicação.
- Referências cruzadas entre histórias e casos de uso.
- Quebras de página apropriadas na versão final.

Evitar:

- Tabelas divididas de maneira ilegível.
- Diagramas com texto minúsculo.
- Páginas excessivamente vazias.
- Imagens distorcidas.
- Conteúdo desalinhado.
- Uso excessivo de cores.
- Capturas de tela sem legenda.
- Texto de marketing apresentado como resultado científico.

## 2.4. Markdown e documento final

O Markdown será a fonte textual da documentação.

O documento acadêmico definitivo poderá ser exportado para PDF, mantendo uma diagramação profissional.

O processo de exportação deverá preservar tabelas, diagramas, acentuação, paginação e legibilidade.

Não afirmar conformidade integral com normas ABNT sem conhecer as exigências específicas da instituição e sem verificar a formatação aplicada.

---

# 3. ESTRUTURA OBRIGATÓRIA DO PIT

Manter as 16 seções principais do documento anterior, com a sequência abaixo.

| Nº | Seção |
|---|---|
| 1 | Visão Geral do Negócio |
| 2 | Objetivos do Sistema |
| 3 | Atores do Sistema |
| 4 | Histórias de Usuário |
| 5 | Mapa de Afinidade |
| 6 | Backlog Priorizado |
| 7 | Tarefas Técnicas |
| 8 | Diagrama de Casos de Uso |
| 9 | Casos de Uso Expandidos |
| 10 | Diagrama de Classes |
| 11 | Diagrama de Sequência — Login |
| 12 | Diagrama de Sequência — Compra |
| 13 | Diagrama de Sequência — Entrega |
| 14 | Wireframes |
| 15 | Mapa Conceitual |
| 16 | Mapa Navegacional |

Incorporar também:

- Modelo relacional PostgreSQL e diagrama entidade-relacionamento.
- Arquitetura da solução e tecnologias.
- Evidências de implementação e testes.
- Considerações finais e limitações.
- Referências bibliográficas e técnicas, quando utilizadas.

Esses conteúdos poderão ser adicionados como seções complementares após as 16 seções originais ou inseridos em pontos pertinentes sem prejudicar a rastreabilidade da sequência original.

---

# 4. ESPECIFICAÇÃO DE CADA SEÇÃO

## 4.1. Seção 1 — Visão Geral do Negócio

Apresentar a proposta de uma loja virtual de cupcakes artesanais.

Descrever:

- Problema de organizar vendas, pedidos e estoque.
- Oportunidade de utilizar uma plataforma web.
- Catálogo digital de cupcakes.
- Carrinho e registro de pedidos.
- Gestão operacional pelo administrador.
- Consulta de pedidos e controle de disponibilidade.
- Natureza demonstrativa do empreendimento.

Não afirmar que a plataforma representa uma empresa comercial real ou que já gerou aumento de faturamento.

O contexto comercial deverá ser tratado como cenário de aplicação de Engenharia de Software.

## 4.2. Seção 2 — Objetivos do Sistema

Separar objetivo geral e objetivos específicos.

O objetivo geral deverá explicar o desenvolvimento de uma aplicação web responsiva para a gestão de uma loja virtual de cupcakes.

Os objetivos específicos deverão corresponder às funcionalidades declaradas no projeto:

- Exibir produtos em catálogo.
- Permitir montagem de carrinho sem autenticação.
- Possibilitar cadastro e login.
- Registrar pedidos de forma transacional.
- Registrar formas de pagamento demonstrativas.
- Permitir acompanhamento e cancelamento de pedidos elegíveis.
- Administrar produtos e imagens.
- Controlar estoque e registrar movimentações.
- Permitir atualização dos status.
- Exibir indicadores e relatórios administrativos.

Distinguir objetivos funcionais de características técnicas, como segurança, responsividade e persistência.

## 4.3. Seção 3 — Atores do Sistema

Considerar como atores humanos principais:

**Cliente:** consulta catálogo, cria conta, compra, acompanha pedidos, cancela pedidos elegíveis e administra seu perfil.

**Administrador:** mantém produtos, ajusta estoque, atualiza pedidos e consulta relatórios.

O sistema executa operações automatizadas de validação, cálculo e persistência, mas não deve ser confundido com um terceiro usuário humano.

Não utilizar o ator Entregador como participante implementado, pois a especificação atual atribui as transições de entrega ao administrador.

Não utilizar gateway bancário como ator externo, porque pagamentos não são processados.

## 4.4. Seção 4 — Histórias de Usuário

Preservar o formato acadêmico dos cartões da documentação anterior.

Cada cartão deve conter:

- ID.
- Título.
- Requerente.
- Ação.
- Comentários.
- História no formato "Como..., quero..., para...".
- Critérios de aceitação `CA#`.
- Regras de negócio `RN#`.
- Requisitos não funcionais `RNF#`.
- Prioridade entre A e E.
- Estimativa em pontos de história.

Organizar as histórias por temas.

Temas recomendados:

1. Acesso e Cadastro.
2. Catálogo e Produtos.
3. Carrinho e Checkout.
4. Pedidos e Entrega.
5. Administração de Produtos.
6. Controle de Estoque.
7. Dashboard e Relatórios.

### Regras dos cartões

Os critérios de aceitação devem representar comportamentos observáveis e verificáveis.

As regras de negócio deverão ser consistentes com os contratos e o domínio da aplicação.

Os requisitos não funcionais poderão incluir segurança, responsividade, integridade e manutenção.

Não incluir gateway de pagamento, recuperação de senha, cálculo de frete, rastreamento GPS ou emissão de comprovante PDF como funcionalidades implementadas.

Criar histórias novas para recursos efetivamente presentes no escopo atual e ausentes do documento anterior.

Se uma funcionalidade original foi removida, não reutilizar seu cartão como se tivesse sido implementado.

### IDs e estimativas

Criar uma numeração única, sequencial e estável.

O PDF anterior possui algumas divergências entre os IDs dos cartões e os IDs apresentados no backlog. Corrigir essa inconsistência.

Preservar estimativas originais quando a história permanecer suficientemente equivalente.

Para histórias novas ou substancialmente alteradas, apresentar estimativas acadêmicas reconstruídas, identificadas como tal; não afirmar que representam planejamento histórico comprovado.

## 4.5. Seção 5 — Mapa de Afinidade

Construir mapa agrupando histórias de usuário relacionadas.

O agrupamento deverá refletir o sistema atual.

Sugestão de grupos:

- Autenticação e usuários.
- Vitrine e catálogo.
- Carrinho e compra.
- Pedidos e acompanhamento.
- Gestão de produtos.
- Estoque e movimentações.
- Indicadores e relatórios.

Cada grupo deverá conter referências aos IDs das histórias correspondentes.

O mapa não deverá possuir histórias ausentes do backlog.

Preferir representação visual de boa leitura, com temas, relacionamentos e distinção entre os conjuntos.

## 4.6. Seção 6 — Backlog Priorizado

Apresentar tabela com:

- ID.
- História de usuário.
- Estimativa em pontos.
- Prioridade.
- Tema funcional.

O backlog deve corresponder exatamente aos cartões apresentados na seção 4.

Não renumerar arbitrariamente as histórias.

Priorizar o fluxo principal do sistema:

cadastro/autenticação, catálogo, carrinho, checkout, pedidos, estoque e administração.

A priorização deve ser justificada pela importância funcional e pelas dependências entre recursos.

Distinguir prioridades acadêmicas reconstruídas da ordem cronológica real de desenvolvimento, caso esta não esteja documentada.

## 4.7. Seção 7 — Tarefas Técnicas

Decompor os requisitos em tarefas concretas relacionadas à implementação.

Organizar por camadas ou módulos:

- Infraestrutura e Docker.
- Modelagem do PostgreSQL.
- Migrations e dados iniciais.
- Autenticação e autorização.
- Endpoints de produtos.
- Checkout e pedidos.
- Controle de estoque.
- Dashboard e relatórios.
- Frontend público.
- Frontend administrativo.
- Testes e validação.

Cada tarefa deverá estar vinculada a pelo menos uma história, requisito ou necessidade técnica transversal.

Não registrar como realizado algo que não esteja sustentado pela especificação declarada ou por evidências disponíveis.

Se necessário, utilizar colunas:

`ID | História relacionada | Tarefa | Camada | Resultado esperado`.

## 4.8. Seção 8 — Diagrama de Casos de Uso

Produzir um diagrama geral da aplicação.

Atores principais:

- Cliente.
- Administrador.

Casos de uso do cliente:

- Consultar catálogo.
- Buscar cupcake.
- Visualizar detalhes.
- Gerenciar carrinho.
- Cadastrar-se.
- Autenticar-se.
- Atualizar perfil.
- Finalizar pedido.
- Consultar pedidos.
- Cancelar pedido elegível.

Casos de uso do administrador:

- Autenticar-se.
- Gerenciar produtos.
- Substituir imagens.
- Ajustar estoque.
- Consultar histórico de movimentações.
- Consultar pedidos.
- Atualizar status.
- Cancelar pedidos elegíveis.
- Visualizar dashboard.
- Consultar relatórios.

Representar corretamente a fronteira do sistema.

Utilizar UML de casos de uso; quando Mermaid não oferecer representação suficientemente adequada, utilizar draw.io ou ferramenta equivalente.

Evitar relacionamentos `include` e `extend` sem justificativa semântica.

## 4.9. Seção 9 — Casos de Uso Expandidos

Preservar o padrão de escrita do PDF:

- Nome.
- Identificador.
- Descrição.
- Ator principal.
- Pré-condições.
- Pós-condições.
- Caso básico de ação.
- Fluxos alternativos.
- Fluxos de exceção, quando relevantes.

Produzir casos de uso para os principais fluxos.

Cobertura mínima:

1. Criar conta.
2. Autenticar usuário.
3. Consultar catálogo.
4. Buscar produto.
5. Visualizar detalhes do produto.
6. Adicionar produto ao carrinho.
7. Alterar ou remover itens.
8. Finalizar pedido.
9. Consultar pedido.
10. Cancelar pedido.
11. Cadastrar produto.
12. Editar ou desativar produto.
13. Ajustar estoque.
14. Atualizar status do pedido.
15. Consultar dashboard e relatórios.

Não criar um caso de uso de pagamento bancário online, pois a aplicação apenas registra a escolha demonstrativa.

Os fluxos alternativos deverão descrever situações reais, como:

- E-mail duplicado.
- Credenciais inválidas.
- Sessão expirada.
- Produto indisponível.
- Estoque insuficiente.
- Preço alterado.
- Pedido já entregue.
- Transição de status inválida.

## 4.10. Seção 10 — Diagrama de Classes

Reconstruir o diagrama a partir do modelo ORM declarado ou do código verificado.

Entidades principais previstas:

- Usuario.
- Sessao.
- Produto.
- Pedido.
- ItemPedido.
- Pagamento.
- MovimentacaoEstoque.

Apresentar atributos fundamentais, tipos relevantes e relacionamentos.

As cardinalidades deverão corresponder às FKs e constraints.

Não representar camadas, classes de serviço ou métodos que não existam na implementação apenas para tornar o desenho mais complexo.

A documentação poderá apresentar separadamente classes de domínio persistente e componentes de aplicação.

O diagrama não substitui o modelo relacional.

## 4.11. Seção 11 — Diagrama de Sequência: Login

Descrever o fluxo:

1. Usuário informa e-mail e senha.
2. Frontend solicita autenticação.
3. FastAPI valida as credenciais.
4. Backend consulta os dados necessários.
5. Sessão é criada e persistida.
6. Cookie HttpOnly é retornado.
7. Frontend atualiza o estado de autenticação.
8. Usuário acessa área permitida.

Utilizar os componentes reais:

- Navegador.
- Next.js.
- FastAPI.
- PostgreSQL.

Incluir fluxo alternativo de credenciais inválidas.

Não representar emissão de JWT.

## 4.12. Seção 12 — Diagrama de Sequência: Compra

Descrever:

1. Consulta de produtos.
2. Adição ao carrinho local.
3. Autenticação quando necessária.
4. Seleção do pagamento demonstrativo.
5. Envio do pedido com chave de idempotência.
6. Validação de preço e estoque.
7. Persistência transacional do pedido.
8. Registro dos itens e pagamento demonstrativo.
9. Baixa de estoque e registro das movimentações.
10. Confirmação do pedido.

Mostrar os caminhos de erro essenciais:

- Estoque insuficiente.
- Preço divergente.
- Repetição idempotente da mesma compra.

Evitar introduzir integração financeira externa.

## 4.13. Seção 13 — Diagrama de Sequência: Entrega

Descrever o acompanhamento administrativo:

`EM_PREPARACAO → SAIU_PARA_ENTREGA → ENTREGUE`.

Incluir:

- Consulta do pedido.
- Autorização do administrador.
- Validação da transição.
- Atualização transacional do status.
- Consulta posterior pelo cliente.

Também produzir um diagrama complementar de cancelamento, quando adequado.

O cancelamento é permitido em preparação e após sair para entrega, mas não quando o pedido estiver entregue ou cancelado.

Mostrar a devolução de estoque no cancelamento.

Não inventar eventos de rastreamento nem uma tabela de histórico de transições.

## 4.14. Seção 14 — Wireframes

Preservar o objetivo visual da seção original, mas representar as telas do sistema atual.

Cobrir, no mínimo:

**Área do cliente**

- Home/catálogo.
- Detalhes do produto.
- Carrinho.
- Login.
- Cadastro.
- Checkout.
- Meus Pedidos.
- Detalhes do pedido.

**Área administrativa**

- Dashboard.
- Produtos.
- Cadastro/edição.
- Estoque.
- Gestão de Pedidos.
- Relatórios.

Priorizar capturas reais do aplicativo quando disponíveis.

Distinguir:

- Wireframe: representação estrutural.
- Screenshot: evidência da implementação.

Não apresentar wireframes conceituais como capturas do software executado.

Cada figura deverá possuir número, título e identificação adequada de sua origem.

## 4.15. Seção 15 — Mapa Conceitual

Apresentar os principais conceitos e seus relacionamentos.

Núcleo:

**Cupcake Store**

Grupos:

- Usuários e autenticação.
- Produtos e catálogo.
- Carrinho e checkout.
- Pedidos.
- Pagamentos demonstrativos.
- Estoque.
- Administração e relatórios.

O mapa deve facilitar o entendimento do domínio sem duplicar o diagrama de classes.

## 4.16. Seção 16 — Mapa Navegacional

Construir a hierarquia das páginas realmente previstas.

### Área pública e cliente

- `/`
- `/products/[slug]`
- `/cart`
- `/checkout`
- `/login`
- `/register`
- `/account`
- `/orders`
- `/orders/[id]`

### Área administrativa

- `/admin`
- `/admin/products`
- `/admin/products/new`
- `/admin/products/[id]/edit`
- `/admin/stock`
- `/admin/orders`
- `/admin/orders/[id]`
- `/admin/reports`

Identificar rotas públicas, autenticadas e exclusivas do administrador.

Mostrar os principais caminhos de navegação:

- Visitante → carrinho → login/cadastro → checkout.
- Checkout → confirmação → acompanhamento.
- Administrador → dashboard → módulos operacionais.

Não confundir rotas de páginas Next.js com endpoints REST FastAPI.

---

# 5. MODELO RELACIONAL DO BANCO DE DADOS

O enunciado acadêmico original exige explicitamente um diagrama de banco de dados relacional.

Esse artefato deverá ser incluído na documentação.

## 5.1. Entidades

Conforme a especificação declarada:

1. `usuarios`
2. `sessoes`
3. `produtos`
4. `pedidos`
5. `itens_pedido`
6. `pagamentos`
7. `movimentacoes_estoque`

## 5.2. Requisitos do diagrama

Apresentar:

- Tabelas.
- Chaves primárias.
- Chaves estrangeiras.
- Relacionamentos.
- Cardinalidades.
- Principais restrições de integridade.

Distinguir o modelo lógico do modelo físico, caso ambos sejam exibidos.

No modelo físico, utilizar os nomes das tabelas e colunas realmente definidos nas migrations.

Não acrescentar tabelas de categorias, carrinhos ou endereços independentes, pois não fazem parte da especificação declarada.

## 5.3. Explicações obrigatórias

Descrever a finalidade de cada tabela.

Explicar por que:

- O carrinho é mantido no navegador.
- Os pedidos preservam dados históricos de entrega.
- Os itens armazenam preço e nome do momento da compra.
- O pagamento é demonstrativo.
- O estoque possui histórico de movimentações.
- As sessões são persistidas no banco.

Explicar brevemente PK, FK, índices, constraints e integridade referencial em linguagem acadêmica apropriada.

---

# 6. ARQUITETURA E TECNOLOGIAS

Produzir seção complementar com visão técnica da solução.

## 6.1. Arquitetura geral

Representar:

`Navegador → Next.js → FastAPI → PostgreSQL`.

Descrever a composição Docker:

- `frontend`
- `backend`
- `database`

Explicar a comunicação entre serviços e a responsabilidade de cada camada.

## 6.2. Backend

Referência técnica declarada:

- Python 3.12.
- FastAPI.
- Pydantic.
- SQLAlchemy.
- Alembic.
- PostgreSQL.
- Poetry.
- Pytest.

Descrever o monólito e a organização MVC pragmática.

**Preservar a organização informada pelo usuário: as rotas estão declaradas nos controllers.**

Não afirmar que existe uma camada de diretório `routers` separada.

Quando o código estiver acessível, substituir qualquer descrição estrutural presumida pela árvore efetiva do repositório.

## 6.3. Frontend

Referência declarada:

- Next.js App Router.
- React.
- TypeScript.
- Tailwind CSS.
- Componentes shadcn/ui.
- Zod e React Hook Form.
- Recharts.

Descrever responsividade, autenticação e consumo da API.

Não incluir desenvolvimento Flutter ou aplicativo móvel nativo.

A experiência mobile é obtida pelo site responsivo.

## 6.4. Segurança

Descrever:

- Autenticação por sessão.
- Cookie HttpOnly.
- Hash de senha com Argon2.
- Autorização por perfis.
- Proteção das operações administrativas.
- Verificação de origem das requisições mutáveis.
- Validações de entrada.

Não apresentar o projeto como certificado por auditoria de segurança ou apto à operação comercial sem evidências.

## 6.5. Transações e integridade

Explicar:

- Operações ACID no checkout.
- Controle de concorrência.
- Idempotência.
- Prevenção de estoque negativo.
- Reposição de estoque após cancelamento.
- Persistência de valores históricos.

Relacionar essas características às regras de negócio e aos cenários de teste.

---

# 7. EVIDÊNCIAS DE IMPLEMENTAÇÃO E TESTES

Criar seção complementar destinada a demonstrar a qualidade técnica.

## 7.1. Tipos de teste

Apresentar, quando comprovados:

- Testes unitários.
- Testes de API.
- Testes de integração.
- Testes transacionais.
- Testes de concorrência.
- Testes ponta a ponta com Playwright.
- Verificações de lint, formatação e tipagem.
- Testes de responsividade.

## 7.2. Cobertura

O usuário informou que ampliou a cobertura de testes.

Não inventar:

- Percentual de cobertura.
- Número de testes.
- Quantidade de assertions.
- Resultado de execução.
- Tempo de execução.
- Evidências de sucesso em CI.

Se o relatório de cobertura for disponibilizado, transcrever seus resultados fielmente, identificando ferramenta, escopo e data da medição.

Caso não esteja disponível, utilizar formulação como:

"O projeto contempla uma suíte de testes, cuja cobertura quantitativa deverá ser apresentada mediante relatório de execução."

Não declarar uma porcentagem arbitrária.

## 7.3. Matriz de evidências

Construir tabela com:

`ID | Funcionalidade | Cenário de teste | Evidência | Resultado | Fonte`.

Exemplos de cenários:

- Registro de cliente.
- Autenticação.
- Catálogo público.
- Carrinho persistido.
- Checkout.
- Requisição idempotente.
- Estoque insuficiente.
- Cancelamento.
- Atualização administrativa.
- Controle de acesso.
- Persistência do banco.
- Responsividade.

Preencher a coluna Resultado somente com evidência disponível.

## 7.4. Capturas de tela

Sempre que possível, apresentar screenshots reais do sistema executado.

As imagens devem ilustrar o fluxo descrito e conter legendas.

Não produzir capturas simuladas e identificá-las como evidências reais de execução.

---

# 8. CONTROLE DE CONSISTÊNCIA ENTRE ARTEFATOS

Criar matriz de rastreabilidade interna.

Estrutura recomendada:

`Requisito → História → Caso de uso → Componente/Endpoint → Teste → Evidência`.

Os identificadores devem permanecer consistentes.

### Validações obrigatórias

- Todas as histórias do backlog aparecem nos cartões.
- Casos de uso correspondem a funcionalidades implementadas.
- Diagramas utilizam atores existentes.
- Modelo relacional corresponde às entidades declaradas.
- Diagramas de sequência representam fluxos reais.
- Rotas de navegação correspondem ao Next.js.
- Endpoints utilizados correspondem ao FastAPI.
- Testes documentados possuem fonte ou ressalva.
- Pagamentos são identificados como demonstrativos.
- Entrega é apresentada como fluxo demonstrativo.
- Não existem afirmações contraditórias entre capítulos.

---

# 9. ESCOPO EXCLUÍDO

A documentação não poderá tratar as seguintes funcionalidades como implementadas:

- Gateway de pagamento real.
- Processamento bancário ou liquidação financeira.
- QR Code PIX funcional.
- Cobrança com cartão.
- Emissão de comprovante fiscal ou financeiro em PDF.
- Reembolso automatizado.
- Cálculo de frete.
- Rastreamento GPS de entregador.
- Notificações em tempo real por WebSocket.
- Aplicativo mobile nativo.
- Login social.
- Autenticação JWT.
- Recuperação de senha por e-mail.
- Cadastro de categorias.
- Gerenciamento de ingredientes.
- Integração com sistemas externos de logística.

Essas funcionalidades poderão ser mencionadas como limitações de escopo ou possibilidades futuras, sem alegar que foram desenvolvidas.

---

# 10. DIRETRIZES PARA A REDAÇÃO ACADÊMICA

Utilizar linguagem formal, clara e técnica.

Evitar:

- Afirmações promocionais.
- Expressões excessivamente informais.
- Repetição de conceitos sem necessidade.
- Conteúdo genérico não relacionado ao projeto.
- Informações técnicas não verificadas.
- Referências bibliográficas inventadas.
- Citações sem fonte.
- Resultados experimentais fictícios.

Explicar conceitos técnicos na medida necessária ao entendimento do avaliador.

Exemplos:

- API REST.
- Autenticação por sessão.
- Banco relacional.
- Transação ACID.
- Integridade referencial.
- Responsividade.
- Testes automatizados.

Evitar aprofundamentos teóricos que desviem o trabalho de seu objetivo principal: especificação, modelagem e implementação de uma loja virtual de cupcakes.

---

# 11. FERRAMENTAS PARA DIAGRAMAS

Priorizar Mermaid para:

- Fluxogramas.
- Sequências.
- Classes.
- Modelo entidade-relacionamento.
- Estados do pedido.
- Mapas navegacionais.
- Diagramas conceituais representáveis.

Utilizar draw.io ou ferramenta equivalente quando necessário para:

- Casos de uso UML.
- Mapas de afinidade com apresentação visual específica.
- Diagramas cuja legibilidade seja comprometida em Mermaid.
- Wireframes estruturais.

Todos os diagramas devem ser exportados em formato adequado ao documento final.

O código-fonte dos diagramas deverá ser preservado sempre que possível, permitindo correções futuras.

---

# 12. PROCESSO DE PRODUÇÃO DO DOCUMENTO DEFINITIVO

A execução deverá seguir a ordem abaixo.

## Etapa 1 — Inventário

Reunir e analisar:

- PDF acadêmico anterior.
- Enunciado original.
- PROJECT_SPEC.md.
- Código e artefatos técnicos acessíveis.
- Evidências de testes disponíveis.

## Etapa 2 — Rastreabilidade

Criar correspondência entre:

- Funcionalidades.
- Requisitos.
- Histórias.
- Casos de uso.
- Entidades.
- Endpoints.
- Testes.

Registrar inconsistências antes de redigir o documento completo.

## Etapa 3 — Conteúdo acadêmico

Redigir as 16 seções principais.

Evitar produzir diagramas definitivos antes de conhecer as entidades, atores e fluxos usados em seus capítulos.

## Etapa 4 — Complementos técnicos

Produzir:

- Modelo relacional.
- Arquitetura.
- Tecnologia e implementação.
- Evidências de testes.
- Limitações e considerações finais.

## Etapa 5 — Diagramas e imagens

Gerar diagramas e preparar imagens.

Verificar legibilidade, cardinalidades, nomenclatura e consistência entre figuras.

## Etapa 6 — Diagramação

Aplicar a identidade visual derivada do PIT anterior.

Revisar títulos, tabelas, figuras, cabeçalhos, rodapés e quebras de página.

## Etapa 7 — Validação final

Conferir:

- Estrutura acadêmica.
- Originalidade.
- Fidelidade técnica.
- Ortografia e gramática.
- Integridade das referências.
- Diagramas.
- Correspondência entre capítulos.
- Evidências.
- Qualidade visual do PDF.

---

# 13. ENTREGÁVEIS ESPERADOS

A produção documental deverá resultar, conforme os formatos solicitados posteriormente, em:

**1. Documentação acadêmica principal**

Documento editável e/ou PDF contendo as seções do PIT e os complementos técnicos aprovados.

**2. Fontes dos diagramas**

Arquivos Mermaid e outros formatos editáveis utilizados na documentação.

**3. Material de apoio**

Capturas de tela ou evidências técnicas utilizadas na composição do documento.

**4. Checklist de conformidade**

Lista de verificações demonstrando que os requisitos documentais e as seções obrigatórias foram contemplados.

Não criar arquivos adicionais desnecessários.

---

# 14. DEFINITION OF DONE — DOCUMENTAÇÃO

A documentação somente poderá ser considerada finalizada quando:

- [ ] Preservar a identidade geral do PDF anterior.
- [ ] Contiver as 16 seções principais do PIT.
- [ ] Atender às exigências aplicáveis do `prompt1.txt`.
- [ ] Possuir cartões de história padronizados.
- [ ] Apresentar backlog sem divergências de IDs.
- [ ] Contiver mapa de afinidade.
- [ ] Contiver tarefas técnicas relacionadas às histórias.
- [ ] Apresentar casos de uso geral e expandidos.
- [ ] Apresentar modelo relacional PostgreSQL.
- [ ] Apresentar diagrama de classes consistente.
- [ ] Apresentar sequências de login, compra e entrega.
- [ ] Documentar o cancelamento de pedidos.
- [ ] Apresentar wireframes ou imagens adequadamente identificadas.
- [ ] Apresentar mapas conceitual e navegacional.
- [ ] Representar corretamente cliente e administrador.
- [ ] Descrever a arquitetura e as tecnologias declaradas.
- [ ] Não afirmar existência de funcionalidades excluídas.
- [ ] Não inventar resultados de teste ou cobertura.
- [ ] Identificar limitações de verificação do código.
- [ ] Apresentar diagramas e tabelas legíveis.
- [ ] Preservar coerência entre todas as seções.
- [ ] Passar por revisão textual, técnica e visual.

---

# 15. INSTRUÇÃO FINAL PARA A ELABORAÇÃO

Atue como analista de requisitos, engenheiro de software e redator técnico acadêmico.

Utilize este documento como contrato para reconstruir a documentação do Projeto Integrador da Cupcake Store.

A documentação anterior define a referência visual e a organização acadêmica.

O enunciado original estabelece os artefatos obrigatórios.

O `PROJECT_SPEC.md` define a especificação técnica declarada como implementada.

O código-fonte, quando efetivamente acessível, prevalece para descrever a implementação real.

Não invente funcionalidades, componentes, tabelas, classes, testes, percentuais ou resultados.

Não copie textos de documentos-exemplo externos.

Produza material original, consistente, tecnicamente fundamentado e adequado a um trabalho universitário de Engenharia de Software.

**O resultado esperado é a evolução da documentação anterior do PIT, refletindo a Cupcake Store desenvolvida, com maior precisão técnica, melhor apresentação visual e coerência entre os requisitos, os diagramas e a implementação.**

**FIM DA ESPECIFICAÇÃO DOCUMENTAL.**