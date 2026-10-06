# language: pt
@ui
Funcionalidade: Catálogo de produtos
  Como cliente da loja
  Quero organizar e escolher produtos
  Para encontrar o que procuro mais rápido

  Contexto:
    Dado que estou logado como "standard_user"

  Esquema do Cenário: Ordenar produtos
    Quando ordeno os produtos por "<criterio>"
    Então os produtos ficam ordenados por "<criterio>"

    Exemplos:
      | caso                 | criterio    |
      | nome de A a Z        | nome A-Z    |
      | nome de Z a A        | nome Z-A    |
      | preço menor primeiro | menor preço |
      | preço maior primeiro | maior preço |

  Cenário: Remover produto do carrinho
    Quando adiciono o produto "sauce-labs-backpack" ao carrinho
    E removo o produto "sauce-labs-backpack" do carrinho
    Então o carrinho fica vazio