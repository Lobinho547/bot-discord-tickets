#!/usr/bin/env node

const fs = require('fs');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🎫 Discord Ticket Bot - Setup Wizard');
console.log('=====================================\n');

const questions = [
  {
    name: 'DISCORD_TOKEN',
    message: 'Digite o token do seu bot Discord: ',
    required: true
  },
  {
    name: 'CLIENT_ID',
    message: 'Digite o Client ID do seu bot: ',
    required: true
  },
  {
    name: 'GUILD_ID',
    message: 'Digite o ID do seu servidor Discord: ',
    required: true
  },
  {
    name: 'BLOB_READ_WRITE_TOKEN',
    message: 'Digite o seu Token do Vercel Blob (começa com "vercel_blob_rw_..."): ',
    required: true
  },
  {
    name: 'LOG_CHANNEL_ID',
    message: 'Digite o ID do canal de logs: ',
    required: true
  },
  {
    name: 'TICKET_CATEGORY_ID',
    message: 'Digite o ID da categoria onde os tickets serão criados: ',
    required: true
  },
  {
    name: 'STAFF_ROLE_ID',
    message: 'Digite o ID do cargo de staff: ',
    required: true
  }
];

let currentQuestion = 0;
let answers = {};

function askQuestion() {
  if (currentQuestion >= questions.length) {
    generateEnvFile();
    return;
  }

  const question = questions[currentQuestion];
  
  rl.question(question.message, (answer) => {
    if (!answer && question.required) {
      console.log('❌ Este campo é obrigatório!\n');
      askQuestion();
      return;
    }

    answers[question.name] = answer;
    currentQuestion++;
    console.log('');
    askQuestion();
  });
}

function generateEnvFile() {
  console.log('📝 Gerando arquivo .env...\n');

  let envContent = '';
  
  for (const [key, value] of Object.entries(answers)) {
    envContent += `${key}=${value}\n`;
  }

  try {
    fs.writeFileSync('.env', envContent);
    console.log('✅ Arquivo .env criado com sucesso!');
    console.log('📋 Próximos passos:');
    console.log('1. Se ainda não o fez, execute: npm install');
    console.log('2. Execute: npm start');
    console.log('3. Use o comando /setup-tickets no seu servidor Discord');
    console.log('\n🎉 Setup concluído!');
  } catch (error) {
    console.error('❌ Erro ao criar arquivo .env:', error.message);
  }

  rl.close();
}

// Iniciar o setup
askQuestion(); 