# Cupcake Store

Aplicação demo de loja de cupcakes com frontend Next.js, backend FastAPI e PostgreSQL.

## Requisitos

- Docker + Docker Compose
- Node.js 24 LTS (opcional para desenvolvimento local)
- Python 3.12 + Poetry (opcional para desenvolvimento local)

## Configuração

1. Copie o arquivo `.env.example` para `.env`.
2. Ajuste as variáveis sensíveis antes de subir os containers.
3. Execute:

```bash
cp .env.example .env
docker compose up -d --build
```

## Acesso

- Frontend: http://localhost:3000
- API: http://localhost:8000
- Swagger: http://127.0.0.1:8000/docs

## Fluxos disponíveis na interface

- Catálogo e detalhe de produto carregados pela API.
- Carrinho persistido no navegador, com alteração de quantidades.
- Cadastro de cliente, login e logout usando a sessão por cookie da API.
- Checkout demonstrativo, lista de pedidos e visualização do pedido.
- Área administrativa protegida com dashboard, gestão de produtos e imagens,
  ajustes e histórico de estoque, e relatórios de vendas e pagamentos.

O pagamento é apenas demonstrativo e não realiza cobranças. O checkout exige
uma sessão de cliente. A área administrativa exige uma sessão ADMIN, com a
autorização confirmada também pela API. O catálogo e a imagem hero usam
fotografias locais licenciadas; o seed as copia para o volume persistente de
mídia sem substituir imagens ou alterações manuais existentes.

## Backend

O backend segue a divisão MVC pragmática definida em `PROJECT_SPEC.md`:

- `app/models/`: entidades SQLAlchemy.
- `app/schemas/`: contratos Pydantic da API em `snake_case`.
- `app/controllers/`: 27 operações REST de negócio sob `/api/v1`.
- `app/services/`: checkout transacional/idempotente, pedidos, estoque e seed.
- `app/utils/`: segurança e formatação de valores/períodos.
- `alembic/`: migration inicial explícita das sete tabelas.
- `scripts/start.sh`: aplica a migration antes de iniciar o servidor.

O backend tem testes de sessão, revogação, checkout idempotente, conflito de
estoque e cancelamento. A validação local com SQLite não substitui a validação
final com PostgreSQL 17 nem os testes de concorrência previstos na especificação.

## Credenciais administrativas

O usuário administrador é criado automaticamente no seed, com `ADMIN_EMAIL` e
`ADMIN_PASSWORD` fornecidos pelo `.env`. Substitua todos os valores de exemplo:
use uma `SECRET_KEY` aleatória com pelo menos 32 caracteres e uma senha
administrativa forte com pelo menos 12 caracteres. Não versione o `.env`.

## Testes

```bash
cd backend
poetry install
poetry run pytest
cd ..
poetry -C backend run pre-commit run --all-files
```

```bash
cd frontend
npm install
npm run lint
npm run typecheck
npm run build
```

`docker compose up -d --build` aplica migrations e seed no startup. O banco
utiliza PostgreSQL 17 e não publica a porta 5432 no host.

## Fotografias e atribuições

As fotografias abaixo são distribuídas sem alterações sob as licenças
indicadas. A imagem hero reutiliza a fotografia de chocolate belga do catálogo.

| Arquivo local | Obra e autoria | Licença e origem |
|---|---|---|
| `backend/assets/seed-products/chocolate-belga.jpg` | [Chocolate Cupcake with Purple frosting](https://commons.wikimedia.org/wiki/File:Chocolate_Cupcake_with_Purple_frosting.jpg), Noah Wulf | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| `backend/assets/seed-products/red-velvet.jpg` | [Cupcake 01](https://commons.wikimedia.org/wiki/File:Cupcake_01.jpg), Joan Onanyo | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| `backend/assets/seed-products/baunilha.jpg` | [Brown Cupcake with a White Top](https://commons.wikimedia.org/wiki/File:Brown_Cupcake_with_a_White_Top.jpg), TudorTulok | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| `backend/assets/seed-products/morango.jpg` | [Cran-Raspberry Cupcake (4357512712)](https://commons.wikimedia.org/wiki/File:Cran-Raspberry_Cupcake_(4357512712).jpg), Clever Cupcakes | [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/) |
| `backend/assets/seed-products/limao-siciliano.jpg` | [Birthday Cupcakes](https://commons.wikimedia.org/wiki/File:Birthday_Cupcakes.jpg), Kmangwane | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `backend/assets/seed-products/cenoura-com-chocolate.jpg` | [Chocolate cupcakes](https://commons.wikimedia.org/wiki/File:Chocolate_cupcakes.jpg), Pamela | [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/) |
| `backend/assets/seed-products/cookies-and-cream.jpg` | [Cookies & Cream Cupcake Outside](https://commons.wikimedia.org/wiki/File:Cookies_%26_Cream_Cupcake_Outside.jpg), Jamie | [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/) |
| `backend/assets/seed-products/doce-de-leite.jpg` | [Pink Cupcakes](https://commons.wikimedia.org/wiki/File:Pink_Cupcakes.jpg), Jess Watters | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |

O arquivo `frontend/public/assets/cupcake-hero.jpg` é a mesma fotografia local
de chocolate belga indicada na primeira linha.
