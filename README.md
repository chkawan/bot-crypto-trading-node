# 🤖 Crypto Trading Bot (Node.js)

## 📄 Descrição

Este projeto foi desenvolvido durante a **Imersão BotDev 2025**, com o objetivo de criar um bot de trading automatizado utilizando Node.js e integração com APIs de corretoras (como Binance).

O sistema permite executar estratégias automatizadas com base em parâmetros configuráveis, interagindo em tempo real com o mercado de criptomoedas.

---

## 🚀 Funcionalidades

* Execução automatizada de ordens de compra e venda
* Integração com APIs de corretoras (ex: Binance)
* Configuração de parâmetros de trading
* Execução em tempo real
* Estrutura simples para estudo e evolução

---

## 🧠 Como funciona

1. O sistema se conecta à API da corretora utilizando chaves de acesso
2. O bot monitora dados de mercado em tempo real
3. Com base na lógica definida no código (`index.js`), ele:

   * Analisa condições de compra/venda
   * Executa ordens automaticamente
4. O comportamento do bot pode ser ajustado através de parâmetros

---

## 🛠️ Tecnologias utilizadas

* Node.js
* JavaScript
* APIs de corretoras (ex: Binance)

---

## 📦 Estrutura do projeto

```bash
.
├── index.js        # Arquivo principal do bot
├── package.json    # Dependências do projeto
```

---

## ⚙️ Pré-requisitos

* Node.js (versão LTS recomendada)
* NPM
* Conta em corretora (ex: Binance)
* Chaves de API (API Key e Secret)

---

## 🖥️ Como executar o projeto

### 1. Clonar o repositório

```bash
git clone <URL_DO_REPOSITORIO>
cd <NOME_DO_PROJETO>
```

---

### 2. Instalar dependências

```bash
npm install
```

---

### 3. Configurar parâmetros

Edite o arquivo:

```bash
index.js
```

Configure:

* Chaves da API
* Estratégia de trading
* Parâmetros de execução

---

### 4. Executar o bot

```bash
npm start
```

ou

```bash
node index.js
```

---

## 💡 Exemplo de uso

* Configure suas credenciais da corretora
* Defina a lógica de trading
* Execute o bot
* Acompanhe as operações em tempo real

---

## 🔐 Observações importantes

* ⚠️ **Nunca compartilhe suas chaves de API**
* Utilize ambiente de testes (sandbox) sempre que possível
* Trading automatizado envolve riscos financeiros

---

## 📚 Materiais de apoio

* Node.js: https://www.nodejs.org
* VS Code: https://code.visualstudio.com
* Instalação completa: https://www.youtube.com/watch?v=iJ-BUhcZOSY
* Erros comuns Binance: https://www.luiztools.com.br/post/erros-comuns-com-as-apis-da-binance/
* Imersão BotDev: https://www.luiztools.com.br/bot-dev

---

## ⚡ Possíveis melhorias

* Implementação de estratégias avançadas (RSI, MACD, etc)
* Interface gráfica para controle do bot
* Logs estruturados
* Integração com banco de dados
* Backtesting de estratégias
* Deploy em servidor/cloud

---

## 📄 Licença

Projeto de uso educacional.

---

## 👨‍💻 Autor

Desenvolvido por **Christopher Kawan**
