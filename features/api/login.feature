# language: pt
@api
Funcionalidade: Autenticação na API

  @critico
  Cenário: Login com credenciais válidas
    Dado que existe um usuário cadastrado
    Quando faço login na API com esse usuário
    Então a resposta tem status 200
    E a resposta segue o contrato de "login"

  Cenário: Login com senha incorreta
    Dado que existe um usuário cadastrado
    Quando faço login na API com a senha "senha-errada"
    Então a resposta tem status 401
    E a mensagem é "Email e/ou senha inválidos"