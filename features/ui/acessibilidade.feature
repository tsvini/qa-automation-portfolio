# language: pt
@ui @a11y
Funcionalidade: Acessibilidade (WCAG 2.1 AA)
  Como pessoa que usa tecnologias assistivas
  Quero que a loja siga as diretrizes de acessibilidade
  Para conseguir navegar e comprar sem barreiras

  Cenário: Página de login sem novas violações
    Dado que estou na página de login
    Então a página não tem novas violações de acessibilidade

  Cenário: Catálogo sem novas violações
    Dado que estou logado como "standard_user"
    Então a página não tem novas violações de acessibilidade

  Cenário: Checkout sem novas violações
    Dado que estou logado como "standard_user"
    Quando adiciono o produto "sauce-labs-backpack" ao carrinho
    E vou para o carrinho
    E inicio o checkout
    Então a página não tem novas violações de acessibilidade