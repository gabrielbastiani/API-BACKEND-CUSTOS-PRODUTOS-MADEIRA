# Wood Pricing API

Backend em Node.js, Express, TypeScript, PostgreSQL e Prisma para gestão de custos e precificação de produtos artesanais de madeira.

## Pré-requisitos

Antes de iniciar, tenha instalado o Node.js e o npm, e disponha de um banco de dados PostgreSQL acessível.

## Instalação e configuração

Na raiz do projeto — a pasta que contém o `package.json` — instale as dependências:

```bash
npm install
```

Crie um arquivo `.env` com base no `.env.example` e configure nele a string de conexão do PostgreSQL. Confira se o banco está acessível antes de continuar.

Aplique as migrations para criar ou atualizar a estrutura do banco e gere o cliente do Prisma:

```bash
npx prisma migrate dev
npx prisma generate
```

Em seguida, cadastre as taxas de marketplace no banco:

```bash
npx ts-node prisma/seed-marketplace-fees.ts
```

Esse comando executa o script `prisma/seed-marketplace-fees.ts`, que insere no banco os dados de taxas de marketplace usados pela aplicação. Execute-o na configuração inicial do banco — por exemplo, após aplicar as migrations — e também ao preparar outro banco que ainda não tenha essas taxas cadastradas. Não é necessário executá-lo a cada inicialização da API. Antes de rodá-lo novamente em um banco que já recebeu esse seed, verifique o comportamento do script para evitar cadastros duplicados.

Depois da configuração, inicie a API em modo de desenvolvimento:

```bash
npm run dev
```

## Variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto, baseado no `.env.example`, e configure a variável de conexão com o PostgreSQL conforme indicado no arquivo de exemplo.