1 Como você organizou o tempo — o que fez em cada dia:

   "Dado minha disponibilidade de tempo me organizei para executar todas as etapas num período de 5 horas apenas no domingo do dia 22/11/26.
    No dia 15/11 até iniciei um projeto mas foram tantas dificuldades (principalmente com as contas e usuárioas a serem utilizadas) que preferi criar um e-mail novo, como novos acessos e iniciar tudo novamente para termos uma certa conformidade principalmente ao que tange os acessos gratuito das AI's visto que possuo alguns acessos pagos do perplexity e gemini.
    Basicamente com o arquivo do desafio em mão eu pedi ao GPT para estruturar um plano passo a passo para conseguirmos entregar tudo o que foi pedido. Não tive muitas dificuldades com instalação dos programas, integração entre o git e as AI e basicamente para concluirmos os trabalhos o passo a passo foi executado sem muitas dificuldades."

2 Quais IAs usou para quê — e qual funcionou melhor para cada tipo de tarefa. Alguma bateu
limite? O que fez?
    
    "Utilizei o Gemini para o esclarecimento de algumas dúvidas erros e correções que surgiram no meio do caminho;
    Utilizei o GPT para a geração dos roteiro e códigos principais do sistema;
    E por fim utilizei o Claude code para a revisão dos códigos, revisão dos arquivos criados (conformidade com o que foi pedido no PDF) e fechamento do projeto;
    A única Ai que atingiu o limite foi o GPT, mas com a nova funcionalidade dele bastou apenas criar um novo chat, pedidir para ele resumir a conversa anterior e dar seguimento no projeto sem muitas dificuldades, mas para otimizar o máximo os tokens, evitei de enviar arquivos completos, prints e me restringi apenas a gerar códigos e pedir informações dos campos a serem alterados. Numa situação onde não consegui alterar a linha correta, eu pedi o gemini para reescrever o código para mim colando a parte modificada informada pelo GPT. No fim deu tudo certo."

3 As 3 decisões mais importantes que você tomou — e por quê (ex.: por que essa estrutura de
pastas, por que essas rotas, por que esse jeito de fazer a sidebar).

    "As decisões de estrutura foram tomadas pela pelo GPT, mas com a minha supervisão. Gostei da estrutura dos arquivos, cada módulo com os seus arquivos num formato de arvore facilita encontrar e modificar os pontos que são necessários.
    A sidebar também foi uma decisão vinda do projeto, e os módulos mostrados foram uma tentativa de mostrar todos os recursos do nosso sistema de uma forma facilitada e de fácil acesso.
    Algumas funcções foram tomada interamente por mim, uma delas foi o sistema de filtros na parte do funil de vendas, onde inicialmente o sistema só mostrava as oportunidades, mas sem necessáriamente mostrar quais seriam esses clientes que são oportunidade, então pedi para gerarmos uma lista em cascata para cada uma das oportunidades;
    Outra função implementada foi a busca facilitada por clientes, onde no nosso banco de dados exibia uma lista de clientes, mas não havia nenhuma forma de organizar essa lista, filtrar alguma determinada característica, então eu fui lá e fiz, além de adicionar as opções para editarmos os dados dos clientes, adicionar novos clientes e excluí-los se necessário."

4 O que deu errado — os erros que mais travaram você e como resolveu cada um.
    
    "Na minha percepção poucas coisas deram errado. A principal delas é a questão da sidebar onde quando ela esconde o botão de expandir cai para de baixo do icone da sidebar e gera uma estranheza;
    Outra coisa foi a duplicidade do botão da side bar onde temos uma no topo da tela dos módulo e um outro botão na própria sidebar."

5 O que você não entendeu — coisas que funcionam mas você ainda não sabe explicar. Ser
honesto aqui vale mais do que fingir que entendeu.
    
    "Todo o projeto foi feiot num passo a passo então basicamente as coisas funcionaram porque seguiram uma ordem lógica. Muitas funções foram só criadas e por serem muito complexas não me aprofundei em cada /import, /func, ou If's ao longo dos códigos eles apenas foram colocados numa sequencia que fazia sendido ao programa. Me restringi em tentar entender o que cada trecho retorna, qual sua implicação no programa.
    Com relação aos comando os mais complicados foram os que são necessários usar --"alguma coisa", por exemplo "git status --short"; não basta apenas puxa o status tem que adicionar esse comando depois, passei por várias situaçãoes assim com "go status --xx", npm, git git diff --stat, git diff go.mod, e a lista segue futuramente terei que fazer um dicionário dessas funcionalidades. "

6 Como você testou — como sabia que cada passo estava pronto.
    
    "Cada etapa foi testada em tempo real e na metodologia cada alteração era testada imediatametnte e só passava para a próxima etapa quando tudo estava correto. 
    Então qualquer alteração no back ou no frontend era testada no run dev para o npm e go run . para o front e backend respectvamente"

7 O que faria diferente com mais tempo ou se começasse de novo.
    
    "Documentaria meis os prompts utilizados, os resultados e os códigos. Com o andamento do projeto foi tanto material produzido que nem pedindo o claude para resgatar essas informações eu obtive exito, além de registrar com precisão os comando do git e para que servem uma vez que realmente eles são muito utilizados. "
