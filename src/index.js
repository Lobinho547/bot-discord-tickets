require('dotenv').config();
const { Client, GatewayIntentBits, Collection, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');
const { createTranscript } = require('discord-html-transcripts');
const { put } = require('@vercel/blob');

// --- Verificação de Variáveis de Ambiente ---
const requiredEnvVars = [
  'DISCORD_TOKEN',
  'CLIENT_ID',
  'GUILD_ID',
  'LOG_CHANNEL_ID',
  'TICKET_CATEGORY_ID',
  'STAFF_ROLE_ID',
  'BLOB_READ_WRITE_TOKEN',
  'APP_URL'
];

const missingEnvVars = requiredEnvVars.filter(v => !process.env[v]);

if (missingEnvVars.length > 0) {
  console.error(`❌ Erro: Variáveis de ambiente faltando no arquivo .env: ${missingEnvVars.join(', ')}`);
  console.error('📋 Por favor, configure o arquivo .env com todas as variáveis necessárias.');
  process.exit(1);
}
// --- Fim da Verificação ---


// Configurar cliente Discord
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ]
});

client.commands = new Collection();

// Evento ready
client.once('ready', () => {
  console.log(`Bot logado como ${client.user.tag}`);
  registerCommands();
});

// Registrar comandos slash
async function registerCommands() {
  try {
    const guild = client.guilds.cache.get(process.env.GUILD_ID);
    if (!guild) {
      console.error('Guild não encontrada');
      return;
    }

    const commands = [
      {
        name: 'setup-tickets',
        description: 'Configura o sistema de tickets no canal atual',
        defaultMemberPermissions: PermissionFlagsBits.Administrator
      }
    ];

    await guild.commands.set(commands);
    console.log('Comandos registrados com sucesso!');
  } catch (error) {
    console.error('Erro ao registrar comandos:', error);
  }
}

// Handler de comandos
client.on('interactionCreate', async (interaction) => {
  if (interaction.isCommand()) {
    if (interaction.commandName === 'setup-tickets') {
      await setupTicketSystem(interaction);
    }
  } else if (interaction.isStringSelectMenu()) {
    await handleSelectMenu(interaction);
  } else if (interaction.isButton()) {
    await handleButton(interaction);
  }
});

// Configurar sistema de tickets
async function setupTicketSystem(interaction) {
  const embed = new EmbedBuilder()
    .setTitle('🎫 Sistema de Tickets')
    .setDescription('Selecione uma opção abaixo para abrir um ticket:')
    .setColor('#0099ff')
    .addFields(
      { name: '🚨 Denúncia', value: 'Reporte um problema ou denuncie algo', inline: true },
      { name: '🎁 Bonificação', value: 'Solicite uma bonificação ou recompensa', inline: true }
    )
    .setFooter({ text: 'Clique no menu abaixo para selecionar uma opção' });

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('ticket_type')
    .setPlaceholder('Escolha o tipo de ticket')
    .addOptions([
      new StringSelectMenuOptionBuilder()
        .setLabel('Denúncia')
        .setDescription('Reporte um problema ou denuncie algo')
        .setValue('denuncia')
        .setEmoji('🚨'),
      new StringSelectMenuOptionBuilder()
        .setLabel('Bonificação')
        .setDescription('Solicite uma bonificação ou recompensa')
        .setValue('bonificacao')
        .setEmoji('🎁')
    ]);

  const row = new ActionRowBuilder().addComponents(selectMenu);

  await interaction.reply({ embeds: [embed], components: [row] });
}

// Handler do menu de seleção
async function handleSelectMenu(interaction) {
  if (interaction.customId === 'ticket_type') {
    const ticketType = interaction.values[0];
    const userId = interaction.user.id;
    const guild = interaction.guild;
    
    // Adia a resposta para evitar timeout
    await interaction.deferReply({ ephemeral: true });

    // Verificar se o usuário já tem um ticket aberto
    const existingTicket = guild.channels.cache.find(
      channel => channel.name.includes(`-${userId}`) && channel.parentId === process.env.TICKET_CATEGORY_ID
    );

    if (existingTicket) {
      await interaction.editReply({ 
        content: `Você já possui um ticket aberto: ${existingTicket}`
      });
      return;
    }

    // Criar canal do ticket
    const channelName = ticketType === 'denuncia' 
      ? `🚨・denuncia-${userId}` 
      : `🎁・bonificacao-${userId}`;

    const ticketChannel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: process.env.TICKET_CATEGORY_ID,
      permissionOverwrites: [
        {
          id: guild.id,
          deny: [PermissionFlagsBits.ViewChannel]
        },
        {
          id: userId,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
        },
        {
          id: process.env.STAFF_ROLE_ID,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
        },
        {
          id: client.user.id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageChannels]
        }
      ]
    });

    // Criar embed do ticket
    const ticketEmbed = new EmbedBuilder()
      .setTitle(`Ticket - ${ticketType === 'denuncia' ? 'Denúncia' : 'Bonificação'}`)
      .setDescription(`Ticket criado por ${interaction.user}`)
      .setColor(ticketType === 'denuncia' ? '#ff4444' : '#44ff44')
      .setTimestamp();

    // Criar botões
    const buttons = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('assumir_ticket')
          .setLabel('Assumir Ticket')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('👤'),
        new ButtonBuilder()
          .setCustomId('notificar')
          .setLabel('Notificar')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('🔔'),
        new ButtonBuilder()
          .setCustomId('fechar_ticket')
          .setLabel('Fechar Ticket')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('🔒')
      );

    await ticketChannel.send({ embeds: [ticketEmbed], components: [buttons] });

    await interaction.editReply({ 
      content: `Ticket criado com sucesso! ${ticketChannel}`
    });

    // Enviar log
    const logChannel = guild.channels.cache.get(process.env.LOG_CHANNEL_ID);
    if (logChannel) {
      const logEmbed = new EmbedBuilder()
        .setTitle('🎫 Novo Ticket Criado')
        .setDescription(`**Tipo:** ${ticketType === 'denuncia' ? 'Denúncia' : 'Bonificação'}\n**Usuário:** ${interaction.user}\n**Canal:** ${ticketChannel}`)
        .setColor('#00ff00')
        .setTimestamp();

      await logChannel.send({ embeds: [logEmbed] });
    }
  }
}

// Handler dos botões
async function handleButton(interaction) {
  const { customId } = interaction;

  switch (customId) {
    case 'assumir_ticket':
      await assumirTicket(interaction);
      break;
    case 'notificar':
      await notificarUsuario(interaction);
      break;
    case 'fechar_ticket':
      await fecharTicket(interaction);
      break;
  }
}

// Função para assumir ticket
async function assumirTicket(interaction) {
  const channel = interaction.channel;
  const user = interaction.user;

  // Verificar se o usuário tem permissão
  const member = await interaction.guild.members.fetch(user.id);
  if (!member.roles.cache.has(process.env.STAFF_ROLE_ID)) {
    await interaction.reply({ 
      content: 'Você não tem permissão para assumir tickets!', 
      ephemeral: true 
    });
    return;
  }

  // Editar o tópico do canal
  await channel.setTopic(`Este ticket foi assumido por: **${user.username}**`);

  await interaction.reply({ 
    content: `✅ Ticket assumido por ${user}!`, 
    ephemeral: false 
  });
}

// Função para notificar usuário
async function notificarUsuario(interaction) {
  const channel = interaction.channel;
  const channelName = channel.name;
  const userId = channelName.split('-').pop(); // Extrair ID do usuário do nome do canal

  try {
    const user = await client.users.fetch(userId);
    
    const embed = new EmbedBuilder()
      .setTitle('🔔 Notificação de Ticket')
      .setDescription('Você está sendo notificado sobre seu ticket.')
      .setColor('#0099ff')
      .setTimestamp();

    const button = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setLabel('Ir para o Ticket')
          .setStyle(ButtonStyle.Link)
          .setURL(`https://discord.com/channels/${interaction.guild.id}/${channel.id}`)
      );

    await user.send({ embeds: [embed], components: [button] });

    await interaction.reply({ 
      content: '✅ Usuário notificado com sucesso!', 
      ephemeral: true 
    });
  } catch (error) {
    console.error('Erro ao notificar usuário:', error);
    await interaction.reply({ 
      content: '❌ Erro ao notificar usuário. Verifique se o usuário aceita mensagens privadas.', 
      ephemeral: true 
    });
  }
}

// Função para fechar ticket
async function fecharTicket(interaction) {
  const channel = interaction.channel;
  const user = interaction.user;

  // Verificar se o usuário tem permissão
  const member = await interaction.guild.members.fetch(user.id);
  if (!member.roles.cache.has(process.env.STAFF_ROLE_ID)) {
    await interaction.reply({
      content: 'Você não tem permissão para fechar este ticket!',
      ephemeral: true
    });
    return;
  }

  await interaction.reply({
    content: '🔄 Gerando transcript e fechando ticket...',
    ephemeral: true
  });

  try {
    // Gerar transcript
    const transcript = await createTranscript(channel, {
      limit: -1,
      filename: `transcript-${channel.name}.html`,
      saveImages: true,
      poweredBy: false
    });

    // Upload para Vercel Blob
    const transcriptFileName = `transcripts/transcript-${channel.name}-${Date.now()}.html`;
    const { url: blobUrl } = await put(transcriptFileName, transcript.attachment, {
      access: 'public',
      contentType: 'text/html',
    });

    // Remove a barra final da APP_URL se ela existir, para evitar // na URL
    const appUrl = process.env.APP_URL.replace(/\/$/, "");
    // A URL agora aponta para a nova função /api/view
    const publicUrl = `${appUrl}/api/view?url=${encodeURIComponent(blobUrl)}`;

    // Enviar log com o link do transcript
    const logChannel = interaction.guild.channels.cache.get(process.env.LOG_CHANNEL_ID);
    if (logChannel) {
      const logEmbed = new EmbedBuilder()
        .setTitle('🔒 Ticket Fechado')
        .setDescription(`**Canal:** ${channel.name}\n**Fechado por:** ${user}`)
        .setColor('#ff0000')
        .setTimestamp();

      const viewButton = new ButtonBuilder()
        .setLabel('Ver Transcript')
        .setStyle(ButtonStyle.Link)
        .setURL(publicUrl);

      const row = new ActionRowBuilder().addComponents(viewButton);

      await logChannel.send({ embeds: [logEmbed], components: [row] });
    }

    // Deletar o canal
    await channel.delete();

  } catch (error) {
    console.error('Erro ao fechar ticket:', error);
    await interaction.followUp({
      content: '❌ Erro ao fechar ticket. Verifique os logs e se o token do Vercel Blob está configurado corretamente.',
      ephemeral: true
    });
  }
}

// Login do bot
client.login(process.env.DISCORD_TOKEN); 