require('dotenv').config();
const { Client, GatewayIntentBits, Collection, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');
const { createTranscript } = require('discord-html-transcripts');
const { put, del } = require('@vercel/blob');
const fs = require('fs');
const path = require('path');

// --- Caminho para o arquivo de configuração ---
const TICKET_TYPES_PATH = path.join(__dirname, '..', 'ticket_types.json');

// --- Funções de Ajuda para a Configuração ---
const readTicketTypes = () => {
    if (!fs.existsSync(TICKET_TYPES_PATH)) {
        fs.writeFileSync(TICKET_TYPES_PATH, JSON.stringify([]));
        return [];
    }
    const data = fs.readFileSync(TICKET_TYPES_PATH);
    return JSON.parse(data);
};

const writeTicketTypes = (data) => {
    fs.writeFileSync(TICKET_TYPES_PATH, JSON.stringify(data, null, 2));
};

// --- Verificação de Variáveis de Ambiente ---
const requiredEnvVars = ['DISCORD_TOKEN', 'CLIENT_ID', 'GUILD_ID', 'BLOB_READ_WRITE_TOKEN', 'APP_URL'];
const missingEnvVars = requiredEnvVars.filter(v => !process.env[v]);

if (missingEnvVars.length > 0) {
    console.error(`❌ Erro: Variáveis de ambiente faltando: ${missingEnvVars.join(', ')}`);
    process.exit(1);
}
// --- Fim da Verificação ---

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

client.once('ready', () => {
    console.log(`Bot logado como ${client.user.tag}`);
    registerCommands();
});

// --- Registro de Comandos ---
async function registerCommands() {
    const commands = [
        {
            name: 'setup-tickets',
            description: 'Cria ou atualiza o painel de abertura de tickets no canal atual.',
            defaultMemberPermissions: PermissionFlagsBits.Administrator.toString()
        },
        {
            name: 'add-ticket-type',
            description: 'Adiciona um novo tipo de ticket ao sistema.',
            defaultMemberPermissions: PermissionFlagsBits.Administrator.toString(),
            options: [
                { name: 'name', type: 3, description: 'O nome do tipo de ticket (ex: Denúncia)', required: true },
                { name: 'emoji', type: 3, description: 'O emoji que representará o ticket', required: true },
                { name: 'category_id', type: 3, description: 'O ID da categoria do Discord onde os tickets serão criados', required: true },
                { name: 'subject', type: 3, description: 'A mensagem que aparecerá dentro do ticket', required: true },
                { name: 'staff_role_id', type: 3, description: 'O ID do cargo que poderá gerenciar estes tickets', required: true },
            ]
        }
    ];

    try {
        const guild = await client.guilds.fetch(process.env.GUILD_ID);
        await guild.commands.set(commands);
        console.log('Comandos registrados com sucesso!');
    } catch (error) {
        console.error('Erro ao registrar comandos:', error);
    }
}


// --- Handlers de Interação ---
client.on('interactionCreate', async (interaction) => {
    if (interaction.isCommand()) await handleCommand(interaction);
    if (interaction.isStringSelectMenu()) await handleSelectMenu(interaction);
    if (interaction.isButton()) await handleButton(interaction);
});

async function handleCommand(interaction) {
    const { commandName } = interaction;

    if (commandName === 'setup-tickets') {
        const ticketTypes = readTicketTypes();
        if (ticketTypes.length === 0) {
            return interaction.reply({ content: '❌ Não há tipos de ticket configurados. Use `/add-ticket-type` primeiro.', ephemeral: true });
        }

        const embed = new EmbedBuilder()
            .setTitle('🎫 Central de Atendimento')
            .setDescription('Selecione uma opção abaixo para abrir um ticket e nossa equipe irá te ajudar.')
            .setColor('#0099ff')
            .setFooter({ text: 'Seu ticket será criado em um canal privado.' });

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('ticket_creation_menu')
            .setPlaceholder('Escolha o tipo de ticket')
            .addOptions(ticketTypes.map(type =>
                new StringSelectMenuOptionBuilder()
                    .setLabel(type.name)
                    .setValue(type.name)
                    .setEmoji(type.emoji)
            ));

        const row = new ActionRowBuilder().addComponents(selectMenu);
        await interaction.channel.send({ embeds: [embed], components: [row] });
        await interaction.reply({ content: '✅ Painel de tickets configurado com sucesso!', ephemeral: true });
    }

    if (commandName === 'add-ticket-type') {
        const name = interaction.options.getString('name');
        const emoji = interaction.options.getString('emoji');
        const category_id = interaction.options.getString('category_id');
        const subject = interaction.options.getString('subject');
        const staff_role_id = interaction.options.getString('staff_role_id');

        const ticketTypes = readTicketTypes();
        const existingType = ticketTypes.find(t => t.name.toLowerCase() === name.toLowerCase());

        if (existingType) {
            return interaction.reply({ content: `❌ Um tipo de ticket com o nome "${name}" já existe.`, ephemeral: true });
        }

        ticketTypes.push({ name, emoji, category_id, subject, staff_role_id });
        writeTicketTypes(ticketTypes);

        await interaction.reply({ content: `✅ O tipo de ticket "${name}" foi adicionado com sucesso!`, ephemeral: true });
    }
}

async function handleSelectMenu(interaction) {
    if (interaction.customId !== 'ticket_creation_menu') return;

    const selectedTypeName = interaction.values[0];
    const ticketType = readTicketTypes().find(t => t.name === selectedTypeName);

    if (!ticketType) {
        return interaction.reply({ content: '❌ Este tipo de ticket não foi encontrado na configuração.', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    const guild = interaction.guild;
    const user = interaction.user;

    const channelName = `${ticketType.emoji}・${ticketType.name.toLowerCase()}-${user.id}`;

    // Checar se já existe um ticket para esse tipo e usuário
    const existingChannel = guild.channels.cache.find(ch => ch.name === channelName);
    if (existingChannel) {
        return interaction.editReply({ content: `Você já possui um ticket deste tipo aberto em ${existingChannel}.` });
    }

    const ticketChannel = await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        parent: ticketType.category_id,
        permissionOverwrites: [
            { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
            { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
            { id: ticketType.staff_role_id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageMessages] },
            { id: client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels] }
        ]
    });

    const embed = new EmbedBuilder()
        .setTitle(`${ticketType.emoji} Ticket: ${ticketType.name}`)
        .setDescription(ticketType.subject)
        .setColor('#0099ff')
        .addFields({ name: 'Criado por', value: `${user}` })
        .setFooter({ text: `User ID: ${user.id}` });
    
    const actionRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('manage_ticket').setLabel('Gerenciar Ticket').setStyle(ButtonStyle.Primary).setEmoji('🛠️'),
        new ButtonBuilder().setCustomId('close_ticket').setLabel('Fechar Ticket').setStyle(ButtonStyle.Danger).setEmoji('🔒')
    );

    await ticketChannel.send({ embeds: [embed], components: [actionRow] });
    await interaction.editReply({ content: `✅ Seu ticket foi criado em ${ticketChannel}!` });
}


async function handleButton(interaction) {
    const { customId, guild, channel } = interaction;
    const user = interaction.user;
    const ticketType = readTicketTypes().find(t => channel.name.includes(t.name.toLowerCase()));
    
    if (!ticketType && !['confirm_assume', 'confirm_notify'].includes(customId)) return; // Se não for um botão de ticket conhecido

    const isStaff = interaction.member.roles.cache.has(ticketType?.staff_role_id);
    
    if (customId === 'manage_ticket') {
        if (!isStaff) return interaction.reply({ content: '❌ Você não tem permissão para gerenciar este ticket.', ephemeral: true });

        const embed = new EmbedBuilder().setTitle('Painel de Gerenciamento').setDescription('Selecione uma ação:');
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('confirm_assume').setLabel('Assumir').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('confirm_notify').setLabel('Notificar Usuário').setStyle(ButtonStyle.Secondary)
        );
        await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
    }

    if (customId === 'confirm_assume') {
        if (!isStaff) return interaction.reply({ content: '❌ Ação não permitida.', ephemeral: true });
        
        // Deferir a atualização para evitar timeout
        await interaction.deferUpdate();

        // Limpar o nome de usuário para ser seguro para o nome do canal
        const sanitizedUsername = user.username.toLowerCase().replace(/[^a-z0-9-]/g, '') || 'staff';

        const originalCreatorId = channel.name.split('-').pop();
        const newName = `${ticketType.emoji}・${sanitizedUsername}-${originalCreatorId}`;
        
        try {
            await channel.setName(newName);
            await channel.setTopic(`Ticket assumido por ${user.username}.`);
            await interaction.editReply({ content: `✅ Você assumiu este ticket. O canal foi renomeado para: \`${newName}\``, embeds: [], components: [] });
        } catch (e) {
            console.error("Erro ao assumir ticket:", e);
            await interaction.editReply({ content: '❌ Erro ao assumir o ticket. Verifique as permissões do bot.', embeds: [], components: [] });
        }
    }

    if (customId === 'confirm_notify') {
        if (!isStaff) return interaction.reply({ content: '❌ Ação não permitida.', ephemeral: true });

        // Deferir a atualização para evitar timeout
        await interaction.deferUpdate();
        
        const originalCreatorId = channel.name.split('-').pop();
        const creator = await client.users.fetch(originalCreatorId);

        try {
            const embed = new EmbedBuilder().setTitle('🔔 Notificação de Ticket').setDescription(`Olá! Um staff está cuidando do seu ticket e te enviou uma notificação.`);
            const button = new ButtonBuilder().setLabel('Ir para o Ticket').setStyle(ButtonStyle.Link).setURL(channel.url);
            await creator.send({ embeds: [embed], components: [new ActionRowBuilder().addComponents(button)] });
            await interaction.editReply({ content: '✅ Usuário notificado com sucesso!', embeds: [], components: [] });
        } catch (error) {
            await interaction.editReply({ content: '❌ Não foi possível notificar o usuário. Ele pode ter desabilitado as DMs.', embeds: [], components: [] });
        }
    }
    
    if (customId === 'close_ticket') {
        // A permissão para fechar pode ser do autor ou de um staff
        const originalCreatorId = channel.name.split('-').pop();
        if (user.id !== originalCreatorId && !isStaff) {
             return interaction.reply({ content: '❌ Você não tem permissão para fechar este ticket.', ephemeral: true });
        }
        
        await interaction.reply({ content: '🔒 Fechando o ticket e gerando o transcript...', ephemeral: true });

        try {
            const transcript = await createTranscript(channel, {
                limit: -1,
                saveImages: true,
                poweredBy: false
            });

            const transcriptFileName = `transcripts/${channel.name}-${Date.now()}.html`;
            const { url: blobUrl } = await put(transcriptFileName, transcript.attachment, {
                access: 'public',
                contentType: 'text/html',
                addRandomSuffix: false,
                cacheControlMaxAge: 30 * 24 * 60 * 60, // 30 dias
            });

            // Deletar o blob após 30 dias
            setTimeout(async () => {
                try {
                    await del(blobUrl);
                    console.log(`Transcript deletado: ${blobUrl}`);
                } catch (delError) {
                    console.error(`Erro ao deletar transcript ${blobUrl}:`, delError);
                }
            }, 30 * 24 * 60 * 60 * 1000); // 30 dias em milissegundos
            

            const appUrl = process.env.APP_URL.replace(/\/$/, "");
            const publicUrl = `${appUrl}/api/view?url=${encodeURIComponent(blobUrl)}`;

            // Enviar para o canal de logs
            const logEmbed = new EmbedBuilder().setTitle('🔒 Ticket Fechado').setDescription(`**Canal:** \`${channel.name}\`\n**Fechado por:** ${user}`).setColor('#ff0000');
            const logButton = new ButtonBuilder().setLabel('Ver Transcript').setStyle(ButtonStyle.Link).setURL(publicUrl);
            // Implementar canal de log vindo do ticketType
            // const logChannel = await guild.channels.fetch(ticketType.log_channel_id); 
            // await logChannel.send({ embeds: [logEmbed], components: [new ActionRowBuilder().addComponents(logButton)] });

            // Enviar DM para o autor do ticket
            const creator = await client.users.fetch(originalCreatorId);
            try {
                const dmEmbed = new EmbedBuilder().setTitle('Seu Ticket foi Fechado').setDescription('Obrigado por entrar em contato! Aqui está a transcrição da sua conversa.');
                await creator.send({ embeds: [dmEmbed], components: [new ActionRowBuilder().addComponents(logButton)] });
            } catch (error) {
                console.log(`Não foi possível enviar DM para o usuário ${creator.id}`);
            }
            
            await channel.delete();

        } catch (error) {
            console.error('Erro ao fechar ticket:', error);
            await interaction.followUp({ content: '❌ Ocorreu um erro ao fechar o ticket.', ephemeral: true });
        }
    }
}

client.login(process.env.DISCORD_TOKEN); 