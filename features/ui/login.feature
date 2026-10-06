# language: pt
@ui
Funcionalidade: Login no SauceDemo
  Como cliente da loja
  Quero acessar minha conta
  Para poder comprar produtos

  Contexto:
    Dado que estou na página de login

  Cenário: Login com credenciais válidas
    Quando faço login com o usuário "standard_user" e a senha "secret_sauce"
    Então vejo a página de produtos

  Esquema do Cenário: Login inválido
    Quando faço login com o usuário "<usuario>" e a senha "<senha>"
    Então vejo a mensagem de erro "<mensagem>"

    Exemplos:
      | caso              | usuario         | senha        | mensagem                                                                  |
      | usuário bloqueado | locked_out_user | secret_sauce | Epic sadface: Sorry, this user has been locked out.                       |
      | senha incorreta   | standard_user   | errada       | Epic sadface: Username and password do not match any user in this service |
      | usuário em branco |                 | secret_sauce | Epic sadface: Username is required                                        |