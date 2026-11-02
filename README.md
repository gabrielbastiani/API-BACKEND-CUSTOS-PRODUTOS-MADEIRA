# Wood Pricing API

Backend em Node.js, Express, TypeScript, PostgreSQL e Prisma para gestão de custos e precificação de produtos artesanais de madeira.

## Instalação e desenvolvimento

Execute os comandos a partir desta pasta (a que contém o `package.json`):

```bash
npm install
cp .env.example .env
# Edite DATABASE_URL no arquivo .env
npx prisma migrate dev
npx prisma generate
npm run dev
```

O seed de taxas de marketplace deve ser executado uma vez em cada banco que ainda não tenha esses registros:

```bash
npx ts-node prisma/seed-marketplace-fees.ts
```

## Armazenamento de imagens e arquivos

As imagens são gravadas fisicamente em um diretório de arquivos e seus metadados/referências ficam no PostgreSQL, na tabela `images`. O campo `url` contém uma referência pública relativa, como `/uploads/uuid.jpg`, e não um caminho absoluto da máquina. Isso permite que o mesmo registro do banco funcione em desenvolvimento e produção sem gravar `C:\...` ou `/home/...` no banco.

O diretório físico é configurado por `UPLOAD_DIR`. Quando a variável não existe, a API usa a pasta `backend/uploads`, calculada a partir da localização do próprio código — não de `process.cwd()` — e funciona tanto com `src` quanto com `dist`.

### Desenvolvimento

Normalmente basta deixar `UPLOAD_DIR` ausente. Os arquivos ficam em `backend/uploads` e são servidos pelo backend em `http://localhost:3333/uploads/<nome-do-arquivo>`.

### Produção

Configure `UPLOAD_DIR` com um caminho absoluto e persistente, fora da pasta substituída a cada deploy. Exemplo Linux (ajuste o caminho ao seu servidor):

```env
NODE_ENV=production
PORT=3333
UPLOAD_DIR=/var/lib/wood-pricing/uploads
```

Crie a pasta e conceda leitura/escrita ao mesmo usuário que executa o processo Node: 

```bash
sudo mkdir -p /var/lib/wood-pricing/uploads
sudo chown -R USUARIO_DA_API:GRUPO_DA_API /var/lib/wood-pricing
sudo chmod 750 /var/lib/wood-pricing /var/lib/wood-pricing/uploads
```

A versão anterior do backend gravava em `path.join(process.cwd(), 'uploads')`. Antes de atualizar, confira o diretório de trabalho (Working Directory) configurado no aaPanel/PM2 e localize a pasta `uploads` usada pelo processo antigo. Configure `UPLOAD_DIR` para continuar usando essa pasta ou copie todos os arquivos para o novo destino. Não presuma que a pasta antiga era a mesma do código se o processo era iniciado com outro diretório.

Antes de apontar a produção para um `UPLOAD_DIR` novo, copie os arquivos que já existem na pasta antiga para o novo local, mantendo os nomes: 

```bash
sudo cp -a /caminho/antigo/backend/uploads/. /var/lib/wood-pricing/uploads/
```

Não renomeie os arquivos: o banco já guarda `/uploads/<nome>` e continuará encontrando o arquivo pelo mesmo nome no novo diretório. Faça backup do PostgreSQL **e** de `UPLOAD_DIR`; o backup do banco, sozinho, não contém os bytes das imagens.

A API publica esse diretório em `/uploads`. O endereço público completo é formado pelo domínio/IP e porta do backend, não pelo endereço do frontend. Em implantação com proxy reverso, encaminhe `/uploads/*` para o backend, assim como `/api/v1/*`. Para validar, abra `http://HOST_E_PORTA_DA_API/health` e depois `http://HOST_E_PORTA_DA_API/uploads/NOME_DE_UMA_IMAGEM_EXISTENTE.jpg` no navegador ou execute `curl -I` para esse segundo endereço; a resposta esperada para uma imagem existente é HTTP 200.

## PDFs

Os PDFs de etiquetas e orçamentos são gerados sob demanda e enviados diretamente na resposta HTTP. Não são armazenados no disco nem registrados no banco atualmente. As etiquetas leem as imagens diretamente do diretório configurado por `UPLOAD_DIR`, sem depender de chamadas HTTP para `localhost` ou de uma porta fixa.

## Build e execução em produção

```bash
npm ci
npx prisma migrate deploy
npx prisma generate
npm run build
npm start
```

Mantenha o arquivo `.env` fora do Git e configure as variáveis no gerenciador de processos/ambiente do servidor. Não coloque `UPLOAD_DIR` dentro de `dist`, pois `dist` pode ser recriado em cada build.
