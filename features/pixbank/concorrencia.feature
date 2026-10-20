# language: pt
@pixbank @api @concorrencia
Funcionalidade: Pix simultâneos não gastam o mesmo dinheiro duas vezes

  @critico
  Cenário: 20 Pix ao mesmo tempo com saldo para só um
    Dado que "Ana" é cliente do PixBank com saldo de R$ 100,00
    E que "Bruno" é cliente do PixBank com saldo de R$ 0,00
    Quando "Ana" dispara 20 Pix de "100,00" para "Bruno" ao mesmo tempo
    Então exatamente 1 Pix é aceito e os outros 19 são recusados por saldo
    E o saldo de "Ana" é R$ 0,00
    E o saldo de "Bruno" é R$ 100,00
