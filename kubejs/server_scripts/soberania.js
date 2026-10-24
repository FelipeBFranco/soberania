// Soberania: Ferro e Mana — scripts de servidor.
// Travas cruzadas do arco de progressão: receitas-chave de um pilar que
// exigem um componente de outro, para que os mods "conversem".
// Cada trava tem um comentário com o porquê. Era I: travas leves; nada do
// que a Era 0 pede fica mais difícil de obter.

ServerEvents.recipes(event => {
  // [Reino ← Ferro] A Torre de Guarda leva liga de andesito no lugar de duas
  // tábuas: o primeiro guarda da vila depende da primeira oficina.
  event.remove({ id: 'minecolonies:blockhutguardtower' })
  event.shaped(Item.of('minecolonies:blockhutguardtower', 2), ['XTX', 'ABA', 'XXX'], {
    X: '#minecraft:planks',
    T: 'structurize:sceptergold',
    B: 'minecraft:bow',
    A: 'create:andesite_alloy'
  }).id('soberania:trava/torre_de_guarda')

  // [Reino ← Mana] A Universidade troca um dos livros por uma gema de Source:
  // pesquisa começa com curiosidade pelo arcano.
  event.remove({ id: 'minecolonies:blockhutuniversity' })
  event.shaped('minecolonies:blockhutuniversity', ['XTX', 'XBX', 'XSX'], {
    X: '#minecraft:planks',
    T: 'structurize:sceptergold',
    B: 'minecraft:book',
    S: 'ars_nouveau:source_gem'
  }).id('soberania:trava/universidade')

  // [Ferro ← Tensura] A Prensa Mecânica leva um cristal mágico de baixa
  // qualidade: o primeiro braço do reino funciona a Magicules.
  event.remove({ id: 'create:crafting/kinetics/mechanical_press' })
  event.shaped('create:mechanical_press', ['S', 'C', 'I', 'M'], {
    S: 'create:shaft',
    C: 'create:andesite_casing',
    I: '#c:storage_blocks/iron',
    M: 'tensura:low_quality_magic_crystal'
  }).id('soberania:trava/prensa_mecanica')

  // [Mana ← Tensura] A Câmara de Imbuição leva cristais mágicos no lugar do
  // ouro: Source e Magicules são a mesma magia com nomes diferentes.
  event.remove({ id: 'ars_nouveau:imbuement_chamber' })
  event.shaped('ars_nouveau:imbuement_chamber', ['xyx', 'x x', 'xyx'], {
    x: 'ars_nouveau:archwood_planks',
    y: 'tensura:low_quality_magic_crystal'
  }).id('soberania:trava/camara_de_imbuicao')
})

ServerEvents.loaded(event => {
  console.info('[soberania] scripts de servidor carregados')
})
