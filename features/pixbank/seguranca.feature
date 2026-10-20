# language: pt
@pixbank @api @seguranca
Funcionalidade: Segurança da API do PixBank

  Contexto:
    Dado que "Ana" é cliente do PixBank com saldo de R$ 500,00
    E que "Bruno" é cliente do PixBank com saldo de R$ 500,00

  Esquema do Cenário: Rotas protegidas exigem um token válido
    Quando acesso "/api/conta" com o token "<token>"
    Então o PixBank responde 401
    E o erro do PixBank é "NAO_AUTENTICADO"

    Exemplos:
      | caso               | token      |
      | sem token          | nenhum     |
      | token inventado    | inventado  |
      | token adulterado   | adulterado |

  @critico
  Cenário: Um cliente não vê o comprovante de Pix de outro (BOLA)
    Dado que "Ana" enviou um Pix de "50,00" para "Bruno"
    E que "Eva" é cliente do PixBank com saldo de R$ 0,00
    Quando "Eva" tenta abrir o comprovante desse Pix
    Então o PixBank responde 404

  Cenário: Login bloqueia depois de 5 senhas erradas
    Quando "Ana" erra a senha 5 vezes
    E "Ana" tenta entrar com a senha correta
    Então o PixBank responde 429
    E o erro do PixBank é "MUITAS_TENTATIVAS"

  Cenário: Tentativa de injeção SQL na chave Pix não afeta o banco
    Quando "Ana" envia um Pix de "10,00" para a chave "' OR 1=1 --"
    Então o PixBank responde 404
    E o saldo de "Ana" é R$ 500,00

  Cenário: Respostas trazem cabeçalhos de segurança
    Quando acesso "/api/saude" com o token "nenhum"
    Então a resposta tem os cabeçalhos de segurança
