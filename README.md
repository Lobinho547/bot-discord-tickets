# 🎫 Bot de Discord - Sistema de Tickets

Um bot completo de Discord para gerenciamento de tickets com sistema de transcript e integração com **Vercel Blob Storage**.

## ✨ Funcionalidades

### 🧩 Menu de Seleção
- Painel com opções de ticket (Denúncia e Bonificação)
- Menu de seleção expansível para futuras opções
- Interface intuitiva e responsiva

### 📂 Sistema de Tickets
- Criação automática de canais privados
- Permissões configuráveis para usuários e staff
- Nomenclatura personalizada com emojis

### 🛠 Controles de Ticket
- **Assumir Ticket**: Marca o ticket como assumido por um staff
- **Notificar**: Envia mensagem privada para o autor do ticket
- **Fechar Ticket**: Gera transcript e fecha o canal

### 🧾 Sistema de Transcript
- Geração completa de transcript com `discord-html-transcripts`
- Inclui mensagens, imagens, links, vídeos e anexos
- Upload automático para **Vercel Blob Storage**
- Links públicos para acesso aos transcripts

### 🌐 Frontend Web
- Interface web para visualização de transcripts
- Design responsivo e moderno
- Hospedagem pronta para Vercel

## 🚀 Instalação

### 1. Pré-requisitos
- Node.js 16+ instalado
- Conta no Discord Developer Portal
- Conta na [Vercel](https://vercel.com) (conectada com sua conta GitHub)
- Servidor Discord com permissões adequadas

### 2. Clone e Instale
```bash
git clone <seu-repositorio>
cd discord-ticket-bot
npm install
```

### 3. Configuração do Discord

#### Criar Bot no Discord Developer Portal:
1. Acesse [Discord Developer Portal](https://discord.com/developers/applications)
2. Clique em "New Application"
3. Vá para "Bot" e clique em "Add Bot"
4. Copie o **Token** do bot
5. Em "OAuth2 > URL Generator":
   - Selecione "bot" e "applications.commands"
   - Permissões necessárias:
     - `Manage Channels`
     - `Send Messages`
     - `Read Message History`
     - `Use Slash Commands`
     - `View Channels`
     - `Attach Files`
     - `Embed Links`

#### Configurar Intents:
- Message Content Intent: **ON**
- Server Members Intent: **ON**

### 4. Configuração do Vercel Blob Storage

**Primeiro, crie um projeto na Vercel:**
1.  Faça login no seu [dashboard da Vercel](https://vercel.com/dashboard).
2.  Clique em "Add New..." -> "Project".
3.  Importe o repositório do seu bot (do GitHub, GitLab, etc.).
4.  A Vercel vai configurar e fazer o deploy do projeto. Isso é importante para o próximo passo.

**Agora, crie o Blob Store:**
1.  Com o projeto criado na Vercel, vá para a aba "Storage" do seu projeto.
2.  Clique em "Create Database" -> "Blob".
3.  Aceite os termos e crie o seu "Blob Store".
4.  Após a criação, a Vercel vai te mostrar o `BLOB_READ_WRITE_TOKEN`. **Copie este token!** Ele é a sua chave secreta para fazer uploads.

### 5. Configuração das Variáveis de Ambiente

Copie o arquivo `env.example` para `.env` (ou rode `npm run setup`) e preencha:

```env
# Discord Bot Token
DISCORD_TOKEN=seu_token_aqui

# Discord Client ID
CLIENT_ID=seu_client_id_aqui

# Discord Guild ID (ID do servidor)
GUILD_ID=seu_guild_id_aqui

# Vercel Blob Read-Write Token
BLOB_READ_WRITE_TOKEN=cole_o_token_da_vercel_aqui

# Canal de logs (ID do canal onde os logs serão enviados)
LOG_CHANNEL_ID=id_do_canal_de_logs

# Categoria onde os tickets serão criados
TICKET_CATEGORY_ID=id_da_categoria_tickets

# Cargo de staff (ID do cargo que pode gerenciar tickets)
STAFF_ROLE_ID=id_do_cargo_staff
```

**Importante:** Além de colocar o token no arquivo `.env` (para rodar localmente), você também precisa adicioná-lo nas variáveis de ambiente do seu projeto na Vercel para quando ele for publicado.
1. No dashboard do seu projeto na Vercel, vá para "Settings" -> "Environment Variables".
2. Adicione uma nova variável com o nome `BLOB_READ_WRITE_TOKEN` e cole o token.

### 6. Configuração do Servidor Discord

#### Obter IDs necessários:
1. **Guild ID**: Clique com botão direito no servidor → "Copy Server ID"
2. **Categoria ID**: Clique com botão direito na categoria → "Copy ID"
3. **Canal de Logs ID**: Clique com botão direito no canal → "Copy ID"
4. **Cargo Staff ID**: Clique com botão direito no cargo → "Copy ID"

#### Configurar Categoria de Tickets:
- Crie uma categoria chamada "Tickets" ou similar
- Configure permissões para que apenas staff veja a categoria
- Anote o ID da categoria

#### Configurar Cargo de Staff:
- Crie um cargo para staff (ex: "Staff", "Moderador")
- Anote o ID do cargo

## 🎯 Como Usar

### 1. Iniciar o Bot
```bash
npm start
# ou para desenvolvimento
npm run dev
```

### 2. Configurar Sistema de Tickets
1. Use o comando `/setup-tickets` em um canal
2. O bot criará um painel com menu de seleção
3. Usuários podem selecionar o tipo de ticket

### 3. Gerenciar Tickets
- **Criar**: Usuário seleciona opção no menu
- **Assumir**: Staff clica em "Assumir Ticket"
- **Notificar**: Staff clica em "Notificar" para enviar DM
- **Fechar**: Staff clica em "Fechar Ticket" para gerar transcript

### 4. Visualizar Transcripts
- Acesse a URL do frontend (ex: `http://localhost:3000`)
- Cole o ID do transcript
- Visualize o conteúdo completo

## 🌐 Deploy

### Deploy Local
```bash
npm start
```

### Deploy na Vercel
1. Conecte seu repositório à Vercel
2. Configure as variáveis de ambiente
3. Deploy automático

### Deploy em Outros Serviços
- **Railway**: Conecte o repositório e configure as variáveis
- **Heroku**: Use o Procfile incluído
- **DigitalOcean**: Configure um droplet com Node.js

## 📁 Estrutura do Projeto

```
discord-ticket-bot/
├── src/
│   └── index.js          # Arquivo principal do bot
├── public/
│   └── index.html        # Frontend para visualizar transcripts
├── package.json          # Dependências e scripts
├── env.example           # Exemplo de variáveis de ambiente
└── README.md            # Este arquivo
```

## 🔧 Comandos Disponíveis

| Comando | Descrição | Permissão |
|---------|-----------|-----------|
| `/setup-tickets` | Configura o sistema de tickets | Administrador |

## 🎨 Personalização

### Adicionar Novos Tipos de Ticket
Edite a função `setupTicketSystem` em `src/index.js`:

```javascript
.addOptions([
  // ... opções existentes
  new StringSelectMenuOptionBuilder()
    .setLabel('Novo Tipo')
    .setDescription('Descrição do novo tipo')
    .setValue('novo_tipo')
    .setEmoji('🆕')
])
```

### Modificar Cores e Estilos
Edite o arquivo `public/index.html` na seção `<style>`.

### Configurar Permissões
Modifique as `permissionOverwrites` na função `handleSelectMenu`.

## 🐛 Troubleshooting

### Bot não responde
- Verifique se o token está correto
- Confirme se os intents estão habilitados
- Verifique se o bot foi convidado com as permissões corretas

### Erro no Firebase
- Verifique se as credenciais estão corretas
- Confirme se o Storage está habilitado
- Verifique as regras de segurança do Storage

### Erro no Vercel Blob
- Verifique se o `BLOB_READ_WRITE_TOKEN` está correto no seu arquivo `.env` (para teste local) e nas configurações do projeto na Vercel (para deploy).
- Confirme se o Blob Store foi criado corretamente no dashboard da Vercel.

### Transcript não gera
- Verifique se o bot tem permissão para ler mensagens
- Confirme se o canal não está vazio
- Verifique os logs do console

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo LICENSE para mais detalhes.

## 🤝 Contribuição

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📞 Suporte

Se você encontrar algum problema ou tiver dúvidas:

1. Verifique a seção Troubleshooting
2. Abra uma issue no GitHub
3. Consulte a documentação do Discord.js e Firebase

---

**Desenvolvido com ❤️ para a comunidade Discord** 