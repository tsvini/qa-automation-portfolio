# language: pt
@ui @visual
Funcionalidade: Regressão visual
  Como time de qualidade
  Quero comparar as telas com imagens de referência
  Para detectar mudanças visuais não intencionais

  Cenário: Página de login sem alterações visuais
    Dado que estou na página de login
    Então a tela corresponde à referência "login"

  @critico
  Cenário: Catálogo de produtos sem alterações visuais
    Dado que estou logado como "standard_user"
    Então a tela corresponde à referência "catalogo"

  Cenário: Carrinho sem alterações visuais
    Dado que estou logado como "standard_user"
    Quando adiciono o produto "sauce-labs-backpack" ao carrinho
    E vou para o carrinho
    Então a tela corresponde à referência "carrinho"

  @deteccao
  Cenário: Detectar bug visual no catálogo
    Dado que estou logado como "visual_user"
    Então a tela difere da referência "catalogo"