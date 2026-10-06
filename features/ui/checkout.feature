# language: pt
@ui
Funcionalidade: Checkout
  Como cliente da loja
  Quero finalizar minha compra
  Para receber os produtos escolhidos

  Contexto:
    Dado que estou logado como "standard_user"

  @critico
  Cenário: Finalizar uma compra com sucesso
    Quando adiciono o produto "sauce-labs-backpack" ao carrinho
    E vou para o carrinho
    E inicio o checkout
    E preencho os dados de entrega com nome "Vinícius", sobrenome "Torales" e CEP "88000-000"
    E finalizo a compra
    Então vejo a confirmação "Thank you for your order!"

  Cenário: Calcular o subtotal com mais de um produto
    Quando adiciono o produto "sauce-labs-backpack" ao carrinho
    E adiciono o produto "sauce-labs-bike-light" ao carrinho
    E vou para o carrinho
    E inicio o checkout
    E preencho os dados de entrega com nome "Vinícius", sobrenome "Torales" e CEP "88000-000"
    Então o subtotal é "Item total: $39.98"

  Esquema do Cenário: Validar dados obrigatórios da entrega
    Quando adiciono o produto "sauce-labs-backpack" ao carrinho
    E vou para o carrinho
    E inicio o checkout
    E preencho os dados de entrega com nome "<nome>", sobrenome "<sobrenome>" e CEP "<cep>"
    Então vejo o erro de checkout "<mensagem>"

    Exemplos:
      | caso               | nome     | sobrenome | cep       | mensagem                       |
      | nome em branco     |          | Torales   | 88000-000 | Error: First Name is required  |
      | sobrenome em branco | Vinícius |           | 88000-000 | Error: Last Name is required   |
      | CEP em branco      | Vinícius | Torales   |           | Error: Postal Code is required |