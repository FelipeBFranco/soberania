// Soberania: Ferro e Mana — scripts de inicialização (registro de itens/blocos).

StartupEvents.registry('item', event => {
  // Ponte Tensura ↔ MineColonies (ADR-006): usado num súdito nomeado dentro da
  // própria colônia, faz ele jurar vassalagem e ir morar na Taverna.
  event.create('soberania:selo_de_vassalagem')
    .texture('minecraft:item/name_tag')
    .glow(true)
    .maxStackSize(16)
    .rarity('uncommon')
})
