// Soberania: Ferro e Mana — scripts de servidor.
// Aqui ficam as travas cruzadas do arco de progressão (receitas que exigem
// componentes de outro pilar) e os ajustes de receita do pack.
//
// Convenção: um arquivo por era (era_0.js, era_1.js...). Este arquivo só
// registra que o pack carregou e serve de modelo.

ServerEvents.recipes(event => {
  // Exemplo de trava cruzada (desativado até a Era I ser desenhada):
  // event.remove({ output: 'minecolonies:blockhuttownhall' })
  // event.shaped('minecolonies:blockhuttownhall', ['BCB', 'CSC', 'BCB'], {
  //   B: 'create:brass_ingot',
  //   C: 'minecraft:oak_planks',
  //   S: 'ars_nouveau:source_gem'
  // })
})

ServerEvents.loaded(event => {
  console.info('[soberania] scripts de servidor carregados')
})
