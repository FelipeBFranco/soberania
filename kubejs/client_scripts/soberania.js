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

  event.add('soberania:selo_de_vassalagem', [
    '§7Use num súdito que você nomeou, dentro da sua colônia.',
    '§7Ele jura lealdade e vai morar na Taverna como visitante;',
    '§7contratado, vira cidadão.'
  ])
})
