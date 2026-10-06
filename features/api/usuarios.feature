# language: pt
@api
Funcionalidade: Gestão de usuários

  @critico
  Cenário: Cadastrar usuário com sucesso
    Quando cadastro um novo usuário
    Então a resposta tem status 201
    E a resposta segue o contrato de "cadastro"

  Cenário: Não permitir cadastro com email duplicado
    Dado que existe um usuário cadastrado
    Quando cadastro outro usuário com o mesmo email
    Então a resposta tem status 400
    E a mensagem é "Este email já está sendo usado"

  Esquema do Cenário: Validar campos obrigatórios no cadastro
    Quando cadastro um usuário com o campo "<campo>" igual a "<valor>"
    Então a resposta tem status 400
    E o campo "<campo>" retorna a mensagem "<mensagem>"

    Exemplos:
      | caso            | campo    | valor | mensagem                        |
      | nome em branco  | nome     |       | nome não pode ficar em branco     |
      | email inválido  | email    | teste | email deve ser um email válido    |
      | senha em branco | password |       | password não pode ficar em branco |

  @critico
  Cenário: Buscar usuário pelo id
    Dado que existe um usuário cadastrado
    Quando busco esse usuário pelo id
    Então a resposta tem status 200
    E a resposta segue o contrato de "usuário"
    E o usuário retornado tem os dados cadastrados

  Cenário: Buscar usuário com id inexistente
    Quando busco um usuário com id inexistente
    Então a resposta tem status 400
    E a mensagem é "Usuário não encontrado"

  Cenário: Listar usuários filtrando por email
    Dado que existe um usuário cadastrado
    Quando listo os usuários filtrando pelo email dele
    Então a resposta tem status 200
    E a resposta segue o contrato de "lista de usuários"
    E a lista contém apenas esse usuário

  Cenário: Editar o nome de um usuário
    Dado que existe um usuário cadastrado
    Quando altero o nome desse usuário para "Nome Editado QA"
    Então a resposta tem status 200
    E a mensagem é "Registro alterado com sucesso"

  Cenário: Excluir um usuário
    Dado que existe um usuário cadastrado
    Quando excluo esse usuário
    Então a resposta tem status 200
    E a mensagem é "Registro excluído com sucesso"
    E o usuário não existe mais