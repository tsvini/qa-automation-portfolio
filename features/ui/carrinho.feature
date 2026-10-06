# language: pt
@ui
Funcionalidade: Carrinho de compras

  Contexto:
    Dado que estou logado como "standard_user"

  Cenário: Adicionar um produto ao carrinho
    Quando adiciono o produto "sauce-labs-backpack" ao carrinho
    Então o carrinho mostra 1 item

  Cenário: Adicionar dois produtos ao carrinho
    Quando adiciono o produto "sauce-labs-backpack" ao carrinho
    E adiciono o produto "sauce-labs-bike-light" ao carrinho
    Então o carrinho mostra 2 itens