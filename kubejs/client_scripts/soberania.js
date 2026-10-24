// Soberania: Ferro e Mana — scripts de cliente (tooltips, visual).

// Avisa no tooltip quando um item tem receita alterada por uma trava cruzada.
ItemEvents.modifyTooltips(event => {
  const trava = '§6Soberania:§7 receita alterada (trava entre pilares)'
  ;[
    'minecolonies:blockhutguardtower',
    'minecolonies:blockhutuniversity',
    'create:mechanical_press',
    'ars_nouveau:imbuement_chamber'
  ].forEach(id => event.add(id, trava))
})
