# language: pt
@pixbank @ui
Funcionalidade: App web do PixBank

  Contexto:
    Dado que "Ana" é cliente do PixBank com saldo de R$ 1000,00
    E que "Bruno" é cliente do PixBank com saldo de R$ 0,00

  @critico
  Cenário: Login mostra o saldo formatado em reais
    Quando "Ana" entra no app do PixBank
    Então o app mostra o saldo "R$ 1.000,00"

  Cenário: Senha errada mostra mensagem de erro
    Quando "Ana" tenta entrar no app com a senha "errada"
    Então o app mostra o erro de login "E-mail ou senha incorretos"

  @critico
  Cenário: Enviar Pix pelo app atualiza saldo e extrato
    Quando "Ana" entra no app do PixBank
    E envia pelo app um Pix de "250,00" para "Bruno" com a descrição "Aluguel"
    Então o app confirma o Pix de "R$ 250,00"
    E o app mostra o saldo "R$ 750,00"
    E o primeiro item do extrato é "− R$ 250,00"

  Cenário: Pix alto pede a senha antes de sair
    Dado que "Diego" é cliente do PixBank com saldo de R$ 3000,00
    Quando "Diego" entra no app do PixBank
    E envia pelo app um Pix de "2500,00" para "Bruno" com a descrição "Notebook"
    E confirma o Pix no app com a senha correta
    Então o app confirma o Pix de "R$ 2.500,00"
    E o app mostra o saldo "R$ 500,00"

  @a11y
  Cenário: A tela da conta não tem novas violações de acessibilidade
    Quando "Ana" entra no app do PixBank
    Então o app mostra o saldo "R$ 1.000,00"
    E a página não tem novas violações de acessibilidade

  @visual
  Cenário: Tela de login do PixBank
    Quando abro o app do PixBank
    Então a tela corresponde à referência "pixbank-login"
