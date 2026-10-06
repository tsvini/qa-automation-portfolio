# language: pt
@api
Funcionalidade: Usuários na API ServeRest

  Cenário: Cadastrar usuário com sucesso
    Quando cadastro um novo usuário com email único
    Então a resposta tem status 201
    E a mensagem é "Cadastro realizado com sucesso"

  Cenário: Não permitir cadastro com email duplicado
    Dado que existe um usuário cadastrado
    Quando cadastro outro usuário com o mesmo email
    Então a resposta tem status 400
    E a mensagem é "Este email já está sendo usado"

  Cenário: Login com usuário cadastrado
    Dado que existe um usuário cadastrado
    Quando faço login na API com esse usuário
    Então a resposta tem status 200
    E recebo um token de autorização