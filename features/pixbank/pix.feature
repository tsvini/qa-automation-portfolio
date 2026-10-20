# language: pt
@pixbank @api
Funcionalidade: Pix entre contas do PixBank
  Regras: o Pix debita a origem e credita o destino na hora, respeita saldo,
  limite diário de R$ 5.000,00, limite noturno de R$ 1.000,00 por Pix (20h às 6h)
  e Pix acima de R$ 2.000,00 precisa ser confirmado com a senha.

  Contexto:
    Dado que "Ana" é cliente do PixBank com saldo de R$ 1000,00
    E que "Bruno" é cliente do PixBank com saldo de R$ 0,00

  @critico
  Cenário: Pix concluído debita a origem e credita o destino
    Quando "Ana" envia um Pix de "150,00" para "Bruno"
    Então o PixBank responde 201
    E a resposta do PixBank segue o contrato de "pix"
    E o saldo de "Ana" é R$ 850,00
    E o saldo de "Bruno" é R$ 150,00

  Esquema do Cenário: Valores-limite do saldo
    Quando "Ana" envia um Pix de "<valor>" para "Bruno"
    Então o PixBank responde <status>
    E o saldo de "Ana" é R$ <saldo_final>

    Exemplos:
      | caso                            | valor   | status | saldo_final |
      | exatamente o saldo é aceito     | 1000,00 | 201    | 0,00        |
      | um centavo acima é recusado     | 1000,01 | 422    | 1000,00     |
      | o menor valor possível é aceito | 0,01    | 201    | 999,99      |

  Esquema do Cenário: Valores inválidos são recusados
    Quando "Ana" envia um Pix de "<valor>" para "Bruno"
    Então o PixBank responde 422
    E o erro do PixBank é "VALOR_INVALIDO"
    E o saldo de "Ana" é R$ 1000,00

    Exemplos:
      | caso            | valor  |
      | zero            | 0      |
      | negativo        | -10,00 |
      | três decimais   | 10,005 |
      | texto           | dez    |

  @critico
  Cenário: Centavos são convertidos sem erro de arredondamento
    Quando "Ana" envia um Pix de "19,99" para "Bruno"
    Então o PixBank responde 201
    E o Pix registrado tem 1999 centavos
    E o saldo de "Bruno" é R$ 19,99

  Cenário: Não é possível fazer Pix para a própria conta
    Quando "Ana" envia um Pix de "10,00" para "Ana"
    Então o PixBank responde 422
    E o erro do PixBank é "PIX_PARA_SI_MESMO"

  Cenário: Chave Pix inexistente
    Quando "Ana" envia um Pix de "10,00" para a chave "ninguem@pixbank.dev"
    Então o PixBank responde 404
    E o erro do PixBank é "CHAVE_NAO_ENCONTRADA"
    E a resposta do PixBank segue o contrato de "erro"

  Cenário: O limite diário soma todos os Pix do dia
    Dado que "Carla" é cliente do PixBank com saldo de R$ 9000,00
    E que "Carla" já enviou hoje Pix de "2000,00", "2000,00" e "1000,00" para "Bruno"
    Quando "Carla" envia um Pix de "0,01" para "Bruno"
    Então o PixBank responde 422
    E o erro do PixBank é "LIMITE_DIARIO"

  Esquema do Cenário: Limite noturno de R$ 1.000,00 por Pix
    Dado que "Fábio" é cliente do PixBank com saldo de R$ 5000,00
    Quando "Fábio" envia às <hora> um Pix de "<valor>" para "Bruno"
    Então o resultado do Pix é "<resultado>"

    Exemplos:
      | caso                                  | hora | valor   | resultado      |
      | à noite, no limite, é aceito          | 22h  | 1000,00 | CONCLUIDO      |
      | à noite, um centavo acima é recusado  | 22h  | 1000,01 | LIMITE_NOTURNO |
      | de madrugada também vale              | 05h  | 1500,00 | LIMITE_NOTURNO |
      | de dia o limite não se aplica         | 14h  | 1500,00 | CONCLUIDO      |

  @critico
  Cenário: Pix acima de R$ 2.000,00 só sai depois da senha
    Dado que "Diego" é cliente do PixBank com saldo de R$ 3000,00
    Quando "Diego" envia um Pix de "2500,00" para "Bruno"
    Então o PixBank responde 201
    E o Pix fica "PENDENTE_CONFIRMACAO"
    E o saldo de "Diego" é R$ 3000,00
    Quando "Diego" confirma o Pix com a senha "errada"
    Então o PixBank responde 401
    Quando "Diego" confirma o Pix com a senha correta
    Então o PixBank responde 200
    E o Pix fica "CONCLUIDO"
    E o saldo de "Diego" é R$ 500,00
    E o saldo de "Bruno" é R$ 2500,00

  @critico
  Cenário: Repetir o mesmo Pix com a mesma chave de idempotência não cobra duas vezes
    Quando "Ana" envia um Pix de "100,00" para "Bruno" com a chave de idempotência "pedido-42"
    E "Ana" envia um Pix de "100,00" para "Bruno" com a chave de idempotência "pedido-42"
    Então o PixBank responde 200
    E as duas respostas trazem o mesmo Pix
    E o saldo de "Ana" é R$ 900,00

  Cenário: Reusar a chave de idempotência com outro valor é recusado
    Quando "Ana" envia um Pix de "100,00" para "Bruno" com a chave de idempotência "pedido-43"
    E "Ana" envia um Pix de "200,00" para "Bruno" com a chave de idempotência "pedido-43"
    Então o PixBank responde 422
    E o erro do PixBank é "IDEMPOTENCIA_CONFLITO"
    E o saldo de "Ana" é R$ 900,00

  Cenário: Extrato mostra do mais recente para o mais antigo
    Quando "Ana" envia um Pix de "1,00" para "Bruno" com a descrição "primeiro"
    E "Ana" envia um Pix de "2,00" para "Bruno" com a descrição "segundo"
    E "Ana" consulta o extrato
    Então o PixBank responde 200
    E a resposta do PixBank segue o contrato de "extrato"
    E o extrato de "Ana" começa por "segundo" e depois "primeiro"
